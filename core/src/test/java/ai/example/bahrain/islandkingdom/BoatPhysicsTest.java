package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.vehicles.boat.BoatPhysics;
import ai.example.bahrain.islandkingdom.water.GulfWaterSystem;
import org.junit.Test;
import static org.junit.Assert.*;

public class BoatPhysicsTest {

    @Test
    public void testMultiPointBuoyancyEquilibrium() {
        BoatPhysics boat = new BoatPhysics(0.0, -0.5, 0.0);
        GulfWaterSystem water = new GulfWaterSystem();

        // Simulate 2 seconds of settling in calm water
        for (int i = 0; i < 120; i++) {
            boat.step(1.0f / 60.0f, 0.0f, 0.0f, water, 0.0);
        }

        assertTrue("Boat should float with positive equilibrium Y near waterline", boat.getPosY() > -1.5 && boat.getPosY() < 1.0);
    }

    @Test
    public void testPropellerThrustAndHydrodynamicDrag() {
        BoatPhysics boat = new BoatPhysics(0.0, 0.0, 0.0);
        GulfWaterSystem water = new GulfWaterSystem();

        // Apply full forward throttle for 3 seconds
        for (int i = 0; i < 180; i++) {
            boat.step(1.0f / 60.0f, 1.0f, 0.0f, water, 0.0);
        }

        assertTrue("Boat should accelerate to cruising speed (> 6 knots)", boat.getSpeedKnots() > 6.0f);
        assertTrue("Boat engine RPM should ramp up", boat.getEngineRpm() > 1500.0f);
    }
}
