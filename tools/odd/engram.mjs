import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, realpathSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const lock = JSON.parse(readFileSync(new URL('./toolchain.lock.json', import.meta.url), 'utf8'));

export function configuration({
  platform = process.platform,
  env = process.env,
  home = homedir(),
  repository = root,
} = {}) {
  const dataRoot = platform === 'win32' ? env.LOCALAPPDATA : path.join(home, '.local/share');
  if (!dataRoot || !path.isAbsolute(dataRoot))
    throw new Error('An absolute local application-data directory is required.');
  const executable =
    env.POS_ENGRAM_EXECUTABLE ||
    path.join(
      dataRoot,
      'POS-Platform/odd-toolchain/engram',
      lock.engram.version,
      platform === 'win32' ? 'engram.exe' : 'engram',
    );
  const data = env.POS_ENGRAM_DATA_DIR || path.join(dataRoot, 'POS-Platform/engram');
  for (const value of [executable, data])
    if (!path.isAbsolute(value)) throw new Error('Engram paths must be absolute.');
  const relation = path.relative(path.resolve(repository), path.resolve(data));
  if (!relation || (!relation.startsWith(`..${path.sep}`) && relation !== '..' && !path.isAbsolute(relation)))
    throw new Error('Engram memory must be outside the repository.');
  return { executable, data, repository, version: lock.engram.version };
}

export function run() {
  const config = configuration();
  let version;
  try {
    version = execFileSync(config.executable, ['version'], {
      encoding: 'utf8',
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'Pinned Engram is unavailable. Follow tools/odd/README.md; no automatic download or global setup was attempted.',
    );
  }
  if (!new RegExp(`(?:^|\\s)v?${config.version.replaceAll('.', '\\.')}($|\\s)`).test(version.trim()))
    throw new Error('Engram version differs from the reviewed toolchain lock.');
  mkdirSync(config.data, { recursive: true });
  configuration({ env: { ...process.env, POS_ENGRAM_DATA_DIR: realpathSync(config.data) } });
  const child = spawn(config.executable, ['mcp', '--tools=agent'], {
    cwd: config.repository,
    env: { ...process.env, ENGRAM_DATA_DIR: config.data },
    stdio: 'inherit',
    windowsHide: true,
  });
  child.on('error', () => {
    process.stderr.write('Engram could not start.\n');
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    run();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
