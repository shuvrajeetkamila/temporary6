package ai.example.bahrain.islandkingdom.world;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Manages Causeway and Bridge Networks across the Bahrain Archipelago.
 * Provides roadway lanes, vertical clearance for boat traffic, and pier collision geometry.
 */
public class CausewayManager {

    public static class Causeway {
        public final String id;
        public final String nameEn;
        public final String nameAr;
        public final double lengthM;
        public final double deckElevationM;
        public final double maxShipClearanceM;
        public final int lanesEachDirection;
        public final double startLat;
        public final double startLon;
        public final double endLat;
        public final double endLon;

        public Causeway(String id, String nameEn, String nameAr, double lengthM,
                        double deckElevationM, double maxShipClearanceM, int lanesEachDirection,
                        double startLat, double startLon, double endLat, double endLon) {
            this.id = id;
            this.nameEn = nameEn;
            this.nameAr = nameAr;
            this.lengthM = lengthM;
            this.deckElevationM = deckElevationM;
            this.maxShipClearanceM = maxShipClearanceM;
            this.lanesEachDirection = lanesEachDirection;
            this.startLat = startLat;
            this.startLon = startLon;
            this.endLat = endLat;
            this.endLon = endLon;
        }
    }

    private final List<Causeway> causeways = new ArrayList<>();

    public CausewayManager() {
        // King Fahd Causeway (Bahrain side up to border island)
        causeways.add(new Causeway("csw_king_fahd", "King Fahd Causeway (Bahrain Section)", "جسر الملك فهد",
                12500.0, 12.0, 15.0, 2, 26.1750, 50.4500, 26.1830, 50.3250));

        // Shaikh Isa bin Salman Causeway (Diplomatic Area to Muharraq)
        causeways.add(new Causeway("csw_shaikh_isa", "Shaikh Isa bin Salman Causeway", "جسر الشيخ عيسى بن سلمان",
                2500.0, 15.0, 12.0, 4, 26.2420, 50.5900, 26.2620, 50.6050));

        // Shaikh Hamad Causeway (Manama Old Core to Muharraq)
        causeways.add(new Causeway("csw_shaikh_hamad", "Shaikh Hamad Causeway", "جسر الشيخ حمد",
                1100.0, 8.0, 6.0, 3, 26.2360, 50.5890, 26.2420, 50.5980));

        // Shaikh Khalifa bin Salman Causeway (Juffair to Hidd)
        causeways.add(new Causeway("csw_khalifa", "Shaikh Khalifa bin Salman Causeway", "جسر الشيخ خليفة بن سلمان",
                4040.0, 24.0, 18.0, 3, 26.2050, 50.6080, 26.2250, 50.6480));

        // Sitra Causeway (Umm Al Hassam to Sitra Island)
        causeways.add(new Causeway("csw_sitra", "Sitra Causeway Bridges", "جسور جسر سترة",
                3200.0, 10.0, 8.0, 3, 26.1950, 50.5950, 26.1700, 50.6120));

        // Durrat Al Bahrain Crescent Bridges
        causeways.add(new Causeway("csw_durrat_bridges", "Durrat Al Bahrain Crescent Bridges", "جسور درة البحرين",
                2800.0, 7.0, 5.0, 2, 25.8500, 50.5800, 25.8300, 50.6000));

        // Amwaj Access Causeway
        causeways.add(new Causeway("csw_amwaj", "Amwaj Access Causeway", "جسر مدخل أمواج",
                1200.0, 6.0, 4.5, 2, 26.2800, 50.6500, 26.2900, 50.6600));
    }

    public List<Causeway> getCauseways() {
        return Collections.unmodifiableList(causeways);
    }

    public Causeway getCausewayById(String id) {
        for (Causeway c : causeways) {
            if (c.id.equalsIgnoreCase(id)) return c;
        }
        return null;
    }
}
