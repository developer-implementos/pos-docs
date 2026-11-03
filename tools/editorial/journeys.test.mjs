import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateJourneyTargets } from './journeys.mjs';

function artifact(t) {
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const directory = fs.mkdtempSync(path.join(temporaryRoot, 'pos-docs-journeys-'));
  t.after(() => {
    const resolved = fs.realpathSync(directory);
    assert.equal(resolved, directory);
    assert.equal(path.dirname(resolved), temporaryRoot);
    assert.ok(path.basename(resolved).startsWith('pos-docs-journeys-'));
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(directory, 'guide', 'new-page'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), '<html><h1 id="home">Inicio</h1></html>');
  fs.writeFileSync(path.join(directory, 'guide', 'new-page', 'index.html'), '<html><h2 id="evidence">Evidencia</h2><h2 id="estado-de-implementación">Estado</h2></html>');
  return directory;
}

test('validates root, new PR routes and anchors against the built artifact', t => {
  assert.equal(validateJourneyTargets('Reader-Journeys: /#home, /guide/new-page/#evidence', artifact(t)).length, 2);
});

test('Spanish heading fragments work both directly and as encoded browser URLs', t => {
  assert.equal(validateJourneyTargets('Reader-Journeys: /guide/new-page/#estado-de-implementación, /guide/new-page/#estado-de-implementaci%C3%B3n', artifact(t)).length, 2);
});

test('rejects nonexistent destinations and anchors even when their format is valid', t => {
  const directory = artifact(t);
  assert.throws(() => validateJourneyTargets('Reader-Journeys: /guide/missing/', directory), /no generated HTML/);
  assert.throws(() => validateJourneyTargets('Reader-Journeys: /guide/new-page/#missing', directory), /anchor is absent/);
});

test('rejects traversal, duplicate declarations and commented example routes', t => {
  const directory = artifact(t);
  assert.throws(() => validateJourneyTargets('Reader-Journeys: /../', directory), /public paths/);
  assert.throws(() => validateJourneyTargets('Reader-Journeys: /#%C3', directory), /invalid encoded fragment/);
  assert.throws(() => validateJourneyTargets('Reader-Journeys: /##double', directory), /public paths/);
  assert.throws(() => validateJourneyTargets('Reader-Journeys: /#line\u0001', directory), /public paths/);
  assert.throws(() => validateJourneyTargets('Reader-Journeys: /#%00', directory), /unsafe fragment/);
  assert.throws(() => validateJourneyTargets('Reader-Journeys: /\nReader-Journeys: /', directory), /exactly one/);
  assert.throws(() => validateJourneyTargets('<!-- Reader-Journeys: / -->', directory), /exactly one/);
});
