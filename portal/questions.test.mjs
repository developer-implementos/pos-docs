import assert from 'node:assert/strict';
import test from 'node:test';
import { productRepository } from './follow-up.mjs';
import { csvIds, decisionOutcomes, deriveQuestions, internalReferences, officialHosts, questionKinds, questionStates, questionsContentHash, recommendationStatuses, validateQuestionsContent } from './questions.mjs';

const revision = 'c'.repeat(40);
const audit = 'delivery/reviews/pos-parity-2026-11-10';
const phase = (id, title) => ({ id, title, href: `/guide/roadmap/${id}/` });
const work = (id, phaseId, phaseTitle, title) => ({ id, phase: phaseId, phaseTitle, title, href: `/guide/roadmap/${phaseId}/#work-${id.toLowerCase()}` });
const progress = () => ({
  phases: [phase('phase-01', 'Venta'), phase('phase-02', 'Cobro'), phase('phase-04', 'Operación')],
  workPackages: [
    work('F01-01', 'phase-01', 'Venta', 'Identidad'),
    work('F01-09', 'phase-01', 'Venta', 'Venta en espera'),
    work('F01-10', 'phase-01', 'Venta', 'Cupones'),
    work('F02-04', 'phase-02', 'Cobro', 'Pagos'),
    work('F04-01', 'phase-04', 'Operación', 'Notas de crédito'),
    work('F04-08', 'phase-04', 'Operación', 'Atribución'),
  ],
});
/** The agent's proposal, with the content of the fixture of tools/check-business-questions.test.mjs in POS Platform. */
const recommendation = (fields = {}) => ({
  answer: 'La exclusión aplica sólo a las líneas de la OV; un cupón manual sigue disponible para el resto de la cesta.',
  scope: 'country',
  default: 'Cupón manual habilitado para las líneas sin OV',
  rationale: 'Separa la regla comercial de la OV del cupón; cada país define sus promociones.',
  basis: ['practice', 'architecture'],
  references: [{ label: 'Fiscalidad y documentos por país', url: 'https://pos-docs-starlight.vercel.app/guide/proposal/fiscal-compliance/' }],
  sources: ['delivery/specs/F01-01.md#L34'],
  agent: 'Claude Code · TASK-314',
  proposedOn: '2026-11-10',
  ...fields,
});
/** A final decision, as an agent records it from the business decision document. */
const decision = (fields = {}) => ({
  answer: 'Sí: la autorización se exige en servidor para cada acción (F01-01)',
  decidedBy: 'Producto',
  decidedOn: '2026-11-10',
  source: 'Ficha F01-01 del producto',
  outcome: null,
  ...fields,
});
const question = (id, fields = {}) => ({
  id,
  topic: 'Cupones',
  question: `¿Pregunta ${id}?`,
  kind: 'rule',
  state: 'open',
  currentAnswer: 'Legacy: el campo de cupón se deshabilita con cualquier línea de OV.',
  answerSources: ['code'],
  auditRefs: ['C-30'],
  parityRefs: ['P-14'],
  sources: [],
  decider: 'Comercial',
  owner: null,
  followUp: 'FOLLOWUP-005',
  workPackages: ['F01-10'],
  priority: 'P1',
  reviewedOn: '2026-11-10',
  recommendation: null,
  decision: null,
  ...fields,
});
/**
 * Schema 3: Q-01, Q-02 and Q-10 are open rules, Q-01 with the agent's recommendation; Q-03 was decided
 * without one, Q-04 is an answered fact and Q-05 a decision that adapts its recommendation.
 */
