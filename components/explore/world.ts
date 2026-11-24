import { CatmullRomCurve3, Vector3 } from "three";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js";

/*
 * The explorable range: one analytic heightfield shared by the terrain mesh,
 * the trees, the beacons and the camera's ground clamp, so everything agrees
 * on where the ground is. One mountain is climbed: a trail runs up its south
 * ridge from base camp to the summit, and each camp on it holds part of the
 * portfolio.
 */

export const WORLD = 280; // world units, edge to edge
export const HALF = WORLD / 2;
export const WATER = 1.4;
/** Where the sun sits (by day): low in the south-west, at golden hour. */
export const SUN: [number, number, number] = [-150, 34, 70];

export type StationId = "projects" | "stack" | "about" | "contact";

export type Station = {
  id: StationId;
  name: string;
  nepali: string;
  /** How far along the trail the station sits (0 to 1); set from `height` once the trail is cut. */
  s: number;
  /** Fraction of the summit's height where the stop sits; base camp is placed by distance instead. */
  height?: number;
  color: string;
};

export type ExploreProject = {
  name: string;
  url: string;
  homepage: string | null;
  language: string | null;
  description: string | null;
  stars: number;
  forks: number;
};

export const STATIONS: Station[] = [
  { id: "about", name: "Base Camp", nepali: "आधार शिविर", s: 0.07, color: "#fcd34d" },
  { id: "stack", name: "Camp I", nepali: "पहिलो शिविर", s: 0, height: 0.24, color: "#7dd3fc" },
  { id: "projects", name: "Camp II", nepali: "दोस्रो शिविर", s: 0, height: 0.5, color: "#fda4af" },
  { id: "contact", name: "Summit", nepali: "शिखर", s: 1, color: "#86efac" },
];

/* ── Noise ──────────────────────────────────────────────────────────────── */

const perlin = new ImprovedNoise();
const noise = (x: number, z: number) => perlin.noise(x, z, 0.371) * 1.4; // ~[-1, 1]

function fbm(x: number, z: number, octaves = 5) {
  let sum = 0;
  let amp = 0.5;
  for (let i = 0; i < octaves; i += 1) {
    sum += amp * noise(x, z);
    const nx = 1.6 * x + 1.2 * z + 3.1;
    z = -1.2 * x + 1.6 * z + 1.7;
    x = nx;
    amp *= 0.5;
  }
  return sum;
}

