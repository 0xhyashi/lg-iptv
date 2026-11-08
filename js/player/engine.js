/* player/engine.js — IPTVPlayer: tiered playback.
 *
 * Deliberately ONE class in ONE file. Its methods share a great deal of private
 * state -- the generation/token pair that invalidates superseded attempts, the
 * live hls.js instance, the attempt list and its cursor -- and splitting them
 * across files would hide that coupling behind prototype patching rather than
 * reduce it. What genuinely separates out already has: codec naming
 * (player/codecs.js), engine preference (player/preferences.js), subtitle
 * parsing and language names (data/subtitles.js), HTTP (core/net.js).
 *
 *   Tier 1  native <video>   (platform/hardware pipeline -- HEVC, HDR, Dolby)
 *   Tier 2  hls.js (MSE)     (software HLS demux -- H.264/AAC)
 *   Tier 3  native on .ts    (raw MPEG-TS via the platform; live only)
 *
 * Auto-advance happens ONLY on a real `error` or a genuine no-data stall.
 * "Playing" = success; a stream that is actually running is never second-
 * guessed (an earlier decoded-frame heuristic falsely failed HDR playback). If
 * a stream plays but is black, the user cycles engines manually with RED.
 * The one exception is a LIVE channel whose picture stops moving altogether
 * after it was playing — see "Live freeze recovery" below.
 *
 * Remote: RED = cycle engine, GREEN = diagnostics, YELLOW = lowest quality.
 */

/* ── Live freeze recovery ─────────────────────────────────────────────────────
   A live HLS playlist only lists the last ~30s of the channel; the player has
   to keep re-fetching it to get further. When that refresh stops working the
   stream plays out what it had and then freezes — no error event, nothing for
   the tier logic to react to — and the only way out used to be changing
   channel by hand, which "fixed" it for another 30s. (Reported on webOS 26,
   which plays live .m3u8 natively; see _recoverStall for what is tried.)

   LIVE_STALL_MS is how long the picture may stand still before it counts as a
   freeze rather than a rebuffer. LIVE_HINT_AFTER_MS is how long HLS.js must
   run cleanly after rescuing a frozen native stream before the app concludes
   that, on this TV, live channels should start on HLS.js. */
var LIVE_STALL_MS      = 8000;
var LIVE_HINT_AFTER_MS = 120000;
var PLAYBACK_LOG_KEY   = "iptv_playback_log";

/* Freezes and recoveries, newest first, for Settings → Diagnostics. The GREEN
   overlay shows the current stream's history, but only while it is open — this
   is what lets a "it froze earlier" report be checked after the fact. */
/** logPlaybackEvent for the player's diagnostics.
 * @param {string} text - Diagnostic message.
 * @returns {void} Logs a message.
 */
function _logPlaybackEvent(text) {
    if (typeof Store === "undefined") return;
    var log = Store.get(PLAYBACK_LOG_KEY, []);
    if (!Array.isArray(log)) log = [];
    log.unshift({ ts: Date.now(), text: text });
    Store.set(PLAYBACK_LOG_KEY, log.slice(0, 10));
}

/* Where the loaded subtitles came from, or why there are none — the companion
   to the episode line, and the answer to "why are there no subtitles" that used
   to require guessing. */
/** subsDiag for the player's diagnostics.
 * @returns {string} A short diagnostic summary.
 */
function _subsDiag() {
    if (typeof PlayerSubs === "undefined") return "module not loaded";
    var line = PlayerSubs.describe();
    /* ASS files are drawn outside the text-track machinery, so none of their
       failure modes — fetch refused, file parsed to zero dialogue lines, overlay
       never sized — show up in the counts above. Appended only when there is
       actually an ASS file, so the common case keeps its short line. */
    if (typeof AssSubs !== "undefined" && AssSubs.count()) {
        line += "\n          ass: " + AssSubs.describe();
    }
    return line;
}

/* One line for the GREEN diagnostics overlay explaining the Next-episode
   button's state. There is no console on a TV, so "the button isn't there" is
   otherwise unanswerable: this says whether a season was found, where in it we
   are, and therefore whether a next episode exists at all. */
/** episodeDiag for the player's diagnostics.
 * @returns {string} A short diagnostic summary.
 */
function _episodeDiag() {
    if (typeof Episodes === "undefined") return "module not loaded";
    return Episodes.describe ? Episodes.describe()
         : (Episodes.hasNext() ? "next = " + Episodes.nextLabel() : "no next episode");
}

class IPTVPlayer {
    /* `opts` exists for Multiview, which needs several independent players on
       one page. Everything it changes is about being a SECONDARY player:
         video     the element to drive (defaults to the page's #player)
         wrap      where overlays are appended (defaults to #pip-wrap)
         msgEl     where status/error text goes (defaults to #player-msg)
         keys      false to skip the global RED/GREEN/YELLOW bindings, so four
                   tiles don't all react to one button press
         lightBuffer  smaller HLS buffers — four streams at the default 24s of
                   buffered video is far more memory than a TV will give us
       Called with no arguments it behaves exactly as it always has.          */
    /** Initialize this player with one video element and its independent fallback state.
     * @param {Object} opts - Player options, including video and message elements.
     * @returns {void} Updates decoder state or the video UI.
     */
    constructor(opts) {
        opts = opts || {};
        this.video    = opts.video || document.getElementById("player");
        this._pipWrap = opts.wrap  || document.getElementById("pip-wrap");
        this._msgEl   = opts.msgEl || null;   // resolved lazily; see _msg()
        this._lightBuffer = !!opts.lightBuffer;
        this.hls      = null;
        this._watchdog = null;
        this._gen      = 0;   // bumped per play()    — neutralises a previous channel
        this._tok      = 0;   // bumped per attempt   — neutralises a previous tier
        this._manual   = false;
        this._lowQuality = false;
        this._playingSince = 0;   // Date.now() once the current attempt reaches 'playing'
        this._diag     = [];
        this._codecs   = null;
        this._res      = "";
        this._activeEngine = "";
        this.video.tabIndex = -1;   // input handled by dpad.js
        try { this.video.classList.add("subs-" + (localStorage.getItem("vod_subs_size") || "md")); }
        catch (_) { this.video.classList.add("subs-md"); }
        this.applySubStyle(this.getSubStyle());
        this.applySubColour(this.getSubColour());
        this._watchTextTracks();
        if (opts.keys !== false) this._setupKeys();
    }

    /* Releases the decoder but keeps the instance usable — play() afterwards
       starts cleanly. Live TV calls this before opening Multiview: leaving the
       preview stream running would hold one of the TV's limited decode
       pipelines for a video that is no longer on screen, and the last tile of
       the grid would fail for no visible reason. */
    /** Invalidate playback requests and release the video decoder without destroying the player.
     * @returns {void} Updates decoder state or the video UI.
     */
    stop() {
        this._gen++;
        this._tok++;
        this._clearWatchdog();
        this._resetVideo();
        this._activeEngine = "";
        this._playingSince = 0;
    }

    /* Frees the decoder and every listener. Multiview tears down up to four of
       these when it closes; leaving one attached keeps a hardware decode
       pipeline reserved, and the main player then can't start. */
    /** Destroy playback and remove all owned event handlers.
     * @returns {void} Updates decoder state or the video UI.
     */
    destroy() {
        this._gen++;                 // neutralise any in-flight attempt
        this._tok++;
        this._clearWatchdog();
        if (this._cueWatch) { clearInterval(this._cueWatch); this._cueWatch = null; }
        if (this._diagTimer) { clearInterval(this._diagTimer); this._diagTimer = null; }
        this._resetVideo();
        (this._extSubs || []).forEach(function (t) {
            try { URL.revokeObjectURL(t.blobUrl); } catch (_) {}
        });
        this._extSubs = [];
    }

