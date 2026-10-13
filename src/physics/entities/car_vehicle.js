import * as CANNON from 'cannon-es';
import * as THREE from 'three';

/**
 * 4x4 Off-Road SUV Raycast Vehicle Controller.
 * Features 4 suspension springs, motor torque, Ackermann steering, and handbrake drift.
 */
export class CarVehicle {
  constructor(world, visualMesh, spawnPos = { x: 5, y: 1.5, z: 2 }) {
    this.world = world;
    this.mesh = visualMesh;

    // Chassis Physics Body
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1.1, 0.5, 2.2));
    this.chassisBody = new CANNON.Body({
      mass: 1500,
      shape: chassisShape,
      linearDamping: 0.15,
      angularDamping: 0.4
    });
    this.chassisBody.position.set(spawnPos.x, spawnPos.y + 0.5, spawnPos.z);
    this.world.addBody(this.chassisBody);

    // Raycast Vehicle
    this.vehicle = new CANNON.RaycastVehicle({
      chassisBody: this.chassisBody,
      indexRightAxis: 0,
      indexUpAxis: 1,
      indexForwardAxis: 2
    });

    const wheelOptions = {
      radius: 0.42,
      directionLocal: new CANNON.Vec3(0, -1, 0),
      suspensionStiffness: 35,
      suspensionRestLength: 0.45,
      frictionSlip: 2.5,
      dampingRelaxation: 2.4,
      dampingCompression: 4.2,
      maxSuspensionForce: 15000,
      rollInfluence: 0.15,
      axleLocal: new CANNON.Vec3(-1, 0, 0),
      chassisConnectionPointLocal: new CANNON.Vec3()
    };

    // 4 Wheels (Front-Left, Front-Right, Rear-Left, Rear-Right)
    const offsets = [
      new CANNON.Vec3(-1.05, -0.15,  1.35), // FL
      new CANNON.Vec3( 1.05, -0.15,  1.35), // FR
      new CANNON.Vec3(-1.05, -0.15, -1.35), // RL
      new CANNON.Vec3( 1.05, -0.15, -1.35)  // RR
    ];

    offsets.forEach(offset => {
      wheelOptions.chassisConnectionPointLocal.copy(offset);
      this.vehicle.addWheel(wheelOptions);
    });

    this.vehicle.addToWorld(this.world);
    this.speedKmh = 0;
  }

  update(dt, input) {
    const throttle = input.moveY || 0;
    const steer = -(input.moveX || 0);
    const brake = input.brake || false;
    const handbrake = input.jump || false; // Drift

    // Engine Torque (Rear-wheel / All-wheel drive)
    const maxEngineForce = 1800;
    const engineForce = throttle * maxEngineForce;
    this.vehicle.applyEngineForce(engineForce, 2);
    this.vehicle.applyEngineForce(engineForce, 3);
    this.vehicle.applyEngineForce(engineForce * 0.5, 0);
    this.vehicle.applyEngineForce(engineForce * 0.5, 1);

    // Steering Angle
    const maxSteerVal = 0.55; // Radians ~ 31 degrees
    const steerAngle = steer * maxSteerVal;
    this.vehicle.setSteeringValue(steerAngle, 0);
    this.vehicle.setSteeringValue(steerAngle, 1);

    // Brakes & Drift
    const brakeForce = handbrake ? 90 : (brake ? 45 : (Math.abs(throttle) < 0.05 ? 5 : 0));
    for (let i = 0; i < 4; i++) {
      this.vehicle.setBrake(brakeForce, i);
    }

    // Sync 3D Mesh
    this.mesh.position.copy(this.chassisBody.position);
    this.mesh.quaternion.copy(this.chassisBody.quaternion);

    // Sync 4 Wheel Meshes
    const { wheelMeshes } = this.mesh.userData;
    if (wheelMeshes) {
      for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
        this.vehicle.updateWheelTransform(i);
        const transform = this.vehicle.wheelInfos[i].worldTransform;
        wheelMeshes[i].position.copy(transform.position);
        wheelMeshes[i].quaternion.copy(transform.quaternion);
      }
    }

    this.speedKmh = this.chassisBody.velocity.length() * 3.6;
  }

  teleport(x, y, z) {
    this.chassisBody.position.set(x, y + 0.6, z);
    this.chassisBody.velocity.set(0, 0, 0);
    this.chassisBody.angularVelocity.set(0, 0, 0);
  }

  getPosition() {
    return this.chassisBody.position;
  }
}
