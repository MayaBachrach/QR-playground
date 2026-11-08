const assert=require('node:assert/strict');
require('./regions.js');
(async()=>{
 const size=21,reserved=new Uint8Array(size*size),dark=new Uint8Array(size*size).fill(1);
 for(let i=0;i<size;i++){reserved[i]=1;reserved[i*size]=1}
 let calls=0;
 const result=await QRRegions.search({size,reserved,dark,verify:async r=>{calls++;for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)assert.equal(reserved[y*size+x],0);return r.w*r.h<=90},limit:120});
 assert(result.regions.length>0);assert.equal(calls,result.tested);assert(calls<=184);
 let last=Infinity;for(const r of result.regions){assert(r.w*r.h<=90);assert(r.w*r.h<=last);last=r.w*r.h}
 assert(dark.every(x=>x===1),'search must not alter the input');
 const none=await QRRegions.search({size,reserved,dark,verify:async()=>false,limit:12});assert.equal(none.regions.length,0);assert.equal(none.tested,12);
 console.log('Region search: protected modules, whole-area validation, ordering, budget and rejection passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
