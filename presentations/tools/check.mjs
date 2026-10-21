import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire(path.join(root,'apps/starlight/package.json'));
const {chromium}=require('playwright');
const {servePublic}=require(path.join(root,'apps/starlight/scripts/serve.cjs'));
const result=path.join(root,'test-results-presentations');fs.mkdirSync(result,{recursive:true});
const server=await servePublic(0);
const origin=`http://127.0.0.1:${server.address().port}`;
const url=origin+'/presentations/architecture/';
const browser=await chromium.launch({headless:true});
const errors=[],failedRequests=[],overflow=[];
try{
  const context=await browser.newContext({viewport:{width:1600,height:954},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('requestfailed',request=>failedRequests.push(request.url()));
  page.on('response',response=>{if(response.status()>=400)failedRequests.push(`${response.status()} ${response.url()}`);});
  const response=await page.goto(url);
  assert.ok(response.headers()['content-security-policy'].includes("script-src 'self'"));
  await page.waitForFunction(()=>window.posPresentation?.isReady());
  assert.equal(await page.locator('.slides>section').count(),16);
  for(let i=0;i<16;i++){
    await page.evaluate(i=>window.posPresentation.slide(i),i);
    await page.waitForFunction(i=>document.querySelector('#status').textContent.startsWith(`${i+1} /`),i);
    await page.screenshot({path:path.join(result,`slide-${i+1}.png`)});
    const issues=await page.locator('.slides>section.present .text').evaluateAll(nodes=>nodes.flatMap(node=>{
      const box=node.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(node);
      const content=range.getBoundingClientRect();
      const scale=document.querySelector('.slides').getBoundingClientRect().width/1280;
      return content.right>box.right+2*scale||content.bottom>box.bottom+4*scale
        ?[{text:node.textContent,overflowX:Math.round((content.right-box.right)/scale),overflowY:Math.round((content.bottom-box.bottom)/scale)}]:[];
    }));
    overflow.push(...issues.map(x=>({slide:i+1,...x})));
  }
  await page.keyboard.press('Home');
  await page.waitForFunction(()=>window.posPresentation.getIndices().h===0);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(()=>window.posPresentation.getIndices().h===1);
  await page.reload();await page.waitForFunction(()=>window.posPresentation?.getIndices().h===1);
  await page.locator('#index').click();await page.locator('[data-slide="11"]').click();
  assert.equal(await page.locator('#status').textContent(),'12 / 16');
  await page.locator('#notes').click();
  assert.ok((await page.locator('#notes-body').textContent()).includes('Secuencia propuesta'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#notes-dialog').evaluate(d=>d.open),false);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'notes');
  await page.locator('#index').click();await page.keyboard.press('Escape');
  await page.keyboard.press('o');assert.equal(await page.evaluate(()=>window.posPresentation.isOverview()),true);
  await page.keyboard.press('o');
  // A monorepo step is a native Reveal fragment, not a slide or an autoplay timer.
  await page.evaluate(()=>window.posPresentation.slide(3,0,-1));
  const zones=['apps','business','frontend','backend','shared','transition','delivery'];
  for(let step=0;step<zones.length;step++){
    if(step)await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>window.posPresentation.getIndices().h),3);
    assert.equal(await page.locator('[data-zone-step][aria-current]').getAttribute('data-zone-step'),String(step));
    const state=await page.locator('#slide-4').evaluate(section=>{
      const panel=section.querySelector('.tree-panel'),frame=panel.getBoundingClientRect();
      const active=[...panel.querySelectorAll('.is-active')];
      return {zones:[...new Set(active.map(row=>row.dataset.zone))],visible:active.every(row=>{
        const box=row.getBoundingClientRect();return box.top>=frame.top&&box.bottom<=frame.bottom;
      }),overflow:[...panel.querySelectorAll('.tree-description')].filter(node=>node.scrollWidth>node.clientWidth).map(n=>n.textContent),scroll:panel.scrollTop};
    });
    assert.deepEqual(state.zones,[zones[step]]);assert.ok(state.visible,`Active zone ${step} must be completely visible`);
    assert.deepEqual(state.overflow,[],`Monorepo descriptions must fit`);
    if(step>1)assert.ok(state.scroll>0);
    await page.screenshot({path:path.join(result,`monorepo-zone-${step+1}.png`)});
  }
  await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>window.posPresentation.getIndices().h),4);
  await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>window.posPresentation.getIndices().h),3);
  assert.equal(await page.locator('[data-zone-step][aria-current]').getAttribute('data-zone-step'),'6');
  await page.locator('[data-zone-step="3"]').click();
  await page.waitForFunction(()=>location.hash.endsWith('/2'));
  await page.reload();await page.waitForFunction(()=>window.posPresentation?.isReady());
  assert.equal(await page.locator('[data-zone-step][aria-current]').getAttribute('data-zone-step'),'3');
  await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('[data-zone-step][aria-current]').getAttribute('data-zone-step'),'2');
  await page.locator('[data-zone-step="0"]').click();
  await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>window.posPresentation.getIndices().h),2);
  const links=await page.locator('a[href]').evaluateAll(nodes=>[...new Set(nodes.map(a=>a.href))]);
  for(const href of links){if(!href.startsWith(origin))continue;const res=await context.request.get(href);assert.equal(res.status(),200,href);}
  const download=await context.request.get(url+'downloads/Implementos-POS-Platform-Arquitectura-y-Roadmap.pptx');
  assert.equal(download.headers()['content-type'],'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  await page.setViewportSize({width:390,height:844});await page.goto(url+'#/slide-12');await page.waitForFunction(()=>window.posPresentation?.isReady());
  await page.screenshot({path:path.join(result,'mobile.png')});
  assert.ok(await page.locator('#index').isVisible());await page.locator('#index').click();await page.locator('[data-slide="15"]').click();
  assert.equal(await page.locator('#status').textContent(),'16 / 16');
  await page.locator('#index').click();await page.locator('[data-slide="3"]').click();
  await page.locator('[data-zone-step="6"]').click();
  assert.equal(await page.locator('[data-zone-step][aria-current]').getAttribute('data-zone-step'),'6');
  await page.setViewportSize({width:1600,height:954});
  await page.goto(url+'?print-pdf');await page.waitForFunction(()=>document.querySelectorAll('.pdf-page').length===16);
  assert.ok(await page.locator('.monorepo-static').isVisible());assert.equal(await page.locator('.monorepo-tour').isVisible(),false);
  await page.pdf({path:path.join(result,'architecture.pdf'),printBackground:true,preferCSSPageSize:true});
  const reader=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const reading=await reader.newPage();await reading.goto(url+'reading.html');
  assert.equal(await reading.locator('article').count(),16);
  assert.ok(await reading.locator('h1').isVisible());
  assert.ok((await reading.locator('.tree-reading').textContent()).includes('[mover]'));
  fs.writeFileSync(path.join(result,'report.json'),JSON.stringify({slides:16,errors,failedRequests,overflow},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);assert.deepEqual(overflow,[],'Text exceeds its editable box; inspect report.json');
  console.log('Presentations: 16 slides; navigation, reload, index, notes, focus, overview, mobile, links, download, print and no-JS reading passed.');
}finally{
  fs.writeFileSync(path.join(result,'report.json'),JSON.stringify({slides:16,errors,failedRequests,overflow},null,2));
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
