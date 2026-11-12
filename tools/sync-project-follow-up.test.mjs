import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { progressContentHash } from '../portal/progress.mjs';
import { followUpContentHash, productRepository } from '../portal/follow-up.mjs';
import { mapGitHubIssues, parseFollowUpArguments, syncProjectFollowUp } from './sync-project-follow-up.mjs';
import { isolateFromInvokingRepository } from './git-isolation.mjs';

// Sin esto, un hook o `git rebase --exec` haría que sus fixtures actuaran sobre el repositorio que la lanza.
isolateFromInvokingRepository();

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const json = value => JSON.stringify(value, null, 2) + '\n';
function write(root, relative, content) {
  const destination = path.join(root, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content, 'utf8');
}
function initialize(root) {
  fs.mkdirSync(root);
  git(root, 'init', '-q');
  git(root, 'config', 'core.autocrlf', 'false');
  git(root, 'config', 'user.name', 'Follow-up fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'commit.gpgsign', 'false');
}
function commit(root) {
  git(root, 'add', '.');
  git(root, 'commit', '-qm', 'Synthetic source');
  return git(root, 'rev-parse', 'HEAD');
}
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-follow-up-import-'));
  t.after(() => {
    const resolved = fs.realpathSync(base);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('pos-follow-up-import-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const root = path.join(base, 'docs');
  const workspace = path.join(base, 'product');
  initialize(root);
  initialize(workspace);
  git(workspace, 'remote', 'add', 'origin', `${productRepository}.git`);
  const roadmap = { schemaVersion: 3, phases: [{ id: 'phase-01', title: 'Venta', delivery: { work: [{ id: 'F01-01', title: 'Identidad', apps: ['branch-api'] }] } }] };
  const roadmapSource = json(roadmap);
  write(root, 'docs/roadmap.json', roadmapSource);
  const progressContent = {
    schemaVersion: 2, reviewedOn: '2026-11-02', productRevision: 'source',
    scope: { repository: 'https://github.com/developer-implementos/pos-docs', revision: 'a'.repeat(40), path: 'docs/roadmap.json', sha256: createHash('sha256').update(roadmapSource).digest('hex') },
    summary: 'Entregable pendiente.', applications: [{ id: 'branch-api', stage: 'planned', summary: 'Pendiente.', nextStep: 'Implementar.', evidence: [] }],
    workPackages: [{ id: 'F01-01', apps: ['branch-api'], status: 'not_started', summary: 'Pendiente de implementación.', verification: null, acceptance: null }],
  };
  const content = { schemaVersion: 1, reviewedOn: '2026-11-02', items: [] };
  const registry = { schemaVersion: 1, repository: productRepository, issues: { 'F01-01': { number: 10, id: 1010, url: `${productRepository}/issues/10`, managedHash: 'x' } } };
  const githubIssues = [{ number: 10, id: 1010, url: `${productRepository}/issues/10`, state: 'open', executionLabels: ['status:triage'], assignees: [], updatedAt: '2026-11-02T01:00:00Z', isPullRequest: false, body: 'PRIVATE BODY NOT TO EXPORT' }];
  write(workspace, 'delivery/progress.json', json(progressContent));
  write(workspace, 'delivery/follow-ups.json', json(content));
  write(workspace, 'delivery/github-issues.json', json(registry));
  const revision = commit(workspace);
  write(root, 'portal/data/project-progress.json', json({ schemaVersion: 1, source: { repository: productRepository, revision, path: 'delivery/progress.json', sha256: progressContentHash(progressContent) }, content: progressContent }));
  return { root, workspace, content, registry, githubIssues, progressContent, revision, fetchIssues: () => githubIssues, now: () => '2026-11-03T00:00:00.000Z', destination: path.join(root, 'portal/data/project-follow-up.json') };
}

test('imports reviewed source and allowlisted GitHub metadata with immutable identity', t => {
  const item = fixture(t);
  const result = syncProjectFollowUp(item);
  const serialized = fs.readFileSync(item.destination, 'utf8');
  const snapshot = JSON.parse(serialized);
  assert.equal(result.changed, true);
  assert.equal(result.total, 1);
  assert.equal(snapshot.source.revision, item.revision);
  assert.equal(snapshot.source.sha256, followUpContentHash(item.content));
  assert.equal(snapshot.issues.entries[0].state, 'OPEN');
  assert.equal(serialized.includes('PRIVATE BODY'), false);
  assert.equal(serialized.includes('managedHash'), false);
  assert.equal(syncProjectFollowUp({ ...item, check: true, now: () => '2026-11-04T00:00:00.000Z' }).changed, false);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), serialized, 'A check must not rewrite the observation time');
  assert.equal(syncProjectFollowUp({ ...item, now: () => '2026-11-04T00:00:00.000Z' }).changed, true, 'An explicit import records a fresh observation');
});

test('detects changed GitHub status and preserves the previous snapshot on a failed check', t => {
  const item = fixture(t);
  syncProjectFollowUp(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  item.githubIssues[0].state = 'closed';
  item.githubIssues[0].executionLabels = [];
  assert.throws(() => syncProjectFollowUp({ ...item, check: true }), /snapshot is stale/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
  assert.equal(syncProjectFollowUp(item).changed, true);
});

test('records observation after GitHub collection and rejects updates beyond that observation', t => {
  const item = fixture(t);
  const calls = [];
  syncProjectFollowUp({ ...item, fetchIssues: () => { calls.push('fetch'); return item.githubIssues; }, now: () => { calls.push('observed'); return '2026-11-03T00:00:00.000Z'; } });
  assert.deepEqual(calls, ['fetch', 'observed']);
  item.githubIssues[0].updatedAt = '2026-11-04T00:00:00Z';
  assert.throws(() => syncProjectFollowUp(item), /cannot follow the GitHub observation/);
});

test('rejects mismatched identities, PRs and missing issue records before publication', t => {
  const item = fixture(t);
  for (const mutate of [issues => { issues[0].id++; }, issues => { issues[0].isPullRequest = true; }, issues => issues.pop(), issues => { issues[0].url = 'https://example.com/issues/10'; }]) {
    const issues = structuredClone(item.githubIssues);
    mutate(issues);
    assert.throws(() => syncProjectFollowUp({ ...item, fetchIssues: () => issues }), /identity changed|Missing GitHub issue|URL changed/);
    assert.equal(fs.existsSync(item.destination), false);
  }
});

test('rejects dirty, foreign and racing source worktrees', t => {
  const item = fixture(t);
  write(item.workspace, 'untracked.txt', 'not reviewed');
  assert.throws(() => syncProjectFollowUp(item), /Commit or resolve product changes/);
  fs.unlinkSync(path.join(item.workspace, 'untracked.txt'));
  git(item.workspace, 'remote', 'set-url', 'origin', 'https://github.com/example/other.git');
  assert.throws(() => syncProjectFollowUp(item), /corporate POS Platform/);
  git(item.workspace, 'remote', 'set-url', 'origin', `${productRepository}.git`);
  assert.throws(() => syncProjectFollowUp({ ...item, fetchIssues: () => { write(item.workspace, 'race.txt', 'changed'); return item.githubIssues; } }), /checkout changed/);
  assert.equal(fs.existsSync(item.destination), false);
});

test('requires current technical summaries and rejects stale product metadata', t => {
  const item = fixture(t);
  item.progressContent.workPackages[0].summary = 'Nuevo siguiente paso.';
  write(item.workspace, 'delivery/progress.json', json(item.progressContent));
  commit(item.workspace);
  assert.throws(() => syncProjectFollowUp(item), /Import the current technical progress/);
});

test('checks missing snapshots without writing and parses only explicit supported options', t => {
  const item = fixture(t);
  assert.throws(() => syncProjectFollowUp({ ...item, check: true }), /snapshot is stale/);
  assert.equal(fs.existsSync(item.destination), false);
  assert.deepEqual(parseFollowUpArguments(['--workspace', 'C:/clean checkout', '--check']), { workspace: 'C:/clean checkout', check: true });
  for (const args of [[], ['--check'], ['--workspace'], ['--workspace', 'repo', '--unknown'], ['--workspace', 'repo', '--check', '--check']]) assert.throws(() => parseFollowUpArguments(args), /Usage/);
});

test('normalizes field order, assignees and labels without retaining unrelated service fields', () => {
  const registry = { schemaVersion: 1, repository: productRepository, issues: { 'F01-01': { number: 10, id: 1010, url: `${productRepository}/issues/10` } } };
  const rows = mapGitHubIssues(registry, ['F01-01'], [{ number: 10, id: 1010, url: `${productRepository}/issues/10`, state: 'open', executionLabels: ['status:review', 'status:blocked'], assignees: ['z-user', 'a-user'], updatedAt: '2026-11-02T01:00:00Z', body: 'private', isPullRequest: false }]);
  assert.deepEqual(rows[0].executionLabels, ['status:blocked', 'status:review']);
  assert.deepEqual(rows[0].assignees, ['a-user', 'z-user']);
  assert.equal(Object.hasOwn(rows[0], 'body'), false);
});
