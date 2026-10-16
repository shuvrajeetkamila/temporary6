// Pure quaternion helpers for the "right the vehicle" action. No three.js or cannon imports, so tests can run in Node.

/**
 * Yaw (heading) of a body quaternion, taking the nose as -Z. Matches setFromEuler(0, yaw, 0),
 * so a body set to this heading faces the same way (its pitch and roll are dropped).
 */
export function headingOf(q) {
  return Math.atan2(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y));
}

/** Cosine of the tilt from level: 1 when the body is upright, 0 on its side, -1 upside down. */
export function uprightness(q) {
  return 1 - 2 * (q.x * q.x + q.z * q.z);
}
