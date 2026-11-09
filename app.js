const $=id=>document.getElementById(id);
let code,cells,safe=new Set(),busy=false;
const ns='http://www.w3.org/2000/svg';
const status=text=>$('status').textContent=text;
let selectedRegion=null,regions=[];
function clearRegions(){selectedRegion=null;regions=[];$('regionResults').replaceChildren()}
function eraseRegion(original,r){const next=Uint8Array.from(original),n=code.modules.size;for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)next[y*n+x]=0;return next}
function showRegions(){const container=$('regionResults');container.replaceChildren();regions.forEach((r,i)=>{const b=document.createElement('button');b.className='secondary';b.textContent=`SPACE ${i+1}: ${r.w}×${r.h}`;b.setAttribute('aria-pressed',String(selectedRegion===r));b.onclick=()=>{selectedRegion=r;showRegions();paint()};container.append(b)});if(selectedRegion){const erase=document.createElement('button');erase.textContent='ERASE SELECTED';erase.onclick=deleteRegion;container.append(erase)}}
async function findRegions(){if(busy||!cells)return;lock(true);clearRegions();safe.clear();const original=Uint8Array.from(cells);paint();status('SEARCHING FOR EMPTY SPACE...');try{if(!await verifies()){status('QR NOT READABLE. RESET FIRST.');return}const result=await QRRegions.search({size:code.modules.size,reserved:code.modules.reservedBit,dark:original,verify:async r=>{cells=eraseRegion(original,r);try{return await verifies()}finally{cells=original}},progress:count=>{if(count%8===0)status(`SEARCHING... ${count} TESTS`)}});regions=result.regions;selectedRegion=regions[0]||null;showRegions();paint();status(regions.length?`${regions.length} SPACES FOUND. SELECT TO ERASE.`:'NO SAFE SPACE FOUND. TRY ANOTHER PATTERN.')}catch(e){clearRegions();status('SPACE SEARCH FAILED.')}finally{cells=original;paint();lock(false)}}
async function deleteRegion(){if(busy||!selectedRegion||!cells)return;lock(true);const original=Uint8Array.from(cells);try{cells=eraseRegion(original,selectedRegion);if(await verifies()){clearRegions();safe.clear();status('SPACE ERASED. QR STILL READABLE.')}else{cells=original;clearRegions();status('ERASE BLOCKED. QR COULD NOT BE READ.')}paint()}catch(e){cells=original;clearRegions();paint();status('ERASE FAILED. QR RESTORED.')}finally{lock(false)}}
function el(tag,attrs){const node=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));return node}
function expected(){return $('data').value||' '}
function lock(value){busy=value;document.querySelectorAll('input,select,button').forEach(node=>node.disabled=value)}
function rebuild(){clearRegions();safe.clear();try{code=QREngine.create(expected(),{errorCorrectionLevel:$('level').value,maskPattern:Number($('mask').value)});cells=Uint8Array.from(code.modules.data);paint();status('READY. SELECT A PIXEL TO EDIT.')}catch(e){cells=null;$('qr').replaceChildren();status('QR ERROR: '+e.message)}}
function finder(x,y,n){return (x<7&&y<7)||(x>=n-7&&y<7)||(x<7&&y>=n-7)}
function makeSvg(markers=false){
 const n=code.modules.size,fg='#000000',bg='#39ff14';
 const svg=el('svg',{xmlns:ns,viewBox:'-4 -4 '+(n+8)+' '+(n+8),width:800,height:800,'aria-label':'QR matrix'});
 svg.append(el('rect',{x:-4,y:-4,width:n+8,height:n+8,fill:bg}));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=y*n+x;
  if(cells[i])svg.append(el('rect',{x,y,width:1,height:1,fill:fg}));
 }
 if(markers)for(let i=0;i<cells.length;i++){
  if(code.modules.reservedBit[i])continue;
  const x=i%n,y=Math.floor(i/n);
  if(safe.has(i))svg.append(el('rect',{x:x+.25,y:y+.25,width:.5,height:.5,fill:cells[i]?bg:fg,'pointer-events':'none'}));
  const mark=el('rect',{x:x+.01,y:y+.01,width:.98,height:.98,fill:'transparent','data-cell':i,tabindex:0,role:'button','aria-label':'Flip pixel at row '+(y+1)+', column '+(x+1)});
  mark.addEventListener('click',()=>flip(i));
  mark.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip(i)}});
  svg.append(mark);
 }
 if(markers&&selectedRegion){const r=selectedRegion;svg.append(el('rect',{x:r.x,y:r.y,width:r.w,height:r.h,fill:'none',stroke:fg,'stroke-width':.22,'stroke-dasharray':'.65 .4','pointer-events':'none'}));}
 return svg;
}
function paint(){if(cells)$('qr').replaceChildren(makeSvg(true))}
// Decode actual colors, shapes and finder decorations with a four-module quiet zone.
async function verifies(){if(!cells)return false;const svg=makeSvg(),n=code.modules.size,canvas=document.createElement('canvas');canvas.width=canvas.height=(n+8)*8;const ctx=canvas.getContext('2d'),img=new Image(),url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});ctx.drawImage(img,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);const result=QREngine.decode(pixels.data,pixels.width,pixels.height);return result?.data===expected()}finally{URL.revokeObjectURL(url)}}
async function flip(i){if(busy||!cells||code.modules.reservedBit[i])return;const keyboard=document.activeElement?.getAttribute('data-cell')===String(i);lock(true);clearRegions();cells[i]^=1;try{const valid=await verifies();if(!valid)cells[i]^=1;safe.clear();paint();status(valid?'PIXEL SAVED. QR STILL READABLE.':'PIXEL BLOCKED. QR NOT READABLE.')}catch(e){cells[i]^=1;safe.clear();paint();status('PIXEL TEST FAILED. CHANGE UNDONE.')}finally{lock(false);if(keyboard)$('qr').querySelector(`[data-cell="${i}"]`)?.focus()}}
async function findSafe(){if(busy||!cells)return;lock(true);clearRegions();safe.clear();const original=Uint8Array.from(cells);status('TESTING PIXELS...');try{
 // Sample throughout the symbol. Finder, timing, format and alignment modules stay locked.
 const candidates=[];for(let i=0;i<cells.length;i++)if(!code.modules.reservedBit[i])candidates.push(i);
 const count=Math.min(48,candidates.length);
 for(let j=0;j<count;j++){const i=candidates[Math.floor(j*candidates.length/count)];cells=Uint8Array.from(original);cells[i]^=1;if(await verifies())safe.add(i)}
 cells=original;paint();status(`${safe.size} SAFE PIXELS OF ${count} TESTED.`);
 }catch(e){cells=original;safe.clear();paint();status('PIXEL TEST FAILED.')}finally{cells=original;lock(false)}}
['data','mask','level'].forEach(id=>$(id).addEventListener('input',rebuild));
$('regions').onclick=findRegions;$('editable').onclick=findSafe;$('reset').onclick=rebuild;
$('scan').onclick=async()=>{if(busy||!cells)return;lock(true);try{status(await verifies()?'SCAN OK. DATA MATCHES.':'SCAN FAILED. RESET QR.')}catch(e){status('SCAN TEST FAILED.')}finally{lock(false)}};
async function download(ext){if(!cells||busy)return;lock(true);try{let blob=new Blob([new XMLSerializer().serializeToString(makeSvg())],{type:'image/svg+xml'});if(ext==='png'){const url=URL.createObjectURL(blob),image=new Image();try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});const canvas=document.createElement('canvas');canvas.width=canvas.height=800;canvas.getContext('2d').drawImage(image,0,0,800,800);blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))}finally{URL.revokeObjectURL(url)}}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='qr-art.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){status('EXPORT FAILED.')}finally{lock(false)}}
$('png').onclick=()=>download('png');$('svg').onclick=()=>download('svg');rebuild();

