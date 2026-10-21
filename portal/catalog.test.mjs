import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadCatalog } from './catalog.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = value >>> 1 ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

// Small, uncompressed ZIP archives with actual local entries, checksums and directory records.
function zip(entries) {
  const files = [];
  const directory = [];
  let offset = 0;
  for (const [name, xml] of entries) {
    const filename = Buffer.from(name);
    const payload = Buffer.from(xml);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc32(payload), 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(payload.length, 22);
    local.writeUInt16LE(filename.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc32(payload), 16);
    central.writeUInt32LE(payload.length, 20);
    central.writeUInt32LE(payload.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE(offset, 42);
    files.push(local, filename, payload);
    directory.push(central, filename);
    offset += local.length + filename.length + payload.length;
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(Buffer.concat(directory).length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, ...directory, end]);
}

function office(format) {
  const isWord = format === 'docx';
  const main = isWord ? 'word/document.xml' : 'ppt/presentation.xml';
  const contentType = `application/vnd.openxmlformats-officedocument.${isWord ? 'wordprocessingml.document' : 'presentationml.presentation'}.main+xml`;
  return zip([
    ['[Content_Types].xml', `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/${main}" ContentType="${contentType}"/></Types>`],
    ['_rels/.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${main}"/></Relationships>`],
    [main, isWord ? '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Original de reunión</w:t></w:r></w:p></w:body></w:document>' : '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst/></p:presentation>'],
  ]);
}

function fixture(t) {
  const temporary = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temporary, 'pos-docs-catalog-test-'));
  t.after(() => {
    assert.equal(path.dirname(root), temporary);
    assert.ok(path.basename(root).startsWith('pos-docs-catalog-test-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const write = (source, content) => {
    const destination = path.join(root, source);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, content);
  };
  const manifest = {
    schemaVersion: 2,
    presentations: [{ id: 'architecture', title: 'Arquitectura', description: 'Propuesta local', source: 'presentations/architecture', format: 'revealjs' }],
    materials: [{ id: 'architecture-original', title: 'Arquitectura original', description: 'Documento de propuesta', source: 'materials/architecture/original.pptx', format: 'pptx', date: null, kind: 'proposal', country: 'regional' }],
  };
  write('presentations/architecture/deck.json', JSON.stringify({ schemaVersion: 1, slides: [{ title: 'Propuesta' }] }));
  write(manifest.materials[0].source, office('pptx'));
  const save = () => write('portal/catalog.json', JSON.stringify(manifest));
  save();
  return { root, manifest, write, save };
}

test('the real inventory derives local presentation links and verified material metadata', () => {
  const catalog = loadCatalog(repository);
  for (const presentation of catalog.presentations) {
    assert.match(presentation.href, /^\/presentations\/[a-z0-9-]+\/$/u);
    assert.equal(presentation.readingHref, `${presentation.href}reading.html`);
  }
  for (const material of catalog.materials) {
    assert.equal(material.bytes, fs.statSync(path.join(repository, material.source)).size);
    assert.equal(material.href, '/' + material.source.split('/').map(encodeURIComponent).join('/'));
    assert.ok(['proposal', 'historical', 'meeting', 'questionnaire'].includes(material.kind));
    assert.ok(['chile', 'peru', 'spain', 'regional', null].includes(material.country));
  }
});

test('accepts Word, PowerPoint and PDF sources, including dated meeting originals', t => {
  const f = fixture(t);
  f.manifest.materials.push(
    { id: 'meeting', title: 'Revisión de reunión', description: 'Original de reunión', source: 'materials/meetings/Revisión técnica.docx', format: 'docx', date: '2024-02-29', kind: 'meeting', country: 'peru' },
    { id: 'legacy', title: 'Antecedente', description: 'Documento histórico', source: 'docs/referencias/legacy.pdf', format: 'pdf', date: null, kind: 'historical', country: 'chile' },
  );
  f.write(f.manifest.materials[1].source, office('docx'));
  f.write(f.manifest.materials[2].source, '%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
  f.save();
  const catalog = loadCatalog(f.root);
  assert.deepEqual(catalog.materials.map(item => item.format), ['pptx', 'docx', 'pdf']);
  assert.equal(catalog.materials[1].href, '/materials/meetings/Revisi%C3%B3n%20t%C3%A9cnica.docx');
  assert.equal(catalog.materials[1].date, '2024-02-29');
  assert.equal(catalog.materials[1].kind, 'meeting');
  assert.equal(catalog.materials[1].country, 'peru');
  assert.deepEqual(Object.keys(catalog.presentations[0]).sort(), ['description', 'format', 'href', 'id', 'readingHref', 'title'].sort());
  assert.deepEqual(Object.keys(catalog.materials[0]).sort(), ['bytes', 'country', 'date', 'description', 'format', 'href', 'id', 'kind', 'source', 'title'].sort());
  assert.equal(fs.existsSync(path.join(f.root, 'presentations/architecture/index.html')), false);
});

const invalidManifests = [
  ['obsolete schema', f => { f.manifest.schemaVersion = 1; }, /schemaVersion/],
  ['unknown property', f => { f.manifest.unapproved = []; }, /declare exactly/],
  ['nonarray materials', f => { f.manifest.materials = {}; }, /arrays/],
  ['duplicate IDs across sections', f => { f.manifest.materials[0].id = 'architecture'; }, /duplicate id/],
  ['invalid ID', f => { f.manifest.materials[0].id = 'Unsafe ID'; }, /invalid or duplicate id/],
  ['empty description', f => { f.manifest.materials[0].description = ' '; }, /nonempty plain text/],
  ['derived URL override', f => { f.manifest.materials[0].href = 'https://example.com'; }, /declare exactly/],
  ['unknown kind', f => { f.manifest.materials[0].kind = 'draft'; }, /kind must be/],
  ['missing country', f => { delete f.manifest.materials[0].country; }, /declare exactly/],
  ['unknown country', f => { f.manifest.materials[0].country = 'argentina'; }, /country must be/],
  ['empty country', f => { f.manifest.materials[0].country = ''; }, /country must be/],
  ['missing date', f => { delete f.manifest.materials[0].date; }, /declare exactly/],
  ['invalid calendar date', f => { f.manifest.materials[0].date = '2025-02-29'; }, /invalid calendar date/],
  ['ambiguous date', f => { f.manifest.materials[0].date = '21/10/2026'; }, /YYYY-MM-DD/],
];

test('preserves editorial kind independently from file format and country', t => {
  const f = fixture(t);
  f.manifest.materials = ['proposal', 'questionnaire', 'meeting', 'historical'].map((kind, index) => ({
    id: `${kind}-original`, title: `Original ${kind}`, description: 'Material de prueba',
    source: `materials/meetings/${kind}.docx`, format: 'docx', date: null,
    kind, country: ['regional', 'spain', 'peru', null][index],
  }));
  for (const material of f.manifest.materials) f.write(material.source, office('docx'));
  f.save();
  const { materials } = loadCatalog(f.root);
  assert.deepEqual(materials.map(({ kind, country, format }) => ({ kind, country, format })), [
    { kind: 'proposal', country: 'regional', format: 'docx' },
    { kind: 'questionnaire', country: 'spain', format: 'docx' },
    { kind: 'meeting', country: 'peru', format: 'docx' },
    { kind: 'historical', country: null, format: 'docx' },
  ]);
  assert.deepEqual(materials.filter(item => item.kind === 'proposal').map(item => item.id), ['proposal-original']);
  assert.deepEqual(materials.filter(item => item.kind !== 'proposal').map(item => item.id), ['questionnaire-original', 'meeting-original', 'historical-original']);
});
for (const [name, mutate, error] of invalidManifests) {
  test(`rejects ${name}`, t => {
    const f = fixture(t);
    mutate(f);
    f.save();
    assert.throws(() => loadCatalog(f.root), error);
  });
}

for (const source of ['../outside.pptx', '/absolute.pptx', 'C:/outside.pptx', 'materials/../outside.pptx', 'materials\\outside.pptx', 'materials/%2e%2e/outside.pptx', 'materials//file.pptx', 'materials/con.pptx', 'materials/file.pptx.']) {
  test(`rejects unsafe path ${source}`, t => {
    const f = fixture(t);
    f.manifest.materials[0].source = source;
    f.save();
    assert.throws(() => loadCatalog(f.root), /unsafe source path/);
  });
}

test('rejects a file outside the approved publishing directories', t => {
  const f = fixture(t);
  f.manifest.materials[0].source = 'docs/private/file.pptx';
  f.save();
  assert.throws(() => loadCatalog(f.root), /outside approved directories/);
});

test('rejects missing local files before the publishing pipeline runs', t => {
  const f = fixture(t);
  f.manifest.materials[0].source = 'materials/missing.pptx';
  f.save();
  assert.throws(() => loadCatalog(f.root), /missing local source/);
});

test('rejects malformed JSON and external presentation links', t => {
  const f = fixture(t);
  f.write('portal/catalog.json', '{ invalid');
  assert.throws(() => loadCatalog(f.root), /valid JSON/);
  f.manifest.presentations[0].source = 'https://example.com/presentation';
  f.save();
  assert.throws(() => loadCatalog(f.root), /unsafe source path/);
});

test('requires a real presentation folder and a nonempty source deck', t => {
  const f = fixture(t);
  f.manifest.presentations[0].source = 'presentations/missing';
  f.save();
  assert.throws(() => loadCatalog(f.root), /missing local source/);
  f.manifest.presentations[0].source = 'presentations/architecture';
  f.save();
  for (const value of ['not JSON', 'null', '{"schemaVersion":1,"slides":[]}']) {
    f.write('presentations/architecture/deck.json', value);
    assert.throws(() => loadCatalog(f.root), /invalid presentation deck JSON|no valid local deck/);
  }
});

test('rejects symlinked publishing directories even when their target is local', t => {
  const f = fixture(t);
  const target = path.join(f.root, 'unlisted');
  f.write('unlisted/original.pptx', office('pptx'));
  const link = path.join(f.root, 'materials', 'linked');
  fs.symlinkSync(target, link, process.platform === 'win32' ? 'junction' : 'dir');
  f.manifest.materials[0].source = 'materials/linked/original.pptx';
  f.save();
  try { assert.throws(() => loadCatalog(f.root), /symlink/); }
  finally { fs.unlinkSync(link); }
});

test('rejects extensions that do not match the declared format', t => {
  const f = fixture(t);
  f.manifest.materials[0].format = 'docx';
  f.save();
  assert.throws(() => loadCatalog(f.root), /unsupported or mismatched format/);
});

test('rejects truncated Office files, generic ZIP files, and renamed DOCX files', t => {
  const f = fixture(t);
  for (const content of [Buffer.from('PK\x03\x04'), office('pptx').subarray(0, 100), zip([['one.txt', 'one'], ['two.txt', 'two']]), office('docx')]) {
    f.write(f.manifest.materials[0].source, content);
    assert.throws(() => loadCatalog(f.root), /truncated document|invalid Office ZIP|does not contain a pptx/);
  }
});

test('rejects a non-PDF renamed with a PDF extension', t => {
  const f = fixture(t);
  f.manifest.materials[0].source = 'materials/original.pdf';
  f.manifest.materials[0].format = 'pdf';
  f.write('materials/original.pdf', 'This is ordinary text, not a PDF.');
  f.save();
  assert.throws(() => loadCatalog(f.root), /file is not a PDF/);
});
