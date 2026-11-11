import {renderPlanning, relatedPlan, planHref} from './planning-view.mjs';
import { deriveProject, applicationNames, technicalStatuses, executionLabel, actionKinds, impactScopes, isActiveWork } from './project.mjs';
import { answerSourceNames, questionKinds, questionStates } from './questions.mjs';
import { criticalities, decisionStates, evidenceStates, ruleKinds, ruleLayers, ruleTypes, verificationStates, withoutPhase } from './rules.mjs';
import { teamMembers } from './team.mjs';

const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const number = value => new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value);
const date = value => new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value.length === 10 ? `${value}T00:00:00Z` : value));
const time = value => `<time datetime="${escape(value)}">${date(value)}</time>`;
const observationTime = value => `<time datetime="${escape(value)}">${new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(value))}</time> · Chile`;
const workHref = work => `/project/work/#work-${work.id.toLowerCase()}`;
const actionHref = action => `/project/attention/#${action.id.toLowerCase()}`;
const queryHref = (route, values) => `${route}?${escape(new URLSearchParams(values).toString())}`;
const profile = login => login ? `<a href="https://github.com/${escape(login)}">@${escape(login)}</a>` : '<span class="project-unassigned">Por asignar</span>';
const issueLink = work => `<a href="${escape(work.issue.url)}">#${work.issue.number}<span class="project-sr-only"> · ${escape(work.id)} en GitHub</span></a>`;
const sources = items => `<ul class="project-evidence">${items.map(item => `<li><a href="${escape(item.url)}">${escape(item.label)}</a></li>`).join('')}</ul>`;
const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const tag = (label, tone = '') => `<span class="project-tag${tone ? ` project-tag-${tone}` : ''}">${escape(label)}</span>`;
const statusTag = work => tag(technicalStatuses[work.status], work.status === 'blocked' ? 'warning' : work.status === 'verified' || work.status === 'accepted' ? 'verified' : '');
const heading = (title, description) => `<div class="project-heading"><p class="eyebrow">POS PLATFORM · PROYECTO</p><h1>${title}</h1><p>${description}</p></div>`;
const navItems = [['/project/', 'Resumen'], ['/project/plan/', 'Próximo incremento'], ['/project/work/', 'Entregables'], ['/project/attention/', 'Bloqueos y decisiones'], ['/project/questions/', 'Preguntas y reglas'], ['/project/rules/', 'Catálogo de reglas'], ['/project/team/', 'Equipo']];

