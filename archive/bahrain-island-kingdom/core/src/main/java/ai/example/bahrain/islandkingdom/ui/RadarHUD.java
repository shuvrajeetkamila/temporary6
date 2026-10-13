package ai.example.bahrain.islandkingdom.ui;

import ai.example.bahrain.islandkingdom.render.ThermalPerformanceManager;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.g2d.BitmapFont;
import com.badlogic.gdx.graphics.g2d.SpriteBatch;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer;
import com.badlogic.gdx.graphics.glutils.ShapeRenderer.ShapeType;
import com.badlogic.gdx.math.Vector2;
import com.badlogic.gdx.utils.Disposable;

/**
 * Classic 3D Open-World HUD and Circular Minimap Radar for Bahrain.
 * Features:
 * - Circular vector radar with rotating player arrow, island coastlines, and vehicle blips.
 * - On-screen virtual joystick and touch action buttons.
 * - Bilingual district and governorate banner.
 * - Health, stamina, speedometer, and thermal ECO mode telemetry.
 * - Mandatory "© OpenStreetMap contributors" geodata attribution.
 */
public class RadarHUD implements Disposable {

    private final ShapeRenderer shapeRenderer;
    private final SpriteBatch spriteBatch;
    private final BitmapFont font;

    public RadarHUD() {
        this.shapeRenderer = new ShapeRenderer();
        this.spriteBatch = new SpriteBatch();
        this.font = new BitmapFont();
        this.font.getData().setScale(1.15f);
    }

