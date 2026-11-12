import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { isolateFromInvokingRepository } from './git-isolation.mjs';

// Esta prueba también crea repositorios: se aísla igual que las que vigila.
isolateFromInvokingRepository();

const root = fileURLToPath(new URL('../', import.meta.url));

const git = (cwd, ...args) =>
  execFileSync('git', ['-c', 'commit.gpgSign=false', '-c', 'core.hooksPath=.disabled-hooks', ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  }).trim();

function testFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules') files.push(...testFiles(target));
    else if (entry.isFile() && entry.name.endsWith('.test.mjs')) files.push(target);
  }
  return files;
}

test('quita las variables locales del repositorio y conserva el resto del entorno', () => {
  const env = { GIT_DIR: '/otro/.git', GIT_WORK_TREE: '/otro', GIT_INDEX_FILE: '/otro/.git/index', PATH: 'ruta', HOME: 'casa' };
  const removed = isolateFromInvokingRepository(env);
  assert.ok(removed.includes('GIT_DIR') && removed.includes('GIT_WORK_TREE') && removed.includes('GIT_INDEX_FILE'));
  assert.deepEqual(env, { PATH: 'ruta', HOME: 'casa' });
});

test('toda prueba que crea repositorios con git init se aísla del repositorio que la lanza', () => {
  const unisolated = [];
  for (const directory of ['tools', 'portal']) {
    for (const file of testFiles(path.join(root, directory))) {
      const source = fs.readFileSync(file, 'utf8');
      if (!/['"]init['"]/.test(source)) continue;
      // Las copias distribuidas desde el producto se aíslan en línea; las propias, con el helper.
      if (!source.includes('isolateFromInvokingRepository()') && !source.includes("'--local-env-vars'")) {
        unisolated.push(path.relative(root, file).replaceAll('\\', '/'));
      }
    }
  }
  assert.deepEqual(unisolated, [], 'Llamar a isolateFromInvokingRepository() antes de lanzar git (pos-platform#313).');
});

test('una suite lanzada con el GIT_DIR de un worktree enlazado deja intacto ese repositorio', () => {
  // Es el entorno que Git exporta a un hook o a `git rebase --exec` en un worktree
  // enlazado: GIT_DIR absoluto hacia `.git/worktrees/<nombre>`.
  const directory = fs.mkdtempSync(path.join(tmpdir(), 'pos-docs-git-isolation-'));
  try {
    const outer = path.join(directory, 'outer');
    fs.mkdirSync(outer);
    git(outer, 'init', '--quiet', '--initial-branch=main');
    git(outer, '-c', 'user.name=Outer', '-c', 'user.email=outer@example.test', 'commit', '--quiet', '--allow-empty', '-m', 'outer');
    const linked = path.join(directory, 'linked');
    git(outer, 'worktree', 'add', '--quiet', '-b', 'linked', linked);
    const gitDir = git(linked, 'rev-parse', '--absolute-git-dir');
    const snapshot = () => ({
      refs: git(outer, 'for-each-ref', '--format=%(refname) %(objectname)'),
      head: git(linked, 'rev-parse', 'HEAD'),
      branch: git(linked, 'branch', '--show-current'),
      config: git(outer, 'config', '--local', '--list'),
    });
    const before = snapshot();

    // El runner marca a sus hijos con NODE_TEST_CONTEXT. Heredada, la suite anidada
    // correría como hija de este runner y no como una ejecución independiente.
    const env = { ...process.env, GIT_DIR: gitDir };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--test', 'tools/sync-project-progress.test.mjs'], {
      cwd: root,
      env,
      encoding: 'utf8',
      windowsHide: true,
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /^# pass [1-9]/m, 'la suite anidada debe ejecutar sus pruebas');
    assert.deepEqual(snapshot(), before);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
