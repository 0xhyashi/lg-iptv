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
function getSourceType() {
    return Config.sourceType();
}

async function initApp() {
    const status = document.getElementById("status");
    const setStatus = (msg, err) => {
        status.textContent = msg;
        status.style.color = err ? "#ff5555" : "";
    };

    epgCache = loadEpgDiskCache();

    if (getSourceType() === "m3u") {
        await _initAppM3U(setStatus);
    } else {
        await _initAppXtream(setStatus);
    }
}

async function _initAppM3U(setStatus) {
    let m3uCfg;
    try { m3uCfg = await m3uLoadConfig(); }
    catch (err) { setStatus("ERR: " + err.message, true); return; }

    // Try disk cache first
    const url    = m3uCfg.playlist_url;
    const cached = m3uLoadCache(url);
    if (cached) {
        allChannels = cached.channels;
        setStatus(`${allChannels.length} channels (cached)`);
        _bootUI(cached.categories, cached.epgUrl);
        // Refresh in background. An empty or failed refresh keeps the cached
        // list on screen rather than wiping it — same rule as Xtream below.
        m3uFetchPlaylist(url).then(parsed => {
            if (!parsed.channels.length) return;
            allChannels = parsed.channels;
            setStatus(`${allChannels.length} channels`);
            m3uSaveCache(url, parsed);
            renderCategories(parsed.categories);
            updateSidebarActive();
            applyFilters();
        }).catch(() => {});
        return;
    }

    try {
        setStatus("Loading playlist…");
        const parsed = await m3uGetChannelsAndCategories(m3uCfg);
        if (!parsed.channels.length) { setStatus("ERR: 0 channels in playlist", true); return; }
        allChannels = parsed.channels;
        setStatus(`${allChannels.length} channels`);
        m3uSaveCache(url, parsed);
        _bootUI(parsed.categories, parsed.epgUrl);
    } catch (err) { setStatus("ERR: " + err.message, true); }
}

async function _initAppXtream(setStatus) {
    setStatus("Loading config…");
    try { cfg = await xtreamLoadConfig(); }
    catch (err) { setStatus("ERR: " + err.message, true); return; }

    if (!cfg?.server_url) {
        setStatus("No server configured — redirecting to Settings…", false);
        setTimeout(() => { window.location.href = "../pages/settings.html"; }, 1800);
        return;
    }

    const cachedCh  = loadChannelCache();
    const cachedCat = loadCatCache();
    let categories  = cachedCat || [];

    if (cachedCh) {
        allChannels = cachedCh;
        setStatus(`${allChannels.length} channels (cached)`);
        _bootUI(categories);

        /* Background refresh. Both guards on `.length` are load-bearing:
           xtreamGet* swallow their errors and return [], so a failed refresh
           arrives as an empty array rather than a rejection. Without the guard
           the category list was wiped from the screen AND written back to the
           cache as empty on every launch where the panel was briefly
           unreachable — leaving the sidebar with no categories until a later
           launch happened to succeed. */
        xtreamGetLiveChannels(cfg).then(fresh => {
            if (!fresh.length) return;
            allChannels = fresh;
            setStatus(`${allChannels.length} channels`);
            saveChannelCache(fresh, categories);
            if (xmltvCache && xmltvCache.programmes) mergeXMLTVIntoEpgCache();
            _keepScrollOnApply = true;   // a refresh must not throw the user back to row 1
            applyFilters();
        }).catch(() => {});
        xtreamGetCategories(cfg).then(freshCat => {
            if (!freshCat.length) return;
            const sig = list => list.map(c => c.category_id + ":" + c.category_name).join("|");
            const changed = sig(freshCat) !== sig(categories);
            categories = freshCat;
            /* Only the category list is new here, so only it is written. This
               used to re-save the entire channel list as well — serialising
               several MB a second time on every launch for nothing. */
            Store.cacheSet(CAT_CACHE_KEY, freshCat);
            if (!changed) return;      // identical: leave the sidebar (and the focus ring in it) alone
            renderCategories(freshCat);
            updateSidebarActive();
            if (tvFocusZone === "sidebar-cats") tvFocusSidebarItem(tvSidebarIndex);
        }).catch(() => {});
        return;
    }

    setStatus("Logging in…");
    try {
        const login = await xtreamLogin(cfg);
        /* Three outcomes, not two: authenticated, the panel answered and said
           no (bad password / expired line), or nothing answered at all. The
           middle one used to fall through as a success and reappear later as
           "0 channels returned". */
        if (login && login.authFailed) { setStatus("ERR: " + login.message, true); return; }
        if (!login) { setStatus("ERR: Could not reach any server for this profile", true); return; }
        // Update cfg with the resolved server_url (the URL that actually worked)
        cfg = login.cfg;
    } catch (err) { setStatus("ERR: " + err.message, true); return; }

    try {
        setStatus("Fetching channels…");
        const [channels, cats] = await Promise.all([xtreamGetLiveChannels(cfg), xtreamGetCategories(cfg)]);
        if (!channels.length) { setStatus("ERR: 0 channels returned", true); return; }
        allChannels = channels; categories = cats;
        setStatus(`${allChannels.length} channels`);
        saveChannelCache(channels, categories);
        _bootUI(categories);
    } catch (err) { setStatus("ERR: " + err.message, true); }
}

