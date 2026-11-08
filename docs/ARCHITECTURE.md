# Bunkhouse TV — code map and change guide

This document covers **first-party code** on `privacy/toonami-single-stream-test`. It is the starting point for changes. Keep behavior simple, make one owner responsible for each resource, and verify it in CI before testing on a TV.

## Start here

| What you are changing | Owner | Don't change instead |
| --- | --- | --- |
| Fixed Toonami/Japan/radio/WeatherStar channels | `js/app.js` (boot list) | Generated `dist/js/app.js` |
| Which channel is selected | `js/app.js` — `selectChannel` | Several event handlers trying to start streams independently |
| Radio playback/metadata/art/history | `js/livetv/radio.js` — `RadioDeck` | The IPTV video player |
| Nightwave / classic / SomaFM over WeatherStar | `js/livetv/weatherstar.js` — `WeatherChannel` | WeatherStar's own bundled player |
| LG remote input and navigation | `js/dpad.js` | Duplicated document key handlers |
| Sidebar categories and saved groups | `js/livetv/sidebar.js` | Boot-time channel list |
| Virtualised TV rows and filtering | `js/livetv/channels.js` | DOM rows by hand |
| Fullscreen and OSD | `js/livetv/pip.js` | Browser fullscreen API on older webOS |
| TV HLS/direct-video playback and fallback | `js/player/engine.js` | Radio audio element |
| Settings / profiles / credentials | `js/core/config.js`, `js/core/store.js` | URL strings in UI handlers |
| HTTP timeouts / caching | `js/core/net.js` | Another ad-hoc fetch wrapper |
| Source-to-app startup and HTML wiring | `pages/livetv.html`, `js/app.js` | Writing generated JS directly |
| Retro TV/radio appearance | `assets/bunkhouse.css`, `assets/radio.css`, `assets/weatherstar.css` | The upstream WeatherStar CSS |
| Upstream WeatherStar build and custom 17-track playlist | `tools/build-weatherstar.js`, `tools/add-weatherstar-music.js` | Committing `weatherstar/` |
| Old-LG weather iframe compatibility | `assets/weatherstar-compat.js`, `tools/patch-weatherstar-compat.js` | Editing weather graphics/music |
| Automated sanity/regression checks | `tests/`, `.github/workflows/` | Assuming GitHub build equals playback on a TV |

## Data flow and one owner per player

```text
pages/livetv.html
  -> state.js            globals shared by Live TV modules
  -> channels.js         lists, virtual rows, filtering
  -> sidebar.js          category / favourites presentation
  -> player/engine.js    video engine only
  -> radio.js            RadioDeck owns #radio-audio
  -> weatherstar.js      WeatherChannel owns the iframe and #weatherstar-external-audio
  -> dpad.js             navigation
  -> app.js              initial lists and channel selection
```

**Only `selectChannel(ch)` chooses what media is active.** Radio calls `RadioDeck.play(ch)`, video uses `player.play(url)`, and WeatherStar calls `WeatherChannel.open()`. Switching away must first stop the previous owner. Do not wire extra media `play()` calls to sidebar buttons or station labels.

A **station change is not a track change**. The radio stream URL is fixed per station; the provider controls the music. The simulated equalizer is decorative and does not read PCM data.

**Radio lifecycle:** `RadioDeck.stop()` invalidates artwork/metadata requests, pauses and unloads the existing native audio element, removes it, and replaces it with a new, empty element. `play(ch)` then selects one stream. Native webOS decoders can keep stale network state when a URL is reassigned on a live element. Stale events and promises must be fenced against `requestSerial` and **the current element identity**. Never reuse the old audio element during a tune.

**Weather lifecycle:** The original WeatherStar 4000+ browser application is packaged under `weatherstar/`. Our parent `WeatherChannel` resolves the city to coordinates and loads the local iframe with `latLon` + `latLonQuery`. Passing a name alone forces the upstream ArcGIS geocoder at startup, which failed on the TV. The former online iframe toggle produced a black screen on the user's LG; it is replaced with **RETRY FORECAST**, which reloads the packaged copy. The compatibility bootstrap removes the forbidden custom browser `User-Agent` header from NWS requests and reports exact `/points` access failures to the Bunkhouse footer. An HTTP/CORS outage can still prevent a live forecast: report its error rather than claiming the data loaded. Nightwave and SomaFM are external music in one separate `<audio>`; selecting either disables WeatherStar's internal music via its supported `mediaPlaying=false` URL setting. Classic mode uses WeatherStar's own 17-track music player. Never allow both to be audible at once.

**TV EPG:** `selectChannel` may await an HTTP guide request. After every async continuation, check that the selected channel is still the one the request was for, **including empty/error responses**. The channel list and EPG cache are separate; a stale response can be cached, but must not redraw the selected channel's UI.

## Async ownership rules (audit notes)

A request completing successfully does **not** mean its result still belongs to
the visible screen. Use the owner's existing guard, not a new global manager:

