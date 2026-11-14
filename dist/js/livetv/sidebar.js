"use strict";

/* livetv/sidebar.js — the left rail: favourites, groups, categories, and the
 * dialogs they open (rename, delete, assign-to-group).
 *
 * Two kinds of favourite live here and they behave differently on purpose. A
 * GROUP is a hand-curated set of channels. A starred CATEGORY is a standing
 * instruction — "everything in here" — resolved fresh on every filter, so
 * channels the provider adds later appear on their own. See data/favourites.js.
 *
 * Requires: livetv/state.js, data/favourites.js, livetv/channels.js.
 */

// ── Favourites ────────────────────────────────────────────────────────────────
// State and persistence live in data/favourites.js. These are the names the
// rest of the page (and dpad.js) call, kept as one-liners so there is exactly
// one copy of the list rather than a module's copy and a page's copy drifting
// apart — which is what happened when a category was starred from the sidebar
// and the channel list carried on filtering against a stale array.

/** Check whether a channel is favorited.
 * @param {string} sid - Channel stream ID.
 * @returns {boolean} Whether the requested condition is met.
 */
function isFav(sid) {
  return Favourites.isChannel(sid);
}
/** Toggle a channel favorite.
 * @param {string} sid - Channel stream ID.
 * @returns {*} Value described above.
 */
function toggleFav(sid) {
  return Favourites.toggleChannel(sid);
}
/** List user-created channel groups.
 * @returns {Array<Object>} Matching channel or data entries.
 */
function favGroupsList() {
  return Favourites.groups();
}

/** Move a favorite and restore its focus.
 * @param {string} sid - Channel stream ID.
 * @param {number} dir - Station movement direction.
 * @param {string} subzone - Action to refocus after reordering.
 * @returns {void} No return value.
 */
function _reorderAndRefocus(sid, dir, subzone) {
  if (!Favourites.moveChannel(sid, dir)) return; // already at an end
  _keepScrollOnApply = true;
  var channels = getFilteredChannels();
  var newIdx = channels.findIndex(function (ch) {
    return String(ch.stream_id) === sid;
  });
  if (newIdx >= 0) tvRowIndex = newIdx;
  _vsSetChannels(channels, true);
  loadEPGForCurrentCategory();
  tvRowSubZone = subzone;
  tvFocusRowButtons();
}

/** Check group membership for a channel.
 * @param {string} gid - Favorites group ID.
 * @param {string} sid - Channel stream ID.
 * @returns {boolean} Whether the requested condition is met.
 */
function isInGroup(gid, sid) {
  return Favourites.isInGroup(gid, sid);
}
/** Add or remove a channel from a group.
 * @param {string} gid - Favorites group ID.
 * @param {string} sid - Channel stream ID.
 * @returns {*} Value described above.
 */
function toggleChannelInGroup(gid, sid) {
  return Favourites.toggleInGroup(gid, sid);
}
/** Create a named favorites group.
 * @param {string} name - User-visible name.
 * @returns {*} Value described above.
 */
function createFavGroup(name) {
  return Favourites.createGroup(name);
}
/** Rename an existing favorites group.
 * @param {string} id - DOM element or stored object ID.
 * @param {string} name - User-visible name.
 * @returns {*} Value described above.
 */
function renameFavGroup(id, name) {
  return Favourites.renameGroup(id, name);
}
/** Delete a favorites group and update the panel.
 * @param {string} id - DOM element or stored object ID.
 * @returns {void} No return value.
 */
function deleteFavGroup(id) {
  Favourites.deleteGroup(id);
  if (activeFavGroup === id) activeFavGroup = "all";
}

// ── Favourite categories ──────────────────────────────────────────────────────
// Starring a category is a standing instruction ("everything in here"), not a
// snapshot: it is resolved against the live channel list on every filter, so
// channels the provider adds later show up on their own.

var _categoryNames = new Map(); // category_id → name, for the sidebar labels

/** Toggle a category favorite.
 * @param {string} catId - Category ID.
 * @returns {*} Value described above.
 */
