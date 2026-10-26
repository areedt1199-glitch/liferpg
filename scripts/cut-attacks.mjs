// Cuts the 3-frame attack sheets in assets-src/attacks/*.jpg (green screen, one character per row, three poses per row)
// into one transparent strip per character: public/images/attacks/<kind>-<id>.webp, plus src/features/boss/attacks.json.
// Usage: node scripts/cut-attacks.mjs [--debug <dir>]
// Each frame is shifted so the character's feet line up across frames (the "anchor"), so the strip plays in place.
import fs from 'node:fs'; import path from 'node:path'; import sharp from 'sharp';

const SRC = 'assets-src/attacks', OUT = 'public/images/attacks', META = 'src/features/boss/attacks.json';
const debugDir = process.argv.includes('--debug') ? process.argv[process.argv.indexOf('--debug') + 1] : null;
// rows: one entry per sheet row (null = no matching character in the app). frames: which of the 3 poses to keep.
// shift: manual nudge of the body centre per kept frame, in sheet pixels.
// bodyH: manual body height in sheet pixels (sets the on-screen size).
// cols: manual column cuts in sheet pixels (when an effect spills over the even split).
// erase: [frame, x0, y0, x1, y1] boxes (fractions of the cell) cleared before cropping.
const sheets = [
  { file: 'boss-drunk', kind: 'boss', rows: [{ id: 'drunk' }] },
  { file: 'boss-wizard', kind: 'boss', rows: [{ id: 'wizard', cols: [550, 990], shift: [-190, 0, 0] }] },
  { file: 'boss-ophanim', kind: 'boss', rows: [{ id: 'ophanim', cols: [580, 1030] }] },
  { file: 'boss-boneeye', kind: 'boss', rows: [{ id: 'boneeye', cols: [690, 1040] }] },
  { file: 'boss-gnome', kind: 'boss', rows: [{ id: 'gnome', cols: [555, 1000] }] },
  { file: 'boss-mushroom', kind: 'boss', rows: [{ id: 'mushroom', frames: [1, 2], cols: [835, 1110] }] },
  { file: 'boss-wolf', kind: 'boss', rows: [{ id: 'wolf' }] },
  { file: 'boss-rocker', kind: 'boss', rows: [{ id: 'rocker' }] },
  { file: 'skins-wizard-priest-ninja', kind: 'skin', rows: [{ id: 'wizard' }, { id: 'priest' }, { id: 'ninja' }] },
  { file: 'skins-swordsman-knight-archer', kind: 'skin', rows: [{ id: 'swordsman' }, { id: 'knight' }, { id: 'archer', frames: [0, 1] }] },
  { file: 'skins-warrior-rogue-bard', kind: 'skin', rows: [null, { id: 'rogue' }, { id: 'bard' }] },
  { file: 'skins-farmer-guard-slime', kind: 'skin', rows: [{ id: 'farmer' }, { id: 'guard' }, { id: 'slime', bodyH: 150 }] },
  { file: 'skins-monk-paladin-blacksmith', kind: 'skin', rows: [{ id: 'monk' }, { id: 'paladin' }, { id: 'blacksmith' }] },
  { file: 'skins-goblin-wolf-skeleton', kind: 'skin', rows: [{ id: 'goblin' }, { id: 'wolf' }, { id: 'skeleton' }] },
  { file: 'skins-samurai-elf-dwarf', kind: 'skin', rows: [{ id: 'samurai' }, { id: 'elf', frames: [0, 1] }, { id: 'dwarf' }] },
];

async function load(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { px: data, W: info.width, H: info.height };
}

// Background colour = median of the border pixels; alpha falls off with RGB distance from it (JPEG-tolerant).
function key({ px, W, H }) {
  const border = [];
  for (let x = 0; x < W; x += 4) border.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y += 4) border.push(y * W, y * W + W - 1);
  const med = c => { const v = border.map(i => px[i * 3 + c]).sort((a, b) => a - b); return v[v.length >> 1]; };
  const bg = [med(0), med(1), med(2)], alpha = new Uint8Array(W * H), LO = 70, HI = 125;
  for (let i = 0; i < W * H; i++) {
    const d = Math.hypot(px[i * 3] - bg[0], px[i * 3 + 1] - bg[1], px[i * 3 + 2] - bg[2]);
    alpha[i] = d <= LO ? 0 : d >= HI ? 255 : Math.round(255 * (d - LO) / (HI - LO));
  }
  // Drop specks (JPEG noise): opaque components under 40 pixels.
  const seen = new Uint8Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (seen[s] || alpha[s] < 100) continue;
    const comp = [s]; seen[s] = 1;
    for (let k = 0; k < comp.length; k++) { const i = comp[k], x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < W * H && !seen[j] && alpha[j] >= 100) { seen[j] = 1; comp.push(j); } }
    if (comp.length < 40) for (const i of comp) alpha[i] = 0;
  }
  return alpha;
}

