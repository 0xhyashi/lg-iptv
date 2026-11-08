/* Regression: an old series request cannot erase another title's episode UI.
 *
 * Evaluates the real loadSeries() method with deferred Xtream responses.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('js/vod/detail.js', 'utf8');
const start = source.indexOf('function loadSeries(item)');
const end = source.indexOf('/* The season\'s episodes', start);
assert(start >= 0 && end > start, 'Cannot find production series loader');
const tab = {innerHTML:''};
const list = {innerHTML:''};
const pending = [];
const state = {
    document:{getElementById: id => id === 'vod-season-tabs' ? tab : list},
    fetchJSON: () => new Promise((resolve,reject) => {pending.push({resolve,reject});}),
    apiUrl: value => value,
    encodeURIComponent,
    detailItem:null, seasonsData:null,
    Subs:{recordDiag:()=>{}, fromEpisode:()=>{}, describePayload:()=>{},rawSample:()=>{}},
    titleOf:()=>'', cfg:{}
};
vm.createContext(state);
vm.runInContext(source.slice(start,end), state);

(async function () {
    const old = {series_id:'first'}, current = {series_id:'second'};
    state.detailItem = old;
    state.loadSeries(old);
    state.detailItem = current;
    state.loadSeries(current);
    assert.strictEqual(pending.length,2);
    pending[0].reject(new Error('old failure'));
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(list.innerHTML,'<div class="vod-ep-loading">Loading episodes…</div>',
        'Old failure must not overwrite new title loading state');
    pending[1].reject(new Error('current failure'));
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(list.innerHTML,'<div class="vod-ep-loading">Could not load episodes.</div>',
        'Current title failure should still show its actual status');
    console.log('VOD_SERIES_RACE_OK stale series errors leave new title undisturbed.');
})().catch(err=>{console.error(err);process.exitCode=1;});
