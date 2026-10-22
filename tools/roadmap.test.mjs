import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadRoadmap, renderRoadmapDocs, renderRoadmapMatrix, renderRoadmapPhase, validateRoadmap } from './roadmap.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = () => structuredClone(loadRoadmap(root));
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

test('the shared source preserves six ordered proposed phases and their reviewed scope', () => {
  const roadmap = fixture();
  assert.equal(roadmap.schemaVersion, 2);
  assert.equal(roadmap.status, 'proposed');
  assert.equal(roadmap.phases.length, 6);
  const html = renderRoadmapDocs(roadmap);
  assert.equal((html.match(/class="roadmap-matrix"/g) || []).length, 2);
  assert.equal((html.match(/data-phase-detail=/g) || []).length, 6);
  for (const field of ['statusLabel', 'notice', 'baseline', 'reviewedOn']) assert.ok(html.includes(escape(roadmap[field])), `Missing ${field}`);
  for (const phase of roadmap.phases) {
    assert.equal(html.split(`id="${phase.id}"`).length - 1, 1, `${phase.id} must have one stable detail anchor`);
    assert.ok(html.includes(escape(phase.summary)));
    for (const lane of ['operation', 'construction', 'acceptance']) assert.ok(html.includes(escape(phase[lane].detail)), `Missing ${phase.id}/${lane} detail`);
    for (const link of phase.links) assert.ok(html.includes(`href="${escape(link.href)}"`));
    assert.equal(html.split(`data-phase-plan-link="${phase.id}"`).length - 1, 1, `${phase.id} must link its delivery plan once`);
    assert.ok(html.includes(`href="/guide/roadmap/${phase.id}/"`));
  }
});

test('both surfaces use the same matrix copy with real table associations', () => {
  const phases = fixture().phases.slice(0, 3);
  for (const mode of ['docs', 'slide']) {
    const html = renderRoadmapMatrix(phases, { id: `matrix-${mode}`, mode });
    assert.equal((html.match(/class="roadmap-cell"/g) || []).length, 9);
    assert.equal(html.includes('tabindex="0"'), mode === 'docs');
    assert.ok(html.includes(`aria-labelledby="matrix-${mode}-caption"`));
    for (const phase of phases) {
      assert.ok(html.includes(escape(phase.title)));
      for (const lane of ['operation', 'construction', 'acceptance']) {
        assert.ok(html.includes(`headers="matrix-${mode}-${lane} matrix-${mode}-${phase.id}"`));
        assert.ok(html.includes(escape(phase[lane].title)));
        assert.ok(html.includes(escape(phase[lane].summary)));
        assert.ok(!html.includes(escape(phase[lane].detail)), 'Matrix must not repeat full paragraphs');
      }
    }
  }
});

test('unknown fields, fabricated progress, malformed dates and incomplete phases fail closed', () => {
  const mutations = [
    roadmap => { roadmap.schemaVersion = 1; },
    roadmap => { roadmap.schemaVersion = 3; },
    roadmap => { roadmap.status = 'completed'; },
    roadmap => { roadmap.reviewedOn = '2026-02-30'; },
    roadmap => { roadmap.phases[0].progress = 80; },
    roadmap => { roadmap.phases.pop(); },
    roadmap => { roadmap.phases[0].id = 'arbitrary'; },
    roadmap => { roadmap.phases[0].number = 2; },
    roadmap => { roadmap.phases[0].acceptance.detail = ''; },
    roadmap => { roadmap.phases[0].operation.summary = 'a'.repeat(86); },
    roadmap => { roadmap.phases[0].operation.slideDetail = 'a'.repeat(181); },
  ];
  for (const mutate of mutations) {
    const roadmap = fixture();
    mutate(roadmap);
    assert.throws(() => validateRoadmap(roadmap));
  }
});

