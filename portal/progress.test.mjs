import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { deriveProgress, loadProgress, progressContentHash } from './progress.mjs';

const revision = 'a'.repeat(40);
const evidence = [{ path: 'tests/acceptance/sale.spec.ts', label: 'Recorrido verificado' }];
const acceptance = () => ({ revision, reviewedOn: '2026-10-30', reviewer: 'Equipo de pruebas', evidence: structuredClone(evidence) });
const hash = source => createHash('sha256').update(source, 'utf8').digest('hex');

function fixture() {
  const roadmap = {
    schemaVersion: 3,
    phases: [
      { id: 'phase-01', title: 'Venta persistida', delivery: { work: [
        { id: 'F01-01', title: 'Identidad y turno', apps: ['pos-desktop', 'branch-api'] },
        { id: 'F01-02', title: 'Venta confirmada', apps: ['branch-api'] },
      ] } },
      { id: 'phase-02', title: 'Integración', delivery: { work: [
        { id: 'F02-01', title: 'Recepción de país', apps: ['country-api'] },
      ] } },
    ],
  };
  return createSnapshot(roadmap);
}

function createSnapshot(roadmap) {
  const roadmapSource = JSON.stringify(roadmap, null, 2) + '\n';
  const work = roadmap.phases.flatMap(phase => phase.delivery.work);
  const content = {
    schemaVersion: 1,
    reviewedOn: '2026-10-30',
    productRevision: revision,
    scope: { repository: 'https://github.com/developer-implementos/pos-docs', revision, path: 'docs/roadmap.json', sha256: hash(roadmapSource) },
    summary: 'Base técnica disponible; aceptación funcional pendiente.',
    applications: [...new Set(work.flatMap(item => item.apps))].map(id => ({ id, stage: 'foundation', summary: 'Arranque disponible.', nextStep: 'Implementar el recorrido.', evidence: structuredClone(evidence) })),
    workPackages: work.map(item => ({ id: item.id, apps: [...item.apps], status: 'not_started', summary: 'Pendiente de aceptación.', acceptance: null })),
  };
  const snapshot = {
    schemaVersion: 1,
    source: { repository: 'https://github.com/developer-implementos/pos-platform', revision, path: 'delivery/progress.json', sha256: progressContentHash(content) },
    content,
  };
  return { roadmap, roadmapSource, snapshot };
}

function derive(fixture, mutate = () => {}) {
  mutate(fixture.snapshot.content);
  fixture.snapshot.source.sha256 = progressContentHash(fixture.snapshot.content);
  return deriveProgress(fixture.snapshot, fixture.roadmapSource);
}

function technicalFixture(current = fixture()) {
  current.snapshot.content.schemaVersion = 2;
  for (const work of current.snapshot.content.workPackages) work.verification = null;
  return current;
}

function verify(work) {
  work.status = 'verified';
  work.verification = acceptance();
}

test('schema 2 counts technical verification independently of manual acceptance in project, phases and apps', () => {
  const current = technicalFixture();
  const result = derive(current, content => { verify(content.workPackages[0]); });
  assert.equal(result.measurement, 'verification');
  assert.equal(result.total, 3);
  assert.equal(result.verified, 1);
  assert.equal(result.completed, 1);
  assert.equal(result.percent, 33.3);
  assert.equal(result.accepted, 0);
  assert.equal(result.pendingAcceptance, 1);
  assert.deepEqual(result.counts, { not_started: 2, in_progress: 0, blocked: 0, verified: 1 });
  assert.deepEqual(result.applications.map(app => [app.id, app.completed, app.verified, app.accepted, app.percent]), [
    ['pos-desktop', 1, 1, 0, 100], ['branch-api', 1, 1, 0, 50], ['country-api', 0, 0, 0, 0],
  ]);
  assert.deepEqual(result.phases.map(phase => [phase.id, phase.total, phase.verified, phase.percent]), [
    ['phase-01', 2, 1, 50], ['phase-02', 1, 0, 0],
  ]);
  const accepted = derive(current, content => { content.workPackages[0].acceptance = acceptance(); });
  assert.equal(accepted.accepted, 1);
  assert.equal(accepted.pendingAcceptance, 0);
  assert.equal(accepted.verified, result.verified);
  assert.equal(accepted.percent, result.percent, 'Manual acceptance never changes technical completion');
  assert.equal(accepted.workPackages[0].status, 'verified');
});

