import assert from 'node:assert/strict';
import test from 'node:test';
import { productRepository } from './follow-up.mjs';
import { csvIds, deriveQuestions, internalReferences, officialHosts, questionsContentHash, recommendationContentHash, validateQuestionsContent } from './questions.mjs';

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
  validation: null,
  ...fields,
});
const content = () => ({
  schemaVersion: 1,
  reviewedOn: '2026-11-10',
  audit,
  items: [
    question('Q-01', { workPackages: ['F04-08', 'F01-10'] }),
    question('Q-02', { priority: 'P2', workPackages: ['F01-09'], decider: 'Operaciones' }),
    question('Q-03', { kind: 'decision', state: 'decided', answerSources: ['spec'], sources: ['delivery/specs/F01-01.md#L34'], decider: 'Producto (ya decidido)', followUp: null, workPackages: ['F01-01'] }),
    question('Q-04', { kind: 'fact', state: 'answered', answerSources: ['data'], workPackages: ['F04-01'], decider: 'Finanzas (valida la respuesta)' }),
    question('Q-05', { state: 'validated', priority: 'P3', workPackages: ['F04-08'], owner: 'pymimtos', validation: { validatedOn: '2026-11-10', validatedBy: 'pymimtos', note: 'Confirmada en la reunión comercial.' } }),
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
const derive = (mutate = () => {}, model = followUp()) => {
  const value = content();
  mutate(value);
  return deriveQuestions(snapshot(value), progress(), model);
};
// The same fixture as tools/check-business-questions.test.mjs in POS Platform, so both hash it alike.
const recommendation = (fields = {}) => ({
  answer: 'La exclusión aplica sólo a las líneas de la OV; un cupón manual sigue disponible para el resto de la cesta.',
  scope: 'country',
  default: 'Cupón manual habilitado para las líneas sin OV',
  rationale: 'Separa la regla comercial de la OV del cupón; cada país define sus promociones.',
  basis: ['practice', 'architecture'],
  references: [{ label: 'Fiscalidad y documentos por país', url: 'https://pos-docs-starlight.vercel.app/guide/proposal/fiscal-compliance/' }],
  sources: ['delivery/specs/F01-01.md#L34'],
  author: { kind: 'agent', name: 'Claude Code · TASK-314' },
  proposedOn: '2026-11-10',
  endorsement: null,
  ...fields,
});
const endorsement = value => ({ endorsedBy: 'pymimtos', endorsedOn: '2026-11-10', contentSha256: recommendationContentHash(value) });
/** Schema 2: Q-01 has a draft, Q-02 an endorsed recommendation; the rest, none. */
const contentV2 = () => {
  const value = content();
  value.schemaVersion = 2;
  for (const item of value.items) item.recommendation = null;
  value.items[0].recommendation = recommendation();
  const endorsed = recommendation({ scope: 'core', default: null, author: { kind: 'person', login: 'floxcristian' } });
  value.items[1].recommendation = { ...endorsed, endorsement: endorsement(endorsed) };
  return value;
};
const deriveV2 = (mutate = () => {}) => {
  const value = contentV2();
  mutate(value);
  return deriveQuestions(snapshot(value), progress(), followUp());
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

test('counts states and pending business validation without inferring owners or validations', () => {
  const model = derive();
  assert.deepEqual(model.counts, { total: 6, open: 3, answered: 1, decided: 1, validated: 1, pendingValidation: 5, unassigned: 5, recommended: 0, endorsed: 0, unrecommended: 3 });
  assert.equal(model.items.find(item => item.id === 'Q-03').validation, null, 'A decision in a spec is not a business validation');
  assert.deepEqual(model.deciders, ['Comercial', 'Finanzas (valida la respuesta)', 'Operaciones', 'Producto (ya decidido)']);
  assert.equal(model.reviewedOn, '2026-11-10');
  assert.equal(model.audit, audit);
  assert.deepEqual(model.integration, { reference: 'main', included: true });
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
  rejects(value => { value.schemaVersion = 3; }, /unsupported schema version/);
  rejects(value => { value.schemaVersion = '1'; }, /unsupported schema version/);
  rejects(value => { value.items[0].extra = true; }, /Q-01|items\[0\]: unexpected or missing fields/);
  rejects(value => { value.items[1].id = 'Q-01'; }, /duplicate question ID/);
  rejects(value => { value.items.reverse(); }, /out of order/);
  rejects(value => { value.items[0].id = 'Q1'; }, /expected Q-NN/);
  rejects(value => { value.items[0].kind = 'policy'; }, /Q-01\.kind/);
  rejects(value => { value.items[0].state = 'closed'; }, /Q-01\.state/);
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
  rejects(value => { value.items[0].state = 'answered'; }, /answered record must be a fact/);
  rejects(value => { value.items[2].kind = 'rule'; }, /decided record must be a decision/);
  rejects(value => { value.items[2].sources = []; }, /must cite a source under delivery\/specs\//);
  rejects(value => { value.items[4].validation = null; }, /Q-05\.validation: expected object/);
  rejects(value => { value.items[4].validation.validatedBy = 'Pedro Yañez'; }, /validatedBy/);
  rejects(value => { value.items[4].validation.validatedOn = '2026-11-11'; }, /validated after the item review/);
  rejects(value => { value.items[0].validation = { validatedOn: '2026-11-10', validatedBy: 'pymimtos', note: 'x' }; }, /only a validated record declares a validation/);
  rejects(value => { value.items[0].reviewedOn = '2026-11-11'; }, /reviewed after registry review/);
  rejects(value => { value.items[0].reviewedOn = '2026-02-30'; }, /invalid date/);
  rejects(value => { value.items[0].question = ' Pregunta con espacios '; }, /single-line text/);
  rejects(value => { value.items[0].currentAnswer = 'Primera línea\nsegunda línea'; }, /single-line text/);
});

test('reads the previous schema without recommendations while the product migrates', () => {
  const model = derive();
  assert.ok(model.items.every(item => item.recommendation === null), 'Schema 1 has no recommendation to show');
  assert.equal(model.items.find(item => item.id === 'Q-01').recommendationStatus, 'none');
  assert.equal(model.items.find(item => item.id === 'Q-04').recommendationStatus, 'not_applicable', 'A fact never carries a recommendation');
  assert.deepEqual(model.scopes, []);
  assert.throws(() => derive(value => { value.items[0].recommendation = null; }), /Q-01|items\[0\]: unexpected or missing fields/, 'Schema 1 does not declare recommendations');
});

test('derives the recommendation status, its scopes and its counts from schema 2', () => {
  const model = deriveV2();
  const status = id => model.items.find(item => item.id === id).recommendationStatus;
  assert.deepEqual(['Q-01', 'Q-02', 'Q-03', 'Q-04', 'Q-05', 'Q-10'].map(status), ['draft', 'endorsed', 'not_applicable', 'not_applicable', 'not_applicable', 'none'], 'A decided, validated or factual record without a recommendation has none pending');
  assert.deepEqual([model.counts.recommended, model.counts.endorsed, model.counts.unrecommended], [2, 1, 1]);
  const decided = deriveV2(value => { value.items[2].recommendation = recommendation({ scope: 'core', default: null }); });
  assert.equal(decided.items.find(item => item.id === 'Q-03').recommendationStatus, 'draft', 'A decision keeps showing the recommendation it came from');
  assert.deepEqual(model.scopes, ['core', 'country'], 'Scopes follow the configuration order, from the core to the register');
  const draft = model.items.find(item => item.id === 'Q-01');
  assert.equal(draft.state, 'open', 'A recommendation leaves the rule open');
  assert.equal(draft.validation, null, 'A recommendation is not a business validation');
  assert.deepEqual(draft.recommendation, recommendation());
});

test('applies the product rules to the recommendations of schema 2', () => {
  const rejects = (mutate, pattern) => assert.throws(() => deriveV2(mutate), pattern);
  const first = mutate => value => mutate(value.items[0].recommendation, value);
  assert.doesNotThrow(() => deriveV2());
  rejects(value => { delete value.items[2].recommendation; }, /Q-03|items\[2\]: unexpected or missing fields/);
  rejects(value => { value.items[3].recommendation = recommendation(); }, /Q-04: a fact is answered with evidence; only a rule or a decision carries a recommendation/);
  rejects(first(item => { item.confidence = 'alta'; }), /Q-01\.recommendation: unexpected or missing fields/);
  rejects(first(item => { item.scope = 'global'; }), /Q-01\.recommendation\.scope: expected core, country, legal_entity, branch or register/);
  rejects(first(item => { item.scope = 'core'; }), /Q-01\.recommendation\.default: a core rule is the same in every country and has no default/);
  rejects(first(item => { item.default = null; }), /Q-01\.recommendation\.default: a configurable rule states its recommended default/);
  rejects(first(item => { item.basis = ['opinion']; }), /Q-01\.recommendation\.basis: unsupported basis opinion/);
  rejects(first(item => { item.basis = []; }), /Q-01\.recommendation\.basis: expected nonempty list/);
  rejects(first(item => { item.basis = ['regulation']; }), /Q-01\.recommendation\.references: a recommendation grounded in a regulation cites an official source/);
  rejects(first(item => { item.references = []; item.sources = []; }), /Q-01\.recommendation: a recommendation grounded in the architecture cites the spec, ADR or proposal it follows/);
  rejects(first(item => { item.references[0].url = 'http://www.sii.cl/circular.pdf'; }), /Q-01\.recommendation\.references\[0\]\.url: expected a public HTTPS URL without credentials or port/);
  rejects(first(item => { item.references.push({ ...item.references[0] }); }), /Q-01\.recommendation\.references: duplicate URL/);
  rejects(first(item => { item.sources = ['tmp/private/evidencia.md']; }), /Q-01\.recommendation\.sources\[0\]: tmp\//);
  rejects(first(item => { item.author = { kind: 'person', login: '@floxcristian' }; }), /Q-01\.recommendation\.author\.login: expected a GitHub login/);
  rejects(first(item => { item.proposedOn = '2026-11-11'; }), /Q-01\.recommendation: proposed after the item review/);
  rejects(first(item => { item.answer = 'Consultar imp-nueva-caja antes de vender.'; }), /Q-01\.recommendation\.answer: "imp-nueva-caja" is a corporate host name; POS Docs publishes this text/);
  rejects(first(item => { item.references[0].url = 'https://docs.caja-01.local/manual'; }), /Q-01\.recommendation\.references\[0\]\.url: ".*caja-01\.local" is a internal domain/);
  const second = mutate => value => mutate(value.items[1].recommendation);
  rejects(second(item => { item.endorsement.endorsedBy = 'floxcristian'; }), /Q-02\.recommendation\.endorsement: the author cannot endorse their own recommendation/);
  rejects(second(item => { item.endorsement.endorsedOn = '2026-11-09'; }), /Q-02\.recommendation\.endorsement: endorsed before the recommendation was proposed/);
  rejects(second(item => { item.endorsement.contentSha256 = 'A'.repeat(64); }), /Q-02\.recommendation\.endorsement\.contentSha256: expected a lowercase SHA-256/);
  rejects(second(item => { item.answer = 'Otra regla, después del respaldo.'; }), /Q-02\.recommendation\.endorsement: the recommendation changed after it was endorsed; endorse it again or set endorsement to null/);
  const official = url => first(item => { item.basis = ['regulation']; item.references = [{ label: 'Norma', url }]; });
  assert.doesNotThrow(() => deriveV2(official('https://cpe.sunat.gob.pe/sistema_emision/see_contribuyente')));
  rejects(official('https://sii.cl.example.com/circular.pdf'), /cites an official source/);
  assert.ok(officialHosts.includes('sii.cl') && officialHosts.includes('europa.eu'));
});

test('computes the same endorsement hash as POS Platform', () => {
  assert.equal(recommendationContentHash(recommendation()), '45719ea2141a174e5e5b52884292fe7094d52ce14c9793e20baa75d237c1ab90');
  const reordered = Object.fromEntries(Object.entries(recommendation()).reverse());
  reordered.references = reordered.references.map(({ label, url }) => ({ url, label }));
  assert.equal(recommendationContentHash(reordered), recommendationContentHash(recommendation()), 'Key order does not change the hash');
});

test('checks recommendation sources only when the import provides the product context', () => {
  const value = contentV2();
  value.items[0].recommendation.sources = ['delivery/specs/F09-99.md'];
  assert.doesNotThrow(() => validateQuestionsContent(structuredClone(value), { workPackageIds: progress().workPackages.map(item => item.id) }));
  assert.throws(() => validateQuestionsContent(structuredClone(value), { workPackageIds: progress().workPackages.map(item => item.id), sourceExists: () => false }), /Q-01\.recommendation\.sources\[0\]: delivery\/specs\/F09-99\.md is not a repository file/);
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
  assert.throws(() => derive(value => { value.items[4].validation.note = 'Confirmado en caja-01.local.'; }), /Q-05\.validation\.note/);
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
  const context = { workPackageIds: progress().workPackages.map(item => item.id) };
  assert.equal(validateQuestionsContent(structuredClone(value), context).items.length, 6);
  const full = {
    ...context,
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

test('reads audit identifiers from the first CSV column with quoted fields', () => {
  const ids = csvIds('﻿id,texto\r\nC-01,"Texto, con coma"\nC-02,"Con ""comillas""\nen dos líneas"\n', 'afirmaciones.csv');
  assert.deepEqual([...ids], ['C-01', 'C-02']);
  assert.throws(() => csvIds('codigo,texto\nC-01,x\n', 'afirmaciones.csv'), /expected id as the first column/);
  assert.throws(() => csvIds('id,texto\nC-01,x\nC-01,y\n', 'afirmaciones.csv'), /duplicate identifiers/);
  assert.throws(() => csvIds('id,texto\nC-01,"sin cerrar\n', 'afirmaciones.csv'), /unterminated quoted field/);
});
