/* hamradio-sse.test.js — native streaming waterfall decodes only real
 * UberSDR SPEC frames (full and delta). Synthetic frames here are test data.
 */
'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('js/hamradio.js','utf8');
const nodes={};
const requests=[];
const listeners={};
const draw={clear:0,rows:0,shift:0};
const timers=[];
const canvasContext={
    fillStyle:'',
    clearRect:function(){draw.clear++;},
    fillRect:function(){draw.rows++;},
    drawImage:function(){draw.shift++;}
};
const document={
    activeElement:null,
    getElementById:function(id) {
        if (nodes[id]) return nodes[id];
        const handlers={};
        const n={
            id,tagName:'BUTTON',style:{},value:'',textContent:'',firstChild:null,children:[],options:[],
            getContext:function(){return canvasContext;},
            addEventListener:function(t,cb){handlers[t]=cb;},
            appendChild:function(el){n.children.push(el);n.firstChild=n.children[0];},
            removeChild:function(el){n.children.splice(n.children.indexOf(el),1);n.firstChild=n.children[0]||null;},
            getElementsByTagName:function(){return n.children;},
            click:function(){if(handlers.click)handlers.click();},
            focus:function(){document.activeElement=n;}
        };
        if(id==='ham-waterfall'){n.width=640;n.height=350;n.tagName='CANVAS';}
        if(id==='ham-band') {n.value='20m';n.options=[{value:'20m'}];n.tagName='SELECT';}
        nodes[id]=n;return n;
    },
    createElement:function(tag) {const n=this.getElementById('fake-'+Object.keys(nodes).length);n.tagName=tag.toUpperCase();return n;}
};
const window={location:{href:''},addEventListener:(name,fn)=>{listeners[name]=fn;}};
function XHR(){
    this.open=function(method,url){this.url=url;};
    this.send=function(){requests.push(this);};
    this.abort=function(){};
    this.respond=function(body){this.status=200;this.responseText=JSON.stringify(body);this.onload();};
}
function SSE(url){
    this.url=url;this.closed=false;this.handlers={};
    this.addEventListener=function(name,fn){this.handlers[name]=fn;};
    this.send=function(packet,id){this.handlers.spectrum({lastEventId:id||'20m',data:packet.toString('base64')});};
    this.close=function(){this.closed=true;};
    SSE.current=this;
}
const sandbox={
    window,document,XMLHttpRequest:XHR,EventSource:SSE,
    localStorage:{getItem:()=>null,setItem:()=>{}},
    setTimeout:(fn,ms)=>{const t={fn,ms};timers.push(t);return t;},
    clearTimeout:(t)=>{t.cancelled=true;},
    atob:(v)=>Buffer.from(v,'base64').toString('binary'),
    Uint8Array,console,JSON,Date,Math,Number,String,Array,isFinite,encodeURIComponent
};
vm.createContext(sandbox);vm.runInContext(src,sandbox);
assert.strictEqual(requests.length,2);
requests[0].respond({start_freq:14000000,end_freq:14350000,data:[-100,-80,-55]});
assert(SSE.current,'Real-time EventSource should start after FFT establishes band bounds');
assert(SSE.current.url.includes('/api/noisefloor/spectrum/stream?band=20m'));
const full=Buffer.alloc(26);full.write('SPEC',0);full[4]=1;full[5]=3;
full.set([160,170,210,250],22);
const before=draw.rows;
SSE.current.send(full);
assert.strictEqual(draw.rows,before+640,'Only receiver frame produces a new row');
assert(nodes['ham-spectrum-status'].textContent.includes('LIVE STREAM'));

const delta=Buffer.alloc(27);delta.write('SPEC',0);delta[4]=1;delta[5]=4;
delta.writeUInt16LE(1,22);delta.writeUInt16LE(2,24);delta[26]=245;
SSE.current.send(delta);
assert.strictEqual(draw.rows,before+1280);
const outdated=Buffer.alloc(26);outdated.set(full);
SSE.current.send(outdated,'40m');
assert.strictEqual(draw.rows,before+1280,'Other-band frames must be ignored');
listeners.pagehide();
assert(SSE.current.closed,'SSE must close when the user leaves the HAM screen');
console.log('HAM_SSE_REAL_FRAMES_OK full/delta SPEC decoding, live rows, band filtering, cleanup');
