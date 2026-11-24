import * as THREE from "three";
import type { Panel, Seg } from "./content";
import { rng } from "./world";

/*
 * Paints a chapter as something that belongs on the mountain: words in red
 * paint on pale granite, the way names and altitudes are painted on the
 * boulders at Himalayan base camps. Each painter returns a colour map and a
 * matching bump map (paint slightly raised, rock pitted), so light catches it.
 */

const SANS = "'Avenir Next', 'Helvetica Neue', 'Segoe UI', Helvetica, Arial, sans-serif";
const SERIF = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, monospace";

type Item = { font: string; segs: Seg[]; gap: number; accentAll?: boolean; col2?: string; col2Font?: string };

function layout(panel: Panel, w: number) {
  const u = w / 100;
  const items: Item[] = [];
  items.push({ font: `600 ${u * 2.9}px ${MONO}`, segs: [{ t: panel.kicker.toUpperCase() }], gap: u * 7, accentAll: true });
  for (const line of panel.title) items.push({ font: `600 ${u * 8.6}px ${SANS}`, segs: line, gap: u * 9.4 });
  panel.body?.forEach((t, i) => items.push({ font: `500 ${u * 4}px ${SANS}`, segs: [{ t }], gap: u * (i ? 5.6 : 8) }));
  panel.rows?.forEach(([k, v], i) =>
    items.push({ font: `600 ${u * 3.4}px ${SANS}`, segs: [{ t: k }], gap: u * (i ? 5.2 : 7.6), col2: v, col2Font: `500 ${u * 3.4}px ${SANS}` }),
  );
  const pad = u * 7;
  const height = pad * 1.6 + items.reduce((h, it) => h + it.gap, 0);
  return { items, pad, height: Math.ceil(height), u };
}

function emFont(font: string) {
  const size = Number(font.match(/([\d.]+)px/)![1]);
  return `italic 500 ${size * 1.04}px ${SERIF}`;
}

/** Draw the text, calling `ink` for each run so the caller decides how it looks. */
function writeText(
  ctx: CanvasRenderingContext2D,
  panel: Panel,
  w: number,
  ink: (text: string, x: number, y: number, accent: boolean) => void,
) {
  const { items, pad, u } = layout(panel, w);
  let y = pad * 0.6;
  for (const it of items) {
    y += it.gap;
    let x = pad;
    for (const seg of it.segs) {
      ctx.font = seg.em ? emFont(it.font) : it.font;
      ink(seg.t, x, y, !!seg.em || !!it.accentAll || seg.t.startsWith("◐"));
      x += ctx.measureText(seg.t).width;
    }
    if (it.col2) {
      ctx.font = it.col2Font!;
      ink(it.col2, pad + u * 25, y, false);
    }
  }
}

export function inscriptionSize(panel: Panel, worldWidth: number) {
  const w = 1024;
  const { height } = layout(panel, w);
  return { w, h: height, worldHeight: (worldWidth * height) / w };
}

