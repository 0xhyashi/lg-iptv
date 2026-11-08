/* WeatherStar runtime compatibility ONLY; no changes to graphics or music.
 * This script is inserted before the upstream WeatherStar bundle in the
 * packaged webOS app. The parent Bunkhouse polyfills are loaded immediately
 * before this file: iframes have separate JS globals, so parent polyfills
 * cannot repair a child iframe's missing browser APIs.
 */
(function () {
    'use strict';
    var W = window;
    function send(type, message) {
        try {
            if (W.parent !== W) W.parent.postMessage({
                bunkhouseWeatherstar: 1,
                type: type,
                message: String(message || '').slice(0, 220)
            }, '*');
        } catch (_) {}
    }

    // WS4KP 8.2.2 always invokes AbortSignal.timeout() in fetchAsync().
    // webOS Chrome 38-79 doesn't implement it; without a shim, ALL weather
    // fetches fail with TypeError before reaching the network.
    if (!W.AbortSignal) W.AbortSignal = {};
    if (typeof W.AbortSignal.timeout !== 'function') {
        W.AbortSignal.timeout = function (ms) {
            if (typeof W.AbortController !== 'function') return undefined;
            try {
                var controller = new W.AbortController();
                setTimeout(function () {
                    try { controller.abort(); } catch (_) {}
                }, ms);
                return controller.signal;
            } catch (_) { return undefined; }
        };
    }

    // Some file:// webOS browsers expose location.origin as the literal
    // string "null". The upstream fetch helper passes that as the base of
    // new URL(absoluteNetworkURL, window.location.origin), which throws
    // "Invalid URL" before it can issue ANY network request. Patch only when
    // the platform actually exhibits that defect; preserve URL semantics
    // and static helpers (createObjectURL / revokeObjectURL) otherwise.
    if (W.location && W.location.protocol === 'file:' && W.URL) {
        var NativeURL = W.URL;
        var brokenOrigin = false;
        try { new NativeURL('https://api.weather.gov/', W.location.origin); }
        catch (_) { brokenOrigin = true; }
        if (brokenOrigin) {
            var SafeURL = function (input, base) {
                if (base === 'null') {
                    // Absolute URLs don't need a base; relative ones resolve
                    // against the actual local HTML file, not an invalid origin.
                    base = W.location.href;
                }
                return base === undefined ? new NativeURL(input)
                    : new NativeURL(input, base);
            };
            SafeURL.prototype = NativeURL.prototype;
            if (NativeURL.createObjectURL) SafeURL.createObjectURL = function (obj) {
                return NativeURL.createObjectURL(obj);
            };
            if (NativeURL.revokeObjectURL) SafeURL.revokeObjectURL = function (url) {
                return NativeURL.revokeObjectURL(url);
            };
            W.URL = SafeURL;
            send('ready', 'Local-file URL compatibility enabled');
        }
    }

    // Surface precise startup errors in Bunkhouse instead of requiring
    // a USB developer console on the TV. No city, user data or credentials
    // are sent off-device by these local parent-frame messages.
    W.addEventListener('error', function (event) {
        send('error', event.message || 'WeatherStar script error');
    }, false);
    W.addEventListener('unhandledrejection', function (event) {
        var reason = event && event.reason;
        send('error', reason && reason.message || 'WeatherStar request failed');
    }, false);

    var lastStatus = '';
    W.addEventListener('DOMContentLoaded', function () {
        setInterval(function () {
            var el = document.querySelector('.location-status');
            var status = el && el.textContent && el.textContent.trim();
            if (!status || status === lastStatus) return;
            lastStatus = status;
            send('status', status);
        }, 1200);
    }, false);
    send('ready', 'WeatherStar compatibility bootstrap loaded');
}());
