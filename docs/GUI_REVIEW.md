# GUI review — 2026-11-10

Working checkout: C:/Users/jleam/lg-iptv. Target reported by user: LG 77-inch B2; exact webOS version unknown.

## Verified fixes
- HAM list remote navigation advances through rows; zero-Hz spectrum bounds are valid. The previously empty scope canvas draws received RF samples.
- FIND VOICE toggles scanning. Polls retain an active candidate and select a new reported candidate when it disappears. LISTEN is still required for audio. Detections are receiver estimates, not local speech recognition.
- HAM waveform uses an AnalyserNode fed by decoded output, with no generated samples. This has not been listened to on the TV.
- The optional JSON relay accepts the existing wideband option.
- The legacy player stylesheet centered radio flex children. Replacing that alignment makes the Saturn body stretch to its container. Headless Edge at 1920x1080 measured 1534px after versus about 1225px before.
- WeatherStar fetches three packaged lookup tables using fetch, which fails under file URLs. The build now embeds the unchanged upstream JSON tables as a local script; the compatibility wrapper serves those tables and leaves network forecast requests intact. Headless Edge changed from no forecast to hourly-graph-html visible after 22 seconds. A separate fetch error remained; this is not proof every weather resource works.

## GUI audit scope
Checked static button IDs in Live TV and HAM against source references: none unreferenced. This is not proof all buttons work. HAM LISTEN/STOP and previous/next have behavioral regression coverage; new fixes cover row navigation and zero-Hz streaming. Other library/settings screens need further interactive coverage.

## Real internet-radio visualization
HAM already has decoded PCM and can safely use Web Audio. Native radio streams need CORS permission before MediaElementAudioSourceNode can inspect samples; otherwise the Web Audio specification requires silence. Keep native station playback until each station and the B2 have been tested with an opt-in analyser. Existing radio decorative bars remain explicitly labelled simulated. No app dependency was added for visualization.

No station URLs, TV streams, or EPG data were changed. Desktop browser checks do not establish LG hardware playback compatibility.
