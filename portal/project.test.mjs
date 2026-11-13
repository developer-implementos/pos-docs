import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { deriveProject, executionLabel, isActiveWork } from './project.mjs';
import { matchesProjectItem } from './project.js';
import { loadProgress } from './progress.mjs';
import { loadFollowUp } from './follow-up.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const progress = loadProgress(root);
const followUp = loadFollowUp(root, progress);

test('project projections preserve source facts and keep technical and execution states separate', () => {
  const before = structuredClone({ progress, followUp });
  const model = deriveProject(progress, followUp);
  assert.deepEqual({ progress, followUp }, before);
  assert.equal(model.works, followUp.workPackages);
  assert.equal(model.progress.percent, progress.percent);
  assert.equal(model.openActions.length, followUp.counts.open);
  assert.equal(model.unassignedActions.length, followUp.counts.unassigned);
  assert.ok(model.activePreview.length <= 6);
  assert.equal(model.active.length, followUp.workPackages.filter(isActiveWork).length);
});

test('team records unknown logins and distinguishes follow-up ownership from developer assignment', () => {
  const work = (id, state, assignees, labels = ['status:in-progress']) => ({ id, status: 'verified', issue: { state, assignees, executionLabels: labels } });
  const model = deriveProject({}, {
    workPackages: [work('F01-01', 'OPEN', ['Known', 'external']), work('F01-02', 'CLOSED', ['Known']), work('F01-03', 'OPEN', [], ['status:triage']), work('F01-04', 'OPEN', [])],
    items: [{ state: 'open', owner: 'KNOWN' }, { state: 'open', owner: 'coordinator' }, { state: 'open', owner: null }, { state: 'resolved', owner: 'external' }],
  }, [{ github: 'known', name: 'Known member', avatar: 'known.jpg', role: 'Developer' }]);
  assert.equal(model.people.length, 3);
  assert.deepEqual(model.people[0].active.map(item => item.id), ['F01-01']);
  assert.equal(model.people[0].actions.length, 1);
  assert.equal(model.people.find(person => person.github === 'external').avatar, null);
  assert.equal(model.people.find(person => person.github === 'coordinator').active.length, 0);
  assert.equal(model.unassignedActive.length, 1);
  assert.equal(model.unassignedWork.length, 2);
  assert.equal(model.unassignedActions.length, 1);
  assert.equal(model.active.length, 2, 'Shared assignment never duplicates a work item in the overall count');
});

test('closed and ambiguous issues are not presented as confirmed execution states', () => {
  assert.equal(executionLabel({ state: 'CLOSED', executionLabels: ['status:in-progress'] }), 'Cerrada');
  assert.equal(executionLabel({ state: 'OPEN', executionLabels: [] }), 'Estado sin confirmar');
  assert.equal(executionLabel({ state: 'OPEN', executionLabels: ['status:review', 'status:ready'] }), 'Estado sin confirmar');
  assert.equal(isActiveWork({ issue: { state: 'CLOSED', executionLabels: ['status:in-progress'] } }), false);
  assert.equal(isActiveWork({ issue: { state: 'OPEN', executionLabels: ['status:ready'] } }), false, 'Ready to take is not work already underway');
  assert.equal(isActiveWork({ issue: { state: 'OPEN', executionLabels: ['status:in-progress', 'status:review'] } }), false, 'Ambiguous labels do not establish a confirmed active execution state');
  assert.equal(isActiveWork({ issue: { state: 'OPEN', executionLabels: [] } }), false);
});

test('work filters intersect criteria without conflating acceptance, technical status or GitHub activity', () => {
  const data = { status: 'verified', review: 'true', active: 'true', phase: 'phase-01', app: 'branch-api pos-desktop', assignee: 'Known other' };
  assert.equal(matchesProjectItem(data, 'F01-01 Verificación de catálogo', { query: 'verificacion', status: 'review', app: 'branch-api', assignee: 'known' }, 'work'), true);
  assert.equal(matchesProjectItem(data, 'F01-01', { status: 'active' }, 'work'), true);
  assert.equal(matchesProjectItem(data, 'F01-01', { status: 'remaining' }, 'work'), false);
  assert.equal(matchesProjectItem(data, 'F01-01', { assignee: 'unassigned' }, 'work'), false);
  assert.equal(matchesProjectItem(data, 'F01-01', { app: 'api' }, 'work'), false);
  assert.equal(matchesProjectItem(data, 'F01-01', { phase: 'phase-02' }, 'work'), false);
  assert.equal(matchesProjectItem({ ...data, review: 'false' }, 'F01-01', { status: 'review' }, 'work'), false);
});

test('attention filters preserve resolved actions and distinguish counterpart from owner', () => {
  const data = { state: 'resolved', kind: 'access', scope: 'technical', owner: '' };
  assert.equal(matchesProjectItem(data, 'Acceso · Infraestructura', {}, 'attention'), true);
  assert.equal(matchesProjectItem(data, 'Acceso · Infraestructura', { state: 'open' }, 'attention'), false);
  assert.equal(matchesProjectItem(data, 'Acceso · Infraestructura', { owner: 'unassigned', scope: 'technical' }, 'attention'), true);
  assert.equal(matchesProjectItem(data, 'Acceso · Infraestructura', { owner: 'Infraestructura' }, 'attention'), false);
});

