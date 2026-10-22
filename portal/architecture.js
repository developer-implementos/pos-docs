const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const drawing=$('#drawing'), viewport=$('#viewport'), svg=drawing.querySelector('svg');
const detailCards=$$('[data-detail]');
const items=new Map($$('#drawing [data-item-id]').map(item=>[item.dataset.itemId,item]));
const details=new Map(detailCards.map(item=>[item.dataset.detail,item]));
const index=$('#index-panel'), inspector=$('#inspector'), search=$('#search'), scenarioSelect=$('#scenario');
const announcement=$('#announcement'), zoomLabel=$('#zoom-label');
const back=$('#back-index'), copy=$('#copy-link'), focusItem=$('#focus-item');
const normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const relations=detailCards.filter(card=>card.dataset.from);
const bounds=svg.viewBox.baseVal;
const nativeWidth=bounds.width, nativeHeight=bounds.height;
let scale=1, fitting=true, current=null, activeScenario=null, stepIndex=0, filter='node';
let resizeFrame;

function announce(text){announcement.textContent=text;}
function scaleTo(value,keepCenter=true){
  const before=scale;
  const center={x:(viewport.scrollLeft+viewport.clientWidth/2)/before,y:(viewport.scrollTop+viewport.clientHeight/2)/before};
  scale=Math.max(.08,Math.min(1.8,value));
  drawing.style.width=`${nativeWidth*scale}px`;
  drawing.style.height=`${nativeHeight*scale}px`;
  zoomLabel.textContent=`${Math.round(scale*100)} %`;
  $('#zoom-out').disabled=scale<=.08;
  $('#zoom-in').disabled=scale>=1.8;
  if(keepCenter) viewport.scrollTo({left:center.x*scale-viewport.clientWidth/2,top:center.y*scale-viewport.clientHeight/2});
}
function fit(){
  fitting=true;
  const style=getComputedStyle(viewport);
  const width=viewport.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
  const height=viewport.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
  scaleTo(Math.min(width/nativeWidth,height/nativeHeight),false);
  viewport.scrollTo({top:0,left:0});
}
function centerIds(ids,{readable=false}={}){
  const boxes=ids.map(id=>items.get(id)?.getBBox()).filter(Boolean);
  if(!boxes.length)return;
  const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
  const width=Math.max(...boxes.map(b=>b.x+b.width))-x,height=Math.max(...boxes.map(b=>b.y+b.height))-y;
  fitting=false;
  if(readable) scaleTo(Math.min(1,Math.max(.08,Math.min((viewport.clientWidth-80)/Math.max(1,width),(viewport.clientHeight-80)/Math.max(1,height)))),false);
  const canvasRect=drawing.getBoundingClientRect(),viewportRect=viewport.getBoundingClientRect();
  const offsetLeft=canvasRect.left-viewportRect.left+viewport.scrollLeft,offsetTop=canvasRect.top-viewportRect.top+viewport.scrollTop;
  viewport.scrollTo({left:(x+width/2)*scale+offsetLeft-viewport.clientWidth/2,top:(y+height/2)*scale+offsetTop-viewport.clientHeight/2,behavior:'instant'});
}
function hidePanels(){
  index.hidden=true;
  for(const card of detailCards)card.hidden=true;
  for(const panel of $$('[data-scenario-panel]'))panel.hidden=true;
}
function highlight(selected,related=[]){
  const selectedIds=new Set(selected), relatedIds=new Set(related);
  drawing.classList.toggle('is-focused',selectedIds.size>0);
  for(const [id,item] of items){
    item.classList.toggle('is-selected',selectedIds.has(id));
    item.classList.toggle('is-related',relatedIds.has(id));
    item.setAttribute('aria-pressed',String(selectedIds.has(id)));
  }
}
function updateHash(id){
  const hash=id?`#detail-${encodeURIComponent(id)}`:'';
  if(location.hash!==hash) history.pushState(null,'',location.pathname+location.search+hash);
}
function showIndex({clearHash=true,focus=false}={}){
  hidePanels();index.hidden=false;back.hidden=true;copy.hidden=true;focusItem.disabled=true;
  current=null;activeScenario=null;scenarioSelect.value='';highlight([]);
  inspector.dataset.active='index';
  if(clearHash)updateHash(null);
  if(focus)search.focus({preventScroll:true});
  announce('Explora los elementos y sus conexiones.');
}
function selectItem(id,{center=false,focus=false,hash=true}={}){
  const card=details.get(id);if(!card)return;
  hidePanels();card.hidden=false;back.hidden=false;copy.hidden=false;focusItem.disabled=false;
  current=id;activeScenario=null;scenarioSelect.value='';inspector.dataset.active=id;
  const related=new Set();
  if(card.dataset.from){related.add(card.dataset.from);related.add(card.dataset.to);}
  else for(const edge of relations) if(edge.dataset.from===id||edge.dataset.to===id){
    related.add(edge.dataset.detail);related.add(edge.dataset.from);related.add(edge.dataset.to);
  }
  highlight([id],[...related]);
  if(hash)updateHash(id);
  if(center)centerIds([id],{readable:true});
  inspector.scrollTop=0;
  if(focus)card.querySelector('h2').focus({preventScroll:true});
  if(matchMedia('(max-width:720px)').matches) inspector.scrollIntoView({block:'start',behavior:'instant'});
  announce(`Detalles: ${card.querySelector('h2').textContent}.`);
}
function filterIndex(){
  const query=normalize(search.value.trim());let count=0;
  for(const row of $$('[data-index-item]')){
    row.hidden=row.dataset.kind!==filter||!normalize(row.dataset.search).includes(query);
    if(!row.hidden)count++;
  }
  $('#result-count').textContent=count?`${count} ${filter==='node'?'elementos':'conexiones'}`:'Sin resultados. Prueba otro nombre o tecnología.';
}
function setStep(index){
  const panel=$$('[data-scenario-panel]').find(panel=>panel.dataset.scenarioPanel===activeScenario);
  if(!panel)return;
  const steps=[...panel.querySelectorAll('[data-step]')];
  stepIndex=Math.max(0,Math.min(steps.length-1,index));
  const active=steps[stepIndex];
  for(const step of steps){if(step===active)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');}
  const nodeIds=active.dataset.nodes.split(' ').filter(Boolean),edgeIds=active.dataset.edges.split(' ').filter(Boolean);
  highlight([...nodeIds,...edgeIds]);
  centerIds(nodeIds,{readable:true});
  panel.querySelector('[data-previous-step]').disabled=stepIndex===0;
  panel.querySelector('[data-next-step]').disabled=stepIndex===steps.length-1;
  announce(`Paso ${stepIndex+1} de ${steps.length}: ${active.querySelector('strong').textContent}`);
}
function showScenario(id){
  const panel=$$('[data-scenario-panel]').find(panel=>panel.dataset.scenarioPanel===id);
  if(!panel){showIndex();return;}
  hidePanels();panel.hidden=false;back.hidden=false;copy.hidden=true;focusItem.disabled=true;
  current=null;activeScenario=id;inspector.dataset.active=id;updateHash(null);setStep(0);
}

document.documentElement.classList.add('js');
showIndex({clearHash:false});filterIndex();
for(const link of $$('[data-select]')) {
  const id=link.dataset.select;
  link.href=`#detail-${id}`;
  link.addEventListener('click',event=>{event.preventDefault();selectItem(id,{center:true,focus:true});});
}
drawing.addEventListener('click',event=>{const item=event.target.closest('[data-item-id]');if(item)selectItem(item.dataset.itemId);});
drawing.addEventListener('keydown',event=>{
  if(event.key!=='Enter'&&event.key!==' ')return;
  const item=event.target.closest('[data-item-id]');if(!item)return;
  event.preventDefault();selectItem(item.dataset.itemId,{focus:true});
});
for(const button of $$('[data-kind-filter]'))button.addEventListener('click',()=>{
  filter=button.dataset.kindFilter;
  for(const item of $$('[data-kind-filter]'))item.setAttribute('aria-pressed',String(item===button));
  filterIndex();
});
search.addEventListener('input',filterIndex);
back.addEventListener('click',()=>showIndex({focus:true}));
$('#clear-selection').addEventListener('click',()=>{showIndex();fit();});
$('#fit').addEventListener('click',fit);
$('#actual').addEventListener('click',()=>{fitting=false;scaleTo(1);});
$('#zoom-in').addEventListener('click',()=>{fitting=false;scaleTo(scale*1.3);});
$('#zoom-out').addEventListener('click',()=>{fitting=false;scaleTo(scale/1.3);});
focusItem.addEventListener('click',()=>{if(current)centerIds([current],{readable:true});});
scenarioSelect.addEventListener('change',()=>showScenario(scenarioSelect.value));
for(const step of $$('[data-step]'))step.addEventListener('click',()=>setStep(Number(step.dataset.step)));
for(const button of $$('[data-previous-step]'))button.addEventListener('click',()=>setStep(stepIndex-1));
for(const button of $$('[data-next-step]'))button.addEventListener('click',()=>setStep(stepIndex+1));
copy.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(location.href);announce('Enlace al detalle copiado.');}
  catch{announce(`Enlace al detalle: ${location.href}`);}
});
$('#fullscreen').addEventListener('click',async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{announce('Este navegador no permite pantalla completa; el zoom del mapa sigue disponible.');}
});
document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'Salir de pantalla completa':'Pantalla completa';});
function fromHash(){
  let id;try{id=decodeURIComponent(location.hash.replace(/^#(?:detail-)?/,''));}catch{id='';}
  if(details.has(id))selectItem(id,{center:true,hash:false});else showIndex({clearHash:false});
}
window.addEventListener('popstate',fromHash);
window.addEventListener('hashchange',fromHash);
new ResizeObserver(()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(fitting)fit();});}).observe(viewport);
requestAnimationFrame(()=>{fit();fromHash();document.documentElement.dataset.architectureReady='true';});
