package ai.example.bahrain.islandkingdom.game;

import ai.example.bahrain.islandkingdom.render.ProceduralWorldMesh;
import ai.example.bahrain.islandkingdom.render.ThermalPerformanceManager;
import ai.example.bahrain.islandkingdom.ui.FullscreenWorldMap;
import ai.example.bahrain.islandkingdom.ui.GameHUD;
import ai.example.bahrain.islandkingdom.ui.GameHUD.ControlMode;
import ai.example.bahrain.islandkingdom.ui.RadarHUD;
import ai.example.bahrain.islandkingdom.ui.TouchController;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.Screen;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.PerspectiveCamera;
import com.badlogic.gdx.graphics.g3d.Environment;
import com.badlogic.gdx.graphics.g3d.ModelBatch;
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute;
import com.badlogic.gdx.graphics.g3d.environment.DirectionalLight;
import com.badlogic.gdx.math.MathUtils;
import com.badlogic.gdx.math.Vector3;

/**
 * Complete 3D Third-Person Open-World Gameplay Screen for Bahrain.
 * Implements a playable sandbox experience inspired by classic 3D city games:
 * - Real-time 3D PerspectiveCamera with third-person chase physics.
 * - Procedural 3D island terrain, roads, Manama skyline, and landmarks with windows and architectural facades.
 * - Fully animated low-poly humanoid player character.
 * - 5 drivable entity modes (Human, 4x4 SUV, coastal dhow boat, helicopter, aeroplane) with seamless Enter/Exit.
 * - Circular minimap radar with coastline, player arrow, and vehicle blips.
 * - Interactive fullscreen world map with zoom in/out, pan, and direct touch-to-teleportation across Bahrain.
 * - Mobile virtual analog joystick, touch action buttons, entity switcher bar, and desktop keyboard fallback.
 */
public class GameplayScreen implements Screen {

    private final BahrainGame game;

    // 3D Rendering Pipeline
    private PerspectiveCamera camera;
    private ModelBatch modelBatch;
    private Environment environment;
    private ProceduralWorldMesh worldMesh;

    // 2D HUD and Touch Input
    private TouchController touchController;
    private RadarHUD radarHud;
    private FullscreenWorldMap fullscreenMap;

    // Third-Person Camera Tracking
    private float cameraYaw = 45.0f;
    private float cameraPitch = 18.0f;
    private float cameraDist = 4.8f;
    private final Vector3 cameraTarget = new Vector3();
    private final Vector3 currentCameraPos = new Vector3();

    // Interaction State
    private boolean lastInteractState = false;
    private float interactCooldown = 0.0f;

    public GameplayScreen(BahrainGame game) {
        this.game = game;
    }

    @Override
    public void show() {
        int width = Gdx.graphics.getWidth();
        int height = Gdx.graphics.getHeight();

        // 1. Configure Third-Person Perspective Camera
        camera = new PerspectiveCamera(65f, width, height);
        camera.near = 0.2f;
        camera.far = 1000f;
        camera.position.set(0f, 2.5f, 6f);
        camera.lookAt(0f, 1.2f, 0f);
        camera.update();

        // 2. Initialize 3D Batch and Lighting Environment
        modelBatch = new ModelBatch();
        environment = new Environment();
        environment.set(new ColorAttribute(ColorAttribute.AmbientLight, 0.55f, 0.58f, 0.62f, 1f));
        environment.add(new DirectionalLight().set(0.95f, 0.90f, 0.82f, -0.6f, -0.85f, -0.3f));

        // 3. Build Procedural 3D Meshes
        worldMesh = new ProceduralWorldMesh();

        // 4. Initialize Touch Input Controller, Radar HUD, and Fullscreen World Map
        touchController = new TouchController(game.hud);
        radarHud = new RadarHUD();
        fullscreenMap = new FullscreenWorldMap();
        Gdx.input.setInputProcessor(touchController);

        // Initial camera position
        currentCameraPos.set(camera.position);
    }

