/* tools/build-css.js — makes the stylesheets work on every webOS version.
 *
 * Reads assets/*.css and writes dist/css/*.css. The pages load dist/, never
 * assets/, exactly as they do for the Babel output in dist/js. Run by
 * `npm run build`, so CI regenerates it before packaging.
 *
 * Three things, all of them invisible on a modern TV:
 *
 *   1. CSS custom properties.  Every colour and most sizes in this app are
 *      `var(--…)`, and var() only exists from Chromium 49. webOS 3 is Chromium
 *      38, so every one of those declarations was dropped at parse time: the
 *      page background went transparent, the text went to the default black,
 *      and the user saw a black screen with the app running fine underneath.
 *      Each declaration that uses var() now gets a plain copy with the value
 *      resolved from :root placed in front of it. Old engines keep the copy,
 *      new ones override it with the var() version, so the theme stays live.
 *
 *   2. -webkit- prefixes.  webOS 1/2 run WebKit, not Chromium, and only know
 *      flexbox, transforms and animations under their -webkit- names; webOS 3
 *      still needs @-webkit-keyframes. Prefixed copies go in front of the
 *      standard declaration, so the standard one still wins where it exists.
 *
 *   3. Flex `gap`.  Chromium only honours gap on flex containers from 84, so on
 *      webOS 3, 4, 5 and 6 every gap was silently zero and the controls sat
 *      flush against each other. assets/boot.js stamps `html.no-flex-gap` on
 *      those engines, and for every rule with a gap this emits the equivalent
 *      margins under that class. Children with an `auto` margin (the usual way
 *      to push one item to the far end) get it re-asserted afterwards, at a
 *      specificity the margin rules can't beat, so the fallback can't undo
 *      them.
 *
 * Plain Node, no dependencies: CI runs `npm ci` and nothing else, and a CSS
 * toolchain pulled in for three transforms would be more to keep working than
 * this file. The parser only has to understand the CSS this app actually
 * writes — rules, @media, @keyframes, comments, strings — and fails loudly on
 * anything it can't parse rather than emitting a broken stylesheet.
 */
'use strict';

var fs   = require('fs');
var path = require('path');

var ROOT    = path.resolve(__dirname, '..');
var SRC_DIR = path.join(ROOT, 'assets');
var OUT_DIR = path.join(ROOT, 'dist', 'css');

/* base.css is on every page, so its :root is visible to every stylesheet. A
   file's own :root block (vod.css has one) is added on top for that file only —
   resolving against variables from a file the page never loads would give old
   engines a different value from new ones. */
var BASE_FILE = 'base.css';

var GAP_CLASS = 'no-flex-gap';

/* ── Parsing ─────────────────────────────────────────────────────────────── */

/** Strip Comments for old-webOS CSS compatibility build.
 * @param {*} s - Input for stripComments().
 * @returns {*} Function result.
 */
function stripComments(s) {
    var out = '', i = 0, quote = null;
    while (i < s.length) {
        var c = s[i];
        if (quote) {
            out += c;
            if (c === '\\') { out += s[i + 1] || ''; i += 2; continue; }
            if (c === quote) quote = null;
            i++;
            continue;
        }
        if (c === '"' || c === "'") { quote = c; out += c; i++; continue; }
        if (c === '/' && s[i + 1] === '*') {
            var end = s.indexOf('*/', i + 2);
            if (end === -1) throw new Error('unterminated comment');
            i = end + 2;
            continue;
        }
        out += c;
        i++;
    }
    return out;
}

/* Index of the first `stop` character at paren depth 0 outside a string. */
/** Scan To for old-webOS CSS compatibility build.
 * @param {*} s - Input for scanTo().
 * @param {number} i - Index.
 * @param {*} stops - Input for scanTo().
 * @returns {*} Function result.
 */
function scanTo(s, i, stops) {
    var depth = 0, quote = null;
    for (; i < s.length; i++) {
        var c = s[i];
        if (quote) {
            if (c === '\\') { i++; continue; }
            if (c === quote) quote = null;
            continue;
        }
        if (c === '"' || c === "'") { quote = c; continue; }
        /* Checked before the depth bookkeeping so `)` can itself be a stop —
           that is how resolveVars finds the end of a var(). */
        if (depth === 0 && stops.indexOf(c) !== -1) return i;
        if (c === '(') depth++;
        else if (c === ')') depth--;
    }
    return -1;
}

/** Match Brace for old-webOS CSS compatibility build.
 * @param {*} s - Input for matchBrace().
 * @param {*} open - Input for matchBrace().
 * @returns {*} Function result.
 */