const content = () => ({
  schemaVersion: 3,
  reviewedOn: '2026-11-10',
  audit,
  items: [
    question('Q-01', { workPackages: ['F04-08', 'F01-10'], recommendation: recommendation() }),
    question('Q-02', { priority: 'P2', workPackages: ['F01-09'], decider: 'Operaciones' }),
    question('Q-03', { state: 'decided', answerSources: ['spec'], sources: ['delivery/specs/F01-01.md#L34'], decider: 'Producto', followUp: null, workPackages: ['F01-01'], decision: decision() }),
    question('Q-04', { kind: 'fact', state: 'answered', answerSources: ['data'], workPackages: ['F04-01'], decider: 'Finanzas' }),
    question('Q-05', { state: 'decided', priority: 'P3', workPackages: ['F04-08'], owner: 'pymimtos', recommendation: recommendation({ scope: 'core', default: null }), decision: decision({ answer: 'El cupón manual se habilita en todos los países para las líneas sin OV.', decidedBy: 'Comité comercial', source: 'Acta de decisiones comerciales del 10 de noviembre de 2026', outcome: 'adapted' }) }),
    question('Q-10', { workPackages: ['F02-04'], priority: 'P1', followUp: 'FOLLOWUP-017' }),
  ],
});
const snapshot = (value = content(), integration = { reference: 'main', included: true }) => ({
  schemaVersion: 1,
  source: { repository: productRepository, revision, path: 'delivery/business-questions.json', sha256: questionsContentHash(value) },
  integration,
  content: value,
});
const followUp = () => ({ items: [{ id: 'FOLLOWUP-005', summary: 'Confirmar reglas de cupones', state: 'open' }] });
const derive = (mutate = () => {}, model = followUp(), base = content) => {
  const value = base();
  mutate(value);
  return deriveQuestions(snapshot(value), progress(), model);
};
const context = () => ({ workPackageIds: progress().workPackages.map(item => item.id) });
/**
 * The message, character for character, as its first line: POS Platform reports the same text, and
 * Node appends the compared values after it when an equality assertion fails.
 */
const reports = text => error => {
  assert.equal(error.message.split('\n')[0], text);
  return true;
};

test('groups each question in the earliest phase of its packages and orders by phase, priority and id', () => {
  const before = progress();
  const input = progress();
  const model = deriveQuestions(snapshot(), input, followUp());
  assert.deepEqual(input, before, 'Deriving questions never changes the roadmap projection');
  assert.deepEqual(model.groups.map(group => group.id), ['phase-01', 'phase-02', 'phase-04']);
  assert.deepEqual(model.groups.map(group => group.title), ['Venta', 'Cobro', 'Operación']);
  assert.equal(model.groups[0].href, '/guide/roadmap/phase-01/');
  assert.deepEqual(model.groups.map(group => group.items.map(item => item.id)), [['Q-01', 'Q-03', 'Q-02'], ['Q-10'], ['Q-04', 'Q-05']]);
  assert.deepEqual(model.items.map(item => item.id), ['Q-01', 'Q-03', 'Q-02', 'Q-10', 'Q-04', 'Q-05']);
  const first = model.items[0];
  assert.equal(first.phase, 'phase-01', 'F01-10 precedes F04-08 even when listed second');
  assert.deepEqual(first.phases, ['phase-01', 'phase-04']);
  assert.deepEqual(first.packages.map(item => item.id), ['F04-08', 'F01-10'], 'Packages keep the order of the registry');
  assert.equal(first.packages[1].title, 'Cupones');
});

test('orders identifiers numerically within the same phase and priority', () => {
  const model = derive(value => {
    value.items = [question('Q-09'), question('Q-10'), question('Q-100')];
  });
  assert.deepEqual(model.items.map(item => item.id), ['Q-09', 'Q-10', 'Q-100']);
});

test('names the kinds, the states, the recommendation filter and the outcomes of schema 3', () => {
  assert.deepEqual(questionKinds, { fact: 'Hecho', rule: 'Regla' });
  assert.deepEqual(questionStates, { open: 'Abierta', answered: 'Respondida', decided: 'Decidida' });
  assert.deepEqual(recommendationStatuses, { present: 'Con recomendación', none: 'Sin recomendación' });
  assert.deepEqual(decisionOutcomes, { adopted: 'Adopta la recomendación', adapted: 'Ajusta la recomendación', rejected: 'Descarta la recomendación' });
});

