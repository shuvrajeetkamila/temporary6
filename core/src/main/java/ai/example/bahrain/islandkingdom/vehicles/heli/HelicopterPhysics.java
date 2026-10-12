package ai.example.bahrain.islandkingdom.vehicles.heli;

import ai.example.bahrain.islandkingdom.weather.BahrainWeatherSystem;

/**
 * Utility Helicopter Physics for Hot, Humid, and Dusty Conditions (Section 20).
 * Features:
 * - Rotor spool dynamics and reaction torque.
 * - Main rotor collective and cyclic pitch/roll forces:
 *   Thrust = Ct * airDensity * rotorArea * tipSpeed^2 * collective
 * - Anti-torque tail rotor yaw control.
 * - Ground effect and translational lift.
 * - Loose surface brownout dust generation.
 * - Skid landing contact and compliance.
 */
public class HelicopterPhysics {

    public static final float EMPTY_MASS_KG = 1650.0f;
    public static final float ROTOR_RADIUS_M = 5.4f;
    public static final float ROTOR_AREA = (float) (Math.PI * ROTOR_RADIUS_M * ROTOR_RADIUS_M);
    public static final float NOMINAL_ROTOR_RPM = 390.0f;
    public static final float GRAVITY = 9.80665f;

    private double posX, posY, posZ;
    private float velocityX, velocityY, velocityZ;
    private float pitchRad, rollRad, yawRad;

    private float rotorRpm = 0.0f;
    private boolean engineStarted = false;
    private float brownoutIntensity = 0.0f;

    public HelicopterPhysics(double initX, double initY, double initZ) {
        this.posX = initX;
        this.posY = initY;
        this.posZ = initZ;
    }

    public void setEngineStarted(boolean started) {
        this.engineStarted = started;
    }

    public boolean isEngineStarted() { return engineStarted; }

    /**
     * Executes one fixed 60Hz physics step for the helicopter.
     */
    public void step(float dt, float collectiveInput, float cyclicPitch, float cyclicRoll,
                     float pedalYaw, BahrainWeatherSystem weather, float groundElevM) {
        // 1. Rotor Spool Dynamics
        if (engineStarted) {
            rotorRpm = Math.min(NOMINAL_ROTOR_RPM, rotorRpm + 65.0f * dt);
        } else {
            rotorRpm = Math.max(0.0f, rotorRpm - 45.0f * dt);
        }

        float rpmRatio = rotorRpm / NOMINAL_ROTOR_RPM;
        float airDensity = weather.getAirDensityKgM3();
        float tipSpeed = (float) ((rotorRpm * 2.0f * Math.PI / 60.0f) * ROTOR_RADIUS_M);

        // 2. Main Rotor Thrust: T = Ct * rho * A * (tipSpeed)^2 * collective
        float ct = 0.0055f;
        float baseThrustN = ct * airDensity * ROTOR_AREA * (tipSpeed * tipSpeed) * Math.max(0.0f, collectiveInput);

        // 3. Ground Effect: thrust boost when rotor altitude h < 1.5 * Rotor Radius
        float aglHeight = (float) Math.max(0.1, posY - groundElevM);
        float groundEffectFactor = 1.0f;
        if (aglHeight < 1.5f * ROTOR_RADIUS_M) {
            float ratio = aglHeight / (2.0f * ROTOR_RADIUS_M);
            groundEffectFactor = 1.0f + 0.22f * (1.0f - ratio);
        }
        float totalThrustN = baseThrustN * groundEffectFactor * rpmRatio;

        // 4. Translational Lift: forward speed increases rotor efficiency
        float horizSpeed = (float) Math.sqrt(velocityX * velocityX + velocityZ * velocityZ);
        if (horizSpeed > 6.0f) {
            totalThrustN *= 1.10f;
        }

        // Brownout dust calculation over loose surfaces
        if (aglHeight < 15.0f && totalThrustN > 5000.0f) {
            brownoutIntensity = Math.min(1.0f, (15.0f - aglHeight) / 15.0f * (totalThrustN / 18000.0f));
        } else {
            brownoutIntensity = Math.max(0.0f, brownoutIntensity - 1.5f * dt);
        }

        // 5. Cyclic Tilt & Angular Accelerations
        pitchRad += (cyclicPitch * 0.45f - pitchRad * 1.5f) * dt;
        rollRad += (cyclicRoll * 0.45f - rollRad * 1.5f) * dt;
        yawRad += pedalYaw * 0.85f * rpmRatio * dt;

        // Thrust vector components in world space
        float thrustY = totalThrustN * (float) (Math.cos(pitchRad) * Math.cos(rollRad));
        float thrustX = totalThrustN * (float) (Math.sin(yawRad) * Math.sin(pitchRad) + Math.cos(yawRad) * Math.sin(rollRad));
        float thrustZ = totalThrustN * (float) (Math.cos(yawRad) * Math.sin(pitchRad) - Math.sin(yawRad) * Math.sin(rollRad));

        // Net Vertical Force
        float netForceY = thrustY - (EMPTY_MASS_KG * GRAVITY);
        float accelY = netForceY / EMPTY_MASS_KG;
        velocityY += accelY * dt;

        // Drag damping
        velocityX += (thrustX / EMPTY_MASS_KG - velocityX * 0.05f) * dt;
        velocityZ += (thrustZ / EMPTY_MASS_KG - velocityZ * 0.05f) * dt;

        // Position integration
        posX += velocityX * dt;
        posY += velocityY * dt;
        posZ += velocityZ * dt;

        // Skid landing compliance on ground
        if (posY <= groundElevM) {
            posY = groundElevM;
            if (velocityY < -4.0f) {
                // Hard landing contact damage threshold
            }
            velocityY = 0.0f;
            velocityX *= 0.60f;
            velocityZ *= 0.60f;
            pitchRad *= 0.70f;
            rollRad *= 0.70f;
        }
    }

    public double getPosX() { return posX; }
    public double getPosY() { return posY; }
    public double getPosZ() { return posZ; }
    public float getRotorRpm() { return rotorRpm; }
    public float getBrownoutIntensity() { return brownoutIntensity; }
    public float getYawRad() { return yawRad; }
}
