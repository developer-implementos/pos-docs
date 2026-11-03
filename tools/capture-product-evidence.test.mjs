import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync, spawnSync} from 'node:child_process';
import test from 'node:test';

const script = fileURLToPath(new URL('./capture-product-evidence.mjs', import.meta.url));
function fixture(t) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pos-evidence-capture-')));
  t.after(() => {
    assert.equal(path.dirname(directory), fs.realpathSync(os.tmpdir()));
    assert.equal(fs.realpathSync(directory), directory);
    fs.rmSync(directory, {recursive: true});
  });
  const editorial = path.join(directory, 'editorial');
  const product = path.join(directory, 'product');
  for (const entry of ['tools', 'apps/starlight/src/data', 'docs/editorial']) fs.mkdirSync(path.join(editorial, entry), {recursive: true});
  fs.mkdirSync(product);
  fs.writeFileSync(path.join(directory, 'empty-git-config'), '');
  const env = {...process.env, GIT_CONFIG_GLOBAL: path.join(directory, 'empty-git-config'), GIT_CONFIG_NOSYSTEM: '1'};
  const git = (...args) => execFileSync('git', ['-c', 'core.hooksPath=', ...args], {cwd: product, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
  git('init', '--initial-branch=main');
  git('remote', 'add', 'origin', 'https://github.com/developer-implementos/pos-platform');
  fs.writeFileSync(path.join(product, 'README.md'), '# Product\n');
  git('add', 'README.md');
  git('-c', 'user.name=Evidence fixture', '-c', 'user.email=fixture@example.test', '-c', 'commit.gpgsign=false', 'commit', '-m', 'fixture');
  fs.copyFileSync(script, path.join(editorial, 'tools/capture-product-evidence.mjs'));
  fs.writeFileSync(path.join(editorial, 'apps/starlight/content-map.mjs'), "export const generatedPages = [{source:'docs/product-repository.md'}]; export const sourceRouteAliases = {};\n");
  fs.writeFileSync(path.join(editorial, 'apps/starlight/site-config.mjs'), "export const productRepositoryOrigin = 'https://github.com/developer-implementos/pos-platform';\n");
  fs.writeFileSync(path.join(editorial, 'docs/product-repository.md'), '# Editorial\n');
  const reviewFile = path.join(editorial, 'docs/editorial/reviews.json');
  const historicalReview = '{"reviews":[{"productRevision":"previous-reviewed-revision"}]}\n';
  fs.writeFileSync(reviewFile, historicalReview);
  const target = path.join(editorial, 'apps/starlight/src/data/product-evidence.json');
  const run = () => spawnSync(process.execPath, ['tools/capture-product-evidence.mjs', '--workspace', product], {cwd: editorial, env, encoding: 'utf8', windowsHide: true});
  return {product, git, target, run, reviewFile, historicalReview};
}

test('capture reads a clean immutable product revision without touching editorial review', t => {
  const f = fixture(t);
  const result = f.run();
  assert.equal(result.status, 0, result.stderr);
  const evidence = JSON.parse(fs.readFileSync(f.target, 'utf8'));
  assert.equal(evidence.schemaVersion, 2);
  assert.equal(evidence.revision, f.git('rev-parse', 'HEAD'));
  assert.ok(Number.isFinite(Date.parse(evidence.capturedAt)));
  assert.ok(!Object.hasOwn(evidence, 'reviewedOn'));
  assert.equal(fs.readFileSync(f.reviewFile, 'utf8'), f.historicalReview);
});

test('capture rejects dirty checkout and foreign origin before overwriting the previous snapshot', t => {
  const f = fixture(t);
  assert.equal(f.run().status, 0);
  const previous = fs.readFileSync(f.target, 'utf8');
  fs.writeFileSync(path.join(f.product, 'README.md'), '# Uncommitted product change\n');
  assert.notEqual(f.run().status, 0);
  assert.equal(fs.readFileSync(f.target, 'utf8'), previous);
  fs.writeFileSync(path.join(f.product, 'README.md'), '# Product\n');
  f.git('remote', 'set-url', 'origin', 'https://example.com/unrelated');
  assert.notEqual(f.run().status, 0);
  assert.equal(fs.readFileSync(f.target, 'utf8'), previous);
  assert.equal(fs.readFileSync(f.reviewFile, 'utf8'), f.historicalReview);
});