| Owner | Existing guard | Late callback must not |
| --- | --- | --- |
| Video player | `_gen` and `_tok`, checked via `_alive()` | Seek, change audio tracks or replace video after a switch |
| TV guide | `currentChannel === ch` | Overwrite the selected channel's EPG |
| Catch-up archive | `epgReqKey`, incremented on channel selection **and Home** | Redraw or focus an archive after navigation |
| VOD series detail | `detailItem === item` | Display seasons or an error for the previous series |
| VOD subtitle search/download | `_osSearchId` plus open-menu state | Replace search results or select a subtitle from an old request |
| Profile connection | `connectSerial` plus `selectedId` | Activate a previous profile after editing/switching |
| Radio deck | `requestSerial` and current `<audio>` identity | Show old metadata or keep the previous station playing |
| WeatherStar | `loadSerial` and active iframe state | Navigate the frame or play a stale soundtrack |

Use `Net.json` or `Net.text` for ordinary provider requests. The streaming ICY
radio probe is the exception: it reads binary bytes directly, with its own
timeout that settles even if the TV ignores `AbortController.abort()`. Location
lookups also use `Net` deadlines. Do not add unbounded `fetch()` calls to old
webOS paths.

The Saturn radio bars are **simulated**, not measured audio. LG webOS TV does
not expose the native media element's decoded PCM to first-party apps; adding
a real visualizer requires a separate, explicitly tested stream-analysis
implementation. The audit deliberately leaves this separate from the one
native decoder required for reliable playback.

## Testing this branch

On a push, `.github/workflows/source-audit.yml` checks source syntax and
documentation coverage and runs focused state/timeout regressions. The
`Verify Bunkhouse Nightwave/Classic/Soma Weather IPK` workflow builds the
complete app, checks the packaged WeatherStar resources, creates the webOS
`.ipk`, and uploads the `bunkhouse-webos-test-ipk` artifact. Download
that artifact from a successful workflow run, extract the `.ipk`, and install
it on the LG test device. Do not merge this experimental branch into `main`
until TV playback, remote focus, radio switching, WeatherStar, and VOD are
confirmed on hardware.

## Dependencies and code origins

- `js/`, `assets/*.css` and first-party `assets/*.js` other than vendored files are editable source. The app is mostly classic scripts that share globals intentionally. Keep the execution order in `pages/*.html`; not all sources are ES modules.
- `dist/js/` is generated by Babel; `dist/css/` by `tools/build-css.js`. **Never hand-edit these files.** Changes to `js/` and `assets/*.css` must be followed by `npm run build`.
- `weatherstar/` is **ignored generated output** from a pinned, original [netbymatt/ws4kp](https://github.com/netbymatt/ws4kp) checkout. The soundtrack extension is drawn from the author's [ws4kp-music](https://github.com/netbymatt/ws4kp-music) licensed album. Do not fork/rewrite the original screens, effects, fonts, or player JS just for integration.
- `assets/hls.min.js` and `assets/qrcode.js` are vendored/minified dependencies. Avoid editing/commenting their minified functions. Replace a dependency as a deliberate upgrade with its own tests.
- `node_modules/` is installed through the lockfile, not committed or packaged.
- Configuration may contain private credentials. **Do not log complete profile URLs with usernames/passwords, embed credentials in a new remote relay, or report them in weather diagnostics.**
- HTTPS-only third-party APIs may reject `file://` requests or outdated SSL stacks. Prefer explicit errors and user-controllable fallbacks; do not add silent automatic HTTP downgrades.

## How to change a function

Use a compact JSDoc above the declaration stating (1) its job, (2) each input including expected shape, (3) its return value or `void`, and (4) observable side effects when important. Prefer plain named functions for shared behaviors and simple inline callbacks for obvious event subscriptions. One comment should explain **why** a nonobvious rule exists; don't narrate each assignment.

Do not use clever state transitions, hidden network retries, dynamic code evaluation, or stacked fallbacks to conceal errors. If a function has more than one independent responsibility, split it into small helpers only when the boundaries actually reduce coupling.

## Build and test on Windows

```powershell
cd C:\Users\jleam\lg-iptv
git pull
npm.cmd ci
npm.cmd run build
node tests/radio-station-switch.test.js
node tests/weatherstar-location.test.js
ares-package.cmd -n .
```

Check GitHub Actions for the full build and real `.ipk` package check. Then install the new version and test actual switching, volume, WeatherStar forecasts and the LG remote. CI checks cannot emulate LG's hardware decoder or every webOS browser feature.

## Regressions to test before every release

1. Rapidly switch WTMD ⇄ New Orleans radio ten times; the visible selection, stream URL and audible station should agree.
2. Switch radio → television → WeatherStar → radio; prior media must be silent.
3. WeatherStar's default location must load without an ArcGIS name search. Set a ZIP code and verify the next lookup uses coordinates.
4. Try both Nightwave and Classic: never play two soundtracks simultaneously.
5. Change TV channels while the EPG network request is pending; the old station must not overwrite the new station's guide, even when the old guide is empty.
6. Confirm four Toonami streams, eight radio stations, 20 fixed Japan channels and the IPTV-org path remain in the build.
7. Confirm locally bundled WeatherStar graphics and its 17-song playlist; confirm its music/forecast visuals still work on the LG TV.
