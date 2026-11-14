/* weatherstar-polyfills.test.js — simulate missing old LG built-ins in a
 * separate VM realm. The upstream WeatherStar renderer must still start.
 */
'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');

const src=fs.readFileSync('assets/weatherstar-compat.js','utf8');
const eventHandlers={};
const W={
    location:{protocol:'https:'},
    addEventListener:function(type,fn){eventHandlers[type]=fn;},
    parent:{postMessage:function(){}}
};
const ctx=vm.createContext({window:W,document:{},setInterval:function(){},setTimeout:function(){}});
vm.runInContext(`
    window.Promise = Promise;
    delete Promise.allSettled;
    delete Object.hasOwn;
    delete Object.fromEntries;
    delete Array.prototype.flat;
    delete Array.prototype.flatMap;
    delete String.prototype.padStart;
    delete String.prototype.padEnd;
    delete String.prototype.replaceAll;
`,ctx);
vm.runInContext(src,ctx);
const result=vm.runInContext(`({
    long: 'ABCDEFG'.padStart(3,'0'),
    short: 'AB'.padStart(5,'0'),
    end: 'AB'.padEnd(4,'-'),
    swapped: 'x-x'.replaceAll('x','y'),
    regex: 'A A'.replaceAll(/A/g,'B'),
    flatten: [1,[2,3]].flat(),
    mapped: [1,2].flatMap(v=>[v,v+10]),
    entries: Object.fromEntries([['a',2],['b',3]]),
    has: Object.hasOwn({a:1},'a')
})`,ctx);
assert.strictEqual(result.long,'ABCDEFG');
assert.strictEqual(result.short,'000AB');
assert.strictEqual(result.end,'AB--');
assert.strictEqual(result.swapped,'y-y');
assert.strictEqual(result.regex,'B B');
assert.deepStrictEqual(Array.from(result.flatten),[1,2,3]);
assert.deepStrictEqual(Array.from(result.mapped),[1,11,2,12]);
assert.strictEqual(result.entries.a,2);
assert.strictEqual(result.has,true);
(async function(){
    const settled=await vm.runInContext("Promise.allSettled([Promise.resolve(1),Promise.reject('no')])",ctx);
    assert.strictEqual(settled[0].status,'fulfilled');
    assert.strictEqual(settled[1].status,'rejected');
    console.log('WEATHERSTAR_LEGACY_BUILTINS_OK latest upstream APIs work on simulated old webOS');
})().catch(e=>{console.error(e);process.exitCode=1;});
