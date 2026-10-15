// Primitive-built models (no external assets). Convention: nose points along +Z, origin at the
// physics body centre. Swap any builder for a GLTFLoader result later without touching physics.
import * as THREE from 'three';
import { gltfFor, normaliseToOrigin, enableShadows } from './assets.js';

// Real-model settings. Tuned by eye in the headless browser check (see README).
export const HUMAN_HEIGHT = 1.8; // metres
export const HUMAN_FACE_OFFSET = 0; // extra yaw so the model's nose points along +Z
export const CAR_FACE_OFFSET = Math.PI; // the Ferrari nose is -Z in its file; turn it to +Z like the primitive model (the body adds another π)
export const CAR_LENGTH = 4.2; // matches the physics box (2 × 2.1 m)
export const CAR_BOTTOM_Y = -0.58; // chassis underside relative to the body centre (tyres reach about -0.76, so the sill sits ~0.15 m above ground)

const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1, ...opts });
const box = (w, h, d, mat) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};
const at = (mesh, x, y, z) => {
  mesh.position.set(x, y, z);
  return mesh;
};

/** Polygon in XZ (pointing along +Z) extruded upward from y=0 to depth. */
function extrudeXZ(points, depth) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return g;
}

function buildRealHuman() {
  const g = gltfFor('human');
  if (!g) return null;
  const root = new THREE.Group();
  // The player is the only human, so the loaded scene is used directly. (SkeletonUtils.clone gives a different
  // skeleton scale for this rig, so the height fit would be wrong.)
  const model = g.scene;
  model.rotation.y = HUMAN_FACE_OFFSET;
  root.add(model);
  const size = normaliseToOrigin(model);
  model.scale.setScalar(HUMAN_HEIGHT / size.y);
  normaliseToOrigin(model);
  enableShadows(root);

  const mixer = new THREE.AnimationMixer(model);
  const clip = (name) => THREE.AnimationClip.findByName(g.animations, name);
  const actions = {};
  for (const name of ['idle', 'walk', 'run']) {
    const c = clip(name);
    if (c) actions[name] = mixer.clipAction(c);
  }
  root.userData.anim = { mixer, actions, current: null };
  return root;
}

export function buildHuman() {
  return buildRealHuman() ?? buildPrimitiveHuman();
}

function buildPrimitiveHuman() {
  const root = new THREE.Group();
  const thobe = std(0xf4f1ea, { roughness: 0.8 });
  const skin = std(0x8d5a3b, { roughness: 0.7 });
  const cap = std(0xb3262e, { roughness: 0.9 });
  // legs (0..0.85), torso (0.85..1.5), head (1.5..1.75) -- feet at y=0
  const legL = at(box(0.2, 0.85, 0.22, thobe), -0.12, 0.42, 0);
  const legR = at(box(0.2, 0.85, 0.22, thobe), 0.12, 0.42, 0);
  const torso = at(box(0.46, 0.66, 0.28, thobe), 0, 1.18, 0);
  const armL = at(box(0.14, 0.6, 0.16, thobe), -0.32, 1.12, 0);
  const armR = at(box(0.14, 0.6, 0.16, thobe), 0.32, 1.12, 0);
  const head = at(new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), skin), 0, 1.66, 0);
  const cap_ = at(box(0.26, 0.06, 0.26, cap), 0, 1.78, 0);
  root.add(legL, legR, torso, armL, armR, head, cap_);
  root.userData.limbs = { legL, legR, armL, armR };
  root.traverse((o) => o.isMesh && (o.castShadow = true));
  return root;
}

// Wheel meshes in the Ferrari file. The physics wheels (buildWheel) are used instead, so these are hidden.
const FERRARI_WHEEL_NAME = /wheel|tire|tyre|rim_|nuts|brake|centre/i;

