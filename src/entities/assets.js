// Real 3D models, loaded once at boot. If a file is missing or slow, the game keeps the primitive models.
// Sources and licences: see ASSETS.md (three.js examples, MIT; model licences noted there).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const MODELS = {
  human: 'models/Xbot.glb', // Mixamo character with idle, walk and run clips
  // no car body is bundled: the Ferrari was removed because its licence could not be verified (see ASSETS.md)
  boat: 'models/zefiro_6.5.glb', // ZEFIRO motorboat, CC BY 4.0 (angelo raffaele catalano, Sketchfab)
  plane: 'models/A320_nologo.glb', // Airbus A320, logo-free, CC BY 4.0 (amvlab)
};

/** Sky image used for image-based lighting (reflections and ambient light on the models). CC0, Poly Haven. */
export const ENV_FILES = { high: 'env/sky_clear_4k.hdr', low: 'env/sky_clear_1k.hdr' };

const loaded = {};

const withTimeout = (p, ms, what) =>
  Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} timed out`)), ms))]);

/** Loads all models in parallel. Never throws: a failed model simply stays on its primitive fallback. */
export async function loadModels({ timeoutMs = 20000 } = {}) {
  const loader = new GLTFLoader();
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

/**
 * Loads an equirectangular HDR sky and turns it into a prefiltered environment map for scene.environment.
 * Returns null on failure, so the scene keeps its plain lighting.
 */
export async function loadEnvironment(renderer, file, { timeoutMs = 45000 } = {}) {
  try {
    const hdr = await withTimeout(new RGBELoader().loadAsync(file), timeoutMs, file);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    pmrem.dispose();
    return env;
  } catch (e) {
    console.warn('environment map not loaded, using plain lighting:', e?.message ?? e);
    return null;
  }
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
