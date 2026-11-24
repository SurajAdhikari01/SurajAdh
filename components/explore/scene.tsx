"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, PerformanceMonitor, Sky, Stars } from "@react-three/drei";
import * as THREE from "three";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  ARCH,
  CHAPTERS,
  STOP_SHOTS,
  SKY_SUN,
  SUN,
  WATER,
  WORLD,
  HALF,
  cameraAt,
  heightAt,
  castToGround,
  sheetWidth,
  inscriptions,
  nearTrail,
  metres,
  rng,
  trailPoint,
} from "./world";
import type { Chapter, ExploreProject, Inscription, Shot } from "./world";
import { panelFor } from "./content";
import { FAR_RED, farSize, graniteTexture, cliffTexture, inscriptionSize, paintArch, paintBanner, paintFar, paintFlag, paintOnRock, paintSnow, paintStoneLetters } from "./painter";

type Props = {
  projects: ExploreProject[];
  /** Scroll position in chapters: 0 = intro, 1.5 = halfway to the third. */
  progress: RefObject<number>;
  active: number;
  night: boolean;
  reducedMotion: boolean;
  altitude: RefObject<HTMLElement | null>;
  /** Where the camera actually is, in chapters; it trails the scroll. */
  playhead: RefObject<number>;
  onReady: () => void;
  /** The element pointer events come from: the page sits over the canvas. */
  eventRoot?: RefObject<HTMLElement | null>;
};

// The ground is sampled on one fine grid, then cut into chunks that each
// draw at full, half or quarter detail by distance, the way game terrain is.
const GRID = 416;
const CHUNKS = 8;
const CELLS = GRID / CHUNKS;
const LOD_STEPS = [1, 2, 4];
const LOD_FROM = [0, 95, 190];
const SKIRT = 4;

// Rock weathering that depends only on position, so the corners that
// triangles share move together and the surface never tears.
const rockNoise = new ImprovedNoise();
function weather(v: THREE.Vector3, amount: number, seed: number) {
  const f = 1.4;
  v.x += rockNoise.noise(v.x * f + seed, v.y * f, v.z * f) * amount;
  v.y += rockNoise.noise(v.x * f, v.y * f + seed, v.z * f + 3.3) * amount;
  v.z += rockNoise.noise(v.x * f + 7.1, v.y * f, v.z * f + seed) * amount * 1.4;
}

/* ── Terrain ────────────────────────────────────────────────────────────── */

const ROCK_DETAIL = /* glsl */ `
uniform sampler2D xpRock;
// Real rock detail for steep faces: cracks, joints, grain, laid from the side
// at two scales so the repeat never shows. Up close the fine scale softens,
// so its grain never shows as squares. Returns (shade, relief height).
// Read the rock, never sharper than minLod: up close its texels would
// otherwise blow up into squares.
float xpRockAt(vec2 uv, float minLod) {
  vec2 dx = dFdx(uv) * 512.0;
  vec2 dy = dFdy(uv) * 512.0;
  float lod = 0.5 * log2(max(max(dot(dx, dx), dot(dy, dy)), 1e-8));
  return textureLod(xpRock, uv, max(lod, minLod)).r;
}
vec2 xpRockDetail(vec3 p, vec3 n, float dist) {
  vec3 tw = pow(abs(n), vec3(4.0));
  vec2 sw = vec2(tw.x, tw.z) / max(tw.x + tw.z, 1e-3);
  float near = smoothstep(6.0, 30.0, dist);
  float l1 = mix(1.2, 0.0, near);
  float l2 = mix(2.2, 0.0, near);
  float rk1 = xpRockAt(p.zy / 7.0, l1) * sw.x + xpRockAt(p.xy / 7.0, l1) * sw.y;
  float rk2 = xpRockAt(p.zy / 23.0 + 0.37, l2) * sw.x + xpRockAt(p.xy / 23.0 + 0.61, l2) * sw.y;
  float detail = 1.0 - smoothstep(110.0, 170.0, dist);
  float lum = mix(1.0, rk1 * 2.0, mix(0.5, 0.9, near)) * mix(1.0, rk2 * 2.0, mix(0.35, 0.6, near));
  // Relief from a blurred read of the same rock: cracks and broad shapes get
  // depth, the fine grain doesn't.
  float rb1 = xpRockAt(p.zy / 7.0, 3.0) * sw.x + xpRockAt(p.xy / 7.0, 3.0) * sw.y;
  float rb2 = xpRockAt(p.zy / 23.0 + 0.37, 3.0) * sw.x + xpRockAt(p.xy / 23.0 + 0.61, 3.0) * sw.y;
  return vec2(mix(1.0, lum, detail), (rb1 * 0.25 * near + rb2 * mix(0.12, 0.9, near)) * detail);
}
`;

// Surface colour, snow, rock strata and fine bump, all per pixel, so the
// ground holds up when the camera comes in close.
const TERRAIN_COMMON = /* glsl */ `
varying vec3 vWPos;
varying vec3 vWNorm;
${ROCK_DETAIL}
float xpHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float xpNoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(xpHash(i), xpHash(i + vec2(1.0, 0.0)), u.x), mix(xpHash(i + vec2(0.0, 1.0)), xpHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float xpFbm(vec2 p) {
  float s = 0.0; float a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * xpNoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= 0.5; }
  return s;
}
// Three octaves: for broad colour and the bump, where the finest two
// octaves are smaller than a pixel at any distance the camera sees them.
float xpFbm3(vec2 p) {
  float s = 0.0; float a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * xpNoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= 0.5; }
  return s * 1.143;
}
`;

const TERRAIN_COLOR = /* glsl */ `
  vec3 wn = normalize(vWNorm);
  float h = vWPos.y;
  float level = wn.y;
  float broad = xpFbm3(vWPos.xz * 0.07);
  // Fine grain and bump only up close: further off they are smaller than a
  // pixel, so skipping them saves most of the shader and some shimmer.
  float camDist = distance(vWPos, cameraPosition);
  float nearby = 1.0 - smoothstep(55.0, 85.0, camDist);
  // Seen from above, the grain is laid on the ground; on steep faces it is
  // laid from the side as well, blended by which way the face looks, so it
  // never smears into vertical streaks.
  vec3 tw = pow(abs(wn), vec3(4.0));
  tw /= tw.x + tw.y + tw.z;
  float topFine = nearby > 0.0 ? mix(xpFbm3(vWPos.xz * 0.9), xpFbm(vWPos.xz * 0.9), nearby) : xpFbm3(vWPos.xz * 0.9);
  float fine = topFine;
  if (tw.y < 0.97) fine = topFine * tw.y + xpFbm3(vWPos.zy * 0.9 + 17.0) * tw.x + xpFbm3(vWPos.xy * 0.9 + 31.0) * tw.z;

  vec3 meadow = vec3(0.36, 0.45, 0.24);
  vec3 forest = vec3(0.19, 0.29, 0.17);
  vec3 scrub = vec3(0.52, 0.45, 0.33);
  vec3 rock = vec3(0.45, 0.41, 0.38);
  vec3 darkRock = vec3(0.21, 0.2, 0.2);
  vec3 snowC = vec3(0.95, 0.96, 0.99);
  vec3 shore = vec3(0.66, 0.6, 0.47);

  vec3 col = mix(meadow, forest, smoothstep(3.0, 8.0, h + broad * 4.0));
  col = mix(col, scrub, smoothstep(9.0, 15.0, h + broad * 5.0));
  col = mix(col, rock, smoothstep(14.0, 21.0, h + broad * 5.0));

  // Steep faces: bare rock in bands, like bedding planes.
  float strata = xpFbm3(vec2(vWPos.x * 0.11 + vWPos.z * 0.09, h * 0.5 + broad * 3.0));
  vec3 cliff = mix(mix(darkRock, rock, 0.35), rock, smoothstep(0.2, 0.8, strata)) * (0.8 + fine * 0.4);
  float steep = smoothstep(0.3, 0.6, 1.0 - level);
  vec2 rockLH = xpRockDetail(vWPos, wn, camDist);
  cliff *= rockLH.x;
  float rockH = rockLH.y * steep;
  col = mix(col, cliff, steep);

  // Snow lies above a ragged line wherever the slope can hold it; higher up
  // it dusts even the steep faces.
  float snowline = 19.0 + (broad - 0.5) * 10.0;
  float snowAmt = smoothstep(snowline - 1.5, snowline + 2.0, h) * smoothstep(0.42, 0.68, level + (fine - 0.5) * 0.3);
  snowAmt = max(snowAmt, smoothstep(snowline + 5.0, snowline + 16.0, h) * smoothstep(0.2, 0.48, level + (fine - 0.5) * 0.4) * 0.85);
  // Up high, snow plasters every face that isn't sheer.
  snowAmt = max(snowAmt, smoothstep(snowline + 9.0, snowline + 15.0, h) * smoothstep(0.04, 0.26, level + (fine - 0.5) * 0.15) * 0.94);
  col = mix(col, snowC * (0.93 + fine * 0.07), snowAmt);

  col = mix(shore, col, smoothstep(${(WATER + 0.2).toFixed(2)}, ${(WATER + 1.2).toFixed(2)}, h));

  // Close up, a fine grit so the ground never turns to soft blobs.
  float closeUp = 1.0 - smoothstep(8.0, 22.0, camDist);
  if (closeUp > 0.0) {
    float g7 = xpNoise(vWPos.xz * 7.0) * tw.y + xpNoise(vWPos.zy * 7.0) * tw.x + xpNoise(vWPos.xy * 7.0) * tw.z;
    float g19 = xpNoise(vWPos.xz * 19.0) * tw.y + xpNoise(vWPos.zy * 19.0) * tw.x + xpNoise(vWPos.xy * 19.0) * tw.z;
    col *= 1.0 + ((g7 - 0.5) * 0.22 + (g19 - 0.5) * 0.12) * closeUp;
  }

  diffuseColor.rgb = pow(col, vec3(2.2));
`;

// One rock texture for the mountain's faces and the paint on them.
let ROCK: THREE.Texture | null = null;
const sharedRock = () => (ROCK ??= cliffTexture());

function useTerrainMaterial() {
  return useMemo(() => {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0 });
    const rockMap = sharedRock();
    material.userData.rockMap = rockMap;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.xpRock = { value: rockMap };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNorm;")
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNorm = normalize(mat3(modelMatrix) * objectNormal);",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${TERRAIN_COMMON}`)
        .replace("#include <color_fragment>", TERRAIN_COLOR)
        .replace(
          "#include <roughnessmap_fragment>",
          "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.5, snowAmt);",
        )
        .replace(
          "#include <normal_fragment_maps>",
          `#include <normal_fragment_maps>
          if (nearby > 0.0) {
            vec2 bp = vWPos.xz * 1.1;
            float e = 0.08;
            float b0 = xpFbm3(bp);
            float bx = xpFbm3(bp + vec2(e, 0.0));
            float bz = xpFbm3(bp + vec2(0.0, e));
            // Bump from above only, faded out on steep faces where it would streak.
            vec3 bump = vec3(-(bx - b0) / e, 0.0, -(bz - b0) / e) * (1.0 - snowAmt * 0.75) * 0.9 * nearby * smoothstep(0.75, 0.95, tw.y);
            normal = normalize(normal + (viewMatrix * vec4(bump, 0.0)).xyz);
          }
          {
            // Relief from the rock detail, so cracks sink and their lips catch light.
            vec2 dH = vec2(dFdx(rockH), dFdy(rockH)) * (1.0 - snowAmt);
            vec3 sx = dFdx(-vViewPosition);
            vec3 sy = dFdy(-vViewPosition);
            vec3 r1 = cross(sy, normal);
            vec3 r2 = cross(normal, sx);
            float det = dot(sx, r1) * faceDirection;
            normal = normalize(abs(det) * normal - sign(det) * (dH.x * r1 + dH.y * r2));
          }`,
        );
    };
    return material;
  }, []);
}

// Run work when the browser has a moment free, so it never costs a frame.
type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
function whenIdle(cb: () => void, timeout = 300) {
  const w = window as IdleWindow;
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 30);
  return () => window.clearTimeout(id);
}

// Heights on the fine grid, each sampled only when something first needs it:
// the coarse ground needs a sixteenth of them, and full detail is filled in
// only along the part of the mountain the climber actually gets close to.
function makeField() {
  const n = GRID + 1;
  const d = WORLD / GRID;
  const h = new Float32Array(n * n).fill(Number.NaN);
  const at = (i: number, j: number) => {
    const k = j * n + i;
    let v = h[k];
    if (v !== v) v = h[k] = heightAt(-HALF + i * d, -HALF + j * d);
    return v;
  };
  return { n, d, at };
}
type Field = ReturnType<typeof makeField>;

