const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const size = bytes => new Intl.NumberFormat('es-CL', {maximumFractionDigits: 1}).format(bytes / (1024 * 1024)) + ' MB';

export function renderPortal(catalog, origin, repository) {
  const decks = catalog.presentations.map(deck => `<article class="presentation">
    <div class="presentation-cover" aria-hidden="true"><span>POS PLATFORM</span><strong>${escape(deck.title)}</strong><span>PROPUESTA · REVEAL.JS</span></div>
    <div class="presentation-content"><p class="eyebrow">Presentación web · Reveal.js</p><h3>${escape(deck.title)}</h3><p>${escape(deck.description)}</p>
    <div class="actions"><a class="button primary" href="${escape(deck.href)}">Abrir presentación</a><a class="text-link" href="${escape(deck.readingHref)}">Leer contenido</a></div></div>
  </article>`).join('');
  const materials = catalog.materials.map(item => `<li class="material" data-material data-format="${escape(item.format)}">
    <span class="file-type" aria-hidden="true">${escape(item.format.toUpperCase())}</span>
    <div class="material-info"><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p><div class="metadata"><span>${{historical:'Antecedente histórico',proposal:'Propuesta',meeting:'Material de reunión'}[item.kind]}</span><span>${escape(item.format.toUpperCase())} · ${size(item.bytes)}</span>${item.date ? `<time datetime="${escape(item.date)}">${new Intl.DateTimeFormat('es-CL', {dateStyle:'long', timeZone:'UTC'}).format(new Date(item.date))}</time>` : '<span>Sin fecha registrada</span>'}</div></div>
    <a class="text-link download" href="${escape(item.href)}" download aria-label="Descargar ${escape(item.title)} (${escape(item.format.toUpperCase())})">Descargar</a>
  </li>`).join('');
  const formats = [...new Set(catalog.materials.map(item => item.format))].sort();
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>POS Platform · Documentación y presentaciones</title><meta name="description" content="Documentación técnica, presentaciones Reveal.js y materiales de referencia de POS Platform, en el repositorio de Implementos.">
<link rel="canonical" href="${escape(origin)}/"><meta property="og:title" content="POS Platform · Documentación y presentaciones"><meta property="og:description" content="Arquitectura, decisiones y materiales de trabajo de POS Platform."><meta property="og:url" content="${escape(origin)}/"><meta property="og:type" content="website">
<link rel="icon" href="/portal/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/portal/portal.css"><script type="module" src="/portal/portal.js"></script></head>
<body><a class="skip-link" href="#main">Saltar al contenido</a>
<header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="POS Platform, inicio"><img src="/portal/assets/logo.svg" width="148" height="50" alt="Implementos"><span>POS Platform</span></a>
<nav aria-label="Navegación principal"><a href="/guide/">Documentación</a><a href="#presentations">Presentaciones</a><a href="#materials">Materiales</a></nav></div></header>
<main id="main" tabindex="-1">
<div class="intro"><p class="eyebrow">IMPLEMENTOS · POS PLATFORM</p><h1>Documentación y recursos</h1><p class="lead">La arquitectura del producto, las presentaciones del equipo y los documentos que dan contexto a nuestras decisiones.</p></div>
<section class="resource-section" aria-labelledby="documentation-title"><div class="section-heading"><span class="section-number" aria-hidden="true">01</span><div><h2 id="documentation-title">Documentación técnica</h2><p>La referencia para entender y desarrollar la plataforma.</p></div></div>
<div class="documentation"><div class="documentation-intro"><p class="eyebrow">GUÍA STARLIGHT</p><h3>De la propuesta<br>a la implementación.</h3><p>Arquitectura, límites del monorepo, decisiones y evidencia del sistema actual, organizados por tema.</p><a class="button light" href="/guide/">Explorar documentación</a></div>
<ul class="guide-paths"><li><a href="/guide/overview/">Visión general</a><p>Alcance corporativo y responsabilidades de cada pieza.</p></li><li><a href="/guide/diagrams/">Arquitectura y diagramas C4</a><p>Contexto, contenedores y flujos de la propuesta.</p></li><li><a href="/guide/implementation/monorepo/">Estructura e implementación</a><p>Aplicaciones, bibliotecas y estado del código.</p></li><li><a href="/guide/api/mountain/">Referencia del sistema actual</a><p>Endpoints y responsabilidades del legacy Mountain.</p></li></ul></div></section>
<section id="presentations" class="resource-section" aria-labelledby="presentations-title"><div class="section-heading"><span class="section-number" aria-hidden="true">02</span><div><h2 id="presentations-title">Presentaciones</h2><p>Propuestas para recorrer con el equipo, con acceso a sus fuentes.</p></div></div>${decks || '<p>Todavía no hay presentaciones publicadas.</p>'}</section>
<section id="materials" class="resource-section" aria-labelledby="materials-title"><div class="section-heading"><span class="section-number" aria-hidden="true">03</span><div><h2 id="materials-title">Materiales y fuentes</h2><p>Originales de trabajo y antecedentes para consultar o descargar.</p></div></div>
<p class="materials-notice">Los originales conservan el contexto de su revisión. Para el diseño vigente, consulta la documentación técnica.</p>
<form class="filters" role="search" aria-label="Buscar materiales" data-filters hidden><div class="search-field"><label for="material-query">Buscar material</label><input id="material-query" type="search" placeholder="Título, tema o descripción" autocomplete="off"></div><div><label for="material-format">Formato</label><select id="material-format"><option value="">Todos los formatos</option>${formats.map(format => `<option value="${escape(format)}">${escape(format.toUpperCase())}</option>`).join('')}</select></div><button type="reset" class="button secondary">Limpiar</button></form>
<p class="result-count" aria-live="polite" aria-atomic="true" data-count>${catalog.materials.length} materiales</p><ul class="materials-list">${materials}</ul>
<div class="empty-state" data-empty hidden><h3>No hay materiales con esos filtros</h3><p>Prueba otra búsqueda o limpia los filtros.</p></div>
<div class="contribute"><div><h3>¿Un nuevo documento del equipo?</h3><p>Los PPTX, DOCX y PDF se incorporan al repositorio con su título, contexto y fecha, cuando se conoce.</p></div><a class="text-link" href="${escape(repository)}/blob/main/materials/README.md">Cómo añadir materiales</a></div></section>
</main><footer><div class="footer-inner"><p><strong>POS Platform</strong><span>Documentación de Implementos</span></p><a class="text-link" href="${escape(repository)}">Repositorio pos-docs</a></div></footer></body></html>`;
}