// Sharp crests: what makes rock read as eroded ridges rather than blobs.
function ridged(x: number, z: number, octaves = 6) {
  let sum = 0;
  let amp = 0.5;
  let weight = 1;
  for (let i = 0; i < octaves; i += 1) {
    let n = 1 - Math.abs(noise(x, z));
    n *= n * weight;
    weight = Math.min(1, n * 1.6);
    sum += n * amp;
    const nx = 1.6 * x + 1.2 * z + 1.7;
    z = -1.2 * x + 1.6 * z + 9.2;
    x = nx;
    amp *= 0.5;
  }
  return sum;
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* ── Shape ──────────────────────────────────────────────────────────────── */

type Peak = { x: number; z: number; h: number; r: number; sharp: number; seed: number };

// A faceted summit: the radius wobbles with the bearing, so faces and arêtes
// form instead of a perfect cone.
function peak(x: number, z: number, p: Peak) {
  const dx = x - p.x;
  const dz = z - p.z;
  const d = Math.hypot(dx, dz);
  const a = Math.atan2(dz, dx);
  const facets = 1 + 0.28 * noise(Math.cos(a) * 1.8 + p.seed, Math.sin(a) * 1.8 + p.seed * 0.7);
  const t = Math.max(0, 1 - d / (p.r * facets));
  return p.h * Math.pow(t, p.sharp);
}

const PEAKS: Peak[] = [
  { x: 0, z: -58, h: 48, r: 66, sharp: 1.42, seed: 1 },
  { x: -18, z: -74, h: 36, r: 34, sharp: 1.4, seed: 2 },
  { x: 22, z: -80, h: 34, r: 30, sharp: 1.4, seed: 3 },
  { x: -72, z: -22, h: 31, r: 38, sharp: 1.5, seed: 4 },
  { x: -92, z: -52, h: 26, r: 36, sharp: 1.3, seed: 5 },
  { x: 98, z: 44, h: 24, r: 30, sharp: 1.5, seed: 6 },
  { x: 92, z: -40, h: 28, r: 34, sharp: 1.45, seed: 8 },
  { x: -60, z: 70, h: 14, r: 34, sharp: 1.3, seed: 7 },
];

function shape(x: number, z: number) {
  // Foothills and valleys everywhere.
  let h = 2.4 + 5 * (fbm(x * 0.018 + 4, z * 0.018 + 1) + 0.35);

  for (const p of PEAKS) h = Math.max(h, peak(x, z, p));

  // A wall of far peaks closes the horizon on every side.
  const edge = Math.max(Math.abs(x), Math.abs(z));
  h = Math.max(h, smoothstep(HALF * 0.62, HALF * 0.98, edge) * (16 + 30 * ridged(x * 0.02 + 7, z * 0.02 + 2, 5)));
  return h;
}

export const CAMP: [number, number] = [0, 8];

// The trail is cut into the mountain as a level bench, the way real paths
// are: within a metre or two of its line the ground takes the trail's own
// smooth, ever-rising height. It widens at each stop into a flat camp. It is
// built once the trail is laid out (see below); until then it is empty.
type Bench = { xs: Float32Array; zs: Float32Array; hs: Float32Array; widen: Float32Array; grid: Map<number, number[]> };
let BENCH: Bench | null = null;
const CELL = 5;
const cellKey = (i: number, j: number) => i * 4099 + j;

/** Distance to the trail's line, with its height and width there. */
export function nearTrail(x: number, z: number) {
  if (!BENCH) return null;
  const list = BENCH.grid.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (!list) return null;
  const { xs, zs, hs, widen } = BENCH;
  let best = Infinity;
  let h = 0;
  let w = 0;
  for (const i of list) {
    const vx = xs[i + 1] - xs[i];
    const vz = zs[i + 1] - zs[i];
    const len2 = vx * vx + vz * vz || 1;
    const t = Math.min(1, Math.max(0, ((x - xs[i]) * vx + (z - zs[i]) * vz) / len2));
    const d = Math.hypot(x - xs[i] - vx * t, z - zs[i] - vz * t);
    if (d < best) {
      best = d;
      h = hs[i] + (hs[i + 1] - hs[i]) * t;
      w = widen[i] + (widen[i + 1] - widen[i]) * t;
    }
  }
  return { d: best, h, w };
}

export function heightAt(x: number, z: number) {
  const h = baseHeight(x, z);
  const near = nearTrail(x, z);
  if (!near) return h;
  const inner = 1.3 + 3.4 * near.w;
  const blend = 1 - smoothstep(inner, inner + 3.2, near.d);
  return h + (near.h - h) * blend;
}

function baseHeight(x: number, z: number) {
  // A gentle warp, so ridgelines wander instead of running ruler-straight.
  const wx = x + 5 * noise(x * 0.03 + 3.1, z * 0.03);
  const wz = z + 5 * noise(x * 0.03, z * 0.03 + 7.7);
  const s = shape(wx, wz);

  // Erosion bites harder the higher the ground.
  const rock = smoothstep(6, 40, s);
  const detail = ridged(x * 0.05 + 4.1, z * 0.05 + 1.7) - 0.45;
  let h = s + detail * (1.2 + 7 * rock) + fbm(x * 0.2, z * 0.2, 3) * 0.5 * rock;

  // Base camp's lake: a basin in the valley below the camp.
  const lake = 1 - smoothstep(10, 24, Math.hypot(x - 40, z - 24));
  h = h * (1 - lake) + -2.5 * lake;

  // The camp itself sits on a flat shelf.
  const camp = 1 - smoothstep(5, 11, Math.hypot(x - CAMP[0], z - CAMP[1]));
  h = h * (1 - camp) + 4.2 * camp;
  return h;
}

/** Highest ground within r of (x, z): where a beacon should stand. */
export function summit(x: number, z: number, r = 6): [number, number, number] {
  let best: [number, number, number] = [x, heightAt(x, z), z];
  for (let dz = -r; dz <= r; dz += 1)
    for (let dx = -r; dx <= r; dx += 1) {
      const h = heightAt(x + dx, z + dz);
      if (h > best[1]) best = [x + dx, h, z + dz];
    }
  return best;
}

// Altitudes read in metres, scaled so the summit stands at 8,848 m.
const SAJILO_TOP = summit(0, -58)[1];
export const metres = (y: number) => Math.round(1300 + (y / SAJILO_TOP) * (8848 - 1300));

/* ── Places and shots ───────────────────────────────────────────────────── */

export type Vec3 = [number, number, number];

/* ── The climb ──────────────────────────────────────────────────────────── */

// The trail's line on the map: a spiral, a little over one turn around the
// mountain, so the climb stays gentle and the view keeps changing.
const TOP = summit(0, -58);
const TURNS = 1.18;
const TRAIL = new CatmullRomCurve3(
  Array.from({ length: 48 }, (_, i) => {
    const u = i / 47;
    const a = u * Math.PI * 2 * TURNS;
    const r = 66 * Math.pow(1 - u, 0.92);
    return new Vector3(TOP[0] + Math.sin(a) * r, 0, TOP[2] + Math.cos(a) * r);
  }),
  false,
  "centripetal",
);

const tmp = new Vector3();
export function trailPoint(s: number): Vec3 {
  TRAIL.getPointAt(Math.min(1, Math.max(0, s)), tmp);
  return [tmp.x, Math.max(heightAt(tmp.x, tmp.z), WATER), tmp.z];
}

// Cut the bench: sample the line, smooth its height, and never let it drop,
// so the trail climbs steadily however lumpy the slope beneath it is.
(() => {
  const n = 1400;
  const xs = new Float32Array(n);
  const zs = new Float32Array(n);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    TRAIL.getPointAt(i / (n - 1), tmp);
    xs[i] = tmp.x;
    zs[i] = tmp.z;
    raw[i] = Math.max(baseHeight(tmp.x, tmp.z), WATER + 0.5);
  }
  const hs = new Float32Array(n);
  const win = 30;
  for (let i = 0; i < n; i += 1) {
    let sum = 0;
    let count = 0;
    for (let k = Math.max(0, i - win); k <= Math.min(n - 1, i + win); k += 1) {
      sum += raw[k];
      count += 1;
    }
    hs[i] = sum / count;
  }
  hs[n - 1] = Math.max(hs[n - 1], TOP[1] - 1);
  // The last spiral runs into the peak's steep cone. Cap the grade, working
  // down from the summit, so the final climb is a long steady ledge rather
  // than a sudden ramp: where the slope would be steeper, the path is built up.
  const grade = 0.55;
  for (let i = n - 2; i >= 0; i -= 1) {
    const run = Math.hypot(xs[i + 1] - xs[i], zs[i + 1] - zs[i]);
    hs[i] = Math.max(hs[i], hs[i + 1] - grade * run);
  }

  // Camps sit at set altitudes, not set distances: the outer loops are long
  // and low, so spacing them by distance would leave the upper camps on grass.
  for (const station of STATIONS) {
    if (station.height === undefined) continue;
    const target = station.height * TOP[1];
    let i = 0;
    while (i < n - 1 && hs[i] < target) i += 1;
    station.s = i / (n - 1);
  }

  // Wider, flat ground at each stop and on to just past its marker.
  const widen = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const s = i / (n - 1);
    let w = 0;
    for (const station of STATIONS) w = Math.max(w, smoothstep(station.s - 0.012, station.s - 0.003, s) * (1 - smoothstep(station.s + 0.03, station.s + 0.042, s)));
    widen[i] = w;
  }
  widen[n - 1] = 1;

  const grid = new Map<number, number[]>();
  const reach = 9;
  for (let i = 0; i < n - 1; i += 1) {
    const x0 = Math.min(xs[i], xs[i + 1]) - reach;
    const x1 = Math.max(xs[i], xs[i + 1]) + reach;
    const z0 = Math.min(zs[i], zs[i + 1]) - reach;
    const z1 = Math.max(zs[i], zs[i + 1]) + reach;
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx += 1)
      for (let cz = Math.floor(z0 / CELL); cz <= Math.floor(z1 / CELL); cz += 1) {
        const key = cellKey(cx, cz);
        const list = grid.get(key);
        if (list) list.push(i);
        else grid.set(key, [i]);
      }
  }
  BENCH = { xs, zs, hs, widen, grid };
})();

