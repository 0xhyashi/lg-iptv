"use strict";

function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function _regenerator() { /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */ var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
/* app.js — Live TV: startup, channel selection, and the boot sequence.
 *
 * The page is assembled from several modules, loaded in dependency order by
 * pages/livetv.html:
 *
 *   livetv/state.js      shared state every other module reads
 *   livetv/epg.js        guide data, timeline, programme strips
 *   livetv/channels.js   channel cache, filtering, virtual scroller
 *   livetv/sidebar.js    favourites, groups, categories, dialogs
 *   livetv/pip.js        preview, fullscreen, OSD, multiview entry
 *   livetv/multiview.js  the multi-channel grid
 *   dpad.js              remote control routing
 *   app.js               this file — init and boot
 *
 * Startup takes the cache-first path whenever it can: a cached channel list
 * paints immediately and the network refresh lands underneath it, because a
 * TV app that shows a spinner for four seconds on every launch feels broken
 * even when it is working perfectly.
 */

// ── App init ──────────────────────────────────────────────────────────────────

// ── Source type ───────────────────────────────────────────────────────────────

/* From the active profile — see Config.sourceType() for why not from the
   separate iptv_source_type key. */
/** Read the active IPTV source type.
 * @returns {string} Requested text value.
 */
function getSourceType() {
  return Config.sourceType();
}

/** Load the configured provider and start Live TV.
 * @returns {Promise<void>} Resolves when the operation finishes.
 */
function initApp() {
  return _initApp.apply(this, arguments);
}
/** Load an M3U playlist and hand its channels to the UI.
 * @param {Function} setStatus - Callback that reports progress or errors.
 * @returns {Promise<void>} Resolves when the operation finishes.
 */
function _initApp() {
  _initApp = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee() {
    var status, setStatus;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.n) {
        case 0:
          status = document.getElementById("status");
          setStatus = function setStatus(msg, err) {
            status.textContent = msg;
            status.style.color = err ? "#ff5555" : "";
          };
          epgCache = loadEpgDiskCache();
          if (!(getSourceType() === "m3u")) {
            _context.n = 2;
            break;
          }
          _context.n = 1;
          return _initAppM3U(setStatus);
        case 1:
          _context.n = 3;
          break;
        case 2:
          _context.n = 3;
          return _initAppXtream(setStatus);
        case 3:
          return _context.a(2);
      }
    }, _callee);
  }));
  return _initApp.apply(this, arguments);
}
function _initAppM3U(_x) {
  return _initAppM3U2.apply(this, arguments);
}
/** Load Xtream channels and categories.
 * @param {Function} setStatus - Callback that reports progress or errors.
 * @returns {Promise<void>} Resolves when the operation finishes.
 */
function _initAppM3U2() {
  _initAppM3U2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee2(setStatus) {
    var m3uCfg, url, cached, parsed, _t, _t2;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.p = _context2.n) {
        case 0:
          _context2.p = 0;
          _context2.n = 1;
          return m3uLoadConfig();
        case 1:
          m3uCfg = _context2.v;
          _context2.n = 3;
          break;
        case 2:
          _context2.p = 2;
          _t = _context2.v;
          setStatus("ERR: " + _t.message, true);
          return _context2.a(2);
        case 3:
          // Try disk cache first
          url = m3uCfg.playlist_url;
          cached = m3uLoadCache(url);
          if (!cached) {
            _context2.n = 4;
            break;
          }
          allChannels = cached.channels;
          setStatus("".concat(allChannels.length, " channels (cached)"));
          _bootUI(cached.categories, cached.epgUrl);
          // Refresh in background. An empty or failed refresh keeps the cached
          // list on screen rather than wiping it — same rule as Xtream below.
          m3uFetchPlaylist(url).then(function (parsed) {
            if (!parsed.channels.length) return;
            allChannels = parsed.channels;
            setStatus("".concat(allChannels.length, " channels"));
            m3uSaveCache(url, parsed);
            renderCategories(parsed.categories);
            updateSidebarActive();
            applyFilters();
          }).catch(function () {});
          return _context2.a(2);
        case 4:
          _context2.p = 4;
          setStatus("Loading playlist…");
          _context2.n = 5;
          return m3uGetChannelsAndCategories(m3uCfg);
        case 5:
          parsed = _context2.v;
          if (parsed.channels.length) {
            _context2.n = 6;
            break;
          }
          setStatus("ERR: 0 channels in playlist", true);
          return _context2.a(2);
        case 6:
          allChannels = parsed.channels;
          setStatus("".concat(allChannels.length, " channels"));
          m3uSaveCache(url, parsed);
          _bootUI(parsed.categories, parsed.epgUrl);
          _context2.n = 8;
          break;
        case 7:
          _context2.p = 7;
          _t2 = _context2.v;
          setStatus("ERR: " + _t2.message, true);
        case 8:
          return _context2.a(2);
      }
    }, _callee2, null, [[4, 7], [0, 2]]);
  }));
  return _initAppM3U2.apply(this, arguments);
}
function _initAppXtream(_x2) {
  return _initAppXtream2.apply(this, arguments);
}
/** Keep the classic cable-guide clock in sync with the TV's local time.
 * @returns {void} Starts a single one-minute clock update on this page.
 */
