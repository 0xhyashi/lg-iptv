/* WeatherStar's original graphics + user-selectable continuous soundtrack.
 *
 * Forecast: pristine upstream ws4kp built from pinned source.
 * Local original soundtrack: its 17-song shuffled native player, unmodified.
 * External: Nightwave Plaza or SomaFM public MP3 through ONE parent <audio>.
 * Only one soundtrack is allowed at a time. We explicitly reload WeatherStar
 * with mediaPlaying=false when LEAVING Classic so its built-in audio is shut
 * down before starting the live stream. The forecast UI source is untouched.
 */
var WeatherChannel = (function () {
    "use strict";
    var active = false;
    var hosted = false;
    var defaultCity = "Ellicott City, Maryland, USA";
    var DEFAULT_SOUND = "nightwave";
    var sounds = {
        nightwave: {
            name: "Nightwave Plaza",
            url: "https://radio.plaza.one/mp3"
        },
        classic: {
            name: "Classic WeatherStar (17 local songs)",
            url: ""
        },
        soma: {
            name: "SomaFM Vaporwaves",
            url: "https://ice5.somafm.com/vaporwaves-128-mp3"
        }
    };
    var soundtrack = DEFAULT_SOUND;
    var soundPaused = false;
    var loadSerial = 0;

    function $(id) { return document.getElementById(id); }
    function externalPlayer() { return $("weatherstar-external-audio"); }
    function getCity() {
        try { return localStorage.getItem("bunkhouse_weather_city") || defaultCity; }
        catch (_) { return defaultCity; }
    }
    function saveCity(city) {
        try { localStorage.setItem("bunkhouse_weather_city", city); } catch (_) {}
    }
    function restoreSound() {
        try {
            var saved = localStorage.getItem("bunkhouse_weather_soundtrack");
            if (sounds[saved]) soundtrack = saved;
        } catch (_) {}
    }
    function rememberSound() {
        try { localStorage.setItem("bunkhouse_weather_soundtrack", soundtrack); }
        catch (_) {}
    }
    function setMessage(text) {
        var status = $("weatherstar-status");
        if (status) status.textContent = text;
    }
    function updateControls() {
        var select = $("weatherstar-soundtrack");
        if (select) select.value = soundtrack;
        var toggle = $("weatherstar-music");
        if (toggle) {
            toggle.textContent = soundtrack === "classic"
                ? (soundPaused ? "▶ PLAY CLASSIC" : "♫ CLASSIC MUSIC")
                : (soundPaused ? "▶ PLAY SOUND" : "Ⅱ PAUSE SOUND");
            toggle.title = soundtrack === "classic"
                ? "Toggle WeatherStar's original 17-track shuffle (press if silent)"
                : "Pause or resume the selected live internet-radio station";
        }
    }
    // WeatherStar 8.2.2 normally geocodes latLonQuery with ArcGIS /find
    // BEFORE it makes any NWS request. That step is the source of the exact
    // "Location search isn't responding" startup error on the TV.
    // Supplying BOTH latLon and latLonQuery skips that fragile extra lookup.
    // The initial city is known and requires no network-based geocoding.
    var defaultCoordinates = {lat: 39.2673, lon: -76.7983};
    function coordsOK(p) {
        return p && isFinite(p.lat) && isFinite(p.lon) &&
            p.lat >= -90 && p.lat <= 90 && p.lon >= -180 && p.lon <= 180;
    }
    function getCachedCoordinates(city) {
        if (String(city).toLowerCase().trim() === defaultCity.toLowerCase()) {
            return defaultCoordinates;
        }
        try {
            var old = JSON.parse(localStorage.getItem("bunkhouse_weather_coords") || "null");
            if (old && old.city === city && coordsOK(old.coords)) return old.coords;
        } catch (_) {}
        return null;
    }
    function storeCoordinates(city, coords) {
        try {
            localStorage.setItem("bunkhouse_weather_coords", JSON.stringify({
                city: city, coords: coords
            }));
        } catch (_) {}
    }
    function resolveCoordinates(city) {
        var cached = getCachedCoordinates(city);
        if (cached) return Promise.resolve(cached);
        var direct = /^\\s*(-?\\d{1,2}(?:\\.\\d+)?)\\s*,\\s*(-?\\d{1,3}(?:\\.\\d+)?)\\s*$/.exec(city);
        if (direct) {
            var given = {lat: Number(direct[1]), lon: Number(direct[2])};
            if (coordsOK(given)) return Promise.resolve(given);
            return Promise.reject(new Error("Invalid latitude/longitude."));
        }
        if (/^\\d{5}$/.test(city)) {
            return fetch("https://api.zippopotam.us/us/" + encodeURIComponent(city)).then(function(resp) {
                if (!resp.ok) throw new Error("ZIP code not found");
                return resp.json();
            }).then(function(data) {
                var place = data && data.places && data.places[0];
                if (!place) throw new Error("ZIP code has no coordinates");
                var coords = {lat:Number(place.latitude), lon:Number(place.longitude)};
                if (!coordsOK(coords)) throw new Error("Invalid ZIP coordinates");
                storeCoordinates(city, coords);
                return coords;
            });
        }
        // For non-default cities, geocode once in the Bunkhouse parent window.
        // Unlike the upstream iframe, this window has our webOS fetch polyfills.
        var endpoint = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/find" +
            "?f=json&text=" + encodeURIComponent(city);
        return fetch(endpoint).then(function(resp) {
            if (!resp.ok) throw new Error("Location lookup HTTP " + resp.status);
            return resp.json();
        }).then(function(data) {
            var geometry = data && data.locations && data.locations[0] &&
                data.locations[0].feature && data.locations[0].feature.geometry;
            if (!geometry) throw new Error("Location not found");
            var coords = {lat:Number(geometry.y), lon:Number(geometry.x)};
            if (!coordsOK(coords)) throw new Error("Location has invalid coordinates");
            storeCoordinates(city,coords);
            return coords;
        });
    }
    function weatherURL(coords) {
        var base = hosted ? "https://weatherstar.netbymatt.com/"
                          : "../weatherstar/index.html";
        var isClassic = soundtrack === "classic";
        var query = "?latLonQuery=" + encodeURIComponent(getCity());
        if (coords && coordsOK(coords)) {
            // Bypasses upstream ArcGIS findLocation() and loads NWS directly.
            query += "&latLon=" + encodeURIComponent(JSON.stringify(coords));
        }
        return base + query +
            "&kiosk=true&mediaPlaying=" + (isClassic && !soundPaused ? "true" : "false") +
            "&mediaVolume=0.65&viewMode=standard";
    }
    function stopExternal() {
        var player = externalPlayer();
        if (!player) return;
        // Reset the network connection; never keep radio streaming after exit.
        try { player.pause(); } catch (_) {}
        player.removeAttribute("src");
        try { player.load(); } catch (_) {}
    }
    function startExternal() {
        if (!active || soundtrack === "classic" || soundPaused) return;
        var player = externalPlayer();
        if (!player) { setMessage("Weather audio player unavailable.");return; }
        var url = sounds[soundtrack].url;
        if (!url) return;
        if (player.getAttribute("src") !== url) {
            stopExternal();
            player.src = url;
        }
        updateControls();
        setMessage("Connecting to " + sounds[soundtrack].name + "…");
        var id = ++loadSerial;
        var playResult;
        try { playResult = player.play(); }
        catch (_) {
            setMessage("Press PLAY SOUND to start " + sounds[soundtrack].name + ".");
            soundPaused = true;updateControls();return;
        }
        if (playResult && typeof playResult.catch === "function") {
            playResult.catch(function (error) {
                if (active && id === loadSerial && soundtrack !== "classic") {
                    soundPaused = true;
                    updateControls();
                    setMessage(error && error.name === "NotAllowedError"
                        ? "LG blocked automatic audio: press PLAY SOUND."
                        : "Couldn't start " + sounds[soundtrack].name + ". Press PLAY SOUND to retry.");
                }
            });
        }
    }
    function getNativeButton() {
        var frame = $("weatherstar-frame");
        try { return frame && frame.contentWindow &&
            frame.contentWindow.document.getElementById("ToggleMedia"); }
        catch (_) {return null;}
    }
    function toggleClassic() {
        var button = getNativeButton();
        if (button) {
            // Real click controls the ORIGINAL WeatherStar native shuffle;
            // may still need user gesture on older webOS browsers.
            button.click();
            var pressed = button.getAttribute("aria-pressed");
            soundPaused = pressed !== "true";
            updateControls();
            setMessage(soundPaused ? "Classic WeatherStar paused." :
                "Classic WeatherStar: 17-song shuffled soundtrack.");
            return;
        }
        if (!hosted) {
            // The frame may still be loading; make the request explicit.
            soundPaused = !soundPaused;
            updateControls();
            navigate();
            setMessage("WeatherStar is loading; press PLAY SOUND after it appears if needed.");
        } else {
            setMessage("Use WeatherStar's own music icon to play the hosted copy.");
        }
    }
    function navigate() {
        if (!active) return;
        // Never let previous location resolutions reload a different channel.
        var navigationId = ++loadSerial;
        stopExternal();
        var frame = $("weatherstar-frame");
        if (!frame) return;
        var city = getCity(), input = $("weatherstar-city");
        if (input) input.value = city;
        frame.src = "about:blank";
        var source = $("weatherstar-source");
        if (source) source.textContent = hosted ? "USE LOCAL COPY" : "TRY ONLINE COPY";
        updateControls();
        setMessage("Finding forecast coordinates for " + city + "…");
        resolveCoordinates(city).then(function(coords) {
            if (!active || navigationId !== loadSerial) return;
            frame.src = weatherURL(coords);
            setMessage(hosted ? "Loading original hosted WeatherStar…" :
                "Loading original WeatherStar 4000+ forecast…");
        }).catch(function(error) {
            if (!active || navigationId !== loadSerial) return;
            setMessage("Cannot find location: " + (error && error.message || "lookup failed") +
                ". Try a US ZIP code or latitude,longitude.");
        });
    }
    function open() {
        if (active) return;
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
        if (!active) return;
        active = false;
        ++loadSerial;
        stopExternal();
        var root = $("weatherstar-view");
        if (root) root.style.display = "none";
        var frame = $("weatherstar-frame");
        // Unload the actual upstream player, which stops any classic music.
        if (frame) frame.src = "about:blank";
        var video = $("player");
        if (video) video.style.display = "block";
    }
    function backToChannels() {
        if (typeof isFullscreen === "function" && isFullscreen()) {
            toggleFullscreen();return;
        }
        close();
        currentChannel = null;
        var msg = $("player-msg");
        if (msg) {msg.style.display="flex";msg.textContent="Select a TV channel";}
        if (typeof setTVZone === "function") setTVZone("channel-list");
        var list = $("channel-list-wrap");
        if (list) {try {list.focus();}catch (_) {}}
    }
    function changeSound(next) {
        if (!sounds[next] || next === soundtrack) return;
        var wasClassic = soundtrack === "classic";
        var nowClassic = next === "classic";
        ++loadSerial;
        stopExternal();
        soundtrack = next;
        soundPaused = false;
        rememberSound();
        updateControls();
        if (!active) return;
        if (wasClassic !== nowClassic) {
            // A reload replaces the WeatherStar media player, guaranteeing
            // the previous sound is stopped even for a cross-origin frame.
            navigate();
        } else {
            startExternal();
        }
    }
    function toggleSound() {
        if (!active) return;
        if (soundtrack === "classic") {toggleClassic();return;}
        var player = externalPlayer();
        if (!player) return;
        if (!soundPaused && !player.paused) {
            soundPaused = true;
            ++loadSerial;
            player.pause();
            setMessage(sounds[soundtrack].name + " paused.");
        } else {
            soundPaused = false;
            startExternal();
        }
        updateControls();
    }
    function cycleSound(step) {
        var options = ["nightwave", "classic", "soma"];
        var index = options.indexOf(soundtrack);
        changeSound(options[(index + options.length + (step || 1)) % options.length]);
        updateControls();
    }
    function handleKey(e, key) {
        if (!active) return false;
        var focus = document.activeElement;
        var fid = focus && focus.id || "";
        if (fid === "weatherstar-city" && key !== 461 && key !== 27 && key !== 8
            && key !== 415 && key !== 19 && key !== 179) {
            // Let the native TV keyboard edit the City/ZIP field.
            return false;
        }
        if (key === 38 || key === 40) {
            e.preventDefault();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
            if (fid === "weatherstar-soundtrack") {
                cycleSound(key === 38 ? -1 : 1);
            } else {
                var select = $("weatherstar-soundtrack");
                if (select) select.focus();
            }
            return true;
        }
        if (key === 37 || key === 39) {
            e.preventDefault();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
            var ids = ["weatherstar-city","weatherstar-location-go",
                "weatherstar-soundtrack","weatherstar-music","weatherstar-source",
                "weatherstar-fullscreen","weatherstar-exit"];
            var idx = ids.indexOf(fid);
            var newIdx = idx === -1 ? 2 : (idx + ids.length + (key === 37 ? -1 : 1)) % ids.length;
            var target = $(ids[newIdx]);
            if (target) target.focus();
            return true;
        }
        if (key === 13) {
            if (fid === "weatherstar-soundtrack") {
                e.preventDefault();
                if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
                cycleSound(1);return true;
            }
            if (/^weatherstar-(?:music|source|fullscreen|exit|location-go)$/.test(fid)) {
                e.preventDefault();
                if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
                focus.click();return true;
            }
        }
        if (key === 461 || key === 27 || key === 8) {
            e.preventDefault();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
            backToChannels();
            return true;
        }
        if (key === 415 || key === 19 || key === 179) {
            e.preventDefault();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
            if (soundtrack === "classic") {
                if (key === 179 || key === 415 || key === 19) toggleClassic();
            } else if (key === 179 || key === 415 && soundPaused || key === 19 && !soundPaused) {
                toggleSound();
            }
            return true;
        }
        return false;
    }
    function onFrameLoaded() {
        if (!active) return;
        var frame = $("weatherstar-frame");
        if (!frame || frame.src.indexOf("about:blank") !== -1) return;
        if (soundtrack !== "classic") {
            startExternal(); // source URL explicitly mutes native WeatherStar
        } else {
            updateControls();
            setMessage("Classic WeatherStar ready. Press CLASSIC MUSIC if the browser blocks autoplay.");
        }
        try {
            var child = frame.contentWindow;
            if (child && !child.__bunkhouseWeatherKeys) {
                child.addEventListener("keydown",function(e){
                    var key = e.keyCode || e.which;
                    // Key events originating inside the iframe never bubble to
                    // the parent; mirror BLUE soundtrack-cycle behavior here.
                    if (key === 406 || key === 77) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        cycleSound(1);
                        return;
                    }
                    handleKey(e,key);
                },true);
                child.__bunkhouseWeatherKeys=true;
            }
        } catch (_) {
            // Hosted cross-origin playback: toolbar stays outside the frame.
        }
    }
    function setup() {
        var frame = $("weatherstar-frame"), city = $("weatherstar-city");
        if (!frame) return;
        restoreSound();
        soundPaused = false;
        if (city) city.value = getCity();
        updateControls();
        var select = $("weatherstar-soundtrack");
        if (select) select.addEventListener("change",function(){changeSound(select.value);});
        var locBtn = $("weatherstar-location-go");
        if (locBtn) locBtn.addEventListener("click",function(){
            var val = (city && city.value || "").trim();
            if (!val) {setMessage("Enter a US ZIP code or City, State.");return;}
            if (val.length > 110) {setMessage("Location is too long.");return;}
            saveCity(val);navigate();
        });
        if (city) city.addEventListener("keydown",function(e){
            if (e.keyCode === 13) {e.preventDefault();locBtn.click();}
        });
        var exit = $("weatherstar-exit");
        if (exit) exit.addEventListener("click",function(e){e.stopPropagation();backToChannels();});
        var fullscreen = $("weatherstar-fullscreen");
        if (fullscreen) fullscreen.addEventListener("click",function(e){e.stopPropagation();toggleFullscreen();});
        var source = $("weatherstar-source");
        if (source) source.addEventListener("click",function(e){
            e.stopPropagation();hosted=!hosted;navigate();
        });
        var music = $("weatherstar-music");
        if (music) music.addEventListener("click",function(e){
            e.stopPropagation();toggleSound();
        });
        var player = externalPlayer();
        if (player) {
            player.addEventListener("playing",function(){
                if (active && soundtrack !== "classic" && !soundPaused) {
                    setMessage("LIVE • " + sounds[soundtrack].name + " • 24/7 vaporwave");
                }
            });
            player.addEventListener("waiting",function(){
                if (active && soundtrack !== "classic" && !soundPaused)
                    setMessage("Buffering " + sounds[soundtrack].name + "…");
            });
            player.addEventListener("error",function(){
                if (active && soundtrack !== "classic" && !soundPaused)
                    setMessage("Radio stream unavailable. Press PAUSE then PLAY SOUND to retry.");
            });
        }
        frame.addEventListener("load",onFrameLoaded);
    }
    return {setup:setup,open:open,close:close,
        isOpen:function(){return active;},changeSound:changeSound,cycleSound:cycleSound,
        handleKey:handleKey,backToChannels:backToChannels};
}());
