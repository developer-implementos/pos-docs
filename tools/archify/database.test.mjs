import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { projectDatabase, foreignKeyRelationship } from './database.mjs';
import { lifecycles } from '../architecture/lifecycles.mjs';
import { projectLifecycle, lifecycleDetails } from './lifecycle.mjs';

const schema = JSON.parse(fs.readFileSync(new URL('../../data/product-reference/database/schema.json', import.meta.url)));
const source = JSON.parse(fs.readFileSync(new URL('../../data/product-reference/manifest.json', import.meta.url))).source;

test('all physical tables and columns appear in their canonical context with real SQL types', () => {
  const diagrams = projectDatabase(schema, source);
  const expectedContexts = schema.databases.reduce((sum, database) => sum + new Set(database.tables.map(table => table.context)).size, 0);
  assert.equal(diagrams.length, expectedContexts);
  for (const database of schema.databases) for (const table of database.tables) {
    const projection = diagrams.find(item => item.id === `data-${database.id}-${table.context}`);
    const entity = projection.diagram.entities.find(entity => entity.id === `${table.schema}__${table.name}`);
    assert.deepEqual(entity.attributes.map(attribute => [attribute.name, attribute.type]), table.columns.map(column => [column.name, column.type]));
    for (const constraint of table.constraints.filter(key => key.type === 'f')) {
      assert.ok(Object.values(projection.details.edges).some(detail => detail.title === constraint.name && detail.description === constraint.definition), `Missing FK ${constraint.name}`);
    }
    for (const column of table.columns) if (table.constraints.some(key => key.type === 'f' && key.columns.includes(column.name))) assert.ok(entity.attributes.find(item => item.name === column.name).key.includes('fk'), `${table.name}.${column.name} must retain FK role`);
  }
});

test('FK cardinality uses declared composite constraints, not partial unique indexes', () => {
  const table = { schema: 'sales', name: 'line', columns: [{ name: 'sale_id', nullable: false }, { name: 'branch_id', nullable: false }], constraints: [{ type: 'p', columns: ['sale_id', 'branch_id'] }], indexes: [{ definition: 'CREATE UNIQUE INDEX only_active ON sales.line(sale_id) WHERE active' }] };
  const fk = { columns: ['sale_id'], references: { schema: 'sales', table: 'sale', columns: ['id'] } };
  assert.equal(foreignKeyRelationship(table, fk, 0).toCardinality, 'many');
  assert.equal(foreignKeyRelationship(table, { ...fk, columns: ['sale_id', 'branch_id'] }, 0).toCardinality, 'one');
  table.columns[0].nullable = true;
  assert.equal(foreignKeyRelationship(table, fk, 0).fromOptional, true);
});

test('state projections retain every evidenced state and transition independently of visual main path', () => {
  for (const lifecycle of lifecycles) {
    const diagram = projectLifecycle(lifecycle);
    assert.deepEqual(diagram.states.map(state => [state.id, state.label, state.type]), lifecycle.states.map(state => [state.id, state.label, state.kind]));
    assert.deepEqual(diagram.transitions.map(edge => [edge.from, edge.to, edge.label]), lifecycle.transitions.map(edge => [edge.from, edge.to, edge.label]));
    const details = lifecycleDetails(lifecycle);
    for (const detail of [...Object.values(details.nodes), ...Object.values(details.edges)]) {
      assert.equal(detail.evidenceKind, 'source-inspection');
      assert.ok(detail.links.every(link => link.href.includes(`/blob/${lifecycle.meta.commit}/`)));
    }
  }
});
