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
const leafIds=[deck.cover,...deck.chapters.flatMap(chapter=>[`chapter-${chapter.id}`,...chapter.slides])];
const diagramSlides=[3,6,7,8,9,10].map(number=>deck.slides[number-1]);
const normalizeLabel=text=>text.replace(/\s+/gu,' ').trim();
function observe(page){
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('requestfailed',request=>failedRequests.push(request.url()));
  page.on('response',response=>{if(response.status()>=400)failedRequests.push(`${response.status()} ${response.url()}`);});
}
async function waitForLeaf(page,id){
  await page.waitForFunction(id=>{
    const deck=window.posPresentation,slide=deck?.getCurrentSlide();
    return deck?.isReady()&&slide?.id===id&&slide.classList.contains('present')&&
      Number(getComputedStyle(slide).opacity)===1&&slide.getAnimations({subtree:true}).every(animation=>!['running','pending'].includes(animation.playState));
  },id);
  await page.evaluate(()=>document.fonts.ready);
}
async function waitForSlide(page,index){await waitForLeaf(page,deck.slides[index].id);}
async function goToCover(page,chapter){
  await page.evaluate(id=>{
    const deck=window.posPresentation,position=deck.getIndices(document.getElementById(id));
    deck.slide(position.h,position.v,-1);
  },`chapter-${chapter.id}`);
  await waitForLeaf(page,`chapter-${chapter.id}`);
}
async function assertCoverFits(page,chapter,label){
  const layout=await page.locator(`#chapter-${chapter.id} .chapter-cover-body`).evaluate(body=>{
    const frame=body.getBoundingClientRect(),scale=window.posPresentation.getScale();
    const clipped=[...body.children].some(node=>{
      const range=document.createRange();range.selectNodeContents(node);const text=range.getBoundingClientRect();
      return text.left<frame.left-1||text.right>frame.right+1||text.top<frame.top-1||text.bottom>frame.bottom+1;
    });
    return {clipped,titleSize:parseFloat(getComputedStyle(body.querySelector('h2')).fontSize)*scale,
      summarySize:parseFloat(getComputedStyle(body.querySelector('.chapter-summary')).fontSize)*scale};
  });
  assert.equal(layout.clipped,false,`${label}: chapter title and scope fit the cover`);
  assert.ok(layout.titleSize>=28&&layout.summarySize>=16,`${label}: chapter title and scope remain readable at presentation size`);
}
async function goToSlide(page,index,fragment=-1){
  await page.evaluate(({id,fragment})=>{
    const deck=window.posPresentation,position=deck.getIndices(document.getElementById(id));
    deck.slide(position.h,position.v,fragment);
  },{id:deck.slides[index].id,fragment});
  await waitForSlide(page,index);
}
async function assertCurrentSlide(page,index,message){
  await waitForSlide(page,index);
  assert.equal(await page.evaluate(()=>window.posPresentation.getCurrentSlide().id),deck.slides[index].id,message);
}
async function assertOpeningNavigation(page){
  await waitForLeaf(page,deck.cover);
  const position=await page.evaluate(()=>window.posPresentation.getIndices());
  assert.equal(position.h,0);assert.equal(position.v,0);
  for(const direction of ['left','up','down'])assert.equal(await page.locator(`.navigate-${direction}`).evaluate(node=>node.classList.contains('enabled')),false,`The opening has no ${direction} route`);
  assert.equal(await page.locator('.navigate-right').evaluate(node=>node.classList.contains('enabled')),true,'The opening can advance to the first chapter');
  const routes=await page.evaluate(()=>window.posPresentation.availableRoutes());
  assert.equal(routes.left,false);assert.equal(routes.up,false);assert.equal(routes.down,false);assert.equal(routes.right,true);
  await page.locator('.reveal').focus();
  for(const key of ['ArrowDown','ArrowUp','ArrowLeft']){
    await page.keyboard.press(key);
    await waitForLeaf(page,deck.cover);
    assert.equal(await page.evaluate(()=>window.posPresentation.getCurrentSlide().id),deck.cover,`${key} cannot leave the standalone opening`);
  }
  await page.keyboard.press('ArrowRight');await waitForLeaf(page,'chapter-proposal');
  await page.keyboard.press('ArrowLeft');await waitForLeaf(page,deck.cover);
}
async function assertControlsFit(page,label){
  const boxes=await page.evaluate(()=>{
    const rect=node=>{const b=node.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom};};
    const controls=[...document.querySelectorAll('.reveal .controls button')].filter(node=>node.classList.contains('enabled'));
    const slide=window.posPresentation.getCurrentSlide();
    const content=slide.querySelector('.canvas');
    return {width:innerWidth,height:innerHeight,controls:controls.map(node=>({className:node.className,...rect(node),opacity:getComputedStyle(node).opacity,color:getComputedStyle(node).color})),
      content:rect(content),toolbar:rect(document.querySelector('.toolbar'))};
  });
  const overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
  for(const control of boxes.controls){
    assert.equal(Number(control.opacity),1,`${label}: available native arrows remain fully visible`);
    assert.equal(control.color,'rgb(5, 69, 186)',`${label}: native arrows use the corporate primary color`);
    assert.ok(control.left>=0&&control.right<=boxes.width+1&&control.top>=0&&control.bottom<=boxes.height+1,`${label}: native arrow is inside the viewport`);
    assert.ok(!overlaps(control,boxes.content),`${label}: native arrow does not cover slide content`);
    assert.ok(!overlaps(control,boxes.toolbar),`${label}: native arrow does not cover toolbar actions`);
  }
}
async function assertToolbar(page,label){
  const state=await page.locator('.toolbar').evaluate(toolbar=>({
    width:toolbar.clientWidth,scrollWidth:toolbar.scrollWidth,
    controls:[...toolbar.querySelectorAll(':scope > button,:scope > a')].filter(node=>node.getClientRects().length>0).map(node=>{
      const box=node.getBoundingClientRect();return {text:node.textContent.trim(),height:box.height,left:box.left,right:box.right};
    }),screen:innerWidth,
  }));
  assert.ok(state.scrollWidth<=state.width+1,`${label}: toolbar needs no horizontal scrolling`);
  for(const control of state.controls){
    assert.ok(control.height>=44,`${label}: ${control.text} has a 44px touch target`);
    assert.ok(control.left>=0&&control.right<=state.screen+1,`${label}: ${control.text} is entirely visible`);
  }
  const mobile=state.screen<=760;
  assert.equal(await page.locator('#notes').isVisible(),!mobile,`${label}: notes use the appropriate desktop or resource action`);
  assert.equal(await page.locator('.mobile-reading').isVisible(),mobile,`${label}: continuous reading is directly available on mobile`);
  assert.equal(await page.locator('#diagram-open').getAttribute('aria-label'),'Ampliar diagrama','Compact visible labels preserve the full accessible action name');
}
async function assertIndexSelection(page,index){
  const state=await page.locator('#index-dialog').evaluate((dialog,id)=>{
    const selected=dialog.querySelector(`[data-slide="${id}"][aria-current="step"]`);
    const other=dialog.querySelector('[data-slide]:not([aria-current])');
    const scroller=dialog.querySelector('.index-chapters');
    const box=selected.getBoundingClientRect(),frame=scroller.getBoundingClientRect();
    const header=dialog.querySelector('.dialog-heading').getBoundingClientRect();
    const close=dialog.querySelector('[data-close]').getBoundingClientRect();
    const current=getComputedStyle(selected),rest=getComputedStyle(other);
    return {focused:document.activeElement===selected,top:box.top,bottom:box.bottom,center:(box.top+box.bottom)/2,
      frameTop:frame.top,frameBottom:frame.bottom,frameCenter:(frame.top+frame.bottom)/2,
      scrollTop:scroller.scrollTop,maxScroll:scroller.scrollHeight-scroller.clientHeight,
      headerVisible:header.top>=0&&header.bottom<=innerHeight&&header.left>=0&&header.right<=innerWidth,
      closeVisible:close.top>=0&&close.bottom<=innerHeight&&close.left>=0&&close.right<=innerWidth,
      weight:Number(current.fontWeight),background:current.backgroundColor,otherBackground:rest.backgroundColor,
      border:current.borderColor,otherBorder:rest.borderColor};
  },typeof index==='string'?index:deck.slides[index].id);
  assert.ok(state.focused,'Opening the index focuses the current slide');
  assert.ok(state.headerVisible&&state.closeVisible,'The index heading and Close action remain visible when focusing the current slide');
  assert.ok(state.top>=state.frameTop&&state.bottom<=state.frameBottom,'The selected slide is visible without searching through the index');
  if(state.scrollTop>1&&state.scrollTop<state.maxScroll-1)assert.ok(Math.abs(state.center-state.frameCenter)<=3,'The current index row is centered where scrolling allows it');
  assert.ok(state.weight>=700,'The current index row has a distinct font weight');
  assert.notEqual(state.background,state.otherBackground,'The current index row has a distinct tonal background');
  assert.notEqual(state.border,state.otherBorder,'The current index row has a distinct border');
}
async function waitForResources(page,open){
  await page.waitForFunction(open=>document.querySelector('#resources-panel').matches(':popover-open')===open,open);
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
  assert.equal(await page.locator('.slides>section').count(),6,'The standalone opening precedes five horizontal chapters');
  assert.equal(await page.locator('.slides section[data-leaf]').count(),21,'One opening, five chapter covers and fifteen details make up the presentation');
  assert.equal(await page.locator('.slides section[data-chapter-cover]').count(),5,'Each chapter has its own cover');
  assert.deepEqual(await page.evaluate(()=>window.posPresentation.getSlides().map(slide=>slide.id)),leafIds,'Native slide order inserts chapter covers without changing existing detail IDs or order');
  assert.equal(await page.locator(`.slides > section#${deck.cover}[data-leaf]`).count(),1,'The opening is a direct child of the slide deck');
  assert.equal(await page.locator(`#${deck.cover} section`).count(),0,'The opening has no nested slides');
  await assertOpeningNavigation(page);
  await page.goto(url+`#/${deck.cover}`);
  await assertOpeningNavigation(page);
  await page.reload();await assertOpeningNavigation(page);
  await assertControlsFit(page,'Standalone opening navigation');
  await page.screenshot({path:path.join(result,'opening-navigation.png')});
  assert.equal(await page.locator('#index-dialog [data-slide]').count(),21,'The index includes every cover and detail slide');
  assert.equal(await page.locator('#index-dialog h3 button[data-slide]').count(),5,'Chapter headings are actionable cover links');
  assert.equal(await page.locator(`#index-dialog [data-slide="${deck.cover}"]`).count(),1,'The opening appears once in the index');
  assert.equal(await page.locator(`#index-dialog [data-slide="${deck.cover}"]`).evaluate(node=>!!node.closest('.index-chapter')),false,'The index opening is independent of chapter details');
  await page.locator('#index').click();await assertIndexSelection(page,deck.cover);
  await page.keyboard.press('Escape');
  for(const [h,chapter] of deck.chapters.entries()){
    const stack=page.locator(`#stack-${chapter.id}`),cover=stack.locator(`[data-chapter-cover]`);
    assert.equal(await stack.getAttribute('data-chapter'),chapter.id);
    assert.equal(await stack.getAttribute('data-start-indexv'),'0','Horizontal navigation always enters the chapter cover');
    assert.equal(await cover.getAttribute('id'),`chapter-${chapter.id}`);
    assert.equal((await cover.locator('h2').textContent()).trim(),chapter.title);
    assert.equal((await cover.locator('.chapter-summary').textContent()).trim(),chapter.summary);
    assert.equal((await cover.locator('aside.notes').textContent()).trim(),chapter.summary);
    assert.deepEqual(await stack.locator(':scope > section[data-leaf]').evaluateAll(nodes=>nodes.map(node=>node.id)),[`chapter-${chapter.id}`,...chapter.slides]);
    await goToCover(page,chapter);
    const position=await page.evaluate(()=>window.posPresentation.getIndices());
    assert.equal(position.h,h+1);assert.equal(position.v,0);
    assert.equal(await cover.getAttribute('data-chapter-number'),String(h+1),'Editorial chapter numbering excludes the standalone opening');
    assert.equal((await cover.locator('.chapter-kicker').textContent()).replace(/\s+/gu,' ').trim(),`Capítulo ${String(h+1).padStart(2,'0')} / 05`);
    assert.equal((await page.locator(`#index-chapter-${chapter.id} .index-chapter-number`).textContent()).trim(),String(h+1).padStart(2,'0'));
    await assertControlsFit(page,`Chapter ${chapter.id} navigation`);
    await assertCoverFits(page,chapter,`Chapter ${chapter.id}`);
    await page.screenshot({path:path.join(result,`chapter-${chapter.id}.png`)});
  }
  for(const viewport of [{width:1280,height:800},{width:1920,height:1080}]){
    await page.setViewportSize(viewport);
    for(const chapter of deck.chapters){
      await goToCover(page,chapter);
      await assertCoverFits(page,chapter,`${chapter.id} at ${viewport.width}x${viewport.height}`);
      await assertControlsFit(page,`${chapter.id} at ${viewport.width}x${viewport.height}`);
      await page.screenshot({path:path.join(result,`chapter-${chapter.id}-${viewport.width}.png`)});
    }
  }
  await page.setViewportSize({width:1600,height:954});
  assert.deepEqual(await page.locator('.slides section[data-diagram-src]').evaluateAll(nodes=>nodes.map(node=>node.id)),diagramSlides.map(slide=>slide.id),'Exactly the six source diagrams expose vector detail');
  assert.equal(await page.evaluate(()=>window.posPresentation.getConfig().controls),true,'Reveal supplies the native navigation controls');
  assert.equal(await page.evaluate(()=>window.posPresentation.getConfig().navigationMode),'default','Arrows use Reveal horizontal and vertical navigation');
  assert.equal(await page.locator('#next,#previous,#status').count(),0,'There is no competing flat navigation toolbar');
  assert.equal(await page.locator(':root').evaluate(node=>getComputedStyle(node).getPropertyValue('--primary').trim().toUpperCase()),'#0545BA','The UI exposes the requested corporate primary color');
  assert.equal(await page.locator('#slide-2 .slide-title').evaluate(node=>getComputedStyle(node).color),'rgb(5, 69, 186)','Generated HTML slide headings use the same corporate primary');
  await assertToolbar(page,'Desktop toolbar');
  assert.equal(await page.evaluate(()=>window.posPresentation.getConfig().transition),'none','Reduced motion disables Reveal transitions initially');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>window.posPresentation.getConfig().transition==='slide');
  assert.notEqual(await page.locator('#index').evaluate(node=>getComputedStyle(node).transitionDuration),'0s','CSS feedback follows the live motion preference');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>window.posPresentation.getConfig().transition==='none');
  assert.equal(await page.locator('#index').evaluate(node=>getComputedStyle(node).transitionDuration),'0s','Reduced motion also removes CSS transition effects live');
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
    assert.match(svg,/#0545BA/iu,`${slide.id}: standalone SVG uses the corporate primary color`);
    assert.doesNotMatch(svg,/#006DB6/iu,`${slide.id}: old primary blue is not retained in a generated diagram`);
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
    await goToSlide(page,i);
    const coordinate=await page.evaluate(()=>window.posPresentation.getIndices());
    const expectedNumber=deck.slides[i].id===deck.cover?String(coordinate.h+1):`${coordinate.h+1}.${coordinate.v+1}`;
    assert.equal((await page.locator('.slide-number').textContent()).replace(/\s+/gu,''),expectedNumber,'Native numbering identifies standalone or vertical slide coordinates');
    await page.screenshot({path:path.join(result,`slide-${i+1}.png`)});
    const issues=await page.locator(`[data-leaf].present .text`).evaluateAll(nodes=>nodes.flatMap(node=>{
      const box=node.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(node);
      const content=range.getBoundingClientRect();
      const scale=document.querySelector('.slides').getBoundingClientRect().width/1280;
      return content.right>box.right+2*scale||content.bottom>box.bottom+4*scale
        ?[{text:node.textContent,overflowX:Math.round((content.right-box.right)/scale),overflowY:Math.round((content.bottom-box.bottom)/scale)}]:[];
    }));
    overflow.push(...issues.map(x=>({slide:i+1,...x})));
  }
  // Horizontal entry always uses the cover, even after visiting every detail.
  await goToSlide(page,0);
  await assertOpeningNavigation(page);
  await goToCover(page,deck.chapters[0]);
  assert.equal(await page.locator('.navigate-left').evaluate(node=>node.classList.contains('enabled')),true,'The first chapter can return to the opening');
  assert.equal(await page.locator('.navigate-up').evaluate(node=>node.classList.contains('enabled')),false,'A chapter cover has no upper slide');
  await page.keyboard.press('ArrowDown');await assertCurrentSlide(page,1);
  await page.keyboard.press('ArrowUp');await waitForLeaf(page,'chapter-proposal');
  await page.keyboard.press('ArrowRight');
  await waitForLeaf(page,'chapter-structure');
  await page.keyboard.press('ArrowLeft');await waitForLeaf(page,'chapter-proposal');
  await page.keyboard.press('ArrowLeft');await waitForLeaf(page,deck.cover);
  // Space follows all covers, details and native fragments in canonical order.
  await page.locator('.reveal').focus();
  for(let index=0;index<leafIds.length;index++){
    await waitForLeaf(page,leafIds[index]);
    if(index===leafIds.length-1)break;
    let presses=0;
    while(await page.evaluate(()=>window.posPresentation.getCurrentSlide().id)===leafIds[index]){
      assert.ok(presses++<12,`Space must leave ${leafIds[index]} after its native fragments`);
      await page.keyboard.press('Space');
    }
    await waitForLeaf(page,leafIds[index+1]);
  }
  await goToSlide(page,10);
  await goToSlide(page,8);
  for(const direction of ['left','right','up','down'])assert.equal(await page.locator(`.navigate-${direction}`).evaluate(node=>node.classList.contains('enabled')),true,`The middle integration slide enables ${direction}`);
  await assertControlsFit(page,'Desktop navigation');
  await page.locator('.navigate-up').click();await assertCurrentSlide(page,7);
  await page.locator('.navigate-down').click();await assertCurrentSlide(page,8);
  await page.locator('.navigate-right').click();await waitForLeaf(page,'chapter-delivery-roadmap');
  await page.locator('.navigate-left').click();await waitForLeaf(page,'chapter-erp-integration');
  await page.locator('.navigate-down').click();await assertCurrentSlide(page,7,'Down enters the first detail beneath the chapter cover');
  await page.locator('.navigate-down').click();await assertCurrentSlide(page,8);
  await page.locator('.navigate-up').focus();
  await page.keyboard.press('Space');
  await assertCurrentSlide(page,7,'Space activates the focused native up arrow once instead of advancing sequentially');
  await page.locator('.navigate-down').focus();
  await page.keyboard.press('Space');
  await assertCurrentSlide(page,8,'Space activates the focused native down arrow once');
  await page.locator('#index').focus();
  await page.keyboard.press('Space');
  assert.equal(await page.locator('#index-dialog').evaluate(dialog=>dialog.open),true,'Space opens the focused toolbar index button');
  await assertIndexSelection(page,8);
  assert.equal(await page.locator('#index-dialog').evaluate(node=>getComputedStyle(node).animationName),'none','Reduced-motion dialogs do not animate');
  await assertCurrentSlide(page,8,'Activating the index with Space does not change the slide');
  await page.keyboard.press('Escape');
  await page.locator('.reveal').focus();
  await page.keyboard.press('Space');await assertCurrentSlide(page,9);
  await page.keyboard.press('Shift+Space');await assertCurrentSlide(page,8);
  const resources=page.locator('#resources'),resourcePanel=page.locator('#resources-panel');
  assert.equal(await resources.getAttribute('popovertarget'),'resources-panel','The resource trigger uses native popover semantics');
  assert.equal(await resourcePanel.getAttribute('popover'),'auto','Resources support native light dismissal');
  await resources.focus();await page.keyboard.press('Space');await waitForResources(page,true);
  await resourcePanel.locator('a[href="/guide/reference/presentation/"]').focus();
  for(const key of ['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Space','PageDown','n','i','d'])await page.keyboard.press(key);
  await assertCurrentSlide(page,8,'Navigation keys and shortcuts do not change the presentation while resources are open');
  assert.equal(await page.locator('dialog[open]').count(),0,'Presentation shortcuts do not open competing dialogs from resources');
  for(const href of ['/guide/reference/presentation/','/']){
    assert.equal(await resourcePanel.locator(`a[href="${href}"]`).count(),1,`Resources retain ${href}`);
  }
  assert.ok(await resourcePanel.locator('#fullscreen').isVisible(),'Fullscreen remains available through resources');
  await page.keyboard.press('Escape');await waitForResources(page,false);
  await assertCurrentSlide(page,8,'Dismissing resources does not navigate');
  await resources.click();await waitForResources(page,true);
  await page.mouse.click(8,8);await waitForResources(page,false);
  await assertCurrentSlide(page,8,'Clicking outside resources dismisses them without changing slides');
  await resources.focus();await page.keyboard.press('Space');await waitForResources(page,true);
  await page.keyboard.press('Space');await waitForResources(page,false);
  await assertCurrentSlide(page,8,'Space toggles the resource trigger without an extra sequential advance');
  await page.goto(url+'#/slide-9');await waitForSlide(page,8);
  await page.keyboard.press('ArrowDown');await waitForSlide(page,9);
  await page.goBack();await waitForSlide(page,8);
  await page.goForward();await waitForSlide(page,9);
  await page.reload();await waitForSlide(page,9);
  for(const index of deck.slides.keys()){
    await page.goto(url+`#/${deck.slides[index].id}`);await waitForSlide(page,index);
    assert.equal(await page.evaluate(()=>window.posPresentation.getCurrentSlide().id),deck.slides[index].id,'Published named links resolve to the same leaf after grouping');
  }
  for(const chapter of deck.chapters){
    const id=`chapter-${chapter.id}`;
    await page.goto(url+`#/${id}`);await waitForLeaf(page,id);
    await page.reload();await waitForLeaf(page,id);
    assert.equal(await page.evaluate(()=>window.posPresentation.getIndices().v),0,'Chapter links and reloads target the cover');
    await page.locator('#notes').click();
    assert.equal(await page.locator('#notes-title').textContent(),chapter.title,'Cover notes identify the chapter');
    assert.ok((await page.locator('#notes-body').textContent()).includes(chapter.summary),'Cover notes explain the chapter scope');
    await page.keyboard.press('Escape');
    await page.locator('#index').click();await assertIndexSelection(page,id);
    await page.keyboard.press('Escape');
    await goToSlide(page,15);
    await page.locator('#index').click();
    await page.locator(`#index-dialog h3 button[data-slide="${id}"]`).click();
    await waitForLeaf(page,id);
    assert.equal(await page.locator('#index-dialog').evaluate(dialog=>dialog.open),false,'Selecting a chapter closes the index');
    await page.keyboard.press('ArrowDown');await waitForLeaf(page,chapter.slides[0]);
    await page.keyboard.press('ArrowUp');await waitForLeaf(page,id);
  }
  await page.locator('#index').click();
  await page.locator(`#index-dialog [data-slide="${deck.cover}"]`).click();
  await waitForLeaf(page,deck.cover);
  assert.equal(await page.locator('#index-dialog').evaluate(dialog=>dialog.open),false,'Selecting the standalone opening closes the index');
  await assertOpeningNavigation(page);
  await page.locator('#index').click();await page.locator('[data-slide="slide-12"]').click();
  await assertCurrentSlide(page,11);
  await page.locator('#notes').click();
  assert.ok((await page.locator('#notes-body').textContent()).includes('Secuencia propuesta'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#notes-dialog').evaluate(d=>d.open),false);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'notes');
  await page.locator('#index').click();await page.keyboard.press('Escape');
  await page.keyboard.press('o');assert.equal(await page.evaluate(()=>window.posPresentation.isOverview()),true);
  await page.keyboard.press('o');
  await goToSlide(page,8);
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
  await assertCurrentSlide(page,8,'Keys in the diagram viewer never advance the presentation');
  await page.keyboard.press('Escape');
  assert.equal(await diagramDialog.evaluate(dialog=>dialog.open),false,'Escape closes the diagram');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'diagram-open','Closing returns focus to the diagram opener');
  await page.keyboard.press('d');await waitForDiagram(page);
  await page.keyboard.press('Escape');
  await goToSlide(page,0);
  assert.ok(await diagramOpen.isHidden(),'Slides without diagrams do not show an empty viewer action');
  await page.keyboard.press('d');assert.equal(await diagramDialog.evaluate(dialog=>dialog.open),false,'The diagram shortcut is inactive on a slide without a diagram');
  await page.setViewportSize({width:320,height:720});
  await goToSlide(page,8);
  await diagramOpen.click();await waitForDiagram(page);await page.locator('#diagram-fit').click();
  await assertFittedDiagram(page,'320px viewer');
  const narrow=await diagramDialog.evaluate(dialog=>{
    const box=dialog.getBoundingClientRect();return {left:box.left,right:box.right,width:document.documentElement.clientWidth,overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)};
  });
  assert.ok(narrow.left>=0&&narrow.right<=narrow.width+1&&narrow.overflow<=narrow.width+1,'The small-screen viewer never creates horizontal page overflow');
  await page.screenshot({path:path.join(result,'diagram-viewer-320.png')});
  await page.keyboard.press('Escape');await page.setViewportSize({width:1600,height:954});
  // A monorepo step is a native Reveal fragment, not a slide or an autoplay timer.
  await goToSlide(page,3,-1);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>window.posPresentation.getConfig().transition==='slide');
  await page.locator('[data-zone-step="6"]').click();
  await page.waitForFunction(()=>{
    const tree=document.querySelector('#slide-4 .tree-panel');
    return tree.scrollTop>2&&tree.scrollTop<tree.scrollHeight-tree.clientHeight-2;
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>window.posPresentation.getConfig().transition==='none');
  const stoppedScroll=await page.locator('#slide-4 .tree-panel').evaluate(async tree=>{
    const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
    await frame();await frame();
    const positions=[tree.scrollTop];
    for(let index=0;index<6;index++){await frame();positions.push(tree.scrollTop);}
    return positions;
  });
  assert.ok(Math.max(...stoppedScroll)-Math.min(...stoppedScroll)<=1,'Enabling reduced motion stops an in-flight smooth monorepo scroll');
  assert.equal(await page.locator('#slide-4 .tree-row').first().evaluate(node=>getComputedStyle(node).transitionDuration),'0s','Reduced motion also disables the tree highlight transition');
  await goToSlide(page,3,-1);
  await page.locator('.reveal').focus();
  const zones=['apps','business','frontend','backend','shared','transition','delivery'];
  for(let step=0;step<zones.length;step++){
    if(step)await page.keyboard.press('Space');
    await assertCurrentSlide(page,3);
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
  await page.keyboard.press('Space');await assertCurrentSlide(page,4);
  await page.keyboard.press('Shift+Space');await assertCurrentSlide(page,3);
  assert.equal(await page.locator('[data-zone-step][aria-current]').getAttribute('data-zone-step'),'6');
  await page.locator('[data-zone-step="3"]').click();
  await page.waitForFunction(()=>location.hash.endsWith('/2'));
  await page.reload();await page.waitForFunction(()=>window.posPresentation?.isReady());
  assert.equal(await page.locator('[data-zone-step][aria-current]').getAttribute('data-zone-step'),'3');
  await page.keyboard.press('ArrowUp');assert.equal(await page.locator('[data-zone-step][aria-current]').getAttribute('data-zone-step'),'2');
  await page.locator('[data-zone-step="0"]').click();
  await page.locator('[data-zone-step="4"]').focus();
  await page.keyboard.press('Space');
  await assertCurrentSlide(page,3,'Space on a monorepo zone button does not leave its slide');
  assert.equal(await page.locator('[data-zone-step][aria-current]').getAttribute('data-zone-step'),'4','Space selects the focused nonadjacent zone without an additional fragment advance');
  await page.locator('[data-zone-step="0"]').click();
  await page.locator('.reveal').focus();
  await page.keyboard.press('Shift+Space');await waitForLeaf(page,'chapter-structure');
  await page.keyboard.press('Shift+Space');await assertCurrentSlide(page,2);
  const links=await page.locator('a[href]').evaluateAll(nodes=>[...new Set(nodes.map(a=>a.href))]);
  for(const href of links){if(!href.startsWith(origin))continue;const res=await context.request.get(href);assert.equal(res.status(),200,href);}
  const download=await context.request.get(url+'downloads/Implementos-POS-Platform-Arquitectura-y-Roadmap.pptx');
  assert.equal(download.headers()['content-type'],'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  await page.setViewportSize({width:390,height:844});await page.goto(url+'#/slide-12');await page.waitForFunction(()=>window.posPresentation?.isReady());
  await page.screenshot({path:path.join(result,'mobile.png')});
  assert.ok(await page.locator('#index').isVisible());await page.locator('#index').click();await page.locator('[data-slide="slide-16"]').click();
  await assertCurrentSlide(page,15);
  await page.locator('#index').click();await page.locator('[data-slide="slide-4"]').click();
  await page.locator('[data-zone-step="6"]').click();
  assert.equal(await page.locator('[data-zone-step][aria-current]').getAttribute('data-zone-step'),'6');
  for(const width of [320,390,768]){
    await page.setViewportSize({width,height:844});await goToSlide(page,8);
    await assertControlsFit(page,`${width}px navigation`);
    await assertToolbar(page,`${width}px toolbar`);
    const extra=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert.ok(extra<=1,`${width}px navigation has no horizontal page overflow`);
    await page.screenshot({path:path.join(result,`native-controls-${width}.png`)});
    for(const index of [8,15]){
      await goToSlide(page,index);
      await page.locator('#index').click();await assertIndexSelection(page,index);
      if(width===320)await page.screenshot({path:path.join(result,`index-${index+1}-${width}.png`)});
      await page.keyboard.press('Escape');
    }
    await goToSlide(page,8);
    await page.locator('#resources').click();await waitForResources(page,true);
    const bounds=await resourcePanel.evaluate(panel=>{
      const box=panel.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:innerWidth,height:innerHeight,scrollWidth:panel.scrollWidth,clientWidth:panel.clientWidth};
    });
    assert.ok(bounds.left>=0&&bounds.right<=bounds.width+1&&bounds.top>=0&&bounds.bottom<=bounds.height+1,`${width}px: resources stay within the screen`);
    assert.ok(bounds.scrollWidth<=bounds.clientWidth+1,`${width}px: resources need no horizontal scrolling`);
    if(width<=760){
      assert.ok(await resourcePanel.locator('#mobile-notes').isVisible(),'Mobile notes remain accessible in resources');
      await resourcePanel.locator('#mobile-notes').click();
      assert.equal(await page.locator('#notes-dialog').evaluate(dialog=>dialog.open),true,'The mobile notes action opens the current slide notes');
      assert.equal(await page.locator('#notes-title').textContent(),deck.slides[8].title);
      await waitForResources(page,false);
      await page.keyboard.press('Escape');
    }else await page.keyboard.press('Escape');
    await waitForResources(page,false);
  }
  await page.setViewportSize({width:1600,height:954});
  await page.goto(url+'?print-pdf');await page.waitForFunction(()=>document.querySelectorAll('.pdf-page').length===21);
  assert.equal(await page.locator('.pdf-page [data-chapter-cover]').count(),5,'Print includes every chapter cover');
  assert.deepEqual(await page.locator('.pdf-page [data-leaf]').evaluateAll(nodes=>nodes.map(node=>node.id)),leafIds,'Print preserves the opening followed by every chapter and detail once');
  assert.ok(await page.locator('.monorepo-static').isVisible());assert.equal(await page.locator('.monorepo-tour').isVisible(),false);
  await page.pdf({path:path.join(result,'architecture.pdf'),printBackground:true,preferCSSPageSize:true});
  const reader=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const reading=await reader.newPage();observe(reading);await reading.goto(url+'reading.html');
  assert.equal(await reading.locator('article').count(),16);
  assert.deepEqual(await reading.locator('article').evaluateAll(nodes=>nodes.map(node=>node.id)),deck.slides.map(slide=>slide.id),'Continuous reading preserves all permanent content IDs in order');
  assert.equal(await reading.locator(`article#${deck.cover}`).evaluate(article=>!!article.closest('.reading-chapter')),false,'The opening is outside every reading chapter');
  assert.equal(await reading.locator('section.reading-chapter article').count(),15,'Only detail slides belong to reading chapters');
  assert.equal(await reading.locator(`article#${deck.cover} a[href="./#/${deck.cover}"]`).count(),1,'Reading links directly to the standalone opening');
  assert.equal(await reading.locator('section.reading-chapter').count(),5,'Continuous reading groups the fifteen details under their five chapter headings');
  for(const [index,chapter] of deck.chapters.entries()){
    const section=reading.locator('section.reading-chapter').nth(index);
    assert.equal((await section.locator(':scope > header h2').textContent()).trim(),chapter.title);
    assert.equal((await section.locator(':scope > header .chapter-kicker').textContent()).trim(),`Capítulo ${String(index+1).padStart(2,'0')}`,'Reading chapter numbering excludes the opening');
    assert.equal((await section.locator(':scope > header p:not(.chapter-kicker)').textContent()).trim(),chapter.summary);
    assert.deepEqual(await section.locator('article').evaluateAll(nodes=>nodes.map(node=>node.id)),chapter.slides,'Reading chapter grouping follows the same canonical detail order');
    assert.equal(await section.locator(':scope > article > h3').count(),chapter.slides.length,'Reading details sit beneath the chapter heading');
  }
  assert.ok(await reading.locator('h1').isVisible());
  const readingTree=await reading.locator('.tree-reading').textContent();
  assert.ok(['branch-api/','branch-sync-worker/','shared/','Base técnica del servidor'].every(value=>readingTree.includes(value)),'Continuous reading presents the target names and responsibilities');
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
    await screen.goto(url);await waitForLeaf(screen,deck.cover);
    assert.equal(await screen.evaluate(()=>devicePixelRatio),dpr);
    for(const index of [2,8]){
      await goToSlide(screen,index);
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
  fs.writeFileSync(path.join(result,'report.json'),JSON.stringify({slides:21,opening:1,details:15,covers:5,errors,failedRequests,overflow,diagrams,visualChecks},null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(failedRequests,[]);assert.deepEqual(overflow,[],'Text exceeds its editable box; inspect report.json');
  console.log('Presentations: standalone opening, five chapter covers and fifteen details; opening has only a right route, four native chapter arrows, sequential Space navigation, history, all permanent links, cover and detail notes, fragments, six source-preserving SVG diagrams, keyboard viewer, real zoom, DPR 1.25/2, mobile, downloads, 21-page print and grouped no-JS reading passed.');
}finally{
  fs.writeFileSync(path.join(result,'report.json'),JSON.stringify({slides:21,opening:1,details:15,covers:5,errors,failedRequests,overflow,diagrams,visualChecks},null,2));
  await browser.close();await new Promise(resolve=>server.close(resolve));
}
