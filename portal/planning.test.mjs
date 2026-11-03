import assert from 'node:assert/strict';
import test from 'node:test';
import {derivePlanning, planningContentHash, validatePlanningContent} from './planning.mjs';
import {renderPlanning, relatedPlan, planningPreparation} from './planning-view.mjs';
import {planningFixture} from './planning.test-fixture.mjs';
import {deriveProject} from './project.mjs';
import {renderProjectPages} from './project-view.mjs';

test('planning remains separate from technical progress and preserves parent and follow-up links', () => {
  const fixture = planningFixture();
  const before = structuredClone(fixture.progress);
  const model = derivePlanning(fixture.snapshot, fixture.progress, fixture.followUp);
  assert.deepEqual(fixture.progress, before);
  assert.equal(model.items.length, 2);
  assert.equal(model.items[0].parent.id, 'F02-04');
  assert.equal(model.items[0].actions[0].id, 'FOLLOWUP-001');
  assert.ok(model.items.every(item => !item.ready));
  assert.ok(model.items[0].preparationReasons.some(reason => reason.includes('asignar')));
});

test('ready requires assigned human, unique ready label and completed dependencies, not closure for another reason', () => {
  const {snapshot, progress, followUp} = planningFixture();
  const [dependency, work] = snapshot.issues.entries;
  const read = () => derivePlanning(snapshot, progress, followUp).items[1];
  work.assignees = ['floxcristian'];
  work.executionLabels = ['status:ready'];
  assert.equal(read().ready, false);
  dependency.state = 'CLOSED';
  dependency.stateReason = 'not_planned';
  assert.equal(read().ready, false);
  dependency.stateReason = null;
  assert.equal(read().ready, false);
  dependency.stateReason = 'completed';
  assert.equal(read().ready, true);
  work.executionLabels.push('status:blocked');
  assert.equal(read().ready, false);
  work.executionLabels = ['status:ready'];
  work.assignees = [];
  assert.equal(read().ready, false);
  work.assignees = ['floxcristian'];
  work.state = 'CLOSED';
  work.stateReason = 'completed';
  assert.equal(read().ready, false);
});

test('planning validates types, ordering, dependencies and research output requirements', () => {
  const {snapshot, progress, followUp} = planningFixture();
  const mutations = [
    content => {content.items[0].kind = 'feature';},
    content => {content.items[0].question = null;},
    content => {content.items[0].timebox = '';},
    content => {content.items[1].question = 'Unnecessary question';},
    content => {content.items[1].order = 1;},
    content => {content.items[1].parentDelivery = 'F99-99';},
    content => {content.items[0].dependsOn = ['deliver-flow'];},
    content => {content.items[0].followUps = ['FOLLOWUP-999'];},
    content => {content.items[0].expectedTests = [];},
    content => {content.items[0].owner = 'invented';},
    content => {content.increment.coordinator = 123;},
    content => {content.items[0].key = 'constructor';},
    content => {content.items[0].key = 'prototype';},
  ];
  for (const mutate of mutations) {
    const content = structuredClone(snapshot.content);
    mutate(content);
    assert.throws(() => validatePlanningContent(content, progress, followUp));
  }
});

test('planning rejects tampered snapshots, unsupported metadata and future GitHub updates', () => {
  const fixture = planningFixture();
  const mutations = [
    snapshot => {snapshot.content.increment.title = 'Changed';},
    snapshot => {snapshot.source.revision = 'main';},
    snapshot => {snapshot.issues.entries.pop();},
    snapshot => {snapshot.issues.entries[0].body = 'private';},
    snapshot => {snapshot.issues.entries[0].stateReason = 'unknown';},
    snapshot => {snapshot.issues.entries[0].updatedAt = '2026-11-04T00:00:00Z';},
    snapshot => {snapshot.issues.entries[0].url = 'https://example.com/issue';},
  ];
  for (const mutate of mutations) {
    const snapshot = structuredClone(fixture.snapshot);
    mutate(snapshot);
    assert.throws(() => derivePlanning(snapshot, fixture.progress, fixture.followUp));
  }
});