// A patch of ground from grid cell (i0, j0), `cells` across, every `step`th
// point, centred on `centre`. A skirt hangs from its rim so where a coarse
// patch meets a finer one no crack can open between them.
function patchGeometry(f: Field, i0: number, j0: number, cells: number, step: number, centre: THREE.Vector3, skirt: boolean) {
  const m = cells / step + 1;
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const v = new THREE.Vector3();
  const last = f.n - 1;
  const put = (gi: number, gj: number, drop: number) => {
    pos.push(-HALF + gi * f.d - centre.x, f.at(gi, gj) - drop - centre.y, -HALF + gj * f.d - centre.z);
    // Normals from neighbours on this patch's own grid, so a coarse patch
    // never samples the fine grid it is meant to save.
    const l = f.at(Math.max(gi - step, 0), gj);
    const r = f.at(Math.min(gi + step, last), gj);
    const u = f.at(gi, Math.max(gj - step, 0));
    const w = f.at(gi, Math.min(gj + step, last));
    v.set((l - r) / (2 * step * f.d), 1, (u - w) / (2 * step * f.d)).normalize();
    nor.push(v.x, v.y, v.z);
  };
  for (let r = 0; r < m; r += 1) for (let c = 0; c < m; c += 1) put(i0 + c * step, j0 + r * step, 0);
  // Split each square along whichever diagonal the ground follows: a fixed
  // diagonal cuts across ridges and gullies and saws them into teeth.
  for (let r = 0; r < m - 1; r += 1)
    for (let c = 0; c < m - 1; c += 1) {
      const a = r * m + c;
      const ya = pos[a * 3 + 1];
      const yb = pos[(a + 1) * 3 + 1];
      const yc = pos[(a + m) * 3 + 1];
      const yd = pos[(a + m + 1) * 3 + 1];
      if (Math.abs(ya - yd) < Math.abs(yb - yc)) idx.push(a, a + m, a + m + 1, a, a + m + 1, a + 1);
      else idx.push(a, a + m, a + 1, a + 1, a + m, a + m + 1);
    }
  if (skirt) {
    const rim: [number, number][] = [];
    for (let c = 0; c < m; c += 1) rim.push([c, 0]);
    for (let r = 1; r < m; r += 1) rim.push([m - 1, r]);
    for (let c = m - 2; c >= 0; c -= 1) rim.push([c, m - 1]);
    for (let r = m - 2; r > 0; r -= 1) rim.push([0, r]);
    const base = m * m;
    rim.forEach(([c, r]) => put(i0 + c * step, j0 + r * step, SKIRT));
    rim.forEach(([c, r], k) => {
      const next = rim[(k + 1) % rim.length];
      const p = r * m + c;
      const q = next[1] * m + next[0];
      const pb = base + k;
      const qb = base + ((k + 1) % rim.length);
      idx.push(p, pb, q, q, pb, qb, p, q, pb, q, qb, pb);
    });
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

type Chunk = { lod: THREE.LOD; centre: THREE.Vector3; i0: number; j0: number; fine: boolean };
// Full detail is built this close, a little ahead of where the LOD wants it.
const STREAM = LOD_FROM[1] + 45;

function Terrain() {
  const material = useTerrainMaterial();
  const caster = useRef<THREE.Mesh>(null);
  const { field, chunks, shadowGeometry } = useMemo(() => {
    const field = makeField();
    // The whole ground at half detail, only ever drawn into the shadow map.
    // Its samples are the ones the half and quarter detail patches use.
    const shadowGeometry = patchGeometry(field, 0, 0, GRID, 2, new THREE.Vector3(), false);
    const chunks: Chunk[] = [];
    for (let cj = 0; cj < CHUNKS; cj += 1)
      for (let ci = 0; ci < CHUNKS; ci += 1) {
        const i0 = ci * CELLS;
        const j0 = cj * CELLS;
        const centre = new THREE.Vector3(-HALF + (i0 + CELLS / 2) * field.d, field.at(i0 + CELLS / 2, j0 + CELLS / 2), -HALF + (j0 + CELLS / 2) * field.d);
        const lod = new THREE.LOD();
        lod.position.copy(centre);
        LOD_STEPS.slice(1).forEach((step, k) => {
          const mesh = new THREE.Mesh(patchGeometry(field, i0, j0, CELLS, step, centre, true), material);
          mesh.receiveShadow = true;
          lod.addLevel(mesh, k === 0 ? 0 : LOD_FROM[2], 0.1);
        });
        chunks.push({ lod, centre, i0, j0, fine: false });
      }
    return { field, chunks, shadowGeometry };
  }, [material]);

  const refine = (c: Chunk) => {
    const mesh = new THREE.Mesh(patchGeometry(field, c.i0, c.j0, CELLS, 1, c.centre, true), material);
    mesh.receiveShadow = true;
    c.lod.levels[0].distance = LOD_FROM[1];
    c.lod.addLevel(mesh, 0, 0.1);
    c.fine = true;
  };
  // The ground around the first view is sharp from the start.
  useMemo(() => {
    const eye = new THREE.Vector3(...STOP_SHOTS[0].pos);
    chunks.forEach((c) => { if (c.centre.distanceTo(eye) < STREAM) refine(c); });
  }, [chunks]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    chunks.forEach((c) => c.lod.levels.forEach((lv) => (lv.object as THREE.Mesh).geometry.dispose()));
    shadowGeometry.dispose();
    material.dispose();
  }, [chunks, shadowGeometry, material]);

  useFrame(({ gl, camera }) => {
    // The shadow map is drawn once, not every frame: show the caster only
    // for the frame it is drawn in.
    if (caster.current) caster.current.visible = gl.shadowMap.needsUpdate;
    // Stream in full detail ahead of the climber, the nearest patch first,
    // one a frame so it never shows as a stall.
    let next: Chunk | null = null;
    let best = STREAM;
    for (const c of chunks) {
      if (c.fine) continue;
      const d = camera.position.distanceTo(c.centre);
      if (d < best) { best = d; next = c; }
    }
    if (next) refine(next);
  });
  return (
    <>
      {chunks.map((c, i) => <primitive key={i} object={c.lod} />)}
      <mesh ref={caster} geometry={shadowGeometry} material={material} castShadow />
    </>
  );
}

// A Himalayan fir: a short trunk carrying four tiers of drooping, ragged
// branches, dark inside each tier and lighter at the tips.
function useFirGeometry() {
  return useMemo(() => {
    const random = rng(17);
    const paint = (g: THREE.BufferGeometry, colourAt: (y: number, rim: number) => THREE.Color) => {
      const pos = g.attributes.position as THREE.BufferAttribute;
      const colours = new Float32Array(pos.count * 3);
      g.computeBoundingBox();
      const { min, max } = g.boundingBox!;
      for (let i = 0; i < pos.count; i += 1) {
        const y = (pos.getY(i) - min.y) / (max.y - min.y || 1);
        const rim = Math.hypot(pos.getX(i), pos.getZ(i));
        const c = colourAt(y, rim);
        colours[i * 3] = c.r;
        colours[i * 3 + 1] = c.g;
        colours[i * 3 + 2] = c.b;
      }
      g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
      return g;
    };
    const parts: THREE.BufferGeometry[] = [];
    const trunk = new THREE.CylinderGeometry(0.07, 0.12, 1, 6);
    trunk.translate(0, 0.5, 0);
    parts.push(paint(trunk, () => new THREE.Color("#4a3325")));
    const dark = new THREE.Color("#183322");
    const light = new THREE.Color("#4b7a43");
    for (let k = 0; k < 4; k += 1) {
      const r = 1.0 * (1 - k * 0.21);
      const h = 1.2 * (1 - k * 0.13);
      const y0 = 0.55 + k * 0.58;
      const cone = new THREE.ConeGeometry(r, h, 8, 1);
      const pos = cone.attributes.position as THREE.BufferAttribute;
      // Ragged, drooping rim: branch tips at uneven lengths, hanging down.
      for (let i = 0; i < pos.count; i += 1) {
        const y = pos.getY(i);
        if (y < -h / 2 + 0.01) {
          const reach = 0.82 + random() * 0.38;
          pos.setX(i, pos.getX(i) * reach);
          pos.setZ(i, pos.getZ(i) * reach);
          pos.setY(i, y - random() * 0.22);
        } else if (y < h / 2 - 0.01) {
          pos.setX(i, pos.getX(i) * (0.9 + random() * 0.2));
          pos.setZ(i, pos.getZ(i) * (0.9 + random() * 0.2));
        }
      }
      cone.translate(0, y0 + h / 2, 0);
      parts.push(paint(cone, (y, rim) => dark.clone().lerp(light, Math.min(1, 0.25 + rim * 0.45 + y * 0.35 + k * 0.06))));
    }
    const merged = BufferGeometryUtils.mergeGeometries(parts.map((g) => g.toNonIndexed()))!;
    merged.computeVertexNormals();
    return merged;
  }, []);
}

// A far-off fir: one ragged cone, enough for a silhouette in the haze.
function useFarFirGeometry() {
  return useMemo(() => {
    const cone = new THREE.ConeGeometry(0.85, 2.7, 6, 1).toNonIndexed();
    cone.translate(0, 0.45 + 1.35, 0);
    const pos = cone.attributes.position as THREE.BufferAttribute;
    const colours = new Float32Array(pos.count * 3);
    const dark = new THREE.Color("#183322");
    const light = new THREE.Color("#4b7a43");
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i += 1) {
      c.copy(dark).lerp(light, Math.min(1, 0.3 + (pos.getY(i) / 3.2) * 0.4));
      colours.set([c.r, c.g, c.b], i * 3);
    }
    cone.setAttribute("color", new THREE.BufferAttribute(colours, 3));
    cone.computeVertexNormals();
    return cone;
  }, []);
}

// Whether a point sits in the cone from a camp's eye to its words: the cone
// widens with distance, as the words do, so nothing hides any of them.
function blocksSight(sight: { from: [number, number, number]; to: [number, number, number] }, x: number, y: number, z: number) {
  const [ax, ay, az] = sight.from;
  const vx = sight.to[0] - ax, vy = sight.to[1] - ay, vz = sight.to[2] - az;
  const len = Math.hypot(vx, vy, vz) || 1;
  const t = ((x - ax) * vx + (y - ay) * vy + (z - az) * vz) / (len * len);
  if (t < 0 || t > 1.05) return false;
  const off = Math.hypot(ax + vx * t - x, ay + vy * t - y, az + vz * t - z);
  return off < 1.5 + t * len * 0.34;
}

const TREE_TILES = 5;
const TREE_NEAR = 110;

function Trees() {
  const geometry = useFirGeometry();
  const far = useFarFirGeometry();
  const transforms = useMemo(() => {
    const sights = inscriptions().map((at) => ({ from: at.eye, to: at.center }));
    const random = rng(42);
    const out: { x: number; y: number; z: number; s: number; tint: number; turn: number; lean: number }[] = [];
    for (let tries = 0; tries < 40000 && out.length < 2600; tries += 1) {
      const x = (random() - 0.5) * WORLD * 0.92;
      const z = (random() - 0.5) * WORLD * 0.92;
      // The cheap test first: most spots fail before the ground is sampled.
      // (No random draws move, so the forest is the same one as ever.)
      const patch = Math.sin(x * 0.07) + Math.cos(z * 0.06) + Math.sin((x + z) * 0.04);
      if (patch < 0) continue;
      const y = heightAt(x, z);
      if (y < WATER + 0.9 || y > 13) continue;
      const slope = Math.abs(heightAt(x + 1, z) - y) + Math.abs(heightAt(x, z + 1) - y);
      if (slope > 1.1 || (nearTrail(x, z)?.d ?? Infinity) < 5) continue;
      if (random() > 1 - y / 15) continue;
      const tree = { x, y, z, s: 0.55 + random() * 0.85, tint: random(), turn: random() * Math.PI * 2, lean: (random() - 0.5) * 0.08 };
      // Never stand between a camp's viewpoint and the words it looks at.
      if (sights.some((sight) => [0.6, 1.6, 2.8].some((k) => blocksSight(sight, x, y + k * tree.s, z)))) continue;
      // And leave a little clearing round each place the climber stops.
      if (sights.some((sight) => Math.hypot(sight.from[0] - x, sight.from[2] - z) < 10)) continue;
      out.push(tree);
    }
    return out;
  }, []);

  // Trees grouped into tiles: a tile off screen is skipped whole, and a far
  // tile draws its trees as plain cones.
  const tiles = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
    const groups = new Map<number, typeof transforms>();
    const size = WORLD / TREE_TILES;
    for (const t of transforms) {
      const k = Math.min(TREE_TILES - 1, Math.floor((t.x + HALF) / size)) * TREE_TILES + Math.min(TREE_TILES - 1, Math.floor((t.z + HALF) / size));
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(t);
    }
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const color = new THREE.Color();
    return [...groups.values()].map((list) => {
      const near = new THREE.InstancedMesh(geometry, material, list.length);
      const distant = new THREE.InstancedMesh(far, material, list.length);
      list.forEach((t, i) => {
        rotation.setFromEuler(euler.set(t.lean, t.turn, t.lean * 0.6));
        matrix.compose(new THREE.Vector3(t.x, t.y - 0.15, t.z), rotation, new THREE.Vector3(t.s, t.s * (0.95 + t.tint * 0.45), t.s));
        // Each tree a little different: some bluer, some yellower, some darker.
        color.setRGB(0.78 + t.tint * 0.3, 0.82 + t.tint * 0.22, 0.74 + (1 - t.tint) * 0.22);
        for (const m of [near, distant]) {
          m.setMatrixAt(i, matrix);
          m.setColorAt(i, color);
        }
      });
      for (const m of [near, distant]) {
        m.receiveShadow = true;
        m.computeBoundingSphere();
      }
      const centre = near.boundingSphere!.center.clone();
      distant.visible = false;
      return { near, distant, centre };
    });
  }, [transforms, geometry, far]);
  useEffect(() => () => {
    tiles[0]?.near.material && (tiles[0].near.material as THREE.Material).dispose();
    tiles.forEach((t) => { t.near.dispose(); t.distant.dispose(); });
    far.dispose();
  }, [tiles, far]);

  useFrame(({ camera }) => {
    for (const t of tiles) {
      const close = camera.position.distanceTo(t.centre) < TREE_NEAR;
      t.near.visible = close;
      t.distant.visible = !close;
    }
  });

  return (
    <>
      {tiles.map((t, i) => (
        <group key={i}>
          <primitive object={t.near} />
          <primitive object={t.distant} />
        </group>
      ))}
    </>
  );
}

