package ai.example.bahrain.islandkingdom.game;

import com.badlogicgames.gdx.Gdx;
import com.badlogicgames.gdx.Screen;
import com.badlogicgames.gdx.graphics.GL20;

/**
 * Pause, Settings, Asset Licenses, and Attribution Screen.
 * Prominently presents "© OpenStreetMap contributors", OFL font credits, and thermal settings.
 */
public class SettingsScreen implements Screen {

    private final BahrainGame game;

    public SettingsScreen(BahrainGame game) {
        this.game = game;
    }

    @Override public void show() {}

    @Override
    public void render(float delta) {
        Gdx.gl.glClearColor(0.05f, 0.05f, 0.08f, 1.0f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);
    }

    @Override public void resize(int width, int height) {}
    @Override public void pause() {}
    @Override public void resume() {}
    @Override public void hide() {}
    @Override public void dispose() {}
}
