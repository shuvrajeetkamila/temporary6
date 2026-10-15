# Bahrain 3D (temporary6)

A from-scratch Three.js + cannon-es sandbox of Bahrain with driveable cars, boats, a jet and a helicopter,
a dual-mode map with tap-to-teleport, and a Capacitor wrapper for Android.

Stack: **Vite · Three.js · cannon-es · Capacitor 8** (no external model or texture files, so everything runs offline).

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173  (bound to 0.0.0.0)
npm test             # headless physics, spawn and data checks (no browser needed)
```

Optional, real Bahrain buildings and roads from OpenStreetMap (HOT export on HDX, Overpass as fallback):

```bash
npm run fetch:osm    # writes public/data/bahrain-osm.json (git-ignored, about 5 MB)
```

Without that file the game uses a deterministic **procedural city** around Manama. Force it with `?city=procedural`.
Add `?touch=1` to show the on-screen controls on a desktop.
Add `?quality=low` or `?quality=high` to override the default. Touch devices start at low (1× pixels, no shadows, 1.5 km draw distance).
The game saves your position every 5 s in `localStorage` and resumes there on the next visit, if that spot is still on land and clear of buildings.
If the world fails to load, an error panel offers **Retry** and **Procedural city**. WebGL 2 is required.

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
| Vehicles list (summon / send home) | V, or the **Vehicles** button | **Vehicles** button |
| Summon car · boat · jet · helicopter | 1 · 2 · 3 · 4 (on foot) | Vehicles list |
| Day / night | N | — |

Plane & helicopter: **W = nose down / forward tilt**, **A/D = bank (plane) or yaw (helicopter)**.

## How the five steps map to the code

### Step 1 · Map generation
- `src/land.js`, `src/data/bahrain-coast.json`: land as 25 OpenStreetMap coastline rings (main island, Muharraq, Sitra, Hawar and the other islands), ODbL. Built by `scripts/extract-coast.mjs`.
- `src/geo.js`: local equirectangular projection centred on Bahrain (X = east, Z = south, Y up, sea level = 0).
- `scripts/fetch-osm.mjs`: downloads the HOT/HDX Bahrain building and road GeoPackages (about 31k buildings, 72k road segments,
  updated monthly). If that fails, it runs an Overpass query. `scripts/gpkg.mjs` reads the GeoPackage with Node's built-in SQLite.
- `src/osm.js`: converts either source to world coordinates. Roads are simplified to about 1.5 m tolerance to keep the file small.
  Buildings use `height`, else `building:levels × 3 m`, else 9 m. Roads get a width per highway class.
- `src/procedural.js`: offline fallback (street grid, two arterials, seeded).
- `src/world/world.js`: `ExtrudeGeometry` for buildings and island, ribbon meshes for roads, merged into a few draw calls.
  Buildings are split into 1.5 km chunks. Chunks farther than the draw distance are hidden. Each update checks the distance (twice a second).
- `src/spawn.js`: spawn points. The player starts at the city centre on land and clear of buildings. The car starts beside the player, the boat
  is at sea near the city, the helicopter is in the Isa Town area, and the jet is on the airport at Muharraq, facing runway 12. Building checks use the spatial grid of colliders.

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
- Asphalt and sand textures are generated on a canvas, so no image files are needed. Asphalt also has a generated normal map (`createAsphaltNormalMap`).
- `src/world/extras.js`: a 3.7 km runway 12/30 at the airport, and about 2,500 instanced palms along quiet roads (residential, service, living street, unclassified; `street` in the procedural city).
- Sea: custom animated shader with a fresnel term and a sun glint (instead of `THREE.Water`, which needs a normal-map image).
- Sky gradient, fog, soft shadows that follow the player, and a day/night blend.
- Models: the character (Xbot, with idle, walk and run clips) and the car (Ferrari body, with physics wheels) are real glTF files, loaded at boot (`src/entities/assets.js`). The boat, plane and helicopter are primitives (`src/entities/models.js`). Physics does not depend on the models.

### Step 4 · UI and map
- `src/map.js`: one element (`#minimap`) animates with CSS from a circular minimap (top-right, follows the player, north up) to a full-screen map.
- Full map: drag to pan, pinch or wheel to zoom, and a tap on land teleports the player.
  Taps on water are refused with a message.
- Teleport: the player's body is placed at `groundY + 2` on the tapped point (rooftops count as ground), and the map collapses back to the minimap.

### Step 5 · Android (Capacitor)
- `capacitor.config.json` (appId `com.shuvrajeetkamila.bahrain3d`, webDir `dist`).
- `android/` is the generated native project. `AndroidManifest.xml` sets `android:hardwareAccelerated="true"`.
- CI (`.github/workflows/android-apk.yml`) builds a **debug** APK on push to this branch and uploads it as an artifact. It is **not signed as a release**, and no release APK is built.
  Android System WebView supports WebGL2 on any device with OpenGL ES 3.0, which covers current phones.