function Water({ night }: { night: boolean }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={WATER} receiveShadow>
      <planeGeometry args={[WORLD, WORLD]} />
      <meshPhysicalMaterial color={night ? "#16223d" : "#3d6f8f"} roughness={0.08} metalness={0.2} clearcoat={1} transparent opacity={0.9} />
    </mesh>
  );
}

/* ── Clouds ─────────────────────────────────────────────────────────────── */

function usePuffTexture() {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const random = rng(3);
    for (let i = 0; i < 26; i += 1) {
      const r = size * (0.12 + random() * 0.2);
      const a = random() * Math.PI * 2;
      const d = random() * size * 0.22;
      const x = size / 2 + Math.cos(a) * d;
      const y = size / 2 + Math.sin(a) * d * 0.6;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.32)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

// True when a puff would sit in, or in front of, a chapter's view.
function blocks(shot: Shot, p: [number, number, number]) {
  const [ax, ay, az] = shot.pos;
  const vx = shot.target[0] - ax;
  const vy = shot.target[1] - ay;
  const vz = shot.target[2] - az;
  const t = Math.min(2.2, Math.max(0, ((p[0] - ax) * vx + (p[1] - ay) * vy + (p[2] - az) * vz) / (vx * vx + vy * vy + vz * vz)));
  return Math.hypot(ax + vx * t - p[0], ay + vy * t - p[1], az + vz * t - p[2]) < 34;
}

// Banks of cloud in the valleys, and a high layer the intro descends through.
function Clouds({ night, shots }: { night: boolean; shots: Shot[] }) {
  const texture = usePuffTexture();
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    const random = rng(11);
    const out: { pos: Vec; scale: number; opacity: number; drift: number }[] = [];
    type Vec = [number, number, number];
    // High layer, over the approach.
    // Valley banks, kept away from where the camera stops.
    for (let tries = 0; tries < 400 && out.length < 60; tries += 1) {
      const x = (random() - 0.5) * WORLD * 0.85;
      const z = (random() - 0.5) * WORLD * 0.85;
      const ground = heightAt(x, z);
      if (ground > 12) continue;
      const y = Math.max(ground, WATER) + 7 + random() * 6;
      if (shots.some((s) => blocks(s, [x, y, z]) || Math.hypot(s.pos[0] - x, s.pos[2] - z) < 75) || Math.abs(x) < 26) continue;
      out.push({ pos: [x, y, z], scale: 26 + random() * 30, opacity: 0.35 + random() * 0.3, drift: random() });
    }
    return out;
  }, [shots]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      const p = puffs[i];
      child.position.x = p.pos[0] + Math.sin(clock.elapsedTime * 0.03 + p.drift * 10) * 6;
    });
  });

  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <sprite key={i} position={p.pos} scale={[p.scale, p.scale * 0.55, 1]}>
          <spriteMaterial map={texture} transparent depthWrite={false} opacity={p.opacity} color={night ? "#5d6b8c" : "#fff4ea"} fog />
        </sprite>
      ))}
    </group>
  );
}

/* ── Inscriptions ───────────────────────────────────────────────────────── */

// A boulder by the trail: an irregular, weathered lump of granite with a
// broad, gently curved face, the words painted straight onto its rock.
function Stone({ chapter, at, projects }: { chapter: Chapter; at: Inscription; projects: ExploreProject[] }) {
  const panel = useMemo(() => panelFor(chapter, projects), [chapter, projects]);
  const mani = at.kind === "mani";
  const width = mani ? 2.8 : 3.2;
  const { map, bumpMap, height } = useMemo(() => {
    const painted = paintStoneLetters(panel);
    return { ...painted, height: inscriptionSize(panel, width).worldHeight };
  }, [panel, width]);

  const depth = mani ? 1.4 : 2.4;
  const seed = Math.round(Math.abs(at.center[0] * 13 + at.center[2] * 7)) % 97;
  const { rock, letters } = useMemo(() => {
    const A = (width + 1.5) / 2;
    const B = height / 2 + 0.5;
    const C = depth / 2;
    const below = B + 1.6; // the part sunk into the ground runs deeper
    const random = rng(seed + 5);
    // A few old fracture planes, on the top, sides and back, never the face.
    // Each chips one shoulder or the back, so no two meet in a ridge.
    const cuts = [-1, 1, -1, 1].map((side, i) => {
      const n = new THREE.Vector3(side * (0.5 + random() * 0.5), 0.3 + random() * 0.5, -0.1 - random() * (i > 1 ? 0.9 : 0.3));
      n.normalize();
      const reach = Math.sqrt((A * n.x) ** 2 + (B * n.y) ** 2 + (C * n.z) ** 2);
      return { n, k: reach * (0.84 + random() * 0.08) };
    });
    const g = new THREE.IcosahedronGeometry(1, 10);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const d = new THREE.Vector3();
    const p = new THREE.Vector3();
    const e = 2.7;
    for (let i = 0; i < pos.count; i += 1) {
      d.fromBufferAttribute(pos, i).normalize();
      const b = d.y < 0 ? below : B;
      const r = (Math.abs(d.x / A) ** e + Math.abs(d.y / b) ** e + Math.abs(d.z / C) ** e) ** (-1 / e);
      p.copy(d).multiplyScalar(r);
      // A broad face, only slightly convex, its rim rolling away softly.
      const flat = C * 0.7;
      if (p.z > flat) p.z = flat + (p.z - flat) * 0.28;
      // Wider and deeper at the foot than the crown.
      const t = THREE.MathUtils.clamp(p.y / B, -1, 1);
      // One shoulder sits higher than the other.
      if (p.y > 0) p.y += (0.16 * (p.x / A) * p.y * p.y) / B;
      p.x *= 1 - 0.1 * t;
      p.z = p.z * (1 - 0.1 * t) - Math.max(0, t) ** 2 * 0.14;
      // Big, slow lumps everywhere; barely any on the painted face.
      const face = THREE.MathUtils.smoothstep(d.z, 0.35, 0.85);
      const lump = 1.3 * rockNoise.noise(p.x * 0.4 + seed, p.y * 0.4, p.z * 0.4 + 1.7) + 0.5 * rockNoise.noise(p.x * 1.3, p.y * 1.3 + seed, p.z * 1.3);
      p.addScaledVector(d, lump * THREE.MathUtils.lerp(0.3, 0.04, face));
      // Old fractures: flattened, slightly bevelled planes.
      for (const c of cuts) {
        const over = p.dot(c.n) - c.k;
        if (over > 0) p.addScaledVector(c.n, -over * 0.7);
      }
      weather(p, THREE.MathUtils.lerp(0.05, 0.012, face), seed);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    g.deleteAttribute("normal");
    g.deleteAttribute("uv");
    const merged = BufferGeometryUtils.mergeVertices(g, 1e-4);
    g.dispose();
    merged.computeVertexNormals();

    // The paint: a sheet laid onto the face, every point dropped onto the rock.
    const sheet = new THREE.PlaneGeometry(width, height, 22, Math.max(6, Math.round((22 * height) / width)));
    const sp = sheet.attributes.position as THREE.BufferAttribute;
    const caster = new THREE.Raycaster();
    const probe = new THREE.Mesh(merged);
    const dir = new THREE.Vector3(0, 0, -1);
    for (let i = 0; i < sp.count; i += 1) {
      caster.set(new THREE.Vector3(sp.getX(i), sp.getY(i), C * 3), dir);
      const hit = caster.intersectObject(probe, false)[0];
      sp.setZ(i, (hit ? hit.point.z : C * 0.7) + 0.015);
    }
    sheet.computeVertexNormals();
    return { rock: merged, letters: sheet };
  }, [width, height, depth, seed]);

  const materials = useMemo(() => {
    const stone = graniteTexture(mani ? 3 : 7);
    const rockMat = new THREE.MeshStandardMaterial({ map: stone.map, color: mani ? "#5a534c" : "#ffffff", roughness: 0.95 });
    stone.bumpMap.dispose();
    stone.map.wrapS = stone.map.wrapT = THREE.MirroredRepeatWrapping;
    // Granite projected from three sides and blended by the surface's facing,
    // so the grain wraps the lump without a seam or a pinch anywhere.
    rockMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vRockPos;\nvarying vec3 vRockNorm;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRockPos = position;\nvRockNorm = normal;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vRockPos;\nvarying vec3 vRockNorm;")
        .replace(
          "#include <map_fragment>",
          `vec3 tw = pow(abs(normalize(vRockNorm)), vec3(4.0));
          tw /= tw.x + tw.y + tw.z;
          vec3 rp = vRockPos / 2.6 + vec3(0.37, 0.61, 0.23);
          vec4 tex = texture2D(map, rp.zy) * tw.x + texture2D(map, rp.xz) * tw.y + texture2D(map, rp.xy) * tw.z;
          diffuseColor *= tex;`,
        )
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * " + (mani ? "0.0" : "0.06") + ";");
    };
    // The letters carry a little light of their own, like paint catching the
    // sky, so they still read when the stone is in shadow.
    const paintMat = new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 2, roughness: 0.8, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, emissiveMap: map, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.08 });
    return { rock: rockMat, paint: paintMat };
  }, [map, bumpMap, mani]);
  useEffect(() => () => {
    rock.dispose();
    letters.dispose();
    map.dispose();
    bumpMap.dispose();
    materials.rock.map?.dispose();
    materials.rock.bumpMap?.dispose();
    materials.rock.dispose();
    materials.paint.dispose();
  }, [rock, letters, map, bumpMap, materials]);

  // A few loose rocks at the foot, broken off the boulder long ago.
  const rubble = useMemo(() => {
    const random = rng(Math.round(Math.abs(at.center[0] * 37 + at.center[2] * 11)));
    return Array.from({ length: 6 }, () => {
      const side = random() > 0.5 ? 1 : -1;
      return {
        x: side * (width / 2 + 0.6 + random() * 0.9),
        z: 0.4 + random() * 0.9,
        s: 0.12 + random() * 0.28,
        r: random() * 6,
      };
    });
  }, [width, at.center]);

  const yaw = Math.atan2(at.facing[0], at.facing[2]);
  const lean = mani ? -0.28 : -0.08;
  return (
    <group position={at.center} rotation={[0, yaw, 0]}>
      <group rotation-x={lean}>
        <mesh geometry={rock} material={materials.rock} castShadow receiveShadow />
        <mesh geometry={letters} material={materials.paint} renderOrder={1} />
      </group>
      {rubble.map((r, i) => (
        <mesh key={i} position={[r.x, -height / 2 - 0.3 + r.s * 0.3, r.z]} rotation={[r.r, r.r * 1.7, r.r * 0.4]} scale={[r.s * 1.3, r.s * 0.8, r.s]} material={materials.rock} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
}

// A rock arch over the trail, painted like the boulders at base camps.
// The outline is one rough path with the gap notched out of its foot; the
// pillars run on below ground so the arch sits firm on any slope.
function Arch({ chapter, at, projects }: { chapter: Chapter; at: Inscription; projects: ExploreProject[] }) {
  const panel = useMemo(() => panelFor(chapter, projects), [chapter, projects]);
  const { map, bumpMap } = useMemo(() => paintArch(panel, ARCH), [panel]);
  const geometry = useMemo(() => {
    const { width: W, height: H, holeWidth, holeHeight, depth } = ARCH;
    const random = rng(Math.round(Math.abs(at.center[0] * 131 + at.center[2] * 71)));
    const base = -4.5;
    const shape = new THREE.Shape();
    shape.moveTo(-W / 2, base);
    // Over the top: a boxy, lumpy boulder outline.
    for (let i = 0; i <= 40; i += 1) {
      const a = Math.PI - (i / 40) * Math.PI;
      const c = Math.cos(a);
      const r = 1 + (random() - 0.5) * 0.05;
      const x = (W / 2) * Math.sign(c) * Math.pow(Math.abs(c), 0.45) * r;
      const y = H * Math.pow(Math.sin(a), 0.3) * r;
      shape.lineTo(x, Math.max(base, y));
    }
    shape.lineTo(W / 2, base);
    // Back along the foot, and up through the gap.
    shape.lineTo(holeWidth / 2, base);
    for (let i = 0; i <= 24; i += 1) {
      const a = (i / 24) * Math.PI;
      const x = (holeWidth / 2) * Math.cos(a);
      const y = Math.max(base, (holeHeight + 0.2) * Math.pow(Math.sin(a), 0.7) - 0.2);
      shape.lineTo(x + (random() - 0.5) * 0.06, y);
    }
    shape.lineTo(-holeWidth / 2, base);
    shape.lineTo(-W / 2, base);

    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.3, bevelSegments: 3, curveSegments: 8, steps: 3 });
    g.translate(0, 0, -depth / 2);
    // Weather everything but the painted face.
    const pos = g.attributes.position as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    const seed = random() * 50;
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i);
      const face = v.z > depth / 2 + 0.25;
      weather(v, face ? 0.02 : 0.32, seed);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    const merged = BufferGeometryUtils.mergeVertices(g, 1e-3);
    merged.computeVertexNormals();
    g.dispose();
    return merged;
    return g;
  }, [at.center]);

  const materials = useMemo(() => {
    // Shape coordinates are world units: map them onto the painted face.
    map.repeat.set(1 / ARCH.width, 1 / ARCH.height);
    map.offset.set(0.5, 0);
    bumpMap.repeat.copy(map.repeat);
    bumpMap.offset.copy(map.offset);
    const face = new THREE.MeshStandardMaterial({ map, bumpMap, bumpScale: 1.5, roughness: 0.9, emissiveMap: map, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.08 });
    // The same granite, unpainted, all the way round and through the gap.
    const stone = graniteTexture(9);
    stone.map.repeat.set(0.45, 0.45);
    stone.bumpMap.repeat.copy(stone.map.repeat);
    // Warmed to match the painted face, and lit a little so the gap isn't a dark rim.
    const rock = new THREE.MeshStandardMaterial({ map: stone.map, bumpMap: stone.bumpMap, bumpScale: 1.5, color: "#e8d6bc", roughness: 0.92, emissiveMap: stone.map, emissive: new THREE.Color("#f2dcc0"), emissiveIntensity: 0.18 });
    return [face, rock];
  }, [map, bumpMap]);
  useEffect(() => () => { geometry.dispose(); map.dispose(); bumpMap.dispose(); materials.forEach((m) => { m.map?.dispose(); m.bumpMap?.dispose(); m.dispose(); }); }, [geometry, map, bumpMap, materials]);

  const yaw = Math.atan2(at.facing[0], at.facing[2]);
  const snowy = at.center[1] > 17;
  return (
    <group position={at.center} rotation={[0, yaw, 0]}>
      <mesh geometry={geometry} material={materials} castShadow receiveShadow />
      {snowy && (
        <mesh position={[0, ARCH.height - 0.05, 0]} scale={[ARCH.width * 0.36, 0.28, ARCH.depth * 0.62]}>
          <sphereGeometry args={[1, 24, 10]} />
          <meshStandardMaterial color="#f4f6fa" roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

// Prayer flags in their five colours: a banner strung between two poles,
// with a guy line from each pole out to the snow.
function PrayerFlags({ a, b, guys = true }: { a: THREE.Vector3; b: THREE.Vector3; guys?: boolean }) {
  const strings = useMemo(() => {
    const colours = ["#2563eb", "#f8fafc", "#dc2626", "#16a34a", "#facc15"];
    const top = (p: THREE.Vector3) => p.clone().add(new THREE.Vector3(0, 3.2, 0));
    const out = (p: THREE.Vector3, away: THREE.Vector3) => {
      const e = p.clone().add(away.clone().setY(0).normalize().multiplyScalar(5));
      e.y = heightAt(e.x, e.z) + 0.2;
      return e;
    };
    const span = b.clone().sub(a);
    const lines: [THREE.Vector3, THREE.Vector3, number][] = guys
      ? [
          [top(a), top(b), 0.7],
          [top(a), out(a, span.clone().negate()), 0.4],
          [top(b), out(b, span), 0.4],
        ]
      : [[top(a), top(b), 0.5]];
    return lines.map(([start, end, sag], k) => {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 24; i += 1) {
        const t = i / 24;
        const p = start.clone().lerp(end, t);
        p.y -= Math.sin(t * Math.PI) * sag;
        points.push(p);
      }
      const count = Math.round(start.distanceTo(end) / 0.34);
      const flags = Array.from({ length: count }, (_, i) => {
        const t = (i + 0.5) / count;
        const p = start.clone().lerp(end, t);
        p.y -= Math.sin(t * Math.PI) * sag + 0.13;
        return { p, colour: colours[(i + k) % 5], yaw: Math.atan2(end.x - start.x, end.z - start.z) + Math.PI / 2 };
      });
      return { points, flags };
    });
  }, [a, b, guys]);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    group.current?.children.forEach((child, i) => {
      if (child.userData.flag) child.rotation.x = Math.sin(clock.elapsedTime * 3 + i * 0.7) * 0.35;
    });
  });
  return (
    <group ref={group}>
      {strings.map((string, k) => <Line key={k} points={string.points} color="#e7e5e4" lineWidth={1} />)}
      {strings.flatMap((string, k) =>
        string.flags.map((f, i) => (
          <mesh key={`${k}-${i}`} position={f.p} rotation-y={f.yaw} userData={{ flag: true }}>
            <planeGeometry args={[0.2, 0.24]} />
            <meshStandardMaterial color={f.colour} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
        )),
      )}
      {[a, b].map((p, i) => (
        <mesh key={i} position={[p.x, p.y + 1.6, p.z]}>
          <cylinderGeometry args={[0.035, 0.05, 3.3, 6]} />
          <meshStandardMaterial color="#d6d3d1" />
        </mesh>
      ))}
    </group>
  );
}

// Across a valley, the haze still sits over the words, but only half as
// thick as over bare rock, so they read through it as a cut face would.
function thinFog(shader: { fragmentShader: string; vertexShader: string; uniforms: Record<string, THREE.IUniform> }) {
  // Paint soaks into the rock rather than lying on it: the same grain,
  // cracks and relief as the face beneath show through the letters.
  shader.uniforms.xpRock = { value: sharedRock() };
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vPaintPos;\nvarying vec3 vPaintNorm;")
    .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvPaintPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvPaintNorm = normalize(mat3(modelMatrix) * objectNormal);");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", `#include <common>\nvarying vec3 vPaintPos;\nvarying vec3 vPaintNorm;\n${ROCK_DETAIL}`)
    .replace(
      "#include <map_fragment>",
      `#include <map_fragment>
      vec3 pn = normalize(vPaintNorm);
      float paintSteep = smoothstep(0.3, 0.6, 1.0 - pn.y);
      vec2 paintRock = xpRockDetail(vPaintPos, pn, distance(vPaintPos, cameraPosition));
      float paintH = paintRock.y * paintSteep;
      diffuseColor.rgb *= mix(1.0, paintRock.x, paintSteep * 0.85);`,
    )
    .replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      {
        vec2 dH = vec2(dFdx(paintH), dFdy(paintH));
        vec3 sx = dFdx(-vViewPosition);
        vec3 sy = dFdy(-vViewPosition);
        vec3 r1 = cross(sy, normal);
        vec3 r2 = cross(normal, sx);
        float det = dot(sx, r1) * faceDirection;
        normal = normalize(abs(det) * normal - sign(det) * (dH.x * r1 + dH.y * r2));
      }`,
    )
    .replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= mix(1.0, paintRock.x, paintSteep * 0.85);",
    );
  shader.fragmentShader = shader.fragmentShader.replace(
    "#include <fog_fragment>",
    `#ifdef USE_FOG
      #ifdef FOG_EXP2
        float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
      #else
        float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
      #endif
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor * 0.5);
    #endif`,
  );
}

