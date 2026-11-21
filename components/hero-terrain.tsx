"use client";

import { useEffect, useRef } from "react";

/*
 * A small hand-written WebGL2 terrain renderer. No libraries.
 *
 * The range is an analytic heightfield, modelled on photographs of each peak.
 * Rendering is split so the per-frame cost stays small:
 *   0. Height bake (once): the field, at mesh resolution, into a texture the
 *      vertex shader lifts a flat grid with.
 *   1. Detail bake (once): normals, snow, rock and occlusion, from the same
 *      analytic field at three times the mesh resolution.
 *   2. Shadow bake (only when the sun moves): soft shadows marched across
 *      the field into a terrain-space map.
 *   3. Terrain pass (per frame): a few texture reads and the lighting model.
 * Nothing renders while the hero is off screen or the scene is at rest.
 */

/* ── Mesh ─────────────────────────────────────────────────────────────── */

// The heightfield lives on the GPU: it is baked once into a texture and the
// vertex shader lifts a flat grid with it. JavaScript only builds indices.
const NX = 512;
const NZ = 320;
const X0 = -2.1;
const X1 = 2.1;
const Z0 = 0;
const Z1 = 2.6;
const H_MAX = 1.15;

function buildIndices() {
  const indices = new Uint32Array((NX - 1) * (NZ - 1) * 6);
  let p = 0;
  for (let j = 0; j < NZ - 1; j += 1) {
    for (let i = 0; i < NX - 1; i += 1) {
      const a = j * NX + i;
      const c = a + NX;
      indices[p++] = a;
      indices[p++] = c;
      indices[p++] = a + 1;
      indices[p++] = a + 1;
      indices[p++] = c;
      indices[p++] = c + 1;
    }
  }
  return indices;
}

/* ── Matrices ───────────────────────────────────────────────────────────── */

type Vec3 = [number, number, number];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
}

function lookAt(eye: Vec3, target: Vec3, up: Vec3) {
  const z = norm(sub(eye, target));
  const x = norm(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
}

function multiply(a: Float32Array, b: Float32Array) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c += 1)
    for (let r = 0; r < 4; r += 1)
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return out;
}

/* ── Shaders ────────────────────────────────────────────────────────────── */

// Grid <-> world mapping, shared by every pass.
const COORDS = `
uniform vec4 uBounds;        // x0, z0, 1/width, 1/depth
uniform vec2 uGrid;          // NX, NZ
uniform float uHMax;
vec2 uvOf(vec2 xz) {
  return (((xz - uBounds.xy) * uBounds.zw) * (uGrid - 1.0) + 0.5) / uGrid;
}
vec2 xzOf(vec2 uv) {
  return (uv * uGrid - 0.5) / (uGrid - 1.0) / uBounds.zw + uBounds.xy;
}
`;

// The baked heightfield: 16 bits split over R (high) and G (low). The decode
// is linear, so hardware filtering still interpolates heights correctly.
const GROUND = `
uniform sampler2D uHeight;
float ground(vec2 xz) {
  vec2 uv = uvOf(xz);
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return -1.0;
  vec2 hv = texture(uHeight, uv).rg;
  return (hv.x + hv.y / 255.0) * uHMax;
}
`;

const NOISE = `
float hash(ivec2 i) {
  uvec2 q = uvec2(i + 65536);
  uint h = q.x * 0x8da6b343u + q.y * 0xd8163841u;
  h ^= h >> 15; h *= 0x2c1b3c6du; h ^= h >> 12; h *= 0x297a2d39u; h ^= h >> 15;
  return float(h >> 8) / 16777216.0;
}
// Gradient noise in roughly [-1, 1]: smooth, without value noise's blockiness.
float vnoise(vec2 p) {
  vec2 fl = floor(p);
  ivec2 i = ivec2(fl);
  vec2 f = p - fl;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a0 = hash(i) * 6.2831853;
  float a1 = hash(i + ivec2(1, 0)) * 6.2831853;
  float a2 = hash(i + ivec2(0, 1)) * 6.2831853;
  float a3 = hash(i + ivec2(1, 1)) * 6.2831853;
  float a = dot(vec2(cos(a0), sin(a0)), f);
  float b = dot(vec2(cos(a1), sin(a1)), f - vec2(1.0, 0.0));
  float c = dot(vec2(cos(a2), sin(a2)), f - vec2(0.0, 1.0));
  float d = dot(vec2(cos(a3), sin(a3)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 1.6;
}
const mat2 TURN = mat2(1.6, 1.2, -1.2, 1.6); // rotate ~37° and scale by 2
// Fractal noise in roughly [0, 1].
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * (vnoise(p) * 0.5 + 0.5); p = TURN * p + vec2(3.1, 1.7); a *= 0.5; }
  return s;
}
`;