/** Plain granite, tiling, for the unpainted sides of boulders and the arch. */
export function graniteTexture(seed: number) {
  const size = 512;
  const colour = document.createElement("canvas");
  const bump = document.createElement("canvas");
  colour.width = bump.width = colour.height = bump.height = size;
  granite(colour.getContext("2d")!, bump.getContext("2d")!, size, size, seed);
  const { map, bumpMap } = textures(colour, bump);
  for (const t of [map, bumpMap]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return { map, bumpMap };
}

/**
 * Grey rock detail for the mountain's steep faces, centred on mid grey so the
 * terrain shader can multiply it in: mottling, flecks, joints and bedding
 * cracks with a lit lip. Drawn wrapped, so it tiles without a seam.
 */
export function cliffTexture(seed = 5) {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const c = canvas.getContext("2d")!;
  const random = rng(seed);
  const wrapped = (draw: (dx: number, dy: number) => void) => {
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) draw(dx, dy);
  };
  c.fillStyle = "#808080";
  c.fillRect(0, 0, size, size);
  // Broad mottling.
  for (let i = 0; i < 420; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const r = 10 + random() * 80;
    c.fillStyle = `rgba(${random() > 0.5 ? "255,255,255" : "0,0,0"},${0.03 + random() * 0.06})`;
    wrapped((dx, dy) => {
      c.beginPath();
      c.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      c.fill();
    });
  }
  // A jagged line: a crack, with a pale lip above it where light catches.
  const crack = (pts: [number, number][], width: number, dark: number) => {
    wrapped((dx, dy) => {
      c.lineJoin = "miter";
      c.beginPath();
      pts.forEach(([x, y], k) => (k ? c.lineTo(x + dx + 0.8, y + dy - 1.2) : c.moveTo(x + dx + 0.8, y + dy - 1.2)));
      c.strokeStyle = `rgba(255,255,255,${dark * 0.35})`;
      c.lineWidth = width * 0.8;
      c.stroke();
      c.beginPath();
      pts.forEach(([x, y], k) => (k ? c.lineTo(x + dx, y + dy) : c.moveTo(x + dx, y + dy)));
      c.strokeStyle = `rgba(20,18,16,${dark})`;
      c.lineWidth = width;
      c.stroke();
    });
  };
  // Bedding: long, gently wavy, roughly level cracks right across.
  for (let i = 0; i < 7; i += 1) {
    const y0 = (i + random() * 0.6) * (size / 7);
    const pts: [number, number][] = [];
    let y = y0;
    for (let x = 0; x <= size; x += 12) {
      y += (random() - 0.5) * 5 + (y0 - y) * 0.15;
      pts.push([x, y]);
    }
    crack(pts, 1.6 + random() * 1.8, 0.45 + random() * 0.3);
  }
  // Joints: shorter, steep, stepping cracks between the beds.
  for (let i = 0; i < 55; i += 1) {
    let x = random() * size;
    let y = random() * size;
    const lean = (random() - 0.5) * 0.9;
    const pts: [number, number][] = [[x, y]];
    const steps = 4 + Math.floor(random() * 10);
    for (let k = 0; k < steps; k += 1) {
      x += lean * 9 + (random() - 0.5) * 7;
      y += 6 + random() * 9;
      pts.push([x, y]);
    }
    crack(pts, 0.8 + random() * 1.6, 0.3 + random() * 0.35);
  }
  // Grain.
  for (let i = 0; i < 9000; i += 1) {
    c.fillStyle = random() > 0.5 ? "rgba(20,20,20,0.22)" : "rgba(255,255,255,0.2)";
    c.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  return map;
}

const PAINT = "#b3211c";
const PAINT_DARK = "#2b2725";

// Pale granite: grey, mottled, flecked, with a little lichen.
function granite(c: CanvasRenderingContext2D, b: CanvasRenderingContext2D, w: number, h: number, seed: number) {
  const random = rng(seed);
  c.fillStyle = "#a9a59e";
  c.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i += 1) {
    const r = 6 + random() * 70;
    c.fillStyle = `rgba(${random() > 0.5 ? "250,246,238" : "60,56,52"},${0.03 + random() * 0.05})`;
    c.beginPath();
    c.arc(random() * w, random() * h, r, 0, Math.PI * 2);
    c.fill();
  }
  for (let i = 0; i < 5000; i += 1) {
    c.fillStyle = random() > 0.5 ? "rgba(40,36,34,0.35)" : "rgba(255,255,255,0.35)";
    c.fillRect(random() * w, random() * h, 1 + random() * 2, 1 + random() * 2);
  }
  for (let i = 0; i < 26; i += 1) {
    c.fillStyle = `rgba(${170 + random() * 30},${160 + random() * 30},90,${0.1 + random() * 0.1})`;
    c.beginPath();
    c.arc(random() * w, random() * h, 8 + random() * 30, 0, Math.PI * 2);
    c.fill();
  }
  b.fillStyle = "#808080";
  b.fillRect(0, 0, w, h);
  for (let i = 0; i < 3000; i += 1) {
    b.fillStyle = `rgba(${random() > 0.5 ? "255,255,255" : "0,0,0"},${random() * 0.25})`;
    b.fillRect(random() * w, random() * h, 2 + random() * 6, 2 + random() * 6);
  }
}

// Hand paint: slightly soft edges, uneven coverage.
function paint(c: CanvasRenderingContext2D, b: CanvasRenderingContext2D, text: string, x: number, y: number, colour: string) {
  c.save();
  c.shadowColor = colour;
  c.shadowBlur = 2.5;
  c.fillStyle = colour;
  c.globalAlpha = 0.92;
  c.fillText(text, x, y);
  c.restore();
  b.save();
  b.font = c.font;
  b.textAlign = c.textAlign;
  b.fillStyle = "#c8c8c8";
  b.fillText(text, x, y);
  b.restore();
}

