import {renderPlanning, relatedPlan, planHref} from './planning-view.mjs';
import { deriveProject, applicationNames, technicalStatuses, executionLabel, actionKinds, impactScopes, isActiveWork } from './project.mjs';
import { answerSourceNames, decisionOutcomes, questionKinds, questionPriorities, questionStates, recommendationBases, recommendationScopes, recommendationStatuses } from './questions.mjs';
import { criticalities, decisionStates, disclosureNames, evidenceStates, ruleKinds, ruleOrigins, ruleTypes, verificationStates, withoutPhase } from './rules.mjs';
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
  return `${kpis(model)}${model.planning ? `<p class="project-increment-link"><a href="/project/plan/">Próximo incremento · ${escape(model.planning.increment.title)}</a><span>${model.planning.items.length} trabajos con orden, condiciones y pruebas.</span></p>` : ''}${model.questions ? `<p class="project-increment-link"><a href="/project/questions/">Preguntas y reglas de negocio</a><span>${plural(model.questions.counts.open, 'abierta', 'abiertas')} · ${plural(model.questions.counts.pendingDecision, 'pendiente', 'pendientes')} de decisión.</span></p>` : ''}${changesLink(model.changelog)}<section class="project-state" aria-labelledby="state-title"><details class="project-state-context"><summary id="state-title">Contexto del avance</summary><div><p>${escape(model.progress.summary)}</p></div></details><a href="/project/work/?status=blocked">${model.progress.counts.blocked} entregable${model.progress.counts.blocked === 1 ? '' : 's'} bloqueado${model.progress.counts.blocked === 1 ? '' : 's'}</a><span aria-hidden="true"> · </span><a href="/project/work/?status=not_started">${model.progress.counts.not_started} pendientes</a></section><div class="project-overview-grid">${compactActions(model)}${breakdown(model)}</div><section class="project-panel" aria-labelledby="active-title"><div class="project-section-heading"><div><p class="eyebrow">EJECUCIÓN</p><h2 id="active-title">Trabajo activo</h2></div><a href="/project/work/?status=active">Ver ${model.active.length} entregables activos</a></div><p class="project-note">${model.activePreview.length} de ${model.active.length} issues con estado de ejecución activo; se muestran primero los bloqueados y en desarrollo.</p>${model.activePreview.length ? compactWork(model.activePreview) : '<p>No hay trabajo activo registrado en este corte.</p>'}</section>`;
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
      ? `${select('state', 'Estado', Object.entries(questionStates))}${select('phase', 'Fase', model.questions.phases.map(phase => [phase.id, `F${phase.id.slice(-2)} · ${phase.title}`]))}${select('decider', 'Quién decide', model.questions.deciders.map(role => [role.key, role.name]))}${select('priority', 'Prioridad', questionPriorities.map(priority => [priority, priority]))}${select('recommendation', 'Recomendación', Object.entries(recommendationStatuses))}${select('scope', 'Ámbito', Object.entries(recommendationScopes))}`
      : type === 'rules'
        ? `${select('decision', 'Decisión', Object.entries(decisionStates))}${select('phase', 'Fase', model.rules.phases.map(phase => [phase.id, phase.id === withoutPhase ? phase.title : `F${phase.id.slice(-2)} · ${phase.title}`]))}${select('area', 'Área', Object.entries(model.rules.areas))}${select('disclosure', 'Publicación', Object.entries(disclosureNames))}`
      : `${select('scope', 'Impacto', Object.entries(impactScopes))}${select('kind', 'Tipo', Object.entries(actionKinds))}${select('state', 'Estado', [['open', 'Abiertas'], ['resolved', 'Resueltas']])}${select('owner', 'Responsable de seguimiento', [['unassigned', 'Por asignar'], ...people])}`;
  const subject = { work: 'entregables', questions: 'preguntas', rules: 'reglas', attention: 'acciones' }[type];
  return `<form class="project-filters${['questions', 'rules'].includes(type) ? ' project-question-filters' : ''}" data-project-filters hidden role="search" aria-label="Filtrar ${subject}"><label class="project-search">Buscar<input name="query" type="search" placeholder="${type === 'questions' ? 'Código, tema o pregunta' : type === 'rules' ? 'Código o título' : 'Código, tema o responsable'}" autocomplete="off"></label>${controls}<button class="button secondary" type="reset">Limpiar filtros</button></form><noscript><p class="project-note">Todos los registros están disponibles a continuación. Usa los enlaces y despliega cada detalle para consultar su evidencia.</p></noscript><p class="project-result" data-project-count role="status" aria-live="polite"></p><div class="project-empty" data-project-empty hidden><h2>No hay resultados con esos filtros</h2><p>Prueba otra búsqueda o limpia los filtros.</p><button class="button secondary" type="button" data-project-reset>Limpiar filtros</button></div>`;
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

