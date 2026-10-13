// Downloads Bahrain buildings + roads from OpenStreetMap (Overpass API) and writes
// public/data/bahrain-osm.json in world coordinates. That file is git-ignored (it is large).
//
//   npm run fetch:osm
//
// Data: © OpenStreetMap contributors, ODbL. The game shows this attribution when the file is loaded.
import { writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { overpassToDataset } from '../src/osm.js';
import { getLandPolygon } from '../src/land.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'data', 'bahrain-osm.json');

// south, west, north, east: covers the main island and Muharraq
const BBOX = '25.75,50.38,26.36,50.72';
const HIGHWAYS = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link';
const QUERY = `[out:json][timeout:900];
(
  way["building"](${BBOX});
  way["highway"~"^(${HIGHWAYS})$"](${BBOX});
);
out geom;`;

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

async function query() {
  let lastErr;
  for (const url of ENDPOINTS) {
    try {
      console.log(`Querying ${url} ...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(QUERY),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      console.warn(`  failed: ${err.message}`);
    }
  }
  throw lastErr;
}

const json = await query();
const { buildings, roads, skippedOffIsland } = overpassToDataset(json, getLandPolygon());

const out = {
  source: 'osm',
  attribution: '© OpenStreetMap contributors (ODbL)',
  fetchedAt: new Date().toISOString(),
  bbox: BBOX,
  buildings,
  roads,
};

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out));
const { size } = await stat(OUT);
console.log(`Wrote ${OUT}`);
console.log(`  buildings: ${buildings.length} (dropped off-island: ${skippedOffIsland})`);
console.log(`  roads:     ${roads.length}`);
console.log(`  size:      ${(size / 1048576).toFixed(1)} MB`);
