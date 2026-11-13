import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

// The site publishes this ZIP for download, so a stale copy republishes text that the sources already
// corrected. This test keeps every packaged file identical to its source in the repository.
const root = fileURLToPath(new URL('../../', import.meta.url));
const collection = path.join(root, 'docs/diagramas-excalidraw');
const archivePath = path.join(collection, 'diagramas-c4-excalidraw.zip');
const refresh = 'Run python tools/diagrams/package-excalidraw.py and commit the ZIP';

/** Entries of a ZIP archive, read from its central directory, as name → uncompressed bytes. */
export function zipEntries(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  assert.ok(end >= 0, 'Not a ZIP archive');
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const entries = new Map();
  for (let index = 0; index < count; index += 1) {
    assert.equal(buffer.readUInt32LE(offset), 0x02014b50, 'Corrupt ZIP central directory');
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + size);
    assert.ok(method === 0 || method === 8, `Unsupported ZIP compression in ${name}`);
    entries.set(name, method === 0 ? Buffer.from(data) : inflateRawSync(data));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

/** Files that tools/diagrams/package-excalidraw.py packages, as archive name → repository path. */
function packagedSources() {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'tools/diagrams/collection.json'), 'utf8'));
  const sources = new Map();
  for (const name of fs.readdirSync(collection).sort()) {
    const file = path.join(collection, name);
    if (fs.statSync(file).isFile() && ['.excalidraw', '.svg', '.html', '.md'].includes(path.extname(name)))
      sources.set(`pos-c4/docs/diagramas-excalidraw/${name}`, file);
  }
  for (const board of manifest.boards.filter((item) => item.kind === 'structural'))
    sources.set(`pos-c4/docs/diagramas-excalidraw/mermaid/${board.key}.mmd`, path.join(collection, 'mermaid', `${board.key}.mmd`));
  for (const directory of ['docs', 'docs/decisions', 'docs/contracts'])
    for (const name of fs.readdirSync(path.join(root, directory)).sort())
      if (name.endsWith('.md')) sources.set(`pos-c4/${directory}/${name}`, path.join(root, directory, name));
  return sources;
}

test('the published Excalidraw collection packages the current version of every source', () => {
  const entries = zipEntries(fs.readFileSync(archivePath));
  const sources = packagedSources();
  const packaged = [...entries.keys()].filter((name) => name !== 'pos-c4/ABRIR.txt').sort();
  assert.deepEqual(packaged, [...sources.keys()].sort(), `The ZIP inventory differs from its sources. ${refresh}.`);
  for (const [name, file] of sources)
    assert.ok(entries.get(name).equals(fs.readFileSync(file)), `${name} is stale. ${refresh}.`);
});
