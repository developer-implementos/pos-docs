import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  readFile,
  writeFile,
  mkdtemp,
  mkdir,
  copyFile,
  link,
  symlink,
  unlink,
  rm,
  realpath,
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  LIMITS,
  CLI_VERSION,
  selectCredential,
  validateEvent,
  validatePull,
  validatePath,
  validatePatch,
  decodeBlob,
  collectCandidate,
  validateVerdict,
  cliArguments,
  safeText,
  redactSensitiveText,
} from './core.mjs';
import {
  apiUrl,
  boundedJson,
  githubApi,
  isolatedEnvironment,
  runProcess,
  renderSummary,
} from './runtime.mjs';

// Git exporta GIT_DIR y otras variables del repositorio a los hooks y a `git rebase --exec`.
// Heredadas, cada `git` de esta prueba, y de lo que prueba, actuaría sobre ese repositorio
// y no sobre sus fixtures (#214, #311). Se quitan las que Git declara locales a un repositorio.
const repositoryVariables = execFileSync('git', ['rev-parse', '--local-env-vars'], { encoding: 'utf8' });
for (const name of repositoryVariables.split(/\r?\n/)) if (name) delete process.env[name];

const directory = dirname(fileURLToPath(import.meta.url));
const repository = 'developer-implementos/pos-platform';
const base = 'a'.repeat(40),
  head = 'b'.repeat(40),
  mergeBase = 'c'.repeat(40);
const expected = { repository, number: 122, base, head };
const file = {
  filename: 'file.txt',
  status: 'modified',
  additions: 1,
  deletions: 1,
  changes: 2,
  patch: '@@ -1 +1 @@\n-before\n+after',
};
const pull = {
  number: 122,
  base: { ref: 'main', sha: base, repo: { full_name: repository } },
  head: { sha: head, repo: { full_name: repository } },
  state: 'open',
  draft: false,
  changed_files: 1,
  additions: 1,
  deletions: 1,
};
const clone = (value) => structuredClone(value);
function blob(content) {
  const bytes = Buffer.from(content);
  const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  return { sha, size: bytes.length, encoding: 'base64', content: bytes.toString('base64') };
}
function fixture(options = {}) {
  const before = blob(options.before ?? 'before\n'),
    after = blob(options.after ?? 'after\n');
  let reads = 0;
  const routes = {
    [`compare/${base}...${head}?per_page=1`]: { merge_base_commit: { sha: mergeBase } },
    'pulls/122/files?per_page=100&page=1': [{ ...file, sha: after.sha, ...options.file }],
    [`git/commits/${mergeBase}`]: { sha: mergeBase, tree: { sha: 'd'.repeat(40) } },
    [`git/commits/${head}`]: { sha: head, tree: { sha: 'e'.repeat(40) } },
    [`git/trees/${'d'.repeat(40)}`]: {
      sha: 'd'.repeat(40),
      truncated: false,
      tree: [{ path: 'file.txt', type: 'blob', mode: '100644', sha: before.sha }],
    },
    [`git/trees/${'e'.repeat(40)}`]: {
      sha: 'e'.repeat(40),
      truncated: options.truncated ?? false,
      tree: [{ path: 'file.txt', type: 'blob', mode: options.mode ?? '100644', sha: after.sha }],
    },
    [`git/blobs/${before.sha}`]: before,
    [`git/blobs/${after.sha}`]: after,
  };
  return async (path) => {
    const suffix = path.slice(`/repos/${repository}/`.length);
    if (suffix === 'pulls/122') {
      reads++;
      return clone(
        options.stale && reads > 1
          ? { ...pull, head: { ...pull.head, sha: 'f'.repeat(40) } }
          : { ...pull, ...options.pull },
      );
    }
    assert.ok(Object.hasOwn(routes, suffix), `Unexpected API route ${suffix}`);
    return clone(routes[suffix]);
  };
}
function envelope(candidate, patch = {}) {
  return {
    type: 'result',
    subtype: 'success',
    is_error: false,
    structured_output: {
      candidateDigest: candidate.digest,
      base,
      head,
      verdict: 'pass',
      coverage: candidate.files.map((item) => ({ path: item.path, status: 'reviewed' })),
      findings: [],
      ...patch,
    },
  };
}