/** Project flags: a row on the downhill edge of Camp II, beyond its writing. */
export type Chapter = { key: string; kind: "intro" } | { key: string; kind: "station"; id: StationId };
export type Shot = {
  pos: Vec3;
  target: Vec3;
  focus: number;
  /** The words in view: their middle, and how wide they are, in metres. */
  subject: Vec3;
  span: number;
};
export type Inscription = {
  kind: "arch" | "boulder" | "mani" | "snow" | "face" | "far" | "banner";
  /** For words thrown onto the ground: the sheet's width at the hit. */
  width?: number;
  center: Vec3;
  /** Unit, in the ground plane: from the text toward the reader. */
  facing: Vec3;
  eye: Vec3;
  /** Where the camera looks when stopped here. */
  look: Vec3;
};

export const CHAPTERS: Chapter[] = [
  { key: "intro", kind: "intro" },
  ...STATIONS.map((station) => ({ key: station.id, kind: "station" as const, id: station.id })),
];

const EYE = 1.8;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// The way ahead at s, and to the right of it.
function frame(s: number) {
  const a = trailPoint(Math.min(s, 0.985));
  const b = trailPoint(Math.min(s, 0.985) + 0.01);
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1;
  const fx = (b[0] - a[0]) / len;
  const fz = (b[2] - a[2]) / len;
  return { forward: [fx, 0, fz] as Vec3, right: [-fz, 0, fx] as Vec3 };
}

