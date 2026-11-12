import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { progressContentHash } from '../portal/progress.mjs';
import { productRepository } from '../portal/follow-up.mjs';
import { rulesContentHash } from '../portal/rules.mjs';
import { parseRulesArguments, syncProjectRules } from './sync-project-rules.mjs';
import { isolateFromInvokingRepository } from './git-isolation.mjs';

// Sin esto, un hook o `git rebase --exec` haría que sus fixtures actuaran sobre el repositorio que la lanza.
isolateFromInvokingRepository();

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const json = value => JSON.stringify(value, null, 2) + '\n';
function write(root, relative, content) {
  const destination = path.join(root, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content, 'utf8');
}
function initialize(root) {
  fs.mkdirSync(root);
  git(root, 'init', '-q');
  git(root, 'config', 'core.autocrlf', 'false');
  git(root, 'config', 'user.name', 'Rules fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'commit.gpgsign', 'false');
}
function commit(root, message = 'Synthetic source') {
  git(root, 'add', '.');
  git(root, 'commit', '-qm', message);
  return git(root, 'rev-parse', 'HEAD');
}
const links = (fields = {}) => ({ questions: [], parity: [], claims: [], followUps: [], issues: [], related: [], ...fields });
const rule = (id, fields = {}) => ({
  id, area: id.slice(0, 3), title: 'Tope de monto para boleta', origin: 'catalogo', sourceArtifacts: ['A1'], type: 'validacion', layer: 'frontend',
  criticality: 'alta', kind: 'capacidad', disclosure: 'public', workPackage: 'F01-10',
  legacy: { behavior: 'Comportamiento observado en el legacy.', condition: null, observations: 'Detalle privado del legacy.', verification: 'CONFIRMADO', note: null, evidence: [{ repository: 'mountain-implementos', path: 'backend/app/venta.js', lines: '1-9' }] },
  businessQuestion: null, artifacts: { catalog: null, closure: null, answers: null, management: null },
  posPlatform: { specified: { state: 'no-verificado', refs: [] }, implemented: { state: 'no-verificado', refs: [] }, tested: { state: 'no-verificado', refs: [] }, note: null },
  decider: 'Comercial', links: links({ questions: ['Q-01'], parity: ['P-14'] }), reviewedOn: '2026-11-12', ...fields,
});
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-rules-import-'));
  t.after(() => {
    const resolved = fs.realpathSync(base);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('pos-rules-import-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const root = path.join(base, 'docs');
  const workspace = path.join(base, 'product');
  initialize(root);
  initialize(workspace);
  git(workspace, 'remote', 'add', 'origin', `${productRepository}.git`);
  const roadmapSource = json({ schemaVersion: 3, phases: [{ id: 'phase-01', title: 'Venta', delivery: { work: [{ id: 'F01-10', title: 'Cupones', apps: ['branch-api'] }] } }] });
  write(root, 'docs/roadmap.json', roadmapSource);
  const progressContent = {
    schemaVersion: 2, reviewedOn: '2026-11-02', productRevision: 'source',
    scope: { repository: 'https://github.com/developer-implementos/pos-docs', revision: 'a'.repeat(40), path: 'docs/roadmap.json', sha256: createHash('sha256').update(roadmapSource).digest('hex') },
    summary: 'Entregables pendientes.', applications: [{ id: 'branch-api', stage: 'planned', summary: 'Pendiente.', nextStep: 'Implementar.', evidence: [] }],
    workPackages: [{ id: 'F01-10', apps: ['branch-api'], status: 'not_started', summary: 'Pendiente de implementación.', verification: null, acceptance: null }],
  };
  write(root, 'portal/data/project-progress.json', json({ schemaVersion: 1, source: { repository: productRepository, revision: 'b'.repeat(40), path: 'delivery/progress.json', sha256: progressContentHash(progressContent) }, content: progressContent }));
  const content = {
    schemaVersion: 2, reviewedOn: '2026-11-12', audit: 'delivery/reviews/pos-parity-2026-11-10', areas: { CAJ: 'Caja', VEN: 'Venta' },
    legacyRevisions: { 'mountain-implementos': 'f57d5900' }, posPlatformRevision: 'c'.repeat(40),
    sourceArtifacts: [{ id: 'A1', title: 'Catálogo', date: '2026-11-08', use: 'Origen.' }], contradictions: [],
    rules: [rule('CAJ-095', { title: 'Credenciales en el ejemplo de entorno', type: 'seguridad', kind: 'defecto', disclosure: 'internal', workPackage: null, links: links() }), rule('VEN-001')],
  };
  write(workspace, 'delivery/business-rules.json', json(content));
  const revision = commit(workspace);
  git(workspace, 'update-ref', 'refs/remotes/origin/main', revision);
  return { root, workspace, content, revision, destination: path.join(root, 'portal/data/project-rules.json') };
}
function change(item, mutate) {
  const content = structuredClone(item.content);
  mutate(content);
  write(item.workspace, 'delivery/business-rules.json', json(content));
  return commit(item.workspace, 'Change rules');
}

test('imports only the projection, with immutable provenance of the full register', t => {
  const item = fixture(t);
  const result = syncProjectRules(item);
  const serialized = fs.readFileSync(item.destination, 'utf8');
  const snapshot = JSON.parse(serialized);
  assert.equal(result.changed, true);
  assert.deepEqual([result.total, result.public, result.internal, result.included], [2, 1, 1, true]);
  assert.deepEqual(Object.keys(snapshot), ['schemaVersion', 'source', 'integration', 'sha256', 'register']);
  assert.deepEqual(snapshot.source, { repository: productRepository, revision: item.revision, path: 'delivery/business-rules.json' });
  assert.equal(snapshot.sha256, rulesContentHash(snapshot.register));
  assert.deepEqual(snapshot.register.rules[0], { id: 'CAJ-095', area: 'CAJ', disclosure: 'internal', workPackage: null, questions: [] });
  for (const text of ['Credenciales en el ejemplo', 'Detalle privado', 'backend/app', 'Comercial', 'f57d5900']) assert.ok(!serialized.includes(text), `"${text}" stays in the product`);
  assert.equal(syncProjectRules({ ...item, check: true }).changed, false);
  assert.equal(syncProjectRules(item).changed, false, 'An unchanged source keeps the snapshot');
  assert.equal(fs.readFileSync(item.destination, 'utf8'), serialized);
});

test('a change that stays in the product only moves the revision; the published hash keeps', t => {
  const item = fixture(t);
  syncProjectRules(item);
  const before = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  change(item, content => { content.rules[1].legacy.observations = 'Otra observación privada.'; });
  git(item.workspace, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.throws(() => syncProjectRules({ ...item, check: true }), /snapshot is stale/, 'The new revision identifies the source');
  syncProjectRules(item);
  const after = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  assert.notEqual(after.source.revision, before.source.revision);
  assert.equal(after.sha256, before.sha256, 'Nothing published changed, so the automation does not open a PR for it');
  assert.ok(!JSON.stringify(after).includes('Otra observación'));
});

test('rejects a register that would publish what must stay internal', t => {
  const item = fixture(t);
  const cases = [
    [content => { content.rules[0].disclosure = 'public'; }, /a security rule or a legacy defect is internal/],
    [content => { content.rules[1].title = 'Validación sólo en el navegador (frontend)'; }, /discloses a weak control/],
    [content => { content.rules[1].workPackage = 'F09-01'; }, /unknown package F09-01 in the POS Docs roadmap/],
    [content => { content.schemaVersion = 1; }, /unsupported schema version; expected 2/],
  ];
  for (const [mutate, pattern] of cases) {
    change(item, mutate);
    git(item.workspace, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    assert.throws(() => syncProjectRules(item), pattern);
    assert.equal(fs.existsSync(item.destination), false, 'A rejected register is never written');
  }
});

test('identifies a published revision that main does not contain yet and rejects unpublished or dirty sources', t => {
  const item = fixture(t);
  const branch = change(item, content => { content.rules[1].title = 'Tope de monto para boleta a cliente anónimo'; });
  assert.throws(() => syncProjectRules(item), /Push the revision/);
  git(item.workspace, 'update-ref', 'refs/remotes/origin/work/rules', branch);
  assert.equal(syncProjectRules(item).included, false);
  write(item.workspace, 'untracked.txt', 'not reviewed');
  assert.throws(() => syncProjectRules(item), /Commit or resolve product changes/);
  fs.unlinkSync(path.join(item.workspace, 'untracked.txt'));
  git(item.workspace, 'remote', 'set-url', 'origin', 'https://github.com/example/other.git');
  assert.throws(() => syncProjectRules(item), /corporate POS Platform/);
});

test('parses only explicit supported options', () => {
  assert.deepEqual(parseRulesArguments(['--workspace', '../pos-platform', '--check']), { workspace: '../pos-platform', check: true });
  for (const args of [[], ['--check'], ['--workspace'], ['--workspace', 'repo', '--unknown'], ['--workspace', 'repo', '--check', '--check']]) {
    assert.throws(() => parseRulesArguments(args), /Usage/);
  }
});