test('render shows distinct types, uncertainty, preparation and expected evidence without making completion claims', () => {
  const fixture = planningFixture();
  fixture.snapshot.content.items[0].title = '<img src=x onerror=alert(1)>';
  fixture.snapshot.source.sha256 = planningContentHash(fixture.snapshot.content);
  const model = derivePlanning(fixture.snapshot, fixture.progress, fixture.followUp);
  const html = renderPlanning(model);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /<img src=x/);
  for (const text of ['Investigación', 'Historia', 'Pregunta de investigación', 'Pruebas esperadas', 'Condiciones para empezar', 'Sin asignar en GitHub', 'Preparación pendiente', 'no se suman al denominador']) assert.ok(html.includes(text));
  assert.match(html, /id="plan-inspect-contract"/);
  assert.match(relatedPlan(model, 'parentDelivery', 'F02-04'), /TASK-120/);
  assert.match(relatedPlan(model, 'followUps', 'FOLLOWUP-001'), /plan-deliver-flow/);
  assert.equal(relatedPlan(model, 'parentDelivery', 'F01-01'), '');
  assert.equal((html.match(/data-plan-item/g) || []).length, 2);
});

test('team shows upcoming assignees separately without treating coordination as assignment', () => {
  const fixture = planningFixture();
  fixture.snapshot.content.increment.coordinator = 'pymimtos';
  fixture.snapshot.source.sha256 = planningContentHash(fixture.snapshot.content);
  fixture.snapshot.issues.entries[0].assignees = ['floxcristian', 'external-dev'];
  const planning = derivePlanning(fixture.snapshot, fixture.progress, fixture.followUp);
  const without = deriveProject(fixture.progress, fixture.followUp);
  const model = deriveProject(fixture.progress, fixture.followUp, undefined, planning);
  assert.equal(model.people.find(person => person.github === 'floxcristian').planned.length, 1);
  assert.equal(model.people.find(person => person.github === 'external-dev').planned.length, 1);
  assert.equal(model.people.find(person => person.github === 'pymimtos').planned.length, 0);
  assert.equal(model.people.find(person => person.github === 'pymimtos').coordinatesIncrement, true);
  assert.equal(model.unassignedPlanned.length, 1);
  assert.deepEqual(model.active, without.active);
  assert.deepEqual(model.unassignedActive, without.unassignedActive);
  const html = renderProjectPages(fixture.progress, fixture.followUp, planning).get('/project/team/').body;
  for (const text of ['Trabajo del próximo incremento', 'external-dev', 'la coordinación no asigna las tareas', 'TASK-120', 'trabajos próximos sin responsable']) assert.ok(html.includes(text));
});

test('work underway and discarded issues are not described as unprepared or completed', () => {
  const fixture = planningFixture();
  const issue = fixture.snapshot.issues.entries[0];
  issue.assignees = ['floxcristian'];
  for (const [label, expected] of [['status:in-progress', 'En ejecución'], ['status:review', 'En revisión'], ['status:validation', 'En validación'], ['status:blocked', 'Bloqueado; revisar el impedimento en GitHub.']]) {
    issue.executionLabels = [label];
    const model = derivePlanning(fixture.snapshot, fixture.progress, fixture.followUp);
    assert.equal(model.items[0].ready, false, 'Already underway does not imply available to take');
    assert.deepEqual(planningPreparation(model.items[0]), {label: expected, reasons: []});
    assert.doesNotMatch(renderPlanning({...model, items: [model.items[0]]}), /Preparación pendiente|Falta confirmar las condiciones/);
  }
  issue.executionLabels = ['status:ready'];
  issue.assignees = [];
  let item = derivePlanning(fixture.snapshot, fixture.progress, fixture.followUp).items[0];
  assert.equal(planningPreparation(item).label, 'Preparación pendiente');
  assert.ok(planningPreparation(item).reasons.some(reason => reason.includes('asignar')));
  issue.executionLabels = ['status:ready', 'status:review'];
  item = derivePlanning(fixture.snapshot, fixture.progress, fixture.followUp).items[0];
  assert.ok(planningPreparation(item).reasons.some(reason => reason.includes('varios estados')));
  issue.state = 'CLOSED';
  issue.stateReason = 'not_planned';
  item = derivePlanning(fixture.snapshot, fixture.progress, fixture.followUp).items[0];
  assert.match(planningPreparation(item).label, /descartado.*no acredita cumplimiento/);
  issue.stateReason = 'completed';
  item = derivePlanning(fixture.snapshot, fixture.progress, fixture.followUp).items[0];
  assert.match(planningPreparation(item).label, /cerrado como completado/);
});
