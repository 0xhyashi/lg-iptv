/* Regression: IPTV credentials must never be sent via an automatic
 * HTTPS-to-HTTP fallback. Protocol-relative resources inherit the profile
 * scheme instead of always using HTTP.
 */
'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm');
const context={window:{},Store:{get:()=>null,set:()=>true},Date,Math,JSON,String,encodeURIComponent};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/core/config.js','utf8'),context);
const config=context.window.Config;
assert(config,'Config API missing');
const list=config.candidateUrls({server_urls:['https://iptv.example.test','https://iptv.example.test']});
assert.deepStrictEqual(Array.from(list),['https://iptv.example.test']);
const secure={server_url:'https://iptv.example.test',username:'alice',password:'secret'};
assert.strictEqual(config.absUrl(secure,'//cdn.example.test/sub.srt'),'https://cdn.example.test/sub.srt');
assert.strictEqual(config.absUrl({...secure,server_url:'http://iptv.example.test'},'//cdn.example.test/sub.srt'),'http://cdn.example.test/sub.srt');
assert(config.apiUrl(secure,'action=get_live_categories').startsWith('https://iptv.example.test/'));
console.log('CONFIG_HTTPS_OK: explicit HTTPS only, and protocol-relative resources keep the configured scheme');
