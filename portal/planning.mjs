import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {productRepository} from './follow-up.mjs';

export const planningKinds = {story: 'Historia', bug: 'Error', 'technical-task': 'Tarea técnica', research: 'Investigación', maintenance: 'Mantenimiento'};
const login = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const keyPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const statuses = ['status:triage', 'status:ready', 'status:in-progress', 'status:blocked', 'status:review', 'status:validation'];
const shape = (value, fields, label) => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...fields].sort(), `${label} has missing or unknown fields`);
};
const text = (value, label, limit = 2400) => assert.ok(typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= limit && !/[\u0000-\u001f\u007f]/u.test(value) && !value.includes('<!--'), `${label} must be bounded plain text without managed markers`);
const strings = (values, label, nonempty = false) => {
  assert.ok(Array.isArray(values) && (!nonempty || values.length > 0) && values.length <= 30, `${label} must be a bounded array`);
  for (const value of values) text(value, label);
  assert.equal(new Set(values).size, values.length, `${label} contains duplicates`);
};
const date = (value, label) => {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${label} must be an ISO date`);
  assert.equal(new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10), value, `${label} must be a real date`);
};
const timestamp = (value, label) => {
  assert.match(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/, `${label} must be UTC`);
  assert.equal(new Date(value).toISOString(), value.replace(/(?<=:\d{2})Z$/, '.000Z'), `${label} must be a real timestamp`);
};
export const planningContentHash = content => createHash('sha256').update(JSON.stringify(content), 'utf8').digest('hex');

export function validatePlanningContent(content, progress, followUp) {
  shape(content, ['schemaVersion', 'reviewedOn', 'increment', 'items'], 'Planning content');
  assert.equal(content.schemaVersion, 1, 'Unsupported planning schema');
  date(content.reviewedOn, 'Planning review');
  shape(content.increment, ['id', 'title', 'outcome', 'coordinator'], 'Increment');
  assert.match(content.increment.id, /^INC-\d{2,}$/);
  text(content.increment.title, 'Increment title');
  text(content.increment.outcome, 'Increment outcome');
  assert.ok(content.increment.coordinator === null || (typeof content.increment.coordinator === 'string' && login.test(content.increment.coordinator)), 'Increment coordinator requires a login or null');
  assert.ok(Array.isArray(content.items) && content.items.length > 0 && content.items.length <= 30, 'A bounded increment requires items');
  const workIds = new Set(progress.workPackages.map(work => work.id));
  const followIds = new Set(followUp.items.map(item => item.id));
  const followById = new Map(followUp.items.map(item => [item.id, item]));
  const keys = new Set(), orders = new Set();
  for (const item of content.items) {
    shape(item, ['key', 'kind', 'parentDelivery', 'title', 'outcome', 'order', 'priority', 'rationale', 'dependsOn', 'followUps', 'scope', 'exclusions', 'entryCriteria', 'criteria', 'expectedTests', 'evidence', 'question', 'timebox'], 'Planning item');
    assert.ok(typeof item.key === 'string' && item.key.length <= 80 && keyPattern.test(item.key) && !['constructor', 'prototype', '__proto__'].includes(item.key) && !keys.has(item.key), 'Invalid or duplicate planning key');
    keys.add(item.key);
    assert.ok(Object.hasOwn(planningKinds, item.kind), `${item.key} has an unknown work kind`);
    assert.ok(workIds.has(item.parentDelivery), `${item.key} has an unknown parent delivery`);
    assert.ok(Number.isSafeInteger(item.order) && item.order > 0 && !orders.has(item.order), `${item.key} has an invalid or duplicate order`);
    orders.add(item.order);
    assert.ok(['P0', 'P1', 'P2'].includes(item.priority), `${item.key} has an unknown execution priority`);
    for (const field of ['title', 'outcome', 'rationale']) text(item[field], `${item.key} ${field}`);
    assert.ok(item.rationale.length >= 40, `${item.key} must explain execution ordering`);
    if (item.priority === 'P0') assert.ok(item.rationale.startsWith('Urgencia: ') && item.rationale.length >= 100, `${item.key} P0 requires an explicit urgency rationale`);
    for (const field of ['dependsOn', 'followUps', 'scope', 'exclusions', 'entryCriteria', 'criteria', 'expectedTests', 'evidence']) strings(item[field], `${item.key} ${field}`, !['dependsOn', 'followUps'].includes(field));
    assert.ok(item.followUps.every(id => followIds.has(id)), `${item.key} references an unknown follow-up`);
    assert.ok(item.followUps.every(id => followById.get(id).workPackages.some(work => (typeof work === 'string' ? work : work.id) === item.parentDelivery)), `${item.key} follow-up must concern its parent delivery`);
    if (item.kind === 'research') {
      text(item.question, `${item.key} research question`);
      text(item.timebox, `${item.key} research timebox`);
      assert.ok(/\d/.test(item.timebox) && item.followUps.length > 0, `${item.key} research needs bounded effort and an existing uncertainty`);
    } else {
      assert.equal(item.question, null, `${item.key} only research has a question`);
      assert.equal(item.timebox, null, `${item.key} only research has a timebox`);
    }
  }
  assert.deepEqual([...orders].sort((a, b) => a - b), content.items.map((_, index) => index + 1), 'Execution order must be contiguous');
  const byKey = new Map(content.items.map(item => [item.key, item]));
  for (const item of content.items) for (const dependency of item.dependsOn) {
    assert.ok(keys.has(dependency) && dependency !== item.key, `${item.key} has an invalid dependency`);
    assert.ok(byKey.get(dependency).order < item.order, `${item.key} must follow its dependencies`);
  }
  return content;
}

export function derivePlanning(snapshot, progress, followUp) {
  shape(snapshot, ['schemaVersion', 'source', 'content', 'issues'], 'Planning snapshot');
  assert.equal(snapshot.schemaVersion, 1, 'Unsupported planning snapshot schema');
  shape(snapshot.source, ['repository', 'revision', 'path', 'sha256'], 'Planning source');
  assert.equal(snapshot.source.repository, productRepository);
  assert.equal(snapshot.source.path, 'delivery/planning.json');
  assert.match(snapshot.source.revision, /^[a-f0-9]{40}$/);
  assert.equal(snapshot.source.sha256, planningContentHash(snapshot.content), 'Planning content hash mismatch');
  validatePlanningContent(snapshot.content, progress, followUp);
  shape(snapshot.issues, ['observedAt', 'repository', 'entries'], 'Planning issue snapshot');
  assert.equal(snapshot.issues.repository, productRepository);
  timestamp(snapshot.issues.observedAt, 'Planning GitHub observation');
  assert.ok(snapshot.content.reviewedOn <= snapshot.issues.observedAt.slice(0, 10), 'Planning observation predates review');
  assert.ok(Array.isArray(snapshot.issues.entries), 'Planning issues must be an array');
  const issues = new Map(), numbers = new Set();
  const parentIssueNumbers = new Set(followUp.workPackages.map(work => work.issue.number));
  for (const issue of snapshot.issues.entries) {
    shape(issue, ['code', 'number', 'url', 'state', 'stateReason', 'executionLabels', 'assignees', 'updatedAt'], 'Planning issue');
    assert.ok(!issues.has(issue.code), 'Duplicate planning issue code');
    assert.ok(Number.isSafeInteger(issue.number) && issue.number > 0 && !numbers.has(issue.number), 'Invalid or duplicate planning issue number');
    assert.ok(!parentIssueNumbers.has(issue.number), 'Planning work cannot reuse a roadmap delivery issue');
    numbers.add(issue.number);
    assert.equal(issue.url, `${productRepository}/issues/${issue.number}`);
    assert.ok(['OPEN', 'CLOSED'].includes(issue.state), 'Unknown planning issue state');
    assert.ok(issue.stateReason === null || ['completed', 'not_planned', 'reopened'].includes(issue.stateReason), 'Unknown planning close reason');
    strings(issue.executionLabels, 'Planning execution labels');
    assert.ok(issue.executionLabels.every(label => /^status:[a-z][a-z-]*$/.test(label)), 'Unexpected planning label');
    strings(issue.assignees, 'Planning assignees');
    assert.ok(issue.assignees.every(value => login.test(value)), 'Invalid planning assignee');
    timestamp(issue.updatedAt, 'Planning issue update');
    assert.ok(new Date(issue.updatedAt) <= new Date(snapshot.issues.observedAt), 'Issue update follows planning observation');
    issues.set(issue.code, issue);
  }
  assert.deepEqual([...issues.keys()].sort(), snapshot.content.items.map(item => item.key).sort(), 'Planning issues must cover exactly the increment');
  const parents = new Map(followUp.workPackages.map(work => [work.id, work]));
  const actions = new Map(followUp.items.map(item => [item.id, item]));
  const warnings = [];
  const items = [...snapshot.content.items].sort((a, b) => a.order - b.order).map(item => {
    const issue = issues.get(item.key);
    const dependencies = item.dependsOn.map(key => ({key, issue: issues.get(key)}));
    const pendingDependencies = dependencies.filter(dependency => dependency.issue.state !== 'CLOSED' || dependency.issue.stateReason !== 'completed');
    const reasons = [];
    if (!issue.assignees.length) reasons.push('Falta asignar una persona responsable en GitHub.');
    if (issue.executionLabels.length > 1) reasons.push('Hay varios estados de ejecución; conciliarlos en GitHub antes de seleccionar el trabajo.');
    else if (issue.executionLabels.length === 0 || issue.executionLabels[0] === 'status:triage') reasons.push('Falta confirmar las condiciones de entrada y marcarla lista en GitHub.');
    else if (!statuses.includes(issue.executionLabels[0])) reasons.push('El estado de ejecución no está reconocido; revisarlo en GitHub.');
    if (pendingDependencies.length) reasons.push(`Dependencias sin cierre completado: ${pendingDependencies.map(dependency => `TASK-${dependency.issue.number}`).join(', ')}.`);
    if (issue.state === 'OPEN' && (issue.executionLabels.length !== 1 || !statuses.includes(issue.executionLabels[0]))) warnings.push(`${item.key}: estado de ejecución sin confirmar.`);
    return {...item, issue, parent: parents.get(item.parentDelivery), actions: item.followUps.map(id => actions.get(id)), dependencies, ready: issue.state === 'OPEN' && issue.executionLabels.length === 1 && issue.executionLabels[0] === 'status:ready' && reasons.length === 0, preparationReasons: reasons};
  });
  return {source: snapshot.source, reviewedOn: snapshot.content.reviewedOn, observedAt: snapshot.issues.observedAt, increment: snapshot.content.increment, items, warnings};
}

export function loadPlanning(root, progress, followUp) {
  return derivePlanning(JSON.parse(fs.readFileSync(path.join(root, 'portal/data/project-planning.json'), 'utf8')), progress, followUp);
}
