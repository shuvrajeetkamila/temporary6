package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.terrain.TerrainBiome;
import ai.example.bahrain.islandkingdom.terrain.TerrainGenerator;
import ai.example.bahrain.islandkingdom.world.MasterCRS;
import org.junit.Test;
import static org.junit.Assert.*;

public class TerrainEnvironmentTest {

    @Test
    public void testAllNineBiomesDefined() {
        assertEquals("Must define exactly 9 environment classes", 9, TerrainBiome.values().length);
    }

    @Test
    public void testJabalAdDukhanReliefDome() {
        TerrainGenerator gen = new TerrainGenerator();
        double[] jabalUtm = MasterCRS.latLonToUtm39n(MasterCRS.JABAL_AD_DUKHAN_LAT, MasterCRS.JABAL_AD_DUKHAN_LON);

        double summitElevation = gen.getElevationAtUtm(jabalUtm[0], jabalUtm[1]);
        assertEquals("Summit must reach true 134m high point", 134.0, summitElevation, 1.0);

        TerrainBiome summitBiome = gen.getBiomeAtUtm(jabalUtm[0], jabalUtm[1]);
        assertEquals("Summit biome is ROCKY_RELIEF", TerrainBiome.ROCKY_RELIEF, summitBiome);

        // Check 10 km away in desert plain
        double desertElevation = gen.getElevationAtUtm(jabalUtm[0] + 10000.0, jabalUtm[1]);
        assertTrue("Surrounding desert elevation should be low (10-25m)", desertElevation <= 30.0);
    }

    @Test
    public void testCoastalAndNorthernGardenBiomes() {
        TerrainGenerator gen = new TerrainGenerator();

        // Northern Garden Belt (Budaiya ~26.21N, 50.46E)
        double[] budaiyaUtm = MasterCRS.latLonToUtm39n(26.21, 50.46);
        TerrainBiome budaiyaBiome = gen.getBiomeAtUtm(budaiyaUtm[0], budaiyaUtm[1]);
        assertEquals("Budaiya parcel biome is NORTHERN_GARDEN_PALMS", TerrainBiome.NORTHERN_GARDEN_PALMS, budaiyaBiome);

        // Tubli Bay Mangroves (26.185N, 50.575E)
        double[] tubliUtm = MasterCRS.latLonToUtm39n(26.185, 50.575);
        TerrainBiome tubliBiome = gen.getBiomeAtUtm(tubliUtm[0], tubliUtm[1]);
        assertEquals("Tubli Bay biome is MANGROVES_WETLANDS", TerrainBiome.MANGROVES_WETLANDS, tubliBiome);
    }
}