export function stopS(chapter: Chapter) {
  if (chapter.kind === "intro") return 0;
  const s = STATIONS.find((st) => st.id === chapter.id)!.s;
  // At Camp II the climber walks a few steps on, to stand square to the
  // whole of the rock wall the words are painted on.
  return chapter.id === "projects" ? sAhead(s, 6) : s;
}

// Where a climber's eyes are, standing on the trail at s. A small step bob
// is tied to the distance walked, so it only moves while climbing.
function eyeAt(s: number): Vec3 {
  const p = trailPoint(s);
  return [p[0], p[1] + EYE + Math.sin(s * 760) * 0.035, p[2]];
}

export const ARCH = { width: 9, height: 6.6, holeWidth: 4.1, holeHeight: 3.8, depth: 1.8 };

/** How big an inscription thrown onto the ground from `d` away is drawn. */
export const sheetWidth = (d: number) => (d > 14 ? d * 0.5 : Math.min(4.4, d * 0.85));
const SHEET_ASPECT = 0.72;
/** How wide words painted on a near wall are drawn. */
const WALL_SHEET = 5.4;

/**
 * Look for a patch of ground, seen from `eye`, that a sheet of words can be
 * thrown onto whole: its centre and all four corners must land on ground at
 * about the same distance, so no part of it hangs in the air or falls behind
 * a bump. Returns the best by `score` (lower is better).
 */
function findSurface(
  eye: Vec3,
  dirs: { dir: Vec3; bias: number }[],
  minD: number,
  maxD: number,
  ideal: number,
  size: (d: number) => number = sheetWidth,
  strict = false,
): Vec3 | null {
  let best: { hit: Vec3; score: number } | null = null;
  // A candidate scores at least its bias, so try them cheapest-bias first and
  // stop once none left can win; skip the costly whole-sheet check for any
  // that already can't. Same answer, a fraction of the rays.
  const order = dirs.map((d, i) => ({ ...d, i })).sort((a, b) => a.bias - b.bias || a.i - b.i);
  for (const { dir, bias } of order) {
    if (best && bias >= best.score) break;
    const hit = castToGround(eye, dir, maxD * 1.4);
    if (!hit) continue;
    const d = Math.hypot(hit[0] - eye[0], hit[1] - eye[1], hit[2] - eye[2]);
    if (d < minD || d > maxD) continue;
    if (best && Math.abs(d - ideal) + bias >= best.score) continue;
    // The sheet's own axes, square to the line of sight.
    const rx = -dir[2];
    const rz = dir[0];
    const rl = Math.hypot(rx, rz) || 1;
    const right: Vec3 = [rx / rl, 0, rz / rl];
    const up: Vec3 = [right[1] * dir[2] - right[2] * dir[1], right[2] * dir[0] - right[0] * dir[2], right[0] * dir[1] - right[1] * dir[0]];
    const w = size(d) / 2;
    const h = (size(d) * SHEET_ASPECT) / 2;
    // Check a grid across the whole sheet, not just its corners: every part
    // must land on one continuous surface at about the same distance.
    // `strict` is for a slope seen side-on: distance may change smoothly
    // across the sheet, but every point must land on it, with clear slope
    // above the top line so the skyline never cuts through the words.
    const lo = strict ? 0.4 : d > 14 ? 0.6 : 0.72;
    const hi = strict ? 2.8 : d > 14 ? 1.6 : 1.4;
    let whole = true;
    const grid: [number, number][] = [];
    const cols = strict ? [-1.1, -0.7, -0.35, 0, 0.35, 0.7, 1.1] : [-1, -0.5, 0, 0.5, 1];
    const rows = strict ? [-1.1, -0.5, 0, 0.5, 1.1, 1.5] : [-1, -0.33, 0.33, 1];
    for (const a of cols) for (const b of rows) grid.push([a, b]);
    for (const [a, b] of grid) {
      const c: Vec3 = [eye[0] + dir[0] * d + right[0] * a * w + up[0] * b * h, eye[1] + dir[1] * d + up[1] * b * h, eye[2] + dir[2] * d + right[2] * a * w + up[2] * b * h];
      const v: Vec3 = [c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]];
      const vl = Math.hypot(...v);
      const corner = castToGround(eye, [v[0] / vl, v[1] / vl, v[2] / vl], d * Math.max(2, hi * 1.05));
      const cd = corner ? Math.hypot(corner[0] - eye[0], corner[1] - eye[1], corner[2] - eye[2]) : Infinity;
      if (cd < d * lo || cd > d * hi) { whole = false; break; }
    }
    if (!whole) continue;
    const score = Math.abs(d - ideal) + bias;
    if (!best || score < best.score) best = { hit, score };
  }
  return best ? (best as { hit: Vec3 }).hit : null;
}