    @Override
    public void render(float delta) {
        // Clamp delta time to avoid large jumps
        float dt = Math.min(delta, 0.05f);
        if (interactCooldown > 0f) interactCooldown -= dt;

        // 1. Update Thermal Performance Manager
        game.thermalManager.update(dt, 0.95f);

        // 2. Handle Minimap / Fullscreen Map Toggle
        if (touchController.requestOpenMap) {
            fullscreenMap.isOpen = !fullscreenMap.isOpen;
            touchController.requestOpenMap = false;
        }

        // Handle Touch Events on Fullscreen Map
        if (fullscreenMap.isOpen) {
            if (Gdx.input.justTouched()) {
                fullscreenMap.handleTouch(game, Gdx.input.getX(), Gdx.input.getY());
            }
        }

        // 3. Handle Instant Vehicle Swaps (Keys 1-5 or On-Screen Selector)
        if (touchController.requestVehicleSwap > 0) {
            handleVehicleSwap(touchController.requestVehicleSwap);
            touchController.requestVehicleSwap = 0;
        }

        // 4. Step 60 Hz Physics Engines
        game.physicsEngine.update(dt);

        // 5. Calculate Entity Local Positions Relative to Floating Origin
        float[] playerLocal = game.floatingOrigin.worldToLocal(
                game.playerHuman.getPosX(), game.playerHuman.getPosY(), game.playerHuman.getPosZ());
        float[] carLocal = game.floatingOrigin.worldToLocal(
                game.playerCar.getPosX(), game.playerCar.getPosY(), game.playerCar.getPosZ());
        float[] boatLocal = game.floatingOrigin.worldToLocal(
                game.playerBoat.getPosX(), game.playerBoat.getPosY(), game.playerBoat.getPosZ());
        float[] heliLocal = game.floatingOrigin.worldToLocal(
                game.playerHeli.getPosX(), game.playerHeli.getPosY(), game.playerHeli.getPosZ());
        float[] planeLocal = game.floatingOrigin.worldToLocal(
                game.playerPlane.getPosX(), game.playerPlane.getPosY(), game.playerPlane.getPosZ());

        float playerHeading = (float) Math.toDegrees(game.playerHuman.getFacingRad());
        float carHeading = (float) Math.toDegrees(game.playerCar.getYawRad());
        float boatHeading = (float) Math.toDegrees(game.playerBoat.getYawRad());
        float heliHeading = (float) Math.toDegrees(game.playerHeli.getYawRad());
        float planeHeading = (float) Math.toDegrees(game.playerPlane.getYawRad());
        float planePitch = (float) Math.toDegrees(game.playerPlane.getPitchRad());
        float planeRoll = (float) Math.toDegrees(game.playerPlane.getRollRad());
        float planeAirspeed = game.playerPlane.getAirspeedMs();

        // 6. Vehicle Proximity & Enter/Exit Interaction
        float distToCar = Vector3.dst(playerLocal[0], 0f, playerLocal[2], carLocal[0], 0f, carLocal[2]);
        float distToBoat = Vector3.dst(playerLocal[0], 0f, playerLocal[2], boatLocal[0], 0f, boatLocal[2]);
        float distToHeli = Vector3.dst(playerLocal[0], 0f, playerLocal[2], heliLocal[0], 0f, heliLocal[2]);
        float distToPlane = Vector3.dst(playerLocal[0], 0f, playerLocal[2], planeLocal[0], 0f, planeLocal[2]);

        boolean nearVehicle = false;
        String promptText = null;

        if (game.hud.getMode() == ControlMode.ON_FOOT) {
            if (distToCar < 4.5f) {
                nearVehicle = true;
                promptText = "TAP [ENTER] OR PRESS 'F' TO DRIVE 4x4";
                if (game.hud.inputInteract && !lastInteractState && interactCooldown <= 0f) {
                    game.hud.setMode(ControlMode.CAR);
                    interactCooldown = 0.5f;
                }
            } else if (distToBoat < 6.5f) {
                nearVehicle = true;
                promptText = "TAP [ENTER] OR PRESS 'F' TO BOARD DHOW";
                if (game.hud.inputInteract && !lastInteractState && interactCooldown <= 0f) {
                    game.hud.setMode(ControlMode.BOAT);
                    interactCooldown = 0.5f;
                }
            } else if (distToHeli < 5.5f) {
                nearVehicle = true;
                promptText = "TAP [ENTER] OR PRESS 'F' TO PILOT HELICOPTER";
                if (game.hud.inputInteract && !lastInteractState && interactCooldown <= 0f) {
                    game.hud.setMode(ControlMode.HELICOPTER);
                    interactCooldown = 0.5f;
                }
            } else if (distToPlane < 7.5f) {
                nearVehicle = true;
                promptText = "TAP [ENTER] OR PRESS 'F' TO FLY AEROPLANE";
                if (game.hud.inputInteract && !lastInteractState && interactCooldown <= 0f) {
                    game.hud.setMode(ControlMode.AEROPLANE);
                    interactCooldown = 0.5f;
                }
            }
        } else {
            promptText = "TAP [EXIT] OR PRESS 'F' TO EXIT";
            if (game.hud.inputInteract && !lastInteractState && interactCooldown <= 0f) {
                exitCurrentVehicle();
                interactCooldown = 0.5f;
            }
        }
        lastInteractState = game.hud.inputInteract;

        // 7. Update 3D Entity Transforms and Locomotion Animations
        float walkSpeed = game.playerHuman.getSpeedMs();
        boolean onFoot = game.hud.getMode() == ControlMode.ON_FOOT;
        boolean heliRunning = game.hud.getMode() == ControlMode.HELICOPTER || game.playerHeli.getRotorRpm() > 100f;

        worldMesh.updateEntities(dt,
                playerLocal[0], playerLocal[1], playerLocal[2], playerHeading, walkSpeed, onFoot,
                carLocal[0], carLocal[1], carLocal[2], carHeading,
                boatLocal[0], boatLocal[1], boatLocal[2], boatHeading,
                heliLocal[0], heliLocal[1], heliLocal[2], heliHeading, heliRunning,
                planeLocal[0], planeLocal[1], planeLocal[2], planeHeading, planePitch, planeRoll, planeAirspeed);

        // 8. Update Third-Person Chase Camera
        updateThirdPersonCamera(dt, onFoot, playerLocal, carLocal, boatLocal, heliLocal, planeLocal,
                playerHeading, carHeading, boatHeading, heliHeading, planeHeading);

        // 9. Clear Screen to Warm Bahrain Gulf Daytime Sky (Never solid blue!)
        Gdx.gl.glViewport(0, 0, Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
        Gdx.gl.glClearColor(0.50f, 0.70f, 0.88f, 1.0f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);

        // 10. Render 3D World Geometry & Entities
        modelBatch.begin(camera);

        // Terrain Slabs & Roads
        modelBatch.render(worldMesh.terrainInstances, environment);

        // City High-Rises & Landmarks with Windows and Architectural Details
        modelBatch.render(worldMesh.buildingInstances, environment);

        // Date Palms & Streetlights
        modelBatch.render(worldMesh.decorationInstances, environment);

        // 4x4 Off-Road Vehicle
        modelBatch.render(worldMesh.carBodyInstance, environment);
        modelBatch.render(worldMesh.carCabinInstance, environment);
        modelBatch.render(worldMesh.carWindshieldInstance, environment);
        modelBatch.render(worldMesh.carHeadlightLInstance, environment);
        modelBatch.render(worldMesh.carHeadlightRInstance, environment);
        modelBatch.render(worldMesh.carTaillightLInstance, environment);
        modelBatch.render(worldMesh.carTaillightRInstance, environment);
        for (int i = 0; i < 4; i++) {
            modelBatch.render(worldMesh.carWheelInstances[i], environment);
        }

        // Dhow Coastal Boat
        modelBatch.render(worldMesh.boatHullInstance, environment);
        modelBatch.render(worldMesh.boatDeckInstance, environment);
        modelBatch.render(worldMesh.boatCabinInstance, environment);
        modelBatch.render(worldMesh.boatMastInstance, environment);
        modelBatch.render(worldMesh.boatBoomInstance, environment);

        // Utility Helicopter
        modelBatch.render(worldMesh.heliFuselageInstance, environment);
        modelBatch.render(worldMesh.heliCockpitInstance, environment);
        modelBatch.render(worldMesh.heliTailInstance, environment);
        modelBatch.render(worldMesh.heliSkidLInstance, environment);
        modelBatch.render(worldMesh.heliSkidRInstance, environment);
        modelBatch.render(worldMesh.heliRotorInstance, environment);
        modelBatch.render(worldMesh.heliTailRotorInstance, environment);

        // Light Aeroplane
        modelBatch.render(worldMesh.planeFuselageInstance, environment);
        modelBatch.render(worldMesh.planeWingInstance, environment);
        modelBatch.render(worldMesh.planeCanopyInstance, environment);
        modelBatch.render(worldMesh.planeTailFinInstance, environment);
        modelBatch.render(worldMesh.planeTailStabInstance, environment);
        modelBatch.render(worldMesh.planePropellerInstance, environment);
        for (int i = 0; i < 3; i++) {
            modelBatch.render(worldMesh.planeGearInstances[i], environment);
        }

        // Player Human (when on foot)
        if (onFoot) {
            modelBatch.render(worldMesh.playerTorsoInstance, environment);
            modelBatch.render(worldMesh.playerHeadInstance, environment);
            modelBatch.render(worldMesh.playerLeftLegInstance, environment);
            modelBatch.render(worldMesh.playerRightLegInstance, environment);
            modelBatch.render(worldMesh.playerLeftArmInstance, environment);
            modelBatch.render(worldMesh.playerRightArmInstance, environment);
        }

        modelBatch.end();

        // 11. Telemetry & Speed Calculations
        float currentSpeedKmh = 0f;
        if (game.hud.getMode() == ControlMode.CAR) {
            currentSpeedKmh = game.playerCar.getSpeedKmh();
        } else if (game.hud.getMode() == ControlMode.BOAT) {
            currentSpeedKmh = game.playerBoat.getSpeedKnots() * 1.852f;
        } else if (game.hud.getMode() == ControlMode.HELICOPTER) {
            currentSpeedKmh = game.playerHeli.getAirspeedKnots() * 1.852f;
        } else if (game.hud.getMode() == ControlMode.AEROPLANE) {
            currentSpeedKmh = game.playerPlane.getAirspeedKnots() * 1.852f;
        }

        float staminaPercent = game.playerHuman.getStaminaPercent();
        float healthPercent = 1.0f - (game.playerHuman.getHeatAccumulation() / 100f);

        // 12. Render 2D Minimap Radar, Virtual Controls, and Telemetry
        radarHud.render(game.hud, touchController, game.thermalManager,
                playerHeading, playerLocal[0], playerLocal[2],
                carLocal[0], carLocal[2],
                boatLocal[0], boatLocal[2],
                heliLocal[0], heliLocal[2],
                planeLocal[0], planeLocal[2],
                currentSpeedKmh, staminaPercent, healthPercent,
                nearVehicle, promptText);

        // 13. Render Interactive Fullscreen World Map Modal
        if (fullscreenMap.isOpen) {
            double curX = onFoot ? game.playerHuman.getPosX() :
                    (game.hud.getMode() == ControlMode.CAR ? game.playerCar.getPosX() :
                    (game.hud.getMode() == ControlMode.BOAT ? game.playerBoat.getPosX() :
                    (game.hud.getMode() == ControlMode.HELICOPTER ? game.playerHeli.getPosX() : game.playerPlane.getPosX())));
            double curZ = onFoot ? game.playerHuman.getPosZ() :
                    (game.hud.getMode() == ControlMode.CAR ? game.playerCar.getPosZ() :
                    (game.hud.getMode() == ControlMode.BOAT ? game.playerBoat.getPosZ() :
                    (game.hud.getMode() == ControlMode.HELICOPTER ? game.playerHeli.getPosZ() : game.playerPlane.getPosZ())));

            fullscreenMap.render(game, curX, curZ, playerHeading);
        }
    }

    private void updateThirdPersonCamera(float dt, boolean onFoot,
                                         float[] playerLocal, float[] carLocal, float[] boatLocal,
                                         float[] heliLocal, float[] planeLocal,
                                         float playerHeading, float carHeading, float boatHeading,
                                         float heliHeading, float planeHeading) {
        if (!fullscreenMap.isOpen) {
            cameraYaw += touchController.cameraDeltaYaw;
            cameraPitch = MathUtils.clamp(cameraPitch + touchController.cameraDeltaPitch, 5f, 75f);
        }
        touchController.cameraDeltaYaw = 0f;
        touchController.cameraDeltaPitch = 0f;

        float targetLookHeight;
        float targetDist;

        if (onFoot) {
            cameraTarget.set(playerLocal[0], playerLocal[1] + 1.2f, playerLocal[2]);
            targetLookHeight = 1.2f;
            targetDist = 4.2f;
        } else if (game.hud.getMode() == ControlMode.CAR) {
            cameraTarget.set(carLocal[0], carLocal[1] + 1.2f, carLocal[2]);
            targetLookHeight = 1.2f;
            targetDist = 7.5f;
            cameraYaw = MathUtils.lerpAngleDeg(cameraYaw, carHeading + 180f, dt * 3.5f);
        } else if (game.hud.getMode() == ControlMode.BOAT) {
            cameraTarget.set(boatLocal[0], boatLocal[1] + 1.5f, boatLocal[2]);
            targetLookHeight = 1.5f;
            targetDist = 11.5f;
            cameraYaw = MathUtils.lerpAngleDeg(cameraYaw, boatHeading + 180f, dt * 2.5f);
        } else if (game.hud.getMode() == ControlMode.HELICOPTER) {
            cameraTarget.set(heliLocal[0], heliLocal[1] + 1.5f, heliLocal[2]);
            targetLookHeight = 1.5f;
            targetDist = 13.0f;
            cameraYaw = MathUtils.lerpAngleDeg(cameraYaw, heliHeading + 180f, dt * 2.5f);
        } else {
            // Aeroplane chase camera
            cameraTarget.set(planeLocal[0], planeLocal[1] + 1.2f, planeLocal[2]);
            targetLookHeight = 1.2f;
            targetDist = 14.5f;
            cameraYaw = MathUtils.lerpAngleDeg(cameraYaw, planeHeading + 180f, dt * 2.5f);
        }

        cameraDist = MathUtils.lerp(cameraDist, targetDist, dt * 5f);

        float radYaw = (float) Math.toRadians(cameraYaw);
        float radPitch = (float) Math.toRadians(cameraPitch);

        float camX = cameraTarget.x + (float) (cameraDist * Math.cos(radPitch) * Math.sin(radYaw));
        float camY = cameraTarget.y + (float) (cameraDist * Math.sin(radPitch));
        float camZ = cameraTarget.z + (float) (cameraDist * Math.cos(radPitch) * Math.cos(radYaw));

        Vector3 targetCam = new Vector3(camX, camY, camZ);
        currentCameraPos.lerp(targetCam, dt * 10f);

        camera.position.set(currentCameraPos);
        camera.lookAt(cameraTarget);
        camera.update();
    }

    private void exitCurrentVehicle() {
        ControlMode currentMode = game.hud.getMode();
        game.hud.setMode(ControlMode.ON_FOOT);

        if (currentMode == ControlMode.CAR) {
            double exitX = game.playerCar.getPosX() - 2.5;
            double exitZ = game.playerCar.getPosZ();
            game.playerHuman.teleport(exitX, game.playerCar.getPosY(), exitZ);
        } else if (currentMode == ControlMode.BOAT) {
            double exitX = game.playerBoat.getPosX() - 3.0;
            double exitZ = game.playerBoat.getPosZ();
            game.playerHuman.teleport(exitX, 1.0, exitZ);
        } else if (currentMode == ControlMode.HELICOPTER) {
            double exitX = game.playerHeli.getPosX() - 3.5;
            double exitZ = game.playerHeli.getPosZ();
            game.playerHuman.teleport(exitX, game.playerHeli.getPosY(), exitZ);
        } else if (currentMode == ControlMode.AEROPLANE) {
            double exitX = game.playerPlane.getPosX() - 4.5;
            double exitZ = game.playerPlane.getPosZ();
            game.playerHuman.teleport(exitX, game.playerPlane.getPosY(), exitZ);
        }
    }

    private void handleVehicleSwap(int swapCode) {
        switch (swapCode) {
            case 1:
                game.hud.setMode(ControlMode.ON_FOOT);
                break;
            case 2:
                game.hud.setMode(ControlMode.CAR);
                break;
            case 3:
                game.hud.setMode(ControlMode.BOAT);
                break;
            case 4:
                game.hud.setMode(ControlMode.HELICOPTER);
                break;
            case 5:
                game.hud.setMode(ControlMode.AEROPLANE);
                break;
        }
    }

    @Override
    public void resize(int width, int height) {
        if (camera != null) {
            camera.viewportWidth = width;
            camera.viewportHeight = height;
            camera.update();
        }
        if (touchController != null) {
            touchController.updateButtonPositions(width, height);
        }
    }

    @Override
    public void pause() {}

    @Override
    public void resume() {}

    @Override
    public void hide() {}

    @Override
    public void dispose() {
        if (modelBatch != null) modelBatch.dispose();
        if (worldMesh != null) worldMesh.dispose();
        if (radarHud != null) radarHud.dispose();
        if (fullscreenMap != null) fullscreenMap.dispose();
    }
}
