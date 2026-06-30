// Build media/animations.js for claude-a-gotchi: bundle the 13 extracted
// claudepix presets + 3 hand-authored ones (eating, hungry, waking) authored in
// the same 20x20 palette-indexed grid format so they blend with the set.
const fs = require('fs');
const path = require('path');

const DST = process.argv[2];
if (!DST) throw new Error('pass output path');

const presets = JSON.parse(fs.readFileSync(path.join(__dirname, 'presets.json'), 'utf8'));

// ── creature base + helpers (mirrors claudepix creature-engine.js) ──
const B = 1, Y = 2, E = 0, F = 3; // body, eye, empty, food (authored extra)
const CREATURE = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,2,1,1,1,1,1,2,1,1,0,0,0,0],
  [0,0,0,1,1,1,1,2,1,1,1,1,1,2,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,0,1,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,0],
  [0,0,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,0],
  [0,0,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];
const clone = (g) => g.map(r => r.slice());
function patch(base, ops) {
  const o = clone(base);
  for (const [r, c, v] of ops) if (r >= 0 && r < 20 && c >= 0 && c < 20) o[r][c] = v;
  return o;
}
function shift(base, dr, dc) {
  const o = Array.from({ length: 20 }, () => new Array(20).fill(0));
  for (let r = 0; r < 20; r++) for (let c = 0; c < 20; c++) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 20 && nc >= 0 && nc < 20) o[nr][nc] = base[r][c];
  }
  return o;
}
const CREATURE_PAL = ['transparent', '#CD7F6A', '#1a1a1a'];
const FOOD_PAL = ['transparent', '#CD7F6A', '#1a1a1a', '#ffcf5c'];

// ── HUNGRY: droopy posture, low sad eyes, belly pang spark ──
const H_BASE = patch(CREATURE, [[6, 7, B], [6, 13, B]]);          // eyes drop to a low single row (sad)
const H_SLUMP = shift(H_BASE, 1, 0);                              // whole body sinks
const H_PANG = patch(H_BASE, [[2, 9, B], [2, 10, B], [3, 10, B]]); // hunger spark over head
const H_CLOSED = patch(H_BASE, [[7, 7, B], [7, 13, B]]);          // eyes shut
const hungry = {
  name: 'hungry', category: 'state', pal: CREATURE_PAL.slice(),
  frames: [
    { hold: 600, grid: H_BASE }, { hold: 220, grid: H_PANG }, { hold: 520, grid: H_BASE },
    { hold: 420, grid: H_SLUMP }, { hold: 520, grid: H_BASE }, { hold: 120, grid: H_CLOSED },
    { hold: 420, grid: H_BASE }, { hold: 220, grid: H_PANG },
  ],
};

// ── EATING: happy squint, food morsel drawn in, content bounce ──
const E_HAPPY = patch(CREATURE, [[7, 7, B], [7, 13, B]]);         // squinty top-row eyes (happy)
const E_NOM = shift(E_HAPPY, -1, 0);                             // little hop while chewing
const eating = {
  name: 'eating', category: 'state', pal: FOOD_PAL.slice(),
  frames: [
    { hold: 300, grid: E_HAPPY },
    { hold: 150, grid: patch(E_HAPPY, [[10, 18, F]]) },           // morsel approaches from right
    { hold: 150, grid: patch(E_HAPPY, [[10, 16, F]]) },
    { hold: 150, grid: patch(E_NOM, [[9, 14, F]]) },
    { hold: 200, grid: E_NOM },                                  // chomp
    { hold: 180, grid: E_HAPPY },                                // chew
    { hold: 160, grid: E_NOM },
    { hold: 300, grid: E_HAPPY },
    { hold: 150, grid: patch(E_HAPPY, [[10, 1, F]]) },            // morsel from left
    { hold: 150, grid: patch(E_HAPPY, [[10, 3, F]]) },
    { hold: 150, grid: patch(E_NOM, [[9, 5, F]]) },
    { hold: 200, grid: E_NOM },
    { hold: 360, grid: E_HAPPY },                                // content
  ],
};

