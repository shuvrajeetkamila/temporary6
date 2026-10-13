package ai.example.bahrain.islandkingdom.game;

import ai.example.bahrain.islandkingdom.render.ProceduralWorldMesh;
import ai.example.bahrain.islandkingdom.render.ThermalPerformanceManager;
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
 * - Procedural 3D island terrain, roads, Manama skyline, and landmarks.
 * - Fully animated low-poly humanoid player character.
 * - Drivable 4x4 SUV, Dhow boat, and Helicopter with seamless Enter/Exit.
 * - Classic circular minimap radar with coastline, player arrow, and vehicle blips.
 * - Mobile virtual analog joystick, touch action buttons, and desktop keyboard fallback.
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

        // 4. Initialize Touch Input Controller and Radar HUD
        touchController = new TouchController(game.hud);
        radarHud = new RadarHUD();
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

        // 2. Handle Instant Vehicle Swaps (Keys 1-4)
        if (touchController.requestVehicleSwap > 0) {
            handleVehicleSwap(touchController.requestVehicleSwap);
            touchController.requestVehicleSwap = 0;
        }

        // 3. Step 60 Hz Physics Engines
        game.physicsEngine.update(dt);

        // 4. Calculate Entity Local Positions Relative to Floating Origin
        float[] playerLocal = game.floatingOrigin.worldToLocal(
                game.playerHuman.getPosX(), game.playerHuman.getPosY(), game.playerHuman.getPosZ());
        float[] carLocal = game.floatingOrigin.worldToLocal(
                game.playerCar.getPosX(), game.playerCar.getPosY(), game.playerCar.getPosZ());
        float[] boatLocal = game.floatingOrigin.worldToLocal(
                game.playerBoat.getPosX(), game.playerBoat.getPosY(), game.playerBoat.getPosZ());
        float[] heliLocal = game.floatingOrigin.worldToLocal(
                game.playerHeli.getPosX(), game.playerHeli.getPosY(), game.playerHeli.getPosZ());

        float playerHeading = (float) Math.toDegrees(game.playerHuman.getFacingRad());
        float carHeading = (float) Math.toDegrees(game.playerCar.getYawRad());
        float boatHeading = (float) Math.toDegrees(game.playerBoat.getYawRad());
        float heliHeading = (float) Math.toDegrees(game.playerHeli.getYawRad());

        // 5. Vehicle Proximity & Enter/Exit Interaction
        float distToCar = Vector3.dst(playerLocal[0], 0f, playerLocal[2], carLocal[0], 0f, carLocal[2]);
        float distToBoat = Vector3.dst(playerLocal[0], 0f, playerLocal[2], boatLocal[0], 0f, boatLocal[2]);
        float distToHeli = Vector3.dst(playerLocal[0], 0f, playerLocal[2], heliLocal[0], 0f, heliLocal[2]);

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
            }
        } else {
            // Already inside vehicle: exit when interact pressed
            promptText = "TAP [EXIT] OR PRESS 'F' TO EXIT";
            if (game.hud.inputInteract && !lastInteractState && interactCooldown <= 0f) {
                exitCurrentVehicle(playerLocal, carLocal, boatLocal, heliLocal);
                interactCooldown = 0.5f;
            }
        }
        lastInteractState = game.hud.inputInteract;

        // 6. Update 3D Entity Transforms and Locomotion Animations
        float walkSpeed = game.playerHuman.getSpeedMs();
        boolean onFoot = game.hud.getMode() == ControlMode.ON_FOOT;
        boolean heliRunning = game.hud.getMode() == ControlMode.HELICOPTER || game.playerHeli.getRotorRpm() > 100f;

        worldMesh.updateEntities(dt,
                playerLocal[0], playerLocal[1], playerLocal[2], playerHeading, walkSpeed, onFoot,
                carLocal[0], carLocal[1], carLocal[2], carHeading,
                boatLocal[0], boatLocal[1], boatLocal[2], boatHeading,
                heliLocal[0], heliLocal[1], heliLocal[2], heliHeading, heliRunning);

        // 7. Update Third-Person Chase Camera
        updateThirdPersonCamera(dt, onFoot, playerLocal, carLocal, boatLocal, heliLocal,
                playerHeading, carHeading, boatHeading, heliHeading);

        // 8. Clear Screen to Warm Bahrain Gulf Daytime Sky (Never solid blue!)
        Gdx.gl.glViewport(0, 0, Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
        Gdx.gl.glClearColor(0.50f, 0.70f, 0.88f, 1.0f); // Bright Mediterranean/Gulf sky blue
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);

        // 9. Render 3D World Geometry & Entities with GLES3 PBR Pipeline
        modelBatch.begin(camera);

        // Terrain Slabs & Roads
        modelBatch.render(worldMesh.terrainInstances, environment);

        // City High-Rises & Landmarks
        modelBatch.render(worldMesh.buildingInstances, environment);

        // Palms & Streetlights
        modelBatch.render(worldMesh.decorationInstances, environment);

        // 4x4 Off-Road Vehicle
        modelBatch.render(worldMesh.carBodyInstance, environment);
        for (int i = 0; i < 4; i++) {
            modelBatch.render(worldMesh.carWheelInstances[i], environment);
        }

        // Dhow Coastal Boat
        modelBatch.render(worldMesh.boatHullInstance, environment);
        modelBatch.render(worldMesh.boatCabinInstance, environment);
        modelBatch.render(worldMesh.boatMastInstance, environment);

        // Utility Helicopter
        modelBatch.render(worldMesh.heliFuselageInstance, environment);
        modelBatch.render(worldMesh.heliTailInstance, environment);
        modelBatch.render(worldMesh.heliRotorInstance, environment);

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

        // 10. Telemetry & Speed Calculations
        float currentSpeedKmh = 0f;
        if (game.hud.getMode() == ControlMode.CAR) {
            currentSpeedKmh = game.playerCar.getSpeedKmh();
        } else if (game.hud.getMode() == ControlMode.BOAT) {
            currentSpeedKmh = game.playerBoat.getSpeedKnots() * 1.852f;
        } else if (game.hud.getMode() == ControlMode.HELICOPTER) {
            currentSpeedKmh = game.playerHeli.getAirspeedKnots() * 1.852f;
        }

        float staminaPercent = game.playerHuman.getStaminaPercent();
        float healthPercent = 1.0f - (game.playerHuman.getHeatAccumulation() / 100f);

        // 11. Render 2D GTA-Style Radar, Virtual Controls, and Telemetry
        radarHud.render(game.hud, touchController, game.thermalManager,
                playerHeading, playerLocal[0], playerLocal[2],
                carLocal[0], carLocal[2],
                boatLocal[0], boatLocal[2],
                heliLocal[0], heliLocal[2],
                currentSpeedKmh, staminaPercent, healthPercent,
                nearVehicle, promptText);
    }

    private void updateThirdPersonCamera(float dt, boolean onFoot,
                                         float[] playerLocal, float[] carLocal, float[] boatLocal, float[] heliLocal,
                                         float playerHeading, float carHeading, float boatHeading, float heliHeading) {
        // Orbit drag from touch
        cameraYaw += touchController.cameraDeltaYaw;
        cameraPitch = MathUtils.clamp(cameraPitch + touchController.cameraDeltaPitch, 5f, 75f);
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
            // Smoothly align camera behind car
            cameraYaw = MathUtils.lerpAngleDeg(cameraYaw, carHeading + 180f, dt * 3.5f);
        } else if (game.hud.getMode() == ControlMode.BOAT) {
            cameraTarget.set(boatLocal[0], boatLocal[1] + 1.5f, boatLocal[2]);
            targetLookHeight = 1.5f;
            targetDist = 11.5f;
            cameraYaw = MathUtils.lerpAngleDeg(cameraYaw, boatHeading + 180f, dt * 2.5f);
        } else {
            cameraTarget.set(heliLocal[0], heliLocal[1] + 1.5f, heliLocal[2]);
            targetLookHeight = 1.5f;
            targetDist = 13.0f;
            cameraYaw = MathUtils.lerpAngleDeg(cameraYaw, heliHeading + 180f, dt * 2.5f);
        }

        cameraDist = MathUtils.lerp(cameraDist, targetDist, dt * 5f);

        // Spherical orbital position calculation
        float radYaw = (float) Math.toRadians(cameraYaw);
        float radPitch = (float) Math.toRadians(cameraPitch);

        float camX = cameraTarget.x + (float) (cameraDist * Math.cos(radPitch) * Math.sin(radYaw));
        float camY = cameraTarget.y + (float) (cameraDist * Math.sin(radPitch));
        float camZ = cameraTarget.z + (float) (cameraDist * Math.cos(radPitch) * Math.cos(radYaw));

        // Smooth camera lerp
        Vector3 targetCam = new Vector3(camX, camY, camZ);
        currentCameraPos.lerp(targetCam, dt * 10f);

        camera.position.set(currentCameraPos);
        camera.lookAt(cameraTarget);
        camera.update();
    }

    private void exitCurrentVehicle(float[] playerLocal, float[] carLocal, float[] boatLocal, float[] heliLocal) {
        ControlMode currentMode = game.hud.getMode();
        game.hud.setMode(ControlMode.ON_FOOT);

        // Place player safely next to the driver door
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

    @Override public void pause() {}
    @Override public void resume() {}
    @Override public void hide() {}

    @Override
    public void dispose() {
        if (modelBatch != null) modelBatch.dispose();
        if (worldMesh != null) worldMesh.dispose();
        if (radarHud != null) radarHud.dispose();
    }
}