// Split [0, n) into `parts` bands, cutting at the emptiest line near each even split.
function cuts(n, parts, occupancy) {
  const out = [0];
  for (let k = 1; k < parts; k++) {
    const mid = Math.round(n * k / parts), win = Math.round(n / parts * .2); let best = mid, bv = Infinity;
    for (let c = mid - win; c <= mid + win; c++) { const v = occupancy(c) + Math.abs(c - mid) * .01; if (v < bv) { bv = v; best = c; } }
    out.push(best);
  }
  out.push(n); return out;
}

// The character is located by sliding its idle sprite (public/images/<kind>s/<id>.png) over the frame at a few
// scales and keeping the best colour match; effects rarely share the body's colours, so they don't pull the anchor.
const K = 4; // matching runs at 1/K resolution
async function template(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, w: info.width, h: info.height };
}
function shrink(px, alpha, W, cell, mask) {
  const w = Math.floor((cell.x1 - cell.x0) / K), h = Math.floor((cell.y1 - cell.y0) / K), c = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let dy = 0; dy < K; dy++) for (let dx = 0; dx < K; dx++) {
      const lx = x * K + dx, ly = y * K + dy, al = mask[ly * (cell.x1 - cell.x0) + lx] / 255, i = ((cell.y0 + ly) * W + cell.x0 + lx) * 3;
      r += px[i] * al; g += px[i + 1] * al; b += px[i + 2] * al; a += al;
    }
    const o = (y * w + x) * 4; c[o] = a ? r / a : 0; c[o + 1] = a ? g / a : 0; c[o + 2] = a ? b / a : 0; c[o + 3] = a / (K * K);
  }
  return { c, w, h };
}
function points(t, th) {
  const tw = Math.max(4, Math.round(t.w * th / t.h)), pts = [];
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const i = (Math.floor(y * t.h / th) * t.w + Math.floor(x * t.w / tw)) * 4;
    if (t.d[i + 3] > 200) pts.push(x, y, t.d[i], t.d[i + 1], t.d[i + 2]);
  }
  return { pts, tw, th };
}
// Score = sum of per-pixel similarity (100 − colour distance; landing on background costs 80), so a larger scale
// wins only while the extra template pixels still land on matching colours.
function match(small, t, heights) {
  let best = { score: -Infinity };
  for (const th of heights) {
    const { pts, tw } = points(t, th);
    for (let oy = 0; oy + th <= small.h; oy++) for (let ox = -Math.round(tw * .2); ox + tw * .8 <= small.w; ox++) {
      let s = 0;
      for (let k = 0; k < pts.length; k += 5) {
        const x = ox + pts[k], y = oy + pts[k + 1];
        if (x < 0 || x >= small.w) { s -= 80; continue; }
        const o = (y * small.w + x) * 4;
        s += small.c[o + 3] < .5 ? -80 : 100 - (Math.abs(small.c[o] - pts[k + 2]) + Math.abs(small.c[o + 1] - pts[k + 3]) + Math.abs(small.c[o + 2] - pts[k + 4])) / 3;
      }
      if (s > best.score) best = { score: s, ox, oy, tw, th };
    }
  }
  return best;
}

function frameOf(px, alpha, W, cell, erase) {
  const { x0, y0, x1, y1 } = cell, w = x1 - x0, h = y1 - y0;
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) mask[y * w + x] = alpha[(y0 + y) * W + x0 + x];
  for (const [ex0, ey0, ex1, ey1] of erase) for (let y = Math.floor(ey0 * h); y < ey1 * h; y++) for (let x = Math.floor(ex0 * w); x < ex1 * w; x++) mask[y * w + x] = 0;
  let bx0 = w, by0 = h, bx1 = -1, by1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x] > 60) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
  return { mask, w, h, box: { x0: bx0, y0: by0, x1: bx1, y1: by1 }, small: shrink(px, alpha, W, cell, mask) };
}

