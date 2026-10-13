package ai.example.bahrain.islandkingdom.game;

import ai.example.bahrain.islandkingdom.human.HumanController;
import ai.example.bahrain.islandkingdom.physics.PhysicsEngine;
import ai.example.bahrain.islandkingdom.render.MobilePbrRenderer;
import ai.example.bahrain.islandkingdom.render.ThermalPerformanceManager;
import ai.example.bahrain.islandkingdom.terrain.TerrainGenerator;
import ai.example.bahrain.islandkingdom.traffic.TrafficSystem;
import ai.example.bahrain.islandkingdom.ui.GameHUD;
import ai.example.bahrain.islandkingdom.vehicles.boat.BoatPhysics;
import ai.example.bahrain.islandkingdom.vehicles.car.CarPhysics;
import ai.example.bahrain.islandkingdom.vehicles.heli.HelicopterPhysics;
import ai.example.bahrain.islandkingdom.vehicles.plane.AeroplanePhysics;
import ai.example.bahrain.islandkingdom.water.GulfWaterSystem;
import ai.example.bahrain.islandkingdom.weather.BahrainWeatherSystem;
import ai.example.bahrain.islandkingdom.world.*;

import com.badlogic.gdx.Game;

/**
 * Main Game State and Lifecycle Coordinator for BAHRAIN: THE ISLAND KINGDOM.
 * Manages the global simulation, physical entities, streaming chunks, and active screen.
 */
public class BahrainGame extends Game {

    // Subsystems
    public FloatingOrigin floatingOrigin;
    public GovernorateManager governorateManager;
    public IslandRegistry islandRegistry;
    public CausewayManager causewayManager;
    public ChunkStreamer chunkStreamer;
    public TerrainGenerator terrainGenerator;
    public GulfWaterSystem waterSystem;
    public BahrainWeatherSystem weatherSystem;
    public PhysicsEngine physicsEngine;
    public TrafficSystem trafficSystem;
    public ThermalPerformanceManager thermalManager;
    public MobilePbrRenderer renderer;
    public GameHUD hud;

    // Entities
    public HumanController playerHuman;
    public CarPhysics playerCar;
    public BoatPhysics playerBoat;
    public HelicopterPhysics playerHeli;
    public AeroplanePhysics playerPlane;

    @Override
    public void create() {
        // 1. Initialize Geodetic World Foundations
        double[] spawnUtm = MasterCRS.latLonToUtm39n(WorldManifest.SPAWN_LAT, WorldManifest.SPAWN_LON);
        double spawnX = spawnUtm[0];
        double spawnZ = spawnUtm[1];
        double spawnY = 2.5; // Coastal elevation

        floatingOrigin = new FloatingOrigin(spawnX, spawnY, spawnZ);
        governorateManager = new GovernorateManager();
        islandRegistry = new IslandRegistry();
        causewayManager = new CausewayManager();
        chunkStreamer = new ChunkStreamer();
        terrainGenerator = new TerrainGenerator();
        waterSystem = new GulfWaterSystem();
        weatherSystem = new BahrainWeatherSystem();
        physicsEngine = new PhysicsEngine();
        trafficSystem = new TrafficSystem();
        thermalManager = new ThermalPerformanceManager();
        renderer = new MobilePbrRenderer(thermalManager);
        hud = new GameHUD();

        // 2. Initialize Player Entities
        playerHuman = new HumanController(spawnX, spawnY, spawnZ);
        playerCar = new CarPhysics(spawnX + 5.0, spawnY, spawnZ + 2.0);
        playerBoat = new BoatPhysics(spawnX + 50.0, 0.0, spawnZ + 100.0); // In water near waterfront
        playerHeli = new HelicopterPhysics(spawnX + 25.0, spawnY, spawnZ - 20.0);
        playerPlane = new AeroplanePhysics(463000.0, 5.0, 2906000.0); // At Bahrain Int'l Airport runway

        // 3. Register Floating Origin Listener
        floatingOrigin.addListener((shiftX, shiftY, shiftZ) -> {
            // Entities and particle anchors update seamlessly on origin rebase
        });

        // 4. Register 60 Hz Physics Step Callback
        physicsEngine.setStepListener(dt -> {
            stepSimulation(dt);
        });

        // 5. Present Loading Screen for verification & staged asset prep
        setScreen(new LoadingScreen(this));
    }

