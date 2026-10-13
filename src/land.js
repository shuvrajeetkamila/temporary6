import outline from './data/bahrain-outline.json' with { type: 'json' };
import { lonLatToXZ, chaikinClosed } from './geo.js';

let cached = null;

/** Island outline in world XZ metres, Chaikin-smoothed. Shared by the game and the OSM fetch script. */
export function getLandPolygon() {
  if (!cached) {
    const raw = outline.ring.map(([lon, lat]) => lonLatToXZ(lon, lat));
    cached = chaikinClosed(raw, 3);
  }
  return cached;
}
