import './style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createPhysicsWorld, addLandCollider, BuildingColliders, groundHeightAt, groundHitAt } from './physics.js';
import { loadDataset } from './dataset.js';
import { buildWorld } from './world/world.js';
import { Human, Car, Boat, Plane, Helicopter } from './entities/vehicles.js';
import { createInput } from './input.js';
import { GameMap } from './map.js';
import { getLandRings } from './land.js';
import { lonLatToXZ, pointInLand } from './geo.js';
import { PLACES, WATER_Y } from './config.js';
import { computeSpawns, findFreeSpot } from './spawn.js';
import { loadModels, loadEnvironment, ENV_FILES } from './entities/assets.js';
import { summonPlacement } from './summon.js';
import { headingOf } from './entities/uprighting.js';

const FIXED_DT = 1 / 60;
const IDLE = { x: 0, y: 0, throttle: 0, brake: false, jump: false, run: false };
const CAM_DISTANCE = { human: 6, car: 9, boat: 13, plane: 75, heli: 17 }; // the A320 is 37.6 m long, so the plane camera stands further back
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- startup errors
let startupDone = false;

/** Shows a message on the loading overlay with retry and procedural-city buttons. */
function showLoadError(message) {
  if (startupDone) return;
  $('loading').classList.remove('done');
  $('loading-text').textContent = 'Could not start the game';
  $('loading-error-text').textContent = message;
  $('loading-error').classList.remove('hidden');
}

$('btn-retry').addEventListener('click', () => location.reload());
$('btn-procedural').addEventListener('click', () => {
  const url = new URL(location.href);
  url.searchParams.set('city', 'procedural');
  location.href = url.toString();
});

function webgl2Available() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

if (!webgl2Available()) {
  showLoadError('This browser or device does not support WebGL 2, which the game needs. Try a current Chrome, Edge or Firefox, or update Android System WebView.');
  throw new Error('WebGL 2 is not available');
}

// Errors before the game is running are shown on the overlay. After startup they are only logged.
window.addEventListener('error', (e) => showLoadError(e.message || 'Unexpected error'));
window.addEventListener('unhandledrejection', (e) => showLoadError(String(e.reason?.message ?? e.reason)));
// Slow devices: after two minutes, offer the lighter procedural city instead of spinning forever.
setTimeout(() => {
  if (!startupDone) showLoadError('Loading is taking longer than expected. On slow devices, the procedural city loads faster.');
}, 120000);

// ---------------------------------------------------------------- renderer / camera
const canvas = $('scene');
// Quality: 'high' on desktop, 'low' on touch devices. Override with ?quality=low or ?quality=high.
const QUALITY = (() => {
  const q = new URLSearchParams(location.search).get('quality');
  if (q === 'low' || q === 'high') return q;
  return window.matchMedia('(pointer: coarse)').matches ? 'low' : 'high';
})();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: QUALITY === 'high', powerPreference: 'high-performance' });
renderer.setPixelRatio(QUALITY === 'low' ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = QUALITY === 'high';
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.5, 40000);
const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();

// ---------------------------------------------------------------- state
const input = createInput();
const state = {
  mode: 'human',          // 'human' | 'vehicle'
  vehicle: null,          // driven vehicle
  prompt: null,           // vehicle that can be entered right now
  orbitYaw: 0,            // camera yaw (radians); humans walk relative to it
  orbitPitch: 0.42,
  zoom: 1,
  dragging: false,
  lastDragAt: 0,
  snap: true,
  night: false,
  time: 0,
};

let physics;
let world3d;
let colliders;
let human;
let vehicles = [];
let land;
let data;
let map;
let accumulator = 0;
let colliderTimer = 0;
let lastHud = '';
const clock = new THREE.Clock();

const drag = { x: 0, y: 0 };

// ---------------------------------------------------------------- helpers
let toastTimer = 0;
function toast(msg, ms = 2600) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

const lerpAngle = (a, b, t) => {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
};

/** Camera yaw that puts the camera directly behind an entity's forward direction. */
function behindYaw(e) {
  const f = e.forward();
  return Math.atan2(-f.fx, -f.fz);
}


