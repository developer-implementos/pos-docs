import assert from 'node:assert/strict';

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const countries = { chile: 'Chile', peru: 'Perú', spain: 'España', regional: 'Multipaís' };
const kinds = { historical: 'Antecedente recibido', proposal: 'Documento de propuesta', meeting: 'Registro de reunión', questionnaire: 'Cuestionario' };
const icon = paths => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const backIcon = icon('<path d="m12 5-7 7 7 7M5 12h14"/>');
const infoIcon = icon('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>');
const downloadIcon = icon('<path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5"/>');
const closeIcon = icon('<path d="m6 6 12 12M6 18 18 6"/>');

/** Build a same-origin reading surface for an approved material and its PDF preview. */
export function renderMaterialViewer(item, preview, origin) {
  assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'The viewer requires a catalog material id');
  assert.match(preview.href, /^\/materials\/previews\/[a-z0-9]+(?:-[a-z0-9]+)*\.pdf$/, 'The preview must be a local catalog PDF');
  assert.ok(Number.isSafeInteger(preview.pages) && preview.pages > 0, 'The preview must have a positive page count');
  assert.ok(typeof item.href === 'string' && item.href.startsWith('/') && !item.href.startsWith('//') && !/[\\\u0000-\u001f]/u.test(item.href), 'The original must have a local path');
  const canonical = new URL(`/materials/view/${item.id}/`, origin);
  assert.ok(canonical.protocol === 'https:' || canonical.protocol === 'http:', 'The viewer requires a website origin');
  const group = item.kind === 'proposal' ? 'presentations' : 'materials';
  const groupLabel = item.kind === 'proposal' ? 'propuestas' : 'fuentes';
  const format = escape(item.format.toUpperCase());
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(item.title)} · POS Platform</title><meta name="description" content="${escape(item.description)}"><link rel="canonical" href="${escape(canonical.href)}">
<link rel="icon" href="/portal/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/portal/portal.css"><link rel="stylesheet" href="/portal/pdfjs/web/pdf_viewer.css"><link rel="stylesheet" href="/portal/viewer.css"><script type="module" src="/portal/viewer.js"></script></head>
<body class="material-viewer-page"><a class="skip-link" href="#pdf-viewport">Saltar al documento</a>
<header class="viewer-header"><a class="viewer-back viewer-header-action" href="/#${group}" aria-label="Volver a ${groupLabel}" title="Volver a ${groupLabel}">${backIcon}</a><a class="viewer-brand" href="/" aria-label="POS Platform, inicio"><img src="/portal/assets/logo.svg" width="94" height="32" alt="Implementos"></a><h1 id="document-title" title="${escape(item.title)}">${escape(item.title)}</h1><button id="document-info-open" class="viewer-header-action" type="button" popovertarget="document-info" aria-label="Información del documento" title="Información del documento">${infoIcon}</button><a id="original-download" class="viewer-download viewer-header-action" href="${escape(item.href)}" download aria-label="Descargar ${format}" title="Descargar ${format}">${downloadIcon}<span>Descargar ${format}</span></a></header>
<div id="document-info" popover="auto" aria-labelledby="document-info-title"><div class="viewer-info-heading"><h2 id="document-info-title">${escape(item.title)}</h2><button id="document-info-close" class="viewer-header-action" type="button" popovertarget="document-info" popovertargetaction="hide" aria-label="Cerrar información" title="Cerrar información">${closeIcon}</button></div><p>${escape(item.description)}</p><p>${escape(kinds[item.kind] || 'Material de referencia')}${item.country ? ` · ${escape(countries[item.country] || item.country)}` : ''} · Original ${format}. Vista de lectura en PDF.</p><a id="preview-download" href="${escape(preview.href)}" download>Descargar versión PDF</a></div>
<main id="material-viewer" data-pdf-url="${escape(preview.href)}" data-pages="${preview.pages}" aria-labelledby="document-title">
<div class="viewer-toolbar" aria-label="Controles del documento">
<div class="viewer-control-group" role="group" aria-label="Páginas"><button id="pdf-previous" class="viewer-icon-button" type="button" aria-label="Página anterior" title="Página anterior" disabled>←</button><label for="pdf-page">Página</label><input id="pdf-page" type="number" min="1" max="${preview.pages}" step="1" value="1" inputmode="numeric" aria-describedby="pdf-page-count" disabled><span id="pdf-page-count">de <span id="pdf-total">${preview.pages}</span></span><button id="pdf-next" class="viewer-icon-button" type="button" aria-label="Página siguiente" title="Página siguiente" disabled>→</button></div>
<div class="viewer-control-group viewer-zoom-group" role="group" aria-label="Zoom"><button id="pdf-zoom-out" class="viewer-icon-button" type="button" aria-label="Reducir zoom" title="Reducir zoom" disabled>−</button><output id="pdf-zoom" aria-label="Zoom actual">—</output><button id="pdf-zoom-in" class="viewer-icon-button" type="button" aria-label="Aumentar zoom" title="Aumentar zoom" disabled>+</button><button id="pdf-fit" type="button" aria-pressed="true" disabled>Ajustar ancho</button></div>
</div>
<div class="viewer-reading-area"><div id="pdf-error" role="alert" hidden><h2>No se pudo mostrar el documento</h2><p id="pdf-error-message">Vuelve a intentarlo. El original sigue disponible arriba.</p><button id="pdf-retry" class="button primary" type="button">Reintentar</button></div>
<div id="pdf-viewport" tabindex="0" role="region" aria-label="Documento. Usa las flechas para desplazarte dentro de la página." aria-busy="true"><div id="pdf-page-container" class="pdfViewer"></div></div></div>
<p id="pdf-status" class="viewer-status" role="status" aria-live="polite" aria-atomic="true">Cargando documento…</p>
<noscript><p class="viewer-noscript">Este visor necesita JavaScript. Puedes <a href="${escape(preview.href)}">abrir la versión PDF</a> o descargar el documento original.</p></noscript>
</main></body></html>`;
}