function _bootUI(categories, playlistEpgUrl) {
    renderCategories(categories);
    setupSearch();
    setupPip();
    setupRadioUI();
    setupTimelineNav();

    activeCategory = Favourites.isEmpty() ? "all" : "favs";
    activeFavGroup = "all";
    if (activeCategory === "favs") {
        const sec = document.getElementById("cat-section-favs");
        if (sec) sec.classList.add("open");
    }
    renderFavSectionList();
    updateSidebarActive();
    applyFilters();

    tvRowIndex = 0;
    setTVZone("channel-list");

    // After the list is painted: a user-supplied guide is a large download
    // and must not hold up the first frame of channels.
    setTimeout(() => loadXMLTV(playlistEpgUrl), 500);
}



/* ── Native audio-radio playback ────────────────────────────────────────────
 * The regular IPTVPlayer drives a <video> decoder. An Internet radio
 * Icecast/Airtime endpoint returns continuous MP3/AAC bytes, not HLS video.
 * Use one native <audio> element, as recommended in LG's webOS audio guide.
 * Release the video decoder before radio, and close the radio connection
 * before returning to video playback.
 */
function stopRadio() { RadioDeck.stop(); }
function setupRadioUI() { RadioDeck.init(); }
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
function bunkhouseRadioChannels() {
    return allChannels.filter(function (c) { return c && c._radio; });
}
function bunkhouseSetMode(mode) {
    var radio = mode === "radio";
    document.body.classList.toggle("radio-mode", radio);
    var tv = document.getElementById("media-tv"), r = document.getElementById("media-radio");
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
function bunkhouseHighlightStation() {
    var sid = currentChannel && currentChannel._radio ? String(currentChannel.stream_id) : "";
    _bkRadioButtons.forEach(function (btn, index) {
        var selected = btn.getAttribute("data-station-id") === sid;
        btn.classList.toggle("selected", selected);
        if (selected) _bkStationIndex = index;
    });
}
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
        if (_bkLastTVChannel) selectChannel(_bkLastTVChannel);
        else {
            player.stop();
            var msg = document.getElementById("player-msg");
            if (msg) { msg.style.display = "flex"; msg.textContent = "Select a TV channel"; }
        }
        if (typeof setTVZone === "function") setTVZone("channel-list");
    }
}
function bunkhouseStationStep(delta) {
    if (!_bkRadioButtons.length) return;
    _bkStationIndex = (_bkStationIndex + delta + _bkRadioButtons.length) % _bkRadioButtons.length;
    _bkRadioButtons[_bkStationIndex].focus();
    _bkRadioButtons[_bkStationIndex].click();
}
function bunkhouseHandleKey(e, key) {
    if (!document.body.classList.contains("radio-mode") || isFullscreen()) return false;
    var focus = document.activeElement;
    if (key === 38 || key === 40) {
        e.preventDefault();
        bunkhouseStationStep(key === 38 ? -1 : 1);
        return true;
    }
    if (key === 37) { // LEFT selects the media navigation
        e.preventDefault();
        document.getElementById("media-tv").focus();
        return true;
    }
    if (key === 39) { // RIGHT focuses pause / resume control
        e.preventDefault();
        document.getElementById("radio-toggle").focus();
        return true;
    }
    if (key === 13) { // ENTER
        if (focus && /^(media-tv|media-radio|radio-toggle|radio-prev|radio-next)$/.test(focus.id)) {
            e.preventDefault();focus.click();return true;
        }
        if (_bkRadioButtons[_bkStationIndex]) {
            e.preventDefault();_bkRadioButtons[_bkStationIndex].click();return true;
        }
    }
    if (key === 461 || key === 27 || key === 8) {
        e.preventDefault();bunkhouseChangeMode("tv");return true;
    }
    return false;
}
function setupBunkhouseNavigation() {
    var tv=document.getElementById("media-tv"),radio=document.getElementById("media-radio");
    if (!tv || !radio) return;
    tv.addEventListener("click",function(){bunkhouseChangeMode("tv");});
    radio.addEventListener("click",function(){bunkhouseChangeMode("radio");});
    var panel=document.getElementById("radio-stations");
    if (!panel) return;
    panel.innerHTML="";
    _bkRadioButtons=[];
    bunkhouseRadioChannels().forEach(function(ch,index) {
        var btn=document.createElement("button");
        btn.type="button";btn.className="bk-station";
        btn.setAttribute("data-station-id",String(ch.stream_id));
        var title=document.createElement("span");title.textContent=ch.name;
        btn.appendChild(title);
        btn.addEventListener("click",function(){
            _bkStationIndex=index;selectChannel(ch);btn.focus();
        });
        panel.appendChild(btn);
        _bkRadioButtons.push(btn);
    });
    RadioDeck.init();
}