function _initAppXtream2() {
  _initAppXtream2 = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee3(setStatus) {
    var _cfg;
    var cachedCh, cachedCat, categories, login, _yield$Promise$all, _yield$Promise$all2, channels, cats, _t3, _t4, _t5;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.p = _context3.n) {
        case 0:
          setStatus("Loading config…");
          _context3.p = 1;
          _context3.n = 2;
          return xtreamLoadConfig();
        case 2:
          cfg = _context3.v;
          _context3.n = 4;
          break;
        case 3:
          _context3.p = 3;
          _t3 = _context3.v;
          setStatus("ERR: " + _t3.message, true);
          return _context3.a(2);
        case 4:
          if ((_cfg = cfg) !== null && _cfg !== void 0 && _cfg.server_url) {
            _context3.n = 5;
            break;
          }
          setStatus("No server configured — redirecting to Settings…", false);
          setTimeout(function () {
            window.location.href = "../pages/settings.html";
          }, 1800);
          return _context3.a(2);
        case 5:
          cachedCh = loadChannelCache();
          cachedCat = loadCatCache();
          categories = cachedCat || [];
          if (!cachedCh) {
            _context3.n = 6;
            break;
          }
          allChannels = cachedCh;
          setStatus("".concat(allChannels.length, " channels (cached)"));
          _bootUI(categories);

          /* Background refresh. Both guards on `.length` are load-bearing:
             xtreamGet* swallow their errors and return [], so a failed refresh
             arrives as an empty array rather than a rejection. Without the guard
             the category list was wiped from the screen AND written back to the
             cache as empty on every launch where the panel was briefly
             unreachable — leaving the sidebar with no categories until a later
             launch happened to succeed. */
          xtreamGetLiveChannels(cfg).then(function (fresh) {
            if (!fresh.length) return;
            allChannels = fresh;
            setStatus("".concat(allChannels.length, " channels"));
            saveChannelCache(fresh, categories);
            if (xmltvCache && xmltvCache.programmes) mergeXMLTVIntoEpgCache();
            _keepScrollOnApply = true; // a refresh must not throw the user back to row 1
            applyFilters();
          }).catch(function () {});
          xtreamGetCategories(cfg).then(function (freshCat) {
            if (!freshCat.length) return;
            var sig = function sig(list) {
              return list.map(function (c) {
                return c.category_id + ":" + c.category_name;
              }).join("|");
            };
            var changed = sig(freshCat) !== sig(categories);
            categories = freshCat;
            /* Only the category list is new here, so only it is written. This
               used to re-save the entire channel list as well — serialising
               several MB a second time on every launch for nothing. */
            Store.cacheSet(CAT_CACHE_KEY, freshCat);
            if (!changed) return; // identical: leave the sidebar (and the focus ring in it) alone
            renderCategories(freshCat);
            updateSidebarActive();
            if (tvFocusZone === "sidebar-cats") tvFocusSidebarItem(tvSidebarIndex);
          }).catch(function () {});
          return _context3.a(2);
        case 6:
          setStatus("Logging in…");
          _context3.p = 7;
          _context3.n = 8;
          return xtreamLogin(cfg);
        case 8:
          login = _context3.v;
          if (!(login && login.authFailed)) {
            _context3.n = 9;
            break;
          }
          setStatus("ERR: " + login.message, true);
          return _context3.a(2);
        case 9:
          if (login) {
            _context3.n = 10;
            break;
          }
          setStatus("ERR: Could not reach any server for this profile", true);
          return _context3.a(2);
        case 10:
          // Update cfg with the resolved server_url (the URL that actually worked)
          cfg = login.cfg;
          _context3.n = 12;
          break;
        case 11:
          _context3.p = 11;
          _t4 = _context3.v;
          setStatus("ERR: " + _t4.message, true);
          return _context3.a(2);
        case 12:
          _context3.p = 12;
          setStatus("Fetching channels…");
          _context3.n = 13;
          return Promise.all([xtreamGetLiveChannels(cfg), xtreamGetCategories(cfg)]);
        case 13:
          _yield$Promise$all = _context3.v;
          _yield$Promise$all2 = _slicedToArray(_yield$Promise$all, 2);
          channels = _yield$Promise$all2[0];
          cats = _yield$Promise$all2[1];
          if (channels.length) {
            _context3.n = 14;
            break;
          }
          setStatus("ERR: 0 channels returned", true);
          return _context3.a(2);
        case 14:
          allChannels = channels;
          categories = cats;
          setStatus("".concat(allChannels.length, " channels"));
          saveChannelCache(channels, categories);
          _bootUI(categories);
          _context3.n = 16;
          break;
        case 15:
          _context3.p = 15;
          _t5 = _context3.v;
          setStatus("ERR: " + _t5.message, true);
        case 16:
          return _context3.a(2);
      }
    }, _callee3, null, [[12, 15], [7, 11], [1, 3]]);
  }));
  return _initAppXtream2.apply(this, arguments);
}
function setupGuideClock() {
  var target = document.getElementById("guide-clock");
  if (!target) return;
  /** Show the current local date and time in the guide masthead.
   * @returns {void} Updates the masthead text.
   */
  function drawGuideClock() {
    var now = new Date();
    var day = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric"
    });
    var hour = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });
    target.textContent = day.toUpperCase() + "  " + hour;
  }
  drawGuideClock();
  setInterval(drawGuideClock, 60000);
}

