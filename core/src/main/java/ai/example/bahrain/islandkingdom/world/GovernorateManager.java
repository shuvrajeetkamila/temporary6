package ai.example.bahrain.islandkingdom.world;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Manages the Four Official Current Governorates of the Kingdom of Bahrain.
 * Strictly adheres to the 2026 epoch post-2014 restructuring.
 * (The Central Governorate was abolished in September 2014 and is forbidden as a current entity).
 */
public class GovernorateManager {

    public static class Governorate {
        public final String id;
        public final String code;
        public final String nameEn;
        public final String nameAr;
        public final String seatEn;
        public final String seatAr;
        public final double centerLat;
        public final double centerLon;
        public final double minLat;
        public final double maxLat;
        public final double minLon;
        public final double maxLon;
        public final double areaKm2;

        public Governorate(String id, String code, String nameEn, String nameAr,
                           String seatEn, String seatAr, double centerLat, double centerLon,
                           double minLat, double maxLat, double minLon, double maxLon, double areaKm2) {
            this.id = id;
            this.code = code;
            this.nameEn = nameEn;
            this.nameAr = nameAr;
            this.seatEn = seatEn;
            this.seatAr = seatAr;
            this.centerLat = centerLat;
            this.centerLon = centerLon;
            this.minLat = minLat;
            this.maxLat = maxLat;
            this.minLon = minLon;
            this.maxLon = maxLon;
            this.areaKm2 = areaKm2;
        }

        public boolean containsLatLon(double lat, double lon) {
            return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
        }
    }

    private final List<Governorate> governorates = new ArrayList<>();

    public GovernorateManager() {
        // 1. Capital Governorate (محافظة العاصمة)
        governorates.add(new Governorate(
                "GOV-01", "CAP", "Capital Governorate", "محافظة العاصمة",
                "Manama", "المنامة", 26.2235, 50.5876,
                26.1850, 26.2550, 50.5100, 50.6300, 79.8
        ));

        // 2. Muharraq Governorate (محافظة المحرق)
        governorates.add(new Governorate(
                "GOV-02", "MUH", "Muharraq Governorate", "محافظة المحرق",
                "Muharraq", "المحرق", 26.2650, 50.6350,
                26.2100, 26.3400, 50.5950, 50.7200, 110.5
        ));

        // 3. Northern Governorate (المحافظة الشمالية)
        governorates.add(new Governorate(
                "GOV-03", "NOR", "Northern Governorate", "المحافظة الشمالية",
                "Saar / Budaiya", "سار / البديع", 26.1850, 50.4750,
                26.1000, 26.2450, 50.3200, 50.5400, 146.0
        ));

        // 4. Southern Governorate (المحافظة الجنوبية) - largest; includes Sakhir & Hawar
        governorates.add(new Governorate(
                "GOV-04", "SOU", "Southern Governorate", "المحافظة الجنوبية",
                "Awali / Riffa", "عوالي / الرفاع", 25.9500, 50.5600,
                25.4500, 26.1600, 50.4500, 50.9200, 443.0
        ));
    }

    public List<Governorate> getGovernorates() {
        return Collections.unmodifiableList(governorates);
    }

    public Governorate getGovernorateById(String id) {
        for (Governorate g : governorates) {
            if (g.id.equalsIgnoreCase(id) || g.code.equalsIgnoreCase(id)) {
                return g;
            }
        }
        return null;
    }

    public Governorate findGovernorate(double lat, double lon) {
        for (Governorate g : governorates) {
            if (g.containsLatLon(lat, lon)) {
                return g;
            }
        }
        // Fallback to nearest center if outside exact bounding box
        Governorate nearest = governorates.get(0);
        double minDist = Double.MAX_VALUE;
        for (Governorate g : governorates) {
            double dLat = lat - g.centerLat;
            double dLon = lon - g.centerLon;
            double dist = dLat * dLat + dLon * dLon;
            if (dist < minDist) {
                minDist = dist;
                nearest = g;
            }
        }
        return nearest;
    }

    public boolean isForbiddenCentralGovernorate(String name) {
        if (name == null) return false;
        String lower = name.toLowerCase();
        return lower.contains("central governorate") || lower.contains("المحافظة الوسطى");
    }
}
