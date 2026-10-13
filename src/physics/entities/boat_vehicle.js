import * as CANNON from 'cannon-es';

/**
 * Traditional Bahrain Dhow Coastal Boat Buoyancy & Aquatic Physics.
 */
export class BoatVehicle {
  constructor(world, visualMesh, spawnPos = { x: 50, y: 0.2, z: 80 }) {
    this.world = world;
    this.mesh = visualMesh;

    const boatShape = new CANNON.Box(new CANNON.Vec3(1.6, 0.7, 4.4));
    this.body = new CANNON.Body({
      mass: 2200,
      shape: boatShape,
      linearDamping: 0.1,
      angularDamping: 0.35
    });
    this.body.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
    this.world.addBody(this.body);

    this.waterLevel = 0.0;
    this.speedKnots = 0;
  }

  update(dt, input) {
    const throttle = input.moveY || 0;
    const steer = -(input.moveX || 0);

    // 1. Hydrodynamic Buoyancy Simulation
    // 4 Corner buoyancy test points on hull
    const buoyancyPoints = [
      new CANNON.Vec3(-1.4, -0.5,  3.8), // Bow Left
      new CANNON.Vec3( 1.4, -0.5,  3.8), // Bow Right
      new CANNON.Vec3(-1.4, -0.5, -3.8), // Stern Left
      new CANNON.Vec3( 1.4, -0.5, -3.8)  // Stern Right
    ];

    const waterDensity = 1028; // Arabian Gulf saltwater density (kg/m^3)
    const gravity = 9.82;

    buoyancyPoints.forEach(pt => {
      const worldPt = this.body.pointToWorldFrame(pt);
      const depth = this.waterLevel - worldPt.y;

      if (depth > 0) {
        // Submerged: calculate upward Archimedes buoyant force
        const buoyantForce = Math.min(depth * 7500, 18000);
        this.body.applyForce(new CANNON.Vec3(0, buoyantForce, 0), worldPt);

        // Water drag resisting motion
        const localVel = this.body.velocity;
        this.body.applyForce(new CANNON.Vec3(-localVel.x * 400, 0, -localVel.z * 400), worldPt);
      }
    });

    // Righting torque to keep boat upright
    const rot = this.body.quaternion;
    const rightingTorqueX = -rot.x * 8000;
    const rightingTorqueZ = -rot.z * 8000;
    this.body.applyTorque(new CANNON.Vec3(rightingTorqueX, 0, rightingTorqueZ));

    // 2. Propeller Thrust & Rudder Steering
    if (this.body.position.y < 1.0) { // In water
      const fwd = this.body.vectorToWorldFrame(new CANNON.Vec3(0, 0, 1));
      const thrustForce = throttle * 6500;
      this.body.applyForce(fwd.scale(thrustForce), this.body.position);

      const rudderTorque = steer * 4500 * (Math.abs(throttle) > 0.1 ? 1 : 0.4);
      this.body.applyTorque(new CANNON.Vec3(0, rudderTorque, 0));
    }

    // Sync 3D Mesh
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);

    this.speedKnots = this.body.velocity.length() * 1.944;
  }

  teleport(x, y, z) {
    this.body.position.set(x, Math.max(0.2, y), z);
    this.body.velocity.set(0, 0, 0);
    this.body.angularVelocity.set(0, 0, 0);
  }

  getPosition() {
    return this.body.position;
  }
}
