import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { filesAfterChanges, validateOwners, validatePullRequest, verifyIssue, visibleBody } from './policy.mjs';
import { assertPullRequestUnchanged, checkLinkedIssue, githubClient, loadPullRequest as loadLivePullRequest } from './github.mjs';

// Existing editorial metadata cases explicitly provide empty Git trees.
const loadPullRequest = (get, ...args) => loadLivePullRequest(async path => {
  const commit = path.match(/\/git\/commits\/([a-f0-9]{40})$/);
  if (commit) return { status: 200, value: { sha: commit[1], tree: { sha: commit[1] } } };
  const tree = path.match(/\/git\/trees\/([a-f0-9]{40})\?recursive=1$/);
  if (tree) return { status: 200, value: { sha: tree[1], truncated: false, tree: [] } };
  return get(path);
}, ...args);

const validBody = `Issue: https://github.com/developer-implementos/pos-platform/issues/121
Documentation-Impact: architecture, behavior
Sources: docs/decisions/device-agent.md, tools/architecture/model.mjs
Reader-Journeys: /guide/flows/printing/, /guide/diagrams/#mapa-general-de-arquitectura
Review-Evidence: Revisión técnica del flujo y tests en la PR; revisión humana pendiente de asignación.
ODD-Task: inline
ODD-Reason: Corrección editorial acotada sobre una decisión existente y comprendida.

## Resultado
La recepción durable y la autorización del efecto quedan distinguidas en todas las vistas.
## Fuentes y revisión
El modelo compartido y el contrato de dispositivos conservan la revisión del producto.
## Validación
Pruebas de recuperación, contenido y navegador registradas en la evidencia de esta PR.
## Riesgos y reversión
Revertir la PR editorial conserva las rutas públicas y no modifica contratos del producto.
`;
const knownFiles = new Set(['docs/decisions/device-agent.md', 'tools/architecture/model.mjs']);
const validate = body => validatePullRequest({ body, knownFiles });
const openIssue = { number: 121, html_url: 'https://github.com/developer-implementos/pos-platform/issues/121', state: 'open' };

test('declares affected sources and reader journeys without claiming human approval', () => {
  const result = validate(validBody);
  assert.equal(result.issueNumber, 121);
  assert.deepEqual(result.impacts, ['architecture', 'behavior']);
  assert.equal(result.sources.length, 2);
});

test('comments, examples and unclosed fences cannot supply required metadata', () => {
  assert.throws(() => validate(`<!-- ${validBody} -->`), /Issue/);
  assert.throws(() => validate('```markdown\n' + validBody + '\n````'), /Issue/);
  assert.throws(() => validate('~~~\n' + validBody), /Issue/);
  assert.throws(() => validate('<!--\n' + validBody), /Issue/);
  assert.equal(visibleBody('````\ntext\n```\nIssue: hidden\n````\nshown'), '\n\n\n\n\nshown');
});

test('rejects duplicate fields rather than trusting the first declaration', () => {
  assert.throws(() => validate(validBody + '\nIssue: https://github.com/developer-implementos/pos-platform/issues/1'), /exactly one/);
});

test('accepts only an explicit product issue identity', () => {
  for (const replacement of ['https://github.com/developer-implementos/pos-docs/issues/121', 'https://github.com/developer-implementos/pos-platform/pull/121', 'https://example.test/issues/121', '#121', 'https://github.com/developer-implementos/pos-platform/issues/121?closed=true']) {
    assert.throws(() => validate(validBody.replace(openIssue.html_url, replacement)), /Issue must/);
  }
});

test('impact vocabularies cannot silently expand or combine none with an impact', () => {
  for (const replacement of ['none, architecture', 'behavior, behavior', 'flows', 'architecture,']) {
    assert.throws(() => validate(validBody.replace('architecture, behavior', replacement)), /Documentation-Impact/);
  }
  assert.throws(() => validate(validBody.replace('architecture, behavior', 'none')), /Impact-Reason/);
  assert.deepEqual(validate(validBody.replace('architecture, behavior', 'none') + '\nImpact-Reason: El cambio corrige tipografía; conserva decisiones, contratos y estado de implementación.').impacts, ['none']);
});

