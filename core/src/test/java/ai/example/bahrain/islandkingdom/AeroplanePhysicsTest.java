package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.vehicles.plane.AeroplanePhysics;
import ai.example.bahrain.islandkingdom.weather.BahrainWeatherSystem;
import org.junit.Test;
import static org.junit.Assert.*;

public class AeroplanePhysicsTest {

    @Test
    public void testAerodynamicTakeoffRoll() {
        AeroplanePhysics plane = new AeroplanePhysics(0.0, 0.0, 0.0);
        BahrainWeatherSystem weather = new BahrainWeatherSystem();

        // Ground roll with full throttle for 6 seconds
        for (int i = 0; i < 360; i++) {
            plane.step(1.0f / 60.0f, 1.0f, 0.0f, 0.0f, 0.0f, false, weather, 0.0f);
        }

        assertTrue("Takeoff roll generates significant airspeed (> 50 knots)", plane.getAirspeedKnots() > 50.0f);

        // Rotate elevator back
        for (int i = 0; i < 120; i++) {
            plane.step(1.0f / 60.0f, 1.0f, -0.6f, 0.0f, 0.0f, false, weather, 0.0f);
        }

        assertFalse("Aircraft takes off from runway into flight", plane.isOnGround());
        assertTrue("Altitude increases above runway surface", plane.getPosY() > 1.0);
    }

    @Test
    public void testStallCondition() {
        AeroplanePhysics plane = new AeroplanePhysics(0.0, 500.0, 0.0); // In flight at 500m
        BahrainWeatherSystem weather = new BahrainWeatherSystem();

        // Cut throttle and pull extreme pitch (stall)
        for (int i = 0; i < 300; i++) {
            plane.step(1.0f / 60.0f, 0.0f, -1.0f, 0.0f, 0.0f, false, weather, 0.0f);
        }

        assertTrue("Aircraft detects aerodynamic stall condition", plane.isStalled());
    }
}
