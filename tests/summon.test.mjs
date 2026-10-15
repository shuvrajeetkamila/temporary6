// Summon placement: where a vehicle appears when the player presses Summon.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLandRings } from '../src/land.js';
import { generateProceduralCity } from '../src/procedural.js';
import { createPhysicsWorld, BuildingColliders } from '../src/physics.js';
import { computeSpawns } from '../src/spawn.js';
import { summonPlacement, footprintClear } from '../src/summon.js';
import { pointInLand } from '../src/geo.js';
import { WATER_Y } from '../src/config.js';

const land = getLandRings();
const city = generateProceduralCity(land);
const world = createPhysicsWorld();
const colliders = new BuildingColliders(world, city.buildings);
const sp = computeSpawns(land, colliders);
const human = { x: sp.human[0], z: sp.human[1], heading: 0.3 };
const env = { land, colliders, groundAt: () => 0 };

test('car is summoned beside the character, on land, clear of buildings', () => {
  const r = summonPlacement('car', human, env);
  assert.ok(r.ok, r.note);
  const d = Math.hypot(r.x - human.x, r.z - human.z);
  assert.ok(d < 5, `car ${d.toFixed(1)} m from the character`);
  assert.ok(pointInLand(r.x, r.z, land), 'car should be on land');
  assert.ok(footprintClear(r.x, r.z, r.heading - Math.PI, 0.95, 2.1, land, colliders), 'car footprint should be clear');
});

test('helicopter is summoned beside the character, close enough to board', () => {
  const r = summonPlacement('heli', human, env);
  assert.ok(r.ok, r.note);
  const d = Math.hypot(r.x - human.x, r.z - human.z);
  assert.ok(d < 6, `helicopter ${d.toFixed(1)} m from the character`);
});

test('boat is summoned on water, at the nearest open sea', () => {
  const r = summonPlacement('boat', human, env);
  assert.ok(r.ok, r.note);
  assert.ok(!pointInLand(r.x, r.z, land), 'boat should be on water');
  assert.equal(r.y, WATER_Y + 0.25);
});

test('jet is parked on a runway-length strip of open ground', () => {
  const r = summonPlacement('plane', human, env);
  assert.ok(r.ok, r.note);
  assert.ok(pointInLand(r.x, r.z, land), 'jet should be on land');
  assert.ok(Math.hypot(r.x - human.x, r.z - human.z) < 2500, 'jet within 2.5 km');
});

test('unknown vehicle kinds are refused', () => {
  assert.equal(summonPlacement('tank', human, env).ok, false);
});
