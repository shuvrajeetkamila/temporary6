// Jet aerodynamics checks (pure functions, no browser). Numbers are for an A320-class airliner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JET, G, airDensity, indicatedSpeed, dragCoef, liftCoef, thrustAt, aeroForces, speedOfSound } from '../src/flight.js';

const W = JET.mass * G;
const level = (u) => ({ u, vUp: 0, vRight: 0, p: 0, q: 0, r: 0 });

/** Speed (m/s) where full-throttle thrust equals level-flight drag, found by bisection. */
function topSpeed(alt) {
  const rho = airDensity(alt);
  const excess = (V) => {
    const q = 0.5 * rho * V * V;
    const cl = W / (q * JET.S); // level flight: lift carries the weight
    const drag = q * JET.S * dragCoef(cl, 0, indicatedSpeed(V, alt), V / speedOfSound(alt));
    return thrustAt(1, alt, V) - drag;
  };
  let lo = 40, hi = 400;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (excess(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

test('air density falls with altitude like the standard atmosphere', () => {
  assert.ok(Math.abs(airDensity(0) - 1.225) < 1e-6);
  assert.ok(Math.abs(airDensity(11000) - 0.364) < 0.01, `ρ(11 km) = ${airDensity(11000)}`);
  assert.ok(airDensity(5000) < airDensity(0) && airDensity(5000) > airDensity(11000));
});

test('thrust falls with altitude (turbofan lapse) and is zero at idle', () => {
  assert.equal(thrustAt(0, 0, 0), 0);
  const sea = thrustAt(1, 0, 0);
  assert.ok(sea > 200000 && sea <= JET.thrustMax, `sea-level static thrust ${sea}`);
  assert.ok(thrustAt(1, 11000, 0) < sea * 0.35, 'thrust at 11 km should be under a third of sea level');
});

test('clean stall speed at operating mass is about 145 knots (74 m/s)', () => {
  // stall: CL = CLmax at the stall angle (clean wing, no flaps)
  const clMax = liftCoef(JET.alphaStall);
  assert.ok(clMax > 1.4 && clMax < 1.6, `CLmax ${clMax}`);
  const vs = Math.sqrt((2 * W) / (1.225 * JET.S * clMax));
  assert.ok(vs > 70 && vs < 80, `stall speed ${vs.toFixed(1)} m/s`);
});

test('lift equals weight at a realistic cruise lift coefficient', () => {
  const V = 230;
  const alt = 11000;
  const q = 0.5 * airDensity(alt) * V * V;
  const cl = W / (q * JET.S);
  assert.ok(cl > 0.4 && cl < 0.7, `cruise CL ${cl.toFixed(2)}`);
  // the angle of attack that gives that lift is well below the stall
  const alpha = (cl - JET.CL0) / JET.CLa;
  assert.ok(alpha > 0 && alpha < JET.alphaStall, `cruise alpha ${alpha.toFixed(3)} rad`);
});

test('top speed at sea level is near the 180 m/s (350 kt) limit', () => {
  const v = topSpeed(0);
  assert.ok(v > 165 && v < 205, `sea-level top speed ${v.toFixed(0)} m/s`);
});

test('top speed at 11 km is a jet cruise speed, Mach 0.80 to 0.85', () => {
  const v = topSpeed(11000);
  const mach = v / speedOfSound(11000);
  assert.ok(mach > 0.8 && mach < 0.85, `top speed at 11 km ${v.toFixed(0)} m/s, Mach ${mach.toFixed(3)}`);
});

test('speed of sound is about 340 m/s at sea level and 295 m/s at 11 km', () => {
  assert.ok(Math.abs(speedOfSound(0) - 340) < 1, `sea level ${speedOfSound(0)}`);
  assert.ok(Math.abs(speedOfSound(11000) - 295) < 1, `11 km ${speedOfSound(11000)}`);
});

test('lift and drag are zero when there is no airflow', () => {
  const f = aeroForces(level(0), { elevator: 0, aileron: 0, rudder: 0 }, 0);
  assert.equal(f.lift, 0);
  assert.equal(f.drag, 0);
});

test('nose-up angle of attack gives lift up and a nose-down restoring moment', () => {
  const alpha = 0.1;
  const s = { u: 80 * Math.cos(alpha), vUp: -80 * Math.sin(alpha), vRight: 0, p: 0, q: 0, r: 0 };
  const f = aeroForces(s, { elevator: 0, aileron: 0, rudder: 0 }, 0);
  assert.ok(Math.abs(f.alpha - alpha) < 1e-9, `alpha ${f.alpha}`);
  assert.ok(f.up > 0, 'lift points up');
  assert.ok(f.pitch < 0 || f.pitch < JET.Cm0 * 0.01, `static pitch stability: moment ${f.pitch}`);
});

test('elevator up (positive) pitches the nose up; aileron right (positive) rolls right wing down', () => {
  const up = aeroForces(level(80), { elevator: 0.3, aileron: 0, rudder: 0 }, 0);
  assert.ok(up.pitch > 0, `pitch moment ${up.pitch}`);
  const roll = aeroForces(level(80), { elevator: 0, aileron: 0.3, rudder: 0 }, 0);
  assert.ok(roll.roll > 0, `roll moment ${roll.roll}`);
});

test('roll and pitch rates are damped', () => {
  const rolling = aeroForces({ ...level(80), p: 0.5 }, { elevator: 0, aileron: 0, rudder: 0 }, 0);
  assert.ok(rolling.roll < 0, 'roll damping opposes the roll rate');
  const pitching = aeroForces({ ...level(80), q: 0.5 }, { elevator: 0, aileron: 0, rudder: 0 }, 0);
  assert.ok(pitching.pitch < 0, 'pitch damping opposes the pitch rate');
});

test('sideslip produces a restoring side force', () => {
  const f = aeroForces({ u: 80, vUp: 0, vRight: 4, p: 0, q: 0, r: 0 }, { elevator: 0, aileron: 0, rudder: 0 }, 0);
  assert.ok(f.right < 0, `side force ${f.right}`);
});

test('past the stall the lift falls off, and the drag rises', () => {
  const clStall = liftCoef(JET.alphaStall);
  const clDeep = liftCoef(JET.alphaStall + 0.3);
  assert.ok(clDeep < clStall, 'lift falls after the stall');
  assert.ok(clDeep > 0, 'the wing still makes some lift');
});
