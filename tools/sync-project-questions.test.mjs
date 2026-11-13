import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadProgress, progressContentHash } from '../portal/progress.mjs';
import { productRepository } from '../portal/follow-up.mjs';
import { deriveQuestions, questionsContentHash } from '../portal/questions.mjs';
import { parseQuestionsArguments, syncProjectQuestions } from './sync-project-questions.mjs';
import { isolateFromInvokingRepository } from './git-isolation.mjs';

// Sin esto, un hook o `git rebase --exec` haría que sus fixtures actuaran sobre el repositorio que la lanza.
isolateFromInvokingRepository();

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
  git(root, 'config', 'user.name', 'Questions fixture');
  git(root, 'config', 'user.email', 'fixture@example.invalid');
  git(root, 'config', 'commit.gpgsign', 'false');
}
function commit(root, message = 'Synthetic source') {
  git(root, 'add', '.');
  git(root, 'commit', '-qm', message);
  return git(root, 'rev-parse', 'HEAD');
}
const question = (id, fields = {}) => ({
  id, topic: 'Cupones', question: `¿Pregunta ${id}?`, kind: 'rule', state: 'open',
  currentAnswer: 'Legacy: el campo de cupón se deshabilita con cualquier línea de OV.', answerSources: ['code'],
  auditRefs: ['C-30'], parityRefs: ['P-14'], sources: [], decider: 'comercial', consulted: [], owner: null, followUp: 'FOLLOWUP-005',
  workPackages: ['F01-10'], priority: 'P1', reviewedOn: '2026-11-10', recommendation: null, decision: null, ...fields,
});
const decision = { answer: 'Sí: la autorización se exige en servidor para cada acción (F01-01)', decidedBy: 'Producto', decidedOn: '2026-11-10', source: 'Ficha F01-01 del producto', outcome: null };
const roles = [
  { key: 'comercial', name: 'Comercial', responsibility: 'Precios, promociones, cupones y clientes' },
  { key: 'producto', name: 'Producto POS Platform', responsibility: 'Alcance y comportamiento del producto' },
];
/** The fixture registry in schema 3, as POS Platform published it before schema 4. */
const schema3 = ({ roles: catalog, merged, ...content }) => ({
  ...structuredClone(content),
  schemaVersion: 3,
  items: content.items.map(({ consulted, ...item }) => ({ ...structuredClone(item), decider: catalog.find(role => role.key === item.decider).name })),
});
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-questions-import-'));
  t.after(() => {
    const resolved = fs.realpathSync(base);
    assert.equal(path.dirname(resolved), fs.realpathSync(os.tmpdir()));
    assert.ok(path.basename(resolved).startsWith('pos-questions-import-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const root = path.join(base, 'docs');
  const workspace = path.join(base, 'product');
  initialize(root);
  initialize(workspace);
  git(workspace, 'remote', 'add', 'origin', `${productRepository}.git`);
  const roadmap = { schemaVersion: 3, phases: [{ id: 'phase-01', title: 'Venta', delivery: { work: [{ id: 'F01-01', title: 'Identidad', apps: ['branch-api'] }, { id: 'F01-10', title: 'Cupones', apps: ['branch-api'] }] } }] };
  const roadmapSource = json(roadmap);
  write(root, 'docs/roadmap.json', roadmapSource);
  const progressContent = {
    schemaVersion: 2, reviewedOn: '2026-11-02', productRevision: 'source',
    scope: { repository: 'https://github.com/developer-implementos/pos-docs', revision: 'a'.repeat(40), path: 'docs/roadmap.json', sha256: createHash('sha256').update(roadmapSource).digest('hex') },
    summary: 'Entregables pendientes.', applications: [{ id: 'branch-api', stage: 'planned', summary: 'Pendiente.', nextStep: 'Implementar.', evidence: [] }],
    workPackages: ['F01-01', 'F01-10'].map(id => ({ id, apps: ['branch-api'], status: 'not_started', summary: 'Pendiente de implementación.', verification: null, acceptance: null })),
  };
  write(root, 'portal/data/project-progress.json', json({ schemaVersion: 1, source: { repository: productRepository, revision: 'b'.repeat(40), path: 'delivery/progress.json', sha256: progressContentHash(progressContent) }, content: progressContent }));
  const content = {
    schemaVersion: 4, reviewedOn: '2026-11-10', audit, roles: structuredClone(roles),
    items: [question('Q-01'), question('Q-02', { state: 'decided', answerSources: ['spec'], sources: ['delivery/specs/F01-01.md#L3'], decider: 'producto', followUp: null, workPackages: ['F01-01'], decision })],
    merged: [],
  };
  write(workspace, 'delivery/business-questions.json', json(content));
  write(workspace, 'delivery/backlog.json', json({ schemaVersion: 1, items: [{ id: 'F01-01' }, { id: 'F01-10' }, { id: 'F09-01' }] }));
  write(workspace, 'delivery/follow-ups.json', json({ schemaVersion: 1, reviewedOn: '2026-11-10', items: [{ id: 'FOLLOWUP-005' }] }));
  write(workspace, `${audit}/afirmaciones.csv`, 'id,afirmacion\nC-30,"El cupón se deshabilita, con OV"\n');
  write(workspace, `${audit}/paridad.csv`, 'id,capacidad\nP-14,Cupones\n');
  write(workspace, 'delivery/specs/F01-01.md', '# F01-01\n\nAutorización en servidor.\n');
  const revision = commit(workspace);
  git(workspace, 'update-ref', 'refs/remotes/origin/main', revision);
  return { root, workspace, content, revision, destination: path.join(root, 'portal/data/project-questions.json') };
}
function change(item, mutate) {
  const content = structuredClone(item.content);
  mutate(content);
  write(item.workspace, 'delivery/business-questions.json', json(content));
  return commit(item.workspace, 'Change questions');
}

test('imports the reviewed registry with immutable provenance and its integration in main', t => {
  const item = fixture(t);
  const result = syncProjectQuestions(item);
  const serialized = fs.readFileSync(item.destination, 'utf8');
  const snapshot = JSON.parse(serialized);
  assert.equal(result.changed, true);
  assert.deepEqual(Object.keys(snapshot), ['schemaVersion', 'source', 'integration', 'content']);
  assert.deepEqual(snapshot.source, { repository: productRepository, revision: item.revision, path: 'delivery/business-questions.json', sha256: questionsContentHash(item.content) });
  assert.deepEqual(snapshot.integration, { reference: 'main', included: true });
  assert.deepEqual(snapshot.content, item.content);
  assert.deepEqual([result.total, result.open, result.included], [2, 1, true]);
  const model = deriveQuestions(snapshot, loadProgress(item.root));
  assert.deepEqual([model.counts.decided, model.counts.pendingDecision], [1, 1]);
  assert.deepEqual(model.items.find(entry => entry.id === 'Q-02').decision, decision);
  assert.equal(syncProjectQuestions({ ...item, check: true }).changed, false);
  assert.equal(syncProjectQuestions(item).changed, false, 'An unchanged source keeps the snapshot');
  assert.equal(fs.readFileSync(item.destination, 'utf8'), serialized);
});

test('imports the roles and the merged questions, with the product rules of both', t => {
  const item = fixture(t);
  const v4 = content => {
    content.merged = [{ id: 'Q-03', question: '¿El cupón aplica a toda la cesta?', into: 'Q-01', mergedOn: '2026-11-10', reason: 'Pregunta lo mismo que Q-01.' }];
    content.items[0].consulted = ['producto'];
  };
  const revision = change(item, v4);
  git(item.workspace, 'update-ref', 'refs/remotes/origin/main', revision);
  const result = syncProjectQuestions(item);
  const snapshot = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  assert.equal(snapshot.content.schemaVersion, 4);
  assert.deepEqual([result.total, result.open], [2, 1], 'A merged question is not a record of the register');
  const model = deriveQuestions(snapshot, loadProgress(item.root));
  assert.deepEqual(model.items.find(entry => entry.id === 'Q-01').consultedNames, ['Producto POS Platform']);
  assert.deepEqual(model.merged.map(entry => [entry.id, entry.into]), [['Q-03', 'Q-01']]);
  const broken = change(item, content => { v4(content); content.merged[0].into = 'Q-09'; });
  git(item.workspace, 'update-ref', 'refs/remotes/origin/main', broken);
  assert.throws(() => syncProjectQuestions(item), /Q-03\.into: expected a question of the register/);
});

test('identifies a published revision that main does not contain yet and rejects unpublished ones', t => {
  const item = fixture(t);
  const branch = change(item, content => { content.items[0].question = '¿La exclusión del cupón aplica a toda cesta con OV?'; });
  assert.throws(() => syncProjectQuestions(item), /Push the revision/);
  git(item.workspace, 'update-ref', 'refs/remotes/origin/work/questions', branch);
  const result = syncProjectQuestions(item);
  const snapshot = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  assert.equal(result.included, false);
  assert.deepEqual(snapshot.integration, { reference: 'main', included: false });
  assert.equal(snapshot.source.revision, branch);
  git(item.workspace, 'update-ref', 'refs/remotes/origin/main', branch);
  assert.throws(() => syncProjectQuestions({ ...item, check: true }), /snapshot is stale/, 'Integrating the same revision changes what the view must say');
  git(item.workspace, 'update-ref', '-d', 'refs/remotes/origin/main');
  assert.throws(() => syncProjectQuestions(item), /origin\/main/);
});

test('validates the registry with the product rules before writing', t => {
  const item = fixture(t);
  const cases = [
    [content => { content.items[0].followUp = 'FOLLOWUP-099'; }, /expected null or a follow-up in delivery\/follow-ups\.json/],
    [content => { content.items[0].auditRefs = ['C-99']; }, /C-99 is not in .*afirmaciones\.csv/],
    [content => { content.items[0].parityRefs = ['P-99']; }, /P-99 is not in .*paridad\.csv/],
    [content => { content.items[1].sources = ['delivery/specs/F01-99.md']; }, /is not a repository file/],
    [content => { content.items[0].sources = ['tmp/private/evidencia.md']; }, /tmp\//],
    [content => { content.items[0].workPackages = ['F09-02']; }, /unknown package F09-02 in delivery\/backlog\.json/],
    [content => { content.items[0].workPackages = ['F09-01']; }, /unknown package F09-01 in the POS Docs roadmap/],
    [content => { content.items[0].currentAnswer = 'Responde en 10.0.4.17 desde la sucursal.'; }, /private IPv4 address; POS Docs publishes this text/],
    [content => { content.audit = 'delivery/reviews/otro-corte'; }, /audit register not found/],
    [content => { content.schemaVersion = 1; for (const question of content.items) { delete question.recommendation; delete question.decision; } }, /questions: unsupported schema version; expected 4/],
    [content => { content.items[1].decision = null; }, /Q-02: a decided record must declare its decision/],
    [content => { content.items[1].decision.source = 'https://docs.example.com/actas/2026-11-10'; }, /Q-02\.decision\.source: cite the decision document by name and date; it is not linked/],
    [content => { content.items[1].decision.outcome = 'adopted'; }, /Q-02\.decision\.outcome: null when there was no recommendation/],
  ];
  for (const [mutate, pattern] of cases) {
    change(item, mutate);
    git(item.workspace, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    assert.throws(() => syncProjectQuestions(item), pattern);
    assert.equal(fs.existsSync(item.destination), false, 'A rejected registry is never written');
  }
});

test('imports the agent recommendation and checks its sources at the product revision', t => {
  const item = fixture(t);
  const recommendation = {
    answer: 'Exigir la autorización en servidor para cada acción.', scope: 'core', default: null,
    rationale: 'Es un invariante del producto en todos los países.', basis: ['architecture', 'regulation'],
    references: [{ label: 'SEE del contribuyente', url: 'https://cpe.sunat.gob.pe/sistema_emision/see_contribuyente' }],
    sources: ['delivery/specs/F01-01.md#L3'], agent: 'Claude Code · TASK-314', proposedOn: '2026-11-10',
  };
  const upgrade = content => {
    content.items[0].recommendation = recommendation;
  };
  change(item, upgrade);
  git(item.workspace, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.equal(syncProjectQuestions(item).changed, true);
  const snapshot = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  assert.equal(snapshot.content.schemaVersion, 4);
  assert.deepEqual(snapshot.content.items[0].recommendation, recommendation);
  assert.equal(snapshot.source.sha256, questionsContentHash(snapshot.content));
  change(item, content => { upgrade(content); content.items[0].recommendation.sources = ['delivery/specs/F01-99.md']; });
  git(item.workspace, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.throws(() => syncProjectQuestions(item), /Q-01\.recommendation\.sources\[0\]: delivery\/specs\/F01-99\.md is not a repository file/);
  assert.deepEqual(JSON.parse(fs.readFileSync(item.destination, 'utf8')), snapshot, 'A rejected registry keeps the previous snapshot');
});

test('rejects a schema 3 registry and keeps the previous snapshot', t => {
  const item = fixture(t);
  assert.equal(syncProjectQuestions(item).changed, true);
  const snapshot = JSON.parse(fs.readFileSync(item.destination, 'utf8'));
  change(item, content => {
    const legacy = schema3(content);
    for (const key of Object.keys(content)) delete content[key];
    Object.assign(content, legacy);
  });
  git(item.workspace, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.throws(() => syncProjectQuestions(item), /questions: unsupported schema version; expected 4/);
  assert.deepEqual(JSON.parse(fs.readFileSync(item.destination, 'utf8')), snapshot, 'A rejected registry keeps the previous snapshot');
});

test('rejects dirty and foreign source worktrees and keeps the previous snapshot on a failed check', t => {
  const item = fixture(t);
  write(item.workspace, 'untracked.txt', 'not reviewed');
  assert.throws(() => syncProjectQuestions(item), /Commit or resolve product changes/);
  fs.unlinkSync(path.join(item.workspace, 'untracked.txt'));
  git(item.workspace, 'remote', 'set-url', 'origin', 'https://github.com/example/other.git');
  assert.throws(() => syncProjectQuestions(item), /corporate POS Platform/);
  git(item.workspace, 'remote', 'set-url', 'origin', `${productRepository}.git`);
  assert.throws(() => syncProjectQuestions({ ...item, workspace: path.join(item.workspace, 'delivery') }), /root of the product checkout/);
  assert.throws(() => syncProjectQuestions({ ...item, check: true }), /snapshot is stale/);
  assert.equal(fs.existsSync(item.destination), false, 'A check never writes');
  syncProjectQuestions(item);
  const previous = fs.readFileSync(item.destination, 'utf8');
  change(item, content => { content.items[0].state = 'decided'; content.items[0].decision = { ...decision, answer: 'Confirmada por Comercial.', decidedBy: 'Comercial', source: 'Acta de decisiones comerciales del 10 de noviembre de 2026' }; });
  git(item.workspace, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  assert.throws(() => syncProjectQuestions({ ...item, check: true }), /snapshot is stale/);
  assert.equal(fs.readFileSync(item.destination, 'utf8'), previous);
  assert.equal(syncProjectQuestions(item).changed, true);
});

test('parses only explicit supported options', () => {
  assert.deepEqual(parseQuestionsArguments(['--workspace', 'C:/clean checkout', '--check']), { workspace: 'C:/clean checkout', check: true });
  assert.deepEqual(parseQuestionsArguments(['--check', '--workspace', '../pos-platform']), { workspace: '../pos-platform', check: true });
  for (const args of [[], ['--check'], ['--workspace'], ['--workspace', '--check'], ['--workspace', 'repo', '--unknown'], ['--workspace', 'repo', '--check', '--check']]) {
    assert.throws(() => parseQuestionsArguments(args), /Usage/);
  }
});
