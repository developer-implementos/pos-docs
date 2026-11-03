import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveFollowUp, followUpContentHash, productRepository } from './follow-up.mjs';

function fixture() {
  const progress = {
    percent: 50,
    workPackages: [
      { id: 'F01-01', phase: 'phase-01', phaseTitle: 'Venta', title: 'Identidad', apps: ['branch-api'], status: 'verified', summary: 'Verificado; revisión manual pendiente.', verification: { revision: 'a'.repeat(40) }, acceptance: null },
      { id: 'F01-02', phase: 'phase-01', phaseTitle: 'Venta', title: 'Origen comercial', apps: ['branch-api'], status: 'blocked', summary: 'Validación de origen pendiente.', verification: null, acceptance: null },
    ],
  };
  const content = {
    schemaVersion: 1,
    reviewedOn: '2026-11-02',
    items: [{ id: 'FOLLOWUP-001', kind: 'access', state: 'open', workPackages: ['F01-02'], summary: 'Validar instancia autorizada.', impact: 'Impide verificar el conector.', impactScope: 'technical', nextAction: 'Confirmar entorno y probar acceso autorizado.', requestedFrom: 'Contacto de infraestructura por confirmar', owner: null, closureCriteria: 'Consulta de prueba con evidencia revisada.', reviewedOn: '2026-11-02', evidence: [{ url: `${productRepository}/issues/11`, label: 'Investigación de acceso' }], resolution: null }],
  };
  const snapshot = {
    schemaVersion: 1,
    source: { repository: productRepository, revision: 'b'.repeat(40), path: 'delivery/follow-ups.json', sha256: followUpContentHash(content) },
    content,
    issues: { observedAt: '2026-11-03T00:10:00.000Z', repository: productRepository, entries: progress.workPackages.map((work, index) => ({ code: work.id, number: index + 10, url: `${productRepository}/issues/${index + 10}`, state: 'OPEN', executionLabels: [index === 0 ? 'status:validation' : 'status:blocked'], assignees: [], updatedAt: '2026-11-02T22:00:00Z' })) },
  };
  return { progress, snapshot };
}

function derive(item, mutate = () => {}) {
  mutate(item.snapshot);
  item.snapshot.source.sha256 = followUpContentHash(item.snapshot.content);
  return deriveFollowUp(item.snapshot, item.progress);
}

test('joins reviewed follow-up with GitHub execution metadata without changing technical progress', () => {
  const item = fixture();
  const before = structuredClone(item.progress);
  const result = derive(item);
  assert.deepEqual(item.progress, before);
  assert.equal(result.items[0].workPackages[0].title, 'Origen comercial');
  assert.equal(result.items[0].workPackages[0].issue.number, 11);
  assert.equal(result.items[0].owner, null, 'Never infer an owner from available credentials or roles');
  assert.deepEqual(result.counts, { open: 1, resolved: 0, unassigned: 1, technical: 1, operational: 0, review: 0 });
  assert.deepEqual(result.warnings, [], 'Verified and open is not an inconsistency');
  assert.deepEqual(result.workPackages[1].attentionIds, ['FOLLOWUP-001']);
  assert.equal(result.workPackages[0].acceptance, null);
});

test('reports execution label ambiguity and stale closed labels without changing issue state', () => {
  const item = fixture();
  const result = derive(item, snapshot => {
    snapshot.issues.entries[0].executionLabels = ['status:review', 'status:validation'];
    snapshot.issues.entries[1].state = 'CLOSED';
  });
  assert.deepEqual(result.warnings.map(warning => warning.code), ['execution-unconfirmed', 'closed-with-active-label']);
  assert.equal(result.workPackages[1].issue.state, 'CLOSED');
  assert.equal(result.workPackages[1].status, 'blocked');
  for (const labels of [[], ['status:unexpected']]) {
    const other = fixture();
    other.snapshot.issues.entries[0].executionLabels = labels;
    assert.equal(derive(other).warnings[0].code, 'execution-unconfirmed');
  }
});

