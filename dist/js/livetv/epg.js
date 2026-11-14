"use strict";

function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
/* livetv/epg.js — the programme guide: fetching, caching, the timeline window,
 * and the coloured strips drawn on each channel row.
 *
 * Three sources feed one cache, keyed by stream id:
 *   • Xtream get_short_epg   — per channel, batched, and abandoned entirely on
 *                              the first 403 (the panel has EPG switched off
 *                              for this account, so every further request is a
 *                              wasted round trip)
 *   • M3U                    — no server-side guide at all; returns empty
 *   • XMLTV                  — a user-supplied file, merged over the top
 *
 * Times are the fiddly part: Xtream returns BOTH Unix timestamps and localised
 * strings, and only the timestamps are unambiguous. epgStart/epgEnd prefer
 * them and fall back to parsing the strings as UTC.
 *
 * Requires: livetv/state.js.
 */

// ── EPG disk cache ────────────────────────────────────────────────────────────

/* Namespaced per profile. The cache is keyed internally by stream_id, and
   Xtream stream ids are small integers starting near 1 — so two providers
   collide on almost every id. With one global key, switching profiles left the
   previous provider's guide in place and drew its programme titles and times
   against the new provider's channels for the whole 30-minute TTL. */
var EPG_CACHE_BASE = "iptv_epg_v2";
var EPG_CACHE_LEGACY = EPG_CACHE_BASE; // the old unscoped key
var EPG_TTL_MS = 30 * 60 * 1000;

/** Make the provider-scoped storage key for programme guide entries.
 * @returns {string} Storage key for the active provider.
 */
function epgCacheKey() {
  var scope = "none";
  try {
    scope = Config.scope();
  } catch (e) {}
  return EPG_CACHE_BASE + ":" + scope;
}

/** Read the non-expired programme guide cache for this provider.
 * @returns {Object} Stored listings keyed by channel ID.
 */
function loadEpgDiskCache() {
  /* The unscoped key can only hold another profile's data now, and it is one
     of the largest things in a store with a ~5 MB ceiling. Drop it once. */
  Store.remove(EPG_CACHE_LEGACY);
  return Store.cacheGet(epgCacheKey(), EPG_TTL_MS) || {};
}

// Writing is debounced because the guide arrives in batches of four channels
// and each batch would otherwise serialise the entire cache again — on a large
// category that is hundreds of full re-serialisations during one scroll.
var _epgSaveTimer = null;
/** Schedule Epg Save for programme guide.
 * @returns {void} No return value.
 */
function scheduleEpgSave() {
  clearTimeout(_epgSaveTimer);
  _epgSaveTimer = setTimeout(function () {
    // `null` marks "request in flight" and must not be persisted — on the
    // next launch it would read as "already fetched, nothing found" and
    // that channel would show no guide until the cache expired. XMLTV
    // listings are skipped too: they have their own cache, and storing
    // them twice is how a large guide pushed the channel list out.
    var toSave = {};
    for (var _i = 0, _Object$entries = Object.entries(epgCache); _i < _Object$entries.length; _i++) {
      var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
        k = _Object$entries$_i[0],
        v = _Object$entries$_i[1];
      if (Array.isArray(v) && !(v.length && v[0] && v[0]._plain)) toSave[k] = v;
    }
    Store.cacheSet(epgCacheKey(), toSave);
  }, 2000);
}

// ── EPG loading ───────────────────────────────────────────────────────────────

/* `null` in epgCache means "request in flight". Every path out of the loader
   below has to hand those entries back, because the retry filter only picks up
   `undefined` — an entry left at `null` is never fetched again for the rest of
   the session, and buildEpgStrip draws it as a permanent "Loading…". Switching
   category mid-load is the ordinary way that happened. */
/** Clear interrupted EPG loading markers so channels can retry.
 * @param {Array} list - Items to process.
 * @returns {number} Number of pending markers cleared.
 */
function releaseInFlightEpg(list) {
  var n = 0;
  for (var i = 0; i < list.length; i++) {
    var id = list[i].stream_id;
    if (epgCache[id] === null) {
      delete epgCache[id];
      n++;
    }
  }
  return n;
}

