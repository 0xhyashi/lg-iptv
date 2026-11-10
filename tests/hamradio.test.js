/* hamradio.test.js — test the live UberSDR JSON decoder, native canvas,
 * actual voice-detection list, IPv6 handling, and teardown without network.
 * Synthetic data exists ONLY in this test, never in the app's UI.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/hamradio.js','utf8');
assert(!source.includes('ham-frame') && !source.includes('spinthedial.live'),
    'No third-party SDR website iframe or broken voice scanner remains');
assert(source.includes('/api/noisefloor/fft?band='), 'Real FFT API missing');
assert(source.includes('/api/noisefloor/voice-activity/all'), 'Real voice API missing');

const elements = {};
const timers = [];
const requests = [];
const listeners = {};
const stored = {};
const drawing = {rows:0,shift:0,clears:0};
const canvasContext = {
    fillStyle:'',
    clearRect:function(){drawing.clears++;},
    drawImage:function(){drawing.shift++;},
    fillRect:function(){drawing.rows++;}
};
function element(id) {
    if (elements[id]) return elements[id];
    const handlers={};
    const e={
        id:id, style:{}, value:'', textContent:'', tagName:'BUTTON',
        firstChild:null, children:[], options:[],
        addEventListener:function(type,cb){handlers[type]=cb;},
        dispatch:function(type){if(handlers[type]) handlers[type]();},
        click:function(){e.dispatch('click');},
        focus:function(){document.activeElement=e;},
        appendChild:function(child){e.children.push(child);e.firstChild=e.children[0];},
        removeChild:function(child){e.children.splice(e.children.indexOf(child),1);e.firstChild=e.children[0]||null;},
        getElementsByTagName:function(tag){return e.children.filter(x=>x.tagName===tag.toUpperCase());},
        getContext:function(){return canvasContext;}
    };
    if(id==='ham-waterfall'){e.width=640;e.height=350;e.tagName='CANVAS';}
    if(id==='ham-band'){
        e.tagName='SELECT';e.value='20m';
        e.options=['80m','40m','20m','17m','15m','10m'].map(v=>({value:v}));
    }
    if(id==='ham-source') e.tagName='INPUT';
    elements[id]=e;return e;
}
const document={activeElement:null,getElementById:element,createElement:function(tag){
    const e=element('created-'+Object.keys(elements).length);
    e.tagName=tag.toUpperCase();return e;
}};
const window={location:{href:''},addEventListener:(type,cb)=>{listeners[type]=cb;}};
const localStorage={getItem:key=>stored[key]||null,setItem:(key,val)=>{stored[key]=val;}};
function XHR() {
    this.status=0;this.responseText='';
    this.open=(method,url)=>{assert.strictEqual(method,'GET');this.url=url;};
    this.send=()=>{requests.push(this);};
    this.abort=()=>{this.aborted=true;};
    this.respond=(status,body)=>{
        this.status=status;this.responseText=JSON.stringify(body);
        if(this.onload)this.onload();
    };
}
const sandbox={window,document,localStorage,XMLHttpRequest:XHR,
    setTimeout:(fn,delay)=>{const timer={fn,delay};timers.push(timer);return timer;},
    clearTimeout:(obj)=>{obj.cancelled=true;},
    console,Date,Math,isFinite,Number,Array,String,JSON,encodeURIComponent};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:'hamradio.js'});
assert.strictEqual(requests.length,2,'FFT and voice endpoints should poll the same receiver');
assert(requests[0].url.includes('kb5avy.tunnel.ubersdr.org/api/noisefloor/fft?band=20m'));
assert(requests[1].url.includes('kb5avy.tunnel.ubersdr.org/api/noisefloor/voice-activity/all'));

requests[0].respond(200,{start_freq:14000000,end_freq:14350000,
    data:Array(1024).fill(-96).map((x,i)=>i%120<8?-54:x)});
assert.strictEqual(drawing.rows,640,'One line of real FFT bins must be drawn');
assert.strictEqual(element('ham-empty').style.display,'none');
assert(element('ham-spectrum-status').textContent.includes('REAL RF'));

requests[1].respond(200,{bands:{'20m':[
    {estimated_dial_freq:14225000,mode:'USB',confidence:.89,snr:13,dx_callsign:'TEST'},
    {estimated_dial_freq:14230000,mode:'USB',confidence:.51,snr:2}
]}});
assert.strictEqual(element('ham-voice-list').children.length,1,'Ignore low-confidence voice guesses');
element('ham-scan').click();
assert.strictEqual(element('ham-frequency').textContent,'14.2250 MHz');
assert.strictEqual(element('ham-tune-marker').style.display,'block');
assert(element('ham-tune-marker').style.left.startsWith('64.'),'Marker reflects real 14.225 MHz');
assert(element('ham-status').textContent.includes('AUDIO not yet integrated'),
    'Never claim that voice selection is already audible');

element('ham-source').value='javascript:alert(1)';
const count=requests.length;
element('ham-apply').click();
assert.strictEqual(requests.length,count,'Reject non-HTTP receiver schemes');

element('ham-source').value='http://[2001:db8::1]:8073';
element('ham-apply').click();
assert.strictEqual(stored.bunkhouse_ham_receiver_url,'http://[2001:db8::1]:8073');
assert(requests.slice(-2).every(r=>r.url.startsWith('http://[2001:db8::1]:8073/')));
element('ham-back').click();
assert.strictEqual(window.location.href,'../pages/livetv.html');
assert(requests.slice(-2).every(r=>r.aborted),'Network requests must abort on exit');
console.log('HAM_NATIVE_API_OK genuine RF and voice endpoints, canvas, marker, URI validation, cleanup');