const questionStateCounts = [['open', 'abierta', 'abiertas'], ['answered', 'respondida', 'respondidas'], ['decided', 'decidida', 'decididas']];
const questionStateTone = { answered: 'verified', decided: 'verified' };
const outcomeCounts = [['adopted', 'adopta', 'adoptan'], ['adapted', 'ajusta', 'ajustan'], ['rejected', 'descarta', 'descartan']];

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

/** Where the rule is decided: the same in every country or configurable at one level. */
const recommendationScope = scope => scope === 'core' ? 'Núcleo común: igual en todos los países' : `Configurable ${recommendationScopes[scope].toLowerCase()}`;

/**
 * The final decision of the business: the decided rule, who decided and when, the decision document
 * and what it does with the agent's recommendation. Only a decided rule has one.
 */
function questionDecision(decision) {
  if (!decision) return '';
  return `<div class="project-question-decision"><div class="project-inline-meta"><strong>Decisión</strong>${decision.outcome ? tag(decisionOutcomes[decision.outcome]) : ''}</div><p>${escape(decision.answer)}</p><p class="project-note">${escape(decision.decidedBy)} · ${time(decision.decidedOn)} · <strong>Fuente:</strong> ${escape(decision.source)}</p></div>`;
}

/** The agent's recommendation for a rule: it guides the decision and nobody approves it. A fact has none. */
function questionRecommendation(item, questions) {
  if (item.recommendationStatus === 'not_applicable') return '';
  const { recommendation } = item;
  if (!recommendation) return '<div class="project-question-recommendation project-question-recommendation-empty"><strong>Recomendación del agente (IA)</strong><p>Sin recomendación todavía.</p></div>';
  const { repository, revision } = questions.source;
  const links = [...recommendation.references, ...recommendation.sources.map(source => ({ label: source, url: `${repository}/blob/${revision}/${source}` }))];
  return `<div class="project-question-recommendation"><strong>Recomendación del agente (IA)</strong><p>${escape(recommendation.answer)}</p><p class="project-note"><strong>Ámbito:</strong> ${escape(recommendationScope(recommendation.scope))}</p>${recommendation.default === null ? '' : `<p class="project-note"><strong>Valor por defecto:</strong> ${escape(recommendation.default)}</p>`}<p class="project-note"><strong>Por qué:</strong> ${escape(recommendation.rationale)}</p><p class="project-note"><strong>Fundamento:</strong> ${recommendation.basis.map(basis => escape(recommendationBases[basis])).join(' · ')}${recommendation.basis.includes('regulation') ? '. Sujeta a la confirmación del responsable fiscal o legal de cada país.' : ''}</p>${links.length ? sources(links) : ''}<p class="project-note">Generada por ${escape(recommendation.agent)} · ${time(recommendation.proposedOn)}</p></div>`;
}

/**
 * Who decided a rule and when, or that its decision is pending. A fact is answered with evidence and
 * has no decision.
 */
