import assert from 'node:assert/strict';
import test from 'node:test';
import {renderPortal, renderCatalogPages} from './render.mjs';
import {renderSitePage} from './site-shell.mjs';
import {renderMaterialViewer} from './viewer.mjs';

const origin = 'https://docs.example.test';
const repository = 'https://github.com/example/pos-docs';
const catalog = {
  presentations: [{id:'proposal', title:'Presentación exclusiva del catálogo', description:'Diseño del recorrido de caja.', href:'/presentations/proposal/', readingHref:'/presentations/proposal/reading/'}],
  materials: [
    {id:'meeting', title:'Acta exclusiva del catálogo', description:'Fuente original de la reunión.', href:'/materials/meeting.docx', format:'docx', kind:'meeting', country:'peru', bytes:1024, date:null},
    {id:'proposal-file', title:'Propuesta exclusiva del catálogo', description:'Propuesta revisable del equipo.', href:'/materials/proposal.pdf', format:'pdf', kind:'proposal', country:'regional', bytes:2048, date:'2026-10-30'},
  ],
};
const progress = {
  measurement:'verification', reviewedOn:'2026-10-31', completed:3, total:71, percent:4.2,
  counts:{in_progress:2}, applications:[{id:'branch-api', title:'Aplicación detallada'}],
  phases:[{id:'F01', title:'Fase detallada'}], workPackages:[{id:'F01-01', title:'Entregable detallado'}],
};

test('home publishes derived summary links and legacy destinations without duplicating detailed catalogs', () => {
  const html = renderPortal(catalog, origin, repository, progress, {items:[{state:'open'}, {state:'resolved'}]});
  assert.match(html, /3\/71 entregables verificados/);
  assert.match(html, /<strong>4,2 %<\/strong>/);
  assert.match(html, /href="\/project\/work\/\?status=verified"/);
  assert.match(html, /href="\/project\/work\/\?status=in_progress"><strong>2<\/strong>/);
  assert.match(html, /href="\/project\/attention\/\?state=open"><strong>1<\/strong>/);
  assert.match(html, /<time datetime="2026-10-31">/);
  assert.match(html, /revisiones humanas se consultan por separado/);
  for (const [id, destination] of [['presentations', '/presentations/'], ['materials', '/materials/'], ['team', '/project/team/']]) {
    assert.match(html, new RegExp(`id="${id}"[^]*?href="${destination}"`));
  }
  for (const entry of [...catalog.presentations, ...catalog.materials, ...progress.applications, ...progress.phases, ...progress.workPackages]) {
    assert.ok(!html.includes(entry.title), `Details belong to their destination: ${entry.title}`);
  }
  assert.doesNotMatch(html, /data-material|data-progress-app|data-progress-phase|a[^>]+ download/);
});

test('legacy acceptance snapshots are labeled and linked as acceptance without claiming technical verification', () => {
  const html = renderPortal(catalog, origin, repository, {...progress, measurement:'acceptance', completed:2, total:10, percent:20});
  assert.match(html, /2\/10 entregables aceptados/);
  assert.match(html, /<strong>20 %<\/strong>/);
  assert.match(html, /href="\/project\/work\/\?status=accepted"/);
  assert.doesNotMatch(html, /entregables verificados|status=verified/);
});

test('dedicated catalogs preserve original downloads, viewers, proposal separation and no-JavaScript content', () => {
  const pages = renderCatalogPages(catalog, repository);
  assert.deepEqual([...pages.keys()], ['/presentations/', '/materials/']);
  const sources = pages.get('/materials/');
  const proposals = pages.get('/presentations/');
  assert.match(proposals.body, /href="\/presentations\/proposal\/"/);
  assert.match(proposals.body, /href="\/presentations\/proposal\/reading\/"/);
  for (const item of catalog.materials) {
    const own = item.kind === 'proposal' ? proposals : sources;
    const other = item.kind === 'proposal' ? sources : proposals;
    assert.ok(own.body.includes(`href="${item.href}" download`));
    assert.ok(own.body.includes(`href="/materials/view/${item.id}/"`));
    assert.ok(!other.body.includes(item.href), 'Each original belongs to one catalog');
  }
  assert.match(sources.body, /data-material data-format="docx" data-country="peru"/);
  assert.match(sources.body, /data-filters hidden/);
  assert.match(sources.body, /<noscript>/);
  assert.match(sources.body, /href="\/guide\/evidence\/country-comparison\/"/);
  assert.doesNotMatch(sources.body, /<option value="pdf"|<option value="regional"/);
  assert.doesNotMatch(proposals.body, /data-material data-format|data-filters/);
  for (const [pathname, page] of pages) {
    const html = renderSitePage({...page, pathname, origin, repository});
    assert.ok(html.includes(`<link rel="canonical" href="${origin}${pathname}">`));
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.ok(html.includes(`href="${pathname}" aria-current="page"`));
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/);
  }
});

test('source and proposal viewers return directly to their catalogs without relying on JavaScript redirects', () => {
  for (const item of catalog.materials) {
    const html = renderMaterialViewer(item, {href:`/materials/previews/${item.id}.pdf`, pages:1}, origin);
    const destination = item.kind === 'proposal' ? '/presentations/' : '/materials/';
    assert.ok(html.includes(`class="viewer-back viewer-header-action" href="${destination}"`));
    assert.doesNotMatch(html, /href="\/#(?:materials|presentations)"/);
  }
});

test('catalog and shared page metadata escape authored text and attribute values', () => {
  const authored = 'Caja <script>alert("texto")</script> & revisión';
  const href = '/materials/source.pdf?label="documento"&lang=es';
  const customCatalog = {
    presentations:[{...catalog.presentations[0], title:authored, description:authored}],
    materials:[{...catalog.materials[0], title:authored, description:authored, href}],
  };
  const pages = renderCatalogPages(customCatalog, repository);
  for (const [pathname, page] of pages) {
    const html = renderSitePage({...page, title:authored, description:authored, pathname, origin, repository});
    assert.ok(html.includes('Caja &lt;script&gt;alert(&quot;texto&quot;)&lt;/script&gt; &amp; revisión'));
    assert.ok(!html.includes(authored), 'Authored markup stays text in headings and metadata');
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/);
  }
  assert.ok(pages.get('/materials/').body.includes('href="/materials/source.pdf?label=&quot;documento&quot;&amp;lang=es"'));
});
