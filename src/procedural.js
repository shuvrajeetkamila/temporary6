// Offline fallback city used when no OSM extract is present. Deterministic (seeded).
// It is a *placeholder* for real OSM data: a street grid around Manama plus two arterials.
import { CITY_CENTER } from './config.js';
import { lonLatToXZ, pointInPoly, seededRandom } from './geo.js';

export function generateProceduralCity(landPoly, seed = 20261013) {
  const rnd = seededRandom(seed);
  const [cx, cz] = lonLatToXZ(CITY_CENTER.lon, CITY_CENTER.lat);

  const CELL = 70;      // block pitch (m)
  const STREET = 12;    // street width (m)
  const HALF = 3200;    // city extent from centre (m)
  const inside = (x, z) => pointInPoly(x, z, landPoly);

  const x0 = cx - HALF;
  const z0 = cz - HALF;
  const n = Math.ceil((2 * HALF) / CELL);

  // Arterials (straight, through the island). Their latitudes/longitudes are approximate.
  const [, zA] = lonLatToXZ(50.56, 26.19);
  const [xB] = lonLatToXZ(50.52, 26.0);

  const buildings = [];
  const roads = [];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const cellX = x0 + i * CELL + CELL / 2;
      const cellZ = z0 + j * CELL + CELL / 2;
      const dist = Math.hypot(cellX - cx, cellZ - cz);
      const density = Math.min(1, Math.max(0.08, 1.15 - dist / 3000));
      if (rnd() > density) continue;

      const inner = CELL / 2 - STREET / 2 - 3; // max half-size inside a block
      const hw = 6 + rnd() * (inner - 6);
      const hd = 6 + rnd() * (inner - 6);
      const bx = cellX + (rnd() * 2 - 1) * (inner - hw);
      const bz = cellZ + (rnd() * 2 - 1) * (inner - hd);

      // keep clear of the arterials
      if (Math.abs(bz - zA) < hd + 14) continue;
      if (Math.abs(bx - xB) < hw + 14) continue;

      const corners = [
        [bx - hw, bz - hd],
        [bx + hw, bz - hd],
        [bx + hw, bz + hd],
        [bx - hw, bz + hd],
      ];
      if (!corners.every(([x, z]) => inside(x, z))) continue;

      const core = Math.max(0, 1 - dist / 1800);
      let h = 6 + rnd() * 12 + core * rnd() * 70;
      if (rnd() < 0.015 * core) h += 60 + rnd() * 60; // occasional tower
      buildings.push({ h: Math.round(h * 10) / 10, pts: corners });
    }
  }

  // street grid segments, kept only where both ends are on land
  const segs = (ax, az, bx, bz) => {
    if (inside(ax, az) && inside(bx, bz) && inside((ax + bx) / 2, (az + bz) / 2)) {
      roads.push({ w: STREET, kind: 'street', pts: [[ax, az], [bx, bz]] });
    }
  };
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j < n; j++) {
      segs(x0 + i * CELL, z0 + j * CELL, x0 + i * CELL, z0 + (j + 1) * CELL); // N-S street
      segs(x0 + j * CELL, z0 + i * CELL, x0 + (j + 1) * CELL, z0 + i * CELL); // E-W street
    }
  }

  // arterials, sampled in 100 m steps
  const arterial = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az);
    const steps = Math.ceil(len / 100);
    for (let s = 0; s < steps; s++) {
      const t0 = s / steps;
      const t1 = (s + 1) / steps;
      const p = [ax + (bx - ax) * t0, az + (bz - az) * t0];
      const q = [ax + (bx - ax) * t1, az + (bz - az) * t1];
      if (inside(p[0], p[1]) && inside(q[0], q[1])) roads.push({ w: 16, kind: 'arterial', pts: [p, q] });
    }
  };
  const [aw, az1] = lonLatToXZ(50.40, 26.19);
  const [ae, az2] = lonLatToXZ(50.70, 26.19);
  arterial(aw, az1, ae, az2);
  const [bxw, bzs] = lonLatToXZ(50.52, 25.80);
  const [, bzn] = lonLatToXZ(50.52, 26.24);
  arterial(xB, bzs, xB, bzn);

  return { buildings, roads, skippedOffIsland: 0 };
}
