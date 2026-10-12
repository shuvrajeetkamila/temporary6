package ai.example.bahrain.islandkingdom.water;

/**
 * Gulf Water, Tides, Currents, and Multi-Point Buoyancy System.
 * Simulates the shallow, warm, hypersaline waters of the Arabian Gulf surrounding Bahrain.
 * 
 * Provides:
 * - Periodic semi-diurnal tides.
 * - Wind-driven currents aligned with shamal winds.
 * - Conservative bathymetry depth solver for gameplay.
 * - Multi-point hull buoyancy calculations.
 */
public class GulfWaterSystem {

    public enum WaterClass {
        OPEN_GULF(1028.0f, 1.2f, "Open Gulf", "مياه الخليج المفتوحة"),
        PROTECTED_BAY(1026.0f, 0.4f, "Protected Bay / Harbor", "خليج / مرفأ محمي"),
        MARINA_CANAL(1025.0f, 0.15f, "Marina / Artificial Canal", "مارينا / قناة مائية"),
        SHALLOW_TURQUOISE(1028.0f, 0.3f, "Shallow Turquoise Bank", "مياه تركوازية ضحلة"),
        MANGROVE_CHANNEL(1024.0f, 0.1f, "Mangrove Tidal Channel", "قنوات القرم المدية"),
        HAWAR_MARINE(1029.0f, 0.5f, "Hawar Marine Protected Waters", "مياه حوار المحمية");

        public final float densityKgM3;
        public final float typicalWaveHeightM;
        public final String nameEn;
        public final String nameAr;

        WaterClass(float density, float waveHt, String nameEn, String nameAr) {
            this.densityKgM3 = density;
            this.typicalWaveHeightM = waveHt;
            this.nameEn = nameEn;
            this.nameAr = nameAr;
        }
    }

    public static final float GRAVITY = 9.80665f;
    public static final float GULF_WATER_DENSITY = 1028.0f; // kg/m^3 (hypersaline)

    // Tidal parameters for Bahrain (semi-diurnal tide period ~12.42 hours)
    private static final double TIDE_OMEGA1 = (2.0 * Math.PI) / (12.42 * 3600.0);
    private static final double TIDE_AMPLITUDE1 = 0.85; // metres (typical tidal range 1.7m)

    // Current parameters (knots to m/s: 1 knot = 0.514444 m/s)
    private double currentVelocityX = 0.35; // m/s eastward component
    private double currentVelocityY = -0.45; // m/s southward component (shamal-driven)

    /**
     * Computes water surface elevation at a given world coordinate and time.
     */
    public double getWaterSurfaceHeight(double worldX, double worldY, double timeSeconds) {
        // Astronomical tidal component
        double tideHeight = TIDE_AMPLITUDE1 * Math.cos(TIDE_OMEGA1 * timeSeconds);

        // Multi-frequency Gerstner wave spectrum approximation
        double wave1 = 0.35 * Math.sin(0.05 * worldX + 0.04 * worldY - 1.2 * timeSeconds);
        double wave2 = 0.15 * Math.cos(0.08 * worldX - 0.06 * worldY - 1.8 * timeSeconds);

        return tideHeight + wave1 + wave2;
    }

    /**
     * Computes buoyant force on a submerged volume point.
     * F_buoyant = density * submergedVolume * g
     */
    public float computeBuoyantForce(float submergedVolumeM3, WaterClass waterClass) {
        float density = (waterClass != null) ? waterClass.densityKgM3 : GULF_WATER_DENSITY;
        return density * submergedVolumeM3 * GRAVITY;
    }

    /**
     * Conservative depth solver for gameplay (returns water depth in metres).
     */
    public float getEstimatedWaterDepth(double easting, double northing) {
        // Shallow banks around Tubli Bay and Sitra
        if (northing > 2895000 && northing < 2905000 && easting > 455000 && easting < 462000) {
            return 2.5f;
        }
        // Deep navigation fairways near Khalifa Port and Mina Salman
        if (easting > 465000 && northing > 2900000) {
            return 14.0f;
        }
        // General Gulf shallows around Bahrain average 5m - 12m
        return 7.5f;
    }

    public double getCurrentVelocityX() { return currentVelocityX; }
    public double getCurrentVelocityY() { return currentVelocityY; }
}
