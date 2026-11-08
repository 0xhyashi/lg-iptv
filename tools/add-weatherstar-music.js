/* Adds CC BY 4.0 music from the author's OFFICIAL companion repo.
 *
 * WeatherStar itself is unchanged. Its existing music player shuffles songs
 * without replacement, plays the next automatically, then reshuffles forever.
 * Its original 4 tracks are kept; we append 13 freely licensed new tracks
 * to the generated static playlist.json. The visual assets/music player JS
 * from WeatherStar 4000+ v8.2.2 are never rewritten.
 *
 * The "Latest Observations" album is CC BY 4.0 and attribution is included in
 * weatherstar/music/LICENSE-ADDITIONAL-MUSIC.md. Other albums have different
 * terms, so we deliberately do not fetch them.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'weatherstar');
const MUSIC_REV = '04b2f24ae8bc35eab1ebaf550b177f900d191070';
const ALBUM = 'Latest Observations';
const FILES = [
  [
    "Breezy Raindrops.mp3",
    3648996,
    "f18bcece254288479dec89e76ae14214e2c54d72"
  ],
  [
    "Graupel.mp3",
    3476955,
    "239fdd14b5856d512f008c342f2d59d24e16d272"
  ],
  [
    "Melting Icicles.mp3",
    3568355,
    "7b25a342f325250ab4a6f447fba6a8f8f3f3e399"
  ],
  [
    "Meteor Shower.mp3",
    3969249,
    "4a85ed2718ad07363f4a90bff94a9dde20dce47e"
  ],
  [
    "Morning Fog.mp3",
    3987679,
    "22f4aba2c4dd7f933e00da557dde294e3e8e36ba"
  ],
  [
    "Nacreous Clouds.mp3",
    3341795,
    "fc9d80b5051e3adf4bdd69a2d066ce08e262f024"
  ],
  [
    "Opalescent Haze.mp3",
    3998051,
    "abd5c052650d6c32206b9832199ac3bc614e17c0"
  ],
  [
    "Rolling Clouds.mp3",
    3086050,
    "1c1beac85fa33dfe9a11c69b2ae2952fcc0a0e31"
  ],
  [
    "September Drizzle.mp3",
    3495397,
    "1a1a587c4126b2492e313f8b0a9320cf100813f2"
  ],
  [
    "Sunny Afternoon.mp3",
    3721571,
    "a25e6197a859c4dd8a9a2c1d0ff13560f57470c6"
  ],
  [
    "Sunshine on the Street.mp3",
    3399018,
    "fa4cb558f999f005896420c29942d62afa0cdfe7"
  ],
  [
    "Waning Crescent.mp3",
    3915491,
    "6aa0d6071984147a49492f74de9d0c3fbe01ed79"
  ],
  [
    "Warm Front.mp3",
    2834910,
    "29c3da14d7061fe91edd84e850c95013f2fc7631"
  ]
];
const MUSIC_DIR = path.join(TARGET, 'music', ALBUM);
const STAMP = path.join(TARGET,'.bunkhouse-music-revision');
const UPSTREAM = 'https://github.com/netbymatt/ws4kp-music.git';

/** Run for licensed 17-track weather soundtrack build.
 * @param {*} args - Input for run().
 * @param {number} dir - Direction.
 * @returns {*} Function result.
 */
function run(args, dir) {
    cp.execFileSync('git', args, { cwd: dir, stdio: 'inherit', windowsHide: true });
}
/** Git Blob SHA for licensed 17-track weather soundtrack build.
 * @param {string} file - File path.
 * @returns {*} Function result.
 */
function gitBlobSHA(file) {
    const content=fs.readFileSync(file);
    const h=crypto.createHash('sha1');
    h.update(Buffer.from('blob ' + content.length + '\0', 'utf8'));
    h.update(content);
    return h.digest('hex');
}
/** Update Playlist for licensed 17-track weather soundtrack build.
 * @returns {void} Updates state or the UI.
 */
