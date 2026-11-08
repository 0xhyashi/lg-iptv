/* Regression: delayed native audio-track checks must belong to active playback.
 *
 * Uses the production class method, not a reimplementation, with fake timers.
 * Changing channels or engines invalidates callbacks that would otherwise
 * seek the new title or update its audio-selection UI.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('js/player/engine.js', 'utf8');
const start = source.indexOf('    setAudioTrack(track, done) {');
const end = source.indexOf('    _audioSwitchHint()', start);
assert(start >= 0 && end > start, 'Cannot locate the native audio selector');

const scheduled = [];
const context = {isFinite, Math, setTimeout: fn => {scheduled.push(fn); return scheduled.length;}};
vm.createContext(context);
vm.runInContext(
    'class Probe { _alive(gen,tok) { return gen===this._gen && tok===this._tok; } ' +
    source.slice(start, end) +
    ' _audioSwitchHint() { return "Audio change ignored"; } }; this.Probe = Probe;', context);

function makePlayer(allowSwitch) {
    const player = new context.Probe();
    player._gen = 1;
    player._tok = 1;
    player.video = {
        duration: 120, currentTime: 38, audioTracks: [
            {enabled: true},
            allowSwitch ? {enabled: false} : Object.defineProperty({}, 'enabled', {
                get() { return false; }, set() {}
            })
        ]
    };
    return player;
}
function flushOne() {
    assert(scheduled.length, 'Expected a delayed track check');
    scheduled.shift()();
}
function run() {
    let calls = 0;
    const old = makePlayer(true);
    old.setAudioTrack({src: 'native', id: 1}, () => {calls++;});
    old._gen++; // switched media before the delayed verification
    flushOne();
    assert.strictEqual(calls, 0, 'Old selection must not report on a new video');
    assert.strictEqual(old.video.currentTime, 38, 'Old selection must not seek the new video');

    const active = makePlayer(true);
    active.setAudioTrack({src: 'native', id: 1}, ok => {
        calls++;
        assert.strictEqual(ok, true);
    });
    flushOne();
    assert.strictEqual(calls, 1, 'Current selection must still complete');

    const failed = makePlayer(false);
    failed.setAudioTrack({src: 'native', id: 1}, () => {calls++;});
    flushOne(); // first check failed; schedules seek follow-up
    failed._tok++; // engine changed while seek was being verified
    flushOne();
    assert.strictEqual(calls, 1, 'Old seek verification must be ignored');
    console.log('PLAYER_AUDIO_RACE_OK: stale native track callbacks cannot affect new playback.');
}
run();
