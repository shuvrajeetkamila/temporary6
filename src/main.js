import * as THREE from 'three';
import { setupThreeScene } from './render/scene_setup.js';
import { createPhysicsWorld } from './physics/physics_world.js';
import { buildBahrain3DWorld } from './map/osm_builder.js';
import {
  createHumanModel,
  createCarModel,
  createBoatModel,
  createPlaneModel,
  createHelicopterModel
} from './render/models_3d.js';
import { HumanController } from './physics/entities/human_controller.js';
import { CarVehicle } from './physics/entities/car_vehicle.js';
import { BoatVehicle } from './physics/entities/boat_vehicle.js';
import { PlaneVehicle } from './physics/entities/plane_vehicle.js';
import { HeliVehicle } from './physics/entities/heli_vehicle.js';
import { MinimapRadar } from './ui/minimap_radar.js';
import { FullscreenMapModal } from './ui/fullscreen_map.js';
import { VirtualControls } from './ui/virtual_controls.js';
import { geoToWorld } from './data/bahrain_osm_data.js';

// 1. Initialize Three.js 3D Scene
const canvasContainer = document.getElementById('canvas-container');
const { scene, camera, renderer, sunLight } = setupThreeScene(canvasContainer);

// 2. Initialize Cannon-es Physics World
const { world: physicsWorld } = createPhysicsWorld();

// 3. Build 3D OpenStreetMap Roads & Extruded Buildings
buildBahrain3DWorld(scene);

// 4. Instantiate 3D Meshes for all 5 Entities
const humanMesh = createHumanModel();
const carMesh = createCarModel();
const boatMesh = createBoatModel();
const planeMesh = createPlaneModel();
const heliMesh = createHelicopterModel();

scene.add(humanMesh, carMesh, boatMesh, planeMesh, heliMesh);

// 5. Spawn Physics Controllers at Geographically Authentic Locations
// Bab Al Bahrain Spawn
const spawnOrigin = geoToWorld(26.2355, 50.5758); // Manama Core
const human = new HumanController(physicsWorld, humanMesh, { x: spawnOrigin.x, y: 1.6, z: spawnOrigin.z });
const car = new CarVehicle(physicsWorld, carMesh, { x: spawnOrigin.x + 4, y: 1.6, z: spawnOrigin.z + 2 });
const boat = new BoatVehicle(physicsWorld, boatMesh, { x: spawnOrigin.x + 45, y: 0.2, z: spawnOrigin.z + 90 }); // Coastal waters
const heli = new HeliVehicle(physicsWorld, heliMesh, { x: spawnOrigin.x + 22, y: 1.6, z: spawnOrigin.z - 15 });
const plane = new PlaneVehicle(physicsWorld, planeMesh, { x: spawnOrigin.x + 80, y: 1.6, z: spawnOrigin.z - 40 });

// Active Locomotion Mode: 'human', 'car', 'boat', 'heli', 'plane'
let activeMode = 'human';

// 6. Camera Orbit & Chase Tracking State
let cameraYaw = 0;
let cameraPitch = 0.32; // Radians
let cameraDist = 4.2;
const cameraTarget = new THREE.Vector3();

// Touch / Mouse Orbit Drag on Right Half of Screen
let isDraggingCamera = false;
let lastPointerPos = { x: 0, y: 0 };

window.addEventListener('pointerdown', (e) => {
  // Ignore clicks on UI buttons
  if (e.target.closest('#ui-overlay') || e.target.closest('.map-modal-backdrop')) return;
  if (e.clientX > window.innerWidth * 0.4) {
    isDraggingCamera = true;
    lastPointerPos = { x: e.clientX, y: e.clientY };
  }
});

window.addEventListener('pointermove', (e) => {
  if (!isDraggingCamera) return;
  const dx = e.clientX - lastPointerPos.x;
  const dy = e.clientY - lastPointerPos.y;
  cameraYaw -= dx * 0.005;
  cameraPitch = Math.max(0.08, Math.min(1.35, cameraPitch + dy * 0.005));
  lastPointerPos = { x: e.clientX, y: e.clientY };
});

window.addEventListener('pointerup', () => { isDraggingCamera = false; });
window.addEventListener('pointercancel', () => { isDraggingCamera = false; });

// 7. Initialize Interactive Minimap & Fullscreen World Map
const mapModal = new FullscreenMapModal(
  document.getElementById('map-modal-root'),
  (tx, ty, tz) => {
    // Touch-To-Teleport callback: teleports active entity directly
    getActiveEntity().teleport(tx, ty + 1.0, tz);
    if (activeMode !== 'human') {
      human.teleport(tx + 2, ty + 1.0, tz);
    }
  }
);

const minimapRadar = new MinimapRadar(
  document.getElementById('minimap-canvas'),
  () => {
    const pos = getActiveEntity().getPosition();
    mapModal.open(pos, cameraYaw);
  }
);

// 8. Virtual Controls & Mode Swapping
const controls = new VirtualControls({
  onVehicleSwap: (newMode) => {
    setEntityMode(newMode);
  },
  onInteract: () => {
    handleVehicleInteraction();
  },
  onToggleMap: () => {
    if (mapModal.isOpen) {
      mapModal.close();
    } else {
      const pos = getActiveEntity().getPosition();
      mapModal.open(pos, cameraYaw);
    }
  }
});

function getActiveEntity() {
  switch (activeMode) {
    case 'car': return car;
    case 'boat': return boat;
    case 'heli': return heli;
    case 'plane': return plane;
    default: return human;
  }
}

