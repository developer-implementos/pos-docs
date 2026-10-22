import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadCatalog } from './catalog.mjs';
import { loadPreviews } from './previews.mjs';
import { renderMaterialViewer } from './viewer.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

// A real, one-page PDF keeps the fixtures independent of Office conversion tools.
function pdf(text) {
  const stream = `BT /F1 12 Tf 40 740 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let content = '%PDF-1.7\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(content));
    content += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(content);
  content += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  content += offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  content += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(content);
}

function fixture(t) {
  const temporary = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temporary, 'pos-docs-preview-test-'));
  t.after(() => {
    assert.equal(path.dirname(root), temporary);
    assert.ok(path.basename(root).startsWith('pos-docs-preview-test-'));
    assert.equal(fs.realpathSync(root), root, 'Cleanup target must remain the created fixture directory');
    fs.rmSync(root, { recursive: true, force: true });
  });
  const write = (relative, bytes) => {
    const destination = path.resolve(root, relative);
    assert.ok(destination.startsWith(root + path.sep), 'Fixture writes stay inside their temporary directory');
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, bytes);
  };
  const original = pdf('Original of the meeting');
  const derived = Buffer.from(original);
  const material = {
    id: 'meeting-original', title: 'Original de reunión', description: 'Documento de prueba para la vista previa.',
    source: 'materials/original.pdf', format: 'pdf', date: null, kind: 'meeting', country: 'peru',
  };
  const catalogManifest = { schemaVersion: 2, presentations: [], materials: [material] };
  const manifest = {
    schemaVersion: 1, generator: { name: 'Fixture converter', version: '1.0.0' },
    documents: [{ id: material.id, sourceSha256: sha256(original), pdf: `materials/previews/${material.id}.pdf`, pdfSha256: sha256(derived), pages: 1 }],
  };
  write(material.source, original);
  write(manifest.documents[0].pdf, derived);
  const save = () => {
    write('portal/catalog.json', JSON.stringify(catalogManifest));
    write('materials/previews/manifest.json', JSON.stringify(manifest));
  };
  save();
  return { root, material, catalogManifest, manifest, write, save, original, derived, catalog: () => loadCatalog(root) };
}

test('publishes only verified preview metadata and preserves both original and derived hashes', t => {
  const f = fixture(t);
  const previews = loadPreviews(f.root, f.catalog());
  assert.ok(previews instanceof Map);
  assert.equal(previews.size, 1);
  assert.deepEqual(previews.get(f.material.id), {
    href: '/materials/previews/meeting-original.pdf', path: 'materials/previews/meeting-original.pdf',
    pages: 1, sourceSha256: sha256(f.original), pdfSha256: sha256(f.derived),
  });
  assert.deepEqual(fs.readFileSync(path.join(f.root, f.material.source)), f.original, 'Validation never modifies the downloadable source');
  assert.equal(fs.existsSync(path.join(f.root, 'dist')), false, 'Loading the manifest has no publication side effects');
});

test('rejects a stale preview after the original changes', t => {
  const f = fixture(t);
  f.write(f.material.source, pdf('Changed source after conversion'));
  assert.throws(() => loadPreviews(f.root, f.catalog()));
});

test('rejects altered preview bytes even when the original still matches', t => {
  const f = fixture(t);
  f.write(f.manifest.documents[0].pdf, pdf('Altered derived PDF'));
  assert.throws(() => loadPreviews(f.root, f.catalog()));
});

const invalid = [
  ['unsupported schema', f => { f.manifest.schemaVersion = 2; }],
  ['unapproved root metadata', f => { f.manifest.remoteUrl = 'https://example.com'; }],
  ['missing generator', f => { delete f.manifest.generator; }],
  ['empty generator version', f => { f.manifest.generator.version = ''; }],
  ['nonarray documents', f => { f.manifest.documents = {}; }],
  ['missing catalog preview', f => { f.manifest.documents = []; }],
  ['duplicate preview id', f => { f.manifest.documents.push({ ...f.manifest.documents[0] }); }],
  ['uncataloged preview id', f => { f.manifest.documents[0].id = 'unpublished-material'; }],
  ['missing source hash', f => { delete f.manifest.documents[0].sourceSha256; }],
  ['malformed source hash', f => { f.manifest.documents[0].sourceSha256 = 'not-a-hash'; }],
  ['malformed PDF hash', f => { f.manifest.documents[0].pdfSha256 = 'f'.repeat(63); }],
  ['unknown document metadata', f => { f.manifest.documents[0].script = 'unexpected'; }],
  ['zero pages', f => { f.manifest.documents[0].pages = 0; }],
  ['negative pages', f => { f.manifest.documents[0].pages = -1; }],
  ['fractional pages', f => { f.manifest.documents[0].pages = 1.5; }],
  ['string pages', f => { f.manifest.documents[0].pages = '1'; }],
  ['unsafe integer pages', f => { f.manifest.documents[0].pages = Number.MAX_SAFE_INTEGER + 1; }],
];
for (const [name, mutate] of invalid) test(`rejects ${name}`, t => {
  const f = fixture(t);
  mutate(f);
  f.save();
  assert.throws(() => loadPreviews(f.root, f.catalog()));
});

for (const relative of ['../outside.pdf', '/absolute.pdf', 'C:/outside.pdf', 'materials/previews/../outside.pdf', 'materials\\previews\\meeting-original.pdf', 'materials/previews/%2e%2e/outside.pdf', 'materials/previews/other-id.pdf', 'materials/previews//meeting-original.pdf', 'materials/previews/meeting-original.pdf#payload']) {
  test(`rejects unsafe or noncanonical preview path: ${relative}`, t => {
    const f = fixture(t);
    f.manifest.documents[0].pdf = relative;
    f.save();
    assert.throws(() => loadPreviews(f.root, f.catalog()));
  });
}

test('fails before publication when the manifest or a preview is missing', t => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.root, f.manifest.documents[0].pdf));
  assert.throws(() => loadPreviews(f.root, f.catalog()));
  f.write(f.manifest.documents[0].pdf, f.derived);
  fs.unlinkSync(path.join(f.root, 'materials/previews/manifest.json'));
  assert.throws(() => loadPreviews(f.root, f.catalog()));
});

test('rejects malformed JSON and a non-PDF payload with a matching manifest hash', t => {
  const f = fixture(t);
  f.write('materials/previews/manifest.json', '{invalid');
  assert.throws(() => loadPreviews(f.root, f.catalog()));
  const html = Buffer.from('<!doctype html><script>alert(1)</script>');
  f.manifest.documents[0].pdfSha256 = sha256(html);
  f.write(f.manifest.documents[0].pdf, html);
  f.save();
  assert.throws(() => loadPreviews(f.root, f.catalog()));
});

test('rejects symlinked directory ancestors even when they point inside the fixture', t => {
  const f = fixture(t);
  const source = path.join(f.root, 'materials/previews');
  const target = path.join(f.root, 'stored-previews');
  for (const candidate of [source, target]) assert.ok(path.resolve(candidate).startsWith(f.root + path.sep));
  fs.renameSync(source, target);
  fs.symlinkSync(target, source, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => loadPreviews(f.root, f.catalog()));
});

test('rejects a symlinked PDF file without reading it as an approved artifact', t => {
  const f = fixture(t);
  const filename = path.join(f.root, f.manifest.documents[0].pdf);
  f.write('outside.pdf', f.derived);
  fs.unlinkSync(filename);
  try { fs.symlinkSync(path.join(f.root, 'outside.pdf'), filename, 'file'); }
  catch (error) {
    if (process.platform === 'win32' && error.code === 'EPERM') return t.skip('Windows user lacks file-symlink privilege; the ancestor-junction rejection is tested separately.');
    throw error;
  }
  assert.throws(() => loadPreviews(f.root, f.catalog()));
});

test('viewer metadata is rendered as text, never executable document markup', t => {
  const f = fixture(t);
  f.material.title = 'Reunión <img data-injected="1" src=x onerror=alert(1)> & "equipo"';
  f.material.description = '</p><script data-injected="1">alert(1)</script><p>Documento';
  f.save();
  const catalog = f.catalog();
  const item = catalog.materials[0];
  const preview = loadPreviews(f.root, catalog).get(item.id);
  const html = renderMaterialViewer(item, preview, 'https://docs.example.invalid');
  assert.ok(html.includes('&lt;img data-injected='));
  assert.ok(html.includes('&lt;script data-injected='));
  assert.ok(!/<(?:img|script)\b[^>]*data-injected/u.test(html));
  assert.ok(html.includes('https://docs.example.invalid/materials/view/meeting-original/'));
  assert.ok(html.includes(`href="${item.href}"`), 'The original remains independently downloadable');
  assert.ok(html.includes(`href="${preview.href}"`), 'The preview PDF remains independently downloadable');
});
