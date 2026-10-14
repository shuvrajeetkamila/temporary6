// Spawn points for the player and the vehicles. Pure functions (no DOM, no three.js) so tests can check them.
import { lonLatToXZ, nearestLandPoint, nearestSeaPoint, pointInPoly } from './geo.js';
import { CITY_CENTER } from './config.js';

/** Bahrain International Airport (BAH) on Muharraq. */
export const AIRPORT = { lon: 50.6336, lat: 26.2708 };
/** Runway 12/30: the jet faces along runway 12 (bearing 120°) for takeoff. Heading 0 = +Z (south), positive turns toward +X. */
export const RUNWAY_12_HEADING = Math.PI - (120 * Math.PI) / 180;

/**
 * Nearest point on land that is not inside a building (plus clearance). Searches outward in rings.
 * `colliders` provides blocked(x, z); pass null to skip the building check (no buildings loaded).
 */
export function findFreeSpot(x, z, land, colliders, maxRadius = 600, pad = 1.5) {
  const free = (px, pz) => pointInPoly(px, pz, land) && !(colliders && colliders.blocked(px, pz, pad));
  if (free(x, z)) return [x, z];
  for (let r = 3; r < maxRadius; r += 3) {
    for (let a = 0; a < 360; a += 12) {
      const px = x + r * Math.cos((a * Math.PI) / 180);
      const pz = z + r * Math.sin((a * Math.PI) / 180);
      if (free(px, pz)) return [px, pz];
    }
  }
  return [x, z];
}

/**
 * Chooses all spawn points. Returns { human, car, boat, heli, plane, planeHeading } as [x, z] (heading in radians).
 */
export function computeSpawns(land, colliders) {
  const [cx, cz] = lonLatToXZ(CITY_CENTER.lon, CITY_CENTER.lat);
  // The player's spawn needs open ground around it: the third-person camera sits about 10 m behind, so a
  // spot next to a wall would start with the wall filling the screen.
  const human = findFreeSpot(...nearestLandPoint(cx, cz, land), land, colliders, 600, 12);
  const car = findFreeSpot(...nearestLandPoint(human[0] + 45, human[1] + 30, land), land, colliders);
  const boat = nearestSeaPoint(cx, cz, land, 30);
  const heli = findFreeSpot(...nearestLandPoint(...lonLatToXZ(50.5, 26.13), land), land, colliders); // Isa Town area
  const plane = findFreeSpot(...nearestLandPoint(...lonLatToXZ(AIRPORT.lon, AIRPORT.lat), land), land, colliders, 900);
  return { human, car, boat, heli, plane, planeHeading: RUNWAY_12_HEADING };
}