function decisionFact(item) {
  if (item.decision) return `<div><dt>Decisión</dt><dd>${escape(item.decision.decidedBy)} · ${time(item.decision.decidedOn)}</dd></div>`;
  return item.kind === 'rule' && item.state === 'open' ? '<div><dt>Decisión</dt><dd><span class="project-unassigned">Pendiente</span></dd></div>' : '';
}

function questionCard(item, questions) {
  const { repository, revision } = questions.source;
  const references = [...new Set([...item.auditRefs, ...item.parityRefs])];
  return `<article id="${item.id.toLowerCase()}" class="project-action project-question" data-project-item data-state="${item.state}" data-phases="${item.phases.join(' ')}" data-decider="${escape(item.decider)}" data-priority="${item.priority}" data-recommendation="${item.recommendationStatus}" data-scope="${item.recommendation ? item.recommendation.scope : ''}"><div class="project-action-main"><div class="project-inline-meta"><code>${item.id}</code>${tag(questionKinds[item.kind])}${tag(questionStates[item.state], questionStateTone[item.state] || '')}${tag(item.priority)}</div><p class="project-question-topic">${escape(item.topic)}</p><h3>${escape(item.question)}</h3>${questionDecision(item.decision)}<div class="project-next-action"><strong>Respuesta actual</strong>${escape(item.currentAnswer)}</div><p class="project-note"><strong>Fuente de la respuesta:</strong> ${item.answerSources.map(source => escape(answerSourceNames[source])).join(' · ')}${references.length ? ` · Auditoría: <a class="project-question-refs" href="${escape(repository)}/tree/${revision}/${escape(questions.audit)}">${references.join(', ')}</a>` : ''}</p>${item.sources.length ? sources(item.sources.map(source => ({ label: source, url: `${repository}/blob/${revision}/${source}` }))) : ''}${questionRecommendation(item, questions)}</div><dl class="project-action-facts"><div><dt>Quién decide</dt><dd>${escape(item.deciderName)}</dd></div>${item.consultedNames.length ? `<div><dt>Se consulta a</dt><dd>${item.consultedNames.map(escape).join(' · ')}</dd></div>` : ''}<div><dt>Responsable de seguimiento</dt><dd>${questionOwner(item.owner)}</dd></div><div><dt>Seguimiento</dt><dd>${questionFollowUp(item)}</dd></div><div><dt>Entregables</dt><dd>${item.packages.map(work => `<a href="${workHref(work)}">${work.id}</a>`).join(' · ')}</dd></div><div><dt>Prioridad</dt><dd>${item.priority}</dd></div>${decisionFact(item)}<div><dt>Revisada</dt><dd>${time(item.reviewedOn)}</dd></div></dl></article>`;
}

/**
 * The questions merged into another keep their code, their text and why they were merged, so a link to
 * them still leads somewhere: each one points to the question where it is decided. They are not
 * records of the register and the filters ignore them.
 */
function mergedQuestions(questions) {
  if (!questions.merged.length) return '';
  return `<section id="questions-merged" class="project-question-merged" aria-labelledby="questions-merged-title"><h2 id="questions-merged-title">Preguntas unidas a otra</h2><p class="project-note">Repetían otra pregunta o formaban parte de ella. Conservan su código y su texto, y se deciden en la pregunta que las reúne.</p><div class="project-action-list">${questions.merged.map(entry => `<article id="${entry.id.toLowerCase()}" class="project-action project-question-merged-item"><div class="project-action-main"><div class="project-inline-meta"><code>${entry.id}</code>${tag('Unida')}</div><h3>${escape(entry.question)}</h3><p><strong>Se decide en</strong> <a href="#${entry.into.toLowerCase()}">${entry.into}</a>: ${escape(entry.intoQuestion)}</p><p class="project-note"><strong>Motivo:</strong> ${escape(entry.reason)} · ${time(entry.mergedOn)}</p></div></article>`).join('')}</div></section>`;
}

/**
 * What each role has to answer, so that each one gets the list of its own questions. Every count opens
 * the filtered list with the same criteria, so the figure and the list it opens cannot disagree.
 */
