import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const fail = message => { throw new Error(`Material previews: ${message}`); };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function shape(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    fail(`${label} must declare exactly: ${keys.join(', ')}`);
  }
}
function text(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.trim() !== value || /[\u0000-\u001f\u007f]/u.test(value)) fail(`invalid ${label}`);
}
function file(root, relative) {
  if (!relative || relative.includes('\\') || relative.split('/').some(part => !part || part === '..' || part === '.')) fail(`unsafe path: ${relative}`);
  let current = root;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    let stat;
    try { stat = fs.lstatSync(current); } catch { fail(`missing file: ${relative}`); }
    if (stat.isSymbolicLink()) fail(`symlink is not a publishable preview: ${relative}`);
  }
  if (!fs.statSync(current).isFile()) fail(`expected a file: ${relative}`);
  return fs.readFileSync(current);
}

/** Only explicitly cataloged and reviewed PDF derivatives can reach the public build. */
export function loadPreviews(root, catalog) {
  const directory = path.resolve(root);
  if (fs.lstatSync(directory).isSymbolicLink()) fail('root cannot be a symlink');
  let manifest;
  try { manifest = JSON.parse(file(directory, 'materials/previews/manifest.json').toString('utf8')); }
  catch (error) { if (error instanceof SyntaxError) fail('manifest must contain valid JSON'); throw error; }
  shape(manifest, ['schemaVersion', 'generator', 'documents'], 'manifest');
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.documents)) fail('unsupported manifest schema');
  shape(manifest.generator, ['name', 'version'], 'generator');
  text(manifest.generator.name, 'generator name');
  text(manifest.generator.version, 'generator version');
  const materials = new Map(catalog.materials.map(item => [item.id, item]));
  const previews = new Map();
  for (const entry of manifest.documents) {
    shape(entry, ['id', 'sourceSha256', 'pdf', 'pdfSha256', 'pages'], 'document');
    const item = materials.get(entry.id);
    if (!item || previews.has(entry.id)) fail(`unknown or duplicate material: ${entry.id}`);
    if (entry.pdf !== `materials/previews/${item.id}.pdf`) fail(`unsafe or mismatched PDF path: ${entry.id}`);
    if (!Number.isSafeInteger(entry.pages) || entry.pages < 1) fail(`invalid page count: ${entry.id}`);
    for (const key of ['sourceSha256', 'pdfSha256']) if (!/^[a-f0-9]{64}$/u.test(entry[key])) fail(`invalid ${key}: ${entry.id}`);
    if (sha256(file(directory, item.source)) !== entry.sourceSha256) fail(`stale source hash; regenerate preview: ${entry.id}`);
    const pdf = file(directory, entry.pdf);
    if (!/^%PDF-(?:1\.[0-7]|2\.0)$/u.test(pdf.subarray(0, 8).toString('ascii'))) fail(`not a PDF: ${entry.id}`);
    if (sha256(pdf) !== entry.pdfSha256) fail(`PDF hash does not match reviewed preview: ${entry.id}`);
    previews.set(item.id, {
      href: '/' + entry.pdf, path: entry.pdf, pages: entry.pages,
      sourceSha256: entry.sourceSha256, pdfSha256: entry.pdfSha256,
    });
  }
  if (previews.size !== materials.size) fail('every cataloged material must have a reviewed preview');
  return previews;
}
