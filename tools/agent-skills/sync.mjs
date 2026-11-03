import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SOURCE_REPOSITORY = 'https://github.com/developer-implementos/pos-platform';
export const SKILL_FILES = ['SKILL.md', 'agents/openai.yaml'];
export const TOOL_FILES = ['sync.mjs', 'sync.test.mjs', 'README.md'];
const canonical = '.agents/skills/pos-delivery';
const mirror = '.claude/skills/pos-delivery';
const tooling = 'tools/agent-skills';
const lockPath = `${tooling}/source-lock.json`;
export const SOURCE_FILES = [
  ...SKILL_FILES.map((file) => `${canonical}/${file}`),
  ...TOOL_FILES.map((file) => `${tooling}/${file}`),
].sort();
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (message) => {
  throw new Error(message);
};

function git(root, args, encoding = 'utf8') {
  try {
    return execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', root, ...args], {
      encoding,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 4 * 1024 * 1024,
    });
  } catch {
    fail('Git could not read the requested repository or immutable revision.');
  }
}
function stat(path) {
  try {
    return lstatSync(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
/** All relative names are internal constants; inspect every existing parent, including junctions. */
function safePath(root, relative) {
  const rootStat = stat(root);
  if (!rootStat?.isDirectory() || rootStat.isSymbolicLink())
    fail('Repository root must be a real directory.');
  let path = root;
  const parts = relative.split('/');
  for (const [index, part] of parts.entries()) {
    if (!part || part === '.' || part === '..') fail('Invalid managed path.');
    path = join(path, part);
    const entry = stat(path);
    if (entry?.isSymbolicLink()) fail(`Symlinks and junctions are not allowed: ${relative}`);
    if (entry && index < parts.length - 1 && !entry.isDirectory()) fail(`Expected directory: ${relative}`);
  }
  return path;
}
function bytes(root, relative) {
  const path = safePath(root, relative);
  if (!stat(path)?.isFile()) fail(`Missing regular file: ${relative}`);
  const result = readFileSync(path);
  if (result.includes(13)) fail(`Managed text must use LF: ${relative}`);
  return result;
}
/** The shared skill uses two portable, single-line YAML string fields. This is not a general YAML parser. */
function validateSkill(files) {
  const text = files.get(`${canonical}/SKILL.md`).toString('utf8');
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(text);
  if (!match) fail('Skill must start with YAML frontmatter.');
  const fields = match[1].split('\n');
  if (fields.length !== 2 || fields.some((line) => !/^(?:name|description):/.test(line)))
    fail('Skill frontmatter supports only name and description on separate single lines.');
  const scalar = (field) => {
    const values = fields.filter((line) => line.startsWith(`${field}:`));
    if (values.length !== 1) fail(`Skill requires exactly one ${field} field.`);
    const value = values[0].slice(field.length + 1).trim();
    if (!value || /^(?:[>|#[\]{}&*!]|null$|~$|true$|false$|\d+(?:\.\d+)?$)/i.test(value))
      fail(`Skill ${field} must be a nonempty single-line string.`);
    if (value.startsWith('"')) {
      let decoded;
      try {
        decoded = JSON.parse(value);
      } catch {
        fail(`Invalid quoted skill ${field}.`);
      }
      if (typeof decoded !== 'string' || !decoded.trim()) fail(`Invalid skill ${field}.`);
      return decoded;
    }
    if (value.startsWith("'")) {
      if (!/^'(?:[^']|'')+'$/.test(value)) fail(`Invalid quoted skill ${field}.`);
      return value.slice(1, -1).replaceAll("''", "'");
    }
    if (/:\s|\s#|[\t\r]/.test(value)) fail(`Quote the skill ${field} string.`);
    return value;
  };
  if (scalar('name') !== 'pos-delivery') fail('Skill name must be pos-delivery.');
  if (!scalar('description').trim()) fail('Skill description must not be empty.');
}
function inventory(root, directory, expected, required) {
  const path = safePath(root, directory);
  const present = stat(path);
  if (!present) {
    if (required) fail(`Missing managed directory: ${directory}`);
    return;
  }
  if (!present.isDirectory()) fail(`Expected directory: ${directory}`);
  const allowed = new Set(expected);
  const folders = new Set(
    expected.flatMap((file) => {
      const parts = file.split('/');
      return parts.slice(0, -1).map((_, index) => parts.slice(0, index + 1).join('/'));
    }),
  );
  const found = new Set();
  const walk = (prefix = '') => {
    for (const name of readdirSync(join(path, prefix))) {
      const relative = prefix ? `${prefix}/${name}` : name;
      const entry = stat(safePath(root, `${directory}/${relative}`));
      if (entry?.isDirectory() && folders.has(relative)) walk(relative);
      else if (entry?.isFile() && allowed.has(relative)) found.add(relative);
      else fail(`Unexpected managed entry: ${directory}/${relative}`);
    }
  };
  walk();
  if (required)
    for (const file of expected) if (!found.has(file)) fail(`Missing managed file: ${directory}/${file}`);
}
function role(root) {
  const path = safePath(root, 'package.json');
  if (!stat(path)?.isFile()) fail('A repository package.json is required.');
  let name;
  try {
    name = JSON.parse(readFileSync(path, 'utf8')).name;
  } catch {
    fail('Invalid repository package.json.');
  }
  if (!['pos-platform', 'pos-docs'].includes(name)) fail('Unsupported repository package.name.');
  return name;
}
function parseArgs(args) {
  let mode = 'check',
    explicitMode = false,
    source,
    revision;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--check' || arg === '--write') {
      if (explicitMode) fail('Choose exactly one mode: --check or --write.');
      mode = arg.slice(2);
      explicitMode = true;
    } else if (arg === '--source' || arg === '--revision') {
      const value = args[++index];
      if (!value || value.startsWith('--')) fail(`Missing value for ${arg}.`);
      if (arg === '--source') {
        if (source !== undefined) fail('Duplicate --source.');
        source = value;
      } else {
        if (revision !== undefined) fail('Duplicate --revision.');
        revision = value;
      }
    } else fail(`Unknown option: ${arg}`);
  }
  if (Boolean(source) !== Boolean(revision)) fail('--source and --revision must be supplied together.');
  if (revision && !/^[0-9a-f]{40}$/.test(revision))
    fail('--revision must be a complete lowercase commit SHA.');
  return { mode, source, revision };
}
function readLock(root) {
  let lock;
  try {
    lock = JSON.parse(bytes(root, lockPath));
  } catch {
    fail('Missing or invalid source lock. Import a pinned product revision.');
  }
  if (
    !lock ||
    Object.keys(lock).sort().join(',') !== 'files,repository,revision,schemaVersion' ||
    lock.schemaVersion !== 1 ||
    lock.repository !== SOURCE_REPOSITORY ||
    !/^[0-9a-f]{40}$/.test(lock.revision) ||
    !lock.files ||
    typeof lock.files !== 'object' ||
    Object.keys(lock.files).sort().join('\n') !== SOURCE_FILES.join('\n') ||
    Object.values(lock.files).some((hash) => typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash))
  ) {
    fail('Invalid source lock provenance or file inventory.');
  }
  return lock;
}
function localFiles(root, repoRole) {
  inventory(root, canonical, SKILL_FILES, true);
  inventory(root, tooling, repoRole === 'pos-docs' ? [...TOOL_FILES, 'source-lock.json'] : TOOL_FILES, true);
  const files = new Map(SOURCE_FILES.map((path) => [path, bytes(root, path)]));
  validateSkill(files);
  if (repoRole === 'pos-docs') {
    const lock = readLock(root);
    for (const [path, content] of files) {
      if (lock.files[path] !== sha256(content)) fail(`Pinned source drift: ${path}`);
    }
  }
  return files;
}
function pinnedFiles(source, revision) {
  const supplied = resolve(source);
  safePath(supplied, 'package.json');
  const root = realpathSync(supplied);
  const topLevel = realpathSync(git(root, ['rev-parse', '--show-toplevel']).trim());
  if (relative(topLevel, root) !== '') {
    fail('--source must identify the repository root.');
  }
  if (role(root) !== 'pos-platform') fail('Import source must be pos-platform.');
  const origin = git(root, ['remote', 'get-url', 'origin']).trim();
  if (
    !/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)developer-implementos\/pos-platform(?:\.git)?\/?$/.test(
      origin,
    )
  ) {
    fail('Source origin must identify developer-implementos/pos-platform.');
  }
  const clean = () => {
    if (git(root, ['status', '--porcelain=v1', '--untracked-files=all']).trim())
      fail('Source checkout must be clean.');
    if (
      git(root, ['rev-parse', 'HEAD']).trim() !== revision ||
      git(root, ['rev-parse', `${revision}^{commit}`]).trim() !== revision
    )
      fail('Source HEAD must match the pinned commit.');
  };
  clean();
  inventory(root, canonical, SKILL_FILES, true);
  inventory(root, tooling, TOOL_FILES, true);
  const tree = git(root, ['ls-tree', '-r', '-z', revision, '--', canonical, tooling]);
  const entries = tree
    .split('\0')
    .filter(Boolean)
    .map((entry) => {
      const match = /^(\d+) blob [a-f0-9]+\t(.+)$/.exec(entry);
      if (!match || !['100644', '100755'].includes(match[1])) fail('Only regular Git blobs may be imported.');
      return match[2];
    })
    .sort();
  if (entries.join('\n') !== SOURCE_FILES.join('\n'))
    fail('Pinned source has missing or extra managed files.');
  let product;
  try {
    product = JSON.parse(git(root, ['cat-file', 'blob', `${revision}:package.json`]));
  } catch {
    fail('Pinned package metadata is invalid.');
  }
  if (product.name !== 'pos-platform') fail('Pinned revision does not belong to the product package.');
  const files = new Map(
    SOURCE_FILES.map((path) => {
      const content = git(root, ['cat-file', 'blob', `${revision}:${path}`], null);
      if (content.includes(13)) fail(`Pinned text must use LF: ${path}`);
      return [path, content];
    }),
  );
  validateSkill(files);
  clean();
  return files;
}
function put(root, path, content) {
  const target = safePath(root, path);
  const existing = stat(target);
  if (existing && !existing.isFile()) fail(`Expected regular output file: ${path}`);
  mkdirSync(dirname(target), { recursive: true });
  safePath(root, path);
  writeFileSync(target, content);
}
function checkMirror(root, files) {
  inventory(root, mirror, SKILL_FILES, true);
  for (const file of SKILL_FILES) {
    if (!bytes(root, `${mirror}/${file}`).equals(files.get(`${canonical}/${file}`)))
      fail(`Claude mirror drift: ${file}`);
  }
}

export function sync({ cwd = process.cwd(), args = process.argv.slice(2) } = {}) {
  const options = parseArgs(args);
  const root = resolve(git(cwd, ['rev-parse', '--show-toplevel']).trim());
  const repoRole = role(root);
  if (options.source && repoRole !== 'pos-docs') fail('Pinned import is only available in pos-docs.');
  let files;
  if (options.source) {
    files = pinnedFiles(resolve(cwd, options.source), options.revision);
    inventory(root, canonical, SKILL_FILES, false);
    inventory(root, mirror, SKILL_FILES, false);
    inventory(root, tooling, [...TOOL_FILES, 'source-lock.json'], false);
    // Preflight all outputs before the first write, including files currently missing.
    for (const path of [...SOURCE_FILES, lockPath, ...SKILL_FILES.map((file) => `${mirror}/${file}`)]) {
      const entry = stat(safePath(root, path));
      if (entry && !entry.isFile()) fail(`Expected regular output file: ${path}`);
    }
    const lock = {
      schemaVersion: 1,
      repository: SOURCE_REPOSITORY,
      revision: options.revision,
      files: Object.fromEntries([...files].map(([path, content]) => [path, sha256(content)])),
    };
    if (options.mode === 'write') {
      for (const [path, content] of files) put(root, path, content);
      for (const file of SKILL_FILES) put(root, `${mirror}/${file}`, files.get(`${canonical}/${file}`));
      put(root, lockPath, `${JSON.stringify(lock, null, 2)}\n`);
    } else {
      const actual = readLock(root);
      if (actual.revision !== options.revision) fail('Imported revision differs from the requested pin.');
      localFiles(root, repoRole);
      for (const [path, content] of files)
        if (!bytes(root, path).equals(content)) fail(`Imported source drift: ${path}`);
      checkMirror(root, files);
    }
  } else {
    files = localFiles(root, repoRole);
    inventory(root, mirror, SKILL_FILES, options.mode === 'check');
    if (options.mode === 'write') {
      for (const file of SKILL_FILES) put(root, `${mirror}/${file}`, files.get(`${canonical}/${file}`));
    } else checkMirror(root, files);
  }
  return { repository: repoRole, mode: options.mode, imported: Boolean(options.source) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = sync();
    process.stdout.write(`POS delivery skill ${result.mode} passed (${result.repository}).\n`);
  } catch (error) {
    process.stderr.write(`POS delivery skill: ${error.message}\n`);
    process.exitCode = 1;
  }
}
