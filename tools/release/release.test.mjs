import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';
import { checkRelease } from './check.mjs';
import { releaseClient } from './github.mjs';
import { mergeRelease } from './merge.mjs';
import {
  isReleasePullRequest, loadReleaseConfig, releaseBot, releaseBranch, repository,
  validateChangelogOverride, validateReleaseCandidate, validateReleaseFiles,
} from './policy.mjs';
import { checkReleasePullRequest, gitReader } from './pr.mjs';
import { verifyTagged } from './verify.mjs';

const root = new URL('../../', import.meta.url);
const text = name => fs.readFileSync(new URL(name, root), 'utf8');
const { config, manifest } = loadReleaseConfig(root);
const base = 'a'.repeat(40);
const head = 'b'.repeat(40);
const current = manifest['.'];
const [major, minor] = current.split('.').map(Number);
const next = `${major}.${minor + 1}.0`;
// The tree under test can be the release branch itself, whose manifest already holds the candidate. A fixed
// "other" version eventually collides with `next`, so the versions that must be rejected derive from it.
const unrelated = `${major}.${minor + 2}.0`;
const disagreeing = `${major + 1}.0.0`;

// Same insertion release-please 17.6.0 performs in src/updaters/changelog.ts.
function releasePleaseChangelog(content, entry) {
  const index = content.search(/\n###? v?[0-9[]/s);
  return `${content.slice(0, index)}\n${entry}\n${content.slice(index)}`.trim() + '\n';
}

const firstEntry = (version = next) => [
  `## [${version}](https://github.com/${repository}/compare/v${current}...v${version}) (2026-11-10)`, '', '',
  '### Novedades', '',
  '* **release:** [TASK-253] versionar POS Docs ([#37](https://github.com/developer-implementos/pos-docs/issues/37)) ([abc1234](https://github.com/developer-implementos/pos-docs/commit/abc1234))', '', '',
  '### Contenido actualizado', '',
  '* **follow-up:** FOLLOWUP-005, pregunta abierta: se agrega a Comercial como contraparte ([#38](https://github.com/developer-implementos/pos-docs/issues/38)) ([def5678](https://github.com/developer-implementos/pos-docs/commit/def5678))',
].join('\n');

function candidate({ entry = firstEntry(), changelog, packageJson, manifestJson } = {}) {
  const files = {
    [base]: { 'CHANGELOG.md': text('CHANGELOG.md'), 'package.json': text('package.json'), '.release-please-manifest.json': text('.release-please-manifest.json') },
  };
  files[head] = {
    'CHANGELOG.md': changelog ?? releasePleaseChangelog(files[base]['CHANGELOG.md'], entry),
    'package.json': packageJson ?? files[base]['package.json'].replace(`"version": "${current}"`, `"version": "${next}"`),
    '.release-please-manifest.json': manifestJson ?? `{\n  ".": "${next}"\n}\n`,
  };
  return { read: async (path, revision) => files[revision][path], files };
}

const releasePr = (overrides = {}) => ({
  number: 40, state: 'open', draft: false, changed_files: 3,
  user: { login: releaseBot, type: 'Bot' },
  head: { ref: releaseBranch, sha: head, repo: { full_name: repository } },
  base: { ref: 'main', sha: base, repo: { full_name: repository } },
  labels: [{ name: 'autorelease: pending' }],
  ...overrides,
});
const changed = (names = ['CHANGELOG.md', 'package.json', '.release-please-manifest.json'], status = 'modified') => names.map(filename => ({ filename, status }));

test('the repository history, manifest and configuration agree', () => {
  const result = checkRelease({ config, manifest, packageJson: JSON.parse(text('package.json')), changelog: text('CHANGELOG.md') });
  assert.equal(result.version, JSON.parse(text('package.json')).version);
  assert.ok(result.releases >= 1);
});

test('the release branch is the one release-please names for this single package', () => {
  // With one package, release-please opens a PR per component and puts the component in the branch
  // even when tags omit it: `component`, else the package name (17.6.0, strategies/base.js
  // getBranchComponent). A merged group would use the bare branch instead.
  const root = config.packages['.'];
  const component = root.component ?? root['package-name'] ?? JSON.parse(text('package.json')).name;
  assert.equal(Object.keys(config.packages).length, 1);
  assert.notEqual(config['separate-pull-requests'], false);
  assert.equal(releaseBranch, `release-please--branches--main--components--${component}`);
});

test('the configuration keeps reader-facing types visible and tooling hidden', () => {
  const sections = Object.fromEntries(config.packages['.']['changelog-sections'].map(section => [section.type, section]));
  for (const type of ['feat', 'fix', 'docs', 'revert']) assert.equal(sections[type].hidden, false, type);
  for (const type of ['ci', 'build', 'test', 'chore', 'refactor', 'style', 'perf']) assert.equal(sections[type].hidden, true, type);
  // Documentation quality requires this declaration on every PR, the release PR included.
  assert.match(config.packages['.']['pull-request-header'], /^Reader-Journeys: \/guide\/changelog\/\n/);
});

test('checkRelease rejects a history that disagrees with the released version', () => {
  const packageJson = JSON.parse(text('package.json'));
  assert.throws(() => checkRelease({ config, manifest: { '.': disagreeing }, packageJson, changelog: text('CHANGELOG.md') }), /must agree/);
  const stale = releasePleaseChangelog(text('CHANGELOG.md'), firstEntry());
  assert.throws(() => checkRelease({ config, manifest, packageJson, changelog: stale }), /latest CHANGELOG\.md entry/);
  assert.throws(() => checkRelease({ config: { ...config, 'bootstrap-sha': 'main' }, manifest, packageJson, changelog: text('CHANGELOG.md') }), /bootstrap-sha/);
});

test('only the release App on the release branch takes the release path', () => {
  assert.equal(isReleasePullRequest(releasePr()), true);
  assert.equal(isReleasePullRequest(releasePr({ user: { login: 'floxcristian', type: 'User' } })), false);
  assert.equal(isReleasePullRequest(releasePr({ user: { login: releaseBot, type: 'User' } })), false);
  assert.equal(isReleasePullRequest(releasePr({ head: { ref: 'work/x', sha: head, repo: { full_name: repository } } })), false);
  assert.equal(isReleasePullRequest(releasePr({ head: { ref: releaseBranch, sha: head, repo: { full_name: 'someone/pos-docs' } } })), false);
});

test('a release PR may only modify the changelog, the manifest and package.json', () => {
  validateReleaseFiles(changed());
  validateReleaseFiles(changed(['CHANGELOG.md', '.release-please-manifest.json']));
  assert.throws(() => validateReleaseFiles(changed(['CHANGELOG.md', '.release-please-manifest.json', 'docs/api.md'])), /docs\/api\.md/);
  assert.throws(() => validateReleaseFiles(changed(['.github/workflows/release.yml', 'CHANGELOG.md', '.release-please-manifest.json'])), /release\.yml/);
  assert.throws(() => validateReleaseFiles([...changed(['CHANGELOG.md', '.release-please-manifest.json']), { filename: 'package.json', status: 'renamed' }]), /renamed/);
  assert.throws(() => validateReleaseFiles(changed(['package.json'])), /must update/);
});

test('what release-please writes passes, including later releases with a compare link', async () => {
  const first = candidate();
  assert.deepEqual(await validateReleaseCandidate({ pr: releasePr(), files: changed(), read: first.read, config }), { previous: current, version: next });
  const plain = candidate({ entry: firstEntry().replace(/^## \[[^\]]+\]\([^)]+\)/, `## ${next}`) });
  await validateReleaseCandidate({ pr: releasePr(), files: changed(), read: plain.read, config });
  const breaking = candidate({ entry: `${firstEntry()}\n\n\n### ⚠ BREAKING CHANGES\n\n* **flows:** retirar /guide/flows/legacy/` });
  await validateReleaseCandidate({ pr: releasePr(), files: changed(), read: breaking.read, config });
});

test('release content outside the version bump is rejected', async () => {
  const pr = releasePr();
  const files = changed();
  const reject = async (options, pattern) => assert.rejects(validateReleaseCandidate({ pr, files, read: candidate(options).read, config }), pattern);
  await reject({ packageJson: text('package.json').replace(`"version": "${current}"`, `"version": "${next}"`).replace('"private": true', '"private": false') }, /only change the version/);
  await reject({ packageJson: text('package.json'), manifestJson: `{\n  ".": "${current}"\n}\n` }, /must increase/);
  await reject({ manifestJson: '{\n  ".": "9.0.0"\n}\n' }, /manifest must move/);
  await reject({ changelog: releasePleaseChangelog(text('CHANGELOG.md').replace('Qué cambió', 'Que cambio'), firstEntry()) }, /introduction/);
  await reject({ changelog: releasePleaseChangelog(text('CHANGELOG.md'), firstEntry()).replace('Punto de partida', 'Inicio') }, /rewrote previous/);
  await reject({ entry: firstEntry().replace('### Novedades', '### Otra cosa') }, /Unknown changelog section/);
  await reject({ entry: `${firstEntry()}\n<script>alert(1)</script>` }, /Unexpected changelog line/);
  await reject({ entry: `${firstEntry()}\n* **x:** <img src=x onerror=alert(1)>` }, /must not contain HTML/);
  await reject({ entry: firstEntry(unrelated) }, /does not describe/);
  await reject({ entry: firstEntry().split('\n')[0] }, /at least one change/);
});

test('a malformed changelog block in a PR body is rejected before release-please reads it', () => {
  assert.deepEqual(validateChangelogOverride('Sin bloque.').entries, []);
  const body = 'Texto\n\nBEGIN_COMMIT_OVERRIDE\r\ndocs(follow-up): FOLLOWUP-005 sigue abierta con nueva contraparte\r\n\r\nfix(decisions): corregir el estado de ADR-14\r\nEND_COMMIT_OVERRIDE\n';
  assert.equal(validateChangelogOverride(body).entries.length, 2);
  // release-please reads the markers inside HTML comments too, so the template must never carry them.
  assert.equal(validateChangelogOverride('<!-- BEGIN_COMMIT_OVERRIDE\ndocs: x\nEND_COMMIT_OVERRIDE -->').entries.length, 1);
  assert.throws(() => validateChangelogOverride('BEGIN_COMMIT_OVERRIDE\ndocs: x'), /exactly one/);
  // Naming the marker in prose is enough: release-please takes everything after it as the entries.
  assert.throws(() => validateChangelogOverride('release-please lee `BEGIN_COMMIT_OVERRIDE` en cualquier parte del cuerpo.'), /exactly one/);
  assert.throws(() => validateChangelogOverride('END_COMMIT_OVERRIDE BEGIN_COMMIT_OVERRIDE'), /exactly one/);
  assert.throws(() => validateChangelogOverride('BEGIN_COMMIT_OVERRIDE\n\nEND_COMMIT_OVERRIDE'), /empty/);
  assert.throws(() => validateChangelogOverride('BEGIN_COMMIT_OVERRIDE\nactualizar FOLLOWUP-005\nEND_COMMIT_OVERRIDE'), /type\(scope\): text/);
  assert.throws(() => validateChangelogOverride('BEGIN_COMMIT_OVERRIDE\ndocs: uno\ndocs: dos\nEND_COMMIT_OVERRIDE'), /blank line/);
  assert.throws(() => validateChangelogOverride('BEGIN_COMMIT_OVERRIDE\ndocs!: retirar ruta\nEND_COMMIT_OVERRIDE'), /without "!"/);
  assert.throws(() => validateChangelogOverride('BEGIN_COMMIT_OVERRIDE\ndocs: <b>x</b>\nEND_COMMIT_OVERRIDE'), /HTML/);
});

function fakeGitHub({ pr = releasePr(), runs = [{ head_sha: head, status: 'completed', conclusion: 'success', created_at: '2026-11-10T10:00:00Z', html_url: 'https://example.test/run' }], content = candidate(), mergeResult = { status: 200, value: { merged: true, sha: 'c'.repeat(40) } }, open } = {}) {
  const calls = [];
  const encode = value => ({ encoding: 'base64', content: Buffer.from(value).toString('base64') });
  const request = async (method, path, body) => {
    calls.push({ method, path, body });
    const local = path.replace(`repos/${repository}/`, '');
    if (method === 'PUT') return mergeResult;
    if (local.startsWith('pulls?state=open')) return { status: 200, value: open ?? [pr] };
    if (/^pulls\/\d+$/.test(local)) return { status: 200, value: typeof pr === 'function' ? pr(calls) : pr };
    if (/^pulls\/\d+\/files/.test(local)) return { status: 200, value: changed() };
    const contents = /^contents\/(.+)\?ref=([a-f0-9]{40})$/.exec(local);
    if (contents) return { status: 200, value: encode(content.files[contents[2]][contents[1]]) };
    if (local.startsWith('actions/workflows/docs-quality.yml/runs')) return { status: 200, value: { workflow_runs: runs } };
    throw new Error(`Unexpected request ${method} ${path}`);
  };
  return { request, calls };
}

test('the merge waits for Documentation quality on the exact head and pins the merge to it', async () => {
  const quiet = () => {};
  assert.equal((await mergeRelease({ ...fakeGitHub({ open: [] }), config, log: quiet })).outcome, 'none');
  assert.equal((await mergeRelease({ ...fakeGitHub({ runs: [] }), config, log: quiet })).outcome, 'waiting');
  assert.equal((await mergeRelease({ ...fakeGitHub({ runs: [{ head_sha: head, status: 'in_progress', created_at: '2026-11-10T10:00:00Z' }] }), config, log: quiet })).outcome, 'waiting');
  assert.equal((await mergeRelease({ ...fakeGitHub(), config, expectedHead: 'd'.repeat(40), log: quiet })).outcome, 'stale');
  await assert.rejects(mergeRelease({ ...fakeGitHub({ runs: [{ head_sha: head, status: 'completed', conclusion: 'failure', created_at: '2026-11-10T10:00:00Z', html_url: 'u' }] }), config, log: quiet }), /concluded failure/);
  // An older green run does not count when the newest run on that head failed.
  await assert.rejects(mergeRelease({ ...fakeGitHub({ runs: [
    { head_sha: head, status: 'completed', conclusion: 'success', created_at: '2026-11-10T09:00:00Z' },
    { head_sha: head, status: 'completed', conclusion: 'failure', created_at: '2026-11-10T10:00:00Z', html_url: 'u' },
  ] }), config, log: quiet }), /concluded failure/);
  // Two runs created in the same second: the higher run id is the newer one, whatever order the API lists them in.
  // Release PR #51 was rejected when concurrency cancelled the older duplicate and the newer one passed.
  for (const order of [[0, 1], [1, 0]]) {
    const sameSecond = [
      { id: 100, head_sha: head, status: 'completed', conclusion: 'cancelled', created_at: '2026-11-10T10:00:00Z', html_url: 'old' },
      { id: 101, head_sha: head, status: 'completed', conclusion: 'success', created_at: '2026-11-10T10:00:00Z', html_url: 'new' },
    ];
    assert.equal((await mergeRelease({ ...fakeGitHub({ runs: order.map(index => sameSecond[index]) }), config, log: quiet })).outcome, 'merged');
    const failedNewer = [
      { id: 100, head_sha: head, status: 'completed', conclusion: 'success', created_at: '2026-11-10T10:00:00Z', html_url: 'old' },
      { id: 101, head_sha: head, status: 'completed', conclusion: 'failure', created_at: '2026-11-10T10:00:00Z', html_url: 'new' },
    ];
    await assert.rejects(mergeRelease({ ...fakeGitHub({ runs: order.map(index => failedNewer[index]) }), config, log: quiet }), /concluded failure/);
  }
  const github = fakeGitHub();
  const result = await mergeRelease({ ...github, config, expectedHead: head, log: quiet });
  assert.equal(result.outcome, 'merged');
  const merge = github.calls.filter(call => call.method === 'PUT');
  assert.deepEqual(merge, [{ method: 'PUT', path: `repos/${repository}/pulls/40/merge`, body: { merge_method: 'squash', sha: head } }]);
});

test('the merge refuses anything that is not a clean release PR', async () => {
  const quiet = () => {};
  const human = fakeGitHub({ pr: releasePr({ user: { login: 'someone', type: 'User' } }) });
  await assert.rejects(mergeRelease({ ...human, config, log: quiet }), /Only .* may open a release PR/);
  assert.equal(human.calls.some(call => call.method === 'PUT'), false);
  await assert.rejects(mergeRelease({ ...fakeGitHub({ pr: releasePr({ labels: [] }) }), config, log: quiet }), /autorelease: pending/);
  await assert.rejects(mergeRelease({ ...fakeGitHub({ open: [releasePr(), releasePr({ number: 41 })] }), config, log: quiet }), /Expected one release PR/);
  const moved = fakeGitHub({ open: [releasePr()], pr: calls => calls.filter(call => /pulls\/40$/.test(call.path)).length > 1 ? releasePr({ head: { ...releasePr().head, sha: 'e'.repeat(40) } }) : releasePr() });
  assert.equal((await mergeRelease({ ...moved, config, log: quiet })).outcome, 'stale');
  assert.equal(moved.calls.some(call => call.method === 'PUT'), false);
  await assert.rejects(mergeRelease({ ...fakeGitHub({ mergeResult: { status: 405, value: null } }), config, log: quiet }), /refused/);
});

test('a merged release that is still untagged fails the release run', async () => {
  const listed = [{ number: 26, html_url: 'u', pull_request: { merged_at: '2026-11-10T10:00:00Z' } }];
  // `labels` answers each direct read of the PR in turn; the label search keeps listing it.
  const github = labels => {
    const reads = [];
    const request = async (method, path) => {
      if (path.endsWith('/pulls/26')) {
        reads.push(path);
        return { status: 200, value: { number: 26, labels: [{ name: labels[Math.min(reads.length, labels.length) - 1] }] } };
      }
      return { status: 200, value: listed };
    };
    return { request, reads };
  };
  const pauses = [];
  const pause = async ms => { pauses.push(ms); };
  const stuck = github(['autorelease: pending']);
  await assert.rejects(verifyTagged({ request: stuck.request, startedAt: '2026-11-10T10:05:00Z', pause }), /#26/);
  assert.equal(stuck.reads.length, 3, 'A PR is re-read before the run fails');
  // A merge that happened after this run started is tagged by the run its push triggered.
  const fresh = github(['autorelease: pending']);
  await verifyTagged({ request: fresh.request, startedAt: '2026-11-10T09:55:00Z', pause });
  assert.equal(fresh.reads.length, 0);
  // The label search lags the label swap release-please makes seconds before this step (run
  // 42697341007): the PR itself already says tagged, or does so on a later read.
  await verifyTagged({ request: github(['autorelease: tagged']).request, startedAt: '2026-11-10T10:05:00Z', pause });
  pauses.length = 0;
  const lagging = github(['autorelease: pending', 'autorelease: tagged']);
  await verifyTagged({ request: lagging.request, startedAt: '2026-11-10T10:05:00Z', pause });
  assert.deepEqual([lagging.reads.length, pauses.length], [2, 1]);
});

test('the editorial check validates a release PR through immutable Git objects', async () => {
  const content = candidate();
  const blobs = new Map();
  const trees = {};
  for (const revision of [base, head]) {
    trees[revision] = Object.entries(content.files[revision]).map(([path, value]) => {
      const bytes = Buffer.from(value);
      const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      blobs.set(sha, bytes);
      return { path, type: 'blob', mode: '100644', sha };
    });
  }
  const treeSha = revision => (revision === base ? '1' : '2').repeat(40);
  const get = async path => {
    const local = path.replace(`repos/${repository}/`, '');
    if (local === 'pulls/40') return { status: 200, value: releasePr() };
    if (local.startsWith('pulls/40/files')) return { status: 200, value: changed() };
    const commit = /^git\/commits\/([a-f0-9]{40})$/.exec(local);
    if (commit) return { status: 200, value: { sha: commit[1], tree: { sha: treeSha(commit[1]) } } };
    const tree = /^git\/trees\/([a-f0-9]{40})\?recursive=1$/.exec(local);
    if (tree) return { status: 200, value: { truncated: false, tree: trees[tree[1] === treeSha(base) ? base : head] } };
    const blob = /^git\/blobs\/([a-f0-9]{40})$/.exec(local);
    if (blob) return { status: 200, value: { encoding: 'base64', content: blobs.get(blob[1]).toString('base64') } };
    return { status: 404 };
  };
  const result = await checkReleasePullRequest(get, 40, { expectedHead: head, expectedBase: base, config });
  assert.deepEqual(result, { number: 40, head, previous: current, version: next, files: 3 });
  await assert.rejects(checkReleasePullRequest(get, 40, { expectedHead: 'f'.repeat(40), config }), /PR changed/);
  const tampered = async path => {
    const result = await get(path);
    return /git\/blobs/.test(path) ? { status: 200, value: { encoding: 'base64', content: Buffer.from('{}').toString('base64') } } : result;
  };
  await assert.rejects(gitReader(tampered)('package.json', head), /Git identity/);
  const ordinary = async path => (path.endsWith('pulls/40') ? { status: 200, value: releasePr({ user: { login: 'floxcristian', type: 'User' } }) } : get(path));
  assert.equal(await checkReleasePullRequest(ordinary, 40, { config }), null);
});

test('the release client only reaches the listed endpoints and never writes outside a merge', async () => {
  const seen = [];
  const request = releaseClient({ token: 't', fetcher: async (url, init) => { seen.push([init.method, url]); return { status: 200, json: async () => ({}) }; } });
  await request('GET', `repos/${repository}/pulls/40`);
  await request('PUT', `repos/${repository}/pulls/40/merge`, { merge_method: 'squash', sha: head });
  await assert.rejects(request('GET', `repos/${repository}/actions/secrets`), /allowlist/);
  await assert.rejects(request('GET', 'repos/developer-implementos/pos-platform/pulls/40'), /allowlist/);
  await assert.rejects(request('PATCH', `repos/${repository}/pulls/40`), /only read and merge/);
  await assert.rejects(request('DELETE', `repos/${repository}/pulls/40/merge`), /only read and merge/);
  assert.deepEqual(seen.map(([method]) => method), ['GET', 'PUT']);
  assert.throws(() => releaseClient({ token: '' }), /token is required/);
});
