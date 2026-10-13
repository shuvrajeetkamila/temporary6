import * as CANNON from 'cannon-es';

/**
 * Single-Engine Propeller Aeroplane Physics Controller.
 * Simulates aerodynamic lift, thrust, pitch, roll, yaw, and tricycle landing gear.
 */
export class PlaneVehicle {
  constructor(world, visualMesh, spawnPos = { x: 500, y: 1.5, z: -300 }) {
    this.world = world;
    this.mesh = visualMesh;

    const planeShape = new CANNON.Box(new CANNON.Vec3(1.0, 0.7, 3.8));
    this.body = new CANNON.Body({
      mass: 900,
      shape: planeShape,
      linearDamping: 0.05,
      angularDamping: 0.3
    });
    this.body.position.set(spawnPos.x, spawnPos.y + 0.5, spawnPos.z);
    this.world.addBody(this.body);

    this.throttle = 0; // 0 to 1
    this.airspeedKmh = 0;
    this.propAngle = 0;
  }

  update(dt, input) {
    const pitch = input.pitch || (input.moveY || 0); // Elevator
    const roll = -(input.moveX || 0);               // Aileron
    const isThrottleUp = input.sprint || false;
    const isBrake = input.jump || false;

    // Adjust throttle
    if (isThrottleUp) {
      this.throttle = Math.min(1.0, this.throttle + dt * 0.5);
    } else if (isBrake) {
      this.throttle = Math.max(0.0, this.throttle - dt * 0.7);
    }

    const fwd = this.body.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1));
    const up = this.body.vectorToWorldFrame(new CANNON.Vec3(0, 1, 0));
    const right = this.body.vectorToWorldFrame(new CANNON.Vec3(1, 0, 0));

    // Forward Airspeed
    const forwardSpeed = this.body.velocity.dot(fwd);
    this.airspeedKmh = Math.max(0, forwardSpeed * 3.6);

    // 1. Engine & Propeller Thrust
    const maxThrust = 4800;
    const thrust = fwd.scale(this.throttle * maxThrust);
    this.body.applyForce(thrust, this.body.position);

    // 2. Aerodynamic Wing Lift: proportional to airspeed squared
    if (forwardSpeed > 5) {
      const liftFactor = Math.min(1.8, (forwardSpeed / 30) ** 1.8);
      const liftForce = up.scale(liftFactor * 900 * 9.82);
      this.body.applyForce(liftForce, this.body.position);

      // Aerodynamic Control Surfaces (Pitch, Roll, Yaw)
      const pitchTorque = right.scale(pitch * 2800 * liftFactor);
      const rollTorque = fwd.scale(roll * 2400 * liftFactor);
      this.body.applyTorque(pitchTorque);
      this.body.applyTorque(rollTorque);

      // Natural aerodynamic damping aligns aircraft with flight path
      const sideVel = this.body.velocity.dot(right);
      this.body.applyForce(right.scale(-sideVel * 600), this.body.position);
    }

    // Runway / Ground contact friction
    if (this.body.position.y <= 1.8 && isBrake) {
      this.body.velocity.scale(0.92, this.body.velocity);
    }

    // Sync 3D Mesh
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);

    // Spin Propeller
    const { propHub } = this.mesh.userData;
    if (propHub) {
      this.propAngle += dt * (this.throttle * 40 + 8);
      propHub.rotation.z = this.propAngle;
    }
  }

  teleport(x, y, z) {
    this.body.position.set(x, Math.max(1.8, y + 2.0), z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
    this.throttle = 0;
  }

  getPosition() {
    return this.body.position;
  }
}
