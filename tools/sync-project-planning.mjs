import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {derivePlanning, planningContentHash} from '../portal/planning.mjs';
import {loadProgress, progressContentHash} from '../portal/progress.mjs';
import {loadFollowUp, followUpContentHash, productRepository} from '../portal/follow-up.mjs';
import {mapGitHubIssues} from './sync-project-follow-up.mjs';
import {StaleSnapshotError} from './project-import/stale-snapshot.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const remotes = new Set([productRepository, `${productRepository}.git`, 'git@github.com:developer-implementos/pos-platform.git', 'ssh://git@github.com/developer-implementos/pos-platform.git']);
const git = (root, ...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 3 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']}).trimEnd();
const tracked = (root, revision, relative) => {
  assert.match(git(root, 'ls-tree', revision, '--', relative), /^100(?:644|755) blob [a-f0-9]{40}\t/, `${relative} must be regular and tracked`);
  return JSON.parse(git(root, 'show', `${revision}:${relative}`));
};

export function readPlanningGitHubIssues() {
  const projection = '.[] | {number, id, url: .html_url, state, stateReason: .state_reason, executionLabels: [.labels[].name | select(startswith("status:"))], assignees: [.assignees[] | {login, type}], updatedAt: .updated_at, isPullRequest: has("pull_request")} | @json';
  const lines = execFileSync('gh', ['api', 'repos/developer-implementos/pos-platform/issues?state=all&per_page=100', '--paginate', '--jq', projection], {encoding: 'utf8', windowsHide: true, maxBuffer: 3 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
  return lines.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

export function mapPlanningIssues(registry, keys, remoteIssues) {
  const registeredNumbers = new Set(Object.values(registry.items).map(issue => issue.number));
  const selected = remoteIssues.filter(issue => registeredNumbers.has(issue.number)).map(issue => {
    assert.ok(Array.isArray(issue.assignees), 'Planning GitHub assignees must be an array');
    for (const assignee of issue.assignees) {
      assert.ok(assignee && typeof assignee === 'object' && !Array.isArray(assignee), 'Planning assignee requires a typed GitHub identity');
      assert.deepEqual(Object.keys(assignee).sort(), ['login', 'type'], 'Planning assignee requires only login and type');
      assert.ok(['User', 'Bot'].includes(assignee.type), 'Planning assignee requires a known GitHub User or Bot type');
      assert.ok(typeof assignee.login === 'string', 'Planning assignee login must be a string');
    }
    return {...issue, assignees: issue.assignees.filter(assignee => assignee.type === 'User').map(assignee => assignee.login)};
  });
  const reasons = new Map(selected.map(issue => [issue.number, issue.stateReason]));
  return mapGitHubIssues({schemaVersion: registry.schemaVersion, repository: registry.repository, issues: registry.items}, keys, selected).map(issue => ({...issue, stateReason: reasons.get(issue.number)}));
}

export function syncProjectPlanning({root = repositoryRoot, workspace, check = false, fetchIssues = readPlanningGitHubIssues, now = () => new Date().toISOString()}) {
  assert.ok(typeof workspace === 'string' && workspace.length > 0, 'A product checkout is required');
  const docsRoot = fs.realpathSync(path.resolve(root)), productRoot = fs.realpathSync(path.resolve(workspace));
  assert.equal(fs.realpathSync(git(productRoot, 'rev-parse', '--show-toplevel')), productRoot, 'Use product repository root');
  assert.ok(remotes.has(git(productRoot, 'remote', 'get-url', 'origin')), 'The source must be corporate POS Platform');
  assert.equal(git(productRoot, 'status', '--porcelain', '--untracked-files=all'), '', 'Commit product changes before importing planning');
  const revision = git(productRoot, 'rev-parse', 'HEAD');
  assert.match(revision, /^[a-f0-9]{40}$/);
  const content = tracked(productRoot, revision, 'delivery/planning.json');
  const registry = tracked(productRoot, revision, 'delivery/planning-issues.json');
  const progress = loadProgress(docsRoot), followUp = loadFollowUp(docsRoot, progress);
  const progressSnapshot = JSON.parse(fs.readFileSync(path.join(docsRoot, 'portal/data/project-progress.json'), 'utf8'));
  assert.equal(progressContentHash(tracked(productRoot, revision, 'delivery/progress.json')), progressSnapshot.source.sha256, 'Import current progress before planning');
  assert.equal(followUpContentHash(tracked(productRoot, revision, 'delivery/follow-ups.json')), followUp.source.sha256, 'Import current follow-up before planning');
  assert.deepEqual(Object.keys(registry).sort(), ['items', 'repository', 'schemaVersion'], 'Unexpected planning registry fields');
  assert.deepEqual(Object.keys(registry.items).sort(), content.items.map(item => item.key).sort(), 'Registry must cover exactly the increment');
  const entries = mapPlanningIssues(registry, content.items.map(item => item.key), fetchIssues());
  const snapshot = {schemaVersion: 1, source: {repository: productRepository, revision, path: 'delivery/planning.json', sha256: planningContentHash(content)}, content, issues: {observedAt: now(), repository: productRepository, entries}};
  const model = derivePlanning(snapshot, progress, followUp);
  for (const relative of ['portal', 'portal/data', 'portal/data/project-planning.json']) {
    const location = path.join(docsRoot, relative);
    if (!fs.existsSync(location)) continue;
    assert.ok(!fs.lstatSync(location).isSymbolicLink(), `Planning destination cannot be symbolic: ${relative}`);
    assert.equal(fs.realpathSync(location), location, 'Planning destination must stay inside POS Docs');
    assert.equal(fs.statSync(location).isDirectory(), !relative.endsWith('.json'), 'Unexpected planning destination type');
  }
  const destination = path.join(docsRoot, 'portal/data/project-planning.json');
  const previous = fs.existsSync(destination) ? fs.readFileSync(destination, 'utf8').replaceAll('\r\n', '\n') : null;
  if (check && previous !== null) {
    const old = JSON.parse(previous);
    derivePlanning(old, progress, followUp);
    snapshot.issues.observedAt = old.issues.observedAt;
  }
  const serialized = JSON.stringify(snapshot, null, 2) + '\n';
  const changed = previous !== serialized;
  assert.equal(git(productRoot, 'rev-parse', 'HEAD'), revision, 'Product revision changed while importing planning');
  assert.equal(git(productRoot, 'status', '--porcelain', '--untracked-files=all'), '', 'Product checkout changed while importing planning');
  if (check && changed) throw new StaleSnapshotError('Published planning snapshot is stale; import and review it');
  else if (changed) {
    fs.mkdirSync(path.dirname(destination), {recursive: true});
    const temporary = path.join(path.dirname(destination), `.project-planning-${process.pid}-${randomUUID()}.tmp`);
    let descriptor;
    try {
      descriptor = fs.openSync(temporary, 'wx', 0o644);
      fs.writeFileSync(descriptor, serialized, 'utf8');
      fs.fsyncSync(descriptor);
      fs.closeSync(descriptor);
      descriptor = undefined;
      fs.renameSync(temporary, destination);
    } finally {
      if (descriptor !== undefined) fs.closeSync(descriptor);
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }
  return {changed, revision, destination, total: model.items.length, ready: model.items.filter(item => item.ready).length};
}

export function parsePlanningArguments(args) {
  let workspace, check = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--workspace' && !workspace && args[index + 1] && !args[index + 1].startsWith('--')) workspace = args[++index];
    else if (args[index] === '--check' && !check) check = true;
    else throw new Error('Usage: node tools/sync-project-planning.mjs --workspace <clean-pos-platform-checkout> [--check]');
  }
  assert.ok(workspace, 'Usage: node tools/sync-project-planning.mjs --workspace <clean-pos-platform-checkout> [--check]');
  return {workspace, check};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = syncProjectPlanning(parsePlanningArguments(process.argv.slice(2)));
  console.log(`Project planning: ${result.total} work items; ${result.ready} ready in GitHub; revision ${result.revision.slice(0, 12)}; ${result.changed ? 'snapshot updated' : 'snapshot current'}.`);
}
