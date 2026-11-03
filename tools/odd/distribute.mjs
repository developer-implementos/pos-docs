import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  closeSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const sourceRepository = 'https://github.com/developer-implementos/pos-platform';
const lockPath = 'tools/odd/source-lock.json';
const fixedFiles = ['odd/README.md', '.codex/config.toml', '.mcp.json'];
const requiredFiles = [...fixedFiles, 'tools/odd/distribute.mjs', 'tools/odd/distribute.test.mjs'];
const excludedParts = new Set(['fixtures', '__fixtures__', 'tmp', '.engram', 'memory', 'sessions']);
const maxFileBytes = 8 * 1024 * 1024;
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const samePath = (left, right) =>
  process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;

function stat(target) {
  try {
    return lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
function repositoryRoot(value) {
  const root = path.resolve(value);
  assert.ok(
    stat(root)?.isDirectory() && !stat(root).isSymbolicLink(),
    'Repository root must be a real directory',
  );
  assert.ok(samePath(root, realpathSync(root)), 'Repository root must not traverse symlinks or junctions');
  return root;
}
function safePath(root, relative) {
  assert.equal(typeof relative, 'string', 'Invalid managed path');
  assert.ok(
    !/[\\:]/u.test(relative) &&
      ![...relative].some((character) => character.codePointAt(0) < 32 || character.codePointAt(0) === 127),
    'Invalid managed path',
  );
  let current = root;
  const segments = relative.split('/');
  for (const [index, segment] of segments.entries()) {
    assert.ok(segment && segment !== '.' && segment !== '..', 'Invalid managed path');
    current = path.join(current, segment);
    const info = stat(current);
    assert.ok(!info?.isSymbolicLink(), `Symlinks and junctions are not allowed: ${relative}`);
    assert.ok(
      !info || index === segments.length - 1 || info.isDirectory(),
      `Expected directory: ${relative}`,
    );
  }
  return current;
}
function allowed(relative) {
  if (fixedFiles.includes(relative)) return true;
  if (!relative.startsWith('tools/odd/') || relative === lockPath) return false;
  const parts = relative.split('/');
  if (parts.some((part) => excludedParts.has(part))) return false;
  // Runtime memory and database files never belong to the protocol distribution.
  if (
    /\.(?:db|sqlite|sqlite3)(?:[-.]|$)|\.(?:wal|shm|jsonl)$|(?:^|\/)(?:engram-export|engram-backup|memory)[.-]/iu.test(
      relative,
    )
  )
    return false;
  return (
    /\.(?:mjs|ps1|go|json|md|txt|toml|yaml|yml)$/u.test(relative) || /\/(?:LICENSE|NOTICE)$/u.test(relative)
  );
}
function bytes(root, relative) {
  const target = safePath(root, relative);
  const info = stat(target);
  assert.ok(
    info?.isFile() && info.size <= maxFileBytes,
    `Missing, nonregular or oversized source: ${relative}`,
  );
  return readFileSync(target);
}
function role(root) {
  const name = JSON.parse(bytes(root, 'package.json').toString('utf8')).name;
  assert.ok(['pos-platform', 'pos-docs'].includes(name), 'Unsupported repository package.name');
  return name;
}
function inventory(root, { required = true } = {}) {
  const names = [];
  const walk = (relative) => {
    const directory = safePath(root, relative);
    const info = stat(directory);
    if (!info && !required) return;
    assert.ok(info?.isDirectory(), `Missing managed directory: ${relative}`);
    for (const name of readdirSync(directory)) {
      if (excludedParts.has(name)) continue;
      const relativeFile = `${relative}/${name}`;
      if (relativeFile === lockPath) continue;
      const target = safePath(root, relativeFile);
      const entry = stat(target);
      if (entry?.isDirectory()) walk(relativeFile);
      else {
        assert.ok(
          entry?.isFile() && allowed(relativeFile),
          `Unmanaged or runtime data in ODD distribution: ${relativeFile}`,
        );
        names.push(relativeFile);
      }
    }
  };
  walk('tools/odd');
  for (const relative of fixedFiles) {
    const info = stat(safePath(root, relative));
    if (info) {
      assert.ok(info.isFile(), `Expected regular managed file: ${relative}`);
      names.push(relative);
    }
  }
  if (required)
    for (const relative of requiredFiles)
      assert.ok(names.includes(relative), `Missing managed file: ${relative}`);
  return names.sort();
}
function git(root, args, encoding = 'utf8') {
  try {
    return execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', root, ...args], {
      encoding,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: maxFileBytes,
      windowsHide: true,
    });
  } catch {
    throw new Error('Git could not read the product repository or immutable revision');
  }
}
function readLock(root) {
  const lock = JSON.parse(bytes(root, lockPath).toString('utf8'));
  assert.deepEqual(
    Object.keys(lock).sort(),
    ['files', 'repository', 'revision', 'schemaVersion'],
    'Invalid ODD source lock fields',
  );
  assert.equal(lock.schemaVersion, 1, 'Unsupported ODD source lock version');
  assert.equal(
    lock.repository,
    sourceRepository,
    'ODD source lock must identify the company product repository',
  );
  assert.match(lock.revision, /^[a-f0-9]{40}$/, 'ODD source lock requires a full immutable commit SHA');
  assert.ok(
    lock.files && typeof lock.files === 'object' && !Array.isArray(lock.files),
    'ODD source lock needs its file inventory',
  );
  for (const [relative, digest] of Object.entries(lock.files)) {
    safePath(root, relative);
    assert.ok(allowed(relative), `Unowned path in ODD source lock: ${relative}`);
    assert.match(digest, /^[a-f0-9]{64}$/, 'Invalid ODD source hash');
  }
  for (const relative of requiredFiles)
    assert.ok(Object.hasOwn(lock.files, relative), `Missing required locked file: ${relative}`);
  return lock;
}

