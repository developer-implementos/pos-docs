import assert from 'node:assert/strict';
import test from 'node:test';
import {renderProgress} from './progress-view.mjs';

const fixture = () => ({
  measurement: 'acceptance', total: 26, completed: 2, accepted: 2, verified: null, pendingAcceptance: null, percent: 7,
  source: {repository:'https://github.com/developer-implementos/pos-platform', revision:'a'.repeat(40), path:'delivery/progress.json'},
  reviewedOn:'2026-10-30', summary:'Base técnica disponible.',
  counts:{not_started:22, in_progress:1, blocked:1, accepted:2},
  applications:[{id:'branch-api', stage:'foundation', summary:'API de sucursal.', nextStep:'Persistir operaciones.', completed:1, accepted:1, total:22, percent:4}],
  phases:[{id:'phase-01',title:'Operación local',href:'/guide/roadmap/phase-01/',completed:2,total:13,percent:15}],
  workPackages:[{id:'F01-01', title:'Identidad', href:'/guide/roadmap/phase-01/#work-f01-01', status:'blocked', summary:'Falta acordar el contrato.', acceptance:null}],
});

test('publishes project and application acceptance counts with accessible native progress', () => {
  const html = renderProgress(fixture());
  assert.match(html, /progress-percentage">7<span> %/);
  assert.match(html, /max="26" value="2" aria-label="Entregables aceptados del proyecto"/);
  assert.match(html, /<strong>4 %<\/strong><progress max="22" value="1"/);
  assert.match(html, /data-status="blocked">Bloqueado/);
  assert.match(html, /<strong>1<\/strong> bloqueado<\/li>/);
  assert.match(html, /Falta acordar el contrato/);
  assert.match(html, /<details class="progress-method"><summary>/);
  assert.match(html, /no consulta el repositorio en tiempo real/);
  assert.match(html, /data-measurement="acceptance"/);
  assert.match(html, /Aceptación del roadmap/);
  assert.match(html, /No contiene verificaciones técnicas separadas/);
  assert.doesNotMatch(html, /class="progress-manual"/);
});

function technicalFixture() {
  const data = fixture();
  Object.assign(data, { measurement:'verification', total:71, completed:3, verified:3, accepted:0, pendingAcceptance:3, percent:4.2 });
  data.counts = {not_started:58,in_progress:10,blocked:0,verified:3};
  Object.assign(data.applications[0], {total:35,completed:3,verified:3,accepted:0,percent:8.6});
  Object.assign(data.phases[0], {completed:3,total:13,verified:3,accepted:0,percent:23.1});
  Object.assign(data.workPackages[0], {
    status:'verified', summary:'Criterios comprobados con PostgreSQL real.',
    verification:{revision:'c'.repeat(40),reviewedOn:'2026-10-29',reviewer:'Revisión técnica <agente>',evidence:[{path:'delivery/reviews/F01-01.md',label:'Matriz <técnica>'}]},
  });
  return data;
}

test('technical completion remains primary while pending manual review is a distinct compact count', () => {
  const html = renderProgress(technicalFixture());
  assert.match(html, /data-measurement="verification"/);
  assert.match(html, /Avance técnico verificado/);
  assert.match(html, /progress-percentage">4,2<span> %/);
  assert.match(html, /max="71" value="3" aria-label="Entregables verificados del proyecto"/);
  assert.match(html, /<strong>8,6 %<\/strong><progress max="35" value="3"/);
  assert.match(html, /<h3 id="progress-manual-title">Aceptación manual<\/h3>/);
  assert.match(html, /<strong>0<\/strong> entregables aceptados por el equipo · <strong>3<\/strong> verificados técnicamente pendientes/);
  assert.match(html, /data-status="verified">Verificado técnicamente/);
  assert.match(html, /Aceptación manual pendiente/);
  assert.doesNotMatch(html, /Aceptado manualmente el/);
  assert.match(html, /Revisión técnica &lt;agente&gt;/);
  assert.ok(html.includes(`/blob/${'c'.repeat(40)}/delivery/reviews/F01-01.md`));
  assert.equal((html.match(/<progress /g) || []).length, 2, 'Only project and app have progress bars; phases and manual review use visible counts');
});

test('phase summary exposes its own denominator and roadmap link without conflating global completion', () => {
  const html = renderProgress(technicalFixture());
  assert.match(html, /data-progress-phase="phase-01"/);
  assert.match(html, /href="\/guide\/roadmap\/phase-01\/"/);
  assert.match(html, /<strong>23,1 %<\/strong><span>3 de 13 verificados<\/span>/);
  assert.match(html, /<strong>3 de 71<\/strong> entregables verificados/);
});

test('manual acceptance displays its own immutable evidence without replacing verification', () => {
  const data = technicalFixture();
  data.accepted = 1;
  data.pendingAcceptance = 2;
  data.workPackages[0].acceptance = {revision:'d'.repeat(40),reviewedOn:'2026-10-30',reviewer:'Equipo de revisión',evidence:[{path:'delivery/reviews/acceptance.md',label:'Acta de revisión'}]};
  const html = renderProgress(data);
  assert.match(html, /progress-percentage">4,2<span> %/);
  assert.match(html, /Aceptado manualmente el/);
  assert.match(html, /Verificado el/);
  assert.doesNotMatch(html, /Aceptación manual pendiente\./);
  assert.ok(html.includes(`/blob/${'c'.repeat(40)}/delivery/reviews/F01-01.md`));
  assert.ok(html.includes(`/blob/${'d'.repeat(40)}/delivery/reviews/acceptance.md`));
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