function toggleFavCategory(catId) {
  var nowFav = Favourites.toggleCategory("live", catId);
  renderFavSectionList();
  updateSidebarActive();
  // The category rows carry their own star, and the favourites view may have
  // just gained or lost a hundred channels.
  refreshCategoryStars();
  if (activeCategory === "favs") applyFilters();
  return nowFav;
}

/** Refresh category favorite markers.
 * @returns {void} No return value.
 */
function refreshCategoryStars() {
  document.querySelectorAll(".cat-star-btn[data-cat-id]").forEach(function (btn) {
    btn.classList.toggle("active", Favourites.isCategory("live", btn.dataset.catId));
  });
}

// ── Categories / sidebar ──────────────────────────────────────────────────────

/** Build sidebar categories and favorite sections.
 * @param {Array<Object>} categories - Category definitions.
 * @returns {void} No return value.
 */
function renderCategories(categories) {
  var container = document.getElementById("categories");
  container.innerHTML = "";
  var favSection = document.createElement("div");
  favSection.className = "cat-section";
  favSection.id = "cat-section-favs";
  var favHdr = document.createElement("button");
  favHdr.className = "cat-section-hdr fav-section-hdr";
  favHdr.id = "fav-section-hdr";
  favHdr.innerHTML = "<span class=\"section-star\">\u2605</span><span class=\"section-label\">Favourites</span><span class=\"section-chevron\">\u25BE</span>";
  favHdr.onclick = function () {
    var isOpen = favSection.classList.toggle("open");
    if (isOpen) {
      activeCategory = "favs";
      activeFavGroup = "all";
      updateSidebarActive();
      applyFilters();
    }
  };
  var favList = document.createElement("div");
  favList.className = "cat-section-list";
  favList.id = "fav-section-list";
  favSection.appendChild(favHdr);
  favSection.appendChild(favList);
  container.appendChild(favSection);
  var allBtn = document.createElement("button");
  allBtn.className = "cat-btn";
  allBtn.dataset.catId = "all";
  allBtn.textContent = "All";
  allBtn.onclick = function () {
    activeCategory = "all";
    activeFavGroup = "all";
    updateSidebarActive();
    applyFilters();
  };
  container.appendChild(allBtn);
  var visibleCats = categories.filter(function (cat) {
    return !_hiddenCatsLive.has(String(cat.category_id));
  });
  _categoryNames = new Map(categories.map(function (c) {
    return [String(c.category_id), c.category_name || "Unnamed"];
  }));
  if (visibleCats.length) {
    var catSection = document.createElement("div");
    catSection.className = "cat-section";
    catSection.id = "cat-section-cats";
    var catHdr = document.createElement("button");
    catHdr.className = "cat-section-hdr";
    catHdr.innerHTML = "<span class=\"section-label\">Categories</span><span class=\"section-chevron\">\u25BE</span>";
    catHdr.onclick = function () {
      return catSection.classList.toggle("open");
    };
    var catList = document.createElement("div");
    catList.className = "cat-section-list";
    var frag = document.createDocumentFragment();
    visibleCats.forEach(function (cat) {
      frag.appendChild(makeCategoryRow(cat, catSection));
    });
    catList.appendChild(frag);
    catSection.appendChild(catHdr);
    catSection.appendChild(catList);
    container.appendChild(catSection);
  }
  renderFavSectionList();
}

/* A category row is two controls, not one: the name jumps to the category, the
   star adds the whole category to Favourites. Same shape as a channel row
   (name + ★), so the D-pad rule is the one the user already knows — RIGHT from
   the name lands on the star. */
/** Build the DOM row for one category.
 * @param {*} cat - Input for makeCategoryRow().
 * @param {*} catSection - Input for makeCategoryRow().
 * @returns {void} No return value.
 */
