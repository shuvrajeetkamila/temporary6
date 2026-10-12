package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.physics.PhysicsEngine;
import ai.example.bahrain.islandkingdom.render.ThermalPerformanceManager;
import org.junit.Test;
import static org.junit.Assert.*;

public class ThermalPerformanceTest {

    @Test
    public void testThermalProfilesPacing() {
        ThermalPerformanceManager manager = new ThermalPerformanceManager();

        manager.forceProfile(ThermalPerformanceManager.PerformanceProfile.BALANCED);
        assertEquals("Balanced target is 30 FPS", 30, manager.getCurrentProfile().targetFps);

        manager.forceProfile(ThermalPerformanceManager.PerformanceProfile.THERMAL_ECO_MODERATE);
        assertEquals("Moderate ECO target is 20 FPS", 20, manager.getCurrentProfile().targetFps);

        manager.forceProfile(ThermalPerformanceManager.PerformanceProfile.THERMAL_ECO_SEVERE);
        assertEquals("Severe ECO target is 15 FPS", 15, manager.getCurrentProfile().targetFps);
    }

    @Test
    public void testPhysicsDecoupledFromRenderFrameRate() {
        PhysicsEngine engine = new PhysicsEngine();

        final int[] tickCount = {0};
        engine.setStepListener(dt -> {
            tickCount[0]++;
        });

        // Simulate 1.0 second of time at 15 FPS (render frame time ~66.7ms)
        for (int i = 0; i < 15; i++) {
            engine.update(1.0f / 15.0f);
        }

        // Even at 15 FPS render rate, the 60 Hz physics should execute 60 ticks
        assertEquals("Physics should tick 60 times in 1 second regardless of 15 FPS render rate",
                60, tickCount[0]);
    }
}
