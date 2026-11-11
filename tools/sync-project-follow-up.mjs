import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveFollowUp, followUpContentHash, productRepository } from '../portal/follow-up.mjs';
import { deriveProgress, loadProgress, progressContentHash } from '../portal/progress.mjs';
import { StaleSnapshotError } from './project-import/stale-snapshot.mjs';

const sourcePath = 'delivery/follow-ups.json';
const registryPath = 'delivery/github-issues.json';
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const allowedRemotes = new Set([productRepository, `${productRepository}.git`, 'git@github.com:developer-implementos/pos-platform.git', 'ssh://git@github.com/developer-implementos/pos-platform.git']);

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 3 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
}

function trackedJson(root, revision, relative) {
  assert.ok(git(root, 'ls-tree', revision, '--', relative).match(/^100(?:644|755) blob [a-f0-9]{40}\t/), `${relative} must be a regular tracked file`);
  return JSON.parse(git(root, 'show', `${revision}:${relative}`));
}

/** Retrieve only allowlisted issue metadata. Bodies and comments never enter the public snapshot. */
export function readGitHubIssues() {
  const projection = '.[] | {number, id, url: .html_url, state, executionLabels: [.labels[].name | select(startswith("status:"))], assignees: [.assignees[].login], updatedAt: .updated_at, isPullRequest: has("pull_request")} | @json';
  const lines = execFileSync('gh', ['api', 'repos/developer-implementos/pos-platform/issues?state=all&per_page=100', '--paginate', '--jq', projection], {
    encoding: 'utf8', windowsHide: true, maxBuffer: 3 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
  return lines.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

export function mapGitHubIssues(registry, workIds, githubIssues) {
  assert.equal(registry.schemaVersion, 1, 'Unsupported product issue registry schema');
  assert.equal(registry.repository, productRepository, 'Issue registry must identify the corporate product repository');
  assert.ok(registry.issues && typeof registry.issues === 'object' && !Array.isArray(registry.issues), 'Issue registry requires issue mappings');
  assert.ok(Array.isArray(githubIssues), 'GitHub must return an array of issues');
  const remote = new Map();
  for (const issue of githubIssues) {
    assert.ok(Number.isSafeInteger(issue.number) && !remote.has(issue.number), 'GitHub returned an invalid or duplicate issue number');
    remote.set(issue.number, issue);
  }
  return [...workIds].sort().map(code => {
    const reference = registry.issues[code];
    assert.ok(reference && Number.isSafeInteger(reference.number) && Number.isSafeInteger(reference.id), `Missing registered issue identity: ${code}`);
    const issue = remote.get(reference.number);
    assert.ok(issue && !issue.isPullRequest, `Missing GitHub issue: ${code}`);
    assert.equal(issue.id, reference.id, `GitHub issue identity changed: ${code}`);
    assert.equal(reference.url, `${productRepository}/issues/${reference.number}`, `Unexpected registered issue URL: ${code}`);
    assert.equal(issue.url, reference.url, `GitHub issue URL changed: ${code}`);
    assert.ok(['open', 'closed'].includes(issue.state), `Unexpected GitHub issue state: ${code}`);
    assert.ok(Array.isArray(issue.executionLabels) && Array.isArray(issue.assignees), `Missing GitHub labels or assignees: ${code}`);
    // Explicit projection, never spread data returned by the service.
    return {
      code, number: reference.number, url: reference.url, state: issue.state.toUpperCase(),
      executionLabels: [...issue.executionLabels].sort(), assignees: [...issue.assignees].sort(), updatedAt: issue.updatedAt,
    };
  });
}

function safeDestination(root) {
  for (const relative of ['portal', 'portal/data', 'portal/data/project-follow-up.json']) {
    const location = path.join(root, relative);
    if (!fs.existsSync(location)) continue;
    assert.ok(!fs.lstatSync(location).isSymbolicLink(), `Follow-up destination cannot be a symbolic link: ${relative}`);
    assert.equal(fs.realpathSync(location), location, `Follow-up destination must stay inside POS Docs: ${relative}`);
    assert.equal(fs.statSync(location).isDirectory(), !relative.endsWith('.json'), `Unexpected follow-up destination type: ${relative}`);
  }
  return path.join(root, 'portal/data/project-follow-up.json');
}

export function syncProjectFollowUp({ root = repositoryRoot, workspace, check = false, fetchIssues = readGitHubIssues, now = () => new Date().toISOString() }) {
  assert.ok(typeof workspace === 'string' && workspace.length > 0, 'A product checkout is required');
  const docsRoot = fs.realpathSync(path.resolve(root));
  const productRoot = fs.realpathSync(path.resolve(workspace));
  assert.equal(fs.realpathSync(git(productRoot, 'rev-parse', '--show-toplevel')), productRoot, 'Use the root of the product checkout');
  assert.ok(allowedRemotes.has(git(productRoot, 'remote', 'get-url', 'origin')), 'The source must be the corporate POS Platform repository');
  assert.equal(git(productRoot, 'status', '--porcelain', '--untracked-files=all'), '', 'Commit or resolve product changes before importing follow-up');
  const revision = git(productRoot, 'rev-parse', 'HEAD');
  assert.match(revision, /^[a-f0-9]{40}$/, 'The source must have an immutable commit');
  const content = trackedJson(productRoot, revision, sourcePath);
  const registry = trackedJson(productRoot, revision, registryPath);
  const progressContent = trackedJson(productRoot, revision, 'delivery/progress.json');
  const progress = loadProgress(docsRoot);
  const productProgress = deriveProgress({ schemaVersion: 1, source: { repository: productRepository, revision, path: 'delivery/progress.json', sha256: progressContentHash(progressContent) }, content: progressContent }, fs.readFileSync(path.join(docsRoot, 'docs/roadmap.json'), 'utf8'));
  assert.deepEqual(productProgress.workPackages, progress.workPackages, 'Import the current technical progress before importing follow-up');
  const entries = mapGitHubIssues(registry, progress.workPackages.map(work => work.id), fetchIssues());
  const snapshot = {
    schemaVersion: 1,
    source: { repository: productRepository, revision, path: sourcePath, sha256: followUpContentHash(content) },
    content,
    issues: { observedAt: now(), repository: productRepository, entries },
  };
  const metrics = deriveFollowUp(snapshot, progress);
  // An explicit import can refresh observation time. A read-only check compares facts, not its clock.
  const destination = safeDestination(docsRoot);
  const existing = fs.existsSync(destination) ? fs.readFileSync(destination, 'utf8').replaceAll('\r\n', '\n') : null;
  const serialized = JSON.stringify(snapshot, null, 2) + '\n';
  let changed = existing !== serialized;
  if (check && existing !== null) {
    const previous = JSON.parse(existing);
    deriveFollowUp(previous, progress);
    snapshot.issues.observedAt = previous.issues.observedAt;
    changed = existing !== JSON.stringify(snapshot, null, 2) + '\n';
  }
  assert.equal(git(productRoot, 'rev-parse', 'HEAD'), revision, 'Product revision changed while importing follow-up');
  assert.equal(git(productRoot, 'status', '--porcelain', '--untracked-files=all'), '', 'Product checkout changed while importing follow-up');
  if (check) {
    if (changed) throw new StaleSnapshotError('Published follow-up snapshot is stale; import it and review the public metadata');
  } else if (changed) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const temporary = path.join(path.dirname(destination), `.project-follow-up-${process.pid}-${randomUUID()}.tmp`);
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
  return { changed, revision, destination, observedAt: metrics.observedAt, open: metrics.counts.open, total: metrics.workPackages.length, warnings: metrics.warnings };
}

export function parseFollowUpArguments(args) {
  let workspace;
  let check = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--workspace' && !workspace && args[index + 1] && !args[index + 1].startsWith('--')) workspace = args[++index];
    else if (args[index] === '--check' && !check) check = true;
    else throw new Error('Usage: node tools/sync-project-follow-up.mjs --workspace <clean-pos-platform-checkout> [--check]');
  }
  assert.ok(workspace, 'Usage: node tools/sync-project-follow-up.mjs --workspace <clean-pos-platform-checkout> [--check]');
  return { workspace, check };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = syncProjectFollowUp(parseFollowUpArguments(process.argv.slice(2)));
  console.log(`Project follow-up: ${result.open} open actions; ${result.total} issues; ${result.warnings.length} reconciliation observations; revision ${result.revision.slice(0, 12)}; ${result.changed ? 'snapshot updated' : 'snapshot current'}.`);
}
