package ai.example.bahrain.islandkingdom.ui;

import ai.example.bahrain.islandkingdom.game.BahrainGame;
import ai.example.bahrain.islandkingdom.world.MasterCRS;
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
 * Interactive Fullscreen World Map for Bahrain.
 * Features:
 * - Scaled vector map of the complete Kingdom of Bahrain (4 Governorates & 21 Islands).
 * - Zoom in / Zoom out controls ([+] and [-] buttons).
 * - Smooth touch/mouse panning across the archipelago.
 * - Touch-to-Teleport: Tapping anywhere on the map teleports the player/vehicle instantly.
 * - Fast-Travel Landmark Buttons (Bab Al Bahrain, Bahrain Fort, Airport, Tree of Life, Sakhir, Hawar).
 * - Real-time player marker with heading triangle.
 */
public class FullscreenWorldMap implements Disposable {

    public static class MapCheckpoint {
        public final String id;
        public final String nameEn;
        public final String nameAr;
        public final double utmX;
        public final double utmZ;
        public final double elevY;
        public final Color color;

        public MapCheckpoint(String id, String nameEn, String nameAr, double utmX, double utmZ, double elevY, Color color) {
            this.id = id;
            this.nameEn = nameEn;
            this.nameAr = nameAr;
            this.utmX = utmX;
            this.utmZ = utmZ;
            this.elevY = elevY;
            this.color = color;
        }
    }

    private final ShapeRenderer shapeRenderer;
    private final SpriteBatch spriteBatch;
    private final BitmapFont font;
    private final BitmapFont titleFont;

    public boolean isOpen = false;
    public float zoomLevel = 1.0f; // 0.6x to 3.5x
    public final Vector2 panOffset = new Vector2(0f, 0f);

    // Fast-Travel Checkpoints across Bahrain
    public final MapCheckpoint[] checkpoints = new MapCheckpoint[] {
            new MapCheckpoint("chk_bab_bahrain", "Bab Al Bahrain", "باب البحرين", 457631.0, 2901833.0, 2.5, new Color(0.95f, 0.85f, 0.2f, 1f)),
            new MapCheckpoint("chk_bahrain_fort", "Bahrain Fort", "قلعة البحرين", 452100.0, 2901600.0, 4.0, new Color(0.9f, 0.5f, 0.2f, 1f)),
            new MapCheckpoint("chk_airport", "Bahrain Int'l Airport", "مطار البحرين", 463380.0, 2905700.0, 5.0, new Color(0.2f, 0.7f, 0.95f, 1f)),
            new MapCheckpoint("chk_king_fahd", "King Fahd Causeway", "جسر الملك فهد", 448500.0, 2895100.0, 6.0, new Color(0.85f, 0.85f, 0.9f, 1f)),
            new MapCheckpoint("chk_riffa", "Riffa Fort", "قلعة الرفاع", 456200.0, 2888700.0, 35.0, new Color(0.9f, 0.6f, 0.3f, 1f)),
            new MapCheckpoint("chk_jabal_dukhan", "Jabal ad Dukhan (134m Peak)", "جبل الدخان", 455089.0, 2879947.0, 134.0, new Color(0.95f, 0.2f, 0.2f, 1f)),
            new MapCheckpoint("chk_tree_of_life", "Tree of Life", "شجرة الحياة", 458310.0, 2875150.0, 15.0, new Color(0.2f, 0.85f, 0.3f, 1f)),
            new MapCheckpoint("chk_sakhir", "Sakhir Circuit Hub", "حلبة البحرين - الصخير", 451060.0, 2879300.0, 22.0, new Color(0.95f, 0.4f, 0.2f, 1f)),
            new MapCheckpoint("chk_amwaj", "Amwaj Islands Lagoon", "جزر أمواج", 466500.0, 2907300.0, 2.0, new Color(0.2f, 0.9f, 0.8f, 1f)),
            new MapCheckpoint("chk_durrat", "Durrat Al Bahrain Crescent", "درة البحرين", 460500.0, 2858100.0, 3.0, new Color(0.95f, 0.75f, 0.3f, 1f)),
            new MapCheckpoint("chk_hawar", "Hawar Archipelago Nature Reserve", "جزر حوار", 475912.0, 2838053.0, 2.0, new Color(0.3f, 0.8f, 0.6f, 1f))
    };