test('configuration has no implicit credential, activation or model', () => {
  assert.throws(() => selectCredential({}), /review_not_enabled/);
  const config = {
    POS_AI_REVIEW_ENABLED: 'true',
    POS_AI_REVIEW_AUTH: 'api',
    POS_AI_REVIEW_MODEL: 'claude-sonnet-4-6',
  };
  assert.throws(() => selectCredential(config), /credential_missing/);
  assert.throws(
    () => selectCredential({ ...config, ANTHROPIC_API_KEY: 'secret', POS_AI_REVIEW_MODEL: 'sonnet' }),
    /model_not_configured/,
  );
  assert.equal(selectCredential({ ...config, ANTHROPIC_API_KEY: 'secret' }).name, 'ANTHROPIC_API_KEY');
  assert.equal(
    selectCredential({ ...config, POS_AI_REVIEW_AUTH: 'oauth', CLAUDE_CODE_OAUTH_TOKEN: 'other' }).name,
    'CLAUDE_CODE_OAUTH_TOKEN',
  );
});

test('event rejects other repositories, events, bots and branch targets', () => {
  const event = {
    number: 122,
    repository: { full_name: repository, default_branch: 'main' },
    pull_request: pull,
    sender: { login: 'floxcristian', type: 'User' },
  };
  const env = {
    GITHUB_EVENT_NAME: 'pull_request_target',
    GITHUB_REPOSITORY: repository,
    GITHUB_ACTOR: 'floxcristian',
  };
  assert.deepEqual(validateEvent(event, env), expected);
  for (const other of [
    { ...env, GITHUB_EVENT_NAME: 'pull_request' },
    { ...env, GITHUB_REPOSITORY: 'attacker/repo' },
    { ...env, GITHUB_ACTOR: 'someone' },
  ])
    assert.throws(() => validateEvent(event, other));
  assert.throws(() => validateEvent({ ...event, sender: { login: 'floxcristian', type: 'Bot' } }, env));
  assert.throws(() =>
    validateEvent({ ...event, repository: { ...event.repository, default_branch: 'dev' } }, env),
  );
});

test('draft, fork, closed, stale and oversized PR fail', () => {
  validatePull(pull, expected);
  for (const change of [
    { draft: true },
    { state: 'closed' },
    { changed_files: 31 },
    { additions: 1201 },
    { head: { ...pull.head, sha: 'f'.repeat(40) } },
    { head: { ...pull.head, repo: { full_name: 'attacker/fork' } } },
  ])
    assert.throws(() => validatePull({ ...pull, ...change }, expected));
});

test('relative file paths never escape or include controls', () => {
  for (const path of ['../x', '/x', 'a/../x', 'a\\b', 'a//b', 'a\0b', 'a/./b'])
    assert.throws(() => validatePath(path));
  assert.equal(validatePath('docs/guía.md'), 'docs/guía.md');
});

test('diffs require complete hunks and exact aggregate counts', () => {
  validatePatch(file);
  for (const change of [
    { patch: undefined },
    { patch: '@@ -1 +1 @@\n-before' },
    { patch: '@@ -1 +1 @@\n-before\n+after\n+extra' },
    { changes: 10 },
    { status: 'copied' },
  ])
    assert.throws(() => validatePatch({ ...file, ...change }));
  validatePatch({
    ...file,
    additions: 0,
    deletions: 0,
    changes: 0,
    patch: undefined,
    status: 'renamed',
    previous_filename: 'old.txt',
  });
});

test('blobs verify Git hash, bounds and text instead of blindly trusting base64', () => {
  const text = blob('hello');
  assert.equal(decodeBlob(text, text.sha).text, 'hello');
  for (const value of [blob(Buffer.from([0xff])), blob('a\0b')])
    assert.throws(() => decodeBlob(value, value.sha), /binary_not_inspected/);
  assert.throws(() => decodeBlob({ ...text, content: 'bm9wZQ==' }, text.sha), /blob_hash_mismatch/);
  assert.throws(() => decodeBlob({ ...text, size: LIMITS.fileBytes + 1 }, text.sha), /large_blob/);
  assert.throws(() => decodeBlob({ ...text, content: '!notbase64' }, text.sha), /invalid_blob_encoding/);
});

