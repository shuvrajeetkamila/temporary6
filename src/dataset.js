import { getLandRings } from './land.js';
import { generateProceduralCity } from './procedural.js';

/**
 * Loads building + road geometry (world XZ metres).
 * Prefers the real OSM extract written by `npm run fetch:osm`, otherwise uses the procedural city.
 * Force the procedural city with ?city=procedural.
 */
export async function loadDataset() {
  const land = getLandRings();
  const params = new URLSearchParams(location.search);

  if (params.get('city') !== 'procedural') {
    try {
      const url = `${import.meta.env.BASE_URL}data/bahrain-osm.json`;
      const res = await fetch(url, { cache: 'no-cache' });
      const type = res.headers.get('content-type') || '';
      if (res.ok && type.includes('json')) {
        const json = await res.json();
        if (Array.isArray(json.buildings) && json.buildings.length > 0) {
          return { source: 'osm', attribution: json.attribution ?? '© OpenStreetMap contributors', land, ...json };
        }
      }
    } catch (err) {
      console.warn('OSM extract not usable, falling back to procedural city', err);
    }
  }

  return { source: 'procedural', attribution: '', land, ...generateProceduralCity(land) };
}