/* Only the rows around the viewport are fetched. This used to request the
   guide for EVERY channel in the list — on "All" with a 20 000-channel
   provider that was 20 000 get_short_epg calls, four at a time, for as long as
   the page stayed open: thousands of requests for rows nobody scrolled to,
   enough to get an account rate-limited by its panel, and a guide cache that
   filled the storage quota. Scrolling asks again (see channels.js), so every
   row still gets its guide by the time it is on screen. */
var EPG_ROWS_BEHIND = 8;
var EPG_ROWS_AHEAD = 24;

/** Select channels near the visible virtual-list viewport for guide fetches.
 * @returns {Array<Object>} Channel entries near the visible list.
 */
function _epgWindowChannels() {
  var list = typeof _vsChannels !== "undefined" && _vsChannels.length ? _vsChannels : getFilteredChannels();
  if (!list.length) return [];
  var rowH = typeof VS_ROW_H !== "undefined" && VS_ROW_H > 0 ? VS_ROW_H : 96;
  var top = typeof _vsScrollTop !== "undefined" ? _vsScrollTop : 0;
  var h = typeof _vsHeight !== "undefined" && _vsHeight > 0 ? _vsHeight : window.innerHeight;
  var first = Math.max(0, Math.floor(top / rowH) - EPG_ROWS_BEHIND);
  var last = Math.min(list.length - 1, Math.ceil((top + h) / rowH) + EPG_ROWS_AHEAD);
  return list.slice(first, last + 1);
}
var _epgLoadTimer = null;
/** Schedule Epg Window Load for programme guide.
 * @param {number|undefined} delay - Milliseconds to wait before fetching visible rows.
 * @returns {void} No return value.
 */
function scheduleEpgWindowLoad(delay) {
  clearTimeout(_epgLoadTimer);
  _epgLoadTimer = setTimeout(loadEPGForCurrentCategory, delay === undefined ? 250 : delay);
}

/** Load EPGFor Current Category for programme guide.
 * @returns {Promise<*>} Promise for the asynchronous operation.
 */
function loadEPGForCurrentCategory() {
  return _loadEPGForCurrentCategory.apply(this, arguments);
} // ── Timeline ──────────────────────────────────────────────────────────────────
/** Round the current time to the guide's half-hour window.
 * @returns {Date} Beginning of the visible timeline.
 */
