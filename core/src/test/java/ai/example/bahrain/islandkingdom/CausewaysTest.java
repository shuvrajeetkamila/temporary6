package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.world.CausewayManager;
import org.junit.Test;
import java.util.List;
import static org.junit.Assert.*;

public class CausewaysTest {

    @Test
    public void testSevenPrimaryCausewaysConfigured() {
        CausewayManager manager = new CausewayManager();
        List<CausewayManager.Causeway> causeways = manager.getCauseways();

        assertEquals("Must configure 7 primary causeways and bridge links", 7, causeways.size());

        assertNotNull("King Fahd Causeway must exist", manager.getCausewayById("csw_king_fahd"));
        assertNotNull("Shaikh Isa Causeway must exist", manager.getCausewayById("csw_shaikh_isa"));
        assertNotNull("Shaikh Hamad Causeway must exist", manager.getCausewayById("csw_shaikh_hamad"));
        assertNotNull("Shaikh Khalifa Causeway must exist", manager.getCausewayById("csw_khalifa"));
        assertNotNull("Sitra Causeway must exist", manager.getCausewayById("csw_sitra"));
        assertNotNull("Durrat Bridges must exist", manager.getCausewayById("csw_durrat_bridges"));
        assertNotNull("Amwaj Causeway must exist", manager.getCausewayById("csw_amwaj"));
    }

    @Test
    public void testCausewayClearanceAndLanes() {
        CausewayManager manager = new CausewayManager();

        CausewayManager.Causeway kf = manager.getCausewayById("csw_king_fahd");
        assertTrue("King Fahd Causeway length > 10km", kf.lengthM >= 10000.0);
        assertTrue("King Fahd deck elevation > 10m", kf.deckElevationM >= 10.0);
        assertTrue("King Fahd ship clearance >= 12m", kf.maxShipClearanceM >= 12.0);

        CausewayManager.Causeway kh = manager.getCausewayById("csw_khalifa");
        assertTrue("Shaikh Khalifa Causeway has high ship clearance for port access", kh.maxShipClearanceM >= 15.0);
    }
}
