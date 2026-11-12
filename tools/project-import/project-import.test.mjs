import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readerJourneys, validatePullRequest } from '../editorial/policy.mjs';
import { validateChangelogOverride } from '../release/policy.mjs';
import { botLogin, closeObsoleteImport, importClient, publishImport } from './github.mjs';
import { importBranch, renderImportPullRequest } from './pull-request.mjs';
import { planImport, publishedFacts } from './run.mjs';
import { importSnapshots, snapshots } from './snapshots.mjs';
import { StaleSnapshotError } from './stale-snapshot.mjs';
import { isolateFromInvokingRepository } from '../git-isolation.mjs';

// Sin esto, un hook o `git rebase --exec` haría que sus fixtures actuaran sobre el repositorio que la lanza.
isolateFromInvokingRepository();

const revision = 'a'.repeat(40);
const base = 'b'.repeat(40);
const slug = 'implementos-pos-docs-import';
const bot = `${slug}[bot]`;
const root = fileURLToPath(new URL('../../', import.meta.url));

/** A fake importer: stale until written once, then current. */
function fakeImporter(name, { stale = false, rev = revision, onWrite = () => {} } = {}) {
  const real = snapshots.find(item => item.name === name);
  const calls = [];
  let current = !stale;
  return {
    calls,
    importer: { ...real, sync: ({ check }) => {
      calls.push(check ? 'check' : 'write');
      if (check && !current) throw new StaleSnapshotError(`Published ${name} snapshot is stale`);
      if (!check) { onWrite(); current = true; }
      return { revision: rev, changed: !check };
    } },
  };
}

test('importers run in dependency order and only stale snapshots are written', () => {
  assert.deepEqual(snapshots.map(item => item.name), ['progress', 'followUp', 'planning', 'questions']);
  const fakes = ['progress', 'followUp', 'planning', 'questions'].map((name, index) => fakeImporter(name, { stale: index === 1 }));
  const result = importSnapshots({ root, workspace: '.', importers: fakes.map(fake => fake.importer) });
  assert.equal(result.revision, revision);
  assert.deepEqual(result.imported.map(item => item.name), ['followUp']);
  assert.deepEqual(fakes.map(fake => fake.calls), [['check'], ['check', 'write'], ['check'], ['check']]);
});

test('current snapshots import nothing, and any failure other than staleness stops the run', () => {
  const current = ['progress', 'followUp', 'planning', 'questions'].map(name => fakeImporter(name).importer);
  assert.equal(importSnapshots({ root, workspace: '.', importers: current }).imported.length, 0);
  const broken = { ...current[0], sync: () => { throw new Error('Evidence revision must belong to the imported product history'); } };
  assert.throws(() => importSnapshots({ root, workspace: '.', importers: [broken, ...current.slice(1)] }), /Evidence revision/);
});

test('importers that read different product revisions abort the run', () => {
  const mixed = [fakeImporter('progress').importer, fakeImporter('followUp', { rev: 'c'.repeat(40) }).importer];
  assert.throws(() => importSnapshots({ root, workspace: '.', importers: mixed }), /different product revisions/);
});

function results(importedNames) {
  return snapshots.map(item => ({ ...item, imported: importedNames.includes(item.name), revision }));
}
const knownFiles = new Set(snapshots.map(item => item.path));

test('the rendered PR passes the editorial policy and lists the title and every entry in its changelog block', () => {
  const entries = ['docs(progress): F01-01 pasa de Verificado técnicamente a En desarrollo', 'docs(follow-up): FOLLOWUP-017 actualizado (impacto): Validar el registro'];
  const { title, body } = renderImportPullRequest({ revision, results: results(['progress', 'followUp']), entries });
  assert.equal(title, 'docs(project): [TASK-283] importar el corte aaaaaaa de avance y seguimientos');
  assert.ok(title.length <= 100);
  const declaration = validatePullRequest({ body, knownFiles });
  assert.equal(declaration.issueNumber, 283);
  assert.deepEqual(declaration.sources, ['portal/data/project-progress.json', 'portal/data/project-follow-up.json']);
  assert.deepEqual(readerJourneys(body), ['/project/', '/project/work/', '/guide/implementation/progress/', '/project/attention/']);
  assert.deepEqual(validateChangelogOverride(body).entries, [title, ...entries]);
  assert.match(body, /^ODD-Task: inline$/m);
  assert.match(body, /\| `portal\/data\/project-planning\.json` \| vigente, sin cambios \|/);
  assert.deepEqual(renderImportPullRequest({ revision, results: results(['progress', 'followUp']), entries }), { title, body }, 'The same facts render the same PR');
});

