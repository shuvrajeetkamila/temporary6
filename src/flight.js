// Jet aerodynamics and engine model. Pure functions only (no three.js or cannon imports), so the numbers can be
// tested in Node. The jet is an Airbus A320-class airliner. Figures are rounded from published data, not measured.
//
// Axes (aircraft frame): forward f, up u, right r. Rates: p = roll (right wing down +), q = pitch (nose up +),
// r = yaw (nose right +). Controls: elevator (nose up +), aileron (right wing down +), in radians.
// Limits of this model: no wind, no ground effect, no flaps, no trim, no engine-out. Speeds are true airspeed in m/s.

export const G = 9.80665;

export const JET = {
  mass: 62000, // kg, typical operating mass
  S: 122.6, // wing area, m²
  span: 35.8, // m
  chord: 4.2, // mean aerodynamic chord, m
  Ixx: 1.2e6, // kg·m², roll
  Iyy: 3.2e6, // kg·m², pitch
  Izz: 4.5e6, // kg·m², yaw
  thrustMax: 240000, // N, two engines at sea level, static (about 120 kN each)
  CL0: 0.3, // lift at zero angle of attack (clean wing)
  CLa: 5.0, // lift slope per radian
  alphaStall: 0.24, // rad (about 14°): where the clean wing stalls; CL peaks at about 1.5
  CD0: 0.03, // parasite drag
  kInd: 0.04, // induced drag factor, 1 / (π e AR)
  Cm0: 0.04, // pitch moment at zero alpha and zero elevator (gives a small nose-up trim)
  Cma: -0.8, // pitch stability per radian (negative: nose-up alpha gives nose-down moment)
  Cmde: 0.3, // elevator power per radian (full stick rotates at about 4°/s and trims to about 10°)
  Cmq: -40, // pitch damping (per unit of q·c/2V)
  Clb: -0.1, // roll stability per radian of sideslip (dihedral)
  Clp: -0.5, // roll damping (per unit of p·b/2V)
  Clda: 0.05, // aileron power per radian
  Clr: 0.1, // roll due to yaw rate
  Cnb: 0.12, // weathercock stability per radian of sideslip
  Cnr: -0.2, // yaw damping (per unit of r·b/2V)
  CYb: -0.8, // side force per radian of sideslip
  Vmo: 180, // m/s indicated (about 350 kt): overspeed drag above this, like the real limit
  Vr: 72, // rotation speed, m/s (about 140 kt at operating mass)
  rolloutMu: 0.02, // rolling resistance on the runway, fraction of the normal load
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Density ratio σ = ρ/ρ0 for altitude (m). ISA troposphere up to 11 km, then an exponential fall-off. */
export function densityRatio(altM) {
  const h = Math.max(0, altM);
  if (h <= 11000) {
    const T = 288.15 - 0.0065 * h;
    return Math.pow(T / 288.15, 4.2559);
  }
  return 0.2971 * Math.exp(-(h - 11000) / 6341.6);
}

/** Air density (kg/m³) at altitude (m). */
export function airDensity(altM) {
  return 1.225 * densityRatio(altM);
}

/** Indicated airspeed (m/s) from true airspeed and altitude. */
export function indicatedSpeed(tasMs, altM) {
  return tasMs * Math.sqrt(densityRatio(altM));
}

/**
 * Engine thrust (N) for a throttle setting (0..1), altitude (m) and true airspeed (m/s).
 * Thrust falls with altitude (turbofan lapse) and a little with airspeed, so the top speed is set by drag.
 */
export function thrustAt(throttle, altM, tasMs) {
  const lapse = densityRatio(altM); // thrust follows air density, a common approximation for high-bypass engines
  const ram = Math.max(0, 1 - (tasMs / 500) ** 2);
  return clamp(throttle, 0, 1) * JET.thrustMax * lapse * ram;
}

/** Lift coefficient from angle of attack (rad). Linear up to the stall, then a smooth fall-off. */
export function liftCoef(alpha) {
  const a = alpha;
  const as = JET.alphaStall;
  if (Math.abs(a) <= as) return JET.CL0 + JET.CLa * a;
  const clMax = JET.CL0 + JET.CLa * as;
  const sign = Math.sign(a);
  const over = Math.abs(a) - as;
  return sign * clMax * Math.max(0.4, 1 - over / 0.5);
}

/** Speed of sound (m/s) from the standard atmosphere (troposphere to 11 km, then isothermal). */
export function speedOfSound(altM) {
  const T = altM <= 11000 ? 288.15 - 0.0065 * Math.max(0, altM) : 216.65;
  return Math.sqrt(1.4 * 287.05 * T);
}

/** Drag coefficient for a given lift, alpha and indicated airspeed (m/s). */
export function dragCoef(cl, alpha, ias, mach = 0) {
  let cd = JET.CD0 + JET.kInd * cl * cl;
  const over = Math.abs(alpha) - JET.alphaStall;
  if (over > 0) cd += 0.8 * Math.min(over / 0.5, 1); // separated flow adds drag
  const vo = ias - JET.Vmo;
  if (vo > 0) cd += 4 * (vo / JET.Vmo) ** 2; // overspeed
  if (mach > 0.8) cd += 40 * (mach - 0.8) ** 2; // wave drag above the drag-rise Mach number (about 0.8)
  return cd;
}

/**
 * Aerodynamic forces and moments in the aircraft frame.
 * `s` is the airflow relative to the aircraft: u forward, vUp up, vRight right (m/s), plus rates p, q, r (rad/s)
 * and altitude (m). Controls: elevator, aileron, rudder (rad).
 * Returns forces (N) along forward/up/right and moments (N·m) in pitch (nose up), roll (right wing down) and yaw.
 */
export function aeroForces(s, controls, altM) {
  const V = Math.hypot(s.u, s.vUp, s.vRight);
  const zero = { fwd: 0, up: 0, right: 0, pitch: 0, roll: 0, yaw: 0, alpha: 0, beta: 0, lift: 0, drag: 0, stalled: false, V };
  if (V < 0.5) return zero;

  const alpha = Math.atan2(-s.vUp, s.u); // nose above the flight path gives positive alpha
  const beta = Math.atan2(s.vRight, s.u);
  const qbar = 0.5 * airDensity(altM) * V * V;
  const ias = indicatedSpeed(V, altM);
  const cl = liftCoef(alpha);
  const cd = dragCoef(cl, alpha, ias, V / speedOfSound(altM));
  const L = qbar * JET.S * cl;
  const D = qbar * JET.S * cd;
  const Y = qbar * JET.S * JET.CYb * beta;

  const fwd = -D * Math.cos(alpha) + L * Math.sin(alpha);
  const up = L * Math.cos(alpha) + D * Math.sin(alpha);

  const ur = 0.5 * V; // use the same speed scale for the rate terms
  const pHat = (s.p * JET.span) / (2 * ur);
  const qHat = (s.q * JET.chord) / (2 * ur);
  const rHat = (s.r * JET.span) / (2 * ur);

  const Cm = JET.Cm0 + JET.Cma * alpha + JET.Cmde * controls.elevator + JET.Cmq * qHat;
  const Cl = JET.Clb * beta + JET.Clp * pHat + JET.Clda * controls.aileron + JET.Clr * rHat;
  const Cn = JET.Cnb * beta + JET.Cnr * rHat;

  return {
    fwd,
    up,
    right: Y,
    pitch: qbar * JET.S * JET.chord * Cm,
    roll: qbar * JET.S * JET.span * Cl,
    yaw: qbar * JET.S * JET.span * Cn,
    alpha,
    beta,
    lift: L,
    drag: D,
    stalled: Math.abs(alpha) > JET.alphaStall,
    V,
  };
}
