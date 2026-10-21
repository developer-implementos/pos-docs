/* Local Reveal.js player. Business diagrams are explanatory and execute no services. */
(async function () {
  'use strict';
  const root=document.querySelector('.reveal');
  const indexDialog=document.querySelector('#index-dialog');
  const notesDialog=document.querySelector('#notes-dialog');
  const dialogs=[indexDialog,notesDialog];
  const previous=document.querySelector('#previous');
  const next=document.querySelector('#next');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const monorepo=document.querySelector('#slide-4');
  const tree=monorepo.querySelector('.tree-panel');
  const zoneButtons=[...monorepo.querySelectorAll('[data-zone-step]')];
  const zoneIds=['apps','business','frontend','backend','shared','transition','delivery'];
  let currentZone=-1;
  const deck=new Reveal(root,{
    width:1280,height:720,margin:0.025,minScale:0.1,maxScale:2,
    center:false,hash:true,history:true,controls:false,progress:true,
    transition:reduced?'none':'fade',transitionSpeed:'fast',backgroundTransition:'none',
    slideNumber:false,autoSlide:0,autoPlayMedia:false,disableLayout:false,
    view:'slide',scrollActivationWidth:0,pdfMaxPagesPerSlide:1,pdfSeparateFragments:false,
    keyboardCondition:()=>!dialogs.some(d=>d.open),
    keyboard:{73:()=>indexDialog.showModal(),78:()=>openNotes()}
  });
  function openNotes(){
    const current=deck.getCurrentSlide();
    document.querySelector('#notes-title').textContent=current.dataset.title;
    document.querySelector('#notes-body').replaceChildren(...[...current.querySelector('.notes').childNodes].map(node=>node.cloneNode(true)));
    notesDialog.showModal();
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