function makeCategoryRow(cat, catSection) {
  var id = String(cat.category_id);
  var row = document.createElement("div");
  row.className = "cat-row";
  row.dataset.catId = id;
  var btn = document.createElement("button");
  btn.className = "cat-btn cat-sub-btn";
  btn.dataset.catId = id;
  btn.textContent = cat.category_name || "Unnamed";
  btn.onclick = function () {
    activeCategory = id;
    activeFavGroup = "all";
    catSection.classList.add("open");
    updateSidebarActive();
    applyFilters();
  };
  var star = document.createElement("button");
  star.className = "cat-star-btn" + (Favourites.isCategory("live", id) ? " active" : "");
  star.dataset.catId = id;
  star.textContent = "★";
  star.title = "Add this whole category to Favourites";
  star.setAttribute("aria-label", "Favourite category " + (cat.category_name || ""));
  star.onclick = function (e) {
    e.stopPropagation();
    toggleFavCategory(id);
  };
  row.appendChild(btn);
  row.appendChild(star);
  return row;
}

/** Highlight the selected category or group.
 * @returns {void} No return value.
 */
function updateSidebarActive() {
  document.querySelectorAll(".cat-btn, .cat-sub-btn, .cat-section-hdr").forEach(function (b) {
    return b.classList.remove("active");
  });
  if (activeCategory === "favs") {
    var hdr = document.getElementById("fav-section-hdr");
    if (hdr) hdr.classList.add("active");
    document.querySelectorAll("[data-fav-group]").forEach(function (btn) {
      return btn.classList.toggle("active", btn.dataset.favGroup === activeFavGroup);
    });
  } else if (activeCategory === "all") {
    var _document$querySelect;
    (_document$querySelect = document.querySelector(".cat-btn[data-cat-id='all']")) === null || _document$querySelect === void 0 || _document$querySelect.classList.add("active");
  } else {
    var _document$getElementB;
    document.querySelectorAll(".cat-sub-btn[data-cat-id]").forEach(function (btn) {
      return btn.classList.toggle("active", btn.dataset.catId === String(activeCategory));
    });
    (_document$getElementB = document.getElementById("cat-section-cats")) === null || _document$getElementB === void 0 || _document$getElementB.classList.add("open");
  }
}

/** Build the favorites-group section.
 * @returns {void} No return value.
 */
function renderFavSectionList() {
  var list = document.getElementById("fav-section-list");
  if (!list) return;
  list.innerHTML = "";
  var mkItem = function mkItem(text, groupId) {
    var btn = document.createElement("button");
    var isActive = activeCategory === "favs" && activeFavGroup === groupId;
    btn.className = "cat-sub-btn" + (isActive ? " active" : "");
    btn.dataset.favGroup = groupId;
    btn.textContent = text;
    btn.onclick = function () {
      var _document$getElementB2;
      activeCategory = "favs";
      activeFavGroup = groupId;
      (_document$getElementB2 = document.getElementById("cat-section-favs")) === null || _document$getElementB2 === void 0 || _document$getElementB2.classList.add("open");
      updateSidebarActive();
      applyFilters();
    };
    list.appendChild(btn);
    return btn;
  };
  mkItem("All", "all");
  favGroupsList().forEach(function (g) {
    var btn = mkItem(g.name, g.id);
    btn.ondblclick = function (e) {
      e.stopPropagation();
      promptRenameGroup(g.id, g.name);
    };
    btn.oncontextmenu = function (e) {
      e.preventDefault();
      showGroupContextMenu(e, g.id);
    };
  });

  /* Starred categories sit alongside the groups, marked so they read as what
     they are — a live view of a provider category, not a set someone curated.
     Each carries its own star to unstar it from here, because hunting back
     through the Categories list to undo it is the obvious annoyance. */
  var favCats = Favourites.categories("live");
  if (favCats.length) {
    var head = document.createElement("div");
    head.className = "fav-cat-header";
    head.textContent = "Categories";
    list.appendChild(head);
    favCats.forEach(function (catId) {
      var row = document.createElement("div");
      row.className = "cat-row";
      var key = "cat:" + catId;
      var isActive = activeCategory === "favs" && activeFavGroup === key;
      var btn = document.createElement("button");
      btn.className = "cat-sub-btn fav-cat-item" + (isActive ? " active" : "");
      btn.dataset.favGroup = key;
      btn.textContent = _categoryNames.get(String(catId)) || "Category " + catId;
      btn.onclick = function () {
        var _document$getElementB3;
        activeCategory = "favs";
        activeFavGroup = key;
        (_document$getElementB3 = document.getElementById("cat-section-favs")) === null || _document$getElementB3 === void 0 || _document$getElementB3.classList.add("open");
        updateSidebarActive();
        applyFilters();
      };
      var star = document.createElement("button");
      star.className = "cat-star-btn active";
      star.dataset.catId = String(catId);
      star.textContent = "★";
      star.title = "Remove this category from Favourites";
      star.onclick = function (e) {
        e.stopPropagation();
        if (activeFavGroup === key) activeFavGroup = "all";
        toggleFavCategory(catId);
      };
      row.appendChild(btn);
      row.appendChild(star);
      list.appendChild(row);
    });
  }
  var addBtn = document.createElement("button");
  addBtn.className = "cat-add-grp-btn";
  addBtn.textContent = "+ New Group";
  addBtn.onclick = function () {
    return promptNewGroup();
  };
  list.appendChild(addBtn);
}

