import * as CANNON from 'cannon-es';
import * as THREE from 'three';

/**
 * Human On-Foot Locomotion Physics & Animation Controller.
 */
export class HumanController {
  constructor(world, visualMesh, spawnPos = { x: 0, y: 1.5, z: 0 }) {
    this.world = world;
    this.mesh = visualMesh;

    // Rigid sphere/capsule physics body
    this.body = new CANNON.Body({
      mass: 75,
      shape: new CANNON.Sphere(0.6),
      fixedRotation: true, // Keep human upright
      linearDamping: 0.85
    });
    this.body.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
    this.world.addBody(this.body);

    this.heading = 0; // Radians
    this.animTime = 0;
    this.isGrounded = true;
    this.speed = 0;
  }

  update(dt, input) {
    const moveX = input.moveX || 0;
    const moveY = input.moveY || 0;
    const isSprint = input.sprint || false;
    const isJump = input.jump || false;

    // Check grounded state
    this.isGrounded = Math.abs(this.body.velocity.y) < 0.2 && this.body.position.y <= 1.8;

    // Movement speed
    const baseSpeed = isSprint ? 9.5 : 4.5;
    const inputLen = Math.hypot(moveX, moveY);

    if (inputLen > 0.05) {
      // Calculate target heading relative to camera yaw
      const targetAngle = Math.atan2(moveX, moveY) + (input.cameraYaw || 0);
      this.heading = targetAngle;

      const fwdX = Math.sin(targetAngle) * baseSpeed * Math.min(1.0, inputLen);
      const fwdZ = Math.cos(targetAngle) * baseSpeed * Math.min(1.0, inputLen);

      this.body.velocity.x = fwdX;
      this.body.velocity.z = fwdZ;
      this.speed = Math.hypot(fwdX, fwdZ);
    } else {
      this.speed = 0;
    }

    // Jump impulse
    if (isJump && this.isGrounded) {
      this.body.velocity.y = 5.2;
    }

    // Sync 3D Visual Mesh with Physics Body
    this.mesh.position.copy(this.body.position);
    this.mesh.position.y -= 0.6; // Ground offset
    this.mesh.rotation.y = this.heading;

    // Locomotion Leg & Arm Swing Animation
    if (this.speed > 0.5) {
      this.animTime += dt * (isSprint ? 14 : 9);
      const legAngle = Math.sin(this.animTime) * 0.55;
      const armAngle = Math.cos(this.animTime) * 0.45;

      const { leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot } = this.mesh.userData;
      if (leftLegPivot) leftLegPivot.rotation.x = legAngle;
      if (rightLegPivot) rightLegPivot.rotation.x = -legAngle;
      if (leftArmPivot) leftArmPivot.rotation.x = -armAngle;
      if (rightArmPivot) rightArmPivot.rotation.x = armAngle;
    } else {
      const { leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot } = this.mesh.userData;
      if (leftLegPivot) leftLegPivot.rotation.x = 0;
      if (rightLegPivot) rightLegPivot.rotation.x = 0;
      if (leftArmPivot) leftArmPivot.rotation.x = 0;
      if (rightArmPivot) rightArmPivot.rotation.x = 0;
    }
  }

  teleport(x, y, z) {
    this.body.position.set(x, y, z);
    this.body.velocity.set(0, 0, 0);
  }

  getPosition() {
    return this.body.position;
  }
}