/** Offline integrity check; the product owns these sources and has no self-pinning lock. */
export function check(root) {
  root = repositoryRoot(root);
  const repository = role(root);
  const names = inventory(root);
  if (repository === 'pos-platform') {
    assert.ok(
      !stat(safePath(root, lockPath)),
      'The product is authoritative and must not contain a distribution source lock',
    );
    for (const name of names) bytes(root, name);
    return { repository, files: names.length };
  }
  const lock = readLock(root);
  assert.deepEqual(
    names,
    Object.keys(lock.files).sort(),
    'ODD inventory differs from its pinned source lock',
  );
  for (const name of names)
    assert.equal(sha256(bytes(root, name)), lock.files[name], `Pinned ODD source drift: ${name}`);
  return { repository, files: names.length, revision: lock.revision };
}

function pinned(source, revision) {
  assert.match(revision, /^[a-f0-9]{40}$/, '--revision must be a full lowercase commit SHA');
  const root = repositoryRoot(source);
  assert.ok(
    samePath(root, realpathSync(git(root, ['rev-parse', '--show-toplevel']).trim())),
    '--source must be the repository root',
  );
  assert.equal(role(root), 'pos-platform', 'Only pos-platform is an authoritative import source');
  const origin = git(root, ['remote', 'get-url', 'origin']).trim();
  assert.match(
    origin,
    /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)developer-implementos\/pos-platform(?:\.git)?\/?$/,
    'Source origin must identify developer-implementos/pos-platform',
  );
  const clean = () => {
    assert.equal(
      git(root, ['status', '--porcelain=v1', '--untracked-files=all']).trim(),
      '',
      'Source checkout must be clean',
    );
    assert.equal(
      git(root, ['rev-parse', 'HEAD']).trim(),
      revision,
      'Source HEAD must match the pinned commit',
    );
    assert.equal(
      git(root, ['rev-parse', `${revision}^{commit}`]).trim(),
      revision,
      'Source revision must identify a commit',
    );
  };
  clean();
  check(root);
  const names = inventory(root);
  const entries = git(root, ['ls-tree', '-r', '-z', revision, '--', 'tools/odd', ...fixedFiles])
    .split('\0')
    .filter(Boolean);
  const tracked = new Map();
  for (const entry of entries) {
    const match = /^(\d+) (blob|commit) ([a-f0-9]{40})\t(.+)$/u.exec(entry);
    assert.ok(match, 'Invalid pinned Git tree entry');
    const relative = match[4];
    if (relative.split('/').some((part) => excludedParts.has(part))) continue;
    assert.ok(
      allowed(relative) && ['100644', '100755'].includes(match[1]) && match[2] === 'blob',
      `Only allowed regular Git blobs may be imported: ${relative}`,
    );
    tracked.set(relative, match[3]);
  }
  assert.deepEqual([...tracked.keys()].sort(), names, 'Working inventory differs from the pinned Git tree');
  const metadata = JSON.parse(git(root, ['cat-file', 'blob', `${revision}:package.json`]));
  assert.equal(metadata.name, 'pos-platform', 'Pinned revision must belong to the product package');
  const files = new Map(
    names.map((name) => [name, git(root, ['cat-file', 'blob', tracked.get(name)], null)]),
  );
  clean();
  return files;
}
function put(root, relative, content) {
  const target = safePath(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  safePath(root, relative);
  const temporary = path.join(path.dirname(target), `.odd-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = openSync(temporary, 'wx', 0o644);
    writeFileSync(handle, content);
    closeSync(handle);
    handle = undefined;
    renameSync(temporary, target);
  } finally {
    if (handle !== undefined) closeSync(handle);
    if (stat(temporary)) unlinkSync(temporary);
  }
}

/** Import bytes only. Never invoke source scripts or include task records and local memory. */
export function distribute(root, { source, revision }) {
  root = repositoryRoot(root);
  assert.equal(role(root), 'pos-docs', 'Pinned ODD import is only available in pos-docs');
  const files = pinned(source, revision);
  const current = inventory(root, { required: false });
  const previous = stat(safePath(root, lockPath)) ? readLock(root) : null;
  if (previous) {
    assert.deepEqual(
      current,
      Object.keys(previous.files).sort(),
      'Existing ODD inventory differs from its source lock; reconcile before importing',
    );
    for (const [name, digest] of Object.entries(previous.files))
      assert.equal(
        sha256(bytes(root, name)),
        digest,
        `Local ODD edits must be reconciled before importing: ${name}`,
      );
  }
  for (const name of current) {
    if (previous?.files[name]) continue;
    assert.ok(
      files.has(name) && bytes(root, name).equals(files.get(name)),
      `Unmanaged local ODD file conflicts with the import: ${name}`,
    );
  }
  // Complete all destination checks before writing; the lock is written last.
  for (const name of [...files.keys(), lockPath]) {
    const entry = stat(safePath(root, name));
    assert.ok(!entry || entry.isFile(), `Expected regular output file: ${name}`);
  }
  const lock = {
    schemaVersion: 1,
    repository: sourceRepository,
    revision,
    files: Object.fromEntries([...files].map(([name, content]) => [name, sha256(content)])),
  };
  for (const [name, content] of files) put(root, name, content);
  for (const name of current) if (!files.has(name)) unlinkSync(safePath(root, name));
  put(root, lockPath, `${JSON.stringify(lock, null, 2)}\n`);
  return check(root);
}

export function run({ root, args }) {
  assert.ok(
    args.length > 0 && ['--check', '--write'].includes(args[0]),
    'Use --check or --write --source <root> --revision <SHA40>',
  );
  if (args[0] === '--check') {
    assert.equal(args.length, 1, '--check is offline and accepts no source or revision arguments');
    return check(root);
  }
  const options = {};
  for (let index = 1; index < args.length; index += 2) {
    const flag = args[index];
    assert.ok(
      ['--source', '--revision'].includes(flag) && !Object.hasOwn(options, flag),
      'Unknown or duplicate import option',
    );
    assert.ok(args[index + 1] && !args[index + 1].startsWith('--'), `Missing value for ${flag}`);
    options[flag] = args[index + 1];
  }
  assert.ok(options['--source'] && options['--revision'], 'Import requires --source and --revision together');
  return distribute(root, { source: options['--source'], revision: options['--revision'] });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = run({
      root: fileURLToPath(new URL('../../', import.meta.url)),
      args: process.argv.slice(2),
    });
    process.stdout.write(
      `ODD distribution checked: ${result.repository}, ${result.files} files${result.revision ? ` at ${result.revision}` : ' (authoritative source)'}.\n`,
    );
  } catch (error) {
    process.stderr.write(`ODD distribution failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
