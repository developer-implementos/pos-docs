import fs from 'node:fs';
import path from 'node:path';

const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const formats = new Set(['docx', 'pptx', 'pdf']);
const kinds = new Set(['proposal', 'historical', 'meeting']);

function fail(message) {
  throw new Error(`Portal catalog: ${message}`);
}

function object(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    fail(`${label} must declare exactly: ${keys.join(', ')}`);
  }
}

function text(value, label) {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || /[\u0000-\u001f\u007f]/u.test(value)) {
    fail(`${label} must be nonempty plain text without surrounding whitespace or control characters`);
  }
  return value;
}

function safeSource(value) {
  text(value, 'source');
  const segments = value.split('/');
  if (/[\\<>:"|?*#%]/u.test(value) || segments.some(segment =>
    !segment || segment === '.' || segment === '..' || /[. ]$/u.test(segment) ||
    /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(segment))) {
    fail(`unsafe source path: ${value}`);
  }
  return segments;
}

/** Inspect each ancestor, so a directory symlink cannot turn an approved path into an external file. */
function localPath(root, source, expected) {
  const segments = safeSource(source);
  let current = root;
  let stat;
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    try { stat = fs.lstatSync(current); }
    catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') fail(`missing local source: ${source}`);
      throw error;
    }
    if (stat.isSymbolicLink()) fail(`symlink is not a publishable source: ${source}`);
    if (index < segments.length - 1 && !stat.isDirectory()) fail(`source ancestor is not a directory: ${source}`);
  }
  if (expected === 'file' ? !stat.isFile() : !stat.isDirectory()) fail(`expected ${expected}: ${source}`);
  return { absolute: current, stat };
}

function readExactly(fd, length, position, source) {
  const buffer = Buffer.alloc(length);
  if (fs.readSync(fd, buffer, 0, length, position) !== length) fail(`truncated file: ${source}`);
  return buffer;
}

/** Check the standard OOXML ZIP container without extracting or executing any document content. */
function officeContainer(fd, size, format, source) {
  const tailSize = Math.min(size, 65557);
  const tail = readExactly(fd, tailSize, size - tailSize, source);
  let end = -1;
  for (let offset = tail.length - 22; offset >= 0; offset--) {
    if (tail.readUInt32LE(offset) === 0x06054b50 && offset + 22 + tail.readUInt16LE(offset + 20) === tail.length) {
      end = offset;
      break;
    }
  }
  if (end < 0) fail(`invalid Office ZIP directory: ${source}`);
  const entries = tail.readUInt16LE(end + 10);
  const directorySize = tail.readUInt32LE(end + 12);
  const directoryOffset = tail.readUInt32LE(end + 16);
  const endOffset = size - tailSize + end;
  if (tail.readUInt16LE(end + 4) !== 0 || tail.readUInt16LE(end + 6) !== 0 ||
      tail.readUInt16LE(end + 8) !== entries || entries < 2 || entries === 0xffff ||
      directorySize === 0xffffffff || directoryOffset === 0xffffffff ||
      directoryOffset + directorySize !== endOffset) {
    fail(`Office file must use a complete, single-volume standard ZIP: ${source}`);
  }
  const required = new Set(['[Content_Types].xml', format === 'pptx' ? 'ppt/presentation.xml' : 'word/document.xml']);
  let cursor = directoryOffset;
  for (let index = 0; index < entries; index++) {
    if (cursor + 46 > endOffset) fail(`truncated Office ZIP directory: ${source}`);
    const header = readExactly(fd, 46, cursor, source);
    if (header.readUInt32LE(0) !== 0x02014b50 || (header.readUInt16LE(8) & 1) || header.readUInt16LE(34) !== 0) {
      fail(`invalid or encrypted Office ZIP entry: ${source}`);
    }
    const nameLength = header.readUInt16LE(28);
    const next = cursor + 46 + nameLength + header.readUInt16LE(30) + header.readUInt16LE(32);
    if (next > endOffset) fail(`invalid Office ZIP entry bounds: ${source}`);
    const name = readExactly(fd, nameLength, cursor + 46, source).toString('utf8');
    if (required.has(name)) {
      const localOffset = header.readUInt32LE(42);
      if (localOffset + 30 > directoryOffset || readExactly(fd, 4, localOffset, source).readUInt32LE(0) !== 0x04034b50) {
        fail(`missing Office document entry: ${source}`);
      }
      required.delete(name);
    }
    cursor = next;
  }
  if (cursor !== endOffset || required.size) fail(`file does not contain a ${format} document: ${source}`);
}