function textures(colour: HTMLCanvasElement, bump: HTMLCanvasElement) {
  const map = new THREE.CanvasTexture(colour);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.anisotropy = 8;
  return { map, bumpMap };
}

function wrap(c: CanvasRenderingContext2D, text: string, width: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Only the paint, on a clear ground, for laying over a boulder's own rock so
 * the stone shows between the letters and the words follow its surface.
 */
export function paintStoneLetters(panel: Panel) {
  const { w, h } = inscriptionSize(panel, 1);
  const k = 2;
  const colour = document.createElement("canvas");
  const bump = document.createElement("canvas");
  colour.width = bump.width = w * k;
  colour.height = bump.height = h * k;
  const c = colour.getContext("2d")!;
  const b = bump.getContext("2d")!;
  c.scale(k, k);
  b.scale(k, k);
  b.fillStyle = "#808080";
  b.fillRect(0, 0, w, h);
  writeText(c, panel, w, (text, x, y, isAccent) => paint(c, b, text, x, y, isAccent ? PAINT : PAINT_DARK));
  // Paint worn off where the rock is rough.
  const random = rng(w * 5 + h);
  c.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 2200; i += 1) {
    c.fillStyle = `rgba(0,0,0,${0.25 + random() * 0.55})`;
    c.fillRect(random() * w, random() * h, 0.8 + random() * 2.4, 0.8 + random() * 2.4);
  }
  return { ...textures(colour, bump), aspect: h / w };
}

/** Words traced in snow: only the grooves, their blue shadow and bright lip. */
export function paintSnow(panel: Panel, accent: string, drift = false) {
  const { w, h } = inscriptionSize(panel, 1);
  const k = 2;
  const colour = document.createElement("canvas");
  const bump = document.createElement("canvas");
  colour.width = bump.width = w * k;
  colour.height = bump.height = h * k;
  const c = colour.getContext("2d")!;
  const b = bump.getContext("2d")!;
  c.scale(k, k);
  b.scale(k, k);
  b.fillStyle = "#fff";
  b.fillRect(0, 0, w, h);
  if (drift) {
    // A bank of fresh snow lying on the slope: dense in the middle, thinning
    // to ragged, wind-cut edges where the slope shows through.
    const random = rng(w * 3 + h);
    const field = document.createElement("canvas");
    const fw = 96;
    const fh = Math.round((96 * h) / w);
    field.width = fw;
    field.height = fh;
    const f = field.getContext("2d")!;
    const img = f.createImageData(fw, fh);
    const noise = new Float32Array(fw * fh).map(() => random());
    for (let y = 0; y < fh; y += 1)
      for (let x = 0; x < fw; x += 1) {
        // Smooth the noise a little, then shape it to an oval falloff.
        let n = 0;
        let count = 0;
        for (let dy = -2; dy <= 2; dy += 1)
          for (let dx = -2; dx <= 2; dx += 1) {
            const xx = Math.min(fw - 1, Math.max(0, x + dx));
            const yy = Math.min(fh - 1, Math.max(0, y + dy));
            n += noise[yy * fw + xx];
            count += 1;
          }
        n /= count;
        const ex = (x / (fw - 1)) * 2 - 1;
        const ey = (y / (fh - 1)) * 2 - 1;
        const r = Math.hypot(ex * 0.98, ey * 1.05);
        const a = Math.min(1, Math.max(0, (1.08 - r) * 3.2 + (n - 0.5) * 2.4));
        const o = (y * fw + x) * 4;
        img.data[o] = 244;
        img.data[o + 1] = 247;
        img.data[o + 2] = 252;
        img.data[o + 3] = Math.round(a * 248);
      }
    f.putImageData(img, 0, 0);
    c.imageSmoothingEnabled = true;
    c.drawImage(field, 0, 0, w, h);
    // Sastrugi: faint wind ridges across the drift.
    c.save();
    c.globalCompositeOperation = "source-atop";
    for (let i = 0; i < 60; i += 1) {
      const y = random() * h;
      c.strokeStyle = `rgba(150,170,205,${0.05 + random() * 0.08})`;
      c.lineWidth = 1 + random() * 2.5;
      c.beginPath();
      c.moveTo(random() * w * 0.3, y);
      c.bezierCurveTo(w * 0.35, y + (random() - 0.5) * 20, w * 0.65, y + (random() - 0.5) * 20, w * (0.7 + random() * 0.3), y + (random() - 0.5) * 14);
      c.stroke();
    }
    c.restore();
  }
  // Letters pressed into firm snow: the upper wall of each groove falls into
  // blue shadow, the lower lip catches the sun, the floor is packed and pale.
  writeText(c, panel, w, (text, x, y, isAccent) => {
    c.save();
    c.fillStyle = "rgba(38,58,112,0.85)";
    c.fillText(text, x - 0.9, y - 1.6);
    c.fillStyle = "rgba(255,255,255,0.95)";
    c.fillText(text, x + 0.8, y + 1.4);
    c.fillStyle = isAccent ? accent : "rgba(92,116,168,0.95)";
    c.fillText(text, x, y);
    c.fillStyle = "rgba(255,255,255,0.18)";
    c.fillText(text, x + 0.3, y + 0.5);
    c.restore();
  });
  // A dusting of spindrift settled in the grooves.
  const random = rng(w + h);
  c.globalCompositeOperation = "source-atop";
  for (let i = 0; i < w * h * 0.01; i += 1) {
    c.fillStyle = `rgba(255,255,255,${0.2 + random() * 0.4})`;
    c.fillRect(random() * w, random() * h, 0.6 + random() * 1.4, 0.6 + random() * 1.4);
  }
  c.globalCompositeOperation = "source-over";
  b.filter = "blur(1.2px)";
  writeText(b, panel, w, (text, x, y) => {
    b.fillStyle = "#000";
    b.fillText(text, x, y);
  });
  return { ...textures(colour, bump), aspect: h / w };
}

