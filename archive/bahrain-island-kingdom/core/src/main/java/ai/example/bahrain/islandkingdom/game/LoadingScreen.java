package ai.example.bahrain.islandkingdom.game;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer.ShapeType;

/**
 * Staged Loading Screen for BAHRAIN: THE ISLAND KINGDOM.
 * Verifies all 4 governorates, 21 island manifest entries, and startup chunks
 * with visual progress telemetry before transitioning to active 3D gameplay.
 */
public class LoadingScreen implements Screen {

    private final BahrainGame game;
    private ShapeRenderer shapeRenderer;
    private SpriteBatch spriteBatch;
    private BitmapFont font;
    private float loadProgress = 0.0f;
    private boolean verificationPassed = false;
    private String statusMessage = "Verifying geodetic reference system (EPSG:32639)...";

    public LoadingScreen(BahrainGame game) {
        this.game = game;
    }

    @Override
    public void show() {
        shapeRenderer = new ShapeRenderer();
        spriteBatch = new SpriteBatch();
        font = new BitmapFont();
        font.getData().setScale(1.25f);

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
        loadProgress += delta * 1.8f;

        if (loadProgress < 0.35f) {
            statusMessage = "Loading 4 Sovereign Governorates & 21 Islands...";
        } else if (loadProgress < 0.70f) {
            statusMessage = "Constructing 3D Procedural Skyline & Causeways...";
        } else {
            statusMessage = "Streaming Bab Al Bahrain Waterfront Hub...";
        }

        int width = Gdx.graphics.getWidth();
        int height = Gdx.graphics.getHeight();

        // Background: Deep Royal Red (Bahrain Sovereign Banner)
        Gdx.gl.glClearColor(0.55f, 0.07f, 0.12f, 1.0f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT);

        // Render Loading Progress Bar
        shapeRenderer.begin(ShapeType.Filled);
        float barWidth = width * 0.65f;
        float barHeight = height * 0.035f;
        float barX = (width - barWidth) / 2f;
        float barY = height * 0.28f;

        // Bar frame backdrop
        shapeRenderer.setColor(0.15f, 0.02f, 0.04f, 0.9f);
        shapeRenderer.rect(barX - 4f, barY - 4f, barWidth + 8f, barHeight + 8f);

        // Gold Progress Fill
        shapeRenderer.setColor(0.95f, 0.82f, 0.25f, 1.0f);
        shapeRenderer.rect(barX, barY, barWidth * Math.min(1.0f, loadProgress), barHeight);
        shapeRenderer.end();

        // Render Title Typography
        spriteBatch.begin();
        font.setColor(Color.WHITE);
        font.draw(spriteBatch, "BAHRAIN: THE ISLAND KINGDOM", barX, height * 0.68f);

        font.setColor(0.95f, 0.85f, 0.45f, 1f);
        font.draw(spriteBatch, "مملكة البحرين  |  1:1 True-Scale Open-World Sandbox", barX, height * 0.60f);

        font.setColor(0.90f, 0.90f, 0.92f, 1f);
        font.draw(spriteBatch, statusMessage, barX, barY + barHeight + 35f);

        font.setColor(0.8f, 0.8f, 0.8f, 0.75f);
        font.draw(spriteBatch, "Offline Standalone Simulation  •  © OpenStreetMap contributors", barX, height * 0.14f);
        spriteBatch.end();

        // Transition to 3D Gameplay Screen
        if (loadProgress >= 1.0f && verificationPassed) {
            game.setScreen(new GameplayScreen(game));
        }
    }

    @Override public void resize(int width, int height) {}
    @Override public void pause() {}
    @Override public void resume() {}
    @Override public void hide() {}

    @Override
    public void dispose() {
        if (shapeRenderer != null) shapeRenderer.dispose();
        if (spriteBatch != null) spriteBatch.dispose();
        if (font != null) font.dispose();
    }
}
