export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

const navigation = [['project', '/project/', 'Proyecto'], ['guide', '/guide/', 'Documentación'], ['presentations', '/presentations/', 'Presentaciones'], ['materials', '/materials/', 'Fuentes']];

export function renderSitePage({title, description, pathname, active = 'home', body, origin, repository, styles = [], scripts = []}) {
  const escape = escapeHtml;
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)} · POS Platform</title><meta name="description" content="${escape(description)}">
<link rel="canonical" href="${escape(origin + pathname)}"><meta property="og:title" content="${escape(title)} · POS Platform"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${escape(origin + pathname)}"><meta property="og:type" content="website">
<link rel="icon" href="/portal/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/portal/portal.css">${styles.map(href => `<link rel="stylesheet" href="${escape(href)}">`).join('')}
${scripts.map(src => `<script type="module" src="${escape(src)}"></script>`).join('')}</head>
<body class="site-page site-${escape(active)}"><a class="skip-link" href="#main">Saltar al contenido</a>
<header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="POS Platform, inicio"><img src="/portal/assets/logo.svg" width="130" height="44" alt="Implementos"><span>POS Platform</span></a>
<nav aria-label="Navegación principal">${navigation.map(([id, href, label]) => `<a href="${href}"${active === id ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav></div></header>
<main id="main" tabindex="-1">${body}</main>
<footer><div class="footer-inner"><p><strong>POS Platform</strong><span>Documentación y seguimiento de Implementos</span></p><a class="text-link" href="${escape(repository)}">Repositorio pos-docs</a></div></footer></body></html>`;
}