fs.mkdirSync(OUT, { recursive: true }); if (debugDir) fs.mkdirSync(debugDir, { recursive: true });
const meta = { skin: {}, boss: {} };
for (const sheet of sheets) {
  const img = await load(path.join(SRC, `${sheet.file}.jpg`)), { px, W, H } = img, alpha = key(img);
  const rowCuts = cuts(H, sheet.rows.length, y => { let n = 0; for (let x = 0; x < W; x++) if (alpha[y * W + x] > 60) n++; return n; });
  for (let r = 0; r < sheet.rows.length; r++) {
    const row = sheet.rows[r]; if (!row) continue;
    const ry0 = rowCuts[r], ry1 = rowCuts[r + 1];
    const colCuts = row.cols ? [0, ...row.cols, W] : cuts(W, 3, x => { let n = 0; for (let y = ry0; y < ry1; y++) if (alpha[y * W + x] > 60) n++; return n; });
    const keep = row.frames ?? [0, 1, 2];
    const frames = keep.map(f => ({ f, cell: { x0: colCuts[f], x1: colCuts[f + 1], y0: ry0, y1: ry1 } }))
      .map(({ f, cell }) => ({ cell, ...frameOf(px, alpha, W, cell, (row.erase ?? []).filter(e => e[0] === f).map(e => e.slice(1))) }));
    // Find the body in each frame, settle on one scale (median), then place every frame at that scale.
    const t = await template(`public/images/${sheet.kind === 'boss' ? 'bosses' : 'skins'}/${row.id}.png`);
    const hs = frames[0].small.h, range = Array.from({ length: 14 }, (_, i) => Math.round(hs * (.4 + i * .045))).filter(v => v <= hs);
    const scales = frames.map(fr => match(fr.small, t, range).th).sort((a, b) => a - b), th = scales[scales.length >> 1];
    for (const fr of frames) {
      const m = match(fr.small, t, [th]);
      fr.hit = m; fr.ax = Math.round((m.ox + m.tw / 2) * K) + (row.shift?.[frames.indexOf(fr)] ?? 0);
      // Feet and head: lowest / highest opaque pixel in a narrow column around the body centre.
      const band = Math.round(m.tw * K / 4); let top = fr.h, feet = 0;
      for (let y = 0; y < fr.h; y++) for (let x = Math.max(0, fr.ax - band); x <= Math.min(fr.w - 1, fr.ax + band); x++) if (fr.mask[y * fr.w + x] === 255) { if (y < top) top = y; if (y > feet) feet = y; }
      fr.ay = feet; fr.bodyH = feet - top;
    }
    // Common canvas with every frame's anchor at the same point.
    const L = Math.max(...frames.map(fr => fr.ax - fr.box.x0)), R = Math.max(...frames.map(fr => fr.box.x1 - fr.ax));
    const T = Math.max(...frames.map(fr => fr.ay - fr.box.y0)), B = Math.max(...frames.map(fr => fr.box.y1 - fr.ay));
    const fw = L + R + 1, fh = T + B + 1, strip = Buffer.alloc(fw * frames.length * fh * 4);
    frames.forEach((fr, k) => {
      for (let y = fr.box.y0; y <= fr.box.y1; y++) for (let x = fr.box.x0; x <= fr.box.x1; x++) {
        const al = fr.mask[y * fr.w + x]; if (!al) continue;
        const sx = fr.cell.x0 + x, sy = fr.cell.y0 + y, si = (sy * W + sx) * 3;
        const ox = k * fw + L + (x - fr.ax), oy = T + (y - fr.ay), o = (oy * fw * frames.length + ox) * 4;
        let [rr, gg, bb] = [px[si], px[si + 1], px[si + 2]];
        if (al < 255) gg = Math.min(gg, Math.max(rr, bb) + 10); // despill the soft edge
        strip[o] = rr; strip[o + 1] = gg; strip[o + 2] = bb; strip[o + 3] = al;
      }
    });
    const name = `${sheet.kind}-${row.id}`, file = path.join(OUT, `${name}.webp`);
    await sharp(strip, { raw: { width: fw * frames.length, height: fh, channels: 4 } }).webp({ quality: 88, alphaQuality: 90, effort: 6 }).toFile(file);
    // Effects only ever add height above the head, so the shortest frame is the truest body height.
    const bodyH = row.bodyH ?? Math.min(...frames.map(fr => fr.bodyH));
    meta[sheet.kind][row.id] = { frames: frames.length, w: fw, h: fh, ax: L, ay: T, bodyH };
    console.log(`${name}: ${frames.length}×${fw}x${fh} anchor ${L},${T} body ${bodyH} (${(fs.statSync(file).size / 1024).toFixed(0)}KB)`);
    if (debugDir) {
      const marks = frames.map((_, k) => `<line x1="${k * fw + L}" y1="0" x2="${k * fw + L}" y2="${fh}" stroke="red"/><line x1="${k * fw}" y1="${T}" x2="${(k + 1) * fw}" y2="${T}" stroke="red"/><rect x="${k * fw + L - frames[k].hit.tw * K / 2}" y="${T - bodyH}" width="${frames[k].hit.tw * K}" height="${bodyH}" fill="none" stroke="blue"/><rect x="${k * fw}" y="0" width="${fw}" height="${fh}" fill="none" stroke="#000"/>`).join('');
      await sharp({ create: { width: fw * frames.length, height: fh, channels: 3, background: '#c8c8c8' } })
        .composite([{ input: file }, { input: Buffer.from(`<svg width="${fw * frames.length}" height="${fh}">${marks}</svg>`) }]).png().toFile(path.join(debugDir, `${name}.png`));
    }
  }
}
fs.writeFileSync(META, JSON.stringify(meta, null, 1) + '\n');
