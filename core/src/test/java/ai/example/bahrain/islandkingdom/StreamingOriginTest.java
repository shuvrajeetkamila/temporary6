package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.world.ChunkStreamer;
import ai.example.bahrain.islandkingdom.world.FloatingOrigin;
import org.junit.Test;
import static org.junit.Assert.*;

public class StreamingOriginTest {

    @Test
    public void testFloatingOriginRebaseThreshold() {
        FloatingOrigin origin = new FloatingOrigin(450000.0, 0.0, 2900000.0);

        // Move camera 300m (under 500m threshold) -> no rebase
        boolean rebasedSmall = origin.checkAndRebase(450300.0, 0.0, 2900000.0);
        assertFalse("Small move should not trigger origin rebase", rebasedSmall);

        // Move camera 800m (over 500m threshold) -> rebase triggered
        boolean rebasedLarge = origin.checkAndRebase(450800.0, 0.0, 2900000.0);
        assertTrue("Large move should trigger origin rebase", rebasedLarge);
        assertEquals("Origin X updated", 450800.0, origin.getOriginGlobalX(), 0.01);

        // Local coordinates should be ~0 right after rebase
        assertEquals("Local X at camera origin should be 0", 0.0f, origin.toLocalX(450800.0), 0.01f);
    }

    @Test
    public void testChunkStreamingActivationAndEviction() {
        ChunkStreamer streamer = new ChunkStreamer();
        streamer.setVehicleModeRadius("ON_FOOT");

        // Player at Manama center
        streamer.update(457000.0, 2902000.0, 0.0, 0.0);
        int initialActive = streamer.getActiveChunkCount();
        assertTrue("Should have active chunks loaded around player", initialActive > 10);

        // Player moves 10 km south toward Awali
        streamer.update(457000.0, 2892000.0, 0.0, -20.0);
        int afterMove = streamer.getActiveChunkCount();
        assertTrue("Memory plateau preserved: active chunk count bounded", afterMove < 250);
    }
}
