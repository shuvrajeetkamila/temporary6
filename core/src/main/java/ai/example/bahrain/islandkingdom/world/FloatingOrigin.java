package ai.example.bahrain.islandkingdom.world;

import java.util.ArrayList;
import java.util.List;

/**
 * Floating Origin Manager for the Bahrain Archipelago.
 * Spanning ~60km East-West and ~95km North-South, 32-bit single-precision floats
 * suffer jitter without a floating origin.
 * 
 * Global positions are authoritative in double precision.
 * Local render and physics coordinates are float offsets relative to the origin pivot.
 */
public class FloatingOrigin {

    public interface OriginShiftListener {
        void onOriginShift(double shiftX, double shiftY, double shiftZ);
    }

    private double originGlobalX;
    private double originGlobalY;
    private double originGlobalZ;

    private static final double REBASE_THRESHOLD_M = 500.0;
    private final List<OriginShiftListener> listeners = new ArrayList<>();

    public FloatingOrigin(double initialGlobalX, double initialGlobalY, double initialGlobalZ) {
        this.originGlobalX = initialGlobalX;
        this.originGlobalY = initialGlobalY;
        this.originGlobalZ = initialGlobalZ;
    }

    public synchronized void addListener(OriginShiftListener listener) {
        if (!listeners.contains(listener)) {
            listeners.add(listener);
        }
    }

    public synchronized void removeListener(OriginShiftListener listener) {
        listeners.remove(listener);
    }

    /**
     * Checks if camera/player global coordinates have drifted beyond threshold.
     * If so, rebases the local float origin to prevent coordinate precision degradation.
     */
    public synchronized boolean checkAndRebase(double cameraGlobalX, double cameraGlobalY, double cameraGlobalZ) {
        double dx = cameraGlobalX - originGlobalX;
        double dy = cameraGlobalY - originGlobalY;
        double dz = cameraGlobalZ - originGlobalZ;
        double distSq = dx * dx + dy * dy + dz * dz;

        if (distSq > REBASE_THRESHOLD_M * REBASE_THRESHOLD_M) {
            double shiftX = dx;
            double shiftY = dy;
            double shiftZ = dz;

            originGlobalX = cameraGlobalX;
            originGlobalY = cameraGlobalY;
            originGlobalZ = cameraGlobalZ;

            for (OriginShiftListener listener : listeners) {
                listener.onOriginShift(shiftX, shiftY, shiftZ);
            }
            return true;
        }
        return false;
    }

    public float toLocalX(double globalX) {
        return (float) (globalX - originGlobalX);
    }

    public float toLocalY(double globalY) {
        return (float) (globalY - originGlobalY);
    }

    public float toLocalZ(double globalZ) {
        return (float) (globalZ - originGlobalZ);
    }

    public double toGlobalX(float localX) {
        return originGlobalX + localX;
    }

    public double toGlobalY(float localY) {
        return originGlobalY + localY;
    }

    public double toGlobalZ(float localZ) {
        return originGlobalZ + localZ;
    }

    public double getOriginGlobalX() { return originGlobalX; }
    public double getOriginGlobalY() { return originGlobalY; }
    public double getOriginGlobalZ() { return originGlobalZ; }
}