// ── WAKING: drowsy → big stretch with arms up → eyes open ──
const W_CLOSED = patch(CREATURE, [[6, 7, B], [6, 13, B], [7, 7, B], [7, 13, B]]); // no eyes
const W_STRETCH = patch(shift(W_CLOSED, -1, 0), [[2, 3, B], [3, 3, B], [2, 16, B], [3, 16, B]]); // up + arms raised
const W_HALF = patch(CREATURE, [[6, 7, B], [6, 13, B]]);         // eyes crack open (low)
const W_OPEN = CREATURE;                                          // fully awake
const W_SPARK = patch(CREATURE, [[1, 10, B], [2, 10, B]]);        // wake spark
const waking = {
  name: 'waking', category: 'state', pal: CREATURE_PAL.slice(),
  frames: [
    { hold: 450, grid: W_CLOSED }, { hold: 600, grid: W_STRETCH }, { hold: 280, grid: W_STRETCH },
    { hold: 200, grid: W_CLOSED }, { hold: 160, grid: W_HALF }, { hold: 420, grid: W_OPEN },
    { hold: 200, grid: W_SPARK }, { hold: 320, grid: W_OPEN },
  ],
};

// ── INSPECT: Claude holds up a magnifying glass and scans a block of code ──
// Loupe palette (per-preset): rim=3, glass=4, handle=5, glint=6.
const RIM = 3, GLASS = 4, HANDLE = 5, GLINT = 6;
const INSPECT_PAL = ['transparent', '#CD7F6A', '#1a1a1a', '#aeb4ba', '#bfe0ef', '#5a4632', '#ffffff'];
// Loupe with lens top-left at (r,c): 4-wide rim ring, 2x2 glass core, a short
// handle stub trailing toward the gripping hand. glint adds a sparkle.
function loupe(r, c, glint) {
  const ops = [
    [r, c + 1, RIM], [r, c + 2, RIM],
    [r + 1, c, RIM], [r + 1, c + 1, GLASS], [r + 1, c + 2, GLASS], [r + 1, c + 3, RIM],
    [r + 2, c, RIM], [r + 2, c + 1, GLASS], [r + 2, c + 2, GLASS], [r + 2, c + 3, RIM],
    [r + 3, c + 1, RIM], [r + 3, c + 2, RIM],
    [r + 4, c, HANDLE],
  ];
  if (glint) ops.push([r + 1, c + 1, GLINT]);
  return ops;
}
// Eyes glance right toward the lens.
const EYES_RIGHT = [[6, 7, B], [7, 7, B], [6, 8, Y], [7, 8, Y], [6, 13, B], [7, 13, B], [6, 14, Y], [7, 14, Y]];
function inspectFrame(r, c, glint) {
  let g = patch(CREATURE, [[9, 17, B], [8, 17, B]]); // short raised forearm gripping the loupe
  g = patch(g, EYES_RIGHT);
  g = patch(g, loupe(r, c, glint));
  return g;
}
const inspect = {
  name: 'inspect', category: 'state', pal: INSPECT_PAL.slice(),
  frames: [
    { hold: 360, grid: inspectFrame(2, 15, false) }, // glass up high
    { hold: 150, grid: inspectFrame(2, 15, true) },  // glint
    { hold: 300, grid: inspectFrame(4, 15, false) }, // scan down
    { hold: 360, grid: inspectFrame(5, 14, false) }, // low, leaning in
    { hold: 150, grid: inspectFrame(5, 14, true) },  // glint — found it
    { hold: 300, grid: inspectFrame(4, 15, false) }, // scan back up
    { hold: 320, grid: inspectFrame(2, 15, false) },
  ],
};

presets.hungry = hungry;
presets.eating = eating;
presets.waking = waking;
presets.inspect = inspect;

const header = `// claude-a-gotchi animation data — 20x20 palette-indexed pixel frames.
// 13 presets sourced from the ClaudePix library (claudepix.vercel.app) plus
// hand-authored hungry / eating / waking / inspect states in the same style.
// Each preset: { name, category, pal:[colors], frames:[{hold, grid:[[idx]]}] }.
// Generated — do not edit by hand.
`;
const body = `window.CLAUDE_ANIM = ${JSON.stringify({ creaturePal: CREATURE_PAL, presets })};\n`;
fs.writeFileSync(DST, header + body);
console.log('wrote', DST, fs.statSync(DST).size, 'bytes,', Object.keys(presets).length, 'presets');
console.log('keys:', Object.keys(presets).join(', '));