/** Render categories and start Live TV's supporting services.
 * @param {Array<Object>} categories - Category definitions.
 * @param {string} playlistEpgUrl - Provider's EPG URL.
 * @returns {void} No return value.
 */
function _bootUI(categories, playlistEpgUrl) {
  renderCategories(categories);
  setupSearch();
  setupPip();
  setupRadioUI();
  setupTimelineNav();
  setupGuideClock();
  activeCategory = Favourites.isEmpty() ? "all" : "favs";
  activeFavGroup = "all";
  if (activeCategory === "favs") {
    var sec = document.getElementById("cat-section-favs");
    if (sec) sec.classList.add("open");
  }
  renderFavSectionList();
  updateSidebarActive();
  applyFilters();
  tvRowIndex = 0;
  setTVZone("channel-list");

  // After the list is painted: a user-supplied guide is a large download
  // and must not hold up the first frame of channels.
  setTimeout(function () {
    return loadXMLTV(playlistEpgUrl);
  }, 500);
}

/* ── Native audio-radio playback ────────────────────────────────────────────
 * The regular IPTVPlayer drives a <video> decoder. An Internet radio
 * Icecast/Airtime endpoint returns continuous MP3/AAC bytes, not HLS video.
 * Use one native <audio> element, as recommended in LG's webOS audio guide.
 * Release the video decoder before radio, and close the radio connection
 * before returning to video playback.
 */
/** Stop radio playback before leaving its mode.
 * @returns {void} No return value.
 */
function stopRadio() {
  RadioDeck.stop();
}
/** Install the radio player and media-button listeners.
 * @returns {void} No return value.
 */
function setupRadioUI() {
  RadioDeck.init();
}
/** Stop video and tune the selected radio station.
 * @param {Object} ch - Channel entry with stream_id, name and source fields.
 * @returns {void} No return value.
 */
function startRadio(ch) {
  // The TV's video decoder is limited; close it before starting audio.
  player.stop();
  RadioDeck.play(ch);
}

/* ── Bunkhouse TV / Radio quick navigation ────────────────────────────────────
 * TV retains the existing category browser and channel grid. Radio puts the
 * dedicated 90s media interface in the main panel and a station list in the
 * sidebar. Direct buttons and D-pad both work; no custom webOS service.
 */
var _bkLastTVChannel = null;
var _bkLastTVCategory = "all";
var _bkStationIndex = 0;
var _bkRadioButtons = [];
/** Return the fixed Bunkhouse radio station entries.
 * @returns {Array<Object>} Matching channel or data entries.
 */
function bunkhouseRadioChannels() {
  return allChannels.filter(function (c) {
    return c && c._radio;
  });
}
/** Update the visible TV/Radio navigation and filtering.
 * @param {string} mode - Requested TV or radio mode.
 * @returns {void} No return value.
 */
function bunkhouseSetMode(mode) {
  var radio = mode === "radio";
  document.body.classList.toggle("radio-mode", radio);
  document.body.classList.toggle("guide-mode", !radio);
  var tv = document.getElementById("media-tv"),
    r = document.getElementById("media-radio");
  if (tv) tv.classList.toggle("active", !radio);
  if (r) r.classList.toggle("active", radio);
  if (radio) {
    if (activeCategory !== "radio") _bkLastTVCategory = activeCategory;
    activeCategory = "radio";
  } else {
    activeCategory = _bkLastTVCategory === "radio" ? "all" : _bkLastTVCategory;
  }
  updateSidebarActive();
  applyFilters(true);
  if (radio) bunkhouseHighlightStation();
}
/** Mark the sidebar station that matches the active channel.
 * @returns {void} No return value.
 */
function bunkhouseHighlightStation() {
  var sid = currentChannel && currentChannel._radio ? String(currentChannel.stream_id) : "";
  _bkRadioButtons.forEach(function (btn, index) {
    var selected = btn.getAttribute("data-station-id") === sid;
    btn.classList.toggle("selected", selected);
    if (selected) _bkStationIndex = index;
  });
}
/** Switch between TV and radio, restoring the previous TV channel.
 * @param {string} mode - Requested TV or radio mode.
 * @returns {void} No return value.
 */
function bunkhouseChangeMode(mode) {
  if (mode === "radio") {
    bunkhouseSetMode("radio");
    if (!currentChannel || !currentChannel._radio) {
      var first = bunkhouseRadioChannels()[0];
      if (first) selectChannel(first);
    }
    if (_bkRadioButtons[_bkStationIndex]) _bkRadioButtons[_bkStationIndex].focus();
  } else {
    bunkhouseSetMode("tv");
    if (currentChannel && currentChannel._radio) {
      stopRadio();
      currentChannel = null;
    }
    if (_bkLastTVChannel) selectChannel(_bkLastTVChannel);else {
      player.stop();
      var msg = document.getElementById("player-msg");
      if (msg) {
        msg.style.display = "flex";
        msg.textContent = "Select a TV channel";
      }
    }
    if (typeof setTVZone === "function") setTVZone("channel-list");
  }
}
/** Move to and play the previous or next radio preset.
 * @param {number} delta - Signed number of positions to move.
 * @returns {void} No return value.
 */
function bunkhouseStationStep(delta) {
  if (!_bkRadioButtons.length) return;
  _bkStationIndex = (_bkStationIndex + delta + _bkRadioButtons.length) % _bkRadioButtons.length;
  _bkRadioButtons[_bkStationIndex].focus();
  _bkRadioButtons[_bkStationIndex].click();
}
/** Handle remote keys while the radio view is active.
 * @param {KeyboardEvent} e - Remote or keyboard event.
 * @param {number} key - LG/webOS key code.
 * @returns {boolean} Whether the requested condition is met.
 */
