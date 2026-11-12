import assert from 'node:assert/strict';
import test from 'node:test';
import { productRepository } from './follow-up.mjs';
import { decisionOf, deriveRules, projectRules, rulesContentHash, validateRulesRegister } from './rules.mjs';

const revision = 'c'.repeat(40);
// A rule as POS Platform registers it, with the private fields the projection must leave out.
const sourceRule = (id, fields = {}) => ({
  id,
  area: id.slice(0, 3),
  title: 'Tope de monto para boleta',
  origin: 'catalogo',
  sourceArtifacts: ['A1'],
  type: 'validacion',
  layer: 'frontend',
  criticality: 'alta',
  kind: 'capacidad',
  disclosure: 'public',
  workPackage: 'F01-08',
  legacy: {
    behavior: 'Rechaza boletas sobre un monto fijo en el código.',
    condition: 'monto > tope',
    observations: 'Sólo en el navegador; el servidor acepta cualquier monto.',
    verification: 'CONFIRMADO',
    note: 'Controlador 10-20.',
    evidence: [{ repository: 'mountain-implementos', path: 'frontend/src/app/venta.ts', lines: '10-20' }],
  },
  businessQuestion: '¿Cuál es el tope de la boleta?',
  artifacts: { catalog: { coverage: 'parcial', gap: 'Brecha.', posPlatformNote: null }, closure: { action: 'Cerrar en F01', targetPhase: 'F01', scope: 'Núcleo', priority: 'Bloquea cierre F01', acceptanceCriterion: 'Dado un tope…' }, answers: null, management: null },
  posPlatform: { specified: { state: 'no-verificado', refs: [] }, implemented: { state: 'parcial', refs: ['libs/sales/src/limit.ts#L4'] }, tested: { state: 'no-verificado', refs: [] }, note: 'El tope es configurable.' },
  decider: 'Comercial',
  links: { questions: ['Q-01'], parity: ['P-16'], claims: ['C-30'], followUps: ['FOLLOWUP-005'], issues: [12], related: [] },
  reviewedOn: '2026-11-12',
  ...fields,
});
const source = (rules = [sourceRule('VEN-001'), sourceRule('CAJ-095', { type: 'seguridad', kind: 'defecto', disclosure: 'internal', title: 'Credenciales en el ejemplo de entorno', workPackage: null, links: { questions: [], parity: [], claims: [], followUps: [], issues: [], related: [] } })]) => ({
  schemaVersion: 2,
  reviewedOn: '2026-11-12',
  audit: 'delivery/reviews/pos-parity-2026-11-10',
  areas: { CAJ: 'Caja', VEN: 'Venta' },
  legacyRevisions: { 'mountain-implementos': 'f57d5900' },
  posPlatformRevision: 'a'.repeat(40),
  sourceArtifacts: [{ id: 'A1', title: 'Catálogo', date: '2026-11-08', use: 'Origen.' }],
  contradictions: [{ id: 'X-01', rules: ['VEN-001'], state: 'open', resolution: null, summary: 'Dos fuentes difieren.' }],
  rules,
});
const progress = {
  phases: [{ id: 'phase-01', title: 'Venta', href: '/project/work/?phase=phase-01' }],
  workPackages: [{ id: 'F01-08', phase: 'phase-01', title: 'Clientes' }],
};
const questionsModel = (items = [{ id: 'Q-01', kind: 'rule', state: 'open' }], questionRevision = revision) => ({ source: { revision: questionRevision }, items });
const snapshot = content => {
  const register = projectRules(content);
  return { schemaVersion: 1, source: { repository: productRepository, revision, path: 'delivery/business-rules.json' }, integration: { reference: 'main', included: true }, sha256: rulesContentHash(register), register };
};

test('publishes a closed list of fields: an index for internal rules and no evidence for any rule', () => {
  const register = projectRules(source());
  const [pub, internal] = register.rules;
  assert.deepEqual(Object.keys(register), ['schemaVersion', 'reviewedOn', 'posPlatformRevision', 'areas', 'rules']);
  assert.deepEqual(pub, {
    id: 'VEN-001', area: 'VEN', disclosure: 'public', workPackage: 'F01-08', questions: ['Q-01'],
    title: 'Tope de monto para boleta', type: 'validacion', kind: 'capacidad', criticality: 'alta', origin: 'catalogo',
    legacyVerification: 'CONFIRMADO', posPlatform: { specified: 'no-verificado', implemented: 'parcial', tested: 'no-verificado' },
    parity: ['P-16'], followUps: ['FOLLOWUP-005'],
  });
  assert.deepEqual(internal, { id: 'CAJ-095', area: 'CAJ', disclosure: 'internal', workPackage: null, questions: [] });
  const published = JSON.stringify(register);
  for (const secret of ['Sólo en el navegador', 'Controlador 10-20', 'frontend/src', 'Credenciales en el ejemplo', '¿Cuál es el tope', 'Bloquea cierre', 'El tope es configurable', 'libs/sales', 'Comercial', 'Dos fuentes', 'mountain-implementos']) {
    assert.ok(!published.includes(secret), `The projection leaves "${secret}" in the product`);
  }
});