// Words on the mountain itself: painted on rock, or traced in snow. Each
// point of the text is thrown from the climber's eye onto the ground, so it
// follows every bump of the slope yet reads true from where they stop.
function Inscribed({ chapter, at, projects }: { chapter: Chapter; at: Inscription; projects: ExploreProject[] }) {
  const panel = useMemo(() => panelFor(chapter, projects), [chapter, projects]);
  const high = at.center[1] > 22;
  const { map, aspect } = useMemo(() => {
    if (at.kind === "snow") return paintSnow(panel, panel.accent);
    // Across the valley the letters must carry over snow and rock alike.
    if (at.kind === "far") return paintFar(panel, "#f0ebe1", FAR_RED);
    return paintOnRock(panel, high ? "#b3211c" : "#f4efe6", high ? "#7c3aed" : panel.accent);
  }, [panel, high, at.kind, chapter.key]);
  const geometry = useMemo(() => {
    const eye = new THREE.Vector3(...at.eye);
    const centre = new THREE.Vector3(...at.center);
    const ahead = centre.clone().sub(eye);
    const dist = ahead.length();
    ahead.normalize();
    const right = new THREE.Vector3().crossVectors(ahead, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, ahead).normalize();
    // The text's size on a virtual sheet held at the wall's distance.
    const width = at.width ?? sheetWidth(dist);
    const height = width * aspect;
    const g = new THREE.PlaneGeometry(1, 1, 44, 28);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 1) {
      p.copy(centre).addScaledVector(right, pos.getX(i) * width).addScaledVector(up, pos.getY(i) * height);
      const dir = p.clone().sub(eye).normalize();
      const hit = castToGround(at.eye, [dir.x, dir.y, dir.z], dist * 2.5);
      const q = hit ? new THREE.Vector3(...hit) : p;
      q.addScaledVector(dir, -0.14 - dist * 0.004); // sit just proud of the rock, above the mesh's facets
      pos.setXYZ(i, q.x, q.y, q.z);
    }
    g.computeVertexNormals();
    if (at.kind === "far") {
      // Light it as the mountain is lit: the slope's own normal at each point.
      const normals = g.attributes.normal as THREE.BufferAttribute;
      const e = 0.6;
      for (let i = 0; i < pos.count; i += 1) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const n = new THREE.Vector3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
        normals.setXYZ(i, n.x, n.y, n.z);
      }
    }
    return g;
  }, [at, aspect]);
  useEffect(() => () => { geometry.dispose(); map.dispose(); }, [geometry, map]);
  const snow = at.kind === "snow";
  const far = at.kind === "far";
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial map={map} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} roughness={0.92} emissiveMap={map} emissive="#ffffff" emissiveIntensity={snow ? 0 : at.kind === "far" ? 0.1 : 0.12} onBeforeCompile={far ? thinFog : undefined} />
    </mesh>
  );
}

const LUNGTA = ["#2563eb", "#f8fafc", "#dc2626", "#16a34a", "#facc15"];

/*
 * A prayer flag as real cloth: a grid of particles (Verlet), its top row
 * sewn to the rope, pulled down by gravity and pushed by a gusting wind that
 * acts on each little facet by how squarely it meets the air, held together
 * by stretch and shear ties. Projects' flags open their repository on a click.
 */
const COLS = 13;
const ROWS = 11;
const CLOTH_INDEX = (() => {
  const index: number[] = [];
  for (let r = 0; r < ROWS - 1; r += 1)
    for (let c = 0; c < COLS - 1; c += 1) {
      const i = r * COLS + c;
      index.push(i, i + COLS, i + 1, i + 1, i + COLS, i + COLS + 1);
    }
  return index;
})();
const CLOTH_TIES = (() => {
  const ties: [number, number, number, number][] = []; // a, b, du, dv (in cells)
  for (let r = 0; r < ROWS; r += 1)
    for (let c = 0; c < COLS; c += 1) {
      const i = r * COLS + c;
      if (c < COLS - 1) ties.push([i, i + 1, 1, 0]);
      if (r < ROWS - 1) ties.push([i, i + COLS, 0, 1]);
      if (c < COLS - 1 && r < ROWS - 1) ties.push([i, i + COLS + 1, 1, 1]);
      if (c > 0 && r < ROWS - 1) ties.push([i, i + COLS - 1, 1, 1]);
      // Bend ties, two cells apart, so the cloth curves but never folds flat over itself.
      if (c < COLS - 2) ties.push([i, i + 2, 2, 0]);
      if (r < ROWS - 2) ties.push([i, i + COLS * 2, 0, 2]);
    }
  return ties;
})();

type ClothProps = {
  pin: (u: number) => THREE.Vector3;
  width: number;
  height: number;
  texture: THREE.Texture;
  wind: THREE.Vector3;
  seed: number;
  href?: string;
  /**
   * Flown from a pole: the cloth's left edge is sewn to `pin` (0 = top of
   * the pole, 1 = bottom) and it streams out along this direction. Without
   * it the top edge is sewn to `pin` (0 = left, 1 = right) and the cloth hangs.
   */
  fly?: THREE.Vector3;
};

