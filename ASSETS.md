# Third-party assets

All of these files ship inside the app (under `public/`), so they are bundled in the Android APK.

| File | What it is | Source | Licence / notes |
|---|---|---|---|
| `public/models/Xbot.glb` | Character model with idle, walk and run clips | three.js r186 examples (`examples/models/gltf/Xbot.glb`), made with Mixamo | three.js code and examples are MIT. The character comes from Mixamo (Adobe). Mixamo permits use in apps. Check Adobe's current terms before commercial release. |
| `public/models/ferrari.glb` | Ferrari body (Draco-compressed) | three.js r186 examples (`examples/models/gltf/ferrari.glb`) | Original author and licence are **not stated in the file or in three.js**. **Verify the licence before publishing.** |
| `public/models/THREE_LICENSE.txt` | three.js MIT licence | three.js r186 | MIT |
| `public/draco/gltf/*` | Draco decoder (wasm and js) for the Ferrari | three.js r186 `examples/jsm/libs/draco/gltf` | Apache-2.0 (Google Draco) |
| `public/textures/waternormals.jpg` | Sea normal map | three.js r186 examples (`examples/textures/waternormals.jpg`) | three.js MIT |

Map data: see the attribution line in the app (OpenStreetMap contributors, ODbL) when the OSM extract is loaded.