test('counts states, pending decisions, recommendations and outcomes without inferring owners or decisions', () => {
  const model = derive();
  assert.deepEqual(model.counts, { total: 6, open: 3, answered: 1, decided: 2, pendingDecision: 3, unassigned: 5, recommended: 2, unrecommended: 2, adopted: 0, adapted: 1, rejected: 0 });
  assert.deepEqual(model.deciders, ['Comercial', 'Finanzas', 'Operaciones', 'Producto']);
  assert.equal(model.reviewedOn, '2026-11-10');
  assert.equal(model.audit, audit);
  assert.deepEqual(model.integration, { reference: 'main', included: true });
  const openFact = derive(value => { value.items[3].state = 'open'; });
  assert.equal(openFact.counts.pendingDecision, 3, 'A fact still to be answered awaits evidence, not a decision');
  for (const outcome of ['adopted', 'rejected']) {
    const counts = derive(value => { value.items[4].decision.outcome = outcome; }).counts;
    assert.deepEqual([counts.adopted, counts.adapted, counts.rejected], ['adopted', 'adapted', 'rejected'].map(name => Number(name === outcome)));
  }
});

test('derives the recommendation status and keeps the decision and the recommendation it came from', () => {
  const model = derive();
  const item = id => model.items.find(entry => entry.id === id);
  const status = id => item(id).recommendationStatus;
  assert.deepEqual(['Q-01', 'Q-02', 'Q-03', 'Q-04', 'Q-05', 'Q-10'].map(status), ['present', 'none', 'not_applicable', 'not_applicable', 'present', 'none'], 'A fact, or a rule decided without a recommendation, has none pending');
  assert.deepEqual(model.scopes, ['core', 'country'], 'Scopes follow the configuration order, from the core to the register');
  assert.equal(item('Q-01').state, 'open', 'A recommendation leaves the rule open');
  assert.equal(item('Q-01').decision, null);
  assert.deepEqual(item('Q-01').recommendation, recommendation());
  assert.deepEqual(item('Q-05').decision, content().items[4].decision);
  assert.deepEqual(item('Q-05').recommendation, recommendation({ scope: 'core', default: null }), 'A decision keeps the recommendation it came from');
  assert.deepEqual(item('Q-03').decision, decision());
});

test('links only follow-ups present in the published follow-up snapshot', () => {
  const model = derive();
  assert.equal(model.items.find(item => item.id === 'Q-01').followUpAction.summary, 'Confirmar reglas de cupones');
  assert.equal(model.items.find(item => item.id === 'Q-10').followUpAction, null, 'An unpublished follow-up stays as text');
  assert.equal(model.items.find(item => item.id === 'Q-03').followUpAction, null);
  assert.equal(derive(() => {}, null).items[0].followUpAction, null, 'Without a follow-up snapshot no action is linked');
});

test('keeps a pre-integration revision identified as such', () => {
  const model = deriveQuestions(snapshot(content(), { reference: 'main', included: false }), progress(), followUp());
  assert.equal(model.integration.included, false);
  for (const integration of [{ reference: 'develop', included: false }, { reference: 'main', included: 'no' }, { reference: 'main' }, null]) {
    assert.throws(() => deriveQuestions(snapshot(content(), integration), progress(), followUp()), /integration/i, JSON.stringify(integration));
  }
});

test('validates provenance and content hash like the other project snapshots', () => {
  const mutations = [
    [value => { value.source.repository = 'https://github.com/example/pos-platform'; }, /corporate product repository/],
    [value => { value.source.path = 'delivery/follow-ups.json'; }, /source path/],
    [value => { value.source.revision = 'main'; }, /immutable revision/],
    [value => { value.content.items[0].question = 'Cambio sin revisar'; }, /hash mismatch/],
    [value => { value.schemaVersion = 2; }, /snapshot schema/],
    [value => { value.extra = true; }, /Questions snapshot: unexpected or missing fields/],
  ];
  for (const [mutate, pattern] of mutations) {
    const value = snapshot();
    mutate(value);
    assert.throws(() => deriveQuestions(value, progress(), followUp()), pattern);
  }
});