/** March a ray from `from` until it meets the ground; null if it never does. */
export function castToGround(from: Vec3, dir: Vec3, max: number): Vec3 | null {
  let prev = 0;
  // Stride by a fraction of the ray's clearance above the ground: long
  // steps through open air, short ones near the slope, never under 12 cm.
  for (let t = 0.2; t <= max; ) {
    const y = from[1] + dir[1] * t;
    const ground = heightAt(from[0] + dir[0] * t, from[2] + dir[2] * t);
    if (y < ground) {
      let lo = prev;
      let hi = t;
      for (let k = 0; k < 10; k += 1) {
        const mid = (lo + hi) / 2;
        if (from[1] + dir[1] * mid < heightAt(from[0] + dir[0] * mid, from[2] + dir[2] * mid)) hi = mid;
        else lo = mid;
      }
      return [from[0] + dir[0] * hi, from[1] + dir[1] * hi, from[2] + dir[2] * hi];
    }
    prev = t;
    t += Math.max(0.12, (y - ground) * 0.3);
  }
  return null;
}

/** The trail position a set horizontal distance ahead of s. */
function sAhead(s: number, distance: number) {
  const a = trailPoint(s);
  let t = s;
  for (let i = 0; i < 200 && t < 1; i += 1) {
    t += 0.002;
    const b = trailPoint(t);
    if (Math.hypot(b[0] - a[0], b[2] - a[2]) >= distance) break;
  }
  return Math.min(t, 1);
}

/**
 * Each stop's inscription. On the way up it is a rock arch over the trail,
 * painted like the boulders at base camps: the climber stops to read it,
 * then walks on through the gap. At the top it is the summit stone.
 */
const KINDS: Record<string, Inscription["kind"]> = {
  intro: "boulder",
  about: "arch",
  stack: "far",
  projects: "far",
  contact: "banner",
};

