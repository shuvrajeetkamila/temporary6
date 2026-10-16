import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headingOf, uprightness } from '../src/entities/uprighting.js';

// quaternion from Euler (x, y, z) in the XYZ order used by three.js / cannon
function quatFromEuler(x, y, z) {
  const c1 = Math.cos(x / 2), s1 = Math.sin(x / 2);
  const c2 = Math.cos(y / 2), s2 = Math.sin(y / 2);
  const c3 = Math.cos(z / 2), s3 = Math.sin(z / 2);
  return {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3,
    w: c1 * c2 * c3 - s1 * s2 * s3,
  };
}

test('heading round-trips for pure yaw', () => {
  for (const h of [-3, -1.2, -0.3, 0, 0.5, 1.57, 2.9]) {
    const q = quatFromEuler(0, h, 0);
    assert.ok(Math.abs(headingOf(q) - h) < 1e-9, `heading ${h}`);
    assert.ok(Math.abs(uprightness(q) - 1) < 1e-12);
  }
});

test('heading ignores roll and pitch of a flipped body', () => {
  // car rolled onto its roof, yawed 0.8 rad
  const q = quatFromEuler(Math.PI, 0.8, 0);
  assert.ok(uprightness(q) < -0.99, 'upside down');
  // yaw of a rolled body is still the nose direction projected on the ground
  const yaw = headingOf(q);
  assert.ok(Math.abs(Math.abs(yaw) - Math.PI + 0.8) < 1e-6 || Math.abs(yaw - 0.8) < 1e-6, `yaw ${yaw}`);
});

test('uprightness drops to 0 on its side', () => {
  const q = quatFromEuler(Math.PI / 2, 0, 0);
  assert.ok(Math.abs(uprightness(q)) < 1e-9);
});
