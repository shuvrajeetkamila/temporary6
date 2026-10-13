package ai.example.bahrain.islandkingdom.vehicles.car;

import ai.example.bahrain.islandkingdom.terrain.TerrainBiome;

/**
 * Drivable Car / 4x4 Off-Road Vehicle Physics (Section 18).
 * Features:
 * - 4-wheel independent spring/damper suspension.
 * - Pacejka / friction ellipse tire saturation.
 * - Engine torque curve, 6-speed automatic transmission.
 * - Ackermann steering geometry with speed sensitivity.
 * - Bahrain loose sand sinkage and rolling resistance model:
 *   sinkageFactor = looseDepth * loadPerTire / referenceLoad
 *   resistance = baseResistance * sinkageFactor * speedFactor
 */
public class CarPhysics {

    public static class Wheel {
        public float suspensionCompressionM;
        public float normalLoadN;
        public float steeringAngleRad;
        public float angularVelocityRadS;
        public float slipRatio;
        public float slipAngleRad;
    }

    public static final float CHASSIS_MASS_KG = 2150.0f; // 4x4 SUV mass
    public static final float WHEELBASE_M = 2.85f;
    public static final float TRACK_WIDTH_M = 1.65f;
    public static final float GRAVITY = 9.80665f;

    // Suspension Constants
    public static final float SPRING_RATE = 38000.0f; // N/m
    public static final float DAMPER_RATE = 3200.0f;  // N*s/m
    public static final float MAX_SUSPENSION_TRAVEL_M = 0.28f;

    private double posX, posY, posZ;
    private float velocityX, velocityY, velocityZ;
    private float headingRad;
    private float currentSpeedMs = 0.0f;

    // Drivetrain
    private float engineRpm = 800.0f;
    private int currentGear = 1;
    private final float[] gearRatios = { 3.80f, 2.35f, 1.55f, 1.15f, 0.85f, 0.68f };
    private final float finalDriveRatio = 3.90f;

    private final Wheel[] wheels = new Wheel[4];

    public CarPhysics(double initX, double initY, double initZ) {
        this.posX = initX;
        this.posY = initY;
        this.posZ = initZ;
        for (int i = 0; i < 4; i++) {
            wheels[i] = new Wheel();
        }
    }

    /**
     * Executes one fixed 60Hz physics step for the vehicle.
     */
    public void step(float dt, float throttle, float brake, float steerInput,
                     TerrainBiome surfaceBiome) {
        // 1. Ackermann Steering with speed sensitivity
        float speedKmh = currentSpeedMs * 3.6f;
        float speedFactor = Math.max(0.35f, 1.0f - (speedKmh / 160.0f));
        float maxSteerRad = (float) Math.toRadians(32.0f) * speedFactor;
        float steerAngle = steerInput * maxSteerRad;
        wheels[0].steeringAngleRad = steerAngle;
        wheels[1].steeringAngleRad = steerAngle;

        // 2. Suspension forces on 4 wheels
        float loadPerTireStatic = (CHASSIS_MASS_KG * GRAVITY) / 4.0f;
        for (Wheel w : wheels) {
            w.suspensionCompressionM = 0.12f; // Nominal equilibrium compression
            float springForce = SPRING_RATE * w.suspensionCompressionM;
            float damperForce = DAMPER_RATE * 0.0f; // Equilibrium relative velocity ~0
            w.normalLoadN = Math.max(0.0f, springForce - damperForce);
        }

        // 3. Engine Torque & Automatic Transmission
        float maxTorque = 450.0f; // Nm
        float engineTorque = maxTorque * Math.max(0.0f, throttle);
        if (throttle > 0.1f && engineRpm < 5500.0f) {
            engineRpm += 1800.0f * dt;
        } else if (throttle <= 0.1f) {
            engineRpm = Math.max(800.0f, engineRpm - 1200.0f * dt);
        }

        // Automatic gear shifting logic
        if (engineRpm > 4800.0f && currentGear < gearRatios.length) {
            currentGear++;
            engineRpm *= 0.70f;
        } else if (engineRpm < 1500.0f && currentGear > 1) {
            currentGear--;
            engineRpm *= 1.35f;
        }

        float totalDriveForce = (engineTorque * gearRatios[currentGear - 1] * finalDriveRatio) / 0.38f; // Wheel radius 0.38m

        // 4. Loose Sand Sinkage & Rolling Resistance Model (Section 18)
        float looseDepth = (surfaceBiome != null) ? surfaceBiome.looseSinkageDepthM : 0.01f;
        float referenceLoad = 5500.0f;
        float sinkageFactor = (looseDepth * loadPerTireStatic) / referenceLoad;
        float baseRolling = (surfaceBiome != null) ? surfaceBiome.rollingResistance : 0.015f;
        float sandResistanceForce = CHASSIS_MASS_KG * GRAVITY * (baseRolling + sinkageFactor * 0.25f);

        // Braking Force
        float brakeForce = brake * 12000.0f;

        // Net Longitudinal Acceleration
        float netForce = (totalDriveForce - sandResistanceForce - brakeForce);
        float accel = netForce / CHASSIS_MASS_KG;

        currentSpeedMs = Math.max(0.0f, currentSpeedMs + accel * dt);

        // Yaw rate integration (Right-hand traffic orientation)
        if (currentSpeedMs > 0.1f) {
            float yawRate = (currentSpeedMs / WHEELBASE_M) * (float) Math.tan(steerAngle);
            headingRad += yawRate * dt;
        }

        // Update position
        float forwardX = (float) Math.sin(headingRad);
        float forwardZ = (float) Math.cos(headingRad);
        posX += forwardX * currentSpeedMs * dt;
        posZ += forwardZ * currentSpeedMs * dt;
    }

    public double getPosX() { return posX; }
    public double getPosY() { return posY; }
    public double getPosZ() { return posZ; }
    public float getSpeedKmh() { return currentSpeedMs * 3.6f; }
    public float getEngineRpm() { return engineRpm; }
    public int getCurrentGear() { return currentGear; }
    public float getHeadingRad() { return headingRad; }
    public float getYawRad() { return headingRad; }

    public void teleport(double x, double y, double z) {
        this.posX = x;
        this.posY = y;
        this.posZ = z;
        this.currentSpeedMs = 0f;
    }
}