function nearestPlaceName(x, z) {
  let best = null;
  let bestD = Infinity;
  for (const p of PLACES) {
    const [px, pz] = lonLatToXZ(p.lon, p.lat);
    const d = Math.hypot(px - x, pz - z);
    if (d < bestD) {
      bestD = d;
      best = p.name;
    }
  }
  return best ?? 'Bahrain';
}

// ---------------------------------------------------------------- enter / exit
function enterVehicle(v) {
  if (!v || state.mode !== 'human') return;
  state.mode = 'vehicle';
  state.vehicle = v;
  state.prompt = null;
  v.piloted = true;
  human.setInWorld(false);
  state.orbitYaw = behindYaw(v);
  state.snap = true;
  toast(`Driving the ${v.name.toLowerCase()} · E to get out`);
}

function exitVehicle(force = false) {
  const v = state.vehicle;
  if (!v) return;
  const side = v.sidePoint();
  const alt = v.body.position.y - groundHeightAt(physics, v.body.position.x, v.body.position.z);
  if (!force) {
    if (v.kind === 'plane' && (alt > 3 || v.speedKmh > 40)) {
      toast('Too fast or too high to bail out. Land first.');
      return;
    }
    if (v.kind === 'heli' && alt > 2.5) {
      toast('Land the helicopter before getting out.');
      return;
    }
    if (v.kind === 'boat' && !pointInLand(side.x, side.z, land)) {
      toast('Steer closer to the shore before stepping off.');
      return;
    }
  }
  const [sx, sz] = findFreeSpot(side.x, side.z, land, colliders);
  const gy = groundHeightAt(physics, sx, sz);
  human.body.velocity.set(0, 0, 0);
  human.setInWorld(true, new CANNON.Vec3(sx, gy + Human.RADIUS + 0.4, sz));
  v.piloted = false;
  state.mode = 'human';
  state.vehicle = null;
  state.snap = true;
  state.orbitYaw = behindYaw(human);
}

function teleportTo(x, z) {
  if (state.mode !== 'human') exitVehicle(true);
  colliders.update(x, z, 230); // make sure buildings around the target exist before raycasting
  human.teleport(x, z);
  state.snap = true;
  map.close();
  toast(`Teleported to ${nearestPlaceName(x, z)}`);
}

// ---------------------------------------------------------------- summon / send home
const VEHICLE_KINDS = ['car', 'boat', 'plane', 'heli'];
let lastSummon = null; // debug hook only
const KIND_LABEL = { car: 'Car', boat: 'Boat', plane: 'Jet', heli: 'Helicopter' };

/** Heading of the character (direction it faces), in the same convention as the vehicles' spawn headings. */
function humanHeading() {
  const f = human.forward();
  return Math.atan2(f.fx, f.fz);
}

function summonVehicle(kind) {
  if (state.mode !== 'human') {
    toast('Get out first, then summon');
    return;
  }
  const v = vehicles.find((x) => x.kind === kind);
  if (!v) return;
  const p = human.body.position;
  const res = summonPlacement(
    kind,
    { x: p.x, z: p.z, heading: humanHeading() },
    {
      land,
      colliders,
      groundAt: (x, z) => groundHeightAt(physics, x, z),
      // the other vehicles, so two summons do not land on top of each other
      occupied: vehicles
        .filter((o) => o !== v)
        .map((o) => ({ x: o.body.position.x, z: o.body.position.z, r: Math.hypot(o.halfExtents.x, o.halfExtents.z) + 2 })),
    },
  );
  if (!res.ok) {
    toast(res.note);
    return;
  }
  v.placeAt(res.x, res.y, res.z, res.heading);
  v.sync?.(0);
  lastSummon = { kind, ...res };
  toast(`${KIND_LABEL[kind]} summoned · ${res.note}`);
  updateGarage(true);
}

/** Stands a flipped or tipped car or boat back on its wheels or keel, facing the same way, a little above the ground. */
function rightVehicle() {
  const v = state.vehicle;
  if (state.mode !== 'vehicle' || !v) return;
  if (v.kind !== 'car' && v.kind !== 'boat') {
    toast('Only the car and boat can be righted');
    return;
  }
  standUp(v);
  toast(`${KIND_LABEL[v.kind]} righted`);
}

