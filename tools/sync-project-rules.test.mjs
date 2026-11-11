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

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const json = value => JSON.stringify(value, null, 2) + '\n';
const audit = 'delivery/reviews/pos-parity-2026-11-10';
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
const rule = (id, fields = {}) => ({
  id, area: id.slice(0, 3), title: `Regla ${id}`, origin: 'catalogo', sourceArtifacts: ['A1'], type: 'validacion', layer: 'ambos', criticality: 'alta', kind: 'capacidad', workPackage: 'F01-10',
  legacy: { behavior: 'Rechaza boletas sobre un monto fijo.', condition: null, observations: null, verification: 'CONFIRMADO', note: null, evidence: [{ repository: 'mountain-implementos', path: 'frontend/src/app/ejemplo.ts', lines: '10-20' }] },
  businessQuestion: null, artifacts: { catalog: null, closure: null, answers: null, management: null },
  posPlatform: { specified: { state: 'no-verificado', refs: [] }, implemented: { state: 'si', refs: ['libs/ejemplo/regla.ts#L3'] }, tested: { state: 'no', refs: [] }, note: null },
  decider: 'Producto', links: { questions: ['Q-01'], parity: ['P-14'], claims: ['C-30'], followUps: ['FOLLOWUP-005'], issues: [], related: [] }, reviewedOn: '2026-11-11', ...fields,
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
    schemaVersion: 1, reviewedOn: '2026-11-11', audit, areas: { VEN: 'Venta' }, legacyRevisions: { 'mountain-implementos': 'f57d5900' }, posPlatformRevision: 'cab44e4',
    sourceArtifacts: [{ id: 'A1', title: 'Catálogo', date: '2026-11-08', use: 'Origen de las reglas.' }], contradictions: [], rules: [rule('VEN-001')],
  };
  write(workspace, 'delivery/business-rules.json', json(content));
  write(workspace, 'delivery/business-questions.json', json({ schemaVersion: 1, items: [{ id: 'Q-01', state: 'open' }] }));
  write(workspace, 'delivery/backlog.json', json({ schemaVersion: 1, items: [{ id: 'F01-10' }] }));
  write(workspace, 'delivery/follow-ups.json', json({ schemaVersion: 1, items: [{ id: 'FOLLOWUP-005' }] }));
  write(workspace, `${audit}/afirmaciones.csv`, 'id,afirmacion\nC-30,Cupón\n');
  write(workspace, `${audit}/paridad.csv`, 'id,capacidad\nP-14,Cupones\n');
  write(workspace, 'libs/ejemplo/regla.ts', 'export const regla = 1;\n');
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

test('imports the reviewed register with immutable provenance and its integration in main', t => {
  const item = fixture(t);
  const result = syncProjectRules(item);
  const snapshot = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  assert.equal(result.changed, true);
  assert.deepEqual(snapshot.source, { repository: productRepository, revision: item.revision, path: 'delivery/business-rules.json', sha256: rulesContentHash(item.content) });
  assert.deepEqual(snapshot.integration, { reference: 'main', included: true });
  assert.deepEqual([result.total, result.open, result.resolved], [1, 1, 0]);
  assert.equal(syncProjectRules({ ...item, check: true }).changed, false);
});

test('identifies a published revision outside main and rejects an unpublished one', t => {
  const item = fixture(t);
  const revision = change(item, content => { content.rules[0].title = 'Regla revisada'; });
  assert.throws(() => syncProjectRules(item), /Push the revision/);
  git(item.workspace, 'update-ref', 'refs/remotes/origin/work/task-1-reglas', revision);
  assert.equal(syncProjectRules(item).included, false);
});

test('validates with the product context at the imported revision', t => {
  const item = fixture(t);
  change(item, content => { content.rules[0].links.questions = ['Q-99']; });
  git(item.workspace, 'update-ref', 'refs/remotes/origin/main', git(item.workspace, 'rev-parse', 'HEAD'));
  assert.throws(() => syncProjectRules(item), /Q-99 is not in the questions register/);
  change(item, content => { content.rules[0].posPlatform.implemented.refs = ['libs/ejemplo/otra.ts']; });
  git(item.workspace, 'update-ref', 'refs/remotes/origin/main', git(item.workspace, 'rev-parse', 'HEAD'));
  assert.throws(() => syncProjectRules(item), /is not a repository file/);
});

test('rejects a dirty product checkout, a foreign remote and a stale published snapshot', t => {
  const item = fixture(t);
  syncProjectRules(item);
  write(item.workspace, 'nota.txt', 'sin confirmar\n');
  assert.throws(() => syncProjectRules(item), /Commit or resolve product changes/);
  fs.rmSync(path.join(item.workspace, 'nota.txt'));
  const revision = change(item, content => { content.rules[0].title = 'Regla cambiada'; });
  git(item.workspace, 'update-ref', 'refs/remotes/origin/main', revision);
  assert.throws(() => syncProjectRules({ ...item, check: true }), /stale/);
  git(item.workspace, 'remote', 'set-url', 'origin', 'https://github.com/otra/organizacion.git');
  assert.throws(() => syncProjectRules(item), /corporate POS Platform repository/);
});

test('parses only the documented arguments', () => {
  assert.deepEqual(parseRulesArguments(['--workspace', '../pos-platform', '--check']), { workspace: '../pos-platform', check: true });
  assert.throws(() => parseRulesArguments(['--check']), /Usage/);
  assert.throws(() => parseRulesArguments(['--workspace', 'a', '--otro']), /Usage/);
});