function _loadEPGForCurrentCategory() {
  _loadEPGForCurrentCategory = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2() {
    var myKey, needed, BATCH, i;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.p = _context2.n) {
        case 0:
          if (!epgBlocked) {
            _context2.n = 1;
            break;
          }
          return _context2.a(2);
        case 1:
          myKey = ++epgLoadAbortKey;
          needed = _epgWindowChannels().filter(function (ch) {
            return epgCache[ch.stream_id] === undefined;
          });
          if (needed.length) {
            _context2.n = 2;
            break;
          }
          return _context2.a(2);
        case 2:
          needed.forEach(function (ch) {
            epgCache[ch.stream_id] = null;
          });
          _context2.p = 3;
          BATCH = 4;
          i = 0;
        case 4:
          if (!(i < needed.length)) {
            _context2.n = 9;
            break;
          }
          if (!(epgLoadAbortKey !== myKey || epgBlocked)) {
            _context2.n = 5;
            break;
          }
          return _context2.a(2);
        case 5:
          _context2.n = 6;
          return Promise.all(needed.slice(i, i + BATCH).map(/*#__PURE__*/function () {
            var _ref = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee(ch) {
              var _t, _t2;
              return _regenerator().w(function (_context) {
                while (1) switch (_context.p = _context.n) {
                  case 0:
                    if (!epgBlocked) {
                      _context.n = 1;
                      break;
                    }
                    return _context.a(2);
                  case 1:
                    _context.p = 1;
                    if (!(ch._source === "m3u")) {
                      _context.n = 3;
                      break;
                    }
                    _context.n = 2;
                    return m3uGetEPG(ch.stream_id);
                  case 2:
                    _t = _context.v;
                    _context.n = 5;
                    break;
                  case 3:
                    _context.n = 4;
                    return xtreamGetEPG(cfg, ch.stream_id);
                  case 4:
                    _t = _context.v;
                  case 5:
                    epgCache[ch.stream_id] = _t;
                    _context.n = 7;
                    break;
                  case 6:
                    _context.p = 6;
                    _t2 = _context.v;
                    /* A 403 means this account has EPG switched off at the panel —
                       every remaining request would get the same answer, so stop
                       asking entirely rather than firing one per channel. Matched
                       on the status Net attaches, not on the digits "403" appearing
                       somewhere in a message. */
                    if (Net.isHttpError(_t2, 403) || Net.isHttpError(_t2, 401)) {
                      epgBlocked = true;
                    } else {
                      epgCache[ch.stream_id] = [];
                    }
                  case 7:
                    return _context.a(2);
                }
              }, _callee, null, [[1, 6]]);
            }));
            return function (_x3) {
              return _ref.apply(this, arguments);
            };
          }()));
        case 6:
          if (!(epgLoadAbortKey !== myKey || epgBlocked)) {
            _context2.n = 7;
            break;
          }
          return _context2.a(2);
        case 7:
          needed.slice(i, i + BATCH).forEach(function (ch) {
            return patchEpgStrip(ch.stream_id);
          });
        case 8:
          i += BATCH;
          _context2.n = 4;
          break;
        case 9:
          scheduleEpgSave();
        case 10:
          _context2.p = 10;
          /* Covers every exit: the two aborts above, an epgBlocked bail inside a
             batch, a throw, and the normal finish (where nothing is left null).
             A superseding call computed its own list while these were still
             marked in flight and so skipped them — ask again once they are
             released, or rows on screen would sit on "Loading…". */
          if (releaseInFlightEpg(needed) && !epgBlocked && epgLoadAbortKey !== myKey) {
            scheduleEpgWindowLoad();
          }
          return _context2.f(10);
        case 11:
          return _context2.a(2);
      }
    }, _callee2, null, [[3,, 10, 11]]);
  }));
  return _loadEPGForCurrentCategory.apply(this, arguments);
}
function getTimelineStart() {
  var now = new Date();
  var rounded = Math.floor((now.getHours() * 60 + now.getMinutes()) / 30) * 30;
  var d = new Date(now);
  d.setHours(0, rounded + timelineOffset, 0, 0);
  return d;
}
/** Calculate the end of the visible programme timeline.
 * @returns {Date} End of the visible timeline.
 */
function getTimelineEnd() {
  return new Date(getTimelineStart().getTime() + TIMELINE_HOURS * 3600000);
}

/** Setup Timeline Nav for programme guide.
 * @returns {void} No return value.
 */
function setupTimelineNav() {
  document.getElementById("tl-prev").addEventListener("click", function () {
    timelineOffset -= 60;
    refreshTimeline();
  });
  document.getElementById("tl-next").addEventListener("click", function () {
    timelineOffset += 60;
    refreshTimeline();
  });
  document.getElementById("tl-now").addEventListener("click", function () {
    timelineOffset = 0;
    refreshTimeline();
  });
}
/** Refresh Timeline for programme guide.
 * @returns {void} No return value.
 */
function refreshTimeline() {
  renderTimelineHeader();
  getFilteredChannels().forEach(function (ch) {
    return patchEpgStrip(ch.stream_id);
  });
}

/** Render Timeline Header for programme guide.
 * @returns {void} No return value.
 */
function renderTimelineHeader() {
  var header = document.getElementById("tl-time-header");
  var start = getTimelineStart();
  var frag = document.createDocumentFragment();
  for (var i = 0; i < TIMELINE_HOURS * 2; i++) {
    var t = new Date(start.getTime() + i * 30 * 60000);
    var d = document.createElement("div");
    d.className = "tl-header-slot";
    d.textContent = t.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
    frag.appendChild(d);
  }
  header.innerHTML = "";
  header.appendChild(frag);
  var tlS = getTimelineStart().getTime(),
    tlE = getTimelineEnd().getTime();
  var pct = (Date.now() - tlS) / (tlE - tlS) * 100;
  var line = document.getElementById("tl-now-line");
  if (pct >= 0 && pct <= 100) {
    line.style.left = pct + "%";
    line.style.display = "block";
  } else line.style.display = "none";
}

