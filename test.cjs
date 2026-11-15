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
 select(){}
}
const nodes={data:new Element()};
nodes.data.value='https://example.com';
const document={addEventListener(){},getElementById:id=>nodes[id]??=new Element(),createElementNS:(ns,tag)=>Object.assign(new Element(),{tag}),querySelectorAll:()=>[]};
const context=vm.createContext({document,QREngine:{create:QRCode.create,decode:jsQR},console,Uint8Array,Set});
vm.runInContext(fs.readFileSync('app.js','utf8'),context);
function serialize(node){return `<${node.tag} ${Object.entries(node.attrs).map(([k,v])=>`${k}="${v.replaceAll('&','&amp;').replaceAll('"','&quot;')}"`).join(' ')}>${node.children.map(serialize).join('')}</${node.tag}>`}
function decodeSvg(){const svg=serialize(vm.runInContext('makeSvg()',context));assert(!svg.includes('data-cell'));assert(svg.includes('#FF0088'));assert(svg.includes('#000000'));assert(!svg.includes('rx='));const size=vm.runInContext('(code.modules.size+8)*8',context);const rendered=new Resvg(svg,{fitTo:{mode:'width',value:size}}).render();const png=PNG.sync.read(rendered.asPng());return jsQR(new Uint8ClampedArray(png.data),png.width,png.height)?.data}
let checked=0;
for(const data of process.env.QR_TEST_STYLES_ONLY?[]:['https://example.com','https://mayabachrach.github.io/QR-playground/?a=hello&b=world','https://example.org/'+ 'abcdef'.repeat(20)]){
 context.testPayload=data;
 vm.runInContext('rebuild(testPayload)',context);
 assert.equal(decodeSvg(),data);
 checked++;
}
vm.runInContext('rebuild("https://example.com"); cells[Array.from(code.modules.reservedBit).findIndex(x=>!x)]^=1',context);
assert.equal(decodeSvg(),nodes.data.value);checked++;
// Keyboard cursor must move, remain bounded and never appear in exported files.
const source=fs.readFileSync('app.js','utf8');
assert(!source.includes('data-cell'), 'The QR must not have mouse click targets');
vm.runInContext('rebuild()',context);
const start=vm.runInContext('[cursorX,cursorY]',context);
vm.runInContext('moveCursor(1,0)',context);
const moved=vm.runInContext('[cursorX,cursorY]',context);
assert.equal(moved[0],Math.min(start[0]+1,vm.runInContext('code.modules.size-1',context)));
assert.equal(moved[1],start[1]);
const plain=serialize(vm.runInContext('makeSvg()',context));
const marked=serialize(vm.runInContext('makeSvg(true)',context));
assert(marked.includes('stroke=')&&!plain.includes('stroke='),
 'A selected square must be visible in the editor, but not in the QR export');
checked++;

for(const path of process.argv.slice(2)){const bytes=fs.readFileSync(path);const png=path.endsWith('.svg')?PNG.sync.read(new Resvg(bytes).render().asPng()):PNG.sync.read(bytes);assert.equal(jsQR(new Uint8ClampedArray(png.data),png.width,png.height)?.data,'https://example.com');checked++}
console.log(`${checked} classic black-on-marker-pink QR decoding checks passed.`);
