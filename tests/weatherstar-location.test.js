/* Pure Node regression checks for WeatherStar startup location on webOS.
 * Reproduces Bunkhouse's existing iframe controller with tiny DOM stubs.
 * Critical contract: passing latLon in the URL skips upstream ArcGIS geocode,
 * which was the source of "Location search isn't responding" on LG TV.
 */
'use strict';
const fs = require('fs'),vm = require('vm'), assert=require('assert');
const src=fs.readFileSync('js/livetv/weatherstar.js','utf8');
const data={},nodes={};
function node(id) {
    if (!nodes[id]) nodes[id]={
      id:id,style:{},value:'',textContent:'',src:'',
      setAttribute:function(){},removeAttribute:function(){},
      handlers:{},
      addEventListener:function(type,handler){this.handlers[type]=handler;},
      focus:function(){},getAttribute:function(){return '';},
    };
    return nodes[id];
}
const localStorage={
    getItem:key=>Object.prototype.hasOwnProperty.call(data,key)?data[key]:null,
    setItem:(key,val)=>{data[key]=String(val);},
};
let requests=[];
const sandbox={
    window:{localStorage:localStorage,addEventListener:()=>{}},
    document:{getElementById:node},
    Promise, console, JSON, Number, String, RegExp,
    isFinite,encodeURIComponent,decodeURIComponent,
    Net: {
        json: (url, options) => {
            requests.push(String(url));
            assert(options && options.timeout > 0, 'Geocoder must have a deadline');
            if (String(url).includes('zippopotam')) {
                return Promise.resolve({places:[{latitude:'39.2676',longitude:'-76.805'}]});
            }
            return Promise.reject(new Error('Simulated blocked geocoder'));
        }
    },
    localStorage:localStorage,
    currentChannel:null,
    setTVZone:()=>{},
    isFullscreen:()=>false,
    toggleFullscreen:()=>{},
};
vm.createContext(sandbox);
vm.runInContext(src,sandbox,{filename:'weatherstar.js'});
const ch=sandbox.WeatherChannel;
assert(ch && typeof ch.open==='function');

(async()=>{
    ch.open();
    await Promise.resolve();
    const initial=new URL(node('weatherstar-frame').src,'file:///mnt/app/pages/livetv.html');
    assert(initial.searchParams.has('latLon'),'default city MUST include latLon');
    assert(initial.pathname.endsWith('/weatherstar/index.html'),
        'WeatherStar must use the packaged copy rather than the black hosted iframe');
    ch.setup();
    assert.strictEqual(node('weatherstar-retry').textContent,'RETRY FORECAST');
    node('weatherstar-retry').handlers.click({stopPropagation:function(){}});
    await Promise.resolve();
    assert(new URL(node('weatherstar-frame').src,'file:///mnt/app/pages/livetv.html')
        .pathname.endsWith('/weatherstar/index.html'),
        'Retry must reload the local WeatherStar, never navigate online');
    assert(initial.searchParams.get('latLonQuery')==='Ellicott City, Maryland, USA');
    assert.deepStrictEqual(JSON.parse(initial.searchParams.get('latLon')),{lat:39.2673,lon:-76.7983});
    assert.strictEqual(requests.length,0,'default location must not call a remote geocoder');
    assert(initial.searchParams.get('mediaPlaying')==='false','Nightwave mode must silence WeatherStar player');
    console.log('GEOCODE_BYPASS_OK default location loaded without ArcGIS.');

    localStorage.setItem('bunkhouse_weather_city','21043');
    ch.close();ch.open();
    // Drain the entire resolved fetch/json/then chain, not just three ticks.
    await new Promise(resolve=>setImmediate(resolve));
    const zip=new URL(node('weatherstar-frame').src,'file:///mnt/app/pages/livetv.html');
    assert(zip.searchParams.has('latLon'),'ZIP coordinates missing');
    assert.strictEqual(requests.filter(x=>x.includes('zippopotam')).length,1);
    assert(JSON.parse(zip.searchParams.get('latLon')).lat>39);
    console.log('ZIP_LOOKUP_OK external ZIP coordinates passed without upstream ArcGIS.');

    ch.close();
    localStorage.setItem('bunkhouse_weather_city','Unsupported City Test');
    ch.open();
    // Drain the entire resolved fetch/json/then chain, not just three ticks.
    await new Promise(resolve=>setImmediate(resolve));
    assert(node('weatherstar-frame').src==='about:blank',
      'unresolved location must not feed bare city name into upstream search');
    assert(node('weatherstar-status').textContent.indexOf('Cannot find location')!==-1);
    console.log('FAILED_GEOCODE_HANDLED no upstream retry storm or misleading forecast.');
})().catch(err=>{console.error(err);process.exitCode=1;});
