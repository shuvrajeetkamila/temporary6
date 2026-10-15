// Airport runway and palm trees along the roads. Pure three.js, no DOM.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { lonLatToXZ, pointInLand } from '../geo.js';
import { AIRPORT, RUNWAY_12_HEADING } from '../spawn.js';

/** Runway 12/30 at Bahrain International Airport. The jet spawns over it, facing runway 12. */
export function addAirportRunway(group) {
  const [x, z] = lonLatToXZ(AIRPORT.lon, AIRPORT.lat);
  const geo = new THREE.PlaneGeometry(60, 3700);
  geo.rotateX(-Math.PI / 2); // lay flat; length runs along local Z
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.9, metalness: 0 });
  const runway = new THREE.Mesh(geo, mat);
  runway.position.set(x, 0.08, z);
  runway.rotation.y = RUNWAY_12_HEADING;
  runway.receiveShadow = true;
  group.add(runway);
  return runway;
}

/** One palm: a tapered trunk and six fronds, with vertex colours (trunk brown, fronds green). */
function palmGeometry() {
  const parts = [];
  const paint = (g, hex) => {
    const c = new THREE.Color(hex);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  };
  const trunk = new THREE.CylinderGeometry(0.22, 0.38, 8, 6);
  trunk.translate(0, 4, 0);
  parts.push(paint(trunk, 0x6b4f2a));
  for (let k = 0; k < 6; k++) {
    const frond = new THREE.PlaneGeometry(6, 1.4);
    frond.translate(3, 0, 0);
    frond.rotateZ(-0.45); // droop
    frond.rotateY((k * Math.PI * 2) / 6);
    frond.translate(0, 8.2, 0);
    parts.push(paint(frond, 0x2f6b2a));
  }
  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// Quiet roads only: residential and service streets, plus the procedural fallback's 'street'.
const PALM_ROADS = new Set(['residential', 'service', 'living_street', 'unclassified', 'street']);

/**
 * Places palms beside road segments. Deterministic: the same roads always give the same palms.
 * Skips spots outside the island polygon.
 */
export function addPalms(group, roads, land, { max = 2500, seed = 42 } = {}) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const geo = palmGeometry();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.castShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let count = 0;
  const STEP = 70; // one palm every ~70 m along each road
  outer: for (const r of roads) {
    if (!PALM_ROADS.has(r.kind)) continue;
    for (let i = 0; i < r.pts.length - 1; i++) {
      const [ax, az] = r.pts[i];
      const [bx, bz] = r.pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1) continue;
      for (let d = 0; d < len; d += STEP) {
        if (count >= max) break outer;
        const t = d / len;
        const side = rnd() < 0.5 ? -1 : 1;
        const off = (r.w ?? 8) / 2 + 2.5 + rnd() * 2;
        const nx = (-(bz - az) / len) * off * side;
        const nz = ((bx - ax) / len) * off * side;
        const x = ax + (bx - ax) * t + nx;
        const z = az + (bz - az) * t + nz;
        if (!pointInLand(x, z, land)) continue;
        q.setFromAxisAngle(up, rnd() * Math.PI * 2);
        const sc = 0.8 + rnd() * 0.6;
        scale.set(sc, sc, sc);
        pos.set(x, 0, z);
        m.compose(pos, q, scale);
        mesh.setMatrixAt(count++, m);
      }
    }
  }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return mesh;
}
