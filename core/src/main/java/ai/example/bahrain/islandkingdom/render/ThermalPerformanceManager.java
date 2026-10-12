package ai.example.bahrain.islandkingdom.render;

/**
 * Thermal and Frame Pacing Manager for Mobile Devices (Sections 14, 27).
 * Strictly controls mobile device thermals to prevent overheating and battery depletion:
 * - Balanced profile: 30 FPS target (33.3 ms).
 * - Moderate Thermal ECO profile: 20 FPS target (50.0 ms).
 * - Severe Thermal ECO profile: 15 FPS target (66.7 ms).
 * 
 * ECO mode reduces shadow passes, draw distances, and decorative particle counts
 * while keeping the underlying physics simulation at a stable 60 Hz.
 */
public class ThermalPerformanceManager {

    public enum PerformanceProfile {
        BALANCED(30, 33.3f, 1.0f, true, 200, 3000.0f),
        THERMAL_ECO_MODERATE(20, 50.0f, 0.85f, true, 120, 1800.0f),
        THERMAL_ECO_SEVERE(15, 66.7f, 0.70f, false, 80, 1000.0f);

        public final int targetFps;
        public final float targetFrameTimeMs;
        public final float dynamicResolutionScale;
        public final boolean shadowsEnabled;
        public final int maxDrawCalls;
        public final float maxDrawDistanceM;

        PerformanceProfile(int fps, float frameTime, float resScale, boolean shadows, int maxDraw, float dist) {
            this.targetFps = fps;
            this.targetFrameTimeMs = frameTime;
            this.dynamicResolutionScale = resScale;
            this.shadowsEnabled = shadows;
            this.maxDrawCalls = maxDraw;
            this.maxDrawDistanceM = dist;
        }
    }

    private PerformanceProfile currentProfile = PerformanceProfile.BALANCED;
    private float deviceTemperatureEstimateC = 37.0f; // Baseline battery/SoC temp

    public void update(float frameDeltaTime, float batteryLevel) {
        // Simple thermal simulation if Android hardware thermal API is unavailable
        if (currentProfile == PerformanceProfile.BALANCED) {
            deviceTemperatureEstimateC += (0.015f * frameDeltaTime); // Slow temperature climb under 30 FPS load
        } else {
            deviceTemperatureEstimateC = Math.max(35.0f, deviceTemperatureEstimateC - (0.025f * frameDeltaTime)); // Thermal dissipation
        }

        // Automatic Thermal Throttling Transitions
        if (deviceTemperatureEstimateC > 46.0f) {
            currentProfile = PerformanceProfile.THERMAL_ECO_SEVERE;
        } else if (deviceTemperatureEstimateC > 42.0f) {
            currentProfile = PerformanceProfile.THERMAL_ECO_MODERATE;
        } else if (deviceTemperatureEstimateC < 39.0f) {
            currentProfile = PerformanceProfile.BALANCED;
        }
    }

    public void forceProfile(PerformanceProfile profile) {
        if (profile != null) this.currentProfile = profile;
    }

    public PerformanceProfile getCurrentProfile() { return currentProfile; }
    public float getDeviceTemperatureEstimateC() { return deviceTemperatureEstimateC; }
}