// ── Channel selection ─────────────────────────────────────────────────────────

async function selectChannel(ch) {
    currentChannel = ch;
    const _selSid = String(ch.stream_id);
    rowCache.forEach((entry, sid) => entry.row.classList.toggle("selected", sid === _selSid));
    document.getElementById("preview-channel-name").textContent = ch.name || "Unknown";
    document.getElementById("pip-channel-name").textContent     = ch.name || "Unknown";
    if (ch._radio) {
        WeatherChannel.close();
        bunkhouseSetMode("radio");
        bunkhouseHighlightStation();
        startRadio(ch);
        setEPG("now", "Live radio", "", "");
        setEPG("next", "—", "", "");
        document.getElementById("epg-bar-fill").style.width = "0%";
        showPreviewInfo();
        showOSD();
        return;
    }
    stopRadio();
    _bkLastTVChannel = ch;
    if (document.body.classList.contains("radio-mode")) bunkhouseSetMode("tv");
    if (ch._weatherstar) {
        // Browser-driven forecast, not a video URL: never pass it to IPTVPlayer.
        // The third-party artwork, transitions, fonts and music live in their
        // own pristine packaged iframe, with Bunkhouse handling navigation.
        player.stop();
        WeatherChannel.open();
        setEPG("now", "WeatherStar 4000+ • live forecast", "", "");
        setEPG("next", "Updates from NOAA / NWS", "", "");
        document.getElementById("epg-bar-fill").style.width = "0%";
        showPreviewInfo();
        return;
    }
    WeatherChannel.close();
    const playUrl = ch._source === "m3u" ? m3uBuildLiveURL(ch) : xtreamBuildLiveURL(cfg, ch.stream_id);
    // The key lets the player remember which engine actually worked for THIS
    // channel, so a 4K/HEVC channel that only plays on HLS starts there.
    player.play(playUrl, { key: "ch:" + ch.stream_id });
    setEPG("now", "Loading…", "", ""); setEPG("next", "—", "", "");
    document.getElementById("epg-bar-fill").style.width = "0%";
    showPreviewInfo();
    showOSD();  // immediate banner on channel switch — EPG data populated below

    let listings = epgCache[ch.stream_id];
    if (!listings && !epgBlocked) {
        epgCache[ch.stream_id] = null;
        try {
            listings = ch._source === "m3u"
                ? await m3uGetEPG(ch.stream_id)
                : await xtreamGetEPG(cfg, ch.stream_id);
        } catch (err) {
            if (Net.isHttpError(err, 403) || Net.isHttpError(err, 401)) epgBlocked = true;
            listings = [];
        }
        epgCache[ch.stream_id] = listings;
        patchEpgStrip(ch.stream_id); scheduleEpgSave();
    }
    // The user may have switched channels while the guide was loading.
    // Check before updating the display for BOTH empty and nonempty results.
    if (currentChannel !== ch) return;
    if (!listings?.length) { setEPG("now", "No EPG data", "", ""); showOSD(); return; }

    const { cur, next } = _findNowNext(listings);
    setEPG("now", epgTitle(cur), formatTimeRange(cur), epgDesc(cur));
    document.getElementById("epg-bar-fill").style.width = calcProgress(cur) + "%";
    if (next) setEPG("next", epgTitle(next), formatTimeRange(next), "");
    showOSD();
}

function updateOSDIfFullscreen() {
    if (isFullscreen()) showOSD();
}

function setEPG(slot, title, time, desc) {
    document.getElementById(`epg-${slot}-title`).textContent = title || "—";
    document.getElementById(`epg-${slot}-time`).textContent  = time  || "";
    const el = document.getElementById(`epg-${slot}-desc`);
    if (el) el.textContent = desc || "";
}

