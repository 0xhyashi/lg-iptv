# Toonami + Japan TV + Radio — privacy-focused LG webOS fork

> **Maintainers:** Start with [the architecture and ownership map](docs/ARCHITECTURE.md) and [the safety/maintainability audit](docs/MAINTENANCE_AUDIT.md) before editing. First-party JavaScript and CSS is in `js/` and `assets/`; `dist/` and `weatherstar/` are generated. Run `node tools/check-source-docs.js`, the `tests/*.test.js` regressions and `npm run build` before testing on LG hardware.



This branch is a test build based on [sharktie/lg-iptv](https://github.com/sharktie/lg-iptv).

## Channels

- Four Toonami Aftermath HLS sources (East, West, Movies, Radio).
- **Existing** [IPTV-org Japan country playlist](https://iptv-org.github.io/iptv/countries/jp.m3u), fetched directly from the TV. Existing channels are not deleted.
- **20 additional Japanese FAST channels**, grouped into Japan — News, Anime & Kids, Entertainment, Music, and Lifestyle.
- **WeatherStar 4000+** retro forecast channel from pinned upstream source (under **Retro Weather**).
- **Eight live radio stations**, grouped under **Radio Stations**: WTMD 89.7 FM, WTMD HD2 (The Baltimore Channel), Shonan Beach FM 78.9 (Japan), B97 97.1 FM (New Orleans), ALT 92.3 (New Orleans), Magic 101.9 (New Orleans), 102.5 WFMF (Baton Rouge), and 101.1 WNOE Country (New Orleans). All use direct public audio endpoints, not credential relays.
- If the IPTV-org playlist fails, Toonami, the 20 fixed Japanese channels, and the eight radio streams remain available. The last downloaded IPTV-org list can also be reused from the TV cache.

The additional channels were selected from free-to-view stream candidates and tested from a US-based GitHub Actions runner on November 7, 2026: 194 unique source URLs probed, 48 returned HLS manifests with reachable media segments, and 20 relevant, non-duplicate, non-subscription candidates were added. **A segment response is not proof of successful video/audio decoding or permission to redistribute content**. Individual providers may later change URLs, block regions, or restrict access. The Japanese FAST streams are published by third-party playlist projects; this fork is not affiliated with the providers.

View the [segment-check workflow run](https://github.com/0xhyashi/lg-iptv/actions/runs/42422229567).

## Radio playback

Radio stations use a **separate native HTML audio element**, rather than sending MP3/AAC streaming data through the TV video/HLS engine. The radio preview displays a Play/Pause button and a live status. The physical LG remote's Play/Pause media keys are also handled while listening to radio. Switching back to TV closes the radio connection. All eight direct streams returned live audio bytes in US GitHub Actions checks on November 7, 2026: [initial radio checks](https://github.com/0xhyashi/lg-iptv/actions/runs/42436363923), [ALT 92.3 checks](https://github.com/0xhyashi/lg-iptv/actions/runs/42436745933), and [Magic 101.9 and WFMF 102.5 checks](https://github.com/0xhyashi/lg-iptv/actions/runs/42436819379), and [101.1 WNOE checks](https://github.com/0xhyashi/lg-iptv/actions/runs/42438184834). Actual audio playback on your LG TV must still be tested.

## Bunkhouse Radio (v1.0.40)

**TV / RADIO shortcut buttons** appear at the top of the sidebar. TV retains its original category browser and channels. RADIO switches immediately to a dedicated full-height listening view, with the eight stations listed directly in the sidebar. On the LG remote in Radio mode: UP/DOWN changes stations; LEFT focuses the TV tab; RIGHT focuses Play/Pause; the standard Play/Pause media buttons still work. The TV tab returns to the last TV channel. The radio player's ◀ STATION / STATION ▶ controls switch **stations**, not tracks.

**Artwork / layout:** The green Headspace recreation, optional oscilloscope mode and retro receiver mode have been replaced with a single Winamp-era **BUNKHOUSE RADIO** interface. The blue Saturn image is a compressed, bundled copy of the image supplied in the chat (assets/bunkhouse-saturn.jpg), and stays completely static. The lower-left green/yellow/orange equalizer bars are intentionally **simulated** with JavaScript animation while the audio player is playing; they are **not measured from the actual audio waveform**, because webOS does not support the Web Audio media-element source connection needed to access samples reliably.

**Now Playing and previous songs:** The right side shows live title, artist, album, and album artwork when available, with an actual recent-song list. On WFMF 102.5 and WNOE 101.1, the list is populated from iHeart's public track-history feed, so earlier songs can appear immediately. Other stations accumulate previous tracks that the app **actually observed during this session** when their metadata is readable. When a station does not expose accessible browser metadata, no made-up songs appear. ALT 92.3 uses a Triton public now-playing endpoint, Shonan Beach FM uses ICY/Airtime where available, and other stations use best-effort ICY parsing. Some stations block browser metadata requests even though the audio itself plays.

**Album art:** First-party station cover art is preferred where present. Otherwise, a strict artist/title search through Apple's iTunes catalog is used and the artwork is cached locally. Only public artist/title are sent to Apple, not any IPTV credentials. If the artwork match is poor or unavailable, the original retro placeholder remains.

**Source availability and privacy:** The eight direct radio streams were verified from a US GitHub Actions runner in November 2026, including [101.1 WNOE Country](https://github.com/0xhyashi/lg-iptv/actions/runs/42438184834). LG device playback, keyboard ergonomics and station-specific album art still require testing on the physical TV. No root, relay, video screen capture, or sleep timer.

## WeatherStar 4000+ — original retro weather channel (v1.0.44)

**Retro Weather** in the TV categories now contains **WeatherStar 4000+ — Local Forecast**. This is the REAL original [netbymatt/ws4kp](https://github.com/netbymatt/ws4kp) web application running inside our local TV interface, **not** an HLS stream and not a visual recreation. The upstream project's own graphics, fonts, smooth transitions, maps, forecast screens and four bundled WeatherStar-inspired music tracks are all preserved. The original copyrighted Weather Channel songs are **not** bundled by the upstream project.

The standard `npm run build` fetches **pinned ws4kp v8.2.2** (`237c60d242f9d70e0ee9c1bab87f3119c4b3b729`) and builds the upstream source **unchanged** into `weatherstar/`, including its MIT license, fonts, music and static assets. The source is downloaded once and cached; this folder is ignored by git and included in the final LG `.ipk` package. Requires **Node.js 20+**, Git and internet access on the first build. The complete upstream distribution adds roughly **18 MB** of files.

**Extended soundtrack (continuous radio-style playback):** Bunkhouse retains WeatherStar's **4 original tracks** (8 minutes 53 seconds total) and automatically installs **all 13 additional songs** from its author's official [*Latest Observations* album](https://github.com/netbymatt/ws4kp-music). Those 13 extras are **CC BY 4.0** and are pinned to companion-repo revision `04b2f24ae8bc35eab1ebaf550b177f900d191070`; the build validates the Git SHA and original file size for each song. Album attribution and the license are included in `weatherstar/music/LICENSE-ADDITIONAL-MUSIC.md`. The upstream music player **shuffles without replacement, automatically advances songs, reshuffles after the last song, and continues as long as the page is open**. Only the generated music playlist and MP3 assets are extended; the original graphics, transitions, forecast logic, fonts and player implementation are left intact. The total soundtrack is **57 minutes 14 seconds** across all 17 tracks, verified by decoding their MP3 metadata. The extra audio increases the resulting `.ipk` package to about **65 MB**. This is an extended **local** music rotation, not a separate external internet-radio service. The music may require pressing the native WeatherStar music button once on LG TVs that block autoplay.

The weather player runs WeatherStar's built-in kiosk mode. The Bunkhouse toolbar controls location (default Ellicott City, Maryland; change to any supported US city or ZIP), music, fullscreen, exit and an optional hosted copy. The weather forecast is updated from live National Weather Service data and therefore still needs internet. The page can request music playback, but webOS browser autoplay rules may require a click first.

**Device test caveats:** Static WeatherStar compiled successfully on CI, but it has NOT yet been validated on this physical LG TV. Its browser engine may be too old for the upstream app; additionally `file://` local JavaScript requests can fail even though the page itself loads. If so, **TRY ONLINE COPY** switches the iframe to the original `https://weatherstar.netbymatt.com/` website. That site presently permits framing, but we must still test it on webOS. Press LG Back or **◀ TV** to leave. Opening radio or another TV channel stops WeatherStar audio. This feature does not claim to provide emergency weather alerts.

### WeatherStar soundtrack selection (v1.0.44)

On the WeatherStar channel, use the **SOUNDTRACK** selector in Bunkhouse's toolbar to switch among:
- **Nightwave Plaza (default)** — 24/7 live vaporwave, streamed directly from `https://radio.plaza.one/mp3` (HTTPS MP3, tested on Nov 7, 2026). Nightwave is an independent ad-free listener-supported station; listening happens on the TV, not via a proxy or our server.
- **Classic WeatherStar** — the original unmodified WeatherStar player playing our local 17-track, **57-minute-14-second** shuffled WeatherStar music library. Automatically advances and reshuffles; no third-party internet audio service needed.
- **SomaFM Vaporwaves** — an alternate 24/7 station using the direct personal-listening MP3 `https://ice5.somafm.com/vaporwaves-128-mp3`. SomaFM's station links are intended for **individual personal listening**, not public rebroadcasting. Do not retransmit the combined audio/video channel publicly.

The selected soundtrack is saved locally on the TV for next time. Press **BLUE** on the LG remote to cycle **Nightwave → Classic → SomaFM**; the D-pad navigates the toolbar, and UP/DOWN while focused on the soundtrack control switches sources. The **PAUSE SOUND / PLAY SOUND** button and LG media Play/Pause keys control external radio. Classic mode uses WeatherStar's own native music player, with a **CLASSIC MUSIC** button for browsers that block autoplay. On each switch between classic and live audio, Bunkhouse recreates the iframe using the upstream app's documented `mediaPlaying=true/false` setting. This guarantees the outgoing source is unloaded before the next plays, with no accidental two-audio overlap. Nightwave ↔ SomaFM changes only the separate audio stream while keeping weather graphics on screen.

**Upstream authenticity:** The original WeatherStar HTML, fonts, graphics, JS code, transitions, and player are unchanged. The 17-track classic playlist already extends the built-in music with 13 credited CC BY 4.0 tracks, without modifying the player source. The live radio modes mute the classic player and run a separate hidden native HTML5 audio element.

**Compatibility:** The stream endpoints returned HTTP 200 and real MP3 bytes in GitHub Actions, and the webOS `.ipk` package has passed CI. Actual LG device audio behavior still requires testing. Old webOS browsers may deny autoplay when the iframe loads; press **PLAY SOUND** if prompted. When the online WeatherStar fallback is selected, its underlying forecast page is cross-origin, so its built-in music button may need to be clicked inside the original page. The weather feed still needs internet access for real forecasts.

## LG weather loading and radio station switching fixes (v1.0.44)

**WeatherStar 4000+ stuck on startup title / "Location search isn't responding":**
The upstream error string occurs in WeatherStar's ArcGIS `findLocation()` request. Bunkhouse previously supplied only a city name, causing a geocode request before any forecast could load. Bunkhouse now passes native WeatherStar `latLon` **and** `latLonQuery` URL parameters: the default Ellicott City city-center coordinates (39.2673, -76.7983) are packaged locally so initial weather startup bypasses geocoding completely. Alternate city/ZIP searches are resolved in the Bunkhouse parent page first, cached, and passed in coordinates; manual `latitude,longitude` input is accepted. Failed lookups show a clear Bunkhouse error instead of silently leaving WeatherStar on its title screen.

**Old LG browser compatibility:** WeatherStar's independent iframe lacked the Promise/fetch polyfills loaded by the Bunkhouse parent page. The package build now inserts the same old-webOS shims plus a minimal `AbortSignal.timeout()` compatibility script *before* original WeatherStar JavaScript, handling a possible local `file://` URL origin failure and reporting WeatherStar errors in Bunkhouse's bottom status line. Forecast screens, graphics, fonts, transitions, audio, and native WeatherStar code are unchanged.

**Wrong radio station plays after switching:** The radio player used to reuse one `<audio>` element when changing stations. On some LG native decoder pipelines, callbacks and audio data from the previous connection could survive an immediate URL change. v1.0.44 stops/unloads/removes the old element and creates a **fresh native audio element for every station tune**, with identity guards against late old-station events and promise rejections. The TV/radio UI and all eight radio URLs are preserved.

**Verification:** GitHub Actions builds Bunkhouse with pinned WeatherStar v8.2.2, the original and 13 extra music tracks, checks location bypass/ZIP/errors and simulates rapid radio station changes. All tests are computer simulations; actual LG firmware behavior still needs verification. If WeatherStar cannot display forecasts on the physical TV, try **TRY ONLINE COPY** and note the exact new status-line error.

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

This produces `com.oxhyashi.toonamitest_1.0.44_all.ipk`. Install it with webOS Dev Manager or the LG `ares-install` CLI. The app ID is unchanged from earlier privacy-fork test builds, so this can update the installed app.

**Important for developers:** `dist/js/` is generated by `npm run build`. This branch's new channel and radio playback additions live in `js/app.js`, `pages/livetv.html`, and `assets/player.css` and will appear in the packaged app **after running the build**. Do not commit local changes to generated `dist/js/` unless intentionally updating distributions.

## Upstream

This repository started as a fork of [sharktie/lg-iptv](https://github.com/sharktie/lg-iptv), which has other features not all tested in this privacy branch. The main fork branch has not been merged with this test branch.