// ── EPG strip rendering ───────────────────────────────────────────────────────

/** Update one cached channel row's programme strip if it exists.
 * @param {string|number} streamId - Channel stream ID.
 * @returns {void} No return value.
 */
function patchEpgStrip(streamId) {
  var entry = rowCache.get(String(streamId));
  if (entry) buildEpgStrip(entry.epgStrip, String(streamId));
}

/** Render programme blocks for one channel across the visible timeline.
 * @param {HTMLElement} strip - EPG strip container to render into.
 * @param {string} sid - Stream identifier.
 * @returns {void} No return value.
 */
function buildEpgStrip(strip, sid) {
  var listings = epgCache[sid];
  var tlStart = getTimelineStart().getTime();
  var tlEnd = getTimelineEnd().getTime();
  var tlDur = tlEnd - tlStart;
  if (listings === undefined || listings === null) {
    if (strip.dataset.state === "loading") return;
    strip.innerHTML = "";
    strip.dataset.state = "loading";
    var ph = document.createElement("div");
    ph.className = "tl-epg-block tl-loading";
    ph.style.cssText = "left:0%;width:calc(100% - 2px)";
    ph.textContent = "Loading…";
    strip.appendChild(ph);
    return;
  }
  if (!listings.length) {
    if (strip.dataset.state === "empty") return;
    strip.innerHTML = "";
    strip.dataset.state = "empty";
    var _ph = document.createElement("div");
    _ph.className = "tl-epg-block tl-no-epg";
    _ph.style.cssText = "left:0%;width:calc(100% - 2px)";
    _ph.textContent = "No EPG";
    strip.appendChild(_ph);
    return;
  }

  // Skip re-render if already built from THIS data for this timeline window.
  // The data matters as much as the window: when an XMLTV guide arrives it
  // replaces the panel's listings for the same channel, and a strip that
  // only compared the window kept drawing the old programmes.
  if (strip.dataset.state === "filled" && strip.dataset.tlStart === String(tlStart) && strip._listings === listings) return;
  strip.dataset.state = "filled";
  strip.dataset.tlStart = String(tlStart);
  strip.innerHTML = "";
  strip._listings = listings;
  var now = Date.now();
  var frag = document.createDocumentFragment();
  listings.forEach(function (e) {
    var eStart = epgStart(e),
      eEnd = epgEnd(e);
    if (eEnd <= tlStart || eStart >= tlEnd) return;
    var cs = Math.max(eStart, tlStart),
      ce = Math.min(eEnd, tlEnd);
    var left = (cs - tlStart) / tlDur * 100;
    var width = (ce - cs) / tlDur * 100;
    var isNow = now >= eStart && now < eEnd;
    var isPast = eEnd < now;
    var block = document.createElement("div");
    block.className = "tl-epg-block" + (isNow ? " tl-now" : "") + (isPast ? " tl-past" : "");
    block.style.left = left + "%";
    block.style.width = "calc(".concat(width, "% - 2px)");
    var timeSpan = document.createElement("span");
    timeSpan.className = "tl-block-time";
    timeSpan.textContent = "".concat(fmtTime(eStart), "\u2013").concat(fmtTime(eEnd));
    var titleSpan = document.createElement("span");
    titleSpan.className = "tl-block-title";
    titleSpan.textContent = epgTitle(e);
    block.appendChild(timeSpan);
    block.appendChild(titleSpan);
    if (isNow) {
      var fill = document.createElement("div");
      fill.className = "tl-progress-fill";
      fill.style.width = (now - eStart) / (eEnd - eStart) * 100 + "%";
      block.appendChild(fill);
    }
    block.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var cached = rowCache.get(sid);
      if (cached) {
        var ch = allChannels.find(function (c) {
          return String(c.stream_id) === sid;
        });
        if (ch) selectChannel(ch);
      }
    });
    frag.appendChild(block);
  });
  strip.appendChild(frag);
}

