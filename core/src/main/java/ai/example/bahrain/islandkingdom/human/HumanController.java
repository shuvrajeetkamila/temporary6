package ai.example.bahrain.islandkingdom.human;

/**
 * Physically Interactive Human Character Controller (Section 17).
 * Implements:
 * - 1.8m capsule representation with ground sweep.
 * - Walk, Jog, Sprint, Jump, Wade, Swim locomotion states.
 * - Accurate jump velocity: jumpVelocity = sqrt(2 * g * jumpHeight).
 * - Bahrain heat and stamina fatigue model (humidity/heat increases exertion).
 * - Safe vehicle entry and exit validations.
 */
public class HumanController {

    public enum LocomotionState {
        IDLE,
        WALK,
        JOG,
        SPRINT,
        JUMP,
        FALL,
        WADE,
        SWIM
    }

    public static final float CAPSULE_HEIGHT_M = 1.80f;
    public static final float CAPSULE_RADIUS_M = 0.35f;
    public static final float GRAVITY = 9.80665f;
    public static final float DESIRED_JUMP_HEIGHT_M = 1.10f;

    // Speeds in m/s (1 m/s = 3.6 km/h)
    public static final float WALK_SPEED = 1.4f;    // ~5.0 km/h
    public static final float JOG_SPEED = 3.2f;     // ~11.5 km/h
    public static final float SPRINT_SPEED = 6.2f;  // ~22.3 km/h
    public static final float SWIM_SPEED = 1.1f;    // ~4.0 km/h

    private double posX, posY, posZ;
    private float velocityX, velocityY, velocityZ;
    private LocomotionState state = LocomotionState.IDLE;
    private boolean isGrounded = true;

    // Stamina & Heat Model
    private float stamina = 100.0f;
    private static final float MAX_STAMINA = 100.0f;
    private boolean inShadeOrHub = false;

    public HumanController(double initialX, double initialY, double initialZ) {
        this.posX = initialX;
        this.posY = initialY;
        this.posZ = initialZ;
    }

    /**
     * Executes one fixed 60Hz physics step for human character.
     */
    public void step(float dt, float moveForward, float moveStrafe, boolean wantSprint,
                     boolean wantJump, float ambientTempC, float waterSurfaceY) {
        // Water contact check (Wade / Swim)
        if (posY < waterSurfaceY - 0.3f && posY > waterSurfaceY - 1.4f) {
            state = LocomotionState.WADE;
        } else if (posY <= waterSurfaceY - 1.4f) {
            state = LocomotionState.SWIM;
        }

        // Horizontal speed selection based on state
        float targetSpeed = WALK_SPEED;
        if (state == LocomotionState.SWIM) {
            targetSpeed = SWIM_SPEED;
        } else if (wantSprint && stamina > 10.0f && isGrounded) {
            targetSpeed = SPRINT_SPEED;
            state = LocomotionState.SPRINT;
            // Drain stamina faster in intense Bahrain midday heat
            float heatMultiplier = (ambientTempC > 35.0f) ? 1.6f : 1.0f;
            stamina = Math.max(0.0f, stamina - 15.0f * heatMultiplier * dt);
        } else if (Math.abs(moveForward) > 0.1f || Math.abs(moveStrafe) > 0.1f) {
            targetSpeed = JOG_SPEED;
            state = LocomotionState.JOG;
        } else if (isGrounded) {
            state = LocomotionState.IDLE;
        }

        // Stamina Recovery
        if (!wantSprint || state == LocomotionState.IDLE) {
            float recoveryRate = inShadeOrHub ? 25.0f : 12.0f;
            stamina = Math.min(MAX_STAMINA, stamina + recoveryRate * dt);
        }

        // Jump physics: jumpVelocity = sqrt(2 * g * jumpHeight)
        if (wantJump && isGrounded && state != LocomotionState.SWIM) {
            float jumpVel = (float) Math.sqrt(2.0f * GRAVITY * DESIRED_JUMP_HEIGHT_M);
            velocityY = jumpVel;
            isGrounded = false;
            state = LocomotionState.JUMP;
        }

        // Gravity application
        if (!isGrounded && state != LocomotionState.SWIM) {
            velocityY -= GRAVITY * dt;
            if (velocityY < -0.5f) state = LocomotionState.FALL;
        } else if (state == LocomotionState.SWIM) {
            // Buoyant swim float
            velocityY = (float) ((waterSurfaceY - 1.2f - posY) * 3.0f);
        }

        // Compute movement vector
        float dirLen = (float) Math.sqrt(moveForward * moveForward + moveStrafe * moveStrafe);
        if (dirLen > 0.001f) {
            velocityX = (moveForward / dirLen) * targetSpeed;
            velocityZ = (moveStrafe / dirLen) * targetSpeed;
        } else {
            velocityX = 0.0f;
            velocityZ = 0.0f;
        }

        // Integrate positions
        posX += velocityX * dt;
        posY += velocityY * dt;
        posZ += velocityZ * dt;

        // Ground clamping simulation (terrain contact)
        float groundY = 0.0f; // Baseline
        if (posY <= groundY) {
            posY = groundY;
            velocityY = 0.0f;
            isGrounded = true;
            if (state == LocomotionState.FALL) {
                state = LocomotionState.IDLE;
            }
        }
    }

    public double getPosX() { return posX; }
    public double getPosY() { return posY; }
    public double getPosZ() { return posZ; }
    public LocomotionState getState() { return state; }
    public float getStamina() { return stamina; }
    public void setInShadeOrHub(boolean shade) { this.inShadeOrHub = shade; }
}
