import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadFollowUp, productRepository } from './follow-up.mjs';
import { renderProjectPages } from './project-view.mjs';
import { loadProgress } from './progress.mjs';
import { loadQuestions } from './questions.mjs';
import { decisionOf, deriveRules, loadRules, rulesContentHash, rulesSourcePath, validateRulesContent, withoutPhase } from './rules.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const progress = loadProgress(root);
const followUp = loadFollowUp(root, progress);
const questions = loadQuestions(root, progress, followUp);
const firstWork = progress.workPackages[0];
const question = questions.items.find(item => item.state === 'open');
const closedQuestion = questions.items.find(item => item.state !== 'open');

const rule = (id, fields = {}) => ({
  id,
  area: id.slice(0, 3),
  title: `Regla ${id}`,
  origin: 'catalogo',
  sourceArtifacts: ['A1'],
  type: 'validacion',
  layer: 'ambos',
  criticality: 'alta',
  kind: 'capacidad',
  workPackage: firstWork.id,
  legacy: { behavior: 'Rechaza boletas sobre un monto fijo.', condition: null, observations: null, verification: 'CONFIRMADO', note: null, evidence: [{ repository: 'mountain-implementos', path: 'frontend/src/app/ejemplo.ts', lines: '10-20' }] },
  businessQuestion: '¿Cuál es el tope?',
  artifacts: { catalog: { coverage: 'parcial', gap: 'Falta el parámetro.', posPlatformNote: null }, closure: null, answers: null, management: null },
  posPlatform: { specified: { state: 'no-verificado', refs: [] }, implemented: { state: 'si', refs: ['libs/ejemplo/src/regla.ts#L10'] }, tested: { state: 'no', refs: [] }, note: null },
  decider: 'Operaciones tienda',
  links: { questions: [question.id], parity: ['P-30'], claims: [], followUps: [], issues: [], related: [] },
  reviewedOn: '2026-11-11',
  ...fields,
});
const content = () => ({
  schemaVersion: 1,
  reviewedOn: '2026-11-11',
  audit: 'delivery/reviews/pos-parity-2026-11-10',
  areas: { CAJ: 'Caja', VEN: 'Venta' },
  legacyRevisions: { 'mountain-implementos': 'f57d5900' },
  posPlatformRevision: 'cab44e4',
  sourceArtifacts: [{ id: 'A1', title: 'Catálogo', date: '2026-11-08', use: 'Origen de las reglas.' }],
  contradictions: [{ id: 'X-01', rules: ['VEN-001'], state: 'open', resolution: null, summary: 'Dos fuentes difieren.' }],
  rules: [rule('CAJ-001', { workPackage: null }), rule('VEN-001')],
});
const snapshot = (mutate = () => {}, included = true) => {
  const value = content();
  mutate(value);
  return { schemaVersion: 1, source: { repository: productRepository, revision: 'a'.repeat(40), path: rulesSourcePath, sha256: rulesContentHash(value) }, integration: { reference: 'main', included }, content: value };
};
const rulesPage = model => renderProjectPages(progress, followUp, null, null, questions, model).get('/project/rules/').body;
const context = { workPackageIds: progress.workPackages.map(work => work.id) };

test('groups rules by the phase of their package and keeps undecided phases last', () => {
  const model = deriveRules(snapshot(), progress, questions);
  assert.deepEqual(model.groups.map(group => group.id), [firstWork.phase, withoutPhase]);
  assert.equal(model.counts.total, 2);
  assert.equal(model.counts.withCapability, 2);
  assert.deepEqual(model.counts.decisions, { 'sin-pregunta': 0, abierta: 2, resuelta: 0 });
  assert.equal(model.items[1].questions[0].id, question.id);
});

test('validates provenance and content hash like the other project snapshots', () => {
  const edited = snapshot();
  edited.content.rules[0].title = 'Editada después de importar';
  assert.throws(() => deriveRules(edited, progress), /content hash mismatch/);
  const other = snapshot();
  other.source.repository = 'https://github.com/otra/organizacion';
  assert.throws(() => deriveRules(other, progress), /corporate product repository/);
});

