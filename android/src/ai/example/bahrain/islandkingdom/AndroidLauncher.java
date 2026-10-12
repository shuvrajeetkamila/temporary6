package ai.example.bahrain.islandkingdom;

import android.os.Bundle;
import com.badlogicgames.gdx.backends.android.AndroidApplication;
import com.badlogicgames.gdx.backends.android.AndroidApplicationConfiguration;
import ai.example.bahrain.islandkingdom.game.BahrainGame;

/**
 * Android Launcher Activity for BAHRAIN: THE ISLAND KINGDOM.
 * Configures OpenGL ES 3.0, immersive full-screen mode, and hardware acceleration.
 */
public class AndroidLauncher extends AndroidApplication {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        AndroidApplicationConfiguration config = new AndroidApplicationConfiguration();
        config.useGL30 = true;
        config.useImmersiveMode = true;
        config.useAccelerometer = false;
        config.useCompass = false;

        initialize(new BahrainGame(), config);
    }
}
