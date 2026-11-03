import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {planningFixture} from '../portal/planning.test-fixture.mjs';
import {syncProjectPlanning, parsePlanningArguments} from './sync-project-planning.mjs';
import {productRepository} from '../portal/follow-up.mjs';

const git = (cwd, ...args) => execFileSync('git', args, {cwd, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']}).trim();
const write = (root, relative, data) => {const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), {recursive: true}); fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');};
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-planning-import-'));
  t.after(() => {const absolute = fs.realpathSync(base); assert.equal(path.dirname(absolute), fs.realpathSync(os.tmpdir())); assert.ok(path.basename(absolute).startsWith('pos-planning-import-')); fs.rmSync(absolute, {recursive: true, force: true});});
  const root = path.join(base, 'docs'), workspace = path.join(base, 'product');
  fs.mkdirSync(root); fs.mkdirSync(workspace);
  git(workspace, 'init', '-q'); git(workspace, 'config', 'core.autocrlf', 'false'); git(workspace, 'config', 'user.name', 'Planning fixture'); git(workspace, 'config', 'user.email', 'fixture@example.invalid'); git(workspace, 'config', 'commit.gpgsign', 'false'); git(workspace, 'remote', 'add', 'origin', `${productRepository}.git`);
  const data = planningFixture();
  write(root, 'docs/roadmap.json', data.roadmap);
  write(root, 'portal/data/project-progress.json', data.progressSnapshot);
  write(root, 'portal/data/project-follow-up.json', data.followSnapshot);
  write(workspace, 'delivery/progress.json', data.progressSnapshot.content);
  write(workspace, 'delivery/follow-ups.json', data.followSnapshot.content);
  write(workspace, 'delivery/planning.json', data.snapshot.content);
  const registry = {schemaVersion: 1, repository: productRepository, items: Object.fromEntries(data.snapshot.issues.entries.map(issue => [issue.code, {number: issue.number, id: issue.number + 1000, url: issue.url, managedHash: 'internal'}]))};
  write(workspace, 'delivery/planning-issues.json', registry);
  git(workspace, 'add', '.'); git(workspace, 'commit', '-qm', 'Synthetic planning source');
  const remote = data.snapshot.issues.entries.map(issue => ({...issue, assignees: issue.assignees.map(login => ({login, type: 'User'})), state: issue.state.toLowerCase(), id: issue.number + 1000, isPullRequest: false, body: 'PRIVATE BODY', comments: 'PRIVATE COMMENT'}));
  return {root, workspace, registry, remote, data, fetchIssues: () => remote, now: () => '2026-11-03T03:00:00Z', destination: path.join(root, 'portal/data/project-planning.json')};
}

test('imports only reviewed planning and allowlisted metadata, including completion reason', t => {
  const item = fixture(t);
  const result = syncProjectPlanning(item);
  assert.equal(result.total, 2);
  assert.equal(result.ready, 0);
  const text = fs.readFileSync(item.destination, 'utf8');
  const snapshot = JSON.parse(text);
  assert.match(snapshot.source.revision, /^[a-f0-9]{40}$/);
  assert.equal(snapshot.issues.entries[0].stateReason, null);
  assert.doesNotMatch(text, /PRIVATE|managedHash|comments/);
  assert.equal(syncProjectPlanning({...item, check: true, now: () => '2026-11-04T03:00:00Z'}).changed, false);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), text);
});

test('invalid identity, absent issue, mismatched scope and dirty sources cannot publish', t => {
  const item = fixture(t);
  for (const mutate of [issues => {issues[0].id++;}, issues => {issues[0].isPullRequest = true;}, issues => issues.pop()]) {
    const remote = structuredClone(item.remote); mutate(remote);
    assert.throws(() => syncProjectPlanning({...item, fetchIssues: () => remote}));
    assert.equal(fs.existsSync(item.destination), false);
  }
  write(item.workspace, 'untracked.txt', 'dirty');
  assert.throws(() => syncProjectPlanning(item), /Commit product changes/);
  fs.unlinkSync(path.join(item.workspace, 'untracked.txt'));
  item.data.progressSnapshot.content.summary = 'Changed product summary';
  write(item.workspace, 'delivery/progress.json', item.data.progressSnapshot.content);
  git(item.workspace, 'add', '.'); git(item.workspace, 'commit', '-qm', 'Changed source');
  assert.throws(() => syncProjectPlanning(item), /Import current progress/);
});

test('read-only checks report changed facts, and source race preserves the last valid snapshot', t => {
  const item = fixture(t);
  syncProjectPlanning(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  item.remote[0].state = 'closed'; item.remote[0].stateReason = 'not_planned';
  assert.throws(() => syncProjectPlanning({...item, check: true}), /snapshot is stale/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
  assert.throws(() => syncProjectPlanning({...item, fetchIssues: () => {write(item.workspace, 'race.txt', 'race'); return item.remote;}}), /checkout changed/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
});

test('requires explicit source and supports only read-only check option', () => {
  assert.deepEqual(parsePlanningArguments(['--workspace', 'C:/source', '--check']), {workspace: 'C:/source', check: true});
  for (const args of [[], ['--check'], ['--workspace'], ['--workspace', 'repo', '--apply'], ['--workspace', 'repo', '--check', '--check']]) assert.throws(() => parsePlanningArguments(args), /Usage/);
});

test('only typed human GitHub assignees can enter the public planning snapshot', t => {
  const item = fixture(t);
  for (const assignee of ['floxcristian', {login: 'floxcristian'}, {login: 'assistant', type: 'Service'}, {login: 'floxcristian', type: 'User', email: 'private@example.invalid'}]) {
    item.remote[0].assignees = [assignee];
    assert.throws(() => syncProjectPlanning(item), /typed GitHub identity|only login and type|known GitHub User or Bot/);
    assert.equal(fs.existsSync(item.destination), false);
  }
  item.remote[0].assignees = [{login: 'assistant[bot]', type: 'Bot'}];
  item.remote[0].executionLabels = ['status:ready'];
  const botOnly = syncProjectPlanning(item);
  assert.equal(botOnly.ready, 0);
  const botSnapshot = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  assert.deepEqual(botSnapshot.issues.entries.find(issue => issue.code === item.remote[0].code).assignees, []);
  item.remote[0].assignees = [{login: 'floxcristian', type: 'User'}, {login: 'assistant[bot]', type: 'Bot'}];
  syncProjectPlanning(item);
  const snapshot = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  assert.deepEqual(snapshot.issues.entries.find(issue => issue.code === item.remote[0].code).assignees, ['floxcristian']);
});