function Cloth({ pin, width, height, texture, wind, seed, href, fly }: ClothProps) {
  const sewn = (i: number) => (fly ? i % COLS === 0 : i < COLS);
  const sim = useMemo(() => {
    const n = COLS * ROWS;
    const pos = new Float32Array(n * 3);
    const prev = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const pinned: THREE.Vector3[] = [];
    const edge = fly ? ROWS : COLS;
    for (let k = 0; k < edge; k += 1) pinned.push(pin(k / (edge - 1)));
    for (let r = 0; r < ROWS; r += 1)
      for (let c = 0; c < COLS; c += 1) {
        const i = r * COLS + c;
        const at = fly
          ? pinned[r].clone().addScaledVector(fly, (c / (COLS - 1)) * width)
          : pinned[c].clone().add(new THREE.Vector3(0, -(r / (ROWS - 1)) * height, 0));
        pos[i * 3] = prev[i * 3] = at.x;
        pos[i * 3 + 1] = prev[i * 3 + 1] = at.y;
        pos[i * 3 + 2] = prev[i * 3 + 2] = at.z;
        uv[i * 2] = c / (COLS - 1);
        uv[i * 2 + 1] = 1 - r / (ROWS - 1);
      }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geometry.setIndex(CLOTH_INDEX);
    geometry.computeVertexNormals();
    const cw = width / (COLS - 1);
    const ch = height / (ROWS - 1);
    const rest = CLOTH_TIES.map(([, , du, dv]) => Math.hypot(du * cw, dv * ch));
    return { pos, prev, pinned, geometry, rest, force: new Float32Array(n * 3), clock: 0, spare: 0 };
  }, [pin, width, height, fly]);
  useEffect(() => () => sim.geometry.dispose(), [sim]);

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, roughness: 0.9, emissiveMap: texture, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.22 });
    // From behind, the print reads the right way round.
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <map_fragment>", "vec2 clothUv = gl_FrontFacing ? vMapUv : vec2(1.0 - vMapUv.x, vMapUv.y);\ndiffuseColor *= texture2D(map, clothUv);")
        .replace("#include <emissivemap_fragment>", "totalEmissiveRadiance *= texture2D(emissiveMap, clothUv).rgb;");
    };
    return m;
  }, [texture]);
  useEffect(() => () => material.dispose(), [material]);

  const step = (dt: number) => {
    const { pos, prev, force, pinned, rest } = sim;
    const t = (sim.clock += dt);
    // Wind: a steady breeze with slow swells and quick gusts.
    const gust = 1 + 0.45 * Math.sin(t * 0.83 + seed) + 0.3 * Math.sin(t * 2.3 + seed * 1.7) + 0.2 * Math.sin(t * 5.1 + seed * 0.3);
    const wx = wind.x * gust;
    const wy = wind.y * gust;
    const wz = wind.z * gust;
    force.fill(0);
    const idx = CLOTH_INDEX;
    for (let k = 0; k < idx.length; k += 3) {
      const a = idx[k] * 3;
      const b = idx[k + 1] * 3;
      const c = idx[k + 2] * 3;
      const e1x = pos[b] - pos[a], e1y = pos[b + 1] - pos[a + 1], e1z = pos[b + 2] - pos[a + 2];
      const e2x = pos[c] - pos[a], e2y = pos[c + 1] - pos[a + 1], e2z = pos[c + 2] - pos[a + 2];
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x; // length = 2 x area
      const len = Math.hypot(nx, ny, nz) || 1;
      const push = ((nx * wx + ny * wy + nz * wz) / len) * 0.5 * len; // facing x area
      const fx = (nx / len) * push, fy = (ny / len) * push, fz = (nz / len) * push;
      force[a] += fx; force[a + 1] += fy; force[a + 2] += fz;
      force[b] += fx; force[b + 1] += fy; force[b + 2] += fz;
      force[c] += fx; force[c + 1] += fy; force[c + 2] += fz;
    }
    const mass = (width * height) / (COLS * ROWS);
    const dt2 = dt * dt;
    // Hanging cloths: a ripple through the face and a sway along the rope,
    // both growing toward the hem, so every flag on a string moves alike.
    let hang: THREE.Vector3 | null = null;
    let rope: THREE.Vector3 | null = null;
    if (!fly) {
      rope = pinned[pinned.length - 1].clone().sub(pinned[0]).setY(0).normalize();
      hang = new THREE.Vector3().crossVectors(rope, new THREE.Vector3(0, 1, 0)).normalize();
    }
    // A flag on a pole is carried out by the wind's drag, not only its push.
    const carry = fly ? 26 * (0.8 + 0.2 * gust) : 0;
    const flutter = fly ? 1 : 0;
    // Across the cloth: the axis waves travel through, as a flag snaps in wind.
    const across = fly ? new THREE.Vector3().crossVectors(fly, new THREE.Vector3(0, 1, 0)).normalize() : null;
    const wl = Math.hypot(wx, wy, wz) || 1;
    const sway = Math.sin(t * 1.4 + seed * 0.7) * 0.6 + Math.sin(t * 3.3 + seed) * 0.25;
    for (let i = 0; i < COLS * ROWS; i += 1) {
      if (sewn(i)) continue;
      const o = i * 3;
      const col = (i % COLS) / (COLS - 1);
      const row = Math.floor(i / COLS) / (ROWS - 1);
      // This particle's push, worked out once rather than per axis.
      let ax = (carry * wx) / wl;
      let ay = (carry * wy) / wl;
      let az = (carry * wz) / wl;
      if (hang && rope) {
        const ripple = Math.sin(t * 5.2 + col * 3.4 - row * 2.6 + seed) * (0.55 + 0.45 * gust) * 3 * row;
        const along = sway * 1.1 * row;
        ax += hang.x * ripple + rope.x * along;
        ay += hang.y * ripple + rope.y * along;
        az += hang.z * ripple + rope.z * along;
      }
      if (across) {
        // A wave running out from the pole, growing toward the free end.
        const wave = Math.sin(col * 7.5 - t * 8.5 + row * 1.4 + seed) * (0.35 + 0.65 * gust) * 14 * col * flutter;
        ax += across.x * wave;
        ay += across.y * wave + Math.sin(col * 4 - t * 3.2 + seed) * 2 * col;
        az += across.z * wave;
      }
      const vx = (pos[o] - prev[o]) * 0.985;
      const vy = (pos[o + 1] - prev[o + 1]) * 0.985;
      const vz = (pos[o + 2] - prev[o + 2]) * 0.985;
      prev[o] = pos[o];
      prev[o + 1] = pos[o + 1];
      prev[o + 2] = pos[o + 2];
      pos[o] += vx + ((force[o] / mass) * 0.06 + ax) * dt2;
      pos[o + 1] += vy + ((force[o + 1] / mass) * 0.06 + ay - 9.8) * dt2;
      pos[o + 2] += vz + ((force[o + 2] / mass) * 0.06 + az) * dt2;
    }
    for (let it = 0; it < 4; it += 1) {
      for (let k = 0; k < CLOTH_TIES.length; k += 1) {
        const [i, j] = CLOTH_TIES[k];
        const a = i * 3;
        const b = j * 3;
        const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
        const d = Math.hypot(dx, dy, dz) || 1e-6;
        // Bend ties only nudge, so the cloth curves softly.
        const bend = CLOTH_TIES[k][2] === 2 || CLOTH_TIES[k][3] === 2;
        const diff = ((d - rest[k]) / d) * (bend ? 0.22 : 1);
        const pa = sewn(i) ? 0 : 1;
        const pb = sewn(j) ? 0 : 1;
        const share = pa + pb;
        if (!share) continue;
        const ka = (pa / share) * diff;
        const kb = (pb / share) * diff;
        pos[a] += dx * ka; pos[a + 1] += dy * ka; pos[a + 2] += dz * ka;
        pos[b] -= dx * kb; pos[b + 1] -= dy * kb; pos[b + 2] -= dz * kb;
      }
      for (let k = 0; k < pinned.length; k += 1) {
        const o = (fly ? k * COLS : k) * 3;
        pos[o] = pinned[k].x;
        pos[o + 1] = pinned[k].y;
        pos[o + 2] = pinned[k].z;
      }
    }
  };

  // Let it settle before anyone gets close, in time the browser has spare.
  useEffect(
    () =>
      whenIdle(() => {
        for (let i = 0; i < 150; i += 1) step(1 / 60);
        sim.geometry.attributes.position.needsUpdate = true;
        sim.geometry.computeVertexNormals();
        sim.geometry.computeBoundingSphere();
      }, 2000),
    [sim], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useFrame(({ camera }, delta) => {
    // Only simulate cloth the climber is close enough to see move.
    if (camera.position.distanceToSquared(sim.pinned[0]) > 45 * 45) {
      sim.spare = 0;
      return;
    }
    sim.spare = Math.min(sim.spare + delta, 1 / 30);
    let steps = 0;
    // At most two steps a frame, so a slow frame can't snowball into slower ones.
    while (sim.spare >= 1 / 60 && steps < 2) {
      step(1 / 60);
      sim.spare -= 1 / 60;
      steps += 1;
    }
    if (!steps) return;
    sim.geometry.attributes.position.needsUpdate = true;
    sim.geometry.computeVertexNormals();
    sim.geometry.computeBoundingSphere();
  });

  const [hover, setHover] = useState(false);
  useEffect(() => {
    material.emissiveIntensity = hover ? 0.5 : 0.22;
  }, [hover, material]);
  useEffect(() => () => { if (href) document.body.style.cursor = ""; }, [href]);
  return (
    <mesh
      geometry={sim.geometry}
      material={material}
      frustumCulled={false}
      onPointerOver={href ? (e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={href ? () => { setHover(false); document.body.style.cursor = ""; } : undefined}
      onClick={href ? (e) => { e.stopPropagation(); window.open(href, "_blank", "noopener,noreferrer"); } : undefined}
    />
  );
}

/*
 * Camp II's projects, as a string of prayer flags tied across the rock wall
 * beneath the painted words: one rope, flags all of a size in the five
 * colours in their order, the projects printed on the middle ones.
 */
function WallFlags({ at, panel, projects }: { at: Inscription; panel: ReturnType<typeof panelFor>; projects: ExploreProject[] }) {
  const rig = useMemo(() => {
    const { w, h } = farSize(panel);
    const eye = new THREE.Vector3(...at.eye);
    const centre = new THREE.Vector3(...at.center);
    const ahead = centre.clone().sub(eye);
    const dist = ahead.length();
    ahead.normalize();
    const right = new THREE.Vector3().crossVectors(ahead, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, ahead).normalize();
    const width = at.width ?? sheetWidth(dist);
    const height = (width * h) / w;
    const onWall = (a: number, b: number, off: number) => {
      const p = centre.clone().addScaledVector(right, (a * width) / 2).addScaledVector(up, (b * height) / 2);
      const dir = p.clone().sub(eye).normalize();
      const hit = castToGround(at.eye, [dir.x, dir.y, dir.z], dist * 2.5);
      return (hit ? new THREE.Vector3(...hit) : p).addScaledVector(dir, -off);
    };
    // Each end is tied off to a piton driven into the rock.
    const pitonL = onWall(-1.45, -0.98, 0.03);
    const pitonR = onWall(1.45, -0.98, 0.03);
    const start = onWall(-1.45, -0.98, 0.1);
    const end = onWall(1.45, -0.98, 0.1);
    const sag = 0.16;
    // A rope can only sag straight down, so it hangs in one upright plane,
    // set just far enough out from the rock that no part of it, or of the
    // flags below it, touches the face. Two poles hold its ends there, each
    // guyed back to a piton in the wall.
    const out = new THREE.Vector3(-ahead.x, 0, -ahead.z).normalize();
    const base = (t: number) => {
      const p = start.clone().lerp(end, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      return p;
    };
    const gapAt = (p: THREE.Vector3) => {
      const from = p.clone().addScaledVector(out, 3);
      const hit = castToGround([from.x, from.y, from.z], [-out.x, -out.y, -out.z], 8);
      return hit ? from.distanceTo(new THREE.Vector3(...hit)) - 3 : Infinity;
    };
    let reach = 0.3;
    for (let k = 0; k <= 20; k += 1) {
      const p = base(k / 20);
      reach = Math.max(reach, 0.4 - gapAt(p), 0.25 - gapAt(p.clone().add(new THREE.Vector3(0, -0.6, 0))));
    }
    reach = Math.min(1.6, reach);
    const along = (t: number) => base(t).addScaledVector(out, reach);
    const points = Array.from({ length: 41 }, (_, i) => along(i / 40));
    // Flags all of a size, a little apart, the projects in the middle.
    const plain = 1;
    const slots = projects.length + plain * 2;
    const span = start.distanceTo(end);
    const pitch = Math.min(1.25, (span * 0.9) / slots);
    const cloth = pitch * 0.88;
    const first = 0.5 - ((slots * pitch) / span) / 2;
    const flags = Array.from({ length: slots }, (_, k) => {
      const t0 = first + (k * pitch + (pitch - cloth) / 2) / span;
      const t1 = t0 + cloth / span;
      const project = k >= plain && k < plain + projects.length ? projects[k - plain] : undefined;
      return {
        key: project?.url ?? `plain-${k}`,
        project,
        colour: LUNGTA[k % 5],
        pin: (u: number) => along(t0 + (t1 - t0) * u).add(new THREE.Vector3(0, -0.02, 0)),
      };
    });
    // The breeze comes along the wall and a little off it, toward the climber.
    const wind = right.clone().multiplyScalar(1.1).addScaledVector(ahead, -0.45).add(new THREE.Vector3(0, 0.15, 0));

    const flagH = cloth * (400 / 512);
    const facing = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), ahead.clone().negate());

    // The rope is a real cord; its loose ends hang below each knot.
    const ropeCurve = new THREE.CatmullRomCurve3(points);
    const ropeTube = new THREE.TubeGeometry(ropeCurve, 200, 0.016, 7);
    const ropeLength = ropeCurve.getLength();
    const tail = (from: THREE.Vector3, side: number) =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          from,
          from.clone().add(new THREE.Vector3(0, -0.1, 0)).addScaledVector(right, side * 0.05).addScaledVector(ahead, -0.03),
          from.clone().add(new THREE.Vector3(0, -0.22, 0)).addScaledVector(right, side * 0.04).addScaledVector(ahead, -0.05),
          from.clone().add(new THREE.Vector3(0, -0.3, 0)).addScaledVector(right, side * 0.08).addScaledVector(ahead, -0.04),
        ]),
        12,
        0.013,
        5,
      );
    return {
      points,
      flags,
      cloth,
      flagH,
      wind,
      pitons: [pitonL, pitonR],
      // Each pole: from the ground up to just above where the rope is tied.
      poles: [points[0], points[points.length - 1]].map((top) => {
        const foot = heightAt(top.x, top.z) - 0.3;
        const tip = top.y + 0.22;
        return { at: new THREE.Vector3(top.x, (foot + tip) / 2, top.z), length: tip - foot, top };
      }),
      guys: [
        new THREE.TubeGeometry(new THREE.LineCurve3(points[0].clone().add(new THREE.Vector3(0, 0.15, 0)), pitonL), 1, 0.008, 5),
        new THREE.TubeGeometry(new THREE.LineCurve3(points[points.length - 1].clone().add(new THREE.Vector3(0, 0.15, 0)), pitonR), 1, 0.008, 5),
      ],
      facing,
      ropeTube,
      ropeLength,
      tails: [tail(points[0], -1), tail(points[points.length - 1], 1)],
    };
  }, [at, panel, projects]);
  useEffect(() => () => {
    rig.ropeTube.dispose();
    rig.tails.forEach((t) => t.dispose());
    rig.guys.forEach((t) => t.dispose());
  }, [rig]);
  // Twisted cord: diagonal strands wound round the rope, so it reads as rope
  // and not a smooth pipe.
  const cord = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 32;
    c.height = 32;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#cdbf9f";
    ctx.fillRect(0, 0, 32, 32);
    ctx.strokeStyle = "#8f7f62";
    ctx.lineWidth = 5;
    for (let k = -2; k < 3; k += 1) {
      ctx.beginPath();
      ctx.moveTo(k * 16, 0);
      ctx.lineTo(k * 16 + 32, 32);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }, []);
  useEffect(() => {
    // One twist every few centimetres along the rope's real length.
    cord.repeat.set(rig.ropeLength / 0.035, 1);
    cord.needsUpdate = true;
  }, [cord, rig.ropeLength]);
  useEffect(() => () => cord.dispose(), [cord]);
  const textures = useMemo(
    () => rig.flags.map((f) => paintFlag(f.project?.name ?? "", f.project?.language ?? null, f.colour)),
    [rig],
  );
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  return (
    <>
      <mesh geometry={rig.ropeTube}>
        <meshStandardMaterial map={cord} roughness={1} />
      </mesh>
      {rig.tails.map((t, i) => (
        <mesh key={i} geometry={t}>
          <meshStandardMaterial color="#bfb091" roughness={1} />
        </mesh>
      ))}
      {rig.pitons.map((p, i) => (
        <group key={i} position={p} quaternion={rig.facing}>
          {/* The eye of the piton the guy line is tied through. */}
          <mesh>
            <torusGeometry args={[0.045, 0.012, 6, 14]} />
            <meshStandardMaterial color="#4a4744" metalness={0.7} roughness={0.45} />
          </mesh>
        </group>
      ))}
      {rig.guys.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#bfb091" roughness={1} />
        </mesh>
      ))}
      {rig.poles.map((pole, i) => (
        <group key={i}>
          {/* A plain wooden pole, with the rope knotted round its top. */}
          <mesh position={pole.at} castShadow>
            <cylinderGeometry args={[0.03, 0.04, pole.length, 8]} />
            <meshStandardMaterial color="#6b5137" roughness={0.9} />
          </mesh>
          <mesh position={pole.top} scale={[0.06, 0.05, 0.06]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color="#cfc3ad" roughness={1} />
          </mesh>
        </group>
      ))}
      {rig.flags.map((f, i) => (
        <Cloth
          key={f.key}
          pin={f.pin}
          width={rig.cloth}
          height={rig.cloth * (400 / 512)}
          texture={textures[i]}
          wind={rig.wind}
          seed={i * 1.9}
          href={f.project?.url}
        />
      ))}
    </>
  );
}

