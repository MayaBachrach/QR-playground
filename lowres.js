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
  'z-index:100;pointer-events:none;visibility:hidden;background:#03150c;'+
  'image-rendering:pixelated;';
 document.body.append(screen);
 const ctx=screen.getContext('2d',{alpha:false});
 if(!ctx){screen.remove();return}
 const css=Array.from(document.querySelectorAll('style')).map(x=>x.textContent).join('\n');
 const serialize=new XMLSerializer();
 let drawing=false,dirty=false,timer=null;
 const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');

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
  ctx.fillStyle='#f8d66f';
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
  screen.width=dim.pw;screen.height=dim.ph;
  let url;
  try{
   url=URL.createObjectURL(new Blob([snapshot(dim.w,dim.h)],{type:'image/svg+xml'}));
   const image=new Image();
   image.onload=()=>{
    try{
     ctx.imageSmoothingEnabled=false;
     ctx.fillStyle='#03150c';
     ctx.fillRect(0,0,screen.width,screen.height);
     ctx.drawImage(image,0,0,screen.width,screen.height);
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
