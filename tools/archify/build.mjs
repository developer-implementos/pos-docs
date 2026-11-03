import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { projectDiagrams, detailData } from './project.mjs';
import { packageDiagram } from './package.mjs';
import { projectDatabase } from './database.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
const output = path.join(root, 'dist/explore');
const work = path.join(root, 'tmp/archify-build');
const vendor = path.join(directory, 'vendor/archify');

export function verifyVendor() {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'vendor-manifest.json'), 'utf8'));
  for (const [name, expected] of Object.entries(manifest.files)) {
    const actual = createHash('sha256').update(fs.readFileSync(path.join(vendor, name))).digest('hex');
    if (actual !== expected) throw new Error(`Archify upstream integrity failed: ${name}`);
  }
  return manifest;
}

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 5 * 1024 * 1024, env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Archify failed: ${args[0]}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

export function buildExplore() {
  const upstream = verifyVendor();
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(path.join(output, 'assets'), { recursive: true });
  for (const [from, to] of [['viewer.css', 'pos-docs.css'], ['viewer.js', 'pos-docs.js']]) fs.copyFileSync(path.join(directory, from), path.join(output, 'assets', to));
  fs.copyFileSync(path.join(vendor, 'LICENSE'), path.join(output, 'assets/ARCHIFY-LICENSE.txt'));
  fs.copyFileSync(path.join(vendor, 'THIRD_PARTY_NOTICES.md'), path.join(output, 'assets/THIRD-PARTY-NOTICES.txt'));
  const catalog = [];
  const manifestPath = path.join(root, 'data/product-reference/manifest.json');
  const productManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const productSource = productManifest.source;
  if (productSource && (productSource.repository !== 'https://github.com/developer-implementos/pos-platform' || !/^[a-f0-9]{40}$/.test(productSource.commit))) throw new Error('Invalid product reference identity');
  const schemaBytes = fs.readFileSync(path.join(root, 'data/product-reference/database/schema.json'));
  if (createHash('sha256').update(schemaBytes).digest('hex') !== productManifest.database.sha256) throw new Error('Product schema integrity failed');
  const diagrams = [...projectDiagrams(), ...projectDatabase(JSON.parse(schemaBytes), productSource)];
  for (const { diagram, details, ...entry } of diagrams) {
    const source = path.join(work, `${entry.id}.json`), rendered = path.join(work, `${entry.id}.html`);
    fs.writeFileSync(source, JSON.stringify(diagram, null, 2) + '\n');
    run([path.join(vendor, 'bin/archify.mjs'), 'deliver', diagram.diagram_type, source, rendered, '--quality', diagram.meta.quality_profile, '--json']);
    run([path.join(vendor, 'bin/archify.mjs'), 'check', rendered, '--require-provenance', '--json']);
    const page = packageDiagram(fs.readFileSync(rendered, 'utf8'), entry, details || detailData(entry.id, productSource));
    fs.mkdirSync(path.join(output, entry.id), { recursive: true });
    fs.writeFileSync(path.join(output, entry.id, 'index.html'), page.html);
    fs.copyFileSync(source, path.join(output, entry.id, 'source.json'));
    for (const [name, content] of page.assets) fs.writeFileSync(path.join(output, 'assets', name), content);
    catalog.push({ ...entry, generator: `Archify ${upstream.version}`, sourceSha256: createHash('sha256').update(fs.readFileSync(source)).digest('hex') });
  }
  fs.writeFileSync(path.join(output, 'catalog.json'), JSON.stringify({ schemaVersion: 1, diagrams: catalog }, null, 2) + '\n');
  console.log(`Archify: ${catalog.length} derived diagrams, local assets and original license in dist/explore/.`);
  return catalog;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildExplore();