/*
 * A rope of prayer flags tied from `start` down to a stake at `end`: small
 * cloths of one size in the five colours in order, each sewn along the rope
 * and lifting in the wind, like the strings at Camp II.
 */
function RopeFlags({ start, end, sag, wind }: { start: THREE.Vector3; end: THREE.Vector3; sag: number; wind: THREE.Vector3 }) {
  const rig = useMemo(() => {
    const along = (t: number) => {
      const p = start.clone().lerp(end, t);
      p.y -= Math.sin(t * Math.PI) * sag;
      return p;
    };
    const points = Array.from({ length: 33 }, (_, i) => along(i / 32));
    const span = start.distanceTo(end);
    const pitch = 0.46;
    const cloth = pitch * 0.84;
    const count = Math.max(3, Math.floor((span - 0.6) / pitch));
    const first = (span - count * pitch) / 2 / span;
    const flags = Array.from({ length: count }, (_, k) => {
      const t0 = first + (k * pitch + (pitch - cloth) / 2) / span;
      const t1 = t0 + cloth / span;
      return { colour: LUNGTA[k % 5], pin: (u: number) => along(t0 + (t1 - t0) * u).add(new THREE.Vector3(0, -0.015, 0)) };
    });
    return { points, flags, cloth };
  }, [start, end, sag]);
  const textures = useMemo(() => rig.flags.map((f) => paintFlag("", null, f.colour)), [rig]);
  useEffect(() => () => textures.forEach((t) => t.dispose()), [textures]);
  return (
    <>
      <Line points={rig.points} color="#e7e5e4" lineWidth={1.1} />
      {rig.flags.map((f, i) => (
        <Cloth key={i} pin={f.pin} width={rig.cloth} height={rig.cloth * (400 / 512)} texture={textures[i]} wind={wind} seed={i * 2.3 + 1} />
      ))}
      {/* The stake the rope is tied off to. */}
      <mesh position={[end.x, end.y - 0.25, end.z]} rotation-z={0.12}>
        <cylinderGeometry args={[0.03, 0.035, 0.9, 6]} />
        <meshStandardMaterial color="#8b7355" roughness={0.9} />
      </mesh>
    </>
  );
}

/*
 * The summit: one flag on a tall pole planted in the snow, flying out in the
 * wind with the last chapter printed on it, and prayer flags tied off the pole.
 */
function SummitFlag({ at, chapter, projects }: { at: Inscription; chapter: Chapter; projects: ExploreProject[] }) {
  const panel = useMemo(() => panelFor(chapter, projects), [chapter, projects]);
  const { texture, aspect } = useMemo(() => paintBanner(panel), [panel]);
  useEffect(() => () => texture.dispose(), [texture]);
  const rig = useMemo(() => {
    const centre = new THREE.Vector3(...at.center);
    const toward = new THREE.Vector3(at.facing[0], 0, at.facing[2]).normalize();
    const right = new THREE.Vector3().crossVectors(toward.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
    const width = 2.1;
    const height = width * aspect;
    // The pole stands at the flag's left edge; the cloth flies out to the right,
    // its middle where the climber is looking.
    const foot = centre.clone().addScaledVector(right, -width / 2);
    const ground = heightAt(foot.x, foot.z);
    const top = centre.y + height / 2;
    const pole = { base: new THREE.Vector3(foot.x, ground - 0.3, foot.z), height: top + 0.15 - (ground - 0.3) };
    const hoist = new THREE.Vector3(foot.x, top - 0.08, foot.z).addScaledVector(toward, 0.05);
    const pin = (v: number) => hoist.clone().add(new THREE.Vector3(0, -v * height, 0));
    const fly = right.clone();
    // Mostly along the cloth, a little across it, so it streams and ripples.
    const wind = right.clone().multiplyScalar(1).addScaledVector(toward, 0.06).add(new THREE.Vector3(0, 0.12, 0));
    // Prayer flags tied below the summit flag, running down and out to the
    // left to a stake in the snow, clear of the flag and its words.
    const ropeStart = new THREE.Vector3(foot.x, top - height - 0.35, foot.z).addScaledVector(toward, -0.05);
    const ropeEnd = new THREE.Vector3(foot.x, 0, foot.z).addScaledVector(right, -4.6).addScaledVector(toward, 0.6);
    ropeEnd.y = heightAt(ropeEnd.x, ropeEnd.z) + 0.2;
    const ropeWind = right.clone().multiplyScalar(1.6).addScaledVector(toward, 0.8).add(new THREE.Vector3(0, 0.2, 0));
    return { width, height, pole, pin, fly, wind, ropeStart, ropeEnd, ropeWind };
  }, [at, aspect]);
  return (
    <group>
      <mesh position={[rig.pole.base.x, rig.pole.base.y + rig.pole.height / 2, rig.pole.base.z]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, rig.pole.height, 8]} />
        <meshStandardMaterial color="#cfc8bd" roughness={0.6} />
      </mesh>
      <mesh position={[rig.pole.base.x, rig.pole.base.y + rig.pole.height + 0.04, rig.pole.base.z]}>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshStandardMaterial color="#d4a72c" metalness={0.6} roughness={0.35} />
      </mesh>
      <Cloth pin={rig.pin} width={rig.width} height={rig.height} texture={texture} wind={rig.wind} seed={4.2} fly={rig.fly} />
      <RopeFlags start={rig.ropeStart} end={rig.ropeEnd} sag={0.25} wind={rig.ropeWind} />
    </group>
  );
}


/* ── Camera ─────────────────────────────────────────────────────────────── */

// The camera keeps its own pace: a gesture moves the page one chapter at
// once, but the climb between two stops always takes a few seconds.
// Whether the ground leaves a clear line from `from` to just short of `to`.
function clearView(from: THREE.Vector3, to: THREE.Vector3) {
  const steps = 24;
  for (let i = 1; i < steps; i += 1) {
    const t = (i / steps) * 0.92;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    const z = from.z + (to.z - from.z) * t;
    if (y < heightAt(x, z) + 0.3) return false;
  }
  return true;
}

