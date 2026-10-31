import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { buildSearchIndex, validateSearchFiles } from './build-search.mjs';

const file = (name, content) => ({ path: name, content: Buffer.from(content) });
function validFiles() {
  return [
    file('pagefind-entry.json', JSON.stringify({ languages: { es: { page_count: 1, hash: 'es_123abc' } } })),
    ...['pagefind.js', 'pagefind-ui.js', 'pagefind-ui.css', 'pagefind.es_123abc.pf_meta'].map(name => file(name, 'complete')),
  ];
}

test('rejects empty metadata, missing Spanish metadata and incomplete referenced indexes', () => {
  assert.throws(() => validateSearchFiles([file('pagefind-entry.json', '')]), /Empty Pagefind/);
  assert.throws(() => validateSearchFiles([file('pagefind-entry.json', '{}')]), /Spanish/);
  assert.throws(() => validateSearchFiles(validFiles().slice(0, -1)), /Missing Pagefind artifact/);
});

test('rejects traversal, absolute paths and case-insensitive collisions before writing', () => {
  for (const candidate of ['../outside.js', 'a/../../outside.js', '/outside.js', 'C:/outside.js', 'a\\outside.js']) {
    assert.throws(() => validateSearchFiles([...validFiles(), file(candidate, 'bad')]));
  }
  assert.throws(() => validateSearchFiles([...validFiles(), file('PAGEFIND.JS', 'duplicate')]), /duplicate/);
});

test('writes a complete real Spanish index and refuses a second index writer', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'pos-docs-search-'));
  try {
    await fs.writeFile(path.join(directory, 'index.html'), '<html lang="es"><head><title>Venta recuperable</title></head><body><main data-pagefind-body>Confirmación de efectivo por identidad del comando.</main></body></html>');
    await buildSearchIndex(directory);
    const output = path.join(directory, 'pagefind');
    const metadata = JSON.parse(await fs.readFile(path.join(output, 'pagefind-entry.json'), 'utf8'));
    assert.equal(metadata.languages.es.page_count, 1);
    assert.ok((await fs.stat(path.join(output, `pagefind.${metadata.languages.es.hash}.pf_meta`))).size > 0);
    await assert.rejects(buildSearchIndex(directory), /EEXIST/);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(directory).startsWith('pos-docs-search-'));
    await fs.rm(directory, { recursive: true, force: true });
  }
});