test('dependencies must refer to unique earlier phases, so the plan cannot contain cycles', () => {
  for (const requires of [['phase-01'], ['phase-02'], ['phase-99']]) {
    const roadmap = fixture();
    roadmap.phases[0].requires = requires;
    assert.throws(() => validateRoadmap(roadmap), /requires an unknown, same or later phase/);
  }
  const roadmap = fixture();
  roadmap.phases[1].requires = ['phase-01', 'phase-01'];
  assert.throws(() => validateRoadmap(roadmap), /repeats a dependency/);
});

test('reference URLs remain safe local routes, without external hosts or path traversal', () => {
  const invalid = ['javascript:alert(1)', '//example.com/', 'https://example.com/', '/guide/../private/', '/guide/%2e%2e/private/', '/guide/proposal/roadmap/?html=<script>', '/materials/private.docx', '/guide/proposal/roadmap/" onclick="alert(1)'];
  for (const href of invalid) {
    const roadmap = fixture();
    roadmap.phases[0].links[0].href = href;
    assert.throws(() => validateRoadmap(roadmap), /must use a local guide or presentation route/);
  }
});

test('editorial text is escaped and the rendering requires no executable content', () => {
  const roadmap = fixture();
  roadmap.phases[0].title = 'Venta <script>alert(1)</script> & "recuperación"';
  const html = renderRoadmapDocs(roadmap);
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;recuperación&quot;'));
  assert.ok(!/<script|onclick=|onerror=|<iframe/i.test(html));
});

test('every phase plan preserves its execution scope, dependencies and acceptance evidence', () => {
  const roadmap = fixture();
  for (const phase of roadmap.phases) {
    const html = renderRoadmapPhase(roadmap, phase.id);
    assert.equal(html.split(`data-roadmap-phase-plan="${phase.id}"`).length - 1, 1);
    for (const anchor of ['entry-conditions', 'work-packages', 'acceptance-evidence']) {
      assert.equal(html.split(`id="${anchor}"`).length - 1, 1, `${phase.id}: stable ${anchor} gate`);
    }
    for (const field of ['entry', 'parallel', 'deferred', 'evidence', 'reviewers']) {
      for (const value of phase.delivery[field]) assert.ok(html.includes(escape(value)), `${phase.id} omits ${field}: ${value}`);
    }
    assert.equal((html.match(/data-work-package=/g) || []).length, phase.delivery.work.length);
    for (const work of phase.delivery.work) {
      assert.equal(html.split(`data-work-package="${work.id}"`).length - 1, 1);
      for (const value of [work.title, work.deliverable, ...work.apps, ...work.modules, ...work.tasks]) assert.ok(html.includes(escape(value)), `${phase.id}/${work.id}: missing execution requirement ${value}`);
    }
    assert.equal((html.match(/data-roadmap-scenario=/g) || []).length, phase.delivery.validation.length);
    for (const validation of phase.delivery.validation) {
      assert.ok(html.includes(escape(validation.scenario)), `${phase.id}: missing acceptance scenario`);
      assert.ok(html.includes(escape(validation.expected)), `${phase.id}: missing observable acceptance result`);
    }
    for (const dependency of phase.requires) assert.ok(html.includes(`href="/guide/roadmap/${dependency}/"`), `${phase.id}: dependency must lead to its full plan`);
    assert.ok(html.includes(`href="/guide/proposal/roadmap/#${phase.id}"`), 'Each plan must return to its position in the shared roadmap');
    assert.ok(!/<script\b|<iframe\b/i.test(html), 'Phase plans must remain static documents');
  }
  for (const id of ['phase-00', 'phase-99', '../phase-01', 'phase-01" autofocus']) assert.throws(() => renderRoadmapPhase(roadmap, id));
});

