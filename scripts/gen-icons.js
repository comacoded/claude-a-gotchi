// Generate Claude-a-gotchi icons from the creature grid.
//  - media/activity-icon.svg : monochrome silhouette (eyes as holes) for the
//    activity-bar (VS Code tints it).
//  - media/icon-color.svg    : orange creature on a rounded dark tile for the
//    Marketplace icon (rasterized to icon.png separately).
const fs = require('fs');
const path = require('path');

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

function rects(filter) {
  let s = '';
  for (let r = 0; r < 20; r++)
    for (let c = 0; c < 20; c++)
      if (filter(CREATURE[r][c]))
        s += `<rect x="${c}" y="${r}" width="1" height="1"/>`;
  return s;
}

const MEDIA = path.join(__dirname, '..', 'media');

// Activity-bar icon: body filled, eyes left as holes. Single colour (#C5C5C5)
// so VS Code can theme it.
const activity = `<svg width="24" height="24" viewBox="0 0 20 20" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
<g fill="#C5C5C5">${rects((v) => v === 1)}</g>
</svg>\n`;
fs.writeFileSync(path.join(MEDIA, 'activity-icon.svg'), activity);

// Colour Marketplace tile: rounded dark background, orange body, dark eyes.
const body = `<g fill="#CD7F6A">${rects((v) => v === 1)}</g>`;
const eyes = `<g fill="#1a1a1a">${rects((v) => v === 2)}</g>`;
const color = `<svg width="256" height="256" viewBox="0 0 20 20" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="20" height="20" rx="3" fill="#1a1410"/>
${body}
${eyes}
</svg>\n`;
fs.writeFileSync(path.join(MEDIA, 'icon-color.svg'), color);
console.log('wrote activity-icon.svg + icon-color.svg');
