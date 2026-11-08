const $=id=>document.getElementById(id);
let code,cells,safe=new Set(),busy=false;
const ns='http://www.w3.org/2000/svg';
const status=text=>$('status').textContent=text;
function el(tag,attrs){const node=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));return node}
function expected(){return $('data').value||' '}
function lock(value){busy=value;document.querySelectorAll('input,select,button').forEach(node=>node.disabled=value)}
function rebuild(){safe.clear();try{code=QREngine.create(expected(),{errorCorrectionLevel:$('level').value,maskPattern:Number($('mask').value)});cells=Uint8Array.from(code.modules.data);paint();status('בחרי דוגמה או סמני ריבועים כדי להתחיל לצייר.')}catch(e){cells=null;$('qr').replaceChildren();status('לא ניתן ליצור קוד: '+e.message)}}
function finder(x,y,n){return (x<7&&y<7)||(x>=n-7&&y<7)||(x<7&&y>=n-7)}
function makeSvg(markers=false){
 const n=code.modules.size,fg=$('foreground').value,bg=$('background').value;
 const svg=el('svg',{xmlns:ns,viewBox:`-4 -4 ${n+8} ${n+8}`,width:800,height:800,'aria-label':'קוד QR לקישור שהזנת'});
 svg.append(el('rect',{x:-4,y:-4,width:n+8,height:n+8,fill:bg}));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  if(finder(x,y,n))continue;
  const i=y*n+x;
  if(cells[i]){const type=code.modules.reservedBit[i]?'square':$('dots').value;svg.append(type==='dots'?el('circle',{cx:x+.5,cy:y+.5,r:.5,fill:fg}):type==='classy'?el('polygon',{points:`${x+.18},${y} ${x+.82},${y} ${x+1},${y+.18} ${x+1},${y+.82} ${x+.82},${y+1} ${x+.18},${y+1} ${x},${y+.82} ${x},${y+.18}`,fill:fg}):el('rect',{x,y,width:1,height:1,rx:type==='square'?0:type==='extra-rounded'?.45:.22,fill:fg}));}
 }
 for(const [x,y] of [[0,0],[n-7,0],[0,n-7]]){
  const type=$('corners').value,round=type==='dot'?3.5:type==='extra-rounded'?1:0;
  svg.append(el('rect',{x,y,width:7,height:7,rx:round,fill:fg}),el('rect',{x:x+1,y:y+1,width:5,height:5,rx:Math.max(0,round-1),fill:bg}));
  if(type==='star'){
   const points=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?1.25:2.2;return `${x+3.5+Math.cos(a)*r},${y+3.5+Math.sin(a)*r}`}).join(' ');
   svg.append(el('polygon',{points,fill:fg}));
  }else svg.append(el('rect',{x:x+2,y:y+2,width:3,height:3,rx:type==='square'?0:type==='dot'?1.5:.6,fill:fg}));
 }
 if(markers)for(let i=0;i<cells.length;i++){
  if(code.modules.reservedBit[i])continue;
  const x=i%n,y=Math.floor(i/n),mark=el('rect',{x:x+.05,y:y+.05,width:.9,height:.9,fill:'transparent',stroke:safe.has(i)?'#e6007e':'none','stroke-width':.13,'data-cell':i,tabindex:0,role:'button','aria-label':`הפיכת ריבוע בשורה ${y+1}, עמודה ${x+1}`});
  mark.addEventListener('click',()=>flip(i));mark.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip(i)}});svg.append(mark);
 }
 return svg;
}
function paint(){if(cells)$('qr').replaceChildren(makeSvg(true))}
// Decode actual colors, shapes and finder decorations with a four-module quiet zone.
async function verifies(){if(!cells)return false;const svg=makeSvg(),n=code.modules.size,canvas=document.createElement('canvas');canvas.width=canvas.height=(n+8)*8;const ctx=canvas.getContext('2d'),img=new Image(),url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url});ctx.drawImage(img,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);const result=QREngine.decode(pixels.data,pixels.width,pixels.height);return result?.data===expected()}finally{URL.revokeObjectURL(url)}}
async function flip(i){if(busy||!cells||code.modules.reservedBit[i])return;const keyboard=document.activeElement?.getAttribute('data-cell')===String(i);lock(true);cells[i]^=1;try{const valid=await verifies();if(!valid)cells[i]^=1;safe.clear();paint();status(valid?'השינוי נשמר: הקוד עדיין מפוענח לאותו קישור. אפשר להמשיך לצייר.':'השינוי בוטל כי הקוד לא התפענח לקישור המקורי.')}catch(e){cells[i]^=1;safe.clear();paint();status('בדיקת השינוי נכשלה; השינוי בוטל.')}finally{lock(false);if(keyboard)$('qr').querySelector(`[data-cell="${i}"]`)?.focus()}}
async function findSafe(){if(busy||!cells)return;lock(true);safe.clear();const original=Uint8Array.from(cells);status('בודקים ריבועים לשינוי…');try{
 // Sample throughout the symbol. Finder, timing, format and alignment modules stay locked.
 const candidates=[];for(let i=0;i<cells.length;i++)if(!code.modules.reservedBit[i])candidates.push(i);
 const count=Math.min(48,candidates.length);
 for(let j=0;j<count;j++){const i=candidates[Math.floor(j*candidates.length/count)];cells=Uint8Array.from(original);cells[i]^=1;if(await verifies())safe.add(i)}
 cells=original;paint();status(`סומנו ${safe.size} ריבועים שניתן להפוך בנפרד, מתוך ${count} שנבדקו. אחרי כל שינוי נבדוק מחדש.`);
 }catch(e){cells=original;safe.clear();paint();status('בדיקת הריבועים נכשלה. נסי שוב.')}finally{cells=original;lock(false)}}
['data','mask','level'].forEach(id=>$(id).addEventListener('input',rebuild));
['dots','corners','foreground','background'].forEach(id=>$(id).addEventListener('input',()=>{safe.clear();paint();status('העיצוב עודכן. בדקי סריקה לפני המשך הציור.')}));
$('editable').onclick=findSafe;$('reset').onclick=rebuild;
$('scan').onclick=async()=>{if(busy||!cells)return;lock(true);try{status(await verifies()?'הצלחה! העיצוב מפוענח לקישור המקורי.':'לא התקבלה סריקה תואמת. נסי פינות מרובעות, ניגודיות גבוהה או איפוס ציור.')}catch(e){status('בדיקת הסריקה נכשלה. נסי שוב.')}finally{lock(false)}};
async function download(ext){if(!cells||busy)return;lock(true);try{let blob=new Blob([new XMLSerializer().serializeToString(makeSvg())],{type:'image/svg+xml'});if(ext==='png'){const url=URL.createObjectURL(blob),image=new Image();try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});const canvas=document.createElement('canvas');canvas.width=canvas.height=800;canvas.getContext('2d').drawImage(image,0,0,800,800);blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))}finally{URL.revokeObjectURL(url)}}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='qr-art.'+ext;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(e){status('ההורדה נכשלה. נסי שוב.')}finally{lock(false)}}
$('png').onclick=()=>download('png');$('svg').onclick=()=>download('svg');rebuild();

