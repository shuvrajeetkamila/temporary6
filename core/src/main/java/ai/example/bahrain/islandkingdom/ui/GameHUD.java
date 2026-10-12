package ai.example.bahrain.islandkingdom.ui;

import ai.example.bahrain.islandkingdom.localization.ArabicTextShaper;
import ai.example.bahrain.islandkingdom.render.ThermalPerformanceManager;

/**
 * User Interface and Virtual Controls HUD (Section 26).
 * Features:
 * - Dynamic vehicle mode control schemes (Foot, Car, Boat, Helicopter, Aeroplane).
 * - Bilingual district/island banner (Arabic RTL & English).
 * - Vector minimap overlay showing the Bahrain archipelago with visible OSM attribution.
 * - Telemetry instrument cluster (speedometer, altimeter, rotor RPM, flaps).
 * - Performance & Thermal status indicator (Balanced / ECO).
 */
public class GameHUD {

    public enum ControlMode {
        ON_FOOT,
        CAR,
        BOAT,
        HELICOPTER,
        AEROPLANE
    }

    private ControlMode mode = ControlMode.ON_FOOT;
    private String currentDistrictEn = "Manama";
    private String currentDistrictAr = "المنامة";
    private String currentGovernorateEn = "Capital Governorate";
    private String currentGovernorateAr = "محافظة العاصمة";

    // Virtual control inputs (-1.0 to +1.0)
    public float inputMoveX = 0.0f;
    public float inputMoveY = 0.0f;
    public float inputCameraX = 0.0f;
    public float inputCameraY = 0.0f;
    public boolean inputAction1 = false; // Sprint / Throttle
    public boolean inputAction2 = false; // Jump / Brake
    public boolean inputInteract = false; // Enter/Exit vehicle

    public void setLocation(String districtEn, String districtAr, String govEn, String govAr) {
        this.currentDistrictEn = districtEn;
        this.currentDistrictAr = districtAr;
        this.currentGovernorateEn = govEn;
        this.currentGovernorateAr = govAr;
    }

    public void setMode(ControlMode newMode) {
        if (newMode != null) this.mode = newMode;
    }

    public ControlMode getMode() { return mode; }

    public String getBilingualLocationString() {
        String arShaped = ArabicTextShaper.shape(currentDistrictAr + " - " + currentGovernorateAr);
        return arShaped + "  |  " + currentDistrictEn + " - " + currentGovernorateEn;
    }

    public String getOsmAttribution() {
        return "© OpenStreetMap contributors";
    }

    public String getThermalStatusText(ThermalPerformanceManager thermal) {
        ThermalPerformanceManager.PerformanceProfile p = thermal.getCurrentProfile();
        return String.format("FPS: %d | MODE: %s | TEMP: %.1f°C",
                p.targetFps, p.name(), thermal.getDeviceTemperatureEstimateC());
    }
}
