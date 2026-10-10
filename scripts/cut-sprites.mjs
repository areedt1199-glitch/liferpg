// Cuts sprites out of a sheet generated on a flat green (#00FF00-ish) background.
// Usage: node scripts/cut-sprites.mjs <ffmpeg> <sheet.png> <outDir> <id1,id2,...>
// Sprites are found automatically (connected non-green pixels, nearby pieces merged), ordered row by row,
// keyed to transparent with green spill removed at the edges, and saved as <outDir>/<id>.png.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const [ffmpeg, sheet, outDir, idList] = process.argv.slice(2);
if (!ffmpeg || !sheet || !outDir || !idList) { console.error('usage: node scripts/cut-sprites.mjs <ffmpeg> <sheet.png> <outDir> <id1,id2,...>'); process.exit(1); }
const ids = idList.split(',');
// `ffmpeg -i` with no output exits non-zero but prints the stream size on stderr.
let probe = ''; try { execFileSync(ffmpeg, ['-hide_banner', '-i', sheet], { stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { probe = String(e.stderr); }
const [W, H] = probe.match(/, (\d{2,5})x(\d{2,5})/).slice(1).map(Number);
const px = new Uint8Array(execFileSync(ffmpeg, ['-v', 'error', '-i', sheet, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 28 }));

// Green-screen key: bright, strongly green pixels are background; a softer band gives partial alpha.
const greenness = i => px[i * 4 + 1] - Math.max(px[i * 4], px[i * 4 + 2]);
const isBg = i => px[i * 4 + 1] > 170 && greenness(i) > 110;
const alpha = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) { const g = greenness(i); alpha[i] = isBg(i) ? 0 : px[i * 4 + 1] > 150 && g > 70 ? Math.round(255 * (110 - g) / 40) : 255; }

// Find sprites: connected opaque pixels, ignoring specks, then merge boxes that nearly touch.
const seen = new Uint8Array(W * H), label = new Int32Array(W * H).fill(-1), boxes = [];
let skipped = 0;
for (let s = 0; s < W * H; s++) {
  if (seen[s] || alpha[s] < 128) continue;
  const id = boxes.length + skipped; let x0 = W, y0 = H, x1 = 0, y1 = 0, count = 0; const stack = [s]; seen[s] = 1; label[s] = id;
  while (stack.length) { const i = stack.pop(), x = i % W, y = (i / W) | 0; count++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < W * H && !seen[j] && alpha[j] >= 128) { seen[j] = 1; label[j] = id; stack.push(j); } }
  if (count >= 12) boxes.push({ x0, y0, x1, y1, count, owns: new Set([id]) }); else skipped++;
}
// Big blobs are sprites; small detached pieces (halo, sparkle, smoke) join the nearest sprite within reach.
const sprites = boxes.filter(b => b.count > 400), pieces = boxes.filter(b => b.count <= 400), REACH = 28;
const gap = (a, b) => Math.max(0, a.x0 - b.x1, b.x0 - a.x1) + Math.max(0, a.y0 - b.y1, b.y0 - a.y1);
for (const p of pieces) { let best = null, bd = Infinity; for (const sp of sprites) { const d = gap(p, sp); if (d < bd) { bd = d; best = sp; } }
  if (best && bd <= REACH) { best.x0 = Math.min(best.x0, p.x0); best.y0 = Math.min(best.y0, p.y0); best.x1 = Math.max(best.x1, p.x1); best.y1 = Math.max(best.y1, p.y1); for (const o of p.owns) best.owns.add(o); } }
// Row-major order: group by vertical centre, then left to right.
sprites.sort((a, b) => (a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2);
// Same row = vertical extents overlap by at least half of the shorter sprite (tall and short sprites share a row).
const overlap = (a, b) => Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0), rows = [];
for (const b of sprites) { const row = rows.find(r => r.items.some(o => overlap(o, b) > .5 * Math.min(o.y1 - o.y0, b.y1 - b.y0))); if (row) row.items.push(b); else rows.push({ cy: (b.y0 + b.y1) / 2, items: [b] }); }
const ordered = rows.sort((a, b) => a.cy - b.cy).flatMap(r => r.items.sort((a, b) => a.x0 - b.x0));
if (ordered.length !== ids.length) { console.error(`found ${ordered.length} sprites but ${ids.length} ids were given`); process.exit(2); }

fs.mkdirSync(outDir, { recursive: true });
const PAD = 2;
ordered.forEach((b, k) => {
  const x0 = Math.max(0, b.x0 - PAD), y0 = Math.max(0, b.y0 - PAD), x1 = Math.min(W - 1, b.x1 + PAD), y1 = Math.min(H - 1, b.y1 + PAD), w = x1 - x0 + 1, h = y1 - y0 + 1;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y0 + y) * W + x0 + x, o = (y * w + x) * 4; let [r, g, bl] = [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]];
    // Despill: edge pixels lose their green cast.
    if (alpha[i] < 255 || [i - 1, i + 1, i - W, i + W].some(j => j >= 0 && j < W * H && alpha[j] === 0)) g = Math.min(g, Math.max(r, bl) + 12);
    // Only this sprite's own pixels (neighbours' weapons or wings inside the box are cleared).
    const mine = label[i] >= 0 ? b.owns.has(label[i]) : [i - 1, i + 1, i - W, i + W].some(j => j >= 0 && j < W * H && b.owns.has(label[j]));
    out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = mine ? alpha[i] : 0;
  }
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-i', '-', path.join(outDir, `${ids[k]}.png`)], { input: Buffer.from(out) });
  console.log(`${ids[k]} ${w}x${h}`);
});