test('a title that would exceed the subject limit names the source instead of every snapshot', () => {
  const { title, body } = renderImportPullRequest({ revision, results: results(['progress', 'followUp', 'planning', 'questions']), entries: [] });
  assert.equal(title, 'docs(project): [TASK-283] importar el corte aaaaaaa de los registros de entrega del producto');
  assert.ok(title.length <= 100);
  assert.match(body, /cambian los datos de avance, seguimientos, planificación y preguntas\./);
});

test('snapshots re-imported only to keep one revision are named apart from those whose data changes', () => {
  const mixed = results(['progress', 'followUp', 'planning', 'questions']).map(item => ({ ...item, material: item.name === 'followUp' }));
  const { title, body } = renderImportPullRequest({ revision, results: mixed, entries: [] });
  assert.equal(title, 'docs(project): [TASK-283] importar el corte aaaaaaa de seguimientos');
  assert.match(body, /cambian los datos de seguimientos\. Avance, planificación y preguntas se reimportan sólo para conservar una misma revisión\./);
  assert.match(body, /\| `portal\/data\/project-progress\.json` \| importado: sólo cambia la revisión de origen \|/);
  assert.match(body, /\| `portal\/data\/project-follow-up\.json` \| importado: cambian sus datos \|/);
  validatePullRequest({ body, knownFiles });
});

test('published facts ignore the product revision and the GitHub observation time, nothing else', () => {
  const snapshot = { schemaVersion: 1, source: { revision: 'a'.repeat(40), path: 'x' }, issues: { observedAt: '2026-11-11T00:00:00Z', entries: [1] }, content: { a: 1 } };
  const moved = { ...snapshot, source: { ...snapshot.source, revision: 'b'.repeat(40) }, issues: { ...snapshot.issues, observedAt: '2026-11-11T01:00:00Z' } };
  assert.equal(publishedFacts(JSON.stringify(snapshot)), publishedFacts(JSON.stringify(moved)));
  assert.notEqual(publishedFacts(JSON.stringify(snapshot)), publishedFacts(JSON.stringify({ ...moved, content: { a: 2 } })));
  assert.notEqual(publishedFacts(JSON.stringify(snapshot)), publishedFacts(JSON.stringify({ ...moved, issues: { ...moved.issues, entries: [2] } })));
});

test('a PR without entries still passes the policy, and nothing imported renders no PR', () => {
  const { body } = renderImportPullRequest({ revision, results: results(['questions']), entries: [] });
  validatePullRequest({ body, knownFiles });
  assert.equal(validateChangelogOverride(body).entries.length, 1);
  assert.throws(() => renderImportPullRequest({ revision, results: results([]), entries: [] }), /Nothing was imported/);
  assert.throws(() => renderImportPullRequest({ revision: 'main', results: results(['questions']), entries: [] }), /full commit SHA/);
});

test('the client only reaches the import endpoints of this repository', async () => {
  const seen = [];
  const request = importClient({ token: 't', fetcher: async (url, init) => { seen.push(`${init.method} ${url}`); return { status: 200, json: async () => ({}) }; } });
  await request('GET', `repos/developer-implementos/pos-docs/pulls?state=open&base=main&head=developer-implementos:${importBranch}&per_page=100`);
  await request('PATCH', `repos/developer-implementos/pos-docs/git/refs/heads/${importBranch}`, { sha: base, force: true });
  for (const [method, url] of [
    ['PUT', 'repos/developer-implementos/pos-docs/pulls/1/merge'],
    ['PATCH', 'repos/developer-implementos/pos-docs/git/refs/heads/main'],
    ['DELETE', `repos/developer-implementos/pos-docs/git/refs/heads/${importBranch}`],
    ['GET', 'repos/developer-implementos/pos-platform/contents/delivery/progress.json'],
    ['POST', 'repos/developer-implementos/pos-docs/pulls/1/reviews'],
  ]) await assert.rejects(request(method, url), /outside the import allowlist/);
  assert.equal(seen.length, 2);
  assert.throws(() => importClient({}), /token/);
  assert.throws(() => botLogin('Not A Slug'), /App slug/);
});