test('immutable candidate binds merge base, full before/after, blob and digest', async () => {
  const candidate = await collectCandidate(fixture(), expected);
  assert.equal(candidate.mergeBase, mergeBase);
  assert.equal(candidate.files[0].base.text, 'before\n');
  assert.equal(candidate.files[0].head.text, 'after\n');
  assert.match(candidate.digest, /^[a-f0-9]{64}$/);
  assert.notEqual(
    (await collectCandidate(fixture({ after: 'different\n' }), expected)).digest,
    candidate.digest,
  );
});

test('candidate fails on changed PR, truncated tree, symlink and missing inventory', async () => {
  for (const options of [
    { stale: true },
    { truncated: true },
    { mode: '120000' },
    { mode: '160000' },
    { pull: { changed_files: 2 } },
    { file: { sha: 'f'.repeat(40) } },
    { after: Buffer.from([0]) },
    { after: 'x'.repeat(LIMITS.fileBytes + 1) },
  ])
    await assert.rejects(collectCandidate(fixture(options), expected));
});

test('total candidate size fails without silently truncating otherwise valid files', async () => {
  const before = 'x'.repeat(LIMITS.fileBytes - 1);
  const after = 'y'.repeat(LIMITS.fileBytes - 1);
  await assert.rejects(
    collectCandidate(
      fixture({
        before: `${before}\n`,
        after: `${after}\n`,
        file: { patch: `@@ -1 +1 @@\n-${before}\n+${after}` },
      }),
      expected,
    ),
    /candidate_too_large/,
  );
});

test('two-file coverage rejects duplicates even when the array length matches', async () => {
  const candidate = await collectCandidate(fixture(), expected);
  candidate.files.push({ ...candidate.files[0], path: 'second.txt' });
  assert.throws(
    () =>
      validateVerdict(
        envelope(candidate, {
          coverage: [
            { path: 'file.txt', status: 'reviewed' },
            { path: 'file.txt', status: 'reviewed' },
          ],
        }),
        candidate,
      ),
    /incomplete_review_coverage/,
  );
});

test('structured verdict cannot certify missing, stale or partial coverage', async () => {
  const candidate = await collectCandidate(fixture(), expected);
  assert.equal(validateVerdict(envelope(candidate), candidate).passed, true);
  for (const value of [
    {},
    { type: 'result', subtype: 'error_max_turns', is_error: false },
    envelope(candidate, { head: 'f'.repeat(40) }),
    envelope(candidate, { candidateDigest: 'forged' }),
    envelope(candidate, { extra: true }),
    envelope(candidate, { coverage: [] }),
    envelope(candidate, { coverage: [{ path: 'unread.txt', status: 'reviewed' }] }),
  ])
    assert.throws(() => validateVerdict(value, candidate));
  assert.equal(validateVerdict(envelope(candidate, { verdict: 'incomplete' }), candidate).passed, false);
  assert.equal(
    validateVerdict(
      envelope(candidate, { coverage: [{ path: 'file.txt', status: 'insufficient' }] }),
      candidate,
    ).passed,
    false,
  );
});

test('findings outside read files are invalid; high and medium always block', async () => {
  const candidate = await collectCandidate(fixture(), expected);
  const finding = {
    severity: 'medium',
    path: 'file.txt',
    side: 'head',
    line: 1,
    description: 'Incumple el contrato del cambio.',
  };
  for (const severity of ['medium', 'high'])
    assert.equal(
      validateVerdict(envelope(candidate, { findings: [{ ...finding, severity }] }), candidate).passed,
      false,
    );
  assert.equal(
    validateVerdict(envelope(candidate, { findings: [{ ...finding, severity: 'low' }] }), candidate).passed,
    true,
  );
  for (const value of [
    { ...finding, path: 'unread.txt' },
    { ...finding, line: 100 },
    { ...finding, severity: 'unknown' },
    { ...finding, description: '' },
  ])
    assert.throws(() => validateVerdict(envelope(candidate, { findings: [value] }), candidate));
});