/**
 * An arch's face. Shape coordinates are in world units with the gap centred
 * at the bottom: the title is painted across the top, the details down the
 * pillars either side of the gap.
 */
export function paintArch(panel: Panel, size: { width: number; height: number; holeWidth: number; holeHeight: number }) {
  const w = 1400;
  const ppu = w / size.width;
  const h = Math.round(size.height * ppu);
  const colour = document.createElement("canvas");
  const bump = document.createElement("canvas");
  colour.width = bump.width = w;
  colour.height = bump.height = h;
  const c = colour.getContext("2d")!;
  const b = bump.getContext("2d")!;
  granite(c, b, w, h, Math.round(panel.kicker.length * 97));

  const u = w / 100;
  const cx = w / 2;
  c.textAlign = "center";
  c.textBaseline = "alphabetic";

  // Across the top, centred over the gap.
  let y = u * 9.5;
  c.font = `700 ${u * 2.6}px ${MONO}`;
  paint(c, b, panel.kicker.toUpperCase(), cx, y, PAINT_DARK);
  for (const line of panel.title) {
    y += u * 7.6;
    const font = (seg: Seg) => (seg.em ? `italic 600 ${u * 7.4}px ${SERIF}` : `800 ${u * 7}px ${SANS}`);
    let total = 0;
    for (const seg of line) {
      c.font = font(seg);
      total += c.measureText(seg.t).width;
    }
    let x = cx - total / 2;
    c.textAlign = "left";
    for (const seg of line) {
      c.font = font(seg);
      paint(c, b, seg.t, x, y, PAINT);
      x += c.measureText(seg.t).width;
    }
    c.textAlign = "center";
  }
  if (panel.body?.length) {
    c.font = `600 ${u * 2.9}px ${SANS}`;
    for (const line of panel.body) {
      y += u * 4.4;
      paint(c, b, line, cx, y, PAINT_DARK);
    }
  }

  // Down the pillars: half the rows each side of the gap.
  const rows = panel.rows ?? [];
  const gapLeft = (size.width - size.holeWidth) / 2 * ppu;
  const pillarWidth = gapLeft - u * 9;
  const top = h - (size.holeHeight + 0.15) * ppu;
  const half = Math.ceil(rows.length / 2);
  [rows.slice(0, half), rows.slice(half)].forEach((list, side) => {
    const x = side === 0 ? u * 7 : w - gapLeft + u * 2.5;
    let ry = top;
    c.textAlign = "left";
    for (const [label, value] of list) {
      c.font = `800 ${u * 2.9}px ${SANS}`;
      ry += u * 3.6;
      paint(c, b, label, x, ry, PAINT);
      c.font = `600 ${u * 2.3}px ${SANS}`;
      for (const line of wrap(c, value, pillarWidth)) {
        ry += u * 2.9;
        paint(c, b, line, x, ry, PAINT_DARK);
      }
      ry += u * 1.4;
    }
  });

  return textures(colour, bump);
}