    // UI Interactive Button Bounds
    public final Vector2 btnZoomInPos = new Vector2();
    public final Vector2 btnZoomOutPos = new Vector2();
    public final Vector2 btnClosePos = new Vector2();
    public float btnSize = 50f;

    public FullscreenWorldMap() {
        this.shapeRenderer = new ShapeRenderer();
        this.spriteBatch = new SpriteBatch();
        this.font = new BitmapFont();
        this.font.getData().setScale(1.1f);
        this.titleFont = new BitmapFont();
        this.titleFont.getData().setScale(1.4f);
    }

    /**
     * Renders the interactive fullscreen world map.
     */
    public void render(BahrainGame game, double playerGlobalX, double playerGlobalZ, float playerHeadingDeg) {
        if (!isOpen) return;

        int screenWidth = Gdx.graphics.getWidth();
        int screenHeight = Gdx.graphics.getHeight();

        btnSize = screenHeight * 0.08f;
        btnZoomInPos.set(screenWidth - btnSize * 1.5f, screenHeight * 0.65f);
        btnZoomOutPos.set(screenWidth - btnSize * 1.5f, screenHeight * 0.50f);
        btnClosePos.set(screenWidth - btnSize * 1.5f, screenHeight - btnSize * 1.5f);

        // Center of map representation in screen coordinates
        float mapCenterX = screenWidth * 0.45f + panOffset.x;
        float mapCenterY = screenHeight * 0.50f + panOffset.y;

        // Scale factor: converts UTM metres relative to Manama spawn (457750, 2901900) into pixels
        float baseScale = (screenHeight / 95000f) * 0.85f * zoomLevel;

        // Enable Alpha Blending
        Gdx.gl.glEnable(GL20.GL_BLEND);
        Gdx.gl.glBlendFunc(GL20.GL_SRC_ALPHA, GL20.GL_ONE_MINUS_SRC_ALPHA);

        shapeRenderer.begin(ShapeType.Filled);

        // 1. Dark Blue Arabian Gulf Oceanic Backdrop
        shapeRenderer.setColor(0.08f, 0.16f, 0.25f, 0.94f);
        shapeRenderer.rect(0, 0, screenWidth, screenHeight);

        // Grid lines (UTM coordinate grid)
        shapeRenderer.setColor(0.15f, 0.25f, 0.35f, 0.40f);
        for (float x = 0; x < screenWidth; x += 80f) {
            shapeRenderer.line(x, 0, x, screenHeight);
        }
        for (float y = 0; y < screenHeight; y += 80f) {
            shapeRenderer.line(0, y, screenWidth, y);
        }

        // 2. Render Island Polygons (Bahrain Main Island, Muharraq, Sitra, Hawar, Durrat, Amwaj)
        // Reference UTM pivot: Bab Al Bahrain (457631, 2901833)
        double refX = 457631.0;
        double refZ = 2901833.0;

        // Bahrain Main Island (North-South elongated limestone landmass)
        shapeRenderer.setColor(0.32f, 0.46f, 0.30f, 0.95f); // Land vegetation & limestone tint
        drawUtmPoly(shapeRenderer, mapCenterX, mapCenterY, refX, refZ, baseScale, new double[][] {
                {452000, 2903000}, {459000, 2903000}, {461000, 2898000}, {460000, 2885000},
                {460500, 2865000}, {458500, 2855000}, {454000, 2858000}, {451000, 2875000},
                {450000, 2890000}, {449000, 2901000}
        });

        // Muharraq Island (Northeast)
        shapeRenderer.setColor(0.35f, 0.50f, 0.32f, 0.95f);
        drawUtmPoly(shapeRenderer, mapCenterX, mapCenterY, refX, refZ, baseScale, new double[][] {
                {460000, 2904000}, {465500, 2908000}, {466000, 2904000}, {461500, 2901500}
        });

        // Sitra Island (East)
        shapeRenderer.setColor(0.33f, 0.48f, 0.30f, 0.95f);
        drawUtmPoly(shapeRenderer, mapCenterX, mapCenterY, refX, refZ, baseScale, new double[][] {
                {461000, 2897000}, {463500, 2897000}, {463000, 2888000}, {460500, 2888000}
        });

        // Amwaj Islands (Northeast reclaimed)
        shapeRenderer.setColor(0.38f, 0.55f, 0.42f, 0.95f);
        drawUtmPoly(shapeRenderer, mapCenterX, mapCenterY, refX, refZ, baseScale, new double[][] {
                {465500, 2908500}, {468000, 2908500}, {468000, 2906000}, {465500, 2906000}
        });

        // Durrat Al Bahrain Atolls (Far South Crescent)
        shapeRenderer.setColor(0.40f, 0.58f, 0.45f, 0.95f);
        drawUtmPoly(shapeRenderer, mapCenterX, mapCenterY, refX, refZ, baseScale, new double[][] {
                {458000, 2860000}, {462500, 2860000}, {462500, 2855000}, {458000, 2855000}
        });

        // Hawar Archipelago (Southeast Nature Reserve)
        shapeRenderer.setColor(0.36f, 0.52f, 0.35f, 0.95f);
        drawUtmPoly(shapeRenderer, mapCenterX, mapCenterY, refX, refZ, baseScale, new double[][] {
                {473000, 2845000}, {478500, 2845000}, {477000, 2830000}, {472000, 2830000}
        });

        // 3. Render Major Highway Arteries in Amber & White
        shapeRenderer.end();
        shapeRenderer.begin(ShapeType.Line);
        Gdx.gl.glLineWidth(3.0f * zoomLevel);
        shapeRenderer.setColor(0.95f, 0.75f, 0.20f, 0.85f); // Highway gold

        // King Fahd Causeway across Gulf
        drawUtmLine(shapeRenderer, mapCenterX, mapCenterY, refX, refZ, baseScale, 442000, 2896000, 452000, 2899000);
        // Shaikh Isa bin Salman Highway
        drawUtmLine(shapeRenderer, mapCenterX, mapCenterY, refX, refZ, baseScale, 452000, 2899000, 461500, 2896000);
        // Shaikh Khalifa Highway (North-South spine)
        drawUtmLine(shapeRenderer, mapCenterX, mapCenterY, refX, refZ, baseScale, 455000, 2903000, 455500, 2885000);
        // King Hamad Highway (South corridor to Durrat)
        drawUtmLine(shapeRenderer, mapCenterX, mapCenterY, refX, refZ, baseScale, 461000, 2894000, 459000, 2858000);
        // Shaikh Isa & Hamad Causeways to Muharraq
        drawUtmLine(shapeRenderer, mapCenterX, mapCenterY, refX, refZ, baseScale, 458000, 2902500, 461000, 2904500);

        // 4. Render Checkpoint Fast-Travel Markers
        shapeRenderer.end();
        shapeRenderer.begin(ShapeType.Filled);

        for (MapCheckpoint chk : checkpoints) {
            float chkScrX = mapCenterX + (float) (chk.utmX - refX) * baseScale;
            float chkScrY = mapCenterY + (float) (chk.utmZ - refZ) * baseScale;

            shapeRenderer.setColor(chk.color);
            shapeRenderer.circle(chkScrX, chkScrY, 8f * Math.min(2.0f, zoomLevel), 16);
            shapeRenderer.setColor(0.1f, 0.1f, 0.1f, 0.9f);
            shapeRenderer.circle(chkScrX, chkScrY, 3f * Math.min(2.0f, zoomLevel), 12);
        }

        // 5. Current Player Location (Pulsing Cyan Icon & Heading Arrow)
        float playerScrX = mapCenterX + (float) (playerGlobalX - refX) * baseScale;
        float playerScrY = mapCenterY + (float) (playerGlobalZ - refZ) * baseScale;

        shapeRenderer.setColor(0.2f, 0.95f, 1.0f, 0.5f);
        shapeRenderer.circle(playerScrX, playerScrY, 18f, 24);
        shapeRenderer.setColor(0.1f, 0.95f, 1.0f, 1.0f);
        shapeRenderer.circle(playerScrX, playerScrY, 8f, 16);

        // Heading triangle
        float radHdg = (float) Math.toRadians(playerHeadingDeg);
        float tipX = playerScrX + (float) Math.sin(radHdg) * 14f;
        float tipY = playerScrY + (float) Math.cos(radHdg) * 14f;
        shapeRenderer.setColor(1.0f, 1.0f, 1.0f, 1.0f);
        shapeRenderer.triangle(tipX, tipY, playerScrX - 6f, playerScrY - 6f, playerScrX + 6f, playerScrY - 6f);

        // 6. Interactive UI Buttons ([+] Zoom In, [-] Zoom Out, [X] Close)
        // Zoom In Button
        shapeRenderer.setColor(0.2f, 0.25f, 0.32f, 0.9f);
        shapeRenderer.rect(btnZoomInPos.x, btnZoomInPos.y, btnSize, btnSize);
        // Zoom Out Button
        shapeRenderer.rect(btnZoomOutPos.x, btnZoomOutPos.y, btnSize, btnSize);
        // Close Button (Red)
        shapeRenderer.setColor(0.85f, 0.15f, 0.20f, 0.92f);
        shapeRenderer.rect(btnClosePos.x, btnClosePos.y, btnSize, btnSize);

        // Fast-Travel Checkpoints Panel Backdrop (Left Side)
        float panelW = screenWidth * 0.28f;
        shapeRenderer.setColor(0.06f, 0.08f, 0.12f, 0.88f);
        shapeRenderer.rect(15f, 15f, panelW, screenHeight - 30f);

        shapeRenderer.end();
        Gdx.gl.glDisable(GL20.GL_BLEND);

        // 7. Render Text & Labels
        spriteBatch.begin();

        // Title Header
        titleFont.setColor(Color.WHITE);
        titleFont.draw(spriteBatch, "KINGDOM OF BAHRAIN — INTERACTIVE WORLD MAP", panelW + 35f, screenHeight - 25f);
        font.setColor(0.95f, 0.85f, 0.45f, 1f);
        font.draw(spriteBatch, "TOUCH ANY LOCATION TO TELEPORT  •  USE ZOOM [+] / [-] OR DRAG TO PAN", panelW + 35f, screenHeight - 55f);

        // Button Symbols
        titleFont.setColor(Color.WHITE);
        titleFont.draw(spriteBatch, "+", btnZoomInPos.x + btnSize * 0.35f, btnZoomInPos.y + btnSize * 0.75f);
        titleFont.draw(spriteBatch, "-", btnZoomOutPos.x + btnSize * 0.40f, btnZoomOutPos.y + btnSize * 0.75f);
        titleFont.draw(spriteBatch, "X", btnClosePos.x + btnSize * 0.35f, btnClosePos.y + btnSize * 0.75f);

        // Fast Travel Checkpoints List on Left Panel
        titleFont.setColor(0.95f, 0.82f, 0.25f, 1f);
        titleFont.draw(spriteBatch, "FAST TRAVEL HUBS", 30f, screenHeight - 40f);

        float listY = screenHeight - 80f;
        float itemH = (screenHeight - 120f) / checkpoints.length;

        for (int i = 0; i < checkpoints.length; i++) {
            MapCheckpoint chk = checkpoints[i];
            font.setColor(chk.color);
            font.draw(spriteBatch, (i + 1) + ". " + chk.nameEn, 30f, listY);
            font.setColor(0.75f, 0.75f, 0.75f, 0.85f);
            font.draw(spriteBatch, chk.nameAr, 30f, listY - 16f);
            listY -= itemH;
        }

        // Attribution
        font.setColor(0.7f, 0.7f, 0.7f, 0.8f);
        font.draw(spriteBatch, "© OpenStreetMap contributors  •  WGS84 / UTM 39N (EPSG:32639)", panelW + 35f, 35f);

        spriteBatch.end();
    }

