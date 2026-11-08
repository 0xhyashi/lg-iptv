/* Regression: leaving an archive invalidates its outstanding schedule request.
 *
 * Exercises the actual catch-up navigation functions with a small DOM stub.
 * A late response must not redraw the archive or steal focus from Home.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('js/catchup.js', 'utf8');

function extract(first, next) {
    const a = source.indexOf(first);
    const b = source.indexOf(next, a + first.length);
    assert(a >= 0 && b > a, 'Cannot find ' + first);
    return source.slice(a, b);
}

const pending = {};
const element = () => ({
    hidden: false, innerHTML: '', textContent: '', classList: {add() {}, remove() {}}
});
const state = {
    epgReqKey: 0, pendingMainFocus: true, mainMode: 'cw', currentCh: null,
    elCw: element(), elArchive: element(), elMainTitle: element(), elMainSub: element(),
    elDayTabs: element(), elProgList: element(), pins: [], daysData: [], activeDayIdx: 0,
    document: {querySelectorAll: () => []},
    archiveDays: () => 2,
    showPlaceholder: () => {},
    hidePlaceholder: () => {},
    buildDays: () => {state.buildCount++;state.daysData = [{}];},
    renderDayTabs: () => {state.renderCount++;},
    renderProgrammes: () => {state.renderCount++;},
    focusMain: () => {state.focusCount++;},
    paintArchive: () => {state.focusCount++;},
    getDataTable: streamId => new Promise(resolve => {pending[streamId] = resolve;}),
    buildCount: 0, renderCount: 0, focusCount: 0
};
vm.createContext(state);
vm.runInContext(
    extract('function openHome()', 'function resolvePin(') +
    extract('function selectChannel(ch)', 'function buildDays('), state);

async function test() {
    const ch1 = {stream_id: 'one', name: 'One'};
    const ch2 = {stream_id: 'two', name: 'Two'};

    state.selectChannel(ch1);
    assert(pending.one, 'First channel requested its archive');

    state.openHome();
    pending.one([{start_timestamp: 10}]);
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(state.mainMode, 'cw');
    assert.strictEqual(state.buildCount, 0, 'Stale channel data must not rebuild the archive');
    assert.strictEqual(state.renderCount, 0, 'Stale channel data must not redraw archive tabs');
    assert.strictEqual(state.focusCount, 0, 'Stale channel must not steal focus');
    assert.strictEqual(state.pendingMainFocus, false);

    state.selectChannel(ch1);
    state.selectChannel(ch2);
    pending.two([]);
    await Promise.resolve();
    pending.one([]);
    await Promise.resolve();
    assert.strictEqual(state.currentCh, ch2, 'Only the latest channel owns the UI');
    console.log('CATCHUP_NAV_RACE_OK: stale archive responses ignored after Home or channel switch.');
}
test().catch(error => {console.error(error); process.exitCode = 1;});
