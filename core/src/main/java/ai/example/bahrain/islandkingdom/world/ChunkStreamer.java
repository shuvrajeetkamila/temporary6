package ai.example.bahrain.islandkingdom.world;

import java.util.*;

/**
 * Hierarchical Chunk Streaming Manager for the Bahrain Archipelago.
 * Dynamically streams terrain, roads, structures, and collision based on
 * player position, travel speed, and vehicle mode.
 * 
 * Enforces bounded memory plateaus by evicting chunks outside active rings.
 */
public class ChunkStreamer {

    public enum ChunkState {
        UNLOADED,
        QUEUED_IO,
        ACTIVE_HIGH,
        ACTIVE_MEDIUM,
        ACTIVE_LOW,
        EVICTED
    }

    public static class ChunkKey {
        public final int tileX;
        public final int tileY;
        public final int lod;

        public ChunkKey(int tileX, int tileY, int lod) {
            this.tileX = tileX;
            this.tileY = tileY;
            this.lod = lod;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof ChunkKey)) return false;
            ChunkKey other = (ChunkKey) o;
            return tileX == other.tileX && tileY == other.tileY && lod == other.lod;
        }

        @Override
        public int hashCode() {
            return 31 * (31 * tileX + tileY) + lod;
        }

        @Override
        public String toString() {
            return "Chunk[" + tileX + "," + tileY + ",LOD" + lod + "]";
        }
    }

    public static class StreamedChunk {
        public final ChunkKey key;
        public ChunkState state;
        public boolean collisionLoaded;
        public boolean visualsLoaded;
        public long lastAccessedTime;

        public StreamedChunk(ChunkKey key) {
            this.key = key;
            this.state = ChunkState.UNLOADED;
            this.collisionLoaded = false;
            this.visualsLoaded = false;
            this.lastAccessedTime = System.currentTimeMillis();
        }
    }

    public static final double TILE_SIZE_M = 256.0;
    private final Map<ChunkKey, StreamedChunk> activeChunks = new HashMap<>();
    private final Set<ChunkKey> requiredKeys = new HashSet<>();

    // Streaming radius rings (metres)
    private double highDetailRadiusM = 500.0;
    private double mediumDetailRadiusM = 1500.0;
    private double evictionRadiusM = 3000.0;

    public void setVehicleModeRadius(String mode) {
        if ("PLANE".equalsIgnoreCase(mode)) {
            highDetailRadiusM = 1000.0;
            mediumDetailRadiusM = 4000.0;
            evictionRadiusM = 8000.0;
        } else if ("HELI".equalsIgnoreCase(mode) || "CAR".equalsIgnoreCase(mode)) {
            highDetailRadiusM = 750.0;
            mediumDetailRadiusM = 2500.0;
            evictionRadiusM = 5000.0;
        } else { // ON_FOOT or BOAT
            highDetailRadiusM = 500.0;
            mediumDetailRadiusM = 1500.0;
            evictionRadiusM = 3000.0;
        }
    }

    public synchronized void update(double playerGlobalX, double playerGlobalY, double velocityX, double velocityY) {
        int centerTileX = (int) Math.floor(playerGlobalX / TILE_SIZE_M);
        int centerTileY = (int) Math.floor(playerGlobalY / TILE_SIZE_M);

        requiredKeys.clear();

        // Forward predictive bias based on velocity
        double predX = playerGlobalX + velocityX * 2.0;
        double predY = playerGlobalY + velocityY * 2.0;
        int predTileX = (int) Math.floor(predX / TILE_SIZE_M);
        int predTileY = (int) Math.floor(predY / TILE_SIZE_M);

        int highRadiusTiles = (int) Math.ceil(highDetailRadiusM / TILE_SIZE_M);
        int medRadiusTiles = (int) Math.ceil(mediumDetailRadiusM / TILE_SIZE_M);

        // Populate High-detail ring (LOD 0)
        for (int dx = -highRadiusTiles; dx <= highRadiusTiles; dx++) {
            for (int dy = -highRadiusTiles; dy <= highRadiusTiles; dy++) {
                if (dx * dx + dy * dy <= highRadiusTiles * highRadiusTiles) {
                    requiredKeys.add(new ChunkKey(centerTileX + dx, centerTileY + dy, 0));
                    requiredKeys.add(new ChunkKey(predTileX + dx, predTileY + dy, 0));
                }
            }
        }

        // Populate Medium-detail ring (LOD 1)
        for (int dx = -medRadiusTiles; dx <= medRadiusTiles; dx++) {
            for (int dy = -medRadiusTiles; dy <= medRadiusTiles; dy++) {
                if (dx * dx + dy * dy <= medRadiusTiles * medRadiusTiles) {
                    ChunkKey key0 = new ChunkKey(centerTileX + dx, centerTileY + dy, 0);
                    if (!requiredKeys.contains(key0)) {
                        requiredKeys.add(new ChunkKey(centerTileX + dx, centerTileY + dy, 1));
                    }
                }
            }
        }

        long now = System.currentTimeMillis();

        // Activate / Update Chunks
        for (ChunkKey key : requiredKeys) {
            StreamedChunk chunk = activeChunks.get(key);
            if (chunk == null) {
                chunk = new StreamedChunk(key);
                chunk.state = (key.lod == 0) ? ChunkState.ACTIVE_HIGH : ChunkState.ACTIVE_MEDIUM;
                chunk.collisionLoaded = true; // Priority: collision active immediately
                chunk.visualsLoaded = true;
                activeChunks.put(key, chunk);
            }
            chunk.lastAccessedTime = now;
        }

        // Evict expired / out-of-range chunks
        int evictRadiusTiles = (int) Math.ceil(evictionRadiusM / TILE_SIZE_M);
        int evictRadiusSq = evictRadiusTiles * evictRadiusTiles;

        Iterator<Map.Entry<ChunkKey, StreamedChunk>> it = activeChunks.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<ChunkKey, StreamedChunk> entry = it.next();
            ChunkKey k = entry.getKey();
            int dx = k.tileX - centerTileX;
            int dy = k.tileY - centerTileY;
            if (dx * dx + dy * dy > evictRadiusSq) {
                entry.getValue().state = ChunkState.EVICTED;
                it.remove();
            }
        }
    }

    public synchronized int getActiveChunkCount() {
        return activeChunks.size();
    }

    public synchronized boolean isChunkActive(int tileX, int tileY, int lod) {
        return activeChunks.containsKey(new ChunkKey(tileX, tileY, lod));
    }
}
