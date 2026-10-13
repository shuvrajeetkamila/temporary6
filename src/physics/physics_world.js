import * as CANNON from 'cannon-es';

/**
 * Step 2: Physics Engine Setup (Cannon-es).
 * Coordinates parallel rigid-body simulation for humans and multi-class vehicles.
 */
export function createPhysicsWorld() {
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);

  // Broadphase algorithm
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.05;

  // Static Ground Plane (Y = 1.0 represents the top of the island asphalt/sand)
  const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
  });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  groundBody.position.set(0, 1.0, 0);
  world.addBody(groundBody);

  return { world, groundBody };
}
