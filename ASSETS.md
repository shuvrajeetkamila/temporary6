# Third-party assets

All of these files ship inside the app (under `public/`), so they are bundled in the Android APK.

| File | What it is | Source | Licence / notes |
|---|---|---|---|
| `public/models/Xbot.glb` | Character model with idle, walk and run clips | three.js r186 examples (`examples/models/gltf/Xbot.glb`), made with Mixamo | three.js code and examples are MIT. The character comes from Mixamo (Adobe). Mixamo permits use in apps. Check Adobe's current terms before commercial release. |
| `public/models/THREE_LICENSE.txt` | three.js MIT licence | three.js r186 | MIT |
| `public/models/zefiro_6.5.glb` | ZEFIRO motorboat, scaled to 6.5 m. Player boat | [ZEFIRO](https://sketchfab.com/3d-models/zefiro-5c29921a556346f09684eadfbc51a91d) by angelo raffaele catalano, via the Open Water project (bob6664569, `site/assets/boats/`) | **CC BY 4.0. Credit required.** Unchanged file |
| `public/models/A320_nologo.glb` | Airbus A320, logo-free variant, real scale (37.6 m). Jet | [amvlab/aircraft-models](https://github.com/amvlab/aircraft-models) | **CC BY 4.0. Credit required.** Unchanged file. Licence text: `public/models/LICENSE-amvlab-CC-BY-4.0.txt` |
| `public/env/sky_clear_4k.hdr` | Sky HDRI for image-based light, desktop | Qwantani Pure Sky by Greg Zaal, pure-sky edits by Jarod Guest, [Poly Haven](https://polyhaven.com/a/qwantani_puresky), via Open Water (`site/assets/sky_clear_4k.hdr`) | CC0 1.0 |
| `public/env/sky_clear_1k.hdr` | 1K version, for touch devices and low quality | Same as above, resized by the Open Water project | CC0 1.0 |
| `src/data/bahrain-coast.json` | Bahrain land outline: 25 coastline rings (main island, Muharraq, Sitra, Hawar and islands) | OpenStreetMap coastline, 10 m, via [@geo-maps/earth-coastlines-10m](https://github.com/simonepri/geo-maps) 0.6.0, extracted by `scripts/extract-coast.mjs` | **ODbL 1.0. © OpenStreetMap contributors. Attribution required.** |
| `public/textures/waternormals.jpg` | Sea normal map | three.js r186 examples (`examples/textures/waternormals.jpg`) | three.js MIT |

Map data: see the attribution line in the app (OpenStreetMap contributors, ODbL) when the OSM extract is loaded.

## Not included

- Car body: the three.js Ferrari (`ferrari.glb`, from Sketchfab model 57bf6cc5…, by vicent091036) was removed from the app. The three.js example credits it, but the Sketchfab page is now disabled, so its licence cannot be verified. The car is the built-in primitive model. A licensed car body can go back in only after its licence is confirmed.
- Helicopter: no licensed helicopter model was found that is small enough to bundle. The helicopter stays a primitive model.
- Satellite imagery and DEM terrain: not available offline. The island is flat and built from OSM-style data.
- Excluded for non-commercial terms: `frickies_yacht.glb` (CC BY-NC 4.0), and the dolphin, turtle and manta from the same pack.