test('schema 1 retains the acceptance metric without manufacturing verification', () => {
  const result = derive(fixture(), content => {
    content.workPackages[0].status = 'accepted';
    content.workPackages[0].acceptance = acceptance();
  });
  assert.equal(result.measurement, 'acceptance');
  assert.equal(result.completed, 1);
  assert.equal(result.percent, 33);
  assert.equal(result.verified, null);
  assert.equal(result.pendingAcceptance, null);
  assert.ok(result.applications.every(app => app.verified === null));
  assert.ok(result.phases.every(phase => phase.verified === null));
  assert.equal(result.workPackages[0].verification, undefined);
});

test('schema 2 uses the complete roadmap denominator with one decimal and equal weight', () => {
  const roadmap = { schemaVersion: 3, phases: [1, 2].map(phase => ({
    id: `phase-0${phase}`, title: `Fase ${phase}`, delivery: { work: Array.from({ length: phase === 1 ? 13 : 58 }, (_, index) => ({
      id: `F0${phase}-${String(index + 1).padStart(2, '0')}`, title: `Entrega ${index + 1}`, apps: ['branch-api'],
    })) },
  })) };
  const result = derive(technicalFixture(createSnapshot(roadmap)), content => { content.workPackages.slice(0, 3).forEach(verify); });
  assert.equal(result.total, 71);
  assert.equal(result.percent, 4.2);
  assert.equal(result.phases[0].total, 13);
  assert.equal(result.phases[0].percent, 23.1);
  assert.equal(result.applications[0].percent, 4.2);
  assert.equal(result.accepted, 0);
  assert.equal(result.pendingAcceptance, 3);
});

test('phase summaries follow the canonical roadmap order even if the product registry is reordered', () => {
  const result = derive(technicalFixture(), content => { content.workPackages.reverse(); });
  assert.deepEqual(result.phases.map(phase => phase.id), ['phase-01', 'phase-02']);
});

test('schema 2 never rounds incomplete work to 100 percent', () => {
  const roadmap = { schemaVersion: 3, phases: Array.from({ length: 30 }, (_, index) => ({
    id: `phase-${String(index + 1).padStart(2, '0')}`, title: `Fase ${index + 1}`, delivery: { work: Array.from({ length: 99 }, (_, work) => ({
      id: `F${String(index + 1).padStart(2, '0')}-${String(work + 1).padStart(2, '0')}`, title: `Entrega ${work + 1}`, apps: ['branch-api'],
    })) },
  })) };
  const current = technicalFixture(createSnapshot(roadmap));
  const incomplete = derive(current, content => { content.workPackages.slice(0, -1).forEach(verify); });
  assert.equal(incomplete.percent, 99.9);
  const complete = derive(current, content => { verify(content.workPackages.at(-1)); });
  assert.equal(complete.percent, 100);
  assert.equal(complete.accepted, 0);
});