function questionAgenda(questions) {
  if (!questions.agenda.length) return '';
  const href = (role, priority) => queryHref('/project/questions/', { decider: role.key, state: 'open', ...(priority ? { priority } : {}) });
  const count = (role, priority, value) => value
    ? `<a href="${href(role, priority)}">${value}<span class="project-sr-only"> ${value === 1 ? 'abierta' : 'abiertas'}${priority ? ` ${priority}` : ''} de ${escape(role.name)}</span></a>`
    : '<span aria-label="ninguna">0</span>';
  const rows = questions.agenda.map(role => `<tr><th scope="row"><a href="${href(role)}">${escape(role.name)}</a><span class="project-agenda-responsibility">${escape(role.responsibility)}</span></th><td data-label="Abiertas">${count(role, null, role.open)}</td>${questionPriorities.map(priority => `<td data-label="${priority}">${count(role, priority, role.priorities[priority])}</td>`).join('')}</tr>`).join('');
  return `<section id="questions-agenda" class="project-question-agenda" aria-labelledby="questions-agenda-title"><h2 id="questions-agenda-title">Preguntas abiertas por rol</h2><p class="project-note">Cada pregunta la decide un rol del catálogo, que consulta a los roles que ella indica. Primero los roles con más preguntas P1; cada cifra abre su lista.</p><div class="project-table-wrap"><table class="project-table project-agenda-table"><caption class="project-sr-only">Preguntas abiertas de cada rol que decide, por prioridad</caption><thead><tr><th scope="col">Quién decide</th><th scope="col">Abiertas</th>${questionPriorities.map(priority => `<th scope="col">${priority}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
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
  // What the decisions did with the agent's recommendations, once some decision had one to consider.
  const outcomes = outcomeCounts.some(([outcome]) => counts[outcome] > 0)
    ? `<p class="project-question-outcomes">Decisiones con recomendación: ${outcomeCounts.map(([outcome, one, many]) => `<strong>${counts[outcome]}</strong> la ${counts[outcome] === 1 ? one : many}`).join(' · ')}</p>`
    : '';
  const summary = `<section class="project-question-summary" aria-labelledby="questions-summary-title"><h2 id="questions-summary-title" class="project-sr-only">Resumen del registro</h2><ul class="project-question-counts">${questionStateCounts.map(([state, one, many]) => `<li><a href="/project/questions/?state=${state}"><strong>${counts[state]}</strong> ${counts[state] === 1 ? one : many}</a></li>`).join('')}</ul><p><strong>${counts.pendingDecision}</strong> ${counts.pendingDecision === 1 ? 'pendiente' : 'pendientes'} de decisión · <strong>${counts.unassigned}</strong> sin responsable de seguimiento · ${plural(counts.total, 'registro', 'registros')}${counts.merged ? ` · <a href="#questions-merged">${plural(counts.merged, 'pregunta unida', 'preguntas unidas')}</a> a otra` : ''}</p><p class="project-question-recommendations">Recomendaciones del agente: <a href="/project/questions/?recommendation=present"><strong>${counts.recommended}</strong> con recomendación</a> · <a href="/project/questions/?recommendation=none"><strong>${counts.unrecommended}</strong> sin recomendación</a></p>${outcomes}<ul class="project-question-phases" aria-label="Preguntas por fase">${questions.groups.map(group => `<li><a href="#questions-${group.id}">F${group.id.slice(-2)} · ${escape(group.title)}</a><span>${plural(group.items.length, 'pregunta', 'preguntas')}</span></li>`).join('')}</ul><div class="project-question-rules"><p>El comportamiento legacy citado en la respuesta actual describe lo observado; no es una regla decidida.</p><p>La recomendación del agente (IA) propone una regla para un POS corporativo multipaís e indica su ámbito: el núcleo común, igual en todos los países, o una configuración por país, sociedad, sucursal o caja. Orienta la decisión y nadie la aprueba.</p><p>La decisión final la toma el rol de <strong>Quién decide</strong>, después de oír a los roles de <strong>Se consulta a</strong> cuando los hay. Se registra a partir del documento de decisiones de negocio, citado por nombre y fecha, e indica si adopta, ajusta o descarta la recomendación.</p><p>El <strong>responsable de seguimiento</strong> es la persona que impulsa la pregunta. Cada pregunta aparece en la fase más temprana de sus entregables, ordenada por prioridad (P1 a P3) y código; el filtro de fase incluye también las que afectan a esa fase.</p></div></section>`;
  const groups = questions.groups.map(group => `<section id="questions-${group.id}" class="project-question-group" data-project-group aria-labelledby="questions-${group.id}-title"><h2 id="questions-${group.id}-title"><a href="${escape(group.href)}">F${group.id.slice(-2)} · ${escape(group.title)}</a></h2><p class="project-note">${plural(group.items.length, 'pregunta', 'preguntas')} cuya fase más temprana es F${group.id.slice(-2)}.</p><div class="project-action-list">${group.items.map(item => questionCard(item, questions)).join('')}</div></section>`).join('');
  return `<p class="project-page-note">Registro revisado ${time(questions.reviewedOn)} · ${questionsSourceLink(questions)} · ${integration}</p>${preview}${summary}${questionAgenda(questions)}${filters('questions', model)}<div class="project-question-list">${groups || '<p>No hay preguntas registradas en este corte.</p>'}</div>${mergedQuestions(questions)}`;
}

