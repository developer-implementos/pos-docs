/* Stable public identities shared by rendering, validation and export tools. */
'use strict';
const assert = require('node:assert/strict');
const collection = require('./collection.json');

assert.equal(collection.schemaVersion, 1, 'Unsupported diagram collection');
assert.match(collection.atlas, /^00-[a-z][a-z0-9-]*$/);
assert.ok(Array.isArray(collection.boards) && collection.boards.length > 0);
const ids = new Set(), files = new Set(), keys = new Set();
for (const board of collection.boards) {
  assert.match(board.id, /^[a-z][a-z0-9-]*$/);
  assert.match(board.file, /^(?!00)\d{2}-[a-z][a-z0-9-]*$/);
  assert.ok(['structural', 'dynamic'].includes(board.kind), `Unknown diagram kind: ${board.id}`);
  assert.ok(typeof board.title === 'string' && board.title.trim(), `Missing title: ${board.id}`);
  assert.ok(!ids.has(board.id) && !files.has(board.file), `Duplicate diagram identity: ${board.id}`);
  ids.add(board.id); files.add(board.file);
  if (board.kind === 'structural') {
    assert.match(board.key, /^c4-[a-z][a-z0-9-]*$/);
    assert.ok(!keys.has(board.key), `Duplicate diagram source: ${board.key}`);
    keys.add(board.key);
  } else assert.equal(board.key, undefined, `Dynamic diagram cannot have a Mermaid key: ${board.id}`);
}

const structuralBoards = collection.boards.filter(board => board.kind === 'structural');
const dynamicBoards = collection.boards.filter(board => board.kind === 'dynamic');
const byId = new Map(collection.boards.map(board => [board.id, board]));

function assertModels(model, dynamic) {
  assert.deepEqual(Array.from(model.views, view => view.id).sort(), structuralBoards.map(board => board.id).sort(), 'C4 views differ from the published collection');
  for (const view of model.views) assert.equal(view.key, byId.get(view.id).key, `Wrong Mermaid source for ${view.id}`);
  if (dynamic) assert.deepEqual(Array.from(dynamic, view => view.id).sort(), dynamicBoards.map(board => board.id).sort(), 'Dynamic views differ from the published collection');
}

module.exports = { collection, structuralBoards, dynamicBoards, byId, assertModels };
