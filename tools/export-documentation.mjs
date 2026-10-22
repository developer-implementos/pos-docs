import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildLinkManifest} from '../apps/starlight/scripts/prepare-content.mjs';
import {productEvidence} from '../apps/starlight/scripts/product-evidence.mjs';
import {repositoryOrigin} from '../apps/starlight/site-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const diagrams = JSON.parse(fs.readFileSync(path.join(root, 'tools/diagrams/collection.json'), 'utf8'));
const inputs = [
  'docs/propuesta-arquitectura.md',
  'docs/vistas-arquitectura-y-flujos.md',
  'docs/recorridos-datos-tablas.md',
  'docs/operacion-caja-y-evolucion.md',
  'docs/roadmap.md',
  'docs/roadmap.json',
  'tools/diagrams/models/c4-data.js',
  'tools/diagrams/models/dynamic-data.cjs',
  'tools/diagrams/models/c4-layouts.json',
  ...[...diagrams.boards.filter(board => board.kind === 'structural').map(board => board.file + '.svg'), 'bounds.json'].map(file => 'docs/diagramas-excalidraw/previews/' + file),
].map(file => ({key: file, path: file}));
// Schema 1 consumers use this logical identifier; its physical source now belongs to POS Docs.
inputs.push({key: 'apps/pos-docs/src/data/monorepo-catalog.json', path: 'apps/starlight/src/data/monorepo-catalog.json'});
const files = Object.fromEntries(inputs.map(file => {
  const content = fs.readFileSync(path.join(root, file.path), 'utf8').replaceAll('\r\n', '\n');
  return [file.key, {content, sha256: createHash('sha256').update(content).digest('hex')}];
}));
const revision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
const changes = execFileSync('git', ['status', '--porcelain'], {cwd: root, encoding: 'utf8'}).trim();
if (changes) console.warn(`Documentation checkout changes (status and paths only):\n${changes}`);
const snapshot = {
  schemaVersion: 1,
  repository: repositoryOrigin,
  revision,
  dirty: changes.length > 0,
  notice: 'Generated public reference snapshot. Edit documentation in developer-implementos/pos-docs, then regenerate from a clean revision. Product evidence has its own pinned revision.',
  product: productEvidence,
  links: buildLinkManifest(),
  files,
};
const target = path.join(root, 'dist/documentation.snapshot.json');
fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`Documentation snapshot: ${revision.slice(0, 12)}${snapshot.dirty ? ' (workspace changes; not for publication to presentation repository)' : ' (clean revision)'}.`);