function sendHome(kind) {
  const v = vehicles.find((x) => x.kind === kind);
  if (!v) return;
  if (state.vehicle === v) {
    toast('Get out before sending it home');
    return;
  }
  v.reset();
  v.sync?.(0);
  toast(`${KIND_LABEL[kind]} sent back to its spawn point`);
  updateGarage(true);
}

function toggleGarage(force) {
  const el = $('garage');
  const open = force ?? el.classList.contains('hidden');
  el.classList.toggle('hidden', !open);
  if (open) updateGarage(true);
}

let garageTimer = 0;
/** Refreshes the status line of each vehicle row (distance, in use) and enables the right buttons. */
function updateGarage(force = false) {
  const el = $('garage');
  if (el.classList.contains('hidden') && !force) return;
  const onFoot = state.mode === 'human';
  for (const v of vehicles) {
    const row = el.querySelector(`[data-kind="${v.kind}"]`);
    if (!row) continue;
    const driving = state.vehicle === v;
    const d = Math.hypot(v.body.position.x - human.body.position.x, v.body.position.z - human.body.position.z);
    row.querySelector('[data-status]').textContent = driving ? 'in use · you are driving it' : `${Math.round(d)} m away`;
    row.querySelector('[data-summon]').disabled = !onFoot;
    row.querySelector('[data-home]').disabled = driving;
  }
}

function toggleNight() {
  state.night = !state.night;
  world3d.setNight(state.night);
  $('btn-night').textContent = state.night ? 'Day' : 'Night';
}

// ---------------------------------------------------------------- UI bindings
function bindUi() {
  $('btn-enter').addEventListener('click', () => enterVehicle(state.prompt));
  $('btn-exit').addEventListener('click', () => exitVehicle(false));
  $('btn-map').addEventListener('click', (e) => {
    e.stopPropagation();
    map.toggle();
  });
  $('btn-night').addEventListener('click', toggleNight);
  $('btn-help').addEventListener('click', () => $('help').classList.toggle('hidden'));
  $('help-close').addEventListener('click', () => $('help').classList.add('hidden'));
  $('btn-credits').addEventListener('click', () => $('credits').classList.toggle('hidden'));
  $('btn-garage').addEventListener('click', () => toggleGarage());
  $('btn-right').addEventListener('click', () => rightVehicle());
  $('garage-close').addEventListener('click', () => toggleGarage(false));
  for (const btn of document.querySelectorAll('[data-summon]')) btn.addEventListener('click', () => summonVehicle(btn.dataset.summon));
  for (const btn of document.querySelectorAll('[data-home]')) btn.addEventListener('click', () => sendHome(btn.dataset.home));
  $('credits-close').addEventListener('click', () => $('credits').classList.add('hidden'));

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyH') $('help').classList.toggle('hidden');
  });

  // camera drag + wheel zoom
  canvas.addEventListener('pointerdown', (e) => {
    state.dragging = true;
    state.lastDragAt = performance.now();
    drag.x = e.clientX;
    drag.y = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    state.orbitYaw -= dx * 0.006;
    state.orbitPitch = Math.min(1.25, Math.max(0.08, state.orbitPitch + dy * 0.004));
    state.lastDragAt = performance.now();
  });
  const endDrag = () => (state.dragging = false);
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      state.zoom = Math.min(2.5, Math.max(0.5, state.zoom * Math.exp(e.deltaY * 0.001)));
    },
    { passive: false },
  );

  // touch controls: visible on coarse pointers or with ?touch=1
  const showTouch = window.matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('touch');
  $('touch').classList.toggle('hidden', !showTouch);
  bindJoystick();
  for (const btn of document.querySelectorAll('[data-hold]')) {
    const key = btn.dataset.hold;
    const set = (v) => (input.touch[key] = v);
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      btn.setPointerCapture?.(e.pointerId);
      set(true);
    });
    btn.addEventListener('pointerup', () => set(false));
    btn.addEventListener('pointercancel', () => set(false));
  }
  for (const btn of document.querySelectorAll('[data-action]')) {
    btn.addEventListener('click', () => doAction(btn.dataset.action));
  }

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
}

