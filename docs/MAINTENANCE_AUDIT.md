# Maintainability and safety audit — 2026-11-08

Scope: **first-party Bunkhouse source** on `privacy/toonami-single-stream-test`. This review preserves existing functionality and does not merge the draft branch.

## Rules for future edits

1. Prefer a **straightforward function** with one responsibility over a helper framework, clever dispatcher, or multiple implicit fallbacks.
2. Give each first-party source file a short header covering its owner, dependencies and side effects. Give every **named function** a concise JSDoc stating purpose, each parameter, and the actual return type. A function that returns a number or Boolean must **not** be documented as `void`. Inline event callbacks need a comment only when their behavior is nonobvious.
3. Use the **existing services**: `Store` for storage, `Net` for HTTP, `selectChannel` for selecting media, `RadioDeck` for radio, `WeatherChannel` for weather. Do not create another storage wrapper, another fetch wrapper, or another audio element owner.
4. Never modify generated `dist/`, upstream `weatherstar/`, vendored `hls.min.js` or `qrcode.js` to implement a feature. Change first-party source and rebuild. The WeatherStar compatibility bootstrap is built from our source and inserted before the upstream bundle.
5. Every asynchronous result must prove it still belongs to the **currently selected station/channel** before it updates the UI. Preserve a generation token, current object check or current media-element identity, depending on the owner.
6. Do not disable features silently, invent program/song history, expose credentials in logs/remote services, or downgrade HTTPS to HTTP without user intent.
7. Add a focused regression test for each fixed bug. Preserve old-webOS compatibility; modern browser-only APIs must be feature-detected or have a documented compatibility layer.

## Ownership and resources

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the complete source map.

| Resource or state | Single owner | How to release |
| --- | --- | --- |
| Selected media channel | `js/app.js: selectChannel` | Stop previous media owner before starting new |
| TV decoder and HLS session | `js/player/engine.js` | `player.stop()` |
| One current native radio decoder | `js/livetv/radio.js: RadioDeck` | `RadioDeck.stop()` invalidates requests and replaces audio element |
| WeatherStar iframe | `js/livetv/weatherstar.js: WeatherChannel` | Unload iframe to stop native WeatherStar audio |
| Nightwave/SomaFM audio | `WeatherChannel` | Pause/unload external audio when leaving or switching soundtracks |
| TV virtual rows | `js/livetv/channels.js` | Filter and render through virtual-row functions |
| Profile caches/settings | `js/core/store.js` | Use JSON `get/set` vs string `getRaw/setRaw` consistently |
| Remote D-pad focus | `js/dpad.js` | Hand keys to focused mode before default TV handling |

## Bugs and regressions audited

| Failure mode | Guard or fix | Automated coverage |
| --- | --- | --- |
| An old radio connection keeps playing after selecting a new station | Replace native `<audio>` on each station switch; check element identity and generation tokens for late events | `tests/radio-station-switch.test.js` |
| WeatherStar remains on its title screen saying location lookup is unresponsive | Resolve coordinates before launching original iframe and pass supported `latLon` parameter | `tests/weatherstar-location.test.js` |
| Older LG iframe lacks modern Web APIs | Load older-webOS fetch/Promise shims and `AbortSignal.timeout` compatibility bootstrap before original WeatherStar scripts | `ws4kp-package-check.yml` |
| Previous TV guide response overwrites a newly selected channel | Check `currentChannel` after EPG request, even for empty/error results | `tests/tv-epg-race.test.js` |
| Invalid or zero-length EPG dates show midnight or NaN progress | Guard invalid timestamp formatting and divide-by-zero progress | `tests/epg-time.test.js` |
| Wrong storage representation causes player settings to be ignored | Distinguish raw string vs JSON storage methods | `tests/core-contracts.test.js` |
| HTTP timeout hangs because older-webOS `abort()` does not cancel native fetch | Timeout wrapper rejects its own promise after deadline; request options are copied instead of mutated | `tests/core-contracts.test.js` |
| Falsy cached values trigger unnecessary network requests | Treat `false` and `0` as valid cache hits | `tests/core-contracts.test.js` |
| Expired cache data or evictions interfere with user settings | Expired cache entries are cleared; cache eviction is isolated from user keys | `tests/core-contracts.test.js` |
| Documented return type disagrees with code | Corrected network/storage and virtual-row JSDoc return types; kept functions' behavior intact | `tools/check-source-docs.js` syntax and contract checks |
| Catch-up archive finishes after returning Home or switching channels | Invalidate the previous request when entering Continue Watching | `tests/catchup-navigation-race.test.js` |
| Delayed native audio-track verification acts on new playback | Check the player's generation and engine token before late checks or seeks | `tests/player-audio-race.test.js` |
| Weather geocoding hangs on old LG network stacks | Use the app's bounded Net request for ZIP and ArcGIS lookups | `tests/weatherstar-location.test.js` |
| Radio metadata remains pending indefinitely | Bound Triton, Airtime and iHeart lookups; independently reject a stalled ICY reader | `tests/radio-metadata-timeout.test.js` |
| Old profile login succeeds after opening another profile | Fence each login by its request generation and editor identity; recover malformed profile storage | `tests/settings-profile-race.test.js` |
| Stale VOD series request fails after a different series is selected | Leave the new series panel unchanged | `tests/vod-series-race.test.js` |
| Subtitle provider errors and search results mix across concurrent searches | Keep responses and errors per search; ignore old downloads and closed menus | `tests/vod-subtitle-search-race.test.js` |

These checks are **not** a proof of all possible bugs being absent. Audio decoder behavior, autoplay, input focus and the WeatherStar forecast renderer still need actual LG TV validation.

## Releasing a change

Run from the **branch root**:

```powershell
npm.cmd ci
node tools/check-source-docs.js
node tests/core-contracts.test.js
node tests/tv-epg-race.test.js
node tests/epg-time.test.js
node tests/radio-station-switch.test.js
node tests/radio-metadata-timeout.test.js
node tests/catchup-navigation-race.test.js
node tests/player-audio-race.test.js
node tests/settings-profile-race.test.js
node tests/vod-series-race.test.js
node tests/vod-subtitle-search-race.test.js
node tests/weatherstar-location.test.js
npm.cmd run build
ares-package.cmd -n .
```

Check GitHub Actions `Audit first-party source and regression tests` and `Verify Bunkhouse Nightwave/Classic/Soma Weather IPK` before trying the new `.ipk` on the LG. The packaging workflow compiles the complete app and uploads `bunkhouse-webos-test-ipk` as a downloadable run artifact. The `main` branch is intentionally not modified; installs from this branch use the existing test application ID.

The source checker confirms file overviews, syntax and JSDoc coverage for named declarations. It does not certify the semantic accuracy of every legacy comment or emulate TV decoders. Prioritize manual review when changing code with asynchronous callbacks, profile credentials, media ownership or focus state.

## Deliberate non-goals

- No wholesale refactor of the original IPTV player, which could create more bugs than it removes.
- No automatic rewriting or line-by-line narration of obvious assignments or anonymous one-line callbacks.
- No modification of pinned WeatherStar visuals or bundled music library just to simplify our wrapper.
- No promise that CI simulates the TV's hardware decoder or exact browser environment.
