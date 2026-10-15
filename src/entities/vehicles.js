// Locomotion controllers. Each entity owns a cannon-es body (physics truth) and a three.js root (visual).
// Input object: { x: -1..1 (A/D or left stick X), y: -1..1 (W/S or stick Y), throttle: -1..1 (Shift/Ctrl),
//                 brake: bool (Space), jump: bool (Space), run: bool (Shift) }
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { addDynamicBody, addHullShapes, groundHeightAt, MATERIALS } from '../physics.js';
import { WATER_Y, GRAVITY } from '../config.js';
import { buildHuman, buildCar, buildWheel, buildBoat, buildPlane, buildHelicopter } from './models.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/** Puts a body at (x, y, z) facing `heading` (yaw) with no motion. Used when a vehicle is summoned. */
function placeBody(body, x, y, z, heading) {
  body.position.set(x, y, z);
  body.quaternion.setFromEuler(0, heading, 0);
  body.velocity.set(0, 0, 0);
  body.angularVelocity.set(0, 0, 0);
}

const V = (x, y, z) => new CANNON.Vec3(x, y, z);
const _v = new CANNON.Vec3();

/** Forward for models whose nose is +Z in the body frame. */
function forwardPlusZ(body) {
  const f = body.vectorToWorldFrame(V(0, 0, 1), _v);
  return { fx: f.x, fz: f.z };
}

// ---------------------------------------------------------------------------------------------
export class Human {
  static RADIUS = 0.5;
  constructor(world, scene, x, z) {
    this.kind = 'human';
    this.name = 'You';
    this.world = world;
    this.scene = scene;
    const y = groundHeightAt(world, x, z) + Human.RADIUS + 0.2;
    this.body = addDynamicBody(world, {
      mass: 80,
      shape: new CANNON.Sphere(Human.RADIUS),
      position: V(x, y, z),
      linearDamping: 0.05,
      angularDamping: 1,
      fixedRotation: true,
      material: MATERIALS.human,
    });
    this.root = buildHuman();
    scene.add(this.root);
    this.heading = 0;
    this.walk = 0;
    this.grounded = true;
    this.inWorld = true;
  }

  /** Human movement is camera-relative: W goes "into the screen". */
  update(dt, input, camYaw) {
    const b = this.body;
    const fx = -Math.sin(camYaw);
    const fz = -Math.cos(camYaw);
    const rx = Math.cos(camYaw);
    const rz = -Math.sin(camYaw);
    let mx = rx * input.x + fx * input.y;
    let mz = rz * input.x + fz * input.y;
    const mag = Math.hypot(mx, mz);
    if (mag > 1) {
      mx /= mag;
      mz /= mag;
    }
    const speed = input.run ? 7.5 : 4.2;
    const k = Math.min(1, dt * 12);
    b.velocity.x += (mx * speed * Math.min(1, mag) - b.velocity.x) * k;
    b.velocity.z += (mz * speed * Math.min(1, mag) - b.velocity.z) * k;

    const gy = groundHeightAt(this.world, b.position.x, b.position.z);
    this.grounded = b.position.y - Human.RADIUS - gy < 0.15 && b.velocity.y < 1;
    if (input.jump && this.grounded) b.velocity.y = 5.5;

    if (mag > 0.1) this.heading = Math.atan2(mx, mz);
    this.moving = mag > 0.1 ? speed : 0;
  }

  sync(dt) {
    const b = this.body;
    this.root.visible = this.inWorld;
    this.root.position.set(b.position.x, b.position.y - Human.RADIUS, b.position.z);
    // turn smoothly to face heading
    let d = this.heading - this.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.root.rotation.y += d * Math.min(1, dt * 10);
    this.walk += dt * this.moving * 2.4;
    const anim = this.root.userData.anim;
    if (anim) {
      this.playAnimation(anim, dt);
      return;
    }
    const { legL, legR, armL, armR } = this.root.userData.limbs;
    const swing = this.grounded ? Math.sin(this.walk) * Math.min(1, this.moving / 4) * 0.7 : 0.3;
    legL.rotation.x = swing;
    legR.rotation.x = -swing;
    armL.rotation.x = -swing * 0.8;
    armR.rotation.x = swing * 0.8;
  }

