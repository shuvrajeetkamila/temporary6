package ai.example.bahrain.islandkingdom.physics;

/**
 * 60 Hz Fixed Timestep Physics Simulation Engine (Section 16).
 * Enforces decoupled simulation at 60 Hz regardless of render frame rate (30, 20, or 15 FPS).
 * Computes interpolation alpha for rendering to prevent visual stutter.
 */
public class PhysicsEngine {

    public static final float FIXED_DT = 1.0f / 60.0f; // 60 Hz fixed simulation step
    public static final float MAX_FRAME_DT = 0.10f;     // Prevents spiral of death
    public static final int MAX_SUBSTEPS = 4;

    private float accumulator = 0.0f;
    private float interpolationAlpha = 0.0f;
    private long totalFixedTicks = 0;

    public interface StepListener {
        void onPhysicsStep(float dt);
    }

    private StepListener stepListener;

    public void setStepListener(StepListener listener) {
        this.stepListener = listener;
    }

    /**
     * Steps the simulation with frame delta time.
     * Ticks fixed substeps and updates interpolation alpha.
     */
    public void update(float frameDelta) {
        float frameDt = Math.min(frameDelta, MAX_FRAME_DT);
        accumulator += frameDt;

        int substeps = 0;
        while (accumulator >= FIXED_DT && substeps < MAX_SUBSTEPS) {
            if (stepListener != null) {
                stepListener.onPhysicsStep(FIXED_DT);
            }
            accumulator -= FIXED_DT;
            substeps++;
            totalFixedTicks++;
        }

        interpolationAlpha = accumulator / FIXED_DT;
    }

    public float getInterpolationAlpha() { return interpolationAlpha; }
    public long getTotalFixedTicks() { return totalFixedTicks; }
}
