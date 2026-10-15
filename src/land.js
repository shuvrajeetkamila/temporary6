import coast from './data/bahrain-coast.json' with { type: 'json' };
import { lonLatToXZ } from './geo.js';

let cached = null;

/**
 * Land as a list of rings in world XZ metres (one ring per island). Main island, Muharraq, Sitra, the Hawar
 * islands and the rest come from the OpenStreetMap coastline (ODbL). Shared by the game and the OSM fetch script.
 * Use pointInLand(x, z, rings) to test a point; a point is on land if it is inside any ring.
 */
export function getLandRings() {
  if (!cached) cached = coast.rings.map((ring) => ring.map(([lon, lat]) => lonLatToXZ(lon, lat)));
  return cached;
}