function matchBrace(s, open) {
    var depth = 0, quote = null;
    for (var i = open; i < s.length; i++) {
        var c = s[i];
        if (quote) {
            if (c === '\\') { i++; continue; }
            if (c === quote) quote = null;
            continue;
        }
        if (c === '"' || c === "'") { quote = c; continue; }
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return i; }
    }
    throw new Error('unbalanced braces');
}

/** Split Top Level for old-webOS CSS compatibility build.
 * @param {*} s - Input for splitTopLevel().
 * @param {*} sep - Input for splitTopLevel().
 * @returns {*} Function result.
 */
function splitTopLevel(s, sep) {
    var parts = [], start = 0;
    for (;;) {
        var at = scanTo(s, start, sep);
        if (at === -1) { parts.push(s.slice(start)); return parts; }
        parts.push(s.slice(start, at));
        start = at + 1;
    }
}

/** Parse Decls for old-webOS CSS compatibility build.
 * @param {*} body - Input for parseDecls().
 * @returns {*} Function result.
 */
function parseDecls(body) {
    var out = [];
    splitTopLevel(body, ';').forEach(function (chunk) {
        chunk = chunk.trim();
        if (!chunk) return;
        var colon = chunk.indexOf(':');
        if (colon === -1) throw new Error('bad declaration: ' + chunk);
        var prop  = chunk.slice(0, colon).trim();
        var value = chunk.slice(colon + 1).trim();
        var important = false;
        var m = /\s*!\s*important\s*$/i.exec(value);
        if (m) { important = true; value = value.slice(0, m.index).trim(); }
        out.push({ prop: prop, value: value, important: important });
    });
    return out;
}

/* Nodes: { type:'rule', selector, decls } | { type:'at', name, prelude,
   children } (block at-rules holding rules) | { type:'atdecl', name, prelude,
   decls } (@font-face) | { type:'stmt', text } (@import, @charset). */
/** Parse Sheet for old-webOS CSS compatibility build.
 * @param {*} s - Input for parseSheet().
 * @returns {*} Function result.
 */
function parseSheet(s) {
    var nodes = [], i = 0;
    while (i < s.length) {
        var stop = scanTo(s, i, '{;}');
        if (stop === -1) {
            if (s.slice(i).trim()) throw new Error('trailing junk: ' + s.slice(i, i + 60));
            break;
        }
        var prelude = s.slice(i, stop).trim();
        if (s[stop] === ';') { if (prelude) nodes.push({ type: 'stmt', text: prelude }); i = stop + 1; continue; }
        if (s[stop] === '}') throw new Error('unexpected } near: ' + s.slice(Math.max(0, stop - 60), stop));

        var close = matchBrace(s, stop);
        var body  = s.slice(stop + 1, close);
        if (prelude.charAt(0) === '@') {
            var name = /^@([\w-]+)/.exec(prelude)[1].toLowerCase();
            if (name === 'font-face' || name === 'page') {
                nodes.push({ type: 'atdecl', name: name, prelude: prelude, decls: parseDecls(body) });
            } else {
                nodes.push({ type: 'at', name: name, prelude: prelude, children: parseSheet(body) });
            }
        } else {
            nodes.push({ type: 'rule', selector: prelude, decls: parseDecls(body) });
        }
        i = close + 1;
    }
    return nodes;
}

/* ── var() resolution ───────────────────────────────────────────────────── */

/** Root Vars for old-webOS CSS compatibility build.
 * @param {*} nodes - Input for rootVars().
 * @param {*} into - Input for rootVars().
 * @returns {*} Function result.
 */
function rootVars(nodes, into) {
    nodes.forEach(function (n) {
        if (n.type !== 'rule' || n.selector.trim() !== ':root') return;
        n.decls.forEach(function (d) { if (d.prop.indexOf('--') === 0) into[d.prop] = d.value; });
    });
    return into;
}

/* Replaces every var() in `value`, recursively, from `vars`. Returns null when
   something can't be resolved and has no fallback — better to emit no copy at
   all than one with a hole in it. */
/** Resolve Vars for old-webOS CSS compatibility build.
 * @param {string} value - Input for resolveVars().
 * @param {*} vars - Input for resolveVars().
 * @param {*} depth - Input for resolveVars().
 * @returns {*} Function result.
 */