test('sources must be named existing files, not traversal or arbitrary URLs', () => {
  for (const replacement of ['../secret', '/docs/decisions/device-agent.md', 'docs/missing.md', 'https://example.test/source.md', 'docs/**', 'docs/../secret.md', 'docs/\u0001secret.md', 'docs\\secret.md', 'docs//secret.md']) {
    assert.throws(() => validate(validBody.replace('docs/decisions/device-agent.md', replacement)), /Source/);
  }
});

test('tracked meeting originals may use Unicode, spaces and parentheses', () => {
  const original = 'materials/Descripción Caja España (2da reunión).docx';
  const result = validatePullRequest({
    body: validBody.replace('docs/decisions/device-agent.md', original),
    knownFiles: new Set([...knownFiles, original]),
  });
  assert.equal(result.sources[0], original);
  assert.throws(() => validate(validBody.replace('docs/decisions/device-agent.md', original)), /not a tracked/);
});

test('PR changed-file metadata admits new sources and excludes removed or renamed paths', () => {
  const result = filesAfterChanges(['old.md', 'removed.md'], [
    { status: 'removed', filename: 'removed.md' },
    { status: 'renamed', filename: 'new.md', previous_filename: 'old.md' },
    { status: 'added', filename: 'added.md' },
  ]);
  assert.deepEqual([...result].sort(), ['added.md', 'new.md']);
});

test('reader journeys use canonical public paths', () => {
  assert.throws(() => validate(validBody.replace('/guide/flows/printing/', 'https://example.test/')), /Reader-Journeys/);
  assert.throws(() => validate(validBody.replace('/guide/flows/printing/', '/guide/../secret/')), /Reader-Journeys/);
});

test('placeholder review evidence and empty sections are rejected', () => {
  assert.throws(() => validate(validBody.replace(/^Review-Evidence:.*$/m, 'Review-Evidence: pendiente')), /Review-Evidence/);
  assert.throws(() => validate(validBody.replace('Pruebas de recuperación, contenido y navegador registradas en la evidencia de esta PR.', '<!-- tests pasan -->')), /Validación/);
});

test('editorial publication cannot automatically close a product issue', () => {
  for (const closing of [
    'Closes https://github.com/developer-implementos/pos-platform/issues/121',
    'Fixes developer-implementos/pos-platform#121',
    'Closes: developer-implementos/pos-platform#121',
    'RESOLVES: https://github.com/developer-implementos/pos-platform/issues/121',
    '<!-- Closes: developer-implementos/pos-platform#121 -->',
    '```\nFixes: developer-implementos/pos-platform#121\n```',
  ]) assert.throws(() => validate(validBody + '\n' + closing), /without closing/);
});

test('issue evidence must match a real open issue, not a PR or different identity', () => {
  assert.equal(verifyIssue(openIssue, 121).status, 'verified-open');
  assert.throws(() => verifyIssue({ ...openIssue, pull_request: {} }, 121), /pull request/);
  assert.throws(() => verifyIssue({ ...openIssue, state: 'closed' }, 121), /not open/);
  assert.throws(() => verifyIssue({ ...openIssue, number: 122 }, 121), /different issue/);
});

test('inaccessible private issues remain unverified; required verification fails closed', async () => {
  for (const status of [403, 404]) {
    const get = async () => ({ status });
    assert.equal((await checkLinkedIssue(get, 121)).status, 'unverified');
    await assert.rejects(checkLinkedIssue(get, 121, { required: true }), /could not be verified/);
  }
  await assert.rejects(checkLinkedIssue(async () => ({ status: 500 }), 121), /lookup failed/);
});

test('GitHub client constrains token destinations and rejects redirects', async () => {
  let called = false;
  const get = githubClient({ token: 'synthetic-token', fetcher: async (url, options) => {
    called = true;
    assert.equal(url, 'https://api.github.com/repos/developer-implementos/pos-platform/issues/121');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, 'Bearer synthetic-token');
    return { ok: true, status: 200, json: async () => openIssue };
  } });
  await assert.rejects(get('https://example.test/steal'), /allowlist/);
  assert.equal(called, false);
  assert.equal((await get('repos/developer-implementos/pos-platform/issues/121')).value.state, 'open');
});