function bunkhouseHandleKey(e, key) {
  if (!document.body.classList.contains("radio-mode") || isFullscreen()) return false;
  var focus = document.activeElement;
  if (key === 38 || key === 40) {
    e.preventDefault();
    bunkhouseStationStep(key === 38 ? -1 : 1);
    return true;
  }
  if (key === 37 || key === 39) {
    // Move across TV / RADIO / HAM tabs with the D-pad.
    var tabs = ["media-tv", "media-radio", "media-ham", "guide-vod", "guide-catchup"];
    var tabIndex = tabs.indexOf(focus && focus.id);
    e.preventDefault();
    if (key === 37) {
      document.getElementById(tabs[Math.max(0, tabIndex - 1)]).focus();
    } else if (tabIndex >= 0 && tabIndex < tabs.length - 1) {
      document.getElementById(tabs[tabIndex + 1]).focus();
    } else {
      document.getElementById("radio-toggle").focus();
    }
    return true;
  }
  if (key === 13) {
    // ENTER
    if (focus && /^(media-tv|media-radio|media-ham|guide-vod|guide-catchup|radio-toggle|radio-prev|radio-next)$/.test(focus.id)) {
      e.preventDefault();
      focus.click();
      return true;
    }
    if (_bkRadioButtons[_bkStationIndex]) {
      e.preventDefault();
      _bkRadioButtons[_bkStationIndex].click();
      return true;
    }
  }
  if (key === 461 || key === 27 || key === 8) {
    e.preventDefault();
    bunkhouseChangeMode("tv");
    return true;
  }
  return false;
}
/** Open the separate SDR screen after releasing existing audio/video players.
 * @returns {void} Navigates to the HAM RADIO page.
 */
function bunkhouseOpenHam() {
  stopRadio();
  WeatherChannel.close();
  player.stop();
  window.location.href = "../pages/hamradio.html";
}
/** Create station buttons and wire TV/Radio tabs.
 * @returns {void} No return value.
 */
function setupBunkhouseNavigation() {
  var tv = document.getElementById("media-tv"),
    radio = document.getElementById("media-radio");
  var ham = document.getElementById("media-ham");
  if (!tv || !radio) return;
  tv.addEventListener("click", function () {
    bunkhouseChangeMode("tv");
  });
  radio.addEventListener("click", function () {
    bunkhouseChangeMode("radio");
  });
  if (ham) ham.addEventListener("click", bunkhouseOpenHam);
  var vod = document.getElementById("guide-vod");
  var catchup = document.getElementById("guide-catchup");
  if (vod) vod.addEventListener("click", function () {
    stopRadio();
    WeatherChannel.close();
    player.stop();
    window.location.href = "../pages/vod.html";
  });
  if (catchup) catchup.addEventListener("click", function () {
    stopRadio();
    WeatherChannel.close();
    player.stop();
    window.location.href = "../pages/catchup.html";
  });
  var panel = document.getElementById("radio-stations");
  if (!panel) return;
  panel.innerHTML = "";
  _bkRadioButtons = [];
  bunkhouseRadioChannels().forEach(function (ch, index) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "bk-station";
    btn.setAttribute("data-station-id", String(ch.stream_id));
    var title = document.createElement("span");
    title.textContent = ch.name;
    btn.appendChild(title);
    btn.addEventListener("click", function () {
      _bkStationIndex = index;
      selectChannel(ch);
      btn.focus();
    });
    panel.appendChild(btn);
    _bkRadioButtons.push(btn);
  });
  RadioDeck.init();
}

// ── Channel selection ─────────────────────────────────────────────────────────

/** Choose the video, radio or WeatherStar player for a channel and update its EPG.
 * @param {Object} ch - Channel entry with stream_id, name and source fields.
 * @returns {Promise<void>} Resolves when the operation finishes.
 */
function selectChannel(_x3) {
  return _selectChannel.apply(this, arguments);
}
/** Refresh the on-screen display only in fullscreen.
 * @returns {void} No return value.
 */
