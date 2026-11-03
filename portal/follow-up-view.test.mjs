import assert from 'node:assert/strict';
import test from 'node:test';
import {renderAttentionSummary, renderFollowUpView} from './follow-up-view.mjs';

function fixture() {
  const work = {id:'F01-11',title:'Consulta Mountain',status:'blocked',summary:'Acceso real pendiente, implementación disponible.',phase:'phase-01',phaseTitle:'Operación local',apps:['branch-api'],href:'/guide/roadmap/phase-01/#work-f01-11',verification:null,acceptance:null,attentionIds:['FOLLOWUP-001'],issue:{number:20,url:'https://github.com/developer-implementos/pos-platform/issues/20',state:'OPEN',executionLabels:['status:blocked'],assignees:[],updatedAt:'2026-11-03T01:00:00Z'}};
  const action = {id:'FOLLOWUP-001',kind:'access',state:'open',workPackages:[work],summary:'Confirmar acceso',impact:'La consulta controlada no acredita el entorno real.',impactScope:'technical',nextAction:'Confirmar instancia autorizada.',requestedFrom:'Infraestructura',owner:null,closureCriteria:'Consulta real reproducible.',reviewedOn:'2026-11-03',evidence:[{url:work.issue.url,label:'Última consulta'}],resolution:null};
  return {model:{reviewedOn:'2026-11-03',observedAt:'2026-11-03T02:00:00Z',items:[action],workPackages:[work],warnings:[],source:{repository:'https://github.com/developer-implementos/pos-platform',revision:'a'.repeat(40),path:'delivery/follow-ups.json'}},progress:{reviewedOn:'2026-11-02',source:{repository:'https://github.com/developer-implementos/pos-platform'},phases:[{id:'phase-01',title:'Operación local'}],applications:[{id:'branch-api'}]}};
}

test('publishes next actions, unknown responsibility and distinct provenance dates', () => {
  const {model,progress} = fixture();
  const html = renderFollowUpView(model,progress);
  for (const text of ['Siguiente acción:','Confirmar instancia autorizada.','Por asignar','Sin desarrollador asignado','Se resuelve cuando:','Verificación técnica:','GitHub consultado:','Última consulta','Estado de cada entregable']) assert.ok(html.includes(text), text);
  assert.match(html, /href="#work-f01-11"/);
  assert.match(html, /id="followup-001"/);
  assert.match(html, /form[^>]+hidden/);
  assert.doesNotMatch(html, /<script/);
});

test('all work summaries remain available including future development and verified pending review', () => {
  const {model,progress} = fixture();
  const work = model.workPackages[0];
  work.status = 'not_started';
  assert.match(renderFollowUpView(model,progress), /Acceso real pendiente, implementación disponible/);
  work.status = 'verified';
  work.issue.state = 'OPEN';
  const html=renderFollowUpView(model,progress);
  assert.match(html, /data-review="true"/);
  assert.match(html, /Verificado técnicamente/);
  assert.match(html, /Sin aceptación manual registrada/);
});

test('renders reviewed strings and usernames safely and keeps portal preview concise', () => {
  const {model,progress} = fixture();
  model.items[0].summary='<img src=x onerror=alert(1)>';
  model.items[0].nextAction='<script>alert(2)</script>';
  model.workPackages[0].summary='<iframe src=evil>';
  model.workPackages[0].issue.assignees=['floxcristian'];
  const html=renderFollowUpView(model,progress);
  assert.doesNotMatch(html, /<img|<script|<iframe/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /https:\/\/github.com\/floxcristian/);
  const preview=renderAttentionSummary(model);
  assert.match(preview, /Ver pendientes y bloqueos/);
  assert.match(preview, /no es una vista en tiempo real/);
  assert.doesNotMatch(preview, /<img|<script/);
});
