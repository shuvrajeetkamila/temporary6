import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLandRings } from '../src/land.js';
import { generateProceduralCity } from '../src/procedural.js';
import { createPhysicsWorld, BuildingColliders } from '../src/physics.js';
import { computeSpawns, AIRPORT } from '../src/spawn.js';
import { lonLatToXZ, pointInLand } from '../src/geo.js';

const land = getLandRings();
const city = generateProceduralCity(land);
const world = createPhysicsWorld();
const colliders = new BuildingColliders(world, city.buildings);
const sp = computeSpawns(land, colliders);

test('land spawns (human, car, heli, plane) are on land and clear of buildings', () => {
  for (const k of ['human', 'car', 'heli', 'plane']) {
    const [x, z] = sp[k];
    assert.ok(pointInLand(x, z, land), `${k} should be on land`);
    assert.ok(!colliders.blocked(x, z, 0), `${k} should not be inside a building`);
  }
});

test('boat spawns at sea', () => {
  assert.ok(!pointInLand(sp.boat[0], sp.boat[1], land), 'boat should be outside the island');
});

test('plane spawns at the airport on Muharraq, facing runway 12', () => {
  const [ax, az] = lonLatToXZ(AIRPORT.lon, AIRPORT.lat);
  const d = Math.hypot(sp.plane[0] - ax, sp.plane[1] - az);
  assert.ok(d < 1500, `plane should be within 1.5 km of the airport, was ${Math.round(d)} m`);
  // forward vector for heading h is (sin h, cos h); runway 12 points ESE (east +x, south +z)
  // bearing 120° = east-south-east: east component (x) positive, south component (z, positive = south) positive
  assert.ok(Math.sin(sp.planeHeading) > 0, 'runway 12 heads east');
  assert.ok(Math.cos(sp.planeHeading) > 0, 'runway 12 heads south');
  assert.ok(Math.abs(sp.planeHeading - Math.PI / 3) < 1e-9, 'heading is 60° from +Z, i.e. bearing 120°');
});

test('spatial grid agrees with a brute-force building check', () => {
  let seed = 3;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const b = { minX: -12000, maxX: 9000, minZ: -22000, maxZ: 28000 };
  for (let i = 0; i < 3000; i++) {
    const x = b.minX + rnd() * (b.maxX - b.minX);
    const z = b.minZ + rnd() * (b.maxZ - b.minZ);
    const brute = colliders.items.some((it) => Math.abs(x - it.cx) < it.hx + 1.5 && Math.abs(z - it.cz) < it.hz + 1.5);
    assert.equal(colliders.blocked(x, z), brute, `mismatch at ${x.toFixed(1)}, ${z.toFixed(1)}`);
  }
});
