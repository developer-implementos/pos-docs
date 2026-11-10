import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderProjectPages } from './project-view.mjs';
import { deriveProgress, loadProgress, progressContentHash } from './progress.mjs';
import { loadFollowUp } from './follow-up.mjs';
import { deriveQuestions, loadQuestions, questionsContentHash } from './questions.mjs';
import { teamMembers } from './team.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const progress = loadProgress(root);
const followUp = loadFollowUp(root, progress);
const questions = loadQuestions(root, progress, followUp);
const questionsSnapshot = JSON.parse(fs.readFileSync(new URL('./data/project-questions.json', import.meta.url), 'utf8'));
const routes = ['/project/', '/project/plan/', '/project/work/', '/project/attention/', '/project/questions/', '/project/team/'];
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const reviewDate = value => new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
function questionsWith(mutate = () => {}, integration = questionsSnapshot.integration, followUpModel = followUp) {
  const snapshot = structuredClone(questionsSnapshot);
  mutate(snapshot.content);
  snapshot.source.sha256 = questionsContentHash(snapshot.content);
  snapshot.integration = integration;
  return deriveQuestions(snapshot, progress, followUpModel);
}
const questionsPage = (model = questions, followUpModel = followUp) => renderProjectPages(progress, followUpModel, null, null, model).get('/project/questions/').body;
const card = (html, id) => {
  const start = html.indexOf(`<article id="${id.toLowerCase()}"`);
  assert.ok(start >= 0, `Card ${id} is published`);
  return html.slice(start, html.indexOf('</article>', start));
};

