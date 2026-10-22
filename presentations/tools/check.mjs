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
const errors=[],failedRequests=[],overflow=[],diagrams=[],visualChecks=[];
const deck=JSON.parse(fs.readFileSync(path.join(root,'presentations/architecture/deck.json'),'utf8'));
const diagramSlides=[3,6,7,8,9,10].map(number=>deck.slides[number-1]);
const normalizeLabel=text=>text.replace(/\s+/gu,' ').trim();
function observe(page){
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('requestfailed',request=>failedRequests.push(request.url()));
  page.on('response',response=>{if(response.status()>=400)failedRequests.push(`${response.status()} ${response.url()}`);});
}
async function waitForSlide(page,index){
  await page.waitForFunction(index=>{
    const deck=window.posPresentation,slide=deck?.getCurrentSlide();
    return deck?.isReady()&&deck.getIndices().h===index&&slide?.classList.contains('present')&&
      Number(getComputedStyle(slide).opacity)===1&&slide.getAnimations({subtree:true}).every(animation=>!['running','pending'].includes(animation.playState));
  },index);
  await page.evaluate(()=>document.fonts.ready);
}
async function viewerGeometry(page){
  return page.locator('#diagram-viewport').evaluate(viewport=>{
    const image=viewport.querySelector('#diagram-image'),box=viewport.getBoundingClientRect(),picture=image.getBoundingClientRect();
    return {width:picture.width,height:picture.height,layoutWidth:image.offsetWidth,layoutHeight:image.offsetHeight,
      availableWidth:viewport.clientWidth,availableHeight:viewport.clientHeight,
      transform:getComputedStyle(image).transform,
      centerX:(box.left+viewport.clientLeft+viewport.clientWidth/2-picture.left)/picture.width,
      centerY:(box.top+viewport.clientTop+viewport.clientHeight/2-picture.top)/picture.height};
  });
}
async function waitForDiagram(page){
  await page.waitForFunction(()=>{
    const image=document.querySelector('#diagram-image');
    return document.querySelector('#diagram-dialog')?.open&&image?.complete&&image.naturalWidth>0&&image.getBoundingClientRect().width>0;
  });
}
async function assertFittedDiagram(page,label){
  const geometry=await viewerGeometry(page);
  assert.ok(geometry.width<=geometry.availableWidth+2&&geometry.height<=geometry.availableHeight+2,`${label}: fit contains the complete diagram`);
  assert.ok(Math.abs(geometry.centerX-.5)<.025&&Math.abs(geometry.centerY-.5)<.025,`${label}: fit centers the diagram`);
  assert.equal(geometry.transform,'none',`${label}: image uses layout dimensions rather than CSS transform scaling`);
  assert.ok(Math.abs(geometry.layoutWidth-geometry.width)<1&&Math.abs(geometry.layoutHeight-geometry.height)<1,`${label}: rendered dimensions agree with layout dimensions`);
  return geometry;
}
try{
  const context=await browser.newContext({viewport:{width:1600,height:954},reducedMotion:'reduce'});
  const page=await context.newPage();
  observe(page);
  const response=await page.goto(url);
  assert.ok(response.headers()['content-security-policy'].includes("script-src 'self'"));
  await page.waitForFunction(()=>window.posPresentation?.isReady());
  assert.equal(await page.locator('.slides>section').count(),16);
  assert.deepEqual(await page.locator('.slides>section[data-diagram-src]').evaluateAll(nodes=>nodes.map(node=>node.id)),diagramSlides.map(slide=>slide.id),'Exactly the six source diagrams expose vector detail');
  for(const slide of diagramSlides){
    const section=page.locator(`#${slide.id}`),href=`diagrams/${slide.id}.svg`;
    assert.equal(await section.getAttribute('data-diagram-src'),href);
    assert.ok(Number(await section.getAttribute('data-diagram-width'))>0&&Number(await section.getAttribute('data-diagram-height'))>0,'Viewer dimensions come from diagram metadata');
    const inline=section.locator('svg[role="img"]');
    assert.equal(await inline.count(),1,`${slide.id}: diagram remains vector markup within Reveal`);
    assert.ok((await inline.locator('title').first().textContent()).trim(),`${slide.id}: inline diagram has an accessible title`);
    const resource=await context.request.get(url+href);
    assert.equal(resource.status(),200,`${slide.id}: standalone SVG is published`);
    assert.equal(resource.headers()['content-type'].split(';')[0],'image/svg+xml',`${slide.id}: SVG MIME type`);
    const svg=await resource.text();
    const structure=await page.evaluate(markup=>{
      const xml=new DOMParser().parseFromString(markup,'image/svg+xml'),svg=xml.documentElement;
      const labels=[...svg.querySelectorAll('[data-label]')].map(node=>node.getAttribute('data-label'));
      const titles=[...svg.querySelectorAll('title')].map(node=>node.textContent);
      const links=[...svg.querySelectorAll('*')].flatMap(node=>[...node.attributes].filter(attribute=>attribute.localName==='href').map(attribute=>attribute.value));
      return {parserErrors:xml.querySelectorAll('parsererror').length,tag:svg.localName,labels,titles,
        descriptions:[...svg.querySelectorAll('desc')].map(node=>node.textContent),paths:svg.querySelectorAll('path').length,
        forbidden:svg.querySelectorAll('image,foreignObject,script').length,links,textNodes:svg.querySelectorAll('text').length};
    },svg);
    assert.equal(structure.parserErrors,0,`${slide.id}: valid SVG XML`);
    assert.equal(structure.tag,'svg');
    assert.ok(structure.paths>0,`${slide.id}: diagram uses vector paths`);
    assert.equal(structure.forbidden,0,`${slide.id}: no raster, HTML foreignObject or script embedded in SVG`);
    assert.equal(structure.textNodes,0,`${slide.id}: outlined glyphs do not depend on an installed font`);
    assert.doesNotMatch(svg,/@font-face|@import/iu,`${slide.id}: SVG does not load a font or stylesheet`);
    const cssUrls=[...svg.matchAll(/url\(\s*(?:["']([^"']*)["']|([^)]*))\s*\)/giu)].map(match=>(match[1]??match[2]).trim());
    assert.ok(cssUrls.every(reference=>reference.startsWith('#')),`${slide.id}: SVG paint resources are internal only`);
    assert.ok(structure.links.every(link=>link.startsWith('#')),`${slide.id}: SVG references are internal only`);
    assert.ok(structure.titles.some(title=>title.trim())&&structure.descriptions.some(description=>description.trim()),`${slide.id}: standalone SVG describes its content accessibly`);
    const expected=slide.elements.filter(element=>element.type==='text'&&element.position.top>=220&&element.position.top<630).map(element=>normalizeLabel(element.text)).sort();
    if(structure.labels.length)assert.deepEqual(structure.labels.map(normalizeLabel).sort(),expected,`${slide.id}: every original label is preserved exactly`);
    else for(const label of expected)assert.ok(structure.titles.map(normalizeLabel).includes(label),`${slide.id}: original label survives in an accessible title: ${label}`);
    diagrams.push({slide:slide.id,href,labels:expected.length,paths:structure.paths});
    await resource.dispose();
  }
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
  await page.evaluate(()=>window.posPresentation.slide(8));await waitForSlide(page,8);
  const diagramOpen=page.locator('#diagram-open'),diagramDialog=page.locator('#diagram-dialog');
  await diagramOpen.click();await waitForDiagram(page);
  assert.equal(await diagramDialog.evaluate(dialog=>dialog.closest('.reveal')),null,'The diagram dialog is outside Reveal scaling');
  assert.ok((await page.locator('#diagram-title').textContent()).includes(deck.slides[8].title),'Viewer identifies the current diagram');
  assert.equal(await page.locator('#diagram-viewport').getAttribute('tabindex'),'0','The scrollable diagram is keyboard focusable');
  assert.equal(await page.locator('#diagram-image').evaluate(image=>image.src),url+'diagrams/slide-9.svg');
  assert.ok((await page.locator('#diagram-image').getAttribute('alt'))?.trim(),'The viewer image has a text alternative');
  assert.equal(await page.locator('#diagram-image').getAttribute('aria-describedby'),'diagram-description');
  assert.equal(await page.locator('#diagram-description').textContent(),await page.locator('#slide-9 .diagram-figure svg desc').textContent(),'The modal exposes every source label to assistive technology');
  assert.ok(await page.locator('#diagram-image').evaluate(image=>{
    for(let parent=image.parentElement;parent;parent=parent.parentElement)if(getComputedStyle(parent).transform!=='none')return false;
    return true;
  }),'Viewer ancestors do not scale the image with a transform');
  await page.locator('#diagram-fit').click();
  const fitted=await assertFittedDiagram(page,'Desktop viewer');
  const fittedOutput=await page.locator('#diagram-zoom').textContent();
  await page.locator('#diagram-zoom-in').click();
  await page.waitForFunction(width=>document.querySelector('#diagram-image').getBoundingClientRect().width>width+1,fitted.width);
  const enlarged=await viewerGeometry(page);
  assert.equal(enlarged.transform,'none','Zoom does not magnify a transformed bitmap layer');
  assert.ok(enlarged.layoutWidth>fitted.layoutWidth&&Math.abs(enlarged.layoutWidth-enlarged.width)<1,'Zoom increases real image layout width');
  assert.ok(Math.abs(enlarged.centerX-.5)<.025&&Math.abs(enlarged.centerY-.5)<.025,'Zoom preserves the diagram center');
  assert.notEqual(await page.locator('#diagram-zoom').textContent(),fittedOutput,'Zoom indicator reflects the new scale');
  await page.locator('#diagram-zoom-out').click();
  await page.waitForFunction(width=>document.querySelector('#diagram-image').getBoundingClientRect().width<width-1,enlarged.width);
  const diagramDownload=page.locator('#diagram-download');
  assert.equal(await diagramDownload.evaluate(link=>link.href),url+'diagrams/slide-9.svg');
  assert.notEqual(await diagramDownload.getAttribute('download'),null,'Vector download is explicit');
  const [vectorDownload]=await Promise.all([page.waitForEvent('download'),diagramDownload.click()]);
  assert.equal(await vectorDownload.failure(),null,'Vector download succeeds in the browser');
  assert.equal(vectorDownload.suggestedFilename(),'slide-9.svg');
  await vectorDownload.delete();
  await page.locator('#diagram-viewport').focus();
  for(const key of ['ArrowRight','ArrowDown','PageDown',' '])await page.keyboard.press(key);
  assert.equal(await page.evaluate(()=>window.posPresentation.getIndices().h),8,'Keys in the diagram viewer never advance the presentation');
  await page.keyboard.press('Escape');
  assert.equal(await diagramDialog.evaluate(dialog=>dialog.open),false,'Escape closes the diagram');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'diagram-open','Closing returns focus to the diagram opener');
  await page.keyboard.press('d');await waitForDiagram(page);
  await page.keyboard.press('Escape');
  await page.evaluate(()=>window.posPresentation.slide(0));await waitForSlide(page,0);
  assert.ok(await diagramOpen.isHidden(),'Slides without diagrams do not show an empty viewer action');
  await page.keyboard.press('d');assert.equal(await diagramDialog.evaluate(dialog=>dialog.open),false,'The diagram shortcut is inactive on a slide without a diagram');
  await page.setViewportSize({width:320,height:720});
  await page.evaluate(()=>window.posPresentation.slide(8));await waitForSlide(page,8);
  await diagramOpen.click();await waitForDiagram(page);await page.locator('#diagram-fit').click();
  await assertFittedDiagram(page,'320px viewer');
  const narrow=await diagramDialog.evaluate(dialog=>{
    const box=dialog.getBoundingClientRect();return {left:box.left,right:box.right,width:document.documentElement.clientWidth,overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)};
  });
  assert.ok(narrow.left>=0&&narrow.right<=narrow.width+1&&narrow.overflow<=narrow.width+1,'The small-screen viewer never creates horizontal page overflow');
  await page.screenshot({path:path.join(result,'diagram-viewer-320.png')});
  await page.keyboard.press('Escape');await page.setViewportSize({width:1600,height:954});
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
  const reading=await reader.newPage();observe(reading);await reading.goto(url+'reading.html');
  assert.equal(await reading.locator('article').count(),16);
  assert.ok(await reading.locator('h1').isVisible());
  assert.ok((await reading.locator('.tree-reading').textContent()).includes('[mover]'));
  for(const slide of diagramSlides){
    const illustration=reading.locator(`article#${slide.id} figure img`);
    assert.equal(await illustration.count(),1,`${slide.id}: continuous reading includes the diagram`);
    assert.equal(await illustration.evaluate(image=>image.src),url+`diagrams/${slide.id}.svg`);
    assert.ok((await illustration.getAttribute('alt'))?.trim(),`${slide.id}: reading diagram has a text alternative`);
    await illustration.scrollIntoViewIfNeeded();
    await illustration.evaluate(image=>image.decode());
    assert.ok(await illustration.evaluate(image=>image.complete&&image.naturalWidth>0),`${slide.id}: SVG loads without JavaScript`);
  }
  await reader.close();
  for(const dpr of [1.25,2]){
    const display=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:dpr,reducedMotion:'no-preference'});
    const screen=await display.newPage();observe(screen);
    await screen.goto(url);await waitForSlide(screen,0);
    assert.equal(await screen.evaluate(()=>devicePixelRatio),dpr);
    for(const index of [2,8]){
      await screen.evaluate(index=>window.posPresentation.slide(index),index);await waitForSlide(screen,index);
      const stem=`diagram-${index+1}-1280-dpr-${String(dpr).replace('.','-')}`;
      await screen.screenshot({path:path.join(result,stem+'-slide.png')});
      await screen.locator('#diagram-open').click();await waitForDiagram(screen);await screen.locator('#diagram-fit').click();
      const fit=await assertFittedDiagram(screen,`${stem} viewer`);
      await screen.locator('#diagram-zoom-in').click();
      await screen.waitForFunction(width=>document.querySelector('#diagram-image').getBoundingClientRect().width>width+1,fit.width);
      assert.equal((await viewerGeometry(screen)).transform,'none',`${stem}: detailed SVG zoom stays outside Reveal transforms`);
      await screen.screenshot({path:path.join(result,stem+'-detail.png')});
      visualChecks.push({slide:index+1,dpr,viewport:{width:1280,height:720},motion:'normal',screenshots:[stem+'-slide.png',stem+'-detail.png']});
      await screen.keyboard.press('Escape');assert.equal(await screen.evaluate(()=>document.activeElement.id),'diagram-open');
    }
    await display.close();
  }
  fs.writeFileSync(path.join(result,'report.json'),JSON.stringify({slides:16,errors,failedRequests,overflow,diagrams,visualChecks},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);assert.deepEqual(overflow,[],'Text exceeds its editable box; inspect report.json');
  console.log('Presentations: 16 slides; navigation, notes, monorepo, six source-preserving SVG diagrams, keyboard viewer, real zoom, DPR 1.25/2, mobile, downloads, print and no-JS reading passed.');
}finally{
  fs.writeFileSync(path.join(result,'report.json'),JSON.stringify({slides:16,errors,failedRequests,overflow,diagrams,visualChecks},null,2));
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