test('applies the product rules: no infrastructure, no credentials and no stored decision', () => {
  const text = value => { const c = content(); c.rules[1].legacy.behavior = value; return c; };
  assert.throws(() => validateRulesContent(text('Imprime en 10.1.2.3 por el puerto 9100.'), context), /private IPv4 address/);
  assert.throws(() => validateRulesContent(text('Envía Basic dXN1YXJpbzplamVtcGxv al servicio.'), context), /Basic credential/);
  assert.throws(() => validateRulesContent(text('Factura al RUT 12.345.678-5.'), context), /national identifier/);
  const stored = content();
  stored.rules[1].decision = { state: 'aceptada' };
  assert.throws(() => validateRulesContent(stored, context), /unexpected or missing fields/);
  const missing = content();
  missing.rules[1].links.questions = ['Q-999'];
  assert.throws(() => validateRulesContent(missing, { ...context, questionStates: new Map(questions.items.map(item => [item.id, item.state])) }), /not in the questions register/);
  const unknown = content();
  unknown.rules[1].workPackage = 'F09-99';
  assert.throws(() => validateRulesContent(unknown, context), /unknown package F09-99/);
});

test('the catalog shows decision counts, contradictions, evidence and links without unsafe HTML', () => {
  const html = rulesPage(deriveRules(snapshot(value => { value.rules[1].title = '<img src=x onerror=alert(1)>'; }), progress, questions));
  assert.ok(html.includes('<a href="/project/rules/?decision=abierta"><strong>2</strong> pregunta abierta</a>'));
  assert.ok(html.includes('Contradicciones abiertas entre fuentes'));
  assert.match(html, /<article id="ven-001"[^>]*data-decision="abierta"/);
  assert.ok(html.includes('mountain-implementos@f57d5900:frontend/src/app/ejemplo.ts:10-20'));
  assert.ok(html.includes(`${productRepository}/blob/${'a'.repeat(40)}/libs/ejemplo/src/regla.ts#L10`));
  assert.ok(html.includes(`<strong>Se decide en:</strong> <a href="/project/questions/#${question.id.toLowerCase()}">${question.id}</a>`));
  assert.ok(html.includes('Sin fase asignada'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('La decisión no se toma aquí'));
  assert.equal(html.split('<div').length, html.split('</div>').length, 'Every container closes, so the filters stay inside the page');
  assert.ok(html.includes('<a href="/project/questions/">Preguntas y reglas</a>'));
});

test('the decision comes from the published questions and a pre-integration revision is identified', () => {
  const states = new Map([[question.id, 'open'], [closedQuestion.id, closedQuestion.state]]);
  assert.equal(decisionOf({ links: { questions: [] } }, states), 'sin-pregunta');
  assert.equal(decisionOf({ links: { questions: [question.id, closedQuestion.id] } }, states), 'abierta');
  assert.equal(decisionOf({ links: { questions: [closedQuestion.id] } }, states), 'resuelta');
  const model = deriveRules(snapshot(value => { value.rules[1].links.questions = [closedQuestion.id]; value.rules[0].links.questions = []; }, false), progress, questions);
  assert.deepEqual(model.counts.decisions, { 'sin-pregunta': 1, abierta: 0, resuelta: 1 });
  const html = rulesPage(model);
  assert.ok(html.includes(`<strong>Se decide en:</strong> <a href="/project/questions/#${closedQuestion.id.toLowerCase()}">${closedQuestion.id}</a>`));
  assert.ok(html.includes('ninguna pregunta del registro cubre esta regla todavía'));
  assert.ok(html.includes('Corte previo a la integración'));
});

test('the section renders without a published register and loadRules waits for the first import', () => {
  const empty = rulesPage(null);
  assert.ok(empty.includes('todavía no publica el registro de reglas de negocio'));
  assert.doesNotMatch(empty, /data-project-item/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-docs-rules-'));
  try {
    assert.equal(loadRules(directory, progress), null);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
  assert.ok(renderProjectPages(progress, followUp).get('/project/').body.includes('<a href="/project/rules/">Catálogo de reglas</a>'));
});