test('API URLs reject host, repo, queries and traversal injection', async () => {
  assert.equal(
    apiUrl(`/repos/${repository}/pulls/122`, repository),
    `https://api.github.com/repos/${repository}/pulls/122`,
  );
  for (const path of [
    'https://evil.test/x',
    '//evil.test/x',
    `/repos/${repository}/../other`,
    `/repos/${repository}/pulls/122?token=abc`,
    '/repos/attacker/x/pulls/122',
  ])
    assert.throws(() => apiUrl(path, repository));
  let options;
  await githubApi(repository, 'test-token', async (_url, init) => {
    options = init;
    return new Response('{}', { headers: { 'content-type': 'application/json' } });
  })(`/repos/${repository}/pulls/122`);
  assert.equal(options.redirect, 'error');
  assert.equal(options.method, 'GET');
  assert.equal(options.headers.authorization, 'Bearer test-token');
});

test('API output limits and JSON validity fail closed', async () => {
  const response = (text) => new Response(text, { headers: { 'content-type': 'application/json' } });
  await assert.rejects(boundedJson(response('123456'), 5), /too_large/);
  await assert.rejects(boundedJson(response('not json')), /invalid_github_json/);
  await assert.rejects(
    boundedJson(new Response('{}', { status: 403, headers: { 'content-type': 'application/json' } })),
    /github_api_failed/,
  );
});

test('only selected model credential reaches subprocess; no GitHub, proxy, NODE_OPTIONS or other authentication', () => {
  const environment = isolatedEnvironment(
    {
      PATH: '/usr/bin',
      GITHUB_TOKEN: 'git',
      ANTHROPIC_API_KEY: 'api',
      CLAUDE_CODE_OAUTH_TOKEN: 'oauth',
      NODE_OPTIONS: '--require evil',
      HTTPS_PROXY: 'http://evil',
      BASH_ENV: 'evil',
    },
    '/tmp/private',
    { name: 'ANTHROPIC_API_KEY', value: 'selected' },
  );
  assert.equal(environment.ANTHROPIC_API_KEY, 'selected');
  for (const key of ['GITHUB_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN', 'NODE_OPTIONS', 'HTTPS_PROXY', 'BASH_ENV'])
    assert.equal(environment[key], undefined);
  assert.equal(environment.HOME, '/tmp/private');
});

test('CLI disables tools, MCP, hooks, project configuration and session persistence', () => {
  const args = cliArguments('claude-sonnet-4-6');
  for (const flag of [
    '--safe-mode',
    '--strict-mcp-config',
    '--disable-slash-commands',
    '--no-session-persistence',
  ])
    assert.ok(args.includes(flag));
  for (const flag of ['--tools', '--setting-sources']) assert.equal(args[args.indexOf(flag) + 1], '');
  assert.equal(args[args.indexOf('--mcp-config') + 1], '{"mcpServers":{}}');
  assert.equal(args[args.indexOf('--permission-mode') + 1], 'dontAsk');
  assert.ok(!args.includes('--dangerously-skip-permissions'));
});

test('subprocess uses supplied environment and enforces output bound and timeout', async () => {
  const options = {
    cwd: directory,
    env: { TEST_ONLY: 'limited', SystemRoot: process.env.SystemRoot || '' },
    timeout: 5000,
  };
  assert.equal(
    await runProcess(
      process.execPath,
      ['-e', 'process.stdout.write(process.env.TEST_ONLY+":"+String(process.env.GITHUB_TOKEN))'],
      options,
    ),
    'limited:undefined',
  );
  await assert.rejects(
    runProcess(process.execPath, ['-e', 'process.stdout.write("x".repeat(1000))'], {
      ...options,
      maxOutput: 10,
    }),
    /output_too_large/,
  );
  await assert.rejects(
    runProcess(process.execPath, ['-e', 'setTimeout(()=>{},30000)'], { ...options, timeout: 50 }),
    /timeout/,
  );
});