function updatePlaylist() {
    const file = path.join(TARGET, 'playlist.json');
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(data.availableFiles) || data.availableFiles.length < 4) {
        throw Error('Original WeatherStar music playlist is missing or incomplete.');
    }
    if (!data.metaData || typeof data.metaData !== 'object') data.metaData = {};
    // Re-create only our extension, never remove original paths. Names retain
    // WeatherStar's own conventions and native MP3 next/ended handler.
    const own = FILES.map(function (row) { return ALBUM+'/'+row[0]; });
    data.availableFiles = data.availableFiles.filter(function (name) {
        return name.indexOf(ALBUM+'/') !== 0;
    }).concat(own);
    FILES.forEach(function (row) {
        const name=ALBUM+'/'+row[0];
        data.metaData[name]={
            title: row[0].replace(/\.mp3$/i, ''),
            artist:'netbymatt',
            album: ALBUM
        };
    });
    fs.writeFileSync(file, JSON.stringify(data), 'utf8');
}
/** Complete for licensed 17-track weather soundtrack build.
 * @returns {*} Function result.
 */
function complete() {
    try {
        return fs.readFileSync(STAMP,'utf8').trim()===MUSIC_REV
            && FILES.every(function (row) {
                const file=path.join(MUSIC_DIR,row[0]);
                return fs.statSync(file).size===row[1];
            });
    } catch (_) {return false;}
}

if (complete()) {
    console.log('weatherstar music: 13 additional licensed songs already installed.');
    updatePlaylist(); // idempotently keep all 17 original + extended tracks.
} else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bunkhouse-weather-music-'));
    try {
        run(['init','-q'], tmp);
        run(['remote','add','origin',UPSTREAM], tmp);
        run(['sparse-checkout','init','--cone'],tmp);
        run(['sparse-checkout','set',ALBUM],tmp);
        run(['fetch','-q','--depth','1','--filter=blob:none','origin',MUSIC_REV],tmp);
        run(['checkout','-q','--detach','FETCH_HEAD'],tmp);
        const rev = cp.execFileSync('git',['rev-parse','HEAD'],{cwd:tmp,encoding:'utf8'}).trim();
        if(rev !== MUSIC_REV) throw Error('Music source revision changed unexpectedly.');
        FILES.forEach(function(row) {
            const file=path.join(tmp,ALBUM,row[0]);
            if (fs.statSync(file).size !== row[1] || gitBlobSHA(file) !== row[2]) {
                throw Error('Music integrity check failed for '+row[0]);
            }
        });
        fs.mkdirSync(MUSIC_DIR,{recursive:true});
        FILES.forEach(function(row) {
            fs.copyFileSync(path.join(tmp,ALBUM,row[0]),path.join(MUSIC_DIR,row[0]));
        });
        const license = fs.readFileSync(path.join(tmp,'LICENSE.md'),'utf8');
        fs.writeFileSync(path.join(TARGET,'music','LICENSE-ADDITIONAL-MUSIC.md'),
           '# Bunkhouse WeatherStar supplemental music\n\n'+
           '13 original tracks from *Latest Observations* in the author’s official '+
           '[ws4kp-music](https://github.com/netbymatt/ws4kp-music) repo. '+
           'Music by netbymatt, **CC BY 4.0**.\n\n'+
           'https://creativecommons.org/licenses/by/4.0/\n\n'+
           'No modifications to the audio. Revision: '+MUSIC_REV+'\n\n---\n\n'+license,
           'utf8');
        updatePlaylist();
        fs.writeFileSync(STAMP,MUSIC_REV+'\n','utf8');
        console.log('weatherstar music: 17 tracks total, randomized continuous rotation (4 bundled + 13 Latest Observations).');
    } finally {
        fs.rmSync(tmp,{recursive:true,force:true});
    }
}
