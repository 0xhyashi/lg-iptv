"use strict";

/* home.js — start page tile navigation with the LG remote.
 * Chooses Live TV, VOD, Catch-up or Settings without loading media.
 */
// ── Homepage navigation ───────────────────────────────────────────────────────
//
// Tile order for D-pad: [livetv, vod, catchup, settings]
// Layout:  [livetv]  [vod]  [catchup ]
//                           [settings]
//
// LEFT/RIGHT moves between the three columns.
// UP/DOWN moves within the small-tile column (catchup ↔ settings).

var TILES = ["tile-livetv", "tile-vod", "tile-catchup", "tile-settings"];
var PAGES = {
  "tile-livetv": "pages/livetv.html",
  "tile-vod": "pages/vod.html",
  "tile-catchup": "pages/catchup.html",
  "tile-settings": "pages/settings.html"
};

// Column map — which tile is in which column
// Col 0: livetv, Col 1: vod, Col 2: catchup/settings
var COL = {
  "tile-livetv": 0,
  "tile-vod": 1,
  "tile-catchup": 2,
  "tile-settings": 2
};
var COL_FIRST = {
  0: "tile-livetv",
  1: "tile-vod",
  2: "tile-catchup"
};
var _focusedTile = "tile-livetv";

/** Set Focus for home navigation.
 * @param {string} id - Identifier.
 * @returns {*} Function result.
 */
function _setFocus(id) {
  var _document$getElementB2;
  TILES.forEach(function (t) {
    var _document$getElementB;
    return (_document$getElementB = document.getElementById(t)) === null || _document$getElementB === void 0 ? void 0 : _document$getElementB.classList.remove("tv-focus-visible");
  });
  _focusedTile = id;
  (_document$getElementB2 = document.getElementById(id)) === null || _document$getElementB2 === void 0 || _document$getElementB2.classList.add("tv-focus-visible");
}

/** Navigate for home navigation.
 * @param {string} id - Identifier.
 * @returns {*} Function result.
 */
function _navigate(id) {
  window.location.href = PAGES[id];
}

/** Handle Key for home navigation.
 * @param {Event} e - Browser event.
 * @returns {*} Function result.
 */
function _handleKey(e) {
  var kc = Dom.keyCode(e);
  if (kc === 461) {
    // Back (webOS) — homepage is the root, so exit the app
    e.preventDefault();
    Dom.exitApp();
    return;
  }
  if (kc === 13) {
    // ENTER
    e.preventDefault();
    _navigate(_focusedTile);
    return;
  }
  var col = COL[_focusedTile];
  if (kc === 37) {
    // LEFT
    e.preventDefault();
    if (col > 0) _setFocus(COL_FIRST[col - 1]);
    return;
  }
  if (kc === 39) {
    // RIGHT
    e.preventDefault();
    if (col < 2) _setFocus(COL_FIRST[col + 1]);
    return;
  }
  if (kc === 38) {
    // UP
    e.preventDefault();
    if (_focusedTile === "tile-settings") _setFocus("tile-catchup");
    return;
  }
  if (kc === 40) {
    // DOWN
    e.preventDefault();
    if (_focusedTile === "tile-catchup") _setFocus("tile-settings");
    return;
  }
}

/** Update Date for home navigation.
 * @returns {*} Function result.
 */
function _updateDate() {
  var el = document.getElementById("home-date");
  if (!el) return;
  el.textContent = new Date().toLocaleDateString([], {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

// Run immediately: this script sits at the end of <body>, so the tiles above
// are already parsed. Waiting for window "load" only delayed the splash-screen
// dismissal and D-pad readiness.
(function () {
  // Wire up click handlers
  TILES.forEach(function (id) {
    var _document$getElementB3;
    (_document$getElementB3 = document.getElementById(id)) === null || _document$getElementB3 === void 0 || _document$getElementB3.addEventListener("click", function () {
      return _navigate(id);
    });
  });

  // D-pad
  window.addEventListener("keydown", _handleKey, {
    capture: true
  });

  // Initial focus
  _setFocus("tile-livetv");

  // Date display
  _updateDate();

  // Notify webOS the app finished loading (hides the splash screen)
  if (typeof webOSSystem !== "undefined" && typeof webOSSystem.notifyAppLoaded === "function") {
    webOSSystem.notifyAppLoaded();
  }
})();