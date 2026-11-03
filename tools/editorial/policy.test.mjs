import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { filesAfterChanges, validateOwners, validatePullRequest, verifyIssue, visibleBody } from './policy.mjs';
import { checkLinkedIssue, githubClient, loadPullRequest } from './github.mjs';

const validBody = `Issue: https://github.com/developer-implementos/pos-platform/issues/121
Documentation-Impact: architecture, behavior
Sources: docs/decisions/device-agent.md, tools/architecture/model.mjs
Reader-Journeys: /guide/flows/printing/, /guide/diagrams/#mapa-general-de-arquitectura
Review-Evidence: Revisión técnica del flujo y tests en la PR; revisión humana pendiente de asignación.

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
  for (const replacement of ['../secret', '/docs/decisions/device-agent.md', 'docs/missing.md', 'https://example.test/source.md', 'docs/**']) {
    assert.throws(() => validate(validBody.replace('docs/decisions/device-agent.md', replacement)), /Source/);
  }
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
const pr = { number: 23, state: 'open', body: validBody, changed_files: 1, head: { sha: head }, base: { ref: 'main', repo: { full_name: 'developer-implementos/pos-docs' } } };

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

test('privileged metadata workflow checks out only trusted base with read permissions', () => {
  const workflow = fs.readFileSync(new URL('../../.github/workflows/editorial-policy.yml', import.meta.url), 'utf8');
  assert.match(workflow, /pull_request_target:/);
  assert.match(workflow, /ref: \$\{\{ github\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pull-requests: read/);
  assert.doesNotMatch(workflow, /secrets\.|: write|head\.(?:sha|ref)|npm |cache:|download-artifact/);
  const runLines = workflow.split(/\r?\n/).filter(line => /\brun:/.test(line));
  assert.equal(runLines.length, 1);
  assert.doesNotMatch(runLines[0], /\$\{\{/);
});
