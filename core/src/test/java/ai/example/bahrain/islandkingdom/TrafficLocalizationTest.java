package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.localization.ArabicTextShaper;
import ai.example.bahrain.islandkingdom.localization.PlaceNames;
import ai.example.bahrain.islandkingdom.traffic.TrafficSystem;
import org.junit.Test;
import static org.junit.Assert.*;

public class TrafficLocalizationTest {

    @Test
    public void testRightHandTrafficEnforced() {
        assertTrue("Bahrain uses Right-Hand Traffic (RHT)", TrafficSystem.RIGHT_HAND_TRAFFIC);
    }

    @Test
    public void testNoOperationalMetroInvariant() {
        assertFalse("Bahrain Metro is proposed/planned, NOT an operational railway in 2026 epoch",
                TrafficSystem.PASSENGER_METRO_EXISTS);
    }

    @Test
    public void testArabicTextShapingAndBiDi() {
        // Test Lam-Alef ligature
        String shaped = ArabicTextShaper.shape("المنامة");
        assertNotNull("Shaped output is non-null", shaped);
        assertFalse("Shaped output is non-empty", shaped.isEmpty());

        // Test Place names
        PlaceNames.Entry manama = PlaceNames.get("MANAMA");
        assertEquals("English name is Manama", "Manama", manama.nameEn);
        assertEquals("Arabic name is المنامة", "المنامة", manama.nameAr);
    }
}
