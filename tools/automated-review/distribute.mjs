import { readFile, mkdir, lstat, realpath, open, rename, unlink } from 'node:fs/promises';
import { basename, dirname, resolve, join, isAbsolute } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { VERSION, sha256, requireThat } from './core.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const files = [
  '.github/workflows/automated-review.yml',
  ...[
    'core.mjs',
    'runtime.mjs',
    'run.mjs',
    'review.test.mjs',
    'distribute.mjs',
    'README.md',
    'cli/package.json',
    'cli/package-lock.json',
  ].map((path) => `tools/automated-review/${path}`),
];
const manifestPath = 'tools/automated-review/distribution.json';
const canonical = 'developer-implementos/pos-platform';
function repository(directory) {
  const remote = execFileSync('git', ['-C', directory, 'config', '--get', 'remote.origin.url'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
  const match =
    /^(?:https:\/\/github\.com\/|git@github\.com:)(developer-implementos\/(?:pos-platform|pos-docs))(?:\.git)?$/.exec(
      remote,
    );
  requireThat(match, 'unexpected_distribution_repository');
  return match[1];
}
async function hashes(directory) {
  const result = {};
  for (const file of files) {
    await assertNoSymlinks(directory, file);
    const path = join(directory, file);
    requireThat(
      (await lstat(path)).isFile() && !(await lstat(path)).isSymbolicLink(),
      'non_regular_distribution_file',
    );
    result[file] = sha256(await readFile(path));
  }
  return result;
}
async function assertNoSymlinks(directory, relative, create = false) {
  const rootStat = await lstat(directory);
  const normalized = (value) => (process.platform === 'win32' ? value.toLowerCase() : value);
  requireThat(
    rootStat.isDirectory() &&
      !rootStat.isSymbolicLink() &&
      normalized(await realpath(directory)) === normalized(resolve(directory)),
    'unsafe_distribution_root',
  );
  let cursor = directory;
  const parts = relative.split('/');
  for (const [index, part] of parts.entries()) {
    cursor = join(cursor, part);
    try {
      const stat = await lstat(cursor);
      requireThat(
        !stat.isSymbolicLink() && (index === parts.length - 1 ? stat.isFile() : stat.isDirectory()),
        'unsafe_distribution_path',
      );
    } catch (error) {
      if (error.code !== 'ENOENT' || !create) throw error;
      if (index < parts.length - 1) await mkdir(cursor);
    }
  }
}
async function replaceFile(directory, file, bytes) {
  await assertNoSymlinks(directory, file, true);
  const destination = join(directory, file);
  const temporary = join(dirname(destination), `.${basename(destination)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(bytes);
    await handle.close();
    handle = undefined;
    // Replace the directory entry rather than truncating the destination inode:
    // regular files may be hardlinks to files outside this checkout.
    await assertNoSymlinks(directory, file, true);
    await rename(temporary, destination);
  } finally {
    await handle?.close();
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
}
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === '--record') {
  requireThat(repository(root) === canonical, 'canonical_source_required');
  await replaceFile(
    root,
    manifestPath,
    `${JSON.stringify({ version: VERSION, canonicalRepository: canonical, files: await hashes(root) }, null, 2)}\n`,
  );
} else {
  await assertNoSymlinks(root, manifestPath);
  const manifest = JSON.parse(await readFile(join(root, manifestPath), 'utf8'));
  requireThat(
    manifest.version === VERSION &&
      manifest.canonicalRepository === canonical &&
      JSON.stringify(Object.keys(manifest.files)) === JSON.stringify(files),
    'invalid_distribution_manifest',
  );
  requireThat(
    JSON.stringify(await hashes(root)) === JSON.stringify(manifest.files),
    'distribution_hash_mismatch',
  );
  if (args.length === 2 && args[0] === '--write') {
    requireThat(repository(root) === canonical && isAbsolute(args[1]), 'canonical_source_required');
    const target = resolve(args[1]);
    requireThat(
      target !== root && repository(target) === 'developer-implementos/pos-docs',
      'unexpected_distribution_target',
    );
    for (const file of [...files, manifestPath]) {
      await replaceFile(target, file, await readFile(join(root, file)));
    }
    requireThat(
      JSON.stringify(await hashes(target)) === JSON.stringify(manifest.files),
      'distribution_copy_mismatch',
    );
    process.stdout.write('Reviewer distribution copied and verified.\n');
  } else {
    requireThat(args.length === 1 && args[0] === '--check', 'invalid_distribution_arguments');
    process.stdout.write(`Reviewer distribution ${VERSION} verified.\n`);
  }
}
