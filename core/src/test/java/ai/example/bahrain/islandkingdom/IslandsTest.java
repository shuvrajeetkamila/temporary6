package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.world.IslandRegistry;
import org.junit.Test;
import java.util.List;
import static org.junit.Assert.*;

public class IslandsTest {

    @Test
    public void testAll21SovereignIslandsAccountedFor() {
        IslandRegistry registry = new IslandRegistry();
        List<IslandRegistry.Island> islands = registry.getAllIslands();

        assertTrue("Must account for at least 21 sovereign islands and reclaimed polygons", islands.size() >= 21);

        // Verify key sovereign islands
        assertNotNull("Main Bahrain Island must exist", registry.getIslandById("isl_main_bahrain"));
        assertNotNull("Muharraq Island must exist", registry.getIslandById("isl_muharraq"));
        assertNotNull("Sitra Island must exist", registry.getIslandById("isl_sitra"));
        assertNotNull("Nabih Saleh must exist", registry.getIslandById("isl_nabih_saleh"));
        assertNotNull("Umm an Nasan must exist", registry.getIslandById("isl_umm_an_nasan"));
        assertNotNull("Jidda Island must exist", registry.getIslandById("isl_jidda"));
    }

    @Test
    public void testHawarArchipelagoCompleteness() {
        IslandRegistry registry = new IslandRegistry();

        assertNotNull("Hawar Main Island must exist", registry.getIslandById("isl_hawar_main"));
        assertNotNull("Suwad ash Shamaliyah must exist", registry.getIslandById("isl_suwad_shamaliyah"));
        assertNotNull("Suwad al Janubiyah must exist", registry.getIslandById("isl_suwad_janubiyah"));
        assertNotNull("Rubud al Gharbiyah must exist", registry.getIslandById("isl_rubud_gharbiyah"));
        assertNotNull("Rubud ash Sharqiyah must exist", registry.getIslandById("isl_rubud_sharqiyah"));
        assertNotNull("Muhazwarah must exist", registry.getIslandById("isl_muhazwarah"));
        assertNotNull("Ajirah must exist", registry.getIslandById("isl_ajirah"));

        IslandRegistry.Island hawar = registry.getIslandById("isl_hawar_main");
        assertEquals("Hawar is in Southern Governorate", "GOV-04", hawar.governorateId);
        assertTrue("Hawar area is substantial (~41 km2)", hawar.areaKm2 > 35.0);
    }

    @Test
    public void testModernReclaimedIslandsIncluded() {
        IslandRegistry registry = new IslandRegistry();

        assertNotNull("Amwaj Islands must exist", registry.getIslandById("isl_amwaj"));
        assertNotNull("Diyar Al Muharraq must exist", registry.getIslandById("isl_diyar"));
        assertNotNull("Dilmunia must exist", registry.getIslandById("isl_dilmunia"));
        assertNotNull("Durrat Al Bahrain must exist", registry.getIslandById("isl_durrat"));
        assertNotNull("Bahrain Bay must exist", registry.getIslandById("isl_bahrain_bay"));
        assertNotNull("Reef Island must exist", registry.getIslandById("isl_reef"));
        assertNotNull("Passport Island must exist", registry.getIslandById("isl_causeway_border"));
    }
}
