import * as CANNON from 'cannon-es';

// Collision groups: static geometry = 1, dynamic entities = 2.
export const GROUP_STATIC = 1;
export const GROUP_DYNAMIC = 2;

// Materials. The walking human has zero friction against static ground: its velocity is driven
// directly each frame, and cannon's friction would otherwise bleed off ~0.8 m/s per step.
export const MATERIALS = {
  ground: new CANNON.Material('ground'),
  human: new CANNON.Material('human'),
};

export function createPhysicsWorld() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.solver.iterations = 12;
  world.allowSleep = false;
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.0;
  world.addContactMaterial(
    new CANNON.ContactMaterial(MATERIALS.human, MATERIALS.ground, { friction: 0, restitution: 0 }),
  );
  return world;
}

/** Adds a dynamic entity body (collides with static geometry and other entities). */
export function addDynamicBody(world, options) {
  const body = new CANNON.Body({ ...options });
  body.collisionFilterGroup = GROUP_DYNAMIC;
  body.collisionFilterMask = -1;
  world.addBody(body);
  return body;
}

/** Island surface + sides as a static triangle mesh. Geometry must be non-indexed. */
export function addLandCollider(world, geometry) {
  const positions = geometry.attributes.position.array;
  const count = positions.length / 3;
  if (count > 32767) throw new Error('Land mesh too large for cannon Trimesh (Int16 indices)');
  const indices = new Array(count);
  for (let i = 0; i < count; i++) indices[i] = i;
  const body = new CANNON.Body({ mass: 0, shape: new CANNON.Trimesh(positions, indices), material: MATERIALS.ground });
  body.collisionFilterGroup = GROUP_STATIC;
  world.addBody(body);
  return body;
}

/**
 * Streams axis-aligned box colliders for buildings near the focus point.
 * Keeping every building as a physics body would not scale to a full OSM extract.
 */
const GRID_CELL_M = 100;
const BLOCK_PAD_M = 1.5; // clearance kept between a spawn point and a building wall

export class BuildingColliders {
  constructor(world, buildings, maxBodies = 900) {
    this.world = world;
    this.maxBodies = maxBodies;
    this.active = 0;
    this.items = [];
    // Spatial grid: each building is listed in every cell its box (plus padding) touches,
    // so a point query only needs the one cell it falls in.
    this.grid = new Map();
    for (const b of buildings) {
      if (!b.pts || b.pts.length < 3) continue;
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [x, z] of b.pts) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
      const item = {
        cx: (minX + maxX) / 2,
        cz: (minZ + maxZ) / 2,
        hx: Math.max(0.1, (maxX - minX) / 2),
        hz: Math.max(0.1, (maxZ - minZ) / 2),
        h: b.h,
        body: null,
      };
      this.items.push(item);
      const i0 = Math.floor((item.cx - item.hx - BLOCK_PAD_M) / GRID_CELL_M);
      const i1 = Math.floor((item.cx + item.hx + BLOCK_PAD_M) / GRID_CELL_M);
      const k0 = Math.floor((item.cz - item.hz - BLOCK_PAD_M) / GRID_CELL_M);
      const k1 = Math.floor((item.cz + item.hz + BLOCK_PAD_M) / GRID_CELL_M);
      for (let i = i0; i <= i1; i++) {
        for (let k = k0; k <= k1; k++) {
          const key = i * 100003 + k;
          let list = this.grid.get(key);
          if (!list) this.grid.set(key, (list = []));
          list.push(item);
        }
      }
    }
  }

  /** True if (x, z) is inside a building footprint plus a small clearance. */
  blocked(x, z, pad = BLOCK_PAD_M) {
    // Check every grid cell the padded point touches, so buildings just across a cell edge are seen too.
    const x0 = Math.floor((x - pad) / GRID_CELL_M), x1 = Math.floor((x + pad) / GRID_CELL_M);
    const z0 = Math.floor((z - pad) / GRID_CELL_M), z1 = Math.floor((z + pad) / GRID_CELL_M);
    for (let ix = x0; ix <= x1; ix++) {
      for (let iz = z0; iz <= z1; iz++) {
        const list = this.grid.get(ix * 100003 + iz);
        if (!list) continue;
        for (const it of list) {
          if (Math.abs(x - it.cx) < it.hx + pad && Math.abs(z - it.cz) < it.hz + pad) return true;
        }
      }
    }
    return false;
  }

  update(x, z, radius = 230) {
    const r2 = radius * radius;
    for (const it of this.items) {
      const d2 = (it.cx - x) ** 2 + (it.cz - z) ** 2;
      const want = d2 < r2;
      if (want && !it.body) {
        if (this.active >= this.maxBodies) continue;
        const body = new CANNON.Body({
          mass: 0,
          shape: new CANNON.Box(new CANNON.Vec3(it.hx, it.h / 2, it.hz)),
          position: new CANNON.Vec3(it.cx, it.h / 2, it.cz),
          material: MATERIALS.ground,
        });
        body.collisionFilterGroup = GROUP_STATIC;
        this.world.addBody(body);
        it.body = body;
        this.active++;
      } else if (!want && it.body) {
        this.world.removeBody(it.body);
        it.body = null;
        this.active--;
      }
    }
  }
}

const _from = new CANNON.Vec3();
const _to = new CANNON.Vec3();
const _res = new CANNON.RaycastResult();

/** Height of the terrain / rooftop under (x, z), using static geometry only. Returns 0 if nothing is hit. */
export function groundHeightAt(world, x, z, fromY = 400) {
  _from.set(x, fromY, z);
  _to.set(x, -50, z);
  _res.reset();
  const hit = world.raycastClosest(_from, _to, { collisionFilterMask: GROUP_STATIC, skipBackfaces: true }, _res);
  return hit ? _res.hitPointWorld.y : 0;
}