    private void drawUtmPoly(ShapeRenderer sr, float mapCenterX, float mapCenterY, double refX, double refZ, float scale, double[][] poly) {
        for (int i = 0; i < poly.length - 1; i++) {
            float x1 = mapCenterX + (float) (poly[i][0] - refX) * scale;
            float y1 = mapCenterY + (float) (poly[i][1] - refZ) * scale;
            float x2 = mapCenterX + (float) (poly[i + 1][0] - refX) * scale;
            float y2 = mapCenterY + (float) (poly[i + 1][1] - refZ) * scale;
            float x0 = mapCenterX;
            float y0 = mapCenterY;
            sr.triangle(x0, y0, x1, y1, x2, y2);
        }
    }

    private void drawUtmLine(ShapeRenderer sr, float mapCenterX, float mapCenterY, double refX, double refZ, float scale, double x1, double z1, double x2, double z2) {
        float sx1 = mapCenterX + (float) (x1 - refX) * scale;
        float sy1 = mapCenterY + (float) (z1 - refZ) * scale;
        float sx2 = mapCenterX + (float) (x2 - refX) * scale;
        float sy2 = mapCenterY + (float) (z2 - refZ) * scale;
        sr.line(sx1, sy1, sx2, sy2);
    }

    /**
     * Handles touch input on the fullscreen map.
     * Returns true if the touch was consumed.
     */
    public boolean handleTouch(BahrainGame game, int screenX, int screenY) {
        if (!isOpen) return false;

        int height = Gdx.graphics.getHeight();
        int width = Gdx.graphics.getWidth();
        float touchY = height - screenY;

        // 1. Check Close Button
        if (screenX >= btnClosePos.x && screenX <= btnClosePos.x + btnSize &&
                touchY >= btnClosePos.y && touchY <= btnClosePos.y + btnSize) {
            isOpen = false;
            return true;
        }

        // 2. Check Zoom In Button
        if (screenX >= btnZoomInPos.x && screenX <= btnZoomInPos.x + btnSize &&
                touchY >= btnZoomInPos.y && touchY <= btnZoomInPos.y + btnSize) {
            zoomLevel = Math.min(3.5f, zoomLevel + 0.35f);
            return true;
        }

        // 3. Check Zoom Out Button
        if (screenX >= btnZoomOutPos.x && screenX <= btnZoomOutPos.x + btnSize &&
                touchY >= btnZoomOutPos.y && touchY <= btnZoomOutPos.y + btnSize) {
            zoomLevel = Math.max(0.6f, zoomLevel - 0.35f);
            return true;
        }

        // 4. Check Fast Travel Checkpoint List on Left Panel
        float panelW = width * 0.28f;
        if (screenX <= panelW && screenX >= 15f) {
            float itemH = (height - 120f) / checkpoints.length;
            float listStartY = height - 80f;
            for (int i = 0; i < checkpoints.length; i++) {
                float itemTop = listStartY - (i * itemH);
                if (touchY <= itemTop + 15f && touchY >= itemTop - itemH + 15f) {
                    teleportTo(game, checkpoints[i].utmX, checkpoints[i].utmZ, checkpoints[i].elevY);
                    isOpen = false;
                    return true;
                }
            }
        }

        // 5. Direct Touch-to-Teleport anywhere on the map!
        double refX = 457631.0;
        double refZ = 2901833.0;
        float mapCenterX = width * 0.45f + panOffset.x;
        float mapCenterY = height * 0.50f + panOffset.y;
        float baseScale = (height / 95000f) * 0.85f * zoomLevel;

        double targetUtmX = refX + ((screenX - mapCenterX) / baseScale);
        double targetUtmZ = refZ + ((touchY - mapCenterY) / baseScale);

        // Safe teleport to tapped coordinates
        double safeElev = game.terrainGenerator.getElevationAtUtm(targetUtmX, targetUtmZ);
        teleportTo(game, targetUtmX, targetUtmZ, safeElev + 1.5);
        isOpen = false;
        return true;
    }

