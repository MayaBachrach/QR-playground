/* Bounded multiscale rectangle search. Results are verified alternatives, not
   a claim of a mathematical global maximum. No protected module is covered. */
(function(root){
 function candidates(size,reserved,dark){
  const prefix=new Int32Array((size+1)*(size+1));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const p=(y+1)*(size+1)+x+1;prefix[p]=reserved[y*size+x]+prefix[p-1]+prefix[p-size-1]-prefix[p-size-2]}
  const sum=(x,y,w,h)=>prefix[(y+h)*(size+1)+x+w]-prefix[y*(size+1)+x+w]-prefix[(y+h)*(size+1)+x]+prefix[y*(size+1)+x];
  const valid=r=>r.x>=0&&r.y>=0&&r.x+r.w<=size&&r.y+r.h<=size&&!sum(r.x,r.y,r.w,r.h);
  const bands=[];
  for(let s=Math.floor(size*.55);s>=3;s--){const list=[],seen=new Set();
   for(const [w,h]of [[s,s],[Math.ceil(s*1.5),s],[s,Math.ceil(s*1.5)]]){
    const step=Math.max(1,Math.floor(s/3)),xs=new Set([Math.floor((size-w)/2),size-w]),ys=new Set([Math.floor((size-h)/2),size-h]);
    for(let x=0;x<=size-w;x+=step)xs.add(x);for(let y=0;y<=size-h;y+=step)ys.add(y);
    for(const y of ys)for(const x of xs){const r={x,y,w,h};if(!valid(r))continue;let changed=0;for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)changed+=dark[(y+dy)*size+x+dx];if(!changed)continue;const key=[x,y,w,h].join();if(!seen.has(key)){seen.add(key);list.push({...r,changed})}}
   }
   list.sort((a,b)=>b.w*b.h-a.w*a.h||Math.hypot(a.x+a.w/2-size/2,a.y+a.h/2-size/2)-Math.hypot(b.x+b.w/2-size/2,b.y+b.h/2-size/2));
   bands.push(list.slice(0,24));
  }
  return {bands,valid};
 }
 async function search({size,reserved,dark,verify,progress=()=>{},limit=240}){
  const {bands,valid}=candidates(size,reserved,dark),found=[];let tested=0;
  const check=async r=>{tested++;progress(tested);return verify(r)};
  for(const band of bands){for(const r of band){if(tested>=limit)break;if(await check(r))found.push(r)}if(tested>=limit||found.length>=6)break}
  found.sort((a,b)=>b.w*b.h-a.w*a.h);
  // Locally expand successful regions; each expansion is checked as a whole.
  for(const r of found.slice(0,4)){let grew=true;while(grew&&tested<limit+64){grew=false;for(const trial of [{...r,x:r.x-1,w:r.w+1},{...r,w:r.w+1},{...r,y:r.y-1,h:r.h+1},{...r,h:r.h+1}]){if(valid(trial)&&await check(trial)){Object.assign(r,trial);grew=true;break}}}}
  found.sort((a,b)=>b.w*b.h-a.w*a.h);const unique=[];
  for(const r of found){if(!unique.some(a=>a.x===r.x&&a.y===r.y&&a.w===r.w&&a.h===r.h))unique.push(r);if(unique.length===3)break}
  return {regions:unique,tested};
 }
 root.QRRegions={search,candidates};
})(typeof window==='undefined'?globalThis:window);