test('applies the product validation rules to the published content', () => {
  const rejects = (mutate, pattern) => assert.throws(() => derive(mutate), pattern);
  for (const version of [1, 2, 4, '3']) rejects(value => { value.schemaVersion = version; }, reports('questions: unsupported schema version; expected 3'));
  rejects(value => { value.items[0].extra = true; }, reports('questions.items[0]: unexpected or missing fields'));
  rejects(value => { value.items[0].validation = null; }, reports('questions.items[0]: unexpected or missing fields'));
  rejects(value => { delete value.items[0].decision; }, reports('questions.items[0]: unexpected or missing fields'));
  rejects(value => { delete value.items[0].recommendation; }, reports('questions.items[0]: unexpected or missing fields'));
  rejects(value => { value.items[1].id = 'Q-01'; }, /duplicate question ID/);
  rejects(value => { value.items.reverse(); }, /out of order/);
  rejects(value => { value.items[0].id = 'Q1'; }, /expected Q-NN/);
  rejects(value => { value.items[0].answerSources = []; }, /Q-01\.answerSources/);
  rejects(value => { value.items[0].answerSources = ['rumor']; }, /unsupported source rumor/);
  rejects(value => { value.items[0].answerSources = ['code', 'code']; }, /duplicate entries/);
  rejects(value => { value.items[0].priority = 'P0'; }, /Q-01\.priority/);
  rejects(value => { value.items[0].workPackages = []; }, /nonempty package list/);
  rejects(value => { value.items[0].workPackages = ['F09-99']; }, /unknown package F09-99/);
  rejects(value => { value.items[0].followUp = 'FOLLOWUP-5'; }, /Q-01\.followUp/);
  rejects(value => { value.items[0].owner = '@pymimtos'; }, /Q-01\.owner/);
  rejects(value => { value.items[0].auditRefs = ['X-01']; }, /Q-01\.auditRefs/);
  rejects(value => { value.items[0].parityRefs = ['C-30']; }, /Q-01\.parityRefs/);
  rejects(value => { value.items[0].sources = ['tmp/private/evidencia.md']; }, /tmp\//);
  rejects(value => { value.items[0].sources = ['../outside.md']; }, /relative repository path/);
  rejects(value => { value.items[0].sources = ['delivery/specs/F01-01.md#L1#L2']; }, /relative repository path/);
  rejects(value => { value.audit = '/absolute/audit'; }, /questions\.audit/);
  rejects(value => { value.items[0].reviewedOn = '2026-11-11'; }, /reviewed after registry review/);
  rejects(value => { value.items[0].reviewedOn = '2026-02-30'; }, /invalid date/);
  rejects(value => { value.items[0].question = ' Pregunta con espacios '; }, /single-line text/);
  rejects(value => { value.items[0].currentAnswer = 'Primera línea\nsegunda línea'; }, /single-line text/);
});

test('applies the kind, state and decision rules of schema 3 with the messages of POS Platform', () => {
  // Character for character, the messages of tools/check-business-questions.mjs in POS Platform (S4).
  const rejects = (mutate, text) => assert.throws(() => derive(mutate), reports(text));
  const decided = mutate => value => mutate(value.items[2].decision, value);
  const adapted = mutate => value => mutate(value.items[4].decision, value);
  rejects(value => { value.items[0].kind = 'decision'; }, 'Q-01.kind: expected fact or rule');
  rejects(value => { value.items[0].kind = 'policy'; }, 'Q-01.kind: expected fact or rule');
  rejects(value => { value.items[0].state = 'validated'; }, 'Q-01.state: expected open, answered or decided');
  rejects(value => { value.items[0].state = 'answered'; }, 'Q-01: an answered record must be a fact; rules need a decision');
  rejects(value => { Object.assign(value.items[3], { state: 'decided', decision: decision() }); }, 'Q-04: a fact is answered with evidence; only a rule is decided');
  rejects(value => { value.items[3].state = 'decided'; }, 'Q-04: a fact is answered with evidence; only a rule is decided');
  rejects(value => { value.items[1].state = 'decided'; }, 'Q-02: a decided record must declare its decision');
  rejects(value => { value.items[1].decision = decision(); }, 'Q-02: only a decided record declares a decision');
  rejects(value => { value.items[3].decision = decision(); }, 'Q-04: only a decided record declares a decision');
  rejects(value => { value.items[3].recommendation = recommendation(); }, 'Q-04: a fact is answered with evidence; only a rule carries a recommendation');
  rejects(value => { value.items[2].decision = 'Producto lo decidió en la ficha'; }, 'Q-03.decision: expected object');
  rejects(value => { value.items[2].decision = []; }, 'Q-03.decision: expected object');
  rejects(decided(item => { item.note = 'Sin observaciones'; }), 'Q-03.decision: unexpected or missing fields');
  rejects(decided(item => { delete item.outcome; }), 'Q-03.decision: unexpected or missing fields');
  rejects(value => { value.items[0].recommendation = 'Separar el cupón de la OV'; }, 'Q-01.recommendation: expected object');
  rejects(value => { Object.assign(value.items[0].recommendation, { author: { kind: 'agent', name: 'Claude Code · TASK-314' }, endorsement: null }); }, 'Q-01.recommendation: unexpected or missing fields');
  for (const field of ['answer', 'decidedBy', 'source']) {
    rejects(decided(item => { item[field] = ` ${item[field]} `; }), `Q-03.decision.${field}: required single-line text without control characters`);
    rejects(decided(item => { item[field] = 'a'.repeat(2001); }), `Q-03.decision.${field}: at most 2000 characters, the limit that POS Docs publishes`);
    rejects(decided(item => { item[field] = 'Acta guardada en imp-actas-01'; }), `Q-03.decision.${field}: "imp-actas-01" is a corporate host name; POS Docs publishes this text, so describe the role instead`);
  }
  rejects(value => { value.items[0].recommendation.agent = ''; }, 'Q-01.recommendation.agent: required single-line text without control characters');
  rejects(value => { value.items[0].recommendation.agent = 'b'.repeat(2001); }, 'Q-01.recommendation.agent: at most 2000 characters, the limit that POS Docs publishes');
  rejects(decided(item => { item.decidedOn = '10-11-2026'; }), 'Q-03.decision.decidedOn: expected ISO date');
  rejects(decided(item => { item.decidedOn = '2026-02-30'; }), 'Q-03.decision.decidedOn: invalid date');
  rejects(decided(item => { item.decidedOn = '2026-11-11'; }), 'Q-03.decision: decided after the item review; review the item again');
  rejects(decided(item => { item.source = 'https://docs.example.com/actas/2026-11-10'; }), 'Q-03.decision.source: cite the decision document by name and date; it is not linked');
  rejects(decided(item => { item.outcome = 'adopted'; }), 'Q-03.decision.outcome: null when there was no recommendation');
  rejects(adapted(item => { item.outcome = 'accepted'; }), 'Q-05.decision.outcome: expected adopted, adapted or rejected');
  rejects(adapted(item => { item.outcome = null; }), 'Q-05.decision.outcome: expected adopted, adapted or rejected');
  rejects(adapted(item => { item.decidedOn = '2026-11-09'; }), 'Q-05.decision: decided before its recommendation was proposed');
});

test('accepts what schema 3 allows a decision to be', () => {
  assert.doesNotThrow(() => derive(value => { value.items[2].sources = []; }), 'A decision no longer cites a source under delivery/specs/');
  assert.doesNotThrow(() => derive(value => { value.items[3].state = 'open'; }), 'A fact may still await its answer');
  assert.doesNotThrow(() => derive(value => { value.items[2].decision.source = 'Acta del comité de producto, 10 de noviembre de 2026'; }));
  for (const outcome of ['adopted', 'adapted', 'rejected']) assert.doesNotThrow(() => derive(value => { value.items[4].decision.outcome = outcome; }), outcome);
  // A decision taken before the agent proposed anything neither adopts, adapts nor rejects it.
  assert.doesNotThrow(() => derive(value => { Object.assign(value.items[4].decision, { decidedOn: '2026-11-09', outcome: null }); }));
});

test('applies the product rules to the recommendations of schema 3', () => {
  const rejects = (mutate, pattern) => assert.throws(() => derive(mutate), pattern);
  const first = mutate => value => mutate(value.items[0].recommendation, value);
  assert.doesNotThrow(() => derive());
  rejects(first(item => { item.confidence = 'alta'; }), /Q-01\.recommendation: unexpected or missing fields/);
  rejects(first(item => { item.scope = 'global'; }), /Q-01\.recommendation\.scope: expected core, country, legal_entity, branch or register/);
  rejects(first(item => { item.scope = 'core'; }), /Q-01\.recommendation\.default: a core rule is the same in every country and has no default/);
  rejects(first(item => { item.default = null; }), /Q-01\.recommendation\.default: a configurable rule states its recommended default/);
  rejects(first(item => { item.basis = ['opinion']; }), /Q-01\.recommendation\.basis: unsupported basis opinion/);
  rejects(first(item => { item.basis = []; }), /Q-01\.recommendation\.basis: expected nonempty list/);
  rejects(first(item => { item.basis = ['regulation']; }), /Q-01\.recommendation\.references: a recommendation grounded in a regulation cites an official source/);
  rejects(first(item => { item.references = []; item.sources = []; }), /Q-01\.recommendation: a recommendation grounded in the architecture cites the spec, ADR or proposal it follows/);
  for (const url of ['http://www.sii.cl/circular.pdf', 'https://www.sii.cl:443/circular.pdf', 'https://localhost/manual', 'https://docs.localhost/manual', 'https://127.0.0.1/manual', 'https://[::1]/manual', 'https://localhost./manual', 'https://docs.localhost./manual']) {
    rejects(first(item => { item.references[0].url = url; }), /Q-01\.recommendation\.references\[0\]\.url: expected a public HTTPS URL without credentials or port/);
  }
  rejects(first(item => { item.references.push({ ...item.references[0] }); }), /Q-01\.recommendation\.references: duplicate URL/);
  rejects(first(item => { item.sources = ['tmp/private/evidencia.md']; }), /Q-01\.recommendation\.sources\[0\]: tmp\//);
  rejects(first(item => { item.proposedOn = '2026-11-11'; }), /Q-01\.recommendation: proposed after the item review/);
  rejects(first(item => { item.answer = 'Consultar imp-nueva-caja antes de vender.'; }), /Q-01\.recommendation\.answer: "imp-nueva-caja" is a corporate host name; POS Docs publishes this text/);
  rejects(first(item => { item.references[0].url = 'https://docs.caja-01.local/manual'; }), /Q-01\.recommendation\.references\[0\]\.url: ".*caja-01\.local" is a internal domain/);
  rejects(first(item => { item.rationale = 'b'.repeat(2001); }), /Q-01.recommendation.rationale: at most 2000 characters, the limit that POS Docs publishes/);
  rejects(value => { value.items[0].currentAnswer = 'a'.repeat(2001); }, /Q-01.currentAnswer: at most 2000 characters, the limit that POS Docs publishes/);
  assert.doesNotThrow(() => derive(value => { value.items[0].currentAnswer = 'a'.repeat(2000); }));
  const official = url => first(item => { item.basis = ['regulation']; item.references = [{ label: 'Norma', url }]; });
  assert.doesNotThrow(() => derive(official('https://cpe.sunat.gob.pe/sistema_emision/see_contribuyente')));
  rejects(official('https://sii.cl.example.com/circular.pdf'), /cites an official source/);
  assert.ok(officialHosts.includes('sii.cl') && officialHosts.includes('europa.eu'));
});

test('checks recommendation sources only when the import provides the product context', () => {
  const value = content();
  value.items[0].recommendation.sources = ['delivery/specs/F09-99.md'];
  assert.doesNotThrow(() => validateQuestionsContent(structuredClone(value), context()));
  assert.throws(() => validateQuestionsContent(structuredClone(value), { ...context(), sourceExists: () => false }), /Q-01\.recommendation\.sources\[0\]: delivery\/specs\/F09-99\.md is not a repository file/);
});

test('rejects text that would publish infrastructure, as the product validator does', () => {
  for (const [field, text, kind] of [
    ['currentAnswer', 'Responde en 192.168.211.50 desde la sucursal.', 'private IPv4 address'],
    ['question', '¿Se consulta imp-nueva-caja antes de vender?', 'corporate host name'],
    ['topic', 'Acceso por onprem-3', 'fleet SSH alias'],
    ['decider', 'Equipo de ci.implementos.internal', 'internal domain'],
  ]) {
    assert.throws(() => derive(value => { value.items[0][field] = text; }), new RegExp(`Q-01\\.${field}: ".+" is a ${kind}; POS Docs publishes this text`));
  }
  assert.throws(() => derive(value => { value.items[2].decision.answer = 'Confirmado en caja-01.local.'; }), /Q-03\.decision\.answer: ".+" is a internal domain/);
});

test('recognizes internal references exactly as POS Platform and accepts lookalikes', () => {
  assert.deepEqual(internalReferences('Base en 10.0.4.17:5432 y nodo 100.101.2.3.'), [{ kind: 'private IPv4 address', match: '10.0.4.17' }, { kind: 'private IPv4 address', match: '100.101.2.3' }]);
  for (const text of [
    'Hallazgos IMP-01 a IMP-03 del análisis de impresión.',
    'El servidor de laboratorio escucha en 127.0.0.1 y en localhost.',
    'Windows 10.0.22631.4460 y .NET 10.0.403; Node 22.23.3 y PostgreSQL 18.6.',
    'Las direcciones 8.8.8.8 y 172.32.0.1 no son privadas.',
    'Ver https://pos-docs-starlight.vercel.app/project/ y github.com/developer-implementos.',
  ]) assert.deepEqual(internalReferences(text), [], text);
});

test('checks product references only when the import provides the product context', () => {
  const value = content();
  assert.equal(validateQuestionsContent(structuredClone(value), context()).items.length, 6);
  const full = {
    ...context(),
    followUpIds: ['FOLLOWUP-005', 'FOLLOWUP-017'],
    sourceExists: file => file === 'delivery/specs/F01-01.md',
    readAudit: directory => {
      assert.equal(directory, audit);
      return { claims: new Set(['C-30']), parity: new Set(['P-14']) };
    },
  };
  assert.doesNotThrow(() => validateQuestionsContent(structuredClone(value), full));
  const failing = [
    [item => { item.followUp = 'FOLLOWUP-099'; }, /Q-01\.followUp: expected null or a follow-up in delivery\/follow-ups\.json/],
    [item => { item.auditRefs = ['C-99']; }, /C-99 is not in .*afirmaciones\.csv/],
    [item => { item.parityRefs = ['P-99']; }, /P-99 is not in .*paridad\.csv/],
    [item => { item.sources = ['delivery/specs/F09-99.md']; }, /is not a repository file/],
  ];
  for (const [mutate, pattern] of failing) {
    const changed = structuredClone(value);
    mutate(changed.items[0]);
    assert.throws(() => validateQuestionsContent(changed, full), pattern);
  }
});

test('rejects the schema 2 registry that POS Platform published before schema 3', () => {
  // The same records as POS Platform published them in schema 2: with validation, author and endorsement.
  const published = content();
  published.schemaVersion = 2;
  published.items = published.items.map(({ recommendation: proposal, decision: decided, ...item }) => {
    const { agent, ...rest } = proposal ?? {};
    return { ...item, kind: decided ? 'decision' : item.kind, validation: null, recommendation: proposal ? { ...rest, author: { kind: 'agent', name: agent }, endorsement: null } : null };
  });
  assert.throws(() => validateQuestionsContent(structuredClone(published), context()), reports('questions: unsupported schema version; expected 3'));
  assert.throws(() => deriveQuestions(snapshot(published), progress(), followUp()), reports('questions: unsupported schema version; expected 3'));
});

test('reads audit identifiers from the first CSV column with quoted fields', () => {
  const ids = csvIds('﻿id,texto\r\nC-01,"Texto, con coma"\nC-02,"Con ""comillas""\nen dos líneas"\n', 'afirmaciones.csv');
  assert.deepEqual([...ids], ['C-01', 'C-02']);
  assert.throws(() => csvIds('codigo,texto\nC-01,x\n', 'afirmaciones.csv'), /expected id as the first column/);
  assert.throws(() => csvIds('id,texto\nC-01,x\nC-01,y\n', 'afirmaciones.csv'), /duplicate identifiers/);
  assert.throws(() => csvIds('id,texto\nC-01,"sin cerrar\n', 'afirmaciones.csv'), /unterminated quoted field/);
});
