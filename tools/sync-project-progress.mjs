import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deriveProgress, progressContentHash } from '../portal/progress.mjs';

const repository = 'https://github.com/developer-implementos/pos-platform';
const sourcePath = 'delivery/progress.json';
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const allowedRemotes = new Set([repository, `${repository}.git`, 'git@github.com:developer-implementos/pos-platform.git', 'ssh://git@github.com/developer-implementos/pos-platform.git']);

function gitRaw(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function git(cwd, ...args) {
  return gitRaw(cwd, ...args).trimEnd();
}

function verifyEvidence(workspace, content, sourceRevision) {
  const revisions = new Map([[content.productRevision, content.applications.flatMap(app => app.evidence)]]);
  for (const work of content.workPackages) {
    if (work.acceptance) {
      try {
        git(workspace, 'merge-base', '--is-ancestor', work.acceptance.revision, content.productRevision);
      } catch {
        throw new Error(`Acceptance revision must belong to the audited product history: ${work.acceptance.revision}`);
      }
      const entries = revisions.get(work.acceptance.revision) || [];
      revisions.set(work.acceptance.revision, [...entries, ...work.acceptance.evidence]);
    }
  }
  for (const [revision, entries] of revisions) {
    assert.equal(git(workspace, 'cat-file', '-t', revision), 'commit', `Evidence revision is not a commit: ${revision}`);
    try {
      git(workspace, 'merge-base', '--is-ancestor', revision, sourceRevision);
    } catch {
      throw new Error(`Evidence revision must belong to the imported product history: ${revision}`);
    }
    for (const entry of entries) {
      try {
        const [object, recordedPath] = git(workspace, 'ls-tree', revision, '--', entry.path).split('\t');
        const [mode, type] = object.split(' ');
        assert.equal(recordedPath, entry.path);
        assert.ok(['100644 blob', '100755 blob', '040000 tree'].includes(`${mode} ${type}`));
      } catch {
        throw new Error(`Missing evidence or unsupported Git object at product revision ${revision}: ${entry.path}`);
      }
    }
  }
}

function safeDestination(root) {
  for (const relative of ['portal', 'portal/data', 'portal/data/project-progress.json']) {
    const location = path.join(root, relative);
    if (fs.existsSync(location)) {
      assert.ok(!fs.lstatSync(location).isSymbolicLink(), `Progress destination cannot be a symbolic link: ${relative}`);
      assert.equal(fs.realpathSync(location), location, `Progress destination must stay inside POS Docs: ${relative}`);
      assert.equal(fs.statSync(location).isDirectory(), !relative.endsWith('.json'), `Unexpected progress destination type: ${relative}`);
    }
  }
  return path.join(root, 'portal/data/project-progress.json');
}

/** Import reviewed public metadata only; never execute or copy product source code. */
export function syncProjectProgress({ root = repositoryRoot, workspace, check = false }) {
  assert.ok(typeof workspace === 'string' && workspace.length > 0, 'A product checkout is required');
  const docsRoot = fs.realpathSync(path.resolve(root));
  const productRoot = fs.realpathSync(path.resolve(workspace));
  assert.equal(fs.realpathSync(git(productRoot, 'rev-parse', '--show-toplevel')), productRoot, 'Use the root of the product checkout');
  assert.ok(allowedRemotes.has(git(productRoot, 'remote', 'get-url', 'origin')), 'The source must be the corporate POS Platform repository');
  assert.equal(git(productRoot, 'status', '--porcelain', '--untracked-files=all'), '', 'Commit or resolve product changes before importing progress');
  const revision = git(productRoot, 'rev-parse', 'HEAD');
  assert.match(revision, /^[a-f0-9]{40}$/, 'The source must have an immutable commit');
  assert.match(git(productRoot, 'ls-tree', revision, '--', sourcePath), /^100(?:644|755) blob [a-f0-9]{40}\tdelivery\/progress\.json$/, 'The progress source must be a tracked regular JSON file');
  const content = JSON.parse(git(productRoot, 'show', `${revision}:${sourcePath}`));
  const snapshot = {
    schemaVersion: 1,
    source: { repository, revision, path: sourcePath, sha256: progressContentHash(content) },
    content,
  };
  const roadmapSource = fs.readFileSync(path.join(docsRoot, 'docs/roadmap.json'), 'utf8');
  const metrics = deriveProgress(snapshot, roadmapSource);
  const pinnedRoadmap = gitRaw(docsRoot, 'show', `${content.scope.revision}:${content.scope.path}`).replaceAll('\r\n', '\n');
  assert.equal(createHash('sha256').update(pinnedRoadmap, 'utf8').digest('hex'), content.scope.sha256, 'The pinned roadmap commit does not match the reviewed scope');
  verifyEvidence(productRoot, content, revision);

  // Check the source again before replacing the public snapshot, including untracked files.
  assert.equal(git(productRoot, 'rev-parse', 'HEAD'), revision, 'Product revision changed while importing progress');
  assert.equal(git(productRoot, 'status', '--porcelain', '--untracked-files=all'), '', 'Product checkout changed while importing progress');
  const destination = safeDestination(docsRoot);
  const serialized = JSON.stringify(snapshot, null, 2) + '\n';
  const existing = fs.existsSync(destination) ? fs.readFileSync(destination, 'utf8').replaceAll('\r\n', '\n') : null;
  const changed = existing !== serialized;
  if (check) {
    assert.ok(!changed, 'Published progress snapshot is stale; run progress:sync and review the resulting change');
  } else if (changed) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const temporary = path.join(path.dirname(destination), `.project-progress-${process.pid}-${randomUUID()}.tmp`);
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
  return { changed, revision, destination, accepted: metrics.accepted, total: metrics.total };
}

export function parseProgressArguments(args) {
  let workspace;
  let check = false;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--workspace' && !workspace && args[index + 1] && !args[index + 1].startsWith('--')) workspace = args[++index];
    else if (argument === '--check' && !check) check = true;
    else throw new Error('Usage: node tools/sync-project-progress.mjs --workspace <clean-pos-platform-checkout> [--check]');
  }
  assert.ok(workspace, 'Usage: node tools/sync-project-progress.mjs --workspace <clean-pos-platform-checkout> [--check]');
  return { workspace, check };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = syncProjectProgress(parseProgressArguments(process.argv.slice(2)));
  console.log(`Product progress: ${result.accepted}/${result.total} accepted; revision ${result.revision.slice(0, 12)}; ${result.changed ? 'snapshot updated' : 'snapshot current'}.`);
}