test('schema 2 requires complete immutable verification and rejects premature or inconsistent acceptance', () => {
  const mutations = [
    work => { work.verification = null; },
    work => { delete work.verification; },
    work => { work.verification.revision = 'source'; },
    work => { work.verification.revision = 'main'; },
    work => { work.verification.reviewer = ''; },
    work => { work.verification.reviewedOn = '2026-02-30'; },
    work => { work.verification.reviewedOn = '2026-10-31'; },
    work => { work.verification.evidence = []; },
    work => { work.verification.evidence[0].path = '../secret'; },
    work => { work.verification.extra = true; },
    work => { work.status = 'accepted'; },
    work => { work.acceptance = {}; },
    work => { work.acceptance = { ...acceptance(), revision: 'source' }; },
    work => { work.acceptance = { ...acceptance(), reviewedOn: '2026-10-29' }; },
    work => { delete work.acceptance; },
  ];
  for (const mutate of mutations) {
    assert.throws(() => derive(technicalFixture(), content => {
      const work = content.workPackages[0];
      verify(work);
      mutate(work);
    }));
  }
  for (const status of ['not_started', 'in_progress', 'blocked']) {
    for (const field of ['verification', 'acceptance']) {
      assert.throws(() => derive(technicalFixture(), content => {
        content.workPackages[0].status = status;
        content.workPackages[0][field] = acceptance();
      }));
    }
  }
});

test('schema 2 retains exact scope and rejects omitted, reassigned or duplicate work', () => {
  for (const mutate of [
    content => { content.workPackages.pop(); },
    content => { content.workPackages.push(structuredClone(content.workPackages[0])); },
    content => { content.workPackages[0].apps = ['branch-api']; },
    content => { content.workPackages[0].id = 'F99-01'; },
    content => { content.applications.pop(); },
    content => { content.schemaVersion = 3; },
  ]) assert.throws(() => derive(technicalFixture(), mutate));
  const result = derive(technicalFixture(), content => {
    content.productRevision = 'source';
    content.workPackages[0].status = 'in_progress';
    content.workPackages[1].status = 'blocked';
  });
  assert.equal(result.completed, 0);
  assert.equal(result.productRevision, revision);
  assert.equal(result.workPackages[0].verification, null);
});

test('baseline derives zero accepted work while retaining implementation summaries and pinned provenance', () => {
  const current = fixture();
  const result = derive(current);
  assert.equal(result.percent, 0);
  assert.equal(result.total, 3);
  assert.equal(result.accepted, 0);
  assert.deepEqual(result.counts, { not_started: 3, in_progress: 0, blocked: 0, accepted: 0 });
  assert.equal(result.source.revision, revision);
  assert.equal(result.productRevision, revision);
  assert.equal(result.reviewedOn, '2026-10-30');
  assert.equal(result.applications[0].stage, 'foundation');
  assert.equal(result.workPackages[0].title, 'Identidad y turno');
  assert.equal(result.workPackages[0].phase, 'phase-01');
  assert.equal(result.workPackages[0].href, '/guide/roadmap/phase-01/#work-f01-01');
});

test('source resolves to the immutable imported revision without rewriting the hashed source content', () => {
  const current = fixture();
  current.snapshot.source.revision = 'b'.repeat(40);
  const result = derive(current, content => { content.productRevision = 'source'; });
  assert.equal(result.productRevision, 'b'.repeat(40));
  assert.equal(current.snapshot.content.productRevision, 'source');
  assert.equal(current.snapshot.source.sha256, progressContentHash(current.snapshot.content));
  assert.equal(result.percent, 0);
  current.snapshot.content.productRevision = result.productRevision;
  assert.throws(() => deriveProgress(current.snapshot, current.roadmapSource), /source content hash mismatch/);
});

test('source is an exact product reference, never an acceptance or scope revision', () => {
  for (const invalid of ['Source', 'SOURCE', ' source', 'source ', 'HEAD', 'main', '', null, 1, {}]) {
    assert.throws(() => derive(fixture(), content => { content.productRevision = invalid; }));
  }
  assert.throws(() => derive(fixture(), content => { content.scope.revision = 'source'; }));
  assert.throws(() => derive(fixture(), content => {
    content.productRevision = 'source';
    content.workPackages[0].status = 'accepted';
    content.workPackages[0].acceptance = { ...acceptance(), revision: 'source' };
  }));
  const current = fixture();
  current.snapshot.source.revision = 'source';
  assert.throws(() => derive(current, content => { content.productRevision = 'source'; }), /immutable revision/);
});

