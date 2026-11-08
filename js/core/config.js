/* core/config.js — profiles, the active source, and every Xtream URL the app
 * builds. Exposes window.Config (and window.IPTVCore as a back-compat alias).
 *
 * A "profile" is one saved source. Xtream profiles carry credentials and a list
 * of candidate server URLs (providers hand out several, and which one works
 * varies by day and by network); M3U profiles carry a playlist URL. Exactly one
 * profile is active at a time.
 *
 * URL building lives here and nowhere else. It used to be duplicated between
 * iptv-core.js and api/xtream.js, and the copies disagreed about trailing
 * slashes — which is the sort of difference that produces a 404 on one screen
 * and not another.
 *
 * ES5 — Babel target is Chrome 38.                                            */
window.Config = (function () {
    'use strict';

    var KEY_PROFILES = 'iptv_profiles';
    var KEY_ACTIVE   = 'iptv_active_profile';
    var KEY_RESOLVED = 'iptv_active_resolved_url';   // the URL that last worked
    var KEY_SOURCE   = 'iptv_source_type';

    /* ── Profiles ─────────────────────────────────────────────────────────── */
    /** Make Id for IPTV profiles, server URLs and credentials.
     * @returns {*} Result of the operation.
     */
    function makeId() {
        return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    /** Normalise Profile for IPTV profiles, server URLs and credentials.
     * @param {Object} p - Input record.
     * @returns {*} Result of the operation.
     */
    function normaliseProfile(p) {
        if (!p.type) p.type = p.playlist_url ? 'm3u' : 'xtream';
        if (!p.server_urls)  p.server_urls  = [];
        if (!p.playlist_url) p.playlist_url = '';
        if (!p.epg_match)    p.epg_match    = 'tvg-id';
        return p;
    }

    /* Reads the profile list, migrating the pre-profiles single-config keys the
       first time it runs. The migration writes the result back, so it happens
       once per device rather than on every read. */
    /** Profiles for IPTV profiles, server URLs and credentials.
     * @returns {*} Result of the operation.
     */
    function profiles() {
        var list = Store.get(KEY_PROFILES, null);
        if (list) {
            for (var i = 0; i < list.length; i++) normaliseProfile(list[i]);
            return list;
        }

        list = [];
        var legacyXtream = Store.get('iptv_custom_config', null);
        if (legacyXtream && legacyXtream.server_url) {
            list.push(normaliseProfile({
                id: makeId(), name: 'Default', type: 'xtream',
                username: legacyXtream.username || '',
                password: legacyXtream.password || '',
                server_urls: [legacyXtream.server_url],
                epg_url:   Store.get('iptv_custom_epg_url', ''),
                epg_match: Store.get('iptv_custom_epg_match', 'tvg-id')
            }));
        }
        var legacyM3u = Store.get('iptv_m3u_config', null);
        if (legacyM3u && legacyM3u.playlist_url) {
            list.push(normaliseProfile({
                id: makeId(), name: 'M3U Playlist', type: 'm3u',
                playlist_url: legacyM3u.playlist_url
            }));
        }
        Store.set(KEY_PROFILES, list);
        return list;
    }

    /** Save Profiles for IPTV profiles, server URLs and credentials.
     * @param {Array} list - Items to process.
     * @returns {void} Updates the relevant state or UI.
     */
    function saveProfiles(list) { return Store.set(KEY_PROFILES, list); }
    /** Active Id for IPTV profiles, server URLs and credentials.
     * @returns {*} Result of the operation.
     */
    function activeId()         { return Store.get(KEY_ACTIVE, null); }
    /** Set Active Id for IPTV profiles, server URLs and credentials.
     * @param {string} id - Identifier.
     * @returns {void} Updates the relevant state or UI.
     */
    function setActiveId(id)    { return Store.set(KEY_ACTIVE, id); }

    /** Active Profile for IPTV profiles, server URLs and credentials.
     * @returns {*} Result of the operation.
     */
    function activeProfile() {
        var list = profiles();
        if (!list.length) return null;
        var id = activeId();
        for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
        return list[0];
    }

    /* 'xtream' | 'm3u', taken from the ACTIVE PROFILE. It used to be read from
       its own key, which only the Save button kept in step — deleting the
       active profile or picking one by any other route left it pointing at the
       previous profile's type, and Live TV then tried to log an M3U playlist
       into Xtream (or the reverse) and reported "no server configured". The
       key is still the answer when there are no profiles at all. */
    /** Source Type for IPTV profiles, server URLs and credentials.
     * @returns {*} Result of the operation.
     */
    function sourceType() {
        var p = activeProfile();
        if (p) return p.type === 'm3u' ? 'm3u' : 'xtream';
        return Store.get(KEY_SOURCE, 'xtream') === 'm3u' ? 'm3u' : 'xtream';
    }

    /* ── The active config ────────────────────────────────────────────────────
       Returns one of:
         { type:'xtream', server_url, server_urls, username, password }
         { type:'m3u',    playlist_url }
         null   — nothing configured yet
       `server_url` is the resolved URL that last authenticated successfully,
       falling back to the first candidate. */
    /** Resolve for IPTV profiles, server URLs and credentials.
     * @returns {*} Result of the operation.
     */
    function resolve() {
        var p = activeProfile();
        if (p) {
            if (p.type === 'm3u') {
                return {
                    type: 'm3u', playlist_url: String(p.playlist_url || '').trim(), profileId: p.id,
                    epg_url: p.epg_url || '', epg_match: p.epg_match || 'tvg-id'
                };
            }
            var resolved = Store.get(KEY_RESOLVED, null);
            /* Only trust the resolved URL if it still belongs to this profile —
               otherwise switching profiles silently keeps pointing playback at
               the previous provider's host while using the new credentials.

               Checked against candidateUrls(), not an old profile's previous
               resolved URL. Only user-configured URLs are tried; a failed
               HTTPS login must not silently send credentials over HTTP. */
            var urls = candidateUrls(p);
            var ok = false;
            for (var i = 0; i < urls.length; i++) if (urls[i] === resolved) { ok = true; break; }
            return {
                type: 'xtream',
                server_url:  (ok && resolved) || urls[0] || '',
                server_urls: urls,
                username:    p.username || '',
                password:    p.password || '',
                profileId:   p.id,
                epg_url:     p.epg_url || '',
                epg_match:   p.epg_match || 'tvg-id'
            };
        }

        var legacy = Store.get('iptv_custom_config', null);
        if (legacy && legacy.server_url) {
            legacy.type = legacy.type || 'xtream';
            return legacy;
        }
        if (typeof IPTV_CONFIG !== 'undefined' && IPTV_CONFIG && IPTV_CONFIG.server_url) return IPTV_CONFIG;
        return null;
    }

    /* A short, stable identifier for the active source, safe to use inside
       localStorage keys. Caches and favourites are namespaced with it so two
       profiles never show each other's channels — the old code keyed some
       caches on the full server URL and others on nothing at all. */
    /** Scope for IPTV profiles, server URLs and credentials.
     * @param {Object} cfg - Provider credentials and server settings.
     * @returns {*} Result of the operation.
     */
    function scope(cfg) {
        cfg = cfg || resolve();
        if (!cfg) return 'none';
        if (cfg.type === 'm3u') return 'm3u:' + hash(cfg.playlist_url || '');
        return 'xt:' + hash(base(cfg) + '|' + (cfg.username || ''));
    }

    /* djb2 — a short non-cryptographic hash. Only needs to avoid collisions
       between the handful of profiles one household configures. */
    /** Hash for IPTV profiles, server URLs and credentials.
     * @param {*} str - Input to hash().
     * @returns {boolean} Whether the condition is met.
     */
    function hash(str) {
        var h = 5381;
        for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
        return (h >>> 0).toString(36);
    }

    /* ── Xtream URL building ──────────────────────────────────────────────── */

    /* What people actually type into a server field: "myhost.tv:8080" with no
       scheme, a trailing slash, or the whole API URL pasted from a browser. A
       URL with no scheme is RELATIVE, so it resolved against the app's own
       file:// location and every request failed with "could not reach any
       server" for a server that was fine. Providers hand these out as http. */
    /** Normalise Server Url for IPTV profiles, server URLs and credentials.
     * @param {*} u - Input to normaliseServerUrl().
     * @returns {*} Result of the operation.
     */
    function normaliseServerUrl(u) {
        u = String(u === null || u === undefined ? '' : u).trim();
        if (!u) return '';
        u = u.replace(/\/player_api\.php.*$/i, '').replace(/\/+$/, '');
        if (!/^[a-z][a-z0-9+.\-]*:\/\//i.test(u)) u = 'http://' + u.replace(/^\/+/, '');
        return u;
    }

    /** Base for IPTV profiles, server URLs and credentials.
     * @param {Object} cfg - Provider credentials and server settings.
     * @returns {*} Result of the operation.
     */
    function base(cfg) {
        return normaliseServerUrl(cfg && cfg.server_url);
    }

    /** Auth for IPTV profiles, server URLs and credentials.
     * @param {Object} cfg - Provider credentials and server settings.
     * @returns {*} Result of the operation.
     */
    function auth(cfg) {
        return 'username=' + encodeURIComponent(cfg.username) +
               '&password=' + encodeURIComponent(cfg.password);
    }

    /** Api Url for IPTV profiles, server URLs and credentials.
     * @param {Object} cfg - Provider credentials and server settings.
     * @param {*} params - Input to apiUrl().
     * @returns {*} Result of the operation.
     */
    function apiUrl(cfg, params) {
        return base(cfg) + '/player_api.php?' + auth(cfg) + (params ? '&' + params : '');
    }

    /** Stream Url for IPTV profiles, server URLs and credentials.
     * @param {Object} cfg - Provider credentials and server settings.
     * @param {string} kind - Input to streamUrl().
     * @param {string} id - Identifier.
     * @param {string} ext - Input to streamUrl().
     * @returns {*} Result of the operation.
     */
    function streamUrl(cfg, kind, id, ext) {
        return base(cfg) + '/' + kind + '/' +
               encodeURIComponent(cfg.username) + '/' +
               encodeURIComponent(cfg.password) + '/' +
               encodeURIComponent(id) + '.' + (ext || 'mp4');
    }

    /** Live Url for IPTV profiles, server URLs and credentials.
     * @param {Object} cfg - Provider credentials and server settings.
     * @param {string} id - Identifier.
     * @returns {*} Result of the operation.
     */
    function liveUrl(cfg, id)         { return streamUrl(cfg, 'live',   id, 'm3u8'); }
    /** Movie Url for IPTV profiles, server URLs and credentials.
     * @param {Object} cfg - Provider credentials and server settings.
     * @param {string} id - Identifier.
     * @param {string} ext - Input to movieUrl().
     * @returns {*} Result of the operation.
     */
    function movieUrl(cfg, id, ext)   { return streamUrl(cfg, 'movie',  id, ext || 'mp4'); }
    /** Episode Url for IPTV profiles, server URLs and credentials.
     * @param {Object} cfg - Provider credentials and server settings.
     * @param {string} id - Identifier.
     * @param {string} ext - Input to episodeUrl().
     * @returns {*} Result of the operation.
     */
    function episodeUrl(cfg, id, ext) { return streamUrl(cfg, 'series', id, ext || 'mp4'); }

    /* Resolve a path the panel returned (a subtitle file, an artwork URL)
       against the IPTV server rather than against the app package. A bare
       "subs/x.srt" fetched relative to the app is a guaranteed 404. */
    /** Abs Url for IPTV profiles, server URLs and credentials.
     * @param {Object} cfg - Provider credentials and server settings.
     * @param {*} u - Input to absUrl().
     * @returns {*} Result of the operation.
     */
    function absUrl(cfg, u) {
        u = String(u === null || u === undefined ? '' : u).trim();
        if (!u) return '';
        if (/^https?:\/\//i.test(u)) return u;
        if (/^\/\//.test(u)) {
            // Protocol-relative artwork/subtitles must inherit HTTPS when
            // the user selected an HTTPS provider.
            var scheme = /^https:/i.test(base(cfg)) ? 'https:' : 'http:';
            return scheme + u;
        }
        if (u.charAt(0) === '/') return base(cfg) + u;
        return base(cfg) + '/' + u;
    }

    /* Use only the explicitly configured URLs. Never silently downgrade HTTPS to HTTP. */
    /** Candidate Urls for IPTV profiles, server URLs and credentials.
     * @param {Object} cfg - Provider credentials and server settings.
     * @returns {boolean} Whether the condition is met.
     */
    function candidateUrls(cfg) {
        var entered = (cfg.server_urls && cfg.server_urls.length)
            ? cfg.server_urls
            : (cfg.server_url ? [cfg.server_url] : []);
        var out = [];
        for (var i = 0; i < entered.length; i++) {
            var u = normaliseServerUrl(entered[i]);
            if (!u || out.indexOf(u) !== -1) continue;
            out.push(u);
        }
        return out;
    }

    return {
        KEY_PROFILES: KEY_PROFILES, KEY_ACTIVE: KEY_ACTIVE,
        KEY_RESOLVED: KEY_RESOLVED, KEY_SOURCE: KEY_SOURCE,
        makeId: makeId, profiles: profiles, saveProfiles: saveProfiles,
        activeId: activeId, setActiveId: setActiveId, activeProfile: activeProfile,
        sourceType: sourceType,
        resolve: resolve, scope: scope, hash: hash,
        normaliseServerUrl: normaliseServerUrl,
        base: base, auth: auth, apiUrl: apiUrl,
        liveUrl: liveUrl, movieUrl: movieUrl, episodeUrl: episodeUrl,
        absUrl: absUrl, candidateUrls: candidateUrls
    };
}());
