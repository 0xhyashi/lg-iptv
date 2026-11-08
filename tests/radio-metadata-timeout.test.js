/* Regression: radio ICY probes must reject even when fetch ignores abort().
 *
 * Older LG webOS builds can accept a connection and never resolve fetch or
 * reader.read(). A timeout must settle metadata polling independently.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('js/livetv/radio.js', 'utf8');
const start = source.indexOf('function metaFromIcy(ch)');
const end = source.indexOf('function pollMetadata(ch)', start);
assert(start >= 0 && end > start, 'Cannot locate ICY metadata reader');

let onDeadline, aborted = false;
const context = {
    Promise, Error, Number, parseInt,
    AbortController: function () {
        this.signal = {};
        this.abort = () => {aborted = true;}; // abort does NOT settle fetch
    },
    setTimeout: fn => {onDeadline = fn; return 1;},
    clearTimeout: () => {},
    fetch: () => new Promise(() => {})
};
vm.createContext(context);
vm.runInContext(source.slice(start,end),context);

(async function () {
    const result = context.metaFromIcy({stream_url:'https://example.test/stuck.mp3'});
    assert.strictEqual(typeof onDeadline, 'function');
    onDeadline();
    await assert.rejects(result,/ICY metadata timeout/);
    assert.strictEqual(aborted, true);
    console.log('RADIO_ICY_TIMEOUT_OK stalled radio metadata rejects independently of abort().');
})().catch(err => {console.error(err);process.exitCode=1;});