function resolveVars(value, vars, depth) {
    depth = depth || 0;
    if (depth > 20) return null;                              // a cycle
    var out = '', i = 0;
    for (;;) {
        var at = value.indexOf('var(', i);
        if (at === -1) { out += value.slice(i); break; }
        out += value.slice(i, at);
        var close = scanTo(value, at + 4, ')');
        if (close === -1) return null;
        var inner = value.slice(at + 4, close);
        var comma = scanTo(inner, 0, ',');
        var name  = (comma === -1 ? inner : inner.slice(0, comma)).trim();
        var fb    = comma === -1 ? null : inner.slice(comma + 1).trim();
        var raw   = Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : fb;
        if (raw === null || raw === undefined) return null;
        var resolved = resolveVars(raw, vars, depth + 1);
        if (resolved === null) return null;
        out += resolved;
        i = close + 1;
    }
    return out;
}

/* ── Prefixing ───────────────────────────────────────────────────────────── */

var WEBKIT_PROPS = {
    'flex': 1, 'flex-direction': 1, 'flex-wrap': 1, 'flex-flow': 1,
    'flex-grow': 1, 'flex-shrink': 1, 'flex-basis': 1, 'order': 1,
    'align-items': 1, 'align-self': 1, 'align-content': 1, 'justify-content': 1,
    'transform': 1, 'transform-origin': 1,
    'animation': 1, 'animation-name': 1, 'animation-duration': 1,
    'animation-timing-function': 1, 'animation-delay': 1,
    'animation-iteration-count': 1, 'animation-direction': 1,
    'animation-fill-mode': 1, 'animation-play-state': 1,
    'user-select': 1
};

/** Decl for old-webOS CSS compatibility build.
 * @param {*} prop - Input for decl().
 * @param {string} value - Input for decl().
 * @param {*} important - Input for decl().
 * @returns {*} Function result.
 */
function decl(prop, value, important) {
    return { prop: prop, value: value, important: !!important };
}

/* The full, ordered declaration list for one block: for each source
   declaration, its prefixed and var-free copies, then the declaration itself. */
/** Expand Decls for old-webOS CSS compatibility build.
 * @param {*} decls - Input for expandDecls().
 * @param {*} vars - Input for expandDecls().
 * @returns {*} Function result.
 */
function expandDecls(decls, vars) {
    var present = {};
    decls.forEach(function (d) { present[d.prop.toLowerCase()] = true; });

    var out = [];
    decls.forEach(function (d) {
        var prop = d.prop.toLowerCase();
        if (prop.indexOf('--') === 0) { out.push(d); return; }

        var plain = d.value;
        if (d.value.indexOf('var(') !== -1) plain = resolveVars(d.value, vars);

        if (plain !== null) {
            if (prop === 'display' && /^(inline-)?flex$/i.test(plain)) {
                out.push(decl('display', '-webkit-' + plain.toLowerCase(), d.important));
            } else if (WEBKIT_PROPS[prop] && !present['-webkit-' + prop]) {
                out.push(decl('-webkit-' + prop, plain, d.important));
            } else if (prop === 'transition' && /transform/.test(plain) && !present['-webkit-transition']) {
                out.push(decl('-webkit-transition', plain.replace(/(^|[\s,])transform\b/g, '$1-webkit-transform'), d.important));
            }
            if (plain !== d.value) out.push(decl(d.prop, plain, d.important));
        }
        out.push(d);
    });
    return out;
}

/* ── Flex gap fallback ───────────────────────────────────────────────────── */

/** Is Zero for old-webOS CSS compatibility build.
 * @param {*} v - Input for isZero().
 * @returns {boolean} Whether the condition holds.
 */
function isZero(v) { return /^0(\.0+)?([a-z%]+)?$/i.test(String(v).trim()); }

/* Scope a selector to html.no-flex-gap, merging into a leading `html` or
   `:root` rather than producing `html.no-flex-gap html…`, which never
   matches. */
/** Scope To Gap for old-webOS CSS compatibility build.
 * @param {*} sel - Input for scopeToGap().
 * @returns {*} Function result.
 */
function scopeToGap(sel) {
    sel = sel.trim();
    if (/^:root\b/.test(sel)) return 'html.' + GAP_CLASS + sel.slice(5);
    if (/^html(?![\w-])/.test(sel)) return 'html.' + GAP_CLASS + sel.slice(4);
    return 'html.' + GAP_CLASS + ' ' + sel;
}

/** Gap Rules for old-webOS CSS compatibility build.
 * @param {*} rule - Input for gapRules().
 * @param {*} vars - Input for gapRules().
 * @returns {*} Function result.
 */
