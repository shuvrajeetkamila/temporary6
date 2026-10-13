// Builds public/data/bahrain-osm.json (buildings + roads in world coordinates) from OpenStreetMap data.
//
//   npm run fetch:osm
//
// Sources, tried in order:
//   1. HOT Export Tool files on HDX (GeoPackage zips, OSM data updated monthly). One fixed download per layer.
//   2. Overpass API (live OSM query), if HDX is unreachable.
// If both fail, no file is written and the game uses the procedural city.
//
// The output file is git-ignored (it is large). Data: © OpenStreetMap contributors, ODbL.
import { writeFile, mkdir, mkdtemp, readdir, stat, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDataset, overpassToDataset } from '../src/osm.js';
import { getLandPolygon } from '../src/land.js';
import { readFeatures } from './gpkg.mjs';

const execFileAsync = promisify(execFile);

/** Node's fetch() hides the real reason (DNS, TLS, reset) in err.cause. */
function describe(err) {
  const c = err?.cause;
  return c ? `${err.message}: ${c.code ?? ''} ${c.message ?? c}`.trim() : String(err?.message ?? err);
}

/** Prints a message to the log, and as a GitHub Actions annotation when running in CI. */
function note(level, msg) {
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::${level}::${msg.replace(/\r?\n/g, ' ')}`);
  } else {
    (level === 'error' ? console.error : console.warn)(msg);
  }
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public', 'data', 'bahrain-osm.json');
const ATTRIBUTION = '© OpenStreetMap contributors (ODbL)';

// HOT Export Tool, Bahrain (ISO3 BHR). Dataset pages: data.humdata.org/dataset/hotosm_bhr_buildings and .../hotosm_bhr_roads
const HDX = {
  buildings: 'https://production-raw-data-api.s3.amazonaws.com/ISO3/BHR/buildings/hotosm_bhr_buildings_osm_gpkg.zip',
  roads: 'https://production-raw-data-api.s3.amazonaws.com/ISO3/BHR/roads/hotosm_bhr_roads_osm_gpkg.zip',
};

// south, west, north, east: covers the main island and Muharraq
const BBOX = '25.75,50.38,26.36,50.72';
const HIGHWAYS = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link';
const OVERPASS_QUERY = `[out:json][timeout:900];
(
  way["building"](${BBOX});
  way["highway"~"^(${HIGHWAYS})$"](${BBOX});
);
out geom;`;
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

async function findFiles(dir, ext) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await findFiles(p, ext)));
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

/** Downloads one HDX zip and returns the path of the GeoPackage inside it. */
async function downloadGpkg(url, dir) {
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const zip = path.join(dir, path.basename(url));
  await writeFile(zip, Buffer.from(await res.arrayBuffer()));
  await execFileAsync('unzip', ['-o', '-q', zip, '-d', dir]);
  const [gpkg] = await findFiles(dir, '.gpkg');
  if (!gpkg) throw new Error(`no .gpkg inside ${path.basename(zip)}`);
  return gpkg;
}

async function loadFromHdx(land) {
  const dir = await mkdtemp(path.join(tmpdir(), 'bahrain-hdx-'));
  try {
    const buildingsFile = await downloadGpkg(HDX.buildings, path.join(dir, 'b'));
    const roadsFile = await downloadGpkg(HDX.roads, path.join(dir, 'r'));
    const items = [...readFeatures(buildingsFile, 'building'), ...readFeatures(roadsFile, 'highway')];
    console.log(`  HDX features read: ${items.length}`);
    return buildDataset(items, land);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function loadFromOverpass(land) {
  let lastErr;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      console.log(`Querying ${url} ...`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(OVERPASS_QUERY),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return overpassToDataset(await res.json(), land);
    } catch (err) {
      lastErr = err;
      note('warning', `Overpass ${url} failed: ${describe(err)}`);
    }
  }
  throw lastErr;
}

const land = getLandPolygon();
let result = null;
let origin = null;

try {
  result = await loadFromHdx(land);
  origin = 'hdx';
} catch (err) {
  note('warning', `HDX download failed: ${describe(err)}`);
}

if (!result) {
  try {
    result = await loadFromOverpass(land);
    origin = 'overpass';
  } catch (err) {
    note('error', `Overpass failed too: ${describe(err)}`);
    note('error', 'No map file written; the game will use the procedural city.');
    process.exit(1);
  }
}

const { buildings, roads, skippedOffIsland } = result;
if (buildings.length === 0) {
  console.error('No buildings after filtering; not writing the map file.');
  process.exit(1);
}

const out = {
  source: 'osm',
  origin,
  attribution: ATTRIBUTION,
  fetchedAt: new Date().toISOString(),
  buildings,
  roads,
};

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(out));
const { size } = await stat(OUT);
console.log(`Wrote ${OUT}`);
console.log(`  origin:    ${origin}`);
console.log(`  buildings: ${buildings.length} (dropped off-island: ${skippedOffIsland})`);
console.log(`  roads:     ${roads.length}`);
console.log(`  size:      ${(size / 1048576).toFixed(1)} MB`);