function _selectChannel() {
  _selectChannel = _asyncToGenerator(/*#__PURE__*/_regenerator().m(function _callee4(ch) {
    var _listings;
    var _selSid, playUrl, listings, _findNowNext2, cur, next, _t6, _t7;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.p = _context4.n) {
        case 0:
          currentChannel = ch;
          _selSid = String(ch.stream_id);
          rowCache.forEach(function (entry, sid) {
            return entry.row.classList.toggle("selected", sid === _selSid);
          });
          document.getElementById("preview-channel-name").textContent = ch.name || "Unknown";
          document.getElementById("pip-channel-name").textContent = ch.name || "Unknown";
          if (!ch._radio) {
            _context4.n = 1;
            break;
          }
          WeatherChannel.close();
          bunkhouseSetMode("radio");
          bunkhouseHighlightStation();
          startRadio(ch);
          setEPG("now", "Live radio", "", "");
          setEPG("next", "—", "", "");
          document.getElementById("epg-bar-fill").style.width = "0%";
          showPreviewInfo();
          showOSD();
          return _context4.a(2);
        case 1:
          stopRadio();
          _bkLastTVChannel = ch;
          if (document.body.classList.contains("radio-mode")) bunkhouseSetMode("tv");
          if (!ch._weatherstar) {
            _context4.n = 2;
            break;
          }
          // Browser-driven forecast, not a video URL: never pass it to IPTVPlayer.
          // The third-party artwork, transitions, fonts and music live in their
          // own pristine packaged iframe, with Bunkhouse handling navigation.
          player.stop();
          WeatherChannel.open();
          setEPG("now", "WeatherStar 4000+ • live forecast", "", "");
          setEPG("next", "Updates from NOAA / NWS", "", "");
          document.getElementById("epg-bar-fill").style.width = "0%";
          showPreviewInfo();
          return _context4.a(2);
        case 2:
          WeatherChannel.close();
          playUrl = ch._source === "m3u" ? m3uBuildLiveURL(ch) : xtreamBuildLiveURL(cfg, ch.stream_id); // The key lets the player remember which engine actually worked for THIS
          // channel, so a 4K/HEVC channel that only plays on HLS starts there.
          player.play(playUrl, {
            key: "ch:" + ch.stream_id
          });
          setEPG("now", "Loading…", "", "");
          setEPG("next", "—", "", "");
          document.getElementById("epg-bar-fill").style.width = "0%";
          showPreviewInfo();
          showOSD(); // immediate banner on channel switch — EPG data populated below
          listings = epgCache[ch.stream_id];
          if (!(!listings && !epgBlocked)) {
            _context4.n = 10;
            break;
          }
          epgCache[ch.stream_id] = null;
          _context4.p = 3;
          if (!(ch._source === "m3u")) {
            _context4.n = 5;
            break;
          }
          _context4.n = 4;
          return m3uGetEPG(ch.stream_id);
        case 4:
          _t6 = _context4.v;
          _context4.n = 7;
          break;
        case 5:
          _context4.n = 6;
          return xtreamGetEPG(cfg, ch.stream_id);
        case 6:
          _t6 = _context4.v;
        case 7:
          listings = _t6;
          _context4.n = 9;
          break;
        case 8:
          _context4.p = 8;
          _t7 = _context4.v;
          if (Net.isHttpError(_t7, 403) || Net.isHttpError(_t7, 401)) epgBlocked = true;
          listings = [];
        case 9:
          epgCache[ch.stream_id] = listings;
          patchEpgStrip(ch.stream_id);
          scheduleEpgSave();
        case 10:
          if (!(currentChannel !== ch)) {
            _context4.n = 11;
            break;
          }
          return _context4.a(2);
        case 11:
          if ((_listings = listings) !== null && _listings !== void 0 && _listings.length) {
            _context4.n = 12;
            break;
          }
          setEPG("now", "No EPG data", "", "");
          showOSD();
          return _context4.a(2);
        case 12:
          _findNowNext2 = _findNowNext(listings), cur = _findNowNext2.cur, next = _findNowNext2.next;
          setEPG("now", epgTitle(cur), formatTimeRange(cur), epgDesc(cur));
          document.getElementById("epg-bar-fill").style.width = calcProgress(cur) + "%";
          if (next) setEPG("next", epgTitle(next), formatTimeRange(next), "");
          showOSD();
        case 13:
          return _context4.a(2);
      }
    }, _callee4, null, [[3, 8]]);
  }));
  return _selectChannel.apply(this, arguments);
}
function updateOSDIfFullscreen() {
  if (isFullscreen()) showOSD();
}

/** Write the title, time and description for one EPG slot.
 * @param {string} slot - EPG display slot (now or next).
 * @param {string} title - Reported track title.
 * @param {string} time - Formatted program time.
 * @param {string} desc - Program description.
 * @returns {void} No return value.
 */
function setEPG(slot, title, time, desc) {
  document.getElementById("epg-".concat(slot, "-title")).textContent = title || "—";
  document.getElementById("epg-".concat(slot, "-time")).textContent = time || "";
  var el = document.getElementById("epg-".concat(slot, "-desc"));
  if (el) el.textContent = desc || "";
}

/** Reveal the selected channel's summary.
 * @returns {void} No return value.
 */
function showPreviewInfo() {
  var _document$getElementB;
  (_document$getElementB = document.getElementById("preview-info")) === null || _document$getElementB === void 0 || _document$getElementB.classList.add("preview-visible");
}

/** Move through the filtered TV channel list.
 * @param {number} delta - Signed number of positions to move.
 * @returns {void} No return value.
 */