  /** Crossfades between idle, walk and run clips of the real character model. */
  playAnimation(anim, dt) {
    const want = !this.grounded ? 'idle' : this.moving > 5 ? 'run' : this.moving > 0 ? 'walk' : 'idle';
    const next = anim.actions[want] ?? anim.actions.idle;
    if (next && next !== anim.current) {
      const prev = anim.current;
      next.reset().fadeIn(0.2).play();
      if (prev) prev.fadeOut(0.2);
      anim.current = next;
    }
    anim.mixer.update(dt);
  }

  /** World-space forward direction on the ground (unit XZ). */
  forward() {
    return { fx: Math.sin(this.heading), fz: Math.cos(this.heading) };
  }

  teleport(x, z) {
    const b = this.body;
    const gy = groundHeightAt(this.world, x, z);
    b.position.set(x, gy + Human.RADIUS + 2, z);
    b.velocity.set(0, 0, 0);
  }

  setInWorld(on, at) {
    if (on === this.inWorld) return;
    this.inWorld = on;
    if (on) {
      if (at) this.body.position.copy(at);
      this.world.addBody(this.body);
    } else {
      this.world.removeBody(this.body);
    }
  }

  /** Distance from the human to a vehicle's bounding box (0 when touching). */
  distanceTo(vehicle) {
    const local = vehicle.body.pointToLocalFrame(this.body.position, new CANNON.Vec3());
    const h = vehicle.halfExtents;
    const dx = Math.max(0, Math.abs(local.x) - h.x);
    const dy = Math.max(0, Math.abs(local.y) - h.y);
    const dz = Math.max(0, Math.abs(local.z) - h.z);
    return Math.hypot(dx, dy, dz);
  }
}

// ---------------------------------------------------------------------------------------------
/** Car tuning. Units: N, m/s, kg. Calibrated with .lab/measure.mjs and checked in tests/physics.test.mjs. */
export const CAR = {
  powerW: 160000,
  tractionCap: 7500,
  reverseForce: 2500,
  reverseMax: 9,
  aeroK: 0.45, // ~0.5 * rho * Cd * A
  rollingN: 130,
  downforceK: 0.8,
  frictionSlip: 3.5,
  frictionRearHandbrake: 1.3,
  handbrakeN: 30, // rear brake impulse per step while the handbrake is held (the service brake is 60 on all wheels)
  maxSteer: 0.5, // rad (about 29°) at standstill
  maxLatG: 1.0, // lateral acceleration the steering allows before the car would slide
  wheelbase: 2.6, // m
};

