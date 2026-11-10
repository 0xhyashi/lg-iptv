# HAM RADIO — native, real-data SDR receiver (Bunkhouse 1.0.47)

## What this screen actually does

The HAM page now uses **no remote websites/iframes**. It uses the following
read-only public APIs from a single UberSDR receiver:

- `GET /api/noisefloor/fft?band=20m`: real RF FFT values used to paint each
  successive waterfall row in the TV's native 2D canvas.
- `GET /api/noisefloor/spectrum/stream?band=20m`: real spectrum SSE messages
  (SPEC v1 uint8 full and delta frames). Preferred when supported, with
  periodic FFT sampling as a truthful fallback.
- `GET /api/noisefloor/voice-activity/all?min_confidence=0.7`: real receiver
  voice-activity estimates. Arrow buttons choose an estimate, move the
  frequency marker, and change band.

**The waterfall is entirely real**, even when only slower FFT snapshots are
available. No rows are drawn until actual RF bins arrive. Empty/offline state
displays an explicit diagnostic instead of an animation. A detected voice is
an estimated speech-shaped signal, not a verified intelligible conversation.

**Audio playback is not implemented in this version.** The public FFT and
voice-detection APIs provide frequency data, not decoded audio. The receiver's
actual audio requires a /connection session, a dedicated authenticated audio
WebSocket, plus a webOS-compatible Opus or PCM decoder. The native screen does
not claim to play or tune sound. It does select the band and indicated
frequency on the genuine RF display. No broken SpinTheDial provider is opened.

## Connection/CORS restrictions

Default receiver: `https://kb5avy.tunnel.ubersdr.org`.
The receiver operator controls the CORS headers. A packaged `file://` webOS
app cannot bypass these security restrictions and direct HTTP API calls may
fail. If they fail, the app shows **Network/CORS blocked**.

Optional LAN bridge (read-only, no credentials, no synthetic data) on a
computer on the same network:

```powershell
node tools/ham-api-bridge.js
```

Find your computer's LAN IPv4 address using `ipconfig`, then enter
`http://YOUR-PC-LAN-IP:8787` in the HAM screen's **UBERSDR API** field.
The PC must be on while using the bridge, and Windows Firewall must allow
incoming TCP port 8787 on the private LAN. This helper forwards only the three
UberSDR endpoints above to the fixed New Orleans receiver. It is optional,
not a native app dependency, and is never started automatically.

## TV test procedure

1. Build and install 1.0.47 from `feature/ham-radio-live-sdr`.
2. Open HAM: verify you see Bunkhouse's **native waterfall**, without vendor
   welcome popups or any embedded website.
3. When RF data is available, confirm colored lines are updated from network
   frames and the frequency endpoints in MHz are nonempty.
4. Choose **FIND VOICE** or next/previous; activity detection and any frequency
   markers must come from the same receiver, never random FFT peaks.
5. If offline, note the diagnostic and try the optional read-only LAN bridge.
   CORS and public receiver uptime must be verified on the actual LG TV.
6. Switch bands, reconnect, return to TV and radio; ensure requests stop.
7. Check the now fixed-size Saturn right panel for WTMD and all other radio
   streams, including stations with long titles/album names.
8. Check TV Guide EPG subtitle contrast on dark blue and yellow focus rows.