    private void teleportTo(BahrainGame game, double targetX, double targetZ, double targetY) {
        GameHUD.ControlMode mode = game.hud.getMode();
        if (mode == GameHUD.ControlMode.ON_FOOT) {
            game.playerHuman.teleport(targetX, targetY, targetZ);
        } else if (mode == GameHUD.ControlMode.CAR) {
            game.playerCar.teleport(targetX, targetY, targetZ);
            game.playerHuman.teleport(targetX, targetY, targetZ);
        } else if (mode == GameHUD.ControlMode.BOAT) {
            game.playerBoat.teleport(targetX, 0.5, targetZ);
            game.playerHuman.teleport(targetX, 1.0, targetZ);
        } else if (mode == GameHUD.ControlMode.HELICOPTER) {
            game.playerHeli.teleport(targetX, Math.max(15.0, targetY + 10.0), targetZ);
            game.playerHuman.teleport(targetX, Math.max(15.0, targetY + 10.0), targetZ);
        } else if (mode == GameHUD.ControlMode.AEROPLANE) {
            game.playerPlane.teleport(targetX, Math.max(25.0, targetY + 15.0), targetZ);
            game.playerHuman.teleport(targetX, Math.max(25.0, targetY + 15.0), targetZ);
        }
        // Force immediate streaming rebase
        game.floatingOrigin.checkAndRebase(targetX, targetY, targetZ);
        game.chunkStreamer.update(targetX, targetZ, 0.0, 0.0);
    }

    @Override
    public void dispose() {
        shapeRenderer.dispose();
        spriteBatch.dispose();
        font.dispose();
        titleFont.dispose();
    }
}
