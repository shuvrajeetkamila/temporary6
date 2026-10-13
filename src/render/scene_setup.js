import * as THREE from 'three';

/**
 * Three.js Scene, Lighting, and Camera Configuration.
 */
export function setupThreeScene(canvasContainer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7dd3fc); // Gulf Sky Blue
  scene.fog = new THREE.FogExp2(0xbae6fd, 0.00035);

  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.2,
    15000
  );
  camera.position.set(0, 4, 8);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  canvasContainer.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.HemisphereLight(0xe0f2fe, 0xd4b886, 0.65);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.25);
  sunLight.position.set(400, 800, 300);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 2500;
  const d = 250;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  scene.add(sunLight);

  // Window Resize Listener
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  return { scene, camera, renderer, sunLight };
}