test('operational or review follow-ups do not explain a blocked technical deliverable', () => {
  for (const impactScope of ['operational', 'review']) {
    const result = derive(fixture(), snapshot => { snapshot.content.items[0].impactScope = impactScope; });
    assert.equal(result.counts[impactScope], 1);
    assert.ok(result.warnings.some(warning => warning.code === 'blocked-without-follow-up'));
  }
});

test('resolved actions require dated evidence and stop counting as pending', () => {
  const item = fixture();
  assert.throws(() => derive(item, snapshot => { snapshot.content.items[0].state = 'resolved'; }), /resolution/);
  const result = derive(item, snapshot => {
    snapshot.content.items[0].resolution = { resolvedOn: '2026-11-02', summary: 'Acceso verificado con evidencia controlada.', evidence: [{ url: `${productRepository}/issues/11#issuecomment-123`, label: 'Resultado registrado' }] };
  });
  assert.equal(result.counts.open, 0);
  assert.equal(result.counts.resolved, 1);
  assert.deepEqual(result.workPackages[1].attentionIds, []);
  assert.throws(() => derive(item, snapshot => { snapshot.content.items[0].resolution.evidence = []; }), /requires evidence/);
});

test('rejects stale hashes, extra private payloads, missing tasks and duplicate mappings', () => {
  const item = fixture();
  item.snapshot.content.items[0].summary = 'Changed without review.';
  assert.throws(() => deriveFollowUp(item.snapshot, item.progress), /hash mismatch/);
  const mutations = [
    [snapshot => { snapshot.issues.entries[0].body = 'private body'; }, /unknown fields/],
    [snapshot => { snapshot.issues.entries.pop(); }, /every work package/],
    [snapshot => { snapshot.issues.entries[1].code = 'F99-99'; }, /issue code/],
    [snapshot => { snapshot.issues.entries[1].number = 10; }, /duplicate issue number/],
    [snapshot => { snapshot.content.items[0].workPackages = ['F99-99']; }, /unknown work package/],
    [snapshot => { snapshot.content.items.push(structuredClone(snapshot.content.items[0])); }, /duplicate follow-up ID/],
    [snapshot => { snapshot.issues.entries[0].url = 'https://example.com/issues/10'; }, /corporate identity/],
    [snapshot => { snapshot.issues.entries[0].assignees = ['name with spaces']; }, /assignee/],
  ];
  for (const [mutate, message] of mutations) assert.throws(() => derive(fixture(), mutate), message);
});

test('accepts only reviewed public evidence locations and real chronological dates', () => {
  for (const url of ['https://internal.example.test/run', 'https://user:password@github.com/developer-implementos/pos-platform/issues/11', `${productRepository}/issues/11?token=secret`, 'http://github.com/developer-implementos/pos-platform/issues/11', 'https://github.com:443/developer-implementos/pos-platform/issues/11', 'https://pos-docs-starlight.vercel.app:443/guide/']) {
    assert.throws(() => derive(fixture(), snapshot => { snapshot.content.items[0].evidence[0].url = url; }), /without credentials/);
  }
  for (const url of [`${productRepository}/issues/11 tab`, 'https://github.com\\developer-implementos/pos-platform/issues/11']) {
    assert.throws(() => derive(fixture(), snapshot => { snapshot.content.items[0].evidence[0].url = url; }), /whitespace or backslashes/);
  }
  const linked = derive(fixture(), snapshot => { snapshot.content.items[0].evidence[0].url = 'https://github.com/developer-implementos/mountain-implementos'; });
  assert.equal(linked.items[0].evidence[0].url, 'https://github.com/developer-implementos/mountain-implementos', 'Reviewed evidence can reference other corporate repositories');
  for (const value of ['2026-02-30', '03/11/2026']) {
    assert.throws(() => derive(fixture(), snapshot => { snapshot.content.items[0].reviewedOn = value; }), /date/);
  }
  assert.throws(() => derive(fixture(), snapshot => { snapshot.issues.entries[0].updatedAt = '2026-11-04T00:00:00Z'; }), /cannot follow/);
  assert.throws(() => derive(fixture(), snapshot => { snapshot.issues.observedAt = '2026-02-30T00:00:00Z'; }), /timestamp/);
});
