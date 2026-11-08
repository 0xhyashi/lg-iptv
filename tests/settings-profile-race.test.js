/* Regression: corrupt stored profiles and stale asynchronous login responses.
 *
 * The production Settings code is evaluated with small browser/service stubs.
 * An earlier server reply cannot activate the wrong editor's IPTV profile.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('js/settings.js', 'utf8');

function section(a, b) {
    const start = source.indexOf(a), end = source.indexOf(b, start + a.length);
    assert(start >= 0 && end > start, 'Missing settings section ' + a);
    return source.slice(start, end);
}

const storage = {
    load: key => key === 'iptv_profiles' ? {broken: true} : null,
    save: () => {},
    makeId: () => 'recovered'
};
vm.createContext(storage);
vm.runInContext(section('function loadProfiles()', 'function saveProfiles(arr)'), storage);
assert(Array.isArray(storage.loadProfiles()), 'Corrupt profile storage must be recovered as a list');

const callbacks = {};
const requested = [];
const fields = {
    'prof-name': 'Test',
    'prof-username': 'user',
    'prof-password': 'password',
    'prof-epg-url': '',
    'prof-epg-match': 'tvg-id'
};
const state = {
    profiles: [{id:'one'}, {id:'two'}],
    selectedId:'one', activeId:null, connectSerial:0,
    document:{getElementById: id => ({
        value: fields[id] || '',
        addEventListener: (event, callback) => {callbacks[id] = callback;}
    })},
    getCurrentEditorType: () => 'xtream',
    getUrlsFromList: () => ['https://provider.example'],
    saveProfiles: () => {},
    renderProfileList: () => {},
    setStatus: () => {},
    setActiveId: id => {state.activeId = id;},
    save: () => {},
    Store:{remove: () => {}},
    Config:{candidateUrls: () => ['https://provider.example']},
    Net:{json: () => new Promise(resolve => {requested.push(resolve);})},
    encodeURIComponent, Number, String,
    setTimeout: () => {},
    tvGoBack: () => {}
};
vm.createContext(state);
vm.runInContext(
    section("document.getElementById('save-profile-btn').addEventListener", '/* ── Display panel'), state);

(async function () {
    callbacks['save-profile-btn']();
    assert.strictEqual(requested.length, 1, 'First profile should begin a login');
    state.selectedId = 'two';
    state.connectSerial++; // same invalidation as selecting another profile
    callbacks['save-profile-btn']();
    assert.strictEqual(requested.length, 2, 'Second profile should begin a login');

    requested[0]({user_info:{auth:1,status:'Active'}});
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(state.activeId, null, 'Stale server reply must not activate the previous profile');

    requested[1]({user_info:{auth:1,status:'Active'}});
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(state.activeId, 'two', 'Latest successful login should activate the current profile');
    console.log('SETTINGS_PROFILE_RACE_OK corrupt storage recovered; stale login ignored.');
})().catch(error => {console.error(error);process.exitCode = 1;});
