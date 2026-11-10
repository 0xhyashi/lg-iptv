# HAM RADIO — live SDR integration (experimental)

This page is reached by selecting **HAM** in the Live TV / Radio switch.
It is implemented as a separate page so a live remote SDR does not share the
TV, WeatherStar or internet-radio decoder. Version: Bunkhouse 1.0.45.

## What works by design

- **LIVE WATERFALL** embeds the actual KB5AVY UberSDR receiver in New Orleans:
  https://kb5avy.tunnel.ubersdr.org/
- **FIND VOICES** embeds https://spinthedial.live/, an externally hosted
  live amateur-radio voice activity finder.
- **RECONNECT** clears the current iframe before connecting again.
- The receiver URL field allows other HTTP(S) WebSDRs including bracketed IPv6
  addresses (e.g. `http://[2001:db8::1]:8073/`). The selected URL is saved
  in the app's local storage. No custom proxy, credentials or WebSocket relay
  is provided.
- Leaving the page or changing providers navigates the *same* iframe to
  `about:blank`. This is essential to avoid overlapping radio audio.

**There are zero fake waterfall pixels in our app.** All rendering, reception,
demodulation and provider-side voice detection are done by the remote websites.

## Crucial integration limit

The receiver iframe and voice-discovery iframe are different sites and run
under the browser's same-origin policy. Bunkhouse **cannot** read scanner
results from one and issue a tune command to the other. The voice tab uses the
provider's native interactive scanner, not a Bunkhouse-controlled "next voice"
button. There is **no confirmed native auto-tuning integration** in this
release, and switching tabs does not transfer frequencies.

The source sites may also forbid embedding with X-Frame-Options/CSP; an iframe
`load` event is not proof of successful rendering. Old webOS may lack the
Web Audio, codec, TLS or WebSocket support that the source needs. We explicitly
show a diagnostic hint rather than claiming reception or showing fake data.

## LG TV test plan

1. Install a package built from `feature/ham-radio-live-sdr`, not `main`.
2. Open Live TV and select **HAM**. Verify it opens the separate screen and
   eventually displays KB5AVY's *real* waterfall (not a Bunkhouse animation).
3. Start a transmission on the provider interface and verify audio plays.
   This may need Magic Remote/pointer interaction to satisfy autoplay.
4. Select **FIND VOICES** and verify the provider's actual voice discovery site
   loads. Confirm the previous receiver audio stops. Try its own tuning UI.
5. Select **LIVE WATERFALL** and verify scanner audio stops.
6. Try an alternate receiver URL and an IPv6 URL; ensure invalid schemes are
   rejected. Test `RECONNECT`.
7. Leave with **TV / RADIO**, switch WTMD, TV and WeatherStar; no SDR audio
   should continue.
8. If any iframe is blank, check TV's web inspector for frame-ancestor / XFO,
   Web Audio, secure WebSocket or codec errors. We cannot bypass provider
   embedding restrictions in a local web app.

## Future native scanner

For the couch-friendly one-button experience originally requested, we need a
documented provider API that gives (a) validated live voice detections with
frequency and mode, (b) a real spectrum feed, and (c) a supported audio tuner
protocol compatible with the target LG webOS browser. Then the Bunkhouse client
can consume the same receiver's data and implement Next Voice without violating
cross-origin isolation. Do not infer a voice call from FFT signal strength alone.
