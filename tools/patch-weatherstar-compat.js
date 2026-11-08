/* Keep the original upstream WeatherStar GUI and music byte-for-byte.
 * Only insert two behavior-only scripts BEFORE its compiled JS:
 *  1. Bunkhouse's existing old-webOS Promise/fetch/AbortController shims,
 *  2. an AbortSignal.timeout shim + diagnostics.
 *
 * WeatherStar 8.2.2 uses modern fetch APIs unsupported on older LG WebOS.
 * Top-level parent polyfills do NOT apply to a separate iframe realm.
 */
'use strict';
var fs = require('fs');
var path = require('path');
var root = path.resolve(__dirname, '..');
var dest = path.join(root,'weatherstar','index.html');
var html = fs.readFileSync(dest,'utf8');

var compat = '<script src="../js/polyfills.js"></script>' +
    '<script src="../assets/weatherstar-compat.js"></script>';

if (html.indexOf(compat) === -1) {
    if (html.indexOf('<head>') < 0) throw Error('WeatherStar upstream head markup changed');
    // Only the bootstrap scripts are added; none of the original markup,
    // fonts, layout, CSS, forecast code or media resources are replaced.
    html = html.replace('<head>', '<head>' + compat);
    fs.writeFileSync(dest,html,'utf8');
}
if (!fs.existsSync(path.join(root,'js','polyfills.js')) ||
    !fs.existsSync(path.join(root,'assets','weatherstar-compat.js'))) {
    throw Error('WeatherStar browser compatibility scripts are missing');
}
console.log('ws4kp: older-webOS fetch/timeout compatibility bootstrap installed before original JS');
