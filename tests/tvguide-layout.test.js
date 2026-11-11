/* tvguide-layout.test.js — the app must open the real EPG as a 90s guide,
 * keep accessible TV/RADIO/HAM tabs, and give every radio station one fixed
 * full-size right-side display regardless of track metadata.
 */
'use strict';
const assert=require('assert');
const fs=require('fs');
const html=fs.readFileSync('pages/livetv.html','utf8');
const css=fs.readFileSync('assets/tvguide.css','utf8');
const app=fs.readFileSync('js/app.js','utf8');
const remote=fs.readFileSync('js/dpad.js','utf8');
const info=JSON.parse(fs.readFileSync('appinfo.json','utf8'));
const redirect=fs.readFileSync('index.html','utf8');
assert.strictEqual(info.main,'pages/livetv.html','webOS must open guide directly');
assert(redirect.includes('location.replace("pages/livetv.html")'), 'old Home link must redirect');
for(const id of ['guide-masthead','guide-title','guide-clock','media-tv','media-radio','media-ham']) {
    assert(html.includes('id="'+id+'"'),'Missing guide UI: '+id);
}
assert(html.includes('dist/css/tvguide.css'), 'TV guide visual stylesheet must load');
assert(app.includes('setupGuideClock()'), 'Guide time must use real local clock');
assert(remote.includes('tvFocusZone = "media-tabs"'), 'LG arrow keys must reach HAM navigation');
assert(remote.includes('focusedTab.click()'), 'Remote OK must activate the HAM tab');
for(const selector of [
    'body.guide-mode .tl-row','body.guide-mode .tl-epg-block',
    'body.guide-mode #tl-header-bar','body.guide-mode #sidebar',
    'body.radio-mode #preview-bar','body.radio-mode #pip-wrap',
    'body.radio-mode #radio-visual'
]) assert(css.includes(selector),'Missing style '+selector);
assert(css.includes('flex:1 1 0'), 'Radio right pane must flex to all free space');
assert(css.includes('height:100%'), 'Radio right pane must fill available height');
assert(css.includes('body.guide-mode .tl-block-title') &&
       css.includes('color: #f5f8ff'),
       'Guide program subtitle must be high contrast instead of inherited gray');
assert(css.includes('body.radio-mode #preview-bar {') &&
       css.includes('position:absolute;top:0;bottom:0;left:0;right:0'),
       'Radio player must anchor to all four viewport edges, not text height');
assert(css.includes('body.radio-mode #bk-station-box {flex:0 0 31%'),
       'Station title text must not change Saturn panel size');
assert(css.includes('body.radio-mode #radio-track-panel {flex:0 0 42%!important'),
       'Metadata length must not resize the now-playing panel');
assert(!/Math\.random\(|placeholder show/i.test(css),'No invented guide data');
console.log('TV_GUIDE_LAYOUT_OK direct boot, remote HAM access, real EPG styling, full radio pane.');

assert(!fs.readFileSync("assets/player.css","utf8").split("#radio-visual {")[1].split("}")[0].includes("align-items: center"),"Legacy player must not shrink Saturn children to metadata width");
