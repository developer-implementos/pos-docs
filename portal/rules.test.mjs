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
import { deriveRules, loadRules, rulesContentHash, rulesSourcePath, validateRulesContent, withoutPhase } from './rules.mjs';

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
  decision: { state: 'pendiente', decider: 'Operaciones tienda', acceptedBy: null, acceptedOn: null, evidence: null, observations: [] },
  target: null,
  links: { questions: [question.id], parity: [], claims: [], followUps: [], issues: [], related: [] },
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
  assert.deepEqual(model.counts.decisions, { pendiente: 2, aceptada: 0, 'con-observacion': 0 });
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

test('applies the product rules: no infrastructure, no credentials and no acceptance by an agent', () => {
  const text = value => { const c = content(); c.rules[1].legacy.behavior = value; return c; };
  assert.throws(() => validateRulesContent(text('Imprime en 10.1.2.3 por el puerto 9100.'), context), /private IPv4 address/);
  assert.throws(() => validateRulesContent(text('Envía Basic dXN1YXJpbzplamVtcGxv al servicio.'), context), /Basic credential/);
  assert.throws(() => validateRulesContent(text('Factura al RUT 12.345.678-5.'), context), /national identifier/);
  const accepted = content();
  Object.assign(accepted.rules[1].decision, { state: 'aceptada', acceptedBy: 'Agente IA', acceptedOn: '2026-11-11', evidence: 'https://github.com/developer-implementos/pos-platform/issues/1' });
  accepted.rules[1].target = 'El tope es un parámetro.';
  assert.throws(() => validateRulesContent(accepted, context), /an agent never accepts/);
  accepted.rules[1].decision.acceptedBy = 'persona-ejemplo';
  const states = new Map(questions.items.map(item => [item.id, item.state]));
  assert.throws(() => validateRulesContent(structuredClone(accepted), { ...context, questionStates: states }), /still open/);
  accepted.rules[1].links.questions = [closedQuestion.id];
  assert.doesNotThrow(() => validateRulesContent(accepted, { ...context, questionStates: states }));
  const unknown = content();
  unknown.rules[1].workPackage = 'F09-99';
  assert.throws(() => validateRulesContent(unknown, context), /unknown package F09-99/);
});

test('the rules page shows decision counts, contradictions, evidence and links without unsafe HTML', () => {
  const html = rulesPage(deriveRules(snapshot(value => { value.rules[1].title = '<img src=x onerror=alert(1)>'; }), progress, questions));
  assert.match(html, /<a href="\/project\/rules\/\?decision=pendiente"><strong>2<\/strong> pendiente<\/a>/);
  assert.match(html, /Contradicciones abiertas entre fuentes/);
  assert.match(html, /<article id="ven-001"[^>]*data-decision="pendiente"/);
  assert.ok(html.includes('mountain-implementos@f57d5900:frontend/src/app/ejemplo.ts:10-20'));
  assert.ok(html.includes(`${productRepository}/blob/${'a'.repeat(40)}/libs/ejemplo/src/regla.ts#L10`));
  assert.ok(html.includes(`<a href="/project/questions/#${question.id.toLowerCase()}">${question.id}</a>`));
  assert.ok(html.includes('Sin fase asignada'));
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /Un agente, una prueba o esta publicación no aceptan en su nombre/);
});

test('an accepted rule names who accepted it and a pre-integration revision is identified', () => {
  const model = deriveRules(snapshot(value => {
    Object.assign(value.rules[1].decision, { state: 'aceptada', acceptedBy: 'persona-ejemplo', acceptedOn: '2026-11-11', evidence: 'https://github.com/developer-implementos/pos-platform/issues/1#issuecomment-2' });
    value.rules[1].target = 'El tope es un parámetro del perfil.';
    value.rules[1].links.questions = [closedQuestion.id];
  }, false), progress, questions);
  const html = rulesPage(model);
  assert.ok(html.includes('Aceptada por <a href="https://github.com/persona-ejemplo">@persona-ejemplo</a>'));
  assert.ok(html.includes('El tope es un parámetro del perfil.'));
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
  assert.ok(renderProjectPages(progress, followUp).get('/project/').body.includes('<a href="/project/rules/">Reglas de negocio</a>'));
});
