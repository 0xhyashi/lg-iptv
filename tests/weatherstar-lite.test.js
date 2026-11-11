/* weatherstar-lite.test.js — protect the low-load profile against changes.
 * It verifies actual URL parameters consumed by WS4KP rather than relying on
 * CSS to hide a radar that would still calculate frames in the background.
 */
'use strict';
const assert=require('assert');
const fs=require('fs');
const vm=require('vm');
const src=fs.readFileSync('js/livetv/weatherstar.js','utf8');
const html=fs.readFileSync('pages/livetv.html','utf8');
const css=fs.readFileSync('assets/weatherstar.css','utf8');
const found=src.match(/function weatherURL\(coords\) \{[\s\S]*?\n    \}/);
assert(found,'WeatherStar URL builder not found');
const ctx={
  soundtrack:'nightwave',soundPaused:false,lightMode:true,
  encodeURIComponent,JSON,getCity:()=> 'Ellicott City, Maryland',
  coordsOK:()=>true
};
vm.createContext(ctx);
vm.runInContext(found[0]+'\nthis.buildWeatherURL=weatherURL;',ctx);
const coords={lat:39.27,lon:-76.8};
let url=ctx.buildWeatherURL(coords);
assert(url.startsWith('../weatherstar/index.html?latLonQuery='),'Use local original WeatherStar');
assert(url.includes('radar=false'),'Lite must disable map rendering, not merely hide it');
assert(url.includes('future-radar=false'),'Lite must disable CPU-heavy radar frame generation');
assert(url.includes('scanLines=false'),'Lite must disable cosmetic scanline processing');
assert(url.includes('mediaPlaying=false'),'Preserve original audio configuration');
ctx.lightMode=false;
url=ctx.buildWeatherURL(coords);
assert(url.includes('radar=true'),'Full mode must reactivate radar despite saved disabled status');
assert(url.includes('future-radar=true'),'Full mode must reactivate future radar');
assert(html.includes('id="weatherstar-performance"'),'LG remote toggle must exist');
assert(src.includes('bunkhouse_weather_performance'),'Profile should persist through restarts');
assert(css.includes('#weatherstar-performance'),'Button state should be visible');
console.log('WEATHERSTAR_LITE_OK original forecast, reversible CPU-heavy radar and scanline opt-out');
