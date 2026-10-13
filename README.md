# Bahrain 3D (temporary6)

A from-scratch Three.js + cannon-es sandbox of Bahrain with driveable cars, boats, a jet and a helicopter,
a dual-mode map with tap-to-teleport, and a Capacitor wrapper for Android.

Stack: **Vite · Three.js · cannon-es · Capacitor 8** (no external model or texture files, so everything runs offline).

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173  (bound to 0.0.0.0)
npm test             # headless physics + data checks (no browser needed)
```

Optional, real buildings from OpenStreetMap (needs internet access to Overpass):

```bash
npm run fetch:osm    # writes public/data/bahrain-osm.json (git-ignored, ~tens of MB)
```

Without that file the game uses a deterministic **procedural city** around Manama. Force it with `?city=procedural`.
Add `?touch=1` to show the on-screen controls on a desktop.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Walk / drive / steer | W A S D or arrows | left virtual stick |
| Sprint (on foot) · throttle up | Shift | ▲ |
| Throttle down | Ctrl | ▼ |
| Jump · handbrake | Space | Jump / Brake |
| Enter / exit vehicle (within 2 m) | E | E button or the "Enter" prompt |
| Look around / zoom | drag the screen / mouse wheel | drag the screen (zoom: wheel on desktop) |
| Map · teleport | M, then tap a point on land | tap the minimap |
| Day / night | N | — |

Plane & helicopter: **W = nose down / forward tilt**, **A/D = bank (plane) or yaw (helicopter)**.

## How the five steps map to the code

### Step 1 · Map generation
- `src/land.js`, `src/data/bahrain-outline.json`: island outline (Natural Earth 1:10m, public domain), projected to metres and Chaikin-smoothed.
- `src/geo.js`: local equirectangular projection centred on Bahrain (X = east, Z = south, Y up, sea level = 0).
- `src/osm.js` + `scripts/fetch-osm.mjs`: Overpass query for `building=*` and `highway=*`, converted to world coordinates.
  Buildings use `height`, else `building:levels × 3 m`, else 9 m. Roads get a width per highway class.
- `src/procedural.js`: offline fallback (street grid, two arterials, seeded).
- `src/world/world.js`: `ExtrudeGeometry` for buildings and island, ribbon meshes for roads, merged into a few draw calls.

### Step 2 · Physics and vehicles
- `src/physics.js`: cannon-es world. The island is a static triangle mesh. Building boxes are **streamed** around the player (max 900 bodies), so large OSM extracts don't overload the physics engine.
- `src/entities/vehicles.js`:
  - **Human**: sphere, camera-relative movement, zero-friction contact material (so walking is not damped by the ground).
  - **Car**: `RaycastVehicle` with 4 suspension wheels, rear-wheel drive, front steering, brakes and handbrake.
  - **Boat**: four buoyancy points that push up in proportion to submersion, plus keel damping and rudder.
  - **Jet**: thrust along the nose, quadratic drag, lift proportional to airspeed (≈ weight at 55 m/s), arcade attitude control.
  - **Helicopter**: collective climb/descent, hover hold, tilt-for-forward-flight, yaw.
- Proximity prompt: within 2 m of a vehicle's bounding box, an **Enter** button appears. Entering hides the player body and moves the camera to the vehicle.

### Step 3 · Visuals
- Facade texture (procedural canvas): windows with random lit windows, which glow at night through an emissive map.
- Asphalt and sand textures are generated on a canvas, so no image files are needed.
- Sea: custom animated shader with a fresnel term and a sun glint (instead of `THREE.Water`, which needs a normal-map image).
- Sky gradient, fog, soft shadows that follow the player, and a day/night blend.
- Models are primitive-built (`src/entities/models.js`). Each builder can later be replaced by a `GLTFLoader` result without touching physics.

### Step 4 · UI and map
- `src/map.js`: one element (`#minimap`) animates with CSS from a circular minimap (top-right, follows the player, north up) to a full-screen map.
- Full map: drag to pan, pinch or wheel to zoom, and a tap on land teleports the player.
  Taps on water are refused with a message.
- Teleport: the player's body is placed at `groundY + 2` on the tapped point (rooftops count as ground), and the map collapses back to the minimap.

### Step 5 · Android (Capacitor)
- `capacitor.config.json` (appId `com.shuvrajeetkamila.bahrain3d`, webDir `dist`).
- `android/` is the generated native project. `AndroidManifest.xml` sets `android:hardwareAccelerated="true"`.
  Android System WebView supports WebGL2 on any device with OpenGL ES 3.0, which covers current phones.
- Build flow:
  ```bash
  npm run cap:sync          # vite build + copy dist/ into the Android project
  npx cap open android      # opens Android Studio → Build → Build Bundle(s) / APK(s)
  # or, with JDK 17+ and the Android SDK installed:
  cd android && ./gradlew assembleDebug
  ```
  Note: the plan's `npx cap build android` is not a Capacitor command. `cap sync` and `cap open` are the real ones.

## Known limitations (read before building on this)

- **Muharraq and the smaller islands are missing from the coastline.** The offline outline comes from Natural Earth, which
  only has the main island. Buildings in Muharraq are dropped by the on-island filter in `scripts/fetch-osm.mjs`,
  and the Bahrain International Airport is on Muharraq, so the jet spawns over the main island.
  The fix is to build the land polygon from OSM `natural=coastline` (or `landuse`), not implemented yet.
- **Real OSM extract is not in git** (`public/data/*.json` is ignored). The procedural city is used until you run `npm run fetch:osm`.
  OpenStreetMap data is © OpenStreetMap contributors, ODbL. The game shows that attribution when the extract is loaded.
- **Performance on phones with the full OSM extract is untested.** A whole-country building set can be 100k+ footprints.
  The next step would be chunking the meshes into tiles with level-of-detail. Procedural mode is the safe default for low-end devices.
- Building colliders are axis-aligned boxes around each footprint, so rotated walls are approximate.
- The jet is an arcade model (a 2 m collider with lift applied from the code, not a wing simulation).
- Models and textures are procedural, not GLB/GLTF assets. Dropping in real models is the natural next step.
- Visual checks were not run inside a browser in this environment (no browser binary could be launched here).
  The physics and data pipelines are verified by `npm test`. Please check the look and feel in the live preview.

## Project layout

```
index.html                 HUD, minimap, touch controls, help overlay
src/main.js                game loop, state (on foot / driving), camera, prompts, teleport
src/world/world.js         island, buildings, roads, sea, sky, lights, day/night
src/world/textures.js      canvas textures (windows, asphalt, sand)
src/entities/vehicles.js   Human, Car, Boat, Plane, Helicopter controllers
src/entities/models.js     primitive models
src/physics.js             cannon-es world, collider streaming, ground raycasts
src/map.js                 minimap / full map, pan-zoom, tap-to-teleport
src/input.js               keyboard + touch → one input object
src/dataset.js             loads OSM extract or falls back to the procedural city
src/osm.js                 Overpass JSON → world-space buildings and roads (also used by the fetch script)
src/procedural.js          offline city generator
src/geo.js, src/land.js    projection, polygons, island outline
scripts/fetch-osm.mjs      Overpass downloader
tests/                     node:test checks for physics and data
android/                   Capacitor Android project
```

## Attribution

- Island outline: Natural Earth (public domain), via the `world-atlas` npm package.
- Buildings and roads (optional extract): © OpenStreetMap contributors (ODbL).
