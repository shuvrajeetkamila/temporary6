package ai.example.bahrain.islandkingdom.world;

/**
 * Authoritative World Manifest and Startup Configuration for Bahrain.
 */
public final class WorldManifest {

    public static final String COUNTRY_CODE = "BHR";
    public static final String COUNTRY_NAME_EN = "Kingdom of Bahrain";
    public static final String COUNTRY_NAME_AR = "مملكة البحرين";
    public static final String WORLD_EPOCH = "2026-10";
    public static final String TIMEZONE = "Asia/Bahrain"; // UTC+03:00, no DST
    public static final String CURRENCY_CODE = "BHD";

    // Primary Player Spawn Hub (Manama Waterfront near Bab Al Bahrain)
    public static final double SPAWN_LAT = 26.2360;
    public static final double SPAWN_LON = 50.5770;
    public static final double SPAWN_HEADING_DEG = 45.0; // Facing northeast toward Bahrain Bay

    // Verified Checkpoint Coordinates
    public static final double MANAMA_SOUQ_LAT = 26.2340;
    public static final double MANAMA_SOUQ_LON = 50.5750;

    public static final double BAHRAIN_AIRPORT_LAT = 26.2708;
    public static final double BAHRAIN_AIRPORT_LON = 50.6336;
    public static final double BAHRAIN_AIRPORT_RUNWAY_HDG = 120.0; // Runway 12L/30R

    public static final double BAHRAIN_FORT_LAT = 26.2336;
    public static final double BAHRAIN_FORT_LON = 50.5204;

    public static final double AALI_BURIAL_MOUNDS_LAT = 26.1550;
    public static final double AALI_BURIAL_MOUNDS_LON = 50.5280;

    public static final double SAKHIR_CIRCUIT_LAT = 26.0325;
    public static final double SAKHIR_CIRCUIT_LON = 50.5106;

    public static final double TREE_OF_LIFE_LAT = 25.9944;
    public static final double TREE_OF_LIFE_LON = 50.5831;

    public static final double JABAL_AD_DUKHAN_LAT = 26.0378;
    public static final double JABAL_AD_DUKHAN_LON = 50.5511;

    public static final double HAWAR_HUB_LAT = 25.6600;
    public static final double HAWAR_HUB_LON = 50.7600;

    private WorldManifest() {}
}
