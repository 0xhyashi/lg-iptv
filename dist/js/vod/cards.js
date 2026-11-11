/* vod/cards.js — the poster card, and the "see all" tile that ends a truncated
 * rail.
 *
 * Images load lazily through an IntersectionObserver and are UNobserved once
 * loaded; a rail that scrolls out of view has its cards destroyed entirely
 * (see rails.js), so a library of 20 000 posters never becomes 20 000 decoded
 * images in memory.
 */
'use strict';

/* ── Lazy image loader ───────────────────────────────────────────── */
var imgObserver = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
  entries.forEach(function (en) {
    if (en.isIntersecting) {
      var img = en.target;
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
      imgObserver.unobserve(img);
    }
  });
}, {
  rootMargin: '300px'
}) : null;

/** Lazy Img for VOD poster cards.
 * @param {*} img - Input to lazyImg().
 * @param {*} src - Input to lazyImg().
 * @returns {*} Result of the operation.
 */
function lazyImg(img, src) {
  if (!src) return;
  if (imgObserver) {
    img.dataset.src = src;
    imgObserver.observe(img);
  } else {
    img.src = src;
  }
}

/* ── Card factory ────────────────────────────────────────────────── */
/* backdrop_path is an ARRAY of URLs on most panels' series entries; used as
   an image source directly it became "url1,url2" and never loaded. */
/** Poster Of for VOD poster cards.
 * @param {*} m - Input to posterOf().
 * @returns {*} Result of the operation.
 */
function posterOf(m) {
  var p = m.stream_icon || m.cover || m.cover_big || m.icon || m.backdrop_path || '';
  if (Array.isArray(p)) p = p[0] || '';
  return String(p);
}
/** Title Of for VOD poster cards.
 * @param {*} m - Input to titleOf().
 * @returns {*} Result of the operation.
 */
function titleOf(m) {
  return m.name || m.title || 'Untitled';
}
/** Year Of for VOD poster cards.
 * @param {*} m - Input to yearOf().
 * @returns {*} Result of the operation.
 */
function yearOf(m) {
  return String(m.year || m.releaseDate || m.releasedate || '').slice(0, 4);
}
/** Rating Of for VOD poster cards.
 * @param {*} m - Input to ratingOf().
 * @returns {*} Result of the operation.
 */
function ratingOf(m) {
  return parseFloat(m.rating || m.rating_5based || 0) || 0;
}

/** Make Card for VOD poster cards.
 * @param {Object} item - VOD item.
 * @param {string} kind - Input to makeCard().
 * @returns {*} Result of the operation.
 */
function makeCard(item, kind) {
  var card = document.createElement('div');
  card.className = 'vod-card';
  card.tabIndex = -1;
  var poster = document.createElement('div');
  poster.className = 'vod-card-poster';
  var icon = posterOf(item);
  if (icon) {
    var img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.onerror = function () {
      poster.classList.add('no-img');
      poster.setAttribute('data-letter', titleOf(item).charAt(0));
      if (img.parentNode) img.parentNode.removeChild(img);
    };
    lazyImg(img, icon);
    poster.appendChild(img);
  } else {
    poster.classList.add('no-img');
    poster.setAttribute('data-letter', titleOf(item).charAt(0));
  }

  // progress bar for continue-watching cards
  if (kind === 'progress' && item.dur) {
    var pb = document.createElement('div');
    pb.className = 'vod-card-progress';
    var pf = document.createElement('div');
    pf.className = 'vod-card-progress-fill';
    pf.style.width = Math.max(2, Math.min(100, item.pos / item.dur * 100)) + '%';
    pb.appendChild(pf);
    poster.appendChild(pb);
  }
  card.appendChild(poster);
  var label = document.createElement('div');
  label.className = 'vod-card-label';
  label.textContent = titleOf(item);
  card.appendChild(label);
  card.addEventListener('click', function () {
    if (kind === 'progress') resumePlay(item);else openDetail(item);
  });
  return card;
}

/* The tile that ends a truncated rail. Deliberately card-shaped and in the
   card flow rather than a link in the heading: the D-pad is already walking
   right along the row, so the way out of the row should be the next thing
   to the right — not something that needs a different key to reach. */
/** Make More Card for VOD poster cards.
 * @param {*} title - Input to makeMoreCard().
 * @param {string} type - Input to makeMoreCard().
 * @param {*} catId - Input to makeMoreCard().
 * @param {*} total - Input to makeMoreCard().
 * @returns {*} Result of the operation.
 */
function makeMoreCard(title, type, catId, total) {
  var card = document.createElement('div');
  card.className = 'vod-card vod-card-more';
  card.tabIndex = -1;
  var poster = document.createElement('div');
  poster.className = 'vod-card-poster vod-more-poster';
  poster.appendChild(Dom.el('div.vod-more-dots', {
    text: '•••'
  }));
  poster.appendChild(Dom.el('div.vod-more-count', {
    text: 'All ' + total
  }));
  card.appendChild(poster);
  var label = document.createElement('div');
  label.className = 'vod-card-label';
  label.textContent = 'See all';
  card.appendChild(label);
  card.addEventListener('click', function () {
    openCategory(title, type, catId);
  });
  return card;
}