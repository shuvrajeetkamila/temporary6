import * as CANNON from 'cannon-es';

/**
 * Utility Rescue Helicopter Physics Controller.
 * Simulates collective climb thrust, cyclic tilt, tail rotor yaw, and animated rotors.
 */
export class HeliVehicle {
  constructor(world, visualMesh, spawnPos = { x: -20, y: 1.5, z: 25 }) {
    this.world = world;
    this.mesh = visualMesh;

    const heliShape = new CANNON.Box(new CANNON.Vec3(1.2, 0.9, 2.5));
    this.body = new CANNON.Body({
      mass: 1400,
      shape: heliShape,
      linearDamping: 0.25,
      angularDamping: 0.45
    });
    this.body.position.set(spawnPos.x, spawnPos.y + 0.5, spawnPos.z);
    this.world.addBody(this.body);

    this.rotorRpm = 0; // 0 to 1
    this.mainRotorAngle = 0;
    this.tailRotorAngle = 0;
    this.speedKmh = 0;
  }

  update(dt, input) {
    const isLiftUp = input.sprint || false;   // Collective Up
    const isLiftDown = input.jump || false;   // Collective Down
    const cyclicPitch = input.moveY || 0;     // Tilt nose forward/backward
    const cyclicRoll = -(input.moveX || 0);   // Tilt roll left/right

    // Spool rotor RPM
    if (isLiftUp || Math.abs(cyclicPitch) > 0.1 || Math.abs(cyclicRoll) > 0.1) {
      this.rotorRpm = Math.min(1.0, this.rotorRpm + dt * 0.8);
    } else if (this.body.position.y < 2.0) {
      this.rotorRpm = Math.max(0.0, this.rotorRpm - dt * 0.4);
    }

    const up = this.body.vectorToWorldFrame(new CANNON.Vec3(0, 1, 0));
    const fwd = this.body.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1));
    const right = this.body.vectorToWorldFrame(new CANNON.Vec3(1, 0, 0));

    // 1. Collective Vertical Rotor Lift
    const baseHoverLift = 1400 * 9.82; // Balance gravity
    let collectiveMult = 1.0;
    if (isLiftUp) collectiveMult = 1.35;
    if (isLiftDown) collectiveMult = 0.65;

    const liftForce = up.scale(this.rotorRpm * baseHoverLift * collectiveMult);
    this.body.applyForce(liftForce, this.body.position);

    // 2. Cyclic Pitch & Roll Torque
    if (this.rotorRpm > 0.4) {
      const pitchTorque = right.scale(cyclicPitch * 3200 * this.rotorRpm);
      const rollTorque = fwd.scale(cyclicRoll * 2800 * this.rotorRpm);
      this.body.applyTorque(pitchTorque);
      this.body.applyTorque(rollTorque);

      // Natural aerodynamic righting when inputs released
      if (Math.abs(cyclicPitch) < 0.05 && Math.abs(cyclicRoll) < 0.05) {
        const rot = this.body.quaternion;
        this.body.applyTorque(new CANNON.Vec3(-rot.x * 2500, 0, -rot.z * 2500));
      }
    }

    // Ground landing damping
    if (this.body.position.y <= 1.8 && !isLiftUp) {
      this.body.velocity.scale(0.85, this.body.velocity);
      this.body.angularVelocity.scale(0.85, this.body.angularVelocity);
    }

    // Sync 3D Mesh
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);

    // Rotate Main and Tail Rotors
    const { mainRotorHub, tailRotorHub } = this.mesh.userData;
    if (this.rotorRpm > 0.05) {
      const speed = dt * this.rotorRpm * 45;
      this.mainRotorAngle += speed;
      this.tailRotorAngle += speed * 1.5;

      if (mainRotorHub) mainRotorHub.rotation.y = this.mainRotorAngle;
      if (tailRotorHub) tailRotorHub.rotation.x = this.tailRotorAngle;
    }

    this.speedKmh = this.body.velocity.length() * 3.6;
  }

  teleport(x, y, z) {
    this.body.position.set(x, Math.max(2.0, y + 2.0), z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
  }

  getPosition() {
    return this.body.position;
  }
}