test('summary escapes markup and masks supplied credentials', () => {
  assert.ok(!safeText('<script>[go](bad)`secret', ['secret']).includes('<script>'));
  assert.ok(!safeText('ghp_abcdefghijk secret', ['secret']).includes('secret'));
  const output = renderSummary(
    {
      passed: false,
      head,
      base,
      cliVersion: CLI_VERSION,
      model: 'claude-test',
      candidateDigest: 'digest',
      files: [],
      findings: [{ severity: 'medium', path: '<img>', line: 1, side: 'head', description: 'SECRET' }],
    },
    ['SECRET'],
  );
  assert.ok(!output.includes('SECRET') && !output.includes('<img>'));
});

test('actionable finding retains its trigger while redacting known and patterned canaries', () => {
  const canaries = [
    'private-canary-92831',
    'sk-ant-examplecredential123456',
    'ghp_examplecredential123456',
    'github_pat_examplecredential123456',
    'AKIAABCDEFGHIJKLMNOP',
    'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.signature',
    'bearerSecret123',
    'undisclosedPassword123',
    'privateKeyBody123',
  ];
  const unsafe = `Dos solicitudes simultáneas crean el mismo cobro: falta una restricción única. ${canaries.slice(0, 6).join(' ')} Bearer ${canaries[6]} password=${canaries[7]}; -----BEGIN PRIVATE KEY-----${canaries[8]}-----END PRIVATE KEY-----`;
  const redacted = redactSensitiveText(unsafe, [canaries[0]]);
  for (const canary of canaries) assert.ok(!redacted.includes(canary), `Leaked canary: ${canary}`);
  assert.match(redacted, /Dos solicitudes simultáneas crean el mismo cobro: falta una restricción única\./);
});

test('finding renderer removes URL and credential injection without activating Markdown or HTML', () => {
  const unsafe =
    '<img src=x onerror=alert(1)> [click](https://evil.test/?token=canary) ![image](https://evil.test/pixel) `run` @everyone **forged** ftp://evil.test\n| forged |';
  const result = safeText(unsafe);
  for (const active of [
    '<img',
    'https://evil.test',
    'ftp://evil.test',
    '[click](',
    '![image](',
    '`run`',
    '@everyone',
    '**forged**',
    '\n|',
  ])
    assert.ok(!result.includes(active));
  assert.ok(result.includes('enlace omitido'));
});

test('workflow checks out only trusted base and does not execute package scripts or publish approvals', async () => {
  const workflow = await readFile(join(directory, '../../.github/workflows/automated-review.yml'), 'utf8');
  assert.match(workflow, /pull_request_target:/);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.doesNotMatch(
    workflow,
    /head\.sha|pull_request\.head\.ref|checks: write|pull-requests: write|contents: write|npm (?:install|ci)|continue-on-error/,
  );
  const source = await readFile(join(directory, 'run.mjs'), 'utf8');
  assert.match(source, /'--ignore-scripts'/);
  assert.doesNotMatch(source, /APPROVE|envelope\.result|description: finding\.description/);
  const lock = JSON.parse(await readFile(join(directory, 'cli/package-lock.json'), 'utf8'));
  assert.equal(Object.keys(lock.packages).length, 2);
  assert.equal(lock.packages['node_modules/@anthropic-ai/claude-code-linux-x64'].version, CLI_VERSION);
  assert.match(lock.packages['node_modules/@anthropic-ai/claude-code-linux-x64'].integrity, /^sha512-/);
});

async function distributionFixture(action) {
  const temporaryRoot = await realpath(tmpdir());
  const temporary = await mkdtemp(join(temporaryRoot, 'pos-review-distribution-'));
  try {
    const source = join(temporary, 'source');
    const target = join(temporary, 'docs');
    for (const [root, name] of [
      [source, 'pos-platform'],
      [target, 'pos-docs'],
    ]) {
      await mkdir(root);
      execFileSync('git', ['init', '-q', root]);
      execFileSync('git', [
        '-C',
        root,
        'remote',
        'add',
        'origin',
        `https://github.com/developer-implementos/${name}.git`,
      ]);
    }
    const manifestPath = 'tools/automated-review/distribution.json';
    const manifest = JSON.parse(await readFile(join(directory, 'distribution.json'), 'utf8'));
    for (const file of [...Object.keys(manifest.files), manifestPath]) {
      await mkdir(dirname(join(source, file)), { recursive: true });
      await copyFile(join(directory, '../..', file), join(source, file));
    }
    const run = (...args) =>
      spawnSync(process.execPath, [join(source, 'tools/automated-review/distribute.mjs'), ...args], {
        cwd: source,
        encoding: 'utf8',
        timeout: 15000,
        env: isolatedEnvironment(process.env, temporary),
      });
    const recorded = run('--record');
    assert.equal(recorded.status, 0, recorded.stderr);
    await action({ temporary, source, target, manifestPath, run });
  } finally {
    assert.equal(dirname(resolve(temporary)), temporaryRoot);
    assert.ok(basename(temporary).startsWith('pos-review-distribution-'));
    await rm(temporary, { recursive: true, force: true });
  }
}