/** An in-memory GitHub with one repository, enough for the import flow. */
function fakeGitHub({ pulls = [], branch = null } = {}) {
  const state = { pulls: [...pulls], branch, commits: new Map([[base, { tree: 'tree-base', parents: [] }]]), trees: 0, calls: [] };
  if (branch) state.commits.set(branch.sha, { tree: branch.tree, parents: [branch.parent], author: branch.author });
  const prefix = 'repos/developer-implementos/pos-docs/';
  const request = async (method, url, body) => {
    const local = url.slice(prefix.length);
    state.calls.push(`${method} ${local.split('?')[0]}`);
    if (method === 'GET' && local.startsWith('pulls?')) return { status: 200, value: state.pulls.filter(pull => pull.state === 'open') };
    if (method === 'GET' && local.startsWith('git/commits/')) {
      const commit = state.commits.get(local.slice('git/commits/'.length));
      return { status: 200, value: { tree: { sha: commit.tree }, parents: commit.parents.map(sha => ({ sha })) } };
    }
    if (method === 'GET' && local.startsWith('commits/')) {
      const commit = state.commits.get(local.slice('commits/'.length));
      return { status: 200, value: { author: { login: commit.author }, committer: { login: commit.author } } };
    }
    if (method === 'POST' && local === 'git/trees') { state.trees += 1; return { status: 201, value: { sha: `tree-${JSON.stringify(body.tree.map(item => [item.path, item.content]))}` } }; }
    if (method === 'GET' && local.startsWith('git/ref/')) return state.branch ? { status: 200, value: { object: { sha: state.branch.sha } } } : { status: 404, value: null };
    if (method === 'POST' && local === 'git/commits') {
      const sha = String(state.commits.size).padStart(40, 'c');
      state.commits.set(sha, { tree: body.tree, parents: body.parents, author: bot });
      return { status: 201, value: { sha } };
    }
    if (method === 'POST' && local === 'git/refs') { state.branch = { sha: body.sha }; return { status: 201, value: {} }; }
    if (method === 'PATCH' && local.startsWith('git/refs/')) { assert.equal(body.force, true); state.branch = { sha: body.sha }; return { status: 200, value: {} }; }
    if (method === 'POST' && local === 'pulls') {
      const pull = { number: 7, state: 'open', title: body.title, body: body.body, html_url: 'https://github.test/pull/7', user: { login: bot }, head: { repo: { full_name: 'developer-implementos/pos-docs' } } };
      state.pulls.push(pull);
      return { status: 201, value: pull };
    }
    if (method === 'PATCH' && local.startsWith('pulls/')) { Object.assign(state.pulls.find(pull => `pulls/${pull.number}` === local), body); return { status: 200, value: {} }; }
    if (method === 'POST' && local.endsWith('/comments')) return { status: 201, value: {} };
    throw new Error(`Unexpected ${method} ${local}`);
  };
  return { state, request };
}

const files = { 'portal/data/project-progress.json': '{"a":1}\n' };

test('the first import creates the bot branch and PR; an identical re-run changes nothing', async () => {
  const github = fakeGitHub();
  const first = await publishImport({ request: github.request, base, files, title: 'T', body: 'B', appSlug: slug });
  assert.deepEqual([first.branch, first.pullRequest], ['created', 'created']);
  const writes = github.state.calls.filter(call => !call.startsWith('GET') && call !== 'POST git/trees').length;
  const again = await publishImport({ request: github.request, base, files, title: 'T', body: 'B', appSlug: slug });
  assert.deepEqual([again.branch, again.pullRequest, again.head], ['unchanged', 'unchanged', first.head]);
  assert.equal(github.state.calls.filter(call => !call.startsWith('GET') && call !== 'POST git/trees').length, writes, 'An identical re-run writes nothing');
});

test('new facts force-update the bot branch and rewrite the same PR', async () => {
  const github = fakeGitHub();
  const first = await publishImport({ request: github.request, base, files, title: 'T', body: 'B', appSlug: slug });
  const next = await publishImport({ request: github.request, base, files: { 'portal/data/project-progress.json': '{"a":2}\n' }, title: 'T2', body: 'B2', appSlug: slug });
  assert.deepEqual([next.branch, next.pullRequest, next.pull], ['updated', 'updated', first.pull]);
  assert.notEqual(next.head, first.head);
  assert.equal(github.state.pulls.length, 1);
  assert.equal(github.state.pulls[0].title, 'T2');
});

