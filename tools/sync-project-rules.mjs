import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { productRepository } from '../portal/follow-up.mjs';
import { loadProgress } from '../portal/progress.mjs';
import { projectRules, rulesContentHash, rulesDataPath, rulesSourcePath, validateRulesRegister } from '../portal/rules.mjs';
import { StaleSnapshotError } from './project-import/stale-snapshot.mjs';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const allowedRemotes = new Set([productRepository, `${productRepository}.git`, 'git@github.com:developer-implementos/pos-platform.git', 'ssh://git@github.com/developer-implementos/pos-platform.git']);
const mainReference = 'refs/remotes/origin/main';
const usage = 'Usage: node tools/sync-project-rules.mjs --workspace <clean-pos-platform-checkout> [--check]';

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }).trimEnd();
}

/** Exit status of a git command that answers yes (0) or no (1). */
function gitStatus(root, ...args) {
  try {
    execFileSync('git', args, { cwd: root, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    return 0;
  } catch (error) {
    if (typeof error.status === 'number') return error.status;
    throw error;
  }
}

const isTrackedFile = (root, revision, relative) => /^100(?:644|755) blob [a-f0-9]{40}\t/.test(git(root, 'ls-tree', revision, '--', relative));

function trackedText(root, revision, relative, label = `${relative} must be a regular tracked file`) {
  assert.ok(isTrackedFile(root, revision, relative), label);
  return git(root, 'show', `${revision}:${relative}`);
}

/**
 * Whether main of the corporate repository contains the revision, from the checkout's own refs. A
 * revision outside main must still be published in a remote branch, so its links resolve.
 */
function integration(root, revision) {
  assert.equal(gitStatus(root, 'rev-parse', '--verify', '--quiet', `${mainReference}^{commit}`), 0, 'Fetch origin/main in the product checkout before importing rules');
  const status = gitStatus(root, 'merge-base', '--is-ancestor', revision, mainReference);
  assert.ok(status === 0 || status === 1, 'Could not compare the revision with origin/main');
  if (status === 1) assert.ok(git(root, 'for-each-ref', '--contains', revision, '--format=%(refname)', 'refs/remotes/origin/').length > 0, 'Push the revision to the corporate repository before importing rules');
  return { reference: 'main', included: status === 0 };
}

function safeDestination(root) {
  for (const relative of ['portal', 'portal/data', rulesDataPath]) {
    const location = path.join(root, relative);
    if (!fs.existsSync(location)) continue;
    assert.ok(!fs.lstatSync(location).isSymbolicLink(), `Rules destination cannot be a symbolic link: ${relative}`);
    assert.equal(fs.realpathSync(location), location, `Rules destination must stay inside POS Docs: ${relative}`);
    assert.equal(fs.statSync(location).isDirectory(), !relative.endsWith('.json'), `Unexpected rules destination type: ${relative}`);
  }
  return path.join(root, rulesDataPath);
}

/**
 * Imports the public projection of the rules register. The product validates the full register in
 * its own CI; this importer publishes only the closed list of fields that the disclosure of each rule
 * allows, so the legacy evidence and its free text never reach this public repository.
 */
export function syncProjectRules({ root = repositoryRoot, workspace, check = false }) {
  assert.ok(typeof workspace === 'string' && workspace.length > 0, 'A product checkout is required');
  const docsRoot = fs.realpathSync(path.resolve(root));
  const productRoot = fs.realpathSync(path.resolve(workspace));
  assert.equal(fs.realpathSync(git(productRoot, 'rev-parse', '--show-toplevel')), productRoot, 'Use the root of the product checkout');
  assert.ok(allowedRemotes.has(git(productRoot, 'remote', 'get-url', 'origin')), 'The source must be the corporate POS Platform repository');
  assert.equal(git(productRoot, 'status', '--porcelain', '--untracked-files=all'), '', 'Commit or resolve product changes before importing rules');
  const revision = git(productRoot, 'rev-parse', 'HEAD');
  assert.match(revision, /^[a-f0-9]{40}$/, 'The source must have an immutable commit');
  const state = integration(productRoot, revision);
  const content = JSON.parse(trackedText(productRoot, revision, rulesSourcePath));
  const register = projectRules(content);
  // Every package must exist in the roadmap that POS Docs publishes, as the build will require.
  validateRulesRegister(register, { workPackageIds: loadProgress(docsRoot).workPackages.map(work => work.id) });
  const snapshot = {
    schemaVersion: 1,
    source: { repository: productRepository, revision, path: rulesSourcePath },
    integration: state,
    sha256: rulesContentHash(register),
    register,
  };
  const destination = safeDestination(docsRoot);
  const existing = fs.existsSync(destination) ? fs.readFileSync(destination, 'utf8').replaceAll('\r\n', '\n') : null;
  const serialized = JSON.stringify(snapshot, null, 2) + '\n';
  const changed = existing !== serialized;
  assert.equal(git(productRoot, 'rev-parse', 'HEAD'), revision, 'Product revision changed while importing rules');
  assert.equal(git(productRoot, 'status', '--porcelain', '--untracked-files=all'), '', 'Product checkout changed while importing rules');
  if (check) {
    if (changed) throw new StaleSnapshotError('Published rules snapshot is stale; import it and review the public text');
  } else if (changed) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const temporary = path.join(path.dirname(destination), `.project-rules-${process.pid}-${randomUUID()}.tmp`);
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
  const internal = register.rules.filter(rule => rule.disclosure === 'internal').length;
  return { changed, revision, destination, included: state.included, total: register.rules.length, public: register.rules.length - internal, internal };
}

export function parseRulesArguments(args) {
  let workspace;
  let check = false;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--workspace' && !workspace && args[index + 1] && !args[index + 1].startsWith('--')) workspace = args[++index];
    else if (args[index] === '--check' && !check) check = true;
    else throw new Error(usage);
  }
  assert.ok(workspace, usage);
  return { workspace, check };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = syncProjectRules(parseRulesArguments(process.argv.slice(2)));
  console.log(`Project rules: ${result.total} rules; ${result.public} public and ${result.internal} internal; revision ${result.revision.slice(0, 12)} ${result.included ? 'in main' : 'not yet in main'}; ${result.changed ? 'snapshot updated' : 'snapshot current'}.`);
}
