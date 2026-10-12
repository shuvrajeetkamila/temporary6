package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.world.GovernorateManager;
import org.junit.Test;
import java.util.List;
import static org.junit.Assert.*;

public class GovernoratesTest {

    @Test
    public void testFourCurrentGovernoratesPresent() {
        GovernorateManager manager = new GovernorateManager();
        List<GovernorateManager.Governorate> govs = manager.getGovernorates();

        assertEquals("Must contain exactly 4 sovereign governorates in modern epoch", 4, govs.size());

        assertNotNull("Capital Governorate must exist", manager.getGovernorateById("GOV-01"));
        assertNotNull("Muharraq Governorate must exist", manager.getGovernorateById("GOV-02"));
        assertNotNull("Northern Governorate must exist", manager.getGovernorateById("GOV-03"));
        assertNotNull("Southern Governorate must exist", manager.getGovernorateById("GOV-04"));
    }

    @Test
    public void testAbolishedCentralGovernorateForbidden() {
        GovernorateManager manager = new GovernorateManager();

        assertNull("Central Governorate must NOT exist as current ID", manager.getGovernorateById("CEN"));
        assertNull("Central Governorate must NOT exist as GOV-05", manager.getGovernorateById("GOV-05"));

        assertTrue("Should detect forbidden Central Governorate name",
                manager.isForbiddenCentralGovernorate("Central Governorate"));
        assertTrue("Should detect forbidden Central Governorate Arabic name",
                manager.isForbiddenCentralGovernorate("المحافظة الوسطى"));
        assertFalse("Capital is permitted", manager.isForbiddenCentralGovernorate("Capital Governorate"));
    }

    @Test
    public void testSpatialGovernorateLookup() {
        GovernorateManager manager = new GovernorateManager();

        // Manama location -> Capital Governorate
        GovernorateManager.Governorate gManama = manager.findGovernorate(26.2355, 50.5758);
        assertEquals("Manama belongs to Capital Governorate", "GOV-01", gManama.id);

        // Busaiteen/Muharraq location -> Muharraq Governorate
        GovernorateManager.Governorate gMuharraq = manager.findGovernorate(26.2650, 50.6350);
        assertEquals("Muharraq belongs to Muharraq Governorate", "GOV-02", gMuharraq.id);

        // Budaiya location -> Northern Governorate
        GovernorateManager.Governorate gBudaiya = manager.findGovernorate(26.1850, 50.4750);
        assertEquals("Budaiya belongs to Northern Governorate", "GOV-03", gBudaiya.id);

        // Hawar Islands location -> Southern Governorate
        GovernorateManager.Governorate gHawar = manager.findGovernorate(25.6600, 50.7600);
        assertEquals("Hawar belongs to Southern Governorate", "GOV-04", gHawar.id);
    }
}
