"use strict";

function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
/* data/m3u.js — fetch and parse M3U playlists into Live TV channels.
 * Normalizes category IDs and stream URLs for the same UI as Xtream sources.
 */
// ── M3U / M3U8 playlist support ───────────────────────────────────────────────
//
// Parses a remote M3U8 playlist URL and returns channels + categories in the
// same shape as xtreamGetLiveChannels / xtreamGetCategories so the rest of the
// app works without changes.
//
// #EXTINF attributes understood:
//   tvg-id, tvg-name, tvg-logo, group-title   (and #EXTGRP for the group)
// #EXTM3U attributes understood:
//   url-tvg / x-tvg-url — the playlist's own XMLTV guide

/* Keyed by the playlist URL. The old single key ("iptv_m3u_v1") survived a
   profile editing its playlist URL, so the previous playlist's channels kept
   loading from cache for up to four hours after the change. */
var M3U_CACHE_PREFIX = "iptv_m3u_v2:";
var M3U_CACHE_LEGACY = "iptv_m3u_v1";
var M3U_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
var M3U_TIMEOUT_MS = 45000; // a 20 000-channel playlist is several MB

/* The active profile's playlist. Read from the profile itself — the separate
   "iptv_m3u_config" key is only kept in step by the Save button, so any other
   way of activating a profile left Live TV loading the previous playlist (or
   none). The old key is still honoured for installs from before profiles. */
/** M3u Load Config for M3U channel parsing.
 * @returns {*} Function result.
 */
function m3uLoadConfig() {
  var _window$IPTV_M3U_CONF;
  var cfg = null;
  try {
    cfg = Config.resolve();
  } catch (_) {}
  if (cfg && cfg.type === "m3u" && cfg.playlist_url) return Promise.resolve(cfg);
  var stored = Store.get("iptv_m3u_config", null);
  if (stored !== null && stored !== void 0 && stored.playlist_url) return Promise.resolve(stored);
  if ((_window$IPTV_M3U_CONF = window.IPTV_M3U_CONFIG) !== null && _window$IPTV_M3U_CONF !== void 0 && _window$IPTV_M3U_CONF.playlist_url) return Promise.resolve(window.IPTV_M3U_CONFIG);
  return Promise.reject(new Error("No M3U playlist URL configured"));
}

// ── Disk cache ────────────────────────────────────────────────────────────────

/** M3u Cache Key for M3U channel parsing.
 * @param {string} url - URL.
 * @returns {*} Function result.
 */
function _m3uCacheKey(url) {
  return M3U_CACHE_PREFIX + Config.hash(String(url || ""));
}

/* `_source` is the same on every row, and at 20 000 channels that one field
   is a few hundred KB of a ~5 MB store — so it is dropped on the way in and
   put back on the way out. */
/** M3u Load Cache for M3U channel parsing.
 * @param {string} url - URL.
 * @returns {*} Function result.
 */
function m3uLoadCache(url) {
  Store.remove(M3U_CACHE_LEGACY);
  var hit = Store.cacheGet(_m3uCacheKey(url), M3U_TTL_MS);
  if (!hit || !Array.isArray(hit.channels) || !hit.channels.length) return null;
  hit.channels.forEach(function (ch) {
    ch._source = "m3u";
  });
  return {
    channels: hit.channels,
    categories: hit.categories || [],
    epgUrl: hit.epgUrl || ""
  };
}

/** M3u Save Cache for M3U channel parsing.
 * @param {string} url - URL.
 * @param {*} parsed - Input for m3uSaveCache().
 * @returns {*} Function result.
 */
function m3uSaveCache(url, parsed) {
  var channels = parsed.channels.map(function (ch) {
    return {
      stream_id: ch.stream_id,
      name: ch.name,
      stream_icon: ch.stream_icon,
      epg_channel_id: ch.epg_channel_id,
      category_id: ch.category_id,
      stream_url: ch.stream_url
    };
  });
  Store.cacheSet(_m3uCacheKey(url), {
    channels: channels,
    categories: parsed.categories,
    epgUrl: parsed.epgUrl || ""
  });
}

/** M3u Clear Cache for M3U channel parsing.
 * @returns {*} Function result.
 */
function m3uClearCache() {
  Store.remove(M3U_CACHE_LEGACY);
  Store.removeByPrefix(M3U_CACHE_PREFIX);
}

// ── Parser ────────────────────────────────────────────────────────────────────

var _attrReCache = {};
/** Parse Attr for M3U channel parsing.
 * @param {*} extinf - Input for _parseAttr().
 * @param {*} attr - Input for _parseAttr().
 * @returns {*} Function result.
 */
function _parseAttr(extinf, attr) {
  var re = _attrReCache[attr];
  // Handles: attr="value"  attr='value'  attr=value (unquoted)
  if (!re) re = _attrReCache[attr] = new RegExp('(?:^|[\\s,])' + attr + '=(?:"([^"]*)"|\'([^\']*)\'|([^\\s"\',]*))', "i");
  var m = extinf.match(re);
  return m ? (m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : m[3] || "").trim() : "";
}

