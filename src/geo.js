import { ORIGIN, M_PER_DEG_LAT, M_PER_DEG_LON } from './config.js';

/** Equirectangular local projection (accurate to well under 1% across Bahrain). */
export function lonLatToXZ(lon, lat) {
  return [(lon - ORIGIN.lon) * M_PER_DEG_LON, -(lat - ORIGIN.lat) * M_PER_DEG_LAT];
}

export function xzToLonLat(x, z) {
  return { lon: ORIGIN.lon + x / M_PER_DEG_LON, lat: ORIGIN.lat - z / M_PER_DEG_LAT };
}

/** Ray-casting point-in-polygon. poly = [[x,z], ...]. */
export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/** Chaikin corner-cutting on a closed ring: smooths the coarse 46-point coastline. */
export function chaikinClosed(pts, iterations = 3) {
  let cur = pts;
  for (let it = 0; it < iterations; it++) {
    const next = [];
    for (let i = 0; i < cur.length; i++) {
      const [ax, az] = cur[i];
      const [bx, bz] = cur[(i + 1) % cur.length];
      next.push([0.75 * ax + 0.25 * bx, 0.75 * az + 0.25 * bz]);
      next.push([0.25 * ax + 0.75 * bx, 0.25 * az + 0.75 * bz]);
    }
    cur = next;
  }
  return cur;
}

export function bounds(pts) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of pts) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

/** Find a sea point (outside the island) closest to (x, z), at least `minDist` from the shore. */
export function nearestSeaPoint(x, z, poly, minDist = 25) {
  for (let r = 0; r < 4000; r += 10) {
    for (let a = 0; a < 360; a += 10) {
      const px = x + r * Math.cos((a * Math.PI) / 180);
      const pz = z + r * Math.sin((a * Math.PI) / 180);
      if (!pointInPoly(px, pz, poly) && r >= minDist) return [px, pz];
    }
  }
  return [x, z];
}

/** Find a land point closest to (x, z). */
export function nearestLandPoint(x, z, poly) {
  if (pointInPoly(x, z, poly)) return [x, z];
  for (let r = 0; r < 20000; r += 25) {
    for (let a = 0; a < 360; a += 10) {
      const px = x + r * Math.cos((a * Math.PI) / 180);
      const pz = z + r * Math.sin((a * Math.PI) / 180);
      if (pointInPoly(px, pz, poly)) return [px, pz];
    }
  }
  return [x, z];
}

export function seededRandom(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
