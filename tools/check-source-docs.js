/* check-source-docs.js — small, dependency-free source quality gate.
 *
 * Checks maintainable first-party JS/CSS only, not vendor libraries or
 * generated dist/weatherstar output. A function contract should be directly
 * above a named declaration and contain inputs plus a return annotation.
 * Also syntax-checks the source with Node, so comment-only refactors cannot
 * accidentally break JavaScript parsing.
 *
 * Run: node tools/check-source-docs.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SKIP = new Set(['assets/hls.min.js', 'assets/qrcode.js']);

function filesIn(dir) {
    const out = [];
    for (const entry of fs.readdirSync(path.join(ROOT, dir), {withFileTypes: true})) {
        const filename = path.posix.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...filesIn(filename));
        else if (entry.name.endsWith('.js') && !SKIP.has(filename)) out.push(filename);
    }
    return out;
}
const jsFiles = [...filesIn('js'), ...filesIn('tools'), 'assets/boot.js', 'assets/weatherstar-compat.js'];
const cssFiles = fs.readdirSync(path.join(ROOT, 'assets'))
    .filter(name => name.endsWith('.css')).map(name => 'assets/' + name);

let total = 0;
let errors = [];
function checkFunction(source, file, offset, name, args) {
    const prefix = source.slice(0, offset);
    const end = prefix.lastIndexOf('*/');
    const beginning = prefix.lastIndexOf('/**', end);
    if (beginning < 0 || end < beginning || prefix.slice(end + 2).trim()) {
        errors.push(file + ': ' + name + ' has no adjacent JSDoc.');
        return;
    }
    const doc = prefix.slice(beginning, end + 2);
    if (!doc.includes('@returns {')) {
        errors.push(file + ': ' + name + ' has no @returns contract.');
    }
    const parameters = args.split(',').map(p => p.split('=')[0].trim()).filter(p => /^[a-z_$][\w$]*$/i.test(p));
    for (const param of parameters) {
        if (!new RegExp('@param\\s*\\{[^}]+\\}\\s*' + param + '\\b').test(doc)) {
            errors.push(file + ': ' + name + ' has no @param for ' + param);
        }
    }
    total++;
}
for (const file of jsFiles) {
    const absolute = path.join(ROOT, file);
    const code = fs.readFileSync(absolute, 'utf8');
    if (!/^\s*(?:\/\*|\/\/)/.test(code)) errors.push(file + ': missing file overview at the top.');
    const definitions = /^([ \t]*)(?:async\s+)?function\s+([a-z_$][\w$]*)\s*\(([^)\n]*)\)\s*\{/gim;
    for (const match of code.matchAll(definitions)) {
        checkFunction(code, file, match.index, match[2], match[3]);
    }
    if (file === 'js/player/engine.js') {
        const methods = /^ {4}(?:async\s+)?([a-z_$][\w$]*)\(([^)\n]*)\)\s*\{/gim;
        for (const match of code.matchAll(methods)) {
            checkFunction(code, file, match.index, match[1], match[2]);
        }
    }
    try {
        cp.execFileSync(process.execPath, ['--check', absolute], {stdio: 'pipe'});
    } catch (err) {
        errors.push(file + ': Node syntax check failed: ' + String(err.stderr || err).slice(0, 300));
    }
}
for (const file of cssFiles) {
    const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (!code.startsWith('/*')) errors.push(file + ': add a file purpose comment.');
}
if (errors.length) {
    errors.forEach(message => console.error('SOURCE_AUDIT: ' + message));
    process.exitCode = 1;
} else {
    console.log('SOURCE_AUDIT_OK: ' + jsFiles.length + ' first-party JS files, ' +
        cssFiles.length + ' CSS files and ' + total + ' named function contracts verified.');
}