function channelStep(delta) {
  if (!_vsChannels.length) return;
  var idx = currentChannel ? _vsChannels.findIndex(function (ch) {
    return String(ch.stream_id) === String(currentChannel.stream_id);
  }) : -1;
  if (idx < 0) idx = delta > 0 ? -1 : _vsChannels.length;
  idx = Math.max(0, Math.min(_vsChannels.length - 1, idx + delta));
  tvRowIndex = idx;
  var ch = _vsChannels[idx];
  if (ch) {
    selectChannel(ch);
    tvFocusRow(idx);
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

// Run immediately: this script is loaded with `defer`, so the DOM is already
// parsed here. Waiting for window.onload (all CSS/images fetched) only delayed
// the first paint of the channel list on slow TVs.
(function boot() {
  // Publish the active Xtream profile as IPTV_CONFIG, which is what
  // data/xtream.js reads. M3U profiles take their own path via
  // m3uLoadConfig(), which reads the active profile too.
  try {
    var active = Config.resolve();
    if (active && active.type !== "m3u" && active.server_url) window.IPTV_CONFIG = active;
  } catch (_) {}

  // XMLTV loads from _bootUI once the channel list exists — matching a
  // guide against no channels does nothing.
  measureRowHeight();
  initVirtualScroll();
  initTVNavigation();
  if (typeof tvSetBackUrl === "function") tvSetBackUrl("../index.html");
  // Fixed local channels: there is no account or remote configuration service.
  // The live streams below are the publicly listed Toonami Aftermath HLS feeds.
  var toonamiChannels = [{
    stream_id: "toonami-aftermath-east",
    name: "Toonami Aftermath East",
    category_id: "toonami",
    stream_icon: "",
    stream_url: "http://api.toonamiaftermath.com:3000/est/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "toonami-aftermath-west",
    name: "Toonami Aftermath West",
    category_id: "toonami",
    stream_icon: "",
    stream_url: "http://api.toonamiaftermath.com:3000/pst/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "toonami-aftermath-movies",
    name: "Toonami Aftermath Movies",
    category_id: "toonami",
    stream_icon: "",
    stream_url: "http://api.toonamiaftermath.com:3000/movies/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "toonami-aftermath-radio",
    name: "Toonami Aftermath Radio",
    category_id: "toonami",
    stream_icon: "",
    stream_url: "http://api.toonamiaftermath.com:3000/radio/playlist.m3u8",
    _source: "m3u"
  }];
  // Supplemental streams tested on 2026-11-07 from a US GitHub runner:
  // each URL returned an HLS playlist AND a reachable media segment.
  // This does not prove that playback will work on every LG TV or network.
  // These are free-to-view FAST streams, not subscription-TV relays.
  var verifiedJapanExtras = [{
    stream_id: "japan-extra-01",
    name: "日テレNEWS",
    category_id: "japan-news",
    stream_icon: "",
    stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-news1hlscmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-02",
    name: "FNNプライムオンライン",
    category_id: "japan-news",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-news4-cmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-03",
    name: "MBSニュース",
    category_id: "japan-news",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-news5-cmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-04",
    name: "日テレNEWSセレクト",
    category_id: "japan-news",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-ntv-newsselect-cmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-05",
    name: "共同通信News",
    category_id: "japan-news",
    stream_icon: "",
    stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-news3hlscmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-06",
    name: "オリコンニュース",
    category_id: "japan-news",
    stream_icon: "",
    stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-news2cmafhls-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-07",
    name: "ムビドラTV",
    category_id: "japan-entertainment",
    stream_icon: "",
    stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-moviecmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-08",
    name: "手塚プロダクションTV",
    category_id: "japan-anime",
    stream_icon: "",
    stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-anime5-cmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-09",
    name: "キッズ",
    category_id: "japan-anime",
    stream_icon: "",
    stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-kids-english-cmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-10",
    name: "NTV Pro Wrestling",
    category_id: "japan-entertainment",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-ntv-pro-wrestling-hls-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-11",
    name: "that’s 70s",
    category_id: "japan-music",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01076-lightningintern-lightningnow70s-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-12",
    name: "that’s 80s",
    category_id: "japan-music",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01076-lightningintern-lightningnow80s-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-13",
    name: "that’s 90s00s",
    category_id: "japan-music",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01076-lightningintern-lightning-now90s00s-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-14",
    name: "that’s Rock",
    category_id: "japan-music",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01076-lightningintern-lightningnowrock-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-15",
    name: "囲碁・将棋ライト",
    category_id: "japan-lifestyle",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-igo-shogi-cmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-16",
    name: "麻雀",
    category_id: "japan-lifestyle",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-mahjong-cmaf1-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-17",
    name: "パチンコ・パチスロ",
    category_id: "japan-lifestyle",
    stream_icon: "",
    stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-pachislocmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-18",
    name: "ぷれいば！",
    category_id: "japan-lifestyle",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-game-cmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-19",
    name: "ワンニャンチャンネル",
    category_id: "japan-lifestyle",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-pet-cmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "japan-extra-20",
    name: "九州・沖縄 街ネタ",
    category_id: "japan-lifestyle",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-local-contents-cmaf-rakutenjp/playlist.m3u8",
    _source: "m3u"
  }];

  // Curated entries from iptv-org/iptv streams/us.m3u (checked 2026-11-10).
  // Streams may expire or be region-restricted; playback is not verified on webOS.
  // HGTV is an unofficial third-party relay: isolated under Test Streams.
  // No dedicated Antiques Roadshow stream was listed in the U.S. playlist.
  var cableChannels = [{
    stream_id: "us-cable-01",
    name: "Create (PBS)",
    category_id: "home-food",
    stream_icon: "",
    stream_url: "https://create.lls.pbs.org/index.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-02",
    name: "Cooking Panda",
    category_id: "home-food",
    stream_icon: "",
    stream_url: "https://stream-us-east-1.getpublica.com/playlist.m3u8?network_id=46",
    _source: "m3u"
  }, {
    stream_id: "us-cable-03",
    name: "Bloomberg TV US",
    category_id: "news-business",
    stream_icon: "",
    stream_url: "https://bloomberg.com/media-manifest/streams/us.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-04",
    name: "Bloomberg TV+",
    category_id: "news-business",
    stream_icon: "",
    stream_url: "https://bloomberg.com/media-manifest/streams/phoenix-us.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-05",
    name: "Bloomberg Originals",
    category_id: "news-business",
    stream_icon: "",
    stream_url: "https://bloomberg.com/media-manifest/streams/qt.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-06",
    name: "NBC News NOW",
    category_id: "news-business",
    stream_icon: "",
    stream_url: "https://d1bl6tskrpq9ze.cloudfront.net/hls/master.m3u8?ads.xumo_channelId=99984003",
    _source: "m3u"
  }, {
    stream_id: "us-cable-07",
    name: "Cheddar News",
    category_id: "news-business",
    stream_icon: "",
    stream_url: "https://hls.livecdn.io/cheddar.com/cheddar/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-08",
    name: "Fox Weather",
    category_id: "news-business",
    stream_icon: "",
    stream_url: "https://247wlive.foxweather.com/stream/index.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-09",
    name: "CBS News Los Angeles",
    category_id: "news-business",
    stream_icon: "",
    stream_url: "https://dai.google.com/linear/hls/pa/event/K_2aA7OVRTacJJli1oSi8w/stream/42e4ec14-fe53-469b-bc85-677ed0b245f4:ATL/variant/344ab3b460bc514714f94805d600b130/bandwidth/2121247.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-10",
    name: "Documentary+",
    category_id: "entertainment",
    stream_icon: "",
    stream_url: "https://ef79b15c8c7c46c7a9de9d33001dbd07.mediatailor.us-west-2.amazonaws.com/v1/master/ba62fe743df0fe93366eba3a257d792884136c7f/LINEAR-859-DOCUMENTARYPLUS-DOCUMENTARYPLUS/mt/documentaryplus/859/hls/master/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-11",
    name: "FilmRise Classic TV",
    category_id: "entertainment",
    stream_icon: "",
    stream_url: "https://d2tv4k5moji5m7.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-lu4pzh9l4b57p/master.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-12",
    name: "Comet",
    category_id: "entertainment",
    stream_icon: "",
    stream_url: "https://fast-channels.sinclairstoryline.com/COMET/index.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-13",
    name: "Charge!",
    category_id: "entertainment",
    stream_icon: "",
    stream_url: "https://fast-channels.sinclairstoryline.com/CHARGE/index.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-14",
    name: "Court TV",
    category_id: "entertainment",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01438-ewscrippscompan-courttv-tablo/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-15",
    name: "Bounce XL",
    category_id: "entertainment",
    stream_icon: "",
    stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01438-ewscrippscompan-bouncexl-tablo/playlist.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-16",
    name: "CBS Sports Golazo Network",
    category_id: "sports",
    stream_icon: "",
    stream_url: "https://dai.google.com/linear/hls/event/7f3Wv6f7QEKfQna22jHqLQ/master.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-17",
    name: "Fubo Sports Network",
    category_id: "sports",
    stream_icon: "",
    stream_url: "https://aegis-cloudfront-1.tubi.video/c2ac89da-5c69-439e-b85d-d87de0548b54/5.m3u8",
    _source: "m3u"
  }, {
    stream_id: "us-cable-18",
    name: "HGTV (unofficial test)",
    category_id: "test-streams",
    stream_icon: "",
    stream_url: "http://tvsen7.aynascope.net/hgtv/index.m3u8",
    _source: "m3u"
  }];
  var japanPlaylistUrl = "https://iptv-org.github.io/iptv/countries/jp.m3u";
  // Direct public audio endpoints (MP3). All three returned audio bytes in
  // a US network check on 2026-11-07. Shonan's URL comes from its official site.
  var radioChannels = [{
    stream_id: "radio-wtmd",
    name: "WTMD 89.7 FM",
    category_id: "radio",
    stream_icon: "",
    stream_url: "https://wtmd-ice.streamguys1.com/wtmd.mp3",
    _radio: true,
    _source: "m3u"
  }, {
    stream_id: "radio-wtmd-hd2",
    name: "WTMD HD2 — The Baltimore Channel",
    category_id: "radio",
    stream_icon: "",
    stream_url: "https://wtmd-ice.streamguys1.com/hd2.mp3",
    _radio: true,
    _source: "m3u"
  }, {
    stream_id: "radio-shonan",
    name: "Shonan Beach FM 78.9",
    category_id: "radio",
    stream_icon: "",
    stream_url: "https://shonanbeachfm.out.airtime.pro/shonanbeachfm_c",
    _radio: true,
    _source: "m3u"
  }, {
    stream_id: "radio-b97-nola",
    name: "B97 97.1 FM — New Orleans",
    category_id: "radio",
    stream_icon: "",
    stream_url: "https://live.amperwave.net/direct/audacy-wezbfmmp3-imc",
    _radio: true,
    _source: "m3u"
  }, {
    stream_id: "radio-alt923-nola",
    name: "ALT 92.3 — New Orleans Alternative Rock",
    category_id: "radio",
    stream_icon: "",
    stream_url: "https://playerservices.streamtheworld.com/api/livestream-redirect/WZRHFM.mp3",
    _radio: true,
    _source: "m3u"
  }, {
    stream_id: "radio-magic1019-nola",
    name: "Magic 101.9 — New Orleans",
    category_id: "radio",
    stream_icon: "",
    stream_url: "https://live.amperwave.net/direct/audacy-wlmgfmmp3-imc",
    _radio: true,
    _source: "m3u"
  }, {
    stream_id: "radio-wfmf1025-br",
    name: "102.5 WFMF — Baton Rouge",
    category_id: "radio",
    stream_icon: "",
    stream_url: "https://stream.revma.ihrhls.com/zc1005",
    _radio: true,
    _source: "m3u"
  }, {
    stream_id: "radio-wnoe1011-nola",
    name: "101.1 WNOE Country — New Orleans",
    category_id: "radio",
    stream_icon: "",
    stream_url: "https://stream.revma.ihrhls.com/zc1045",
    _radio: true,
    _source: "m3u"
  }];

  // This is a self-contained web app, not an M3U8 feed. It renders the
  // ORIGINAL pinned WeatherStar 4000+ 8.2.2 code and bundled music.
  var weatherChannels = [{
    stream_id: "local-weatherstar-4000",
    name: "WeatherStar 4000+ — Local Forecast",
    category_id: "retro-weather",
    stream_icon: "",
    stream_url: "../weatherstar/index.html",
    _weatherstar: true,
    _source: "local"
  }];
  var categories = [{
    category_id: "toonami",
    category_name: "Toonami Aftermath"
  }, {
    category_id: "home-food",
    category_name: "Home & Food"
  }, {
    category_id: "news-business",
    category_name: "News & Business"
  }, {
    category_id: "entertainment",
    category_name: "Documentaries & Entertainment"
  }, {
    category_id: "sports",
    category_name: "Sports"
  }, {
    category_id: "test-streams",
    category_name: "Test Streams (Unofficial)"
  }, {
    category_id: "retro-weather",
    category_name: "Retro Weather"
  }, {
    category_id: "radio",
    category_name: "Radio Stations"
  }, {
    category_id: "japan",
    category_name: "Japan TV (IPTV-org)"
  }, {
    category_id: "japan-news",
    category_name: "Japan — News"
  }, {
    category_id: "japan-anime",
    category_name: "Japan — Anime & Kids"
  }, {
    category_id: "japan-entertainment",
    category_name: "Japan — Entertainment"
  }, {
    category_id: "japan-music",
    category_name: "Japan — Music"
  }, {
    category_id: "japan-lifestyle",
    category_name: "Japan — Lifestyle"
  }];
  var status = document.getElementById("status");

  // Only accept direct HTTP(S) stream URLs from the external M3U list.
  // Source URL, names and logos are data, not scripts or executable code.
  /** Merge Japan IPTV-org results with the fixed channels.
   * @param {Array<Object>} list - Channel entries.
   * @param {boolean} cached - Whether data came from cache.
   * @returns {void} No return value.
   */
  function showJapaneseChannels(list, cached) {
    var japanese = [];
    for (var i = 0; i < list.length; i++) {
      var ch = list[i];
      var url = String(ch.stream_url || "").trim();
      if (!/^https?:\/\/[^\s]+$/i.test(url)) continue;
      japanese.push({
        stream_id: "japan-" + i,
        name: String(ch.name || "Japan TV"),
        category_id: "japan",
        stream_icon: String(ch.stream_icon || ""),
        epg_channel_id: String(ch.epg_channel_id || ""),
        stream_url: url,
        _source: "m3u"
      });
    }
    if (!japanese.length) return false;
    // Keep all previous Toonami and Japan TV channels, and avoid URL duplicates.
    var seenUrls = {};
    for (var v = 0; v < verifiedJapanExtras.length; v++) {
      seenUrls[verifiedJapanExtras[v].stream_url] = true;
    }
    japanese = japanese.filter(function (ch) {
      return !seenUrls[ch.stream_url];
    });
    allChannels = toonamiChannels.concat(cableChannels, weatherChannels, verifiedJapanExtras, radioChannels, japanese);
    updateSidebarActive();
    applyFilters(true);
    status.textContent = allChannels.length + " channels (4 Toonami + 1 WeatherStar + " + verifiedJapanExtras.length + " verified extras + " + cableChannels.length + " cable-style + 8 radio + " + japanese.length + " Japan directory" + (cached ? ", cached" : "") + ")";
    return true;
  }
  epgCache = loadEpgDiskCache();
  allChannels = toonamiChannels.concat(cableChannels, weatherChannels, verifiedJapanExtras, radioChannels);
  status.textContent = allChannels.length + " channels - loading Japan TV directory...";
  _bootUI(categories, "");
  setupBunkhouseNavigation();
  WeatherChannel.setup();

  // Load any previously downloaded Japanese directory immediately, then
  // refresh it from the public iptv-org playlist (without sending credentials).
  var cachedJapan = m3uLoadCache(japanPlaylistUrl);
  var hasJapan = cachedJapan && showJapaneseChannels(cachedJapan.channels, true);
  m3uFetchPlaylist(japanPlaylistUrl).then(function (parsed) {
    if (!parsed.channels.length) throw new Error("empty playlist");
    m3uSaveCache(japanPlaylistUrl, parsed);
    if (!showJapaneseChannels(parsed.channels, false)) {
      throw new Error("no compatible streams");
    }
  }).catch(function (err) {
    // Keep all working channels visible when a directory or network is offline.
    status.textContent = hasJapan ? "Japan TV: using cached channels (refresh failed)" : allChannels.length + " channels - Japan directory unavailable (" + (err.message || "network error") + ")";
  });
})();