test('project pages expose shell metadata, current navigation and reviewed provenance', () => {
  const pages = renderProjectPages(progress, followUp, null, null, questions);
  assert.deepEqual([...pages.keys()], routes);
  for (const [route, page] of pages) {
    for (const href of routes) assert.match(page.body, new RegExp(`<nav class="project-navigation"[^]*?href="${href}"`), `${route} links ${href}`);
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

test('overview links to what changed in the newest release, only on the summary', () => {
  const changelog = {version:'0.3.0', date:'2026-11-12', total:1, entries:[{section:'Novedades', text:'x', pr:null, prUrl:null, commit:null}]};
  const pages = renderProjectPages(progress, followUp, null, changelog);
  assert.match(pages.get('/project/').body, /<p class="project-increment-link"><a href="\/guide\/changelog\/">Qué cambió · versión 0\.3\.0<\/a><span>1 cambio publicado el <time datetime="2026-11-12">12-11-2026<\/time><\/span><\/p>/);
  for (const route of ['/project/work/', '/project/attention/', '/project/team/']) assert.doesNotMatch(pages.get(route).body, /Qué cambió/);
  assert.doesNotMatch(renderProjectPages(progress, followUp).get('/project/').body, /Qué cambió/);
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
  for (const group of [...progress.phases, ...progress.applications]) {
    const percent = new Intl.NumberFormat('es-CL', {maximumFractionDigits: 1}).format(group.percent);
    assert.ok(html.includes(`<strong>${percent} %<span>${group.completed} / ${group.total}</span></strong>`), 'Each breakdown exposes its percentage and denominator together');
  }
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

test('schema 1 acceptance stays historical across summary, breakdowns, dates and work detail', () => {
  const snapshot = JSON.parse(fs.readFileSync(new URL('./data/project-progress.json', import.meta.url), 'utf8'));
  snapshot.content.schemaVersion = 1;
  snapshot.content.summary = 'Aceptaciones registradas en el corte histórico del fixture.';
  const evidence = [{path: 'delivery/evidence/historical-acceptance.md', label: 'Acta de aceptación del fixture'}];
  snapshot.content.applications = snapshot.content.applications.map(app => ({...app, summary: 'Alcance del registro histórico del fixture.', nextStep: 'Revisar la siguiente aceptación del fixture.', evidence}));
  snapshot.content.workPackages = snapshot.content.workPackages.map((entry, index) => {
    const {verification, ...work} = entry;
    return {...work, status: index === 0 ? 'accepted' : index === 1 ? 'in_progress' : 'not_started', summary: 'Estado histórico del fixture.', acceptance: index === 0 ? {revision: snapshot.source.revision, reviewedOn: snapshot.content.reviewedOn, reviewer: 'Equipo del fixture histórico', evidence} : null};
  });
  snapshot.source.sha256 = progressContentHash(snapshot.content);
  const historical = deriveProgress(snapshot, fs.readFileSync(new URL('../docs/roadmap.json', import.meta.url), 'utf8'));
  const historicalFollowUp = loadFollowUp(root, historical);
  assert.equal(historical.measurement, 'acceptance');
  assert.equal(historical.accepted, 1);
  assert.equal(historical.verified, null);
  assert.ok(historical.workPackages.every(work => work.verification == null));
  const pages = renderProjectPages(historical, historicalFollowUp);
  for (const page of pages.values()) {
    assert.match(page.body, /<strong>Aceptación del alcance<\/strong>/);
    assert.match(page.body, /registro histórico de esquema 1 mide aceptación del alcance/);
    assert.match(page.body, /No contiene verificaciones técnicas separadas/);
    assert.match(page.body, /La aceptación histórica no acredita verificación técnica separada ni habilitación operativa/);
    assert.doesNotMatch(page.body, /<strong>Avance técnico<\/strong>|ALCANCE VERIFICADO/);
  }
  const summary = pages.get('/project/').body;
  assert.match(summary, /ALCANCE ACEPTADO/);
  assert.match(summary, /Según el registro histórico/);
  assert.doesNotMatch(summary, /Según la revisión técnica|status=verified|status=review/);
  assert.match(summary, /href="\/project\/work\/\?status=accepted"/);
  const work = pages.get('/project/work/').body;
  assert.match(work, /<th scope="col">Estado del entregable<\/th>/);
  assert.match(work, /Aceptación histórica y ejecución en GitHub/);
  assert.match(work, /data-status="accepted"/);
  assert.match(work, /Acta de aceptación del fixture/);
  assert.doesNotMatch(work, /Estado técnico|Verificación técnica completa|value="verified"|value="review"|Sin verificación completa/);
  assert.match(work, /Sin aceptación registrada/);
});

test('questions page summarizes states and pending validation and groups every record by phase', () => {
  const html = questionsPage();
  assert.match(html, /data-project-page="questions"/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  assert.equal((html.match(/data-project-item/g) || []).length, questions.items.length);
  const start = html.indexOf('class="project-question-summary"');
  const summary = html.slice(start, html.indexOf('</section>', start));
  for (const [state, label] of [['open', 'abiertas'], ['answered', 'respondidas'], ['decided', 'decididas'], ['validated', 'validadas']]) {
    assert.match(summary, new RegExp(`href="/project/questions/\\?state=${state}"><strong>${questions.counts[state]}</strong> ${label}`));
  }
  assert.match(summary, new RegExp(`<strong>${questions.counts.pendingValidation}</strong> por validar`));
  assert.match(summary, new RegExp(`<strong>${questions.counts.unassigned}</strong> sin responsable de seguimiento`));
  let previous = -1;
  for (const group of questions.groups) {
    const index = html.indexOf(`id="questions-${group.id}"`);
    assert.ok(index > previous, `Phase ${group.id} follows the roadmap order`);
    previous = index;
    const section = html.slice(index, html.indexOf('</section>', index));
    assert.ok(section.includes(`<a href="${group.href}">F${group.id.slice(-2)} · ${escapeText(group.title)}</a>`), `${group.id} names and links its phase`);
    assert.deepEqual([...section.matchAll(/<article id="(q-\d+)"/g)].map(match => match[1].toUpperCase()), group.items.map(item => item.id));
  }
});

test('each question shows its answer, sources, decider, owner, follow-up, packages, priority and validation', () => {
  const html = questionsPage();
  const repository = questions.source.repository;
  for (const item of questions.items) {
    const body = card(html, item.id);
    assert.ok(body.includes(`<code>${item.id}</code>`));
    for (const value of [item.topic, item.question, item.currentAnswer, item.decider]) assert.ok(body.includes(escapeText(value)), `${item.id} shows ${value}`);
    assert.ok(body.includes(`data-state="${item.state}"`));
    assert.ok(body.includes(`data-decider="${escapeText(item.decider)}"`));
    assert.ok(body.includes(`data-phases="${item.phases.join(' ')}"`));
    assert.ok(body.includes(`<dt>Prioridad</dt><dd>${item.priority}</dd>`));
    for (const source of item.sources) assert.ok(body.includes(`href="${repository}/blob/${questions.source.revision}/${source}"`), `${item.id} pins ${source}`);
    for (const work of item.packages) assert.ok(body.includes(`href="/project/work/#work-${work.id.toLowerCase()}"`));
    if (item.owner === null) assert.ok(body.includes('<dt>Responsable de seguimiento</dt><dd><span class="project-unassigned">Por asignar</span>'));
    if (item.validation === null) assert.ok(body.includes('Pendiente de validación'));
    if (item.followUp && item.followUpAction) assert.ok(body.includes(`href="/project/attention/#${item.followUp.toLowerCase()}"`));
    if (item.followUp && !item.followUpAction) {
      assert.ok(body.includes(item.followUp) && !body.includes(`/project/attention/#${item.followUp.toLowerCase()}`), `${item.followUp} stays as text when it is not published`);
      assert.ok(body.includes('no publicado en el corte de seguimientos'));
    }
    if (!item.followUp) assert.ok(body.includes('<dt>Seguimiento</dt><dd><span class="project-unassigned">Sin seguimiento</span>'));
  }
});

test('questions link published follow-ups and keep missing ones as text', () => {
  const withFollowUp = questions.items.find(item => item.followUp);
  const present = structuredClone(followUp);
  if (!present.items.some(action => action.id === withFollowUp.followUp)) present.items.push({ ...present.items[0], id: withFollowUp.followUp, summary: 'Seguimiento sintético publicado' });
  const linked = card(questionsPage(questionsWith(undefined, undefined, present), present), withFollowUp.id);
  assert.ok(linked.includes(`href="/project/attention/#${withFollowUp.followUp.toLowerCase()}">${withFollowUp.followUp}`));
  const absent = { ...structuredClone(followUp), items: followUp.items.filter(action => action.id !== withFollowUp.followUp) };
  const text = card(questionsPage(questionsWith(undefined, undefined, absent), absent), withFollowUp.id);
  assert.ok(!text.includes(`/project/attention/#${withFollowUp.followUp.toLowerCase()}`));
  assert.ok(text.includes(`${withFollowUp.followUp} <small>no publicado en el corte de seguimientos</small>`));
});

test('owners use the team profile when it exists and business validation names its login and date', () => {
  const member = teamMembers[0];
  const [firstSource, secondSource] = questionsSnapshot.content.items;
  const model = questionsWith(content => {
    const [first, second] = content.items;
    first.owner = member.github;
    Object.assign(second, { owner: 'external-user', state: 'validated', validation: { validatedOn: second.reviewedOn, validatedBy: 'pymimtos', note: 'Confirmada en la reunión de reglas.' } });
  });
  const html = questionsPage(model);
  assert.ok(card(html, firstSource.id).includes(`<a href="/project/team/#member-${member.github.toLowerCase()}">${escapeText(member.name)}</a>`));
  const external = card(html, secondSource.id);
  assert.ok(external.includes('<a href="https://github.com/external-user">@external-user</a>'));
  assert.ok(external.includes(`Validada por <a href="https://github.com/pymimtos">@pymimtos</a> el <time datetime="${secondSource.reviewedOn}">${reviewDate(secondSource.reviewedOn)}</time>`));
  assert.ok(external.includes('Confirmada en la reunión de reglas.'));
  assert.ok(external.includes('data-state="validated"'));
  assert.equal(model.counts.validated, questions.counts.validated + 1);
});

test('questions page states that legacy behavior is not an approved rule and links the source at the imported revision', () => {
  const html = questionsPage();
  assert.ok(html.includes('El comportamiento legacy citado describe lo observado; no es una regla aprobada.'));
  assert.ok(html.includes('Sólo el responsable de negocio valida una regla o una respuesta'));
  const href = `${questions.source.repository}/blob/${questions.source.revision}/${questions.source.path}`;
  assert.ok(html.includes(`href="${href}">Registro de preguntas · ${questions.source.revision.slice(0, 8)}</a>`));
  assert.ok(html.includes(`Registro revisado <time datetime="${questions.reviewedOn}">`));
  assert.match(html, /data-project-filters hidden/);
  for (const name of ['state', 'phase', 'decider']) assert.ok(html.includes(`<select name="${name}">`), name);
  for (const decider of questions.deciders) assert.ok(html.includes(`<option value="${escapeText(decider)}">`), decider);
  assert.match(html, /<noscript>/);
});

test('a pre-integration revision is identified on the questions page', () => {
  const preview = questionsPage(questionsWith(undefined, { reference: 'main', included: false }));
  assert.ok(preview.includes('class="project-alert project-question-preview"'));
  assert.ok(preview.includes('Corte previo a la integración'));
  assert.ok(preview.includes('todavía no está integrada en <code>main</code>'));
  const integrated = questionsPage(questionsWith(undefined, { reference: 'main', included: true }));
  assert.ok(!integrated.includes('Corte previo a la integración'));
  assert.ok(integrated.includes('Revisión integrada en <code>main</code>'));
  assert.equal(questionsPage().includes('Corte previo a la integración'), questions.integration.included === false, 'The published snapshot shows its own integration state');
});

test('questions escape authored text and render without a published registry', () => {
  const html = questionsPage(questionsWith(content => { content.items[0].question = '¿<img src=x onerror=alert(1)>?'; }));
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x/);
  const empty = renderProjectPages(progress, followUp).get('/project/questions/').body;
  assert.ok(empty.includes('No hay un registro de preguntas publicado en este corte.'));
  assert.doesNotMatch(empty, /data-project-item/);
});

test('overview links the questions view with its open and pending counts', () => {
  const html = renderProjectPages(progress, followUp, null, null, questions).get('/project/').body;
  assert.ok(html.includes(`<p class="project-increment-link"><a href="/project/questions/">Preguntas y reglas de negocio</a><span>${questions.counts.open} abiertas · ${questions.counts.pendingValidation} por validar con el responsable de negocio.</span></p>`));
  assert.ok(!renderProjectPages(progress, followUp).get('/project/').body.includes('<a href="/project/questions/">Preguntas y reglas de negocio</a>'));
});
