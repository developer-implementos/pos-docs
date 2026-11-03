import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderProjectPages } from './project-view.mjs';
import { loadProgress } from './progress.mjs';
import { loadFollowUp } from './follow-up.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const progress = loadProgress(root);
const followUp = loadFollowUp(root, progress);

test('four project pages expose shell metadata, current navigation and reviewed provenance', () => {
  const pages = renderProjectPages(progress, followUp);
  assert.deepEqual([...pages.keys()], ['/project/', '/project/work/', '/project/attention/', '/project/team/']);
  for (const [route, page] of pages) {
    assert.match(page.body, new RegExp(`href="${route}" aria-current="page"`));
    assert.deepEqual(page.styles, ['/portal/project.css']);
    assert.deepEqual(page.scripts, ['/portal/project.js']);
    assert.equal((page.body.match(/<h1>/g) || []).length, 1);
    assert.doesNotMatch(page.body, /<(?:html|body|script|style)\b/);
    assert.match(page.body, new RegExp(`datetime="${progress.reviewedOn}"`));
    assert.match(page.body, new RegExp(`datetime="${followUp.observedAt.replaceAll('.', '\\.')}"`));
    assert.match(page.body, /id="project-sources"/);
    assert.match(page.body, /data-project-update><summary>Actualización y fuentes<\/summary>/);
    assert.match(page.body, /todos tienen el mismo peso/i);
  }
});

test('overview has actionable KPIs, limited execution preview and both no-JS breakdowns', () => {
  const html = renderProjectPages(progress, followUp).get('/project/').body;
  assert.equal((html.match(/class="project-kpi"/g) || []).length, 4);
  for (const href of ['/project/work/?status=verified', '/project/work/?status=in_progress', '/project/attention/?state=open', '/project/work/?status=review']) assert.ok(html.includes(`href="${href}"`));
  assert.match(html, /data-breakdown="phases"/);
  assert.match(html, /data-breakdown="apps"/);
  assert.doesNotMatch(html, /data-breakdown="(?:phases|apps)" hidden/);
  assert.equal((html.match(/<tbody><tr>/g) || []).length, 1);
  assert.match(html, /Aceptación|aceptación/);
  assert.match(html, /<summary id="state-title">Contexto del avance<\/summary>/);
  for (const app of progress.applications) {
    assert.ok(html.includes(app.summary), `Preserve the reviewed scope of ${app.id}`);
    assert.ok(html.includes(app.nextStep), `Preserve the next step of ${app.id}`);
    for (const evidence of app.evidence) assert.ok(html.includes(`${progress.source.repository}/blob/${progress.productRevision}/${evidence.path}`), `Pin ${app.id} evidence to its reviewed revision`);
  }
});

test('work page keeps every deliverable available without JS with stable anchors and evidence', () => {
  const html = renderProjectPages(progress, followUp).get('/project/work/').body;
  assert.equal((html.match(/data-project-item/g) || []).length, progress.total);
  assert.match(html, /data-project-filters hidden/);
  assert.match(html, /<noscript>/);
  for (const work of followUp.workPackages) {
    assert.ok(html.includes(`id="work-${work.id.toLowerCase()}"`));
    assert.ok(html.includes(work.issue.url));
    assert.ok(html.includes(work.href));
  }
  assert.match(html, /Sin desarrollador asignado/);
  assert.match(html, /Aceptación humana pendiente/);
});

test('actions preserve resolution evidence and linked unknown owners without unsafe HTML', () => {
  const changed = structuredClone(followUp);
  changed.items[0] = { ...changed.items[0], state: 'resolved', owner: 'external', summary: '<img src=x onerror=alert(1)>', resolution: { resolvedOn: '2026-11-03', summary: 'Acceso comprobado', evidence: [{ label: 'Comprobación', url: 'https://github.com/developer-implementos/pos-platform/issues/20' }] } };
  const pages = renderProjectPages(progress, changed);
  const attention = pages.get('/project/attention/').body;
  assert.match(attention, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(attention, /<img src=x/);
  assert.match(attention, /Acceso comprobado/);
  assert.match(attention, /data-state="resolved"/);
  assert.match(attention, /<strong>Acción registrada<\/strong>/);
  assert.match(attention, /id="followup-001"/);
  assert.match(pages.get('/project/team/').body, /Perfil sin registrar en el equipo/);
  assert.match(pages.get('/project/team/').body, /github.com\/external/);
});

test('observation timestamps use Chile local time while declared review dates remain unchanged', () => {
  const changed = structuredClone(followUp);
  changed.observedAt = '2026-11-03T01:23:46.644Z';
  const html = renderProjectPages(progress, changed).get('/project/').body;
  const local = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(changed.observedAt));
  assert.ok(html.includes(`<time datetime="${changed.observedAt}">${local}</time> · Chile`));
  const review = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${changed.reviewedOn}T00:00:00Z`));
  assert.ok(html.includes(`<time datetime="${changed.reviewedOn}">${review}</time>`));
  assert.match(html, /href="#project-sources">Ver fuentes/);
});

test('empty cuts render without fabricated progress, people assignments or actions', () => {
  const emptyProgress = { ...structuredClone(progress), total: 0, completed: 0, verified: 0, accepted: 0, pendingAcceptance: 0, percent: 0, workPackages: [], phases: [], applications: [], counts: { not_started: 0, in_progress: 0, blocked: 0, verified: 0 }, summary: 'Sin entregables registrados en este corte.' };
  const emptyFollowUp = { ...structuredClone(followUp), items: [], workPackages: [], warnings: [], counts: { open: 0, resolved: 0, unassigned: 0, technical: 0, operational: 0, review: 0 } };
  const pages = renderProjectPages(emptyProgress, emptyFollowUp);
  assert.match(pages.get('/project/').body, /No hay acciones abiertas en este corte/);
  assert.match(pages.get('/project/').body, /No hay trabajo activo registrado en este corte/);
  assert.match(pages.get('/project/work/').body, /0 entregables · Verificación técnica y ejecución en GitHub se muestran por separado/);
  assert.match(pages.get('/project/attention/').body, /0 abiertas/);
  assert.doesNotMatch(pages.get('/project/attention/').body, /data-project-item/);
  assert.match(pages.get('/project/team/').body, /Sin entregables activos asignados en este corte/);
});

test('fully resolved actions leave no open action or assignment count and remain consultable', () => {
  const changed = structuredClone(followUp);
  changed.items = changed.items.map(action => ({ ...action, state: 'resolved', resolution: { resolvedOn: '2026-11-03', summary: 'Decisión registrada con evidencia.', evidence: action.evidence } }));
  const pages = renderProjectPages(progress, changed);
  assert.match(pages.get('/project/').body, /No hay acciones abiertas en este corte/);
  const attention = pages.get('/project/attention/').body;
  assert.match(attention, new RegExp(`0 abiertas</strong> · 0 por asignar · ${changed.items.length} resueltas`));
  assert.equal((attention.match(/data-state="resolved"/g) || []).length, changed.items.length);
  assert.doesNotMatch(attention, /<strong>Siguiente acción<\/strong>/);
  assert.match(attention, /Decisión registrada con evidencia/);
});
