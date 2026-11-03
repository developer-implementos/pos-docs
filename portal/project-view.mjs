import { deriveProject, applicationNames, technicalStatuses, executionLabel, actionKinds, impactScopes, isActiveWork } from './project.mjs';

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
const tag = (label, tone = '') => `<span class="project-tag${tone ? ` project-tag-${tone}` : ''}">${escape(label)}</span>`;
const statusTag = work => tag(technicalStatuses[work.status], work.status === 'blocked' ? 'warning' : work.status === 'verified' || work.status === 'accepted' ? 'verified' : '');
const heading = (title, description) => `<div class="project-heading"><p class="eyebrow">POS PLATFORM · PROYECTO</p><h1>${title}</h1><p>${description}</p></div>`;
const navItems = [['/project/', 'Resumen'], ['/project/work/', 'Entregables'], ['/project/attention/', 'Bloqueos y decisiones'], ['/project/team/', 'Equipo']];

function navigation(route) {
  return `<nav class="project-navigation" aria-label="Gestión del proyecto">${navItems.map(([href, label]) => `<a href="${href}"${route === href ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}

function freshness(model) {
  return `<div class="project-freshness" aria-label="Fechas del seguimiento"><span><strong>${model.progress.measurement === 'verification' ? 'Avance técnico' : 'Aceptación del alcance'}</strong> ${time(model.progress.reviewedOn)}</span><details class="project-update" data-project-update><summary>Actualización y fuentes</summary><div><span><strong>Pendientes</strong> ${time(model.followUp.reviewedOn)}</span><span><strong>GitHub consultado</strong> ${observationTime(model.followUp.observedAt)}</span><a href="#project-sources">Ver fuentes</a></div></details></div>`;
}

function provenance(model) {
  const { progress, followUp } = model;
  return `<details class="project-provenance" id="project-sources"><summary>Fuentes, alcance y cálculo</summary><div>${progress.measurement === 'acceptance' ? '<p>Este registro histórico de esquema 1 mide aceptación del alcance. No contiene verificaciones técnicas separadas.</p>' : ''}<p>Este es un corte revisado. Los cambios posteriores y la conversación están en la issue enlazada. Los enlaces a POS Platform requieren acceso al repositorio.</p><p>Avance = entregables ${progress.measurement === 'verification' ? 'verificados' : 'aceptados'} ÷ ${progress.total} entregables del alcance. Todos tienen el mismo peso y cada entregable cuenta una vez en el total. Una aplicación puede compartir entregables con otras: sus porcentajes no se suman ni se promedian.</p><p>El trabajo parcial no recibe un porcentaje estimado. El avance técnico, la aceptación humana y la habilitación operativa se registran por separado. Este porcentaje no mide esfuerzo ni preparación para producción.</p><ul><li><a href="${escape(progress.source.repository)}/blob/${progress.source.revision}/${progress.source.path}">Registro de avance · ${progress.source.revision.slice(0, 8)}</a></li><li><a href="${escape(followUp.source.repository)}/blob/${followUp.source.revision}/${followUp.source.path}">Registro de acciones · ${followUp.source.revision.slice(0, 8)}</a></li><li><a href="/guide/implementation/progress/">Cómo se actualiza el seguimiento</a></li><li><a href="/guide/proposal/roadmap/">Alcance y criterios del roadmap</a></li></ul></div></details>`;
}

function warning(model) {
  return model.followUp.warnings.length ? `<aside class="project-alert"><h2>Diferencias de seguimiento</h2><ul>${model.followUp.warnings.map(item => `<li>${escape(item.message)}</li>`).join('')}</ul></aside>` : '';
}

function page(model, route, key, title, description, content) {
  return { title, description, styles: ['/portal/project.css'], scripts: ['/portal/project.js'], body: `<div class="project-page" data-project-page="${key}">${heading(title, description)}${navigation(route)}${freshness(model)}${warning(model)}${content}${provenance(model)}</div>` };
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

function overview(model) {
  return `${kpis(model)}<section class="project-state" aria-labelledby="state-title"><details class="project-state-context"><summary id="state-title">Contexto del avance</summary><div><p>${escape(model.progress.summary)}</p></div></details><a href="/project/work/?status=blocked">${model.progress.counts.blocked} entregable${model.progress.counts.blocked === 1 ? '' : 's'} bloqueado${model.progress.counts.blocked === 1 ? '' : 's'}</a><span aria-hidden="true"> · </span><a href="/project/work/?status=not_started">${model.progress.counts.not_started} pendientes</a></section><div class="project-overview-grid">${compactActions(model)}${breakdown(model)}</div><section class="project-panel" aria-labelledby="active-title"><div class="project-section-heading"><div><p class="eyebrow">EJECUCIÓN</p><h2 id="active-title">Trabajo activo</h2></div><a href="/project/work/?status=active">Ver ${model.active.length} entregables activos</a></div><p class="project-note">${model.activePreview.length} de ${model.active.length} issues con estado de ejecución activo; se muestran primero los bloqueados y en desarrollo.</p>${model.activePreview.length ? compactWork(model.activePreview) : '<p>No hay trabajo activo registrado en este corte.</p>'}</section>`;
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
    : `${select('scope', 'Impacto', Object.entries(impactScopes))}${select('kind', 'Tipo', Object.entries(actionKinds))}${select('state', 'Estado', [['open', 'Abiertas'], ['resolved', 'Resueltas']])}${select('owner', 'Responsable de seguimiento', [['unassigned', 'Por asignar'], ...people])}`;
  return `<form class="project-filters" data-project-filters hidden role="search" aria-label="Filtrar ${type === 'work' ? 'entregables' : 'acciones'}"><label class="project-search">Buscar<input name="query" type="search" placeholder="Código, tema o responsable" autocomplete="off"></label>${controls}<button class="button secondary" type="reset">Limpiar filtros</button></form><noscript><p class="project-note">Todos los registros están disponibles a continuación. Usa los enlaces y despliega cada detalle para consultar su evidencia.</p></noscript><p class="project-result" data-project-count role="status" aria-live="polite"></p><div class="project-empty" data-project-empty hidden><h2>No hay resultados con esos filtros</h2><p>Prueba otra búsqueda o limpia los filtros.</p><button class="button secondary" type="button" data-project-reset>Limpiar filtros</button></div>`;
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
  return `<div class="project-table-wrap"><table class="project-table project-work-table"><caption class="project-sr-only">Entregables, evidencia, ejecución y responsables</caption><thead><tr><th scope="col">Entregable</th><th scope="col">${stateLabel}</th><th scope="col">Ejecución y desarrollador</th><th scope="col">Acciones pendientes</th></tr></thead>${model.works.map(work => `<tbody id="work-${work.id.toLowerCase()}" data-project-item data-phase="${escape(work.phase)}" data-app="${escape(work.apps.join(' '))}" data-status="${work.status}" data-review="${work.status === 'verified' && !work.acceptance}" data-active="${isActiveWork(work)}" data-assignee="${escape(work.issue.assignees.join(' '))}"><tr><td data-label="Entregable"><code>${work.id}</code><h2>${escape(work.title)}</h2><span class="project-table-meta">${escape(work.phaseTitle)}</span></td><td data-label="${stateLabel}">${statusTag(work)}${work.status === 'verified' && !work.acceptance ? '<small class="project-table-meta">Aceptación humana pendiente</small>' : ''}</td><td data-label="Ejecución y desarrollador"><p>${issueLink(work)} · ${escape(executionLabel(work.issue))}</p><p>${work.issue.assignees.length ? work.issue.assignees.map(profile).join(', ') : '<span class="project-unassigned">Sin desarrollador asignado</span>'}</p></td><td data-label="Acciones pendientes">${work.attentionIds.length ? work.attentionIds.map(id => `<a href="/project/attention/#${id.toLowerCase()}">${id}</a>`).join('<br>') : '<span class="project-table-meta">Sin acción registrada</span>'}</td></tr><tr class="project-detail-row"><td colspan="4"><details><summary>Alcance y evidencia <span class="project-sr-only">de ${work.id}</span></summary><div class="project-work-detail"><p>${escape(work.summary)}</p><p><strong>Aplicaciones:</strong> ${work.apps.map(app => escape(applicationNames[app] || app)).join(' · ')}</p><p><a href="${escape(work.href)}">Criterios del roadmap</a> · <a href="${escape(work.issue.url)}">Conversación y asignación en GitHub</a> · Issue actualizada ${time(work.issue.updatedAt)}</p>${reviewEvidence(work, model.progress.source.repository, technical)}</div></details></td></tr></tbody>`).join('')}</table></div>`;
}

function workPage(model) {
  return `<p class="project-page-note">${model.works.length} entregables · ${model.progress.measurement === 'verification' ? 'Verificación técnica' : 'Aceptación histórica'} y ejecución en GitHub se muestran por separado.</p>${filters('work', model)}${workRows(model)}`;
}

function attentionPage(model) {
  return `<div class="project-attention-summary"><p><strong>${model.openActions.length} abiertas</strong> · ${model.unassignedActions.length} por asignar · ${model.actions.length - model.openActions.length} resueltas</p><p>Una dependencia operativa puede requerir al cliente o a un proveedor sin detener todo el desarrollo.</p></div>${filters('attention', model)}<div class="project-action-list">${model.actions.map(action => `<article id="${action.id.toLowerCase()}" class="project-action" data-project-item data-scope="${action.impactScope}" data-kind="${action.kind}" data-state="${action.state}" data-owner="${escape(action.owner || '')}"><div class="project-action-main"><div class="project-inline-meta"><code>${action.id}</code>${tag(actionKinds[action.kind])}${tag(action.state === 'open' ? 'Abierta' : 'Resuelta', action.state === 'resolved' ? 'verified' : '')}</div><h2>${escape(action.summary)}</h2><p class="project-next-action"><strong>${action.state === 'open' ? 'Siguiente acción' : 'Acción registrada'}</strong>${escape(action.nextAction)}</p><details><summary>Impacto, condición de cierre y evidencia</summary><div><p>${escape(action.impact)}</p><p><strong>Se resuelve cuando:</strong> ${escape(action.closureCriteria)}</p>${sources(action.evidence)}${action.resolution ? `<p><strong>Resolución · ${time(action.resolution.resolvedOn)}</strong> ${escape(action.resolution.summary)}</p>${sources(action.resolution.evidence)}` : ''}</div></details></div><dl class="project-action-facts"><div><dt>Impacto</dt><dd>${impactScopes[action.impactScope]}</dd></div><div><dt>Responsable de seguimiento</dt><dd>${profile(action.owner)}</dd></div><div><dt>Información de</dt><dd>${escape(action.requestedFrom)}</dd></div><div><dt>Entregables</dt><dd>${action.workPackages.map(work => `<a href="${workHref(work)}">${work.id}</a>`).join(' · ')}</dd></div><div><dt>Revisado</dt><dd>${time(action.reviewedOn)}</dd></div></dl></article>`).join('')}</div>`;
}

function teamPage(model) {
  return `<section class="project-team-context"><h2>Quién impulsa cada trabajo</h2><p>La asignación de desarrollo procede de GitHub. El responsable de seguimiento coordina una acción con su contraparte. Un perfil sin trabajo asignado no indica disponibilidad ni capacidad.</p><div class="project-team-gaps"><a href="/project/work/?status=active&amp;assignee=unassigned"><strong>${model.unassignedActive.length}</strong> entregables activos sin desarrollador</a><a href="/project/attention/?state=open&amp;owner=unassigned"><strong>${model.unassignedActions.length}</strong> acciones abiertas por asignar</a></div></section><ul class="project-team-list" role="list">${model.people.map(person => `<li id="member-${escape(person.github.toLowerCase())}"><article><header class="project-person-header">${person.avatar ? `<img src="/portal/assets/team/${escape(person.avatar)}" width="64" height="64" alt="" loading="lazy" decoding="async">` : '<span class="project-person-placeholder" aria-hidden="true">GH</span>'}<div><h2>${escape(person.name)}</h2><p>${escape(person.role)}</p>${profile(person.github)}</div></header><div class="project-person-work"><h3>Trabajo activo</h3>${person.active.length ? `<ul>${person.active.map(work => `<li><a href="${workHref(work)}"><code>${work.id}</code> ${escape(work.title)}</a><span>${escape(executionLabel(work.issue))}</span></li>`).join('')}</ul>` : '<p>Sin entregables activos asignados en este corte.</p>'}<a href="${queryHref('/project/work/', { assignee: person.github })}">Ver asignaciones en el corte</a><h3>Acciones de seguimiento</h3>${person.actions.length ? `<ul>${person.actions.map(action => `<li><a href="${actionHref(action)}">${escape(action.summary)}</a></li>`).join('')}</ul>` : '<p>Sin acciones abiertas a su cargo en el registro.</p>'}</div></article></li>`).join('')}</ul><p class="project-note">Los perfiles y roles describen el equipo; no asignan automáticamente tareas ni autoridad de aprobación. <a href="/project/work/?assignee=unassigned">Ver todos los entregables sin asignar (${model.unassignedWork.length})</a>.</p>`;
}

export function renderProjectPages(progress, followUp) {
  const model = deriveProject(progress, followUp);
  return new Map([
    ['/project/', page(model, '/project/', 'summary', 'Resumen del proyecto', 'Avance comprobado, trabajo activo y acciones para completar el siguiente paso.', overview(model))],
    ['/project/work/', page(model, '/project/work/', 'work', 'Entregables', 'Estado, responsables y evidencia de cada entregable.', workPage(model))],
    ['/project/attention/', page(model, '/project/attention/', 'attention', 'Bloqueos y decisiones', 'Accesos, preguntas y validaciones con una siguiente acción y una condición de cierre.', attentionPage(model))],
    ['/project/team/', page(model, '/project/team/', 'team', 'Equipo', 'Personas, trabajo activo y responsabilidades de seguimiento registradas.', teamPage(model))],
  ]);
}