// ── EPG time helpers ──────────────────────────────────────────────────────────

/* Memoised because a full guide re-parses the same handful of strings per
   channel — but bounded, because the key is provider text: a 20 000-channel
   panel that returns no `start_timestamp` (the only case that reaches here)
   would otherwise leave a couple of hundred thousand entries in it for the
   session. Cleared wholesale rather than evicted one at a time; the parse is
   cheap and this only has to stop being unbounded. */
var EPG_TIME_CACHE_MAX = 20000;
var _epgTimeCache = Object.create(null);
var _epgTimeCacheN = 0;

/** Parse a provider-supplied timestamp string as UTC.
 * @param {string} s - Provider timestamp text.
 * @returns {number} Epoch milliseconds, or zero for an empty value.
 */
function parseEpgTime(s) {
  if (!s) return 0;
  if (_epgTimeCache[s] !== undefined) return _epgTimeCache[s];
  if (++_epgTimeCacheN > EPG_TIME_CACHE_MAX) {
    _epgTimeCache = Object.create(null);
    _epgTimeCacheN = 1;
  }
  // The `start`/`end` strings are in the provider's timezone (unknown), so we
  // can't parse them reliably — used only as a fallback. Treated as UTC.
  return _epgTimeCache[s] = new Date(s.replace(" ", "T") + "Z").getTime();
}
// Prefer the Unix-epoch timestamps: they're absolute UTC and unambiguous, which
// avoids the constant timezone offset the localized strings caused.
/** Get a programme's start time, preferring its Unix timestamp.
 * @param {Object} e - Programme guide entry.
 * @returns {number} Programme start in epoch milliseconds.
 */
function epgStart(e) {
  if (e && e.start_timestamp) return Number(e.start_timestamp) * 1000;
  return parseEpgTime(e && e.start);
}
/** Get a programme's end time, preferring its Unix timestamp.
 * @param {Object} e - Programme guide entry.
 * @returns {number} Programme end in epoch milliseconds.
 */
function epgEnd(e) {
  var ts = e && (e.stop_timestamp || e.end_timestamp);
  if (ts) return Number(ts) * 1000;
  return parseEpgTime(e && e.end);
}
// Current programme + the one after it. Falls back to the first two listings
// when nothing matches "now" (e.g. all-future or stale EPG data).
/** Find the active and following programme in a sorted guide.
 * @param {Array<Object>} listings - Sorted programme entries for one channel.
 * @returns {Object} Object with cur and next programme entries.
 */
function _findNowNext(listings) {
  var now = Date.now();
  var idx = listings.findIndex(function (e) {
    var s = epgStart(e),
      n = epgEnd(e);
    return now >= s && now < n;
  });
  return {
    cur: listings[idx >= 0 ? idx : 0],
    next: listings[idx >= 0 ? idx + 1 : 1]
  };
}
/** Format a valid epoch timestamp as a local clock time.
 * @param {number} ms - Epoch timestamp in milliseconds.
 * @returns {string} Local time string, or empty for invalid time.
 */
function fmtTime(ms) {
  if (!(ms > 0) || !isFinite(ms)) return "";
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}
/** Format a programme's start and end times.
 * @param {Object} e - Programme guide entry.
 * @returns {string} Readable time interval, or empty when missing.
 */
function formatTimeRange(e) {
  var a = fmtTime(epgStart(e)),
    b = fmtTime(epgEnd(e));
  return a && b ? "".concat(a, " \u2013 ").concat(b) : a || "";
}
/** Calculate the current programme's elapsed percentage.
 * @param {Object} e - Programme guide entry.
 * @returns {number} Integer progress percentage, or zero for invalid times.
 */
function calcProgress(e) {
  try {
    var s = epgStart(e),
      en = epgEnd(e),
      now = Date.now();
    if (!(en > s) || now < s || now > en) return 0;
    return Math.round((now - s) / (en - s) * 100);
  } catch (_unused) {
    return 0;
  }
}

