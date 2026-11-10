/* transpile-weatherstar.js — translate the original WeatherStar JS bundle to
 * syntax supported by older LG webOS Chromium engines.
 *
 * Upstream's webpack production build targets modern browsers and leaves
 * optional chaining, async/await and other ES2020+ syntax in ws.min.js.
 * Old LG Chromium can reject the entire bundle before the app even starts,
 * leaving a blank black kiosk viewport. This Babel pass changes syntax only,
 * not the authentic WeatherStar graphics, playlists or data algorithms.
 *
 * Idempotent: weatherstar/ is generated and reused by build-weatherstar.js.
 * A marker prevents retranspiling the already-transformed output on rebuild.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const presetEnv = require('@babel/preset-env');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'weatherstar');
const input = path.join(dir, 'resources', 'ws.min.js');
const marker = path.join(dir, '.bunkhouse-legacy-js');
const version = 'chrome38-babel-v1';

if (!fs.existsSync(input)) throw new Error('WeatherStar compiled JS missing: ' + input);
if (fs.existsSync(marker) && fs.readFileSync(marker, 'utf8').trim() === version) {
    console.log('ws4kp: compatible JavaScript bundle already prepared');
} else {
    const source = fs.readFileSync(input, 'utf8');
    const result = babel.transformSync(source, {
        filename: input,
        babelrc: false,
        configFile: false,
        comments: false,
        compact: true,
        sourceType: 'script',
        presets: [[presetEnv, {
            targets: {chrome: '38'},
            modules: false,
            bugfixes: true,
            useBuiltIns: false
        }]]
    });
    if (!result || !result.code || result.code.length < 1000) {
        throw new Error('WeatherStar syntax conversion produced no valid JS');
    }
    // Create the marker only after the translated bundle is on disk.
    fs.writeFileSync(input, result.code + '\n', 'utf8');
    fs.writeFileSync(marker, version + '\n', 'utf8');
    console.log('ws4kp: original WeatherStar JS translated to Chromium 38-compatible syntax');
}