function gapRules(rule, vars) {
    var g = {}, dir = 'row', wrap = false;
    rule.decls.forEach(function (d) {
        var prop = d.prop.toLowerCase();
        var v = d.value.indexOf('var(') !== -1 ? resolveVars(d.value, vars) : d.value;
        if (v === null) return;
        if (prop === 'gap' || prop === 'grid-gap') {
            var parts = v.split(/\s+/);
            g.row = parts[0]; g.col = parts[1] || parts[0];
        } else if (prop === 'row-gap' || prop === 'grid-row-gap') g.row = v;
        else if (prop === 'column-gap' || prop === 'grid-column-gap') g.col = v;
        else if (prop === 'flex-direction') dir = v;
        else if (prop === 'flex-flow') {
            if (/column(-reverse)?/.test(v)) dir = /column-reverse/.test(v) ? 'column-reverse' : 'column';
            else if (/row-reverse/.test(v)) dir = 'row-reverse';
            if (/\bwrap/.test(v) && !/nowrap/.test(v)) wrap = true;
        } else if (prop === 'flex-wrap') wrap = /wrap/.test(v) && !/nowrap/.test(v);
    });
    if (g.row === undefined && g.col === undefined) return [];

    var column = dir.indexOf('column') === 0, reverse = /reverse/.test(dir);
    var main   = column ? g.row : g.col;                     // gap along the flex direction
    var cross  = column ? g.col : g.row;                     // gap between wrapped lines

    var sels = splitTopLevel(rule.selector, ',').map(scopeToGap);
    var out = [];

    if (wrap) {
        /* No "first item of each line" selector exists, so a wrapping
           container trades the leading edge for the trailing one: every item
           gets the margin on its far side. The extra space at the end of each
           line is invisible in practice, which a gap at the start would not be. */
        var wd = [];
        if (main && !isZero(main))   wd.push(decl(column ? 'margin-bottom' : 'margin-right', main));
        if (cross && !isZero(cross)) wd.push(decl(column ? 'margin-right' : 'margin-bottom', cross));
        if (wd.length) out.push({ type: 'rule', selector: sels.map(function (s) { return s + ' > *'; }).join(',\n'), decls: wd });
        return out;
    }

    if (!main || isZero(main)) return [];
    var side = column ? (reverse ? 'margin-bottom' : 'margin-top')
                      : (reverse ? 'margin-right'  : 'margin-left');
    out.push({
        type: 'rule',
        selector: sels.map(function (s) { return s + ' > * + *'; }).join(',\n'),
        decls: [decl(side, main)]
    });
    return out;
}

/* Rules whose element has an `auto` margin. The gap fallback sets plain
   margins on flex children, which would silently replace those autos — and an
   auto margin is how a row pushes its last button to the far edge. */
/** Auto Margin Sides for old-webOS CSS compatibility build.
 * @param {*} decls - Input for autoMarginSides().
 * @returns {*} Function result.
 */
function autoMarginSides(decls) {
    var sides = {};
    decls.forEach(function (d) {
        var prop = d.prop.toLowerCase();
        var m = /^margin-(top|right|bottom|left)$/.exec(prop);
        if (m) { if (/^auto$/i.test(d.value.trim())) sides[m[1]] = true; return; }
        if (prop !== 'margin') return;
        var v = d.value.trim().split(/\s+/);
        var four = v.length === 1 ? [v[0], v[0], v[0], v[0]]
                 : v.length === 2 ? [v[0], v[1], v[0], v[1]]
                 : v.length === 3 ? [v[0], v[1], v[2], v[1]] : v;
        ['top', 'right', 'bottom', 'left'].forEach(function (s, i) {
            if (/^auto$/i.test(four[i])) sides[s] = true;
        });
    });
    return Object.keys(sides);
}

/* Two :not(#…) clauses add two ids' worth of specificity without matching
   anything real, so the re-asserted auto beats any container's gap rule. */
var AUTO_BOOST = 'html.' + GAP_CLASS + ':not(#_nfg1):not(#_nfg2)';

/** Boost Selector for old-webOS CSS compatibility build.
 * @param {*} sel - Input for boostSelector().
 * @returns {*} Function result.
 */
function boostSelector(sel) {
    sel = sel.trim();
    if (/^:root\b/.test(sel)) return AUTO_BOOST + sel.slice(5);
    if (/^html(?![\w-])/.test(sel)) return AUTO_BOOST + sel.slice(4);
    return AUTO_BOOST + ' ' + sel;
}

/* ── Transform + serialise ───────────────────────────────────────────────── */

