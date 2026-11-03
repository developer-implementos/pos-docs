import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { projectDiagrams } from './project.mjs';
import { projectDatabase } from './database.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = path.join(root, 'tmp/archify-review');
const revision = process.env.ARCHIFY_REVIEW_ROUND || 'initial';
if (!/^[a-z0-9-]+$/.test(revision)) throw new Error('Invalid review round');
fs.mkdirSync(directory, { recursive: true });
const source = JSON.parse(fs.readFileSync(path.join(root, 'data/product-reference/manifest.json'))).source;
const models = [...projectDiagrams(), ...projectDatabase(JSON.parse(fs.readFileSync(path.join(root, 'data/product-reference/database/schema.json'))), source)];
const requested = process.argv.slice(2);
let failed = false;
for (const item of models.filter(item => !requested.length || requested.includes(item.id))) {
  const specification = path.join(directory, `${item.id}.json`);
  fs.writeFileSync(specification, JSON.stringify(item.diagram, null, 2) + '\n');
  const result = spawnSync(process.execPath, [path.join(root, 'tools/archify/vendor/archify/bin/archify.mjs'), 'finalize', item.type, specification, path.join(directory, `${item.id}.html`), '--quality', item.diagram.meta.quality_profile, '--out-dir', path.join(directory, revision, item.id), '--json'], { cwd: root, windowsHide: true, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, env: { ...process.env, ARCHIFY_UPDATE_CHECK_DISABLED: '1' } });
  fs.writeFileSync(path.join(directory, `${item.id}-${revision}.result.json`), result.stdout || JSON.stringify({ error: String(result.error || result.stderr) }));
  if (result.status !== 0) failed = true;
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch { parsed = { error: result.stderr }; }
  console.log(JSON.stringify({ id: item.id, ok: result.status === 0, gates: parsed.gates, diagnostics: parsed.diagnostics?.map(item => ({ code: item.code, message: item.message })).slice(0, 4), error: parsed.error }));
}
if (failed) process.exitCode = 1;