test('a delivery plan cannot omit actionable work, acceptance scenarios or decision evidence', () => {
  const mutations = [
    phase => { delete phase.delivery; },
    phase => { phase.delivery = []; },
    phase => { phase.delivery.progress = 'completed'; },
    ...['entry', 'work', 'validation', 'parallel', 'deferred', 'evidence', 'reviewers'].flatMap(field => [
      phase => { delete phase.delivery[field]; },
      phase => { phase.delivery[field] = []; },
      phase => { phase.delivery[field] = 'Pendiente'; },
    ]),
    phase => { phase.delivery.work[0].tasks = []; },
    phase => { phase.delivery.work[0].deliverable = ''; },
    phase => { phase.delivery.work[0].title = ' '; },
    phase => { phase.delivery.work[0].unknown = 'extra'; },
    phase => { phase.delivery.validation[0].expected = ''; },
    phase => { phase.delivery.validation[0].scenario = ''; },
    phase => { phase.delivery.validation[0].passed = true; },
    phase => { phase.delivery.validation[1] = structuredClone(phase.delivery.validation[0]); },
    phase => { phase.delivery.entry[1] = phase.delivery.entry[0]; },
    phase => { phase.delivery.work[0].tasks[0] = 'Acción\nHTML'; },
    phase => { phase.delivery.evidence[0] = 'Resultado\u0000oculto'; },
  ];
  for (const mutate of mutations) {
    const roadmap = fixture();
    mutate(roadmap.phases[0]);
    assert.throws(() => validateRoadmap(roadmap));
  }
});

test('work packages identify their own phase, distinct applications and safe repository library paths', () => {
  const mutations = [
    roadmap => { roadmap.phases[0].delivery.work[1].id = roadmap.phases[0].delivery.work[0].id; },
    roadmap => { roadmap.phases[1].delivery.work[0].id = roadmap.phases[0].delivery.work[0].id; },
    roadmap => { roadmap.phases[0].delivery.work[0].id = 'F01-99'; },
    roadmap => { roadmap.phases[0].delivery.work[0].apps = ['country-workers']; },
    roadmap => { roadmap.phases[0].delivery.work[0].apps = ['pos-web']; },
    roadmap => { roadmap.phases[0].delivery.work[0].apps = ['branch-api', 'branch-api']; },
    roadmap => { roadmap.phases[0].delivery.work[0].apps = []; },
    roadmap => { roadmap.phases[0].delivery.work[0].modules = []; },
    roadmap => { roadmap.phases[0].delivery.work[0].modules = ['libs/backend/sales', 'libs/backend/sales']; },
    ...['../private', 'libs/../private', 'libs/%2e%2e/private', '/libs/backend/sales', 'C:\\libs\\backend', 'https://example.com/', 'javascript:alert(1)', 'apps/branch-api', 'libs/backend/sales" onclick="alert(1)'].map(module => roadmap => { roadmap.phases[0].delivery.work[0].modules = [module]; }),
  ];
  for (const mutate of mutations) {
    const roadmap = fixture();
    mutate(roadmap);
    assert.throws(() => validateRoadmap(roadmap));
  }
});

test('every new free-text field is escaped in phase plans rather than becoming executable markup', () => {
  const payload = '<script>alert("phase")</script> & \'detalle\'';
  const mutations = [
    ...['entry', 'parallel', 'deferred', 'evidence', 'reviewers'].map(field => phase => { phase.delivery[field][0] = payload; }),
    phase => { phase.delivery.work[0].title = payload; },
    phase => { phase.delivery.work[0].deliverable = payload; },
    phase => { phase.delivery.work[0].tasks[0] = payload; },
    phase => { phase.delivery.validation[0].scenario = payload; },
    phase => { phase.delivery.validation[0].expected = payload; },
  ];
  for (const mutate of mutations) {
    const roadmap = fixture();
    mutate(roadmap.phases[0]);
    const html = renderRoadmapPhase(roadmap, 'phase-01');
    assert.ok(html.includes(escape(payload)));
    assert.ok(!/<script\b|<iframe\b/i.test(html));
  }
});
