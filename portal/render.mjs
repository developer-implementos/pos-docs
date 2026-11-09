import {renderSitePage, escapeHtml as escape} from './site-shell.mjs';
import { teamMembers } from './team.mjs';
import {renderInline} from './changelog.mjs';

const percent = value => new Intl.NumberFormat('es-CL', {maximumFractionDigits:1}).format(value);
const date = value => new Intl.DateTimeFormat('es-CL', {dateStyle:'long', timeZone:'UTC'}).format(new Date(value));

const size = bytes => {
  const unit = bytes < 1024 ? 'B' : bytes < 1024 * 1024 ? 'KB' : 'MB';
  const divisor = unit === 'B' ? 1 : unit === 'KB' ? 1024 : 1024 * 1024;
  return new Intl.NumberFormat('es-CL', {maximumFractionDigits: 1}).format(bytes / divisor) + ' ' + unit;
};
const countryNames = {chile:'Chile',peru:'Perú',spain:'España',regional:'Multipaís'};
const kindNames = {historical:'Antecedente recibido',proposal:'Documento de propuesta',meeting:'Registro de reunión',questionnaire:'Cuestionario'};

function downloadItem(item, proposal = false) {
  return `<li class="material" ${proposal ? '' : `data-material data-format="${escape(item.format)}" data-country="${escape(item.country || '')}"`}>
    <span class="file-type" aria-hidden="true">${escape(item.format.toUpperCase())}</span>
    <div class="material-info"><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p><div class="metadata"><span>${kindNames[item.kind]}</span>${item.country ? `<span>${countryNames[item.country]}</span>` : ''}<span>${escape(item.format.toUpperCase())} · ${size(item.bytes)}</span>${item.date ? `<time datetime="${escape(item.date)}">${new Intl.DateTimeFormat('es-CL', {dateStyle:'long', timeZone:'UTC'}).format(new Date(item.date))}</time>` : '<span>Sin fecha registrada</span>'}</div></div>
    <div class="material-actions"><a class="button secondary" data-material-preview href="/materials/view/${escape(item.id)}/" aria-label="Visualizar ${escape(item.title)} (${escape(item.format.toUpperCase())})">Visualizar</a><a class="text-link download" ${proposal ? 'data-proposal-download' : ''} href="${escape(item.href)}" download aria-label="Descargar ${escape(item.title)} (${escape(item.format.toUpperCase())})">Descargar</a></div>
  </li>`;
}

