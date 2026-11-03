import assert from 'node:assert/strict';
import test from 'node:test';
import { lifecycles } from './lifecycles.mjs';

const kinds = new Set(['start', 'active', 'waiting', 'decision', 'success', 'failure', 'neutral', 'external']);

test('lifecycle projections retain separate business boundaries and fixed source provenance', () => {
  assert.deepEqual(lifecycles.map(value => value.id), ['state-sale', 'state-payment', 'state-fiscal', 'state-printing']);
  for (const lifecycle of lifecycles) {
    assert.equal(lifecycle.status, 'implemented');
    assert.match(lifecycle.meta.repository, /^https:\/\/github\.com\/developer-implementos\/pos-platform$/);
    assert.match(lifecycle.meta.commit, /^[a-f0-9]{40}$/);
    assert.equal(lifecycle.meta.evidenceKind, 'source-inspection');
    assert.ok(lifecycle.meta.scope && lifecycle.meta.limitations);
    assert.match(lifecycle.source, /^\/guide\/flows\/[a-z-]+\/$/);
  }
});

test('every state and transition is reviewable from a source predicate, not an enum alone', () => {
  for (const lifecycle of lifecycles) {
    for (const item of [...lifecycle.states, ...lifecycle.transitions]) {
      assert.ok(item.description, `${lifecycle.id}: explain ${item.id ?? item.label}`);
      assert.ok(item.evidence.length > 0);
      assert.ok(item.evidence.some(source => /\/src\/(application|infrastructure|domain)\//.test(source.path)));
      for (const source of item.evidence) {
        assert.match(source.path, /^libs\/backend\/[a-z-]+\/src\/.+\.ts$/);
        assert.ok(!source.path.includes('..'));
        assert.ok(Number.isInteger(source.line) && source.line > 0);
        assert.ok(Number.isInteger(source.end_line) && source.end_line >= source.line);
      }
    }
  }
});

test('the explorable lifecycle graph has valid identifiers, connected states and a real main path', () => {
  for (const lifecycle of lifecycles) {
    const ids = new Set(lifecycle.states.map(state => state.id));
    assert.equal(ids.size, lifecycle.states.length);
    for (const state of lifecycle.states) {
      assert.match(state.id, /^[a-z][a-z-]*$/);
      assert.ok(kinds.has(state.kind));
      assert.ok(state.label.length <= 25, `${lifecycle.id}/${state.id}: concise visual label`);
      assert.ok(lifecycle.transitions.some(edge => edge.from === state.id || edge.to === state.id));
    }
    const pairs = new Set();
    for (const edge of lifecycle.transitions) {
      assert.ok(ids.has(edge.from) && ids.has(edge.to));
      const pair = `${edge.from}->${edge.to}`;
      assert.ok(!pairs.has(pair), `${lifecycle.id}: duplicate ${pair}`);
      pairs.add(pair);
    }
    assert.ok(lifecycle.mainPath.length >= 2);
    for (let index = 1; index < lifecycle.mainPath.length; index++) {
      assert.ok(pairs.has(`${lifecycle.mainPath[index - 1]}->${lifecycle.mainPath[index]}`));
    }
  }
});
