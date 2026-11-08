/* Build a *pristine* WeatherStar 4000+ static distribution alongside Bunkhouse.
 * Upstream visuals, maps, fonts, audio, screens, and scripts are NOT rewritten.
 * A pinned Git revision guarantees a reproducible v8.2.2 build; its MIT
 * LICENSE is copied into the third-party distribution.
 *
 * Run with the existing "npm run build". Requires Git, Node >=20 and network
 * access only for the FIRST build. Later builds reuse the local copy.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'weatherstar');
const REVISION = '237c60d242f9d70e0ee9c1bab87f3119c4b3b729'; // ws4kp 8.2.2
const REPO = 'https://github.com/netbymatt/ws4kp.git';

function run(command, args, dir) {
    console.log('ws4kp:', command, args.slice(0, 3).join(' ') + (args.length > 3 ? ' ...' : ''));
    cp.execFileSync(command, args, { cwd: dir, stdio: 'inherit', windowsHide: true });
}
function npm(args, dir) {
    if (process.platform === 'win32') {
        run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd'].concat(args), dir);
    } else {
        run('npm', args, dir);
    }
}
function usableCache() {
    const required = [
        'index.html', 'playlist.json', 'LICENSE', 'resources/ws.min.js',
        'resources/ws.min.css', 'music/default/Catch the Sun.mp3'
    ];
    try {
        return fs.readFileSync(path.join(TARGET, '.bunkhouse-revision'), 'utf8').trim() === REVISION
            && required.every(function (file) { return fs.existsSync(path.join(TARGET, file)); });
    } catch (_) { return false; }
}

if (usableCache()) {
    console.log('ws4kp: using cached pristine WeatherStar 4000+ v8.2.2');
} else {
    const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
    if (!(nodeMajor >= 20)) {
        throw new Error('WeatherStar 4000+ requires Node.js 20 or newer for its one-time build.');
    }
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bunkhouse-ws4kp-'));
    const newTarget = path.join(ROOT, 'weatherstar-build-tmp');
    try {
        run('git', ['init', '-q'], tmp);
        run('git', ['remote', 'add', 'origin', REPO], tmp);
        run('git', ['fetch', '-q', '--depth', '1', 'origin', REVISION], tmp);
        run('git', ['checkout', '-q', '--detach', 'FETCH_HEAD'], tmp);
        const got = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: tmp, encoding: 'utf8' }).trim();
        if (got !== REVISION) throw new Error('Unexpected WeatherStar revision: ' + got);
        npm(['ci', '--no-audit', '--no-fund'], tmp);
        npm(['run', 'build'], tmp);

        const output = path.join(tmp, 'dist');
        if (!fs.existsSync(path.join(output, 'index.html')) ||
            !fs.existsSync(path.join(output, 'playlist.json')) ||
            !fs.existsSync(path.join(output, 'music/default/Catch the Sun.mp3'))) {
            throw new Error('Upstream WeatherStar distribution is incomplete.');
        }
        fs.rmSync(newTarget, { recursive: true, force: true });
        fs.cpSync(output, newTarget, { recursive: true });
        fs.copyFileSync(path.join(tmp, 'LICENSE'), path.join(newTarget, 'LICENSE'));
        fs.writeFileSync(path.join(newTarget, '.bunkhouse-revision'), REVISION + '\n', 'utf8');
        fs.rmSync(TARGET, { recursive: true, force: true });
        fs.renameSync(newTarget, TARGET);
        console.log('ws4kp: original upstream 8.2.2 graphics, four music tracks and fonts copied into weatherstar/');
    } catch (e) {
        fs.rmSync(newTarget, { recursive: true, force: true });
        console.error('ws4kp: build failed; WeatherStar was not added to this package.');
        throw e; // don't silently release a broken "weather" channel
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}