export class Car {
  constructor(world, scene, x, z, heading = 0) {
    this.kind = 'car';
    this.name = 'Car';
    this.world = world;
    this.halfExtents = new CANNON.Vec3(0.95, 0.38, 2.1);
    const gy = groundHeightAt(world, x, z);
    this.spawn = { x, z, heading, y: gy + 1.2 };
    this.body = addDynamicBody(world, {
      mass: 1100,
      shape: new CANNON.Box(this.halfExtents),
      linearDamping: 0, // air drag is modelled in update() (CAR.aeroK), so the body has no extra damping
      angularDamping: 0.5,
    });
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.body,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2,
    });
    const common = {
      radius: 0.36,
      directionLocal: V(0, -1, 0),
      suspensionStiffness: 30,
      suspensionRestLength: 0.3,
      maxSuspensionTravel: 0.3,
      maxSuspensionForce: 100000,
      frictionSlip: CAR.frictionSlip,
      dampingRelaxation: 2.3,
      dampingCompression: 4.4,
      rollInfluence: 0.01,
      axleLocal: V(1, 0, 0),
      useCustomSlidingRotationalSpeed: true,
      customSlidingRotationalSpeed: -30,
    };
    const wheelPositions = [
      { p: V(0.8, -0.1, 1.3), front: true },
      { p: V(-0.8, -0.1, 1.3), front: true },
      { p: V(0.8, -0.1, -1.3), front: false },
      { p: V(-0.8, -0.1, -1.3), front: false },
    ];
    for (const w of wheelPositions) {
      this.vehicle.addWheel({ ...common, chassisConnectionPointLocal: w.p, isFrontWheel: w.front });
    }
    this.vehicle.addToWorld(world);

    // cannon-es derives the drive direction from the chassis right axis, so its forward is -Z.
    // The visual model is built nose-along +Z, so it gets a 180° yaw inside the body frame.
    this.root = buildCar(0xc0392b);
    this.modelYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
    scene.add(this.root);
    this.wheels = wheelPositions.map(() => {
      const w = buildWheel();
      scene.add(w.root);
      return w;
    });
    this.steer = 0;
    this.reset();
  }

  reset() {
    const s = this.spawn;
    this.body.position.set(s.x, s.y, s.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.setFromEuler(0, s.heading, 0);
  }

  /** Summon: stand the car at a new spot. `heading` is the yaw of the body frame (nose is -Z). */
  placeAt(x, y, z, heading) {
    placeBody(this.body, x, y, z, heading);
    this.steer = 0;
  }

  get fwdSpeed() {
    const fwd = this.body.vectorToWorldFrame(V(0, 0, -1), _v);
    return this.body.velocity.dot(fwd);
  }

  update(dt, input) {
    const b = this.body;
    const fs = this.fwdSpeed;
    const speed = Math.abs(fs);
    const throttle = input.y;

    // Power-limited drive: about 160 kW at speed, capped at 7.5 kN of traction (strong pull from rest, fading at speed).
    let engine = 0;
    let brake = 0;
    if (throttle > 0.05) {
      if (fs < -1) brake = 60;
      else engine = throttle * Math.min(CAR.tractionCap, CAR.powerW / Math.max(fs, 4));
    } else if (throttle < -0.05) {
      if (fs > 1) brake = 60;
      else if (speed < CAR.reverseMax) engine = throttle * CAR.reverseForce;
    } else {
      brake = 4; // coast: engine braking and rolling drag
    }

    // Handbrake (Space): locks the rear wheels and lets the back end slide at speed.
    const handbrake = input.brake && speed > 3;
    this.vehicle.wheelInfos[2].frictionSlip = handbrake ? CAR.frictionRearHandbrake : CAR.frictionSlip;
    this.vehicle.wheelInfos[3].frictionSlip = handbrake ? CAR.frictionRearHandbrake : CAR.frictionSlip;

    // Full lock when parked (about 29°); it narrows as speed rises.
    // Steering lock is limited so the turn never needs more than CAR.maxLatG of sideways acceleration: tan(lock) = L·g / v².
    const lock = Math.min(CAR.maxSteer, Math.atan2(CAR.maxLatG * 9.82 * CAR.wheelbase, speed * speed + 4));
    const targetSteer = input.x * lock; // cannon's steering is positive for a left turn when facing -Z, so D (right) is positive
    this.steer += (targetSteer - this.steer) * Math.min(1, dt * 8);
    this.vehicle.setSteeringValue(this.steer, 0);
    this.vehicle.setSteeringValue(this.steer, 1);

    this.vehicle.applyEngineForce(engine / 2, 2);
    this.vehicle.applyEngineForce(engine / 2, 3);
    if (input.brake) {
      // Handbrake: rear wheels only, so the back end slides instead of the car stopping dead.
      this.vehicle.setBrake(0, 0);
      this.vehicle.setBrake(0, 1);
      this.vehicle.setBrake(CAR.handbrakeN, 2);
      this.vehicle.setBrake(CAR.handbrakeN, 3);
    } else {
      for (let i = 0; i < 4; i++) this.vehicle.setBrake(i < 2 ? brake * 0.6 : brake, i);
    }

    // Air drag and rolling resistance oppose the motion; downforce presses the car onto the road at speed.
    if (speed > 0.05) {
      const v = b.velocity;
      const F = CAR.aeroK * speed * speed + CAR.rollingN;
      b.applyForce(V((-v.x / speed) * F, 0, (-v.z / speed) * F), V(0, 0, 0));
    }
    b.applyForce(V(0, -CAR.downforceK * speed * speed, 0), V(0, 0, 0));
  }

  sync(dt) {
    const q = this.body.quaternion;
    this.root.position.copy(this.body.position);
    this.root.quaternion.set(q.x, q.y, q.z, q.w).multiply(this.modelYaw);
    const fs = this.fwdSpeed;
    for (let i = 0; i < this.wheels.length; i++) {
      const wt = this.vehicle.wheelInfos[i].worldTransform;
      const w = this.wheels[i];
      w.root.position.copy(wt.position);
      w.root.quaternion.copy(wt.quaternion);
      w.spin.rotation.x -= (fs / 0.36) * dt; // rolling toward -Z spins about +X the other way
    }
  }

  get speedKmh() {
    return Math.abs(this.fwdSpeed) * 3.6;
  }

  forward() {
    const f = this.body.vectorToWorldFrame(V(0, 0, -1), _v);
    return { fx: f.x, fz: f.z };
  }

  /** Point to the side of the vehicle (world XZ) where a passenger steps out. */
  sidePoint() {
    const p = this.body.pointToWorldFrame(V(1.9, 0, 0), new CANNON.Vec3());
    return { x: p.x, z: p.z };
  }
}

