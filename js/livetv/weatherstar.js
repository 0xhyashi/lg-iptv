/* WeatherStar 4000+ as a Bunkhouse TV channel.
 * The WeatherStar site is built byte-for-byte from pinned upstream source by
 * tools/build-weatherstar.js and shown in an iframe. We never modify its
 * graphics, music, fonts, or forecast logic. No HLS/DRM decoder is involved.
 */
var WeatherChannel = (function () {
    "use strict";
    var active = false;
    var hosted = false;
    var lastUrl = "";
    var defaultCity = "Ellicott City, Maryland, USA";
    function $(id) { return document.getElementById(id); }
    function getCity() {
        try { return localStorage.getItem("bunkhouse_weather_city") || defaultCity; }
        catch (_) { return defaultCity; }
    }
    function saveCity(city) {
        try { localStorage.setItem("bunkhouse_weather_city",city); } catch (_) {}
    }
    function weatherURL() {
        var base = hosted ? "https://weatherstar.netbymatt.com/"
                          : "../weatherstar/index.html";
        // Kiosk here is WeatherStar's native display setting, not an imitation.
        // Its own source code owns the graphics, NWS fetches and music player.
        var params = "?latLonQuery=" + encodeURIComponent(getCity()) +
            "&kiosk=true&mediaPlaying=true&mediaVolume=0.65&viewMode=standard";
        return base + params;
    }
    function setMessage(txt) {
        var status = $("weatherstar-status");
        if (status) status.textContent = txt;
    }
    function navigate() {
        if (!active) return;
        var frame = $("weatherstar-frame");
        if (!frame) return;
        lastUrl = weatherURL();
        frame.src = lastUrl;
        setMessage(hosted ? "Loading original hosted WeatherStar…" : "Loading bundled WeatherStar 4000+…");
        var label = $("weatherstar-source");
        if (label) label.textContent = hosted ? "USE LOCAL COPY" : "TRY ONLINE COPY";
        var city = $("weatherstar-city");
        if (city) city.value = getCity();
    }
    function open() {
        var root = $("weatherstar-view");
        if (!root) return;
        active = true;
        root.style.display = "flex";
        var video = $("player");
        if (video) video.style.display = "none";
        var msg = $("player-msg");
        if (msg) msg.style.display = "none";
        navigate();
    }
    function close() {
        active = false;
        var root = $("weatherstar-view");
        if (root) root.style.display = "none";
        var frame = $("weatherstar-frame");
        // Dropping the frame URL stops the upstream music immediately.
        if (frame) frame.src = "about:blank";
        lastUrl = "";
        var video = $("player");
        if (video) video.style.display = "block";
    }
    function backToChannels() {
        if (typeof isFullscreen === "function" && isFullscreen()) {
            toggleFullscreen();
            return;
        }
        close();
        currentChannel = null;
        var msg = $("player-msg");
        if (msg) { msg.style.display = "flex"; msg.textContent = "Select a TV channel"; }
        if (typeof setTVZone === "function") setTVZone("channel-list");
        var list = $("channel-list-wrap");
        if (list) { try { list.focus(); } catch (_) {} }
    }
    function handleKey(e, key) {
        if (!active) return false;
        if (key === 461 || key === 27 || key === 8) { // webOS Back / Escape
            e.preventDefault();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
            backToChannels();
            return true;
        }
        return false;
    }
    function setup() {
        var frame = $("weatherstar-frame"), city = $("weatherstar-city");
        if (!frame) return;
        if (city) city.value = getCity();
        var locBtn = $("weatherstar-location-go");
        if (locBtn) locBtn.addEventListener("click", function () {
            var val = (city && city.value || "").trim();
            if (!val) { setMessage("Enter a US ZIP code or City, State.");return; }
            if (val.length > 110) { setMessage("Location is too long.");return; }
            saveCity(val);navigate();
        });
        if (city) city.addEventListener("keydown", function (e) {
            if (e.keyCode === 13) { e.preventDefault(); locBtn.click(); }
        });
        var home = $("weatherstar-exit");
        if (home) home.addEventListener("click",function(e){e.stopPropagation();backToChannels();});
        var toggle = $("weatherstar-fullscreen");
        if (toggle) toggle.addEventListener("click",function(e){e.stopPropagation();toggleFullscreen();});
        var source = $("weatherstar-source");
        if (source) source.addEventListener("click",function(e){
            e.stopPropagation(); hosted = !hosted; navigate();
        });
        var music = $("weatherstar-music");
        if (music) music.addEventListener("click",function(e){
            e.stopPropagation();
            try {
                var ownDoc = frame.contentWindow.document;
                var button = ownDoc.getElementById("ToggleMedia");
                if (button) { button.click();setMessage("WeatherStar music toggled");return; }
            } catch (_) {}
            // In a hosted cross-origin iframe we cannot control its DOM, so
            // never pretend to have changed the volume or state.
            setMessage("For the online copy, use WeatherStar's own music button.");
        });
        frame.addEventListener("load",function(){
            if (!active || frame.src.indexOf("about:blank") !== -1) return;
            setMessage(hosted ? "WeatherStar online • original graphics and music" :
                                "WeatherStar 4000+ • bundled original source");
            try {
                // Local packaged iframe, same application: exit with LG Back
                // even when the iframe has keyboard focus.
                var child = frame.contentWindow;
                if (!child.__bunkhouseBackHooked) {
                    child.addEventListener("keydown", function(e){
                        if (e.keyCode === 461 || e.keyCode === 27 || e.keyCode === 8) {
                            e.preventDefault();e.stopImmediatePropagation();
                            backToChannels();
                        }
                    },true);
                    child.__bunkhouseBackHooked = true;
                }
            } catch (_) { /* Cross-origin hosted fallback: use visible EXIT. */ }
        });
    }
    return {setup:setup,open:open,close:close,isOpen:function(){return active;},
            handleKey:handleKey,backToChannels:backToChannels};
}());
