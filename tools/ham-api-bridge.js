/* ham-api-bridge.js — OPTIONAL read-only LAN proxy for genuine UberSDR data.
 *
 * Run on a PC on the same network as the LG TV:
 *   node tools/ham-api-bridge.js
 * Enter http://YOUR-PC-LAN-IP:8787 as "UBERSDR API" in the HAM screen.
 *
 * Why: receiver operators may not allow cross-origin requests from file://
 * apps. The browser cannot bypass that. This tiny relay forwards only two
 * public, read-only endpoints and never synthesizes RF values or speech hits.
 *
 * The upstream is fixed. A client cannot use this server to contact arbitrary
 * hosts. No cookies or client credentials are forwarded upstream.
 */
'use strict';
const http = require('http');
const https = require('https');
const PORT = Number(process.env.BUNKHOUSE_SDR_BRIDGE_PORT || '8787');
const UPSTREAM = 'https://kb5avy.tunnel.ubersdr.org';

/** Reply with a safe JSON error and cross-origin permission.
 * @param {Object} res - HTTP response.
 * @param {number} status - HTTP status.
 * @param {string} reason - Human-readable failure message.
 * @returns {void} Ends the HTTP response.
 */
function fail(res, status, reason) {
    res.writeHead(status, {'Content-Type':'application/json; charset=utf-8',
        'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});
    res.end(JSON.stringify({error:reason}));
}

/** Read two allowlisted public UberSDR endpoints on the operator's site.
 * @param {Object} req - LAN HTTP request.
 * @param {Object} res - LAN HTTP response.
 * @returns {void} Forwards the real operator JSON without modifying its data.
 */
function handle(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.writeHead(204);res.end();return;
    }
    if (req.method !== 'GET') {
        fail(res,405,'Read-only receiver API.');return;
    }

    let target;
    let url;
    try { url = new URL(req.url, 'http://localhost'); }
    catch (_) { fail(res,400,'Malformed API request.');return; }
    if (url.pathname === '/api/noisefloor/fft') {
        const band = url.searchParams.get('band');
        if (!/^(160|80|60|40|30|20|17|15|12|10|6)m$/.test(band || '')) {
            fail(res,400,'Choose a supported amateur radio band.');return;
        }
        target = '/api/noisefloor/fft?band=' + encodeURIComponent(band);
    } else if (url.pathname === '/api/noisefloor/voice-activity/all') {
        target = '/api/noisefloor/voice-activity/all?min_confidence=0.7';
    } else if (url.pathname === '/api/noisefloor/spectrum/stream') {
        const band = url.searchParams.get('band');
        if (!/^(160|80|60|40|30|20|17|15|12|10|6)m$/.test(band || '')) {
            fail(res,400,'Choose a supported spectrum band.');return;
        }
        target = '/api/noisefloor/spectrum/stream?band=' + encodeURIComponent(band);
    } else {
        fail(res,404,'Only RF spectrum and voice activity are exposed.');return;
    }

    const remote = https.get(UPSTREAM + target, {
        headers: {'Accept':'application/json','User-Agent':'Bunkhouse-ReadOnlySDR/1.0'},
        timeout:10000
    }, function (upstream) {
        if (upstream.statusCode !== 200) {
            upstream.resume();
            fail(res,upstream.statusCode || 502,'Receiver API returned HTTP ' + upstream.statusCode);
            return;
        }
        res.writeHead(200,{
            'Content-Type':target.indexOf('/stream?') !== -1
                ? 'text/event-stream' : 'application/json',
            'Access-Control-Allow-Origin':'*',
            'Cache-Control':'no-store',
            'X-Accel-Buffering':'no'
        });
        // Do not buffer SSE: forwarding real packets preserves live timing.
        upstream.pipe(res);
    });
    // Closing the TV's EventSource must also release the remote SSE socket.
    res.on('close', function () {remote.destroy();});
    remote.on('timeout', function () {remote.destroy(new Error('Receiver timeout'));});
    remote.on('error', function (error) {
        if (!res.headersSent) fail(res,502,'Remote receiver failed: '+error.message);
        else res.destroy();
    });
}

http.createServer(handle).listen(PORT, '0.0.0.0', function () {
    console.log('Bunkhouse genuine SDR API bridge on port '+PORT);
    console.log('Point HAM RADIO at http://<PC-LAN-IP>:'+PORT);
    console.log('Upstream: '+UPSTREAM+' (real FFT, spectrum SSE, and voice activity)');
});
