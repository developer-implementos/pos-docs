/* Native scene contracts, geometry, official editor round-trip and drag bindings. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'docs/diagramas-excalidraw'),qa=path.join(root,'tmp/diagrams/excalidraw');
const runtime=path.resolve(process.env.EXCALIDRAW_RUNTIME||path.join(root,'tools/diagrams/runtime'));
function playwrightModule(){for(const candidate of [process.env.PLAYWRIGHT_MODULE_PATH,'playwright',path.join(root,'apps/starlight/node_modules/playwright')].filter(Boolean)){try{return require(candidate);}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}}throw new Error('Set PLAYWRIGHT_MODULE_PATH to an installed Playwright package.');}

const modelCtx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'tools/diagrams/models/c4-data.js'),'utf8'),modelCtx);const model=modelCtx.window.POS_C4;
const {collection,assertModels}=require('./collection.cjs');
const dynamicViews=require('./models/dynamic-data.cjs');
assertModels(model,dynamicViews);
const norm=s=>s.replace(/\s+/g,' ').trim();
function validateModelSemantics(){
 const catalog=JSON.parse(fs.readFileSync(path.join(root,'apps/starlight/src/data/monorepo-catalog.json'),'utf8'));
 const apps=Object.values(model.nodes).filter(node=>node.appId);
 assert.deepEqual(apps.map(node=>node.appId).sort(),catalog.applications.map(app=>app.name).sort(),'C4 applications must match the product catalog');
 const containers=model.views.find(view=>view.id==='containers');
 for(const node of apps){
  assert.equal(node.name,node.appId,`Application name must be visible: ${node.id}`);
  assert.equal(node.projectPath,`apps/${node.appId}`,`Application path must identify its project: ${node.id}`);
  assert.ok(containers.nodeIds.includes(node.id),`Application absent from C2: ${node.appId}`);
 }
 for(const view of model.views){
  const nodes=new Set(view.nodeIds);
  assert.equal(nodes.size,view.nodeIds.length,`Duplicate node in ${view.id}`);
  for(const id of nodes)assert.ok(id==='legend'||model.nodes[id],`Unknown node in ${view.id}: ${id}`);
  for(const relation of view.relationships)assert.ok(nodes.has(relation.from)&&nodes.has(relation.to),`Relationship outside ${view.id}: ${relation.from}/${relation.to}`);
  for(const boundary of view.boundaries)for(const id of boundary.nodes)assert.ok(nodes.has(id),`Boundary references unknown node: ${view.id}/${id}`);
  if(view.level.startsWith('C3')){
   const container=model.nodes[view.containerId];
   assert.ok(container?.appId,`C3 must identify its owning application: ${view.id}`);
   assert.equal(view.boundaries.length,1,`C3 expands one process: ${view.id}`);
   assert.ok(view.boundaries[0].label.includes(container.projectPath),`C3 boundary must show its owning project: ${view.id}`);
   assert.match(view.boundaries[0].label,/UN proceso/,`C3 boundary must identify the single process: ${view.id}`);
   for(const id of view.boundaries[0].nodes){
    const component=model.nodes[id];
    assert.equal(component.type,'Componente',`C3 interior must contain components: ${view.id}/${id}`);
    assert.ok(component.codePaths?.length,`Component must map to code responsibilities: ${id}`);
    for(const codePath of component.codePaths)assert.match(codePath,/^(?:apps|libs)\/[a-z0-9/-]+$/,`Invalid component code path: ${id}`);
   }
  }
 }
 for(const view of dynamicViews){
  const participants=new Set(view.participants.map(participant=>participant.id));
  assert.equal(participants.size,view.participants.length,`Duplicate participant: ${view.id}`);
  for(const participant of view.participants){
   const node=model.nodes[participant.nodeId];
   assert.ok(node,`Dynamic participant missing from C4: ${view.id}/${participant.id}`);
   for(const key of ['name','type','technology'])assert.equal(participant[key],node[key],`Dynamic participant differs from C4: ${view.id}/${participant.id}.${key}`);
  }
  for(const step of view.steps)assert.ok(participants.has(step.from)&&participants.has(step.to),`Dynamic step references unknown participant: ${view.id}`);
 }
}
function assertVisibleNode(scene,id,node,file){
 const label=scene.elements.filter(element=>element.type==='text'&&element.containerId===id).map(element=>element.text).join(' ');
 for(const value of [node.name,node.type,node.technology])assert.ok(norm(label).includes(norm(value)),`${file}: node ${id} does not visibly show ${value}`);
}
const overlap=(a,b,pad=1)=>a.x+pad<b.x+b.width&&b.x+pad<a.x+a.width&&a.y+pad<b.y+b.height&&b.y+pad<a.y+a.height;
function segmentEnters(a,b,r){let low=0,high=1;for(let axis=0;axis<2;axis++){const min=(axis?r.y:r.x)+2,max=(axis?r.y+r.height:r.x+r.width)-2,d=b[axis]-a[axis];if(Math.abs(d)<1e-8){if(a[axis]<=min||a[axis]>=max)return false;}else{let t1=(min-a[axis])/d,t2=(max-a[axis])/d;if(t1>t2)[t1,t2]=[t2,t1];low=Math.max(low,t1);high=Math.min(high,t2);if(low>=high)return false;}}return high>0&&low<1;}
(async()=>{
 validateModelSemantics();
 const results=[],files=fs.readdirSync(folder).filter(f=>f.endsWith('.excalidraw')).sort();
 assert.deepEqual(files,[collection.atlas,...collection.boards.map(board=>board.file)].map(name=>name+'.excalidraw').sort(),'Native scene inventory differs from the published collection');
 const scenes=collection.boards.map(board=>({board,file:board.file+'.excalidraw',scene:JSON.parse(fs.readFileSync(path.join(folder,board.file+'.excalidraw'),'utf8'))}));
 for(const {board,file,scene} of scenes){
   assert.equal(scene.type,'excalidraw');assert.equal(scene.version,2);assert.equal(Object.keys(scene.files).length,0);
   const ids=new Set(scene.elements.map(e=>e.id));assert.equal(ids.size,scene.elements.length);assert(!scene.elements.some(e=>e.type==='image'));
   for(const e of scene.elements){for(const key of ['x','y','width','height'])assert(Number.isFinite(e[key]),`${file} ${e.id}.${key}`);if(e.containerId)assert(ids.has(e.containerId));for(const bind of [e.startBinding,e.endBinding])if(bind)assert(ids.has(bind.elementId));for(const bound of e.boundElements||[])assert(ids.has(bound.id));}
   if(board.kind==='structural'){const view=model.views.find(view=>view.id===board.id),byId=new Map(scene.elements.map(e=>[e.id,e]));
     for(const id of view.nodeIds.filter(id=>id!=='legend')){assert(byId.get(id)?.customData?.c4NodeId===id);assertVisibleNode(scene,id,model.nodes[id],file);}
     const edges=scene.elements.filter(e=>e.type==='arrow');assert.equal(edges.length,view.relationships.length);
     for(const r of view.relationships){const e=byId.get(`${r.from}_${r.to}`);assert.equal(e.startBinding?.elementId,r.from);assert.equal(e.endBinding?.elementId,r.to);assert.equal(e.customData.label,r.label);assert.equal(norm(byId.get('label-'+e.id).text),norm(r.label));}
     const nodes=view.nodeIds.filter(id=>id!=='legend').map(id=>byId.get(id));
     const labels=scene.elements.filter(e=>e.id.startsWith('label-')&&!e.id.startsWith('label-bg-'));
     const collisions=[];for(let n=0;n<nodes.length;n++)for(let m=n+1;m<nodes.length;m++)if(overlap(nodes[n],nodes[m]))collisions.push([nodes[n].id,nodes[m].id]);
     for(const label of labels){for(const node of nodes)if(overlap(label,node))collisions.push([label.id,node.id]);for(const other of labels)if(label.id<other.id&&overlap(label,other))collisions.push([label.id,other.id]);}
     for(const edge of edges){const points=edge.points.map(p=>[edge.x+p[0],edge.y+p[1]]);for(const node of nodes.filter(n=>n.id!==edge.startBinding.elementId&&n.id!==edge.endBinding.elementId))for(let j=1;j<points.length;j++)if(segmentEnters(points[j-1],points[j],node)){collisions.push([edge.id,'route crosses '+node.id]);break;}}
     for(const boundary of view.boundaries){const r=byId.get(boundary.id),title=byId.get(boundary.id+'-title');assert.equal(norm(title?.text),norm(boundary.label.replace(/<br\s*\/?\s*>/gi,' ')),`${file}: boundary title differs from model`);for(const node of nodes){if(boundary.nodes.includes(node.id))assert(node.x>=r.x&&node.y>=r.y&&node.x+node.width<=r.x+r.width+1&&node.y+node.height<=r.y+r.height+1,`${file}: ${node.id} outside ${boundary.id}`);else assert(!overlap(r,node),`${file}: outsider ${node.id} inside ${boundary.id}`);if(overlap(title,node))collisions.push([title.id,node.id]);}}
     assert.deepEqual(collisions,[],`${file}: geometry collisions`);
     results.push({file,nodes:nodes.length,relationships:edges.length,geometry:'no overlaps'});
   }else{const dynamic=dynamicViews.find(view=>view.id===board.id);assert.equal(dynamic.number,board.file.slice(0,2),'Dynamic numbering must preserve its public identity');assert.equal(scene.elements.filter(e=>e.type==='arrow').length,dynamic.steps.length);for(const participant of dynamic.participants)assertVisibleNode(scene,participant.id,participant,file);for(const [n,step] of dynamic.steps.entries())assert.equal(norm(scene.elements.find(e=>e.id===`step-${n}-label`).text),norm(`${String(n+1).padStart(2,'0')} ${step.label}`));results.push({file,participants:dynamic.participants.length,interactions:dynamic.steps.length});}
 }
 const atlas=JSON.parse(fs.readFileSync(path.join(folder,collection.atlas+'.excalidraw'),'utf8'));assert.equal(atlas.elements.filter(e=>e.type==='frame').length,scenes.length);assert.equal(atlas.elements.length,scenes.reduce((s,b)=>s+b.scene.elements.length,0)+scenes.length);
 for(const {board,scene} of scenes){const prefix=board.file.slice(0,2)+'-';const frame=atlas.elements.find(element=>element.id===prefix+'frame');assert.ok(frame,`Atlas missing ${board.id}`);for(const element of scene.elements){const copy=atlas.elements.find(candidate=>candidate.id===prefix+element.id);assert.ok(copy,`Atlas missing ${board.id}/${element.id}`);assert.equal(copy.frameId,frame.id);if(element.type==='text')assert.equal(copy.text,element.text,`Atlas text differs: ${board.id}/${element.id}`);}}
 if(process.argv.includes('--static')) { console.log(JSON.stringify({scenes:scenes.length,atlasFrames:scenes.length,checks:results},null,2)); return; }
 fs.mkdirSync(qa,{recursive:true});
 const {chromium}=playwrightModule();
 const browser=await chromium.launch({headless:true});
 try{
   const page=await browser.newPage({viewport:{width:1600,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/*',route=>{const url=new URL(route.request().url());const font=url.pathname.match(/fonts\/(.+)$/);if(font){const p=path.resolve(runtime,'node_modules/@excalidraw/excalidraw/dist/prod/fonts',font[1]);const base=path.resolve(runtime,'node_modules/@excalidraw/excalidraw/dist/prod/fonts');if(p.startsWith(base+path.sep)&&fs.existsSync(p))return route.fulfill({path:p});}return route.abort();});
   await page.setContent('<!doctype html><html><body></body></html>');
   await page.addStyleTag({path:path.join(runtime,'node_modules/@excalidraw/excalidraw/dist/prod/index.css')});
   await page.addScriptTag({path:path.join(root,'tmp/diagrams/generator.js')});
   await page.evaluate(async()=>{const f=await new FontFace('Helvetica','local("Arial")').load();document.fonts.add(f);});
   await page.evaluate(scene=>window.mountExcalidraw(scene),scenes[0].scene);await page.waitForFunction(()=>!!window.excalidrawAPI);await page.waitForTimeout(800);
   for(const {file,scene} of [...scenes,{file:collection.atlas+'.excalidraw',scene:atlas}]){
     const roundtrip=await page.evaluate(async scene=>{const restored=await window.POS_EXCALIDRAW.E.loadFromBlob(new Blob([JSON.stringify(scene)],{type:'application/json'}),null,null);window.excalidrawAPI.updateScene({elements:restored.elements});await new Promise(r=>setTimeout(r,150));return {count:window.excalidrawAPI.getSceneElements().length,images:window.excalidrawAPI.getSceneElements().filter(e=>e.type==='image').length};},scene);assert.equal(roundtrip.count,scene.elements.length);assert.equal(roundtrip.images,0);
   }
   await page.evaluate(scene=>{window.excalidrawAPI.updateScene({elements:scene.elements,appState:{zoom:{value:0.65},scrollX:30,scrollY:-300}});},scenes[0].scene);await page.waitForTimeout(250);
   const before=await page.evaluate(()=>{const api=window.excalidrawAPI,s=api.getAppState(),els=api.getSceneElements(),n=els.find(e=>e.id==='cashier'),a=els.find(e=>e.id==='cashier_pos');return {x:(n.x+15+s.scrollX)*s.zoom.value+s.offsetLeft,y:(n.y+15+s.scrollY)*s.zoom.value+s.offsetTop,nodeX:n.x,arrowX:a.x,arrowY:a.y};});
   await page.mouse.move(before.x,before.y);await page.mouse.down();await page.mouse.move(before.x+85,before.y+40,{steps:12});await page.mouse.up();await page.waitForTimeout(200);
   const after=await page.evaluate(()=>{const e=window.excalidrawAPI.getSceneElements(),n=e.find(e=>e.id==='cashier'),a=e.find(e=>e.id==='cashier_pos');return {nodeX:n.x,arrowX:a.x,arrowY:a.y,start:a.startBinding?.elementId,end:a.endBinding?.elementId};});
   assert(Math.abs(after.nodeX-before.nodeX)>30,'Drag must move node');assert.equal(after.start,'cashier');assert.equal(after.end,'pos');assert(Math.abs(after.arrowX-before.arrowX)+Math.abs(after.arrowY-before.arrowY)>10,'Bound arrow must follow node');
   await page.screenshot({path:path.join(qa,'native-editor-drag.png')});
   assert.deepEqual(errors,[]);results.push({roundtrip:`${scenes.length} scenes + atlas via official loadFromBlob`,drag:'node, bound text and attached arrow remain editable',errors});
 }finally{await browser.close();}
 fs.writeFileSync(path.join(qa,'validation.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