test('global counts a shared package once and does not average application percentages', () => {
  const result = derive(fixture(), content => {
    content.workPackages[0].status = 'accepted';
    content.workPackages[0].acceptance = acceptance();
  });
  assert.equal(result.percent, 33);
  assert.equal(result.total, 3);
  assert.equal(result.accepted, 1);
  assert.deepEqual(result.applications.map(app => [app.id, app.total, app.accepted, app.percent]), [
    ['pos-desktop', 1, 1, 100], ['branch-api', 2, 1, 50], ['country-api', 1, 0, 0],
  ]);
  assert.notEqual(result.percent, result.applications.reduce((sum, app) => sum + app.percent, 0) / result.applications.length);
});

test('in-progress and blocked work do not manufacture partial completion', () => {
  const result = derive(fixture(), content => {
    content.workPackages[0].status = 'in_progress';
    content.workPackages[1].status = 'blocked';
  });
  assert.equal(result.percent, 0);
  assert.ok(result.applications.every(app => app.percent === 0));
  assert.deepEqual(result.counts, { not_started: 1, in_progress: 1, blocked: 1, accepted: 0 });
});

test('functional and validated stages retain evidence requirements without fabricating accepted work', () => {
  for (const stage of ['functional', 'validated']) {
    const result = derive(fixture(), content => { content.applications[0].stage = stage; });
    assert.equal(result.applications[0].stage, stage);
    assert.equal(result.percent, 0);
    assert.throws(() => derive(fixture(), content => {
      content.applications[0].stage = stage;
      content.applications[0].evidence = [];
    }));
  }
});

test('100 percent is reserved for full acceptance, including near-complete scopes', () => {
  const roadmap = { schemaVersion: 3, phases: [1, 2].map(phase => ({
    id: `phase-0${phase}`, title: `Fase ${phase}`, delivery: { work: Array.from({ length: phase === 1 ? 60 : 41 }, (_, index) => ({
      id: `F0${phase}-${String(index + 1).padStart(2, '0')}`, title: `Entrega ${index + 1}`, apps: ['branch-api'],
    })) },
  })) };
  const current = createSnapshot(roadmap);
  const result = derive(current, content => {
    for (const work of content.workPackages.slice(0, -1)) {
      work.status = 'accepted';
      work.acceptance = acceptance();
    }
  });
  assert.equal(result.accepted, 100);
  assert.equal(result.total, 101);
  assert.equal(result.percent, 99);
  assert.equal(result.applications[0].percent, 99);
  const complete = derive(current, content => {
    content.workPackages.at(-1).status = 'accepted';
    content.workPackages.at(-1).acceptance = acceptance();
  });
  assert.equal(complete.percent, 100);
  assert.equal(complete.applications[0].percent, 100);
});

test('accepted work requires an immutable revision, reviewer, valid review date and evidence', () => {
  const mutations = [
    work => { work.acceptance = null; },
    work => { work.acceptance.revision = 'main'; },
    work => { work.acceptance.reviewer = ''; },
    work => { work.acceptance.reviewedOn = '2026-02-30'; },
    work => { work.acceptance.reviewedOn = '2026-10-31'; },
    work => { work.acceptance.evidence = []; },
    work => { work.acceptance.extra = true; },
  ];
  for (const mutate of mutations) {
    assert.throws(() => derive(fixture(), content => {
      const work = content.workPackages[0];
      work.status = 'accepted';
      work.acceptance = acceptance();
      mutate(work);
    }));
  }
  assert.throws(() => derive(fixture(), content => { content.workPackages[0].acceptance = acceptance(); }));
});

