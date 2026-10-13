package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.vehicles.heli.HelicopterPhysics;
import ai.example.bahrain.islandkingdom.weather.BahrainWeatherSystem;
import org.junit.Test;
import static org.junit.Assert.*;

public class HelicopterPhysicsTest {

    @Test
    public void testRotorSpoolDynamics() {
        HelicopterPhysics heli = new HelicopterPhysics(0.0, 0.0, 0.0);
        assertEquals("Initial RPM is zero", 0.0f, heli.getRotorRpm(), 0.1f);

        heli.setEngineStarted(true);
        // Spool for 4 seconds
        for (int i = 0; i < 240; i++) {
            heli.step(1.0f / 60.0f, 0.0f, 0.0f, 0.0f, 0.0f, new BahrainWeatherSystem(), 0.0f);
        }

        assertTrue("Rotor should spool up toward nominal 390 RPM", heli.getRotorRpm() > 250.0f);
    }

    @Test
    public void testCollectiveLiftAndGroundEffect() {
        HelicopterPhysics heli = new HelicopterPhysics(0.0, 0.0, 0.0);
        heli.setEngineStarted(true);
        BahrainWeatherSystem weather = new BahrainWeatherSystem();

        // Full spool
        for (int i = 0; i < 360; i++) {
            heli.step(1.0f / 60.0f, 0.0f, 0.0f, 0.0f, 0.0f, weather, 0.0f);
        }

        // Apply collective lift
        for (int i = 0; i < 180; i++) {
            heli.step(1.0f / 60.0f, 0.85f, 0.0f, 0.0f, 0.0f, weather, 0.0f);
        }

        assertTrue("Helicopter should achieve liftoff (altitude > 2m)", heli.getPosY() > 2.0);
    }
}
