import { createHash } from 'node:crypto';

const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');

/** Package upstream HTML without changing upstream sources or relaxing the portal CSP. */
export function packageDiagram(html, entry, details) {
  const assets = new Map();
  const asset = (content, extension) => {
    const name = `${createHash('sha256').update(content).digest('hex').slice(0, 24)}.${extension}`;
    assets.set(name, content);
    return `/explore/assets/${name}`;
  };
  if (!html.includes('content="archify 3.2.0"')) throw new Error('Unexpected Archify renderer version');
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (original, attributes, content) => {
    if (/\btype\s*=\s*["']application\/(?:ld\+)?json["']/i.test(attributes)) return original;
    if (/\bsrc\s*=/i.test(attributes)) throw new Error('Upstream unexpectedly introduced a script dependency');
    return `<script${attributes} src="${asset(content, 'js')}"></script>`;
  });
  // SVG styles must stay in the SVG namespace. The native export also reads the
  // embedded licensed font sheet by ID; retaining it preserves portable exports.
  html = html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, head => head.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi, (original, attributes, content) => /id=["']archify-fonts["']/.test(attributes) ? original : `<link rel="stylesheet"${attributes} href="${asset(content, 'css')}">`));
  if (/\son[a-z]+\s*=/i.test(html) || /(?:src|href)\s*=\s*["']javascript:/i.test(html)) throw new Error('Executable inline attributes are not allowed');
  if (/<(?:script|link|img)\b[^>]*(?:src|href)\s*=\s*["']https?:/i.test(html)) throw new Error('Remote runtime resources are not allowed');
  const evidenceLabel = entry.evidenceKind === 'source-inspection' ? 'Predicados inspeccionados' : entry.evidenceKind === 'migration-export' ? 'Esquema de migraciones' : 'Arquitectura objetivo';
  const evidenceNote = entry.evidenceKind === 'source-inspection' ? 'Proyección acotada del código; no acredita pruebas ejecutadas ni homologación.' : entry.evidenceKind === 'migration-export' ? 'Derivado de migraciones aplicadas; no acredita despliegue productivo.' : 'Diseño propuesto; consultar implementación y evidencia por separado.';
  const navigation = `<nav class="pos-docs-context" aria-label="Documentación del diagrama"><a href="/guide/diagrams/">Diagramas del POS</a><span>${evidenceLabel}</span><a href="${escape(entry.source)}">Fuente y alcance</a><button type="button" data-pos-details-open aria-controls="pos-diagram-details" aria-expanded="false">Detalles</button></nav>`;
  const panel = `<aside id="pos-diagram-details" class="pos-diagram-details" aria-labelledby="pos-detail-title" hidden><div class="pos-detail-heading"><h2 id="pos-detail-title">${escape(entry.title)}</h2><button type="button" data-pos-details-close aria-label="Cerrar detalles">×</button></div><p data-pos-detail-description>${escape(entry.description)}</p><p data-pos-detail-technology></p><p data-pos-detail-status>${evidenceNote}</p><a data-pos-detail-link href="${escape(entry.source)}">Consultar contrato y fuentes</a><ul data-pos-detail-links></ul><div data-pos-detail-schema></div></aside>`;
  const noscript = `<noscript><p class="pos-docs-fallback">El diagrama conserva su lectura estática. <a href="${escape(entry.source)}">Consultar explicación y contratos</a>.</p></noscript>`;
  html = html.replace('</head>', '<link rel="stylesheet" href="/explore/assets/pos-docs.css"></head>')
    .replace('<body>', `<body>${navigation}${panel}${noscript}`)
    .replace('</body>', `<script type="application/json" id="pos-docs-details">${json(details)}</script><script src="/explore/assets/pos-docs.js"></script></body>`);
  return { html, assets };
}