- Build flow, in order:
  ```bash
  npm install
  npm run fetch:osm         # optional: writes public/data/bahrain-osm.json (otherwise the procedural city is used)
  npm test                  # headless checks (spawn, physics, data)
  npm run build             # vite build → dist/
  npx cap sync android      # copy dist/ into the Android project (same as npm run cap:sync)
  npx cap open android      # opens the project in Android Studio
  ```
  In Android Studio, choose **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
  The plan's `npx cap build android` is not a Capacitor command. `cap sync` and `cap open` are the real ones.
  Command-line alternative with JDK 17+ and the Android SDK: `cd android && ./gradlew assembleDebug`.

## Known limitations (read before building on this)

- **Coastline is OSM at 10 m resolution, not survey data.** Land comes from the OpenStreetMap coastline (via `@geo-maps/earth-coastlines-10m`, ODbL).
  Islets under about 2000 m² are dropped. Heights are flat (sea level 0), so there is no terrain relief.
- **Real OSM extract is not in git** (`public/data/*.json` is ignored). The procedural city is used until you run `npm run fetch:osm`.
  The GitHub Actions APK build runs the fetch first, so the APK includes the real data when the download succeeds.
  OpenStreetMap data is © OpenStreetMap contributors, ODbL. The game shows that attribution when the extract is loaded.
- **Performance on phones with the full OSM extract is untested.** The Bahrain extract has about 31k footprints and about 72k road segments.
  Building meshes are chunked and distance-culled, but there is no level-of-detail yet. Procedural mode is the safe default for low-end devices.
- Building colliders are axis-aligned boxes around each footprint, so rotated walls are approximate.
- The jet is an arcade model (a 2 m collider with lift applied from the code, not a wing simulation).
- **Real models: the human (Xbot) and the car (Ferrari body) are glTF models.** The boat, plane and helicopter are still primitives,
  because the three.js package has no suitable models for them. Each builder in `src/entities/models.js` falls back to its primitive model
  if its file fails to load. Model sources and licences are in `ASSETS.md`. **The Ferrari licence needs checking before publishing.**
- Browser check: headless Chromium (WebGL 2, SwiftShader) loads the game with no page errors. It was checked for boot,
  the spawn view, the car and character models, and the sea. Checked by eye from screenshots, not by an automated test.
  Not yet checked: real-OSM rendering in a browser (the sandbox cannot reach HDX), the walk and run animations while moving,
  driving the car, and a real phone. The runway heading (runway 12, about 120°) is from memory and has not been checked against survey data.
- Debug hook for browser checks: `?debug=1` exposes `window.__game` (the live objects and a free camera). Normal play does not use it.
- Dev-only audit: `npm audit` reports 3 moderate `uuid` advisories inside `@capacitor/cli` (build tool, not in the APK). The suggested fix is a breaking downgrade, so it was not applied.
- The APK is not built in the sandbox (no JDK or Android SDK there). Build it in Android Studio as described below.

## Project layout

```
index.html                 HUD, minimap, touch controls, help overlay
src/main.js                game loop, state (on foot / driving), camera, prompts, teleport
src/world/world.js         island, buildings (chunked), roads, sea, sky, lights, day/night
src/world/textures.js      canvas textures (windows, asphalt, sand, asphalt normal map)
src/world/extras.js        airport runway, palm trees
src/spawn.js               spawn points on land, clear of buildings; airport spawn for the jet
src/entities/vehicles.js   Human, Car, Boat, Plane, Helicopter controllers
src/entities/models.js     vehicle and character builders (real glTF models with primitive fallbacks)
src/entities/assets.js     glTF/Draco loading, model fitting to real sizes
public/models, public/draco, public/textures   bundled third-party assets (see ASSETS.md)
src/physics.js             cannon-es world, collider streaming, ground raycasts
src/map.js                 minimap / full map, pan-zoom, tap-to-teleport
src/input.js               keyboard + touch → one input object
src/dataset.js             loads OSM extract or falls back to the procedural city
src/osm.js                 OSM features → world-space buildings and roads (HDX and Overpass)
src/procedural.js          offline city generator
src/geo.js, src/land.js    projection, polygons, land rings (coastline)
scripts/fetch-osm.mjs      HDX GeoPackage downloader, Overpass fallback
scripts/gpkg.mjs           GeoPackage reader (node:sqlite)
tests/                     node:test checks for physics, spawns and data
android/                   Capacitor Android project
```

## Attribution

- Coastline: © OpenStreetMap contributors (ODbL), via the `@geo-maps/earth-coastlines-10m` npm package (MIT code, ODbL data). Extracted by `scripts/extract-coast.mjs`.
- Buildings and roads (optional extract): © OpenStreetMap contributors (ODbL).