function bindJoystick() {
  const base = $('joystick');
  const stick = $('stick');
  let active = false;
  // Travel range follows the base size, so the knob stays inside the ring on small phones.
  const range = (r) => Math.max(20, r.width / 2 - 28);
  const move = (e) => {
    const r = base.getBoundingClientRect();
    const R = range(r);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > R) {
      dx = (dx / len) * R;
      dy = (dy / len) * R;
    }
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    input.touch.x = dx / R;
    input.touch.y = -dy / R;
  };
  const release = () => {
    active = false;
    stick.style.transform = '';
    input.touch.x = 0;
    input.touch.y = 0;
  };
  base.addEventListener('pointerdown', (e) => {
    active = true;
    base.setPointerCapture?.(e.pointerId);
    move(e);
  });
  base.addEventListener('pointermove', (e) => active && move(e));
  base.addEventListener('pointerup', release);
  base.addEventListener('pointercancel', release);
}

function doAction(action) {
  if (action === 'enter') {
    if (state.mode === 'human') enterVehicle(state.prompt);
    else exitVehicle(false);
  } else if (action === 'map') {
    map.toggle();
  }
}

// ---------------------------------------------------------------- per-frame pieces
function handleKeys() {
  if (input.pressed('KeyE')) doAction('enter');
  if (input.pressed('KeyM')) map.toggle();
  if (input.pressed('Escape')) {
    map.close();
    toggleGarage(false);
  }
  if (input.pressed('KeyN')) toggleNight();
  if (input.pressed('KeyV')) toggleGarage();
  if (input.pressed('KeyR')) rightVehicle();
  VEHICLE_KINDS.forEach((kind, i) => {
    if (input.pressed(`Digit${i + 1}`)) summonVehicle(kind);
  });
}

