import test from 'node:test';
import assert from 'node:assert/strict';
import { architecture } from '../architecture/model.mjs';
import { architectureViews } from '../architecture/views.mjs';
import { projectApplications, projectScenario, detailData } from './project.mjs';
import { exploreCatalog } from './catalog.mjs';
import { compileWorkflow } from './vendor/archify/renderers/workflow/workflow-compiler.mjs';

test('application projection retains seven applications and all selected store contracts', () => {
  const projection = projectApplications();
  const ids = new Set(projection.components.map(component => component.id));
  const expectedApps = architecture.nodes.filter(node => node.kind === 'app');
  for (const app of expectedApps) assert.ok(ids.has(app.id), `Missing application ${app.id}`);
  const expected = architectureViews.find(view => view.id === 'base').model.edges.filter(edge => ids.has(edge.from) && ids.has(edge.to));
  assert.deepEqual(projection.connections.map(edge => [edge.id, edge.from, edge.to, edge.label]), expected.map(edge => [edge.id, edge.from, edge.to, edge.title]));
  for (const component of projection.components) assert.ok(component.pos?.every(Number.isFinite), `Unplaced canonical node ${component.id}`);
  assert.equal(projection.components.filter(node => node.type === 'database').length, 5);
});

test('every canonical scenario keeps its ordered steps and exact explanatory text', () => {
  assert.equal(exploreCatalog.filter(entry => entry.status === 'proposed').length, architecture.scenarios.length + 1);
  for (const scenario of architecture.scenarios) {
    const projected = projectScenario(scenario);
    assert.equal(projected.nodes.length, scenario.steps.length);
    assert.deepEqual(projected.nodes.map(node => [node.label, node.sublabel].filter(Boolean).join(' ')), scenario.steps.map(step => step.title));
    assert.deepEqual(projected.cards.map(card => card.items[0]), scenario.steps.map(step => step.description));
    assert.equal(projected.edges.length, scenario.steps.length - 1);
    for (const [index, step] of scenario.steps.entries()) assert.equal(detailData(scenario.id).nodes[`step-${index + 1}`].description, step.description);
  }
});

test('proposal details preserve conditional and unresolved contracts instead of claiming implementation', () => {
  const details = detailData('applications');
  assert.equal(details.nodes['redis-cache'].status, 'conditional');
  assert.equal(details.nodes.payments.status, 'unresolved');
  assert.ok(details.edges['bridge-evidence'].href.endsWith('#detail-bridge-evidence'));
  assert.ok(exploreCatalog.filter(entry => entry.type !== 'lifecycle').every(entry => entry.status === 'proposed'));
});

test('every proposed workflow remains readable with the pinned showcase compiler', () => {
  for (const scenario of architecture.scenarios) {
    const workflow = projectScenario(scenario);
    const result = compileWorkflow({ workflow, qualityProfile: workflow.meta.quality_profile });
    assert.equal(result.ok, true, `${scenario.id}: ${JSON.stringify(result.diagnostics)}`);
  }
});