/* Xtream sends titles and descriptions base64-encoded; XMLTV sends plain text
   and its entries are marked `_plain`. Decoding a plain title as base64 is not
   harmless — "News" and "Golf" are valid base64 and came out as binary junk. */
/** Decode the guide title, respecting plain-text XMLTV entries.
 * @param {Object} e - Programme guide entry.
 * @returns {string} Readable programme title.
 */
function epgTitle(e) {
  return !e ? "" : e._plain ? e.title || "" : xtreamDecodeEPG(e.title);
}
/** Decode the guide description, respecting plain-text XMLTV entries.
 * @param {Object} e - Programme guide entry.
 * @returns {string} Readable programme description.
 */
function epgDesc(e) {
  return !e ? "" : e._plain ? e.description || "" : xtreamDecodeEPG(e.description);
}

// ── XMLTV / custom EPG ────────────────────────────────────────────────────────
//
// A user-supplied guide, from (in order) the active profile's EPG URL, the
// app-wide one in Settings → EPG, or the url-tvg an M3U playlist names in its
// own header. Both settings used to be saved and then never read: nothing
// called the loader, so a configured guide simply never appeared.
//
// Parsed with regular expressions rather than DOMParser. A full XMLTV file is
// tens of MB; building a DOM of it on a TV is the slowest and most
// memory-hungry way to read it, where a forward scan over the text holds
// nothing but the programmes being kept.

var XMLTV_CACHE_KEY = "iptv_xmltv_cache";
var XMLTV_TTL_MS = 12 * 60 * 60 * 1000;
var XMLTV_TIMEOUT = 60000;
/* Only what the timeline can show. Guides run days ahead, and keeping all of
   it neither fits the storage quota nor is worth the TV's memory. */
var XMLTV_KEEP_BEHIND_MS = 3 * 60 * 60 * 1000;
var XMLTV_KEEP_AHEAD_MS = 30 * 60 * 60 * 1000;
var XMLTV_DESC_MAX = 400;
var xmltvCache = {};
var _xmltvLoading = "";

/** Choose the profile, app or playlist XMLTV URL and matching method.
 * @param {string} playlistEpgUrl - Optional XMLTV URL declared by an M3U playlist.
 * @returns {Object} Object containing url and match properties.
 */
function xmltvSource(playlistEpgUrl) {
  var active = null;
  try {
    active = Config.resolve();
  } catch (_) {}
  var own = active && active.epg_url ? String(active.epg_url).trim() : "";
  var app = String(Store.get("iptv_custom_epg_url", "") || "").trim();
  return {
    url: own || app || String(playlistEpgUrl || "").trim(),
    match: (own ? active.epg_match : Store.get("iptv_custom_epg_match", "")) || "tvg-id"
  };
}

/* The entry point, called once the channel list is known. */
/** Load a configured XMLTV guide from cache or start its download.
 * @param {string} playlistEpgUrl - Optional XMLTV URL declared by an M3U playlist.
 * @returns {void} No return value.
 */
function loadXMLTV(playlistEpgUrl) {
  var src = xmltvSource(playlistEpgUrl);
  if (!src.url) return;
  if (loadXMLTVFromCache(src.url)) {
    xmltvCache.matchField = src.match;
    mergeXMLTVIntoEpgCache();
    refreshTimeline();
    return;
  }
  loadCustomXMLTV(src.url, src.match);
}

/** Load Custom XMLTV for programme guide.
 * @param {string} url - URL.
 * @param {string} matchField - Field used to match XMLTV channels to IPTV entries.
 * @returns {Promise<*>} Promise for the asynchronous operation.
 */
