package ai.example.bahrain.islandkingdom;

import ai.example.bahrain.islandkingdom.world.MasterCRS;
import org.junit.Test;
import static org.junit.Assert.*;

public class GeographyTest {

    @Test
    public void testUtm39nForwardAndInverseRoundTrip() {
        // Test Bab Al Bahrain reference
        double lat = MasterCRS.BAB_AL_BAHRAIN_LAT;
        double lon = MasterCRS.BAB_AL_BAHRAIN_LON;

        double[] utm = MasterCRS.latLonToUtm39n(lat, lon);
        assertTrue("Easting should be in UTM 39N valid range ~457000", utm[0] > 450000 && utm[0] < 465000);
        assertTrue("Northing should be in UTM 39N valid range ~2902000", utm[1] > 2895000 && utm[1] < 2910000);

        double[] latlonBack = MasterCRS.utm39nToLatLon(utm[0], utm[1]);
        assertEquals("Latitude round-trip within 0.0001 deg (~10m)", lat, latlonBack[0], 0.0001);
        assertEquals("Longitude round-trip within 0.0001 deg (~10m)", lon, latlonBack[1], 0.0001);
    }

    @Test
    public void testJabalAdDukhanCoordinatesAndTrueElevation() {
        double[] utm = MasterCRS.latLonToUtm39n(MasterCRS.JABAL_AD_DUKHAN_LAT, MasterCRS.JABAL_AD_DUKHAN_LON);
        assertTrue("Jabal ad Dukhan Easting valid", utm[0] > 450000 && utm[0] < 460000);
        assertTrue("Jabal ad Dukhan Northing valid", utm[1] > 2875000 && utm[1] < 2885000);

        assertEquals("Jabal ad Dukhan true benchmark height is 134m",
                134.0, MasterCRS.JABAL_AD_DUKHAN_ELEVATION_M, 0.1);
    }

    @Test
    public void testHawarArchipelagoBounds() {
        double[] utm = MasterCRS.latLonToUtm39n(MasterCRS.HAWAR_CENTER_LAT, MasterCRS.HAWAR_CENTER_LON);
        assertTrue("Hawar Easting valid in southern quadrant", utm[0] > 470000 && utm[0] < 485000);
        assertTrue("Hawar Northing valid in southern quadrant", utm[1] > 2830000 && utm[1] < 2845000);
    }
}
