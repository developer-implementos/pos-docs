import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { check, distribute, run, sourceRepository } from './distribute.mjs';

const lockPath = 'tools/odd/source-lock.json';
const seed = {
  'odd/README.md': '# Shared ODD protocol\n',
  '.codex/config.toml': '[mcp_servers.pos_engram]\ncommand = "node"\n',
  '.mcp.json': '{"mcpServers":{}}\n',
  'tools/odd/distribute.mjs': 'throw new Error("Imported source must never execute");\n',
  'tools/odd/distribute.test.mjs': '// Pinned test bytes\n',
  'tools/odd/check.mjs': '// Pinned checker\n',
  'tools/odd/upstream/LICENSE': 'Immutable provider license bytes\n',
  'tools/odd/upstream/claude-code.md': Buffer.from('# Provider\r\nDo not normalize bytes.\r\n', 'utf8'),
};
function write(root, relative, content) {
  const target = path.join(root, relative);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}
function git(root, args, input) {
  return execFileSync(
    'git',
    [
      '-c',
      'core.fsmonitor=false',
      '-c',
      'core.autocrlf=false',
      '-c',
      'commit.gpgSign=false',
      '-c',
      'core.hooksPath=.git/disabled-hooks',
      '-C',
      root,
      ...args,
    ],
    {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      input,
      windowsHide: true,
    },
  ).trim();
}
function commit(root) {
  git(root, ['add', '--all']);
  git(root, [
    '-c',
    'user.name=ODD fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '--quiet',
    '-m',
    'fixture',
  ]);
  return git(root, ['rev-parse', 'HEAD']);
}
function fixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'pos-odd-distribution-'));
  t.after(() => {
    const resolved = path.resolve(directory);
    assert.equal(path.dirname(resolved), path.resolve(tmpdir()));
    assert.ok(path.basename(resolved).startsWith('pos-odd-distribution-'));
    rmSync(resolved, { recursive: true, force: true });
  });
  const product = path.join(directory, 'product');
  const docs = path.join(directory, 'docs');
  write(product, 'package.json', '{"name":"pos-platform"}\n');
  write(docs, 'package.json', '{"name":"pos-docs"}\n');
  for (const [name, content] of Object.entries(seed)) write(product, name, content);
  // These tracked records are deliberately not distribution sources.
  write(product, 'odd/tasks/private-task.md', 'Private task history must stay in its repository.\n');
  write(product, 'tools/odd/fixtures/example.json', '{"fixture":true}\n');
  write(product, 'tools/odd/tmp/build.md', 'Temporary generated text\n');
  write(product, '.engram/memory.db', 'Local memory bytes\n');
  write(product, '.agents/skills/pos-delivery/SKILL.md', 'Independent distribution owns this file.\n');
  git(product, ['init', '--quiet', '--initial-branch=main']);
  git(product, ['remote', 'add', 'origin', `${sourceRepository}.git`]);
  const revision = commit(product);
  return { directory, product, docs, revision };
}

test('imports a clean immutable product revision as bytes and verifies docs offline', (t) => {
  const { product, docs, revision } = fixture(t);
  write(docs, 'odd/tasks/local-task.md', 'Local task history is independent.');
  write(docs, '.engram/local.db', 'Existing local memory');
  const result = distribute(docs, { source: product, revision });
  assert.equal(result.revision, revision);
  assert.equal(result.files, Object.keys(seed).length);
  assert.equal(check(product).repository, 'pos-platform');
  assert.ok(!existsSync(path.join(product, lockPath)));
  const lock = JSON.parse(readFileSync(path.join(docs, lockPath), 'utf8'));
  assert.equal(lock.repository, sourceRepository);
  assert.deepEqual(Object.keys(lock.files).sort(), Object.keys(seed).sort());
  for (const [name, content] of Object.entries(seed)) {
    assert.deepEqual(readFileSync(path.join(docs, name)), Buffer.from(content));
    assert.equal(lock.files[name], createHash('sha256').update(content).digest('hex'));
  }
  for (const name of [
    'odd/tasks/private-task.md',
    'tools/odd/fixtures/example.json',
    'tools/odd/tmp/build.md',
    '.engram/memory.db',
    '.agents/skills/pos-delivery/SKILL.md',
  ])
    assert.ok(!existsSync(path.join(docs, name)), name);
  assert.equal(
    readFileSync(path.join(docs, 'odd/tasks/local-task.md'), 'utf8'),
    'Local task history is independent.',
  );
  assert.equal(readFileSync(path.join(docs, '.engram/local.db'), 'utf8'), 'Existing local memory');
  renameSync(product, path.join(path.dirname(product), 'unavailable-product'));
  assert.equal(
    check(docs).revision,
    revision,
    'Consumer checks must not require the source checkout or network',
  );
});

