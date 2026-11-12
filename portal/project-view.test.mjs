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

// S5 of TASK-333: the five questions that product specs had already decided, as POS Platform migrates them.
const specDecisions = new Map([
  ['Q-05', ['Sí: la autorización se exige en servidor para cada acción (F01-01)', '2026-11-10', 'Ficha F01-01 del producto']],
  ['Q-17', ['Sí: la reimpresión exige permiso propio y motivo (F02-10)', '2026-11-10', 'Ficha F02-10 del producto']],
  ['Q-30', ['Una contraseña inicial fuerte, asignada en la provisión, sin credenciales embebidas (F01-01)', '2026-11-10', 'Ficha F01-01 del producto']],
  ['Q-34', ['Sí: Operaciones asigna la impresora por puesto, que F02-09 registra como dispositivo (F02-09)', '2026-11-11', 'Ficha F02-09 del producto']],
  ['Q-36', ['Sí: la caja muestra una disponibilidad informativa con origen y antigüedad, y vender no ajusta stock (F01-11)', '2026-11-11', 'Ficha F01-11 del producto']],
]);

/**
 * The published registry in schema 3, migrated in memory as S5 describes, so the view is exercised with
 * real records before POS Platform publishes that schema. A registry already in schema 3 is kept.
 */
function schema3(content) {
  if (content.schemaVersion === 3) return structuredClone(content);
  assert.equal(content.schemaVersion, 2);
  assert.deepEqual(content.items.filter(item => item.state === 'decided').map(item => item.id), [...specDecisions.keys()], 'S5 decides exactly the questions that specs had decided');
  const items = content.items.map(({ validation, recommendation, ...source }) => {
    assert.equal(validation, null, `${source.id} has no validation to migrate`);
    const item = { ...structuredClone(source), kind: source.kind === 'decision' ? 'rule' : source.kind, recommendation: null, decision: null };
    if (recommendation) {
      assert.equal(recommendation.endorsement, null, `${source.id} has no endorsement to migrate`);
      const { answer, scope, rationale, basis, references, sources, author, proposedOn } = structuredClone(recommendation);
      item.recommendation = { answer, scope, default: recommendation.default, rationale, basis, references, sources, agent: author.name, proposedOn };
    }
    const decided = specDecisions.get(source.id);
    if (decided) {
      const [answer, decidedOn, origin] = decided;
      Object.assign(item, { decider: 'Producto', reviewedOn: '2026-11-12', decision: { answer, decidedBy: 'Producto', decidedOn, source: origin, outcome: null } });
    }
    return item;
  });
  return { ...structuredClone(content), schemaVersion: 3, items };
}
const contentV3 = schema3(questionsSnapshot.content);

/**
 * The published registry in schema 2, as POS Platform published it before schema 3, so the transitional
 * reader is exercised whichever schema the imported cut uses. A registry still in schema 2 is kept.
 */
function schema2(content) {
  if (content.schemaVersion === 2) return structuredClone(content);
  assert.equal(content.schemaVersion, 3);
  const items = content.items.map(({ decision, recommendation, ...source }) => {
    const item = { ...structuredClone(source), validation: null, recommendation: null };
    if (decision) {
      assert.ok(specDecisions.has(source.id), `${source.id}: schema 2 only recorded the decisions of product specs`);
      item.kind = 'decision';
    }
    if (recommendation) {
      const { agent, proposedOn, ...proposal } = structuredClone(recommendation);
      item.recommendation = { ...proposal, author: { kind: 'agent', name: agent }, proposedOn, endorsement: null };
    }
    return item;
  });
  return { ...structuredClone(content), schemaVersion: 2, items };
}
const contentV2 = schema2(questionsSnapshot.content);