/*
 * The range, authored as seen from the camera (x to the right, z into the
 * distance). Peaks are faceted: each face is a plane leaning away from the
 * summit, so the arêtes fall exactly where faces meet, as on the real
 * mountains. Couloirs score each face along its fall line and fade out on the
 * arêtes, which keeps the ridges knife-sharp.
 */
const TERRAIN = `
${NOISE}
float ridged(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  float weight = 1.0;
  for (int o = 0; o < 7; o++) {
    float n = 1.0 - abs(vnoise(p));
    n *= n * weight;
    weight = min(1.0, n * 1.6);
    sum += n * amp;
    p = TURN * p + vec2(1.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}

// ang: the direction each face looks, in degrees (0 = right, -90 = toward the
// viewer). reach: how far each face runs; 0 switches a face off.
float peak(vec2 p, vec2 c, float h, float r, vec4 ang, vec4 reach, float sharp, float gully, float seed, float nG) {
  vec2 q = (p - c) / r;
  float d1 = -9.0;
  float d2 = -9.0;
  float along = 0.0;
  for (int i = 0; i < 4; i++) {
    if (reach[i] <= 0.0) continue;
    float a = radians(ang[i]);
    vec2 n = vec2(cos(a), sin(a));
    float di = dot(q, n) / reach[i];
    if (di > d1) { d2 = d1; d1 = di; along = dot(q, vec2(-n.y, n.x)); }
    else d2 = max(d2, di);
  }
  float d = max(d1, 0.55 * length(q));
  float body = pow(max(0.0, 1.0 - d), sharp);
  float onFace = smoothstep(0.0, 0.14, d1 - d2) * smoothstep(0.04, 0.35, d);
  float g = pow(0.5 + 0.5 * sin(along * 17.0 + seed + nG * 3.2), 2.0);
  return h * (body - gully * onFace * g * max(0.0, 1.0 - d) * 0.16);
}

// A ridge from a (height ha) to b (height hb), w wide, with couloirs on its flanks.
float arete(vec2 p, vec2 a, float ha, vec2 b, float hb, float w, float gully, float seed, float nG) {
  vec2 v = b - a;
  float len = length(v);
  float t = clamp(dot(p - a, v) / (len * len), 0.0, 1.0);
  float d = length(p - a - v * t) / w;
  float body = pow(max(0.0, 1.0 - d), 1.35);
  float g = pow(0.5 + 0.5 * sin(t * len * 36.0 + seed + nG * 2.6), 3.0);
  return mix(ha, hb, t) * (body - gully * smoothstep(0.06, 0.4, d) * g * max(0.0, 1.0 - d) * 0.12);
}

float sculpt(vec2 p, float nG) {
  // A far range closes the horizon: a ragged crest of lesser peaks, not a ramp.
  float back = clamp((p.y - 1.1) / 1.3, 0.0, 1.0);
  float crest = ridged(vec2(p.x * 1.7, p.y * 0.5) + vec2(7.3, 2.1));
  float h = back * (0.2 + 0.5 * crest * crest);

  // Annapurna I: the broad south wall, far left, scored top to bottom.
  h = max(h, arete(p, vec2(-2.5, 2.25), 0.52, vec2(-1.55, 2.2), 0.74, 0.44, 1.0, 0.0, nG));
  h = max(h, arete(p, vec2(-1.55, 2.2), 0.74, vec2(-0.85, 2.3), 0.6, 0.42, 1.0, 1.0, nG));
  h = max(h, peak(p, vec2(-1.55, 2.18), 0.8, 0.55, vec4(-95.0, -10.0, 90.0, 175.0), vec4(1.0, 1.5, 1.2, 1.5), 1.2, 0.9, 2.0, nG));

  // Machapuchare as seen from Pokhara: one steep pyramid with the fishtail's
  // second tip just behind, and long lower arms either side.
  h = max(h, peak(p, vec2(-1.12, 1.0), 0.86, 0.38, vec4(-128.0, -52.0, 75.0, 0.0), vec4(1.0, 1.05, 1.2, 0.0), 1.6, 0.8, 3.0, nG));
  h = max(h, peak(p, vec2(-1.03, 1.06), 0.8, 0.3, vec4(-128.0, -52.0, 75.0, 0.0), vec4(1.0, 1.0, 1.2, 0.0), 1.7, 0.5, 4.0, nG));
  h = max(h, arete(p, vec2(-1.14, 0.98), 0.46, vec2(-1.85, 0.86), 0.17, 0.2, 0.8, 5.0, nG));
  h = max(h, arete(p, vec2(-0.98, 1.0), 0.44, vec2(-0.42, 0.92), 0.2, 0.2, 0.8, 6.0, nG));

  // Sagarmatha: a three-sided pyramid, set far back.
  h = max(h, peak(p, vec2(-0.05, 2.05), 1.0, 0.8, vec4(-120.0, 20.0, 150.0, 0.0), vec4(1.0, 0.95, 1.0, 0.0), 1.3, 0.7, 7.0, nG));
  // The ridge down to the South Col and up to Lhotse, then Lhotse's own wall.
  h = max(h, arete(p, vec2(-0.05, 2.05), 0.84, vec2(0.5, 2.0), 0.74, 0.3, 0.6, 8.0, nG));
  h = max(h, peak(p, vec2(0.55, 2.0), 0.9, 0.55, vec4(-95.0, 0.0, 90.0, 180.0), vec4(0.9, 1.1, 1.2, 0.8), 1.35, 0.9, 9.0, nG));
  h = max(h, arete(p, vec2(0.55, 2.0), 0.78, vec2(1.35, 2.1), 0.55, 0.32, 0.8, 10.0, nG));

  // Nuptse: a jagged wall in front, hiding Sagarmatha's base.
  h = max(h, arete(p, vec2(-0.8, 1.45), 0.5, vec2(-0.35, 1.4), 0.64, 0.3, 0.9, 11.0, nG));
  h = max(h, arete(p, vec2(-0.35, 1.4), 0.64, vec2(0.3, 1.45), 0.58, 0.3, 0.9, 12.0, nG));
  h = max(h, peak(p, vec2(-0.32, 1.4), 0.68, 0.28, vec4(-90.0, 0.0, 90.0, 180.0), vec4(1.0, 1.4, 1.2, 1.4), 1.5, 0.5, 13.0, nG));

  // Ama Dablam: the slender spire, its two arms, and the hanging glacier
  // (the dablam) on the face beneath the summit.
  h = max(h, peak(p, vec2(1.12, 0.98), 0.8, 0.24, vec4(-100.0, -10.0, 80.0, 170.0), vec4(1.0, 1.2, 1.1, 1.2), 1.45, 1.1, 14.0, nG));
  h = max(h, arete(p, vec2(1.1, 0.98), 0.52, vec2(0.62, 0.86), 0.24, 0.18, 0.7, 15.0, nG));
  h = max(h, arete(p, vec2(1.14, 0.98), 0.5, vec2(1.68, 0.88), 0.22, 0.18, 0.7, 16.0, nG));
  h = max(h, peak(p, vec2(1.12, 0.91), 0.58, 0.17, vec4(-100.0, -10.0, 80.0, 170.0), vec4(1.0, 1.6, 1.0, 1.6), 1.25, 0.0, 0.0, nG));

  // Eastern shoulder.
  h = max(h, peak(p, vec2(1.85, 1.7), 0.58, 0.6, vec4(-110.0, -20.0, 90.0, 180.0), vec4(1.0, 1.0, 1.0, 1.2), 1.2, 0.8, 17.0, nG));
  return h;
}

float terrain(vec2 xz) {
  // The camera looks down +z, which puts world +x on screen left, so mirror.
  vec2 p = vec2(-xz.x, xz.y);
  // A gentle warp lets every arête wander instead of running ruler-straight.
  vec2 w = vec2(vnoise(p * 1.4 + 3.1), vnoise(p * 1.4 + 7.7)) * 0.05
         + vec2(vnoise(p * 3.3 + 1.3), vnoise(p * 3.3 + 5.2)) * 0.018;
  float nG = vnoise(p * 5.0 + 11.0);
  float shape = sculpt(p + w, nG);
  // Erosion: broad and low, so it reads as ridges and valleys rather than
  // walls; restrained on the summits so their silhouettes stay recognisable.
  float detail = ridged(p * 2.4 + vec2(4.1, 1.7));
  float erosion = (detail - 0.45) * (0.05 + 0.07 * (1.0 - shape));
  float foothills = 0.06 * (fbm(p * 1.6 + 2.0) - 0.25) * smoothstep(0.0, 0.8, xz.y);
  return (max(0.0, shape + erosion) + foothills) * 0.95;
}
`;