test('distribution replaces hardlinks without changing external files, including the manifest', async () => {
  await distributionFixture(async ({ temporary, source, target, manifestPath, run }) => {
    const external = join(temporary, 'external.txt');
    const sentinel = 'external bytes must survive';
    await writeFile(external, sentinel);
    for (const file of ['tools/automated-review/core.mjs', manifestPath]) {
      await mkdir(dirname(join(target, file)), { recursive: true });
      await link(external, join(target, file));
    }
    const copied = run('--write', target);
    assert.equal(copied.status, 0, copied.stderr);
    assert.equal(await readFile(external, 'utf8'), sentinel);
    for (const file of ['tools/automated-review/core.mjs', manifestPath])
      assert.deepEqual(await readFile(join(target, file)), await readFile(join(source, file)));
    await unlink(join(source, manifestPath));
    await link(external, join(source, manifestPath));
    const recorded = run('--record');
    assert.equal(recorded.status, 0, recorded.stderr);
    assert.equal(await readFile(external, 'utf8'), sentinel);
    assert.equal(run('--check').status, 0);
  });
});

test('distribution rejects linked target roots and parent directories', async () => {
  await distributionFixture(async ({ temporary, target, run }) => {
    const linkedRoot = join(temporary, 'linked-docs');
    const kind = process.platform === 'win32' ? 'junction' : 'dir';
    await symlink(target, linkedRoot, kind);
    const rootResult = run('--write', linkedRoot);
    assert.notEqual(rootResult.status, 0);
    assert.match(rootResult.stderr, /unsafe_distribution_root/);
    const externalDirectory = join(temporary, 'external-directory');
    await mkdir(join(externalDirectory, 'automated-review'), { recursive: true });
    const marker = join(externalDirectory, 'automated-review/core.mjs');
    await writeFile(marker, 'external directory sentinel');
    await symlink(externalDirectory, join(target, 'tools'), kind);
    const parentResult = run('--write', target);
    assert.notEqual(parentResult.status, 0);
    assert.match(parentResult.stderr, /unsafe_distribution_path/);
    assert.equal(await readFile(marker, 'utf8'), 'external directory sentinel');
  });
});

test('record and distribution reject dangling file symlinks when supported by the host', async (context) => {
  await distributionFixture(async ({ temporary, source, target, manifestPath, run }) => {
    const absent = join(temporary, 'must-remain-absent');
    await unlink(join(source, manifestPath));
    try {
      await symlink(absent, join(source, manifestPath), 'file');
    } catch (error) {
      if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error.code)) throw error;
      context.diagnostic(
        'Windows denied file-symlink creation; hardlink and junction regressions still executed.',
      );
      return;
    }
    const recorded = run('--record');
    assert.notEqual(recorded.status, 0);
    assert.match(recorded.stderr, /unsafe_distribution_path/);
    await assert.rejects(readFile(absent), { code: 'ENOENT' });
    await unlink(join(source, manifestPath));
    assert.equal(run('--record').status, 0);
    await mkdir(join(target, 'tools/automated-review'), { recursive: true });
    await symlink(absent, join(target, 'tools/automated-review/core.mjs'), 'file');
    const copied = run('--write', target);
    assert.notEqual(copied.status, 0);
    assert.match(copied.stderr, /unsafe_distribution_path/);
    await assert.rejects(readFile(absent), { code: 'ENOENT' });
  });
});