const head = 'a'.repeat(40);
const pr = { number: 23, state: 'open', body: validBody, changed_files: 1, head: { sha: head }, base: { ref: 'main', sha: 'b'.repeat(40), repo: { full_name: 'developer-implementos/pos-docs' } } };

test('remote PR inspection reads metadata only and verifies it did not change', async () => {
  const requested = [];
  const result = await loadPullRequest(async path => {
    requested.push(path);
    return { status: 200, value: path.includes('/files?') ? [{ filename: 'docs/new.md', status: 'added' }] : pr };
  }, 23, head);
  assert.equal(result.head, head);
  assert.equal(requested.length, 3);
  assert.equal(result.files[0].filename, 'docs/new.md');
});

test('remote PR race, stale event and incomplete file inventory fail validation', async () => {
  await assert.rejects(loadPullRequest(async () => ({ status: 200, value: pr }), 23, 'b'.repeat(40)), /changed since/);
  await assert.rejects(loadPullRequest(async path => ({ status: 200, value: path.includes('/files?') ? [] : pr }), 23, head), /complete changed-file/);
  let count = 0;
  await assert.rejects(loadPullRequest(async path => ({ status: 200, value: path.includes('/files?') ? [{ filename: 'a.md' }] : (++count === 1 ? pr : { ...pr, body: 'changed' }) }), 23, head), /changed during/);
});

test('CODEOWNERS requires coverage and prevents ownerless or shadowed entries', () => {
  assert.equal(validateOwners('* @developer-implementos/pos-platform\n/docs/ @developer-implementos/pos-platform').areas, 2);
  assert.throws(() => validateOwners('/docs/ @floxcristian'), /fallback/);
  assert.throws(() => validateOwners('* @floxcristian\n/docs/'), /valid users/);
  assert.throws(() => validateOwners('* @floxcristian\n* @someone'), /duplicate/);
});

test('the repository CODEOWNERS uses the explicit paths required by editorial policy', () => {
  const owners = fs.readFileSync(new URL('../../.github/CODEOWNERS', import.meta.url), 'utf8');
  assert.ok(validateOwners(owners).areas > 1);
  for (const pattern of ['/package*.json', '/eslint.config.*', '/tools/verify-local-ci*']) {
    assert.throws(() => validateOwners(`* @developer-implementos/pos-platform\n${pattern} @floxcristian`), /explicit repository paths/);
  }
});