function showPreviewInfo() {
    document.getElementById("preview-info")?.classList.add("preview-visible");
}

function channelStep(delta) {
    if (!_vsChannels.length) return;
    let idx = currentChannel
        ? _vsChannels.findIndex(ch => String(ch.stream_id) === String(currentChannel.stream_id))
        : -1;
    if (idx < 0) idx = delta > 0 ? -1 : _vsChannels.length;
    idx = Math.max(0, Math.min(_vsChannels.length - 1, idx + delta));
    tvRowIndex = idx;
    const ch = _vsChannels[idx];
    if (ch) { selectChannel(ch); tvFocusRow(idx); }
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
        const active = Config.resolve();
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
  var toonamiChannels = [
    { stream_id: "toonami-aftermath-east", name: "Toonami Aftermath East",  category_id: "toonami", stream_icon: "", stream_url: "http://api.toonamiaftermath.com:3000/est/playlist.m3u8",    _source: "m3u" },
    { stream_id: "toonami-aftermath-west", name: "Toonami Aftermath West",  category_id: "toonami", stream_icon: "", stream_url: "http://api.toonamiaftermath.com:3000/pst/playlist.m3u8",    _source: "m3u" },
    { stream_id: "toonami-aftermath-movies", name: "Toonami Aftermath Movies", category_id: "toonami", stream_icon: "", stream_url: "http://api.toonamiaftermath.com:3000/movies/playlist.m3u8", _source: "m3u" },
    { stream_id: "toonami-aftermath-radio", name: "Toonami Aftermath Radio", category_id: "toonami", stream_icon: "", stream_url: "http://api.toonamiaftermath.com:3000/radio/playlist.m3u8",  _source: "m3u" }
  ];
// Supplemental streams tested on 2026-11-07 from a US GitHub runner:
  // each URL returned an HLS playlist AND a reachable media segment.
  // This does not prove that playback will work on every LG TV or network.
  // These are free-to-view FAST streams, not subscription-TV relays.
  var verifiedJapanExtras = [
    { stream_id: "japan-extra-01", name: "日テレNEWS", category_id: "japan-news", stream_icon: "", stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-news1hlscmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-02", name: "FNNプライムオンライン", category_id: "japan-news", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-news4-cmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-03", name: "MBSニュース", category_id: "japan-news", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-news5-cmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-04", name: "日テレNEWSセレクト", category_id: "japan-news", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-ntv-newsselect-cmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-05", name: "共同通信News", category_id: "japan-news", stream_icon: "", stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-news3hlscmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-06", name: "オリコンニュース", category_id: "japan-news", stream_icon: "", stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-news2cmafhls-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-07", name: "ムビドラTV", category_id: "japan-entertainment", stream_icon: "", stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-moviecmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-08", name: "手塚プロダクションTV", category_id: "japan-anime", stream_icon: "", stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-anime5-cmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-09", name: "キッズ", category_id: "japan-anime", stream_icon: "", stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-kids-english-cmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-10", name: "NTV Pro Wrestling", category_id: "japan-entertainment", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-ntv-pro-wrestling-hls-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-11", name: "that’s 70s", category_id: "japan-music", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01076-lightningintern-lightningnow70s-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-12", name: "that’s 80s", category_id: "japan-music", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01076-lightningintern-lightningnow80s-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-13", name: "that’s 90s00s", category_id: "japan-music", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01076-lightningintern-lightning-now90s00s-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-14", name: "that’s Rock", category_id: "japan-music", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01076-lightningintern-lightningnowrock-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-15", name: "囲碁・将棋ライト", category_id: "japan-lifestyle", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-igo-shogi-cmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-16", name: "麻雀", category_id: "japan-lifestyle", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-mahjong-cmaf1-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-17", name: "パチンコ・パチスロ", category_id: "japan-lifestyle", stream_icon: "", stream_url: "https://cdn-apne1.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-pachislocmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-18", name: "ぷれいば！", category_id: "japan-lifestyle", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-game-cmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-19", name: "ワンニャンチャンネル", category_id: "japan-lifestyle", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-pet-cmaf-rakutenjp/playlist.m3u8", _source: "m3u" },
    { stream_id: "japan-extra-20", name: "九州・沖縄 街ネタ", category_id: "japan-lifestyle", stream_icon: "", stream_url: "https://cdn-uw2-prod.tsv2.amagi.tv/linear/amg01287-rakutentvjapan-local-contents-cmaf-rakutenjp/playlist.m3u8", _source: "m3u" }
  ];

    var japanPlaylistUrl = "https://iptv-org.github.io/iptv/countries/jp.m3u";
  // Direct public audio endpoints (MP3). All three returned audio bytes in
  // a US network check on 2026-11-07. Shonan's URL comes from its official site.
  var radioChannels = [
    { stream_id: "radio-wtmd", name: "WTMD 89.7 FM", category_id: "radio", stream_icon: "", stream_url: "https://wtmd-ice.streamguys1.com/wtmd.mp3", _radio: true, _source: "m3u" },
    { stream_id: "radio-wtmd-hd2", name: "WTMD HD2 — The Baltimore Channel", category_id: "radio", stream_icon: "", stream_url: "https://wtmd-ice.streamguys1.com/hd2.mp3", _radio: true, _source: "m3u" },
    { stream_id: "radio-shonan", name: "Shonan Beach FM 78.9", category_id: "radio", stream_icon: "", stream_url: "https://shonanbeachfm.out.airtime.pro/shonanbeachfm_c", _radio: true, _source: "m3u" },
    { stream_id: "radio-b97-nola", name: "B97 97.1 FM — New Orleans", category_id: "radio", stream_icon: "", stream_url: "https://live.amperwave.net/direct/audacy-wezbfmmp3-imc", _radio: true, _source: "m3u" },
    { stream_id: "radio-alt923-nola", name: "ALT 92.3 — New Orleans Alternative Rock", category_id: "radio", stream_icon: "", stream_url: "https://playerservices.streamtheworld.com/api/livestream-redirect/WZRHFM.mp3", _radio: true, _source: "m3u" },
    { stream_id: "radio-magic1019-nola", name: "Magic 101.9 — New Orleans", category_id: "radio", stream_icon: "", stream_url: "https://live.amperwave.net/direct/audacy-wlmgfmmp3-imc", _radio: true, _source: "m3u" },
    { stream_id: "radio-wfmf1025-br", name: "102.5 WFMF — Baton Rouge", category_id: "radio", stream_icon: "", stream_url: "https://stream.revma.ihrhls.com/zc1005", _radio: true, _source: "m3u" },
    { stream_id: "radio-wnoe1011-nola", name: "101.1 WNOE Country — New Orleans", category_id: "radio", stream_icon: "", stream_url: "https://stream.revma.ihrhls.com/zc1045", _radio: true, _source: "m3u" }
  ];

  // This is a self-contained web app, not an M3U8 feed. It renders the
  // ORIGINAL pinned WeatherStar 4000+ 8.2.2 code and bundled music.
  var weatherChannels = [
    { stream_id: "local-weatherstar-4000", name: "WeatherStar 4000+ — Local Forecast",
      category_id: "retro-weather", stream_icon: "", stream_url: "../weatherstar/index.html",
      _weatherstar: true, _source: "local" }
  ];

  var categories = [
    { category_id: "toonami", category_name: "Toonami Aftermath" },
    { category_id: "retro-weather", category_name: "Retro Weather" },
    { category_id: "radio", category_name: "Radio Stations" },
    { category_id: "japan", category_name: "Japan TV (IPTV-org)" },
    { category_id: "japan-news", category_name: "Japan — News" },
    { category_id: "japan-anime", category_name: "Japan — Anime & Kids" },
    { category_id: "japan-entertainment", category_name: "Japan — Entertainment" },
    { category_id: "japan-music", category_name: "Japan — Music" },
    { category_id: "japan-lifestyle", category_name: "Japan — Lifestyle" }
  ];
  var status = document.getElementById("status");

  // Only accept direct HTTP(S) stream URLs from the external M3U list.
  // Source URL, names and logos are data, not scripts or executable code.
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
    japanese = japanese.filter(function (ch) { return !seenUrls[ch.stream_url]; });
    allChannels = toonamiChannels.concat(weatherChannels, verifiedJapanExtras, radioChannels, japanese);
    updateSidebarActive();
    applyFilters(true);
    status.textContent = allChannels.length + " channels (4 Toonami + 1 WeatherStar + " +
        verifiedJapanExtras.length + " verified extras + 8 radio + " + japanese.length +
        " Japan directory" + (cached ? ", cached" : "") + ")";
    return true;
  }

  epgCache = loadEpgDiskCache();
  allChannels = toonamiChannels.concat(weatherChannels, verifiedJapanExtras, radioChannels);
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
    status.textContent = hasJapan
      ? "Japan TV: using cached channels (refresh failed)"
      : allChannels.length + " channels - Japan directory unavailable (" + (err.message || "network error") + ")";
  });

}());