function loadCustomXMLTV(_x, _x2) {
  return _loadCustomXMLTV.apply(this, arguments);
}
function _loadCustomXMLTV() {
  _loadCustomXMLTV = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(url, matchField) {
    var text, now, parsed, count, _t3;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.p = _context3.n) {
        case 0:
          if (!(!url || _xmltvLoading === url)) {
            _context3.n = 1;
            break;
          }
          return _context3.a(2);
        case 1:
          _xmltvLoading = url;
          _context3.p = 2;
          _context3.n = 3;
          return Net.text(url, {
            timeout: XMLTV_TIMEOUT
          });
        case 3:
          text = _context3.v;
          if (!(text.indexOf("<programme") === -1)) {
            _context3.n = 4;
            break;
          }
          throw new Error(/\.gz(\?|$)/i.test(url) ? "Compressed (.gz) guides can't be read on the TV — use the plain .xml address." : "That address didn't return an XMLTV guide.");
        case 4:
          now = Date.now();
          parsed = parseXMLTV(text, now - XMLTV_KEEP_BEHIND_MS, now + XMLTV_KEEP_AHEAD_MS);
          xmltvCache = {
            url: url,
            programmes: parsed.programmes,
            channelMap: parsed.channelMap,
            matchField: matchField
          };
          Store.cacheSet(XMLTV_CACHE_KEY, xmltvCache);
          count = Object.keys(parsed.programmes).length;
          setSettingsStatus("epg-load-status", "\u2713 Loaded ".concat(count, " channels from XMLTV."), "ok");
          mergeXMLTVIntoEpgCache();
          refreshTimeline();
          _context3.n = 6;
          break;
        case 5:
          _context3.p = 5;
          _t3 = _context3.v;
          setSettingsStatus("epg-load-status", "Error: " + _t3.message, "err");
        case 6:
          _context3.p = 6;
          _xmltvLoading = "";
          return _context3.f(6);
        case 7:
          return _context3.a(2);
      }
    }, _callee3, null, [[2, 5, 6, 7]]);
  }));
  return _loadCustomXMLTV.apply(this, arguments);
}
var _XML_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: "\xA0"
};

/** Decode a valid Unicode code point into a JavaScript string.
 * @param {number} code - Unicode code point.
 * @returns {string} Decoded character, or empty string when invalid.
 */
function _charFromCode(code) {
  if (!(code > 0 && code < 0x110000)) return "";
  if (code <= 0xFFFF) return String.fromCharCode(code);
  code -= 0x10000; // String.fromCodePoint is Chromium 41+
  return String.fromCharCode(0xD800 + (code >> 10), 0xDC00 + (code & 0x3FF));
}

/** Strip XML tags and decode XML entities for a programme field.
 * @param {string} s - Raw XMLTV field text.
 * @returns {string} Plain text from an XMLTV element.
 */
function _xmlText(s) {
  return String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, ent) {
    if (ent.charAt(0) === "#") {
      var x = ent.charAt(1) === "x" || ent.charAt(1) === "X";
      return _charFromCode(parseInt(ent.slice(x ? 2 : 1), x ? 16 : 10)) || m;
    }
    var named = _XML_ENTITIES[ent.toLowerCase()];
    return named !== undefined ? named : m;
  });
}
var _xmlAttrRe = {};
/** Read and decode a named XML attribute from source text.
 * @param {string} attrs - Raw attribute text from an XML tag.
 * @param {string} name - Display name.
 * @returns {string} Attribute value, or empty string.
 */
function _xmlAttr(attrs, name) {
  var re = _xmlAttrRe[name] || (_xmlAttrRe[name] = new RegExp("\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)')"));
  var m = re.exec(attrs);
  return m ? _xmlText(m[1] !== undefined ? m[1] : m[2]) : "";
}

/** Parse only programmes in the permitted time window.
 * @param {string} text - Text to process.
 * @param {number} keepFrom - Earliest programme end to retain, epoch milliseconds.
 * @param {number} keepTo - Latest programme start to retain, epoch milliseconds.
 * @returns {Object} Channel-name map and per-channel programme arrays.
 */
