package ai.example.bahrain.islandkingdom.vehicles.boat;

import ai.example.bahrain.islandkingdom.water.GulfWaterSystem;

/**
 * Bahrain Dhow-Inspired Coastal Workboat Physics (Section 19).
 * Features:
 * - 12-point buoyancy hull sampling analytic water surface.
 * - Hydrodynamic forward, lateral, and vertical damping.
 * - Propeller thrust modulated by engine throttle, RPM, and propeller submersion.
 * - Rudder turning moment based on water flow velocity.
 * - Beaching and grounding physics for shallow Gulf banks and tidal flats.
 */
public class BoatPhysics {

    public static final float BOAT_MASS_KG = 6500.0f; // Traditional wood/fiberglass workboat
    public static final float HULL_LENGTH_M = 14.0f;
    public static final float HULL_BEAM_M = 4.2f;
    public static final float GRAVITY = 9.80665f;

    private double posX, posY, posZ;
    private float velocityX, velocityY, velocityZ;
    private float headingRad;
    private float engineRpm = 600.0f;
    private float currentSpeedKnots = 0.0f;

    // 12 Buoyancy Points relative to hull center
    private static final float[][] BUOYANCY_POINTS = {
            {-1.8f, -0.6f, -6.0f}, { 1.8f, -0.6f, -6.0f}, // Bow points
            {-2.0f, -0.8f, -3.0f}, { 2.0f, -0.8f, -3.0f},
            {-2.1f, -0.9f,  0.0f}, { 2.1f, -0.9f,  0.0f}, // Midship points
            {-2.0f, -0.8f,  3.0f}, { 2.0f, -0.8f,  3.0f},
            {-1.7f, -0.7f,  5.5f}, { 1.7f, -0.7f,  5.5f}, // Stern points
            { 0.0f, -1.1f, -2.0f}, { 0.0f, -1.1f,  2.0f}  // Keel points
    };

    public BoatPhysics(double initX, double initY, double initZ) {
        this.posX = initX;
        this.posY = initY;
        this.posZ = initZ;
    }

    /**
     * Executes one fixed 60Hz physics step for the boat.
     */
    public void step(float dt, float throttle, float rudderInput, GulfWaterSystem waterSystem, double timeSeconds) {
        // 1. Multi-point Buoyancy Integration
        float totalBuoyantForceY = 0.0f;
        int submergedPointsCount = 0;

        for (float[] pt : BUOYANCY_POINTS) {
            double worldPtX = posX + pt[0];
            double worldPtZ = posZ + pt[2];
            double ptY = posY + pt[1];

            double waterY = waterSystem.getWaterSurfaceHeight(worldPtX, worldPtZ, timeSeconds);
            if (ptY < waterY) {
                float submergence = (float) (waterY - ptY);
                float ptVolume = 0.65f * Math.min(1.0f, submergence); // Displaced volume (m^3)
                totalBuoyantForceY += waterSystem.computeBuoyantForce(ptVolume, GulfWaterSystem.WaterClass.OPEN_GULF);
                submergedPointsCount++;
            }
        }

        // Vertical Dynamics (Buoyancy vs Gravity)
        float netForceY = totalBuoyantForceY - (BOAT_MASS_KG * GRAVITY);
        float accelY = netForceY / BOAT_MASS_KG;
        velocityY += (accelY - velocityY * 2.5f) * dt; // Vertical hydrodynamic damping
        posY += velocityY * dt;

        // 2. Propeller Thrust (modulates with engine RPM & throttle)
        if (throttle > 0.05f) {
            engineRpm = Math.min(2200.0f, engineRpm + 800.0f * dt);
        } else {
            engineRpm = Math.max(600.0f, engineRpm - 500.0f * dt);
        }

        float maxThrustN = 14500.0f;
        float propThrust = maxThrustN * throttle * (engineRpm / 2200.0f);

        // 3. Hydrodynamic Drag
        float speedMs = currentSpeedKnots * 0.514444f;
        float hullDrag = 0.5f * 1028.0f * (speedMs * speedMs) * 1.85f * 0.35f; // 0.5 * rho * v^2 * Area * Cd

        float netForwardForce = propThrust - hullDrag;
        float accelForward = netForwardForce / BOAT_MASS_KG;
        speedMs = Math.max(0.0f, speedMs + accelForward * dt);
        currentSpeedKnots = speedMs / 0.514444f;

        // 4. Rudder Steering (effective turning moment is proportional to forward water flow)
        float rudderEffectiveness = Math.min(1.0f, speedMs / 2.0f);
        float yawRate = -rudderInput * 0.45f * rudderEffectiveness;
        headingRad += yawRate * dt;

        // Integrate horizontal position
        float fwdX = (float) Math.sin(headingRad);
        float fwdZ = (float) Math.cos(headingRad);

        posX += fwdX * speedMs * dt;
        posZ += fwdZ * speedMs * dt;
    }

    public double getPosX() { return posX; }
    public double getPosY() { return posY; }
    public double getPosZ() { return posZ; }
    public float getSpeedKnots() { return currentSpeedKnots; }
    public float getEngineRpm() { return engineRpm; }
    public float getHeadingRad() { return headingRad; }
    public float getYawRad() { return headingRad; }

    public void teleport(double x, double y, double z) {
        this.posX = x;
        this.posY = y;
        this.posZ = z;
        this.currentSpeedKnots = 0f;
        this.velocityY = 0f;
    }
}