function questionsWith(mutate = () => {}, integration = questionsSnapshot.integration, followUpModel = followUp, content = questionsSnapshot.content) {
  const snapshot = structuredClone({ ...questionsSnapshot, content });
  mutate(snapshot.content);
  snapshot.source.sha256 = questionsContentHash(snapshot.content);
  snapshot.integration = integration;
  return deriveQuestions(snapshot, progress, followUpModel);
}
const questionsV2With = (mutate = () => {}) => questionsWith(mutate, questionsSnapshot.integration, followUp, contentV2);
const questionsV2 = questionsV2With();
const questionsV3With = (mutate = () => {}, followUpModel = followUp) => questionsWith(mutate, questionsSnapshot.integration, followUpModel, contentV3);
const questionsV3 = questionsV3With();
const questionsPage = (model = questions, followUpModel = followUp) => renderProjectPages(progress, followUpModel, null, null, model).get('/project/questions/').body;
const card = (html, id) => {
  const start = html.indexOf(`<article id="${id.toLowerCase()}"`);
  assert.ok(start >= 0, `Card ${id} is published`);
  return html.slice(start, html.indexOf('</article>', start));
};
const summaryOf = html => {
  const start = html.indexOf('class="project-question-summary"');
  return html.slice(start, html.indexOf('</section>', start));
};
// Wording of endorsements and business validation, which the view no longer has.
const remnants = /Sin respaldo del equipo|>Sin respaldo<|Respaldad|Validación de negocio|Pendiente de validación|Validada por|por validar|Borrador de agente|Propuesta de <a|Recomendaci(?:ón|ones) del equipo|valida una regla|="(?:draft|endorsed|validated)"|[?&](?:state|recommendation)=(?:draft|endorsed|validated)\b/;

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