function verifyFormat(absolute, format, source) {
  const fd = fs.openSync(absolute, 'r');
  try {
    const { size } = fs.fstatSync(fd);
    if (!Number.isSafeInteger(size) || size < 8) fail(`empty or truncated document: ${source}`);
    const header = readExactly(fd, 8, 0, source);
    if (format === 'pdf') {
      if (!/^%PDF-(?:1\.[0-7]|2\.0)$/u.test(header.toString('ascii'))) fail(`file is not a PDF: ${source}`);
    } else {
      if (header.readUInt32LE(0) !== 0x04034b50) fail(`file is not an Office ZIP container: ${source}`);
      officeContainer(fd, size, format, source);
    }
    return size;
  } finally {
    fs.closeSync(fd);
  }
}

function date(value, id) {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) fail(`date must be YYYY-MM-DD or null: ${id}`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) fail(`invalid calendar date: ${id}`);
  return value;
}

const href = source => '/' + source.split('/').map(encodeURIComponent).join('/');

/** Read the explicit public inventory. No globbing, network access, copying, or build side effects. */
export function loadCatalog(root) {
  const absoluteRoot = path.resolve(root);
  if (fs.lstatSync(absoluteRoot).isSymbolicLink() || !fs.statSync(absoluteRoot).isDirectory()) fail('root must be a local directory');
  const manifest = localPath(absoluteRoot, 'portal/catalog.json', 'file');
  let catalog;
  try { catalog = JSON.parse(fs.readFileSync(manifest.absolute, 'utf8')); }
  catch (error) {
    if (error instanceof SyntaxError) fail('catalog.json must contain valid JSON');
    throw error;
  }
  object(catalog, ['schemaVersion', 'presentations', 'materials'], 'manifest');
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.presentations) || !Array.isArray(catalog.materials)) {
    fail('expected schemaVersion 1 and presentation/material arrays');
  }
  const ids = new Set();
  function metadata(entry) {
    if (typeof entry.id !== 'string' || !slug.test(entry.id) || ids.has(entry.id)) fail(`invalid or duplicate id: ${entry.id}`);
    ids.add(entry.id);
    return { id: entry.id, title: text(entry.title, `${entry.id}.title`), description: text(entry.description, `${entry.id}.description`) };
  }
  const presentations = catalog.presentations.map(entry => {
    object(entry, ['id', 'title', 'description', 'source', 'format'], 'presentation');
    const result = metadata(entry);
    safeSource(entry.source);
    if (!/^presentations\/[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.source) || entry.format !== 'revealjs') {
      fail(`presentation must be a local Reveal.js source folder: ${entry.id}`);
    }
    localPath(absoluteRoot, entry.source, 'directory');
    const deckPath = localPath(absoluteRoot, `${entry.source}/deck.json`, 'file');
    let deck;
    try { deck = JSON.parse(fs.readFileSync(deckPath.absolute, 'utf8')); }
    catch (error) {
      if (error instanceof SyntaxError) fail(`invalid presentation deck JSON: ${entry.id}`);
      throw error;
    }
    if (!deck || deck.schemaVersion !== 1 || !Array.isArray(deck.slides) || !deck.slides.length) fail(`presentation has no valid local deck: ${entry.id}`);
    return { ...result, href: href(entry.source) + '/', readingHref: href(entry.source) + '/reading.html', format: entry.format };
  });
  const materials = catalog.materials.map(entry => {
    object(entry, ['id', 'title', 'description', 'source', 'format', 'date', 'kind'], 'material');
    const result = metadata(entry);
    safeSource(entry.source);
    if (!/^(?:materials\/|docs\/referencias\/|presentations\/[a-z0-9]+(?:-[a-z0-9]+)*\/downloads\/)/u.test(entry.source)) {
      fail(`material source is outside approved directories: ${entry.id}`);
    }
    if (!formats.has(entry.format) || path.posix.extname(entry.source).toLowerCase() !== `.${entry.format}`) fail(`unsupported or mismatched format: ${entry.id}`);
    if (!kinds.has(entry.kind)) fail(`kind must be proposal, historical, or meeting: ${entry.id}`);
    const file = localPath(absoluteRoot, entry.source, 'file');
    const bytes = verifyFormat(file.absolute, entry.format, entry.source);
    return { ...result, source: entry.source, href: href(entry.source), format: entry.format, bytes, date: date(entry.date, entry.id), kind: entry.kind };
  });
  return { presentations, materials };
}
