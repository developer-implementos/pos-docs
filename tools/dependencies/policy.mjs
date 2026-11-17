/**
 * What a dependency-update PR from Renovate may change, so that it can skip the editorial
 * declaration (TASK-399). It is not a review bypass: a person still reviews and merges it.
 *
 * The exception is decided by identity and scope, never by the PR text:
 * - identity: `renovate[bot]`, from a `renovate/*` branch of this repository into `main`;
 * - scope: the published site's npm manifest and lockfile, and the action pins of the workflows.
 *
 * Each changed file is validated by content, read through immutable Git objects:
 * - the manifest may only change the version of dependencies it already declares, never a script,
 *   a field, an `overrides` pin or the source protocol of a dependency;
 * - the lockfile may only resolve packages from the public npm registry, each with an integrity hash;
 * - a workflow may only change the commit an existing `uses:` points to and its version comment.
 */
import { repository } from '../release/policy.mjs';

export const dependencyBot = 'renovate[bot]';
export const dependencyBranch = /^renovate\/[a-z0-9][a-z0-9._/-]*$/;
export const manifestPath = 'apps/starlight/package.json';
export const lockfilePath = 'apps/starlight/package-lock.json';
export const workflowPath = /^\.github\/workflows\/[a-z0-9][a-z0-9-]*\.yml$/;
export const registry = 'https://registry.npmjs.org/';

// `overrides` stays out: it is a deliberate pin by a person (a security fix, for example) and changes only in a reviewed PR.
const dependencyFields = ['dependencies', 'devDependencies', 'optionalDependencies'];
// A registry version or range. Protocols (`git+`, `file:`, `http:`, `npm:`, `link:`) and paths are rejected.
const versionSpec = /^[\w.^~<>=*| -]+$/;
const pinnedUses = /^(\s*(?:- )?uses: )([A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+)@([a-f0-9]{40})( # v?[\w.-]+)?$/;

/** Identity alone decides whether a PR takes the dependency path; anything else is an editorial PR. */
export function isDependencyPullRequest(pr) {
  return pr?.user?.login === dependencyBot && pr.user.type === 'Bot' && dependencyBranch.test(pr.head?.ref ?? '') &&
    pr.head?.repo?.full_name === repository && pr.base?.ref === 'main' && pr.base?.repo?.full_name === repository;
}

export function isDependencyFile(path) {
  return path === manifestPath || path === lockfilePath || workflowPath.test(path);
}

export function validateDependencyFiles(files) {
  if (!files.length) throw new Error('A dependency PR must change at least one file.');
  const outside = files.map(file => file.filename).filter(name => !isDependencyFile(name));
  if (outside.length) throw new Error(`A dependency PR may only change ${manifestPath}, ${lockfilePath} and workflow action pins; found ${outside.join(', ')}.`);
  const reshaped = files.filter(file => file.status !== 'modified');
  if (reshaped.length) throw new Error(`A dependency PR may only modify existing files; ${reshaped.map(file => `${file.filename} is ${file.status}`).join(', ')}.`);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/** The manifest keeps every field and dependency name; only registry version specs change. */
export function validateManifestChange(baseText, headText) {
  const before = JSON.parse(baseText);
  const after = JSON.parse(headText);
  const rest = value => Object.fromEntries(Object.entries(value).filter(([key]) => !dependencyFields.includes(key)));
  if (!sameJson(rest(before), rest(after))) throw new Error(`${manifestPath}: only dependency versions may change.`);
  for (const field of dependencyFields) {
    const old = before[field] ?? {};
    const next = after[field] ?? {};
    if (!sameJson(Object.keys(old).sort(), Object.keys(next).sort())) throw new Error(`${manifestPath}: ${field} may not add or remove dependencies.`);
    for (const [name, spec] of Object.entries(next)) {
      if (typeof spec !== 'string' || !versionSpec.test(spec)) throw new Error(`${manifestPath}: ${field}.${name} must be a registry version, not ${JSON.stringify(spec)}.`);
    }
  }
}

/** Every package the lockfile installs comes from the public registry with an integrity hash. */
export function validateLockfile(text) {
  const lock = JSON.parse(text);
  if (!(lock.lockfileVersion >= 2) || typeof lock.packages !== 'object') throw new Error(`${lockfilePath}: expected an npm lockfile v2 or later.`);
  for (const [path, entry] of Object.entries(lock.packages)) {
    if (path === '' || entry.link === true) continue;
    if (typeof entry.resolved !== 'string' || !entry.resolved.startsWith(registry)) {
      throw new Error(`${lockfilePath}: ${path} resolves outside ${registry}.`);
    }
    if (typeof entry.integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]+=*$/.test(entry.integrity)) {
      throw new Error(`${lockfilePath}: ${path} lacks a sha512 integrity hash.`);
    }
  }
}

/** A workflow keeps every line; a changed line is the same action pinned to another commit. */
export function validateWorkflowChange(path, baseText, headText) {
  const before = baseText.split('\n');
  const after = headText.split('\n');
  if (before.length !== after.length) throw new Error(`${path}: a dependency PR may only change action pins.`);
  before.forEach((line, index) => {
    if (line === after[index]) return;
    const old = pinnedUses.exec(line);
    const next = pinnedUses.exec(after[index]);
    if (!old || !next || old[1] !== next[1] || old[2] !== next[2]) {
      throw new Error(`${path}:${index + 1}: a dependency PR may only change the commit of an existing action.`);
    }
  });
}

/** Validates every changed file at the PR's base and head revisions. */
export async function validateDependencyContents({ files, read, base, head }) {
  validateDependencyFiles(files);
  for (const { filename } of files) {
    const after = await read(filename, head);
    if (filename === lockfilePath) validateLockfile(after);
    else if (filename === manifestPath) validateManifestChange(await read(filename, base), after);
    else validateWorkflowChange(filename, await read(filename, base), after);
  }
}
