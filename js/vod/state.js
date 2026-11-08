/* vod/state.js — the VOD page's shared state and the aliases every other
 * module uses.
 *
 * VOD is one screen assembled from several cooperating modules, and they
 * genuinely share state: which section is active decides what the rails render,
 * what the sidebar lists, and what a typed search looks through. Rather than
 * thread that through every call it lives here, the same arrangement Live TV
 * uses.
 *
 * Loaded FIRST of the vod modules — the DOM refs and the resolved config below
 * are read at load time by the modules that follow.
 */
'use strict';

/* ── Config + helpers ─────────────────────────────────────────────────
   Local aliases for the core modules. They read better at the density this
   file uses them, and they keep the call sites short enough to stay on one
   line, which most of the rendering code depends on for legibility. */
var cfg = Config.resolve();

/* The VOD caches used to be keyed by the server URL, which two accounts on one
   provider host share — so a second line saw the first one's category and
   content lists even though their packages differ. They are keyed by
   Config.scope() (host + username) now; this drops the entries left under the
   old URL-based names, which are unreachable dead weight in a store with a
   ~5 MB ceiling. The legacy names are the ones whose suffix starts with the
   URL scheme, so the new keys can never match these prefixes. */
/** Remove obsolete VOD caches so old identifiers do not corrupt the current library.
 * @returns {void} Runs its startup, polling, or UI side effects.
 */
(function purgeLegacyVodCaches() {
    try {
        var prefixes = ['vod_cats_movie_http', 'vod_cats_series_http', 'vod_content_http'];
        for (var i = 0; i < prefixes.length; i++) Store.removeByPrefix(prefixes[i]);
    } catch (e) {}
}());

/** Build the current provider's Xtream API URL.
 * @param {string} params - Xtream query string parameters.
 * @returns {string} Provider API URL.
 */
function apiUrl(params)          { return Config.apiUrl(cfg, params); }
/** Build a playback URL for a VOD movie.
 * @param {string} id - Identifier.
 * @param {string} ext - Movie file extension.
 * @returns {string} Movie playback URL.
 */
function buildMovieUrl(id, ext)  { return Config.movieUrl(cfg, id, ext); }
/** Build a playback URL for a series episode.
 * @param {string} id - Identifier.
 * @param {string} ext - Episode file extension.
 * @returns {string} Episode playback URL.
 */
function buildEpisodeUrl(id, ext){ return Config.episodeUrl(cfg, id, ext); }
/** Read a stored cache entry.
 * @param {string} key - Key or identifier.
 * @returns {*} Cached value, or null when absent.
 */
function cacheGet(key)           { return Store.cacheGet(key); }
/** Write a cache entry.
 * @param {string} key - Key or identifier.
 * @param {*} data - Serializable data to store.
 * @returns {*} Return value of Store.cacheSet.
 */
function cacheSet(key, data)     { return Store.cacheSet(key, data); }
/** Fetch and parse a JSON URL through the shared network layer.
 * @param {string} url - Requested URL.
 * @returns {Promise<*>} Promise resolving to parsed JSON.
 */
function fetchJSON(url)          { return Net.json(url); }
/** Fetch JSON using the shared cache.
 * @param {string} key - Key or identifier.
 * @param {string} url - Requested URL.
 * @returns {Promise<*>} Promise resolving to cached or fetched JSON.
 */
function fetchCached(key, url)   { return Net.cachedJSON(key, url); }

/* ── Category lists, slimmed before caching ──────────────────────────────
   Every rail caches its category's full list, and a panel's VOD objects
   carry two dozen fields — trailers, TMDB ids, backdrops, timestamps, flags —
   of which the cards and the detail view read a handful. Cached whole, a few
   dozen categories filled the ~5 MB store on their own, and from then on
   nothing else could be written: not the channel list, not the play
   handover, not resume positions. Only what is read is kept now, and the
   long free-text fields are capped. */
var VOD_KEEP = ['name', 'title', 'stream_id', 'series_id', 'stream_icon', 'cover', 'cover_big', 'icon',
                'container_extension', 'category_id', 'rating', 'rating_5based', 'year',
                'releaseDate', 'releasedate', 'genre', 'duration', 'director'];

/** Copy the VOD fields needed by our UI into a small cacheable object.
 * @param {Object} m - Provider VOD metadata record.
 * @returns {Object} Pruned VOD item.
 */
function slimVodItem(m) {
    var out = {};
    if (!m || typeof m !== 'object') return out;
    for (var i = 0; i < VOD_KEEP.length; i++) {
        var v = m[VOD_KEEP[i]];
        if (v !== undefined && v !== null && v !== '') out[VOD_KEEP[i]] = v;
    }
    var plot = m.plot || m.description;
    if (plot) out.plot = String(plot).slice(0, 600);
    if (m.cast) out.cast = String(m.cast).slice(0, 300);
    if (!out.stream_icon && !out.cover && !out.cover_big) {
        var bd = Array.isArray(m.backdrop_path) ? m.backdrop_path[0] : m.backdrop_path;
        if (bd) out.cover = bd;
    }
    return out;
}

/** Get a cached VOD list or fetch and simplify it.
 * @param {string} key - Key or identifier.
 * @param {string} url - Requested URL.
 * @returns {Promise<Array<Object>>} Promise resolving to VOD items.
 */
function fetchCachedList(key, url) {
    var hit = Store.cacheGet(key);
    if (hit) return Promise.resolve(hit);
    return fetchJSON(url).then(function (data) {
        var list = Array.isArray(data) ? data.map(slimVodItem) : [];
        Store.cacheSet(key, list);
        return list;
    });
}

/** Escape untrusted text for safe insertion into HTML.
 * @param {*} s - Text or value to render safely.
 * @returns {string} HTML-escaped string.
 */
function escHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


/* ── State ───────────────────────────────────────────────────────── */
var activeType = 'movie';
var hidden = {
    movie:  new Set((Store.get('iptv_hidden_cats_vod_m', []) || []).map(String)),
    series: new Set((Store.get('iptv_hidden_cats_vod_s', []) || []).map(String))
};
var cats = { movie: null, series: null };     // category arrays per type
/* Cards per rail before the "···" tile takes over. A rail is a preview, not
   a browser: past a dozen the D-pad journey to the end costs more than
   opening the category outright, and every extra card is a poster the TV
   decodes for a row nobody scrolls to the end of. */
var RAIL_CAP = 12;

/* ── DOM refs ────────────────────────────────────────────────────── */
var elRails    = document.getElementById('vod-rails');
var elStatus   = document.getElementById('vod-status');
var elStatusTx = document.getElementById('vod-status-text');
var elDetail   = document.getElementById('vod-detail');
var elSearch   = document.getElementById('vod-search-overlay');
var elSearchIn = document.getElementById('vod-search-input');
var elSearchGrid = document.getElementById('vod-search-grid');
var elCategory = document.getElementById('vod-category');
var elCategoryGrid = document.getElementById('vod-category-grid');


/* ── Status helpers ──────────────────────────────────────────────── */
/** Show Status for VOD shared state.
 * @param {string} text - Status message displayed above the VOD catalog.
 * @param {boolean} spinner - Whether to show a loading spinner.
 * @returns {void} No return value.
 */
function showStatus(text, spinner) {
    elStatus.style.display = 'flex';
    elStatusTx.textContent = text;
    elStatus.querySelector('.vod-spinner').style.display = spinner ? '' : 'none';
    elRails.style.display = 'none';
}
/** Hide Status for VOD shared state.
 * @returns {void} No return value.
 */
function hideStatus() { elStatus.style.display = 'none'; elRails.style.display = ''; }