    /**
     * Renders the complete 2D HUD overlay.
     */
    public void render(GameHUD hud, TouchController touch, ThermalPerformanceManager thermal,
                       float playerHeadingDeg, float playerLocalX, float playerLocalZ,
                       float carLocalX, float carLocalZ,
                       float boatLocalX, float boatLocalZ,
                       float heliLocalX, float heliLocalZ,
                       float currentSpeedKmh, float staminaPercent, float healthPercent,
                       boolean nearVehicle, String vehiclePromptText) {

        int screenWidth = Gdx.graphics.getWidth();
        int screenHeight = Gdx.graphics.getHeight();

        // Enable Alpha Blending for Translucent Glass HUD
        Gdx.gl.glEnable(GL20.GL_BLEND);
        Gdx.gl.glBlendFunc(GL20.GL_SRC_ALPHA, GL20.GL_ONE_MINUS_SRC_ALPHA);

        shapeRenderer.begin(ShapeType.Filled);

        // 1. GTA-Style Circular Minimap Radar (Bottom-Left)
        float radarRadius = screenHeight * 0.14f;
        float radarCenterX = radarRadius * 1.35f;
        float radarCenterY = radarRadius * 1.45f;

        // Dark translucent radar background
        shapeRenderer.setColor(0.06f, 0.08f, 0.12f, 0.75f);
        shapeRenderer.circle(radarCenterX, radarCenterY, radarRadius, 32);

        // Outer steel bezel ring
        shapeRenderer.end();
        shapeRenderer.begin(ShapeType.Line);
        shapeRenderer.setColor(0.45f, 0.55f, 0.65f, 0.9f);
        shapeRenderer.circle(radarCenterX, radarCenterY, radarRadius, 32);
        shapeRenderer.circle(radarCenterX, radarCenterY, radarRadius * 0.65f, 24);

        // Compass Cardinal Ticks (N, S, E, W)
        shapeRenderer.setColor(0.9f, 0.2f, 0.2f, 1f); // Red North indicator
        shapeRenderer.line(radarCenterX, radarCenterY + radarRadius - 8f, radarCenterX, radarCenterY + radarRadius + 4f);
        shapeRenderer.setColor(0.7f, 0.7f, 0.7f, 0.8f);
        shapeRenderer.line(radarCenterX, radarCenterY - radarRadius - 4f, radarCenterX, radarCenterY - radarRadius + 8f);
        shapeRenderer.line(radarCenterX - radarRadius - 4f, radarCenterY, radarCenterX - radarRadius + 8f, radarCenterY);
        shapeRenderer.line(radarCenterX + radarRadius - 8f, radarCenterY, radarCenterX + radarRadius + 4f, radarCenterY);

        // Bahrain Archipelago Simplified Island Polygon on Radar
        shapeRenderer.end();
        shapeRenderer.begin(ShapeType.Filled);
        shapeRenderer.setColor(0.28f, 0.38f, 0.26f, 0.85f); // Island land green

        // Relative coordinates scaled to radar
        float mapScale = radarRadius / 150f;
        shapeRenderer.rect(radarCenterX - 18f, radarCenterY - 35f, 36f, 70f); // Main island block
        shapeRenderer.rect(radarCenterX + 12f, radarCenterY + 18f, 16f, 22f); // Muharraq island block
        shapeRenderer.rect(radarCenterX + 14f, radarCenterY - 12f, 12f, 18f); // Sitra island block

        // Vehicle Blips on Radar
        float carRadarX = radarCenterX + (carLocalX - playerLocalX) * mapScale;
        float carRadarY = radarCenterY + (carLocalZ - playerLocalZ) * mapScale;
        if (Vector2.dst(radarCenterX, radarCenterY, carRadarX, carRadarY) < radarRadius - 4f) {
            shapeRenderer.setColor(0.2f, 0.9f, 0.3f, 1f); // Green for 4x4
            shapeRenderer.rect(carRadarX - 3f, carRadarY - 3f, 6f, 6f);
        }

        float boatRadarX = radarCenterX + (boatLocalX - playerLocalX) * mapScale;
        float boatRadarY = radarCenterY + (boatLocalZ - playerLocalZ) * mapScale;
        if (Vector2.dst(radarCenterX, radarCenterY, boatRadarX, boatRadarY) < radarRadius - 4f) {
            shapeRenderer.setColor(0.2f, 0.5f, 0.95f, 1f); // Blue for Boat
            shapeRenderer.rect(boatRadarX - 3f, boatRadarY - 3f, 6f, 6f);
        }

        float heliRadarX = radarCenterX + (heliLocalX - playerLocalX) * mapScale;
        float heliRadarY = radarCenterY + (heliLocalZ - playerLocalZ) * mapScale;
        if (Vector2.dst(radarCenterX, radarCenterY, heliRadarX, heliRadarY) < radarRadius - 4f) {
            shapeRenderer.setColor(0.95f, 0.85f, 0.1f, 1f); // Yellow for Heli
            shapeRenderer.rect(heliRadarX - 3f, heliRadarY - 3f, 6f, 6f);
        }

        // Rotating Player Arrow (Yellow) at Center of Radar
        shapeRenderer.setColor(1.0f, 0.95f, 0.15f, 1.0f);
        float radHdg = (float) Math.toRadians(playerHeadingDeg);
        float tipX = radarCenterX + (float) Math.sin(radHdg) * 11f;
        float tipY = radarCenterY + (float) Math.cos(radHdg) * 11f;
        float leftX = radarCenterX + (float) Math.sin(radHdg + 2.5f) * 8f;
        float leftY = radarCenterY + (float) Math.cos(radHdg + 2.5f) * 8f;
        float rightX = radarCenterX + (float) Math.sin(radHdg - 2.5f) * 8f;
        float rightY = radarCenterY + (float) Math.cos(radHdg - 2.5f) * 8f;
        shapeRenderer.triangle(tipX, tipY, leftX, leftY, rightX, rightY);

        // 2. Touch Controls (Virtual Joystick & Action Buttons)
        if (touch.joystickActive) {
            // Joystick Outer Circle
            shapeRenderer.setColor(0.8f, 0.8f, 0.8f, 0.25f);
            shapeRenderer.circle(touch.joystickCenter.x, touch.joystickCenter.y, touch.joystickRadius, 28);
            // Joystick Thumb Knob
            shapeRenderer.setColor(1f, 1f, 1f, 0.70f);
            shapeRenderer.circle(touch.joystickKnob.x, touch.joystickKnob.y, touch.joystickRadius * 0.45f, 24);
        }

        // Action Buttons on Right
        // Sprint Button (Green)
        shapeRenderer.setColor(touch.btnSprintPressed ? 0.3f : 0.18f, touch.btnSprintPressed ? 0.9f : 0.72f, 0.25f, 0.75f);
        shapeRenderer.circle(touch.btnSprintCenter.x, touch.btnSprintCenter.y, touch.btnSprintRadius, 24);

        // Jump / Handbrake Button (Blue)
        shapeRenderer.setColor(0.2f, touch.btnJumpPressed ? 0.8f : 0.5f, touch.btnJumpPressed ? 1.0f : 0.85f, 0.75f);
        shapeRenderer.circle(touch.btnJumpCenter.x, touch.btnJumpCenter.y, touch.btnJumpRadius, 24);

        // Enter / Exit Button (Amber/Gold when near vehicle)
        if (nearVehicle || hud.getMode() != GameHUD.ControlMode.ON_FOOT) {
            shapeRenderer.setColor(0.95f, 0.75f, 0.12f, 0.90f);
        } else {
            shapeRenderer.setColor(0.40f, 0.42f, 0.45f, 0.50f);
        }
        shapeRenderer.circle(touch.btnEnterCenter.x, touch.btnEnterCenter.y, touch.btnEnterRadius, 24);

        // 3. Top-Right Health & Stamina Bars
        float barWidth = screenWidth * 0.18f;
        float barHeight = screenHeight * 0.022f;
        float barX = screenWidth - barWidth - 25f;
        float barY = screenHeight - barHeight - 25f;

        // Health Bar (Green)
        shapeRenderer.setColor(0.12f, 0.14f, 0.16f, 0.8f);
        shapeRenderer.rect(barX, barY, barWidth, barHeight);
        shapeRenderer.setColor(0.2f, 0.85f, 0.3f, 0.95f);
        shapeRenderer.rect(barX, barY, barWidth * Math.max(0f, Math.min(1f, healthPercent)), barHeight);

        // Stamina Bar (Cyan / Orange when hot)
        float staminaY = barY - barHeight - 8f;
        shapeRenderer.setColor(0.12f, 0.14f, 0.16f, 0.8f);
        shapeRenderer.rect(barX, staminaY, barWidth, barHeight);
        shapeRenderer.setColor(staminaPercent > 0.3f ? 0.2f : 0.95f, 0.65f, 0.95f, 0.95f);
        shapeRenderer.rect(barX, staminaY, barWidth * Math.max(0f, Math.min(1f, staminaPercent)), barHeight);

        // Top Location Pill Backdrop
        float pillW = screenWidth * 0.42f;
        float pillH = screenHeight * 0.065f;
        float pillX = (screenWidth - pillW) / 2f;
        float pillY = screenHeight - pillH - 15f;
        shapeRenderer.setColor(0.08f, 0.10f, 0.14f, 0.85f);
        shapeRenderer.rect(pillX, pillY, pillW, pillH);

        // Floating Vehicle Enter Prompt Box
        if (nearVehicle && hud.getMode() == GameHUD.ControlMode.ON_FOOT) {
            float promptW = screenWidth * 0.38f;
            float promptH = screenHeight * 0.05f;
            shapeRenderer.setColor(0.95f, 0.75f, 0.12f, 0.85f);
            shapeRenderer.rect((screenWidth - promptW) / 2f, screenHeight * 0.35f, promptW, promptH);
        }

        shapeRenderer.end();
        Gdx.gl.glDisable(GL20.GL_BLEND);

        // 4. Render Text Labels & Typography with SpriteBatch
        spriteBatch.begin();

        // Location Banner
        font.setColor(Color.WHITE);
        String locEn = "Bab Al Bahrain, Manama";
        String locAr = "محافظة العاصمة - Capital Governorate";
        font.draw(spriteBatch, locEn, pillX + 18f, pillY + pillH - 8f);
        font.setColor(0.85f, 0.75f, 0.45f, 1f);
        font.draw(spriteBatch, locAr, pillX + 18f, pillY + pillH * 0.45f);

        // Attribution below Radar
        font.setColor(0.8f, 0.8f, 0.8f, 0.7f);
        font.draw(spriteBatch, "© OpenStreetMap contributors", radarCenterX - radarRadius, radarCenterY - radarRadius - 8f);

        // Button Labels
        font.setColor(Color.WHITE);
        font.draw(spriteBatch, hud.getMode() == GameHUD.ControlMode.ON_FOOT ? "SPRINT" : "BOOST",
                touch.btnSprintCenter.x - 24f, touch.btnSprintCenter.y + 6f);
        font.draw(spriteBatch, hud.getMode() == GameHUD.ControlMode.ON_FOOT ? "JUMP" : "BRAKE",
                touch.btnJumpCenter.x - 20f, touch.btnJumpCenter.y + 6f);
        font.draw(spriteBatch, hud.getMode() == GameHUD.ControlMode.ON_FOOT ? "ENTER" : "EXIT",
                touch.btnEnterCenter.x - 20f, touch.btnEnterCenter.y + 6f);

        // Speedometer & Mode Display (Top-Right under bars)
        font.setColor(1.0f, 0.95f, 0.2f, 1f);
        String modeName = hud.getMode().name();
        font.draw(spriteBatch, "[" + modeName + "]", barX, staminaY - 14f);

        if (hud.getMode() != GameHUD.ControlMode.ON_FOOT) {
            font.setColor(Color.WHITE);
            font.draw(spriteBatch, String.format("SPEED: %03.0f KM/H", currentSpeedKmh), barX, staminaY - 34f);
        }

        // Thermal Pacing Indicator
        font.setColor(0.7f, 0.7f, 0.7f, 0.8f);
        ThermalPerformanceManager.PerformanceProfile p = thermal.getCurrentProfile();
        font.draw(spriteBatch, String.format("%d FPS | %s", p.targetFps, p.name()), barX, staminaY - 54f);

        // Center Floating Prompt Text
        if (nearVehicle && hud.getMode() == GameHUD.ControlMode.ON_FOOT) {
            font.setColor(0.1f, 0.1f, 0.1f, 1f);
            font.draw(spriteBatch, vehiclePromptText != null ? vehiclePromptText : "TAP [ENTER] OR PRESS 'F' TO DRIVE",
                    (screenWidth - pillW) / 2f + 30f, screenHeight * 0.35f + screenHeight * 0.035f);
        }

        spriteBatch.end();
    }

    @Override
    public void dispose() {
        shapeRenderer.dispose();
        spriteBatch.dispose();
        font.dispose();
    }
}
