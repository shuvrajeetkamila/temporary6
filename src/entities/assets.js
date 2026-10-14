// Real 3D models, loaded once at boot. If a file is missing or slow, the game keeps the primitive models.
// Sources and licences: see ASSETS.md (three.js examples, MIT; model licences noted there).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

const MODELS = {
  human: 'models/Xbot.glb', // Mixamo character with idle, walk and run clips
  car: 'models/ferrari.glb', // Ferrari body; the physics wheels are kept
};

const loaded = {};

const withTimeout = (p, ms, what) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out`)), ms))]);

/** Loads all models in parallel. Never throws: a failed model simply stays on its primitive fallback. */
export async function loadModels({ timeoutMs = 20000 } = {}) {
  // The Ferrari file is Draco-compressed. The decoder is bundled in public/draco so the APK works offline.
  const draco = new DRACOLoader();
  draco.setDecoderPath('draco/gltf/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  await Promise.all(
    Object.entries(MODELS).map(async ([key, url]) => {
      try {
        loaded[key] = await withTimeout(loader.loadAsync(url), timeoutMs, url);
      } catch (e) {
        console.warn(`model ${key} not loaded, using primitives:`, e?.message ?? e);
      }
    }),
  );
  return Object.keys(loaded);
}

/** Returns the loaded glTF for a key ('human' | 'car'), or null when it is not available. */
export function gltfFor(key) {
  return loaded[key] ?? null;
}

/**
 * Bounding box in world space, measured from the posed skinned vertices the way the GPU draws them.
 * Box3.setFromObject would use the bind-pose bounds and get the wrong size for Mixamo rigs (their armature is 0.01 scale).
 */
export function worldBox(obj) {
  obj.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  const part = new THREE.Box3();
  obj.traverse((o) => {
    if (o.isSkinnedMesh) {
      o.skeleton.update();
      o.computeBoundingBox();
      part.copy(o.boundingBox).applyMatrix4(o.matrixWorld);
      box.union(part);
    } else if (o.isMesh) {
      part.setFromObject(o);
      box.union(part);
    }
  });
  return box;
}

/** Puts the model's lowest point on y = 0 and its centre on x = z = 0. Returns the size after scaling. */
export function normaliseToOrigin(obj) {
  const box = worldBox(obj);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= box.min.y;
  return box.getSize(new THREE.Vector3());
}

/** Enables shadows on every mesh of a model. Skinned meshes skip frustum culling (their bounds are bind-pose). */
export function enableShadows(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.isSkinnedMesh) o.frustumCulled = false;
    }
  });
}
