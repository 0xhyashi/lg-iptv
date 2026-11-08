/* Core API contract tests for the shared network and localStorage helpers.
 *
 * These run without a browser or external network. They protect the storage
 * format and timeout behavior on older LG webOS versions where fetch abort
 * signals can be missing or ineffective.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const storage = new Map();
const localStorage = {
    get length() { return storage.size; },
    key: function (index) { return Array.from(storage.keys())[index] || null; },
    getItem: function (key) { return storage.has(key) ? storage.get(key) : null; },
    setItem: function (key, value) { storage.set(String(key), String(value)); },
    removeItem: function (key) { storage.delete(String(key)); }
};
const context = {
    window: {},
    localStorage: localStorage,
    Promise: Promise,
    Date: Date,
    Map: Map,
    Error: Error,
    JSON: JSON,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    AbortController: function () { this.signal = {}; this.abort = function () {}; },
    fetch: function () { return new Promise(function () {}); } // intentionally never resolves
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/core/store.js','utf8'),context,{filename:'store.js'});
vm.runInContext(fs.readFileSync('js/core/net.js','utf8'),context,{filename:'net.js'});

async function run() {
    const Store = context.window.Store, Net = context.window.Net;
    assert(Store && Net,'Shared storage and HTTP layers should initialize.');

    assert.strictEqual(Store.setRaw('player-mode','native'),true);
    assert.strictEqual(Store.getRaw('player-mode'),'native');
    assert.strictEqual(localStorage.getItem('player-mode'),'native',
        'Plain strings must never be JSON-quoted.');

    assert.strictEqual(Store.set('settings',{quality:'auto'}),true);
    assert.strictEqual(Store.get('settings').quality,'auto');
    assert.strictEqual(Store.get('missing',{fallback:true}).fallback,true);
    assert.strictEqual(Store.set('zero',0),true);
    assert.strictEqual(Store.get('zero'),0);

    assert.strictEqual(Store.cacheSet('vod_content_test',['one','two']),true);
    assert.strictEqual(Store.cacheGet('vod_content_test').length,2);
    localStorage.setItem('iptv_epg_v2:expired',
        JSON.stringify({ts:Date.now()-3600000,data:['old']}));
    assert.strictEqual(Store.cacheGet('iptv_epg_v2:expired',100),null,
        'Expired data must never be returned.');
    assert.strictEqual(localStorage.getItem('iptv_epg_v2:expired'),null,
        'Expired cache entries should be removed.');

    const removed = Store.removeByPrefix('vod_content_');
    assert.strictEqual(removed,1,'Prefix eviction should report the number removed.');
    assert.strictEqual(Store.getRaw('player-mode'),'native',
        'Cache deletion must preserve user settings.');
    assert.strictEqual(Store.cacheAge('no-such-cache'),-1);
    assert(Store.bytesUsed()>=0);

    // False and zero are valid cached values, not missing entries.
    assert.strictEqual(Store.cacheSet('cached_false', false), true);
    assert.strictEqual(Store.cacheSet('cached_zero', 0), true);
    assert.strictEqual(await Net.cachedJSON('cached_false', 'https://test.example/hangs', 60000), false);
    assert.strictEqual(await Net.cachedJSON('cached_zero', 'https://test.example/hangs', 60000), 0);
    assert.strictEqual(await Net.staleWhileRevalidate('cached_zero', 'https://test.example/hangs', 60000), 0);

    const http = Net.httpError(403,'https://test.example/api');
    assert.strictEqual(Net.isHttpError(http,403),true);
    assert.strictEqual(Net.isHttpError(http,404),false);
    assert.strictEqual(Net.isHttpError(new Error('403 in message'),403),false);

    // Our fake fetch ignores abort(), simulating the old webOS native-fetch
    // issue. Net.timed must reject on its own, instead of hanging forever.
    let rejected = false;
    const callerOptions = { cache: 'no-store' };
    try {
        await Net.timed('https://test.example/hangs', callerOptions, 20);
    } catch (error) {
        rejected = error && error.timeout === true;
    }
    assert.strictEqual(callerOptions.signal, undefined, 'Timed requests must not mutate caller options.');
    assert(rejected,'Timed requests must reject even when abort() does nothing.');
    console.log('CORE_CONTRACTS_OK storage formats, cache values, TTL/eviction and reliable HTTP deadline.');
}
run().catch(function (error) { console.error(error); process.exitCode = 1; });