test('a branch or PR that the App did not create is never overwritten or closed', async () => {
  const human = { number: 9, state: 'open', title: 'x', body: 'y', html_url: 'u', user: { login: 'someone' }, head: { repo: { full_name: 'developer-implementos/pos-docs' } } };
  await assert.rejects(publishImport({ request: fakeGitHub({ pulls: [human] }).request, base, files, title: 'T', body: 'B', appSlug: slug }), /was not opened by/);
  await assert.rejects(closeObsoleteImport({ request: fakeGitHub({ pulls: [human] }).request, appSlug: slug, revision }), /refusing to close/);
  const fork = { ...human, user: { login: bot }, head: { repo: { full_name: 'someone/pos-docs' } } };
  await assert.rejects(publishImport({ request: fakeGitHub({ pulls: [fork] }).request, base, files, title: 'T', body: 'B', appSlug: slug }), /was not opened by/);
  const foreignBranch = { sha: 'd'.repeat(40), tree: 'tree-x', parent: base, author: 'someone' };
  await assert.rejects(publishImport({ request: fakeGitHub({ branch: foreignBranch }).request, base, files, title: 'T', body: 'B', appSlug: slug }), /did not create/);
});

test('an obsolete bot PR is closed with a comment when main is already current', async () => {
  const github = fakeGitHub();
  await publishImport({ request: github.request, base, files, title: 'T', body: 'B', appSlug: slug });
  const closed = await closeObsoleteImport({ request: github.request, appSlug: slug, revision });
  assert.equal(closed.pullRequest, 'closed');
  assert.equal(github.state.pulls[0].state, 'closed');
  assert.equal(await closeObsoleteImport({ request: github.request, appSlug: slug, revision }), null);
});

function gitRepo(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-import-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const run = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  run('init', '-q', '-b', 'main');
  run('config', 'user.email', 'test@example.invalid');
  run('config', 'user.name', 'Test');
  run('config', 'core.autocrlf', 'false');
  for (const item of snapshots) {
    fs.mkdirSync(path.join(dir, path.dirname(item.path)), { recursive: true });
    fs.copyFileSync(path.join(root, item.path), path.join(dir, item.path));
  }
  run('add', '.');
  run('commit', '-q', '-m', 'snapshots');
  return { dir, run };
}

test('planning an import changes only stale snapshots and renders a policy-valid PR', t => {
  const { dir, run } = gitRepo(t);
  const questions = path.join(dir, 'portal/data/project-questions.json');
  const write = () => fs.writeFileSync(questions, JSON.stringify({ ...JSON.parse(fs.readFileSync(questions, 'utf8')), touched: true }, null, 2) + '\n');
  const fakes = snapshots.map(item => fakeImporter(item.name, item.name === 'questions' ? { stale: true, onWrite: write } : {}).importer);
  const plan = planImport({ root: dir, workspace: '.', importers: fakes });
  assert.equal(plan.status, 'stale');
  assert.equal(plan.base, run('rev-parse', 'HEAD').trim());
  assert.deepEqual(Object.keys(plan.files), ['portal/data/project-questions.json']);
  assert.deepEqual(plan.entries, []);
  assert.match(plan.title, /de preguntas$/);
});

test('a new product revision without new facts publishes nothing and leaves the checkout clean', t => {
  const { dir, run } = gitRepo(t);
  const moveRevision = name => () => {
    const file = path.join(dir, snapshots.find(item => item.name === name).path);
    const snapshot = JSON.parse(fs.readFileSync(file, 'utf8'));
    snapshot.source.revision = 'f'.repeat(40);
    if (snapshot.issues) snapshot.issues.observedAt = '2099-01-01T00:00:00.000Z';
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + '\n');
  };
  const fakes = snapshots.map(item => fakeImporter(item.name, { stale: true, onWrite: moveRevision(item.name) }).importer);
  const plan = planImport({ root: dir, workspace: '.', importers: fakes });
  assert.deepEqual([plan.status, plan.reason], ['current', 'revision']);
  assert.equal(run('status', '--porcelain'), '', 'The discarded import leaves no change behind');
});

test('current snapshots plan nothing; a dirty checkout or an unexpected file aborts', t => {
  const { dir } = gitRepo(t);
  const current = snapshots.map(item => fakeImporter(item.name).importer);
  assert.equal(planImport({ root: dir, workspace: '.', importers: current }).status, 'current');
  const stray = snapshots.map(item => fakeImporter(item.name, item.name === 'planning' ? { stale: true, onWrite: () => fs.writeFileSync(path.join(dir, 'stray.txt'), 'x') } : {}).importer);
  assert.throws(() => planImport({ root: dir, workspace: '.', importers: stray }), /other than the imported snapshots/);
  assert.throws(() => planImport({ root: dir, workspace: '.', importers: current }), /must be clean/);
});
