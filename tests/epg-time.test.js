/* EPG time-formatting regressions: malformed or zero-duration entries must
 * never paint a NaN progress width or display midnight as a missing time.
 * Uses the real small time helpers without launching the TV application.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('js/livetv/epg.js','utf8');
const start = source.indexOf('const EPG_TIME_CACHE_MAX');
const end = source.indexOf('/* Xtream sends titles',start);
assert(start>=0 && end>start,'Cannot locate EPG time helpers.');
const context = {Date,Math,isFinite,Number,String,Object};
vm.createContext(context);
vm.runInContext(source.slice(start,end),context,{filename:'epg-time.js'});

function entry(start,stop) {
    return {start_timestamp:start/1000,stop_timestamp:stop/1000};
}
const now=Date.now();
assert.strictEqual(context.fmtTime(0),'','No date must not print midnight.');
assert.strictEqual(context.fmtTime(NaN),'','Invalid date must remain blank.');
assert.strictEqual(context.calcProgress(null),0);
assert.strictEqual(context.calcProgress(entry(now,now)),0,'Zero-duration guide must not divide by zero.');
assert.strictEqual(context.calcProgress(entry(now+60000,now)),0,'Reversed dates must show zero progress.');
const half=context.calcProgress(entry(now-60000,now+60000));
assert(half>=45 && half<=55,'Valid current show should be approximately half played.');
assert(!String(context.formatTimeRange({})).includes('Invalid Date'));
console.log('EPG_TIME_OK malformed and zero-duration programme values handled safely.');