const QUAD_VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// Pass 0, once: the heightfield at grid resolution.
const HEIGHT_FRAG = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUv;
out vec4 outColor;
${COORDS}
${TERRAIN}
void main() {
  float v = clamp(terrain(xzOf(vUv)) / uHMax, 0.0, 1.0) * 255.0;
  outColor = vec4(floor(v) / 255.0, fract(v), 0.0, 1.0);
}`;

// Pass 1, once: surface detail at far higher resolution than the mesh, from
// the analytic terrain itself. Normals, snow, rock tone, occlusion.
const DETAIL_FRAG = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUv;
layout(location = 0) out vec4 outSurface;
layout(location = 1) out vec4 outLight;
uniform float uTexel;
${COORDS}
${GROUND}
${TERRAIN}
float flute(vec3 p) {
  float warp = fbm(p.xz * 3.1 + p.y * 1.7) * 2.4;
  return fbm(vec2(p.x * 34.0 + p.z * 20.0 + warp, p.y * 2.6 + warp * 0.3));
}
void main() {
  vec2 xz = xzOf(vUv);
  float e = uTexel;
  float h0 = terrain(xz);
  float hx0 = terrain(xz - vec2(e, 0.0));
  float hx1 = terrain(xz + vec2(e, 0.0));
  float hz0 = terrain(xz - vec2(0.0, e));
  float hz1 = terrain(xz + vec2(0.0, e));
  vec3 fine = normalize(vec3(hx0 - hx1, 2.0 * e, hz0 - hz1));

  // Medium scale, from the baked field: what decides where snow can hold.
  const float m = 0.014;
  float mx0 = ground(xz - vec2(m, 0.0));
  float mx1 = ground(xz + vec2(m, 0.0));
  float mz0 = ground(xz - vec2(0.0, m));
  float mz1 = ground(xz + vec2(0.0, m));
  vec3 medium = normalize(vec3(mx0 - mx1, 2.0 * m, mz0 - mz1));
  float cavity = clamp((mx0 + mx1 + mz0 + mz1 - 4.0 * ground(xz)) / (m * m) * 0.012, -1.0, 1.0);

  // Spindrift flutes: fine runnels down every steep face.
  vec3 p = vec3(xz.x, h0, xz.y);
  const float fe = 0.0015;
  float f0 = flute(p);
  vec3 grad = vec3(flute(p + vec3(fe, 0, 0)) - f0, flute(p + vec3(0, fe, 0)) - f0, flute(p + vec3(0, 0, fe)) - f0) / fe;
  vec3 n = normalize(fine - grad * 0.009 * (0.2 + 1.0 - fine.y));

  // Snow: above a ragged snowline, wherever the slope lets it hold. It
  // gathers in couloirs and blows off convex buttresses, so steep faces read
  // as white runnels between ribs of dark rock.
  // Patches stretch down the fall line, so snow and rock lie in streaks.
  float patchy = fbm(vec2(xz.x * 22.0 + xz.y * 9.0, h0 * 5.0));
  float line = 0.24 + (patchy - 0.5) * 0.12;
  float altitude = smoothstep(line - 0.03, line + 0.06, h0);
  // High up, even steep walls stay white: fluted ice, as on Ama Dablam.
  float hold = smoothstep(0.14 + patchy * 0.16, 0.3 + patchy * 0.12, medium.y + (f0 - 0.5) * 0.9 + cavity * 0.6 + smoothstep(0.42, 0.7, h0) * 0.3);
  float snow = altitude * clamp(hold + smoothstep(0.55, 0.85, h0) * 0.25, 0.0, 1.0);

  // Rock: mottled, with pale sedimentary bands like Sagarmatha's yellow band.
  float tone = fbm(xz * 31.0 + h0 * 9.0);
  float band = smoothstep(0.55, 0.8, sin(h0 * 46.0 + fbm(xz * 6.0) * 4.0) * 0.5 + 0.5) * smoothstep(0.35, 0.6, h0);

  // Ambient occlusion: how much sky each point sees, from horizon angles.
  float ao = 0.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.7854 + 0.4;
    vec2 dir = vec2(cos(a), sin(a));
    float horizon = 0.0;
    for (int k = 1; k <= 5; k++) {
      float t = 0.012 * float(k * k);
      float dh = ground(xz + dir * t) - h0;
      horizon = max(horizon, dh / sqrt(dh * dh + t * t));
    }
    ao += 1.0 - horizon;
  }
  ao = ao / 8.0 * (1.0 - max(cavity, 0.0) * 0.35);

  outSurface = vec4(n.x * 0.5 + 0.5, n.z * 0.5 + 0.5, snow, tone);
  outLight = vec4(ao, band, 0.0, 1.0);
}`;

