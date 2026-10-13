import './style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createPhysicsWorld, addLandCollider, BuildingColliders, groundHeightAt } from './physics.js';
import { loadDataset } from './dataset.js';
import { buildWorld } from './world/world.js';
import { Human, Car, Boat, Plane, Helicopter } from './entities/vehicles.js';
import { createInput } from './input.js';
import { GameMap } from './map.js';
import { getLandPolygon } from './land.js';
import { lonLatToXZ, nearestLandPoint, nearestSeaPoint, pointInPoly } from './geo.js';
import { CITY_CENTER, PLACES, WATER_Y } from './config.js';

const FIXED_DT = 1 / 60;
const IDLE = { x: 0, y: 0, throttle: 0, brake: false, jump: false, run: false };
const CAM_DISTANCE = { human: 6, car: 9, boat: 13, plane: 26, heli: 17 };
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- renderer / camera
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
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

/** Nearest free land spot to (x, z): not inside a building footprint (with a small margin). */
function findFreeSpot(x, z) {
  const items = colliders.items;
  const free = (px, pz) =>
    pointInPoly(px, pz, land) &&
    !items.some((it) => Math.abs(px - it.cx) < it.hx + 1.5 && Math.abs(pz - it.cz) < it.hz + 1.5);
  if (free(x, z)) return [x, z];
  for (let r = 3; r < 600; r += 3) {
    for (let a = 0; a < 360; a += 12) {
      const px = x + r * Math.cos((a * Math.PI) / 180);
      const pz = z + r * Math.sin((a * Math.PI) / 180);
      if (free(px, pz)) return [px, pz];
    }
  }
  return [x, z];
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
    if (v.kind === 'boat' && !pointInPoly(side.x, side.z, land)) {
      toast('Steer closer to the shore before stepping off.');
      return;
    }
  }
  const [sx, sz] = findFreeSpot(side.x, side.z);
  const gy = groundHeightAt(physics, sx, sz);
  human.body.velocity.set(0, 0, 0);
  human.setInWorld(true, new CANNON.Vec3(sx, gy + Human.RADIUS + 0.4, sz));
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
  const R = 56;
  let active = false;
  const move = (e) => {
    const r = base.getBoundingClientRect();
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
  if (input.pressed('Escape')) map.close();
  if (input.pressed('KeyN')) toggleNight();
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

function respawnIfLost() {
  for (const v of vehicles) {
    const p = v.body.position;
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
}

// ---------------------------------------------------------------- boot
/** Spawn points (world XZ). All land spawns avoid building footprints. */
function spawnPoints() {
  const [cx, cz] = lonLatToXZ(CITY_CENTER.lon, CITY_CENTER.lat);
  const human = findFreeSpot(...nearestLandPoint(cx, cz, land));
  const car = findFreeSpot(...nearestLandPoint(human[0] + 45, human[1] + 30, land));
  const boat = nearestSeaPoint(cx, cz, land, 30);
  // Heli (Isa Town) and plane (Riffa) also avoid building footprints so no body starts inside a block.
  const heli = findFreeSpot(...nearestLandPoint(...lonLatToXZ(50.5, 26.13), land)); // Isa Town area
  const plane = findFreeSpot(...nearestLandPoint(...lonLatToXZ(50.555, 26.13), land)); // Riffa area
  return { human, car, boat, heli, plane };
}

let spawn = null;

async function boot() {
  land = getLandPolygon();
  $('loading-text').textContent = 'Building the island…';
  data = await loadDataset();
  $('data-source').textContent =
    data.source === 'osm'
      ? `Map: OpenStreetMap extract (${data.buildings.length.toLocaleString()} buildings)`
      : `Map: procedural city · run “npm run fetch:osm” for real buildings`;
  $('attribution').textContent = data.attribution || '';

  await new Promise((r) => setTimeout(r, 0)); // let the loading text paint
  world3d = buildWorld(scene, renderer, data);
  physics = createPhysicsWorld();
  addLandCollider(physics, world3d.landGeometry);
  colliders = new BuildingColliders(physics, data.buildings);

  const sp = spawnPoints();
  spawn = sp;
  colliders.update(sp.human[0], sp.human[1], 230);
  human = new Human(physics, scene, sp.human[0], sp.human[1]);

  vehicles = [
    new Car(physics, scene, sp.car[0], sp.car[1], 0),
    new Boat(physics, scene, sp.boat[0], sp.boat[1], 0),
    new Plane(physics, scene, sp.plane[0], sp.plane[1], Math.PI), // flies north over Manama
    new Helicopter(physics, scene, sp.heli[0], sp.heli[1], 0),
  ];
  for (const v of vehicles) v.sync?.(0);

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
  updateCamera(dt);
  updateHud();
  map.update();
  renderer.render(scene, camera);
}

boot().catch((err) => {
  console.error(err);
  $('loading-text').textContent = `Failed to start: ${err.message}`;
});
