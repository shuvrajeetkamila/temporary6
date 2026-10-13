// Headless physics checks (no browser needed). Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { createPhysicsWorld, GROUP_STATIC, MATERIALS } from '../src/physics.js';
import { Car, Boat, Plane, Helicopter, Human } from '../src/entities/vehicles.js';
import { WATER_Y } from '../src/config.js';

const DT = 1 / 60;
const IDLE = { x: 0, y: 0, throttle: 0, brake: false, jump: false, run: false };

function flatWorld() {
  const world = createPhysicsWorld();
  const ground = new CANNON.Body({
    mass: 0,
    shape: new CANNON.Box(new CANNON.Vec3(2000, 0.5, 2000)),
    position: new CANNON.Vec3(0, -0.5, 0),
    material: MATERIALS.ground,
  });
  ground.collisionFilterGroup = GROUP_STATIC;
  world.addBody(ground);
  return world;
}
const steps = (world, n, fn) => {
  for (let i = 0; i < n; i++) {
    fn?.(i);
    world.step(DT);
  }
};
const scene = new THREE.Scene();

test('car drives along its nose (-Z) and steers right with D', () => {
  const w = flatWorld();
  const car = new Car(w, scene, 0, 0, 0);
  steps(w, 120, () => car.update(DT, IDLE));
  const z0 = car.body.position.z;
  steps(w, 240, () => car.update(DT, { ...IDLE, y: 1 }));
  assert.ok(car.body.position.z - z0 < -20, `expected to drive toward -Z, dz=${car.body.position.z - z0}`);

  steps(w, 240, () => car.update(DT, { ...IDLE, y: 0.6, x: 1 }));
  const nose = car.body.vectorToWorldFrame(new CANNON.Vec3(0, 0, -1), new CANNON.Vec3());
  assert.ok(nose.x > 0.3, `D should turn right (nose toward +X), nose.x=${nose.x}`);
});

test('boat floats at the waterline and moves under throttle', () => {
  const w = createPhysicsWorld();
  const boat = new Boat(w, scene, 5000, 5000, 0);
  steps(w, 300, () => boat.update(DT, IDLE));
  assert.ok(Math.abs(boat.body.position.y - WATER_Y) < 0.4, `boat y=${boat.body.position.y}`);
  const z1 = boat.body.position.z;
  steps(w, 300, () => boat.update(DT, { ...IDLE, y: 1 }));
  assert.ok(Math.abs(boat.body.position.z - z1) > 20, 'boat should move forward');
  assert.ok(boat.body.position.y < 0.5, 'boat should stay on the water');
});

test('jet holds altitude at cruise speed', () => {
  const w = createPhysicsWorld();
  const plane = new Plane(w, scene, 0, 0, 0);
  let minY = Infinity;
  steps(w, 600, () => {
    plane.update(DT, IDLE);
    minY = Math.min(minY, plane.body.position.y);
  });
  assert.ok(minY > 55, `plane sank to ${minY}`);
});

test('helicopter hovers with no input and climbs with throttle', () => {
  const w = flatWorld();
  const heli = new Helicopter(w, scene, 0, 0, 0);
  steps(w, 360, () => heli.update(DT, IDLE));
  assert.ok(Math.abs(heli.body.position.y - 4) < 0.1, `hover y=${heli.body.position.y}`);
  steps(w, 180, () => heli.update(DT, { ...IDLE, throttle: 1 }));
  assert.ok(heli.body.position.y > 15, `climb y=${heli.body.position.y}`);
});

test('human stands on the ground and walks at ~4.2 m/s', () => {
  const w = flatWorld();
  const hu = new Human(w, scene, 0, 0);
  steps(w, 120, () => hu.update(DT, IDLE, 0));
  assert.ok(Math.abs(hu.body.position.y - Human.RADIUS) < 0.02, `idle y=${hu.body.position.y}`);
  assert.ok(hu.grounded, 'should be grounded');
  const z0 = hu.body.position.z;
  steps(w, 120, () => hu.update(DT, { ...IDLE, y: 1 }, 0)); // camera yaw 0 -> W goes into the screen (-Z)
  const dz = hu.body.position.z - z0;
  assert.ok(dz < -7 && dz > -9, `walk dz=${dz}`);
});