function navigation(route) {
  return `<nav class="project-navigation" aria-label="Gestión del proyecto">${navItems.map(([href, label]) => `<a href="${href}"${route === href ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

function freshness(model) {
  return `<div class="project-freshness" aria-label="Fechas del seguimiento"><span><strong>${model.progress.measurement === 'verification' ? 'Avance técnico' : 'Aceptación del alcance'}</strong> ${time(model.progress.reviewedOn)}</span><details class="project-update" data-project-update><summary>Actualización y fuentes</summary><div><span><strong>Pendientes</strong> ${time(model.followUp.reviewedOn)}</span><span><strong>GitHub consultado</strong> ${observationTime(model.followUp.observedAt)}</span><a href="#project-sources">Ver fuentes</a></div></details></div>`;
}

function provenance(model, extraSources = '') {
  const { progress, followUp } = model;
  return `<details class="project-provenance" id="project-sources"><summary>Fuentes, alcance y cálculo</summary><div>${progress.measurement === 'acceptance' ? '<p>Este registro histórico de esquema 1 mide aceptación del alcance. No contiene verificaciones técnicas separadas.</p>' : ''}<p>Este es un corte revisado. Los cambios posteriores y la conversación están en la issue enlazada. Los enlaces a POS Platform requieren acceso al repositorio.</p><p>Avance = entregables ${progress.measurement === 'verification' ? 'verificados' : 'aceptados'} ÷ ${progress.total} entregables del alcance. Todos tienen el mismo peso y cada entregable cuenta una vez en el total. Una aplicación puede compartir entregables con otras: sus porcentajes no se suman ni se promedian.</p><p>El trabajo parcial no recibe un porcentaje estimado. ${progress.measurement === 'verification' ? 'El avance técnico, la aceptación humana y la habilitación operativa se registran por separado.' : 'La aceptación histórica no acredita verificación técnica separada ni habilitación operativa.'} Este porcentaje no mide esfuerzo ni preparación para producción.</p><ul><li><a href="${escape(progress.source.repository)}/blob/${progress.source.revision}/${progress.source.path}">Registro de avance · ${progress.source.revision.slice(0, 8)}</a></li><li><a href="${escape(followUp.source.repository)}/blob/${followUp.source.revision}/${followUp.source.path}">Registro de acciones · ${followUp.source.revision.slice(0, 8)}</a></li>${extraSources}<li><a href="/guide/implementation/progress/">Cómo se actualiza el seguimiento</a></li><li><a href="/guide/proposal/roadmap/">Alcance y criterios del roadmap</a></li></ul></div></details>`;
}

function warning(model) {
  return model.followUp.warnings.length ? `<aside class="project-alert"><h2>Diferencias de seguimiento</h2><ul>${model.followUp.warnings.map(item => `<li>${escape(item.message)}</li>`).join('')}</ul></aside>` : '';
}

function page(model, route, key, title, description, content, extraSources = '') {
  return { title, description, styles: ['/portal/project.css'], scripts: ['/portal/project.js'], body: `<div class="project-page" data-project-page="${key}">${heading(title, description)}${navigation(route)}${freshness(model)}${warning(model)}${content}${provenance(model, extraSources)}</div>` };
}

function appDetails(app, progress) {
  return `<details class="project-app-detail"><summary>Alcance y siguiente paso <span class="project-sr-only">de ${escape(applicationNames[app.id] || app.id)}</span></summary><div><p>${escape(app.summary)}</p><p><strong>Siguiente paso:</strong> ${escape(app.nextStep)}</p>${sources(app.evidence.map(item => ({ label: item.label, url: `${progress.source.repository}/blob/${progress.productRevision}/${item.path}` })))}</div></details>`;
}

function kpis(model) {
  const { progress, openActions } = model;
  const technical = progress.measurement === 'verification';
  const entries = [
    [queryHref('/project/work/', { status: technical ? 'verified' : 'accepted' }), `${number(progress.percent)} %`, technical ? 'Avance técnico verificado' : 'Aceptación del alcance', `${progress.completed} de ${progress.total} entregables`],
    [queryHref('/project/work/', { status: 'in_progress' }), progress.counts.in_progress, 'En desarrollo', technical ? 'Según la revisión técnica' : 'Según el registro histórico'],
    [queryHref('/project/attention/', { state: 'open' }), openActions.length, 'Acciones abiertas', `${model.unassignedActions.length} sin responsable de seguimiento`],
    [queryHref('/project/work/', { status: technical ? 'review' : 'accepted' }), technical ? progress.pendingAcceptance : progress.accepted, technical ? 'Esperan aceptación humana' : 'Aceptados por el equipo', technical ? `${progress.accepted} aceptados por el equipo` : 'Medición histórica de aceptación'],
  ];
  return `<div class="project-kpis" aria-label="Indicadores del proyecto">${entries.map(([href, value, label, detail]) => `<a class="project-kpi" href="${href}"><span>${label}</span><strong>${value}</strong><small>${detail}</small><span class="project-kpi-link">Ver detalle <span aria-hidden="true">↗</span></span></a>`).join('')}</div>`;
}

function breakdown(model) {
  const groups = [['phases', 'Por fase', model.progress.phases], ['apps', 'Por aplicación', model.progress.applications]];
  return `<section class="project-panel project-breakdown" aria-labelledby="breakdown-title"><div class="project-section-heading"><div><p class="eyebrow">${model.progress.measurement === 'verification' ? 'ALCANCE VERIFICADO' : 'ALCANCE ACEPTADO'}</p><h2 id="breakdown-title">Dónde estamos</h2></div><label class="project-breakdown-control" hidden data-breakdown-control>Ver por<select name="view" data-breakdown-select><option value="phases">Fase</option><option value="apps">Aplicación</option></select></label></div>${groups.map(([id, label, entries]) => `<div id="${id}" data-breakdown="${id}"><h3 class="project-breakdown-label">${label}</h3><ul class="project-breakdown-list">${entries.map(entry => `<li><a href="${queryHref('/project/work/', { [id === 'phases' ? 'phase' : 'app']: entry.id })}"><span>${id === 'phases' ? `<small>F${entry.id.slice(-2)}</small> ${escape(entry.title)}` : escape(applicationNames[entry.id] || entry.id)}</span><strong>${number(entry.percent)} %<span>${entry.completed} / ${entry.total}</span></strong></a><progress value="${entry.completed}" max="${entry.total}" aria-label="${escape(label)}: ${escape(entry.title || applicationNames[entry.id] || entry.id)} · ${number(entry.percent)} %">${number(entry.percent)} %</progress>${id === 'apps' ? appDetails(entry, model.progress) : ''}</li>`).join('')}</ul></div>`).join('')}<p class="project-note">Entregables con el mismo peso. <a href="#project-sources">Cómo se calcula</a>.</p></section>`;
}

function compactActions(model) {
  return `<section class="project-panel" aria-labelledby="priority-title"><div class="project-section-heading"><div><p class="eyebrow">SIGUIENTES ACCIONES</p><h2 id="priority-title">Para avanzar</h2></div><a href="/project/attention/">Ver las ${model.openActions.length} acciones</a></div><p class="project-note">Acciones abiertas del registro. El detalle distingue su impacto técnico, operativo o de revisión.</p><ul class="project-action-preview">${model.openActions.slice(0, 3).map(action => `<li><div class="project-inline-meta">${tag(impactScopes[action.impactScope])}<span>${profile(action.owner)}</span></div><h3><a href="${actionHref(action)}">${escape(action.summary)}</a></h3><p>${escape(action.nextAction)}</p></li>`).join('') || '<li>No hay acciones abiertas en este corte.</li>'}</ul></section>`;
}

function compactWork(works) {
  return `<div class="project-table-wrap"><table class="project-table"><caption class="project-sr-only">Trabajo con ejecución activa en GitHub</caption><thead><tr><th scope="col">Entregable</th><th scope="col">Ejecución en GitHub</th><th scope="col">Desarrollador</th><th scope="col">Issue</th></tr></thead><tbody>${works.map(work => `<tr><td data-label="Entregable"><a href="${workHref(work)}"><code>${work.id}</code> ${escape(work.title)}</a></td><td data-label="Ejecución">${tag(executionLabel(work.issue), work.issue.executionLabels.includes('status:blocked') ? 'warning' : '')}</td><td data-label="Desarrollador">${work.issue.assignees.length ? work.issue.assignees.map(profile).join(', ') : '<span class="project-unassigned">Sin asignar</span>'}</td><td data-label="Issue">${issueLink(work)}</td></tr>`).join('')}</tbody></table></div>`;
}

function changesLink(changelog) {
  if (!changelog) return '';
  return `<p class="project-increment-link"><a href="/guide/changelog/">Qué cambió · versión ${escape(changelog.version)}</a><span>${changelog.total} ${changelog.total === 1 ? 'cambio publicado' : 'cambios publicados'} el ${time(changelog.date)}</span></p>`;
}

function overview(model) {
  return `${kpis(model)}${model.planning ? `<p class="project-increment-link"><a href="/project/plan/">Próximo incremento · ${escape(model.planning.increment.title)}</a><span>${model.planning.items.length} trabajos con orden, condiciones y pruebas.</span></p>` : ''}${model.questions ? `<p class="project-increment-link"><a href="/project/questions/">Preguntas y reglas de negocio</a><span>${plural(model.questions.counts.open, 'abierta', 'abiertas')} · ${model.questions.counts.pendingValidation} por validar con el responsable de negocio.</span></p>` : ''}${changesLink(model.changelog)}<section class="project-state" aria-labelledby="state-title"><details class="project-state-context"><summary id="state-title">Contexto del avance</summary><div><p>${escape(model.progress.summary)}</p></div></details><a href="/project/work/?status=blocked">${model.progress.counts.blocked} entregable${model.progress.counts.blocked === 1 ? '' : 's'} bloqueado${model.progress.counts.blocked === 1 ? '' : 's'}</a><span aria-hidden="true"> · </span><a href="/project/work/?status=not_started">${model.progress.counts.not_started} pendientes</a></section><div class="project-overview-grid">${compactActions(model)}${breakdown(model)}</div><section class="project-panel" aria-labelledby="active-title"><div class="project-section-heading"><div><p class="eyebrow">EJECUCIÓN</p><h2 id="active-title">Trabajo activo</h2></div><a href="/project/work/?status=active">Ver ${model.active.length} entregables activos</a></div><p class="project-note">${model.activePreview.length} de ${model.active.length} issues con estado de ejecución activo; se muestran primero los bloqueados y en desarrollo.</p>${model.activePreview.length ? compactWork(model.activePreview) : '<p>No hay trabajo activo registrado en este corte.</p>'}</section>`;
}

function select(name, label, entries) {
  return `<label>${label}<select name="${name}"><option value="">Todos</option>${entries.map(([value, text]) => `<option value="${escape(value)}">${escape(text)}</option>`).join('')}</select></label>`;
}

function filters(type, model) {
  const technical = model.progress.measurement === 'verification';
  const stateOptions = Object.entries(technicalStatuses).filter(([status]) => technical || status !== 'verified');
  const reviewOptions = technical ? [['review', 'Verificados sin aceptación humana']] : [];
  const people = model.people.map(person => [person.github, person.name]);
  const controls = type === 'work'
    ? `${select('phase', 'Fase', model.progress.phases.map(phase => [phase.id, `F${phase.id.slice(-2)} · ${phase.title}`]))}${select('app', 'Aplicación', model.progress.applications.map(app => [app.id, applicationNames[app.id] || app.id]))}${select('status', 'Estado', [...stateOptions, ...reviewOptions, ['remaining', technical ? 'Sin verificación completa' : 'Sin aceptación registrada'], ['active', 'Ejecución activa en GitHub']])}${select('assignee', 'Desarrollador', [['unassigned', 'Sin asignar'], ...people])}`
    : type === 'questions'
      ? `${select('state', 'Estado', Object.entries(questionStates))}${select('phase', 'Fase', model.questions.phases.map(phase => [phase.id, `F${phase.id.slice(-2)} · ${phase.title}`]))}${select('decider', 'Quién decide', model.questions.deciders.map(decider => [decider, decider]))}`
      : type === 'rules'
        ? `${select('decision', 'Decisión', Object.entries(decisionStates))}${select('phase', 'Fase', model.rules.phases.map(phase => [phase.id, phase.id === withoutPhase ? phase.title : `F${phase.id.slice(-2)} · ${phase.title}`]))}${select('area', 'Área', Object.entries(model.rules.areas))}${select('legacy', 'Verificación del legacy', Object.entries(verificationStates))}${select('decider', 'Quién decide', model.rules.deciders.map(decider => [decider, decider]))}`
      : `${select('scope', 'Impacto', Object.entries(impactScopes))}${select('kind', 'Tipo', Object.entries(actionKinds))}${select('state', 'Estado', [['open', 'Abiertas'], ['resolved', 'Resueltas']])}${select('owner', 'Responsable de seguimiento', [['unassigned', 'Por asignar'], ...people])}`;
  const subject = { work: 'entregables', questions: 'preguntas', rules: 'reglas', attention: 'acciones' }[type];
  return `<form class="project-filters${['questions', 'rules'].includes(type) ? ' project-question-filters' : ''}" data-project-filters hidden role="search" aria-label="Filtrar ${subject}"><label class="project-search">Buscar<input name="query" type="search" placeholder="${type === 'questions' ? 'Código, tema o pregunta' : type === 'rules' ? 'Código, título o comportamiento' : 'Código, tema o responsable'}" autocomplete="off"></label>${controls}<button class="button secondary" type="reset">Limpiar filtros</button></form><noscript><p class="project-note">Todos los registros están disponibles a continuación. Usa los enlaces y despliega cada detalle para consultar su evidencia.</p></noscript><p class="project-result" data-project-count role="status" aria-live="polite"></p><div class="project-empty" data-project-empty hidden><h2>No hay resultados con esos filtros</h2><p>Prueba otra búsqueda o limpia los filtros.</p><button class="button secondary" type="button" data-project-reset>Limpiar filtros</button></div>`;
}

function reviewEvidence(work, repository, technical) {
  return (technical ? ['verification', 'acceptance'] : ['acceptance']).map(kind => {
    const review = work[kind];
    if (!review) return kind === 'acceptance' ? '<p>Aceptación humana: sin registrar.</p>' : '<p>Verificación técnica completa: sin registrar.</p>';
    return `<div><p><strong>${kind === 'verification' ? 'Verificación técnica' : 'Aceptación humana'}</strong> · ${time(review.reviewedOn)} · ${escape(review.reviewer)}</p>${sources(review.evidence.map(item => ({ label: item.label, url: `${repository}/blob/${review.revision}/${item.path}` })))}</div>`;
  }).join('');
}

function workRows(model) {
  const technical = model.progress.measurement === 'verification';
  const stateLabel = technical ? 'Estado técnico' : 'Estado del entregable';
  return `<div class="project-table-wrap"><table class="project-table project-work-table"><caption class="project-sr-only">Entregables, evidencia, ejecución y responsables</caption><thead><tr><th scope="col">Entregable</th><th scope="col">${stateLabel}</th><th scope="col">Ejecución y desarrollador</th><th scope="col">Acciones pendientes</th></tr></thead>${model.works.map(work => `<tbody id="work-${work.id.toLowerCase()}" data-project-item data-phase="${escape(work.phase)}" data-app="${escape(work.apps.join(' '))}" data-status="${work.status}" data-review="${work.status === 'verified' && !work.acceptance}" data-active="${isActiveWork(work)}" data-assignee="${escape(work.issue.assignees.join(' '))}"><tr><td data-label="Entregable"><code>${work.id}</code><h2>${escape(work.title)}</h2><span class="project-table-meta">${escape(work.phaseTitle)}</span></td><td data-label="${stateLabel}">${statusTag(work)}${work.status === 'verified' && !work.acceptance ? '<small class="project-table-meta">Aceptación humana pendiente</small>' : ''}</td><td data-label="Ejecución y desarrollador"><p>${issueLink(work)} · ${escape(executionLabel(work.issue))}</p><p>${work.issue.assignees.length ? work.issue.assignees.map(profile).join(', ') : '<span class="project-unassigned">Sin desarrollador asignado</span>'}</p></td><td data-label="Acciones pendientes">${work.attentionIds.length ? work.attentionIds.map(id => `<a href="/project/attention/#${id.toLowerCase()}">${id}</a>`).join('<br>') : '<span class="project-table-meta">Sin acción registrada</span>'}</td></tr><tr class="project-detail-row"><td colspan="4"><details><summary>Alcance y evidencia <span class="project-sr-only">de ${work.id}</span></summary><div class="project-work-detail"><p>${escape(work.summary)}</p><p><strong>Aplicaciones:</strong> ${work.apps.map(app => escape(applicationNames[app] || app)).join(' · ')}</p><p><a href="${escape(work.href)}">Criterios del roadmap</a> · <a href="${escape(work.issue.url)}">Conversación y asignación en GitHub</a> · Issue actualizada ${time(work.issue.updatedAt)}</p>${relatedPlan(model.planning, 'parentDelivery', work.id)}${reviewEvidence(work, model.progress.source.repository, technical)}</div></details></td></tr></tbody>`).join('')}</table></div>`;
}

function workPage(model) {
  return `<p class="project-page-note">${model.works.length} entregables · ${model.progress.measurement === 'verification' ? 'Verificación técnica' : 'Aceptación histórica'} y ejecución en GitHub se muestran por separado.</p><p class="project-page-note">Los entregables son obligatorios para completar su fase. El <a href="/project/plan/">orden del próximo incremento</a> organiza las unidades de trabajo que se ejecutan primero.</p>${filters('work', model)}${workRows(model)}`;
}

function attentionPage(model) {
  return `<div class="project-attention-summary"><p><strong>${model.openActions.length} abiertas</strong> · ${model.unassignedActions.length} por asignar · ${model.actions.length - model.openActions.length} resueltas</p><p>Una dependencia operativa puede requerir al cliente o a un proveedor sin detener todo el desarrollo.</p></div>${filters('attention', model)}<div class="project-action-list">${model.actions.map(action => `<article id="${action.id.toLowerCase()}" class="project-action" data-project-item data-scope="${action.impactScope}" data-kind="${action.kind}" data-state="${action.state}" data-owner="${escape(action.owner || '')}"><div class="project-action-main"><div class="project-inline-meta"><code>${action.id}</code>${tag(actionKinds[action.kind])}${tag(action.state === 'open' ? 'Abierta' : 'Resuelta', action.state === 'resolved' ? 'verified' : '')}</div><h2>${escape(action.summary)}</h2><p class="project-next-action"><strong>${action.state === 'open' ? 'Siguiente acción' : 'Acción registrada'}</strong>${escape(action.nextAction)}</p><details><summary>Impacto, condición de cierre y evidencia</summary><div><p>${escape(action.impact)}</p><p><strong>Se resuelve cuando:</strong> ${escape(action.closureCriteria)}</p>${relatedPlan(model.planning, 'followUps', action.id)}${sources(action.evidence)}${action.resolution ? `<p><strong>Resolución · ${time(action.resolution.resolvedOn)}</strong> ${escape(action.resolution.summary)}</p>${sources(action.resolution.evidence)}` : ''}</div></details></div><dl class="project-action-facts"><div><dt>Impacto</dt><dd>${impactScopes[action.impactScope]}</dd></div><div><dt>Responsable de seguimiento</dt><dd>${profile(action.owner)}</dd></div><div><dt>Información de</dt><dd>${escape(action.requestedFrom)}</dd></div><div><dt>Entregables</dt><dd>${action.workPackages.map(work => `<a href="${workHref(work)}">${work.id}</a>`).join(' · ')}</dd></div><div><dt>Revisado</dt><dd>${time(action.reviewedOn)}</dd></div></dl></article>`).join('')}</div>`;
}

function teamPage(model) {
  return `<section class="project-team-context"><h2>Quién impulsa cada trabajo</h2><p>La asignación de desarrollo procede de GitHub. El responsable de seguimiento coordina una acción con su contraparte. Un perfil sin trabajo asignado no indica disponibilidad ni capacidad.</p><div class="project-team-gaps"><a href="/project/work/?status=active&amp;assignee=unassigned"><strong>${model.unassignedActive.length}</strong> entregables activos sin desarrollador</a><a href="/project/attention/?state=open&amp;owner=unassigned"><strong>${model.unassignedActions.length}</strong> acciones abiertas por asignar</a>${model.planning ? `<a href="/project/plan/"><strong>${model.unassignedPlanned.length}</strong> trabajos próximos sin responsable</a>` : ''}</div></section><ul class="project-team-list" role="list">${model.people.map(person => `<li id="member-${escape(person.github.toLowerCase())}"><article><header class="project-person-header">${person.avatar ? `<img src="/portal/assets/team/${escape(person.avatar)}" width="64" height="64" alt="" loading="lazy" decoding="async">` : '<span class="project-person-placeholder" aria-hidden="true">GH</span>'}<div><h2>${escape(person.name)}</h2><p>${escape(person.role)}</p>${profile(person.github)}</div></header><div class="project-person-work">${person.coordinatesIncrement ? `<p>Coordina <a href="/project/plan/">${escape(model.planning.increment.id)}</a>; la coordinación no asigna las tareas a esta persona.</p>` : ''}<h3>Trabajo activo</h3>${person.active.length ? `<ul>${person.active.map(work => `<li><a href="${workHref(work)}"><code>${work.id}</code> ${escape(work.title)}</a><span>${escape(executionLabel(work.issue))}</span></li>`).join('')}</ul>` : '<p>Sin entregables activos asignados en este corte.</p>'}<a href="${queryHref('/project/work/', { assignee: person.github })}">Ver asignaciones en el corte</a>${model.planning ? `<h3>Trabajo del próximo incremento</h3>${person.planned.length ? `<ul>${person.planned.map(work => `<li><a href="${planHref(work)}"><code>TASK-${work.issue.number}</code> ${escape(work.title)}</a><span>${escape(executionLabel(work.issue))}</span></li>`).join('')}</ul>` : '<p>Sin unidades del próximo incremento asignadas.</p>'}` : ''}<h3>Acciones de seguimiento</h3>${person.actions.length ? `<ul>${person.actions.map(action => `<li><a href="${actionHref(action)}">${escape(action.summary)}</a></li>`).join('')}</ul>` : '<p>Sin acciones abiertas a su cargo en el registro.</p>'}</div></article></li>`).join('')}</ul><p class="project-note">Los perfiles y roles describen el equipo; no asignan automáticamente tareas ni autoridad de aprobación. <a href="/project/work/?assignee=unassigned">Ver todos los entregables sin asignar (${model.unassignedWork.length})</a>.</p>`;
}

const questionStateCounts = [['open', 'abierta', 'abiertas'], ['answered', 'respondida', 'respondidas'], ['decided', 'decidida', 'decididas'], ['validated', 'validada', 'validadas']];
const questionStateTone = { answered: 'verified', decided: 'verified', validated: 'verified' };

function questionOwner(login) {
  if (!login) return '<span class="project-unassigned">Por asignar</span>';
  const member = teamMembers.find(person => person.github.toLowerCase() === login.toLowerCase());
  return member ? `<a href="/project/team/#member-${escape(member.github.toLowerCase())}">${escape(member.name)}</a>` : profile(login);
}

function questionFollowUp(item) {
  if (!item.followUp) return '<span class="project-unassigned">Sin seguimiento</span>';
  if (item.followUpAction) return `<a href="/project/attention/#${item.followUp.toLowerCase()}">${item.followUp}</a> · ${escape(item.followUpAction.summary)}`;
  return `${item.followUp} <small>no publicado en el corte de seguimientos</small>`;
}

function questionCard(item, questions) {
  const { repository, revision } = questions.source;
  const references = [...new Set([...item.auditRefs, ...item.parityRefs])];
  const validation = item.validation
    ? `Validada por ${profile(item.validation.validatedBy)} el ${time(item.validation.validatedOn)}<small class="project-table-meta">${escape(item.validation.note)}</small>`
    : '<span class="project-unassigned">Pendiente de validación</span>';
  return `<article id="${item.id.toLowerCase()}" class="project-action project-question" data-project-item data-state="${item.state}" data-phases="${item.phases.join(' ')}" data-decider="${escape(item.decider)}"><div class="project-action-main"><div class="project-inline-meta"><code>${item.id}</code>${tag(questionKinds[item.kind])}${tag(questionStates[item.state], questionStateTone[item.state] || '')}${tag(item.priority)}</div><p class="project-question-topic">${escape(item.topic)}</p><h3>${escape(item.question)}</h3><div class="project-next-action"><strong>Respuesta actual</strong>${escape(item.currentAnswer)}</div><p class="project-note"><strong>Fuente de la respuesta:</strong> ${item.answerSources.map(source => escape(answerSourceNames[source])).join(' · ')}${references.length ? ` · Auditoría: <a class="project-question-refs" href="${escape(repository)}/tree/${revision}/${escape(questions.audit)}">${references.join(', ')}</a>` : ''}</p>${item.sources.length ? sources(item.sources.map(source => ({ label: source, url: `${repository}/blob/${revision}/${source}` }))) : ''}</div><dl class="project-action-facts"><div><dt>Quién decide</dt><dd>${escape(item.decider)}</dd></div><div><dt>Responsable de seguimiento</dt><dd>${questionOwner(item.owner)}</dd></div><div><dt>Seguimiento</dt><dd>${questionFollowUp(item)}</dd></div><div><dt>Entregables</dt><dd>${item.packages.map(work => `<a href="${workHref(work)}">${work.id}</a>`).join(' · ')}</dd></div><div><dt>Prioridad</dt><dd>${item.priority}</dd></div><div><dt>Validación de negocio</dt><dd>${validation}</dd></div><div><dt>Revisada</dt><dd>${time(item.reviewedOn)}</dd></div></dl></article>`;
}

function questionsSourceLink(questions) {
  return `<a href="${escape(questions.source.repository)}/blob/${questions.source.revision}/${questions.source.path}">Registro de preguntas · ${questions.source.revision.slice(0, 8)}</a>`;
}

function questionsPage(model) {
  const { questions } = model;
  if (!questions) return '<p>No hay un registro de preguntas publicado en este corte.</p>';
  const { counts } = questions;
  const integration = questions.integration.included
    ? 'Revisión integrada en <code>main</code>.'
    : 'Revisión previa a su integración en <code>main</code>.';
  const preview = questions.integration.included ? '' : `<aside class="project-alert project-question-preview"><h2>Corte previo a la integración</h2><p>La revisión ${questions.source.revision.slice(0, 8)} pertenece a una rama de POS Platform que todavía no está integrada en <code>main</code>. El registro puede cambiar durante su revisión; cuando se integre, se vuelve a importar desde <code>main</code>.</p></aside>`;
  const summary = `<section class="project-question-summary" aria-labelledby="questions-summary-title"><h2 id="questions-summary-title" class="project-sr-only">Resumen del registro</h2><ul class="project-question-counts">${questionStateCounts.map(([state, one, many]) => `<li><a href="/project/questions/?state=${state}"><strong>${counts[state]}</strong> ${counts[state] === 1 ? one : many}</a></li>`).join('')}</ul><p><strong>${counts.pendingValidation}</strong> por validar con el responsable de negocio · <strong>${counts.unassigned}</strong> sin responsable de seguimiento · ${plural(counts.total, 'registro', 'registros')}</p><ul class="project-question-phases" aria-label="Preguntas por fase">${questions.groups.map(group => `<li><a href="#questions-${group.id}">F${group.id.slice(-2)} · ${escape(group.title)}</a><span>${plural(group.items.length, 'pregunta', 'preguntas')}</span></li>`).join('')}</ul><div class="project-question-rules"><p>El comportamiento legacy citado describe lo observado; no es una regla aprobada. Sólo el responsable de negocio valida una regla o una respuesta: la validación registra su login y la fecha. Un agente, una prueba o esta publicación no validan en su nombre.</p><p><strong>Quién decide</strong> nombra el rol que debe decidir; el <strong>responsable de seguimiento</strong> es la persona que impulsa la pregunta. Cada pregunta aparece en la fase más temprana de sus entregables, ordenada por prioridad (P1 a P3) y código; el filtro de fase incluye también las que afectan a esa fase.</p></div></section>`;
  const groups = questions.groups.map(group => `<section id="questions-${group.id}" class="project-question-group" data-project-group aria-labelledby="questions-${group.id}-title"><h2 id="questions-${group.id}-title"><a href="${escape(group.href)}">F${group.id.slice(-2)} · ${escape(group.title)}</a></h2><p class="project-note">${plural(group.items.length, 'pregunta', 'preguntas')} cuya fase más temprana es F${group.id.slice(-2)}.</p><div class="project-action-list">${group.items.map(item => questionCard(item, questions)).join('')}</div></section>`).join('');
  return `<p class="project-page-note">Registro revisado ${time(questions.reviewedOn)} · ${questionsSourceLink(questions)} · ${integration}</p>${preview}${summary}${filters('questions', model)}<div class="project-question-list">${groups || '<p>No hay preguntas registradas en este corte.</p>'}</div>`;
}


const decisionTone = { resuelta: 'verified', abierta: 'warning' };
const verificationTone = { CONFIRMADO: 'verified', REFUTADO: 'warning', BLOQUEADO: 'warning' };
const phaseLabel = group => group.id === withoutPhase ? escape(group.title) : `F${group.id.slice(-2)} · ${escape(group.title)}`;

function ruleEvidence(state, refs, rules) {
  const files = refs.map(reference => {
    const [file, anchor] = reference.split('#');
    return `<a href="${escape(rules.source.repository)}/blob/${rules.source.revision}/${escape(file)}${anchor ? `#${escape(anchor)}` : ''}"><code>${escape(reference)}</code></a>`;
  });
  return `${escape(evidenceStates[state])}${files.length ? ` · ${files.join(' · ')}` : ''}`;
}

function ruleDecision(rule) {
  if (!rule.questions.length) return '<p class="project-note"><strong>Decisión:</strong> ninguna pregunta del registro cubre esta regla todavía.</p>';
  return `<p class="project-note"><strong>Se decide en:</strong> ${rule.questions.map(question => `<a href="/project/questions/#${question.id.toLowerCase()}">${question.id}</a>${question.state ? ` · ${escape(questionStates[question.state].toLowerCase())}` : ''}`).join(' · ')}</p>`;
}

function ruleArtifacts(rule) {
  const { catalog, closure, answers, management } = rule.artifacts;
  const rows = [
    catalog?.gap && ['Brecha según el catálogo', catalog.gap],
    catalog?.posPlatformNote && ['Lectura del catálogo sobre POS Platform', catalog.posPlatformNote],
    closure && ['Cierre propuesto', [closure.action, closure.priority, closure.scope].filter(Boolean).join(' · ')],
    closure?.acceptanceCriterion && ['Criterio propuesto', closure.acceptanceCriterion],
    answers?.plan && ['Plan propuesto', answers.plan],
    management?.proposal && [`Propuesta para gerencia${management.decider ? ` · ${management.decider}` : ''}`, management.proposal],
  ].filter(Boolean);
  return rows.length ? `<div><p class="project-note">Lo que dicen los documentos de trabajo. Son propuestas, no decisiones.</p><dl class="project-rule-facts">${rows.map(([term, value]) => `<div><dt>${escape(term)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl></div>` : '';
}

function ruleCard(rule, rules) {
  const evidence = rule.legacy.evidence.map(item => `<li><code>${escape(item.repository)}@${escape(rules.legacyRevisions[item.repository])}:${escape(item.path)}${item.lines ? `:${escape(item.lines)}` : ''}</code></li>`).join('');
  const related = rule.links.related.map(id => `<a href="#${id.toLowerCase()}">${id}</a>`).join(' · ');
  const others = [...rule.links.parity, ...rule.links.claims];
  return `<article id="${rule.id.toLowerCase()}" class="project-action project-rule" data-project-item data-decision="${rule.decision}" data-phase="${escape(rule.phase)}" data-area="${rule.area}" data-legacy="${escape(rule.legacy.verification)}" data-decider="${escape(rule.decider)}"><div class="project-action-main"><div class="project-inline-meta"><code>${rule.id}</code>${tag(rules.areas[rule.area])}${tag(decisionStates[rule.decision], decisionTone[rule.decision] || '')}${tag(`Legacy: ${verificationStates[rule.legacy.verification]}`, verificationTone[rule.legacy.verification] || '')}${tag(`Criticidad ${criticalities[rule.criticality].toLowerCase()}`)}${rule.kind === 'defecto' ? tag(ruleKinds.defecto, 'warning') : ''}${rule.origin === 'descubierta' ? tag('Descubierta en el legacy') : ''}</div><h3>${escape(rule.title)}</h3><div class="project-next-action"><strong>Comportamiento del legacy</strong>${escape(rule.legacy.behavior)}</div>${rule.businessQuestion ? `<p class="project-note"><strong>Pregunta para el negocio:</strong> ${escape(rule.businessQuestion)}</p>` : ''}${ruleDecision(rule)}<details><summary>Evidencia y estado en POS Platform <span class="project-sr-only">de ${rule.id}</span></summary><div>${rule.legacy.condition ? `<p><strong>Condición técnica:</strong> ${escape(rule.legacy.condition)}</p>` : ''}${rule.legacy.observations ? `<p><strong>Observaciones:</strong> ${escape(rule.legacy.observations)}</p>` : ''}${rule.legacy.note ? `<p><strong>Verificación:</strong> ${escape(rule.legacy.note)}</p>` : ''}${evidence ? `<ul class="project-evidence">${evidence}</ul>` : '<p>Sin referencia de código legacy verificable.</p>'}<dl class="project-rule-facts"><div><dt>Especificado</dt><dd>${ruleEvidence(rule.posPlatform.specified.state, rule.posPlatform.specified.refs, rules)}${rule.work ? ` · <a href="${escape(rule.work.href)}">ficha de ${rule.work.id}</a>` : ''}</dd></div><div><dt>Implementado</dt><dd>${ruleEvidence(rule.posPlatform.implemented.state, rule.posPlatform.implemented.refs, rules)}</dd></div><div><dt>Probado</dt><dd>${ruleEvidence(rule.posPlatform.tested.state, rule.posPlatform.tested.refs, rules)}</dd></div></dl>${rule.posPlatform.note ? `<p class="project-note">${escape(rule.posPlatform.note)}</p>` : ''}${ruleArtifacts(rule)}</div></details></div><dl class="project-action-facts"><div><dt>Quién decide</dt><dd>${escape(rule.decider)}</dd></div><div><dt>Entregable</dt><dd>${rule.work ? `<a href="${workHref(rule.work)}">${rule.work.id}</a>` : '<span class="project-unassigned">Sin fase</span>'}</dd></div>${related ? `<div><dt>Relacionadas</dt><dd>${related}</dd></div>` : ''}${others.length ? `<div><dt>Capacidad y auditoría</dt><dd><a href="${escape(rules.source.repository)}/tree/${rules.source.revision}/${escape(rules.audit)}">${others.join(', ')}</a></dd></div>` : ''}<div><dt>Tipo</dt><dd>${escape(ruleTypes[rule.type])} · ${escape(ruleLayers[rule.layer])}</dd></div><div><dt>Revisada</dt><dd>${time(rule.reviewedOn)}</dd></div></dl></article>`;
}

function rulesSourceLink(rules) {
  return `<a href="${escape(rules.source.repository)}/blob/${rules.source.revision}/${rules.source.path}">Registro de reglas · ${rules.source.revision.slice(0, 8)}</a>`;
}

function rulesPage(model) {
  const { rules } = model;
  if (!rules) return '<section class="project-question-rules"><p>Este corte todavía no publica el registro de reglas de negocio. El registro vive en <code>delivery/business-rules.json</code> de POS Platform y se importa desde una revisión identificada con <code>npm run rules:sync</code>.</p></section>';
  const { counts } = rules;
  const integration = rules.integration.included ? 'Revisión integrada en <code>main</code>.' : 'Revisión previa a su integración en <code>main</code>.';
  const preview = rules.integration.included ? '' : `<aside class="project-alert project-question-preview"><h2>Corte previo a la integración</h2><p>La revisión ${rules.source.revision.slice(0, 8)} pertenece a una rama de POS Platform que todavía no está integrada en <code>main</code>. El registro puede cambiar durante su revisión; cuando se integre, se vuelve a importar desde <code>main</code>.</p></aside>`;
  const decisionCounts = Object.entries(decisionStates).map(([state, label]) => `<li><a href="/project/rules/?decision=${state}"><strong>${counts.decisions[state]}</strong> ${escape(label.toLowerCase())}</a></li>`).join('');
  const legacy = Object.entries(counts.legacy).map(([state, value]) => `${value} ${escape(verificationStates[state].toLowerCase())}`).join(' · ');
  const contradictions = rules.contradictions.filter(item => item.state === 'open');
  const summary = `<section class="project-question-summary" aria-labelledby="rules-summary-title"><h2 id="rules-summary-title" class="project-sr-only">Resumen del registro</h2><ul class="project-question-counts">${decisionCounts}</ul><p>${plural(counts.total, 'regla', 'reglas')} · ${counts.withCapability} con su capacidad de la matriz de paridad · ${plural(counts.discovered, 'descubierta', 'descubiertas')} en el legacy fuera de los documentos de trabajo · Legacy: ${legacy}</p><ul class="project-question-phases" aria-label="Reglas por fase">${rules.groups.map(group => `<li><a href="#rules-${group.id}">${phaseLabel(group)}</a><span>${plural(group.items.length, 'regla', 'reglas')}</span></li>`).join('')}</ul><div class="project-question-rules"><p>Este catálogo complementa <a href="/project/questions/">Preguntas y reglas</a>: detalla cada regla del POS actual con su evidencia y su estado en POS Platform. La decisión no se toma aquí: cada regla enlaza las preguntas donde el negocio la decide, y su estado se toma de ellas. Una regla sin pregunta espera que alguien la plantee en ese registro.</p><p>El comportamiento del legacy describe lo observado en el código, no una regla aprobada: paridad significa conservar las capacidades necesarias, no copiar defectos. Especificado, implementado y probado son tres hechos distintos. Lo observado en una sucursal o en QA no se extiende a las demás, y la versión instalada en cada tienda no está verificada.</p></div></section>`;
  const contradictionList = contradictions.length ? `<section class="project-alert" aria-labelledby="rules-contradictions-title"><h2 id="rules-contradictions-title">Contradicciones abiertas entre fuentes</h2><ul>${contradictions.map(item => `<li><strong>${item.id}</strong> · ${item.rules.map(id => `<a href="#${id.toLowerCase()}">${id}</a>`).join(', ')}: ${escape(item.summary)}</li>`).join('')}</ul></section>` : '';
  const groups = rules.groups.map(group => `<section id="rules-${group.id}" class="project-question-group" data-project-group aria-labelledby="rules-${group.id}-title"><h2 id="rules-${group.id}-title">${group.href ? `<a href="${escape(group.href)}">${phaseLabel(group)}</a>` : phaseLabel(group)}</h2><p class="project-note">${plural(group.items.length, 'regla', 'reglas')}${group.id === withoutPhase ? ' cuya fase falta decidir' : ` de los entregables de F${group.id.slice(-2)}`}.</p><div class="project-action-list">${group.items.map(item => ruleCard(item, rules)).join('')}</div></section>`).join('');
  return `<p class="project-page-note">Registro revisado ${time(rules.reviewedOn)} · ${rulesSourceLink(rules)} · ${integration}</p>${preview}${summary}${contradictionList}${filters('rules', model)}<div class="project-question-list">${groups}</div>`;
}
export function renderProjectPages(progress, followUp, planning = null, changelog = null, questions = null, rules = null) {
  const model = {...deriveProject(progress, followUp, undefined, planning), planning, changelog, questions, rules};
  return new Map([
    ['/project/', page(model, '/project/', 'summary', 'Resumen del proyecto', 'Avance comprobado, trabajo activo y acciones para completar el siguiente paso.', overview(model))],
    ['/project/plan/', page(model, '/project/plan/', 'plan', 'Próximo incremento', 'Trabajo acotado, orden de ejecución y condiciones para empezar.', renderPlanning(planning))],
    ['/project/work/', page(model, '/project/work/', 'work', 'Entregables', 'Estado, responsables y evidencia de cada entregable.', workPage(model))],
    ['/project/attention/', page(model, '/project/attention/', 'attention', 'Bloqueos y decisiones', 'Accesos, preguntas y validaciones con una siguiente acción y una condición de cierre.', attentionPage(model))],
    ['/project/questions/', page(model, '/project/questions/', 'questions', 'Preguntas y reglas', 'Preguntas y reglas de negocio por fase: quién decide, respuesta actual, seguimiento y validación del responsable de negocio.', questionsPage(model), questions ? `<li>${questionsSourceLink(questions)}</li>` : '')],
    ['/project/rules/', page(model, '/project/rules/', 'rules', 'Catálogo de reglas', 'Reglas de negocio de la caja por fase y área: comportamiento del legacy, estado en POS Platform y preguntas donde se deciden.', rulesPage(model), rules ? `<li>${rulesSourceLink(rules)}</li>` : '')],
    ['/project/team/', page(model, '/project/team/', 'team', 'Equipo', 'Personas, trabajo activo y responsabilidades de seguimiento registradas.', teamPage(model))],
  ]);
}
