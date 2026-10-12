package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.terrain.TerrainBiome;
import ai.example.bahrain.islandkingdom.vehicles.car.CarPhysics;
import org.junit.Test;
import static org.junit.Assert.*;

public class CarPhysicsTest {

    @Test
    public void testVehicleAccelerationAndGears() {
        CarPhysics car = new CarPhysics(0.0, 0.0, 0.0);
        assertEquals(0.0f, car.getSpeedKmh(), 0.1f);

        // Apply full throttle for 3 seconds (180 ticks at 60Hz)
        for (int i = 0; i < 180; i++) {
            car.step(1.0f / 60.0f, 1.0f, 0.0f, 0.0f, TerrainBiome.URBAN_RECLAIMED);
        }

        assertTrue("Car should accelerate up to highway speed", car.getSpeedKmh() > 40.0f);
        assertTrue("Car should shift into higher gears", car.getCurrentGear() >= 2);
    }

    @Test
    public void testLooseSandSinkageResistance() {
        CarPhysics carPaved = new CarPhysics(0.0, 0.0, 0.0);
        CarPhysics carSand = new CarPhysics(0.0, 0.0, 0.0);

        // Step both cars with identical moderate throttle
        for (int i = 0; i < 120; i++) {
            carPaved.step(1.0f / 60.0f, 0.5f, 0.0f, 0.0f, TerrainBiome.URBAN_RECLAIMED);
            carSand.step(1.0f / 60.0f, 0.5f, 0.0f, 0.0f, TerrainBiome.SAND_SHEET_DUNES);
        }

        assertTrue("Car on paved asphalt accelerates faster than on loose sand sheets",
                carPaved.getSpeedKmh() > carSand.getSpeedKmh());
    }
}