function Flight({ progress, playhead, reducedMotion, altitude }: Pick<Props, "progress" | "playhead" | "reducedMotion" | "altitude">) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const state = useMemo(() => ({
    head: 0,
    pos: new THREE.Vector3(...STOP_SHOTS[0].pos),
    target: new THREE.Vector3(...STOP_SHOTS[0].target),
    wantPos: new THREE.Vector3(),
    wantTarget: new THREE.Vector3(),
    look: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    sway: { x: 0, y: 0 },
    frame: 0,
    subject: new THREE.Vector3(),
    probe: new THREE.Vector3(),
  }), []);

  // On a portrait screen, widen the view so a useful width still fits across
  // it, rather than walking the camera back up the trail.
  const fov = size.width < size.height ? Math.min(78, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(24)) / (size.width / size.height)))) : 50;
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = fov;
    cam.updateProjectionMatrix();
  }, [camera, fov]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const goal = progress.current ?? 0;
    if (reducedMotion) state.head = goal;
    else {
      // Follow the scroll closely: just enough easing to smooth out the steps
      // of a mouse wheel, and no speed limit or long glide, so the climb stops
      // when the reader stops and always goes as far as they scrolled.
      state.head = THREE.MathUtils.damp(state.head, goal, 9, dt);
      if (Math.abs(goal - state.head) < 1e-4) state.head = goal;
    }
    playhead.current = state.head;

    const shot = cameraAt(state.head);
    state.wantPos.set(...shot.pos);
    state.wantTarget.set(...shot.target);

    // On a narrow screen, step back from the words only as far as their
    // width needs, and never so far that a ridge comes between.
    const aspect = size.width / size.height;
    if (aspect < 1 && shot.focus > 0) {
      const halfH = Math.atan(Math.tan(THREE.MathUtils.degToRad(fov / 2)) * aspect);
      state.subject.set(...shot.subject);
      const dist = state.wantPos.distanceTo(state.subject);
      const need = (shot.span * 0.53) / Math.tan(halfH);
      let back = Math.min(2.6, Math.max(1, need / dist));
      // Try the full step back, then shorter ones, until the view is clear.
      for (let k = 0; k < 4 && back > 1; k += 1) {
        state.probe.copy(state.wantPos).sub(state.subject).multiplyScalar(back).add(state.subject);
        state.probe.y = Math.max(state.probe.y, heightAt(state.probe.x, state.probe.z) + 0.8);
        if (clearView(state.probe, state.subject)) break;
        back = 1 + (back - 1) * 0.5;
        if (k === 3) back = 1;
      }
      back = 1 + (back - 1) * shot.focus;
      state.wantPos.sub(state.subject).multiplyScalar(back).add(state.subject);
      state.wantPos.y = Math.max(state.wantPos.y, heightAt(state.wantPos.x, state.wantPos.z) + 0.8);
    }

    // A slight lean toward the pointer, as if turning your head.
    state.sway.x = THREE.MathUtils.damp(state.sway.x, pointer.current.x, 2.5, dt);
    state.sway.y = THREE.MathUtils.damp(state.sway.y, pointer.current.y, 2.5, dt);
    if (!reducedMotion) {
      state.look.subVectors(state.wantTarget, state.wantPos);
      state.right.crossVectors(state.look, state.up).normalize();
      const reach = Math.min(state.look.length(), 12);
      state.wantTarget.addScaledVector(state.right, state.sway.x * reach * 0.08);
      state.wantTarget.y -= state.sway.y * reach * 0.05;
    }

    // Never stare into rock a few steps away: if the slope close by blocks the
    // view well short of what the camera is aiming at, raise the gaze until it
    // clears. (When the rock is what it aims at, as at a stop, leave it be.)
    for (let k = 0; k < 6; k += 1) {
      const aim = state.wantTarget.distanceTo(state.wantPos);
      state.look.subVectors(state.wantTarget, state.wantPos).normalize();
      const hit = castToGround([state.wantPos.x, state.wantPos.y, state.wantPos.z], [state.look.x, state.look.y, state.look.z], Math.min(7, aim * 0.7));
      // Never more than a gentle upward glance.
      if (!hit || state.look.y > 0.3) break;
      state.wantTarget.y += (0.8 * aim) / 9;
    }

    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 18);
    state.pos.lerp(state.wantPos, k);
    state.target.lerp(state.wantTarget, k);
    // Smoothing cuts corners on the switchbacks: never let it cut into rock.
    state.pos.y = Math.max(state.pos.y, heightAt(state.pos.x, state.pos.z) + 0.7);
    camera.position.copy(state.pos);
    camera.lookAt(state.target);

    state.frame = (state.frame + 1) % 5;
    if (!state.frame && altitude.current) altitude.current.textContent = `${metres(camera.position.y).toLocaleString()} m`;
  });
  return null;
}

// The trail: packed earth worn into the hillside. A darker, smoother line
// down the middle where feet go, loose pebbles and a few set stones, and
// ragged edges where the path gives way to grass and scree.
function useTrailTextures() {
  return useMemo(() => {
    const W = 512;
    const H = 1024;
    const colour = document.createElement("canvas");
    const bump = document.createElement("canvas");
    colour.width = bump.width = W;
    colour.height = bump.height = H;
    const c = colour.getContext("2d")!;
    const b = bump.getContext("2d")!;
    const random = rng(5);
    // Earth: mottled browns, darker and smoother along the worn line.
    c.fillStyle = "#d2bd9a";
    c.fillRect(0, 0, W, H);
    b.fillStyle = "#808080";
    b.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i += 1) {
      const r = 10 + random() * 60;
      const tone = random();
      c.fillStyle = tone > 0.5 ? `rgba(160,140,112,${0.05 + random() * 0.08})` : `rgba(70,56,42,${0.05 + random() * 0.08})`;
      c.beginPath();
      c.ellipse(random() * W, random() * H, r, r * (0.4 + random() * 0.6), random() * 3, 0, Math.PI * 2);
      c.fill();
    }
    const worn = c.createLinearGradient(0, 0, W, 0);
    worn.addColorStop(0.2, "rgba(60,46,34,0)");
    worn.addColorStop(0.42, "rgba(90,70,50,0.14)");
    worn.addColorStop(0.5, "rgba(90,70,50,0.18)");
    worn.addColorStop(0.58, "rgba(90,70,50,0.14)");
    worn.addColorStop(0.8, "rgba(60,46,34,0)");
    c.fillStyle = worn;
    c.fillRect(0, 0, W, H);
    // Footfalls: faint scuffs in the worn line.
    for (let i = 0; i < 220; i += 1) {
      const x = W * (0.38 + random() * 0.24);
      c.fillStyle = `rgba(48,36,26,${0.06 + random() * 0.08})`;
      c.beginPath();
      c.ellipse(x, random() * H, 7 + random() * 6, 14 + random() * 10, (random() - 0.5) * 0.4, 0, Math.PI * 2);
      c.fill();
    }
    // Pebbles and grit, thicker toward the edges where feet don't sweep them.
    const pebble = (x: number, y: number, r: number) => {
      const shade = 110 + random() * 110;
      const warm = random() * 14;
      c.fillStyle = "rgba(30,22,16,0.45)";
      c.beginPath();
      c.ellipse(x + r * 0.35, y + r * 0.4, r, r * 0.75, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = `rgb(${shade + warm},${shade},${shade - warm})`;
      c.beginPath();
      c.ellipse(x, y, r, r * (0.6 + random() * 0.35), random() * 3, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,250,240,0.35)";
      c.beginPath();
      c.ellipse(x - r * 0.3, y - r * 0.3, r * 0.4, r * 0.25, 0, 0, Math.PI * 2);
      c.fill();
      const g = b.createRadialGradient(x, y, 0, x, y, r * 1.1);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(1, "rgba(128,128,128,0)");
      b.fillStyle = g;
      b.beginPath();
      b.arc(x, y, r * 1.1, 0, Math.PI * 2);
      b.fill();
    };
    for (let i = 0; i < 2600; i += 1) {
      const edge = random() < 0.6;
      const x = edge ? (random() < 0.5 ? random() * W * 0.3 : W - random() * W * 0.3) : random() * W;
      pebble(x, random() * H, 1 + random() * 3.2);
    }
    for (let i = 0; i < 70; i += 1) pebble(random() * W, random() * H, 6 + random() * 10);
    // Ragged edges: the path's width wanders, and grass creeps in.
    const img = c.getImageData(0, 0, W, H);
    const wobble = (y: number, seed: number) =>
      Math.sin(y * 0.011 + seed) * 22 + Math.sin(y * 0.047 + seed * 2.1) * 10 + Math.sin(y * 0.19 + seed * 3.7) * 4;
    for (let y = 0; y < H; y += 1) {
      const left = 70 + wobble(y, 1.3);
      const right = W - 70 + wobble(y, 4.1);
      for (let x = 0; x < W; x += 1) {
        const o = (y * W + x) * 4;
        const d = Math.min(x - left, right - x);
        const a = Math.max(0, Math.min(1, (d + 30) / 60));
        const grass = Math.max(0, Math.min(1, (20 - d) / 50));
        img.data[o] = img.data[o] * (1 - grass * 0.35) + 70 * grass * 0.35;
        img.data[o + 1] = img.data[o + 1] * (1 - grass * 0.35) + 82 * grass * 0.35;
        img.data[o + 2] = img.data[o + 2] * (1 - grass * 0.35) + 44 * grass * 0.35;
        img.data[o + 3] = Math.round(255 * a * a * (0.9 + random() * 0.1));
      }
    }
    c.putImageData(img, 0, 0);
    const make = (canvas: HTMLCanvasElement, srgb: boolean) => {
      const t = new THREE.CanvasTexture(canvas);
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      return t;
    };
    return { map: make(colour, true), bump: make(bump, false) };
  }, []);
}

// Above the snowline the path is a packed track in the snow: boot prints
// down the middle, softer, blue-shadowed snow either side, no stones.
function useSnowTrackTexture() {
  return useMemo(() => {
    const W = 256;
    const H = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const c = canvas.getContext("2d")!;
    const random = rng(19);
    c.fillStyle = "#eef2f8";
    c.fillRect(0, 0, W, H);
    // Trodden snow is a touch greyer and glossier than fresh.
    const trodden = c.createLinearGradient(0, 0, W, 0);
    trodden.addColorStop(0.15, "rgba(150,165,195,0)");
    trodden.addColorStop(0.35, "rgba(150,165,195,0.28)");
    trodden.addColorStop(0.65, "rgba(150,165,195,0.28)");
    trodden.addColorStop(0.85, "rgba(150,165,195,0)");
    c.fillStyle = trodden;
    c.fillRect(0, 0, W, H);
    // Boot prints, left and right, each a shadowed hollow with a lit far lip.
    let y = 10;
    let left = true;
    while (y < H - 30) {
      const x = W / 2 + (left ? -22 : 22) + (random() - 0.5) * 10;
      const turn = (random() - 0.5) * 0.25;
      c.save();
      c.translate(x, y);
      c.rotate(turn);
      c.fillStyle = "rgba(96,116,160,0.45)";
      c.beginPath();
      c.ellipse(0, 0, 10, 30, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.7)";
      c.beginPath();
      c.ellipse(0, -27, 9, 4, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(120,140,180,0.35)";
      for (let k = -22; k < 26; k += 7) c.fillRect(-7, k, 14, 2);
      c.restore();
      // A stride of about 0.7 m at ~200 px a metre down the strip.
      y += 130 + random() * 20;
      left = !left;
    }
    // Sparkle.
    for (let i = 0; i < 1800; i += 1) {
      c.fillStyle = `rgba(255,255,255,${0.4 + random() * 0.6})`;
      c.fillRect(random() * W, random() * H, 1, 1);
    }
    // Soft edges into the fresh snow either side.
    const img = c.getImageData(0, 0, W, H);
    for (let yy = 0; yy < H; yy += 1) {
      const l = 40 + Math.sin(yy * 0.02) * 8;
      const r = W - 40 + Math.sin(yy * 0.017 + 2) * 8;
      for (let x = 0; x < W; x += 1) {
        const d = Math.min(x - l, r - x);
        img.data[(yy * W + x) * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, (d + 24) / 48)));
      }
    }
    c.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  }, []);
}

function Trail() {
  const { map, bump } = useTrailTextures();
  const snowMap = useSnowTrackTexture();
  const geometry = useMemo(() => {
    const N = 900;
    const across = 7;
    const positions: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const index: number[] = [];
    let walked = 0;
    let prev = trailPoint(0);
    for (let i = 0; i < N; i += 1) {
      const s = i / (N - 1);
      const p = trailPoint(s);
      const q = trailPoint(Math.min(1, s + 0.002));
      walked += Math.hypot(p[0] - prev[0], p[2] - prev[2]);
      prev = p;
      const len = Math.hypot(q[0] - p[0], q[2] - p[2]) || 1;
      const rx = -(q[2] - p[2]) / len;
      const rz = (q[0] - p[0]) / len;
      // Wider where it's easy going, narrower where it squeezes past rock.
      const width = 1.9 + Math.sin(walked * 0.21) * 0.3 + Math.sin(walked * 0.83 + 1) * 0.15;
      for (let k = 0; k < across; k += 1) {
        const o = (k / (across - 1) - 0.5) * width;
        const x = p[0] + rx * o;
        const z = p[2] + rz * o;
        const y = heightAt(x, z);
        positions.push(x, y + 0.03, z);
        uvs.push(k / (across - 1), walked / 5);
        // Earth below the snowline, fading out as the snow track fades in
        // (the alpha here is the earth's; the snow mesh uses its inverse).
        const snow = THREE.MathUtils.smoothstep(y, 17, 21);
        colors.push(1.2, 1.15, 1.05, 1 - snow);
      }
      if (i) {
        for (let k = 0; k < across - 1; k += 1) {
          const a = (i - 1) * across + k;
          const b = i * across + k;
          // Wound to face up, so it shows from above (and lights correctly).
          index.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
    g.setIndex(index);
    g.computeVertexNormals();
    // The snow track: the same strip, its alpha the inverse of the earth's.
    const snowy = g.clone();
    const col = snowy.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < col.count; i += 1) col.setXYZW(i, 1, 1, 1, 1 - col.getW(i));
    return { earth: g, snow: snowy };
  }, []);
  useEffect(() => () => { geometry.earth.dispose(); geometry.snow.dispose(); map.dispose(); bump.dispose(); snowMap.dispose(); }, [geometry, map, bump, snowMap]);
  return (
    <>
      <mesh geometry={geometry.earth} receiveShadow>
        <meshStandardMaterial map={map} bumpMap={bump} bumpScale={1.2} vertexColors transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} roughness={0.95} />
      </mesh>
      <mesh geometry={geometry.snow} receiveShadow>
        <meshStandardMaterial map={snowMap} vertexColors transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} roughness={0.7} />
      </mesh>
    </>
  );
}

