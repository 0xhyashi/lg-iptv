/* core/net.js — the app's single HTTP layer. Exposes window.Net.
 *
 * Replaces four near-identical private fetch wrappers that had drifted apart
 * (api/xtream.js `_fetchJSON`, iptv-core.js `fetchJSON`, prewarm.js `fetchJSON`
 * and settings.js `updFetch`) — each with its own timeout and its own idea of
 * what counts as an error.
 *
 * Everything here goes through the fetch/AbortController shims in polyfills.js,
 * which is why the timeout is expressed as a plain setTimeout + abort rather
 * than anything newer: on webOS 5.40 AbortController is stubbed and the signal
 * is stripped before it reaches native fetch, so the timer must not be the only
 * thing keeping the promise honest.
 *
 * ES5 — Babel target is Chrome 38.                                            */
window.Net = (function () {
    'use strict';

    var DEFAULT_TIMEOUT = 12000;

    /* An error carrying the HTTP status, so callers can tell "the server said
       no" (403 on EPG → back off permanently) from "the network died" (retry).
       The old code sniffed for the substring "403" in a message, which also
       matched a body that merely happened to contain those digits. */
    /** Create a structured HTTP error with status and URL.
     * @param {number} status - HTTP response status code.
     * @param {string} url - Requested URL.
     * @returns {Error} HTTP error with status and URL properties.
     */
    function httpError(status, url) {
        var err = new Error('HTTP ' + status);
        err.status = status;
        err.url    = url;
        return err;
    }
    /** Check for an HTTP status, optionally matching a specific code.
     * @param {Error} err - Error to inspect.
     * @param {number|undefined} status - Optional status code to match.
     * @returns {boolean} True when the error has the requested HTTP status.
     */
    function isHttpError(err, status) {
        if (!err || typeof err.status !== 'number') return false;
        return status === undefined ? true : err.status === status;
    }

    /* fetch() with a timeout that holds on every webOS version, resolving with
       the raw Response whatever its status.

       The timer rejects the promise ITSELF rather than relying on abort() to
       make fetch reject. On webOS 4 and 5 there is no real AbortController:
       polyfills.js stubs it and strips the stub signal before native fetch
       sees it, so abort() cancels nothing — and when the timeout's only job
       was to call abort(), a server that accepted the connection and then
       never answered hung the request forever. That is how a dead entry in a
       profile's URL list stalled login on "Trying 1/3…" indefinitely instead
       of moving on to the next one. */
    /** Fetch a URL with a deadline, including on older webOS browsers.
     * @param {string} url - Requested URL.
     * @param {Object} init - Fetch options including method, headers and body.
     * @param {number} timeout - Timeout in milliseconds.
     * @returns {Promise<Response>} HTTP response or rejection on timeout/network failure.
     */
    function timed(url, init, timeout) {
        timeout = timeout || DEFAULT_TIMEOUT;
        var ctrl = new AbortController();
        // Do not modify an options object that a caller may reuse.
        var options = {};
        init = init || {};
        for (var key in init) {
            if (Object.prototype.hasOwnProperty.call(init, key)) options[key] = init[key];
        }
        options.signal = ctrl.signal;
        return new Promise(function (resolve, reject) {
            var settled = false;
            var tid = setTimeout(function () {
                if (settled) return;
                settled = true;
                try { ctrl.abort(); } catch (e) {}
                var err = new Error('Timed out after ' + Math.round(timeout / 1000) + 's');
                err.timeout = true;
                err.url     = url;
                reject(err);
            }, timeout);
            fetch(url, options).then(function (res) {
                if (settled) return;
                settled = true;
                clearTimeout(tid);
                resolve(res);
            }, function (err) {
                if (settled) return;
                settled = true;
                clearTimeout(tid);
                reject(err);
            });
        });
    }

    /** Fetch a URL and reject unsuccessful HTTP status codes.
     * @param {string} url - Requested URL.
     * @param {Object} opts - Optional request or display settings.
     * @returns {Promise<Response>} Successful HTTP response.
     */
    function request(url, opts) {
        opts = opts || {};
        var init = {};
        if (opts.method)  init.method  = opts.method;
        if (opts.headers) init.headers = opts.headers;
        if (opts.body)    init.body    = opts.body;
        if (opts.cache)   init.cache   = opts.cache;
        /* Honoured by the XHR shim in polyfills.js, which cannot decide after
           the fact whether a caller wants bytes or text. Native fetch ignores
           the key and serves arrayBuffer() regardless, so passing it always is
           safe on both paths. */
        if (opts.responseType) init.responseType = opts.responseType;

        return timed(url, init, opts.timeout).then(function (res) {
            if (!res.ok) throw httpError(res.status, url);
            return res;
        });
    }

    /* A file inside the app package — appinfo.json is the one that matters.
       Native fetch refuses file:// URLs outright on every Chromium, and that is
       where a webOS app lives, so this is XHR, where a local file arrives with
       status 0 rather than 200. */
    /** Read a local packaged file with XHR, which supports file:// on webOS.
     * @param {string} url - Requested URL.
     * @returns {Promise<string>} Contents of the local text file.
     */
    function local(url) {
        return new Promise(function (resolve, reject) {
            try {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.onload = function () {
                    var ok = (xhr.status >= 200 && xhr.status < 300) ||
                             (xhr.status === 0 && xhr.responseText);
                    if (ok) resolve(xhr.responseText);
                    else reject(httpError(xhr.status, url));
                };
                xhr.onerror = function () { reject(new Error('Could not read ' + url)); };
                xhr.send();
            } catch (e) { reject(e); }
        });
    }

    /** Parse a JSON file from the local app package.
     * @param {string} url - Requested URL.
     * @returns {Promise<*>} Parsed local JSON value.
     */
    function localJSON(url) {
        return local(url).then(function (text) { return JSON.parse(text); });
    }

    /** Fetch JSON from an HTTP endpoint.
     * @param {string} url - Requested URL.
     * @param {Object} opts - Optional request or display settings.
     * @returns {Promise<*>} Parsed JSON response.
     */
    function json(url, opts) {
        return request(url, opts).then(function (r) { return r.json(); });
    }

    /** Fetch a text response from an HTTP endpoint.
     * @param {string} url - Requested URL.
     * @param {Object} opts - Optional request or display settings.
     * @returns {Promise<string>} Response text.
     */
    function text(url, opts) {
        return request(url, opts).then(function (r) { return r.text(); });
    }

    /* Fetch that answers from Store's TTL cache when it can. On a cache miss
       the network result is cached before being handed back; on a network
       failure the rejection propagates untouched so callers can show a real
       error rather than an empty list that looks like "no content". */
    /** Reuse unexpired cached JSON or fetch it and store the response.
     * @param {string} key - Stored key or key-code.
     * @param {string} url - Requested URL.
     * @param {number} ttl - Maximum cached age in milliseconds.
     * @param {Object} opts - Optional request or display settings.
     * @returns {Promise<*>} Cached or fetched parsed JSON.
     */
    function cachedJSON(key, url, ttl, opts) {
        var hit = Store.cacheGet(key, ttl);
        if (hit !== null && hit !== undefined) return Promise.resolve(hit);
        return json(url, opts).then(function (data) {
            Store.cacheSet(key, data);
            return data;
        });
    }

    /* Serve the cache immediately AND refresh in the background. `onFresh` is
       called only if the network answer differs in length from the cached one,
       which is the cheap test that matters for channel/VOD lists — it avoids
       repainting a 20 000-row list on every visit for no visible change. */
    /** Return cached JSON immediately while refreshing it in the background.
     * @param {string} key - Stored key or key-code.
     * @param {string} url - Requested URL.
     * @param {number} ttl - Maximum cached age in milliseconds.
     * @param {Function} onFresh - Callback invoked on changed fresh data.
     * @returns {Promise<*>} Cached JSON if available; otherwise the fresh response.
     */
    function staleWhileRevalidate(key, url, ttl, onFresh) {
        var hit = Store.cacheGet(key, ttl);
        var net = json(url).then(function (data) {
            Store.cacheSet(key, data);
            var changed = hit === null || hit === undefined || !data ||
                (hit && data && hit.length !== undefined && data.length !== undefined && hit.length !== data.length);
            if (changed && typeof onFresh === 'function') onFresh(data);
            return data;
        });
        if (hit !== null && hit !== undefined) {
            net['catch'](function () {});
            return Promise.resolve(hit);
        }
        return net;
    }

    /* Best-effort probe: does this URL exist and return something non-empty?
       Resolves with the body text, or null for anything else — it never
       rejects, because every caller treats "no" as an ordinary answer rather
       than a failure. Kept short-timeout on purpose: it runs speculatively
       against endpoints a panel may simply not implement. */
    /** Probe a URL for nonempty text without propagating errors.
     * @param {string} url - Requested URL.
     * @param {number} timeout - Timeout in milliseconds.
     * @returns {Promise<string|null>} Text if available, otherwise null.
     */
    function probeText(url, timeout) {
        return text(url, { timeout: timeout || 4000 }).then(function (body) {
            return (body && body.length) ? body : null;
        })['catch'](function () { return null; });
    }

    return {
        DEFAULT_TIMEOUT: DEFAULT_TIMEOUT,
        timed: timed, request: request, json: json, text: text,
        local: local, localJSON: localJSON,
        cachedJSON: cachedJSON, staleWhileRevalidate: staleWhileRevalidate,
        probeText: probeText,
        httpError: httpError, isHttpError: isHttpError
    };
}());
