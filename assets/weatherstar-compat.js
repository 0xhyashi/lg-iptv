/* WeatherStar runtime compatibility ONLY; no changes to graphics or music.
 * This script is inserted before the upstream WeatherStar bundle in the
 * packaged webOS app. The parent Bunkhouse polyfills are loaded immediately
 * before this file: iframes have separate JS globals, so parent polyfills
 * cannot repair a child iframe's missing browser APIs.
 */
(function () {
    'use strict';
    var W = window;
    /** Send for WeatherStar iframe compatibility and local diagnostics.
     * @param {*} type - Input for send().
     * @param {*} message - Input for send().
     * @returns {*} Function result.
     */
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

    // WeatherStar's upstream HTTP layer adds a custom User-Agent header for
    // api.weather.gov. Browser JavaScript is not permitted to set that header,
    // and on some older LG implementations the request fails instead of
    // ignoring it. The browser already sends its own User-Agent. Remove only
    // this forbidden header; preserve every other request option.
    if (typeof W.fetch === 'function') {
        var originalFetch = W.fetch;
        W.fetch = function (url, options) {
            var address = String(url || '');
            if (address.indexOf('https://api.weather.gov/') !== 0) {
                return originalFetch.call(W, url, options);
            }
            var requestOptions = options;
            if (options && options.headers) {
                var headers = {};
                for (var name in options.headers) {
                    if (Object.prototype.hasOwnProperty.call(options.headers, name) &&
                        name.toLowerCase() !== 'user-agent') {
                        headers[name] = options.headers[name];
                    }
                }
                requestOptions = {};
                for (var key in options) {
                    if (Object.prototype.hasOwnProperty.call(options, key)) {
                        requestOptions[key] = options[key];
                    }
                }
                requestOptions.headers = headers;
            }
            // Only the initial /points request is involved in the reported
            // "National Weather Service isn't responding" startup message.
            var isPointLookup = address.indexOf('https://api.weather.gov/points/') === 0;
            return originalFetch.call(W, url, requestOptions).then(function (response) {
                if (isPointLookup && !response.ok) {
                    send('nws-error', 'HTTP ' + response.status + ' from api.weather.gov');
                }
                return response;
            }, function (error) {
                if (isPointLookup) {
                    send('nws-error', (error && error.message) || 'Network or browser access failed');
                }
                throw error;
            });
        };
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
    var rendered = false;
    W.addEventListener('DOMContentLoaded', function () {
        setInterval(function () {
            // A real forecast display, not the upstream loading/progress card.
            // This signal lets the parent remove its no-black-screen overlay.
            if (!rendered && document.querySelector('.weather-display.show:not(#progress-html)')) {
                rendered = true;
                send('display', 'Original forecast graphics are visible');
            }
            var el = document.querySelector('.location-status');
            var status = el && el.textContent && el.textContent.trim();
            if (!status || status === lastStatus) return;
            lastStatus = status;
            send('status', status);
        }, 1200);
    }, false);
    send('ready', 'WeatherStar compatibility bootstrap loaded');
}());
