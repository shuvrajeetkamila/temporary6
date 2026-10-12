package ai.example.bahrain.islandkingdom.game;

import ai.example.bahrain.islandkingdom.render.ThermalPerformanceManager;
import com.badlogicgames.gdx.Gdx;
import com.badlogicgames.gdx.Screen;
import com.badlogicgames.gdx.graphics.GL20;

/**
 * Active 3D Gameplay Screen for BAHRAIN: THE ISLAND KINGDOM.
 * Manages rendering, HUD presentation, input polling, and thermal frame pacing.
 */
public class GameplayScreen implements Screen {

    private final BahrainGame game;

    public GameplayScreen(BahrainGame game) {
        this.game = game;
    }

    @Override
    public void show() {}

    @Override
    public void render(float delta) {
        // 1. Update Thermal Performance Manager
        game.thermalManager.update(delta, 0.95f);
        ThermalPerformanceManager.PerformanceProfile profile = game.thermalManager.getCurrentProfile();

        // 2. Step 60 Hz Physics Accumulator
        game.physicsEngine.update(delta);

        // 3. Clear Screen and Prepare GLES3 PBR Pipeline
        Gdx.gl.glClearColor(0.25f, 0.45f, 0.65f, 1.0f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);

        game.renderer.prepareFrame(game.weatherSystem);

        // 4. Update HUD District Info
        game.hud.setLocation("Manama", "المنامة", "Capital Governorate", "محافظة العاصمة");
    }

    @Override public void resize(int width, int height) {}
    @Override public void pause() {}
    @Override public void resume() {}
    @Override public void hide() {}
    @Override public void dispose() {}
}
