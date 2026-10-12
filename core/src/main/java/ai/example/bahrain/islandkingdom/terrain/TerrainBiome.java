package ai.example.bahrain.islandkingdom.terrain;

/**
 * The Nine Distinct Environment and Terrain Classes of Bahrain (Section 8).
 * Ensures physical properties (friction, sinkage, dust) match data-driven regional classes.
 */
public enum TerrainBiome {
    LIMESTONE_GRAVEL_PLAIN(
            "Limestone & Gravel Plain", "سهل جيري وحصوي",
            0.85f, 0.020f, 0.01f, 0.70f, 0.68f, 0.60f
    ),
    ROCKY_RELIEF(
            "Central/Southern Rocky Relief (Jabal ad Dukhan)", "مرتفعات صخرية (جبل الدخان)",
            0.90f, 0.025f, 0.00f, 0.62f, 0.58f, 0.52f
    ),
    SAND_SHEET_DUNES(
            "Southern Sand Sheets & Dunes", "كثبان وفرش رملية جنوبية",
            0.55f, 0.080f, 0.12f, 0.88f, 0.78f, 0.55f
    ),
    SABKHA_SALT_FLAT(
            "Sabkha (Coastal & Inland Salt Flat)", "سبخة ملحية ساحلية وداخلية",
            0.60f, 0.040f, 0.04f, 0.92f, 0.92f, 0.88f
    ),
    NORTHERN_GARDEN_PALMS(
            "Northern Palm Groves & Agricultural Parcels", "بساتين النخيل والمزارع الشمالية",
            0.80f, 0.030f, 0.02f, 0.45f, 0.55f, 0.35f
    ),
    URBAN_RECLAIMED(
            "Urban Engineered Pads & Asphalt", "مناطق حضرية وردم هندسي",
            0.95f, 0.015f, 0.00f, 0.25f, 0.25f, 0.28f
    ),
    COASTAL_TIDAL_MUDFLAT(
            "Coastal Tidal Mudflats", "مسطحات طينية مدية ساحلية",
            0.45f, 0.090f, 0.08f, 0.40f, 0.42f, 0.40f
    ),
    MANGROVES_WETLANDS(
            "Tubli Bay & Ras Sanad Mangroves", "أشجار القرم بخليج توبلي ورأس سند",
            0.40f, 0.100f, 0.05f, 0.25f, 0.40f, 0.25f
    ),
    HAWAR_REMOTE_ISLAND(
            "Hawar Protected Limestone & Shallows", "بيئة حوار المحمية والمياه الضحلة",
            0.75f, 0.035f, 0.03f, 0.75f, 0.72f, 0.65f
    );

    public final String nameEn;
    public final String nameAr;
    public final float frictionCoefficient;
    public final float rollingResistance;
    public final float looseSinkageDepthM;
    public final float dustRed;
    public final float dustGreen;
    public final float dustBlue;

    TerrainBiome(String nameEn, String nameAr, float friction, float rolling, float sinkage,
                 float dR, float dG, float dB) {
        this.nameEn = nameEn;
        this.nameAr = nameAr;
        this.frictionCoefficient = friction;
        this.rollingResistance = rolling;
        this.looseSinkageDepthM = sinkage;
        this.dustRed = dR;
        this.dustGreen = dG;
        this.dustBlue = dB;
    }
}
