# Toonami + Japan TV + Radio — privacy-focused LG webOS fork

This branch is a test build based on [sharktie/lg-iptv](https://github.com/sharktie/lg-iptv).

## Channels

- Four Toonami Aftermath HLS sources (East, West, Movies, Radio).
- **Existing** [IPTV-org Japan country playlist](https://iptv-org.github.io/iptv/countries/jp.m3u), fetched directly from the TV. Existing channels are not deleted.
- **20 additional Japanese FAST channels**, grouped into Japan — News, Anime & Kids, Entertainment, Music, and Lifestyle.
- **Eight live radio stations**, grouped under **Radio Stations**: WTMD 89.7 FM, WTMD HD2 (The Baltimore Channel), Shonan Beach FM 78.9 (Japan), B97 97.1 FM (New Orleans), ALT 92.3 (New Orleans), Magic 101.9 (New Orleans), 102.5 WFMF (Baton Rouge), and 101.1 WNOE Country (New Orleans). All use direct public audio endpoints, not credential relays.
- If the IPTV-org playlist fails, Toonami, the 20 fixed Japanese channels, and the eight radio streams remain available. The last downloaded IPTV-org list can also be reused from the TV cache.

The additional channels were selected from free-to-view stream candidates and tested from a US-based GitHub Actions runner on November 7, 2026: 194 unique source URLs probed, 48 returned HLS manifests with reachable media segments, and 20 relevant, non-duplicate, non-subscription candidates were added. **A segment response is not proof of successful video/audio decoding or permission to redistribute content**. Individual providers may later change URLs, block regions, or restrict access. The Japanese FAST streams are published by third-party playlist projects; this fork is not affiliated with the providers.

View the [segment-check workflow run](https://github.com/0xhyashi/lg-iptv/actions/runs/42422229567).

## Radio playback

Radio stations use a **separate native HTML audio element**, rather than sending MP3/AAC streaming data through the TV video/HLS engine. The radio preview displays a Play/Pause button and a live status. The physical LG remote's Play/Pause media keys are also handled while listening to radio. Switching back to TV closes the radio connection. All eight direct streams returned live audio bytes in US GitHub Actions checks on November 7, 2026: [initial radio checks](https://github.com/0xhyashi/lg-iptv/actions/runs/42436363923), [ALT 92.3 checks](https://github.com/0xhyashi/lg-iptv/actions/runs/42436745933), and [Magic 101.9 and WFMF 102.5 checks](https://github.com/0xhyashi/lg-iptv/actions/runs/42436819379), and [101.1 WNOE checks](https://github.com/0xhyashi/lg-iptv/actions/runs/42438184834). Actual audio playback on your LG TV must still be tested.

## Headspace radio deck (v1.0.39)

The **Radio Stations** category has a Headspace-inspired green floating face with a CRT-style trace, plus switchable **Oscilloscope** and **Retro Tuner** views. Press the **BLUE** button on your LG remote while listening to radio to cycle styles. The Play/Pause remote keys still work. The screens share the existing native HTML audio element; TV playback remains separate. No extra runtime or root is needed.

**Live song data:** The ALT 92.3 feed uses a public Triton XML now-playing endpoint; WFMF 102.5 and WNOE 101.1 use iHeart's CORS-enabled public track history API; Shonan Beach FM uses ICY metadata when accessible or its Airtime live-info feed. All other stations have best-effort ICY parsing. **Not all stations expose song titles to browser-based clients**: metadata can be hidden by CORS restrictions even when audio plays. If access fails, the app keeps playing and displays a clear unavailable state, never a made-up track name.

**Album art:** When the station exposes an artist/title, the app uses first-party station artwork where provided (iHeart), or an Apple iTunes catalog search with a strict artist + song match. Missing/ambiguous results show a placeholder. Only artist/title search text goes to Apple's catalog; the requests don't send your IPTV profile or passwords. A small cache reduces queries. Cover images and the Apple Music link are not self-hosted.

**Visualizer limitation:** The green waveform and VU meter are labelled **synthetic**, not audio-sampled. LG webOS TV's native media element does not support the usual Web Audio API `createMediaElementSource()` pipeline (a known platform limitation). Synthetic animation preserves reliable playback and doesn't falsely claim to react to music. Actual waveform response would require an alternative audio-capture solution, which has not been built or verified.

The original Microsoft Windows Media Player Headspace skin is not bundled; this is an original SVG and CSS recreation inspired by the user's reference screenshot.

## Privacy

- The remote QR/session settings relay (which sent profile data including credentials to a third-party service) is removed.
- The upstream update checker/installer is removed.
- Configured Xtream URLs are no longer silently downgraded from HTTPS to HTTP.
- Video, radio, metadata, album artwork and playlists still make **direct external network requests** to their respective hosts. Toonami's currently listed streams use unencrypted HTTP. No claim of a complete security audit is made.

## Build and install on Windows

With the `privacy/toonami-single-stream-test` branch checked out:

```powershell
cd C:\Users\jleam\lg-iptv
git pull
npm.cmd ci
npm.cmd run build
ares-package.cmd -n .
```

This produces `com.oxhyashi.toonamitest_1.0.39_all.ipk`. Install it with webOS Dev Manager or the LG `ares-install` CLI. The app ID is unchanged from earlier privacy-fork test builds, so this can update the installed app.

**Important for developers:** `dist/js/` is generated by `npm run build`. This branch's new channel and radio playback additions live in `js/app.js`, `pages/livetv.html`, and `assets/player.css` and will appear in the packaged app **after running the build**. Do not commit local changes to generated `dist/js/` unless intentionally updating distributions.

## Upstream

This repository started as a fork of [sharktie/lg-iptv](https://github.com/sharktie/lg-iptv), which has other features not all tested in this privacy branch. The main fork branch has not been merged with this test branch.