export function inscriptionFor(chapter: Chapter): Inscription {
  const s = stopS(chapter);
  const eye = eyeAt(s);
  const kind = KINDS[chapter.key];
  const toward = (x: number, z: number): Vec3 => {
    const d = Math.hypot(eye[0] - x, eye[2] - z) || 1;
    return [(eye[0] - x) / d, 0, (eye[2] - z) / d];
  };

  if (kind === "arch") {
    // Spans the trail square-on, so the path runs straight through the gap.
    const sa = sAhead(s, 6.5);
    const at = trailPoint(sa);
    const back = trailPoint(Math.max(0, sa - 0.012));
    const d = Math.hypot(back[0] - at[0], back[2] - at[2]) || 1;
    const facing: Vec3 = [(back[0] - at[0]) / d, 0, (back[2] - at[2]) / d];
    const center: Vec3 = [at[0], at[1] - 0.25, at[2]];
    return { kind, center, facing, eye, look: [at[0], center[1] + 3.8, at[2]] };
  }

  const { forward, right } = frame(Math.min(s, 0.94));
  const sl = Math.hypot(SUN[0], SUN[2]);

  if (kind === "banner") {
    // The summit: the flag stands straight ahead at the top of the trail, so
    // the climber sees it come up over the last rise and walks right to it.
    const before = trailPoint(Math.max(0, s - 0.03));
    const al = Math.hypot(eye[0] - before[0], eye[2] - before[2]) || 1;
    const [ox, oz] = [(eye[0] - before[0]) / al, (eye[2] - before[2]) / al];
    const lx = oz;
    const lz = -ox;
    let bx = eye[0] + ox * 4.4;
    let bz = eye[2] + oz * 4.4;
    for (const a of [4.4, 4, 4.8, 3.6])
      for (const side of [0, 0.5, -0.5, 1, -1]) {
        const x = eye[0] + ox * a + lx * side;
        const z = eye[2] + oz * a + lz * side;
        if (heightAt(x, z) > heightAt(bx, bz) + 0.05) { bx = x; bz = z; }
      }
    // `center` is the middle of the flying cloth, a little above eye level.
    const ground = heightAt(bx, bz);
    const center: Vec3 = [bx, Math.max(ground + 2.6, eye[1] + 0.35), bz];
    // Aim a little below the flag, so it flies in the upper part of the frame
    // with the rest of the range spread out below the summit behind it.
    return { kind, center, facing: toward(bx, bz), eye, look: [bx, center[1] - 1.1, bz] };
  }

  const dirs = (turns: number[], pitches: number[], sides: number[], bias: (turn: number, pitch: number, side: number, dx: number, dz: number) => number) => {
    const out: { dir: Vec3; bias: number }[] = [];
    for (const side of sides)
      for (const turn of turns)
        for (const pitch of pitches) {
          let fx = forward[0];
          let fz = forward[2];
          if (chapter.key === "contact") {
            // On the summit, face out over the valley the climb started from.
            const d = Math.hypot(CAMP[0] - eye[0], CAMP[1] - eye[2]) || 1;
            fx = (CAMP[0] - eye[0]) / d;
            fz = (CAMP[1] - eye[2]) / d;
          }
          const rx = -fz;
          const rz = fx;
          const dx = fx * Math.cos(turn) + rx * side * Math.sin(turn);
          const dz = fz * Math.cos(turn) + rz * side * Math.sin(turn);
          out.push({ dir: [dx * Math.cos(pitch), Math.sin(pitch), dz * Math.cos(pitch)], bias: bias(turn, pitch, side, dx, dz) });
        }
    return out;
  };

  if (kind === "snow") {
    // Words traced in the snow, looked down on. Camp II takes whichever way
    // faces furthest from the low sun, so the climber isn't reading into glare.
    const sunAway = chapter.key === "projects";
    const hit = findSurface(
      eye,
      dirs([0, 0.35, 0.7, 1.05], [-0.32, -0.42, -0.52, -0.24], [1, -1], (turn, _p, _s, dx, dz) =>
        sunAway ? ((dx * SUN[0] + dz * SUN[2]) / sl) * 3 : turn * 2),
      2.6,
      6.5,
      4,
    ) ?? [eye[0] + forward[0] * 3.8, heightAt(eye[0] + forward[0] * 3.8, eye[2] + forward[2] * 3.8), eye[2] + forward[2] * 3.8];
    return { kind, center: hit, facing: toward(hit[0], hit[2]), eye, look: hit };
  }

  if (kind === "far" && chapter.key === "projects") {
    // Camp II: turn left, to the wall of rock the camp is cut into.
    const turns = Array.from({ length: 14 }, (_, k) => 0.5 + k * 0.1);
    const wall = (d: number) => Math.min(WALL_SHEET, d * 0.85);
    const hit = findSurface(
      eye,
      dirs(turns, [0.3, 0.2, 0.14, 0.08, 0.02], [-1], (turn, pitch) => Math.abs(turn - 1.3) * 6 + Math.abs(pitch - 0.14) * 6),
      4,
      14,
      6.5,
      wall,
    );
    if (hit) {
      const d = Math.hypot(hit[0] - eye[0], hit[1] - eye[1], hit[2] - eye[2]);
      // Look a little below the words, so the prayer flags strung under them are in view too.
      return { kind, center: hit, facing: toward(hit[0], hit[2]), eye, look: [hit[0], hit[1] - 0.95, hit[2]], width: wall(d) };
    }
  }

  if (kind === "far") {
    // Turn right, across the gulf, and the words are written large on the
    // next mountain's face.
    // Well round to the right, where the far slopes are broad and plain.
    const turns = Array.from({ length: 24 }, (_, k) => 0.3 + k * 0.1);
    const pitches = [0.02, 0.08, 0.14, 0.2, 0.27, 0.34, -0.04, -0.09, -0.14, -0.2];
    const aim = 1.7;
    const score = (turn: number, pitch: number) => Math.abs(turn - aim) * 20 + Math.abs(pitch) * 10;
    const ideal = 50;
    const hit =
      findSurface(eye, dirs(turns, [...pitches, -0.28], [1], score), 15, 220, ideal) ??
      findSurface(eye, dirs(turns, pitches, [-1], (t, p) => score(t, p) + 40), 15, 220, ideal);
    if (hit) {
      const d = Math.hypot(hit[0] - eye[0], hit[1] - eye[1], hit[2] - eye[2]);
      return { kind, center: hit, facing: toward(hit[0], hit[2]), eye, look: hit, width: sheetWidth(d) };
    }
  }

  if (kind === "face" || kind === "far") {
    // Paint on the mountain itself: a stretch of rock beside the trail,
    // standing up toward the climber, on whichever side rises.
    const uphill = heightAt(eye[0] + right[0] * 4, eye[2] + right[2] * 4) > heightAt(eye[0] - right[0] * 4, eye[2] - right[2] * 4) ? 1 : -1;
    const turns = Array.from({ length: 10 }, (_, k) => 0.45 + k * 0.13);
    const hit = findSurface(
      eye,
      dirs(turns, [0.3, 0.18, 0.08, -0.02, -0.12], [uphill, -uphill], (_t, pitch, side) => -pitch * 4 + (side === uphill ? 0 : 2)),
      3,
      9,
      5,
    );
    if (hit) return { kind: "face", center: hit, facing: toward(hit[0], hit[2]), eye, look: hit };
    // Nothing standing near enough: write in the ground ahead instead.
    const ground = findSurface(eye, dirs([0, 0.35, 0.7], [-0.3, -0.4, -0.5], [1, -1], (t) => t * 2), 2.6, 6.5, 4);
    const g = ground ?? [eye[0] + forward[0] * 3.8, heightAt(eye[0] + forward[0] * 3.8, eye[2] + forward[2] * 3.8), eye[2] + forward[2] * 3.8];
    return { kind: "snow", center: g, facing: toward(g[0], g[2]), eye, look: g };
  }

  // Stones rest on the uphill side of the trail, leaning into the slope.
  const ahead = 3.6;
  const probe = (k: number) => heightAt(eye[0] + forward[0] * ahead + right[0] * k, eye[2] + forward[2] * ahead + right[2] * k);
  // On the uphill edge of the camp's flat ground, so it never hangs over a drop.
  const side = probe(1.9) >= probe(-1.9) ? 1.9 : -1.9;
  const x = eye[0] + forward[0] * ahead + right[0] * side;
  const z = eye[2] + forward[2] * ahead + right[2] * side;
  const facing = toward(x, z);
  let ground = -Infinity;
  for (const k of [-1.4, 0, 1.4]) ground = Math.max(ground, heightAt(x - facing[2] * k, z + facing[0] * k));
  const center: Vec3 = [x, ground + 0.75, z];
  return { kind, center, facing, eye, look: [x, center[1] + (chapter.kind === "intro" ? 0.35 : 0.4), z] };
}