// ── Group context menu ────────────────────────────────────────────────────────

/** Open the create-group prompt.
 * @returns {void} No return value.
 */
function promptNewGroup() {
  showInputModal("New Favourite Group", "Group name", "", function (name) {
    if (!name) return;
    createFavGroup(name);
    renderFavSectionList();
  });
}
/** Open the group-rename prompt.
 * @param {string} id - DOM element or stored object ID.
 * @param {string} currentName - Current group title.
 * @returns {void} No return value.
 */
function promptRenameGroup(id, currentName) {
  showInputModal("Rename Group", "Group name", currentName, function (name) {
    if (!name) return;
    renameFavGroup(id, name);
    renderFavSectionList();
  });
}

/** Open the context menu for a group.
 * @param {KeyboardEvent} e - Remote or keyboard event.
 * @param {string} gid - Favorites group ID.
 * @returns {void} No return value.
 */
function showGroupContextMenu(e, gid) {
  closeContextMenus();
  var menu = document.createElement("div");
  menu.className = "ctx-menu";
  menu.style.cssText = "left:".concat(e.clientX, "px;top:").concat(e.clientY, "px");
  var mkItem = function mkItem(text, danger, fn) {
    var item = document.createElement("div");
    item.className = "ctx-item" + (danger ? " ctx-danger" : "");
    item.textContent = text;
    item.onclick = function () {
      closeContextMenus();
      fn();
    };
    menu.appendChild(item);
  };
  mkItem("Rename", false, function () {
    var g = Favourites.findGroup(gid);
    if (g) promptRenameGroup(gid, g.name);
  });
  mkItem("Delete Group", true, function () {
    if (confirm("Delete this group? Channels stay in Favourites.")) {
      deleteFavGroup(gid);
      renderFavSectionList();
      applyFilters();
    }
  });
  document.body.appendChild(menu);
  _ctxMenuIndex = 0;
  var items = Array.from(menu.querySelectorAll(".ctx-item"));
  _focusCtxItem(menu, items);
  // Removed by hand: `{ once: true }` is ignored before Chromium 55, which
  // left one more permanent capture-phase listener per menu opened.
  var _dismiss = function dismiss() {
    document.removeEventListener("click", _dismiss);
    closeContextMenus();
  };
  setTimeout(function () {
    return document.addEventListener("click", _dismiss);
  }, 0);
}
/** Close any open group context menus.
 * @returns {void} No return value.
 */
function closeContextMenus() {
  document.querySelectorAll(".ctx-menu").forEach(function (m) {
    return m.remove();
  });
}

// ── Assign panel ──────────────────────────────────────────────────────────────

/** Open the channel-to-group assignment panel.
 * @param {KeyboardEvent} e - Remote or keyboard event.
 * @param {string} sid - Channel stream ID.
 * @param {HTMLElement} anchorEl - Element that anchors the panel.
 * @returns {void} No return value.
 */
