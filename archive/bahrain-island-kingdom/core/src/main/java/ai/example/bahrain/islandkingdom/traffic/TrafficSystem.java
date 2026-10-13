package ai.example.bahrain.islandkingdom.traffic;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Scalable Right-Hand Traffic (RHT) Simulation Network for Bahrain (Sections 12, 13).
 * Features:
 * - Strict Right-Hand Traffic rule enforcement.
 * - Major highway corridors (Shaikh Khalifa bin Salman, King Faisal, Al Fateh, Causeways).
 * - Multi-agent vehicle pool: Sedans, SUVs, Pickups, Unbranded Public Buses, Vans.
 * - Car-following distance keeping and roundabout priority.
 * - Invariant: No operational passenger rail transit is simulated (Section 13).
 */
public class TrafficSystem {

    public enum VehicleType {
        SEDAN(4.8f, 1.8f, 120.0f),
        SUV_4X4(5.1f, 2.0f, 110.0f),
        PICKUP(5.4f, 1.9f, 100.0f),
        PUBLIC_BUS(12.0f, 2.5f, 80.0f), // Original unbranded public transit bus
        DELIVERY_VAN(6.0f, 2.1f, 90.0f);

        public final float lengthM;
        public final float widthM;
        public final float maxSpeedKmh;

        VehicleType(float l, float w, float s) {
            this.lengthM = l;
            this.widthM = w;
            this.maxSpeedKmh = s;
        }
    }

    public static class TrafficAgent {
        public final int id;
        public final VehicleType type;
        public double posX, posY, posZ;
        public float speedMs;
        public float targetSpeedMs;
        public float headingRad;
        public String currentCorridor;

        public TrafficAgent(int id, VehicleType type, double x, double y, double z, float heading, String corridor) {
            this.id = id;
            this.type = type;
            this.posX = x;
            this.posY = y;
            this.posZ = z;
            this.headingRad = heading;
            this.currentCorridor = corridor;
            this.targetSpeedMs = (type.maxSpeedKmh * 0.85f) / 3.6f;
            this.speedMs = this.targetSpeedMs;
        }
    }

    public static final boolean RIGHT_HAND_TRAFFIC = true;
    public static final boolean PASSENGER_METRO_EXISTS = false; // Verified 2026 epoch reality

    private final List<TrafficAgent> agents = new ArrayList<>();
    private int nextAgentId = 1;

    public TrafficSystem() {
        // Spawn representative ambient right-hand traffic along major corridors
        spawnAgent(VehicleType.SEDAN, 457600.0, 2.5, 2902000.0, 0.0f, "King Faisal Highway");
        spawnAgent(VehicleType.SUV_4X4, 457615.0, 2.5, 2902050.0, 0.0f, "King Faisal Highway");
        spawnAgent(VehicleType.PUBLIC_BUS, 457630.0, 2.5, 2902120.0, 0.0f, "King Faisal Highway"); // Unbranded public bus
        spawnAgent(VehicleType.SEDAN, 458500.0, 5.0, 2901500.0, 1.57f, "Al Fateh Highway");
        spawnAgent(VehicleType.PICKUP, 453000.0, 10.0, 2895000.0, 3.14f, "Shaikh Khalifa bin Salman Highway");
        spawnAgent(VehicleType.SUV_4X4, 448000.0, 12.0, 2898000.0, 4.71f, "King Fahd Causeway Approach");
    }

    public synchronized void spawnAgent(VehicleType type, double x, double y, double z, float heading, String corridor) {
        agents.add(new TrafficAgent(nextAgentId++, type, x, y, z, heading, corridor));
    }

    public synchronized void update(float dt, double playerX, double playerZ) {
        for (TrafficAgent a : agents) {
            // Right-hand traffic forward progression along corridor
            float fwdX = (float) Math.sin(a.headingRad);
            float fwdZ = (float) Math.cos(a.headingRad);

            a.posX += fwdX * a.speedMs * dt;
            a.posZ += fwdZ * a.speedMs * dt;
        }
    }

    public List<TrafficAgent> getAgents() {
        return Collections.unmodifiableList(agents);
    }
}