/** From the summit: the level direction out over the valley the climb began in. */
export function summitOutlook(eye: Vec3): [number, number] {
  const d = Math.hypot(CAMP[0] - eye[0], CAMP[1] - eye[2]) || 1;
  return [(CAMP[0] - eye[0]) / d, (CAMP[1] - eye[2]) / d];
}

const INSCRIPTIONS = CHAPTERS.map(inscriptionFor);
export const inscriptions = () => INSCRIPTIONS;

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The camera at a point in the climb, in chapters. Each leg is choreographed:
 * look at the inscription, pan back up the trail, climb to the next stop,
 * then turn to read what is written there.
 */
export function cameraAt(progress: number): Shot {
  const last = CHAPTERS.length - 1;
  const p = Math.min(last, Math.max(0, progress));
  const i = Math.min(last - 1, Math.floor(p));
  const t = p - i;
  const from = INSCRIPTIONS[i];
  const to = INSCRIPTIONS[i + 1];

  // Mostly linear, so every bit of scroll moves the climber, easing only a
  // little into and out of each stop rather than standing still there.
  const move = lerp(t, smooth(0, 1, t), 0.45);
  // The last leg ends at the summit flag: turn onto it gradually while climbing.
  const finale = i + 1 === last;
  const s = lerp(stopS(CHAPTERS[i]), stopS(CHAPTERS[i + 1]), move);
  const pos = eyeAt(s);
  // Look the way the trail is heading, as a walker does, rising with it.
  // Not at a fixed point further along: where the path curls round a slope,
  // the straight line to that point runs through the hillside.
  const here = trailPoint(s);
  const next = trailPoint(Math.min(1, s + 0.01));
  const run = Math.hypot(next[0] - here[0], next[2] - here[2]) || 1;
  const climb = (next[1] - here[1]) / run;
  const reachAhead = 9.4;
  const ahead: Vec3 = [
    pos[0] + ((next[0] - here[0]) / run) * reachAhead,
    here[1] + climb * reachAhead * 0.5,
    pos[2] + ((next[2] - here[2]) / run) * reachAhead,
  ];
  let target: Vec3 = [ahead[0], ahead[1] + EYE * 1.1, ahead[2]];
  // Leaving Camp II, turn off the wall and onto the path within a few steps.
  let out = finale ? 1 - smooth(0.01, 0.1, t) : 1 - smooth(0.04, 0.3, t);
  if (from.kind === "arch") {
    // Walking on through the arch: let go of it as the climber reaches it,
    // so the view turns to the trail ahead instead of back at the arch.
    const fx = ahead[0] - pos[0];
    const fz = ahead[2] - pos[2];
    const lx = from.center[0] - pos[0];
    const lz = from.center[2] - pos[2];
    const along = (fx * lx + fz * lz) / ((Math.hypot(fx, fz) || 1) * (Math.hypot(lx, lz) || 1));
    // And by distance, so the gaze has come level before it is under the arch.
    out *= smooth(0.55, 0.95, along) * smooth(3, 6.2, Math.hypot(lx, lz));
  }
  const into = finale ? smooth(0.35, 0.95, t) : smooth(0.72, 1, t);
  target = lerp3(target, from.look, out);
  target = lerp3(target, to.look, into);
  const main = out >= into ? from : to;
  return { pos, target, focus: Math.max(out, into), subject: main.center, span: spanOf(main) };
}