function buildRealCar() {
  const g = gltfFor('car');
  if (!g) return null;
  const root = new THREE.Group();
  const model = g.scene.clone(true);
  model.rotation.y = CAR_FACE_OFFSET;
  root.add(model);
  const size = normaliseToOrigin(model);
  model.scale.setScalar(CAR_LENGTH / Math.max(size.x, size.z));
  normaliseToOrigin(model);
  model.position.y += CAR_BOTTOM_Y;
  model.traverse((o) => {
    if (FERRARI_WHEEL_NAME.test(o.name)) o.visible = false;
  });
  enableShadows(root);
  return root;
}

export function buildCar(color = 0xc0392b) {
  return buildRealCar() ?? buildPrimitiveCar(color);
}

function buildPrimitiveCar(color) {
  const root = new THREE.Group();
  const paint = std(color, { roughness: 0.35, metalness: 0.3 });
  const glass = std(0x1b2430, { roughness: 0.1, metalness: 0.2 });
  const light = std(0xfff7d6, { emissive: 0xfff2b0, emissiveIntensity: 0.6 });
  const tail = std(0xff2a2a, { emissive: 0xff1a1a, emissiveIntensity: 0.6 });
  root.add(at(box(1.9, 0.5, 4.2), 0, 0.05, 0));
  root.add(at(box(1.7, 0.42, 2.2), 0, 0.5, -0.2)); // cabin
  root.add(at(box(1.72, 0.3, 1.9, glass), 0, 0.52, -0.2)); // glass band
  root.add(at(box(0.36, 0.12, 0.08, light), -0.6, 0.1, 2.12), at(box(0.36, 0.12, 0.08, light), 0.6, 0.1, 2.12));
  root.add(at(box(0.36, 0.12, 0.08, tail), -0.6, 0.1, -2.12), at(box(0.36, 0.12, 0.08, tail), 0.6, 0.1, -2.12));
  return root;
}

export function buildWheel() {
  const root = new THREE.Group(); // synced to cannon wheel transform
  const spin = new THREE.Group(); // spins around the axle
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), std(0x1d1d1d, { roughness: 0.95 }));
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 10), std(0xbfc5cc, { metalness: 0.6, roughness: 0.4 }));
  rim.rotation.z = Math.PI / 2;
  spin.add(tyre, rim);
  root.add(spin);
  return { root, spin };
}

// Boat: ZEFIRO model, scaled to 6.5 m. Its hull bottom sits 0.5 m under the water line (the primitive hull reaches 0.45 m).
export const BOAT_LENGTH = 6.5;
export const BOAT_FACE_OFFSET = 0; // checked in the headless screenshot; the bow points along +Z
export const BOAT_DRAFT = 0.5;

function buildRealBoat() {
  const g = gltfFor('boat');
  if (!g) return null;
  const root = new THREE.Group();
  const model = g.scene.clone(true);
  model.rotation.y = BOAT_FACE_OFFSET;
  root.add(model);
  const size = normaliseToOrigin(model);
  model.scale.setScalar(BOAT_LENGTH / Math.max(size.x, size.z));
  normaliseToOrigin(model);
  model.position.y -= BOAT_DRAFT;
  enableShadows(root);
  return root;
}

export function buildBoat(color = 0xf5f5f5) {
  return buildRealBoat() ?? buildPrimitiveBoat(color);
}

function buildPrimitiveBoat(color) {
  const root = new THREE.Group();
  const hullPts = [[-1.1, -3.1], [1.1, -3.1], [1.1, 1.8], [0, 3.4], [-1.1, 1.8]];
  const hull = new THREE.Mesh(extrudeXZ(hullPts, 0.9), std(color, { roughness: 0.4 }));
  hull.position.y = -0.45;
  hull.castShadow = true;
  const deck = at(box(2.0, 0.08, 4.4, std(0xa0785a)), 0, 0.5, -0.2);
  const cabin = at(box(1.6, 0.8, 2.0, std(0xe9eef2)), 0, 0.95, -0.6);
  const window_ = at(box(1.62, 0.3, 1.5, std(0x1f3a4d, { roughness: 0.1, metalness: 0.2 })), 0, 1.0, -0.3);
  root.add(hull, deck, cabin, window_);
  return root;
}

