import assert from 'node:assert/strict';
import test from 'node:test';
import {renderProgress} from './progress-view.mjs';

const fixture = () => ({
  total: 26, accepted: 2, percent: 7,
  source: {repository:'https://github.com/developer-implementos/pos-platform', revision:'a'.repeat(40), path:'delivery/progress.json'},
  reviewedOn:'2026-10-30', summary:'Base técnica disponible.',
  counts:{not_started:22, in_progress:1, blocked:1, accepted:2},
  applications:[{id:'branch-api', stage:'foundation', summary:'API de sucursal.', nextStep:'Persistir operaciones.', accepted:1, total:22, percent:4}],
  workPackages:[{id:'F01-01', title:'Identidad', href:'/guide/roadmap/phase-01/#work-f01-01', status:'blocked', summary:'Falta acordar el contrato.', acceptance:null}],
});

test('publishes project and application acceptance counts with accessible native progress', () => {
  const html = renderProgress(fixture());
  assert.match(html, /progress-percentage">7<span> %/);
  assert.match(html, /max="26" value="2" aria-label="Entregables aceptados del proyecto"/);
  assert.match(html, /<strong>4 %<\/strong><progress max="22" value="1"/);
  assert.match(html, /data-status="blocked">Bloqueado/);
  assert.match(html, /Falta acordar el contrato/);
  assert.match(html, /<details class="progress-method"><summary>/);
  assert.match(html, /no consulta el repositorio en tiempo real/);
});

test('renders reviewed text as content instead of executable markup', () => {
  const data = fixture();
  data.summary = '<script>alert(1)</script>';
  data.applications[0].nextStep = '<img src=x onerror=alert(1)>';
  data.workPackages[0].summary = '<iframe src="evil">';
  const html = renderProgress(data);
  assert.doesNotMatch(html, /<script|<img|<iframe/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('shows acceptance evidence at its immutable revision and future app labels', () => {
  const data = fixture();
  data.applications[0].id = 'future-app';
  data.applications[0].stage = 'validated';
  data.workPackages[0].status = 'accepted';
  data.workPackages[0].acceptance = {revision:'b'.repeat(40), reviewedOn:'2026-10-29', reviewer:'Equipo <QA>', evidence:[{path:'delivery/evidence/F01-01.md', label:'Prueba <revisada>'}]};
  const html = renderProgress(data);
  assert.match(html, /<h3>future-app<\/h3>/);
  assert.match(html, /Alcance validado/);
  assert.match(html, /Equipo &lt;QA&gt;/);
  assert.ok(html.includes(`/blob/${'b'.repeat(40)}/delivery/evidence/F01-01.md`));
  assert.doesNotMatch(html, /undefined/);
});
