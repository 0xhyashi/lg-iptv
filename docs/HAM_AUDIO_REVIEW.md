# HAM audio integration review

The feature branch had audio buttons and an audio owner but no calls connecting them. LISTEN now starts receiver registration on a user gesture, voice selection retunes while listening, and STOP, receiver replacement and page exit release sound. Remote navigation includes both audio buttons. WebSocket heartbeats follow the receiver client; delayed decoder promises cannot play into a replacement session.

Protocol reference: https://kb5avy.tunnel.ubersdr.org/minimal-radio.js (retrieved 2026-11-10). Its protocol notes describe the requested v3 fixed 21-byte header. The current reference uses v4; this client explicitly requests v3. Older LG WebAssembly/Opus support and audible receiver output are not yet verified.

Validation: full npm build, source documentation audit, existing test suite, and extended HAM UI regression covering start/tune/stop. These are not end-to-end receiver or LG hardware tests.

Outstanding: live receiver audio validation, automatic scanning, spectrum canvas and frequency alignment, station sizing in an actual browser, and reproduction of WeatherStar startup failure. No changes to station URLs or EPG data.
