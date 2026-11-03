/* A selected view replaces its own derivatives; the atlas still uses every board. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { byId } = require('./collection.cjs');

function parseSelection(args, { layout = false } = {}) {
  let mode, viewId;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (layout && ['--write', '--check'].includes(arg)) {
      if (mode) throw new Error('Choose exactly one of --write or --check.');
      mode = arg.slice(2);
    } else if (arg === '--view') {
      if (viewId !== undefined) throw new Error('Use --view only once.');
      viewId = args[++index];
      if (!viewId || viewId.startsWith('--')) throw new Error('--view requires a published view ID.');
      const board = byId.get(viewId);
      if (!board) throw new Error(`Unknown view: ${viewId}. Expected: ${[...byId.keys()].join(', ')}.`);
      if (layout && board.kind !== 'structural') throw new Error(`View ${viewId} has no Mermaid layout; generate its Excalidraw scene directly.`);
    } else throw new Error(`Unknown argument: ${arg}.`);
  }
  if (layout && !mode) throw new Error('Use --check (read-only) or --write (replace reviewed geometry).');
  if (mode === 'check' && viewId) throw new Error('--check validates the complete collection; use --view with --write.');
  return { mode, viewId };
}

function readPublishedBoard(folder, entry, view) {
  const scene = JSON.parse(fs.readFileSync(path.join(folder, entry.file + '.excalidraw'), 'utf8'));
  const svg = fs.readFileSync(path.join(folder, entry.file + '.svg'), 'utf8');
  assert.equal(scene.type, 'excalidraw', `Invalid retained scene: ${entry.id}`);
  assert.equal(scene.version, 2, `Unsupported retained scene: ${entry.id}`);
  assert.ok(Array.isArray(scene.elements) && scene.elements.length > 0, `Empty retained scene: ${entry.id}`);
  assert.ok(svg.startsWith('<svg'), `Invalid retained SVG: ${entry.id}`);
  const normalized = text => text.replace(/\s+/g, ' ').trim();
  for (const key of ['title', 'scope']) {
    const text = scene.elements.find(element => element.id === key)?.text;
    assert.equal(text && normalized(text), normalized(view[key]), `Stale retained ${key}: regenerate ${entry.id}.`);
  }
  return { id: entry.id, number: entry.file.slice(0, 2), title: view.title, scene };
}

module.exports = { parseSelection, readPublishedBoard };