test('source must be clean, match HEAD and identify the actual company origin', (t) => {
  const { product, docs, revision } = fixture(t);
  write(product, 'untracked.txt', 'Pending unrelated change');
  assert.throws(() => distribute(docs, { source: product, revision }), /must be clean/);
  unlinkSync(path.join(product, 'untracked.txt'));
  assert.throws(() => distribute(docs, { source: product, revision: 'f'.repeat(40) }), /HEAD must match/);
  git(product, ['remote', 'set-url', 'origin', 'https://github.com/personal/pos-platform.git']);
  assert.throws(() => distribute(docs, { source: product, revision }), /Source origin/);
  assert.ok(!existsSync(path.join(docs, lockPath)));
  assert.ok(!existsSync(path.join(docs, 'tools/odd')));
});

test('updates a pin and removes only unchanged files previously owned by the lock', (t) => {
  const { product, docs, revision } = fixture(t);
  distribute(docs, { source: product, revision });
  write(product, 'tools/odd/check.mjs', '// New checker bytes\n');
  write(product, 'tools/odd/new-check.mjs', '// Additional check\n');
  unlinkSync(path.join(product, 'tools/odd/upstream/claude-code.md'));
  const next = commit(product);
  const result = distribute(docs, { source: product, revision: next });
  assert.equal(result.revision, next);
  assert.equal(readFileSync(path.join(docs, 'tools/odd/check.mjs'), 'utf8'), '// New checker bytes\n');
  assert.ok(!existsSync(path.join(docs, 'tools/odd/upstream/claude-code.md')));
  assert.ok(existsSync(path.join(docs, 'tools/odd/new-check.mjs')));
});

test('consumer drift and unmanaged conflicts fail before overwriting any file', (t) => {
  const { product, docs, revision } = fixture(t);
  write(docs, 'tools/odd/check.mjs', '// Uncommitted local implementation\n');
  assert.throws(() => distribute(docs, { source: product, revision }), /Unmanaged local ODD file conflicts/);
  assert.equal(
    readFileSync(path.join(docs, 'tools/odd/check.mjs'), 'utf8'),
    '// Uncommitted local implementation\n',
  );
  unlinkSync(path.join(docs, 'tools/odd/check.mjs'));
  distribute(docs, { source: product, revision });
  const originalLock = readFileSync(path.join(docs, lockPath));
  write(docs, 'tools/odd/check.mjs', '// Local edit\n');
  assert.throws(() => check(docs), /source drift/);
  assert.throws(() => distribute(docs, { source: product, revision }), /Local ODD edits/);
  assert.deepEqual(readFileSync(path.join(docs, lockPath)), originalLock);
});