    // ── Remote color-button shortcuts ───────────────────────────────────────────
    // Bound in the CAPTURE phase on window, and player/engine.js loads before
    // dpad.js — so this listener sees every press first and nothing downstream
    // can take these keys away. That is what the Multiview guard is for: while
    // the grid is open this player is stopped and off screen, and RED would
    // otherwise cycle the engine of a stream nobody is watching (then start it
    // playing again, stealing a decoder from the grid).
    /** Setup Keys for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _setupKeys() {
        const self = this;
        window.addEventListener("keydown", function (e) {
            if (typeof Multiview !== "undefined" && Multiview.isOpen()) return;
            const kc = e.keyCode || e.which;
            if (kc === 403 /* RED */ || kc === 67 /* 'c' */)            { e.preventDefault(); self.cycleEngine(); }
            else if (kc === 404 /* GREEN */ || kc === 68 /* 'd' */)     { e.preventDefault(); self._toggleDiag(); }
            else if (kc === 405 /* YELLOW */ || kc === 76 /* 'l' */)    { e.preventDefault(); self.tryLowestQuality(); }
        }, true);
    }

    // ── UI messages ─────────────────────────────────────────────────────────────
    // Resolved once and cached: a Multiview tile passes its own element, and the
    // main player falls back to the page's single #player-msg.
    /** Msg Target for the active video player.
     * @returns {HTMLElement|null} Matching element, or null.
     */
    _msgTarget() {
        if (this._msgEl === null) this._msgEl = document.getElementById("player-msg");
        return this._msgEl;
    }
    /** Msg for the active video player.
     * @param {string} text - Message to display.
     * @returns {void} Updates decoder state or the video UI.
     */
    _msg(text) {
        const el = this._msgTarget();
        if (el) { el.textContent = text; el.style.display = "flex"; }
    }
    /** Hide Msg for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _hideMsg() {
        const el = this._msgTarget();
        if (el) el.style.display = "none";
    }
    /** Show Error for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _showError() {
        this._lastError = this._diag.slice();   // technical detail → GREEN overlay only
        const diagStr = this._diag.join(" ");
        let hint = "This channel couldn’t be played right now.";
        if ((this._codecs && _isHevc(this._codecs.v)) || _isHevc(diagStr)) {
            hint = "This may be a 4K/HEVC channel — press RED to try another player, or use the HD version.";
        } else if (this._codecs && _isDolby(this._codecs.a)) {
            hint = "This channel uses Dolby audio — press RED to try another player, or use the HD version.";
        } else {
            hint = "Press RED to try a different player.";
        }
        const el = this._msgTarget();
        if (el) {
            el.innerHTML = '<div class="pm-title">Can’t play this channel</div><div class="pm-detail">' + _esc(hint) + "</div>";
            el.style.display = "flex";
        }
        if (typeof this.onError === "function") this.onError(hint);
    }
    // Brief centred toast (engine name when cycling).
    /** Flash for the active video player.
     * @param {string} text - Message to display.
     * @param {number} ms - Message duration in milliseconds.
     * @returns {void} Updates decoder state or the video UI.
     */
    _flash(text, ms) {
        let el = this._flashEl;
        if (!el) {
            el = document.createElement("div");
            el.style.cssText = "position:absolute;top:16px;left:50%;z-index:99999;" +
                "-webkit-transform:translateX(-50%);transform:translateX(-50%);" +
                "background:rgba(0,0,0,0.78);color:#fff;font:600 16px/1 'Outfit',-apple-system,sans-serif;" +
                "padding:12px 22px;border-radius:999px;pointer-events:none;";
            (this._pipWrap || document.body).appendChild(el);
            this._flashEl = el;
        }
        el.textContent = text;
        el.style.display = "block";
        clearTimeout(this._flashTimer);
        const self = this;
        this._flashTimer = setTimeout(function () { if (self._flashEl) self._flashEl.style.display = "none"; }, ms || 1500);
    }

    // ── Diagnostics overlay (GREEN) ─────────────────────────────────────────────
    /** Decoded Frames for the active video player.
     * @returns {number} Calculated numeric value.
     */
    _decodedFrames() {                       // display-only; never drives fallback
        const v = this.video;
        try {
            if (v.getVideoPlaybackQuality) {
                const q = v.getVideoPlaybackQuality();
                if (q && typeof q.totalVideoFrames === "number") return q.totalVideoFrames;
            }
        } catch (_) {}
        if (typeof v.webkitDecodedFrameCount === "number") return v.webkitDecodedFrameCount;
        return -1;
    }
    /** Toggle Diag for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _toggleDiag() {
        if (this._diagEl) {
            clearInterval(this._diagTimer); this._diagTimer = null;
            if (this._diagEl.parentNode) this._diagEl.parentNode.removeChild(this._diagEl);
            this._diagEl = null;
            return;
        }
        const el = document.createElement("div");
        el.style.cssText = "position:absolute;top:14px;left:14px;z-index:99999;background:rgba(0,0,0,0.82);" +
            "color:#43e57a;font:14px/1.65 monospace;padding:14px 18px;border-radius:12px;" +
            "pointer-events:none;white-space:pre-wrap;letter-spacing:0.3px;" +
            // Wrap rather than run off the edge — some of these lines are
            // full sentences now, and a diagnostic you can't read is useless.
            // pre-wrap alone only breaks at spaces, so a long comma-separated
            // key list still overflowed; anywhere/break-word lets it break
            // mid-run, which is what keeps the last keys on screen.
            "max-width:calc(100% - 28px);overflow-wrap:anywhere;word-break:break-word;";
        (this._pipWrap || document.body).appendChild(el);
        this._diagEl = el;
        const self = this;
        this._diagTimer = setInterval(function () { self._updateDiag(); }, 500);
        this._updateDiag();
    }
    // Compact summary of a track list. Deliberately reports BOTH the filtered
    // count and the raw count the platform reported: "0 shown / 0 raw" means the
    // platform exposed nothing at all (a hardware-pipeline limitation we can't
    // work around), whereas "0 shown / 2 raw" would mean the tracks are there
    // and this app is discarding them (our bug). Collapsing those two into one
    // "none exposed" made an unfixable case look identical to a fixable one.
    /** Track Summary for the active video player.
     * @param {Array} list - Items to summarize or reorder.
     * @param {Array} rawList - Native media tracks.
     * @param {boolean} apiPresent - Whether the browser exposes the track API.
     * @returns {string} Requested text value.
     */
    _trackSummary(list, rawList, apiPresent) {
        if (!apiPresent) return "API not available";
        const raw = rawList ? rawList.length : 0;
        if (!list || !list.length) {
            if (!raw) return "0 shown / 0 raw — platform exposed none";
            const kinds = [];
            for (let i = 0; i < raw && i < 6; i++) kinds.push(rawList[i].kind || "?");
            return "0 shown / " + raw + " raw [" + kinds.join(", ") + "]";
        }
        const names = [];
        for (let i = 0; i < list.length && i < 6; i++) {
            names.push(list[i].lang || list[i].label || ("#" + (i + 1)));
        }
        return list.length + " of " + raw + ": " + names.join(", ") + (list.length > 6 ? ", …" : "");
    }

    // Container + engine actually in use. The container is the deciding factor
    // for embedded tracks: Blink demuxes MP4/HLS itself and can surface in-band
    // tracks, but an MKV is handed straight to the platform decoder, which is
    // opaque to JavaScript — so its subtitle streams can never appear here.
    /** Source Desc for the active video player.
     * @returns {string} Requested text value.
     */
    _sourceDesc() {
        const a = this._attempts && this._attempts[this._attemptIdx];
        const url = (a && a.url) || this.video.currentSrc || "";
        const m = /\.([a-z0-9]{2,4})(?:\?|$)/i.exec(url.split("#")[0]);
        const ext = m ? "." + m[1].toLowerCase() : "?";
        return ext + "  via " + ((a && a.kind) || "?");
    }

    /** Update Diag for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _updateDiag() {
        if (!this._diagEl) return;
        const v = this.video, frames = this._decodedFrames();
        const audio = this.listAudioTracks();
        const subs  = this.listSubtitles();
        this._diagEl.textContent = [
            "engine  : " + (this._activeEngine || "—") + (this._manual ? " (manual)" : "") +
                "   tier " + ((this._attemptIdx || 0) + 1) + "/" + ((this._attempts && this._attempts.length) || 1),
            "res     : " + (v.videoWidth || 0) + "×" + (v.videoHeight || 0),
            "codec   : " + (this._codecs ? ((this._codecs.v || "?") + " / " + (this._codecs.a || "?")) : "n/a (native)"),
            "time    : " + (v.currentTime || 0).toFixed(1) + (isFinite(v.duration) ? " / " + v.duration.toFixed(1) : " (live)") + "   paused:" + v.paused + "   muted:" + v.muted + (this._autoMuted ? " (autoplay)" : ""),
            "ready   : " + v.readyState + "   network:" + v.networkState,
            "frames  : " + (frames < 0 ? "n/a" : frames),
            "audio   : " + this._trackSummary(audio, v.audioTracks, typeof v.audioTracks !== "undefined"),
            "subs    : " + this._trackSummary(subs, v.textTracks, typeof v.textTracks !== "undefined"),
            "source  : " + this._sourceDesc(),
            "sub adj : delay " + this.getSubDelay().toFixed(2) + "s   pos " + this.getSubPosition(),
            "episode : " + _episodeDiag(),
            "sub src : " + _subsDiag(),
            "error   : " + (v.error ? _mediaErrText(v.error) : "—"),
            "lowQ    : " + (this._lowQuality ? "on" : "off"),
            "freezes : " + (this._stalls || 0) + (this._stallEscalated ? "   (native → HLS.js tried)" : "") +
                (_liveEngineHint() ? "   live starts on: " + _liveEngineHint() : ""),
            "tried   : " + ((this._diag && this._diag.length) ? this._diag.join(" | ") : "—"),
            "",
            "(RED cycle · GREEN close · YELLOW lowest)"
        ].join("\n");
    }

    // ── Engine plumbing ─────────────────────────────────────────────────────────
    /** Destroy Hls for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    destroyHls() {
        if (this.hls) { try { this.hls.destroy(); } catch (_) {} this.hls = null; }
    }
    /** Clear Watchdog for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _clearWatchdog() {
        if (this._watchdog) { clearTimeout(this._watchdog); this._watchdog = null; }
    }
    /** Release native video and HLS without retaining decoder state.
     * @returns {void} Updates decoder state or the video UI.
     */
    _resetVideo() {
        this._stopStallWatch();
        this._dropAttemptListeners();
        try { this.video.pause(); } catch (_) {}
        this.destroyHls();
        this.video.removeAttribute("src");
        this.video.innerHTML = "";
        try { this.video.load(); } catch (_) {}
    }
    /** Check whether a delayed callback belongs to the current generation and tier.
     * @param {number} gen - Playback generation number.
     * @param {number} tok - Tier attempt token.
     * @returns {boolean} Whether the requested condition is met.
     */
    _alive(gen, tok) { return gen === this._gen && tok === this._tok; }

    /* A one-shot listener for the current attempt. `{ once: true }` is only
       understood from Chromium 55; before that (webOS 3 and 4) the options
       object reads as `capture: true` and the listener is never removed — so
       every channel change left four more listeners on the <video> for the
       life of the page, and the old 'playing' handlers kept firing on every
       later stall-and-resume. Tracked so a new attempt can drop the previous
       attempt's leftovers too. */
    /** Attach an explicitly cleaned-up one-shot listener for old webOS browsers.
     * @param {string} type - DOM event name.
     * @param {Function} fn - Event handler.
     * @returns {Function} Value described above.
     */
    _once(type, fn) {
        const v = this.video;
        const wrapped = function (e) { v.removeEventListener(type, wrapped); fn(e); };
        v.addEventListener(type, wrapped);
        (this._attemptListeners || (this._attemptListeners = [])).push([type, wrapped]);
        return wrapped;
    }
    /** Drop Attempt Listeners for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _dropAttemptListeners() {
        const v = this.video;
        (this._attemptListeners || []).forEach(function (p) { v.removeEventListener(p[0], p[1]); });
        this._attemptListeners = [];
    }

    /* video.play(), on every engine.
         • Before Chromium 50 (webOS 3) play() returns nothing, so the usual
           `.play().catch(…)` threw "cannot read property 'catch' of undefined"
           in the middle of starting a stream.
         • A refusal used to be swallowed without a trace. The one that matters
           is NotAllowedError — the browser's autoplay policy, which newer
           webOS builds can enforce on a page with no user gesture yet (the VOD
           player opens straight into playback). Muted playback is always
           allowed, so start muted and give the sound back on the next button
           press, rather than sitting on "Loading…" over a stream that would
           play fine. */
    /** Call native video play and handle autoplay restrictions.
     * @param {number} gen - Playback generation number.
     * @param {number} tok - Tier attempt token.
     * @returns {void} Updates decoder state or the video UI.
     */
    _play(gen, tok) {
        const self = this;
        let p;
        try { p = this.video.play(); } catch (_) { return; }
        if (!p || typeof p.then !== "function") return;
        p.then(null, function (err) {
            if (!self._alive(gen, tok)) return;
            const name = (err && err.name) || "";
            if (name === "NotAllowedError" && !self.video.muted) {
                self._diag.push("autoplay refused → playing muted");
                self.video.muted = true;
                self._autoMuted = true;
                self._play(gen, tok);
                self._armUnmute();
                self._flash("Press OK for sound", 5000);
            } else if (name && name !== "AbortError") {
                self._diag.push("play() refused: " + name);
            }
        });
    }

    /* The first button press after an autoplay refusal counts as the user
       gesture the browser wanted, so the sound goes back on inside it. */
    /** Arm Unmute for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _armUnmute() {
        if (this._unmuteArmed) return;
        this._unmuteArmed = true;
        const self = this;
        const restore = function () {
            window.removeEventListener("keydown", restore, true);
            window.removeEventListener("click", restore, true);
            self._unmuteArmed = false;
            if (!self._autoMuted) return;
            self._autoMuted = false;
            /* A secondary player (a Multiview tile) doesn't own its mute
               state — the grid decides which single tile is audible. */
            if (typeof self.onAutoplayUnblocked === "function") self.onAutoplayUnblocked();
            else self.video.muted = false;
        };
        window.addEventListener("keydown", restore, true);
        window.addEventListener("click", restore, true);
    }

    // `url` may be a single URL or an array of candidate URLs (e.g. catch-up,
    // where the same programme is reachable via two timeshift endpoints). Each
    // candidate is expanded into its native/HLS/TS attempts, tried in order.
    // `opts.key` identifies the content (channel / movie / episode) so the engine
    // that works for it can be remembered across sessions. Optional — without it
    // playback behaves exactly as before, just without the learning.
    /** Open one or more source URLs through the tiered playback strategy.
     * @param {string|Array<string>} url - One or more media URLs.
     * @param {Object} opts - Player options, including video and message elements.
     * @returns {void} Updates decoder state or the video UI.
     */
    play(url, opts) {
        if (!url) return;
        const urls = Array.isArray(url) ? url.filter(Boolean) : [url];
        if (!urls.length) return;
        this._contentKey = (opts && opts.key) || "";
        const key = urls.join("|");
        if (key !== this._lastUrl) {
            this._lowQuality = false;                          // new content → normal ABR
            /* Subtitles belong to the title, not to the player. They deliberately
               survive _resetVideo() so that cycling engines with RED keeps them
               (see _reattachExternalSubs), but that same persistence would carry
               one film's subtitles into the next when the page is reused rather
               than reloaded — Multiview and Live TV both drive play() repeatedly
               on one instance. Different content, so they go. */
            this._extSubs = null;
            this._extSubsRequested = 0;
            this._extSubsFailed = 0;
            if (typeof AssSubs !== "undefined") AssSubs.destroy();
        }
        this._lastUrl = key;
        this._urls    = urls;   // original list, for replay (tryLowestQuality)
        const gen = ++this._gen;
        this._tok++;
        this._manual = false;
        this._clearWatchdog();
        this._resetVideo();
        this.video.style.display = "block";
        this._msg("Loading…");

        this._diag   = [];
        this._codecs = null;
        this._res    = "";
        this._stalls = 0;
        this._stallEscalated = false;   // native → HLS.js already tried for a freeze
        this._stallFallback  = -1;      // attempt to return to if that didn't help
        this._attempts   = this._buildAttempts(urls);
        this._attemptIdx = 0;
        this._runAttempt(gen);
    }

    // `kind` is the stable identity of a tier ("native" | "hls" | "ts") — `engine`
    // is how it's played and `label` is for humans, so neither is safe to match
    // the saved preference against (both "Native" and "Native TS" run the native
    // engine, and labels get a " 1"/" 2" suffix when there are multiple URLs).
    /** Create native/HLS/TS attempts for each candidate stream.
     * @param {Array<string>} urls - Candidate stream URLs.
     * @returns {Array<Object>} Matching channel or data entries.
     */
    _buildAttempts(urls) {
        if (!Array.isArray(urls)) urls = [urls];
        const list = [];
        const multi = urls.length > 1;
        urls.forEach(function (url, i) {
            const tag   = multi ? " " + (i + 1) : "";
            const isHls = url.indexOf(".m3u8") !== -1;
            list.push({ engine: "native", kind: "native", url: url, label: "Native" + tag });
            if (isHls) {
                list.push({ engine: "hls", kind: "hls", url: url, label: "HLS" + tag });
                const ts = url.replace(/\.m3u8(\?[^#]*)?$/i, ".ts$1");
                if (ts !== url) list.push({ engine: "native", kind: "ts", url: ts, label: "Native TS" + tag });
            } else {
                /* Direct VOD file (.mkv/.mp4/.avi). The hardware pipeline plays
                   these but keeps their audio and subtitle streams to itself —
                   an MKV in particular is opaque to JS, since Chromium has no
                   demuxer for it. Most Xtream panels expose the same item as HLS
                   via an extension swap; when they do, hls.js demuxes in
                   software and CAN list those tracks.

                   Added after native, never before it: native is hardware
                   accelerated and handles HEVC/HDR, so it stays the default and
                   this is what RED now switches to when you want track control.
                   If the panel doesn't offer it the attempt simply fails and
                   playback falls back, exactly like any other tier. */
                /* Whitelist real container extensions — a blanket "swap the
                   extension" also rewrote catch-up's query-style
                   `timeshift.php?…` endpoint into a nonsense `.m3u8`, adding a
                   tier that could only ever burn the 12s stall watchdog. */
                const m3u8 = url.replace(
                    /\.(mkv|mp4|m4v|avi|mov|mpe?g|wmv|flv|webm|divx|3gp|ts)(\?[^#]*)?$/i,
                    ".m3u8$2");
                if (m3u8 !== url) list.push({ engine: "hls", kind: "hls", url: m3u8, label: "HLS" + tag });
            }
        });
        return this._applyEnginePreference(list);
    }

    // The user's preferred engine (Settings → Player) is moved to the FRONT of
    // the tier list rather than being pinned as the only option, so a preference
    // that happens to fail on one stream still falls back through the remaining
    // tiers instead of dead-ending on the error banner. Order is otherwise
    // preserved, so RED still cycles through every tier as before.
    /** Try the previously successful engine first without dropping fallback tiers.
     * @param {Array} list - Items to summarize or reorder.
     * @returns {Array<Object>} Matching channel or data entries.
     */
    _applyEnginePreference(list) {
        // What actually worked here last time beats the global default, which is
        // only a starting guess for content we've never played. Last comes what
        // this TV has taught us about live channels (see _liveEngineHint).
        const isLive = String(this._contentKey || "").indexOf("ch:") === 0;
        const want = _recalledEngine(this._contentKey) || _preferredEngine() ||
                     (isLive ? _liveEngineHint() : "");
        if (!want || list.length < 2) return list;
        const preferred = list.filter(function (a) { return a.kind === want; });
        if (!preferred.length || preferred.length === list.length) return list;
        const rest = list.filter(function (a) { return a.kind !== want; });
        return preferred.concat(rest);
    }

    /** Start one engine attempt only if its generation is current.
     * @param {number} gen - Playback generation number.
     * @returns {void} Updates decoder state or the video UI.
     */
    _runAttempt(gen) {
        if (gen !== this._gen) return;
        const a = this._attempts[this._attemptIdx];
        if (!a) { this.destroyHls(); this._showError(); return; }
        const tok = this._tok;
        this._stopStallWatch();
        this._dropAttemptListeners();
        this._activeEngine = a.label;
        this._playingSince = 0;   // set on 'playing'; drives mid-play recovery
        this._reattachExternalSubs();
        if (a.engine === "hls") this._playHls(gen, tok, a.url);
        else                    this._playNative(gen, tok, a.url);
    }

    // Auto-advance to the next tier — disabled in manual mode (the user drives).
    // Exception: if THIS engine had already been playing steadily (5s+) and then
    // died — a platform pipeline hiccup (e.g. some webOS builds reset the
    // decoder on a video resize) or a brief network drop — restart the SAME
    // engine instead of cascading through the tiers to the error banner. Live
    // streams simply rejoin at the live edge. A stream that dies again within
    // 5s of recovering falls through to the normal tier advance.
    /** Advance after a genuine playback failure instead of preempting playing video.
     * @param {number} gen - Playback generation number.
     * @param {string} reason - Failure or transition reason.
     * @returns {void} Updates decoder state or the video UI.
     */
    _next(gen, reason) {
        if (gen !== this._gen) return;
        this._clearWatchdog();
        this._stopStallWatch();
        if (reason) this._diag.push(reason);
        if (this._manual) return;
        this._tok++;
        this.destroyHls();
        /* HLS.js was brought in to rescue a frozen native stream and couldn't
           even start. Go back to the engine that WAS playing rather than on
           down the tier list — a stream that plays with the odd freeze beats
           an error banner. */
        if (this._stallFallback >= 0 && !this._playingSince) {
            const back = this._stallFallback;
            this._stallFallback = -1;
            this._diag.push("HLS.js didn't start — back to " + this._attempts[back].label);
            this._attemptIdx = back;
            this._runAttempt(gen);
            return;
        }
        if (this._playingSince && Date.now() - this._playingSince > 5000) {
            this._diag.push("reconnect " + this._activeEngine);
            this._msg("Reconnecting…");
            const self = this, tok = this._tok;
            setTimeout(function () {
                if (gen === self._gen && tok === self._tok) self._runAttempt(gen);
            }, 700);
            return;
        }
        this._attemptIdx++;
        this._runAttempt(gen);
    }

    // RED: manually switch to the next engine and stay there.
    /** Cycle Engine for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    cycleEngine() {
        if (!this._lastUrl || !this._attempts || this._attempts.length < 2) return;
        this._manual = true;
        this._stallFallback = -1;   // the user is choosing engines now
        const gen = ++this._gen;
        this._tok++;
        this._clearWatchdog();
        this.destroyHls();
        this._attemptIdx = (this._attemptIdx + 1) % this._attempts.length;
        const picked = this._attempts[this._attemptIdx];
        // Remember the choice so "Remember last used" (Settings → Player) can
        // start here next time. Written unconditionally — it costs nothing and
        // means switching the setting to that mode later picks up a choice the
        // user already made, rather than starting from nothing.
        try { localStorage.setItem(PLAYER_LAST_KEY, picked.kind); } catch (_) {}
        this._flash("Player: " + picked.label);
        this._msg("Loading…");
        this._resetVideo();
        this.video.style.display = "block";
        this._runAttempt(gen);
    }

    // Stall watchdog — fires only if NOTHING loads (no data, no error). Auto only.
    /** Start the initial no-data watchdog.
     * @param {number} gen - Playback generation number.
     * @param {number} tok - Tier attempt token.
     * @returns {void} Updates decoder state or the video UI.
     */
    _arm(gen, tok) {
        this._clearWatchdog();
        if (this._manual) return;
        const self = this;
        this._watchdog = setTimeout(function () {
            if (self._alive(gen, tok)) self._next(gen, self._activeEngine + ": no data after 12s");
        }, 12000);
    }

    /* Data has arrived, so this is not a dead URL — but loaded is not playing.
       The watchdog used to be switched off at this point, which meant a stream
       that delivered its first frame and then never started (a decoder that
       refused it, an autoplay refusal, a 'playing' event the platform never
       sent) sat on "Loading…" forever with nothing left to move it on. It is
       re-armed with a longer allowance instead. If the picture turns out to be
       moving after all, that counts as playing; otherwise the next tier is
       tried exactly as for any other failure. */
    /** Track partial loading that has not reached playing.
     * @param {number} gen - Playback generation number.
     * @param {number} tok - Tier attempt token.
     * @returns {void} Updates decoder state or the video UI.
     */
    _armStarted(gen, tok) {
        this._clearWatchdog();
        if (this._manual) return;
        const self = this, v = this.video;
        const t0 = v.currentTime || 0;
        this._watchdog = setTimeout(function () {
            if (!self._alive(gen, tok)) return;
            /* Judged by the clock having moved, not by readyState: platform
               pipelines don't all keep readyState current, and a stream that
               is visibly running must never be torn down for a stale flag. */
            if (!v.paused && (v.currentTime > t0 + 0.5 || (v.readyState >= 3 && v.currentTime > 0))) {
                self._onPlaying();
                return;
            }
            self._next(gen, self._activeEngine + ": loaded but never started playing");
        }, 20000);
    }

    /* Success signals for one attempt: the 'playing' event, or the clock
       visibly moving. Some platform pipelines are sparing with 'playing' (it
       can fire before the first frame, or not at all after a quick start), and
       a stream that is plainly running must not be left under the "Loading…"
       veil waiting for an event that already passed. */
    /** Check whether media actually begins playing.
     * @param {number} gen - Playback generation number.
     * @param {number} tok - Tier attempt token.
     * @returns {void} Updates decoder state or the video UI.
     */
    _watchStart(gen, tok) {
        const self = this, v = this.video;
        let done = false, lastT = -1;
        const succeed = function () {
            if (done || !self._alive(gen, tok)) return;
            done = true;
            self._onPlaying();
        };
        this._once("playing", succeed);
        const onTime = function () {
            if (done || !self._alive(gen, tok)) { v.removeEventListener("timeupdate", onTime); return; }
            if (v.paused || v.seeking || v.readyState < 2) { lastT = -1; return; }
            if (lastT >= 0 && v.currentTime > lastT + 0.1) {
                v.removeEventListener("timeupdate", onTime);
                succeed();
                return;
            }
            lastT = v.currentTime;
        };
        v.addEventListener("timeupdate", onTime);
        this._attemptListeners.push(["timeupdate", onTime]);
        this._once("loadeddata", function () {
            if (!self._alive(gen, tok) || done) return;
            self._armStarted(gen, tok);
            if (v.paused) self._play(gen, tok);   // the first play() may have run before there was anything to play
        });
    }

    // Shared success path: the moment a tier genuinely plays, bank it against
    // this content so the next play starts there instead of re-walking the
    // tiers. Recorded on 'playing' rather than on load, because loading proves
    // nothing on webOS — plenty of streams load and then fail to decode.
    /** Remember when playback started and arm live-stall recovery.
     * @returns {void} Updates decoder state or the video UI.
     */
    _onPlaying() {
        this._clearWatchdog();
        this._hideMsg();
        this._playingSince = Date.now();
        this._stallFallback = -1;
        const a = this._attempts && this._attempts[this._attemptIdx];
        if (a) _rememberEngine(this._contentKey, a.kind);
        this._startStallWatch(this._gen, this._tok);
        if (typeof this.onPlaying === "function") this.onPlaying();
    }

    /* ── Live freeze detection ───────────────────────────────────────────────
       Once a live channel is playing, check every second that it is still
       moving: the clock advancing, or frames still being decoded. Paused,
       seeking, ended and a hidden page don't count. Only judged once the clock
       has been SEEN to move on this attempt — a pipeline whose currentTime
       never updates would otherwise read as frozen from the first second and
       be restarted every eight. VOD and catch-up are left alone: a pause in
       buffering there is the network, and restarting would lose the position. */
    /** Watch for a live stream that genuinely stops advancing.
     * @param {number} gen - Playback generation number.
     * @param {number} tok - Tier attempt token.
     * @returns {void} Updates decoder state or the video UI.
     */
    _startStallWatch(gen, tok) {
        this._stopStallWatch();
        if (String(this._contentKey || "").indexOf("ch:") !== 0) return;
        const self = this, v = this.video;
        const a = this._attempts && this._attempts[this._attemptIdx];
        const since = Date.now();
        let lastT = v.currentTime, lastF = this._decodedFrames(), lastMove = since, clockSeen = false;
        this._stallTimer = setInterval(function () {
            if (!self._alive(gen, tok)) { self._stopStallWatch(); return; }
            const now = Date.now();
            if (v.paused || v.ended || v.seeking || document.hidden) {
                lastMove = now; lastT = v.currentTime;
                return;
            }
            const t = v.currentTime, f = self._decodedFrames();
            const clockMoved  = Math.abs(t - lastT) > 0.05;
            const framesMoved = f >= 0 && lastF >= 0 && f > lastF;
            lastT = t; lastF = f;
            if (clockMoved) clockSeen = true;
            if (clockMoved || framesMoved) {
                lastMove = now;
                /* HLS.js has now carried a channel the native player froze on
                   for a good while: on this TV, start live channels there. */
                if (self._stallEscalated && !self._hintSaved && a && a.kind === "hls" &&
                    now - since > LIVE_HINT_AFTER_MS) {
                    self._hintSaved = true;
                    _rememberLiveEngine("hls");
                    _logPlaybackEvent("HLS.js ran " + Math.round(LIVE_HINT_AFTER_MS / 60000) +
                                      " min without freezing — live channels now start on HLS.js");
                }
                return;
            }
            if (clockSeen && now - lastMove >= LIVE_STALL_MS) {
                self._stopStallWatch();
                self._recoverStall(gen, now - lastMove);
            }
        }, 1000);
    }

    /** Stop Stall Watch for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _stopStallWatch() {
        if (this._stallTimer) { clearInterval(this._stallTimer); this._stallTimer = null; }
    }

    /* A frozen live stream. The first freeze on the native player moves the
       same URL to HLS.js, which re-fetches the live playlist itself instead of
       leaving it to the TV's pipeline — the likeliest thing to have broken.
       Anything else (HLS.js frozen too, the TS tier, a second freeze, manual
       mode) restarts the same engine at the live edge: exactly what changing
       channel and back was doing by hand, without the trip. */
    /** Recover frozen live playback while retaining manual engine choice.
     * @param {number} gen - Playback generation number.
     * @param {number} stalledMs - Duration of the playback stall.
     * @returns {void} Updates decoder state or the video UI.
     */
    _recoverStall(gen, stalledMs) {
        if (gen !== this._gen) return;
        const a = this._attempts && this._attempts[this._attemptIdx];
        if (!a) return;
        this._stalls = (this._stalls || 0) + 1;
        this._clearWatchdog();
        this._tok++;
        this.destroyHls();

        let target = this._attemptIdx;
        if (!this._manual && a.kind === "native" && !this._stallEscalated) {
            const idx = this._attempts.findIndex(function (x) { return x.kind === "hls" && x.url === a.url; });
            if (idx >= 0) {
                this._stallEscalated = true;
                this._stallFallback  = this._attemptIdx;
                target = idx;
            }
        }
        const action = target === this._attemptIdx
            ? "restarting " + a.label
            : "switching to " + this._attempts[target].label;
        const note = a.label + " froze at " + Math.round(this.video.currentTime || 0) + "s (" +
                     Math.round(stalledMs / 1000) + "s without progress) — " + action;
        this._diag.push(note);
        _logPlaybackEvent(note + (this._contentKey ? "  [" + this._contentKey + "]" : ""));

        this._msg("Reconnecting…");
        this._attemptIdx = target;
        const self = this, tok = this._tok;
        setTimeout(function () {
            if (gen === self._gen && tok === self._tok) self._runAttempt(gen);
        }, 500);
    }

    /** Try native playback on the platform video decoder.
     * @param {number} gen - Playback generation number.
     * @param {number} tok - Tier attempt token.
     * @param {string|Array<string>} url - One or more media URLs.
     * @returns {void} Updates decoder state or the video UI.
     */
    _playNative(gen, tok, url) {
        if (!this._alive(gen, tok)) return;
        const self = this;
        const onMeta    = function () { if (self._alive(gen, tok) && self.video.videoWidth) self._res = self.video.videoWidth + "×" + self.video.videoHeight; };
        const onError   = function () { if (self._alive(gen, tok)) self._next(gen, "Native: " + _mediaErrText(self.video.error)); };
        this._watchStart(gen, tok);
        this._once("loadedmetadata", onMeta);
        this._once("error",          onError);
        this.video.src = url;
        this.video.load();
        this._play(gen, tok);
        this._arm(gen, tok);
    }

    /** Try the HLS.js fallback engine.
     * @param {number} gen - Playback generation number.
     * @param {number} tok - Tier attempt token.
     * @param {string|Array<string>} url - One or more media URLs.
     * @returns {void} Updates decoder state or the video UI.
     */
    _playHls(gen, tok, url) {
        if (!this._alive(gen, tok)) return;
        const self = this;
        this._loadHls(function () {
            if (!self._alive(gen, tok)) return;
            if (typeof Hls !== "undefined" && Hls.isSupported()) self._attachHls(gen, tok, url);
            else self._next(gen, "HLS.js unsupported on this browser");
        });
    }

    /** Attach a ready HLS instance to the current stream.
     * @param {number} gen - Playback generation number.
     * @param {number} tok - Tier attempt token.
     * @param {string|Array<string>} url - One or more media URLs.
     * @returns {void} Updates decoder state or the video UI.
     */
    _attachHls(gen, tok, url) {
        this.destroyHls();
        const self = this;
        /* Multiview runs up to four of these at once, where the normal 24s of
           buffered video per stream is more memory than the TV will hand out —
           the fourth tile then fails for a reason that looks like a network
           problem. A 6s buffer is enough to ride out a hiccup on a live stream
           and keeps four tiles inside budget. */
        const buf = this._lightBuffer
            ? { maxBufferLength: 6,  maxMaxBufferLength: 12 }
            : { maxBufferLength: 24, maxMaxBufferLength: 60 };
        this.hls = new Hls({
            enableWorker: false, debug: false,
            maxBufferLength: buf.maxBufferLength, maxMaxBufferLength: buf.maxMaxBufferLength,
            manifestLoadingTimeOut: 8000, manifestLoadingMaxRetry: 1,
            levelLoadingMaxRetry: 2, fragLoadingMaxRetry: 3
        });
        this.hls.attachMedia(this.video);
        this.hls.on(Hls.Events.MEDIA_ATTACHED,  function () { if (self._alive(gen, tok)) self.hls.loadSource(url); });
        this.hls.on(Hls.Events.MANIFEST_PARSED, function (ev, data) {
            if (!self._alive(gen, tok)) return;
            try {
                const lv = (self.hls.levels && self.hls.levels[0]) || (data && data.levels && data.levels[0]);
                if (lv) {
                    self._codecs = { v: lv.videoCodec || "", a: lv.audioCodec || "" };
                    if (lv.width && lv.height) self._res = lv.width + "×" + lv.height;
                }
                const tracks = self.hls.audioTracks;
                if (tracks && tracks.length > 1) {           // prefer a non-Dolby audio track
                    for (let i = 0; i < tracks.length; i++) {
                        const ac = (tracks[i].audioCodec || tracks[i].codec || "").toLowerCase();
                        if (ac && !_isDolby(ac)) { try { self.hls.audioTrack = i; } catch (_) {} break; }
                    }
                }
                if (self._codecs && !self._codecs.a && tracks && tracks[0]) {
                    self._codecs.a = tracks[0].audioCodec || tracks[0].codec || "";
                }
                if (self._lowQuality && self.hls.levels && self.hls.levels.length) {
                    self.hls.autoLevelCapping = 0; self.hls.currentLevel = 0;
                }
            } catch (_) {}
            self._play(gen, tok);
        });
        this.hls.on(Hls.Events.ERROR, function (e, data) {
            if (!self._alive(gen, tok) || !data || !data.fatal) return;
            let d = data.details || data.type || "fatal error";
            if (data.reason) d += " (" + data.reason + ")";
            self._next(gen, "HLS: " + d);
        });
        this._watchStart(gen, tok);
        this._arm(gen, tok);
    }

    // ── Audio tracks ────────────────────────────────────────────────────────────
    // Two sources, because which one has the tracks depends on how the stream is
    // being played:
    //   • hls.js  — alternate renditions declared in the HLS manifest. Reliable.
    //   • native  — video.audioTracks. Part of the HTML5 spec but NOT implemented
    //     by upstream Blink, so on most webOS builds a multi-audio MP4/MKV played
    //     on the native tier exposes nothing here and the list comes back empty.
    //     Feature-detected rather than assumed; see _hasNativeAudioTracks().
    /** List Audio Tracks for the active video player.
     * @returns {Array<Object>} Matching channel or data entries.
     */
    listAudioTracks() {
        const out = [];
        if (this.hls && this.hls.audioTracks && this.hls.audioTracks.length > 1) {
            const tracks = this.hls.audioTracks;
            for (let i = 0; i < tracks.length; i++) {
                const t = tracks[i];
                out.push({
                    src: "hls", id: i,
                    lang: t.lang || t.language || "",
                    label: _trackLabel(t.name, t.lang || t.language, i, t.audioCodec || t.codec)
                });
            }
            return out;
        }
        const at = this.video.audioTracks;
        if (at && at.length > 1) {
            for (let i = 0; i < at.length; i++) {
                out.push({
                    src: "native", id: i,
                    lang: at[i].language || "",
                    label: _trackLabel(at[i].label, at[i].language, i, "")
                });
            }
        }
        return out;
    }

    // Index of the currently selected audio track in listAudioTracks() order,
    // or -1 when there's nothing to choose between.
    /** Active Audio Track for the active video player.
     * @returns {number} Calculated numeric value.
     */
    activeAudioTrack() {
        if (this.hls && this.hls.audioTracks && this.hls.audioTracks.length > 1) {
            return typeof this.hls.audioTrack === "number" ? this.hls.audioTrack : -1;
        }
        const at = this.video.audioTracks;
        if (at && at.length > 1) {
            for (let i = 0; i < at.length; i++) if (at[i].enabled) return i;
        }
        return -1;
    }

    /* LG state that `audioTracks` is supported from webOS TV 3.0, and enabling
       one track while disabling the rest is their documented method. In practice
       it silently does nothing on some streams — a long-standing complaint on
       their own forum that has no official fix. So: apply it, then CHECK, and
       report the truth to the caller instead of assuming success.

       `done(ok, note)` is called once the result is known (asynchronously for
       the native path, since the pipeline needs a moment to react). */
    /** Select one audio track and report if webOS accepts the change.
     * @param {Object} track - Selected track record.
     * @param {Function} done - Completion callback receiving success and explanation.
     * @returns {boolean} Whether the requested condition is met.
     */
    setAudioTrack(track, done) {
        done = done || function () {};
        if (!track) { done(false, "No track selected."); return false; }

        if (track.src === "hls" && this.hls) {
            try {
                this.hls.audioTrack = track.id;
                done(true, "");
                return true;
            } catch (_) { done(false, "Could not switch audio track."); return false; }
        }

        const at = this.video.audioTracks;
        if (track.src !== "native" || !at || !at.length) { done(false, "No audio tracks available."); return false; }

        // Exactly one track may be enabled; disable the rest so engines that
        // allow multiple don't end up mixing two languages together.
        try {
            for (let i = 0; i < at.length; i++) at[i].enabled = (i === track.id);
        } catch (_) { done(false, "This TV refused the audio track change."); return false; }

        const self = this, gen = this._gen, tok = this._tok;
        setTimeout(function () {
            // Channel and engine changes invalidate an in-flight native switch.
            if (!self._alive(gen, tok)) return;
            let applied = false;
            try { applied = !!(at[track.id] && at[track.id].enabled); } catch (_) {}
            if (applied) { done(true, ""); return; }

            // Not taken. A tiny seek makes the platform decoder re-evaluate its
            // track selection; only safe on seekable content, never on live.
            if (isFinite(self.video.duration) && self.video.duration > 0) {
                try {
                    const t = self.video.currentTime;
                    self.video.currentTime = Math.max(0, t - 0.25);
                    setTimeout(function () {
                        if (!self._alive(gen, tok)) return;
                        let ok = false;
                        try { ok = !!(at[track.id] && at[track.id].enabled); } catch (_) {}
                        done(ok, ok ? "" : self._audioSwitchHint());
                    }, 500);
                } catch (_) { done(false, self._audioSwitchHint()); }
            } else {
                done(false, self._audioSwitchHint());
            }
        }, 400);
        return true;
    }

    /** Audio Switch Hint for the active video player.
     * @returns {string} Requested text value.
     */
    _audioSwitchHint() {
        // hls.js does the switch in software, so it works where the platform
        // decoder won't — worth pointing at when the native path refuses.
        const hasHlsTier = (this._attempts || []).some(function (a) { return a.kind === "hls"; });
        return hasHlsTier
            ? "This TV ignored the audio track change. Press RED to switch to the HLS player, which changes tracks in software."
            : "This TV ignored the audio track change for this file.";
    }

    /** Has Native Audio Tracks for the active video player.
     * @returns {boolean} Whether the requested condition is met.
     */
    _hasNativeAudioTracks() {
        const at = this.video.audioTracks;
        return !!(at && typeof at.length === "number");
    }

    /** Has Tier for the active video player.
     * @param {string} kind - Engine type.
     * @returns {boolean} Whether the requested condition is met.
     */
    _hasTier(kind) {
        return (this._attempts || []).some(function (a) { return a.kind === kind; });
    }

    // Why the audio list may be empty — surfaced in the menu so the user isn't
    // left wondering whether the app is broken or the file is single-track.
    /** Audio Unavailable Reason for the active video player.
     * @returns {string} Requested text value.
     */
    audioUnavailableReason() {
        if (this.hls) return "This stream declares only one audio track.";
        if (!this._hasNativeAudioTracks()) {
            return this._hasTier("hls")
                ? "This TV can't list audio tracks for direct files — the decoder keeps them to itself. " +
                  "Press RED to switch to the HLS player, which reads them in software."
                : "This TV can't list audio tracks for direct files.";
        }
        return "This file has only one audio track.";
    }

    // ── Subtitles ───────────────────────────────────────────────────────────────
    /** List Subtitles for the active video player.
     * @returns {Array<Object>} Matching channel or data entries.
     */
    listSubtitles() {
        const out = [];
        if (this.hls && this.hls.subtitleTracks) {
            for (let i = 0; i < this.hls.subtitleTracks.length; i++) {
                const t = this.hls.subtitleTracks[i];
                out.push({
                    src: "hls", id: i,
                    lang: t.lang || t.language || "",
                    label: _trackLabel(t.name, t.lang || t.language, i, "")
                });
            }
        }
        const tt = this.video.textTracks;
        if (tt) {
            for (let i = 0; i < tt.length; i++) {
                const k = tt[i].kind;
                // Exclude only what's definitely not a subtitle. Whitelisting
                // "subtitles"/"captions" dropped tracks that some engines label
                // oddly, which looked identical to having no tracks at all.
                if (k !== "metadata" && k !== "chapters") {
                    out.push({
                        src: "native", id: i,
                        lang: tt[i].language || "",
                        label: _trackLabel(tt[i].label, tt[i].language, i, "")
                    });
                }
            }
        }
        /* ASS/SSA sidecars can't be text tracks, so they join the same list as
           their own kind. Listing them here rather than in a separate menu is
           the point: to the user "the Japanese subtitles" is one choice, and
           which of two renderers draws them is not their problem. */
        if (typeof AssSubs !== "undefined") {
            AssSubs.list().forEach(function (t) {
                out.push({ src: "ass", id: t.id, lang: t.lang, label: t.label });
            });
        }
        return out;
    }
    /** Activate exactly one subtitle renderer or turn all subtitles off.
     * @param {Object} track - Selected track record.
     * @returns {void} Updates decoder state or the video UI.
     */
    setSubtitle(track) {
        const tt = this.video.textTracks;
        if (tt) for (let i = 0; i < tt.length; i++) tt[i].mode = "disabled";
        if (this.hls) { try { this.hls.subtitleDisplay = false; this.hls.subtitleTrack = -1; } catch (_) {} }
        /* Exactly one renderer draws at a time. Leaving the ASS overlay up while
           a <track> is showing would stack two sets of subtitles on top of each
           other, which is the failure mode people report as "double subtitles". */
        if (typeof AssSubs !== "undefined" && (!track || track.src !== "ass")) AssSubs.hide();
        if (!track || track === "off") { this._activeSub = "off"; return; }
        if (track.src === "ass") {
            if (typeof AssSubs !== "undefined") {
                AssSubs.show(track.id);
                AssSubs.setOffset(this.getSubDelay());
            }
        } else if (track.src === "hls" && this.hls) {
            try { this.hls.subtitleDisplay = true; this.hls.subtitleTrack = track.id; } catch (_) {}
        } else if (track.src === "native" && tt && tt[track.id]) {
            tt[track.id].mode = "showing";
        }
        this._activeSub = track;
    }
    /* ── Subtitle timing & placement ─────────────────────────────────────────
       Delay works by rewriting cue times rather than anything clever, because
       that's the only lever the HTML5 text-track API gives us. Each cue's
       ORIGINAL times are stashed on first touch (_baseStart/_baseEnd) and every
       adjustment is computed from those, so repeated nudges can't accumulate
       rounding drift the way successive relative shifts would.

       hls.js feeds cues in as segments load, so newly-arrived cues would be
       unshifted. A light 1s watcher re-applies the offset to anything it hasn't
       stamped yet; it's idempotent precisely because of the base times above. */
    /** Get Sub Delay for the active video player.
     * @returns {number} Calculated numeric value.
     */
    getSubDelay() {
        if (typeof this._subDelay === "number") return this._subDelay;
        var v;
        try { v = parseFloat(localStorage.getItem("vod_sub_delay")); } catch (_) { v = 0; }
        this._subDelay = isFinite(v) ? v : 0;
        return this._subDelay;
    }

    /** Clamp and save subtitle synchronization offset.
     * @param {number} seconds - Subtitle delay in seconds.
     * @returns {number} Calculated numeric value.
     */
    setSubDelay(seconds) {
        if (!isFinite(seconds)) seconds = 0;
        seconds = Math.max(-30, Math.min(30, Math.round(seconds * 100) / 100));
        this._subDelay = seconds;
        try { localStorage.setItem("vod_sub_delay", String(seconds)); } catch (_) {}
        this._applyCueAdjustments();
        /* The ASS overlay owns its own clock, so the same delay has to be handed
           to it separately — the cue rewriting above only reaches text tracks,
           and an ASS track would otherwise ignore the sync control entirely. */
        if (typeof AssSubs !== "undefined") AssSubs.setOffset(seconds);
        this._startCueWatch();
        return seconds;
    }

    /** Get Sub Position for the active video player.
     * @returns {number} Calculated numeric value.
     */
    getSubPosition() {
        if (typeof this._subPos === "number") return this._subPos;
        var v;
        try { v = parseInt(localStorage.getItem("vod_sub_pos"), 10); } catch (_) { v = 0; }
        this._subPos = isFinite(v) ? v : 0;
        return this._subPos;
    }

    // 0 = the engine's default placement; higher lifts subtitles off the bottom
    // edge (useful when a stream is letterboxed or the OSD overlaps them).
    /** Move subtitles upward while keeping within valid UI steps.
     * @param {number} step - Relative subtitle position.
     * @returns {number} Calculated numeric value.
     */
    setSubPosition(step) {
        this._subPos = Math.max(0, Math.min(4, step | 0));
        try { localStorage.setItem("vod_sub_pos", String(this._subPos)); } catch (_) {}
        this._applyCueAdjustments();
        this._startCueWatch();
        return this._subPos;
    }

    /* In-band (embedded) subtitle tracks are reported by the media engine as the
       container is parsed, which can be long after loadedmetadata — so a menu
       built at the wrong moment sees nothing. Watch for late arrivals, and poke
       each new track into 'hidden' briefly: a disabled track has null cues, and
       'hidden' makes the engine parse them without displaying anything. Then
       hand it back to whatever mode it was in.

       Note this can only surface tracks the platform actually exposes. webOS's
       in-band handling is limited (frequently only the first embedded track of
       an MKV is readable at all), so an empty list here is often the platform,
       not the app — which is what the external-subtitle path is for. */
    /** Watch Text Tracks for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _watchTextTracks() {
        const tt = this.video.textTracks;
        if (!tt || !tt.addEventListener) return;
        const self = this;
        tt.addEventListener("addtrack", function (e) {
            const track = e && e.track;
            if (track && track.mode === "disabled") {
                try {
                    track.mode = "hidden";
                    setTimeout(function () {
                        // Leave it alone if the user selected it meanwhile.
                        if (track.mode === "hidden") track.mode = "disabled";
                    }, 0);
                } catch (_) {}
            }
            if (typeof self.onTracksChanged === "function") self.onTracksChanged();
        });
    }

    /** Active Text Track for the active video player.
     * @returns {Object|null} Matching object, or null.
     */
    _activeTextTrack() {
        const tt = this.video.textTracks;
        if (!tt) return null;
        for (let i = 0; i < tt.length; i++) if (tt[i].mode === "showing") return tt[i];
        return null;
    }

    /** Apply Cue Adjustments for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _applyCueAdjustments() {
        const track = this._activeTextTrack();
        if (!track || !track.cues) return;
        const delay = this.getSubDelay();
        const pos   = this.getSubPosition();
        const cues  = track.cues;
        for (let i = 0; i < cues.length; i++) {
            const c = cues[i];
            if (c._baseStart === undefined) { c._baseStart = c.startTime; c._baseEnd = c.endTime; }
            const s = Math.max(0, c._baseStart + delay);
            const e = Math.max(s + 0.1, c._baseEnd + delay);
            try {
                // Assign in whichever order keeps start <= end at every instant,
                // otherwise the setter throws and the cue is left half-updated.
                if (s <= c.endTime) { c.startTime = s; c.endTime = e; }
                else                { c.endTime = e; c.startTime = s; }
            } catch (_) {}
            if (pos > 0) {
                try { c.snapToLines = false; c.line = 90 - (pos * 9); } catch (_) {}
            } else if (c._lineTouched) {
                try { c.snapToLines = true; c.line = "auto"; } catch (_) {}
            }
            if (pos > 0) c._lineTouched = true;
        }
    }

    /** Start Cue Watch for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _startCueWatch() {
        if (this._cueWatch) return;
        const self = this;
        this._cueWatch = setInterval(function () { self._applyCueAdjustments(); }, 1000);
    }

    /* ── Playback speed ──────────────────────────────────────────────────────
       Some webOS builds pin the platform pipeline to 1x and silently ignore
       playbackRate, so the applied value is read back and returned rather than
       assumed — the menu shows what actually took effect. */
    /** Get Speed for the active video player.
     * @returns {number} Calculated numeric value.
     */
    getSpeed() {
        var v;
        try { v = parseFloat(localStorage.getItem("vod_speed")); } catch (_) { v = 1; }
        return isFinite(v) && v > 0 ? v : 1;
    }

    /** Set Speed for the active video player.
     * @param {number} rate - Playback rate.
     * @returns {number} Calculated numeric value.
     */
    setSpeed(rate) {
        if (!isFinite(rate) || rate <= 0) rate = 1;
        try { this.video.playbackRate = rate; } catch (_) {}
        const applied = this.video.playbackRate || 1;
        try { localStorage.setItem("vod_speed", String(applied)); } catch (_) {}
        return applied;
    }

    /** Speed Supported for the active video player.
     * @returns {boolean} Whether the requested condition is met.
     */
    speedSupported() {
        try {
            const before = this.video.playbackRate;
            this.video.playbackRate = 1.25;
            const ok = Math.abs(this.video.playbackRate - 1.25) < 0.01;
            this.video.playbackRate = before;
            return ok;
        } catch (_) { return false; }
    }

    /* ── Subtitle appearance ─────────────────────────────────────────────── */
    /** Get Sub Style for the active video player.
     * @returns {string} Requested text value.
     */
    getSubStyle() {
        var s;
        try { s = localStorage.getItem("vod_sub_style") || "shadow"; } catch (_) { s = "shadow"; }
        return s;
    }

    /** Apply and remember shadow, box or plain subtitle styling.
     * @param {string} style - Subtitle style.
     * @returns {string} Requested text value.
     */
    applySubStyle(style) {          // 'shadow' | 'box' | 'plain'
        style = style || "shadow";
        var v = this.video;
        v.classList.remove("cue-shadow", "cue-box", "cue-plain");
        v.classList.add("cue-" + style);
        try { localStorage.setItem("vod_sub_style", style); } catch (_) {}
        return style;
    }

    /** Get Sub Colour for the active video player.
     * @returns {string} Requested text value.
     */
    getSubColour() {
        var c;
        try { c = localStorage.getItem("vod_sub_colour") || "white"; } catch (_) { c = "white"; }
        return c;
    }

    /** Apply and remember a supported subtitle color.
     * @param {string} colour - Subtitle color.
     * @returns {string} Requested text value.
     */
    applySubColour(colour) {        // 'white' | 'yellow' | 'cyan'
        colour = colour || "white";
        var v = this.video;
        v.classList.remove("cue-white", "cue-yellow", "cue-cyan");
        v.classList.add("cue-" + colour);
        try { localStorage.setItem("vod_sub_colour", colour); } catch (_) {}
        return colour;
    }

    /** Get Sub Size for the active video player.
     * @returns {string} Requested text value.
     */
    getSubSize() {
        if (this._subSize) return this._subSize;
        try { return localStorage.getItem("vod_subs_size") || "md"; } catch (_) { return "md"; }
    }
    /** Apply and remember a supported subtitle size.
     * @param {string} size - Subtitle size.
     * @returns {void} Updates decoder state or the video UI.
     */
    applySubSize(size) {                 // 'md' | 'lg' | 'xl'
        size = size || "md";
        var v = this.video;
        v.classList.remove("subs-md", "subs-lg", "subs-xl");
        v.classList.add("subs-" + size);
        this._subSize = size;
        try { localStorage.setItem("vod_subs_size", size); } catch (_) {}
    }
    // External subtitle files (from the Xtream panel, later OpenSubtitles).
    // Each is fetched once, converted to VTT and kept as a blob so it survives
    // _resetVideo() wiping the <track> elements — otherwise pressing RED to
    // switch engines silently destroyed every external subtitle for good.
    /** Fetch, convert and attach external subtitle files to the current title.
     * @param {Array} list - Items to summarize or reorder.
     * @returns {void} Updates decoder state or the video UI.
     */
    addExternalSubs(list) {
        if (!list || !list.length) return;
        const self = this;

        /* ASS/SSA are split off BEFORE anything else touches them. They used to
           go through this same path: fetched, run through Subs.toVtt() and
           attached as a <track>. That could never work — ASS is a styled,
           positioned format with a style table and inline override tags, not
           SRT with different punctuation — so the converter emitted either an
           empty track or one whose cues were raw "Dialogue:" markup. Either way
           the menu offered a subtitle that did nothing. They are drawn by
           player/ass.js instead; see the note there on why not assjs. */
        if (typeof AssSubs !== "undefined") {
            const ass = [], rest = [];
            list.forEach(function (s) {
                const u = s && (s.url || s.src || (typeof s === "string" ? s : ""));
                /* Sorted by declared format first, then by URL extension. An
                   online result carries its format but often no meaningful
                   filename, so extension-sniffing alone would push a downloaded
                   .ass through the VTT converter — the exact failure this split
                   exists to prevent. */
                const fmt = (s && s.format) ? String(s.format).toLowerCase() : "";
                const isAss = fmt ? (fmt === "ass" || fmt === "ssa") : !!(u && AssSubs.isAss(u));
                if (isAss) ass.push(s); else rest.push(s);
            });
            if (ass.length) {
                AssSubs.attach(this.video, this._pipWrap || this.video.parentNode);
                if (AssSubs.add(ass) && typeof this.onTracksChanged === "function") {
                    this.onTracksChanged();
                }
            }
            list = rest;
            if (!list.length) return;
        }

        this._extSubsRequested = (this._extSubsRequested || 0) + list.length;
        list.forEach(function (s) {
            const url = s && (s.url || s.src || s);
            /* An entry may carry the subtitle TEXT instead of a URL: a provider
               that decodes the body itself (Assrt has to — its files are often
               GB18030, and reading those as UTF-8 silently yields garbage) has
               nothing to hand over but the finished string. Resolving it here
               keeps one attach path for both, rather than a second one that
               would drift. */
            const inline = s && typeof s.text === "string" && s.text ? s.text : "";
            if (!inline && (!url || typeof url !== "string")) return;
            const lang  = (s && (s.lang || s.language)) || "";
            const label = (s && s.label) || _langName(lang) || "Subtitles";
            const body  = inline
                ? Promise.resolve(inline)
                : Net.text(url, { timeout: 15000 });
            body.then(function (text) {
                if (!text) throw new Error("empty");
                const vtt = (typeof Subs !== "undefined") ? Subs.toVtt(text) : text;
                const entry = {
                    label: label, lang: lang,
                    blobUrl: URL.createObjectURL(new Blob([vtt], { type: "text/vtt" }))
                };
                self._extSubs = self._extSubs || [];
                self._extSubs.push(entry);
                self._appendTrack(entry);
                self._reportSubCounts();
            }).catch(function () {
                self._extSubsFailed = (self._extSubsFailed || 0) + 1;
                self._reportSubCounts();
            });
        });
    }

    /* Mirror the outcome into Settings → Diagnostics. Without this the panel
       can report two subtitle files, both can 404, and the menu's "couldn't be
       downloaded" is the only trace — gone the moment playback ends. */
    /** Report Sub Counts for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    _reportSubCounts() {
        if (typeof Subs === "undefined") return;
        Subs.updateDiag({
            loaded: (this._extSubs || []).length,
            failed: this._extSubsFailed || 0
        });
    }

    /* Set by player-vod.js from the panel's `subtitles` payload: the tracks the
       provider says are muxed into this video. Kept so subsUnavailableReason()
       can name them instead of claiming there are none. */
    /** Set Embedded Sub Info for the active video player.
     * @param {number} embedded - Detected embedded track count.
     * @param {boolean} unknown - Whether additional embedded tracks might exist.
     * @returns {void} Updates decoder state or the video UI.
     */
    setEmbeddedSubInfo(embedded, unknown) {
        this._embeddedSubs  = embedded || [];
        this._unknownSubs   = unknown || 0;
    }

    /** Append Track for the active video player.
     * @param {Object} t - Subtitle track.
     * @returns {void} Updates decoder state or the video UI.
     */
    _appendTrack(t) {
        const el = document.createElement("track");
        el.kind = "subtitles";
        el.label = t.label;
        if (t.lang) el.srclang = t.lang;
        el.src = t.blobUrl;
        this.video.appendChild(el);
    }

    // Called on every attempt: re-adds external subs the video reset removed.
    /** Restore external tracks after the video element is reset.
     * @returns {void} Updates decoder state or the video UI.
     */
    _reattachExternalSubs() {
        if (!this._extSubs || !this._extSubs.length) return;
        if (this.video.querySelector("track")) return;   // still attached
        const self = this;
        this._extSubs.forEach(function (t) { self._appendTrack(t); });
    }

    /* Why the subtitle list may be empty. This is the message that used to read
       "No subtitles found for this title" for a file the provider had just told
       us contains two subtitle tracks — the reason data/subtitles.js now keeps
       the embedded descriptors instead of discarding them. */
    /** Subs Unavailable Reason for the active video player.
     * @returns {string} Requested text value.
     */
    subsUnavailableReason() {
        if (typeof Subs !== "undefined") {
            return Subs.describe({
                files:     [],
                embedded:  this._embeddedSubs || [],
                unknown:   this._unknownSubs || 0,
                requested: this._extSubsRequested || 0,
                failed:    this._extSubsFailed || 0
            }, {
                hasHlsTier: this._hasTier("hls"),
                hasOpenSubtitles: typeof OpenSubtitles !== "undefined" && OpenSubtitles.configured()
            });
        }
        if (this._extSubsRequested && this._extSubsFailed >= this._extSubsRequested) {
            return "Subtitle files were listed for this title but couldn't be downloaded.";
        }
        return "No subtitles found for this title.";
    }

    /** Try Lowest Quality for the active video player.
     * @returns {void} Updates decoder state or the video UI.
     */
    tryLowestQuality() {
        if (!this._urls) return;
        /* play() resets the low-quality flag for "new" content and reads the
           content key from its options — so the key is passed back in, or the
           engine memory for this channel was lost on every YELLOW press. */
        const key = this._contentKey;
        this.play(this._urls, { key: key });
        this._lowQuality = true;
        this._flash("Lowest quality");
    }

    /* hls.js is ~400 KB and only needed when a stream reaches the HLS tier, so
       it loads on first use. One load for the whole page: the in-flight state
       used to live on each player, so Multiview's four tiles could each append
       their own copy of the script at the same moment. */
    /** Load HLS.js once and call queued listeners when available.
     * @param {Function} callback - Callback invoked when HLS.js has loaded.
     * @returns {void} Updates decoder state or the video UI.
     */
    _loadHls(callback) {
        if (typeof Hls !== "undefined") { callback(); return; }
        const q = IPTVPlayer._hlsQueue || (IPTVPlayer._hlsQueue = []);
        q.push(callback);
        if (q.length > 1) return;
        const s = document.createElement("script");
        s.src = "../assets/hls.min.js";
        const flush = function () {
            const fns = IPTVPlayer._hlsQueue || [];
            IPTVPlayer._hlsQueue = null;
            fns.forEach(function (fn) { fn(); });
        };
        s.onload = flush;
        s.onerror = flush;
        document.head.appendChild(s);
    }
}

const player = new IPTVPlayer();
