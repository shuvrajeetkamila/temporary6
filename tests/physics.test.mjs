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

test('jet in cruise at 11 km holds its altitude and speed with no stick input', () => {
  const w = createPhysicsWorld();
  const plane = new Plane(w, scene, 0, 0, 0);
  plane.placeAt(0, 11000, 0, 0);
  const fwd = plane.body.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1));
  plane.body.velocity.set(fwd.x * 230, 0, fwd.z * 230);
  let minY = Infinity;
  let maxY = -Infinity;
  steps(w, 60 * 40, () => {
    plane.update(DT, { ...IDLE, throttle: 0.85 });
    minY = Math.min(minY, plane.body.position.y);
    maxY = Math.max(maxY, plane.body.position.y);
  });
  assert.ok(maxY - minY < 300, `altitude wandered ${(maxY - minY).toFixed(0)} m`);
  assert.ok(plane.body.velocity.length() > 180, `cruise speed ${plane.body.velocity.length().toFixed(0)} m/s`);
});

test('jet below its stall speed in the air sinks', () => {
  const w = createPhysicsWorld();
  const plane = new Plane(w, scene, 0, 0, 0);
  plane.placeAt(0, 1500, 0, 0);
  const fwd = plane.body.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1));
  plane.body.velocity.set(fwd.x * 55, 0, fwd.z * 55); // about 107 kt, well under the 74 m/s clean stall
  steps(w, 60 * 6, () => plane.update(DT, { ...IDLE, throttle: 0 }));
  assert.ok(plane.body.velocity.y < -5, `vertical speed ${plane.body.velocity.y.toFixed(1)} m/s`);
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

// ---- car tuning (see CAR in src/entities/vehicles.js; numbers measured with .lab scripts) ----
test('car reaches 100 km/h in under 6 s and tops out above 200 km/h', () => {
  const w = flatWorld();
  const car = new Car(w, scene, 0, 0, 0);
  let t = 0;
  let t100 = null;
  for (let i = 0; i < 60 * 40; i++) {
    car.update(DT, { ...IDLE, y: 1 });
    w.step(DT);
    t += DT;
    if (t100 === null && car.speedKmh >= 100) t100 = t;
  }
  assert.ok(t100 !== null && t100 < 6, `0-100 km/h took ${t100}`);
  assert.ok(car.speedKmh > 200, `top speed ${car.speedKmh} km/h`);
});

test('car stops from 100 km/h in under 45 m with the service brake (S)', () => {
  const w = flatWorld();
  const car = new Car(w, scene, 0, 0, 0);
  car.body.velocity.set(0, 0, -27.8);
  steps(w, 60, () => car.update(DT, IDLE));
  const z0 = car.body.position.z;
  for (let i = 0; i < 60 * 20 && car.speedKmh > 0.5; i++) {
    car.update(DT, { ...IDLE, y: -1 });
    w.step(DT);
  }
  const dist = z0 - car.body.position.z;
  assert.ok(dist > 25 && dist < 45, `stopping distance ${dist.toFixed(1)} m`);
});

test('handbrake lets the rear slide: more sideways speed than without it', () => {
  const run = (brake) => {
    const w = flatWorld();
    const car = new Car(w, scene, 0, 0, 0);
    car.body.velocity.set(0, 0, -16.7);
    steps(w, 30, () => car.update(DT, IDLE));
    let maxLat = 0;
    for (let i = 0; i < 120; i++) {
      car.update(DT, { ...IDLE, y: 0.2, x: 1, brake });
      w.step(DT);
      const right = car.body.vectorToWorldFrame(new CANNON.Vec3(1, 0, 0), new CANNON.Vec3());
      maxLat = Math.max(maxLat, Math.abs(car.body.velocity.dot(right)));
    }
    return maxLat;
  };
  const grip = run(false);
  const slide = run(true);
  assert.ok(slide > grip + 0.1, `handbrake lateral ${slide.toFixed(2)} vs ${grip.toFixed(2)} m/s`);
});

