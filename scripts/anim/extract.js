// Extract every claudepix preset into a unified JSON:
//   { presetKey: { pal: [colors], frames: [{hold, grid:[[...]]}] } }
// Engine presets use values 0/1/2 (empty/body/eye); standalone ones carry
// their own multi-colour PAL. We resolve null frames to the base CREATURE and
// normalise every preset to carry an explicit palette.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = __dirname;
const ENGINE = ['dance_bounce','expression_wink','expression_surprise','dance_sway',
  'idle_blink','idle_look_around','expression_sleep','work_think','idle_breathe'];
const STANDALONE = ['work_coding','dance_djmix','dance_bounce_dj','dance_sway_dj'];

// Eye colour for the 2-value creature palette (dark, reads on any bg).
const EYE_COLOR = '#1a1a1a';
const BODY_COLOR = '#CD7F6A';
const CREATURE_PAL = ['transparent', BODY_COLOR, EYE_COLOR];

function makeSandbox() {
  const el = () => {
    const e = { style: {}, children: [] };
    e.appendChild = (c) => { e.children.push(c); return c; };
    Object.defineProperty(e, 'innerHTML', { set() {}, get() { return ''; } });
    return e;
  };
  const document = {
    createElement: () => el(),
    getElementById: () => el(),
  };
  const win = {};
  const sandbox = {
    window: win,
    document,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    console,
  };
  win.addEventListener = () => {};
  win.PixelEngine = undefined;
  sandbox.globalThis = sandbox;
  return sandbox;
}

function inlineScript(html, requireSrc) {
  // Grab the inline <script> block (the one without a src attribute).
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
  let m, picked = null;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;
    picked = m[2];
  }
  return picked;
}

const engineSrc = fs.readFileSync(path.join(DIR, 'creature-engine.js'), 'utf8');
const out = {};

for (const key of ENGINE) {
  const html = fs.readFileSync(path.join(DIR, key + '.html'), 'utf8');
  const script = inlineScript(html);
  const sb = makeSandbox();
  const ctx = vm.createContext(sb);
  vm.runInContext(engineSrc, ctx);
  vm.runInContext(script, ctx);
  const preset = sb.window.PRESET;
  const CREATURE = sb.window.PixelEngine.CREATURE;
  const frames = preset.frames.map(f => ({
    hold: f.hold,
    grid: (f.frame ? f.frame : CREATURE).map(r => r.slice()),
  }));
  out[key] = { name: preset.name, category: preset.category, pal: CREATURE_PAL.slice(), frames };
}

for (const key of STANDALONE) {
  const html = fs.readFileSync(path.join(DIR, key + '.html'), 'utf8');
  const script = inlineScript(html);
  const sb = makeSandbox();
  const ctx = vm.createContext(sb);
  vm.runInContext(script, ctx);
  const FRAMES = sb.window.FRAMES;
  const PAL = sb.window.PAL.slice();
  const frames = FRAMES.map(f => ({ hold: f.hold, grid: f.frame.map(r => r.slice()) }));
  out[key] = { name: key.replace(/_/g, ' '), category: 'standalone', pal: PAL, frames };
}

fs.writeFileSync(path.join(DIR, 'presets.json'), JSON.stringify(out));
// Report
for (const k of Object.keys(out)) {
  const p = out[k];
  console.log(`${k.padEnd(18)} frames=${String(p.frames.length).padStart(2)} pal=${p.pal.length} grid=${p.frames[0].grid.length}x${p.frames[0].grid[0].length}`);
}
console.log('wrote presets.json', fs.statSync(path.join(DIR,'presets.json')).size, 'bytes');
