"use strict";

/* core/dom.js — small DOM helpers shared by every page. Exposes window.Dom.
 *
 * Deliberately tiny. This is not a framework: it exists because escHtml was
 * copy-pasted into four files with three different escape sets, and because
 * building an element with createElement + six property assignments is the
 * single most repeated shape in this codebase.
 *
 * The focus-ring helpers matter more than they look. Every screen drives its
 * own D-pad model, but they all agree on one thing: exactly one element in the
 * document carries `.tv-focus-visible`. Centralising the clear/set pair is what
 * keeps two screens from both believing they own the ring.
 *
 * ES5 — Babel target is Chrome 38.                                            */
window.Dom = function () {
  'use strict';

  /** $ for shared DOM helpers and LG remote keys.
   * @param {*} sel - Input to $().
   * @param {*} root - Input to $().
   * @returns {*} Result of the operation.
   */
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  /** $$ for shared DOM helpers and LG remote keys.
   * @param {*} sel - Input to $$().
   * @param {*} root - Input to $$().
   * @returns {*} Result of the operation.
   */
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  /** By Id for shared DOM helpers and LG remote keys.
   * @param {string} id - Identifier.
   * @returns {*} Result of the operation.
   */
  function byId(id) {
    return document.getElementById(id);
  }

  /* Escapes the four characters that matter inside an HTML text node or a
     double-quoted attribute. Single quotes are not escaped, so never
     interpolate into a single-quoted attribute. */
  /** Esc Html for shared DOM helpers and LG remote keys.
   * @param {*} s - Input to escHtml().
   * @returns {*} Result of the operation.
   */
  function escHtml(s) {
    return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* el('div.foo.bar', { id: 'x' }, [child, 'text'])
     The tag string accepts CSS-ish class shorthand because nearly every
     element here is "a div with two classes and some text". */
  /** El for shared DOM helpers and LG remote keys.
   * @param {*} spec - Input to el().
   * @param {*} props - Input to el().
   * @param {*} children - Input to el().
   * @returns {*} Result of the operation.
   */
  function el(spec, props, children) {
    var parts = String(spec || 'div').split('.');
    var node = document.createElement(parts[0] || 'div');
    if (parts.length > 1) node.className = parts.slice(1).join(' ');
    if (props) {
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        var v = props[k];
        if (v === null || v === undefined) continue;
        if (k === 'text') node.textContent = v;else if (k === 'html') node.innerHTML = v;else if (k === 'cls') node.className += (node.className ? ' ' : '') + v;else if (k === 'style') node.style.cssText = v;else if (k === 'data') {
          for (var d in v) if (Object.prototype.hasOwnProperty.call(v, d)) node.setAttribute('data-' + d, v[d]);
        } else if (k === 'on') {
          for (var ev in v) if (Object.prototype.hasOwnProperty.call(v, ev)) node.addEventListener(ev, v[ev]);
        } else if (k in node) node[k] = v;else node.setAttribute(k, v);
      }
    }
    if (children) {
      if (!isArray(children)) children = [children];
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c === null || c === undefined || c === false) continue;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      }
    }
    return node;
  }

  /** Is Array for shared DOM helpers and LG remote keys.
   * @param {*} v - Input to isArray().
   * @returns {boolean} Whether the condition is met.
   */
  function isArray(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
  }

  /** Clear for shared DOM helpers and LG remote keys.
   * @param {*} node - Input to clear().
   * @returns {void} Updates the relevant state or UI.
   */
  function clear(node) {
    if (node) node.innerHTML = '';
  }

  /** Show for shared DOM helpers and LG remote keys.
   * @param {*} node - Input to show().
   * @param {*} on - Input to show().
   * @returns {void} Updates the relevant state or UI.
   */
  function show(node, on) {
    if (node) node.style.display = on ? '' : 'none';
  }

  /* ── Focus ring ───────────────────────────────────────────────────────── */
  var RING = 'tv-focus-visible';

  /** Clear Rings for shared DOM helpers and LG remote keys.
   * @param {*} root - Input to clearRings().
   * @returns {void} Updates the relevant state or UI.
   */
  function clearRings(root) {
    var rings = $$('.' + RING, root);
    for (var i = 0; i < rings.length; i++) rings[i].classList.remove(RING);
  }

  /* Moves the single focus ring. `scroll` defaults to true — a ring the user
     cannot see is worse than no ring, and every caller wanted it. */
  /** Focus Ring for shared DOM helpers and LG remote keys.
   * @param {*} node - Input to focusRing().
   * @param {*} scroll - Input to focusRing().
   * @returns {void} Updates the relevant state or UI.
   */
  function focusRing(node, scroll) {
    clearRings();
    if (!node) return null;
    node.classList.add(RING);
    if (scroll !== false && node.scrollIntoView) {
      try {
        node.scrollIntoView({
          block: 'nearest',
          inline: 'nearest'
        });
      } catch (e) {
        node.scrollIntoView(false);
      } // old Blink: boolean form only
    }
    return node;
  }

  /** Has Ring for shared DOM helpers and LG remote keys.
   * @param {*} node - Input to hasRing().
   * @returns {boolean} Whether the condition is met.
   */
  function hasRing(node) {
    return !!(node && node.classList.contains(RING));
  }

  /* Only elements the user can actually reach: rendered, not disabled.
     offsetParent is null for display:none subtrees (and for position:fixed
     elements, which is why fixed overlays list their own focusables). */
  /** Visible for shared DOM helpers and LG remote keys.
   * @param {*} node - Input to visible().
   * @returns {*} Result of the operation.
   */
  function visible(node) {
    return !!(node && !node.disabled && node.offsetParent !== null);
  }

  /** Focusables for shared DOM helpers and LG remote keys.
   * @param {*} root - Input to focusables().
   * @param {*} selector - Input to focusables().
   * @returns {void} Updates the relevant state or UI.
   */
  function focusables(root, selector) {
    return $$(selector || 'input, select, button, [tabindex]', root).filter(visible);
  }

  /* ── Keys ─────────────────────────────────────────────────────────────────
     webOS remote key codes. BACK (461) is the one that differs from a desktop
     keyboard, so ESC is accepted alongside it everywhere for browser testing. */
  var KEY = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    ENTER: 13,
    BACK: 461,
    ESC: 27,
    RED: 403,
    GREEN: 404,
    YELLOW: 405,
    BLUE: 406,
    PLAY: 415,
    PAUSE: 19,
    PLAYPAUSE: 463,
    STOP: 413,
    FF: 417,
    RW: 412,
    /* Channel rocker. Two different code pairs reach the page depending on
       the set: webOS commonly delivers CH+/CH− as Page Up / Page Down,
       while 427/428 are the CEA-2014 / HbbTV VK_CHANNEL_UP / _DOWN codes
       some builds send instead. Both are accepted everywhere — listening
       for only 427/428 is why the rocker did nothing on real hardware. */
    CH_UP: 427,
    CH_DOWN: 428,
    CH_UP_ALT: 33,
    CH_DOWN_ALT: 34
  };

  /* Some environments — emulators, the webOS simulator, and remotes routed
     through newer input stacks — dispatch keydown with a named `key` and
     leave `keyCode` at 0. Normalising here means every screen keeps working
     in plain key codes and none of them has to know this happened. */
  var KEY_BY_NAME = {
    ArrowLeft: KEY.LEFT,
    ArrowUp: KEY.UP,
    ArrowRight: KEY.RIGHT,
    ArrowDown: KEY.DOWN,
    Left: KEY.LEFT,
    Up: KEY.UP,
    Right: KEY.RIGHT,
    Down: KEY.DOWN,
    // legacy names
    Enter: KEY.ENTER,
    Escape: KEY.ESC,
    Esc: KEY.ESC,
    GoBack: KEY.BACK,
    BrowserBack: KEY.BACK,
    PageUp: KEY.CH_UP_ALT,
    PageDown: KEY.CH_DOWN_ALT,
    ChannelUp: KEY.CH_UP,
    ChannelDown: KEY.CH_DOWN,
    ColorF0Red: KEY.RED,
    ColorF1Green: KEY.GREEN,
    ColorF2Yellow: KEY.YELLOW,
    ColorF3Blue: KEY.BLUE,
    MediaPlay: KEY.PLAY,
    MediaPause: KEY.PAUSE,
    MediaPlayPause: KEY.PLAYPAUSE,
    MediaStop: KEY.STOP,
    MediaTrackNext: KEY.FF,
    MediaTrackPrevious: KEY.RW,
    MediaFastForward: KEY.FF,
    MediaRewind: KEY.RW
  };

  /** Key Code for shared DOM helpers and LG remote keys.
   * @param {Event} e - Browser event.
   * @returns {*} Result of the operation.
   */
  function keyCode(e) {
    var kc = e.keyCode || e.which;
    if (kc) return kc;
    var name = e.key;
    if (!name) return 0;
    if (KEY_BY_NAME[name]) return KEY_BY_NAME[name];
    // Digits arrive as "0".."9" when only `key` is set.
    if (name.length === 1 && name >= '0' && name <= '9') return 48 + +name;
    return 0;
  }
  /** Is Back for shared DOM helpers and LG remote keys.
   * @param {Event} e - Browser event.
   * @returns {boolean} Whether the condition is met.
   */
  function isBack(e) {
    var k = keyCode(e);
    return k === KEY.BACK || k === KEY.ESC;
  }
  /** Is Nav for shared DOM helpers and LG remote keys.
   * @param {Event} e - Browser event.
   * @returns {boolean} Whether the condition is met.
   */
  function isNav(e) {
    var k = keyCode(e);
    return k === KEY.LEFT || k === KEY.RIGHT || k === KEY.UP || k === KEY.DOWN || k === KEY.ENTER;
  }

  /* Leave the app (BACK on the home screen). With disableBackHistoryAPI set
     in appinfo.json the platform no longer handles BACK itself, so the app
     has to ask. `webOS.platformBack()` is what LG documents, but `webOS` only
     exists when their webOSTV.js library is loaded — and this app doesn't
     load it — so that call alone threw and BACK did nothing. PalmSystem is
     the platform object webOSTV.js itself wraps, present on every version. */
  /** Exit App for shared DOM helpers and LG remote keys.
   * @returns {*} Result of the operation.
   */
  function exitApp() {
    try {
      if (typeof webOS !== 'undefined' && webOS.platformBack) {
        webOS.platformBack();
        return;
      }
    } catch (e) {}
    try {
      if (typeof PalmSystem !== 'undefined' && PalmSystem.platformBack) {
        PalmSystem.platformBack();
        return;
      }
    } catch (e) {}
    try {
      window.close();
    } catch (e) {}
  }

  /* True when an on-screen keyboard is open over a text field, which means
     the D-pad belongs to the field and not to the page. */
  /** Typing for shared DOM helpers and LG remote keys.
   * @returns {*} Result of the operation.
   */
  function typing() {
    var a = document.activeElement;
    if (!a) return false;
    var t = a.tagName;
    return t === 'INPUT' || t === 'TEXTAREA';
  }
  return {
    $: $,
    $$: $$,
    byId: byId,
    el: el,
    escHtml: escHtml,
    clear: clear,
    show: show,
    RING: RING,
    clearRings: clearRings,
    focusRing: focusRing,
    hasRing: hasRing,
    visible: visible,
    focusables: focusables,
    KEY: KEY,
    keyCode: keyCode,
    isBack: isBack,
    isNav: isNav,
    typing: typing,
    exitApp: exitApp
  };
}();