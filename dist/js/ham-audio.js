"use strict";

/* ham-audio.js — live UberSDR sound, not synthetic audio.
 * Follows upstream static/minimal-radio.js: POST /connection to register
 * a v4 UUID, then /ws?format=opus&version=3 (21-byte Opus header).
 * A real OpusDecoder from the receiver and Web Audio output are required.
 * Start must be called on an LG remote button press to unlock audio.
 */
(function (W) {
  'use strict';

  var socket = null,
    ctx = null,
    gain = null,
    decoder = null,
    rate = 0,
    channels = 0;
  var loading = false,
    pending = [],
    serial = 0,
    nextTime = 0,
    callback = null;
  var freq = 0,
    mode = 'usb',
    hasSound = false,
    libLoading = false,
    libWait = [];
  var decoderOrigin = 'https://kb5avy.tunnel.ubersdr.org';
  var heartbeat = null,
    analyser = null,
    meterFrame = null;

  /** @param {string} state - Receiver audio state. @returns {void} */
  function status(state) {
    if (callback) callback(state);
  }
  /** @returns {Function|null} The real decoder installed by UberSDR. */
  function opusClass() {
    return W.OpusDecoder || W['opus-decoder'] && W['opus-decoder'].OpusDecoder || null;
  }
  /** @param {string} base - Receiver origin. @param {Function} done - (error). @returns {void} */
  function ensureLibrary(base, done) {
    if (opusClass()) {
      done(null);
      return;
    }
    libWait.push(done);
    if (libLoading) return;
    libLoading = true;
    var script = document.createElement('script');
    // The optional LAN JSON bridge does not host a decoder.
    var libraryBase = /^http:\/\/(?:192\.168\.|10\.|172\.|127\.|\[)/.test(base) ? decoderOrigin : base;
    script.src = libraryBase + '/opus-decoder.min.js';
    /** @param {string|null} error - Library load error. @returns {void} */
    function finish(error) {
      libLoading = false;
      var wait = libWait.slice();
      libWait.length = 0;
      for (var i = 0; i < wait.length; i++) wait[i](error);
    }
    script.onload = function () {
      finish(opusClass() ? null : 'Receiver did not provide OpusDecoder.');
    };
    script.onerror = function () {
      finish('Could not load receiver Opus decoder (TLS/WebAssembly?).');
    };
    document.head.appendChild(script);
  }
  /** @returns {string} RFC 4122 v4 session identity. */
  function uuid() {
    var a = new Uint8Array(16);
    if (W.crypto && W.crypto.getRandomValues) W.crypto.getRandomValues(a);else for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    a[6] = a[6] & 15 | 64;
    a[8] = a[8] & 63 | 128;
    var h = '';
    for (var j = 0; j < a.length; j++) h += ('0' + a[j].toString(16)).slice(-2);
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  /** @param {string} base - SDR origin. @param {string} id - Session UUID.
   * @param {Function} done - (error). @returns {XMLHttpRequest} Registration request.
   */
  function register(base, id, done) {
    var req = new XMLHttpRequest();
    req.open('POST', base + '/connection', true);
    req.timeout = 10000;
    req.setRequestHeader('Content-Type', 'application/json');
    req.onload = function () {
      var reply = {};
      try {
        reply = JSON.parse(req.responseText);
      } catch (_) {}
      done(req.status >= 200 && req.status < 300 && reply.allowed ? null : reply.reason || 'Audio registration rejected: HTTP ' + req.status);
    };
    req.onerror = function () {
      done('Receiver audio registration blocked by network/CORS.');
    };
    req.ontimeout = function () {
      done('Receiver audio registration timed out.');
    };
    req.send(JSON.stringify({
      user_session_id: id
    }));
    return req;
  }
  /** @param {string} value - Detector mode. @returns {Object} Actual SSB edges. */
  function edges(value) {
    var m = String(value || 'usb').toLowerCase();
    if (m === 'lsb') return {
      mode: 'lsb',
      low: -2850,
      high: -50
    };
    if (m === 'am') return {
      mode: 'am',
      low: -4500,
      high: 4500
    };
    if (m === 'fm') return {
      mode: 'fm',
      low: -5000,
      high: 5000
    };
    return {
      mode: 'usb',
      low: 50,
      high: 2850
    };
  }
  /** @returns {boolean} True if actual receiver tune command sent. */
  function sendTune() {
    if (!socket || socket.readyState !== 1) return false;
    var t = edges(mode);
    socket.send(JSON.stringify({
      type: 'tune',
      frequency: Math.round(freq),
      mode: t.mode,
      bandwidthLow: t.low,
      bandwidthHigh: t.high
    }));
    nextTime = 0;
    status('Tuned ' + (freq / 1e6).toFixed(4) + ' MHz ' + t.mode.toUpperCase() + ' · waiting for audio packets');
    return true;
  }
  /** @returns {void} Release every decoder and network connection. */
  function stop() {
    if (meterFrame !== null && W.cancelAnimationFrame) W.cancelAnimationFrame(meterFrame);
    meterFrame = null;
    analyser = null;
    var canvas = document.getElementById('ham-audio-meter');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    serial++;
    hasSound = false;
    loading = false;
    pending = [];
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
    if (socket) {
      var s = socket;
      socket = null;
      s.onmessage = s.onopen = s.onerror = s.onclose = null;
      try {
        s.close();
      } catch (_) {}
    }
    if (decoder) {
      try {
        decoder.free();
      } catch (_) {}
      decoder = null;
    }
    rate = 0;
    channels = 0;
    nextTime = 0;
    if (gain) {
      try {
        gain.disconnect();
      } catch (_) {}
      gain = null;
    }
    if (ctx) {
      try {
        ctx.close();
      } catch (_) {}
      ctx = null;
    }
  }
  /** @param {Object} data - Decoder channelData. @param {number} sampleRate - Hz.
   * @returns {void} Queue actual PCM on TV output.
   */
  function play(data, sampleRate) {
    if (!ctx || !gain || !data || !data.channelData || !data.channelData[0] || !data.channelData[0].length) return;
    if (ctx.state === 'suspended') {
      try {
        ctx.resume();
      } catch (_) {}
      status('Press LISTEN again to unlock TV audio.');
      return;
    }
    var audio = ctx.createBuffer(2, data.channelData[0].length, sampleRate);
    audio.getChannelData(0).set(data.channelData[0]);
    audio.getChannelData(1).set(data.channelData[1] || data.channelData[0]);
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + .07;
    if (nextTime > ctx.currentTime + .65) return;
    var node = ctx.createBufferSource();
    node.buffer = audio;
    node.connect(gain);
    node.start(nextTime);
    nextTime += audio.duration;
    if (!hasSound) {
      hasSound = true;
      status('LIVE AUDIO ' + (freq / 1e6).toFixed(4) + ' MHz ' + mode.toUpperCase());
    }
  }
  /** @param {Uint8Array} bytes - Real Opus frame. @param {number} sampleRate - Hz.
   * @returns {void} Decode then enqueue actual sound.
   */
  function decode(bytes, sampleRate) {
    if (!decoder) return;
    var generation = serial,
      instance = decoder;
    try {
      var result = decoder.decodeFrame(bytes);
      if (result && typeof result.then === 'function') result.then(function (v) {
        if (serial === generation && decoder === instance) play(v, sampleRate);
      }, function () {
        if (serial === generation) status('Unable to decode receiver audio.');
      });else play(result, sampleRate);
    } catch (_) {
      status('Unable to decode Opus audio on this LG TV.');
    }
  }
  /** @param {number} sampleRate - Hz. @param {number} n - Channels.
   * @param {Uint8Array} bytes - Encoded frame. @returns {void} Decode or initialize.
   */
  function receive(sampleRate, n, bytes) {
    if (decoder && rate === sampleRate && channels === n) {
      decode(bytes, sampleRate);
      return;
    }
    if (loading && rate === sampleRate && channels === n) {
      if (pending.length < 20) pending.push(bytes);
      return;
    }
    if (decoder) {
      try {
        decoder.free();
      } catch (_) {}
      decoder = null;
    }
    rate = sampleRate;
    channels = n;
    loading = true;
    pending = [bytes];
    var Klass = opusClass(),
      generation = serial,
      instance;
    if (!Klass) {
      loading = false;
      status('Receiver Opus decoder unavailable.');
      return;
    }
    try {
      instance = new Klass({
        sampleRate: rate,
        channels: n
      });
    } catch (_) {
      loading = false;
      status('Opus decoder could not start on TV.');
      return;
    }
    instance.ready.then(function () {
      if (serial !== generation || rate !== sampleRate || channels !== n) {
        instance.free();
        return;
      }
      decoder = instance;
      loading = false;
      var queue = pending.slice();
      pending = [];
      for (var i = 0; i < queue.length; i++) decode(queue[i], sampleRate);
    }, function () {
      loading = false;
      status('Opus decoder WebAssembly initialization failed.');
    });
  }
  /** @param {ArrayBuffer} data - UberSDR 21-byte header followed by Opus.
   * @returns {void} Parse real receiver samples.
   */
  function receiveBinary(data) {
    if (!data || data.byteLength <= 21) return;
    var dv = new DataView(data),
      sr = dv.getUint32(8, true),
      n = dv.getUint8(12);
    if (sr < 8000 || sr > 48000 || n < 1 || n > 2) return;
    receive(sr, n, new Uint8Array(data, 21));
  }
  /** @param {string} base - Receiver origin. @param {string} id - Registered UUID.
   * @param {number} generation - Active playback lifecycle. @returns {void}
   */
  function connect(base, id, generation) {
    if (serial !== generation) return;
    var t = edges(mode);
    var uri = base.replace(/^http/, 'ws') + '/ws?frequency=' + Math.round(freq) + '&mode=' + t.mode + '&user_session_id=' + encodeURIComponent(id) + '&bandwidthLow=' + t.low + '&bandwidthHigh=' + t.high + '&format=opus&version=3';
    try {
      socket = new WebSocket(uri);
    } catch (_) {
      status('TV cannot open receiver audio socket.');
      return;
    }
    socket.binaryType = 'arraybuffer';
    var mine = socket;
    mine.onopen = function () {
      if (serial !== generation || mine !== socket) return;
      sendTune();
      heartbeat = setInterval(function () {
        if (serial === generation && mine === socket && mine.readyState === 1) mine.send(JSON.stringify({
          type: 'ping'
        }));
      }, 10000);
    };
    mine.onmessage = function (evt) {
      if (serial !== generation || mine !== socket) return;
      if (typeof evt.data === 'string') {
        try {
          var msg = JSON.parse(evt.data);
          if (msg.type === 'error') status('Receiver error: ' + (msg.error || msg.message || 'unknown'));
        } catch (_) {}
      } else if (evt.data instanceof ArrayBuffer) receiveBinary(evt.data);
    };
    mine.onerror = function () {
      if (mine === socket) status('Audio WebSocket failed (receiver unavailable or denied).');
    };
    mine.onclose = function () {
      if (mine === socket) {
        if (heartbeat) {
          clearInterval(heartbeat);
          heartbeat = null;
        }
        status('Audio connection closed. Press LISTEN to retry.');
      }
    };
  }
  /** Draw the actual output waveform from Web Audio, including silence.
   * @returns {void} Schedules a frame only while the audio graph exists.
   */
  function drawMeter() {
    if (!analyser) return;
    var canvas = document.getElementById('ham-audio-meter');
    if (!canvas) return;
    var values = new Uint8Array(analyser.fftSize),
      paint = canvas.getContext('2d');
    analyser.getByteTimeDomainData(values);
    paint.clearRect(0, 0, canvas.width, canvas.height);
    paint.beginPath();
    paint.strokeStyle = '#a2ffca';
    for (var i = 0; i < values.length; i++) {
      var x = i * canvas.width / (values.length - 1),
        y = values[i] * canvas.height / 256;
      if (i === 0) paint.moveTo(x, y);else paint.lineTo(x, y);
    }
    paint.stroke();
    meterFrame = W.requestAnimationFrame(drawMeter);
  }
  /** Begin real sound on a user gesture; no synthesized samples.
   * @param {string} base - Remote receiver origin. @param {number} frequency - Hz.
   * @param {string} modulation - USB/LSB. @param {Function} onStatus - UI listener.
   * @returns {void} Starts registration then audio socket.
   */
  function start(base, frequency, modulation, onStatus) {
    stop();
    callback = onStatus;
    freq = frequency;
    mode = modulation;
    if (!/^https?:\/\//.test(base) || !isFinite(freq) || freq <= 0) {
      status('Select a valid frequency.');
      return;
    }
    var Audio = W.AudioContext || W.webkitAudioContext;
    if (!Audio) {
      status('This webOS browser does not support Web Audio.');
      return;
    }
    try {
      // Audio creation/resume happens synchronously with remote OK.
      ctx = new Audio();
      gain = ctx.createGain();
      gain.gain.value = .85;
      gain.connect(ctx.destination);
      if (ctx.createAnalyser && W.requestAnimationFrame) {
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        gain.connect(analyser);
        drawMeter();
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (_) {
      status('Could not start LG audio output.');
      return;
    }
    var generation = serial,
      id = uuid();
    status('Preparing receiver Opus decoder...');
    ensureLibrary(base, function (error) {
      if (generation !== serial) return;
      if (error) {
        status(error);
        return;
      }
      status('Registering receiver audio...');
      register(base, id, function (failure) {
        if (generation !== serial) return;
        if (failure) {
          status(failure);
          return;
        }
        status('Opening live audio stream...');
        connect(base, id, generation);
      });
    });
  }
  /** @param {number} frequency - Hz. @param {string} modulation - USB/LSB.
   * @returns {boolean} Tune open live receiver.
   */
  function tune(frequency, modulation) {
    freq = frequency;
    mode = modulation;
    hasSound = false;
    return sendTune();
  }
  /** @returns {boolean} True when receiver socket is connected. */
  function active() {
    return !!socket && socket.readyState === 1;
  }
  W.BunkhouseHamAudio = {
    start: start,
    tune: tune,
    stop: stop,
    active: active
  };
})(window);