test('fails closed on classification the product should have enforced', () => {
  const rejects = (rule, pattern) => assert.throws(() => projectRules(source([rule])), pattern);
  rejects(sourceRule('VEN-001', { type: 'seguridad' }), /a security rule or a legacy defect is internal/);
  rejects(sourceRule('VEN-001', { kind: 'defecto' }), /a security rule or a legacy defect is internal/);
  rejects(sourceRule('VEN-001', { disclosure: 'restricted' }), /disclosure: expected public, internal/);
  rejects(sourceRule('VEN-001', { title: 'Abono parcial que no supera el saldo (frontend)' }), /discloses a weak control; the rule must be internal/);
  rejects(sourceRule('VEN-001', { title: 'Informes accesibles sin autenticación' }), /discloses a weak control/);
  rejects(sourceRule('VEN-001', { title: 'Imprime en 10.0.4.17 de la sucursal' }), /private IPv4 address; POS Docs publishes this text/);
  assert.throws(() => projectRules({ ...source(), schemaVersion: 1 }), /unsupported schema version; expected 2/);
  assert.doesNotThrow(() => projectRules(source([sourceRule('VEN-001', { title: 'Informes accesibles sin autenticación', disclosure: 'internal' })])));
});

test('the build rejects a snapshot that carries any field its disclosure does not allow', () => {
  const register = projectRules(source());
  const edited = mutate => {
    const copy = structuredClone(register);
    mutate(copy);
    return () => validateRulesRegister(copy);
  };
  assert.throws(edited(copy => { copy.rules[0].behavior = 'Texto del legacy'; }), /VEN-001: a public rule: unexpected or missing fields/);
  assert.throws(edited(copy => { copy.rules[1].title = 'Credenciales'; }), /CAJ-095: a internal rule: unexpected or missing fields/);
  assert.throws(edited(copy => { copy.rules[0].type = 'seguridad'; }), /a security rule or a legacy defect is internal/);
  assert.throws(edited(copy => { copy.rules[0].questions = ['Q-1']; }), /expected identifiers/);
  assert.throws(edited(copy => { copy.legacyRevisions = {}; }), /Rules register: unexpected or missing fields/);
  assert.throws(() => validateRulesRegister(register, { workPackageIds: ['F01-01'] }), /unknown package F01-08 in the POS Docs roadmap/);
});

test('derives the decision only from rule and decision questions', () => {
  const rule = id => ({ id: 'VEN-001', questions: id });
  const questions = new Map([
    ['Q-01', { kind: 'rule', state: 'open' }],
    ['Q-02', { kind: 'decision', state: 'decided' }],
    ['Q-03', { kind: 'fact', state: 'answered' }],
    ['Q-04', { kind: 'rule', state: 'validated' }],
  ]);
  assert.equal(decisionOf(rule([]), questions), 'sin-pregunta');
  assert.equal(decisionOf(rule(['Q-03']), questions), 'sin-pregunta', 'An answered fact does not decide a rule');
  assert.equal(decisionOf(rule(['Q-02', 'Q-04', 'Q-03']), questions), 'resuelta');
  assert.equal(decisionOf(rule(['Q-01', 'Q-02']), questions), 'abierta');
  assert.throws(() => decisionOf(rule(['Q-09']), questions), /Q-09 is not in the published questions/);
});

test('groups by phase, keeps rules without a phase last and requires questions of the same revision', () => {
  const content = source([sourceRule('VEN-001'), sourceRule('VEN-002', { workPackage: null, links: { ...sourceRule('VEN-002').links, questions: ['Q-02'] } }), sourceRule('CAJ-095', { type: 'seguridad', disclosure: 'internal', workPackage: 'F01-08' })]);
  const model = deriveRules(snapshot(content), progress, questionsModel([{ id: 'Q-01', kind: 'rule', state: 'open' }, { id: 'Q-02', kind: 'decision', state: 'decided' }]));
  assert.deepEqual(model.groups.map(group => [group.id, group.items.map(item => item.id)]), [['phase-01', ['CAJ-095', 'VEN-001']], ['sin-fase', ['VEN-002']]]);
  assert.deepEqual(model.counts.decisions, { abierta: 2, resuelta: 1, 'sin-pregunta': 0 });
  assert.deepEqual(model.counts.disclosure, { public: 2, internal: 1 });
  assert.deepEqual(model.counts.legacy, { CONFIRMADO: 2 });
  assert.throws(() => deriveRules(snapshot(content), progress, questionsModel(undefined, 'd'.repeat(40))), /same product revision/);
  assert.throws(() => deriveRules(snapshot(content), progress, null), /Rules require the published questions/);
  const tampered = snapshot(content);
  tampered.register.rules[0].note = 'Observación';
  assert.throws(() => deriveRules(tampered, progress, questionsModel()), /projection hash mismatch/);
  tampered.sha256 = rulesContentHash(tampered.register);
  assert.throws(() => deriveRules(tampered, progress, questionsModel()), /unexpected or missing fields/, 'A recomputed hash does not admit another field');
});
