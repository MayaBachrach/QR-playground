const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const QRCode=require('qrcode');
const jsQR=require('jsqr');
const {Resvg}=require('@resvg/resvg-js');
const {PNG}=require('pngjs');
class Element{
 constructor(){this.attrs={};this.children=[];this.value='';}
 setAttribute(k,v){this.attrs[k]=String(v)}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 addEventListener(){}
}
const fields={data:'https://example.com',mask:'0',level:'H',foreground:'#241a27',background:'#ffffff',dots:'square',corners:'square'};
const nodes={};for(const [id,value]of Object.entries(fields)){nodes[id]=new Element();nodes[id].value=value}
const document={getElementById:id=>nodes[id]??=new Element(),createElementNS:(ns,tag)=>Object.assign(new Element(),{tag}),querySelectorAll:()=>[]};
const context=vm.createContext({document,QREngine:{create:QRCode.create,decode:jsQR},console,Uint8Array,Set});
vm.runInContext(fs.readFileSync('app.js','utf8'),context);
function serialize(node){return `<${node.tag} ${Object.entries(node.attrs).map(([k,v])=>`${k}="${v.replaceAll('&','&amp;').replaceAll('"','&quot;')}"`).join(' ')}>${node.children.map(serialize).join('')}</${node.tag}>`}
function decodeSvg(){const svg=serialize(vm.runInContext('makeSvg()',context));assert(!svg.includes('data-cell'));const size=vm.runInContext('(code.modules.size+8)*8',context);const rendered=new Resvg(svg,{fitTo:{mode:'width',value:size}}).render();const png=PNG.sync.read(rendered.asPng());return jsQR(new Uint8ClampedArray(png.data),png.width,png.height)?.data}
let checked=0;
for(const data of process.env.QR_TEST_STYLES_ONLY?[]:['https://example.com','https://mayabachrach.github.io/QR-playground/?a=hello&b=world','https://example.org/'+ 'abcdef'.repeat(20)]){
 for(const level of ['L','M','Q','H'])for(let mask=0;mask<8;mask++){
  Object.assign(nodes.data,{value:data});nodes.level.value=level;nodes.mask.value=String(mask);nodes.corners.value='star';vm.runInContext('rebuild()',context);assert.equal(decodeSvg(),data,`star: level ${level}, mask ${mask}, length ${data.length}`);checked++;
 }
}
nodes.data.value='https://example.com';nodes.level.value='H';nodes.corners.value='square';
for(const dots of ['square','rounded','dots','classy','extra-rounded'])for(const corner of ['square','extra-rounded','dot','star']){nodes.dots.value=dots;nodes.corners.value=corner;vm.runInContext('rebuild()',context);assert.equal(decodeSvg(),nodes.data.value,`${dots}/${corner}`);checked++}
nodes.dots.value='square';nodes.corners.value='star';vm.runInContext('rebuild(); cells[Array.from(code.modules.reservedBit).findIndex(x=>!x)]^=1',context);assert.equal(decodeSvg(),nodes.data.value);checked++;
for(const path of process.argv.slice(2)){const bytes=fs.readFileSync(path);const png=path.endsWith('.svg')?PNG.sync.read(new Resvg(bytes).render().asPng()):PNG.sync.read(bytes);assert.equal(jsQR(new Uint8ClampedArray(png.data),png.width,png.height)?.data,'https://example.com');checked++}
console.log(`${checked} rendered QR and export decoding checks passed.`);
