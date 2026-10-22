/* Rebuild the editable C4 boards with official Excalidraw APIs. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const runtime=path.resolve(process.env.EXCALIDRAW_RUNTIME||path.join(root,'tools/diagrams/runtime'));
const output=path.join(root,'docs/diagramas-excalidraw');
const qa=path.join(root,'tmp/diagrams/excalidraw');
function playwrightModule(){for(const candidate of [process.env.PLAYWRIGHT_MODULE_PATH,'playwright',path.join(root,'apps/starlight/node_modules/playwright')].filter(Boolean)){try{return require(candidate);}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;}}throw new Error('Set PLAYWRIGHT_MODULE_PATH to an installed Playwright package.');}
const playwright=playwrightModule();
const {collection,byId,assertModels}=require('./collection.cjs');

(async()=>{
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(qa,{recursive:true});
await require(path.join(runtime,'node_modules/esbuild')).build({entryPoints:[path.join(__dirname,'excalidraw-browser.js')],nodePaths:[path.join(runtime,'node_modules')],bundle:true,outfile:path.join(root,'tmp/diagrams/generator.js'),format:'iife',define:{'process.env.NODE_ENV':'"production"'},loader:{'.woff2':'dataurl','.woff':'dataurl','.ttf':'dataurl'}});
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'tools/diagrams/models/c4-data.js'),'utf8'),ctx);const model=ctx.window.POS_C4;
const dynamic=require(path.join(root,'tools/diagrams/models/dynamic-data.cjs'));
assertModels(model,dynamic);
ctx.window.POS_DIAGRAMS=JSON.parse(fs.readFileSync(path.join(__dirname,'models/c4-layouts.json'),'utf8'));
const browser=await playwright.chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body></body></html>');
  await page.addScriptTag({path:path.join(root,'tmp/diagrams/generator.js')});
  await page.evaluate(async()=>{const face=await new FontFace('Helvetica','local("Arial")').load();document.fonts.add(face);await document.fonts.ready;});
  const boards=[];
  for(const view of model.views){
    const svg=ctx.window.POS_DIAGRAMS[view.key].svg;
    const entry=byId.get(view.id);
    const board=await page.evaluate(payload=>window.POS_EXCALIDRAW.structure(payload),{view,model,svg,number:entry.file.slice(0,2)});boards.push(board);console.log(`Generated ${entry.file}: ${board.scene.elements.length} native elements`);
  }
  for(const view of dynamic){const board=await page.evaluate(view=>window.POS_EXCALIDRAW.dynamic(view),view);boards.push(board);console.log(`Generated ${byId.get(view.id).file}: ${board.scene.elements.length} native elements`);}
  boards.sort((a,b)=>collection.boards.findIndex(entry=>entry.id===a.id)-collection.boards.findIndex(entry=>entry.id===b.id));
  for(const board of boards){
    const name=byId.get(board.id).file;
    fs.writeFileSync(path.join(output,name+'.excalidraw'),JSON.stringify(board.scene,null,2)+'\n');
    fs.writeFileSync(path.join(output,name+'.svg'),board.svg);
    const preview=await browser.newPage({viewport:{width:1600,height:1000}});await preview.setContent(`<html><body style="margin:0;background:#e5e7eb">${board.svg}</body></html>`);
    await preview.locator('svg').evaluate(svg=>{svg.style.width='1600px';svg.style.height='auto';});
    await preview.locator('svg').screenshot({path:path.join(qa,name+'.png'),timeout:30000});await preview.close();
  }
  const atlas=await page.evaluate(boards=>window.POS_EXCALIDRAW.atlas(boards),boards.map(b=>({...b,svg:undefined})));
  fs.writeFileSync(path.join(output,collection.atlas+'.excalidraw'),JSON.stringify(atlas,null,2)+'\n');
  fs.writeFileSync(path.join(qa,'manifest.json'),JSON.stringify({boards:boards.map(b=>({id:b.id,title:b.title,name:byId.get(b.id).file,width:b.width,height:b.height,elements:b.scene.elements.length})),errors},null,2));
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(`${boards.length} boards + atlas saved. Renderer completed without JavaScript errors.`);
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
