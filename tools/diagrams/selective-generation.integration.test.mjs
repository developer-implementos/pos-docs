import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import collection from './collection.json' with { type: 'json' };
import { fixture, run } from './selective-generation.helpers.mjs';

function succeeded(result) {
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
}

test('real renderers replace only backend, preserve eight boards byte for byte and compose all nine into the atlas', { timeout: 240_000 }, t => {
  const { directory, tools, output } = fixture(t);
  const unchanged = collection.boards.filter(board => board.id !== 'backend').flatMap(board => ['.excalidraw', '.svg'].map(extension => board.file + extension));
  const before = new Map(unchanged.map(name => [name, fs.readFileSync(path.join(output, name))]));
  const layoutPath = path.join(tools, 'models/c4-layouts.json');
  const layouts = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
  const retainedLayouts = new Map(Object.entries(layouts).filter(([key]) => key !== 'c4-backend').map(([key, value]) => [key, JSON.stringify(value)]));
  layouts['c4-backend'].source = 'selected layout must be replaced';
  fs.writeFileSync(layoutPath, JSON.stringify(layouts, null, 2) + '\n');
  const backendPath = path.join(output, '03-backend-sucursal.excalidraw');
  const oldBackend = JSON.parse(fs.readFileSync(backendPath, 'utf8'));
  oldBackend.elements.find(element => element.id === 'title').text = 'Selected scene must be replaced';
  fs.writeFileSync(backendPath, JSON.stringify(oldBackend));
  succeeded(run(directory, 'render-c4.cjs', ['--write', '--view', 'backend']));
  succeeded(run(directory, 'render-c4.cjs', ['--check']));
  succeeded(run(directory, 'generate-excalidraw.cjs', ['--view', 'backend']));
  const actualLayouts = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
  for (const [key, bytes] of retainedLayouts) assert.equal(JSON.stringify(actualLayouts[key]), bytes, `${key} must be retained exactly.`);
  for (const name of unchanged) assert.deepEqual(fs.readFileSync(path.join(output, name)), before.get(name), name);
  const backend = JSON.parse(fs.readFileSync(backendPath, 'utf8'));
  assert.notEqual(backend.elements.find(element => element.id === 'title').text, 'Selected scene must be replaced');
  const atlas = JSON.parse(fs.readFileSync(path.join(output, collection.atlas + '.excalidraw'), 'utf8'));
  const byId = new Map(atlas.elements.map(element => [element.id, element]));
  assert.equal(byId.size, atlas.elements.length, 'The atlas must not duplicate element IDs.');
  assert.equal(atlas.elements.filter(element => element.type === 'frame').length, 9);
  let expectedElements = 9;
  for (const board of collection.boards) {
    const scene = JSON.parse(fs.readFileSync(path.join(output, board.file + '.excalidraw'), 'utf8'));
    expectedElements += scene.elements.length;
    const prefix = board.file.slice(0, 2) + '-';
    assert.ok(byId.has(prefix + 'frame'));
    for (const element of scene.elements) {
      const copy = byId.get(prefix + element.id);
      assert.ok(copy, `Atlas must contain ${board.id}/${element.id}.`);
      assert.equal(copy.frameId, prefix + 'frame');
      if (element.type === 'text') assert.equal(copy.text, element.text);
      if (element.startBinding) assert.equal(copy.startBinding.elementId, prefix + element.startBinding.elementId);
      if (element.endBinding) assert.equal(copy.endBinding.elementId, prefix + element.endBinding.elementId);
    }
  }
  assert.equal(atlas.elements.length, expectedElements);
});
