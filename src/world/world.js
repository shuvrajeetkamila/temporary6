import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { WATER_Y } from '../config.js';
import { createWindowTextures, createAsphaltTexture, createSandTexture, createAsphaltNormalMap } from './textures.js';
import { addAirportRunway, addPalms } from './extras.js';
import { lonLatToXZ } from '../geo.js';

const LIGHTING = {
  day: {
    top: 0x2f78c4, horizon: 0xcfe6f5, sun: 0xfff1d0, sunI: 2.8, hemi: 1.0, emissive: 0, env: 0.9,
    water: [0x0b5d74, 0x1d8fa3],
  },
  night: {
    top: 0x02040c, horizon: 0x13213f, sun: 0x7d93cc, sunI: 0.22, hemi: 0.3, emissive: 1.25, env: 0.12,
    water: [0x031c2b, 0x0a3a4d],
  },
};

const waterVS = /* glsl */ `
  varying vec3 vWorldPos;
  #include <fog_pars_vertex>
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const waterFS = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uNight;
  uniform sampler2D uNormals; // three.js water normal map (real texture), scrolled in two directions
  varying vec3 vWorldPos;
  #include <fog_pars_fragment>

  float wave(vec2 p) {
    return sin(p.x * 0.11 + uTime * 0.9) * 0.5
         + sin(p.y * 0.16 - uTime * 0.7) * 0.5
         + sin((p.x + p.y) * 0.047 + uTime * 0.4) * 0.7;
  }

  void main() {
    vec2 p = vWorldPos.xz;
    float h = wave(p);
    float hx = wave(p + vec2(0.8, 0.0));
    float hz = wave(p + vec2(0.0, 0.8));
    vec3 n = normalize(vec3((h - hx) * 0.12, 1.0, (h - hz) * 0.12));
    vec3 n1 = texture2D(uNormals, p * 0.012 + vec2(uTime * 0.012, uTime * 0.008)).xyz * 2.0 - 1.0;
    vec3 n2 = texture2D(uNormals, p * 0.02 + vec2(-uTime * 0.01, uTime * 0.014)).xyz * 2.0 - 1.0;
    n = normalize(n + vec3(n1.x + n2.x, 0.0, n1.y + n2.y) * 0.22);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
    vec3 base = mix(uShallow, uDeep, smoothstep(0.0, 1.0, 0.5 + 0.5 * sin(p.x * 0.0004 + p.y * 0.0003)));
    vec3 R = reflect(-V, n);
    float spec = pow(max(dot(R, uSunDir), 0.0), 220.0);
    vec3 col = base + fres * vec3(0.30, 0.40, 0.50) * (1.0 - uNight * 0.5) + spec * uSunColor * 1.6;
    gl_FragColor = vec4(col, 1.0);
    #include <fog_fragment>
    #include <colorspace_fragment>
  }
`;

const skyVS = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position.z = gl_Position.w; // always at far plane
  }