test('question filters match state, any affected phase and the exact decider role', () => {
  const data = { state: 'open', phases: 'phase-01 phase-04', decider: 'Comercial y Operaciones', owner: '' };
  const text = 'Q-03 Permisos ¿El cajero debe crear y editar clientes?';
  assert.equal(matchesProjectItem(data, text, {}, 'questions'), true);
  assert.equal(matchesProjectItem(data, text, { state: 'open', phase: 'phase-04', decider: 'Comercial y Operaciones' }, 'questions'), true, 'A question appears under every phase it affects');
  assert.equal(matchesProjectItem(data, text, { phase: 'phase-02' }, 'questions'), false);
  assert.equal(matchesProjectItem(data, text, { phase: 'phase-0' }, 'questions'), false);
  assert.equal(matchesProjectItem(data, text, { state: 'decided' }, 'questions'), false, 'An open rule is never shown as decided');
  assert.equal(matchesProjectItem(data, text, { decider: 'Comercial' }, 'questions'), false, 'A decider filter selects one role, not a prefix');
  assert.equal(matchesProjectItem(data, text, { query: 'cajero' }, 'questions'), true);
  assert.equal(matchesProjectItem(data, text, { query: 'tesoreria' }, 'questions'), false);
});

test('question filters match the exact priority, combined with the role and the state', () => {
  const data = { state: 'open', phases: 'phase-01', decider: 'tesoreria', priority: 'P1', owner: '' };
  const text = 'Q-08 Pagos ¿Quién concilia un pago en curso?';
  assert.equal(matchesProjectItem(data, text, { decider: 'tesoreria', state: 'open', priority: 'P1' }, 'questions'), true, 'The agenda link of a role and a priority selects its question');
  assert.equal(matchesProjectItem(data, text, { priority: 'P2' }, 'questions'), false);
  assert.equal(matchesProjectItem(data, text, { priority: 'P' }, 'questions'), false, 'A priority filter selects one priority, not a prefix');
  assert.equal(matchesProjectItem(data, text, { decider: 'cobranza', priority: 'P1' }, 'questions'), false);
});

test('question filters select the kind and every role that takes part, deciding or consulted', () => {
  const fact = { state: 'open', kind: 'fact', phases: 'phase-01', decider: 'tributario', roles: 'tributario comercial ti-erp soporte', priority: 'P1', owner: '' };
  const text = 'Q-60 Impuestos ¿La fuente de precios publica los precios con IVA incluido?';
  assert.equal(matchesProjectItem(fact, text, { role: 'ti-erp', kind: 'fact', state: 'open' }, 'questions'), true, 'The data link of a consulted role selects the fact');
  assert.equal(matchesProjectItem(fact, text, { role: 'tributario', kind: 'fact', state: 'open' }, 'questions'), true, 'The role that confirms a fact also provides its data');
  assert.equal(matchesProjectItem(fact, text, { decider: 'ti-erp' }, 'questions'), false, 'Being consulted is not deciding');
  assert.equal(matchesProjectItem(fact, text, { role: 'ti' }, 'questions'), false, 'A role filter selects one role, not a prefix');
  assert.equal(matchesProjectItem(fact, text, { kind: 'rule' }, 'questions'), false, 'A fact is not a rule to decide');
  const rule = { ...fact, kind: 'rule', decider: 'tesoreria', roles: 'tesoreria cobranza' };
  assert.equal(matchesProjectItem(rule, text, { decider: 'tesoreria', kind: 'rule', state: 'open', priority: 'P1' }, 'questions'), true, 'The decision link of a role and a priority selects its rule');
  assert.equal(matchesProjectItem(rule, text, { role: 'cobranza', state: 'open' }, 'questions'), true, 'The name of a role opens also the rules where it is only consulted');
  assert.equal(matchesProjectItem(rule, text, { role: 'cobranza', kind: 'fact' }, 'questions'), false);
});

test('question filters match whether the agent recommended a rule and the exact scope', () => {
  const recommended = { state: 'open', phases: 'phase-01', decider: 'Comercial', recommendation: 'present', scope: 'country' };
  const pending = { state: 'open', phases: 'phase-01', decider: 'Comercial', recommendation: 'none', scope: '' };
  const fact = { state: 'answered', phases: 'phase-01', decider: 'Finanzas', recommendation: 'not_applicable', scope: '' };
  assert.equal(matchesProjectItem(recommended, 'Q-01', { recommendation: 'present', scope: 'country' }, 'questions'), true);
  assert.equal(matchesProjectItem(recommended, 'Q-01', { recommendation: 'none' }, 'questions'), false);
  assert.equal(matchesProjectItem(pending, 'Q-02', { recommendation: 'none' }, 'questions'), true, 'An open rule without a recommendation is missing one');
  assert.equal(matchesProjectItem(pending, 'Q-02', { recommendation: 'present' }, 'questions'), false);
  assert.equal(matchesProjectItem(recommended, 'Q-01', { scope: 'core' }, 'questions'), false);
  assert.equal(matchesProjectItem(recommended, 'Q-01', { scope: 'coun' }, 'questions'), false, 'A scope filter selects one level, not a prefix');
  assert.equal(matchesProjectItem(fact, 'Q-04', { recommendation: 'none' }, 'questions'), false, 'A fact never counts as missing a recommendation');
  assert.equal(matchesProjectItem(fact, 'Q-04', { recommendation: 'present' }, 'questions'), false);
  assert.equal(matchesProjectItem(fact, 'Q-04', {}, 'questions'), true);
});