test('scope mismatches, omissions, duplicates and unknown fields fail closed', () => {
  const mutations = [
    content => { content.workPackages.pop(); },
    content => { content.workPackages.push(structuredClone(content.workPackages[0])); },
    content => { content.workPackages[0].id = 'F99-01'; },
    content => { content.workPackages[0].apps = ['branch-api']; },
    content => { content.workPackages[0].apps.push('branch-api'); },
    content => { content.workPackages[0].status = 'completed'; },
    content => { content.workPackages[0].progress = 50; },
    content => { content.applications.pop(); },
    content => { content.applications.push(structuredClone(content.applications[0])); },
    content => { content.applications[0].id = 'pos-web'; },
    content => { content.applications[0].stage = 'production'; },
    content => { content.applications[0].evidence = []; },
    content => { content.percent = 75; },
    content => { content.scope.path = '../private.json'; },
    content => { content.scope.repository = 'https://example.com'; },
    content => { content.productRevision = 'main'; },
    content => { content.reviewedOn = '2026-02-30'; },
  ];
  for (const mutate of mutations) assert.throws(() => derive(fixture(), mutate));
});

test('evidence cannot introduce arbitrary URLs, traversal, unsafe attributes or duplicate paths', () => {
  for (const invalid of ['https://example.com/a', '//example.com/a', '../outside', 'apps/../private', './README.md', '/README.md', 'C:/private', 'apps\\private', 'apps/%2e%2e/private', 'README.md#anchor', 'README.md?query', 'README.md" onclick="alert(1)']) {
    assert.throws(() => derive(fixture(), content => { content.applications[0].evidence[0].path = invalid; }));
  }
  assert.throws(() => derive(fixture(), content => { content.applications[0].evidence.push(structuredClone(content.applications[0].evidence[0])); }));
  const result = derive(fixture(), content => {
    content.applications[0].stage = 'planned';
    content.applications[0].evidence = [];
  });
  assert.equal(result.applications[0].evidence.length, 0);
});

test('source content and roadmap hashes detect stale or edited snapshots; CRLF roadmap is equivalent', () => {
  const current = fixture();
  current.snapshot.content.summary = 'Changed without recapture.';
  assert.throws(() => deriveProgress(current.snapshot, current.roadmapSource), /source content hash mismatch/);
  const valid = fixture();
  assert.throws(() => deriveProgress(valid.snapshot, valid.roadmapSource + ' '), /Roadmap scope changed/);
  assert.equal(deriveProgress(valid.snapshot, valid.roadmapSource.replaceAll('\n', '\r\n')).total, 3);
  valid.snapshot.source.repository = 'https://example.com';
  assert.throws(() => deriveProgress(valid.snapshot, valid.roadmapSource));
});

test('empty and duplicate roadmap scopes are rejected rather than dividing by zero', () => {
  for (const roadmap of [
    { schemaVersion: 3, phases: [] },
    { schemaVersion: 3, phases: [{ id: 'phase-01', title: 'Vacía', delivery: { work: [] } }] },
  ]) {
    const current = createSnapshot(roadmap);
    assert.throws(() => deriveProgress(current.snapshot, current.roadmapSource));
  }
  const current = fixture();
  current.roadmap.phases[0].delivery.work.push(structuredClone(current.roadmap.phases[0].delivery.work[0]));
  const repeated = createSnapshot(current.roadmap);
  assert.throws(() => deriveProgress(repeated.snapshot, repeated.roadmapSource), /Duplicate roadmap work package/);
});

test('loadProgress uses only the pinned editorial checkout files', t => {
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temporaryRoot, 'pos-progress-'));
  t.after(() => {
    assert.equal(path.dirname(fs.realpathSync(root)), temporaryRoot, 'Only remove the temporary test directory');
    assert.ok(path.basename(root).startsWith('pos-progress-'));
    fs.rmSync(root, { recursive: true, force: true });
  });
  const current = fixture();
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.mkdirSync(path.join(root, 'portal/data'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/roadmap.json'), current.roadmapSource);
  fs.writeFileSync(path.join(root, 'portal/data/project-progress.json'), JSON.stringify(current.snapshot));
  assert.equal(loadProgress(root).total, 3);
});
