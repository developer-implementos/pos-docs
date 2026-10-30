import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { overview, renderOverview } from './overview.mjs';

const root = fileURLToPath(new URL('../../',import.meta.url));
const require = createRequire(path.join(root,'apps/starlight/package.json'));
const { chromium } = require('playwright');
const svgFile = path.join(root,'docs/architecture/pos-platform-overview.svg');
const output = path.join(root,'test-results-architecture/overview');
fs.mkdirSync(output,{ recursive:true });
assert.equal(fs.readFileSync(svgFile,'utf8'),renderOverview(),'The committed SVG matches the source.');
for (const id of ['country-redis-jobs','redis-jobs']) {
  assert.equal(overview.nodes.find(node=>node.id===id)?.optional,false,`${id} is selected infrastructure.`);
}
assert.equal(overview.nodes.find(node=>node.id==='redis-cache')?.optional,true,'Discardable cache remains optional.');
for (const id of ['country-api','erp-worker']) {
  assert.match(overview.nodes.find(node=>node.id===id)?.technology,/BullMQ/,'BullMQ belongs to an existing application.');
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport:{ width:1800,height:1325 },deviceScaleFactor:1 });
  const failures=[];
  page.on('pageerror',error=>failures.push(error.message));
  const source=fs.readFileSync(svgFile,'utf8');
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0}svg{display:block}</style></head><body>'+source.replace(/^<\?xml[^>]+>\s*/, '')+'</body></html>');
  assert.equal(await page.evaluate(svg=>new DOMParser().parseFromString(svg,'image/svg+xml').querySelectorAll('parsererror').length,source),0);
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('parsererror').count(),0,'The browser parses the SVG.');
  assert.equal(await page.locator('image,script,foreignObject').count(),0,'The SVG is self-contained vector geometry.');
  assert.equal(await page.locator('[data-kind="app"]').count(),7,'Seven application types.');
  assert.equal(await page.locator('[data-kind="component"]').count(),0,'No internal modules.');
  const bounds = await page.evaluate(()=>{
    const findings=[];
    for(const g of document.querySelectorAll('[data-node],[data-label]')){
      const box={ x:+g.dataset.x,y:+g.dataset.y,w:+g.dataset.w,h:+g.dataset.h };
      for(const text of g.querySelectorAll('text')){
        const b=text.getBBox();
        if(b.x<box.x+3||b.y<box.y+3||b.x+b.width>box.x+box.w-3||b.y+b.height>box.y+box.h-3)
          findings.push({ id:g.dataset.node||g.dataset.label,text:text.textContent,box,b:{x:b.x,y:b.y,width:b.width,height:b.height} });
      }
    }
    return findings;
  });
  const overlaps=[];
  const intersects=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>2&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>2;
  const crosses=(p,q,b)=>p[0]===q[0]
    ? p[0]>b.x+2&&p[0]<b.x+b.w-2&&Math.min(p[1],q[1])<b.y+b.h-2&&Math.max(p[1],q[1])>b.y+2
    : p[1]>b.y+2&&p[1]<b.y+b.h-2&&Math.min(p[0],q[0])<b.x+b.w-2&&Math.max(p[0],q[0])>b.x+2;
  for(let i=0;i<overview.nodes.length;i++)for(let j=i+1;j<overview.nodes.length;j++)
    if(intersects(overview.nodes[i],overview.nodes[j]))overlaps.push(`Nodes ${overview.nodes[i].id}/${overview.nodes[j].id}`);
  for(const edge of overview.edges){
    const [x,y,w,h]=edge.labelBox;
    for(const node of overview.nodes) if(intersects({x,y,w,h},node)) overlaps.push(`Label ${edge.id}/node ${node.id}`);
    for(const other of overview.edges) if(other.id!==edge.id)
      for(let i=1;i<other.points.length;i++) if(crosses(other.points[i-1],other.points[i],{x,y,w,h}))overlaps.push(`Label ${edge.id}/route ${other.id}`);
    for(const node of overview.nodes) if(node.id!==edge.from&&node.id!==edge.to)
      for(let i=1;i<edge.points.length;i++) if(crosses(edge.points[i-1],edge.points[i],node))overlaps.push(`Route ${edge.id}/node ${node.id}`);
  }
  for(let i=0;i<overview.edges.length;i++)for(let j=i+1;j<overview.edges.length;j++){
    const [x,y,w,h]=overview.edges[i].labelBox;const [xx,yy,ww,hh]=overview.edges[j].labelBox;
    if(intersects({x,y,w,h},{x:xx,y:yy,w:ww,h:hh}))overlaps.push(`Labels ${overview.edges[i].id}/${overview.edges[j].id}`);
  }
  const report={nodes:overview.nodes.length,edges:overview.edges.length,bounds,overlaps,failures};
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  await page.locator('svg').evaluate(node=>{node.setAttribute('width','1800');node.setAttribute('height','1325');});
  await page.screenshot({path:path.join(output,'pos-platform-overview.png'),fullPage:true,timeout:60000});
  await page.locator('svg').evaluate(node=>{node.setAttribute('width','3600');node.setAttribute('height','2650');});
  await page.setViewportSize({ width:3600,height:2650 });
  await page.screenshot({path:path.join(output,'pos-platform-overview-full.png'),timeout:60000});
  await page.screenshot({path:path.join(output,'clients-branch.png'),clip:{x:0,y:600,width:1720,height:1150}});
  await page.screenshot({path:path.join(output,'country-erp.png'),clip:{x:1880,y:600,width:1720,height:1370}});
  assert.deepEqual(bounds,[],'All text stays inside its card/label.');
  assert.deepEqual(overlaps,[],'No node/label overlaps.');
  assert.deepEqual(failures,[],'No browser errors.');
}finally{await browser.close();}