function showAssignPanel(e, sid, anchorEl) {
  e.stopPropagation();
  closeAssignPanels();
  if (!favGroupsList().length) {
    promptNewGroup();
    return;
  }
  history.pushState(null, "");
  _assignHistoryPushed = true;
  var panel = document.createElement("div");
  panel.className = "assign-panel";
  var title = document.createElement("div");
  title.className = "assign-title";
  title.textContent = "Add to group";
  panel.appendChild(title);
  favGroupsList().forEach(function (g) {
    var row = document.createElement("label");
    row.className = "assign-row";
    var cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = isInGroup(g.id, sid);
    cb.onchange = function () {
      toggleChannelInGroup(g.id, sid);
      updateAssignBtnState(sid);
    };
    var span = document.createElement("span");
    span.textContent = g.name;
    row.appendChild(cb);
    row.appendChild(span);
    panel.appendChild(row);
  });
  var newBtn = document.createElement("button");
  newBtn.className = "assign-new-btn";
  newBtn.textContent = "+ New Group";
  newBtn.onclick = function () {
    closeAssignPanels(true);
    promptNewGroup();
  };
  panel.appendChild(newBtn);
  var rect = anchorEl.getBoundingClientRect();
  panel.style.cssText = "position:fixed;right:".concat(window.innerWidth - rect.right, "px;top:").concat(rect.bottom + 4, "px");
  document.body.appendChild(panel);
  _assignPanelIndex = 0;
  var items = Array.from(panel.querySelectorAll(".assign-row, .assign-new-btn"));
  _focusAssignItem(panel, items);
}
var _assignHistoryPushed = false;

/** Close assignment panels and optionally update browser history.
 * @param {boolean} popHistory - Whether to update navigation history.
 * @returns {void} No return value.
 */
function closeAssignPanels() {
  var popHistory = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  document.querySelectorAll(".assign-panel").forEach(function (p) {
    return p.remove();
  });
  if (popHistory && _assignHistoryPushed) {
    _assignHistoryPushed = false;
    history.back();
  } else {
    _assignHistoryPushed = false;
  }
}
/** Refresh a channel's assignment button.
 * @param {string} sid - Channel stream ID.
 * @returns {void} No return value.
 */
function updateAssignBtnState(sid) {
  var entry = rowCache.get(String(sid));
  if (!(entry !== null && entry !== void 0 && entry.assignBtn)) return;
  entry.assignBtn.classList.toggle("active", Favourites.inAnyGroup(sid));
}

// ── Input modal ───────────────────────────────────────────────────────────────

/** Show a reusable input prompt and invoke its callback.
 * @param {string} heading - Modal heading.
 * @param {string} label - Input prompt label.
 * @param {string} value - Initial input value.
 * @param {Function} callback - Function called with the submitted value.
 * @returns {*} Value described above.
 */
function showInputModal(heading, label, value, callback) {
  var overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  var box = document.createElement("div");
  box.className = "modal-box";
  var h = document.createElement("div");
  h.className = "modal-heading";
  h.textContent = heading;
  var inp = document.createElement("input");
  inp.className = "modal-input";
  inp.type = "text";
  inp.value = value;
  inp.placeholder = label;
  var btns = document.createElement("div");
  btns.className = "modal-btns";
  var cancel = document.createElement("button");
  cancel.className = "modal-btn";
  cancel.textContent = "Cancel";
  cancel.onclick = function () {
    return overlay.remove();
  };
  var ok = document.createElement("button");
  ok.className = "modal-btn modal-btn-ok";
  ok.textContent = "OK";
  ok.onclick = function () {
    overlay.remove();
    callback(inp.value.trim());
  };
  inp.onkeydown = function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      ok.click();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      overlay.remove();
    }
  };
  btns.appendChild(cancel);
  btns.appendChild(ok);
  box.appendChild(h);
  box.appendChild(inp);
  box.appendChild(btns);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  setTimeout(function () {
    inp.focus();
    inp.select();
  }, 50);
}