    /**
     * Executes one fixed 60Hz physics tick across the entire active Bahrain world.
     */
    public void stepSimulation(float dt) {
        double timeSec = System.currentTimeMillis() / 1000.0;
        GameHUD.ControlMode mode = hud.getMode();

        if (mode == GameHUD.ControlMode.ON_FOOT) {
            // Step Human
            playerHuman.step(dt, hud.inputMoveY, hud.inputMoveX, hud.inputAction1, hud.inputAction2,
                    weatherSystem.getCurrentPreset().temperatureC, (float) waterSystem.getWaterSurfaceHeight(playerHuman.getPosX(), playerHuman.getPosZ(), timeSec));

            // Passive idle vehicles
            playerCar.step(dt, 0.0f, 1.0f, 0.0f, terrainGenerator.getBiomeAtUtm(playerCar.getPosX(), playerCar.getPosZ()));
            playerBoat.step(dt, 0.0f, 0.0f, waterSystem, timeSec);
            playerHeli.step(dt, 0.0f, 0.0f, 0.0f, 0.0f, weatherSystem, (float) terrainGenerator.getElevationAtUtm(playerHeli.getPosX(), playerHeli.getPosZ()));

            floatingOrigin.checkAndRebase(playerHuman.getPosX(), playerHuman.getPosY(), playerHuman.getPosZ());
            chunkStreamer.update(playerHuman.getPosX(), playerHuman.getPosZ(), 0.0, 0.0);
            trafficSystem.update(dt, playerHuman.getPosX(), playerHuman.getPosZ());

        } else if (mode == GameHUD.ControlMode.CAR) {
            float throttle = Math.max(0.0f, hud.inputMoveY);
            if (hud.inputAction1) throttle = 1.0f;
            float brake = hud.inputAction2 ? 1.0f : (hud.inputMoveY < -0.1f ? 0.75f : 0.0f);

            playerCar.step(dt, throttle, brake, hud.inputMoveX, terrainGenerator.getBiomeAtUtm(playerCar.getPosX(), playerCar.getPosZ()));
            playerHuman.teleport(playerCar.getPosX(), playerCar.getPosY(), playerCar.getPosZ());

            playerBoat.step(dt, 0.0f, 0.0f, waterSystem, timeSec);
            playerHeli.step(dt, 0.0f, 0.0f, 0.0f, 0.0f, weatherSystem, (float) terrainGenerator.getElevationAtUtm(playerHeli.getPosX(), playerHeli.getPosZ()));

            floatingOrigin.checkAndRebase(playerCar.getPosX(), playerCar.getPosY(), playerCar.getPosZ());
            chunkStreamer.update(playerCar.getPosX(), playerCar.getPosZ(), 0.0, 0.0);
            trafficSystem.update(dt, playerCar.getPosX(), playerCar.getPosZ());

        } else if (mode == GameHUD.ControlMode.BOAT) {
            float throttle = Math.max(0.0f, hud.inputMoveY);
            if (hud.inputAction1) throttle = 1.0f;

            playerBoat.step(dt, throttle, hud.inputMoveX, waterSystem, timeSec);
            playerHuman.teleport(playerBoat.getPosX(), playerBoat.getPosY(), playerBoat.getPosZ());

            playerCar.step(dt, 0.0f, 1.0f, 0.0f, terrainGenerator.getBiomeAtUtm(playerCar.getPosX(), playerCar.getPosZ()));
            playerHeli.step(dt, 0.0f, 0.0f, 0.0f, 0.0f, weatherSystem, (float) terrainGenerator.getElevationAtUtm(playerHeli.getPosX(), playerHeli.getPosZ()));

            floatingOrigin.checkAndRebase(playerBoat.getPosX(), playerBoat.getPosY(), playerBoat.getPosZ());
            chunkStreamer.update(playerBoat.getPosX(), playerBoat.getPosZ(), 0.0, 0.0);
            trafficSystem.update(dt, playerBoat.getPosX(), playerBoat.getPosZ());

        } else if (mode == GameHUD.ControlMode.HELICOPTER) {
            float collective = hud.inputAction1 ? 0.95f : (hud.inputAction2 ? 0.2f : 0.65f);

            playerHeli.step(dt, collective, hud.inputMoveY, hud.inputMoveX, 0.0f, weatherSystem,
                    (float) terrainGenerator.getElevationAtUtm(playerHeli.getPosX(), playerHeli.getPosZ()));
            playerHuman.teleport(playerHeli.getPosX(), playerHeli.getPosY(), playerHeli.getPosZ());

            playerCar.step(dt, 0.0f, 1.0f, 0.0f, terrainGenerator.getBiomeAtUtm(playerCar.getPosX(), playerCar.getPosZ()));
            playerBoat.step(dt, 0.0f, 0.0f, waterSystem, timeSec);

            floatingOrigin.checkAndRebase(playerHeli.getPosX(), playerHeli.getPosY(), playerHeli.getPosZ());
            chunkStreamer.update(playerHeli.getPosX(), playerHeli.getPosZ(), 0.0, 0.0);
            trafficSystem.update(dt, playerHeli.getPosX(), playerHeli.getPosZ());
        }
    }

    @Override
    public void dispose() {
        super.dispose();
    }
}
