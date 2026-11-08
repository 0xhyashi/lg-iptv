# Toonami + Japan TV + Radio — privacy-focused LG webOS fork

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

## WeatherStar 4000+ — original retro weather channel (v1.0.41)

**Retro Weather** in the TV categories now contains **WeatherStar 4000+ — Local Forecast**. This is the REAL original [netbymatt/ws4kp](https://github.com/netbymatt/ws4kp) web application running inside our local TV interface, **not** an HLS stream and not a visual recreation. The upstream project's own graphics, fonts, smooth transitions, maps, forecast screens and four bundled WeatherStar-inspired music tracks are all preserved. The original copyrighted Weather Channel songs are **not** bundled by the upstream project.

The standard `npm run build` fetches **pinned ws4kp v8.2.2** (`237c60d242f9d70e0ee9c1bab87f3119c4b3b729`) and builds the upstream source **unchanged** into `weatherstar/`, including its MIT license, fonts, music and static assets. The source is downloaded once and cached; this folder is ignored by git and included in the final LG `.ipk` package. Requires **Node.js 20+**, Git and internet access on the first build. The complete upstream distribution adds roughly **18 MB** of files.

**Extended soundtrack (continuous radio-style playback):** Bunkhouse retains WeatherStar's **4 original tracks** (8 minutes 53 seconds total) and automatically installs **all 13 additional songs** from its author's official [*Latest Observations* album](https://github.com/netbymatt/ws4kp-music). Those 13 extras are **CC BY 4.0** and are pinned to companion-repo revision `04b2f24ae8bc35eab1ebaf550b177f900d191070`; the build validates the Git SHA and original file size for each song. Album attribution and the license are included in `weatherstar/music/LICENSE-ADDITIONAL-MUSIC.md`. The upstream music player **shuffles without replacement, automatically advances songs, reshuffles after the last song, and continues as long as the page is open**. Only the generated music playlist and MP3 assets are extended; the original graphics, transitions, forecast logic, fonts and player implementation are left intact. The extra audio increases the resulting `.ipk` package to about **65 MB**. This is an extended **local** music rotation, not a separate external internet-radio service. The music may require pressing the native WeatherStar music button once on LG TVs that block autoplay.

The weather player runs WeatherStar's built-in kiosk mode. The Bunkhouse toolbar controls location (default Ellicott City, Maryland; change to any supported US city or ZIP), music, fullscreen, exit and an optional hosted copy. The weather forecast is updated from live National Weather Service data and therefore still needs internet. The page can request music playback, but webOS browser autoplay rules may require a click first.

**Device test caveats:** Static WeatherStar compiled successfully on CI, but it has NOT yet been validated on this physical LG TV. Its browser engine may be too old for the upstream app; additionally `file://` local JavaScript requests can fail even though the page itself loads. If so, **TRY ONLINE COPY** switches the iframe to the original `https://weatherstar.netbymatt.com/` website. That site presently permits framing, but we must still test it on webOS. Press LG Back or **◀ TV** to leave. Opening radio or another TV channel stops WeatherStar audio. This feature does not claim to provide emergency weather alerts.

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

This produces `com.oxhyashi.toonamitest_1.0.41_all.ipk`. Install it with webOS Dev Manager or the LG `ares-install` CLI. The app ID is unchanged from earlier privacy-fork test builds, so this can update the installed app.

**Important for developers:** `dist/js/` is generated by `npm run build`. This branch's new channel and radio playback additions live in `js/app.js`, `pages/livetv.html`, and `assets/player.css` and will appear in the packaged app **after running the build**. Do not commit local changes to generated `dist/js/` unless intentionally updating distributions.

## Upstream

This repository started as a fork of [sharktie/lg-iptv](https://github.com/sharktie/lg-iptv), which has other features not all tested in this privacy branch. The main fork branch has not been merged with this test branch.