// Pass 2, only when the sun moves: soft shadows marched across the field.
const SHADOW_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec3 uSun;
uniform sampler2D uSurface;
${COORDS}
${GROUND}
void main() {
  vec2 xz = xzOf(vUv);
  vec4 s = texture(uSurface, vUv);
  vec3 n = vec3(s.r * 2.0 - 1.0, 0.0, s.g * 2.0 - 1.0);
  n.y = sqrt(max(0.0, 1.0 - n.x * n.x - n.z * n.z));
  vec3 p = vec3(xz.x, ground(xz), xz.y) + n * 0.005;
  float res = 1.0;
  float t = 0.01;
  for (int i = 0; i < 48; i++) {
    vec3 q = p + uSun * t;
    if (q.y > uHMax) break;
    float d = q.y - ground(q.xz);
    if (d < 0.0) { res = 0.0; break; }
    res = min(res, 10.0 * d / t);
    t += clamp(d * 0.6, 0.008, 0.08);
  }
  outColor = vec4(clamp(res, 0.0, 1.0), 0.0, 0.0, 1.0);
}`;

const VERT = `#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uHeight;
uniform mat4 uMvp;
uniform vec3 uEye;
${COORDS}
out vec3 vPos;
out float vDist;
void main() {
  int nx = int(uGrid.x);
  ivec2 cell = ivec2(gl_VertexID % nx, gl_VertexID / nx);
  vec2 hv = texelFetch(uHeight, cell, 0).rg;
  vec2 xz = uBounds.xy + vec2(cell) / (uGrid - 1.0) / uBounds.zw;
  vPos = vec3(xz.x, (hv.x + hv.y / 255.0) * uHMax, xz.y);
  vDist = distance(vPos, uEye);
  gl_Position = uMvp * vec4(vPos, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vPos;
in float vDist;
uniform vec3 uSun;
uniform vec3 uSunColor;
uniform vec3 uSky;
uniform vec3 uRock;
uniform vec3 uSnow;
uniform vec3 uHaze;
uniform vec3 uFog;
uniform vec3 uEye;
uniform sampler2D uSurface;
uniform sampler2D uLight;
uniform sampler2D uShadow;
${COORDS}
out vec4 outColor;
void main() {
  vec2 uv = uvOf(vPos.xz);
  vec4 s = texture(uSurface, uv);
  vec4 l = texture(uLight, uv);
  vec3 n = vec3(s.r * 2.0 - 1.0, 0.0, s.g * 2.0 - 1.0);
  n.y = sqrt(max(0.0, 1.0 - n.x * n.x - n.z * n.z));
  float snow = s.b;
  float ao = l.r;
  float lit = texture(uShadow, uv).r;

  // Rock darkens toward the valleys, where there is soil rather than stone.
  vec3 rock = uRock * (0.6 + 0.8 * s.a);
  rock = mix(rock, rock * vec3(2.2, 1.7, 1.1), l.g * 0.6);
  rock *= mix(0.55, 1.0, smoothstep(0.08, 0.3, vPos.y));
  vec3 albedo = mix(rock, uSnow, snow);

  float ndl = max(dot(n, uSun), 0.0);
  vec3 colour = albedo * (
    uSunColor * ndl * lit +
    uSky * (0.4 + 0.6 * n.y) * (0.35 + 0.65 * ao) +
    uSunColor * 0.05 * max(dot(n, -uSun * vec3(1, 0, 1)), 0.0) * ao
  );
  vec3 view = normalize(uEye - vPos);
  colour += uSunColor * pow(max(dot(reflect(-uSun, n), view), 0.0), 28.0) * snow * lit * 0.16;

  colour = mix(colour, uHaze, smoothstep(1.6, 4.4, vDist) * 0.42);
  colour = colour / (1.0 + colour * 0.3);
  colour = pow(colour, vec3(1.0 / 2.2));

  float fog = clamp(max(smoothstep(2.4, 4.6, vDist) * 0.7, (1.0 - smoothstep(0.0, 0.15, vPos.y)) * 0.8), 0.0, 1.0);
  outColor = vec4(mix(colour, uFog, fog), 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vert));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "link");
  }
  return program;
}

