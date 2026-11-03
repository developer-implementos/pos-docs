import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import collection from './collection.json' with { type: 'json' };
import selection from './generation-selection.cjs';
import { fixture, run, sceneFiles } from './selective-generation.helpers.mjs';

test('view selection uses the published inventory and rejects ambiguous CLI commands', () => {
  assert.deepEqual(selection.parseSelection(['--write', '--view', 'backend'], { layout: true }), { mode: 'write', viewId: 'backend' });
  assert.deepEqual(selection.parseSelection(['--view', 'prices']), { mode: undefined, viewId: 'prices' });
  assert.deepEqual(selection.parseSelection([]), { mode: undefined, viewId: undefined });
  assert.deepEqual(selection.parseSelection(['--check'], { layout: true }), { mode: 'check', viewId: undefined });
  for (const args of [['--view'], ['--view', '--write'], ['--view', 'backend', '--view', 'sync'], ['--typo']]) {
    assert.throws(() => selection.parseSelection(args));
  }
  for (const args of [[], ['--write', '--check'], ['--check', '--view', 'backend'], ['--write', '--view', 'sale']]) {
    assert.throws(() => selection.parseSelection(args, { layout: true }));
  }
});

test('both CLIs reject an invalid view before loading browser dependencies or writing artifacts', t => {
  const { directory, tools, output } = fixture(t);
  const files = [...sceneFiles, collection.atlas + '.excalidraw'];
  const before = new Map(files.map(name => [name, fs.readFileSync(path.join(output, name))]));
  const layouts = fs.readFileSync(path.join(tools, 'models/c4-layouts.json'));
  for (const [script, args] of [['render-c4.cjs', ['--write']], ['generate-excalidraw.cjs', []]]) {
    const result = run(directory, script, [...args, '--view', 'unknown'], { EXCALIDRAW_RUNTIME: path.join(directory, 'missing-runtime'), PLAYWRIGHT_MODULE_PATH: path.join(directory, 'missing-playwright') });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unknown view: unknown/);
  }
  assert.ok(!fs.existsSync(path.join(directory, 'tmp')), 'Invalid arguments must fail before renderer setup.');
  assert.deepEqual(fs.readFileSync(path.join(tools, 'models/c4-layouts.json')), layouts);
  for (const name of files) assert.deepEqual(fs.readFileSync(path.join(output, name)), before.get(name), name);
});

test('selective generation rejects an incomplete collection or stale retained layout without replacing artifacts', t => {
  const { directory, tools, output } = fixture(t);
  const backendPath = path.join(output, '03-backend-sucursal.excalidraw');
  const before = fs.readFileSync(backendPath);
  fs.unlinkSync(path.join(output, '01-contexto.excalidraw'));
  const missing = run(directory, 'generate-excalidraw.cjs', ['--view', 'backend']);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /01-contexto\.excalidraw/);
  const layoutPath = path.join(tools, 'models/c4-layouts.json');
  const layouts = JSON.parse(fs.readFileSync(layoutPath, 'utf8'));
  layouts['c4-context'].source = 'outdated source';
  fs.writeFileSync(layoutPath, JSON.stringify(layouts));
  const input = fs.readFileSync(layoutPath);
  const stale = run(directory, 'render-c4.cjs', ['--write', '--view', 'backend']);
  assert.notEqual(stale.status, 0);
  assert.match(stale.stderr, /Stale retained layout: regenerate context/);
  assert.deepEqual(fs.readFileSync(layoutPath), input);
  assert.deepEqual(fs.readFileSync(backendPath), before);
  assert.ok(!fs.existsSync(path.join(directory, 'tmp')));
});

