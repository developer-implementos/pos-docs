import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {architecture} from './model.mjs';
import {renderArchitecture} from './render.mjs';
import {architectureViews, scenarioView, validateArchitecture} from './views.mjs';
validateArchitecture();
import {docsOrigin} from '../../apps/starlight/site-config.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iconPaths={
  panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M14 4v16"/>',
  more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  minus:'<path d="M5 12h14"/>',plus:'<path d="M5 12h14M12 5v14"/>',
  fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  target:'<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
  reset:'<path d="M3 11a9 9 0 1 1 3 8M3 4v7h7"/>',
};
const icon=name=>`<svg class="ui-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${iconPaths[name]}</svg>`;
const statuses={proposed:'Propuesto',conditional:'Condicional',unresolved:'Por definir'};
const kinds={app:'Aplicación',data:'Datos',infra:'Infraestructura',external:'Sistema externo',component:'Componente interno',process:'Proceso nativo condicional',responsibility:'Responsabilidad por asignar'};
const nodes=new Map(architecture.nodes.map(node=>[node.id,node]));
const ids=new Set();
for(const item of [...architecture.nodes,...architecture.edges]) {
  assert.match(item.id,/^[a-z][a-z0-9-]*$/);
  assert.ok(!ids.has(item.id),`Duplicate architecture id: ${item.id}`); ids.add(item.id);
  assert.ok(item.title&&item.description&&item.sources?.length,`Incomplete architecture detail: ${item.id}`);
  assert.ok(statuses[item.status],`Unknown status: ${item.id}`);
  for(const source of item.sources) assert.ok(/^\/(?:guide|docs)\//.test(source.href)||source.href.startsWith('https://'),`Invalid source: ${source.href}`);
}
for(const edge of architecture.edges) assert.ok(nodes.has(edge.from)&&nodes.has(edge.to),`Dangling relationship: ${edge.id}`);
for(const node of architecture.nodes) {
  assert.ok(architecture.groups.some(group=>group.id===node.group),`Unknown group: ${node.id}`);
  if(node.owner) assert.ok(nodes.has(node.owner),`Unknown component owner: ${node.id}`);
}
for(const scenario of architecture.scenarios) for(const step of scenario.steps) {
  for(const id of [...step.nodes,...step.edges]) assert.ok(ids.has(id),`Unknown scenario item: ${id}`);
}
const svg=renderArchitecture(architecture);
const baseSvg=renderArchitecture(architectureViews[0].model);
const baseFile=path.join(root,'docs/architecture/pos-platform-base.svg');
const sourceFile=path.join(root,'docs/architecture/pos-platform.svg');
fs.mkdirSync(path.dirname(sourceFile),{recursive:true});
if(!fs.existsSync(baseFile)||fs.readFileSync(baseFile,'utf8')!==baseSvg) fs.writeFileSync(baseFile,baseSvg);
if(!fs.existsSync(sourceFile)||fs.readFileSync(sourceFile,'utf8')!==svg) fs.writeFileSync(sourceFile,svg);
if(process.argv.includes('--source-only')) {
  console.log(`Architecture source: ${architecture.nodes.length} elements, ${architecture.edges.length} relationships.`);
} else {
  const output=path.join(root,'dist');
  assert.ok(fs.existsSync(path.join(output,'.pos-docs-build'))&&!fs.lstatSync(output).isSymbolicLink(),'Build the documentation artifact first');
  const target=path.join(output,'architecture'); fs.mkdirSync(target,{recursive:true});
  const destination=path.join(output,'docs/architecture'); fs.mkdirSync(destination,{recursive:true});
  fs.copyFileSync(sourceFile,path.join(destination,'pos-platform.svg'));
  fs.copyFileSync(baseFile,path.join(destination,'pos-platform-base.svg'));
  const renderedViews=architectureViews.map(view=>({ ...view,svg:renderArchitecture(view.model,{interactive:true}) }));
  const stepViews=architecture.scenarios.flatMap(s=>s.steps.map((_,i)=>({id:`scenario-${s.id}-${i+1}`,svg:renderArchitecture(scenarioView(s,i),{interactive:true})})));
  const templates=[...renderedViews,...stepViews].map(view=>`<template data-map-view="${view.id}">${view.svg}</template>`).join('');
  for(const file of ['architecture.css','architecture.js']) fs.copyFileSync(path.join(root,'portal',file),path.join(target,file));
  const list=(title,items)=>items?.length?`<section class="detail-section"><h3>${title}</h3><ul>${items.map(item=>`<li>${escape(item)}</li>`).join('')}</ul></section>`:'';
  const sourceLinks=item=>`<section class="detail-section sources"><h3>Fuentes de la propuesta</h3><ul>${item.sources.map(source=>`<li><a href="${escape(source.href)}" ${source.href.startsWith('https://')?'target="_blank" rel="noopener"':''}>${escape(source.label)}</a></li>`).join('')}</ul></section>`;
  const select=(id,label)=>`<a class="item-link" href="#detail-${id}" data-select="${id}">${escape(label)}</a>`;
  const detail=(item,edge=false)=>`<article class="detail-card" id="detail-${item.id}" data-detail="${item.id}" ${edge?`data-from="${item.from}" data-to="${item.to}"`:""}><p class="eyebrow">${edge?'Conexión · '+escape(item.protocol):kinds[item.kind]}</p><h2 tabindex="-1">${escape(item.title)}</h2><span class="status ${item.status}">${statuses[item.status]}</span><p class="detail-intro">${escape(item.description)}</p>${edge?`<div class="endpoints"><span>${item.relation==='evaluation'?'Evalúa':'Inicia'}</span>${select(item.from,nodes.get(item.from).title)}<span>${item.relation==='evaluation'?'Alternativa':'Destino'}</span>${select(item.to,nodes.get(item.to).title)}</div>`:`<dl class="technology"><dt>Tecnología</dt><dd>${escape(item.technology)}</dd>${item.owner?`<dt>Forma parte de</dt><dd>${select(item.owner,nodes.get(item.owner).title)}</dd>`:''}</dl>`}${edge?list('Qué transporta',item.payload)+list('Contrato y garantías',item.guarantees):list('Responsabilidades',item.responsibilities)+list('Datos y autoridad',item.data)}${list('Fallos y recuperación',item.failure)}${!edge?`<section class="detail-section"><h3>Conexiones</h3><ul class="related">${architecture.edges.filter(e=>e.from===item.id||e.to===item.id).map(e=>`<li>${select(e.id,e.title)}<small>${escape(nodes.get(e.from).title)} → ${escape(nodes.get(e.to).title)}</small></li>`).join('')}</ul></section>`:''}${sourceLinks(item)}</article>`;
  const indexItem=(item,edge=false)=>`<li data-index-item data-kind="${edge?'edge':'node'}" data-search="${escape([item.id,item.title,item.technology,item.protocol,item.summary,item.description].filter(Boolean).join(' '))}"><a href="#detail-${item.id}" data-select="${item.id}"><strong>${escape(item.title)}</strong><span>${escape(edge?`${nodes.get(item.from).title} → ${nodes.get(item.to).title}`:item.technology)}</span></a></li>`;
  const scenarios=architecture.scenarios.map(s=>`<article class="scenario" data-scenario-panel="${s.id}"><p class="eyebrow">Recorrido de la propuesta</p><h2 tabindex="-1">${escape(s.title)}</h2><p>${escape(s.description)}</p><ol class="steps">${s.steps.map((step,i)=>`<li><button data-step="${i}" data-nodes="${step.nodes.join(' ')}" data-edges="${step.edges.join(' ')}"><span class="step-number">${i+1}</span><span><strong>${escape(step.title)}</strong><span>${escape(step.description)}</span></span></button></li>`).join('')}</ol><div class="step-controls"><button data-previous-step>Anterior</button><button data-next-step class="primary">Siguiente paso</button></div></article>`).join('');
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arquitectura interactiva · POS Platform</title><meta name="description" content="Mapa detallado de la propuesta de POS Platform: aplicaciones, datos, tecnologías y contratos de integración con fichas interactivas."><link rel="canonical" href="${docsOrigin}/architecture/"><link rel="icon" href="/portal/assets/favicon.svg"><link rel="stylesheet" href="architecture.css"><script src="architecture.js" type="module"></script></head><body>
<a class="skip-link" href="#inspector">Saltar a los detalles y conexiones</a>
<header class="site-header"><a class="brand" href="/" aria-label="POS Platform, inicio"><img src="/portal/assets/logo.svg" width="112" height="38" alt="Implementos"><span>POS Platform</span></a><h1 class="sr-only">Arquitectura propuesta de POS Platform</h1>
<div class="view-picker"><label for="view">Vista</label><select id="view" aria-describedby="view-description">${architectureViews.map(v=>`<option value="${v.id}">${escape(v.title)}</option>`).join('')}</select></div>
<button id="toggle-inspector" class="inspect-toggle" aria-label="Explorar elementos" title="Explorar elementos" aria-controls="inspector" aria-expanded="false">${icon('panel')}<span id="toggle-inspector-label">Explorar</span></button><button id="options-toggle" class="icon-button" popovertarget="map-options" aria-label="Opciones del mapa" title="Opciones del mapa">${icon('more')}</button></header>
<div id="map-options" popover="auto" role="dialog" aria-labelledby="map-options-title" tabindex="-1" autofocus><div class="options-heading"><h2 id="map-options-title">Opciones del mapa</h2><button class="icon-button" popovertarget="map-options" popovertargetaction="hide" aria-label="Cerrar opciones" title="Cerrar opciones">${icon('close')}</button></div>
<div class="option-section"><label for="scenario">Recorridos guiados</label><select id="scenario"><option value="">Sin recorrido</option>${architecture.scenarios.map(s=>`<option value="${s.id}">${escape(s.title)}</option>`).join('')}</select></div>
<div class="option-section option-actions"><button id="copy-view">${icon('copy')}Copiar enlace</button><button id="fullscreen">${icon('fullscreen')}<span id="fullscreen-label">Pantalla completa</span></button><button id="focus-item" disabled>${icon('target')}Centrar selección</button><button id="clear-selection">${icon('reset')}Volver a la arquitectura base</button></div>
<nav class="option-section resources" aria-label="Recursos"><h3>Documentación y archivos</h3><a href="/guide/architecture/c4-model/">Documentación C4</a><a href="/docs/architecture/pos-platform-base.svg" download>Descargar SVG base</a><a href="/docs/architecture/pos-platform.svg" download>Descargar SVG completo</a></nav><p class="scope">Propuesta para Chile, Perú y España.<br>6 aplicaciones · ${architecture.nodes.length} elementos · ${architecture.edges.length} conexiones.</p></div>
<main class="workbench"><p class="sr-only" id="view-description">${escape(architectureViews[0].description)}</p>
<div class="explorer"><section class="map" aria-label="Mapa de arquitectura"><div id="viewport" tabindex="0" role="region" aria-label="Diagrama desplazable; usa las flechas para recorrerlo, más y menos para ampliar y cero para encajar"><div id="drawing">${renderedViews[0].svg}</div></div><div class="zoom-controls" role="group" aria-label="Escala del mapa"><button id="zoom-out" class="icon-button" aria-label="Reducir mapa" title="Reducir mapa (−)">${icon('minus')}</button><button id="actual" aria-label="Restablecer tamaño real (100 %)" title="Tamaño real (1)"><output id="zoom-label" aria-live="off">100 %</output></button><button id="zoom-in" class="icon-button" aria-label="Ampliar mapa" title="Ampliar mapa (+)">${icon('plus')}</button><button id="fit" class="icon-button" aria-label="Encajar mapa" title="Encajar mapa (0)">${icon('fit')}</button></div></section>
<aside id="inspector" aria-label="Detalles de arquitectura"><div class="inspector-tools"><button id="back-index" hidden>← Explorar elementos</button><button id="copy-link" class="icon-button" aria-label="Copiar enlace a la selección" title="Copiar enlace">${icon('copy')}</button><button id="close-inspector" class="icon-button" aria-label="Cerrar detalles" title="Cerrar detalles">${icon('close')}</button></div><div id="index-panel"><h2>Explorar la propuesta</h2><p class="index-intro">Las flechas muestran quién inicia la comunicación. Los componentes internos pertenecen a una app. Los procesos nativos tienen ciclo de vida propio. Una asociación sin flecha identifica una evaluación pendiente.</p><label for="search">Buscar elemento o conexión</label><input id="search" type="search" placeholder="country-api, Redis, ACK…" autocomplete="off"><div class="index-tabs" role="group" aria-label="Tipo de elemento"><button data-kind-filter="node" aria-pressed="true">Elementos</button><button data-kind-filter="edge" aria-pressed="false">Conexiones</button></div><p id="result-count" role="status"></p><ul class="item-index">${architecture.nodes.map(n=>indexItem(n)).join('')}${architecture.edges.map(e=>indexItem(e,true)).join('')}</ul></div><div id="details">${architecture.nodes.map(n=>detail(n)).join('')}${architecture.edges.map(e=>detail(e,true)).join('')}${scenarios}</div></aside></div>
<p class="sr-only" id="announcement" role="status" aria-live="polite">Mapa de la propuesta. No acredita capacidades desplegadas.</p><p id="feedback" class="feedback" hidden></p></main>${templates}<noscript><p class="no-js">El mapa SVG y todas las fichas están disponibles sin JavaScript. Los controles de selección, recorridos y zoom requieren activarlo.</p></noscript></body></html>`;
  fs.writeFileSync(path.join(target,'index.html'),html);
  fs.writeFileSync(path.join(target,'model.json'),JSON.stringify(architecture,null,2)+'\n');
  console.log(`Architecture explorer: /architecture/ with ${architecture.nodes.length} elements, ${architecture.edges.length} relationships and ${architecture.scenarios.length} guided flows.`);
}