const decisionTone = { resuelta: 'verified', abierta: 'warning' };
const ruleDecisionCounts = [['abierta', 'con pregunta abierta', 'con pregunta abierta'], ['resuelta', 'resuelta', 'resueltas'], ['sin-pregunta', 'sin pregunta', 'sin pregunta']];
const verificationTone = { CONFIRMADO: 'verified', REFUTADO: 'warning', BLOQUEADO: 'warning' };
const rulePhaseLabel = group => group.id === withoutPhase ? escape(group.title) : `F${group.id.slice(-2)} · ${escape(group.title)}`;

function rulesSourceLink(rules) {
  return `<a href="${escape(rules.source.repository)}/blob/${rules.source.revision}/${rules.source.path}">Registro de reglas · ${rules.source.revision.slice(0, 8)}</a>`;
}

/** Where the business decides the rule; the questions are published in full in their own view. */
function ruleDecision(rule) {
  if (!rule.linkedQuestions.length) return '<p class="project-note"><strong>Decisión:</strong> ninguna pregunta del registro la cubre todavía.</p>';
  return `<p class="project-note"><strong>Se decide en:</strong> ${rule.linkedQuestions.map(question => `<a href="/project/questions/#${question.id.toLowerCase()}">${question.id}</a> · ${escape(questionStates[question.state].toLowerCase())}${question.kind === 'fact' ? ' (hecho)' : ''}`).join(' · ')}</p>`;
}

function ruleWork(rule) {
  return rule.work ? `<a href="${workHref(rule.work)}">${rule.work.id}</a>` : '<span class="project-unassigned">Sin fase</span>';
}

