package ai.example.bahrain.islandkingdom.world;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Registry of all 21 Sovereign Islands and Reclaimed Polygons of Bahrain.
 * Strictly guarantees coverage of Main Island, Muharraq, Sitra, Hawar archipelago,
 * and reclaimed developments as defined in BAHRAIN_ISLANDS_MANIFEST.json.
 */
public class IslandRegistry {

    public static class Island {
        public final String id;
        public final String nameEn;
        public final String nameAr;
        public final String governorateId;
        public final String category;
        public final double lat;
        public final double lon;
        public final double areaKm2;
        public final double maxElevationM;
        public final boolean hasPlayerSpawn;

        public Island(String id, String nameEn, String nameAr, String governorateId,
                      String category, double lat, double lon, double areaKm2,
                      double maxElevationM, boolean hasPlayerSpawn) {
            this.id = id;
            this.nameEn = nameEn;
            this.nameAr = nameAr;
            this.governorateId = governorateId;
            this.category = category;
            this.lat = lat;
            this.lon = lon;
            this.areaKm2 = areaKm2;
            this.maxElevationM = maxElevationM;
            this.hasPlayerSpawn = hasPlayerSpawn;
        }
    }

    private final List<Island> islands = new ArrayList<>();

    public IslandRegistry() {
        // Main Island
        islands.add(new Island("isl_main_bahrain", "Main Bahrain Island", "جزيرة البحرين", "MULTI", "MAIN_ISLAND", 26.0500, 50.5500, 591.0, 134.0, true));
        // Inhabited / Connected Islands
        islands.add(new Island("isl_muharraq", "Muharraq Island", "جزيرة المحرق", "GOV-02", "INHABITED_MAJOR", 26.2550, 50.6200, 56.0, 10.0, true));
        islands.add(new Island("isl_sitra", "Sitra Island", "جزيرة سترة", "GOV-01", "INHABITED_INDUSTRIAL", 26.1550, 50.6150, 24.5, 12.0, true));
        islands.add(new Island("isl_nabih_saleh", "Nabih Saleh Island", "جزيرة نبيه صالح", "GOV-01", "INHABITED_GARDEN", 26.1880, 50.5840, 1.3, 5.0, true));
        islands.add(new Island("isl_umm_an_nasan", "Umm an Nasan Island", "جزيرة أم النعسان", "GOV-03", "WESTERN_RESTRICTED", 26.1430, 50.4000, 20.0, 9.0, false));
        islands.add(new Island("isl_jidda", "Jidda Island", "جزيرة جدة", "GOV-03", "WESTERN_CLIFF", 26.1950, 50.4000, 0.48, 12.0, false));

        // Hawar Archipelago (All 7 sovereign polygons)
        islands.add(new Island("isl_hawar_main", "Hawar Main Island", "جزيرة حوار الرئيسية", "GOV-04", "REMOTE_ARCHIPELAGO", 25.6600, 50.7600, 41.0, 22.0, true));
        islands.add(new Island("isl_suwad_shamaliyah", "Suwad ash Shamaliyah", "جزيرة سواد الشمالية", "GOV-04", "REMOTE_ISLET", 25.6800, 50.7950, 3.2, 5.0, false));
        islands.add(new Island("isl_suwad_janubiyah", "Suwad al Janubiyah", "جزيرة سواد الجنوبية", "GOV-04", "REMOTE_ISLET", 25.6250, 50.8100, 9.8, 7.0, false));
        islands.add(new Island("isl_rubud_gharbiyah", "Rubud al Gharbiyah", "جزيرة ربض الغربية", "GOV-04", "REMOTE_ISLET", 25.7200, 50.7200, 1.7, 4.0, false));
        islands.add(new Island("isl_rubud_sharqiyah", "Rubud ash Sharqiyah", "جزيرة ربض الشرقية", "GOV-04", "REMOTE_ISLET", 25.7250, 50.7400, 0.4, 3.0, false));
        islands.add(new Island("isl_muhazwarah", "Muhazwarah Island", "جزيرة محزورة", "GOV-04", "REMOTE_ISLET", 25.6600, 50.7000, 1.2, 6.0, false));
        islands.add(new Island("isl_ajirah", "Ajirah Island", "جزيرة عغيرة", "GOV-04", "REMOTE_ISLET", 25.7400, 50.8150, 0.2, 3.0, false));

        // Reclaimed Modern Islands (2026 Epoch)
        islands.add(new Island("isl_amwaj", "Amwaj Islands", "جزر أمواج", "GOV-02", "RECLAIMED_URBAN", 26.2950, 50.6650, 4.3, 6.0, true));
        islands.add(new Island("isl_diyar", "Diyar Al Muharraq", "ديار المحرق", "GOV-02", "RECLAIMED_URBAN", 26.3150, 50.6250, 12.0, 7.0, true));
        islands.add(new Island("isl_dilmunia", "Dilmunia Island", "جزيرة دلمونيا", "GOV-02", "RECLAIMED_URBAN", 26.2750, 50.6750, 1.25, 6.0, false));
        islands.add(new Island("isl_durrat", "Durrat Al Bahrain", "درة البحرين", "GOV-04", "RECLAIMED_ATOLL", 25.8300, 50.5900, 21.0, 5.0, true));
        islands.add(new Island("isl_bahrain_bay", "Bahrain Bay", "خليج البحرين", "GOV-01", "RECLAIMED_URBAN", 26.2480, 50.5810, 0.45, 6.0, true));
        islands.add(new Island("isl_reef", "Reef Island", "جزيرة الريف", "GOV-01", "RECLAIMED_URBAN", 26.2430, 50.5630, 0.65, 5.0, false));
        islands.add(new Island("isl_causeway_border", "Passport Island (Bahrain Half)", "جزيرة الجوازات", "GOV-03", "CAUSEWAY_BORDER", 26.1830, 50.3250, 0.33, 6.0, false));
        islands.add(new Island("isl_khalifa_causeway_isle", "Prince Khalifa Causeway Island", "جزيرة جسر الشيخ خليفة", "GOV-01", "CAUSEWAY_INTERCHANGE", 26.2160, 50.6270, 0.22, 5.0, false));
    }

    public List<Island> getAllIslands() {
        return Collections.unmodifiableList(islands);
    }

    public Island getIslandById(String id) {
        for (Island isl : islands) {
            if (isl.id.equalsIgnoreCase(id)) return isl;
        }
        return null;
    }

    public Island findNearestIsland(double lat, double lon) {
        Island nearest = islands.get(0);
        double minDistSq = Double.MAX_VALUE;
        for (Island isl : islands) {
            double dLat = lat - isl.lat;
            double dLon = lon - isl.lon;
            double distSq = dLat * dLat + dLon * dLon;
            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearest = isl;
            }
        }
        return nearest;
    }
}
