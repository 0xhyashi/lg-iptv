/* hamradio.test.js — verify real-provider navigation and media teardown.
 * No fake RF samples, external calls, or TV hardware are used.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const sourceCode = fs.readFileSync('js/hamradio.js', 'utf8');
const nodes = {};
const timers = [];
const saved = {};
const history = [];
const windowListeners = {};

function node(id) {
    if (nodes[id]) return nodes[id];
    const events = {};
    const n = {
        id, value: '', textContent: '', src: '', tagName: 'BUTTON',
        classList: {toggle: function() {}},
        focus: function() { document.activeElement = n; },
        addEventListener: function(type, handler) { events[type] = handler; },
        click: function() { if (events.click) events.click(); },
        getAttribute: function(key) { return key === 'src' ? n.src : null; },
        trigger: function(type) { if (events[type]) events[type](); }
    };
    if (id === 'ham-frame') n.tagName = 'IFRAME';
    if (id === 'ham-source') n.tagName = 'INPUT';
    return nodes[id] = n;
}
const document = { activeElement: null, body: {classList: {toggle: function() {}}}, getElementById: node };
const window = { location: {href:''}, addEventListener: function(type, handler) {windowListeners[type]=handler;} };
const localStorage = {
    getItem: key => saved[key] || null,
    setItem: (key, value) => { saved[key] = value; }
};
function flush() {
    while (timers.length) {
        const job = timers.shift();
        if (job && job.active) job.fn();
    }
}
const ctx = {
    window, document, localStorage,
    setTimeout: function(fn) { const task={fn,active:true};timers.push(task);return task; },
    clearTimeout: function(task) {task.active=false;},
    console
};
vm.runInNewContext(sourceCode, ctx, {filename:'hamradio.js'});
flush();
const frame = node('ham-frame');
assert.strictEqual(frame.src, 'https://kb5avy.tunnel.ubersdr.org/', 'real remote waterfall must load');
node('ham-scan').click();
flush();
assert.strictEqual(frame.src, 'https://spinthedial.live/', 'voice discovery must be real provider');
node('ham-receiver').click();
flush();
assert.strictEqual(frame.src, 'https://kb5avy.tunnel.ubersdr.org/');

const before=frame.src;
node('ham-source').value='javascript:alert(1)';
node('ham-apply').click();
flush();
assert.strictEqual(frame.src, before, 'do not navigate unsafe URI schemes');
assert(/http:\/\/ or https:\/\//.test(node('ham-status').textContent));

node('ham-source').value='http://[2001:db8::1]:8073/';
node('ham-apply').click();
flush();
assert.strictEqual(frame.src, 'http://[2001:db8::1]:8073/', 'accept legitimate IPv6 receiver URLs');
assert.strictEqual(saved.bunkhouse_ham_receiver_url, 'http://[2001:db8::1]:8073/');

node('ham-scan').click();
flush();
windowListeners.pagehide();
assert.strictEqual(frame.src, 'about:blank', 'unload scan audio on exit');
node('ham-back').click();
assert.strictEqual(window.location.href, '../pages/livetv.html');
assert.strictEqual(frame.src, 'about:blank');

assert(!/requestAnimationFrame|Math\.random|createImageData/.test(sourceCode),
    'do not generate fake waterfall graphics');
console.log('HAM_RADIO_PROVIDER_LIFECYCLE_OK live receiver, scanner and teardown');
