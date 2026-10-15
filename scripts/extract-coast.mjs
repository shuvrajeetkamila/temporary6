// Builds src/data/bahrain-coast.json from the OpenStreetMap-derived coastline GeoJSON in the
// @geo-maps/earth-coastlines-10m npm package (ODbL, © OpenStreetMap contributors).
//
//   npm pack @geo-maps/earth-coastlines-10m@0.6.0   (or npm install it in a scratch folder)
//   node scripts/extract-coast.mjs path/to/map.geo.json
//
// Keeps every land polygon that lies in the Bahrain area and has a real footprint (islets and reefs are dropped),
// so Muharraq, Sitra, the Hawar islands and the other islands are all land. Output is committed; the game does not
// read the 37 MB source file.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) {
  console.error('usage: node scripts/extract-coast.mjs <map.geo.json>');
  process.exit(1);
}
const BOX = { w: 50.25, e: 50.95, s: 25.5, n: 26.5 }; // Bahrain and its nearby islands
const MIN_AREA_M2 = 2000; // drop tiny islets and rocks
const M_LAT = 110574;
const M_LON = 111320 * Math.cos((26.05 * Math.PI) / 180);

const geo = JSON.parse(readFileSync(src, 'utf8'));
const rings = [];
for (const g of geo.geometries) {
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
  for (const poly of polys) {
    const ring = poly[0];
    let w = 1e9, e = -1e9, s = 1e9, n = -1e9;
    for (const [x, y] of ring) {
      if (x < w) w = x;
      if (x > e) e = x;
      if (y < s) s = y;
      if (y > n) n = y;
    }
    // the global continent polygons are much wider than this; keep only polygons inside the box
    if (e - w > 2 || n - s > 2) continue;
    if (e < BOX.w || w > BOX.e || n < BOX.s || s > BOX.n) continue;
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      area += (x1 * M_LON) * (y2 * M_LAT) - (x2 * M_LON) * (y1 * M_LAT);
    }
    area = Math.abs(area) / 2;
    if (area < MIN_AREA_M2) continue;
    rings.push({ area, pts: ring.map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]) });
  }
}
rings.sort((a, b) => b.area - a.area);
const out = {
  name: 'Bahrain coastline (main island, Muharraq, Sitra, Hawar and other islands)',
  source: '@geo-maps/earth-coastlines-10m 0.6.0 (OpenStreetMap coastline, 10 m resolution)',
  license: 'ODbL 1.0, © OpenStreetMap contributors',
  note: 'Land rings as [lon, lat], largest first. Produced by scripts/extract-coast.mjs.',
  rings: rings.map((r) => r.pts),
};
const here = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(here, '..', 'src', 'data', 'bahrain-coast.json');
writeFileSync(dest, JSON.stringify(out) + '\n');
console.log(`wrote ${rings.length} land rings to ${dest}`);
for (const r of rings) console.log(`  ${r.pts.length} pts, ${(r.area / 1e6).toFixed(2)} km²`);