test('locks reject forged provenance, traversal, missing inventory and untracked additions', (t) => {
  const { product, docs, revision } = fixture(t);
  distribute(docs, { source: product, revision });
  const lock = JSON.parse(readFileSync(path.join(docs, lockPath), 'utf8'));
  for (const modify of [
    (value) => {
      value.repository = 'https://github.com/another/repo';
    },
    (value) => {
      value.revision = 'main';
    },
    (value) => {
      value.files['../outside.md'] = 'f'.repeat(64);
    },
    (value) => {
      value.files['odd/tasks/task.md'] = 'f'.repeat(64);
    },
    (value) => {
      delete value.files['tools/odd/distribute.mjs'];
    },
    (value) => {
      value.files['tools/odd/check.mjs'] = 'invalid';
    },
  ]) {
    const malformed = structuredClone(lock);
    modify(malformed);
    write(docs, lockPath, JSON.stringify(malformed));
    assert.throws(() => check(docs));
  }
  write(docs, lockPath, JSON.stringify(lock));
  write(docs, 'tools/odd/local-check.mjs', '// Consumer fork\n');
  assert.throws(() => check(docs), /inventory differs/);
});

test('runtime memory and nonregular source entries cannot enter the distribution', (t) => {
  const { product, docs, revision } = fixture(t);
  write(product, 'tools/odd/engram-export.json', '{"privateMemory":"never import"}');
  assert.throws(() => check(product), /runtime data/);
  unlinkSync(path.join(product, 'tools/odd/engram-export.json'));
  // Create an actual Git symlink blob without relying on Windows symlink privileges.
  write(product, 'tools/odd/linked.md', '../private.txt');
  const blob = git(product, ['hash-object', '-w', '--stdin'], '../private.txt');
  git(product, ['update-index', '--add', '--cacheinfo', `120000,${blob},tools/odd/linked.md`]);
  git(product, [
    '-c',
    'user.name=ODD fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '--quiet',
    '-m',
    'symlink fixture',
  ]);
  const linkedRevision = git(product, ['rev-parse', 'HEAD']);
  git(product, ['config', 'core.symlinks', 'false']);
  assert.throws(() => distribute(docs, { source: product, revision: linkedRevision }), /regular Git blobs/);
  assert.notEqual(linkedRevision, revision);
});

test('ignored working files cannot masquerade as part of a clean pinned source', (t) => {
  const { product, docs } = fixture(t);
  write(product, '.gitignore', 'tools/odd/ignored.mjs\n');
  const revision = commit(product);
  write(product, 'tools/odd/ignored.mjs', '// Not part of the immutable Git revision\n');
  assert.equal(git(product, ['status', '--porcelain=v1', '--untracked-files=all']), '');
  assert.throws(
    () => distribute(docs, { source: product, revision }),
    /inventory differs from the pinned Git tree/,
  );
  assert.ok(!existsSync(path.join(docs, lockPath)));
});

test('destination junctions cannot redirect writes outside the docs repository', (t) => {
  const { directory, product, docs, revision } = fixture(t);
  const external = path.join(directory, 'outside');
  mkdirSync(external);
  mkdirSync(path.join(docs, 'tools'));
  symlinkSync(external, path.join(docs, 'tools/odd'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => distribute(docs, { source: product, revision }), /Symlinks and junctions/);
  assert.ok(!existsSync(path.join(external, 'check.mjs')));
  assert.ok(!existsSync(path.join(docs, '.mcp.json')));
});

test('CLI contract keeps writes explicit and limited to the consumer', (t) => {
  const { product, docs, revision } = fixture(t);
  assert.equal(run({ root: product, args: ['--check'] }).repository, 'pos-platform');
  for (const args of [
    [],
    ['--write'],
    ['--check', '--source', product],
    ['--write', '--source', product, '--revision', 'main'],
    ['--write', '--source', product, '--source', product, '--revision', revision],
  ]) {
    assert.throws(() => run({ root: docs, args }));
  }
  assert.throws(
    () => run({ root: product, args: ['--write', '--source', product, '--revision', revision] }),
    /only available in pos-docs/,
  );
  assert.equal(
    run({ root: docs, args: ['--write', '--revision', revision, '--source', product] }).revision,
    revision,
  );
});