/** The newest release from CHANGELOG.md, so the team sees what changed without opening the history. */
function changes(changelog, repository) {
  if (!changelog) return '';
  const more = changelog.total - changelog.entries.length;
  const items = changelog.entries.map(item => `<li><span class="change-kind">${escape(item.section)}</span><span>${renderInline(item.text)}${item.pr ? ` <a href="${escape(item.prUrl)}" aria-label="PR #${item.pr}">#${item.pr}</a>` : ''}</span></li>`).join('');
  return `<section id="changes" class="home-status home-changes" aria-labelledby="home-changes-title">
    <div class="home-status-heading"><h2 id="home-changes-title">Qué cambió</h2><p>Versión ${escape(changelog.version)} · <time datetime="${escape(changelog.date)}">${date(changelog.date)}</time></p></div>
    ${items ? `<ul class="home-change-list">${items}</ul>` : '<p>Esta versión no tiene entradas.</p>'}
    <div class="home-status-footer"><p>${more > 0 ? `Y ${more} ${more === 1 ? 'cambio más' : 'cambios más'} en esta versión. ` : ''}Para recibir cada versión, suscribirse a los <a href="${escape(repository)}/releases">releases en GitHub</a>.</p><a class="button secondary" href="/guide/changelog/">Ver historial completo</a></div>
  </section>`;
}

export function renderPortal(catalog, origin, repository, progress, followUp = null, changelog = null) {
  const open = followUp?.items.filter(item => item.state === 'open').length ?? 0;
  const technical = progress.measurement === 'verification';
  const body = `<div class="home-intro"><p class="eyebrow">IMPLEMENTOS · PRODUCTO CORPORATIVO</p><h1>POS Platform</h1><p class="lead">Un lugar para entender la plataforma, seguir su avance y consultar las fuentes del proyecto.</p></div>
  <section id="progress" class="home-status" aria-labelledby="home-status-title">
    <div class="home-status-heading"><h2 id="home-status-title">El proyecto, de un vistazo</h2><p>Avance revisado: <time datetime="${escape(progress.reviewedOn)}">${date(progress.reviewedOn)}</time></p></div>
    <div class="home-metrics"><a href="/project/work/?status=${technical ? 'verified' : 'accepted'}"><strong>${percent(progress.percent)} %</strong><span>${progress.completed}/${progress.total} entregables ${technical ? 'verificados' : 'aceptados'}</span></a><a href="/project/work/?status=in_progress"><strong>${progress.counts.in_progress}</strong><span>En desarrollo</span></a><a href="/project/attention/?state=open"><strong>${open}</strong><span>Acciones pendientes</span></a></div>
    <div class="home-status-footer"><p>El avance mide entregables; las revisiones humanas se consultan por separado.</p><a class="button primary" href="/project/">Ver proyecto</a></div>
  </section>
  ${changes(changelog, repository)}
  <section class="home-destinations" aria-label="Explorar POS Platform">
    <article class="destination"><span class="destination-number" aria-hidden="true">01</span><h2><a href="/guide/">Documentación</a></h2><p>Arquitectura, recorridos, contratos y datos para entender y desarrollar el sistema.</p><div class="destination-links"><a href="/guide/diagrams/">Diagramas</a><a href="/guide/proposal/roadmap/">Roadmap</a><a href="/guide/api/pos-platform/">APIs y datos</a></div></article>
    <article id="presentations" class="destination"><span class="destination-number" aria-hidden="true">02</span><h2><a href="/presentations/">Presentaciones</a></h2><p>Propuestas del equipo en Reveal.js, con referencias y lectura complementaria.</p><span class="destination-meta">${catalog.presentations.length} ${catalog.presentations.length === 1 ? 'presentación disponible' : 'presentaciones disponibles'}</span></article>
    <article id="materials" class="destination"><span class="destination-number" aria-hidden="true">03</span><h2><a href="/materials/">Fuentes de reuniones</a></h2><p>Cuestionarios, registros y antecedentes de Chile, Perú y España. Visualiza o descarga los originales.</p><span class="destination-meta">${catalog.materials.filter(item => item.kind !== 'proposal').length} fuentes catalogadas</span></article>
    <article id="team" class="destination"><span class="destination-number" aria-hidden="true">04</span><h2><a href="/project/team/">Equipo de trabajo</a></h2><p>Personas, responsabilidades y trabajo asignado en GitHub.</p><div class="home-team">${teamMembers.map(member => `<a href="https://github.com/${escape(member.github)}" aria-label="GitHub de ${escape(member.name)}: @${escape(member.github)}"><img src="/portal/assets/team/${escape(member.avatar)}" width="40" height="40" alt="${escape(member.name)}" loading="lazy" decoding="async"></a>`).join('')}</div></article>
  </section>`;
  return renderSitePage({title:'Inicio', description:'Documentación, seguimiento, propuestas y fuentes de POS Platform.', pathname:'/', body, origin, repository, scripts:['/portal/portal.js']});
}

export function renderCatalogPages(catalog, repository) {
  const decks = catalog.presentations.map(deck => `<article class="presentation">
    <div class="presentation-cover" aria-hidden="true"><span>POS PLATFORM</span><strong>${escape(deck.title)}</strong><span>PROPUESTA · REVEAL.JS</span></div>
    <div class="presentation-content"><p class="eyebrow">Presentación web · Reveal.js</p><h2>${escape(deck.title)}</h2><p>${escape(deck.description)}</p>
    <div class="actions"><a class="button secondary" href="${escape(deck.readingHref)}">Leer contenido</a><a class="button primary" href="${escape(deck.href)}">Abrir presentación</a></div></div>
  </article>`).join('');
  const sources = catalog.materials.filter(item => item.kind !== 'proposal');
  const proposalFiles = catalog.materials.filter(item => item.kind === 'proposal');
  const materials = sources.map(item => downloadItem(item)).join('');
  const formats = [...new Set(sources.map(item => item.format))].sort();
  const countries = [...new Set(sources.map(item => item.country).filter(Boolean))].sort((a,b) => countryNames[a].localeCompare(countryNames[b], 'es'));
  return new Map([
    ['/presentations/', {title:'Presentaciones', description:'Propuestas del equipo en Reveal.js y documentos de propuesta.', active:'presentations', body:`<section id="presentations" class="resource-section" aria-labelledby="presentations-title"><div class="section-heading"><div><h1 id="presentations-title">Presentaciones</h1><p>Diseño objetivo y plan de evolución elaborados por el equipo.</p></div></div>${decks || '<p>Todavía no hay presentaciones publicadas.</p>'}
${proposalFiles.length ? `<ul class="proposal-downloads" aria-label="Documentos de propuesta">${proposalFiles.map(item => downloadItem(item, true)).join('')}</ul>` : ''}
<p class="section-note">Las propuestas tienen su propio estado de revisión. Los acuerdos se registran en <a href="/guide/proposal/decisions/">Decisiones y validación</a>.</p></section>
`}],
    ['/materials/', {title:'Fuentes de reuniones', description:'Registros, cuestionarios y antecedentes de Chile, Perú y España.', active:'materials', scripts:['/portal/portal.js'], body:`<section id="materials" class="resource-section" aria-labelledby="materials-title"><div class="section-heading"><div><h1 id="materials-title">Fuentes de reuniones</h1><p>Registros, cuestionarios y antecedentes recibidos del equipo.</p></div></div>
<p class="materials-notice">Los originales conservan lo registrado o consultado en cada revisión. Un cuestionario no implica que todas sus preguntas estén respondidas ni que sus requisitos estén aprobados.</p>
<aside class="source-summary" aria-labelledby="summary-title"><div><p class="eyebrow">SÍNTESIS APORTADA</p><h2 id="summary-title">Síntesis comparativa por país</h2><p>El resumen de Chile, Perú y España, con la imagen original y una versión legible. Su contenido se distingue de las fuentes originales y de la propuesta de solución.</p></div><a class="text-link" href="/guide/evidence/country-comparison/">Leer resumen comparativo</a></aside>
<form class="filters" role="search" aria-label="Buscar fuentes de reuniones" data-filters hidden><div class="search-field"><label for="material-query">Buscar fuente</label><input id="material-query" type="search" placeholder="Título, tema o descripción" autocomplete="off"></div><div><label for="material-format">Formato</label><select id="material-format"><option value="">Todos los formatos</option>${formats.map(format => `<option value="${escape(format)}">${escape(format.toUpperCase())}</option>`).join('')}</select></div><div><label for="material-country">País</label><select id="material-country"><option value="">Todos los países</option>${countries.map(country => `<option value="${country}">${countryNames[country]}</option>`).join('')}</select></div><button type="reset" class="button secondary">Limpiar</button></form>
<p class="result-count" aria-live="polite" aria-atomic="true" data-count>${sources.length} fuentes</p><ul class="materials-list">${materials}</ul>
<div class="empty-state" data-empty hidden><h3>No hay fuentes con esos filtros</h3><p>Prueba otra búsqueda o limpia los filtros.</p></div>
<div class="contribute"><div><h3>¿Un nuevo documento del equipo?</h3><p>Identifica su país, contexto y fecha conocida, y clasifícalo como fuente original, síntesis o propuesta, independientemente de su formato.</p></div><a class="text-link" href="${escape(repository)}/blob/main/materials/README.md">Cómo añadir materiales</a></div></section>
<noscript><p>Se muestran todas las fuentes. Los filtros requieren JavaScript; las descargas y el acceso a los documentos siguen disponibles.</p></noscript>`}],
  ]);
}
