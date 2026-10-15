// Pure conversion of OpenStreetMap-style features (lon/lat polylines with tags) into compact world-space data.
// Used by scripts/fetch-osm.mjs (Node) and nowhere else, so it has no DOM/three dependencies.
// Inputs can come from the HOT/HDX GeoPackage export or from an Overpass API response.
import { lonLatToXZ, pointInLand } from './geo.js';

export const ROAD_WIDTH = {
  motorway: 24, trunk: 20, primary: 14, secondary: 12, tertiary: 10,
  unclassified: 8, residential: 7, living_street: 6, service: 5,
  motorway_link: 12, trunk_link: 10, primary_link: 10, secondary_link: 9, tertiary_link: 8,
};

const METRES_PER_LEVEL = 3; // rule of thumb from the project plan
const ROAD_SIMPLIFY_M = 1.5; // roads are long; dropping points within 1.5 m keeps the file small

function round1(v) {
  return Math.round(v * 10) / 10;
}

function parseHeight(tags) {
  const h = parseFloat(tags.height);
  if (isFinite(h) && h > 0) return Math.min(Math.max(h, 3), 400);
  const levels = parseFloat(tags['building:levels'] ?? tags.building_levels); // HDX uses building_levels
  if (isFinite(levels) && levels > 0) return Math.min(levels * METRES_PER_LEVEL, 400);
  return 9; // unknown building: about three storeys
}

function segDist([px, pz], [ax, az], [bx, bz]) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = len2 ? ((px - ax) * dx + (pz - az) * dz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(ax + t * dx - px, az + t * dz - pz);
}

/** Ramer–Douglas–Peucker simplification of an open polyline (XZ metres). */
export function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let max = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = segDist(pts[i], pts[a], pts[b]);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > tol) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/**
 * @param {{tags: object, lonlat: number[][]}[]} items  features; lonlat is [[lon, lat], ...]
 * @param {number[][]} landPoly  island polygon in XZ; buildings whose centroid is outside are dropped.
 */
export function buildDataset(items, landPoly) {
  const buildings = [];
  const roads = [];
  let skipped = 0;

  for (const item of items) {
    const tags = item.tags ?? {};
    if (!Array.isArray(item.lonlat) || item.lonlat.length < 2) continue;
    let pts = item.lonlat.map(([lon, lat]) => lonLatToXZ(lon, lat));

    if (tags.building) {
      // closed ring: drop the duplicated closing node
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (first[0] === last[0] && first[1] === last[1]) pts = pts.slice(0, -1);
      if (pts.length < 3) continue;

      let cx = 0;
      let cz = 0;
      for (const [x, z] of pts) {
        cx += x;
        cz += z;
      }
      cx /= pts.length;
      cz /= pts.length;
      if (!pointInLand(cx, cz, landPoly)) {
        skipped++;
        continue;
      }
      buildings.push({ h: parseHeight(tags), pts: pts.map(([x, z]) => [round1(x), round1(z)]) });
    } else if (tags.highway && ROAD_WIDTH[tags.highway]) {
      pts = simplify(pts, ROAD_SIMPLIFY_M);
      roads.push({
        w: ROAD_WIDTH[tags.highway],
        kind: tags.highway,
        pts: pts.map(([x, z]) => [round1(x), round1(z)]),
      });
    }
  }

  return { buildings, roads, skippedOffIsland: skipped };
}

/**
 * Converts an Overpass API JSON response (`out geom`) into the same shape as buildDataset.
 * @param {object} json  Overpass response with elements of type "way" that include `geometry`.
 */
export function overpassToDataset(json, landPoly) {
  const items = [];
  for (const el of json.elements ?? []) {
    if (el.type !== 'way' || !Array.isArray(el.geometry)) continue;
    items.push({ tags: el.tags ?? {}, lonlat: el.geometry.map((g) => [g.lon, g.lat]) });
  }
  return buildDataset(items, landPoly);
}
