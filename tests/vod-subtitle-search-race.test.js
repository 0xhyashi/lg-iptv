/* Regression: overlapping subtitle searches cannot replace current results.
 *
 * Run the real search aggregator and search UI callbacks against two deferred
 * provider replies; errors from the old search stay in its own result.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('js/player-vod.js', 'utf8');

function extract(a,b) {
    const start=source.indexOf(a),end=source.indexOf(b,start+a.length);
    assert(start>=0 && end>start,'Missing source section: '+a);
    return source.slice(start,end);
}
const requests=[];
const state={
    Promise, Array, String, Number,
    menuMode:'subs',subsOpen:true,subsOptions:[],_osSearchId:0,
    title:'',meta:{search_name:'First'},
    renderMenu:()=>{},
    searchProviders:()=>[{id:'os',label:'Provider',api:{
        search:q=>new Promise((resolve,reject)=>requests.push({q,resolve,reject}))
    }}],
    rankResults:rows=>rows
};
vm.createContext(state);
vm.runInContext(
    extract('function searchAll(q)', 'function rankResults(rows, providers)') +
    extract('function openOsSearch()', 'function downloadOsSubtitle(opt)'),state);

async function settle() {
    for(let i=0;i<8;i++) await Promise.resolve();
}
(async function() {
    state.openOsSearch();
    state.meta={search_name:'Second'};
    state.openOsSearch();
    assert.strictEqual(requests.length,2);

    requests[1].resolve([{fileId:'new',release:'New subtitle',lang:'en'}]);
    await settle();
    assert.strictEqual(state.subsOptions[0].label,'New subtitle',
        'New search should display its own result');

    requests[0].reject(new Error('old provider error'));
    await settle();
    assert.strictEqual(state.subsOptions[0].label,'New subtitle',
        'Older failure must not overwrite newer results');

    state.meta={search_name:'Third'};
    state.openOsSearch();
    state._osSearchId++; state.subsOpen=false;
    requests[2].resolve([{fileId:'late',release:'Late subtitle',lang:'en'}]);
    await settle();
    assert.strictEqual(state.subsOptions[0].label,'Searching…',
        'Closed menu must not render a late result');
    console.log('VOD_SUBTITLE_SEARCH_RACE_OK stale provider results and failures ignored.');
})().catch(error=>{console.error(error);process.exitCode=1;});