test('privileged metadata workflow checks out only trusted base with read permissions', () => {
  const workflow = fs.readFileSync(new URL('../../.github/workflows/editorial-policy.yml', import.meta.url), 'utf8');
  assert.match(workflow, /pull_request_target:/);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pull-requests: read/);
  assert.doesNotMatch(workflow, /secrets\.|: write|head\.(?:sha|ref)|npm |download-artifact/);
  assert.doesNotMatch(workflow, /^[ \t]*cache:/m);
  assert.match(workflow, /^[ \t]+package-manager-cache: false[ \t]*\r?$/m);
  const runLines = workflow.split(/\r?\n/).filter(line => /\brun:/.test(line));
  assert.equal(runLines.length, 1);
  assert.doesNotMatch(runLines[0], /\$\{\{/);
});

const oddPath = 'odd/tasks/editorial-recovery.md';
const oddDocument = `# Clarify recovery in the proposal
## Specs
- S1. Preserve the existing distinction between implementation and acceptance.
## Tasks
- [ ] T1 · S1 · route:inline · Check the recovery explanation · status:in_progress · evidence: editorial verification pending.
## Log
- L1 · Original request, verbatim:

> Explain recovery without claiming an operational acceptance.
`;

function oddRepository({ before = {}, after = {}, reference = oddPath } = {}) {
  const pull = structuredClone(pr);
  pull.body = validBody.replace('ODD-Task: inline', `ODD-Task: ${reference}`);
  const repository = pull.base.repo.full_name;
  const responses = new Map();
  for (const [revision, files] of [[pull.base.sha, before], [pull.head.sha, after]]) {
    const entries = [];
    for (const [path, text] of Object.entries(files)) {
      const bytes = Buffer.from(text);
      const sha = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      entries.push({ path, mode: '100644', type: 'blob', size: bytes.length, sha });
      responses.set(`repos/${repository}/git/blobs/${sha}`, { sha, size: bytes.length, encoding: 'base64', content: bytes.toString('base64') });
    }
    if (entries.length) entries.push(
      { path: 'odd', mode: '040000', type: 'tree', sha: 'd'.repeat(40) },
      { path: 'odd/tasks', mode: '040000', type: 'tree', sha: 'e'.repeat(40) },
    );
    const sha = createHash('sha1').update(JSON.stringify(entries)).digest('hex');
    responses.set(`repos/${repository}/git/commits/${revision}`, { sha: revision, tree: { sha } });
    responses.set(`repos/${repository}/git/trees/${sha}?recursive=1`, { sha, truncated: false, tree: entries });
  }
  const calls = [];
  const get = async path => {
    calls.push(path);
    if (path === `repos/${repository}/pulls/23`) return { status: 200, value: structuredClone(pull) };
    if (path === `repos/${repository}/pulls/23/files?per_page=100&page=1`) return { status: 200, value: [{ filename: oddPath, status: 'modified' }] };
    if (responses.has(path)) return { status: 200, value: structuredClone(responses.get(path)) };
    return { status: 404 };
  };
  return { get, pull, responses, calls };
}

test('editorial ODD declaration must be visible, unique and explicit even for a small correction', () => {
  for (const replacement of ['', '<!-- ODD-Task: inline -->', '> ODD-Task: inline', '    ODD-Task: inline', '```\nODD-Task: inline\n```']) {
    assert.throws(() => validate(validBody.replace('ODD-Task: inline', replacement)), /visible ODD-Task/);
  }
  assert.throws(() => validate(validBody + '\nODD-Task: inline'), /visible ODD-Task/);
  assert.throws(() => validate(validBody.replace(/ODD-Reason: [^\n]+/, 'ODD-Reason: TODO')), /concretely/);
  assert.throws(() => validate(validBody.replace('ODD-Task: inline', 'ODD-Task: odd/tasks/../secret.md')), /kebab/);
});

test('editorial PR validates source text and all changed task histories at head/base SHAs', async () => {
  const subject = oddRepository({ after: { [oddPath]: oddDocument } });
  const result = await loadLivePullRequest(subject.get, 23, subject.pull.head.sha, subject.pull.base.sha);
  assert.equal(result.head, subject.pull.head.sha);
  assert.equal(result.base, subject.pull.base.sha);
  assert.equal(subject.calls.filter(path => path.includes('/git/blobs/')).length, 1);
  assert.ok(subject.calls.includes(`repos/developer-implementos/pos-docs/git/commits/${subject.pull.base.sha}`));
  assert.ok(subject.calls.includes(`repos/developer-implementos/pos-docs/git/commits/${subject.pull.head.sha}`));
  assert.equal(subject.calls.at(-1), 'repos/developer-implementos/pos-docs/pulls/23');
  for (const [after, pattern] of [
    [{ [oddPath]: oddDocument.replace('without claiming', 'claiming') }, /append-only/],
    [{}, /must not be removed/],
    [{ 'odd/tasks/renamed.md': oddDocument }, /must not be removed/],
  ]) {
    const invalid = oddRepository({ reference: 'inline', before: { [oddPath]: oddDocument }, after });
    await assert.rejects(loadLivePullRequest(invalid.get, 23), pattern);
  }
});

test('declared ODD source access is mandatory even when product issue access may remain unverified', async () => {
  const absent = oddRepository();
  await assert.rejects(loadLivePullRequest(absent.get, 23), /Required ODD document does not exist/);
  for (const status of [403, 404]) {
    const subject = oddRepository({ reference: `https://github.com/developer-implementos/pos-platform/blob/${'c'.repeat(40)}/${oddPath}` });
    const get = async path => path.startsWith('repos/developer-implementos/pos-platform/') ? { status } : subject.get(path);
    await assert.rejects(loadLivePullRequest(get, 23), new RegExp(`Cannot read ODD.*HTTP ${status}`));
    assert.equal((await checkLinkedIssue(get, 122)).status, 'unverified');
  }
});

test('editorial Git API allowlist permits only immutable reads and never arbitrary destinations', async () => {
  const calls = [];
  const get = githubClient({ token: 'synthetic-token', fetcher: async (url, options) => {
    calls.push(url);
    assert.equal(options.redirect, 'error');
    assert.equal(options.method, undefined, 'Read-only GET is the only operation');
    return { ok: true, status: 200, json: async () => ({}) };
  } });
  for (const path of [`git/commits/${head}`, `git/blobs/${head}`, `git/trees/${head}?recursive=1`]) {
    await get(`repos/developer-implementos/pos-docs/${path}`);
  }
  for (const path of [
    'repos/developer-implementos/pos-docs/git/commits/main',
    `repos/other/private/git/commits/${head}`,
    `repos/developer-implementos/pos-docs/git/blobs/${head}?ref=main`,
    `repos/developer-implementos/pos-docs/git/trees/${head}?recursive=1&token=bad`,
    `https://example.test/${head}`,
  ]) await assert.rejects(get(path), /allowlist/);
  assert.equal(calls.length, 3);
});

test('editorial head, base and mutable metadata are rechecked after source reads and issue lookup', async () => {
  for (const field of ['head', 'base', 'body', 'state']) {
    const subject = oddRepository({ after: { [oddPath]: oddDocument } });
    await assert.rejects(loadLivePullRequest(async path => {
      const response = await subject.get(path);
      if (path.includes('/git/blobs/')) {
        if (['head', 'base'].includes(field)) subject.pull[field].sha = 'f'.repeat(40);
        else subject.pull[field] = 'changed';
      }
      return response;
    }, 23), /changed during/);
  }
  const subject = oddRepository({ after: { [oddPath]: oddDocument } });
  await assert.rejects(loadLivePullRequest(subject.get, 23, head, 'f'.repeat(40)), /base changed since/);
  const result = await loadLivePullRequest(subject.get, 23);
  subject.pull.body += '\nEdited while reading the product issue.';
  await assert.rejects(assertPullRequestUnchanged(subject.get, result.snapshot), /changed during/);
});

test('the editorial workflows declare only self-hosted runners and no sudo step', () => {
  // The organization does not consume hosted Actions minutes (pos-platform#161).
  // `automated-review.yml` is a distributed copy from POS Platform and follows its
  // routing when the distribution is refreshed from an integrated product revision.
  const hosted = /\b(ubuntu|windows|macos)-(latest|\d[\w.]*)\b/;
  for (const name of ['docs-quality.yml', 'editorial-policy.yml']) {
    const workflow = fs.readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), 'utf8');
    const runsOn = workflow.split(/\r?\n/).filter(line => /^\s+runs-on:/.test(line));
    assert.ok(runsOn.length > 0, `${name} must declare runs-on`);
    for (const line of runsOn) {
      assert.doesNotMatch(line, hosted, `${name} declares a hosted runner: ${line.trim()}`);
      assert.match(line, /fromJSON\(vars\.POS_CI_(?:TRUSTED|LINUX)_RUNS_ON \|\|/, `${name} must route through the declared pool`);
      assert.match(line, /'\["self-hosted","linux","x64"\]'\) \}\}$/, `${name} must default to the self-hosted pool`);
    }
    // A comment that names sudo does not run sudo; it is the text that explains the bounded step.
    const executable = workflow.split(/\r?\n/).filter(line => !/^\s*#/.test(line)).join('\n');
    assert.doesNotMatch(executable, /--with-deps|\bsudo\b/, `${name} must not need sudo on a self-hosted runner`);
  }
});
