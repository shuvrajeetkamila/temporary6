import * as THREE from 'three';

// Procedural canvas textures: no external image files, so the game works offline and in the APK.

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  return c;
}

function toTexture(canvas, renderer, srgb = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = renderer?.capabilities.getMaxAnisotropy?.() ?? 4;
  return t;
}

/** Facade texture: one tile = 8 m x 8 m (32 px per metre). Returns diffuse + emissive (lit windows). */
export function createWindowTextures(renderer, seed = 7) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const S = 256;
  const dc = makeCanvas(S);
  const ec = makeCanvas(S);
  const d = dc.getContext('2d');
  const e = ec.getContext('2d');

  d.fillStyle = '#d9d2c3';
  d.fillRect(0, 0, S, S);
  e.fillStyle = '#000';
  e.fillRect(0, 0, S, S);

  const cols = 4;
  const rows = 4;
  const cw = S / cols;
  const ch = S / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + cw * 0.2;
      const y = r * ch + ch * 0.2;
      const w = cw * 0.6;
      const h = ch * 0.55;
      d.fillStyle = '#34495e';
      d.fillRect(x, y, w, h);
      d.fillStyle = 'rgba(255,255,255,0.25)';
      d.fillRect(x, y, w, h * 0.12); // reflection band
      if (rnd() < 0.3) {
        const warm = rnd() < 0.7;
        const a = 0.55 + rnd() * 0.45;
        e.fillStyle = warm ? `rgba(255,214,140,${a})` : `rgba(200,230,255,${a})`;
        e.fillRect(x, y, w, h);
      }
    }
  }
  // grime speckles
  for (let i = 0; i < 300; i++) {
    d.fillStyle = `rgba(90,80,70,${rnd() * 0.08})`;
    d.fillRect(rnd() * S, rnd() * S, 2 + rnd() * 6, 2 + rnd() * 6);
  }

  const map = toTexture(dc, renderer, true);
  map.repeat.set(1 / 8, 1 / 8);
  const emissiveMap = toTexture(ec, renderer, true);
  emissiveMap.repeat.copy(map.repeat);
  return { map, emissiveMap };
}

/** Asphalt: noisy dark grey. The road UVs are already in tile units, so no repeat is applied here. */
export function createAsphaltTexture(renderer, seed = 3) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const S = 256;
  const c = makeCanvas(S);
  const g = c.getContext('2d');
  g.fillStyle = '#3b3d40';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 4000; i++) {
    const v = 40 + Math.floor(rnd() * 60);
    g.fillStyle = `rgba(${v},${v},${v + 3},0.5)`;
    g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  g.strokeStyle = 'rgba(240,240,220,0.5)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(S / 2, 0);
  g.lineTo(S / 2, S);
  g.stroke();
  return toTexture(c, renderer, true);
}

/** Desert sand with grit. One tile = 40 m. */
export function createSandTexture(renderer, seed = 11) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const S = 512;
  const c = makeCanvas(S);
  const g = c.getContext('2d');
  g.fillStyle = '#d8c08e';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 12000; i++) {
    const l = 150 + Math.floor(rnd() * 80);
    g.fillStyle = `rgba(${l},${Math.floor(l * 0.85)},${Math.floor(l * 0.55)},0.35)`;
    g.fillRect(rnd() * S, rnd() * S, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const t = toTexture(c, renderer, true);
  t.repeat.set(1 / 40, 1 / 40);
  return t;
}

/**
 * Asphalt normal map: a height field from smoothed noise, converted to normals.
 * Uses a DataTexture (linear, not sRGB) that tiles, with the same UVs as the asphalt colour map.
 */
export function createAsphaltNormalMap(seed = 5) {
  const S = 256;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let h = new Float32Array(S * S);
  for (let i = 0; i < h.length; i++) h[i] = rnd();
  // three box-blur passes with wrap-around give a soft, tiling height field
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float32Array(S * S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            sum += h[((y + dy + S) % S) * S + ((x + dx + S) % S)];
          }
        }
        next[y * S + x] = sum / 9;
      }
    }
    h = next;
  }
  const data = new Uint8Array(S * S * 4);
  const strength = 6;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dhx = h[y * S + ((x + 1) % S)] - h[y * S + ((x - 1 + S) % S)];
      const dhy = h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x];
      let nx = -dhx * strength;
      let ny = -dhy * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const o = (y * S + x) * 4;
      data[o] = Math.round((nx * 0.5 + 0.5) * 255);
      data[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}