// Stones scattered along both edges, and grass tufts on the lower slopes.
// A tuft of mountain grass: a dozen thin blades arching out from one root,
// darker at the base, sun-bleached at the tips.
function useTuftGeometry() {
  return useMemo(() => {
    const random = rng(23);
    const positions: number[] = [];
    const colours: number[] = [];
    const base = new THREE.Color("#2f3d1f");
    const tip = new THREE.Color("#9aa463");
    for (let k = 0; k < 12; k += 1) {
      const turn = random() * Math.PI * 2;
      const lean = 0.25 + random() * 0.55;
      const h = 0.18 + random() * 0.22;
      const w = 0.012 + random() * 0.01;
      const dx = Math.cos(turn);
      const dz = Math.sin(turn);
      // Three segments per blade, bending further out as it rises.
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 3; j += 1) {
        const t = j / 3;
        const out = Math.sin(lean) * h * t * t * 1.2;
        pts.push(new THREE.Vector3(dx * out, h * t * Math.cos(lean * t), dz * out));
      }
      for (let j = 0; j < 3; j += 1) {
        const a = pts[j];
        const b = pts[j + 1];
        const wa = w * (1 - j / 3);
        const wb = w * (1 - (j + 1) / 3);
        const sx = -dz;
        const sz = dx;
        const quad = [
          [a.x - sx * wa, a.y, a.z - sz * wa], [a.x + sx * wa, a.y, a.z + sz * wa], [b.x + sx * wb, b.y, b.z + sz * wb],
          [a.x - sx * wa, a.y, a.z - sz * wa], [b.x + sx * wb, b.y, b.z + sz * wb], [b.x - sx * wb, b.y, b.z - sz * wb],
        ];
        quad.forEach(([x, y, z]) => {
          positions.push(x, y, z);
          const c = base.clone().lerp(tip, Math.min(1, y / 0.32));
          colours.push(c.r, c.g, c.b);
        });
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
    g.computeVertexNormals();
    return g;
  }, []);
}

function Verge() {
  const tuftGeometry = useTuftGeometry();
  const rocks = useRef<THREE.InstancedMesh>(null);
  const grass = useRef<THREE.InstancedMesh>(null);
  const { stones, tufts } = useMemo(() => {
    const random = rng(77);
    const stones: { x: number; y: number; z: number; s: number; r: number }[] = [];
    const tufts: { x: number; y: number; z: number; s: number; r: number; tint: number }[] = [];
    for (let i = 0; i < 1400; i += 1) {
      const s = random();
      const p = trailPoint(s);
      const q = trailPoint(Math.min(1, s + 0.002));
      const len = Math.hypot(q[0] - p[0], q[2] - p[2]) || 1;
      const side = (random() > 0.5 ? 1 : -1) * (0.85 + random() * 2.4);
      const x = p[0] - ((q[2] - p[2]) / len) * side;
      const z = p[2] + ((q[0] - p[0]) / len) * side;
      const y = heightAt(x, z);
      if ((nearTrail(x, z)?.w ?? 0) > 0.05) continue; // keep camps clear
      // Loose stones and grass only below the snowline; up high the trail is clean snow.
      if (y > 16) continue;
      if (random() < 0.4) stones.push({ x, y, z, s: 0.06 + random() * random() * 0.5, r: random() * 6 });
      else if (y < 17) for (let k = 0; k < 3; k += 1) tufts.push({ x: x + (random() - 0.5) * 0.5, y, z: z + (random() - 0.5) * 0.5, s: 0.5 + random() * 0.8, r: random() * 6, tint: random() });
    }
    return { stones, tufts };
  }, []);

  useEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const color = new THREE.Color();
    if (rocks.current) {
      stones.forEach((st, i) => {
        q.setFromEuler(e.set(st.r, st.r * 1.7, st.r * 0.6));
        m.compose(new THREE.Vector3(st.x, st.y + st.s * 0.3, st.z), q, new THREE.Vector3(st.s * 1.3, st.s * 0.8, st.s));
        rocks.current!.setMatrixAt(i, m);
        rocks.current!.setColorAt(i, color.setHSL(0.08, 0.05, 0.38 + (st.r % 1) * 0.2));
      });
      rocks.current.instanceMatrix.needsUpdate = true;
      if (rocks.current.instanceColor) rocks.current.instanceColor.needsUpdate = true;
      rocks.current.computeBoundingSphere();
    }
    if (grass.current) {
      tufts.forEach((t, i) => {
        q.setFromEuler(e.set((t.tint - 0.5) * 0.2, t.r, (t.r % 1 - 0.5) * 0.2));
        m.compose(new THREE.Vector3(t.x, t.y - 0.02, t.z), q, new THREE.Vector3(t.s, t.s * (0.8 + t.tint * 0.5), t.s));
        grass.current!.setMatrixAt(i, m);
        grass.current!.setColorAt(i, color.setRGB(0.85 + t.tint * 0.25, 0.9 + t.tint * 0.15, 0.8 + (1 - t.tint) * 0.15));
      });
      grass.current.instanceMatrix.needsUpdate = true;
      if (grass.current.instanceColor) grass.current.instanceColor.needsUpdate = true;
      grass.current.computeBoundingSphere();
    }
  }, [stones, tufts]);

  return (
    <>
      <instancedMesh ref={rocks} args={[undefined, undefined, stones.length]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={grass} args={[tuftGeometry, undefined, tufts.length]}>
        <meshStandardMaterial roughness={1} side={THREE.DoubleSide} vertexColors />
      </instancedMesh>
    </>
  );
}

/* ── Scene ──────────────────────────────────────────────────────────────── */

// Like three's compileAsync, which shares the GPU's parallel compiling, but
// it doesn't fall over when a material is rebuilt or dropped while it waits.
function compileAll(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const pending = gl.compile(scene, camera);
  return new Promise<void>((resolve) => {
    const check = () => {
      pending.forEach((m) => {
        const program = (gl.properties.get(m) as { currentProgram?: { isReady: () => boolean } }).currentProgram;
        if (!program || program.isReady()) pending.delete(m);
      });
      if (pending.size === 0) resolve();
      else window.setTimeout(check, 10);
    };
    check();
  });
}

function Ready({ onReady, night, staged }: { onReady: () => void; night: boolean; staged: number }) {
  const fired = useRef(false);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  // Nothing that casts a shadow moves, so draw the shadow map once (and again
  // when day turns to night, or another camp is added) instead of every frame.
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl, night, staged]);
  // Three builds a shader the first time an object is drawn and uploads a
  // texture the first time it is sampled: done lazily, each one stalls a
  // frame the moment something new swings into view. So build them all up
  // front, in parallel where the browser can (KHR_parallel_shader_compile),
  // without blocking the page, and again whenever more of the world is added.
  const warm = () =>
    compileAll(gl, scene, camera).then(() => {
      const seen = new Set<THREE.Texture>();
      scene.traverse((o) => {
        const material = (o as THREE.Mesh).material;
        for (const m of Array.isArray(material) ? material : material ? [material] : []) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) seen.add(v);
        }
      });
      seen.forEach((t) => gl.initTexture(t));
    });
  useEffect(() => {
    if (fired.current) void warm();
  }, [night, staged]); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame(() => {
    if (!fired.current) {
      fired.current = true;
      void warm().then(onReady);
    }
  });
  return null;
}

// The sky at golden hour: the sun just over the far peaks, with a warm glow
// around it. The scene is drawn without tone mapping, which would leave the
// sky's bright light blown out to white, so the sky maps its own.
function GoldenSky() {
  const sky = useRef<THREE.Mesh<THREE.BoxGeometry, THREE.ShaderMaterial>>(null);
  useEffect(() => {
    const m = sky.current?.material;
    if (!m) return;
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <tonemapping_fragment>",
        `{
          vec3 x = gl_FragColor.rgb * 0.62;
          vec3 c = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
          // Golden hour: amber light pooled round the low sun, a warm band
          // along the horizon, and the sun's own disc.
          float toSun = max(dot(direction, vSunDirection), 0.0);
          float low = 1.0 - smoothstep(-0.02, 0.4, direction.y);
          c = mix(c, vec3(1.0, 0.74, 0.46), low * 0.3);
          c = mix(c, vec3(1.0, 0.6, 0.26), pow(toSun, 10.0) * 0.6 * (0.4 + 0.6 * low));
          c = mix(c, vec3(1.0, 0.8, 0.5), pow(toSun, 120.0) * 0.7);
          c = mix(c, vec3(1.0, 0.93, 0.74), smoothstep(0.99935, 0.99955, toSun));
          gl_FragColor.rgb = c;
        }
        #include <tonemapping_fragment>`,
      );
    };
    m.needsUpdate = true;
  }, []);
  return <Sky ref={sky} distance={4500} sunPosition={SKY_SUN} turbidity={9} rayleigh={2.4} mieCoefficient={0.007} mieDirectionalG={0.9} />;
}

function World({ projects, progress, playhead, night, reducedMotion, altitude, onReady }: Props) {
  const places = useMemo(() => inscriptions(), []);
  const panels = useMemo(() => CHAPTERS.map((c) => panelFor(c, projects)), [projects]);

  // Load what the first view shows, then the camps further up one at a time
  // while the reader is still looking at the first: the loader only ever
  // waits for what is on screen.
  const [staged, setStaged] = useState(2);
  const [ready, setReady] = useState(false);
  const loaded = useCallback(() => {
    setReady(true);
    onReady();
  }, [onReady]);
  useEffect(() => {
    if (!ready || staged >= CHAPTERS.length) return;
    return whenIdle(() => setStaged((n) => n + 1), 400);
  }, [ready, staged]);

  // Golden hour from the south-west, or a moonlit night.
  const sun: [number, number, number] = night ? [-80, 90, -60] : SUN;

  const haze = night ? "#0b1222" : "#dcc7b4";

  return (
    <>
      <color attach="background" args={[haze]} />
      <fogExp2 attach="fog" args={[haze, night ? 0.0042 : 0.0034]} />
      {night ? (
        <Stars radius={300} depth={80} count={5000} factor={5} saturation={0} fade speed={0.3} />
      ) : (
        <GoldenSky />
      )}
      <hemisphereLight args={[night ? "#5a6fa6" : "#b8c9ea", night ? "#0b0d14" : "#5b4630", night ? 0.45 : 0.75]} />
      <directionalLight
        position={sun}
        intensity={night ? 0.9 : 3.4}
        color={night ? "#a8bcff" : "#ffe6c8"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-WORLD / 2}
        shadow-camera-right={WORLD / 2}
        shadow-camera-top={WORLD / 2}
        shadow-camera-bottom={-WORLD / 2}
        shadow-camera-near={1}
        shadow-camera-far={600}
        shadow-bias={-0.0005}
        shadow-radius={8}
        shadow-blurSamples={16}
        shadow-normalBias={0.4}
      />

      <Terrain />
      <Trees />
      <Water night={night} />
      <Clouds night={night} shots={STOP_SHOTS} />
      <Trail />
      <Verge />

      {CHAPTERS.map((chapter, i) => {
        if (i >= staged) return null;
        const at = places[i];
        if (at.kind === "arch") return <Arch key={chapter.key} chapter={chapter} at={at} projects={projects} />;
        if (at.kind === "face" || at.kind === "far")
          return (
            <group key={chapter.key}>
              <Inscribed chapter={chapter} at={at} projects={projects} />
              {chapter.key === "projects" && <WallFlags at={at} panel={panels[i]} projects={projects} />}
            </group>
          );
        if (at.kind === "banner") return <SummitFlag key={chapter.key} at={at} chapter={chapter} projects={projects} />;
        if (at.kind === "snow") return <Inscribed key={chapter.key} chapter={chapter} at={at} projects={projects} />;
        return <Stone key={chapter.key} chapter={chapter} at={at} projects={projects} />;
      })}

      <Flight progress={progress} playhead={playhead} reducedMotion={reducedMotion} altitude={altitude} />

      <Ready onReady={loaded} night={night} staged={staged} />
    </>
  );
}

// The scene ignores which chapter is active (it reads the scroll directly),
// so scrolling between chapters never re-renders the world, and a rebuilt
// callback or element ref never does either.
const IGNORED: (keyof Props)[] = ["active", "onReady", "eventRoot"];
const StillWorld = memo(World, (a, b) => {
  const keys = Object.keys(a) as (keyof Props)[];
  return keys.every((k) => IGNORED.includes(k) || a[k] === b[k]);
});

export default function ExploreScene(props: Props) {
  // Start sharp; if the frame rate sags, step down to fewer pixels and stay
  // there. Flipping back and forth resizes every buffer and stutters. Only
  // watch once the climb has loaded: the loading frames are always slow.
  const [dpr, setDpr] = useState(1.5);
  const [watching, setWatching] = useState(false);
  const { onReady } = props;
  const ready = useCallback(() => {
    onReady();
    setWatching(true);
  }, [onReady]);
  return (
    <Canvas
      className="xp-canvas"
      shadows={{ type: THREE.VSMShadowMap }}
      dpr={dpr}
      // Straight to the screen: no post-processing passes, native
      // multisampling for clean edges, and colours left as painted. The
      // vignette is a CSS gradient over the canvas, which costs nothing.
      flat
      gl={{ antialias: true, stencil: false, powerPreference: "high-performance" }}
      camera={{ fov: 50, near: 0.05, far: 1500, position: STOP_SHOTS[0].pos }}
      eventSource={props.eventRoot as RefObject<HTMLElement> | undefined}
      eventPrefix="client"
      fallback={<p className="xp-nogl">This view needs WebGL, which your browser has turned off.</p>}
    >
      {watching && <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.25))} />}
      <StillWorld {...props} onReady={ready} />
    </Canvas>
  );
}
