import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  linkSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { check, goEnvironment, moduleHash, safeRelative, sha256, validateManifest } from './upstream.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
function fixture(context) {
  const base = realpathSync(os.tmpdir());
  const directory = mkdtempSync(path.join(base, 'pos-odd-upstream-'));
  context.after(() => {
    const resolved = realpathSync(directory);
    assert.equal(path.dirname(resolved).toLowerCase(), base.toLowerCase());
    assert.ok(path.basename(resolved).startsWith('pos-odd-upstream-'));
    rmSync(resolved, { recursive: true, force: true });
  });
  return directory;
}
function copyFixture(context) {
  const directory = fixture(context);
  mkdirSync(path.join(directory, 'tools/odd'), { recursive: true });
  for (const name of ['upstream', 'toolchain.lock.json', 'upstream-render.go', 'runtime-profile.json'])
    cpSync(path.join(root, 'tools/odd', name), path.join(directory, 'tools/odd', name), { recursive: true });
  mkdirSync(path.join(directory, '.agents/skills/pos-delivery'), { recursive: true });
  cpSync(
    path.join(root, '.agents/skills/pos-delivery/SKILL.md'),
    path.join(directory, '.agents/skills/pos-delivery/SKILL.md'),
  );
  check(directory, { distribute: true });
  return directory;
}
test('vendored upstream and distributed skills are byte-identical', () => assert.equal(check(root), 8));
test('changed vendor, changed renderer, missing distribution and undeclared asset fail', (context) => {
  const directory = copyFixture(context);
  const target = path.join(directory, '.agents/skills/work-unit-commits/SKILL.md');
  rmSync(target);
  assert.throws(() => check(directory), /Distribution differs/u);
  check(directory, { distribute: true });
  writeFileSync(target, 'not the upstream skill');
  assert.throws(() => check(directory), /Distribution differs/u);
  check(directory, { distribute: true });
  const guide = path.join(directory, 'tools/odd/upstream/codex.md');
  const original = readFileSync(guide);
  writeFileSync(guide, 'silently rewritten policy');
  assert.throws(() => check(directory), /Upstream asset changed/u);
  writeFileSync(guide, original);
  writeFileSync(path.join(directory, 'tools/odd/upstream/untracked.md'), 'new instructions');
  assert.throws(() => check(directory), /Undeclared upstream file/u);
  rmSync(path.join(directory, 'tools/odd/upstream/untracked.md'));
  const registry = path.join(directory, '.atl/skill-registry.md');
  writeFileSync(registry, '# incomplete index');
  assert.throws(() => check(directory), /Skill registry differs/u);
  check(directory, { distribute: true });
  const profile = path.join(directory, 'tools/odd/runtime-profile.json');
  const originalProfile = readFileSync(profile);
  writeFileSync(profile, '{}');
  assert.throws(() => check(directory), /Runtime profile changed/u);
  writeFileSync(profile, originalProfile);
  writeFileSync(path.join(directory, 'tools/odd/upstream-render.go'), '// changed renderer');
  assert.throws(() => check(directory), /Renderer changed/u);
});
test('manifest rejects traversal, absolute, control and unowned distribution paths', () => {
  for (const value of ['../escape', 'a/../b', '/root', 'C:/escape', 'a\\b', 'a\nb', 'a//b'])
    assert.throws(() => safeRelative(value), /Unsafe/u);
  const manifest = JSON.parse(readFileSync(path.join(root, 'tools/odd/upstream/manifest.json')));
  for (const target of ['.agents/skills/pos-delivery/SKILL.md', '../AGENTS.md', '.claude/settings.json']) {
    const copy = structuredClone(manifest);
    copy.files[0].targets = [target];
    assert.throws(() => validateManifest(copy), /Unsafe|Unowned/u);
  }
});
test('Go module hash detects source drift with sorted module-prefixed file names', (context) => {
  const directory = fixture(context);
  writeFileSync(path.join(directory, 'b.txt'), 'second');
  writeFileSync(path.join(directory, 'a.txt'), 'first');
  const lines = `${sha256(Buffer.from('first'))}  example.test/fixture@v1.0.0/a.txt\n${sha256(Buffer.from('second'))}  example.test/fixture@v1.0.0/b.txt\n`;
  const expected = `h1:${Buffer.from(sha256(Buffer.from(lines)), 'hex').toString('base64')}`;
  assert.equal(moduleHash(directory, 'example.test/fixture', '1.0.0'), expected);
  writeFileSync(path.join(directory, 'a.txt'), 'tampered');
  assert.notEqual(moduleHash(directory, 'example.test/fixture', '1.0.0'), expected);
});