/* ── Theme colours, read from the page so the range belongs to it ────────── */

function readColour(name: string): Vec3 {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return [0.5, 0.5, 0.5];
  ctx.fillStyle = "#808080";
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

/* ── Camera ───────────────────────────────────────────────────────────── */

function cameraFor(yaw: number, aspect: number) {
  const eye: Vec3 = [Math.sin(yaw) * 2.2, 0.42, -1.55 + (1 - Math.cos(yaw)) * 2.2];
  const view = lookAt(eye, [0, 0.36, 1.35], [0, 1, 0]);
  const proj = perspective(aspect < 1 ? 0.95 : 0.6, aspect, 0.05, 20);
  return { eye, mvp: multiply(proj, view) };
}

/* ── Component ──────────────────────────────────────────────────────────── */

const TERRAIN_DPR = 1.25;
const SHADOW_SIZE: [number, number] = [768, 480];

export function HeroTerrain({ onSun }: { onSun?: (sun: Vec3) => void }) {
  const glRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = glRef.current;
    const gl = canvas?.getContext("webgl2", { antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" });
    if (!canvas || !gl) return;

    let terrain: WebGLProgram;
    let heightProgram: WebGLProgram;
    let detailProgram: WebGLProgram;
    let shadowProgram: WebGLProgram;
    try {
      terrain = link(gl, VERT, FRAG);
      heightProgram = link(gl, QUAD_VERT, HEIGHT_FRAG);
      detailProgram = link(gl, QUAD_VERT, DETAIL_FRAG);
      shadowProgram = link(gl, QUAD_VERT, SHADOW_FRAG);
    } catch (error) {
      console.warn("hero terrain: shaders failed", error);
      return;
    }

    // Surface detail is baked at several texels per mesh cell; smaller
    // screens get a smaller bake.
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    const detailSize: [number, number] = small ? [1024, 640] : [1536, 960];

    /* Geometry: a flat grid of indices; the vertex shader reads heights. */
    const indices = buildIndices();
    const terrainVao = gl.createVertexArray();
    gl.bindVertexArray(terrainVao);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    const quadVao = gl.createVertexArray();

    /* Textures, one unit each: 0 height, 1 surface, 2 light, 3 shadow. */
    const texture = (unit: number, w: number, h: number, internal: number, format: number) => {
      const tex = gl.createTexture()!;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };
    const heightTex = texture(0, NX, NZ, gl.RGBA8, gl.RGBA);
    const surfaceTex = texture(1, ...detailSize, gl.RGBA8, gl.RGBA);
    const lightTex = texture(2, ...detailSize, gl.RGBA8, gl.RGBA);
    const shadowTex = texture(3, ...SHADOW_SIZE, gl.R8, gl.RED);
    const target = (...textures: WebGLTexture[]) => {
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      textures.forEach((tex, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, tex, 0));
      gl.drawBuffers(textures.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
      return fb;
    };
    const heightFb = target(heightTex);
    const detailFb = target(surfaceTex, lightTex);
    const shadowFb = target(shadowTex);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const shareTerrain = (program: WebGLProgram) => {
      gl.useProgram(program);
      const u = (name: string) => gl.getUniformLocation(program, name);
      gl.uniform1i(u("uHeight"), 0);
      gl.uniform1i(u("uSurface"), 1);
      gl.uniform1i(u("uLight"), 2);
      gl.uniform1i(u("uShadow"), 3);
      gl.uniform4f(u("uBounds"), X0, Z0, 1 / (X1 - X0), 1 / (Z1 - Z0));
      gl.uniform2f(u("uGrid"), NX, NZ);
      gl.uniform1f(u("uHMax"), H_MAX);
      return u;
    };
    shareTerrain(heightProgram);
    const detailU = shareTerrain(detailProgram);
    gl.uniform1f(detailU("uTexel"), (X1 - X0) / detailSize[0]);
    const shadowU = shareTerrain(shadowProgram);
    const uT = shareTerrain(terrain);

    const bake = (program: WebGLProgram, fb: WebGLFramebuffer | null, w: number, h: number) => {
      gl.useProgram(program);
      gl.bindVertexArray(quadVao);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.viewport(0, 0, w, h);
      gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.enable(gl.DEPTH_TEST);
    };
    // Once: the heightfield, then its surface detail.
    bake(heightProgram, heightFb, NX, NZ);
    bake(detailProgram, detailFb, ...detailSize);

    /* Theme */
    const applyTheme = () => {
      const dark = document.documentElement.classList.contains("dark");
      gl.useProgram(terrain);
      gl.uniform3fv(uT("uFog"), readColour("--background"));
      // Light in linear space. Dark: alpenglow over blue dusk. Light: a clear
      // golden morning, the way Machapuchare looks from Sarangkot.
      const set = dark
        ? { sun: [1.75, 1.1, 0.72], sky: [0.05, 0.075, 0.15], rock: [0.06, 0.05, 0.048], snow: [0.82, 0.84, 0.9], haze: [0.05, 0.065, 0.11] }
        : { sun: [2.0, 1.4, 0.82], sky: [0.075, 0.13, 0.3], rock: [0.085, 0.065, 0.055], snow: [0.84, 0.86, 0.9], haze: [0.5, 0.58, 0.74] };
      gl.uniform3fv(uT("uSunColor"), set.sun);
      gl.uniform3fv(uT("uSky"), set.sky);
      gl.uniform3fv(uT("uRock"), set.rock);
      gl.uniform3fv(uT("uSnow"), set.snow);
      gl.uniform3fv(uT("uHaze"), set.haze);
    };
    applyTheme();
    gl.enable(gl.DEPTH_TEST);

    /* State */
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rest = { az: -0.95, el: 0.34, yaw: 0 };
    const goal = { ...rest };
    const current = reduce ? { ...rest } : { az: -1.5, el: 0.06, yaw: 0 };
    let cssW = 1;
    let cssH = 1;
    let onScreen = true;
    let lastSun: Vec3 = [0, 0, 0];
    let lastPublished: Vec3 = [9, 9, 9];

    const resize = () => {
      cssW = canvas.clientWidth;
      cssH = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, TERRAIN_DPR);
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
    };

    const draw = () => {
      const { eye, mvp } = cameraFor(current.yaw, cssW / cssH);
      // Azimuth is in screen terms (negative = from the left); world x is
      // mirrored on screen, so flip it for the shaders.
      const screen = norm([
        Math.cos(current.el) * Math.sin(current.az),
        Math.sin(current.el),
        -Math.cos(current.el) * Math.cos(current.az) * 0.6,
      ]);
      const sun: Vec3 = [-screen[0], screen[1], screen[2]];

      if (Math.abs(sun[0] - lastSun[0]) + Math.abs(sun[1] - lastSun[1]) + Math.abs(sun[2] - lastSun[2]) > 1e-4) {
        // Only when the sun has moved: the shadow map.
        gl.useProgram(shadowProgram);
        gl.uniform3fv(shadowU("uSun"), sun);
        bake(shadowProgram, shadowFb, ...SHADOW_SIZE);
        lastSun = sun;
      }

      // Every frame: the terrain.
      gl.useProgram(terrain);
      gl.bindVertexArray(terrainVao);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniformMatrix4fv(uT("uMvp"), false, mvp);
      gl.uniform3fv(uT("uEye"), eye);
      gl.uniform3fv(uT("uSun"), sun);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);

      // Only touch the page's styles when the shadow would visibly change.
      if (Math.abs(screen[0] - lastPublished[0]) + Math.abs(screen[1] - lastPublished[1]) > 0.02) {
        lastPublished = screen;
        onSun?.(screen);
      }
    };

    let frame = 0;
    let running = false;
    const step = () => {
      if (!onScreen) {
        running = false;
        return;
      }
      const ease = 0.06;
      current.az += (goal.az - current.az) * ease;
      current.el += (goal.el - current.el) * ease;
      current.yaw += (goal.yaw - current.yaw) * ease;
      const settled =
        Math.abs(goal.az - current.az) < 5e-4 &&
        Math.abs(goal.el - current.el) < 5e-4 &&
        Math.abs(goal.yaw - current.yaw) < 5e-4;
      if (settled) Object.assign(current, goal);
      draw();
      running = !settled;
      if (running) frame = requestAnimationFrame(step);
    };
    const kick = () => {
      if (!onScreen) return;
      if (reduce) return draw();
      if (!running) {
        running = true;
        frame = requestAnimationFrame(step);
      }
    };
    const redraw = () => {
      if (!running && onScreen) draw();
    };

    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !onScreen) return;
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      goal.az = nx * 2.6;
      goal.el = 0.36 - ny * 0.36;
      goal.yaw = nx * 0.08;
      kick();
    };
    const onLeave = () => {
      Object.assign(goal, rest);
      kick();
    };
    const themeWatch = new MutationObserver(() => {
      applyTheme();
      redraw();
    });
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) kick();
    });
    visibility.observe(canvas);

    resize();
    kick();
    let resizeFrame = 0;
    const sizes = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resize();
        if (running) return;
        draw();
      });
    });
    sizes.observe(canvas);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      sizes.disconnect();
      visibility.disconnect();
      themeWatch.disconnect();
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      // Free GPU resources, but keep the context alive: React may mount this
      // effect again on the same canvas (it does so deliberately in development).
      [terrain, heightProgram, detailProgram, shadowProgram].forEach((program) => gl.deleteProgram(program));
    };
  }, [onSun]);

  return <canvas ref={glRef} className="hx-terrain" aria-hidden="true" />;
}
