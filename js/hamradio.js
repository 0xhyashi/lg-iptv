/* hamradio.js — native UberSDR spectrum and live voice-activity discovery.
 *
 * This file never embeds a provider site, fabricates signal samples or
 * identifies a random FFT peak as speech. The waterfall consumes genuine
 * public GET /api/noisefloor/fft?band=... samples; voice buttons consume
 * GET /api/noisefloor/voice-activity/all from the SAME receiver.
 *
 * Browser cross-origin access requires the operator to enable CORS or use an
 * explicitly configured local API bridge. If denied, report the limitation;
 * never silently substitute animation or unrelated scanner results.
 *
 * Audio demodulation is not implemented by these JSON-only endpoints.
 * Frequency snapping updates the waterfall marker and selected band, not
 * live decoded sound. UI says so rather than implying listening works.
 */
(function () {
    'use strict';

    var RECEIVER = 'https://kb5avy.tunnel.ubersdr.org';
    var STORE_KEY = 'bunkhouse_ham_receiver_url';
    var POLL_FFT_MS = 2800;
    var POLL_VOICE_MS = 6500;
    var selected = null;
    var activities = [];
    var generation = 0;
    var fftTimer = null;
    var voiceTimer = null;
    var fftRequest = null;
    var voiceRequest = null;
    var spectrumStream = null;
    var streamAttempted = false;
    var streamLive = false;
    var encodedBins = null;
    var startHz = 0;
    var endHz = 0;
    var firstFFT = true;
    var spectrumOK = false;
    var fftErrors = 0;
    var connectedBase = null;
    var ctx = null;
    var palette = [];

    /** Find an element by ID.
     * @param {string} id - Element id.
     * @returns {HTMLElement|null} A DOM node if present.
     */
    function $(id) { return document.getElementById(id); }

    /** Write footer status without sending private input to remote sites.
     * @param {string} message - A short connection state.
     * @returns {void} Updates the status line.
     */
    function showStatus(message) { $('ham-status').textContent = message; }

    /** Validate an HTTP(S) receiver origin; API paths are appended internally.
     * @param {string} raw - Entered receiver or local-bridge origin.
     * @returns {string|null} A safe origin, or null.
     */
    function cleanBase(raw) {
        var value = String(raw || '').trim().replace(/\/+$/, '');
        if (!/^https?:\/\/(?:\[[0-9a-fA-F:.]+\]|[a-zA-Z0-9.-]+)(?::[0-9]{1,5})?$/i.test(value)) return null;
        return value;
    }

    /** Restore a receiver URL from this TV only.
     * @returns {string} Saved or default receiver URL.
     */
    function savedBase() {
        try { return cleanBase(localStorage.getItem(STORE_KEY)) || RECEIVER; }
        catch (_) { return RECEIVER; }
    }

    /** Fetch JSON from the receiver using legacy-webOS-compatible XHR.
     * @param {string} url - Full fixed API endpoint URL.
     * @param {function} done - Callback(error, body, httpStatus).
     * @returns {XMLHttpRequest|null} Abortable in-flight request, or null.
     */
    function requestJSON(url, done) {
        var xhr;
        try {
            xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.timeout = 8000;
            xhr.onload = function () {
                if (xhr.status < 200 || xhr.status >= 300) {
                    done('HTTP ' + xhr.status, null, xhr.status);
                    return;
                }
                try { done(null, JSON.parse(xhr.responseText), xhr.status); }
                catch (_) { done('Invalid JSON response', null, xhr.status); }
            };
            xhr.onerror = function () {
                done('Network/CORS blocked (receiver must permit external API clients)', null, 0);
            };
            xhr.ontimeout = function () { done('Receiver request timed out', null, 0); };
            xhr.send(null);
            return xhr;
        } catch (_) {
            done('Cannot open receiver API. Check URL, TLS and webOS CORS support.', null, 0);
            return null;
        }
    }

    /** Build a fixed palette. Brightness reflects only actual incoming bins.
     * @returns {void} Prepares 64 receiver-signal colors.
     */
    function setupPalette() {
        palette = [];
        for (var i = 0; i < 64; i++) {
            var v = i / 63, r, g, b;
            if (v < .32) {
                r = 3; g = 9 + 80*v/.32; b = 24 + 125*v/.32;
            } else if (v < .7) {
                var mid = (v-.32)/.38;
                r = 3 + 43*mid; g = 89 + 155*mid; b = 149 + 18*mid;
            } else {
                var high = (v-.7)/.3;
                r = 46 + 209*high; g = 244 - 19*high; b = 167 - 118*high;
            }
            palette.push('rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')');
        }
    }

    /** Change the marker when a voice is selected and real band bounds exist.
     * @returns {void} Positions or hides the tuned-frequency line.
     */
    function positionMarker() {
        var marker = $('ham-tune-marker');
        if (!selected || !startHz || !endHz ||
            selected.freq < startHz || selected.freq > endHz) {
            marker.style.display = 'none';
            return;
        }
        marker.style.left = ((selected.freq - startHz) * 100 / (endHz - startHz)).toFixed(2) + '%';
        marker.style.display = 'block';
    }

    /** Draw a waterfall row from actual receiver FFT bins and nothing else.
     * @param {Object} packet - /api/noisefloor/fft response.
     * @returns {boolean} True when a valid RF sample row was drawn.
     */
    function drawFFT(packet) {
        if (!packet || !Array.isArray(packet.data) || packet.data.length < 2) return false;
        var begin = Number(packet.start_freq), end = Number(packet.end_freq);
        if (!(begin >= 0 && end > begin)) return false;
        var canvas = $('ham-waterfall');
        if (!ctx) ctx = canvas.getContext('2d');
        if (!ctx) return false;

        startHz = begin; endHz = end;
        var width = canvas.width, height = canvas.height;
        if (firstFFT) {
            ctx.clearRect(0, 0, width, height);
            firstFFT = false;
        } else {
            // Each new horizontal line is a fresh measurement. Older rows
            // scroll down; drawImage copies the existing *real* canvas pixels.
            ctx.drawImage(canvas, 0, 0, width, height - 3, 0, 3, width, height - 3);
        }
        for (var x = 0; x < width; x++) {
            var idx = Math.min(packet.data.length - 1,
                Math.floor(x * packet.data.length / width));
            var db = Number(packet.data[idx]);
            if (!isFinite(db)) db = -256;
            var level = Math.max(0, Math.min(63, Math.floor((db + 124) * 63 / 77)));
            ctx.fillStyle = palette[level];
            ctx.fillRect(x, 0, 1, 3);
        }
        $('ham-freq-start').textContent = (begin / 1000000).toFixed(3) + ' MHz';
        $('ham-freq-end').textContent = (end / 1000000).toFixed(3) + ' MHz';
        $('ham-empty').style.display = 'none';
        $('ham-spectrum-status').textContent = 'REAL RF · ' + packet.data.length +
            ' frequency bins · ' + $('ham-band').value + ' · updated ' + new Date().toLocaleTimeString();
        positionMarker();
        return true;
    }

    /** Decode UberSDR's SPEC v1 spectrum packet from a live SSE event.
     * @param {string} base64 - Base64-encoded SPEC binary frame from receiver.
     * @returns {Array<number>|null} Real RF bins in dBFS or null if invalid.
     */
    function decodeSpectrumFrame(base64) {
        var bytes;
        try {
            var raw = atob(base64);
            bytes = new Uint8Array(raw.length);
            for (var i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        } catch (_) {return null;}
        if (bytes.length < 23 || bytes[0] !== 83 || bytes[1] !== 80 ||
            bytes[2] !== 69 || bytes[3] !== 67 || bytes[4] !== 1) return null;
        var flags = bytes[5];
        if (flags === 3) {
            encodedBins = Array.prototype.slice.call(bytes, 22);
        } else if (flags === 4) {
            if (!encodedBins || bytes.length < 24) return null;
            var count = bytes[22] + bytes[23]*256;
            if (bytes.length < 24 + count*3) return null;
            for (var j = 0; j < count; j++) {
                var offset = 24 + 3*j;
                var index = bytes[offset] + bytes[offset+1]*256;
                if (index >= encodedBins.length) return null;
                encodedBins[index] = bytes[offset+2];
            }
        } else return null;
        var results = new Array(encodedBins.length);
        for (var k = 0; k < encodedBins.length; k++) results[k] = encodedBins[k] - 256;
        return results;
    }

    /** Prefer the receiver's real-time spectrum SSE stream over slow polling.
     * @param {number} serial - Current receiver generation.
     * @returns {void} Opens a stream if the browser supports EventSource.
     */
    function openSpectrumStream(serial) {
        if (serial !== generation || streamAttempted) return;
        streamAttempted = true;
        if (typeof EventSource === 'undefined' || typeof atob !== 'function') return;
        try {
            spectrumStream = new EventSource(cleanBase($('ham-source').value) +
                '/api/noisefloor/spectrum/stream?band=' +
                encodeURIComponent($('ham-band').value));
        } catch (_) {spectrumStream = null;return;}
        spectrumStream.addEventListener('spectrum', function (event) {
            if (serial !== generation || event.lastEventId !== $('ham-band').value) return;
            var bins = decodeSpectrumFrame(event.data);
            if (!bins || !startHz || !endHz) return;
            if (drawFFT({start_freq:startHz,end_freq:endHz,data:bins})) {
                streamLive = true;
                spectrumOK = true;
                $('ham-spectrum-status').textContent =
                    'REAL RF · LIVE STREAM · ' + bins.length + ' FFT bins · ' +
                    new Date().toLocaleTimeString();
            }
        });
        spectrumStream.onerror = function () {
            if (serial !== generation) return;
            spectrumStream.close();
            spectrumStream = null;
            streamLive = false;
            $('ham-spectrum-status').textContent =
                'Realtime spectrum stream unavailable; using measured FFT snapshots.';
            // Retry normal read-only FFT polling rather than showing animation.
            if (fftTimer) {clearTimeout(fftTimer);fftTimer = null;}
            pollFFT(serial);
        };
    }

    /** Poll the receiver's genuine RF bins; avoid overlapping requests.
     * @param {number} serial - Current receiver configuration generation.
     * @returns {void} Schedules the next sample after completion.
     */
    function pollFFT(serial) {
        if (serial !== generation) return;
        var url = cleanBase($('ham-source').value) + '/api/noisefloor/fft?band=' +
            encodeURIComponent($('ham-band').value);
        fftRequest = requestJSON(url, function (error, response) {
            if (serial !== generation) return;
            fftRequest = null;
            if (error) {
                fftErrors++;
                $('ham-spectrum-status').textContent = 'RF SOURCE UNAVAILABLE: ' + error;
                if (fftErrors >= 2) {
                    $('ham-empty').style.display = 'flex';
                    $('ham-tune-marker').style.display = 'none';
                }
                if (!spectrumOK || fftErrors >= 2) $('ham-empty').textContent =
                    'NO REAL RF DATA — ' + error +
                    '. Try a CORS-enabled receiver or local read-only bridge.';
                showStatus('Spectrum offline: ' + error);
            } else if (streamLive ? true : drawFFT(response)) {
                fftErrors = 0;
                spectrumOK = true;
                openSpectrumStream(serial);
                showStatus('Receiver spectrum connected. Voice activity is read separately.');
            } else {
                $('ham-spectrum-status').textContent = 'No usable FFT bins in receiver response.';
            }
            fftTimer = setTimeout(function () {pollFFT(serial);}, streamLive ? 30000 : POLL_FFT_MS);
        });
    }

    /** Parse confirmed detector guesses into a sorted, frequency-tagged list.
     * @param {Object} response - UberSDR /voice-activity/all response.
     * @returns {Array<Object>} Bounded activity list with real frequencies.
     */
    function decodeVoices(response) {
        var out = [], bands = response && response.bands;
        if (!bands || typeof bands !== 'object') return out;
        for (var name in bands) {
            if (!Object.prototype.hasOwnProperty.call(bands, name)) continue;
            var entries = bands[name];
            if (!Array.isArray(entries)) continue;
            for (var i = 0; i < entries.length; i++) {
                var a = entries[i], f = Number(a.estimated_dial_freq || a.start_freq);
                var confidence = Number(a.confidence);
                if (!(f > 0) || !isFinite(f) || !(confidence >= .7)) continue;
                out.push({
                    band: name,
                    freq: f,
                    mode: String(a.mode || (f < 10000000 ? 'LSB' : 'USB')).toUpperCase(),
                    confidence: confidence,
                    snr: isFinite(Number(a.snr)) ? Number(a.snr) : 0,
                    callsign: String(a.dx_callsign || 'VOICE').slice(0, 24)
                });
            }
        }
        out.sort(function (a, b) {
            return b.confidence - a.confidence || b.snr - a.snr || a.freq - b.freq;
        });
        return out.slice(0, 60);
    }

    /** Display only the voice detections supplied by the same SDR instance.
     * @returns {void} Rebuilds the selectable voice list.
     */
    function renderVoices() {
        var list = $('ham-voice-list');
        while (list.firstChild) list.removeChild(list.firstChild);
        $('ham-voice-count').textContent = String(activities.length);
        if (!activities.length) {
            $('ham-voice-status').textContent =
                'No confirmed voice estimates. The receiver may have detection disabled, or the bands may be quiet.';
            return;
        }
        $('ham-voice-status').textContent =
            activities.length + ' activity estimates from this SDR · scanner checks every 6.5 seconds';
        for (var i = 0; i < activities.length; i++) {
            (function (activity) {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'ham-voice-row';
                var freq = document.createElement('span');
                freq.className = 'ham-voice-freq';
                freq.textContent = (activity.freq / 1000000).toFixed(4) + ' MHz';
                var meta = document.createElement('span');
                meta.className = 'ham-voice-meta';
                meta.textContent = activity.band + ' / ' + activity.mode + ' / ' +
                    Math.round(activity.confidence * 100) + '% · ' + activity.callsign;
                button.appendChild(freq);button.appendChild(meta);
                if (selected && selected.freq === activity.freq) button.className += ' ham-current';
                button.addEventListener('click', function () {selectVoice(activity);});
                list.appendChild(button);
            }(activities[i]));
        }
    }

    /** Highlight a detected voice and switch to its corresponding RF band.
     * @param {Object} voice - Real voice detector record.
     * @returns {void} Updates frequency and marker without inventing audio.
     */
    function selectVoice(voice) {
        if (!voice) return;
        selected = voice;
        $('ham-frequency').textContent = (voice.freq / 1000000).toFixed(4) + ' MHz';
        $('ham-mode').textContent = voice.mode + ' · ' + voice.band +
            ' · ' + Math.round(voice.confidence * 100) + '% DETECTION';
        var bandPicker = $('ham-band');
        if (bandPicker.value !== voice.band) {
            var possible = false;
            for (var i = 0; i < bandPicker.options.length; i++) {
                if (bandPicker.options[i].value === voice.band) possible = true;
            }
            if (possible) {
                bandPicker.value = voice.band;
                restart();
            }
        }
        positionMarker();
        renderVoices();
        showStatus('Selected ' + $('ham-frequency').textContent +
            '. Live tuner AUDIO not yet integrated; showing actual RF location.');
    }

    /** Cycle real voice candidates; when none are reported, request a refresh.
     * @param {number} delta - +1 next or -1 previous.
     * @returns {void} Selects next available voice.
     */
    function stepVoice(delta) {
        if (!activities.length) {
            pollVoices(generation);
            return;
        }
        var index = -1;
        for (var i = 0; i < activities.length; i++) {
            if (selected && activities[i].freq === selected.freq) {index = i;break;}
        }
        if (index < 0) index = delta < 0 ? 0 : -1;
        selectVoice(activities[(index + delta + activities.length) % activities.length]);
    }

    /** Query the same SDR instance's public voice-detector endpoint.
     * @param {number} serial - Connection generation.
     * @returns {void} Schedules a later request.
     */
    function pollVoices(serial) {
        if (serial !== generation || voiceRequest) return;
        if (voiceTimer) {clearTimeout(voiceTimer);voiceTimer = null;}
        var url = cleanBase($('ham-source').value) +
            '/api/noisefloor/voice-activity/all?min_confidence=0.7';
        voiceRequest = requestJSON(url, function (error, response) {
            if (serial !== generation) return;
            voiceRequest = null;
            if (error) {
                activities = [];
                renderVoices();
                $('ham-voice-status').textContent = 'Voice API unavailable: ' + error +
                    '. No unrelated website is loaded.';
            } else {
                activities = decodeVoices(response);
                renderVoices();
            }
            voiceTimer = setTimeout(function () {pollVoices(serial);}, POLL_VOICE_MS);
        });
    }

    /** Tear down outstanding XHRs and timers when receiver or band changes.
     * @returns {void} Invalidates the old data generation.
     */
    function stop() {
        generation++;
        if (fftTimer) {clearTimeout(fftTimer);fftTimer = null;}
        if (voiceTimer) {clearTimeout(voiceTimer);voiceTimer = null;}
        var oldFFT = fftRequest, oldVoice = voiceRequest;
        fftRequest = null;voiceRequest = null;
        if (oldFFT) try {oldFFT.abort();} catch (_) {}
        if (oldVoice) try {oldVoice.abort();} catch (_) {}
        if (spectrumStream) {spectrumStream.close();spectrumStream = null;}
        encodedBins = null;streamLive = false;streamAttempted = false;
    }

    /** Begin polling one actual receiver in the selected band.
     * @returns {void} Replaces the current spectrum session.
     */
    function restart() {
        var url = cleanBase($('ham-source').value);
        if (!url) {
            $('ham-spectrum-status').textContent = 'Invalid HTTP(S) receiver origin.';
            $('ham-source').focus();
            return;
        }
        stop();
        if (connectedBase !== url) {
            activities = [];
            selected = null;
            $('ham-frequency').textContent = 'NO SIGNAL SELECTED';
            $('ham-mode').textContent = $('ham-band').value + ' · WAITING FOR DATA';
            renderVoices();
        }
        connectedBase = url;
        try {localStorage.setItem(STORE_KEY, url);} catch (_) {}
        $('ham-source').value = url;
        firstFFT = true;spectrumOK = false;fftErrors = 0;startHz = endHz = 0;
        ctx = $('ham-waterfall').getContext('2d');
        if (ctx) ctx.clearRect(0, 0, $('ham-waterfall').width, $('ham-waterfall').height);
        $('ham-empty').style.display = 'flex';
        $('ham-empty').textContent = 'Waiting for live RF samples from the receiver…';
        $('ham-spectrum-status').textContent = 'Connecting to ' + url + ' · ' + $('ham-band').value + '…';
        positionMarker();
        pollFFT(generation);
        pollVoices(generation);
    }

    /** Return to channel guide and stop all network activity.
     * @returns {void} Navigates back to Live TV.
     */
    function goBack() {
        stop();
        window.location.href = '../pages/livetv.html';
    }

    /** TV remote navigation without requiring a pointer or external site.
     * @param {KeyboardEvent} e - LG key event.
     * @returns {void} Routes one key action.
     */
    function handleKey(e) {
        var key = e.keyCode || e.which;
        if (key === 461 || key === 8 || key === 27) {
            e.preventDefault();goBack();return;
        }
        var focus = document.activeElement;
        if (focus === $('ham-source') || focus === $('ham-band')) return;
        if (key === 13) {
            if (focus && focus.tagName === 'BUTTON') {e.preventDefault();focus.click();}
            return;
        }
        if (key === 38 || key === 40) {
            e.preventDefault();
            var rows = $('ham-voice-list').getElementsByTagName('button');
            if (key === 40 && rows.length) rows[0].focus();
            else $('ham-scan').focus();
            return;
        }
        if (key !== 37 && key !== 39) return;
        var nav = [$('ham-scan'),$('ham-prev'),$('ham-next'),$('ham-reload'),
            $('ham-back'),$('ham-source'),$('ham-apply'),$('ham-band')];
        var idx = nav.indexOf(focus);
        e.preventDefault();
        if (idx < 0) idx = 0;
        nav[(idx + (key === 37 ? -1 : 1) + nav.length) % nav.length].focus();
    }

    /** Install event handlers and start real SDR polling.
     * @returns {void} Initializes one receiver session.
     */
    function init() {
        var canvas = $('ham-waterfall');
        if (!canvas || !canvas.getContext) {
            showStatus('Canvas not supported by this webOS browser.');
            return;
        }
        setupPalette();
        $('ham-source').value = savedBase();
        $('ham-band').addEventListener('change', restart);
        $('ham-apply').addEventListener('click', restart);
        $('ham-reload').addEventListener('click', restart);
        $('ham-scan').addEventListener('click', function () {stepVoice(1);});
        $('ham-prev').addEventListener('click', function () {stepVoice(-1);});
        $('ham-next').addEventListener('click', function () {stepVoice(1);});
        $('ham-back').addEventListener('click', goBack);
        window.addEventListener('keydown', handleKey, true);
        window.addEventListener('pagehide', stop);
        $('ham-scan').focus();
        restart();
    }

    init();
}());