// ---------------------------------------------------------------------------------------------
export class Boat {
  constructor(world, scene, x, z, heading = 0) {
    this.kind = 'boat';
    this.name = 'Boat';
    this.world = world;
    this.halfExtents = new CANNON.Vec3(1.1, 0.45, 3.2);
    this.spawn = { x, z, heading };
    this.body = addDynamicBody(world, {
      mass: 900,
      linearDamping: 0.2,
      angularDamping: 0.9,
    });
    addHullShapes(this.body, this.halfExtents); // spheres, not a Box: boxes fall through the island mesh
    this.buoyancyPoints = [V(-1, -0.45, -2.8), V(1, -0.45, -2.8), V(-1, -0.45, 2.6), V(1, -0.45, 2.6)];
    this.root = buildBoat(0xf5f5f5);
    scene.add(this.root);
    this.reset();
  }

  reset() {
    const s = this.spawn;
    this.body.position.set(s.x, WATER_Y + 0.25, s.z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.body.quaternion.setFromEuler(0, s.heading, 0);
  }

  placeAt(x, y, z, heading) {
    placeBody(this.body, x, y, z, heading);
  }

  update(dt, input) {
    const b = this.body;
    const m = b.mass;
    // Buoyancy: each corner pushes up in proportion to how far it is under the surface, plus damping.
    const K = (m * GRAVITY) / this.buoyancyPoints.length / 0.35;
    let inWater = 0;
    for (const lp of this.buoyancyPoints) {
      const wp = b.pointToWorldFrame(lp, new CANNON.Vec3());
      const depth = WATER_Y - wp.y;
      if (depth > 0) {
        inWater++;
        b.getVelocityAtWorldPoint(wp, _v);
        const F = K * Math.min(depth, 0.9) - 420 * _v.y;
        b.applyForce(V(0, F, 0), V(wp.x - b.position.x, 0, wp.z - b.position.z));
      }
    }
    if (inWater === 0) return; // on land: boat is just a box (unusual)

    const fwd = b.vectorToWorldFrame(V(0, 0, 1), new CANNON.Vec3());
    const vf = b.velocity.dot(fwd);
    let thrust = input.y * 4200;
    if (input.y > 0 && vf > 18) thrust *= 0.15;
    b.applyForce(V(fwd.x * thrust, 0, fwd.z * thrust), V(0, 0, 0));

    // Keel: cancel sideways slip so the boat does not skate like a car on ice
    const right = b.vectorToWorldFrame(V(-1, 0, 0), new CANNON.Vec3());
    const vs = b.velocity.dot(right);
    b.applyForce(V(-right.x * vs * 900, 0, -right.z * vs * 900), V(0, 0, 0));

    const speedFactor = clamp(Math.abs(vf) / 6, 0, 1);
    const targetYaw = -input.x * 0.9 * speedFactor * (vf >= -0.5 ? 1 : -1);
    b.angularVelocity.y += (targetYaw - b.angularVelocity.y) * Math.min(1, dt * 4);
    const damp = Math.exp(-dt * 2.5);
    b.angularVelocity.x *= damp;
    b.angularVelocity.z *= damp;
  }

  sync() {
    this.root.position.copy(this.body.position);
    this.root.quaternion.copy(this.body.quaternion);
  }

  get speedKmh() {
    return this.body.velocity.length() * 3.6;
  }

  forward() {
    return forwardPlusZ(this.body);
  }

  sidePoint() {
    const p = this.body.pointToWorldFrame(V(2.2, 0, 0), new CANNON.Vec3());
    return { x: p.x, z: p.z };
  }
}

// ---------------------------------------------------------------------------------------------
const _fwd = new CANNON.Vec3();
const _up = new CANNON.Vec3();
const _right = new CANNON.Vec3();
const _av = new CANNON.Vec3();

/** Sets the body's angular velocity from local-frame rates (x = pitch, y = yaw, z = roll). */
function setLocalAngularVelocity(body, ax, ay, az) {
  body.vectorToWorldFrame(V(ax, ay, az), _av);
  body.angularVelocity.copy(_av);
}

export class Plane {
  constructor(world, scene, x, z, heading = 0) {
    this.kind = 'plane';
    this.name = 'Jet';
    this.world = world;
    this.halfExtents = new CANNON.Vec3(1.2, 0.6, 3.6);
    const gy = groundHeightAt(world, x, z);
    this.spawn = { x, z, heading, y: gy + 60 };
    this.body = addDynamicBody(world, {
      mass: 3000,
      linearDamping: 0,
      angularDamping: 0,
      material: MATERIALS.wheels, // a low-friction contact lets the jet roll along the ground under thrust
    });
    addHullShapes(this.body, this.halfExtents); // spheres, not a Box: boxes fall through the island mesh
    this.throttle = 0.75;
    this.piloted = false;
    this.onGround = false;
    this.root = buildPlane();
    scene.add(this.root);
    this.reset();
  }