// Airliner: Airbus A320 at real scale (37.6 m long, 35.8 m span). Its file has the nose on +X, so it is turned to +Z.
export const PLANE_LENGTH = 37.6;
export const PLANE_FACE_OFFSET = -Math.PI / 2;

function buildRealPlane() {
  const g = gltfFor('plane');
  if (!g) return null;
  const root = new THREE.Group();
  const model = g.scene.clone(true);
  model.rotation.y = PLANE_FACE_OFFSET;
  root.add(model);
  const size = normaliseToOrigin(model);
  model.scale.setScalar(PLANE_LENGTH / Math.max(size.x, size.z));
  normaliseToOrigin(model);
  model.position.y -= size.y * model.scale.y * 0.5; // the body centre is the middle of the aircraft
  enableShadows(root);
  return root;
}

export function buildPlane() {
  return buildRealPlane() ?? buildPrimitivePlane();
}

function buildPrimitivePlane() {
  const root = new THREE.Group();
  const body = std(0xe8ecf1, { roughness: 0.4, metalness: 0.2 });
  const accent = std(0x1f6fb2, { roughness: 0.5 });
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.55, 7, 14), body);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.castShadow = true;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.6, 14), body);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 4.3;
  root.add(fuselage, nose);
  root.add(at(box(12, 0.12, 2.0, body), 0, 0, 0.6)); // wings
  root.add(at(box(4, 0.1, 1.1, body), 0, 0.1, -2.9)); // tailplane
  root.add(at(box(0.1, 1.5, 1.3, accent), 0, 0.8, -3.0)); // fin
  root.add(at(box(0.5, 0.25, 0.9, std(0x222831)), 0, 0.55, 1.6)); // canopy
  return root;
}

export function buildHelicopter() {
  const root = new THREE.Group();
  const body = std(0x2f5d3a, { roughness: 0.5 });
  const glass = std(0x1b2a38, { roughness: 0.1, metalness: 0.3 });
  const cabin = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), body);
  cabin.scale.set(1.1, 1.0, 1.7);
  cabin.castShadow = true;
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.scale.set(1.0, 0.8, 1.2);
  canopy.position.set(0, 0.2, 1.1);
  canopy.rotation.x = -0.2;
  root.add(cabin, canopy);
  root.add(at(box(0.3, 0.3, 3.6, body), 0, 0.25, -3.5)); // tail boom
  root.add(at(box(0.1, 1.0, 0.6, body), 0.1, 0.8, -5.2)); // fin
  const skidL = at(box(0.1, 0.1, 3.0, std(0x222222)), -0.8, -1.1, 0);
  const skidR = at(box(0.1, 0.1, 3.0, std(0x222222)), 0.8, -1.1, 0);
  root.add(skidL, skidR);
  root.add(at(box(0.1, 0.6, 0.1, std(0x222222)), -0.8, -0.8, 0.8), at(box(0.1, 0.6, 0.1, std(0x222222)), 0.8, -0.8, 0.8));
  root.add(at(box(0.1, 0.6, 0.1, std(0x222222)), -0.8, -0.8, -0.8), at(box(0.1, 0.6, 0.1, std(0x222222)), 0.8, -0.8, -0.8));
  const rotor = new THREE.Group();
  rotor.position.set(0, 1.25, 0);
  const b1 = box(8.0, 0.05, 0.3, std(0x111111));
  const b2 = box(0.3, 0.05, 8.0, std(0x111111));
  rotor.add(b1, b2);
  root.add(rotor);
  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.25, 0.8, -5.3);
  tailRotor.add(box(0.05, 1.6, 0.15, std(0x111111)));
  root.add(tailRotor);
  root.userData.rotor = rotor;
  root.userData.tailRotor = tailRotor;
  return root;
}

export { extrudeXZ };