/**
 * Paint straight onto the mountain's rock: only the letters, hand-painted,
 * with a little grit knocked out of them where the rock is rough.
 */
export function paintOnRock(panel: Panel, colour: string, accent: string) {
  const { w, h } = inscriptionSize(panel, 1);
  const k = 1;
  const canvas = document.createElement("canvas");
  canvas.width = w * k;
  canvas.height = h * k;
  const c = canvas.getContext("2d")!;
  c.scale(k, k);
  writeText(c, panel, w, (text, x, y, isAccent) => {
    c.save();
    c.shadowColor = "rgba(0,0,0,0.45)";
    c.shadowBlur = 3;
    c.shadowOffsetY = 1.5;
    c.fillStyle = isAccent ? accent : colour;
    c.globalAlpha = 0.94;
    c.fillText(text, x, y);
    c.restore();
  });
  // Weathering: specks where the paint has worn off the rock.
  const random = rng(w * 7 + h);
  c.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 2600; i += 1) {
    c.fillStyle = `rgba(0,0,0,${0.3 + random() * 0.6})`;
    c.fillRect(random() * w, random() * h, 1 + random() * 3, 1 + random() * 3);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return { map, aspect: h / w };
}

/*
 * Words whitewashed across a far rock face, the way slogans and names are
 * painted big on cliffs above the trails: a heavy slab face, a red brushed
 * rule, a red stroke between the columns, and paint worn thin enough that
 * the rock's grain shows through every letter.
 */
const SLAB = "Rockwell, 'Roboto Slab', 'Clarendon', 'Superclarendon', Georgia, serif";
const FAR_RED = "#c43a2c";

function farLayout(panel: Panel, w: number) {
  const u = w / 100;
  const pad = u * 6;
  let y = pad + u * 3.2;
  const kickerY = y;
  y += u * 11.5;
  const titleYs = panel.title.map((_, i) => y + i * u * 10.6);
  y = titleYs[titleYs.length - 1] + u * 5.5;
  const ruleY = y;
  y += u * 2;
  const bodyYs = (panel.body ?? []).map((_, i) => (y += u * (i ? 6 : 7.2)));
  const rowYs = (panel.rows ?? []).map((_, i) => (y += u * (i ? 5.6 : 7.4)));
  return { u, pad, kickerY, titleYs, ruleY, bodyYs, rowYs, height: Math.ceil(y + pad * 1.1) };
}

export function farSize(panel: Panel) {
  const w = 1024;
  return { w, h: farLayout(panel, w).height };
}

/** A stroke laid on with a loaded brush: wobbling, thinning, a little dry at the end. */
function brush(c: CanvasRenderingContext2D, random: () => number, x0: number, y0: number, x1: number, y1: number, width: number) {
  const n = 28;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = -(y1 - y0) / len;
  const ny = (x1 - x0) / len;
  let wob = 0;
  for (let i = 0; i < n; i += 1) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    wob += (random() - 0.5) * width * 0.35;
    wob *= 0.8;
    c.lineWidth = width * (0.75 + random() * 0.4) * (t1 > 0.85 ? 0.75 : 1);
    c.beginPath();
    c.moveTo(x0 + (x1 - x0) * t0 + nx * wob, y0 + (y1 - y0) * t0 + ny * wob);
    c.lineTo(x0 + (x1 - x0) * t1 + nx * wob, y0 + (y1 - y0) * t1 + ny * wob);
    c.stroke();
  }
}

/**
 * With `snow`, the same layout is written in snow instead: each letter is
 * packed snow standing a little proud of the slope, bright on top, with a
 * soft blue shadow below it and a few ice crystals catching the light.
 */
