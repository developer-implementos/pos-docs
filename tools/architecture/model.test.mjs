import assert from 'node:assert/strict';
import test from 'node:test';
import { architecture } from './model.mjs';
import { architectureViews, projectArchitecture, scenarioView, validateArchitecture } from './views.mjs';
import { renderArchitecture } from './render.mjs';

const copy = () => structuredClone(architecture);

test('the proposed topology retains explicit process ownership and seven product applications', () => {
  assert.doesNotThrow(() => validateArchitecture());
  assert.equal(architecture.nodes.find(node => node.id === 'bridge').kind, 'app');
  assert.equal(architecture.nodes.find(node => node.id === 'bridge').title, 'device-agent');
  assert.equal(architecture.nodes.find(node => node.id === 'bridge').status, 'proposed');
  assert.equal(architecture.nodes.find(node => node.id === 'publisher').owner, 'country-api');
  assert.equal(architecture.nodes.find(node => node.id === 'master-source').owner, 'erp-worker');
  const invalid = copy(); invalid.nodes.find(node => node.id === 'access').owner = 'country-api';
  assert.throws(() => validateArchitecture(invalid), /process boundary/);
  invalid.nodes.find(node => node.id === 'access').owner = undefined;
  assert.throws(() => validateArchitecture(invalid), /requires an application owner/);
});

test('a client or integration worker cannot bypass the owning API with SQL', () => {
  for (const [from, to] of [['desktop', 'branch-db'], ['mobile', 'branch-db'], ['bridge', 'branch-db'], ['erp-worker', 'country-db'], ['master-source', 'country-db']]) {
    const invalid = copy(); invalid.edges.push({ ...invalid.edges[0], id: 'sql-bypass', from, to });
    assert.throws(() => validateArchitecture(invalid), /SQL/);
  }
});

test('workers and the device agent initiate HTTPS toward their authoritative API', () => {
  for (const id of ['sync-country', 'claim-report', 'submit-publication', 'device-command', 'bridge-evidence']) {
    const invalid = copy(), edge = invalid.edges.find(edge => edge.id === id);
    [edge.from, edge.to] = [edge.to, edge.from];
    assert.throws(() => validateArchitecture(invalid), /Outgoing HTTPS boundary changed/);
  }
});

test('device-agent owns its SQLite journal and cannot require a desktop or mobile relay', () => {
  for (const [from, to] of [['desktop', 'bridge'], ['mobile', 'bridge'], ['bridge', 'desktop'], ['bridge', 'mobile'], ['desktop', 'devices'], ['mobile', 'device-journal']]) {
    const invalid = copy(); invalid.edges.push({ ...invalid.edges[0], id: 'client-relay', from, to });
    assert.throws(() => validateArchitecture(invalid), /client relay/);
  }
  const invalid = copy(); invalid.edges.push({ ...invalid.edges[0], id: 'journal-bypass', from: 'branch-api', to: 'device-journal' });
  assert.throws(() => validateArchitecture(invalid), /journal has a single application owner/);
  const missing = copy(); missing.edges = missing.edges.filter(edge => edge.id !== 'agent-journal');
  assert.throws(() => validateArchitecture(missing), /local SQLite contract/);
});

test('base is a projection, with optional infrastructure excluded and contract identities preserved', () => {
  const before = JSON.stringify(architecture), base = architectureViews.find(view => view.id === 'base').model;
  assert.deepEqual(base.nodes.filter(node => node.kind === 'app').map(node => node.id).sort(), architecture.nodes.filter(node => node.kind === 'app').map(node => node.id).sort());
  for (const id of ['redis-cache', 'redis-jobs', 'bullmq', 'rabbitmq', 'network-devices']) assert.ok(!base.nodes.some(node => node.id === id), `${id} is not an initial dependency`);
  for (const id of ['bridge', 'device-journal', 'devices']) assert.ok(base.nodes.some(node => node.id === id), `${id} must be visible in the base device flow`);
  for (const id of ['device-command', 'device-jobs-local', 'bridge-evidence', 'agent-journal', 'hardware-command']) assert.ok(base.edges.some(edge => edge.id === id), `${id} must retain its contract in the base view`);
  const source = architecture.edges.find(edge => edge.id === 'commit-local');
  const projected = base.edges.find(edge => edge.id === 'commit-local');
  assert.equal(source.from, 'transaction'); assert.equal(projected.from, 'branch-api');
  assert.equal(projected.sourceFrom, 'transaction'); assert.equal(projected.protocol, source.protocol);
  assert.equal(projected.guarantees, source.guarantees);
  projectArchitecture(architecture, ['country-api', 'country-db']);
  assert.equal(JSON.stringify(architecture), before);
});

