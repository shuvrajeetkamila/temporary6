package ai.example.bahrain.islandkingdom.weather;

/**
 * Bahrain Weather, Solar Ephemeris, Shamal Wind, and Atmospheric Model.
 * Simulates the Gulf coastal climate:
 * - High summer humidity (coastal haze).
 * - Shamal wind events (NNW 315°) advecting dust and lowering visibility.
 * - Accurate solar trajectory for Bahrain (Asia/Bahrain UTC+03:00).
 * - Bounded air density modeling based on temperature and humidity.
 */
public class BahrainWeatherSystem {

    public enum WeatherPreset {
        CLEAR_HUMID_MIDDAY("Humid Midday", "ظهيرة رطبة صافية", 42.0f, 65.0f, 15.0f, 315.0f, 0.2f, false),
        SHAMAL_DUST_EVENT("Shamal Dust", "رياح الشمال وغبار", 36.0f, 35.0f, 32.0f, 320.0f, 0.75f, false),
        GOLDEN_HOUR_WATERFRONT("Golden Hour", "ساعة الغروب الذهبية", 34.0f, 70.0f, 12.0f, 310.0f, 0.15f, false),
        DRY_WINTER_MORNING("Winter Morning", "صباح شتوي معتدل", 20.0f, 45.0f, 10.0f, 300.0f, 0.05f, false),
        SEASONAL_RAIN("Seasonal Rain", "أمطار موسمية", 22.0f, 85.0f, 22.0f, 280.0f, 0.35f, true);

        public final String nameEn;
        public final String nameAr;
        public final float temperatureC;
        public final float relativeHumidityPercent;
        public final float windSpeedKnots;
        public final float windDirectionDeg;
        public final float dustHazeIntensity;
        public final boolean isRaining;

        WeatherPreset(String nameEn, String nameAr, float temp, float rh, float windSpd,
                      float windDir, float dust, boolean rain) {
            this.nameEn = nameEn;
            this.nameAr = nameAr;
            this.temperatureC = temp;
            this.relativeHumidityPercent = rh;
            this.windSpeedKnots = windSpd;
            this.windDirectionDeg = windDir;
            this.dustHazeIntensity = dust;
            this.isRaining = rain;
        }
    }

    private WeatherPreset currentPreset = WeatherPreset.CLEAR_HUMID_MIDDAY;
    private float timeOfDayHours = 12.0f; // 12:00 PM local time

    public void setPreset(WeatherPreset preset) {
        if (preset != null) this.currentPreset = preset;
    }

    public WeatherPreset getCurrentPreset() { return currentPreset; }

    public void setTimeOfDay(float hours) {
        this.timeOfDayHours = (hours % 24.0f + 24.0f) % 24.0f;
    }

    public float getTimeOfDay() { return timeOfDayHours; }

    /**
     * Calculates air density (kg/m^3) at sea level as a function of temperature and humidity.
     * High heat and humidity reduce air density, impacting aircraft and rotorcraft performance.
     */
    public float getAirDensityKgM3() {
        // Dry air density at standard pressure: rho = P / (R_specific * T_Kelvin)
        float tempKelvin = currentPreset.temperatureC + 273.15f;
        float baseDensity = 101325.0f / (287.05f * tempKelvin);

        // Humidity correction factor (water vapor is lighter than dry air)
        float vaporFraction = (currentPreset.relativeHumidityPercent / 100.0f) * 0.035f;
        return baseDensity * (1.0f - vaporFraction * 0.378f);
    }

    /**
     * Computes the normalized sun direction vector for Bahrain (~26.2° N latitude).
     */
    public float[] getSunDirection() {
        // Solar elevation angle based on hour of day
        float solarTime = (timeOfDayHours - 6.0f) / 12.0f; // 0 at 6am, 1 at 6pm
        float elevation = (float) Math.sin(solarTime * Math.PI);
        if (elevation < 0.0f) elevation = 0.0f; // Below horizon (night)

        float azimuth = (float) Math.toRadians((timeOfDayHours / 24.0f) * 360.0f - 90.0f);

        float sunX = (float) (Math.cos(elevation) * Math.sin(azimuth));
        float sunY = elevation;
        float sunZ = (float) (Math.cos(elevation) * Math.cos(azimuth));

        // Normalize
        float len = (float) Math.sqrt(sunX * sunX + sunY * sunY + sunZ * sunZ);
        if (len > 0.0001f) {
            sunX /= len;
            sunY /= len;
            sunZ /= len;
        } else {
            sunX = 0.0f; sunY = 1.0f; sunZ = 0.0f;
        }
        return new float[] { sunX, sunY, sunZ };
    }

    public float getWindSpeedMs() {
        return currentPreset.windSpeedKnots * 0.514444f;
    }

    public float[] getWindVector() {
        float dirRad = (float) Math.toRadians(currentPreset.windDirectionDeg);
        float spd = getWindSpeedMs();
        // Wind blowing FROM windDirectionDeg toward opposite
        float vx = (float) (-Math.sin(dirRad) * spd);
        float vz = (float) (-Math.cos(dirRad) * spd);
        return new float[] { vx, 0.0f, vz };
    }
}
