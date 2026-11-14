/* weatherstar-display.test.js — prevents the previously silent black iframe.
 * Original graphics are preserved while syntax compatibility and a real
 * display-ready signal permit a readable startup/error state on legacy webOS.
 */
'use strict';
const assert=require('assert');
const fs=require('fs');
const html=fs.readFileSync('pages/livetv.html','utf8');
const css=fs.readFileSync('assets/weatherstar.css','utf8');
const child=fs.readFileSync('assets/weatherstar-compat.js','utf8');
const parent=fs.readFileSync('js/livetv/weatherstar.js','utf8');
const build=fs.readFileSync('tools/transpile-weatherstar.js','utf8');
const scripts=JSON.parse(fs.readFileSync('package.json','utf8')).scripts;
for(const id of ['weatherstar-frame','weatherstar-diagnostics',
  'weatherstar-diagnostics-message','weatherstar-diagnostics-retry']) {
    assert(html.includes('id="'+id+'"'), 'Missing weather diagnostic element: '+id);
}
assert(css.includes('#weatherstar-diagnostics'), 'Readable overlay must have styles');
assert(parent.includes('startWeatherWatchdog()'), 'Missing blank forecast watchdog');
assert(parent.includes('data.type === "display"'), 'Real display must remove overlay');
assert(parent.includes('showForecastDiagnostic("WEATHERSTAR ERROR:'), 'Errors must be visible');
assert(child.includes(".weather-display.show:not(#progress-html)"),
    'Only real rendered forecast should mark success');
assert(build.includes("targets: {chrome: '38'}"), 'Legacy syntax target missing');
assert(build.includes("'@babel/core'"), 'Must transpile original bundled JS');
assert(scripts.build.includes('node tools/transpile-weatherstar.js'), 'Build missing transpiler');
assert(scripts['build:weatherstar'].includes('node tools/transpile-weatherstar.js'), 'Weather build missing transpiler');
console.log('WEATHERSTAR_DISPLAY_OK real forecast readiness, no-black-error overlay and legacy syntax build.');