export function paintFar(panel: Panel, colour: string, accent: string, snow = false) {
  const { w, h } = farSize(panel);
  const k = 2; // twice the resolution: it is read from across a valley
  const canvas = document.createElement("canvas");
  canvas.width = w * k;
  canvas.height = h * k;
  const c = canvas.getContext("2d")!;
  c.scale(k, k);
  const L = farLayout(panel, w);
  const { u, pad } = L;
  const random = rng(w * 13 + h * 3);
  const red = accent;

  // Each run is painted into its cut: a shadowed upper lip, a lit lower lip, then paint.
  const ink = (draw: (dx: number, dy: number) => void, fill: string) => {
    if (snow) {
      c.save();
      c.filter = "blur(2.2px)";
      c.fillStyle = c.strokeStyle = "rgba(48,66,112,0.55)";
      draw(1.8, 2.8);
      c.filter = "none";
      c.fillStyle = c.strokeStyle = "rgba(150,170,210,0.9)";
      draw(0.6, 1);
      c.fillStyle = c.strokeStyle = fill;
      draw(0, 0);
      c.fillStyle = c.strokeStyle = "rgba(255,255,255,0.7)";
      draw(-0.5, -0.7);
      c.fillStyle = c.strokeStyle = fill;
      draw(-0.2, -0.2);
      c.restore();
      return;
    }
    c.save();
    c.fillStyle = c.strokeStyle = "rgba(14,9,6,0.55)";
    draw(-0.9, -1.3);
    c.fillStyle = c.strokeStyle = "rgba(255,244,226,0.18)";
    draw(0.7, 1.1);
    c.fillStyle = c.strokeStyle = fill;
    draw(0, 0);
    c.restore();
  };
  const text = (t: string, x: number, y: number, font: string, fill: string, spacing = 0) => {
    c.font = font;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${spacing}px`;
    ink((dx, dy) => c.fillText(t, x + dx, y + dy), fill);
    const width = c.measureText(t).width;
    (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
    return width;
  };

  text(panel.kicker.toUpperCase(), pad, L.kickerY, `700 ${u * 3.3}px ${MONO}`, colour, u * 0.35);

  const titleFont = snow ? `800 ${u * 9.4}px ${SANS}` : `italic 800 ${u * 9.6}px ${SLAB}`;
  const emFontFar = `italic 700 ${u * 10}px ${SERIF}`;
  let accentSpan: [number, number] | null = null;
  panel.title.forEach((line, i) => {
    let x = pad;
    for (const seg of line) {
      const width = text(seg.t, x, L.titleYs[i], seg.em ? emFontFar : titleFont, seg.em ? red : colour);
      if (seg.em) accentSpan = [x, x + width];
      x += width;
    }
  });

  // The rule under the title, broken where the red word's tail comes down.
  const ruleEnd = w - pad * 1.2;
  c.lineCap = "round";
  ink((dx, dy) => {
    const gap = accentSpan as [number, number] | null;
    const r = rng(77);
    if (gap) {
      brush(c, r, pad + dx, L.ruleY + dy, gap[0] + u * 1.5 + dx, L.ruleY + dy + u * 0.2, u * 0.9);
      brush(c, r, gap[1] + u * 1.5 + dx, L.ruleY + dy - u * 0.1, ruleEnd + dx, L.ruleY + dy + u * 0.15, u * 0.9);
    } else brush(c, r, pad + dx, L.ruleY + dy, ruleEnd + dx, L.ruleY + dy, u * 0.9);
  }, red);

  // Body lines at one size, small enough that the longest still fits.
  let bodySize = u * 4.6;
  for (const t of panel.body ?? []) {
    c.font = `700 ${bodySize}px ${SANS}`;
    const room = w - pad * 2;
    const width = c.measureText(t).width;
    if (width > room) bodySize *= room / width;
  }
  panel.body?.forEach((t, i) => text(t, pad, L.bodyYs[i], `700 ${bodySize}px ${SANS}`, colour));

  if (panel.rows?.length) {
    const col = pad + u * 31;
    panel.rows.forEach(([key, value], i) => {
      text(key, pad + u * 1.5, L.rowYs[i], `700 ${u * 4.1}px ${SANS}`, colour);
      text(value, col + u * 3.5, L.rowYs[i], `600 ${u * 4.1}px ${SANS}`, colour);
    });
    const top = L.rowYs[0] - u * 5;
    const bottom = L.rowYs[L.rowYs.length - 1] + u * 2.2;
    ink((dx, dy) => brush(c, rng(91), col + dx, top + dy, col + dx + u * 0.2, bottom + dy, u * 0.75), red);
  }

  if (snow) {
    // Ice crystals glinting on the snow letters.
    c.save();
    c.globalCompositeOperation = "source-atop";
    for (let i = 0; i < w * h * 0.004; i += 1) {
      c.fillStyle = `rgba(255,255,255,${0.5 + random() * 0.5})`;
      const r = 0.5 + random() * 1.1;
      c.fillRect(random() * w, random() * h, r, r);
    }
    for (let i = 0; i < w * h * 0.006; i += 1) {
      c.fillStyle = `rgba(120,140,190,${0.12 + random() * 0.2})`;
      c.fillRect(random() * w, random() * h, 0.6 + random(), 0.6 + random());
    }
    c.restore();
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return { map, aspect: h / w };
  }

  // Weather: the paint is thin, and the rock comes through it.
  c.save();
  c.globalCompositeOperation = "destination-out";
  const patches = document.createElement("canvas");
  patches.width = Math.ceil(w / 8);
  patches.height = Math.ceil(h / 8);
  const p = patches.getContext("2d")!;
  const img = p.createImageData(patches.width, patches.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = random();
    img.data[i + 3] = 25 + (v > 0.55 ? Math.round((v - 0.55) * 2.2 * 140) : 0);
  }
  p.putImageData(img, 0, 0);
  c.imageSmoothingEnabled = true;
  c.drawImage(patches, 0, 0, w, h);
  // Grain: the rock's pits, which never took paint.
  for (let i = 0; i < w * h * 0.03; i += 1) {
    c.fillStyle = `rgba(0,0,0,${0.3 + random() * 0.6})`;
    const r = 0.35 + random() * 1.2;
    c.fillRect(random() * w, random() * h, r, r * (0.5 + random()));
  }
  // Cracks in the face, running through paint and all.
  c.lineWidth = 0.8;
  c.strokeStyle = "rgba(0,0,0,0.85)";
  for (let i = 0; i < 18; i += 1) {
    let x = random() * w;
    let y = random() * h;
    c.beginPath();
    c.moveTo(x, y);
    for (let j = 0; j < 9; j += 1) {
      x += (random() - 0.35) * 20;
      y += (random() - 0.3) * 9;
      c.lineTo(x, y);
    }
    c.stroke();
  }
  c.restore();

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return { map, aspect: h / w };
}

export { FAR_RED };

/**
 * The summit banner: the last chapter printed on cream cotton, the way
 * expedition banners are, with a border, a hem, and the ink a touch faded.
 */
export function paintBanner(panel: Panel) {
  const w = 1024;
  const { h: textH } = inscriptionSize(panel, 1);
  const top = 70;
  const h = textH + top;
  const canvas = document.createElement("canvas");
  canvas.width = w * 2;
  canvas.height = h * 2;
  const c = canvas.getContext("2d")!;
  c.scale(2, 2);
  c.fillStyle = "#f2ead9";
  c.fillRect(0, 0, w, h);
  const fade = c.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, "rgba(0,0,0,0.05)");
  fade.addColorStop(1, "rgba(80,60,30,0.12)");
  c.fillStyle = fade;
  c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(0,0,0,0.03)";
  for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
  for (let x = 0; x < w; x += 3) c.fillRect(x, 0, 1, h);
  // Sleeve for the pole, and a printed double border.
  c.fillStyle = "rgba(0,0,0,0.12)";
  c.fillRect(0, 0, 34, h);
  c.strokeStyle = "#157a3c";
  c.lineWidth = 6;
  c.strokeRect(52, 26, w - 78, h - 52);
  c.lineWidth = 2;
  c.strokeRect(66, 40, w - 106, h - 80);
  c.save();
  c.translate(30, top - 50);
  writeText(c, panel, w, (text, x, y, isAccent) => {
    c.fillStyle = isAccent ? "#157a3c" : "#1d2430";
    c.fillText(text, x, y);
  });
  c.restore();
  const random = rng(31);
  c.globalCompositeOperation = "destination-out";
  // The fly end, frayed by the wind.
  c.beginPath();
  c.moveTo(w, 0);
  for (let y = 0; y <= h; y += 6) c.lineTo(w - 3 - random() * 8 - (random() > 0.95 ? 12 : 0), y);
  c.lineTo(w, h);
  c.closePath();
  c.fill();
  c.globalCompositeOperation = "source-over";
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { texture, aspect: h / w };
}

/**
 * A project's name block-printed on a prayer flag: cotton in one of the five
 * colours, a sleeve at the top where the rope runs through, a printed border,
 * ink a little faded, and a hem frayed by the wind.
 */
export function paintFlag(name: string, language: string | null, colour: string) {
  const W = 512;
  const H = 400;
  const canvas = document.createElement("canvas");
  canvas.width = W * 2;
  canvas.height = H * 2;
  const c = canvas.getContext("2d")!;
  c.scale(2, 2);
  const random = rng(name.length * 97 + (name.charCodeAt(0) || 0) + colour.charCodeAt(2) * 13);
  const pale = colour === "#f8fafc" || colour === "#facc15";
  const ink = pale ? "rgba(32,22,16,0.94)" : "rgba(255,252,244,0.97)";
  c.fillStyle = colour;
  c.fillRect(0, 0, W, H);
  // Cotton: a soft fade toward the hem, and a fine weave.
  const fade = c.createLinearGradient(0, 0, 0, H);
  fade.addColorStop(0, "rgba(0,0,0,0.06)");
  fade.addColorStop(0.5, "rgba(255,255,255,0.04)");
  fade.addColorStop(1, "rgba(0,0,0,0.1)");
  c.fillStyle = fade;
  c.fillRect(0, 0, W, H);
  c.fillStyle = "rgba(0,0,0,0.035)";
  for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
  for (let x = 0; x < W; x += 3) c.fillRect(x, 0, 1, H);
  // The sleeve the rope runs through.
  c.fillStyle = "rgba(0,0,0,0.16)";
  c.fillRect(0, 0, W, 30);
  c.fillStyle = "rgba(255,255,255,0.12)";
  c.fillRect(0, 30, W, 3);
  // Printed border.
  c.strokeStyle = ink;
  c.globalAlpha = 0.55;
  c.lineWidth = 4;
  c.strokeRect(22, 46, W - 44, H - 86);
  c.lineWidth = 1.5;
  c.strokeRect(32, 56, W - 64, H - 106);
  c.globalAlpha = 1;
  // Block-printed scripture in bands above and below, as on real lungta.
  c.fillStyle = ink;
  c.globalAlpha = name ? 0.16 : 0.28;
  for (const [y0, rows] of name ? [[68, 2], [H - 92, 2]] : [[70, 12]]) {
    for (let r = 0; r < rows; r += 1) {
      let x = 46;
      const y = y0 + r * 21;
      while (x < W - 60) {
        const len = 8 + random() * 26;
        c.fillRect(x, y, len, 5);
        c.fillRect(x + len * 0.3, y - 4, 2, 4);
        x += len + 5 + random() * 6;
      }
    }
  }
  c.globalAlpha = 1;
  if (name) {
    // The project, printed big enough to read from the trail. Long camelCase
    // names break onto two lines rather than shrinking to nothing.
    c.fillStyle = ink;
    c.textAlign = "center";
    const room = W - 96;
    const fit = (text: string, max: number) => {
      let size = max;
      c.font = `800 ${size}px ${SANS}`;
      while (c.measureText(text).width > room && size > 30) {
        size -= 2;
        c.font = `800 ${size}px ${SANS}`;
      }
      return size;
    };
    let lines = [name];
    if (fit(name, 78) < 56) {
      const parts = name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").split(" ");
      let best = [name];
      let score = Infinity;
      for (let k = 1; k < parts.length; k += 1) {
        const l1 = parts.slice(0, k).join("");
        const l2 = parts.slice(k).join("");
        c.font = `800 60px ${SANS}`;
        const d = Math.abs(c.measureText(l1).width - c.measureText(l2).width);
        if (d < score) { score = d; best = [l1, l2]; }
      }
      lines = best;
    }
    const size = Math.min(...lines.map((l) => fit(l, 78)));
    c.font = `800 ${size}px ${SANS}`;
    const mid = language ? 200 : 215;
    lines.forEach((l, i) => c.fillText(l, W / 2, mid + (i - (lines.length - 1) / 2) * size * 1.02 + size * 0.34));
    if (language) {
      c.font = `700 26px ${MONO}`;
      c.globalAlpha = 0.8;
      c.fillText(language.toUpperCase(), W / 2, mid + ((lines.length - 1) / 2) * size + size * 0.34 + 46);
      c.globalAlpha = 1;
    }
  }
  // A frayed hem.
  c.save();
  c.globalCompositeOperation = "destination-out";
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W; x += 6) c.lineTo(x, H - 3 - random() * 9 - (random() > 0.95 ? 14 : 0));
  c.lineTo(W, H);
  c.closePath();
  c.fill();
  c.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
