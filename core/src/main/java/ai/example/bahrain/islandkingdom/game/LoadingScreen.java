package ai.example.bahrain.islandkingdom.game;

import com.badlogicgames.gdx.Gdx;
import com.badlogicgames.gdx.Screen;
import com.badlogicgames.gdx.graphics.GL20;

/**
 * Staged Loading Screen for BAHRAIN: THE ISLAND KINGDOM.
 * Verifies all 4 governorates, 21 island manifest entries, and startup chunks
 * before transitioning to active gameplay.
 */
public class LoadingScreen implements Screen {

    private final BahrainGame game;
    private float loadProgress = 0.0f;
    private boolean verificationPassed = false;

    public LoadingScreen(BahrainGame game) {
        this.game = game;
    }

    @Override
    public void show() {
        // Execute Startup Verification
        int govCount = game.governorateManager.getGovernorates().size();
        int islandCount = game.islandRegistry.getAllIslands().size();
        int causewayCount = game.causewayManager.getCauseways().size();

        if (govCount == 4 && islandCount >= 21 && causewayCount >= 7) {
            verificationPassed = true;
        } else {
            Gdx.app.error("STARTUP", "Geodata validation failed! Govs: " + govCount + ", Islands: " + islandCount);
        }
    }

    @Override
    public void render(float delta) {
        Gdx.gl.glClearColor(0.08f, 0.08f, 0.12f, 1.0f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);

        loadProgress += delta * 1.5f;

        if (loadProgress >= 1.0f && verificationPassed) {
            game.setScreen(new GameplayScreen(game));
        }
    }

    @Override public void resize(int width, int height) {}
    @Override public void pause() {}
    @Override public void resume() {}
    @Override public void hide() {}
    @Override public void dispose() {}
}
