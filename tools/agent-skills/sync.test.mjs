import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  symlinkSync,
  chmodSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { sync, SKILL_FILES, SOURCE_FILES, SOURCE_REPOSITORY, TOOL_FILES } from './sync.mjs';

const toolDirectory = dirname(fileURLToPath(import.meta.url));
const canonical = '.agents/skills/pos-delivery';
const mirror = '.claude/skills/pos-delivery';
function git(root, ...args) {
  return execFileSync(
    'git',
    [
      '-c',
      `core.hooksPath=${join(root, '.git', 'disabled-fixture-hooks')}`,
      '-c',
      'core.fsmonitor=false',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'init.templateDir=',
      '-C',
      root,
      ...args,
    ],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ).trim();
}
function put(root, path, value) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), value);
}
function temporary(t) {
  const root = mkdtempSync(join(tmpdir(), 'pos-delivery-skill-'));
  t.after(() => {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('pos-delivery-skill-'));
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}
function repository(root, name) {
  mkdirSync(root, { recursive: true });
  git(root, 'init', '--quiet', '--template=');
  git(root, 'config', 'user.name', 'Skill fixture');
  git(root, 'config', 'user.email', 'skill-fixture@example.test');
  git(root, 'config', 'core.autocrlf', 'false');
  git(root, 'config', 'commit.gpgsign', 'false');
  put(root, 'package.json', `${JSON.stringify({ name })}\n`);
  put(root, '.gitattributes', '* text=auto eol=lf\n');
}
function commit(root) {
  git(root, 'add', '--all');
  git(root, 'commit', '--quiet', '-m', 'Synthetic skill fixture');
  return git(root, 'rev-parse', 'HEAD');
}
function product(root) {
  repository(root, 'pos-platform');
  git(root, 'remote', 'add', 'origin', `${SOURCE_REPOSITORY}.git`);
  put(
    root,
    `${canonical}/SKILL.md`,
    '---\nname: pos-delivery\ndescription: Synthetic behavior fixture.\n---\nRead canonical rules.\n',
  );
  put(root, `${canonical}/agents/openai.yaml`, 'interface:\n  display_name: "POS Delivery"\n');
  for (const file of TOOL_FILES)
    put(root, `tools/agent-skills/${file}`, readFileSync(join(toolDirectory, file)));
  sync({ cwd: root, args: ['--write'] });
  return commit(root);
}
function pair(t) {
  const root = temporary(t),
    source = join(root, 'product source'),
    docs = join(root, 'editorial docs');
  const revision = product(source);
  repository(docs, 'pos-docs');
  return { root, source, docs, revision };
}
function importArgs(source, revision, mode = '--write') {
  return ['--source', source, '--revision', revision, mode];
}
function snapshot(root) {
  const result = {};
  const visit = (path = '') => {
    for (const entry of readdirSync(join(root, path), { withFileTypes: true })) {
      if (!path && entry.name === '.git') continue;
      const relative = path ? `${path}/${entry.name}` : entry.name;
      if (entry.isDirectory()) visit(relative);
      else result[relative] = readFileSync(join(root, relative)).toString('base64');
    }
  };
  visit();
  return result;
}

test('default check detects mirror drift and write repairs only the mirror', (t) => {
  const root = temporary(t);
  product(root);
  assert.deepEqual(sync({ cwd: root, args: [] }), {
    repository: 'pos-platform',
    mode: 'check',
    imported: false,
  });
  const source = readFileSync(join(root, `${canonical}/SKILL.md`));
  put(root, `${mirror}/SKILL.md`, 'drift\n');
  assert.throws(() => sync({ cwd: root, args: [] }), /mirror drift/);
  sync({ cwd: root, args: ['--write'] });
  assert.deepEqual(readFileSync(join(root, `${mirror}/SKILL.md`)), source);
});

test('invalid canonical frontmatter cannot be legitimized by writing an identical mirror', (t) => {
  const root = temporary(t);
  product(root);
  const previousMirror = readFileSync(join(root, `${mirror}/SKILL.md`));
  for (const content of [
    '# No frontmatter\n',
    '---\nname: another-skill\ndescription: Valid text.\n---\n',
    '---\nname: pos-delivery\ndescription: \n---\n',
    '---\nname: pos-delivery\ndescription: null\n---\n',
    '---\nname: pos-delivery\nname: duplicate\ndescription: Valid text.\n---\n',
    '---\nname: pos-delivery\ndescription: Valid text.\nmetadata: [unfinished\n---\n',
    '---\nname: pos-delivery\ndescription: >\n  Multi-line text.\n---\n',
  ]) {
    put(root, `${canonical}/SKILL.md`, content);
    assert.throws(() => sync({ cwd: root, args: ['--write'] }), /Skill|skill/);
    assert.deepEqual(readFileSync(join(root, `${mirror}/SKILL.md`)), previousMirror);
  }
});

test('pinned import copies exact Git bytes and tools; offline check survives removal of source checkout', (t) => {
  const { root, source, docs, revision } = pair(t);
  sync({ cwd: docs, args: importArgs(source, revision) });
  const lock = JSON.parse(readFileSync(join(docs, 'tools/agent-skills/source-lock.json')));
  assert.equal(lock.revision, revision);
  assert.equal(lock.repository, SOURCE_REPOSITORY);
  assert.deepEqual(Object.keys(lock.files).sort(), SOURCE_FILES);
  for (const path of SOURCE_FILES)
    assert.deepEqual(readFileSync(join(docs, path)), readFileSync(join(source, path)));
  // Make the supplied path unavailable without relying on a neighboring checkout during verification.
  assert.equal(dirname(source), root);
  rmSync(source, { recursive: true, force: true });
  const output = execFileSync(process.execPath, ['tools/agent-skills/sync.mjs'], {
    cwd: docs,
    encoding: 'utf8',
  });
  assert.match(output, /check passed \(pos-docs\)/);
});

test('offline documentation check rejects edited source, tool and lock inventory', (t) => {
  const { source, docs, revision } = pair(t);
  sync({ cwd: docs, args: importArgs(source, revision) });
  for (const path of [`${canonical}/SKILL.md`, 'tools/agent-skills/README.md']) {
    const original = readFileSync(join(docs, path));
    put(docs, path, `${original.toString('utf8')}\nEdited locally.\n`);
    assert.throws(() => sync({ cwd: docs, args: ['--write'] }), /Pinned source drift/);
    put(docs, path, original);
  }
  const path = 'tools/agent-skills/source-lock.json';
  const lock = JSON.parse(readFileSync(join(docs, path)));
  lock.files['unexpected/path'] = 'a'.repeat(64);
  put(docs, path, `${JSON.stringify(lock)}\n`);
  assert.throws(() => sync({ cwd: docs, args: [] }), /Invalid source lock/);
});

test('import reads pinned tool files as data without executing source scripts or Git fsmonitor hooks', (t) => {
  const { source, docs } = pair(t);
  put(
    source,
    'tools/agent-skills/sync.mjs',
    'throw new Error("Source code must not be executed during import");\n',
  );
  const revision = commit(source);
  // A repository-local hook configuration is not trusted executable input.
  git(source, 'config', 'core.fsmonitor', 'this-fixture-command-must-never-run');
  sync({ cwd: docs, args: importArgs(source, revision) });
  assert.equal(
    readFileSync(join(docs, 'tools/agent-skills/sync.mjs'), 'utf8'),
    'throw new Error("Source code must not be executed during import");\n',
  );
});

test('invalid source identity, dirty checkout and mismatched pin leave destination unchanged', (t) => {
  const { source, docs, revision } = pair(t);
  const before = snapshot(docs);
  put(source, 'untracked.txt', 'pending\n');
  assert.throws(() => sync({ cwd: docs, args: importArgs(source, revision) }), /must be clean/);
  assert.deepEqual(snapshot(docs), before);
  commit(source);
  assert.throws(() => sync({ cwd: docs, args: importArgs(source, revision) }), /HEAD must match/);
  assert.deepEqual(snapshot(docs), before);
  const current = git(source, 'rev-parse', 'HEAD');
  git(source, 'remote', 'set-url', 'origin', 'https://github.com/unrelated/pos-platform.git');
  assert.throws(() => sync({ cwd: docs, args: importArgs(source, current) }), /Source origin/);
  assert.deepEqual(snapshot(docs), before);
});

test('malformed or incomplete options are rejected before any write', (t) => {
  const { source, docs, revision } = pair(t);
  const before = snapshot(docs);
  for (const args of [
    ['--write', '--check'],
    ['--source', source, '--write'],
    importArgs(source, 'main'),
    importArgs(source, revision.slice(0, 7)),
    ['--revision', revision, '--write'],
    ['--unexpected'],
    importArgs(source, revision, '--check'),
  ]) {
    assert.throws(() => sync({ cwd: docs, args }));
    assert.deepEqual(snapshot(docs), before);
  }
  assert.throws(
    () => sync({ cwd: source, args: importArgs(source, revision) }),
    /only available in pos-docs/,
  );
});

test('missing and extra source files are refused even when committed', (t) => {
  const { source, docs } = pair(t);
  const before = snapshot(docs);
  put(source, `${canonical}/extra.md`, 'unexpected\n');
  let revision = commit(source);
  assert.throws(() => sync({ cwd: docs, args: importArgs(source, revision) }), /Unexpected managed entry/);
  assert.deepEqual(snapshot(docs), before);
  rmSync(join(source, `${canonical}/extra.md`));
  rmSync(join(source, `${canonical}/agents/openai.yaml`));
  revision = commit(source);
  assert.throws(() => sync({ cwd: docs, args: importArgs(source, revision) }), /Missing managed file/);
  assert.deepEqual(snapshot(docs), before);
});

test('extra files or unsafe target directory fail preflight before replacing any file', (t) => {
  const { source, docs, revision } = pair(t);
  put(docs, `${mirror}/extra.md`, 'must not delete this\n');
  const before = snapshot(docs);
  assert.throws(() => sync({ cwd: docs, args: importArgs(source, revision) }), /Unexpected managed entry/);
  assert.deepEqual(snapshot(docs), before);
  rmSync(join(docs, `${mirror}/extra.md`));
  mkdirSync(join(docs, `${mirror}/agents/openai.yaml`), { recursive: true });
  assert.throws(() => sync({ cwd: docs, args: importArgs(source, revision) }), /Unexpected managed entry/);
  assert.equal(existsSync(join(docs, '.agents')), false);
});

test('directory symlinks or Windows junctions are rejected without changing their external target', (t) => {
  const { root, source, docs, revision } = pair(t);
  const outside = join(root, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, join(docs, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => sync({ cwd: docs, args: importArgs(source, revision) }), /Symlinks and junctions/);
  assert.deepEqual(readdirSync(outside), []);
});

test('Git symlink blobs cannot be imported even on checkouts with core.symlinks disabled', (t) => {
  const { source, docs } = pair(t);
  git(source, 'config', 'core.symlinks', 'false');
  const path = `${canonical}/SKILL.md`;
  put(source, path, 'outside.md');
  const blob = git(source, 'hash-object', '-w', path);
  git(source, 'update-index', '--cacheinfo', `120000,${blob},${path}`);
  git(source, 'commit', '--quiet', '-m', 'Synthetic forbidden link');
  const revision = git(source, 'rev-parse', 'HEAD');
  assert.equal(git(source, 'status', '--porcelain'), '');
  assert.throws(() => sync({ cwd: docs, args: importArgs(source, revision) }), /regular Git blobs/);
});

test('LF-managed skills remain identical in Windows-style clones with spaces and autocrlf enabled', (t) => {
  const { root, source, docs, revision } = pair(t);
  sync({ cwd: docs, args: importArgs(source, revision) });
  if (process.platform === 'win32') {
    sync({ cwd: docs, args: importArgs(source.toUpperCase(), revision, '--check') });
  }
  commit(docs);
  const clone = join(root, 'windows style clone');
  git(
    root,
    'clone',
    '--quiet',
    '--template=',
    '--no-hardlinks',
    '--config',
    'core.autocrlf=true',
    docs,
    clone,
  );
  sync({ cwd: clone, args: [] });
  for (const file of SKILL_FILES) {
    const bytes = readFileSync(join(clone, `${canonical}/${file}`));
    assert.equal(bytes.includes(13), false);
    assert.deepEqual(bytes, readFileSync(join(clone, `${mirror}/${file}`)));
  }
});

test('fixture initialization and commits ignore personal hooks, templates, fsmonitor and signing', (t) => {
  const root = temporary(t);
  const hookDirectory = join(root, 'personal hooks');
  const templateDirectory = join(root, 'personal templates');
  const marker = join(root, 'personal hook executed');
  const shellPath = `'${marker.replaceAll('\\', '/').replaceAll("'", "'\\''")}'`;
  const hook = `#!/bin/sh\nprintf 'invoked' > ${shellPath}\nexit 97\n`;
  for (const name of ['pre-commit', 'post-checkout', 'fsmonitor']) {
    put(hookDirectory, name, hook);
    chmodSync(join(hookDirectory, name), 0o755);
  }
  put(templateDirectory, 'template-canary', 'must not be copied\n');
  put(templateDirectory, 'hooks/pre-commit', hook);
  chmodSync(join(templateDirectory, 'hooks/pre-commit'), 0o755);
  const config = join(root, 'synthetic-global.gitconfig');
  const quote = (path) => `"${path.replaceAll('\\', '/').replaceAll('"', '\\"')}"`;
  writeFileSync(
    config,
    `[core]\n hooksPath = ${quote(hookDirectory)}\n fsmonitor = ${quote(join(hookDirectory, 'fsmonitor'))}\n[init]\n templateDir = ${quote(templateDirectory)}\n[commit]\n gpgsign = true\n`,
  );
  const previousConfig = process.env.GIT_CONFIG_GLOBAL;
  const previousTemplate = process.env.GIT_TEMPLATE_DIR;
  try {
    process.env.GIT_CONFIG_GLOBAL = config;
    process.env.GIT_TEMPLATE_DIR = templateDirectory;
    const source = join(root, 'isolated source');
    product(source);
    assert.equal(existsSync(join(source, '.git/template-canary')), false);
    const clone = join(root, 'isolated clone');
    git(root, 'clone', '--quiet', '--template=', source, clone);
    assert.equal(existsSync(join(clone, '.git/template-canary')), false);
    assert.equal(existsSync(marker), false);
  } finally {
    if (previousConfig === undefined) delete process.env.GIT_CONFIG_GLOBAL;
    else process.env.GIT_CONFIG_GLOBAL = previousConfig;
    if (previousTemplate === undefined) delete process.env.GIT_TEMPLATE_DIR;
    else process.env.GIT_TEMPLATE_DIR = previousTemplate;
  }
});