function updateProximity() {
  if (state.mode !== 'human') {
    state.prompt = null;
    $('prompt').classList.add('hidden');
    return;
  }
  let best = null;
  let bestD = Infinity;
  for (const v of vehicles) {
    const d = human.distanceTo(v);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  if (best && bestD < 2.0) {
    state.prompt = best;
    $('btn-enter').textContent = `Enter ${best.name.toLowerCase()} (E)`;
    $('prompt').classList.remove('hidden');
  } else {
    state.prompt = null;
    $('prompt').classList.add('hidden');
  }
}

/** Puts a car or boat back on its wheels or keel above the ground at its current spot, facing the same way. */
function standUp(v) {
  const p = v.body.position;
  const y = v.kind === 'car' ? groundHeightAt(physics, p.x, p.z) + 1.2 : p.y + 1.0;
  v.placeAt(p.x, y, p.z, headingOf(v.body.quaternion));
  v.sync?.(0);
}

function respawnIfLost() {
  for (const v of vehicles) {
    const p = v.body.position;
    // a car whose box chassis has dropped through the land collider is stood up again at once, not left to fall
    if (v.kind === 'car' && p.y < groundHeightAt(physics, p.x, p.z) - 1.5 && Math.abs(p.x) < 60000 && Math.abs(p.z) < 60000) {
      standUp(v);
      toast(`${v.name} was stood up after it sank into the ground`);
      continue;
    }
    if (p.y < -25 || Math.abs(p.x) > 60000 || Math.abs(p.z) > 60000) {
      if (state.vehicle === v) exitVehicle(true);
      v.reset();
      toast(`${v.name} was reset to its spawn point`);
    }
  }
  if (state.mode === 'human' && human.body.position.y < -20) {
    human.teleport(spawn.human[0], spawn.human[1]);
    toast('Back on the island');
  }
}

function updateCamera(dt) {
  if (debugFreeCamera) return; // debug hook only: lets headless checks frame a shot
  const target = state.mode === 'human' ? human : state.vehicle;
  const p = target.body.position;
  const kind = target.kind;
  const focusY = kind === 'human' ? 1.4 : 1.1;

  // vehicles swing back behind themselves when the player is not dragging
  if (kind !== 'human' && !state.dragging && performance.now() - state.lastDragAt > 1500) {
    state.orbitYaw = lerpAngle(state.orbitYaw, behindYaw(target), 1 - Math.exp(-dt * 1.5));
  }

  const dist = CAM_DISTANCE[kind] * state.zoom;
  const cp = Math.cos(state.orbitPitch);
  const sp = Math.sin(state.orbitPitch);
  const desired = new THREE.Vector3(
    p.x + Math.sin(state.orbitYaw) * dist * cp,
    Math.max(WATER_Y + 1.5, p.y + focusY + dist * sp),
    p.z + Math.cos(state.orbitYaw) * dist * cp,
  );
  if (state.snap || camPos.distanceTo(desired) > 300) {
    camPos.copy(desired);
    state.snap = false;
  } else {
    camPos.lerp(desired, 1 - Math.exp(-dt * 8));
  }
  camera.position.copy(camPos);
  camTarget.set(p.x, p.y + focusY, p.z);
  camera.lookAt(camTarget);
}

function updateHud() {
  const v = state.mode === 'vehicle' ? state.vehicle : null;
  const title = v ? v.name : 'On foot';
  let speed;
  if (v) speed = `${Math.round(v.speedKmh)} km/h`;
  else speed = `${Math.round(Math.hypot(human.body.velocity.x, human.body.velocity.z) * 3.6)} km/h`;
  let alt = '';
  if (v && (v.kind === 'plane' || v.kind === 'heli')) {
    const gy = groundHeightAt(physics, v.body.position.x, v.body.position.z);
    alt = `Altitude ${Math.max(0, Math.round(v.body.position.y - gy))} m`;
  }
  const key = `${title}|${speed}|${alt}`;
  if (key !== lastHud) {
    lastHud = key;
    $('status-title').textContent = title;
    $('status-speed').textContent = speed;
    $('status-alt').textContent = alt;
  }
  $('btn-exit').classList.toggle('hidden', !v);
  $('btn-garage').classList.toggle('hidden', !!v);
  $('btn-right').classList.toggle('hidden', !(v && (v.kind === 'car' || v.kind === 'boat')));
}

// ---------------------------------------------------------------- boot
let spawn = null;

// ---------------------------------------------------------------- saved spot
const SPOT_KEY = 'bahrain3d.spot';
function loadSavedSpot() {
  try {
    const v = JSON.parse(localStorage.getItem(SPOT_KEY));
    return v && Number.isFinite(v.x) && Number.isFinite(v.z) ? v : null;
  } catch {
    return null;
  }
}
function saveSpot(x, z) {
  try {
    localStorage.setItem(SPOT_KEY, JSON.stringify({ x: Math.round(x), z: Math.round(z) }));
  } catch {
    /* storage can be unavailable (private mode); resuming is optional */
  }
}
let saveTimer = 5;
let debugFreeCamera = false;

async function boot() {
  land = getLandRings();
  $('loading-text').textContent = 'Building the island…';
  data = await loadDataset();
  $('data-source').textContent =
    data.source === 'osm'
      ? `Map: OpenStreetMap extract (${data.buildings.length.toLocaleString()} buildings, ${(data.roads?.length ?? 0).toLocaleString()} road segments)`
      : `Map: procedural city · run “npm run fetch:osm” for real buildings`;
  $('attribution').textContent = [data.attribution, 'Boat & aircraft CC BY 4.0 · sky CC0 · see Credits'].filter(Boolean).join(' · ');

  $('loading-text').textContent = 'Loading models…';
  // Real models (character, car, boat, aircraft) and the sky image for lighting load in parallel.
  // A failed file keeps its primitive model, or plain lighting for the sky.
  const [, env] = await Promise.all([loadModels(), loadEnvironment(renderer, ENV_FILES[QUALITY])]);
  scene.environment = env;
  await new Promise((r) => setTimeout(r, 0)); // let the loading text paint
  world3d = buildWorld(scene, renderer, data);
  world3d.setDrawDistance(QUALITY === 'low' ? 1500 : 2600);
  physics = createPhysicsWorld();
  addLandCollider(physics, world3d.landGeometry);
  colliders = new BuildingColliders(physics, data.buildings);

  const sp = computeSpawns(land, colliders);
  // Resume the last spot, if it is still on land and clear of buildings.
  const saved = loadSavedSpot();
  if (saved && pointInLand(saved.x, saved.z, land) && !colliders.blocked(saved.x, saved.z)) sp.human = [saved.x, saved.z];
  spawn = sp;
  colliders.update(sp.human[0], sp.human[1], 230);
  human = new Human(physics, scene, sp.human[0], sp.human[1]);

  vehicles = [
    new Car(physics, scene, sp.car[0], sp.car[1], 0),
    new Boat(physics, scene, sp.boat[0], sp.boat[1], 0),
    new Plane(physics, scene, sp.plane[0], sp.plane[1], sp.planeHeading), // on the runway at Bahrain International
    new Helicopter(physics, scene, sp.heli[0], sp.heli[1], 0),
  ];
  for (const v of vehicles) v.sync?.(0);
  // Test hook for headless checks: ?debug=1 exposes the live game objects. Normal play does not use it.
  if (new URLSearchParams(location.search).has('debug')) {
    window.__game = {
      renderInfo: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }),
      human: () => human,
      vehicles: () => vehicles,
      summon: (kind) => summonVehicle(kind),
      groundHeightAt: (x, z) => groundHeightAt(physics, x, z),
      groundHitAt: (x, z) => groundHitAt(physics, x, z),
      lastSummon: () => lastSummon,
      /** Land truth from the coastline data (same test the land audit uses). */
      isLand: (x, z) => pointInLand(x, z, getLandRings()),
      landRings: () => getLandRings(),
      landBounds: () => {
        const pts = getLandRings().flat();
        return { minX: Math.min(...pts.map((p) => p[0])), maxX: Math.max(...pts.map((p) => p[0])), minZ: Math.min(...pts.map((p) => p[1])), maxZ: Math.max(...pts.map((p) => p[1])) };
      },
      camera,
      state,
      teleportTo,
      /** Turns the follow camera off and looks from `eye` at `at` (both [x, y, z]). */
      freeCamera(eye, at) {
        debugFreeCamera = true;
        camera.position.set(...eye);
        camera.lookAt(...at);
      },
    };
  }

  map = new GameMap({
    container: $('minimap'),
    canvas: $('minimap-canvas'),
    hint: $('map-hint'),
    data,
    toast,
    onTeleport: teleportTo,
    getPlayer: () => {
      const e = state.mode === 'vehicle' ? state.vehicle : human;
      const p = e.body.position;
      const f = e.forward();
      return { x: p.x, z: p.z, fx: f.fx, fz: f.fz };
    },
    getVehicles: () => vehicles.filter((v) => v !== state.vehicle).map((v) => ({ kind: v.kind, x: v.body.position.x, z: v.body.position.z })),
  });

  bindUi();
  camera.position.set(sp.human[0], 10, sp.human[1] + 10);
  updateCamera(1);
  $('loading').classList.add('done');
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- loop
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  state.time += dt;

  handleKeys();
  const axes = input.poll();

  accumulator += dt;
  while (accumulator >= FIXED_DT) {
    if (state.mode === 'human') human.update(FIXED_DT, axes, state.orbitYaw);
    else state.vehicle.update(FIXED_DT, axes);
    for (const v of vehicles) if (v !== state.vehicle) v.update(FIXED_DT, IDLE);
    physics.step(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  // streamed building colliders around whichever entity the player controls
  colliderTimer -= dt;
  if (colliderTimer <= 0) {
    colliderTimer = 0.25;
    const f = state.mode === 'human' ? human.body.position : state.vehicle.body.position;
    colliders.update(f.x, f.z, 230);
  }

  human.sync(dt);
  for (const v of vehicles) v.sync(dt);

  const focus = state.mode === 'human' ? human.body.position : state.vehicle.body.position;
  world3d.update(dt, state.time, new THREE.Vector3(focus.x, focus.y, focus.z));

  respawnIfLost();
  updateProximity();
  saveTimer -= dt;
  if (saveTimer <= 0) {
    saveTimer = 5;
    const p = (state.mode === 'vehicle' ? state.vehicle : human).body.position;
    saveSpot(p.x, p.z);
  }
  updateCamera(dt);
  updateHud();
  garageTimer -= dt;
  if (garageTimer <= 0) {
    garageTimer = 0.25;
    updateGarage();
  }
  map.update();
  renderer.render(scene, camera);
}

boot()
  .then(() => {
    startupDone = true;
    $('loading-error').classList.add('hidden'); // boot may finish after the slow-load message appeared
  })
  .catch((err) => {
    console.error(err);
    showLoadError(err.message);
  });
