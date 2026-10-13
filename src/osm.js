// Pure conversion of an Overpass API JSON response (`out geom`) into compact world-space data.
// Used by scripts/fetch-osm.mjs (Node) and nowhere else, so it has no DOM/three dependencies.
import { lonLatToXZ, pointInPoly } from './geo.js';

export const ROAD_WIDTH = {
  motorway: 24, trunk: 20, primary: 14, secondary: 12, tertiary: 10,
  unclassified: 8, residential: 7, living_street: 6, service: 5,
  motorway_link: 12, trunk_link: 10, primary_link: 10, secondary_link: 9, tertiary_link: 8,
};

const METRES_PER_LEVEL = 3; // rule of thumb from the project plan

function round1(v) {
  return Math.round(v * 10) / 10;
}

function parseHeight(tags) {
  const h = parseFloat(tags.height);
  if (isFinite(h) && h > 0) return Math.min(Math.max(h, 3), 400);
  const levels = parseFloat(tags['building:levels']);
  if (isFinite(levels) && levels > 0) return Math.min(levels * METRES_PER_LEVEL, 400);
  return 9; // unknown building: about three storeys
}

/**
 * @param {object} json   Overpass response with elements of type "way" that include `geometry`.
 * @param {number[][]} landPoly  island polygon in XZ; buildings whose centroid is outside are dropped.
 */
export function overpassToDataset(json, landPoly) {
  const buildings = [];
  const roads = [];
  let skipped = 0;

  for (const el of json.elements ?? []) {
    if (el.type !== 'way' || !Array.isArray(el.geometry) || el.geometry.length < 2) continue;
    const tags = el.tags ?? {};
    let pts = el.geometry.map((g) => lonLatToXZ(g.lon, g.lat));

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
      if (!pointInPoly(cx, cz, landPoly)) {
        skipped++;
        continue;
      }
      buildings.push({ h: parseHeight(tags), pts: pts.map(([x, z]) => [round1(x), round1(z)]) });
    } else if (tags.highway && ROAD_WIDTH[tags.highway]) {
      roads.push({
        w: ROAD_WIDTH[tags.highway],
        kind: tags.highway,
        pts: pts.map(([x, z]) => [round1(x), round1(z)]),
      });
    }
  }

  return { buildings, roads, skippedOffIsland: skipped };
}
