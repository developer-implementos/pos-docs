import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { loadRoadmap, renderRoadmapDocs, renderRoadmapMatrix, validateRoadmap } from './roadmap.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = () => structuredClone(loadRoadmap(root));
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

test('the shared source preserves six ordered proposed phases and their reviewed scope', () => {
  const roadmap = fixture();
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
    roadmap => { roadmap.schemaVersion = 2; },
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