/** How wide an inscription is, edge to edge, for fitting it on screen. */
function spanOf(at: Inscription) {
  if (at.kind === "arch") return ARCH.width + 0.6;
  if (at.kind === "boulder" || at.kind === "mani") return 4.4;
  if (at.kind === "banner") return 3.4;
  const d = Math.hypot(at.center[0] - at.eye[0], at.center[1] - at.eye[1], at.center[2] - at.eye[2]);
  return (at.width ?? sheetWidth(d)) * 1.15;
}

export const STOP_SHOTS: Shot[] = CHAPTERS.map((_, i) => cameraAt(i));

/** How far the climber walks on each leg, stop to stop, in metres. */
export const LEG_METRES: number[] = CHAPTERS.slice(0, -1).map((c, i) => {
  const a = stopS(c);
  const b = stopS(CHAPTERS[i + 1]);
  let total = 0;
  let prev = trailPoint(a);
  for (let k = 1; k <= 60; k += 1) {
    const p = trailPoint(a + ((b - a) * k) / 60);
    total += Math.hypot(p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]);
    prev = p;
  }
  return total;
});

/** Seeded random numbers, so trees grow in the same places every visit. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LANGUAGE_COLORS: Record<string, string> = {
  "C++": "#f34b7d",
  C: "#8d9bb0",
  Python: "#4b8bbe",
  Swift: "#f05138",
  TypeScript: "#3178c6",
  JavaScript: "#e9d44c",
  Rust: "#dea584",
  Go: "#00add8",
  Kotlin: "#a97bff",
  Dart: "#00b4ab",
  Java: "#b07219",
};