/* The display name is whatever follows the first comma that is NOT inside a
   quoted attribute. Splitting on the first comma outright broke on the very
   common group-title="News, UK": the "name" became ` UK" tvg-logo=…,BBC One`. */
/** Extinf Name for M3U channel parsing.
 * @param {*} extinf - Input for _extinfName().
 * @returns {*} Function result.
 */
function _extinfName(extinf) {
  var quote = "";
  for (var i = 0; i < extinf.length; i++) {
    var c = extinf[i];
    if (quote) {
      if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === ",") return extinf.slice(i + 1).trim();
  }
  return "";
}

/** M3u Parse for M3U channel parsing.
 * @param {string} text - Text to process.
 * @returns {*} Function result.
 */
function m3uParse(text) {
  // Normalise all line-ending styles (\r\n, \r, \n) before splitting
  var lines = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n");
  var channels = [];
  var catSet = new Map(); // category_name → category_id
  var extinf = null;
  var extgrp = "";
  var streamId = 1;
  var epgUrl = "";
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("#EXTM3U")) {
      epgUrl = (_parseAttr(line, "url-tvg") || _parseAttr(line, "x-tvg-url")).split(",")[0].trim();
      continue;
    }
    if (line.startsWith("#EXTINF")) {
      extinf = line;
      extgrp = "";
      continue;
    }
    if (line.startsWith("#EXTGRP:")) {
      extgrp = line.slice(8).trim();
      continue;
    }

    // Skip other directives
    if (line.startsWith("#")) continue;

    // This line is a URL — pair with the preceding #EXTINF
    if (extinf) {
      var name = _extinfName(extinf) || _parseAttr(extinf, "tvg-name") || "Unknown";
      var tvgId = _parseAttr(extinf, "tvg-id") || _parseAttr(extinf, "tvg-name") || name;
      var logo = _parseAttr(extinf, "tvg-logo");
      var group = _parseAttr(extinf, "group-title") || extgrp || "Uncategorised";
      if (!catSet.has(group)) catSet.set(group, String(catSet.size + 1));
      var categoryId = catSet.get(group);
      channels.push({
        stream_id: streamId++,
        name: name,
        stream_icon: logo,
        epg_channel_id: tvgId,
        category_id: categoryId,
        // M3U channels carry their URL directly — stored here so
        // xtreamBuildLiveURL can be skipped
        stream_url: line,
        _source: "m3u"
      });
      extinf = null;
      extgrp = "";
    }
  }
  var categories = [];
  catSet.forEach(function (id, name) {
    categories.push({
      category_id: id,
      category_name: name
    });
  });
  return {
    channels: channels,
    categories: categories,
    epgUrl: epgUrl
  };
}

// ── Fetch + parse ─────────────────────────────────────────────────────────────

/* Through Net so the timeout is real on every webOS version — a bare fetch +
   AbortController never timed out on webOS 4/5, where the controller is a stub. */
/** M3u Fetch Playlist for M3U channel parsing.
 * @param {string} url - URL.
 * @returns {Promise<*>} Promise for the asynchronous operation.
 */
function m3uFetchPlaylist(_x) {
  return _m3uFetchPlaylist.apply(this, arguments);
} // ── Public API (mirrors xtream shape) ─────────────────────────────────────────
/** M3u Get Channels And Categories for M3U channel parsing.
 * @param {*} m3uCfg - Input for m3uGetChannelsAndCategories().
 * @returns {Promise<*>} Promise for the asynchronous operation.
 */
function _m3uFetchPlaylist() {
  _m3uFetchPlaylist = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(url) {
    var text;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          _context.n = 1;
          return Net.text(url, {
            timeout: M3U_TIMEOUT_MS
          });
        case 1:
          text = _context.v;
          if (!(text.indexOf("#EXTINF") === -1)) {
            _context.n = 2;
            break;
          }
          throw new Error("Not a valid M3U playlist");
        case 2:
          return _context.a(2, m3uParse(text));
      }
    }, _callee);
  }));
  return _m3uFetchPlaylist.apply(this, arguments);
}
function m3uGetChannelsAndCategories(_x2) {
  return _m3uGetChannelsAndCategories.apply(this, arguments);
} // M3U channels have no server-side EPG API — return empty so the app
// falls back to XMLTV if the user has configured one.
/** M3u Get EPG for M3U channel parsing.
 * @returns {*} Function result.
 */
function _m3uGetChannelsAndCategories() {
  _m3uGetChannelsAndCategories = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(m3uCfg) {
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.n) {
        case 0:
          return _context2.a(2, m3uFetchPlaylist(m3uCfg.playlist_url));
      }
    }, _callee2);
  }));
  return _m3uGetChannelsAndCategories.apply(this, arguments);
}
function m3uGetEPG(/*streamId*/
) {
  return Promise.resolve([]);
}

// Build the playback URL for an M3U channel — it's stored directly on the
// channel object, so just return it.
/** M3u Build Live URL for M3U channel parsing.
 * @param {*} channel - Input for m3uBuildLiveURL().
 * @returns {*} Function result.
 */
function m3uBuildLiveURL(channel) {
  return channel.stream_url || "";
}