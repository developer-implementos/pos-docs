import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {architecture} from './model.mjs';
import {renderArchitecture} from './render.mjs';
import {docsOrigin} from '../../apps/starlight/site-config.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statuses={proposed:'Propuesto',conditional:'Condicional',unresolved:'Por definir'};
const kinds={app:'Aplicación',data:'Datos',infra:'Infraestructura',external:'Sistema externo',component:'Componente interno'};
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
const sourceFile=path.join(root,'docs/architecture/pos-platform.svg');
fs.mkdirSync(path.dirname(sourceFile),{recursive:true});
if(!fs.existsSync(sourceFile)||fs.readFileSync(sourceFile,'utf8')!==svg) fs.writeFileSync(sourceFile,svg);
if(process.argv.includes('--source-only')) {
  console.log(`Architecture source: ${architecture.nodes.length} elements, ${architecture.edges.length} relationships.`);
} else {
  const output=path.join(root,'dist');
  assert.ok(fs.existsSync(path.join(output,'.pos-docs-build'))&&!fs.lstatSync(output).isSymbolicLink(),'Build the documentation artifact first');
  const target=path.join(output,'architecture'); fs.mkdirSync(target,{recursive:true});
  const destination=path.join(output,'docs/architecture'); fs.mkdirSync(destination,{recursive:true});
  fs.copyFileSync(sourceFile,path.join(destination,'pos-platform.svg'));
  for(const file of ['architecture.css','architecture.js']) fs.copyFileSync(path.join(root,'portal',file),path.join(target,file));
  const list=(title,items)=>items?.length?`<section class="detail-section"><h3>${title}</h3><ul>${items.map(item=>`<li>${escape(item)}</li>`).join('')}</ul></section>`:'';
  const sourceLinks=item=>`<section class="detail-section sources"><h3>Fuentes de la propuesta</h3><ul>${item.sources.map(source=>`<li><a href="${escape(source.href)}" ${source.href.startsWith('https://')?'target="_blank" rel="noopener"':''}>${escape(source.label)}</a></li>`).join('')}</ul></section>`;
  const select=(id,label)=>`<a class="item-link" href="#detail-${id}" data-select="${id}">${escape(label)}</a>`;
  const detail=(item,edge=false)=>`<article class="detail-card" id="detail-${item.id}" data-detail="${item.id}" ${edge?`data-from="${item.from}" data-to="${item.to}"`:""}><p class="eyebrow">${edge?'Conexión · '+escape(item.protocol):kinds[item.kind]}</p><h2 tabindex="-1">${escape(item.title)}</h2><span class="status ${item.status}">${statuses[item.status]}</span><p class="detail-intro">${escape(item.description)}</p>${edge?`<div class="endpoints"><span>Inicia</span>${select(item.from,nodes.get(item.from).title)}<span>Destino</span>${select(item.to,nodes.get(item.to).title)}</div>`:`<dl class="technology"><dt>Tecnología</dt><dd>${escape(item.technology)}</dd>${item.owner?`<dt>Forma parte de</dt><dd>${select(item.owner,nodes.get(item.owner).title)}</dd>`:''}</dl>`}${edge?list('Qué transporta',item.payload)+list('Contrato y garantías',item.guarantees):list('Responsabilidades',item.responsibilities)+list('Datos y autoridad',item.data)}${list('Fallos y recuperación',item.failure)}${!edge?`<section class="detail-section"><h3>Conexiones</h3><ul class="related">${architecture.edges.filter(e=>e.from===item.id||e.to===item.id).map(e=>`<li>${select(e.id,e.title)}<small>${escape(nodes.get(e.from).title)} → ${escape(nodes.get(e.to).title)}</small></li>`).join('')}</ul></section>`:''}${sourceLinks(item)}</article>`;
  const indexItem=(item,edge=false)=>`<li data-index-item data-kind="${edge?'edge':'node'}" data-search="${escape([item.id,item.title,item.technology,item.protocol,item.summary,item.description].filter(Boolean).join(' '))}"><a href="#detail-${item.id}" data-select="${item.id}"><strong>${escape(item.title)}</strong><span>${escape(edge?`${nodes.get(item.from).title} → ${nodes.get(item.to).title}`:item.technology)}</span></a></li>`;
  const scenarios=architecture.scenarios.map(s=>`<article class="scenario" data-scenario-panel="${s.id}"><p class="eyebrow">Recorrido de la propuesta</p><h2 tabindex="-1">${escape(s.title)}</h2><p>${escape(s.description)}</p><ol class="steps">${s.steps.map((step,i)=>`<li><button data-step="${i}" data-nodes="${step.nodes.join(' ')}" data-edges="${step.edges.join(' ')}"><span class="step-number">${i+1}</span><span><strong>${escape(step.title)}</strong><span>${escape(step.description)}</span></span></button></li>`).join('')}</ol><div class="step-controls"><button data-previous-step>Anterior</button><button data-next-step class="primary">Siguiente paso</button></div></article>`).join('');
  const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arquitectura interactiva · POS Platform</title><meta name="description" content="Mapa detallado de la propuesta de POS Platform: aplicaciones, datos, tecnologías y contratos de integración con fichas interactivas."><link rel="canonical" href="${docsOrigin}/architecture/"><link rel="icon" href="/portal/assets/favicon.svg"><link rel="stylesheet" href="architecture.css"><script src="architecture.js" type="module"></script></head><body>
<a class="skip-link" href="#inspector">Saltar a los detalles y conexiones</a>
<header class="site-header"><a class="brand" href="/" aria-label="POS Platform, inicio"><img src="/portal/assets/logo.svg" width="128" height="44" alt="Implementos"><span>POS Platform</span></a><nav aria-label="Recursos"><a href="/guide/architecture/c4-model/">Documentación C4</a><a class="button tonal" href="/docs/architecture/pos-platform.svg" download>Descargar SVG</a></nav></header>
<main class="workbench"><div class="heading"><div><p class="eyebrow">Arquitectura propuesta · Chile, Perú y España</p><h1>Un producto, de la sucursal al país.</h1></div><p class="scope">6 aplicaciones · ${architecture.nodes.length} elementos · ${architecture.edges.length} conexiones</p></div>
<div class="toolbar"><div class="view-picker"><label for="scenario">Vista</label><select id="scenario"><option value="">Arquitectura completa</option>${architecture.scenarios.map(s=>`<option value="${s.id}">${escape(s.title)}</option>`).join('')}</select></div><div class="zoom-controls" aria-label="Escala del mapa"><button id="zoom-out" aria-label="Reducir mapa">−</button><output id="zoom-label" aria-live="off">Ajustado</output><button id="zoom-in" aria-label="Ampliar mapa">+</button><button id="fit">Encajar</button><button id="actual">100 %</button><button id="focus-item" disabled>Centrar selección</button></div><button id="fullscreen">Pantalla completa</button></div>
<div class="explorer"><section class="map" aria-label="Mapa de arquitectura"><div id="viewport" tabindex="0" role="region" aria-label="Diagrama desplazable; usa las flechas para recorrerlo"><div id="drawing">${renderArchitecture(architecture,{interactive:true})}</div></div><div class="map-footer"><span>Selecciona un elemento o una conexión para ver su contrato.</span><button id="clear-selection">Ver todo</button></div></section>
<aside id="inspector" aria-label="Detalles de arquitectura"><div class="inspector-tools"><button id="back-index" hidden>← Explorar elementos</button><button id="copy-link" hidden>Copiar enlace</button></div><div id="index-panel"><h2>Explorar la propuesta</h2><p class="index-intro">Las flechas muestran quién inicia la comunicación. Los componentes internos pertenecen a una app; los bloques condicionales requieren una decisión de adopción.</p><label for="search">Buscar elemento o conexión</label><input id="search" type="search" placeholder="country-api, Redis, ACK…" autocomplete="off"><div class="index-tabs" role="group" aria-label="Tipo de elemento"><button data-kind-filter="node" aria-pressed="true">Elementos</button><button data-kind-filter="edge" aria-pressed="false">Conexiones</button></div><p id="result-count" role="status"></p><ul class="item-index">${architecture.nodes.map(n=>indexItem(n)).join('')}${architecture.edges.map(e=>indexItem(e,true)).join('')}</ul></div><div id="details">${architecture.nodes.map(n=>detail(n)).join('')}${architecture.edges.map(e=>detail(e,true)).join('')}${scenarios}</div></aside></div>
<p class="status-line" id="announcement" role="status" aria-live="polite">Mapa de la propuesta. No acredita capacidades desplegadas.</p></main><noscript><p class="no-js">El mapa SVG y todas las fichas están disponibles sin JavaScript. Los controles de selección, recorridos y zoom requieren activarlo.</p></noscript></body></html>`;
  fs.writeFileSync(path.join(target,'index.html'),html);
  fs.writeFileSync(path.join(target,'model.json'),JSON.stringify(architecture,null,2)+'\n');
  console.log(`Architecture explorer: /architecture/ with ${architecture.nodes.length} elements, ${architecture.edges.length} relationships and ${architecture.scenarios.length} guided flows.`);
}