function ruleCard(rule, rules) {
  const data = `data-project-item data-decision="${rule.decision}" data-phase="${escape(rule.phase)}" data-area="${rule.area}" data-disclosure="${rule.disclosure}"`;
  const meta = `<code>${rule.id}</code>${tag(rules.areas[rule.area])}${tag(decisionStates[rule.decision], decisionTone[rule.decision] || '')}`;
  if (rule.disclosure === 'internal') {
    return `<article id="${rule.id.toLowerCase()}" class="project-action project-rule project-rule-internal" ${data}><div class="project-action-main"><div class="project-inline-meta">${meta}${tag(disclosureNames.internal)}</div><p class="project-note">Regla interna: su título y su evidencia se consultan en el ${rulesSourceLink(rules)} de POS Platform, con acceso al producto.</p>${ruleDecision(rule)}</div><dl class="project-action-facts"><div><dt>Entregable</dt><dd>${ruleWork(rule)}</dd></div></dl></article>`;
  }
  const pos = [['specified', 'Especificado'], ['implemented', 'Implementado'], ['tested', 'Probado']]
    .map(([key, label]) => `<div><dt>${label}</dt><dd>${escape(evidenceStates[rule.posPlatform[key]])}</dd></div>`).join('');
  const followUps = rule.followUps.map(id => `<a href="/project/attention/#${id.toLowerCase()}">${id}</a>`).join(' · ');
  return `<article id="${rule.id.toLowerCase()}" class="project-action project-rule" ${data}><div class="project-action-main"><div class="project-inline-meta">${meta}${tag(`Legacy: ${verificationStates[rule.legacyVerification]}`, verificationTone[rule.legacyVerification] || '')}${tag(`Criticidad ${criticalities[rule.criticality].toLowerCase()}`)}${rule.kind === 'parametro' ? tag(ruleKinds.parametro) : ''}${rule.origin === 'descubierta' ? tag(ruleOrigins.descubierta) : ''}</div><h3>${escape(rule.title)}</h3>${ruleDecision(rule)}<p class="project-note"><strong>POS Platform</strong>, contrastado en ${escape(rules.posPlatformRevision.slice(0, 8))}:</p><dl class="project-rule-facts">${pos}</dl></div><dl class="project-action-facts"><div><dt>Entregable</dt><dd>${ruleWork(rule)}</dd></div>${rule.parity.length ? `<div><dt>Capacidad</dt><dd>${rule.parity.join(', ')}</dd></div>` : ''}${followUps ? `<div><dt>Seguimiento</dt><dd>${followUps}</dd></div>` : ''}<div><dt>Tipo</dt><dd>${escape(ruleTypes[rule.type])}</dd></div></dl></article>`;
}

