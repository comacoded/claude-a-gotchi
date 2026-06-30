# Claude-a-gotchi

A pixel-art Claude companion who lives in your VS Code sidebar. It codes along
while you type, celebrates when a big block of code ships, gets hungry for
context, naps when you go idle, and will play a round of tic-tac-toe if you
leave it alone too long.

The animations are 20×20 palette-indexed pixel frames in the style of the
[ClaudePix](https://claudepix.vercel.app/) library, plus a few hand-authored
states (waking, hungry, eating) drawn to match.

## What it does

- **Codes with you.** When you type or your AI generates code, Claude sits at
  its desk with headphones on and works.
- **Celebrates big blocks.** A single edit that inserts a chunk of lines (12 by
  default) is treated as a code-gen block and triggers a dance + confetti.
- **Gets hungry.** Its context window drains over time. Feed it from the sidebar
  or the `Claude: Feed Claude` command.
- **Naps.** After a stretch of no activity it falls asleep, and stretches awake
  when you start coding again.
- **Plays.** Idle a while and Claude may offer a game of tic-tac-toe. You can
  also start one (or a dance break) any time from the keycaps under its name.

## Animation states

16 presets drive the companion: `idle_breathe`, `idle_blink`,
`idle_look_around`, `work_coding`, `work_think`, `waking`, `hungry`, `eating`,
`dance_bounce`, `dance_sway`, `dance_djmix`, `dance_bounce_dj`, `dance_sway_dj`,
`expression_wink`, `expression_surprise`, `expression_sleep`.

Open `preview-states.html` (served over http) to see them all animating at once.

## Settings

| Setting | Default | What it does |
| --- | --- | --- |
| `claude.idleSleepMinutes` | 6 | Idle minutes before Claude sleeps. |
| `claude.playInviteMinutes` | 3 | Idle minutes before it may offer a game. |
| `claude.aiBlockLineThreshold` | 12 | Lines in one edit that count as a code-gen block. |
| `claude.hungerMinutes` | 30 | Minutes for a full context window to drain to hungry. |
| `claude.statDecayMinutes` | 30 | Minutes for energy to drop one notch while idle. |
| `claude.permadeath` | false | If on, total neglect makes Claude leave for good. |

## Develop

```bash
npm install
npm run build      # bundle the extension host
npm run package    # produce the .vsix
```

Regenerate the bundled animation data (after editing the source presets in
`scripts/anim/`):

```bash
node scripts/anim/build-anim.js media/animations.js
```

Regenerate the icons from the creature grid:

```bash
node scripts/gen-icons.js
```

## Credits

Pixel-creature animation format and the 13 base presets adapted from the
ClaudePix library (claudepix.vercel.app). Built by Nick Coma.