/** Transform for old-webOS CSS compatibility build.
 * @param {*} nodes - Input for transform().
 * @param {*} vars - Input for transform().
 * @param {*} autos - Input for transform().
 * @returns {*} Function result.
 */
function transform(nodes, vars, autos) {
    var out = [];
    nodes.forEach(function (n) {
        if (n.type === 'rule') {
            out.push({ type: 'rule', selector: n.selector, decls: expandDecls(n.decls, vars) });
            gapRules(n, vars).forEach(function (r) { out.push(r); });
            var sides = autoMarginSides(n.decls);
            if (sides.length) {
                autos.push({
                    selector: splitTopLevel(n.selector, ',').map(boostSelector).join(',\n'),
                    decls: sides.map(function (s) { return decl('margin-' + s, 'auto'); })
                });
            }
        } else if (n.type === 'at' && /keyframes$/.test(n.name)) {
            var frames = n.children.map(function (f) {
                return { type: 'rule', selector: f.selector, decls: expandDecls(f.decls, vars) };
            });
            if (n.name === 'keyframes') {
                out.push({ type: 'at', name: '-webkit-keyframes',
                           prelude: n.prelude.replace(/^@keyframes/i, '@-webkit-keyframes'), children: frames });
            }
            out.push({ type: 'at', name: n.name, prelude: n.prelude, children: frames });
        } else if (n.type === 'at') {
            /* Auto margins inside an @media are re-asserted inside the same
               @media, so they only apply where the original did. */
            var innerAutos = [];
            var children = transform(n.children, vars, innerAutos);
            innerAutos.forEach(function (a) { children.push({ type: 'rule', selector: a.selector, decls: a.decls }); });
            out.push({ type: 'at', name: n.name, prelude: n.prelude, children: children });
        } else if (n.type === 'atdecl') {
            out.push({ type: 'atdecl', name: n.name, prelude: n.prelude, decls: expandDecls(n.decls, vars) });
        } else {
            out.push(n);
        }
    });
    return out;
}

/** Serialise Decls for old-webOS CSS compatibility build.
 * @param {*} decls - Input for serialiseDecls().
 * @param {*} indent - Input for serialiseDecls().
 * @returns {*} Function result.
 */
function serialiseDecls(decls, indent) {
    return decls.map(function (d) {
        return indent + d.prop + ': ' + d.value + (d.important ? ' !important' : '') + ';';
    }).join('\n');
}

/** Serialise for old-webOS CSS compatibility build.
 * @param {*} nodes - Input for serialise().
 * @param {*} indent - Input for serialise().
 * @returns {*} Function result.
 */
function serialise(nodes, indent) {
    indent = indent || '';
    var inner = indent + '    ';
    return nodes.map(function (n) {
        if (n.type === 'stmt') return indent + n.text + ';';
        if (n.type === 'rule' || n.type === 'atdecl') {
            var head = n.type === 'rule' ? n.selector.replace(/\s*\n\s*/g, '\n' + indent) : n.prelude;
            return indent + head + ' {\n' + serialiseDecls(n.decls, inner) + '\n' + indent + '}';
        }
        return indent + n.prelude + ' {\n' + serialise(n.children, inner) + '\n' + indent + '}';
    }).join('\n');
}

/* ── Main ────────────────────────────────────────────────────────────────── */

/** Build for old-webOS CSS compatibility build.
 * @returns {*} Function result.
 */
function build() {
    var files = fs.readdirSync(SRC_DIR).filter(function (f) { return /\.css$/i.test(f); }).sort();
    var parsed = {};
    files.forEach(function (f) {
        var src = fs.readFileSync(path.join(SRC_DIR, f), 'utf8');
        try { parsed[f] = parseSheet(stripComments(src)); }
        catch (e) { throw new Error(f + ': ' + e.message); }
    });

    var baseVars = parsed[BASE_FILE] ? rootVars(parsed[BASE_FILE], {}) : {};

    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    files.forEach(function (f) {
        var vars = rootVars(parsed[f], Object.assign({}, baseVars));
        var autos = [];
        var nodes = transform(parsed[f], vars, autos);
        autos.forEach(function (a) { nodes.push({ type: 'rule', selector: a.selector, decls: a.decls }); });
        var header = '/* Generated from assets/' + f + ' by tools/build-css.js — edit the source, not this file. */\n';
        fs.writeFileSync(path.join(OUT_DIR, f), header + serialise(nodes) + '\n');
    });
    console.log('build-css: ' + files.length + ' stylesheets → dist/css');
}

build();