`;

const skyFS = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

/** Copies a contiguous vertex range (non-indexed geometry) into a new BufferGeometry. */
function sliceGeometry(src, start, count) {
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const a = src.attributes[name];
    const size = a.itemSize;
    out.setAttribute(name, new THREE.BufferAttribute(a.array.slice(start * size, (start + count) * size), size));
  }
  return out;
}

/**
 * Builds the visual + static world.
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer} renderer
 * @param {{land:number[][], buildings:{h:number,pts:number[][]}[], roads:{w:number,kind:string,pts:number[][]}[]}} data
 */
export function buildWorld(scene, renderer, data) {
  const group = new THREE.Group();
  scene.add(group);

  // ---- lights -------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xcfe6f5, 0x8a7a5a, LIGHTING.day.hemi);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(LIGHTING.day.sun, LIGHTING.day.sunI);
  sun.position.set(-900, 1300, 700);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -350; sc.right = 350; sc.top = 350; sc.bottom = -350; sc.near = 10; sc.far = 3000;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  // ---- sky ----------------------------------------------------------------
  const skyUniforms = { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(30000, 32, 16),
    new THREE.ShaderMaterial({ uniforms: skyUniforms, vertexShader: skyVS, fragmentShader: skyFS, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  // ---- land (island) ------------------------------------------------------
  const textures = {
    windows: createWindowTextures(renderer),
    asphalt: createAsphaltTexture(renderer),
    asphaltNormal: createAsphaltNormalMap(),
    sand: createSandTexture(renderer),
  };

  // one shape per island ring (main island, Muharraq, Sitra, Hawar, ...); Shape y is -z so the extrude lands in XZ
  const landShapes = data.land.map((ring) => new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z))));
  const landGeo = new THREE.ExtrudeGeometry(landShapes, { depth: 1.2, bevelEnabled: false, steps: 1 });
  landGeo.rotateX(-Math.PI / 2);
  landGeo.translate(0, -1.2, 0); // top surface at y = 0
  const landMat = new THREE.MeshStandardMaterial({ map: textures.sand, color: 0xffffff, roughness: 1, metalness: 0 });
  const landMesh = new THREE.Mesh(landGeo, landMat);
  landMesh.receiveShadow = true;
  group.add(landMesh);

  // ---- buildings ----------------------------------------------------------
  const wallMat = new THREE.MeshStandardMaterial({
    map: textures.windows.map,
    emissiveMap: textures.windows.emissiveMap,
    emissive: 0xffd9a0,
    emissiveIntensity: LIGHTING.day.emissive,
    roughness: 0.85,
    metalness: 0.05,
  });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.95 });

  // ExtrudeGeometry is non-indexed and always emits group 0 = caps (roofs) then group 1 = sides (walls).
  // Buildings are merged into square chunks (about 1.5 km). Each chunk is one roof mesh and one wall mesh,
  // so the renderer can skip chunks outside the camera view. A single merged mesh would draw the whole city every frame.
  const CHUNK_M = 1500;
  const chunks = new Map();
  const buildingChunks = [];
  for (const b of data.buildings) {
    if (!b.pts || b.pts.length < 3) continue;
    let cx = 0;
    let cz = 0;
    for (const [x, z] of b.pts) {
      cx += x;
      cz += z;
    }
    cx /= b.pts.length;
    cz /= b.pts.length;
    const key = `${Math.floor(cx / CHUNK_M)},${Math.floor(cz / CHUNK_M)}`;
    let chunk = chunks.get(key);
    if (!chunk) {
      chunks.set(key, (chunk = { roof: [], wall: [], cx: (Math.floor(cx / CHUNK_M) + 0.5) * CHUNK_M, cz: (Math.floor(cz / CHUNK_M) + 0.5) * CHUNK_M }));
    }
    const shape = new THREE.Shape(b.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: b.h, bevelEnabled: false, steps: 1, curveSegments: 1 });
    g.rotateX(-Math.PI / 2);
    const [caps, sides] = g.groups;
    chunk.roof.push(sliceGeometry(g, caps.start, caps.count));
    chunk.wall.push(sliceGeometry(g, sides.start, sides.count));
    g.dispose();
  }
  for (const chunk of chunks.values()) {
    const roofGeo = mergeGeometries(chunk.roof, false);
    const wallGeo = mergeGeometries(chunk.wall, false);
    chunk.roof.forEach((g) => g.dispose());
    chunk.wall.forEach((g) => g.dispose());
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    for (const m of [roofMesh, wallMesh]) {
      m.castShadow = true;
      m.receiveShadow = true;
      group.add(m);
    }
    buildingChunks.push({ meshes: [roofMesh, wallMesh], cx: chunk.cx, cz: chunk.cz });
  }
  // Distance culling: chunks beyond the draw distance are hidden. Frustum culling handles the rest.
  let drawDistance = 2600;
  let lodTimer = 0;
  const applyLod = (focus) => {
    for (const c of buildingChunks) {
      const d = Math.hypot(c.cx - focus.x, c.cz - focus.z);
      const visible = d <= drawDistance + CHUNK_M;
      for (const m of c.meshes) m.visible = visible;
    }
  };

  addAirportRunway(group);
  addPalms(group, data.roads, data.land);

  // ---- roads --------------------------------------------------------------
  const ROAD_Y = 0.05;
  const pos = [];
  const nrm = [];
  const uvs = [];
  const col = [];
  const idx = [];
  let vi = 0;
  const arterialColor = new THREE.Color(0x5b5e63);
  const streetColor = new THREE.Color(0x46484c);
  for (const r of data.roads) {
    const hw = r.w / 2;
    const c = r.kind === 'street' ? streetColor : arterialColor;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i];
      const [bx, bz] = r.pts[i + 1];
      const dx = bx - ax;
      const dz = bz - az;
      const len = Math.hypot(dx, dz) || 1;
      const nx = (-dz / len) * hw;
      const nz = (dx / len) * hw;
      pos.push(ax + nx, ROAD_Y, az + nz, ax - nx, ROAD_Y, az - nz, bx - nx, ROAD_Y, bz - nz, bx + nx, ROAD_Y, bz + nz);
      nrm.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      uvs.push((ax + nx) / 16, (az + nz) / 16, (ax - nx) / 16, (az - nz) / 16, (bx - nx) / 16, (bz - nz) / 16, (bx + nx) / 16, (bz + nz) / 16);
      for (let k = 0; k < 4; k++) col.push(c.r, c.g, c.b);
      idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
      vi += 4;
    }
  }
  if (vi > 0) {
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    rg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    rg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    rg.setIndex(idx);
    const roadMat = new THREE.MeshStandardMaterial({
      map: textures.asphalt,
      normalMap: textures.asphaltNormal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      vertexColors: true,
      roughness: 0.75,
      metalness: 0,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const roads = new THREE.Mesh(rg, roadMat);
    roads.receiveShadow = true;
    group.add(roads);
  }

  // ---- sea ----------------------------------------------------------------
  // Until the texture arrives, a flat normal map (0.5, 0.5, 1) keeps the sea looking as before.
  const waterNormalPlaceholder = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1);
  waterNormalPlaceholder.needsUpdate = true;
  const waterUniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(LIGHTING.day.water[0]) },
    uShallow: { value: new THREE.Color(LIGHTING.day.water[1]) },
    uSunDir: { value: sun.position.clone().normalize() },
    uSunColor: { value: new THREE.Color(LIGHTING.day.sun) },
    uNight: { value: 0 },
    uNormals: { value: waterNormalPlaceholder },
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
  };
  const waterMat = new THREE.ShaderMaterial({
    uniforms: waterUniforms,
    vertexShader: waterVS,
    fragmentShader: waterFS,
    fog: true,
  });
  new THREE.TextureLoader().load('textures/waternormals.jpg', (tex) => {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace; // normal data is linear
    tex.anisotropy = 4;
    waterUniforms.uNormals.value = tex;
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER_Y;
  scene.add(water);

  // ---- fog ----------------------------------------------------------------
  scene.fog = new THREE.Fog(LIGHTING.day.horizon, 1200, 11000);

  // ---- day / night --------------------------------------------------------
  let night = false;
  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();
  function applyLighting(t) {
    // t: 0 = day, 1 = night (lerped by caller for a smooth transition)
    const a = LIGHTING.day;
    const b = LIGHTING.night;
    tmpA.set(a.top).lerp(tmpB.set(b.top), t);
    skyUniforms.uTop.value.copy(tmpA);
    tmpA.set(a.horizon).lerp(tmpB.set(b.horizon), t);
    skyUniforms.uHorizon.value.copy(tmpA);
    scene.fog.color.copy(tmpA);
    sun.intensity = a.sunI + (b.sunI - a.sunI) * t;
    hemi.intensity = a.hemi + (b.hemi - a.hemi) * t;
    scene.environmentIntensity = a.env + (b.env - a.env) * t; // image-based light, only when the sky map loaded
    wallMat.emissiveIntensity = a.emissive + (b.emissive - a.emissive) * t;
    waterUniforms.uNight.value = t;
    waterUniforms.uDeep.value.set(a.water[0]).lerp(tmpB.set(b.water[0]), t);
    waterUniforms.uShallow.value.set(a.water[1]).lerp(tmpB.set(b.water[1]), t);
    waterUniforms.uSunColor.value.set(a.sun).lerp(tmpB.set(b.sun), t);
  }
  let nightT = 0;
  applyLighting(nightT);

  return {
    group,
    sun,
    sky,
    landGeometry: landGeo,
    /** Hides building chunks farther than `metres` from the player (applied about twice a second). */
    setDrawDistance(metres) {
      drawDistance = metres;
      lodTimer = 1; // re-apply on the next update
    },
    /** Called every frame. */
    update(dt, time, focus) {
      lodTimer -= dt;
      if (lodTimer <= 0) {
        lodTimer = 0.5;
        applyLod(focus);
      }
      waterUniforms.uTime.value = time;
      sky.position.copy(focus);
      sun.position.set(focus.x - 900, 1300, focus.z + 700);
      sun.target.position.copy(focus);
      nightT += ((night ? 1 : 0) - nightT) * Math.min(1, dt * 2.5);
      applyLighting(nightT);
    },
    setNight(on) {
      night = on;
    },
    isNight() {
      return night;
    },
    dispose() {
      scene.remove(group, sky, water, sun, sun.target, hemi);
    },
  };
}
