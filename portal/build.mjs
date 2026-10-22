import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadCatalog} from './catalog.mjs';
import {loadPreviews} from './previews.mjs';
import {renderMaterialViewer} from './viewer.mjs';
import {renderPortal} from './render.mjs';
import {docsOrigin, repositoryOrigin} from '../apps/starlight/site-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
assert.ok(fs.existsSync(path.join(output, '.pos-docs-build')) && !fs.lstatSync(output).isSymbolicLink(), 'Build the documentation artifact before the portal');
const catalog = loadCatalog(root);
const previews = loadPreviews(root, catalog);
const assets = path.join(output, 'portal/assets');
fs.mkdirSync(assets, {recursive:true});
for (const file of ['logo.svg', 'Inter-Regular.ttf', 'Inter-Bold.ttf', 'Inter-LICENSE.txt']) {
  fs.copyFileSync(path.join(root, 'presentations/architecture/assets', file), path.join(assets, file));
}
fs.copyFileSync(path.join(root, 'apps/starlight/static/favicon.svg'), path.join(assets, 'favicon.svg'));
for (const file of ['portal.css', 'portal.js', 'viewer.css', 'viewer.js']) fs.copyFileSync(path.join(root, 'portal', file), path.join(output, 'portal', file));
const require = createRequire(path.join(root, 'apps/starlight/package.json'));
const pdfjs = path.dirname(require.resolve('pdfjs-dist/package.json'));
const pdfjsOutput = path.join(output, 'portal/pdfjs');
for (const relative of ['build/pdf.mjs', 'build/pdf.worker.mjs', 'web/pdf_viewer.mjs', 'web/pdf_viewer.css', 'web/images', 'cmaps', 'standard_fonts', 'wasm', 'LICENSE']) {
  const destination = path.join(pdfjsOutput, relative);
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  fs.cpSync(path.join(pdfjs, relative), destination, {recursive:true});
}
for (const item of catalog.materials) {
  // Only catalogued files are published from materials/. Originals retain their bytes and paths.
  const destination = path.join(output, item.source);
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  fs.copyFileSync(path.join(root, item.source), destination);
  const preview = previews.get(item.id);
  const pdf = path.join(output, preview.path);
  fs.mkdirSync(path.dirname(pdf), {recursive:true});
  fs.copyFileSync(path.join(root, preview.path), pdf);
  const viewer = path.join(output, 'materials/view', item.id);
  fs.mkdirSync(viewer, {recursive:true});
  fs.writeFileSync(path.join(viewer, 'index.html'), renderMaterialViewer(item, preview, docsOrigin));
}
for (const item of catalog.presentations) {
  for (const href of [item.href, item.readingHref]) {
    const destination = path.join(output, decodeURIComponent(href), href.endsWith('/') ? 'index.html' : '');
    assert.ok(fs.existsSync(destination), `Presentation was catalogued but not built: ${href}`);
  }
}
fs.writeFileSync(path.join(output, 'index.html'), renderPortal(catalog, docsOrigin, repositoryOrigin));
console.log(`Resource portal: / with ${catalog.presentations.length} presentation(s), ${catalog.materials.length} originals and ${previews.size} PDF previews.`);