test('questions page summarizes the three states and pending decisions and groups every record by phase', () => {
  for (const model of [questions, questionsV2, questionsV3]) {
    const html = questionsPage(model);
    assert.match(html, /data-project-page="questions"/);
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.equal((html.match(/data-project-item/g) || []).length, model.items.length);
    const summary = summaryOf(html);
    for (const [state, label] of [['open', 'abiertas'], ['answered', 'respondidas'], ['decided', 'decididas']]) {
      assert.match(summary, new RegExp(`href="/project/questions/\\?state=${state}"><strong>${model.counts[state]}</strong> ${label}`));
    }
    assert.equal((summary.match(/href="\/project\/questions\/\?state=/g) || []).length, 3, 'Three states: a decision replaces any separate validation');
    assert.match(summary, new RegExp(`<strong>${model.counts.pendingDecision}</strong> pendientes de decisión · <strong>${model.counts.unassigned}</strong> sin responsable de seguimiento · ${model.counts.total} registros`));
    let previous = -1;
    for (const group of model.groups) {
      const index = html.indexOf(`id="questions-${group.id}"`);
      assert.ok(index > previous, `Phase ${group.id} follows the roadmap order`);
      previous = index;
      const section = html.slice(index, html.indexOf('</section>', index));
      assert.ok(section.includes(`<a href="${group.href}">F${group.id.slice(-2)} · ${escapeText(group.title)}</a>`), `${group.id} names and links its phase`);
      assert.deepEqual([...section.matchAll(/<article id="(q-\d+)"/g)].map(match => match[1].toUpperCase()), group.items.map(item => item.id));
    }
  }
  assert.equal(questions.counts.pendingDecision, questions.items.filter(item => item.kind === 'rule' && item.state === 'open').length, 'Pending decisions are the open rules');
});

test('each question shows its answer, sources, decider, owner, follow-up, packages, priority and decision', () => {
  for (const model of [questions, questionsV2, questionsV3]) {
    const html = questionsPage(model);
    const { repository, revision } = model.source;
    for (const item of model.items) {
      const body = card(html, item.id);
      assert.ok(body.includes(`<code>${item.id}</code>`));
      for (const value of [item.topic, item.question, item.currentAnswer, item.decider]) assert.ok(body.includes(escapeText(value)), `${item.id} shows ${value}`);
      assert.ok(body.includes(`data-state="${item.state}"`));
      assert.ok(body.includes(`data-decider="${escapeText(item.decider)}"`));
      assert.ok(body.includes(`data-phases="${item.phases.join(' ')}"`));
      assert.ok(body.includes(`<dt>Prioridad</dt><dd>${item.priority}</dd>`));
      for (const source of item.sources) assert.ok(body.includes(`href="${repository}/blob/${revision}/${source}"`), `${item.id} pins ${source}`);
      for (const work of item.packages) assert.ok(body.includes(`href="/project/work/#work-${work.id.toLowerCase()}"`));
      if (item.owner === null) assert.ok(body.includes('<dt>Responsable de seguimiento</dt><dd><span class="project-unassigned">Por asignar</span>'));
      if (item.decision) assert.ok(body.includes(`<dt>Decisión</dt><dd>${escapeText(item.decision.decidedBy)} · <time datetime="${item.decision.decidedOn}">${reviewDate(item.decision.decidedOn)}</time></dd>`), `${item.id} names who decided and when`);
      else if (item.kind === 'rule' && item.state === 'open') assert.ok(body.includes('<dt>Decisión</dt><dd><span class="project-unassigned">Pendiente</span></dd>'), `${item.id} awaits its decision`);
      else assert.ok(!body.includes('<dt>Decisión</dt>'), `${item.id}: a fact has no decision, and schema 2 records none`);
      if (item.followUp && item.followUpAction) assert.ok(body.includes(`href="/project/attention/#${item.followUp.toLowerCase()}"`));
      if (item.followUp && !item.followUpAction) {
        assert.ok(body.includes(item.followUp) && !body.includes(`/project/attention/#${item.followUp.toLowerCase()}`), `${item.followUp} stays as text when it is not published`);
        assert.ok(body.includes('no publicado en el corte de seguimientos'));
      }
      if (!item.followUp) assert.ok(body.includes('<dt>Seguimiento</dt><dd><span class="project-unassigned">Sin seguimiento</span>'));
    }
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

test('owners use the team profile when it exists and link any other login to GitHub', () => {
  const member = teamMembers[0];
  const [firstSource, secondSource] = questionsSnapshot.content.items;
  const model = questionsWith(content => {
    const [first, second] = content.items;
    first.owner = member.github;
    second.owner = 'external-user';
  });
  const html = questionsPage(model);
  assert.ok(card(html, firstSource.id).includes(`<a href="/project/team/#member-${member.github.toLowerCase()}">${escapeText(member.name)}</a>`));
  assert.ok(card(html, secondSource.id).includes('<a href="https://github.com/external-user">@external-user</a>'));
  assert.equal(model.counts.unassigned, questions.counts.unassigned - [firstSource, secondSource].filter(item => item.owner === null).length);
});

test('a schema 3 decision appears after the question and before the current answer, with who, when, source and outcome', () => {
  const html = questionsPage(questionsV3);
  for (const [id, [answer, decidedOn, source]] of specDecisions) {
    const body = card(html, id);
    const [question, decision, current] = ['<h3>', 'class="project-question-decision"', '<strong>Respuesta actual</strong>'].map(marker => body.indexOf(marker));
    assert.ok(question >= 0 && question < decision && decision < current, `${id} shows the question, its decision and then the current answer`);
    assert.ok(body.includes(`<div class="project-question-decision"><div class="project-inline-meta"><strong>Decisión</strong></div><p>${escapeText(answer)}</p><p class="project-note">Producto · <time datetime="${decidedOn}">${reviewDate(decidedOn)}</time> · <strong>Fuente:</strong> ${escapeText(source)}</p></div>`), `${id} shows the decided rule, who and when and its source`);
    assert.ok(body.includes('data-state="decided"') && body.includes('data-recommendation="not_applicable"') && body.includes('<dt>Quién decide</dt><dd>Producto</dd>'));
    assert.ok(!body.includes('Recomendación del agente (IA)'), `${id} was decided without a recommendation`);
  }
  assert.equal((html.match(/class="project-question-decision"/g) || []).length, specDecisions.size);
  const outcomes = [['adopted', 'Adopta la recomendación'], ['adapted', 'Ajusta la recomendación'], ['rejected', 'Descarta la recomendación']];
  const model = questionsV3With(content => {
    const recommended = content.items.filter(item => item.recommendation && item.state === 'open');
    outcomes.forEach(([outcome], index) => Object.assign(recommended[index], { state: 'decided', decision: { answer: `Regla decidida ${index + 1}, con la fuente citada.`, decidedBy: 'Comité comercial', decidedOn: recommended[index].reviewedOn, source: 'Acta de decisiones comerciales del 12 de noviembre de 2026', outcome } }));
  });
  const decided = questionsPage(model);
  for (const [outcome, label] of outcomes) {
    const item = model.items.find(entry => entry.decision?.outcome === outcome);
    const body = card(decided, item.id);
    assert.ok(body.includes(`<strong>Decisión</strong><span class="project-tag">${label}</span>`), `${item.id} labels what the decision does with the recommendation`);
    assert.ok(body.includes('<strong>Fuente:</strong> Acta de decisiones comerciales del 12 de noviembre de 2026'));
    const [decision, current, recommendation] = ['class="project-question-decision"', '<strong>Respuesta actual</strong>', 'Recomendación del agente (IA)'].map(marker => body.indexOf(marker));
    assert.ok(decision < current && current < recommendation, `${item.id} keeps the recommendation it came from after the current answer`);
    assert.ok(body.includes('data-recommendation="present"'));
  }
});

/**
 * The schema 3 registry with a regulation-based and a core recommendation on two open rules and a
 * third open rule without one, whatever the imported cut already recommends.
 */
function questionsWithRecommendations() {
  return questionsV3With(content => {
    const [regulated, core, pending] = content.items.filter(item => item.kind === 'rule' && item.state === 'open');
    pending.recommendation = null;
    regulated.recommendation = {
      answer: 'Separar la emisión de la NC de la devolución de dinero.',
      scope: 'country',
      default: 'El rol de bodega no tiene el permiso de emitir NC',
      rationale: 'La NC es un documento tributario y cada régimen define sus plazos.',
      basis: ['practice', 'regulation'],
      references: [{ label: 'Fiscalidad y documentos por país', url: 'https://cpe.sunat.gob.pe/sistema_emision/see_contribuyente' }],
      sources: ['delivery/specs/F04-01.md'],
      agent: 'Claude Code · TASK-314',
      proposedOn: regulated.reviewedOn,
    };
    core.recommendation = {
      answer: 'Exigir la autorización en servidor para cada acción.',
      scope: 'core',
      default: null,
      rationale: 'Es un invariante del producto en todos los países.',
      basis: ['architecture'],
      references: [],
      sources: ['delivery/specs/F01-01.md'],
      agent: 'Codex · TASK-324',
      proposedOn: core.reviewedOn,
    };
  });
}

test('the agent recommendation follows the current answer with its scope, basis, links and the agent that generated it', () => {
  const model = questionsWithRecommendations();
  const html = questionsPage(model);
  const { repository, revision } = model.source;
  // The published registry may already carry recommendations: find the two this test wrote.
  const regulated = model.items.find(item => item.recommendation?.answer === 'Separar la emisión de la NC de la devolución de dinero.');
  const core = model.items.find(item => item.recommendation?.answer === 'Exigir la autorización en servidor para cada acción.');
  const regulatedCard = card(html, regulated.id);
  assert.ok(regulatedCard.includes('data-recommendation="present"') && regulatedCard.includes('data-scope="country"'));
  assert.ok(regulatedCard.indexOf('Recomendación del agente (IA)') > regulatedCard.indexOf('Respuesta actual'), 'The recommendation follows the current answer');
  assert.ok(regulatedCard.includes('<div class="project-question-recommendation"><strong>Recomendación del agente (IA)</strong><p>Separar la emisión de la NC de la devolución de dinero.</p>'), 'The recommendation carries no endorsement label');
  for (const value of ['<strong>Valor por defecto:</strong> El rol de bodega no tiene el permiso de emitir NC', '<strong>Por qué:</strong> La NC es un documento tributario y cada régimen define sus plazos.', '<strong>Fundamento:</strong> Práctica habitual · Norma', 'Configurable por país', 'Sujeta a la confirmación del responsable fiscal o legal de cada país.', `<p class="project-note">Generada por Claude Code · TASK-314 · <time datetime="${regulated.reviewedOn}">${reviewDate(regulated.reviewedOn)}</time></p>`]) {
    assert.ok(regulatedCard.includes(value), `${regulated.id} shows ${value}`);
  }
  assert.ok(regulatedCard.includes('href="https://cpe.sunat.gob.pe/sistema_emision/see_contribuyente">Fiscalidad y documentos por país</a>'));
  assert.ok(regulatedCard.includes(`href="${repository}/blob/${revision}/delivery/specs/F04-01.md"`), 'Recommendation sources are pinned to the imported revision');
  assert.ok(regulatedCard.includes('<dt>Decisión</dt><dd><span class="project-unassigned">Pendiente</span></dd>'), 'A recommendation leaves the decision pending');
  const coreCard = card(html, core.id);
  assert.ok(coreCard.includes('data-recommendation="present"') && coreCard.includes('data-scope="core"'));
  assert.ok(coreCard.includes('Núcleo común: igual en todos los países') && coreCard.includes('Generada por Codex · TASK-324 · '));
  assert.ok(!coreCard.includes('Valor por defecto') && !coreCard.includes('Sujeta a la confirmación'), 'A core rule has no default and no regulation note');
  const pending = model.items.find(item => item.recommendationStatus === 'none');
  assert.ok(card(html, pending.id).includes('<div class="project-question-recommendation project-question-recommendation-empty"><strong>Recomendación del agente (IA)</strong><p>Sin recomendación todavía.</p></div>') && card(html, pending.id).includes('data-recommendation="none"'));
  for (const settled of model.items.filter(item => !item.recommendation && (item.kind === 'fact' || item.state === 'decided'))) {
    const settledCard = card(html, settled.id);
    assert.ok(!settledCard.includes('Recomendación del agente (IA)') && settledCard.includes('data-recommendation="not_applicable"'), `${settled.id} has no recommendation pending`);
  }
});

test('questions page counts recommendations and outcomes and filters by recommendation and scope', () => {
  const model = questionsWithRecommendations();
  const html = questionsPage(model);
  const summary = summaryOf(html);
  assert.ok(summary.includes(`<p class="project-question-recommendations">Recomendaciones del agente: <a href="/project/questions/?recommendation=present"><strong>${model.counts.recommended}</strong> con recomendación</a> · <a href="/project/questions/?recommendation=none"><strong>${model.counts.unrecommended}</strong> sin recomendación</a></p>`));
  assert.equal(model.counts.recommended, model.items.filter(item => item.recommendationStatus === 'present').length, 'The count matches its filter');
  assert.ok(!summary.includes('Decisiones con recomendación'), 'Without a decided recommendation there is nothing to measure');
  assert.ok(summary.includes('La recomendación del agente (IA) propone una regla para un POS corporativo multipaís'));
  for (const [value, label] of [['present', 'Con recomendación'], ['none', 'Sin recomendación']]) assert.ok(html.includes(`<option value="${value}">${label}</option>`), value);
  assert.equal((html.match(/<select name="recommendation">.*?<\/select>/)[0].match(/<option /g) || []).length, 3, 'All, with and without a recommendation');
  for (const [value, label] of [['core', 'Núcleo común'], ['country', 'Por país'], ['legal_entity', 'Por sociedad'], ['branch', 'Por sucursal'], ['register', 'Por caja']]) assert.ok(html.includes(`<option value="${value}">${label}</option>`), value);
  for (const [value, label] of [['open', 'Abierta'], ['answered', 'Respondida'], ['decided', 'Decidida']]) assert.ok(html.includes(`<option value="${value}">${label}</option>`), value);
  assert.equal((html.match(/<select name="state">.*?<\/select>/)[0].match(/<option /g) || []).length, 4, 'All and the three states');
  const outcomes = (adopted, adapted, rejected) => questionsV3With(content => {
    const recommended = content.items.filter(item => item.recommendation && item.state === 'open');
    [...Array(adopted).fill('adopted'), ...Array(adapted).fill('adapted'), ...Array(rejected).fill('rejected')].forEach((outcome, index) => Object.assign(recommended[index], { state: 'decided', decision: { answer: 'Regla decidida en el acta.', decidedBy: 'Comité comercial', decidedOn: recommended[index].reviewedOn, source: 'Acta de decisiones comerciales del 12 de noviembre de 2026', outcome } }));
  });
  assert.ok(summaryOf(questionsPage(outcomes(1, 0, 2))).includes('<p class="project-question-outcomes">Decisiones con recomendación: <strong>1</strong> la adopta · <strong>0</strong> la ajustan · <strong>2</strong> la descartan</p>'));
  const counted = outcomes(2, 1, 0);
  assert.deepEqual([counted.counts.adopted, counted.counts.adapted, counted.counts.rejected], [2, 1, 0]);
  assert.ok(summaryOf(questionsPage(counted)).includes('<strong>2</strong> la adoptan · <strong>1</strong> la ajusta · <strong>0</strong> la descartan'));
});

test('questions page explains who recommends and who decides and links the source at the imported revision', () => {
  const html = questionsPage();
  for (const text of [
    'El comportamiento legacy citado en la respuesta actual describe lo observado; no es una regla decidida.',
    'La recomendación del agente (IA) propone una regla para un POS corporativo multipaís e indica su ámbito: el núcleo común, igual en todos los países, o una configuración por país, sociedad, sucursal o caja. Orienta la decisión y nadie la aprueba.',
    'La decisión final la toma el rol de <strong>Quién decide</strong>. Se registra a partir del documento de decisiones de negocio, citado por nombre y fecha, e indica si adopta, ajusta o descarta la recomendación.',
    'El <strong>responsable de seguimiento</strong> es la persona que impulsa la pregunta.',
  ]) assert.ok(html.includes(text), text);
  const href = `${questions.source.repository}/blob/${questions.source.revision}/${questions.source.path}`;
  assert.ok(html.includes(`href="${href}">Registro de preguntas · ${questions.source.revision.slice(0, 8)}</a>`));
  assert.ok(html.includes(`Registro revisado <time datetime="${questions.reviewedOn}">`));
  assert.match(html, /data-project-filters hidden/);
  for (const name of ['state', 'phase', 'decider', 'recommendation', 'scope']) assert.ok(html.includes(`<select name="${name}">`), name);
  assert.deepEqual([...html.matchAll(/<select name="(\w+)">/g)].map(match => match[1]), ['state', 'phase', 'decider', 'recommendation', 'scope']);
  for (const decider of questions.deciders) assert.ok(html.includes(`<option value="${escapeText(decider)}">`), decider);
  assert.match(html, /<noscript>/);
});

test('questions pages carry no endorsement or business validation', () => {
  const pages = model => renderProjectPages(progress, followUp, null, null, model);
  for (const model of [questions, questionsV2, questionsV3, questionsWithRecommendations()]) {
    const page = pages(model).get('/project/questions/');
    assert.doesNotMatch(page.body, remnants);
    assert.doesNotMatch(page.description, /validación|respaldo/i);
    assert.doesNotMatch(pages(model).get('/project/').body, remnants);
  }
});

test('a schema 2 registry renders through the model of schema 3', () => {
  const html = questionsPage(questionsV2);
  assert.ok(!html.includes('class="project-question-decision"'), 'Schema 2 records no decision block');
  assert.ok(!html.includes('<span class="project-tag">Decisión</span>'), 'A decision of schema 2 is shown as a rule');
  const decided = questionsV2.items.filter(entry => entry.state === 'decided');
  assert.deepEqual(decided.map(item => item.id).sort(), [...specDecisions.keys()], 'The decisions of product specs are shown decided');
  for (const item of decided) {
    const body = card(html, item.id);
    assert.ok(body.includes('<span class="project-tag">Regla</span><span class="project-tag project-tag-verified">Decidida</span>'), `${item.id} is shown as a decided rule`);
    assert.ok(!body.includes('<dt>Decisión</dt>'), `${item.id} has no decision of its own to show`);
  }
  const validated = questionsV2With(content => {
    const rule = content.items.find(item => item.kind === 'rule' && item.state === 'open');
    Object.assign(rule, { state: 'validated', validation: { validatedOn: rule.reviewedOn, validatedBy: 'pymimtos', note: 'Confirmada en la reunión de reglas.' } });
  });
  const body = card(questionsPage(validated), validated.items.find(item => item.state === 'decided' && item.recommendation).id);
  assert.ok(body.includes('data-state="decided"') && !body.includes('Confirmada en la reunión de reglas.') && !body.includes('pymimtos'), 'A validated rule of schema 2 is shown decided, without its validation');
  assert.equal(validated.counts.decided, questionsV2.counts.decided + 1);
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
  const decided = questionsPage(questionsV3With(content => { content.items.find(item => item.decision).decision.source = 'Acta <script>alert(1)</script> del 10 de noviembre'; }));
  assert.ok(decided.includes('Acta &lt;script&gt;alert(1)&lt;/script&gt; del 10 de noviembre') && !decided.includes('<script>'));
  const empty = renderProjectPages(progress, followUp).get('/project/questions/').body;
  assert.ok(empty.includes('No hay un registro de preguntas publicado en este corte.'));
  assert.doesNotMatch(empty, /data-project-item/);
});

test('overview links the questions view with its open questions and pending decisions', () => {
  for (const model of [questions, questionsV2, questionsV3]) {
    const html = renderProjectPages(progress, followUp, null, null, model).get('/project/').body;
    assert.ok(html.includes(`<p class="project-increment-link"><a href="/project/questions/">Preguntas y reglas de negocio</a><span>${model.counts.open} abiertas · ${model.counts.pendingDecision} pendientes de decisión.</span></p>`));
  }
  const single = questionsV3With(content => {
    const open = content.items.filter(item => item.state === 'open');
    for (const item of open.slice(1)) Object.assign(item, { state: 'decided', decision: { answer: 'Regla decidida en el acta.', decidedBy: 'Comité comercial', decidedOn: item.reviewedOn, source: 'Acta de decisiones comerciales del 12 de noviembre de 2026', outcome: item.recommendation ? 'adopted' : null } });
  });
  assert.ok(renderProjectPages(progress, followUp, null, null, single).get('/project/').body.includes('<span>1 abierta · 1 pendiente de decisión.</span>'));
  assert.ok(!renderProjectPages(progress, followUp).get('/project/').body.includes('<a href="/project/questions/">Preguntas y reglas de negocio</a>'));
});
