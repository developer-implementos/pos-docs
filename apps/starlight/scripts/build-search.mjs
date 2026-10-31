import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as pagefind from 'pagefind';

function response(value, operation) {
  assert.ok(Array.isArray(value.errors), `Pagefind ${operation} returned no errors contract`);
  if (value.errors.length) throw new Error(`Pagefind ${operation} failed: ${value.errors.join('; ')}`);
  return value;
}

export function validateSearchFiles(files) {
  assert.ok(Array.isArray(files) && files.length > 0, 'Pagefind returned no files');
  const paths = new Set();
  const entries = new Map();
  for (const file of files) {
    assert.ok(typeof file.path === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(file.path), 'Invalid Pagefind file path');
    assert.ok(file.path.split('/').every(part => part && part !== '.' && part !== '..'), 'Pagefind path escapes the index');
    const key = file.path.toLowerCase();
    assert.ok(!paths.has(key), 'Pagefind returned duplicate file paths');
    assert.ok(file.content instanceof Uint8Array && file.content.byteLength > 0, `Empty Pagefind file: ${file.path}`);
    paths.add(key);
    entries.set(file.path, file.content);
  }
  const metadata = entries.get('pagefind-entry.json');
  assert.ok(metadata, 'Pagefind returned no metadata');
  const spanish = JSON.parse(Buffer.from(metadata).toString('utf8')).languages?.es;
  assert.ok(Number.isSafeInteger(spanish?.page_count) && spanish.page_count > 0 && /^es_[a-f0-9]+$/.test(spanish.hash), 'Pagefind must index Spanish documentation');
  for (const required of ['pagefind.js', 'pagefind-ui.js', 'pagefind-ui.css', `pagefind.${spanish.hash}.pf_meta`]) {
    assert.ok(entries.has(required), `Missing Pagefind artifact: ${required}`);
  }
  return { files, pages: spanish.page_count };
}

export async function buildSearchIndex(directory) {
  const input = await fs.realpath(directory);
  const output = path.join(input, 'pagefind');
  // Astro produces a fresh artifact; no second writer or previous index is allowed.
  await fs.mkdir(output);
  try {
    const { index } = response(await pagefind.createIndex(), 'createIndex');
    assert.ok(index, 'Pagefind did not create an index');
    response(await index.addDirectory({ path: input }), 'addDirectory');
    const generated = response(await index.getFiles(), 'getFiles');
    const validated = validateSearchFiles(generated.files);
    for (const file of validated.files) {
      const target = path.join(output, ...file.path.split('/'));
      await fs.mkdir(path.dirname(target), { recursive: true });
      // File bytes cross the API before shutdown; Node owns and awaits every disk write.
      await fs.writeFile(target, file.content, { flag: 'wx' });
    }
    console.log(`Search index: ${validated.pages} Spanish pages, ${validated.files.length} complete files.`);
  } finally {
    await pagefind.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.equal(process.argv.length, 3, 'Usage: build-search.mjs <generated-guide-directory>');
  await buildSearchIndex(process.argv[2]);
}
