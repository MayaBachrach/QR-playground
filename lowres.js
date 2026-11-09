/* qArt's real low-resolution framebuffer. All pixels in the visible UI
   are generated at half/third the browser's CSS resolution and then enlarged
   with nearest-neighbor sampling. The live HTML under it remains clickable,
   keyboard-accessible, and is still responsible for QR verification/export. */
(function(){
 'use strict';
 const source=document.querySelector('.terminal');
 if(!source||!window.XMLSerializer)return;
 const screen=document.createElement('canvas');
 screen.id='lowResScreen';
 screen.setAttribute('aria-hidden','true');
 screen.style.cssText='position:fixed;inset:0;width:100vw;height:100dvh;'+
  'z-index:100;pointer-events:none;visibility:hidden;background:#06120a;'+
  'image-rendering:pixelated;';
 document.body.append(screen);
 const ctx=screen.getContext('2d',{alpha:false});
 if(!ctx){screen.remove();return}
 const css=Array.from(document.querySelectorAll('style')).map(x=>x.textContent).join('\n');
 const serialize=new XMLSerializer();
 let drawing=false,dirty=false,timer=null;
 const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');


 // Restrict interface colors to seven 1955 instrument phosphors/paints.
 // The QR preview and selectable swatches preserve user-defined colors.
 const PALETTE=[[6,18,10],[13,33,17],[42,67,39],[65,106,59],
  [131,232,146],[229,243,205],[211,181,104]];
 function inside(rect,x,y,step){
  if(!rect)return false;
  const xx=(x+.5)*step,yy=(y+.5)*step;
  return xx>=rect.left&&xx<=rect.right&&yy>=rect.top&&yy<=rect.bottom;
 }
 function quantize(dim){
  const frame=ctx.getImageData(0,0,dim.pw,dim.ph);
  const pixels=frame.data;
  const qr=source.querySelector('.qr-rack')?.getBoundingClientRect();
  const swatches=Array.from(source.querySelectorAll('input[type=color]'))
   .map(node=>node.getBoundingClientRect());
  for(let y=0;y<dim.ph;y++)for(let x=0;x<dim.pw;x++){
   if(inside(qr,x,y,dim.block)||swatches.some(rect=>inside(rect,x,y,dim.block)))continue;
   const i=(y*dim.pw+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];
   let best=0,min=Infinity;
   for(let k=0;k<PALETTE.length;k++){
    const p=PALETTE[k];
    const d=2*(r-p[0])**2+3*(g-p[1])**2+(b-p[2])**2;
    if(d<min){min=d;best=k}
   }
   pixels[i]=PALETTE[best][0];pixels[i+1]=PALETTE[best][1];
   pixels[i+2]=PALETTE[best][2];
  }
  ctx.putImageData(frame,0,0);
 }

 function measure(){
  const w=Math.max(1,Math.round(innerWidth)),h=Math.max(1,Math.round(innerHeight));
  const block=w>1500?3:2;
  return {w,h,block,pw:Math.ceil(w/block),ph:Math.ceil(h/block)};
 }
 function snapshot(w,h){
  const clone=source.cloneNode(true);
  clone.removeAttribute('style'); // Source opacity is zero; copy must be visible.
  const inputs=source.querySelectorAll('input,select,textarea');
  const copies=clone.querySelectorAll('input,select,textarea');
  for(let i=0;i<inputs.length;i++){
   const a=inputs[i],b=copies[i];if(!b)continue;
   if(a.tagName==='SELECT')Array.from(b.options).forEach((o,n)=>{
    if(n===a.selectedIndex)o.setAttribute('selected','selected');
    else o.removeAttribute('selected');
   });
   else if(a.tagName==='TEXTAREA')b.textContent=a.value;
   else if(a.type==='checkbox'||a.type==='radio'){
    if(a.checked)b.setAttribute('checked','checked');
    else b.removeAttribute('checked');
   }else b.setAttribute('value',a.value);
   if(a.disabled)b.setAttribute('disabled','disabled');
   else b.removeAttribute('disabled');
  }
  const tab=document.documentElement.dataset.view||'play';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+
   '" height="'+h+'"><foreignObject x="0" y="0" width="100%" height="100%">'+
   '<html xmlns="http://www.w3.org/1999/xhtml" lang="he" dir="rtl" data-view="'+tab+
   '"><head><style type="text/css">'+escape(css)+'</style></head><body>'+
   serialize.serializeToString(clone)+'</body></html></foreignObject></svg>';
 }
 function pixelCaret(dim){
  const el=document.activeElement;
  if(!el||el.tagName!=='INPUT'||el.type!=='text')return;
  const r=el.getBoundingClientRect();
  if(!r.width||!r.height)return;
  const len=typeof el.selectionStart==='number'?el.selectionStart:el.value.length;
  const x=Math.min(r.right-10,r.left+12+len*8);
  ctx.fillStyle='#d3b568';
  ctx.fillRect(Math.round(x/dim.block),
   Math.round((r.top+(r.height-15)/2)/dim.block),1,Math.max(5,Math.round(15/dim.block)));
 }
 function schedule(){
  dirty=true;
  if(drawing||timer!==null)return;
  timer=setTimeout(()=>{timer=null;render()},95);
 }
 function render(){
  if(drawing){dirty=true;return}
  drawing=true;dirty=false;
  const dim=measure();
  if(screen.width!==dim.pw)screen.width=dim.pw;
  if(screen.height!==dim.ph)screen.height=dim.ph;
  let url;
  try{
   url=URL.createObjectURL(new Blob([snapshot(dim.w,dim.h)],{type:'image/svg+xml'}));
   const image=new Image();
   image.onload=()=>{
    try{
     ctx.imageSmoothingEnabled=false;
     ctx.fillStyle='#06120a';
     ctx.fillRect(0,0,screen.width,screen.height);
     ctx.drawImage(image,0,0,screen.width,screen.height);
     try{quantize(dim)}catch(e){/* Keep nearest-neighbor output when browser blocks canvas readback. */}
     pixelCaret(dim);
     screen.style.visibility='visible';
     source.style.opacity='0';
    }catch(err){source.style.opacity='';screen.style.visibility='hidden';console.warn('qArt low-res fallback',err)}
    finally{
     URL.revokeObjectURL(url);drawing=false;
     if(dirty)schedule();
    }
   };
   image.onerror=()=>{
    source.style.opacity='';screen.style.visibility='hidden';
    URL.revokeObjectURL(url);drawing=false;
    console.warn('qArt low-resolution capture unsupported');
   };
   image.src=url;
  }catch(err){
   if(url)URL.revokeObjectURL(url);
   source.style.opacity='';screen.style.visibility='hidden';drawing=false;
   console.warn('qArt low-res fallback',err);
  }
 }
 const observer=new MutationObserver(schedule);
 observer.observe(source,{subtree:true,childList:true,characterData:true,
  attributes:true,attributeFilter:['disabled','value','selected','aria-selected']});
 observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-view']});
 ['input','change','click','keyup','focusin','focusout'].forEach(event=>source.addEventListener(event,schedule,true));
 document.addEventListener('click',schedule,true);
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('orientationchange',schedule,{passive:true});
 window.visualViewport?.addEventListener('resize',schedule);
 render();
}());