test('initial dedicated printing and later network sharing retain different deployment scopes', () => {
  const initial = architecture.scenarios.find(scenario => scenario.id === 'local-printing');
  const later = architecture.scenarios.find(scenario => scenario.id === 'shared-printing');
  assert.match(initial.title, /^F02/); assert.match(later.title, /^F06/);
  assert.ok(initial.steps.some(step => step.edges.includes('hardware-command')));
  assert.ok(later.steps.some(step => step.edges.includes('network-hardware-command')));
  assert.equal(architecture.edges.find(edge => edge.id === 'network-hardware-command').status, 'conditional');
  const mobileEarly = copy(); mobileEarly.scenarios.find(scenario => scenario.id === 'local-printing').steps[0].nodes.push('mobile');
  assert.throws(() => validateArchitecture(mobileEarly), /Initial dedicated printing/);
  const networkEarly = copy(); networkEarly.nodes.find(node => node.id === 'network-devices').status = 'proposed';
  assert.throws(() => validateArchitecture(networkEarly), /later conditional capability/);
});

test('every scenario renders its actual participants and only the selected contracts', () => {
  for (const scenario of architecture.scenarios) for (let index = 0; index < scenario.steps.length; index++) {
    const view = scenarioView(scenario, index), ids = new Set(view.nodes.map(node => node.id));
    assert.deepEqual(view.edges.map(edge => edge.id).sort(), [...scenario.steps[index].edges].sort());
    for (const edge of view.edges) { assert.ok(ids.has(edge.from)); assert.ok(ids.has(edge.to)); }
    for (const node of view.nodes) if (node.owner) assert.ok(ids.has(node.owner));
  }
  const invalid = copy(); invalid.scenarios[0].steps[0].nodes = ['desktop'];
  assert.throws(() => validateArchitecture(invalid), /Scenario omits relationship endpoint/);
});

test('RabbitMQ evaluation is an association, never an invented producer contract', () => {
  const edge = architecture.edges.find(edge => edge.id === 'broker-candidate');
  assert.equal(edge.relation, 'evaluation'); assert.equal(edge.status, 'unresolved');
  const view = projectArchitecture(architecture, ['country-api', 'country-work', 'rabbitmq'], { compact: false, edgeIds: [edge.id] });
  const svg = renderArchitecture(view);
  const group = svg.match(/<g class="architecture-edge"[^]*?<\/g>/u)?.[0];
  assert.match(group, /data-relation="evaluation"/);
  assert.doesNotMatch(group, /marker-end=/);
  const invalid = copy(); invalid.edges.find(edge => edge.id === 'broker-candidate').status = 'proposed';
  assert.throws(() => validateArchitecture(invalid), /Evaluation is not an adopted contract/);
});

test('the base download is deterministic, portable vector output with meaningful labels', () => {
  const model = architectureViews[0].model, before = JSON.stringify(model);
  const svg = renderArchitecture(model);
  assert.equal(svg, renderArchitecture(model)); assert.equal(JSON.stringify(model), before);
  assert.doesNotMatch(svg, /<(?:script|image|foreignObject)\b|<[^>]+(?:tabindex=|role="button")/u);
  for (const node of model.nodes) assert.ok(svg.includes(`data-item-id="${node.id}"`));
  for (const edge of model.edges) assert.ok(svg.includes(edge.protocolLabel));
});
