import { createHash, randomUUID } from 'node:crypto';
import {
  copyFileSync,
  closeSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const vendor = 'tools/odd/upstream';
const generated = [
  ['.codex/AGENTS.md', 'codex.md'],
  ['.claude/CLAUDE.md', 'claude-code.md'],
  ['engram.md', 'engram.md'],
];
const sourceAssets = [
  ['LICENSE', 'LICENSE'],
  ['internal/assets/skills/work-unit-commits/SKILL.md', 'skills/work-unit-commits/SKILL.md'],
  ['internal/assets/skills/chained-pr/SKILL.md', 'skills/chained-pr/SKILL.md'],
  [
    'internal/assets/skills/chained-pr/references/chaining-details.md',
    'skills/chained-pr/references/chaining-details.md',
  ],
  ['internal/assets/skills/_shared/skill-resolver.md', 'skills/_shared/skill-resolver.md'],
];
const rendererInputs = [
  'internal/assets',
  'internal/components/agentguidance',
  'internal/components/filemerge',
  'internal/components/reviewassets',
  'internal/model',
];

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function safeRelative(value) {
  if (
    typeof value !== 'string' ||
    !value ||
    /[\\\x00-\x1f\x7f:]/u.test(value) ||
    path.posix.isAbsolute(value) ||
    value.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error(`Unsafe relative path: ${value}`);
  return value;
}
function files(directory) {
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const location = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symbolic link: ${location}`);
    if (entry.isDirectory()) result.push(...files(location));
    else if (entry.isFile()) result.push(location);
    else throw new Error(`Unexpected file type: ${location}`);
  }
  return result;
}
export function moduleHash(directory, moduleName, version) {
  const names = files(directory)
    .map((file) => path.relative(directory, file).split(path.sep).join('/'))
    .sort();
  const hash = createHash('sha256');
  for (const name of names)
    hash.update(`${sha256(readFileSync(path.join(directory, name)))}  ${moduleName}@v${version}/${name}\n`);
  return `h1:${hash.digest('base64')}`;
}
function fileInfo(target) {
  try {
    return lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
function outputPath(repository, relative) {
  const base = path.resolve(repository);
  const baseInfo = fileInfo(base);
  if (!baseInfo?.isDirectory() || baseInfo.isSymbolicLink())
    throw new Error('Output repository must be a real directory');
  const physical = realpathSync(base);
  const comparable = (value) => (process.platform === 'win32' ? value.toLowerCase() : value);
  if (comparable(base) !== comparable(physical))
    throw new Error('Output repository must not traverse symbolic links or junctions');
  const parts = safeRelative(relative).split('/');
  let current = base;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    // lstat detects dangling links too; existsSync follows them and would miss them.
    const info = fileInfo(current);
    if (info?.isSymbolicLink()) throw new Error(`Unexpected symbolic link: ${current}`);
    if (info && (index === parts.length - 1 ? !info.isFile() : !info.isDirectory()))
      throw new Error(`Unexpected output file type: ${current}`);
  }
  return current;
}
function write(relative, bytes, repository = root) {
  const destination = outputPath(repository, relative);
  mkdirSync(path.dirname(destination), { recursive: true });
  outputPath(repository, relative);
  const temporary = path.join(path.dirname(destination), `.odd-upstream-${randomUUID()}.tmp`);
  let handle;
  try {
    handle = openSync(temporary, 'wx', 0o644);
    writeFileSync(handle, bytes);
    closeSync(handle);
    handle = undefined;
    // Replacing the directory entry leaves any external hardlink's bytes untouched.
    renameSync(temporary, destination);
  } finally {
    if (handle !== undefined) closeSync(handle);
    if (fileInfo(temporary)) unlinkSync(temporary);
  }
}
export function validateManifest(manifest) {
  if (
    manifest.schemaVersion !== 1 ||
    manifest.upstream?.version !== '4.3.1' ||
    !Array.isArray(manifest.files) ||
    !manifest.files.length
  )
    throw new Error('Invalid upstream manifest');
  const names = new Set();
  for (const entry of manifest.files) {
    safeRelative(entry.path);
    if (names.has(entry.path) || !/^[a-f0-9]{64}$/u.test(entry.sha256))
      throw new Error('Duplicate file or invalid hash');
    names.add(entry.path);
    if (entry.source) safeRelative(entry.source);
    for (const target of entry.targets ?? []) {
      safeRelative(target);
      if (
        !/^\.(agents|claude)\/skills\/(work-unit-commits|chained-pr)\//u.test(target) &&
        !/^\.(agents|claude)\/skills\/_shared\/skill-resolver\.md$/u.test(target)
      )
        throw new Error('Unowned distribution target');
    }
  }
}
export function check(repository = root, { distribute = false } = {}) {
  const manifest = JSON.parse(readFileSync(path.join(repository, vendor, 'manifest.json'), 'utf8'));
  validateManifest(manifest);
  const lock = JSON.parse(readFileSync(path.join(repository, 'tools/odd/toolchain.lock.json'), 'utf8'));
  if (JSON.stringify(manifest.upstream) !== JSON.stringify(lock.gentleAi))
    throw new Error('Manifest and toolchain lock differ');
  if (manifest.rendererSha256 !== sha256(readFileSync(path.join(repository, 'tools/odd/upstream-render.go'))))
    throw new Error('Renderer changed; regenerate upstream assets');
  if (
    manifest.profileSha256 !== sha256(readFileSync(path.join(repository, 'tools/odd/runtime-profile.json')))
  )
    throw new Error('Runtime profile changed; regenerate upstream assets');
  const expected = new Set(['manifest.json', ...manifest.files.map((entry) => entry.path)]);
  for (const file of files(path.join(repository, vendor))) {
    const name = path.relative(path.join(repository, vendor), file).split(path.sep).join('/');
    if (!expected.has(name)) throw new Error(`Undeclared upstream file: ${name}`);
  }
  for (const entry of manifest.files) {
    const bytes = readFileSync(path.join(repository, vendor, entry.path));
    if (sha256(bytes) !== entry.sha256) throw new Error(`Upstream asset changed: ${entry.path}`);
    for (const target of entry.targets ?? []) {
      if (distribute) write(target, bytes, repository);
      if (
        !existsSync(path.join(repository, target)) ||
        !bytes.equals(readFileSync(path.join(repository, target)))
      )
        throw new Error(`Distribution differs: ${target}`);
    }
  }
  const registry = registryContent(repository);
  if (distribute) write('.atl/skill-registry.md', registry, repository);
  if (
    !existsSync(path.join(repository, '.atl/skill-registry.md')) ||
    readFileSync(path.join(repository, '.atl/skill-registry.md'), 'utf8') !== registry
  )
    throw new Error('Skill registry differs; run --write');
  return manifest.files.length;
}
function registryContent(repository) {
  const lines = [
    '# POS skill registry',
    '',
    '<!-- Generated by tools/odd/upstream.mjs; this is an index, not another policy. -->',
    '',
    'Paths are relative to the repository root. Resolve them to absolute paths before delegating. Read the exact SKILL.md; this index never substitutes its instructions.',
    '',
    '| Skill | Trigger | Scope | Codex | Claude Code |',
    '|---|---|---|---|---|',
  ];
  for (const name of ['pos-delivery', 'work-unit-commits', 'chained-pr']) {
    const source = `.agents/skills/${name}/SKILL.md`;
    const content = readFileSync(path.join(repository, source), 'utf8');
    const description = /^description:\s*(.+)$/mu
      .exec(content)?.[1]
      ?.replace(/^"|"$/gu, '')
      .replaceAll('|', '\\|');
    if (!description) throw new Error(`Missing skill description: ${name}`);
    lines.push(
      `| ${name} | ${description} | project | \`${source}\` | \`.claude/skills/${name}/SKILL.md\` |`,
    );
  }
  lines.push(
    '',
    'Shared resolution protocol: `.agents/skills/_shared/skill-resolver.md` (Codex) or `.claude/skills/_shared/skill-resolver.md` (Claude Code). These are repository-local copies of the upstream shared protocol.',
    '',
  );
  return lines.join('\n');
}
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, ...options });
  if (result.error || result.status !== 0)
    throw new Error(`${command} failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  return result.stdout;
}
export function goEnvironment(toolsRoot, version, inherited = process.env) {
  return {
    ...inherited,
    GOOS: 'windows',
    GOARCH: 'amd64',
    GOROOT: path.join(toolsRoot, `go/${version}/go`),
    GOENV: 'off',
    GOWORK: 'off',
    GOTOOLCHAIN: 'local',
    CGO_ENABLED: '0',
    GOPROXY: 'https://proxy.golang.org',
    GOSUMDB: 'sum.golang.org',
    GOPRIVATE: '',
    GONOSUMDB: '',
    GONOPROXY: '',
    GOFLAGS: '',
    GOCACHE: path.join(toolsRoot, 'cache/build'),
    GOMODCACHE: path.join(toolsRoot, 'cache/modules'),
    GOPATH: path.join(toolsRoot, 'cache/gopath'),
  };
}
export function regenerate() {
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA)
    throw new Error('Rendering requires the pinned Windows toolchain');
  const lock = JSON.parse(readFileSync(path.join(root, 'tools/odd/toolchain.lock.json'), 'utf8'));
  run('pwsh', ['-NoProfile', '-File', path.join(root, 'tools/odd/bootstrap.ps1'), '-Mode', 'Verify']);
  const toolsRoot = realpathSync(path.join(process.env.LOCALAPPDATA, 'POS-Platform/odd-toolchain'));
  const source = path.join(toolsRoot, 'cache/modules', `${lock.gentleAi.module}@v${lock.gentleAi.version}`);
  if (moduleHash(source, lock.gentleAi.module, lock.gentleAi.version) !== lock.gentleAi.moduleSum)
    throw new Error('Extracted upstream source does not match the pinned Go checksum');
  const fixture = mkdtempSync(path.join(toolsRoot, 'render-upstream-'));
  const moduleCopy = path.join(fixture, 'module');
  cpSync(source, moduleCopy, { recursive: true });
  const entrypoint = path.join(moduleCopy, 'cmd/pos-odd-export/main.go');
  mkdirSync(path.dirname(entrypoint), { recursive: true });
  copyFileSync(path.join(root, 'tools/odd/upstream-render.go'), entrypoint);
  const output = path.join(fixture, 'output');
  mkdirSync(output);
  const env = goEnvironment(toolsRoot, lock.go.version);
  run(
    path.join(toolsRoot, `go/${lock.go.version}/go/bin/go.exe`),
    ['run', './cmd/pos-odd-export', output, path.join(root, 'tools/odd/runtime-profile.json')],
    { cwd: moduleCopy, env, timeout: 180_000 },
  );
  const entries = [];
  for (const [from, to] of generated) {
    const bytes = readFileSync(path.join(output, from));
    write(`${vendor}/${to}`, bytes);
    entries.push({ path: to, origin: 'upstream-renderer', sha256: sha256(bytes) });
  }
  for (const [from, to] of sourceAssets) {
    const bytes = readFileSync(path.join(source, from));
    write(`${vendor}/${to}`, bytes);
    const targets = to.startsWith('skills/') ? ['.agents/', '.claude/'].map((prefix) => prefix + to) : [];
    entries.push({
      path: to,
      origin: 'upstream-file',
      source: from,
      sha256: sha256(bytes),
      ...(targets.length ? { targets } : {}),
    });
  }
  const inputHashes = {};
  for (const directory of rendererInputs)
    for (const file of files(path.join(source, directory)))
      inputHashes[path.relative(source, file).split(path.sep).join('/')] = sha256(readFileSync(file));
  const manifest = {
    schemaVersion: 1,
    upstream: lock.gentleAi,
    rendererSha256: sha256(readFileSync(path.join(root, 'tools/odd/upstream-render.go'))),
    profileSha256: sha256(readFileSync(path.join(root, 'tools/odd/runtime-profile.json'))),
    rendererInputs: Object.fromEntries(
      Object.entries(inputHashes).sort(([a], [b]) => a.localeCompare(b, 'en')),
    ),
    files: entries,
  };
  write(`${vendor}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  check(root, { distribute: true });
  process.stdout.write(`Rendered ${entries.length} upstream files; fixture retained at ${fixture}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && !['--check', '--write', '--render'].includes(args[0]))) {
    process.stderr.write('Usage: node tools/odd/upstream.mjs [--check | --write | --render]\n');
    process.exitCode = 2;
  } else {
    const command = args[0] ?? '--check';
    if (command === '--render') regenerate();
    else
      process.stdout.write(
        `Verified ${check(root, { distribute: command === '--write' })} pinned upstream files.\n`,
      );
  }
}