  /** Summon: park the jet on the ground at a new spot, cold and unpiloted (it does not move until someone flies it). */
  placeAt(x, y, z, heading) {
    placeBody(this.body, x, y, z, heading);
    this.throttle = 1;
    this.piloted = false;
    this.onGround = true;
  }

  reset() {
    const s = this.spawn;
    this.body.position.set(s.x, s.y, s.z);
    this.body.quaternion.setFromEuler(0, s.heading, 0);
    const fwd = this.body.vectorToWorldFrame(V(0, 0, 1), _fwd);
    this.body.velocity.set(fwd.x * 70, 0, fwd.z * 70);
    this.body.angularVelocity.set(0, 0, 0);
    this.throttle = 0.75;
  }

  update(dt, input) {
    const b = this.body;
    const m = b.mass;
    const agl = b.position.y - groundHeightAt(this.world, b.position.x, b.position.z);
    this.onGround = agl < 1.0;
    // An unpiloted jet parked on the ground stays put (no thrust), so a summoned jet does not roll off by itself.
    if (!this.piloted && this.onGround) {
      b.velocity.x *= Math.exp(-dt * 4);
      b.velocity.z *= Math.exp(-dt * 4);
      return;
    }
    this.throttle = clamp(this.throttle + input.throttle * dt * 0.5, 0, 1);

    const fwd = b.vectorToWorldFrame(V(0, 0, 1), _fwd);
    const up = b.vectorToWorldFrame(V(0, 1, 0), _up);
    const v = b.velocity;
    const speed = v.length();
    const vf = v.dot(fwd);

    // thrust along the nose; quadratic drag; lift grows with airspeed (lift ≈ weight at ~55 m/s)
    const thrust = this.throttle * 12000;
    const drag = 0.6 * speed; // drag force = drag · v, so it grows with v² (top speed about 500 km/h at full throttle)
    const liftFactor = clamp((vf - 20) / 35, 0, 1.0);
    // On the runway the lift is a little above the weight, so the nose leaves the ground once the speed is enough.
    const lift = m * GRAVITY * liftFactor * (this.onGround ? 1.25 : 1);
    b.applyForce(
      V(
        fwd.x * thrust - v.x * drag + up.x * lift,
        fwd.y * thrust - v.y * drag + up.y * lift,
        fwd.z * thrust - v.z * drag + up.z * lift,
      ),
      V(0, 0, 0),
    );

    // arcade attitude control: rates in the aircraft's own frame
    const right = b.vectorToWorldFrame(V(-1, 0, 0), _right);
    // On the ground the undercarriage stops sideways drift (the contact has no friction, so this does the work of wheels).
    if (b.position.y - groundHeightAt(this.world, b.position.x, b.position.z) < 2.5) {
      const vr = v.dot(right);
      b.velocity.x -= right.x * vr * Math.min(1, dt * 6);
      b.velocity.z -= right.z * vr * Math.min(1, dt * 6);
    }
    const levelRoll = Math.abs(input.x) < 0.05 ? right.y * 1.2 : 0; // gentle auto-level
    const pitch = input.y * 0.9;
    const roll = input.x * 1.6 + levelRoll;
    const yaw = -input.x * 0.5;
    setLocalAngularVelocity(b, pitch, yaw, roll);
  }

