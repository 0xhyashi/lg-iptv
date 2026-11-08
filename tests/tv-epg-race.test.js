/* Regression: a slow, empty EPG response must not overwrite a newer channel.
 *
 * This tests the real selectChannel() source in a tiny isolated browser stub.
 * In production, the EPG network request is asynchronous and may finish after
 * a user picks a different channel. Cache updates are fine; UI updates aren't.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('js/app.js', 'utf8');
const start = source.indexOf('async function selectChannel(ch)');
const end = source.indexOf('function updateOSDIfFullscreen()', start);
assert(start >= 0 && end > start, 'Cannot locate the channel selector');

const pending = {};
const epgText = {};
const a = {stream_id: 'first', name: 'First', stream_url: 'https://example.test/first', _source: 'm3u'};
const b = {stream_id: 'second', name: 'Second', stream_url: 'https://example.test/second', _source: 'm3u'};
const elements = {};
const context = {
    currentChannel: null,
    rowCache: new Map(),
    document: {
        body: {classList: {contains: () => false}},
        getElementById: id => elements[id] || (elements[id] = {
            textContent: '',style: {width: ''},classList: {add: () => {}}
        })
    },
    stopRadio: () => {},
    WeatherChannel: {close: () => {}},
    player: {play: () => {},stop: () => {}},
    _bkLastTVChannel: null,
    bunkhouseSetMode: () => {},
    m3uBuildLiveURL: ch => ch.stream_url,
    xtreamBuildLiveURL: () => '',
    cfg: {},
    setEPG: (slot, title) => {epgText[slot] = title;},
    showPreviewInfo: () => {},
    showOSD: () => {},
    epgCache: {},
    epgBlocked: false,
    m3uGetEPG: sid => new Promise(resolve => {pending[sid] = resolve;}),
    xtreamGetEPG: () => Promise.resolve([]),
    Net: {isHttpError: () => false},
    patchEpgStrip: () => {},
    scheduleEpgSave: () => {},
    _findNowNext: () => ({cur: {title: 'Program B'},next: null}),
    epgTitle: e => e.title,
    formatTimeRange: () => '',
    epgDesc: () => '',
    calcProgress: () => 0
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

async function run() {
    const first = context.selectChannel(a);
    const second = context.selectChannel(b);
    assert(pending.first && pending.second, 'Each channel should fetch its guide');

    pending.second([{title:'Program B'}]);
    await second;
    assert.strictEqual(context.currentChannel, b);
    assert.strictEqual(epgText.now, 'Program B');

    pending.first([]);
    await first;
    assert.strictEqual(epgText.now, 'Program B',
        'Stale empty EPG incorrectly overwrote the newer channel');
    assert.strictEqual(context.currentChannel, b);
    console.log('TV_EPG_RACE_OK: stale empty guide cannot overwrite selected station.');
}
run().catch(error => {console.error(error);process.exitCode = 1;});