function parseXMLTV(text, keepFrom, keepTo) {
  var channelMap = {};
  var chRe = /<channel\b([^>]*)>([\s\S]*?)<\/channel>/g;
  var m;
  while (m = chRe.exec(text)) {
    var id = _xmlAttr(m[1], "id");
    var dn = /<display-name\b[^>]*>([\s\S]*?)<\/display-name>/.exec(m[2]);
    channelMap[id] = (dn ? _xmlText(dn[1]).trim() : "") || id;
  }
  var programmes = {};
  var prRe = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/g;
  while (m = prRe.exec(text)) {
    var attrs = m[1];
    var stop = parseXMLTVDate(_xmlAttr(attrs, "stop"));
    if (!stop || stop < keepFrom) continue;
    var start = parseXMLTVDate(_xmlAttr(attrs, "start"));
    if (!start || start > keepTo) continue;
    var chId = _xmlAttr(attrs, "channel");
    var t = /<title\b[^>]*>([\s\S]*?)<\/title>/.exec(m[2]);
    var d = /<desc\b[^>]*>([\s\S]*?)<\/desc>/.exec(m[2]);
    var desc = d ? _xmlText(d[1]).trim() : "";
    if (desc.length > XMLTV_DESC_MAX) desc = desc.slice(0, XMLTV_DESC_MAX - 1) + "…";
    (programmes[chId] || (programmes[chId] = [])).push({
      title: t ? _xmlText(t[1]).trim() : "",
      description: desc,
      start_timestamp: Math.floor(start / 1000),
      stop_timestamp: Math.floor(stop / 1000),
      _plain: 1
    });
  }
  // Guides are not always in time order per channel; now/next assumes they are.
  Object.keys(programmes).forEach(function (k) {
    programmes[k].sort(function (a, b) {
      return a.start_timestamp - b.start_timestamp;
    });
  });
  return {
    channelMap: channelMap,
    programmes: programmes
  };
}

/* "20240101203000 +0100". Computed with Date.UTC rather than by building an
   ISO string for Date to parse — older engines disagree about how to read an
   ISO string with an offset, and this needs no parsing at all. */
/** Parse a compact XMLTV time with optional UTC offset.
 * @param {string} str - Compact XMLTV date/time string.
 * @returns {number} Epoch milliseconds, or zero if invalid.
 */
function parseXMLTVDate(str) {
  if (!str) return 0;
  var m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-])?(\d{2})?(\d{2})?/.exec(String(str).trim());
  if (!m) return 0;
  var t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0));
  if (m[7] && m[8]) {
    var off = (+m[8] * 60 + +(m[9] || 0)) * 60000;
    t -= m[7] === "-" ? -off : off;
  }
  return t;
}

/** Restore a matching XMLTV guide from disk cache.
 * @param {string} url - URL.
 * @returns {boolean} True if the requested guide was available.
 */
function loadXMLTVFromCache(url) {
  var data = Store.cacheGet(XMLTV_CACHE_KEY, XMLTV_TTL_MS);
  if (!data || !data.programmes || url && data.url !== url) return false;
  xmltvCache = data;
  return true;
}

/** Match XMLTV programmes to current IPTV channels.
 * @returns {void} No return value.
 */
function mergeXMLTVIntoEpgCache() {
  if (!xmltvCache.programmes) return;
  var matchField = xmltvCache.matchField || "tvg-id";
  var progs = xmltvCache.programmes;

  /* Lower-cased lookups built once, instead of a scan per channel. Ids are
     matched case-insensitively — "BBCOne.uk" in the guide and "bbcone.uk"
     on the channel are the same channel. */
  var byId = {};
  Object.keys(progs).forEach(function (id) {
    byId[id.toLowerCase()] = progs[id];
  });
  var byName = {};
  for (var _i2 = 0, _Object$entries2 = Object.entries(xmltvCache.channelMap || {}); _i2 < _Object$entries2.length; _i2++) {
    var _Object$entries2$_i = _slicedToArray(_Object$entries2[_i2], 2),
      xmlId = _Object$entries2$_i[0],
      name = _Object$entries2$_i[1];
    if (progs[xmlId]) byName[String(name).toLowerCase()] = progs[xmlId];
  }
  allChannels.forEach(function (ch) {
    var name = String(ch.name || "").toLowerCase();
    var listings = null;
    if (matchField === "tvg-id") {
      listings = byId[String(ch.epg_channel_id || "").toLowerCase()] || byName[name] || null;
    } else {
      listings = byName[name] || null;
    }
    if (listings) epgCache[String(ch.stream_id)] = listings;
  });
}