  sync() {
    this.root.position.copy(this.body.position);
    this.root.quaternion.copy(this.body.quaternion);
  }

  get speedKmh() {
    return this.body.velocity.length() * 3.6;
  }

  forward() {
    return forwardPlusZ(this.body);
  }

  sidePoint() {
    const p = this.body.pointToWorldFrame(V(3, 0, 0), new CANNON.Vec3());
    return { x: p.x, z: p.z };
  }
}

export class Helicopter {
  constructor(world, scene, x, z, heading = 0) {
    this.kind = 'heli';
    this.name = 'Helicopter';
    this.world = world;
    this.halfExtents = new CANNON.Vec3(1.1, 1.0, 1.8);
    const gy = groundHeightAt(world, x, z);
    this.spawn = { x, z, heading, y: gy + 4 };
    this.body = addDynamicBody(world, {
      mass: 1300,
      linearDamping: 0, // air drag is the rotor drag in update(), so the body adds none (same as the car)
      angularDamping: 0.5,
    });
    addHullShapes(this.body, this.halfExtents); // spheres, not a Box: boxes fall through the island mesh
    this.root = buildHelicopter();
    scene.add(this.root);
    this.reset();
  }

  reset() {
    const s = this.spawn;
    this.body.position.set(s.x, s.y, s.z);
    this.body.quaternion.setFromEuler(0, s.heading, 0);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
  }

  placeAt(x, y, z, heading) {
    placeBody(this.body, x, y, z, heading);
  }

  update(dt, input) {
    const b = this.body;
    const m = b.mass;
    const up = b.vectorToWorldFrame(V(0, 1, 0), _up);
    const fwd = b.vectorToWorldFrame(V(0, 0, 1), _fwd);
    const right = b.vectorToWorldFrame(V(-1, 0, 0), _right);
    const v = b.velocity;

    // collective: hold Shift/Ctrl to climb/descend; releasing holds altitude (hover)
    const climbTarget = input.throttle * 7;
    const accelUp = clamp(GRAVITY + 1.8 * (climbTarget - v.y), 0, 16);
    const cosTilt = Math.max(0.5, up.y);
    const T = (m * accelUp) / cosTilt;
    // Rotor drag: mostly linear at low speed, growing with v² so the top speed is about 150 km/h.
    const vh = Math.hypot(v.x, v.z);
    const dragK = m * (0.06 + 0.0015 * vh);
    b.applyForce(
      V(up.x * T - v.x * dragK, up.y * T, up.z * T - v.z * dragK),
      V(0, 0, 0),
    );

    // attitude: W tilts the nose down (forward flight); A/D yaw
    const pitchAngle = Math.asin(clamp(-fwd.y, -1, 1));
    const rollAngle = Math.asin(clamp(-right.y, -1, 1));
    const desiredPitch = input.y * 0.5;
    setLocalAngularVelocity(b, (desiredPitch - pitchAngle) * 3.0, -input.x * 1.4, (0 - rollAngle) * 3.0);
  }

  forward() {
    return forwardPlusZ(this.body);
  }

  sidePoint() {
    const p = this.body.pointToWorldFrame(V(2.5, 0, 0), new CANNON.Vec3());
    return { x: p.x, z: p.z };
  }

  sync(dt) {
    this.root.position.copy(this.body.position);
    this.root.quaternion.copy(this.body.quaternion);
    const rotor = this.root.userData.rotor;
    rotor.rotation.y += dt * 30;
    this.root.userData.tailRotor.rotation.x += dt * 40;
  }

  get speedKmh() {
    return this.body.velocity.length() * 3.6;
  }
}
