/* Regression: album artwork is square even on older webOS without aspect-ratio.
 *
 * The Winamp-era Bunkhouse panel must not independently size width and height,
 * because that squeezes square cover images into a tall rectangle.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const css = fs.readFileSync('assets/bunkhouse.css','utf8');
const rule = css.match(/#radio-visual \.radio-cover-box\s*\{([^}]+)\}/);
assert(rule, 'Expected Bunkhouse radio cover CSS');
const props = {};
rule[1].split(';').forEach(function (item) {
    const parts = item.split(':');
    if (parts.length === 2) props[parts[0].trim()] = parts[1].trim();
});
assert(props.width && props.height, 'Explicit dimensions are required for older TVs');
assert.strictEqual(props.width,props.height,'Radio album cover must be square');
assert.strictEqual(props['max-height'],'100%','Square must not overflow its panel vertically');
console.log('RADIO_COVER_SHAPE_OK album art retains a square frame on legacy webOS.');
