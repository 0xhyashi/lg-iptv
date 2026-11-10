/* hamradio.js — Bunkhouse live receiver / voice-scanner screen.
 *
 * Loads the original SDR websites in one iframe: the actual receiver owns its
 * waterfall AND decoded audio, while SpinTheDial owns voice discovery. We do
 * not generate fake spectrum pixels or pretend that a loud carrier is speech.
 * Switching sources unloads the previous iframe to release its audio/session.
 *
 * Browser security forbids controlling a cross-origin receiver from here.
 * The "Find Voices" provider interface is therefore interactive, not a native
 * one-click frequency transfer to the separate New Orleans receiver.
 */
(function () {
    'use strict';

    var DEFAULT_RECEIVER = 'https://kb5avy.tunnel.ubersdr.org/';
    var VOICE_SCANNER = 'https://spinthedial.live/';
    var STORE_KEY = 'bunkhouse_ham_receiver_url';
    var frame = document.getElementById('ham-frame');
    var source = document.getElementById('ham-source');
    var status = document.getElementById('ham-status');
    var receiverButton = document.getElementById('ham-receiver');
    var scanButton = document.getElementById('ham-scan');
    var mode = 'receiver';
    var loadSerial = 0;
    var pendingLoad = null;

    /** Show non-deceptive status text: iframe.onload does not prove SDR works.
     * @param {string} message - Status for the user.
     * @returns {void} Updates the footer.
     */
    function showStatus(message) {
        status.textContent = message;
    }

    /** Accept only HTTP(S) receiver URLs, including literal IPv6 host URLs.
     * @param {string} raw - Input URL.
     * @returns {string|null} URL or null when invalid/unsafe.
     */
    function validReceiver(raw) {
        var trimmed = String(raw || '').trim();
        if (!/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(trimmed)) return null;
        // User-supplied URLs are never evaluated or inserted as HTML.
        return trimmed;
    }

    /** Load the saved receiver endpoint without requiring storage to work.
     * @returns {string} Safe receiver URL.
     */
    function loadReceiver() {
        try { return validReceiver(localStorage.getItem(STORE_KEY)) || DEFAULT_RECEIVER; }
        catch (_) { return DEFAULT_RECEIVER; }
    }

    /** Unload remote audio and invalidate a pending delayed frame navigation.
     * @returns {void} Stops the current embedded site.
     */
    function clearFrame() {
        loadSerial += 1;
        if (pendingLoad !== null) { clearTimeout(pendingLoad); pendingLoad = null; }
        if (frame) frame.src = 'about:blank';
    }

    /** Navigate the embedded frame to one real SDR/scanner provider.
     * @param {string} url - Validated HTTP(S) provider URL.
     * @returns {void} Changes the frame's navigation.
     */
    function openFrame(url) {
        clearFrame();
        var serial = loadSerial;
        // One iframe and one source at a time prevents overlapping audio.
        pendingLoad = setTimeout(function () {
            pendingLoad = null;
            if (serial !== loadSerial) return;
            frame.src = url;
        }, 30);
    }

    /** Choose the receiver's real waterfall or the real voice scanner site.
     * @param {string} next - "receiver" or "scan".
     * @returns {void} Switches the remote SDR view.
     */
    function setMode(next) {
        mode = next === 'scan' ? 'scan' : 'receiver';
        document.body.classList.toggle('ham-scanning', mode === 'scan');
        receiverButton.classList.toggle('ham-selected', mode === 'receiver');
        scanButton.classList.toggle('ham-selected', mode === 'scan');
        document.getElementById('ham-window-label').textContent = mode === 'scan'
            ? 'VOICE DISCOVERY / SPIN THE DIAL'
            : 'LIVE WATERFALL / RECEIVER FEED';
        document.getElementById('ham-focus').textContent = mode === 'scan'
            ? 'CONTROL SCANNER ▶' : 'CONTROL RECEIVER ▶';
        showStatus(mode === 'scan'
            ? 'Loading live voice-scanner provider…'
            : 'Loading actual SDR waterfall from remote receiver…');
        openFrame(mode === 'scan' ? VOICE_SCANNER : validReceiver(source.value) || DEFAULT_RECEIVER);
    }

    /** Validate and remember the chosen remote receiver before reloading it.
     * @returns {void} Applies the URL only when valid.
     */
    function applyReceiver() {
        var url = validReceiver(source.value);
        if (!url) {
            showStatus('Please enter a complete http:// or https:// receiver URL.');
            source.focus();
            return;
        }
        source.value = url;
        try { localStorage.setItem(STORE_KEY, url); } catch (_) {}
        setMode('receiver');
    }

    /** Release the remote frame before returning to Bunkhouse TV and radio.
     * @returns {void} Navigates back to Live TV.
     */
    function goBack() {
        clearFrame();
        window.location.href = '../pages/livetv.html';
    }

    /** Keep a usable D-pad control strip without hijacking the provider keys.
     * @param {KeyboardEvent} event - LG remote key event.
     * @returns {void} Handles keys outside the third-party iframe.
     */
    function handleKey(event) {
        var key = event.keyCode || event.which;
        if (key === 461 || key === 27 || key === 8) {
            event.preventDefault();
            goBack();
            return;
        }
        var active = document.activeElement;
        if (active === source || active === frame) return;
        if (key !== 37 && key !== 39 && key !== 38 && key !== 40) return;
        var elements = [
            receiverButton, scanButton,
            document.getElementById('ham-reload'),
            document.getElementById('ham-back'),
            source, document.getElementById('ham-apply'),
            document.getElementById('ham-focus')
        ];
        var index = elements.indexOf(active);
        if (index < 0) index = 0;
        var step = (key === 37 || key === 38) ? -1 : 1;
        var next = (index + step + elements.length) % elements.length;
        event.preventDefault();
        elements[next].focus();
    }

    /** Wire actions once; never take audio ownership from the real SDR site.
     * @returns {void} Installs the receiver page handlers.
     */
    function init() {
        if (!frame || !source || !status) return;
        source.value = loadReceiver();
        receiverButton.addEventListener('click', function () { setMode('receiver'); });
        scanButton.addEventListener('click', function () { setMode('scan'); });
        document.getElementById('ham-reload').addEventListener('click', function () { setMode(mode); });
        document.getElementById('ham-apply').addEventListener('click', applyReceiver);
        document.getElementById('ham-back').addEventListener('click', goBack);
        document.getElementById('ham-focus').addEventListener('click', function () {
            frame.focus();
            showStatus('Receiver controls are provided by the website; use the Magic Remote if D-pad focus is limited.');
        });
        frame.addEventListener('load', function () {
            if (frame.getAttribute('src') === 'about:blank') return;
            // A frame can fire "load" even when X-Frame-Options blocks rendering.
            showStatus('Site requested. If blank: receiver blocks embedding or webOS lacks browser support.');
        });
        frame.addEventListener('error', function () {
            showStatus('Remote SDR page failed to load. Check your connection or try a different receiver URL.');
        });
        window.addEventListener('keydown', handleKey, true);
        window.addEventListener('pagehide', clearFrame);
        receiverButton.focus();
        setMode('receiver');
    }

    init();
}());
