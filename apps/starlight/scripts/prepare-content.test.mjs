import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadCatalog } from '../../../portal/catalog.mjs';
import { rewriteTarget } from './prepare-content.mjs';
import { exploreCatalog } from '../../../tools/archify/catalog.mjs';
import { authoredPageFiles, generatedPageFile } from './content-files.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const catalog = loadCatalog(root);
const source = 'docs/meeting-sources/country-comparison.md';

test('root and nested generated pages remain excluded after repeated generation without hiding authored collisions', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-content-inventory-'));
  const resolved = fs.realpathSync(directory);
  t.after(() => {
    assert.equal(fs.realpathSync(directory), resolved);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    fs.rmSync(resolved, {recursive: true});
  });
  const pages = [{route: 'flows'}, {route: 'flows/sale', flow: 'sale'}];
  for (let pass = 0; pass < 2; pass++) {
    for (const page of pages) {
      const file = path.join(directory, generatedPageFile(page));
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.writeFileSync(file, '# Generated\n');
    }
    assert.deepEqual(authoredPageFiles(directory, pages), []);
  }
  for (const file of ['flows.mdx', 'flows/sale.md', 'flows/notes.md']) fs.writeFileSync(path.join(directory, file), '# Authored\n');
  assert.deepEqual(authoredPageFiles(directory, pages).sort(), ['flows.mdx', 'flows/notes.md', 'flows/sale.md']);
});

test('portal links keep their site destinations instead of becoming GitHub source links', () => {
  assert.equal(rewriteTarget('/', source), '/');
  assert.equal(rewriteTarget('/#materials', source), '/#materials');
  assert.equal(rewriteTarget('/#presentations', 'docs/product-repository.md'), '/#presentations');
  assert.equal(rewriteTarget('/?view=sources#materials', source), '/?view=sources#materials');
});

test('every cataloged original resolves to its canonical local download from absolute or relative Markdown', () => {
  for (const item of catalog.materials) {
    assert.equal(rewriteTarget(item.href, source), item.href, `${item.id}: encoded site URL`);
    assert.equal(rewriteTarget(`</${item.source}>`, source), item.href, `${item.id}: angle-wrapped path`);
    assert.equal(rewriteTarget(path.posix.relative(path.posix.dirname(source), item.source), source), item.href, `${item.id}: repository-relative path`);
  }
});

test('uncataloged material paths cannot become public downloads', () => {
  assert.throws(() => rewriteTarget('/materials/meetings/unpublished.docx', source), /not published in portal\/catalog\.json/u);
  assert.throws(() => rewriteTarget('../../materials/meetings/unpublished.pdf', source), /not published in portal\/catalog\.json/u);
  assert.throws(() => rewriteTarget('/materials/README.md', source), /not published in portal\/catalog\.json/u, 'An existing repository file is not automatically public');
  assert.throws(() => rewriteTarget('/%2e%2e/private.docx', source), /escapes repository/u);
});

test('cataloged presentation routes, guide routes and external references retain their meaning', () => {
  assert.equal(rewriteTarget('/explore/', source), '/explore/');
  for (const diagram of exploreCatalog) assert.equal(rewriteTarget(`${diagram.href}#focus=branch-api`, source), `${diagram.href}#focus=branch-api`);
  for (const deck of catalog.presentations) {
    assert.equal(rewriteTarget(deck.href, source), deck.href);
    assert.equal(rewriteTarget(`${deck.readingHref}#architecture`, source), `${deck.readingHref}#architecture`);
  }
  assert.equal(rewriteTarget('/guide/proposal/product/', source), '/guide/proposal/product/');
  assert.equal(rewriteTarget('https://example.com/reference#section', source), 'https://example.com/reference#section');
});