function setEntityMode(newMode) {
  activeMode = newMode;
  controls.setMode(newMode);

  // If in vehicle, position human hidden or seated
  if (activeMode === 'human') {
    humanMesh.visible = true;
  } else {
    humanMesh.visible = false;
  }

  // Update HUD Mode Display
  const modeBadge = document.getElementById('hud-mode-badge');
  if (modeBadge) modeBadge.textContent = activeMode.toUpperCase();
}

function handleVehicleInteraction() {
  if (activeMode !== 'human') {
    // Exit current vehicle: place human next to vehicle
    const vPos = getActiveEntity().getPosition();
    human.teleport(vPos.x - 2.5, vPos.y + 0.5, vPos.z);
    setEntityMode('human');
    return;
  }

  // On foot: check proximity to vehicles
  const hPos = human.getPosition();
  const distCar = hPos.distanceTo(car.getPosition());
  const distBoat = hPos.distanceTo(boat.getPosition());
  const distHeli = hPos.distanceTo(heli.getPosition());
  const distPlane = hPos.distanceTo(plane.getPosition());

  if (distCar < 4.5) setEntityMode('car');
  else if (distBoat < 6.5) setEntityMode('boat');
  else if (distHeli < 5.5) setEntityMode('heli');
  else if (distPlane < 7.5) setEntityMode('plane');
}

// 9. Main Animation & Physics Simulation Loop (60 Hz)
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 0.05);

  // Step Cannon-es Physics World
  physicsWorld.step(1 / 60, dt, 3);

  // Gather Player Input
  controls.cameraYaw = cameraYaw;
  const input = controls.getInput();

  // Update All 5 Entities
  if (activeMode === 'human') {
    human.update(dt, input);
  } else {
    human.update(dt, { moveX: 0, moveY: 0 }); // Idle
  }

  car.update(dt, activeMode === 'car' ? input : {});
  boat.update(dt, activeMode === 'boat' ? input : {});
  heli.update(dt, activeMode === 'heli' ? input : {});
  plane.update(dt, activeMode === 'plane' ? input : {});

  // Proximity Detection for Enter/Exit Prompts
  const btnInteract = document.getElementById('btn-interact');
  const promptBox = document.getElementById('hud-prompt-box');

  if (activeMode === 'human') {
    const hPos = human.getPosition();
    const distCar = hPos.distanceTo(car.getPosition());
    const distBoat = hPos.distanceTo(boat.getPosition());
    const distHeli = hPos.distanceTo(heli.getPosition());
    const distPlane = hPos.distanceTo(plane.getPosition());

    let prompt = null;
    if (distCar < 4.5) prompt = "ENTER 4x4 CAR";
    else if (distBoat < 6.5) prompt = "BOARD DHOW BOAT";
    else if (distHeli < 5.5) prompt = "PILOT HELICOPTER";
    else if (distPlane < 7.5) prompt = "FLY AEROPLANE";

    if (prompt) {
      promptBox.textContent = `[F / ENTER] ${prompt}`;
      promptBox.classList.remove('hidden');
      if (btnInteract) btnInteract.textContent = "ENTER";
    } else {
      promptBox.classList.add('hidden');
      if (btnInteract) btnInteract.textContent = "ACTION";
    }
  } else {
    promptBox.textContent = "[F / ENTER] EXIT VEHICLE";
    promptBox.classList.remove('hidden');
    if (btnInteract) btnInteract.textContent = "EXIT";
  }

  // Update Third-Person Chase Camera
  const activeEntity = getActiveEntity();
  const activePos = activeEntity.getPosition();

  let targetDist = 4.2;
  let targetHeight = 1.2;

  if (activeMode === 'car') { targetDist = 7.5; targetHeight = 1.4; }
  else if (activeMode === 'boat') { targetDist = 12.0; targetHeight = 2.0; }
  else if (activeMode === 'heli') { targetDist = 14.0; targetHeight = 2.5; }
  else if (activeMode === 'plane') { targetDist = 15.0; targetHeight = 2.2; }

  cameraDist = THREE.MathUtils.lerp(cameraDist, targetDist, dt * 6.0);
  cameraTarget.set(activePos.x, activePos.y + targetHeight, activePos.z);

  // Position camera in spherical orbit around target
  const camX = cameraTarget.x + Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraDist;
  const camY = cameraTarget.y + Math.sin(cameraPitch) * cameraDist;
  const camZ = cameraTarget.z + Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraDist;

  camera.position.set(camX, camY, camZ);
  camera.lookAt(cameraTarget);

  // Keep sunlight centered near player
  sunLight.position.set(activePos.x + 300, 600, activePos.z + 200);
  sunLight.target.position.copy(activePos);

  // Update Speedometer
  const speedEl = document.getElementById('hud-speed-val');
  if (speedEl) {
    let speed = 0;
    let unit = "KM/H";
    if (activeMode === 'car') speed = car.speedKmh;
    else if (activeMode === 'boat') { speed = boat.speedKnots; unit = "KTS"; }
    else if (activeMode === 'heli') speed = heli.speedKmh;
    else if (activeMode === 'plane') speed = plane.airspeedKmh;
    else speed = human.speed * 3.6;

    speedEl.textContent = `${Math.round(speed)} ${unit}`;
  }

  // Render 2D Minimap Radar
  minimapRadar.render(activePos, cameraYaw, {
    car: car.getPosition(),
    boat: boat.getPosition(),
    heli: heli.getPosition(),
    plane: plane.getPosition()
  });

  // Render 3D Scene
  renderer.render(scene, camera);
}

// Start simulation
animate();