function rulesPage(model) {
  const { rules } = model;
  if (!rules) return '<section class="project-question-rules"><p>Este corte todavía no publica el registro de reglas de negocio. El registro vive en <code>delivery/business-rules.json</code> de POS Platform y se importa desde una revisión identificada con <code>npm run rules:sync</code>.</p></section>';
  const { counts } = rules;
  const integration = rules.integration.included ? 'Revisión integrada en <code>main</code>.' : 'Revisión previa a su integración en <code>main</code>.';
  const preview = rules.integration.included ? '' : `<aside class="project-alert project-question-preview"><h2>Corte previo a la integración</h2><p>La revisión ${rules.source.revision.slice(0, 8)} pertenece a una rama de POS Platform que todavía no está integrada en <code>main</code>. El registro puede cambiar durante su revisión; cuando se integre, se vuelve a importar desde <code>main</code>.</p></aside>`;
  const decisionCounts = ruleDecisionCounts.map(([state, one, many]) => `<li><a href="/project/rules/?decision=${state}"><strong>${counts.decisions[state]}</strong> ${counts.decisions[state] === 1 ? one : many}</a></li>`).join('');
  const legacy = Object.entries(counts.legacy).map(([state, value]) => `${escape(verificationStates[state].toLowerCase())} ${value}`).join(' · ');
  const summary = `<section class="project-question-summary" aria-labelledby="rules-summary-title"><h2 id="rules-summary-title" class="project-sr-only">Resumen del registro</h2><ul class="project-question-counts">${decisionCounts}</ul><p>${plural(counts.total, 'regla', 'reglas')} · <a href="/project/rules/?disclosure=public">${counts.disclosure.public} públicas</a> · <a href="/project/rules/?disclosure=internal">${counts.disclosure.internal} internas</a> · De las públicas: ${counts.withCapability} con su capacidad de la matriz de paridad, ${plural(counts.discovered, 'descubierta', 'descubiertas')} en el legacy fuera de los documentos de trabajo · Legacy: ${legacy}</p><ul class="project-question-phases" aria-label="Reglas por fase">${rules.groups.map(group => `<li><a href="#rules-${group.id}">${rulePhaseLabel(group)}</a><span>${plural(group.items.length, 'regla', 'reglas')}</span></li>`).join('')}</ul><div class="project-question-rules"><p>Este catálogo complementa <a href="/project/questions/">Preguntas y reglas</a>. La decisión no se toma aquí: cada regla enlaza las preguntas donde el negocio la decide, y su estado se toma de ellas. Una pregunta de hecho aporta contexto, pero no decide la regla.</p><p>POS Docs es público y publica un índice del registro. El comportamiento del legacy, su evidencia en el código, las notas y las propuestas de los documentos de trabajo se consultan en el ${rulesSourceLink(rules)}, con acceso a POS Platform. Las reglas de seguridad, los defectos del legacy y las que revelan un control débil son internas: aquí sólo figuran su código, su entregable y su decisión.</p><p>Especificado, implementado y probado indican si POS Platform se comporta como el legacy en la revisión contrastada: parcial y no señalan una diferencia, y no verificado que nadie lo contrastó. Paridad significa conservar las capacidades necesarias, no copiar defectos.</p></div></section>`;
  const groups = rules.groups.map(group => `<section id="rules-${group.id}" class="project-question-group" data-project-group aria-labelledby="rules-${group.id}-title"><h2 id="rules-${group.id}-title">${group.href ? `<a href="${escape(group.href)}">${rulePhaseLabel(group)}</a>` : rulePhaseLabel(group)}</h2><p class="project-note">${plural(group.items.length, 'regla', 'reglas')}${group.id === withoutPhase ? ' cuya fase falta decidir' : ` de los entregables de F${group.id.slice(-2)}`}.</p><div class="project-action-list">${group.items.map(item => ruleCard(item, rules)).join('')}</div></section>`).join('');
  return `<p class="project-page-note">Registro revisado ${time(rules.reviewedOn)} · ${rulesSourceLink(rules)} · ${integration}</p>${preview}${summary}${filters('rules', model)}<div class="project-question-list">${groups}</div>`;
}

export function renderProjectPages(progress, followUp, planning = null, changelog = null, questions = null, rules = null) {
  const model = {...deriveProject(progress, followUp, undefined, planning), planning, changelog, questions, rules};
  return new Map([
    ['/project/', page(model, '/project/', 'summary', 'Resumen del proyecto', 'Avance comprobado, trabajo activo y acciones para completar el siguiente paso.', overview(model))],
    ['/project/plan/', page(model, '/project/plan/', 'plan', 'Próximo incremento', 'Trabajo acotado, orden de ejecución y condiciones para empezar.', renderPlanning(planning))],
    ['/project/work/', page(model, '/project/work/', 'work', 'Entregables', 'Estado, responsables y evidencia de cada entregable.', workPage(model))],
    ['/project/attention/', page(model, '/project/attention/', 'attention', 'Bloqueos y decisiones', 'Accesos, preguntas y validaciones con una siguiente acción y una condición de cierre.', attentionPage(model))],
    ['/project/questions/', page(model, '/project/questions/', 'questions', 'Preguntas y reglas', 'Preguntas y reglas de negocio por fase: quién decide, respuesta actual, recomendación del agente, seguimiento y decisión final.', questionsPage(model), questions ? `<li>${questionsSourceLink(questions)}</li>` : '')],
    ['/project/rules/', page(model, '/project/rules/', 'rules', 'Catálogo de reglas', 'Índice de las reglas de negocio de la caja por fase y área: decisión, verificación del legacy y estado en POS Platform.', rulesPage(model), rules ? `<li>${rulesSourceLink(rules)}</li>` : '')],
    ['/project/team/', page(model, '/project/team/', 'team', 'Equipo', 'Personas, trabajo activo y responsabilidades de seguimiento registradas.', teamPage(model))],
  ]);
}
