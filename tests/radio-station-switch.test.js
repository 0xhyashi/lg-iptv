/* Reproduce the LG station-switch race without a TV.
 * Reuse of a single HTMLAudioElement let stale pipeline events arrive for
 * the next channel. Every tune must retire the old decoder, and stale play()
 * promises/events MUST NOT mutate the visible new station.
 */
'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('js/livetv/radio.js','utf8');
const nodes={}, audioObjects=[];
let channel=null;
function element(tag) {
    const attrs={}, handlers={};
    const e={
        id:'',tagName:tag.toUpperCase(),style:{},className:'',
        textContent:'',innerHTML:'',value:'',href:'',src:'',
        paused:true,readyState:0,preload:'none',
        parentNode:null,children:[],handlers:handlers,
        addEventListener:function(event,fn){(handlers[event]||(handlers[event]=[])).push(fn);},
        removeAttribute:function(k){delete attrs[k];if(k==='src')this.src='';},
        getAttribute:function(k){return k==='src'?(this.src||null):(attrs[k]||null);},
        setAttribute:function(k,v){attrs[k]=String(v);},
        appendChild:function(child){this.children.push(child);child.parentNode=this;},
        removeChild:function(child){this.children=this.children.filter(x=>x!==child);child.parentNode=null;},
        classList:{add:function(){},remove:function(){},toggle:function(){}},
        focus:function(){},
        emit:function(ev){(handlers[ev]||[]).forEach(fn=>fn({target:this}));}
    };
    if(tag==='audio') {
        audioObjects.push(e);
        e.play=function(){
            this.paused=false;this.readyState=3;
            return new Promise((resolve,reject)=>{this.rejectPlay=reject;this.resolvePlay=resolve;});
        };
        e.pause=function(){this.paused=true;this.emit('pause');};
        e.load=function(){this.readyState=0;};
    }
    return e;
}
const audioParent={
    replaceChild:function(next,old){
        assert.strictEqual(nodes['radio-audio'],old);
        old.parentNode=null;
        next.parentNode=this;
        nodes['radio-audio']=next;
    }
};
nodes['radio-audio']=element('audio');nodes['radio-audio'].id='radio-audio';
nodes['radio-audio'].parentNode=audioParent;
const document={
    hidden:true,
    getElementById:id=>{
        if(!nodes[id])nodes[id]=element('div');
        return nodes[id];
    },
    createElement:element,
    querySelectorAll:()=>[],
    addEventListener:()=>{},
    head:{appendChild:()=>{}}
};
const window={addEventListener:()=>{}};
const localStorage={getItem:()=>null,setItem:()=>{}};
const sandbox={
    document,window,localStorage,
    console,Promise,Date,Math,RegExp,Error,JSON,
    setInterval,clearInterval,setTimeout,clearTimeout,
    requestAnimationFrame:undefined,
    cancelAnimationFrame:()=>{},
    get currentChannel(){return channel;},
    set currentChannel(v){channel=v;}
};
vm.createContext(sandbox);
vm.runInContext(src,sandbox,{filename:'radio.js'});
const deck=sandbox.RadioDeck;
function tune(id) {
    const ch={stream_id:id,name:id,stream_url:'https://example.test/'+id+'.mp3',_radio:true};
    channel=ch;
    deck.play(ch);
    return {ch,a:nodes['radio-audio']};
}
(async()=>{
    let x=tune('wtmd');
    assert.strictEqual(x.a.src,'https://example.test/wtmd.mp3');
    let y=tune('new-orleans');
    assert.notStrictEqual(x.a,y.a,'station change must create a NEW native decoder');
    assert.strictEqual(x.a.paused,true,'previous decoder must be paused');
    assert.strictEqual(x.a.parentNode,null,'previous decoder must be detached');
    assert.strictEqual(x.a.src,'','previous station src must be cleared');
    assert.strictEqual(y.a.src,'https://example.test/new-orleans.mp3');
    assert.strictEqual(nodes['radio-name'].textContent,'new-orleans');
    assert.strictEqual(nodes['radio-status'].textContent,'Connecting…');
    x.a.emit('playing'); // delayed event from old WTMD stream
    x.a.rejectPlay(new Error('stale WTMD tune failed'));
    await Promise.resolve();await Promise.resolve();
    assert.strictEqual(nodes['radio-status'].textContent,'Connecting…',
      'late callbacks from old station must not overwrite new station');
    y.a.emit('playing');
    assert.strictEqual(nodes['radio-status'].textContent,'LIVE · Listening');
    console.log('RADIO_STALE_EVENT_GUARD_OK old station cannot replace new station status');

    for (let i=0;i<15;i++) {
        const old=nodes['radio-audio'];
        const z=tune('rapid-'+i);
        assert.notStrictEqual(old,z.a,'every tune must replace audio decoder');
        assert.strictEqual(old.paused,true);
        assert.strictEqual(z.a.src,'https://example.test/rapid-'+i+'.mp3');
    }
    deck.stop();
    assert.strictEqual(nodes['radio-audio'].src,'');
    assert.strictEqual(nodes['radio-audio'].paused,true);
    assert(audioObjects.length>=18);
    console.log('RADIO_FAST_SWITCH_OK 17 sequential station changes isolated, decoder stopped');
})().catch(error=>{console.error(error);process.exitCode=1;});
