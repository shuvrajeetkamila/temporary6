package ai.example.bahrain.islandkingdom.terrain;

import ai.example.bahrain.islandkingdom.world.MasterCRS;

/**
 * Topographical and Biome Synthesizer for Bahrain.
 * Accurately models the subtle Bahrain topography:
 * - Coastal plains (0 - 5m)
 * - Riffa limestone plateau (30 - 50m)
 * - Jabal ad Dukhan limestone dome reaching true 134m high point
 * - Hawar islands topography (2 - 22m)
 * Strictly avoids inventing unrealistic mountain ranges or deep canyons.
 */
public class TerrainGenerator {

    // Jabal ad Dukhan dome center coordinates in UTM 39N
    private static final double JABAL_EASTING;
    private static final double JABAL_NORTHING;
    private static final double JABAL_RADIUS_M = 4500.0;
    private static final double JABAL_PEAK_ELEV_M = 134.0;

    static {
        double[] utm = MasterCRS.latLonToUtm39n(MasterCRS.JABAL_AD_DUKHAN_LAT, MasterCRS.JABAL_AD_DUKHAN_LON);
        JABAL_EASTING = utm[0];
        JABAL_NORTHING = utm[1];
    }

    /**
     * Computes ground elevation (m above mean sea level) at given UTM39N coordinates.
     */
    public double getElevationAtUtm(double easting, double northing) {
        double[] latlon = MasterCRS.utm39nToLatLon(easting, northing);
        double lat = latlon[0];
        double lon = latlon[1];

        // Check if point is outside the land bounds (in the open Gulf)
        if (lon < 50.35 || lon > 50.85 || lat < 25.50 || lat > 26.35) {
            return 0.0; // Sea level
        }

        // 1. Hawar Archipelago relief (25.55N to 25.75N, 50.70E to 50.85E)
        if (lat < 25.78 && lon > 50.68) {
            double dLat = lat - 25.66;
            double dLon = lon - 50.76;
            double dist = Math.sqrt(dLat * dLat + dLon * dLon);
            if (dist < 0.06) {
                return 4.0 + 18.0 * Math.exp(-dist * 40.0); // Hawar low limestone ridge up to 22m
            }
            return 1.5;
        }

        // 2. Jabal ad Dukhan Limestone Dome Relief
        double dx = easting - JABAL_EASTING;
        double dy = northing - JABAL_NORTHING;
        double distJabal = Math.sqrt(dx * dx + dy * dy);

        if (distJabal < JABAL_RADIUS_M) {
            double normDist = distJabal / JABAL_RADIUS_M;
            // Smooth bell dome rising from ~30m base plateau to 134m summit
            double domeProfile = Math.cos(normDist * Math.PI * 0.5);
            return 30.0 + (JABAL_PEAK_ELEV_M - 30.0) * (domeProfile * domeProfile);
        }

        // 3. Central Riffa Plateau (around 26.12N, 50.55E)
        if (lat >= 26.08 && lat <= 26.15 && lon >= 50.50 && lon <= 50.58) {
            return 35.0 + 10.0 * Math.sin((lat - 26.08) * 50.0);
        }

        // 4. Northern Coastal Belt & Reclaimed Land (0.5m - 4.0m)
        if (lat > 26.20) {
            return 2.5;
        }

        // 5. Southern Desert plain baseline (10m - 25m)
        if (lat < 26.05) {
            return 15.0;
        }

        return 5.0;
    }

    /**
     * Determines the data-driven Bahrain terrain biome at given UTM39N coordinates.
     */
    public TerrainBiome getBiomeAtUtm(double easting, double northing) {
        double[] latlon = MasterCRS.utm39nToLatLon(easting, northing);
        double lat = latlon[0];
        double lon = latlon[1];

        // Hawar Archipelago
        if (lat < 25.78 && lon > 50.68) {
            return TerrainBiome.HAWAR_REMOTE_ISLAND;
        }

        // Tubli Bay Mangroves & Wetlands (around 26.18N, 50.57E)
        if (lat >= 26.17 && lat <= 26.20 && lon >= 50.56 && lon <= 50.59) {
            return TerrainBiome.MANGROVES_WETLANDS;
        }

        // Jabal ad Dukhan Rocky Relief
        double dx = easting - JABAL_EASTING;
        double dy = northing - JABAL_NORTHING;
        if (Math.sqrt(dx * dx + dy * dy) < JABAL_RADIUS_M) {
            return TerrainBiome.ROCKY_RELIEF;
        }

        // Northern Garden Belt (Budaiya, Diraz, Barbar, Saar)
        if (lat >= 26.20 && lat <= 26.24 && lon >= 50.44 && lon <= 50.52) {
            return TerrainBiome.NORTHERN_GARDEN_PALMS;
        }

        // Modern Urban / Reclaimed (Manama, Seef, Bahrain Bay, Amwaj, Diyar)
        if (lat >= 26.22 && lon >= 50.53 && lon <= 50.68) {
            return TerrainBiome.URBAN_RECLAIMED;
        }

        // Southern Sand Sheets & Dunes
        if (lat < 25.95 && lon < 50.62) {
            return TerrainBiome.SAND_SHEET_DUNES;
        }

        // Coastal Sabkha (Salt flats along southern and western coasts)
        if ((lon < 50.45 && lat < 26.10) || (lon > 50.60 && lat < 26.00)) {
            return TerrainBiome.SABKHA_SALT_FLAT;
        }

        // Default interior is the classic pale limestone/gravel plain
        return TerrainBiome.LIMESTONE_GRAVEL_PLAIN;
    }
}