test('car steering stays within about 1 g at 90 km/h (no sideways skating)', () => {
  const w = flatWorld();
  const car = new Car(w, scene, 0, 0, 0);
  car.body.velocity.set(0, 0, -25);
  let minSpeed = Infinity;
  let maxRoll = 0;
  for (let i = 0; i < 60 * 4; i++) {
    car.update(DT, { ...IDLE, x: 1 });
    w.step(DT);
    if (i > 30) minSpeed = Math.min(minSpeed, car.speedKmh);
    const up = car.body.vectorToWorldFrame(new CANNON.Vec3(0, 1, 0), new CANNON.Vec3());
    maxRoll = Math.max(maxRoll, Math.acos(Math.min(1, up.y)));
  }
  assert.ok(minSpeed > 60, `speed dropped to ${minSpeed.toFixed(0)} km/h in a 90 km/h turn`);
  assert.ok(maxRoll < 0.1, `roll ${(maxRoll * 57.3).toFixed(1)}°`);
});

// ---- helicopter and jet ----
test('helicopter flies forward at a useful speed when W is held', () => {
  const w = flatWorld();
  const heli = new Helicopter(w, scene, 0, 0, 0);
  steps(w, 240, () => heli.update(DT, { ...IDLE, throttle: 1 }));
  steps(w, 60 * 25, () => heli.update(DT, { ...IDLE, y: 1 }));
  const v = Math.hypot(heli.body.velocity.x, heli.body.velocity.z);
  assert.ok(v > 35, `forward speed ${v.toFixed(1)} m/s after 25 s (about 150 km/h is the target)`);
});

test('a parked jet does not roll away on its own, and a piloted jet takes off after rotating at 75 m/s', () => {
  const parked = flatWorld();
  const p0 = new Plane(parked, scene, 0, 0, 0);
  p0.placeAt(0, 0.65, 0, 0);
  steps(parked, 60 * 15, () => p0.update(DT, IDLE));
  assert.ok(Math.abs(p0.body.position.z) < 0.5, `parked jet moved to z=${p0.body.position.z}`);

  const w = flatWorld();
  const p = new Plane(w, scene, 0, 0, 0);
  p.placeAt(0, 0.65, 0, 0);
  p.piloted = true;
  let liftoff = null;
  let t = 0;
  let rotated = false;
  for (let i = 0; i < 60 * 60; i++) {
    const fwdSpeed = p.body.velocity.length();
    if (fwdSpeed > 75) rotated = true;
    p.update(DT, { ...IDLE, throttle: 1, y: rotated ? -1 : 0 }); // full throttle; stick back once at 75 m/s
    w.step(DT);
    t += DT;
    if (liftoff === null && p.body.position.y > 1.5) liftoff = { t, v: fwdSpeed };
  }
  assert.ok(liftoff !== null, 'the jet never left the runway');
  assert.ok(liftoff.t < 45, `liftoff at ${liftoff.t.toFixed(1)} s`);
  assert.ok(liftoff.v > 75 && liftoff.v < 110, `liftoff at ${liftoff.v.toFixed(0)} m/s`);
});

test('jet at 11 km at full throttle settles near Mach 0.8', () => {
  const w = createPhysicsWorld();
  const plane = new Plane(w, scene, 0, 0, 0);
  plane.placeAt(0, 11000, 0, 0);
  const fwd = plane.body.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1));
  plane.body.velocity.set(fwd.x * 230, 0, fwd.z * 230);
  let top = 0;
  steps(w, 60 * 150, () => {
    plane.update(DT, { ...IDLE, throttle: 1 });
    top = Math.max(top, plane.body.velocity.length());
  });
  const mach = top / 295;
  assert.ok(mach > 0.75 && mach < 0.85, `top speed ${top.toFixed(0)} m/s, Mach ${mach.toFixed(3)}`);
});
