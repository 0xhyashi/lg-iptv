/* Regression: the packaged WeatherStar must not send forbidden browser headers.
 *
 * NWS /points failures are reported to the parent so an LG browser rejection
 * is distinguishable from an upstream geocoding or display failure.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const src = fs.readFileSync('assets/weatherstar-compat.js', 'utf8');
const requests = [], messages = [];
const frame = {
    location: {protocol: 'https:'},
    AbortSignal: {timeout: () => undefined},
    fetch: (url, options) => {
        requests.push({url, options});
        if (String(url).includes('/points/') && String(url).includes('403')) {
            return Promise.resolve({ok: false, status: 403});
        }
        return Promise.resolve({ok: true, status: 200});
    },
    addEventListener: () => {},
    parent: {postMessage: data => messages.push(data)}
};
const context = {window: frame, document: {}, Promise, String, setTimeout, setInterval};
vm.createContext(context);
vm.runInContext(src, context);

(async function () {
    const options = {method:'GET',headers:{'user-agent':'WeatherStar test','Accept':'application/geo+json'}};
    const url = 'https://api.weather.gov/points/39.2673,-76.7983';
    await frame.fetch(url,options);
    assert.strictEqual(requests[0].url,url);
    assert.strictEqual(requests[0].options.headers['user-agent'],undefined);
    assert.strictEqual(requests[0].options.headers.Accept,'application/geo+json');
    assert.strictEqual(options.headers['user-agent'],'WeatherStar test','Caller options must remain untouched');

    await frame.fetch('https://example.test/',options);
    assert.strictEqual(requests[1].options,options,'Other hosts must not be modified');

    await frame.fetch('https://api.weather.gov/points/403',options);
    assert(messages.some(m=>m.type==='nws-error' && m.message.includes('HTTP 403')),
        'The parent must receive an actionable NWS HTTP status');
    console.log('WEATHERSTAR_NWS_COMPAT_OK browser headers sanitized; NWS failures reported.');
})().catch(error=>{console.error(error);process.exitCode=1;});
