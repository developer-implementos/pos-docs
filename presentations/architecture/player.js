/* Local Reveal.js player. Business diagrams are explanatory and execute no services. */
(async function () {
  'use strict';
  const root=document.querySelector('.reveal');
  const indexDialog=document.querySelector('#index-dialog');
  const notesDialog=document.querySelector('#notes-dialog');
  const diagramDialog=document.querySelector('#diagram-dialog');
  const dialogs=[indexDialog,notesDialog,diagramDialog];
  const diagramOpen=document.querySelector('#diagram-open');
  const diagramViewport=document.querySelector('#diagram-viewport');
  const diagramImage=document.querySelector('#diagram-image');
  const diagramZoomOut=document.querySelector('#diagram-zoom-out');
  const diagramZoomIn=document.querySelector('#diagram-zoom-in');
  const diagramFit=document.querySelector('#diagram-fit');
  const diagramZoom=document.querySelector('#diagram-zoom');
  const diagramDownload=document.querySelector('#diagram-download');
  const previous=document.querySelector('#previous');
  const next=document.querySelector('#next');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const monorepo=document.querySelector('#slide-4');
  const tree=monorepo.querySelector('.tree-panel');
  const zoneButtons=[...monorepo.querySelectorAll('[data-zone-step]')];
  const zoneIds=['apps','business','frontend','backend','shared','transition','delivery'];
  let currentZone=-1;
  let diagramSlide=null,diagramReturnFocus=null;
  let diagramWidth=0,diagramHeight=0,diagramScale=1,diagramFitMode=false;
  const deck=new Reveal(root,{
    width:1280,height:720,margin:0.025,minScale:0.1,maxScale:2,
    center:false,hash:true,history:true,controls:false,progress:true,
    transition:reduced?'none':'fade',transitionSpeed:'fast',backgroundTransition:'none',
    slideNumber:false,autoSlide:0,autoPlayMedia:false,disableLayout:false,
    view:'slide',scrollActivationWidth:0,pdfMaxPagesPerSlide:1,pdfSeparateFragments:false,
    keyboardCondition:()=>!dialogs.some(d=>d.open),
    keyboard:{73:()=>indexDialog.showModal(),78:()=>openNotes(),68:()=>openDiagram(document.activeElement)}
  });
  function openNotes(){
    const current=deck.getCurrentSlide();
    document.querySelector('#notes-title').textContent=current.dataset.title;
    document.querySelector('#notes-body').replaceChildren(...[...current.querySelector('.notes').childNodes].map(node=>node.cloneNode(true)));
    notesDialog.showModal();
  }
  function currentDiagram(){
    const slide=deck.getCurrentSlide();
    const width=Number(slide?.dataset.diagramWidth),height=Number(slide?.dataset.diagramHeight);
    if(!slide?.dataset.diagramSrc||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return null;
    return {slide,source:slide.dataset.diagramSrc,width,height};
  }
  function diagramCenter(){
    const frame=diagramViewport.getBoundingClientRect(),image=diagramImage.getBoundingClientRect();
    return {
      x:Math.max(0,Math.min(1,(frame.left+diagramViewport.clientLeft+diagramViewport.clientWidth/2-image.left)/(diagramWidth*diagramScale))),
      y:Math.max(0,Math.min(1,(frame.top+diagramViewport.clientTop+diagramViewport.clientHeight/2-image.top)/(diagramHeight*diagramScale)))
    };
  }
  function scaleDiagram(scale,{fit=false,preserveCenter=true}={}){
    const center=preserveCenter?diagramCenter():null;
    diagramScale=scale;diagramFitMode=fit;
    // Real image dimensions keep text sharp and give native scrollbars the full diagram bounds.
    diagramImage.style.width=`${diagramWidth*scale}px`;
    diagramImage.style.height=`${diagramHeight*scale}px`;
    diagramZoom.value=`${Math.round(scale*100)} %`;
    diagramZoomOut.disabled=scale<=0.5;
    diagramZoomIn.disabled=scale>=4;
    diagramFit.setAttribute('aria-pressed',String(fit));
    if(center){
      const frame=diagramViewport.getBoundingClientRect(),image=diagramImage.getBoundingClientRect();
      diagramViewport.scrollLeft+=image.left+center.x*diagramWidth*scale-frame.left-diagramViewport.clientLeft-diagramViewport.clientWidth/2;
      diagramViewport.scrollTop+=image.top+center.y*diagramHeight*scale-frame.top-diagramViewport.clientTop-diagramViewport.clientHeight/2;
    }else{
      diagramViewport.scrollLeft=0;diagramViewport.scrollTop=0;
    }
  }
  function fitDiagram(){
    if(!diagramDialog.open)return;
    const style=getComputedStyle(diagramViewport);
    const width=diagramViewport.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-2;
    const height=diagramViewport.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)-2;
    if(width<=0||height<=0)return;
    scaleDiagram(Math.min(4,width/diagramWidth,height/diagramHeight),{fit:true,preserveCenter:false});
  }
  function openDiagram(opener=diagramOpen){
    const diagram=currentDiagram();
    if(!diagram||dialogs.some(dialog=>dialog.open))return;
    diagramSlide=diagram.slide;diagramWidth=diagram.width;diagramHeight=diagram.height;
    diagramReturnFocus=opener instanceof HTMLElement&&opener!==document.body?opener:diagramOpen;
    document.querySelector('#diagram-title').textContent=`Diagrama · ${diagram.slide.dataset.title}`;
    diagramImage.alt=`Diagrama de ${diagram.slide.dataset.title}`;
    document.querySelector('#diagram-description').textContent=diagram.slide.querySelector('.diagram-figure svg desc').textContent;
    diagramImage.src=diagram.source;
    diagramDownload.href=diagram.source;
    diagramDownload.download=diagram.source.split('/').at(-1);
    diagramDialog.showModal();
    scaleDiagram(1,{preserveCenter:false});
    diagramViewport.focus({preventScroll:true});
  }
  function update(){
    const index=deck.getIndices().h;
    document.querySelector('#status').textContent=`${index+1} / ${deck.getTotalSlides()}`;
    previous.disabled=index===0;next.disabled=index===deck.getTotalSlides()-1;
    document.title=`${index+1}. ${deck.getCurrentSlide().dataset.title} · Implementos`;
    document.querySelectorAll('[data-slide]').forEach(button=>{
      if(Number(button.dataset.slide)===index)button.setAttribute('aria-current','step');
      else button.removeAttribute('aria-current');
    });
    const hasDiagram=Boolean(currentDiagram());
    diagramOpen.hidden=!hasDiagram;diagramOpen.disabled=!hasDiagram;
    if(diagramDialog.open&&deck.getCurrentSlide()!==diagramSlide)diagramDialog.close();
    updateMonorepo();
  }
  function updateMonorepo(){
    if(deck.getCurrentSlide()!==monorepo||new URLSearchParams(location.search).has('print-pdf'))return;
    const step=Math.max(0,Math.min(zoneIds.length-1,(deck.getIndices().f??-1)+1));
    zoneButtons.forEach((button,i)=>{if(i===step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    monorepo.querySelectorAll('[data-zone-detail]').forEach(node=>{node.hidden=Number(node.dataset.zoneDetail)!==step;});
    const rows=[...tree.querySelectorAll('.tree-row')];
    rows.forEach(row=>row.classList.toggle('is-active',row.dataset.zone===zoneIds[step]));
    const active=rows.filter(row=>row.classList.contains('is-active'));
    if(active.length&&step!==currentZone){
      const first=active[0],last=active.at(-1);
      const start=first.offsetTop,end=last.offsetTop+last.offsetHeight;
      const top=Math.max(0,start-(tree.clientHeight-(end-start))/2);
      tree.scrollTo({top,behavior:reduced?'instant':'smooth'});
    }
    currentZone=step;
  }
  zoneButtons.forEach((button,i)=>button.addEventListener('click',()=>deck.slide(3,0,i-1)));
  // Space and arrows on a focused tree scroll that region; presentation arrows
  // elsewhere continue through Reveal fragments before leaving the slide.
  tree.addEventListener('keydown',event=>{
    if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))event.stopPropagation();
  });
  previous.addEventListener('click',()=>deck.prev());next.addEventListener('click',()=>deck.next());
  document.querySelector('#index').addEventListener('click',()=>indexDialog.showModal());
  document.querySelector('#notes').addEventListener('click',openNotes);
  diagramOpen.addEventListener('click',()=>openDiagram(diagramOpen));
  diagramZoomOut.addEventListener('click',()=>scaleDiagram(Math.max(0.5,diagramScale-0.25)));
  diagramZoomIn.addEventListener('click',()=>scaleDiagram(Math.min(4,Math.max(0.5,diagramScale+0.25))));
  diagramFit.addEventListener('click',fitDiagram);
  diagramDialog.addEventListener('close',()=>{
    if(diagramReturnFocus?.isConnected&&diagramReturnFocus.getClientRects().length&&!diagramReturnFocus.disabled){
      diagramReturnFocus.focus({preventScroll:true});
    }
    diagramReturnFocus=null;
  });
  // Arrow keys, wheel and touch remain native scrolling inside the focused viewport.
  new ResizeObserver(()=>{if(diagramDialog.open&&diagramFitMode)fitDiagram();}).observe(diagramViewport);
  for(const dialog of dialogs){
    dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('keydown',event=>{if(event.key==='Escape')event.stopPropagation();});
  }
  document.querySelectorAll('[data-slide]').forEach(button=>button.addEventListener('click',()=>{deck.slide(Number(button.dataset.slide));indexDialog.close();}));
  const full=document.querySelector('#fullscreen');
  if(!document.fullscreenEnabled)full.hidden=true;
  full.addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch{full.textContent='Usar F11 del navegador';}
  });
  document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'Salir de pantalla completa':'Pantalla completa';deck.layout();});
  await document.fonts.ready;
  await deck.initialize();
  deck.on('slidechanged',()=>{currentZone=-1;update();});
  deck.on('fragmentshown',updateMonorepo);deck.on('fragmenthidden',updateMonorepo);update();
  window.posPresentation=deck;
})();
