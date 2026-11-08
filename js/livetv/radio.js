/* radio.js — Bunkhouse Saturn radio deck, now-playing metadata and artwork.
 * Compatible with packaged webOS TV apps; runs with no server or root.
 *
 * Playback: exactly ONE native <audio> element; normal video player is stopped
 * before entry. No AudioContext.createMediaElementSource: LG webOS TV's official
 * documentation says it is unsupported, and touching protected streams risks
 * silencing them. Equalizer bars are an honest synthetic animation, not
 * decoded PCM from the stream.
 *
 * Metadata: direct public CORS endpoints where available (Triton for WZRH,
 * Airtime / ICY for Shonan). Other direct streams often send ICY tags but
 * block the browser's preflight required by the Icy-MetaData header; we try
 * only once and then show a truthful "unavailable" status.
 *
 * Artwork: Apple iTunes Search API JSONP; Apple documents the callback option
 * for browser apps. Only public artist/title are sent. Results are cached.
 */
var RadioDeck = (function () {
    "use strict";
    var current = null;
    var requestSerial = 0;
    var infoTimer = null;
    var frame = null;
    var initDone = false;
    var pollFailures = {};
    var artRequest = null;
    var artTimer = null;
    var artSeq = 0;
    var artCache = {};
    var currentTrackKey = "";
    var lastDraw = 0;
    var renderFrame = 0;
    var noMetadataMessage = "Waiting for station metadata…";
    var historyByStation = {};
    var nowByStation = {};
    var equalizerBars = [];
    /** Render the active station's real, observed track history.
     * @returns {void} Updates module state or the UI.
     */
    function renderHistory() {
        var list = $("radio-history-list");
        if (!list) return;
        list.textContent = "";
        var entries = current && historyByStation[current.stream_id] || [];
        if (!entries.length) {
            var empty = document.createElement("li");
            empty.className = "bk-no-history";
            empty.textContent = "Previous songs appear here when this station provides track history.";
            list.appendChild(empty);return;
        }
        entries.slice(0,12).forEach(function (entry) {
            var row = document.createElement("li");
            var song = document.createElement("span");
            song.className = "bk-history-song";
            song.textContent = (entry.artist ? entry.artist + " — " : "") + entry.title;
            row.appendChild(song);
            if (entry.time && isFinite(entry.time)) {
                var when = document.createElement("span");
                when.className = "bk-history-when";
                when.textContent = new Date(entry.time).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
                row.appendChild(when);
            }
            list.appendChild(row);
        });
    }
    /** Save the previous song when a station reports a new track.
     * @param {string} artist - Reported artist name.
     * @param {string} title - Reported track title.
     * @returns {void} Updates module state or the UI.
     */
    function rememberTrack(artist, title) {
        if (!current) return;
        var id = current.stream_id, key = normal(artist) + "|" + normal(title);
        var previous = nowByStation[id];
        var entries = historyByStation[id] || [];
        if (previous && previous.key !== key && previous.title) {
            entries = [previous].concat(entries.filter(function (item) { return item.key !== previous.key; })).slice(0,12);
            historyByStation[id] = entries;
        }
        nowByStation[id] = { artist:artist,title:title,key:key,time:Date.now() };
        renderHistory();
    }


    /** Find a page element by its ID.
     * @param {string} id - DOM element or stored object ID.
     * @returns {HTMLElement|null} Value described above.
     */
    function $(id) { return document.getElementById(id); }
    /** Set a DOM element's text safely.
     * @param {string} id - DOM element or stored object ID.
     * @param {string} text - Text to display or parse.
     * @returns {void} Updates module state or the UI.
     */
    function safeText(id, text) { var node = $(id); if (node) node.textContent = text || ""; }
    /** Return the current radio audio element.
     * @returns {HTMLAudioElement|null} Value described above.
     */
    function audio() { return $("radio-audio"); }
    /** Check that RadioDeck still owns the selected channel.
     * @returns {boolean} Value described above.
     */
    function isActive() { return !!current && typeof currentChannel !== "undefined" && currentChannel === current; }
    /** Check whether native radio audio is actually ready and playing.
     * @returns {boolean} Value described above.
     */
    function playing() { var a = audio(); return !!a && !a.paused && a.readyState > 1; }
    /* Never reuse a native audio decoder across different live stations.
     * Certain webOS versions can complete a previous network tune after src
     * has already changed, making the UI show a new station while the decoder
     * continues playing bytes from the previous one. A fresh DOM media element
     * provides a fresh native pipeline; late events from the old node are
     * ignored even when the TV dispatches them after removal.
     */
    /** Bind playback status to a single specific audio element.
     * @param {HTMLAudioElement} a - Native audio element for this tune.
     * @returns {void} Updates module state or the UI.
     */
    function bindAudioEvents(a) {
        if (!a) return;
        /** Check whether this event belongs to the current audio element.
         * @returns {boolean} Value described above.
         */
        function active() { return a === audio() && isActive(); }
        a.addEventListener("playing", function () {
            if (!active()) return;
            safeText("radio-status", "LIVE · Listening");
            safeText("radio-toggle", "Pause");
            startAnimation();
        });
        a.addEventListener("waiting", function () {
            if (active()) safeText("radio-status", "Buffering live radio…");
        });
        a.addEventListener("pause", function () {
            if (!active() || !a.getAttribute("src")) return;
            safeText("radio-status", "Paused");
            safeText("radio-toggle", "Play");
        });
        a.addEventListener("error", function () {
            if (!active()) return;
            safeText("radio-status", "Stream unavailable — try again");
            safeText("radio-toggle", "Retry");
        });
    }
    /** Stop and replace the native decoder so old stations cannot leak into a new tune.
     * @returns {HTMLAudioElement|null} Value described above.
     */
    function releaseAudio() {
        var old = audio();
        if (!old) return null;
        // Invalidate and close the old connection before making the next one.
        try { old.pause(); } catch (_) {}
        try { old.removeAttribute("src"); } catch (_) {}
        try { old.load(); } catch (_) {}
        var parent = old.parentNode;
        if (!parent) return old;
        var fresh = document.createElement("audio");
        fresh.id = "radio-audio";
        fresh.preload = "none";
        parent.replaceChild(fresh, old);
        bindAudioEvents(fresh);
        return fresh;
    }

    /** Normalize text for artist/title matching.
     * @param {string} s - Text to normalize.
     * @returns {string} Value described above.
     */
    function normal(s) { return String(s || "").toLowerCase().normalize ? String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, " ").trim() : String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

    /** Restore the bounded album-art lookup cache.
     * @returns {void} Updates module state or the UI.
     */
    function loadArtworkCache() {
        try {
            var old = JSON.parse(localStorage.getItem("radio_deck_art_v1") || "{}");
            if (old && typeof old === "object") artCache = old;
        } catch (_) {}
    }
    /** Persist a bounded cache of album artwork matches.
     * @returns {void} Updates module state or the UI.
     */
    function cacheArtwork() {
        try {
            var names = Object.keys(artCache);
            if (names.length > 55) {
                names.sort(function (a,b) { return (artCache[b].ts || 0) - (artCache[a].ts || 0); });
                var recent = {}; names.slice(0, 55).forEach(function (k) { recent[k] = artCache[k]; });
                artCache = recent;
            }
            localStorage.setItem("radio_deck_art_v1", JSON.stringify(artCache));
        } catch (_) {}
    }
    /** Cancel the pending album-art lookup and timer.
     * @returns {void} Updates module state or the UI.
     */
    function cancelArtwork() {
        if (artTimer) { clearTimeout(artTimer); artTimer = null; }
        if (artRequest) {
            var req = artRequest; artRequest = null;
            try { delete window[req.callback]; } catch (_) { window[req.callback] = undefined; }
            if (req.script.parentNode) req.script.parentNode.removeChild(req.script);
        }
    }
    /** Return the album-art panel to its placeholder.
     * @returns {void} Updates module state or the UI.
     */
    function resetArtwork() {
        var img = $("radio-cover");
        if (img) {
            img.style.display = "none";
            img.removeAttribute("src");
        }
        var placeholder = $("radio-cover-placeholder");
        if (placeholder) placeholder.style.display = "flex";
        var link = $("radio-art-source");
        if (link) { link.style.display = "none"; link.removeAttribute("href"); }
        safeText("radio-album", "");
    }
    /** Display a verified album cover and catalog link.
     * @param {Object} entry - Cover or cached metadata entry.
     * @returns {void} Updates module state or the UI.
     */
    function showArtwork(entry) {
        if (!entry || !entry.art || !/^https:\/\//i.test(entry.art)) { resetArtwork(); return; }
        var image = $("radio-cover");
        image.onload = function () {
            if (this !== $("radio-cover")) return;
            this.style.display = "block";
            $("radio-cover-placeholder").style.display = "none";
        };
        image.onerror = function () {
            this.style.display = "none";
            $("radio-cover-placeholder").style.display = "flex";
        };
        image.src = entry.art;
        safeText("radio-album", entry.album);
        var link = $("radio-art-source");
        if (link && /^https:\/\/(?:music\.apple\.com|itunes\.apple\.com)\//i.test(entry.url || "")) {
            link.href = entry.url;
            link.style.display = "inline";
        }
    }
    /** Look up matching album artwork through iTunes JSONP.
     * @param {string} artist - Reported artist name.
     * @param {string} title - Reported track title.
     * @param {number} gen - Request generation token.
     * @returns {void} Updates module state or the UI.
     */
    function lookupArtwork(artist, title, gen) {
        cancelArtwork();
        resetArtwork();
        if (!artist || !title) return;
        var key = normal(artist) + "|" + normal(title);
        var cached = artCache[key];
        if (cached && Date.now() - cached.ts < 7 * 86400000) {
            if (cached.art) showArtwork(cached);
            return;
        }
        // iTunes permits a callback query (JSONP), useful on file:// webOS apps
        // where an ordinary cross-origin fetch may be rejected by CORS.
        var callback = "__radioDeckArt" + (++artSeq);
        var script = document.createElement("script");
        var q = encodeURIComponent(artist + " " + title);
        var search = "https://itunes.apple.com/search?term=" + q +
            "&media=music&entity=song&limit=8&country=us&callback=" + callback;
        var finished = false;
        var req = { callback: callback, script: script };
        artRequest = req;
        /** Accept artwork only when the track, station and request are still current.
         * @param {Object} data - Provider response or result.
         * @returns {void} Updates module state or the UI.
         */
        function finish(data) {
            if (finished) return;
            finished = true;
            if (artTimer) { clearTimeout(artTimer); artTimer = null; }
            if (artRequest === req) artRequest = null;
            try { delete window[callback]; } catch (_) { window[callback] = undefined; }
            if (script.parentNode) script.parentNode.removeChild(script);
            if (gen !== requestSerial || !isActive() || currentTrackKey !== key) return;
            var best = null, bestScore = 0;
            var results = data && Array.isArray(data.results) ? data.results : [];
            results.forEach(function (result) {
                if (!result || !result.artworkUrl100) return;
                var ra = normal(result.artistName), rt = normal(result.trackName);
                var aa = normal(artist), tt = normal(title);
                var score = (ra === aa ? 6 : (ra.indexOf(aa) !== -1 || aa.indexOf(ra) !== -1 ? 3 : 0)) +
                            (rt === tt ? 8 : (rt.indexOf(tt) !== -1 || tt.indexOf(rt) !== -1 ? 4 : 0));
                if (score > bestScore) { best = result; bestScore = score; }
            });
            var entry = { ts: Date.now(), art: "", album: "", url: "" };
            // A wrong album is worse than no album. Require matching artist AND title.
            if (best && bestScore >= 9) {
                entry.art = String(best.artworkUrl100).replace(/^http:/, "https:").replace(/100x100/, "600x600");
                entry.album = String(best.collectionName || "");
                entry.url = String(best.trackViewUrl || "");
            }
            artCache[key] = entry;
            cacheArtwork();
            if (entry.art) showArtwork(entry);
        }
        window[callback] = finish;
        script.onerror = function () { finish(null); };
        script.async = true;
        script.src = search;
        artTimer = setTimeout(function () { finish(null); }, 9000);
        document.head.appendChild(script);
    }

    /** Update current track details and its cover.
     * @param {string} artist - Reported artist name.
     * @param {string} title - Reported track title.
     * @param {Object} artwork - Provider artwork, if supplied.
     * @returns {void} Updates module state or the UI.
     */
    function displayTrack(artist, title, artwork) {
        artist = String(artist || "").trim();
        title = String(title || "").trim();
        if (!title || /commercial break|preroll|^ad\||(^|\s)offline($|\s)/i.test(title)) return;
        if (/\.(?:mp3|wav|aac)(?:\s|$)/i.test(title)) return;
        var key = normal(artist) + "|" + normal(title);
        if (key === currentTrackKey) return;
        rememberTrack(artist, title);
        currentTrackKey = key;
        safeText("radio-track", title);
        safeText("radio-artist", artist || "Live broadcast");
        safeText("radio-metadata-state", "LIVE TRACK DATA");
        // Prefer first-party broadcaster artwork when one is available.
        if (artwork && artwork.art && /^https:\/\//.test(artwork.art)) {
            cancelArtwork();
            resetArtwork();
            showArtwork(artwork);
        } else {
            lookupArtwork(artist, title, requestSerial);
        }
    }
    /** Parse an ICY station metadata title string.
     * @param {string} text - Text to display or parse.
     * @returns {void} Updates module state or the UI.
     */
    function fromCombinedText(text) {
        text = String(text || "").replace(/\0/g, "").trim();
        if (!text || /^ad\||commercial break|^offline$/i.test(text)) return;
        // iHeart's ICY format embeds title="...",artist="..." inside StreamTitle.
        var iheartTitle = /(?:^|,)title="([^"]+)"/i.exec(text);
        var iheartArtist = /(?:^|,)artist="([^"]+)"/i.exec(text);
        if (iheartTitle) { displayTrack(iheartArtist && iheartArtist[1], iheartTitle[1]); return; }
        var dash = text.indexOf(" - ");
        if (dash > 0) displayTrack(text.slice(0,dash), text.slice(dash+3));
        else displayTrack("", text);
    }

    /** Fetch ALT 92.3's current track from Triton.
     * @param {Object} ch - Channel entry with stream_id, name and source fields.
     * @returns {Promise<void>} Completion of the asynchronous operation.
     */
    function metaFromTriton(ch) {
        var url = "https://np.tritondigital.com/public/nowplaying?mountName=WZRHFM&numberToFetch=1&eventType=track";
        return fetch(url, { cache: "no-store" }).then(function (r) {
            if (!r.ok) throw Error("Metadata HTTP " + r.status);
            return r.text();
        }).then(function (xml) {
            if (!isActive() || current !== ch) return;
            var doc = new DOMParser().parseFromString(xml, "text/xml");
            var props = doc.getElementsByTagName("property"), vals = {};
            for (var i=0;i<props.length;i++) {
                vals[props[i].getAttribute("name")] = props[i].textContent || "";
            }
            var title = vals.cue_title || vals.title || vals.track_title || "";
            var artist = vals.cue_artist || vals.cue_artist_name || vals.artist || vals.track_artist_name || vals.track_artist || "";
            if (title) displayTrack(artist, title);
        });
    }
    /** Fetch Shonan's now-playing details from Airtime.
     * @param {Object} ch - Channel entry with stream_id, name and source fields.
     * @returns {Promise<void>} Completion of the asynchronous operation.
     */
    function metaFromAirtime(ch) {
        return fetch("https://shonanbeachfm.airtime.pro/api/live-info", { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw Error("Airtime HTTP " + r.status); return r.json(); })
        .then(function (data) {
            if (!isActive() || current !== ch) return;
            var cur = data && data.current;
            if (cur) {
                var m = cur.metadata || {};
                var title = m.title || cur.name || "";
                var artist = m.artist || "";
                if (title) displayTrack(artist, title);
            }
        });
    }
    /** Fetch iHeart current track plus broadcaster song history.
     * @param {Object} ch - Channel entry with stream_id, name and source fields.
     * @returns {Promise<void>} Completion of the asynchronous operation.
     */
    function metaFromIheart(ch) {
        // Public trackHistory is CORS enabled as of Nov 2026. It reports the
        // station's own artist, song and album art without scraping an app.
        var id = ch.stream_id === "radio-wfmf1025-br" ? "1005"
               : ch.stream_id === "radio-wnoe1011-nola" ? "1045" : null;
        if (!id) return Promise.reject(Error("No iHeart station ID"));
        return fetch("https://api.iheart.com/api/v3/live-meta/stream/" + id + "/trackHistory", { cache: "no-store" })
        .then(function (r) {
            if (!r.ok) throw Error("iHeart metadata HTTP " + r.status);
            return r.json();
        }).then(function (json) {
            if (!isActive() || current !== ch) return;
            var songs = json && Array.isArray(json.data) ? json.data : [];
            if (!songs.length) return;
            var now = Date.now();
            var valid = songs.filter(function (song) {
                if (!song || !song.title || !song.artist) return false;
                var date = typeof song.startTime === "number" ? song.startTime : Date.parse(song.startTime);
                if (isFinite(date)) {
                    if (date > 0 && date < 100000000000) date *= 1000;
                    song._radioStart = date;
                    if (date > now + 45000) return false; // never show future songs
                }
                return true;
            });
            if (!valid.length) return;
            valid.sort(function (a,b) { return (b._radioStart || 0) - (a._radioStart || 0); });
            var top = valid[0];
            // This endpoint supplies *real* recently played tracks, unlike
            // most Icecast stations that expose only the current song.
            historyByStation[ch.stream_id] = valid.slice(1,12).map(function(song){
                return { artist:String(song.artist),title:String(song.title),
                         key:normal(song.artist)+"|"+normal(song.title),
                         time:song._radioStart || null };
            });
            renderHistory();
            var imageUrl = String(top.imagePath || "");
            // iHeart returns http:// image links despite HTTPS-capable CDN.
            if (/^http:\/\//i.test(imageUrl)) imageUrl = "https://" + imageUrl.slice(7);
            var cover = /^https:\/\//i.test(imageUrl)
                ? { art: imageUrl, album: String(top.album || ""), url: "" }
                : null;
            displayTrack(top.artist, top.title, cover);
        });
    }
    /** Attempt to read a single ICY metadata block.
     * @param {Object} ch - Channel entry with stream_id, name and source fields.
     * @returns {Promise<void>} Completion of the asynchronous operation.
     */
    function metaFromIcy(ch) {
        // Streaming ICY isn't exposed by <audio> in webOS. A short, separate
        // CORS request can read tags only on hosts that allow icy-metadata
        // preflight (Shonan's Icecast does; others vary by network/provider).
        var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        var killer = setTimeout(function () { if (controller) controller.abort(); }, 7000);
        var headers = { "Icy-MetaData": "1" };
        var opts = { headers: headers, cache: "no-store" };
        if (controller) opts.signal = controller.signal;
        return fetch(ch.stream_url, opts).then(function (r) {
            if (!r.ok) throw Error("ICY HTTP " + r.status);
            var interval = parseInt(r.headers.get("icy-metaint"),10);
            if (!(interval > 0 && interval <= 65536) || !r.body || !r.body.getReader) throw Error("ICY not readable");
            var reader = r.body.getReader(), bytes = [], needed = interval + 1;
            // Consume only enough bytes for one metadata frame; never download
            // the whole endless radio stream or store user listening history.
            /** Read one ICY metadata block without downloading an entire stream.
             * @returns {Promise<void>} Completion of the asynchronous operation.
             */
            function consume() {
                return reader.read().then(function (packet) {
                    if (packet.done) throw Error("ICY ended");
                    var chunk = packet.value;
                    for (var j=0;j<chunk.length && bytes.length<needed;j++) bytes.push(chunk[j]);
                    if (bytes.length < needed) return consume();
                    needed = interval + 1 + bytes[interval]*16;
                    for (;j<chunk.length && bytes.length<needed;j++) bytes.push(chunk[j]);
                    if (bytes.length < needed) return consume();
                    try { reader.cancel(); } catch (_) {}
                    var chars = "";
                    for (var k=interval+1;k<needed;k++) chars += String.fromCharCode(bytes[k]);
                    var match = /StreamTitle='([^']*)'/.exec(chars);
                    if (match && isActive() && current === ch) fromCombinedText(match[1]);
                });
            }
            return consume();
        }).then(function (r) { clearTimeout(killer); if (controller) controller.abort(); return r; },
                 function (e) { clearTimeout(killer); if (controller) controller.abort(); throw e; });
    }
    /** Use the appropriate metadata provider for this station.
     * @param {Object} ch - Channel entry with stream_id, name and source fields.
     * @returns {void} Updates module state or the UI.
     */
    function pollMetadata(ch) {
        if (!isActive() || current !== ch || document.hidden) return;
        var method = "";
        if (ch.stream_id === "radio-alt923-nola") method = "triton";
        else if (ch.stream_id === "radio-shonan") method = "shonan";
        else if (ch.stream_id === "radio-wfmf1025-br" || ch.stream_id === "radio-wnoe1011-nola") method = "iheart";
        else method = "icy";
        // Retry metadata after five minutes. A temporary provider failure
        // must not disable song titles until the app is restarted.
        var badKey = ch.stream_id + "|" + method;
        if (pollFailures[badKey] && Date.now() - pollFailures[badKey] < 300000) return;
        var promise = method === "triton" ? metaFromTriton(ch)
            : method === "shonan" ? metaFromIcy(ch).catch(function () { return metaFromAirtime(ch); })
            : method === "iheart" ? metaFromIheart(ch)
            : metaFromIcy(ch);
        promise.then(function () {
            delete pollFailures[badKey];
        }, function () {
            pollFailures[badKey] = Date.now();
            if (isActive() && current === ch && !currentTrackKey) {
                safeText("radio-metadata-state", "Song data unavailable from this station");
            }
        });
    }
    /** Stop this station's metadata polling timer.
     * @returns {void} Updates module state or the UI.
     */
    function clearPoll() { if (infoTimer) { clearInterval(infoTimer); infoTimer = null; } }
    /** Animate the deliberately synthetic equalizer bars.
     * @returns {void} Updates module state or the UI.
     */
    function drawTrace() {
        var now = Date.now();
        if (now - lastDraw < 48) return; // ~20fps; lightweight on older TVs
        lastDraw = now;
        renderFrame++;
        // No Web Audio access on this platform. This is deliberately synthetic,
        // with motion gated by playback state, NOT by sampled audio amplitudes.
        var active = playing(), t = renderFrame;
        for (var i=0;i<equalizerBars.length;i++) {
            var amount = active ? (16 + 75*Math.abs(
                Math.sin(t*.135+i*.47)*.55 +
                Math.sin(t*.083-i*.61)*.32 +
                Math.sin(t*.035+i*.19)*.13
            )) : 4;
            equalizerBars[i].style.height = Math.min(98,amount).toFixed(0)+"%";
        }
        var led = $("bk-live-led");
        if (led) led.style.opacity = active ? ".93" : ".45";
    }
    /** Draw one synthetic equalizer frame and schedule the next.
     * @returns {void} Updates module state or the UI.
     */
    function animate() {
        if(!current || document.hidden){frame=null;return;}
        drawTrace();
        frame=requestAnimationFrame(animate);
    }
    /** Start the equalizer loop when not already running.
     * @returns {void} Updates module state or the UI.
     */
    function startAnimation() {
        if(!frame && typeof requestAnimationFrame === "function")frame=requestAnimationFrame(animate);
    }
    /** Register radio controls and create equalizer bars once.
     * @returns {void} Updates module state or the UI.
     */
    function init() {
        if (initDone) return;
        initDone = true;
        loadArtworkCache();
        var a=audio();
        var toggle=$("radio-toggle");
        var eq = $("bk-equalizer");
        if (eq) {
            eq.textContent = "";
            for (var j=0;j<30;j++) {
                var bar = document.createElement("span");
                bar.className = "bk-eq-bar";
                bar.style.height = (5+(j%5)*2) + "%";
                eq.appendChild(bar);
                equalizerBars.push(bar);
            }
        }
        bindAudioEvents(a);
        toggle.addEventListener("click",function(e){
            e.stopPropagation();
            if(!isActive())return;
            var a=audio(), selected=current, serial=requestSerial;
            if(!a)return;
            if(a.paused){
                safeText("radio-status","Connecting…");
                var attempt;
                try{attempt=a.play();}catch(_){safeText("radio-status","Press Play to start");return;}
                if(attempt && attempt.catch)attempt.catch(function(){
                    if(a===audio()&&serial===requestSerial&&isActive()&&current===selected){
                        safeText("radio-status","Press Play to start");
                        safeText("radio-toggle","Play");
                    }
                });
            }else a.pause();
        });
        /** Ask the app's station list to move by one station.
         * @param {number} dir - Station movement direction.
         * @returns {void} Updates module state or the UI.
         */
        function moveStation(dir) {
            if (typeof bunkhouseStationStep === "function") bunkhouseStationStep(dir);
        }
        var prev = $("radio-prev"), next = $("radio-next");
        if (prev) prev.addEventListener("click", function (e) { e.stopPropagation();moveStation(-1); });
        if (next) next.addEventListener("click", function (e) { e.stopPropagation();moveStation(1); });
        // Native LG transport buttons; no player-engine changes required.
        window.addEventListener("keydown",function(event){
            if(!isActive())return;
            var key=event.keyCode||event.which;
            if(key!==415 && key!==19 && key!==179)return;
            event.preventDefault();event.stopImmediatePropagation();
            var live=audio();if(!live)return;
            if(key===415 && !live.paused || key===19 && live.paused)return;
            toggle.click();
        },true);
        document.addEventListener("visibilitychange",function(){
            if(!document.hidden && current)startAnimation();
        });
    }
    /** Stop the previous decoder and start the requested radio URL.
     * @param {Object} ch - Channel entry with stream_id, name and source fields.
     * @returns {void} Updates module state or the UI.
     */
    function play(ch) {
        init();
        stop();
        current = ch;
        requestSerial++;
        currentTrackKey = "";
        renderHistory();
        safeText("radio-name",ch.name || "Internet Radio");
        var freq = /\b(\d{2,3}\.\d)\b/.exec(ch.name || "");
        safeText("radio-frequency",freq ? freq[1] : "NET");
        safeText("radio-track","Waiting for the next song");
        safeText("radio-artist","Live broadcast");
        safeText("radio-album","");
        safeText("radio-metadata-state",noMetadataMessage);
        safeText("radio-status","Connecting…");
        safeText("radio-toggle","Pause");
        resetArtwork();
        $("player").style.display="none";
        $("player-msg").style.display="none";
        $("radio-visual").style.display="flex";
        var a=audio(), tuneSerial=requestSerial;
        if(!a) {
            safeText("radio-status","Audio decoder unavailable");
            return;
        }
        a.src=ch.stream_url;
        var attempt;
        try{attempt=a.play();}
        catch(_){safeText("radio-status","Press Play to start");safeText("radio-toggle","Play");}
        if(attempt && attempt.catch)attempt.catch(function(){
            if(a===audio()&&tuneSerial===requestSerial&&isActive()&&current===ch){
                safeText("radio-status","Press Play to start");
                safeText("radio-toggle","Play");
            }
        });
        startAnimation();
        pollMetadata(ch);
        infoTimer=setInterval(function(){pollMetadata(ch);},30000);
    }
    /** Stop timers, audio, artwork and stale playback work.
     * @returns {void} Updates module state or the UI.
     */
    function stop() {
        clearPoll();
        cancelArtwork();
        requestSerial++;
        currentTrackKey="";
        current=null;
        if(frame){cancelAnimationFrame(frame);frame=null;}
        releaseAudio();
        var visual=$("radio-visual");if(visual)visual.style.display="none";
        var vid=$("player");if(vid)vid.style.display="block";
        resetArtwork();
    }
    return {init:init,play:play,stop:stop,isRadio:isActive};
}());
