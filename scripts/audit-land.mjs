// Audits the land data the game draws and collides with.
//   1. every ring is a simple polygon (no self-intersection, no repeated points)
//   2. the triangles that three.js draws for each ring cover the ring's full area
//   3. on a grid over Bahrain, "is it land?" (pointInLand) agrees with "is it covered by a drawn triangle?"
// Run: node scripts/audit-land.mjs            (exit code 1 when a problem is found)
import * as THREE from 'three';
import { getLandRings } from '../src/land.js';
import { pointInLand } from '../src/geo.js';

const STEP_M = Number(process.env.AUDIT_STEP_M ?? 40);

/** Same 2D shape the 3D land is built from (world.js: x, -z), with the closing point removed as ExtrudeGeometry does. */
function ringToShapePoints(ring) {
  const pts = ring.map(([x, z]) => new THREE.Vector2(x, -z));
  const a = pts[0], b = pts[pts.length - 1];
  if (a.x === b.x && a.y === b.y) pts.pop();
  return pts;
}

function segmentsCross(p1, p2, p3, p4) {
  const d = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function selfIntersections(pts) {
  let n = 0;
  const m = pts.length;
  for (let i = 0; i < m; i++) {
    for (let j = i + 2; j < m; j++) {
      if (i === 0 && j === m - 1) continue; // neighbours across the closing edge
      if (segmentsCross(pts[i], pts[(i + 1) % m], pts[j], pts[(j + 1) % m])) n++;
    }
  }
  return n;
}

function hasRepeatedPoint(pts) {
  const seen = new Set();
  for (const p of pts) {
    const k = `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

function inTriangle(p, a, b, c) {
  const s = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

/**
 * Runs the audit. Returns { rings, problems, mismatches, samples, uncovered, extra, cellsChecked }.
 * `problems` lists ring-level faults; `mismatches` lists grid points where land data and drawn land disagree.
 */
export function auditLand(rings = getLandRings(), { stepM = STEP_M } = {}) {
  const problems = [];
  const triangles = []; // per ring: [{a,b,c}]
  rings.forEach((ring, i) => {
    const pts = ringToShapePoints(ring);
    if (pts.length < 3) {
      problems.push({ ring: i, kind: 'too-few-points', points: pts.length });
      triangles.push([]);
      return;
    }
    if (hasRepeatedPoint(pts)) problems.push({ ring: i, kind: 'repeated-point' });
    const cross = selfIntersections(pts);
    if (cross > 0) problems.push({ ring: i, kind: 'self-intersection', count: cross });

    const tris = THREE.ShapeUtils.triangulateShape(pts, []);
    const polyArea = Math.abs(THREE.ShapeUtils.area(pts));
    let triArea = 0;
    const list = [];
    for (const [ia, ib, ic] of tris) {
      const a = pts[ia], b = pts[ib], c = pts[ic];
      triArea += Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
      list.push({ a, b, c });
    }
    triangles.push(list);
    const err = Math.abs(polyArea - triArea) / Math.max(polyArea, 1);
    if (err > 0.001) problems.push({ ring: i, kind: 'triangulation-area', polyArea: Math.round(polyArea), triArea: Math.round(triArea) });
  });

  // grid over the land bounding box
  let w = Infinity, e = -Infinity, s = Infinity, n = -Infinity;
  for (const ring of rings) for (const [x, z] of ring) {
    if (x < w) w = x; if (x > e) e = x;
    if (z < s) s = z; if (z > n) n = z;
  }
  const mismatches = [];
  let cellsChecked = 0, uncovered = 0, extra = 0;
  for (let x = w; x <= e; x += stepM) {
    for (let z = s; z <= n; z += stepM) {
      cellsChecked++;
      const truth = pointInLand(x, z, rings);
      const p = new THREE.Vector2(x, -z);
      let covered = false;
      for (const ring of triangles) {
        for (const t of ring) {
          if (inTriangle(p, t.a, t.b, t.c)) { covered = true; break; }
        }
        if (covered) break;
      }
      if (truth && !covered) { uncovered++; mismatches.push({ x: Math.round(x), z: Math.round(z), kind: 'land-drawn-as-water' }); }
      if (!truth && covered) { extra++; mismatches.push({ x: Math.round(x), z: Math.round(z), kind: 'water-drawn-as-land' }); }
    }
  }
  return { rings: rings.length, problems, mismatches, cellsChecked, uncovered, extra };
}

// CLI
const isMain = process.argv[1] && process.argv[1].endsWith('audit-land.mjs');
if (isMain) {
  const r = auditLand();
  console.log(`rings: ${r.rings}, grid cells checked: ${r.cellsChecked} (step ${STEP_M} m)`);
  console.log(`ring problems: ${r.problems.length}`);
  for (const p of r.problems.slice(0, 20)) console.log('  ', JSON.stringify(p));
  console.log(`land drawn as water: ${r.uncovered}, water drawn as land: ${r.extra}`);
  for (const m of r.mismatches.slice(0, 20)) console.log('  ', JSON.stringify(m));
  const bad = r.problems.length > 0 || r.mismatches.length > 0;
  console.log(bad ? 'AUDIT FAILED' : 'AUDIT OK');
  process.exit(bad ? 1 : 0);
}
