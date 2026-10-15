// Where a summoned vehicle appears: beside the character, on open ground or open water.
// Pure functions (no DOM, no three.js) so the tests can check them.
import { pointInPoly, nearestSeaPoint } from './geo.js';
import { WATER_Y } from './config.js';

/** Length of the clear strip a jet needs for its take-off run (metres). */
export const STRIP_LENGTH = 420;
export const MAX_SUMMON_STRIP = 2500; // m
export const MAX_SUMMON_WATER = 3000; // m

/** True if a rectangle centred on (x, z), rotated by heading, is on land and clear of buildings. */
export function footprintClear(x, z, heading, hx, hz, land, colliders, pad = 0.6) {
  const c = Math.cos(heading);
  const s = Math.sin(heading);
  // sample the corners and the edge midpoints
  const pts = [
    [hx, hz], [-hx, hz], [hx, -hz], [-hx, -hz], [0, hz], [0, -hz], [hx, 0], [-hx, 0], [0, 0],
  ];
  for (const [lx, lz] of pts) {
    // local -> world: forward is (sin h, cos h), right is (cos h, -sin h)
    const px = x + lx * c + lz * s;
    const pz = z - lx * s + lz * c;
    if (!pointInPoly(px, pz, land)) return false;
    if (colliders && colliders.blocked(px, pz, pad)) return false;
  }
  return true;
}

/** True if a strip of length `len` starting at (x, z) and running along heading is clear. */
export function stripClear(x, z, heading, len, halfW, land, colliders) {
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  const rx = Math.cos(heading);
  const rz = -Math.sin(heading);
  for (let d = -20; d <= len; d += 10) {
    for (let w = -halfW; w <= halfW; w += 6) {
      const px = x + fx * d + rx * w;
      const pz = z + fz * d + rz * w;
      if (!pointInPoly(px, pz, land)) return false;
      if (colliders && colliders.blocked(px, pz, 2)) return false;
    }
  }
  return true;
}

/**
 * Chooses where a vehicle is summoned.
 * @param {'car'|'boat'|'plane'|'heli'} kind
 * @param {{x:number,z:number,heading:number}} human  character position, and the direction it faces (sin h, cos h)
 * @param {{land:number[][], colliders:object|null, groundAt:(x:number,z:number)=>number, occupied?:{x:number,z:number,r:number}[]}} env
 * @returns {{ok:boolean, x?:number, y?:number, z?:number, heading?:number, note:string}}
 */
export function summonPlacement(kind, human, { land, colliders, groundAt, occupied = [] }) {
  const h = human.heading;
  const rightX = Math.cos(h);
  const rightZ = -Math.sin(h);
  const at = (lateral, forward) => [human.x + rightX * lateral + Math.sin(h) * forward, human.z + rightZ * lateral + Math.cos(h) * forward];
  // other vehicles already on the spot: a circle around each one (radius = its half-diagonal)
  const free = (x, z, r) => occupied.every((o) => Math.hypot(o.x - x, o.z - z) > o.r + r);

  if (kind === 'car') {
    // Beside the driver's door on either side; the car faces the same way as the character (its nose is -Z).
    for (const side of [1, -1]) {
      for (const lat of [2.6, 3.2, 4.2]) {
        for (const fwd of [0, -2, 2, -4, 4]) {
          const [x, z] = at(side * lat, fwd);
          if (free(x, z, 2.3) && footprintClear(x, z, h, 0.95, 2.1, land, colliders)) {
            const y = groundAt(x, z) + 1.2;
            return { ok: true, x, y, z, heading: h + Math.PI, note: 'Car beside you' };
          }
        }
      }
    }
    return { ok: false, note: 'No free road or ground next to you for the car' };
  }

  if (kind === 'boat') {
    // The nearest open water. Inland cities are often far from the sea, so this can be a few hundred metres away.
    const [sx, sz] = nearestSeaPoint(human.x, human.z, land, 12);
    const d = Math.hypot(sx - human.x, sz - human.z);
    if (d > MAX_SUMMON_WATER) return { ok: false, note: `No open water within ${MAX_SUMMON_WATER / 1000} km` };
    return { ok: true, x: sx, y: WATER_Y + 0.25, z: sz, heading: h, note: d < 30 ? 'Boat beside you' : `Boat ${Math.round(d)} m away on the water` };
  }

  if (kind === 'heli') {
    // Lands beside the character: the rotor clears the driver's head, and the door is within reach.
    for (const side of [1, -1]) {
      for (const lat of [2.9, 3.6, 4.6]) {
        for (const fwd of [0, -3, 3, -6, 6]) {
          const [x, z] = at(side * lat, fwd);
          if (free(x, z, 2.1) && footprintClear(x, z, h, 1.1, 1.8, land, colliders)) {
            const y = groundAt(x, z) + 1.0;
            return { ok: true, x, y, z, heading: h, note: 'Helicopter beside you' };
          }
        }
      }
    }
    return { ok: false, note: 'No open ground next to you for the helicopter' };
  }

  if (kind === 'plane') {
    // Beside the character first (the jet is about 38 m long, so it sits off to the side).
    for (const side of [1, -1]) {
      const [x, z] = at(side * 26, 0);
      if (free(x, z, 19) && stripClear(x, z, h, STRIP_LENGTH, 24, land, colliders)) {
        return { ok: true, x, y: groundAt(x, z) + 0.65, z, heading: h, note: 'Jet beside you' };
      }
    }
    // Otherwise the nearest open strip: rings of search out to MAX_SUMMON_STRIP metres.
    for (let r = 50; r <= MAX_SUMMON_STRIP; r += 50) {
      for (let a = 0; a < 360; a += 15) {
        const rad = (a * Math.PI) / 180;
        const x = human.x + r * Math.cos(rad);
        const z = human.z + r * Math.sin(rad);
        if (!pointInPoly(x, z, land) || !free(x, z, 19)) continue;
        for (const hd of [h, h + Math.PI / 2, h + Math.PI, h + (3 * Math.PI) / 2]) {
          if (stripClear(x, z, hd, STRIP_LENGTH, 24, land, colliders)) {
            return { ok: true, x, y: groundAt(x, z) + 0.65, z, heading: hd, note: `Jet parked ${r} m away on open ground` };
          }
        }
      }
    }
    return { ok: false, note: `No runway-length open ground within ${MAX_SUMMON_STRIP / 1000} km. Use Send home to fly from the airport` };
  }

  return { ok: false, note: 'Unknown vehicle' };
}