test('distribution replaces a hardlinked output without mutating external bytes', (context) => {
  const directory = copyFixture(context);
  const outside = path.join(fixture(context), 'outside.md');
  const target = path.join(directory, '.agents/skills/work-unit-commits/SKILL.md');
  writeFileSync(outside, 'This file is not owned by the repository.');
  rmSync(target);
  linkSync(outside, target);
  check(directory, { distribute: true });
  assert.equal(readFileSync(outside, 'utf8'), 'This file is not owned by the repository.');
  assert.deepEqual(
    readFileSync(target),
    readFileSync(path.join(root, '.agents/skills/work-unit-commits/SKILL.md')),
  );
});

test('distribution rejects directory junctions before writing to an external location', (context) => {
  const directory = copyFixture(context);
  const outside = fixture(context);
  const target = path.join(directory, '.agents/skills/work-unit-commits');
  renameSync(target, `${target}-saved`);
  symlinkSync(outside, target, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => check(directory, { distribute: true }), /Unexpected symbolic link/);
  assert.equal(existsSync(path.join(outside, 'SKILL.md')), false);
});

test('distribution rejects dangling file links when the operating system permits their creation', (context) => {
  const directory = copyFixture(context);
  const outside = path.join(fixture(context), 'missing.md');
  const target = path.join(directory, '.agents/skills/work-unit-commits/SKILL.md');
  rmSync(target);
  try {
    symlinkSync(outside, target, 'file');
  } catch (error) {
    if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error.code)) throw error;
    context.diagnostic(
      'Windows denied file-symlink creation; this branch was not exercised. Hardlinks and directory junctions were tested separately.',
    );
    return;
  }
  assert.equal(existsSync(target), false, 'The reproduction requires a genuinely dangling link');
  assert.throws(() => check(directory, { distribute: true }), /Unexpected symbolic link/);
  assert.equal(existsSync(outside), false);
});

test('renderer ignores inherited cross-compilation targets and uses the pinned Go root', (context) => {
  const version = JSON.parse(readFileSync(path.join(root, 'tools/odd/toolchain.lock.json'), 'utf8')).go
    .version;
  const tools =
    process.platform === 'win32' && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'POS-Platform/odd-toolchain')
      : path.join(fixture(context), 'toolchain');
  const inherited = {
    ...process.env,
    GOOS: 'linux',
    GOARCH: 'arm64',
    GOROOT: path.join(tools, 'foreign-go'),
  };
  const env = goEnvironment(tools, version, inherited);
  assert.equal(env.GOOS, 'windows');
  assert.equal(env.GOARCH, 'amd64');
  assert.equal(env.GOROOT, path.join(tools, `go/${version}/go`));
  assert.equal(inherited.GOOS, 'linux', 'Creating a child environment must not mutate the parent');
  const executable = path.join(env.GOROOT, 'bin/go.exe');
  if (process.platform === 'win32' && existsSync(executable)) {
    const result = spawnSync(executable, ['env', 'GOOS', 'GOARCH', 'GOROOT'], {
      env,
      encoding: 'utf8',
      timeout: 15_000,
      windowsHide: true,
    });
    assert.equal(result.status, 0, `${result.error ?? ''}\n${result.stderr}`);
    assert.deepEqual(result.stdout.trim().split(/\r?\n/), ['windows', 'amd64', env.GOROOT]);
  } else
    context.diagnostic(
      'Pinned Windows Go unavailable; child environment contract checked without installing or downloading.',
    );
});
