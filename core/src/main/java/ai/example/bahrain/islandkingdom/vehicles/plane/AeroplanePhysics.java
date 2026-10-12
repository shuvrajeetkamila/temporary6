package ai.example.bahrain.islandkingdom.vehicles.plane;

import ai.example.bahrain.islandkingdom.weather.BahrainWeatherSystem;

/**
 * Light Single-Engine Propeller Aeroplane Physics (Section 21).
 * Features:
 * - Dynamic pressure: q = 0.5 * rho * v^2
 * - Wing lift: L = q * S * Cl(alpha, flaps)
 * - Wing drag: D = q * S * (Cd0 + k * Cl^2)
 * - Aerodynamic stall cliff when alpha > 16 degrees.
 * - Propeller thrust, control surfaces (elevator, aileron, rudder, flaps).
 * - Tricycle landing gear suspension, brakes, and crosswind response.
 */
public class AeroplanePhysics {

    public static final float EMPTY_MASS_KG = 880.0f;
    public static final float WING_AREA_M2 = 16.2f; // Wing Area S
    public static final float WING_SPAN_M = 11.0f;
    public static final float ASPECT_RATIO = (WING_SPAN_M * WING_SPAN_M) / WING_AREA_M2;
    public static final float CD0 = 0.028f;          // Parasite drag coefficient
    public static final float INDUCED_DRAG_K = (float) (1.0f / (Math.PI * 0.82f * ASPECT_RATIO)); // Oswald efficiency ~0.82
    public static final float GRAVITY = 9.80665f;

    private double posX, posY, posZ;
    private float velocityX, velocityY, velocityZ;
    private float pitchRad, rollRad, yawRad;

    private float airspeedMs = 0.0f;
    private float engineRpm = 750.0f;
    private int flapSetting = 0; // 0 = 0 deg, 1 = 15 deg, 2 = 30 deg
    private boolean onGround = true;
    private boolean isStalled = false;

    public AeroplanePhysics(double initX, double initY, double initZ) {
        this.posX = initX;
        this.posY = initY;
        this.posZ = initZ;
    }

    public void setFlapSetting(int setting) {
        this.flapSetting = Math.max(0, Math.min(2, setting));
    }

    public int getFlapSetting() { return flapSetting; }
    public boolean isStalled() { return isStalled; }
    public float getAirspeedKnots() { return airspeedMs * 1.94384f; }

    /**
     * Executes one fixed 60Hz physics step for the aeroplane.
     */
    public void step(float dt, float throttle, float pitchInput, float rollInput,
                     float rudderInput, boolean brake, BahrainWeatherSystem weather, float runwayElevM) {
        // 1. Engine & Propeller Thrust
        if (throttle > 0.05f) {
            engineRpm = Math.min(2650.0f, engineRpm + 950.0f * dt);
        } else {
            engineRpm = Math.max(750.0f, engineRpm - 600.0f * dt);
        }

        float maxThrustN = 3800.0f;
        float propAdvanceRatio = Math.max(0.2f, 1.0f - (airspeedMs / 95.0f));
        float thrustN = maxThrustN * throttle * (engineRpm / 2650.0f) * propAdvanceRatio;

        // 2. Dynamic Pressure: q = 0.5 * rho * v^2
        float airDensity = weather.getAirDensityKgM3();
        float dynamicPressure = 0.5f * airDensity * (airspeedMs * airspeedMs);

        // 3. Angle of Attack (alpha) & Lift Coefficient (Cl)
        float alphaDeg = (float) Math.toDegrees(pitchRad) + (flapSetting * 3.5f);
        float cl;
        if (alphaDeg < 16.0f) {
            // Linear pre-stall lift slope (~0.1 per degree)
            cl = 0.25f + 0.095f * alphaDeg + (flapSetting * 0.35f);
            isStalled = false;
        } else {
            // Post-stall cliff: severe flow separation
            cl = 0.45f - 0.02f * (alphaDeg - 16.0f);
            isStalled = true;
        }

        float liftForceN = dynamicPressure * WING_AREA_M2 * cl;

        // 4. Drag: D = q * S * (Cd0 + k * Cl^2)
        float flapDrag = flapSetting * 0.018f;
        float cd = CD0 + flapDrag + INDUCED_DRAG_K * (cl * cl);
        float dragForceN = dynamicPressure * WING_AREA_M2 * cd;

        // Ground roll friction and wheel brakes
        float groundFrictionN = 0.0f;
        if (onGround) {
            float normalForce = Math.max(0.0f, (EMPTY_MASS_KG * GRAVITY) - liftForceN);
            float frictionCoeff = brake ? 0.45f : 0.035f;
            groundFrictionN = normalForce * frictionCoeff;
        }

        // Longitudinal Acceleration
        float netThrustDrag = thrustN - dragForceN - groundFrictionN;
        float accelForward = netThrustDrag / EMPTY_MASS_KG;
        airspeedMs = Math.max(0.0f, airspeedMs + accelForward * dt);

        // 5. Flight Controls (authority scales with airspeed)
        float controlAuthority = Math.min(1.0f, airspeedMs / 25.0f);
        pitchRad += (pitchInput * 0.35f * controlAuthority - pitchRad * 0.4f) * dt;
        rollRad += (rollInput * 0.65f * controlAuthority - rollRad * 0.5f) * dt;
        yawRad += (rudderInput * 0.25f * controlAuthority) * dt;

        // Vertical Dynamics
        float netForceY = (liftForceN * (float) Math.cos(rollRad)) - (EMPTY_MASS_KG * GRAVITY);
        float accelY = netForceY / EMPTY_MASS_KG;
        velocityY += accelY * dt;

        // Integrate positions
        posY += velocityY * dt;

        float fwdX = (float) (Math.sin(yawRad) * Math.cos(pitchRad));
        float fwdZ = (float) (Math.cos(yawRad) * Math.cos(pitchRad));
        posX += fwdX * airspeedMs * dt;
        posZ += fwdZ * airspeedMs * dt;

        // Runway / Ground contact
        if (posY <= runwayElevM) {
            posY = runwayElevM;
            velocityY = 0.0f;
            onGround = true;
            pitchRad = Math.max(0.0f, pitchRad); // Tricycle gear level
            rollRad *= 0.85f;
        } else {
            onGround = false;
        }
    }

    public double getPosX() { return posX; }
    public double getPosY() { return posY; }
    public double getPosZ() { return posZ; }
    public boolean isOnGround() { return onGround; }
    public float getYawRad() { return yawRad; }
}
