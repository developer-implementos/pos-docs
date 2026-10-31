import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
assert.equal(process.argv.length, 2, 'Usage: node presentations/tools/review-sources.mjs');
assert.equal(git('status', '--porcelain'), '', 'Commit the reviewed editorial changes before capturing presentation sources.');
const revision = git('rev-parse', 'HEAD');
const manifestPath = path.join(root, 'presentations/architecture/sources.json');
const sources = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const tracked = new Set(git('ls-tree', '-r', '--name-only', revision).split('\n'));
assert.equal(sources.schemaVersion, 1, 'Unsupported presentation source manifest.');
assert.equal(new Set(sources.inputs.map(input => input.path)).size, sources.inputs.length, 'Duplicate source paths.');
sources.inputs = sources.inputs.map(input => {
  assert.ok(tracked.has(input.path) && !input.path.split('/').includes('..'), 'Source must be a tracked repository file.');
  const committed = execFileSync('git', ['show', `${revision}:${input.path}`], { cwd: root });
  const current = fs.readFileSync(path.join(root, input.path));
  assert.ok(committed.equals(current), `Working source differs from its commit: ${input.path}`);
  return { path: input.path, sha256: createHash('sha256').update(committed).digest('hex') };
});
sources.revision = revision;
sources.reviewedOn = new Date().toISOString().slice(0, 10);
sources.sourceStatus = 'Fuentes documentales verificadas en la revisión indicada; F01 en revisión de laboratorio, sin aceptación productiva.';
fs.writeFileSync(manifestPath, `${JSON.stringify(sources, null, 2)}\n`);
console.log(`Presentation source review: ${revision.slice(0, 12)}; ${sources.inputs.length} tracked inputs.`);
