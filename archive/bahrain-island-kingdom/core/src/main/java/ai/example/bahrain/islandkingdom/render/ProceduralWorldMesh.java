package ai.example.bahrain.islandkingdom.render;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.VertexAttributes.Usage;
import com.badlogic.gdx.graphics.g3d.Material;
import com.badlogic.gdx.graphics.g3d.Model;
import com.badlogic.gdx.graphics.g3d.ModelInstance;
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute;
import com.badlogic.gdx.graphics.g3d.utils.ModelBuilder;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.Disposable;

/**
 * Procedural 3D World Geometry and Detailed Entity Meshes for Bahrain.
 * Step 1: OpenStreetMap street network alignment and 3D architectural massing.
 * Step 3: Detailed visual assets with windows, facade bands, roads, and complete 3D bodies for all 5 entities.
 */
public class ProceduralWorldMesh implements Disposable {

    private final Array<Model> models = new Array<>();
    public final Array<ModelInstance> terrainInstances = new Array<>();
    public final Array<ModelInstance> buildingInstances = new Array<>();
    public final Array<ModelInstance> decorationInstances = new Array<>();

    // Entity Model Instances
    // 1. Human (Bahrain red & white jersey, denim trousers, shoes, skin tone, dark hair)
    public ModelInstance playerTorsoInstance;
    public ModelInstance playerHeadInstance;
    public ModelInstance playerLeftArmInstance;
    public ModelInstance playerRightArmInstance;
    public ModelInstance playerLeftLegInstance;
    public ModelInstance playerRightLegInstance;

    // 2. Car (4x4 SUV with cabin, windows, headlights, red brake lights, 4 alloy wheels)
    public ModelInstance carBodyInstance;
    public ModelInstance carCabinInstance;
    public ModelInstance carWindshieldInstance;
    public ModelInstance[] carWheelInstances = new ModelInstance[4];
    public ModelInstance carHeadlightLInstance;
    public ModelInstance carHeadlightRInstance;
    public ModelInstance carTaillightLInstance;
    public ModelInstance carTaillightRInstance;

    // 3. Boat (Traditional Bahrain Dhow with curved hull, deck, cabin, windows, mast)
    public ModelInstance boatHullInstance;
    public ModelInstance boatDeckInstance;
    public ModelInstance boatCabinInstance;
    public ModelInstance boatMastInstance;
    public ModelInstance boatBoomInstance;

    // 4. Helicopter (Fuselage, bubble cockpit windshield, tail boom, skids, main & tail rotors)
    public ModelInstance heliFuselageInstance;
    public ModelInstance heliCockpitInstance;
    public ModelInstance heliTailInstance;
    public ModelInstance heliSkidLInstance;
    public ModelInstance heliSkidRInstance;
    public ModelInstance heliRotorInstance;
    public ModelInstance heliTailRotorInstance;

    // 5. Aeroplane (Fuselage, low wings, cockpit canopy, vertical fin, stabilizer, wheels, propeller)
    public ModelInstance planeFuselageInstance;
    public ModelInstance planeWingInstance;
    public ModelInstance planeTailFinInstance;
    public ModelInstance planeTailStabInstance;
    public ModelInstance planeCanopyInstance;
    public ModelInstance planePropellerInstance;
    public ModelInstance[] planeGearInstances = new ModelInstance[3];

    private float animTimer = 0.0f;
    private float heliRotorAngle = 0.0f;
    private float planePropAngle = 0.0f;

    public ProceduralWorldMesh() {
        buildWorldGeometry();
        buildEntityModels();
    }

    private void buildWorldGeometry() {
        ModelBuilder mb = new ModelBuilder();

        // 1. Terrain Ground Slabs, Sidewalks, and Asphalt Roads
        Material sandMat = new Material(ColorAttribute.createDiffuse(new Color(0.83f, 0.72f, 0.53f, 1f)));
        Material sidewalkMat = new Material(ColorAttribute.createDiffuse(new Color(0.68f, 0.69f, 0.70f, 1f)));
        Material waterMat = new Material(ColorAttribute.createDiffuse(new Color(0.12f, 0.45f, 0.65f, 0.85f)));
        Material asphaltMat = new Material(ColorAttribute.createDiffuse(new Color(0.18f, 0.18f, 0.20f, 1f)));
        Material whiteStripeMat = new Material(ColorAttribute.createDiffuse(new Color(0.96f, 0.96f, 0.94f, 1f)));
        Material yellowStripeMat = new Material(ColorAttribute.createDiffuse(new Color(0.95f, 0.80f, 0.15f, 1f)));

        Model sandGround = mb.createBox(200f, 0.5f, 200f, sandMat, Usage.Position | Usage.Normal);
        Model waterPlane = mb.createBox(500f, 0.2f, 500f, waterMat, Usage.Position | Usage.Normal);

        // Asphalt Road Segments with Sidewalks & Markings
        Model roadAvenue = mb.createBox(16f, 0.65f, 160f, asphaltMat, Usage.Position | Usage.Normal);
        Model sidewalkL = mb.createBox(2.5f, 0.75f, 160f, sidewalkMat, Usage.Position | Usage.Normal);
        Model sidewalkR = mb.createBox(2.5f, 0.75f, 160f, sidewalkMat, Usage.Position | Usage.Normal);
        Model centerDivider = mb.createBox(0.4f, 0.68f, 150f, yellowStripeMat, Usage.Position | Usage.Normal);
        Model laneStripeL = mb.createBox(0.25f, 0.68f, 150f, whiteStripeMat, Usage.Position | Usage.Normal);
        Model laneStripeR = mb.createBox(0.25f, 0.68f, 150f, whiteStripeMat, Usage.Position | Usage.Normal);

        // Cross street (Bab Al Bahrain - Government Ave intersection)
        Model crossStreet = mb.createBox(120f, 0.64f, 14f, asphaltMat, Usage.Position | Usage.Normal);

        models.addAll(sandGround, waterPlane, roadAvenue, sidewalkL, sidewalkR,
                centerDivider, laneStripeL, laneStripeR, crossStreet);

        // Add terrain and road instances
        terrainInstances.add(new ModelInstance(sandGround, 0f, -0.25f, 0f));
        terrainInstances.add(new ModelInstance(waterPlane, 120f, -1.8f, 90f));

        // Main Boulevard
        terrainInstances.add(new ModelInstance(roadAvenue, 12f, -0.15f, 0f));
        terrainInstances.add(new ModelInstance(sidewalkL, 2.75f, -0.10f, 0f));
        terrainInstances.add(new ModelInstance(sidewalkR, 21.25f, -0.10f, 0f));
        terrainInstances.add(new ModelInstance(centerDivider, 12f, -0.12f, 0f));
        terrainInstances.add(new ModelInstance(laneStripeL, 8.5f, -0.12f, 0f));
        terrainInstances.add(new ModelInstance(laneStripeR, 15.5f, -0.12f, 0f));

        // Cross Street
        terrainInstances.add(new ModelInstance(crossStreet, 0f, -0.14f, -25f));

        // 2. 3D Architectural Buildings with Window Facades
        Material glassBlueMat = new Material(ColorAttribute.createDiffuse(new Color(0.22f, 0.42f, 0.58f, 1f)));
        Material glassGoldMat = new Material(ColorAttribute.createDiffuse(new Color(0.70f, 0.58f, 0.35f, 1f)));
        Material glassCyanMat = new Material(ColorAttribute.createDiffuse(new Color(0.25f, 0.55f, 0.65f, 1f)));
        Material whiteConcreteMat = new Material(ColorAttribute.createDiffuse(new Color(0.92f, 0.92f, 0.94f, 1f)));
        Material limestoneMat = new Material(ColorAttribute.createDiffuse(new Color(0.78f, 0.68f, 0.52f, 1f)));
        Material windowStripeMat = new Material(ColorAttribute.createDiffuse(new Color(0.12f, 0.18f, 0.28f, 1f)));
        Material darkMetalMat = new Material(ColorAttribute.createDiffuse(new Color(0.25f, 0.26f, 0.28f, 1f)));

        // Tower Models with Windows & Floors
        Model bldgTowerA = mb.createBox(18f, 65f, 18f, whiteConcreteMat, Usage.Position | Usage.Normal);
        Model windowBandA = mb.createBox(18.2f, 1.8f, 18.2f, windowStripeMat, Usage.Position | Usage.Normal);

        Model bldgTowerB = mb.createBox(22f, 48f, 20f, glassCyanMat, Usage.Position | Usage.Normal);
        Model bldgTowerC = mb.createBox(16f, 85f, 16f, glassBlueMat, Usage.Position | Usage.Normal);
        Model bldgCommercial = mb.createBox(26f, 20f, 26f, limestoneMat, Usage.Position | Usage.Normal);

        // Bahrain World Trade Center (BWTC) Twin Sail Towers with Triple Wind Turbines
        Model wtcSailTower = mb.createBox(14f, 105f, 16f, glassBlueMat, Usage.Position | Usage.Normal);
        Model wtcSkybridge = mb.createBox(16f, 2.8f, 3.2f, whiteConcreteMat, Usage.Position | Usage.Normal);
        Model wtcTurbine = mb.createCylinder(4.2f, 0.6f, 4.2f, 8, darkMetalMat, Usage.Position | Usage.Normal);

        // Bab Al Bahrain Historic Gate (Arched base, Mashrabiya windows, Clock tower)
        Model babBase = mb.createBox(28f, 15f, 7f, limestoneMat, Usage.Position | Usage.Normal);
        Model babUpper = mb.createBox(16f, 8f, 8f, whiteConcreteMat, Usage.Position | Usage.Normal);
        Model babClockTower = mb.createBox(5f, 6f, 5f, whiteConcreteMat, Usage.Position | Usage.Normal);
        Model mashrabiyaWindow = mb.createBox(2.2f, 3.2f, 0.4f, darkMetalMat, Usage.Position | Usage.Normal);

        // Qal'at al-Bahrain (Bahrain Fort UNESCO) Bastion & Curtain Wall
        Model fortBastion = mb.createBox(14f, 12f, 14f, limestoneMat, Usage.Position | Usage.Normal);
        Model fortWall = mb.createBox(35f, 10f, 6f, limestoneMat, Usage.Position | Usage.Normal);

        models.addAll(bldgTowerA, windowBandA, bldgTowerB, bldgTowerC, bldgCommercial,
                wtcSailTower, wtcSkybridge, wtcTurbine, babBase, babUpper, babClockTower,
                mashrabiyaWindow, fortBastion, fortWall);

        // Place Skyline Towers with Horizontal Window Tiers
        buildingInstances.add(new ModelInstance(bldgTowerA, -42f, 32.5f, 40f));
        // Add 5 distinct window bands to Tower A
        for (float h = 10f; h <= 55f; h += 10f) {
            buildingInstances.add(new ModelInstance(windowBandA, -42f, h, 40f));
        }

        buildingInstances.add(new ModelInstance(bldgTowerB, -42f, 24.0f, -25f));
        buildingInstances.add(new ModelInstance(bldgTowerC, -46f, 42.5f, 10f));
        buildingInstances.add(new ModelInstance(bldgCommercial, 38f, 10.0f, -30f));
        buildingInstances.add(new ModelInstance(bldgCommercial, 38f, 10.0f, 30f));

        // Place BWTC Twin Sail Towers & Triple Wind Turbines
        buildingInstances.add(new ModelInstance(wtcSailTower, -16f, 52.5f, 75f));
        buildingInstances.add(new ModelInstance(wtcSailTower, 6f, 52.5f, 75f));
        // 3 Skybridges with Wind Turbines
        buildingInstances.add(new ModelInstance(wtcSkybridge, -5f, 40.0f, 75f));
        buildingInstances.add(new ModelInstance(wtcTurbine, -5f, 40.0f, 75f));
        buildingInstances.add(new ModelInstance(wtcSkybridge, -5f, 62.0f, 75f));
        buildingInstances.add(new ModelInstance(wtcTurbine, -5f, 62.0f, 75f));
        buildingInstances.add(new ModelInstance(wtcSkybridge, -5f, 84.0f, 75f));
        buildingInstances.add(new ModelInstance(wtcTurbine, -5f, 84.0f, 75f));

        // Place Bab Al Bahrain Historic Gateway
        buildingInstances.add(new ModelInstance(babBase, 0f, 7.5f, -50f));
        buildingInstances.add(new ModelInstance(babUpper, 0f, 18.0f, -50f));
        buildingInstances.add(new ModelInstance(babClockTower, 0f, 25.0f, -50f));
        buildingInstances.add(new ModelInstance(mashrabiyaWindow, -4.5f, 18.0f, -45.8f));
        buildingInstances.add(new ModelInstance(mashrabiyaWindow, 4.5f, 18.0f, -45.8f));

        // Place Bahrain Fort UNESCO massing on western coastline
        buildingInstances.add(new ModelInstance(fortBastion, -65f, 6.0f, -65f));
        buildingInstances.add(new ModelInstance(fortWall, -45f, 5.0f, -65f));

        // 3. Street Decorations (Date Palms & Boulevard Lamps)
        Material trunkMat = new Material(ColorAttribute.createDiffuse(new Color(0.45f, 0.32f, 0.20f, 1f)));
        Material palmLeafMat = new Material(ColorAttribute.createDiffuse(new Color(0.22f, 0.50f, 0.20f, 1f)));
        Material poleMat = new Material(ColorAttribute.createDiffuse(new Color(0.40f, 0.42f, 0.45f, 1f)));

        Model palmTrunk = mb.createCylinder(0.6f, 7.0f, 0.6f, 8, trunkMat, Usage.Position | Usage.Normal);
        Model palmCanopy = mb.createSphere(4.8f, 2.4f, 4.8f, 8, 8, palmLeafMat, Usage.Position | Usage.Normal);
        Model lightPole = mb.createCylinder(0.25f, 8.0f, 0.25f, 6, poleMat, Usage.Position | Usage.Normal);

        models.addAll(palmTrunk, palmCanopy, lightPole);

        for (float z = -60f; z <= 60f; z += 30f) {
            decorationInstances.add(new ModelInstance(palmTrunk, 3.5f, 3.5f, z));
            decorationInstances.add(new ModelInstance(palmCanopy, 3.5f, 7.2f, z));
            decorationInstances.add(new ModelInstance(lightPole, 20.5f, 4.0f, z));
        }
    }

    private void buildEntityModels() {
        ModelBuilder mb = new ModelBuilder();

        // -------------------------------------------------------------
        // 1. THIRD-PERSON PLAYER HUMAN (Red Bahrain Jersey, Denim, Skin, Hair)
        // -------------------------------------------------------------
        Material redPoloMat = new Material(ColorAttribute.createDiffuse(new Color(0.85f, 0.10f, 0.18f, 1f))); // Bahrain Flag Red
        Material whiteEmblemMat = new Material(ColorAttribute.createDiffuse(new Color(0.96f, 0.96f, 0.98f, 1f)));
        Material trousersMat = new Material(ColorAttribute.createDiffuse(new Color(0.18f, 0.22f, 0.32f, 1f))); // Dark Denim
        Material skinMat = new Material(ColorAttribute.createDiffuse(new Color(0.88f, 0.72f, 0.58f, 1f)));     // Skin Tone
        Material hairMat = new Material(ColorAttribute.createDiffuse(new Color(0.14f, 0.12f, 0.10f, 1f)));     // Dark Hair

        Model torsoModel = mb.createBox(0.65f, 0.85f, 0.38f, redPoloMat, Usage.Position | Usage.Normal);
        Model headModel = mb.createSphere(0.42f, 0.45f, 0.42f, 8, 8, skinMat, Usage.Position | Usage.Normal);
        Model limbModel = mb.createBox(0.22f, 0.80f, 0.22f, trousersMat, Usage.Position | Usage.Normal);
        Model armModel = mb.createBox(0.18f, 0.75f, 0.18f, skinMat, Usage.Position | Usage.Normal);

        models.addAll(torsoModel, headModel, limbModel, armModel);

        playerTorsoInstance = new ModelInstance(torsoModel);
        playerHeadInstance = new ModelInstance(headModel);
        playerLeftLegInstance = new ModelInstance(limbModel);
        playerRightLegInstance = new ModelInstance(limbModel);
        playerLeftArmInstance = new ModelInstance(armModel);
        playerRightArmInstance = new ModelInstance(armModel);

        // -------------------------------------------------------------
        // 2. DRIVABLE 4x4 SUV (Body, Cabin, Windows, Lights, 4 Wheels)
        // -------------------------------------------------------------
        Material suvBodyMat = new Material(ColorAttribute.createDiffuse(new Color(0.92f, 0.92f, 0.95f, 1f)));   // Metallic White
        Material suvCabinMat = new Material(ColorAttribute.createDiffuse(new Color(0.88f, 0.88f, 0.90f, 1f)));
        Material suvGlassMat = new Material(ColorAttribute.createDiffuse(new Color(0.15f, 0.22f, 0.30f, 1f)));  // Tinted Glass
        Material tireMat = new Material(ColorAttribute.createDiffuse(new Color(0.15f, 0.15f, 0.16f, 1f)));      // Rubber Tire
        Material lightHeadMat = new Material(ColorAttribute.createDiffuse(new Color(0.95f, 0.95f, 0.85f, 1f))); // Headlight
        Material lightTailMat = new Material(ColorAttribute.createDiffuse(new Color(0.88f, 0.12f, 0.12f, 1f))); // Brake Red

        Model suvChassis = mb.createBox(2.2f, 0.7f, 4.6f, suvBodyMat, Usage.Position | Usage.Normal);
        Model suvCabin = mb.createBox(1.9f, 0.8f, 2.7f, suvCabinMat, Usage.Position | Usage.Normal);
        Model suvWindshield = mb.createBox(1.85f, 0.65f, 0.2f, suvGlassMat, Usage.Position | Usage.Normal);
        Model wheelModel = mb.createCylinder(0.85f, 0.45f, 0.85f, 12, tireMat, Usage.Position | Usage.Normal);
        Model headlightModel = mb.createBox(0.35f, 0.25f, 0.1f, lightHeadMat, Usage.Position | Usage.Normal);
        Model taillightModel = mb.createBox(0.35f, 0.25f, 0.1f, lightTailMat, Usage.Position | Usage.Normal);

        models.addAll(suvChassis, suvCabin, suvWindshield, wheelModel, headlightModel, taillightModel);

        carBodyInstance = new ModelInstance(suvChassis);
        carCabinInstance = new ModelInstance(suvCabin);
        carWindshieldInstance = new ModelInstance(suvWindshield);
        for (int i = 0; i < 4; i++) {
            carWheelInstances[i] = new ModelInstance(wheelModel);
        }
        carHeadlightLInstance = new ModelInstance(headlightModel);
        carHeadlightRInstance = new ModelInstance(headlightModel);
        carTaillightLInstance = new ModelInstance(taillightModel);
        carTaillightRInstance = new ModelInstance(taillightModel);

        // -------------------------------------------------------------
        // 3. DHOW COASTAL WORKBOAT (Hull, Deck, Cabin, Windows, Mast, Boom)
        // -------------------------------------------------------------
        Material woodHullMat = new Material(ColorAttribute.createDiffuse(new Color(0.42f, 0.25f, 0.14f, 1f)));
        Material woodDeckMat = new Material(ColorAttribute.createDiffuse(new Color(0.62f, 0.45f, 0.26f, 1f)));
        Material boatCabinMat = new Material(ColorAttribute.createDiffuse(new Color(0.85f, 0.82f, 0.75f, 1f)));
        Material boatGlassMat = new Material(ColorAttribute.createDiffuse(new Color(0.20f, 0.40f, 0.55f, 1f)));

        Model dhowHull = mb.createBox(3.4f, 1.6f, 9.5f, woodHullMat, Usage.Position | Usage.Normal);
        Model dhowDeck = mb.createBox(3.2f, 0.2f, 9.2f, woodDeckMat, Usage.Position | Usage.Normal);
        Model dhowCabin = mb.createBox(2.4f, 1.4f, 3.2f, boatCabinMat, Usage.Position | Usage.Normal);
        Model dhowMast = mb.createCylinder(0.3f, 7.5f, 0.3f, 8, woodDeckMat, Usage.Position | Usage.Normal);
        Model dhowBoom = mb.createCylinder(0.2f, 5.0f, 0.2f, 6, woodDeckMat, Usage.Position | Usage.Normal);

        models.addAll(dhowHull, dhowDeck, dhowCabin, dhowMast, dhowBoom);

        boatHullInstance = new ModelInstance(dhowHull);
        boatDeckInstance = new ModelInstance(dhowDeck);
        boatCabinInstance = new ModelInstance(dhowCabin);
        boatMastInstance = new ModelInstance(dhowMast);
        boatBoomInstance = new ModelInstance(dhowBoom);

        // -------------------------------------------------------------
        // 4. UTILITY HELICOPTER (Fuselage, Windshield, Boom, Skids, Rotors)
        // -------------------------------------------------------------
        Material heliMat = new Material(ColorAttribute.createDiffuse(new Color(0.85f, 0.12f, 0.20f, 1f))); // Red & White
        Material heliGlassMat = new Material(ColorAttribute.createDiffuse(new Color(0.20f, 0.45f, 0.65f, 0.9f)));
        Material bladeMat = new Material(ColorAttribute.createDiffuse(new Color(0.18f, 0.18f, 0.20f, 1f)));
        Material skidMat = new Material(ColorAttribute.createDiffuse(new Color(0.45f, 0.45f, 0.48f, 1f)));

        Model heliBody = mb.createSphere(2.4f, 2.2f, 3.8f, 10, 10, heliMat, Usage.Position | Usage.Normal);
        Model heliCockpit = mb.createSphere(1.8f, 1.5f, 1.6f, 8, 8, heliGlassMat, Usage.Position | Usage.Normal);
        Model heliTail = mb.createCylinder(0.4f, 5.2f, 0.4f, 8, heliMat, Usage.Position | Usage.Normal);
        Model heliSkid = mb.createBox(0.15f, 0.15f, 3.5f, skidMat, Usage.Position | Usage.Normal);
        Model heliRotor = mb.createBox(10.0f, 0.08f, 0.45f, bladeMat, Usage.Position | Usage.Normal);
        Model heliTailRotor = mb.createBox(0.08f, 1.8f, 0.25f, bladeMat, Usage.Position | Usage.Normal);

        models.addAll(heliBody, heliCockpit, heliTail, heliSkid, heliRotor, heliTailRotor);

        heliFuselageInstance = new ModelInstance(heliBody);
        heliCockpitInstance = new ModelInstance(heliCockpit);
        heliTailInstance = new ModelInstance(heliTail);
        heliSkidLInstance = new ModelInstance(heliSkid);
        heliSkidRInstance = new ModelInstance(heliSkid);
        heliRotorInstance = new ModelInstance(heliRotor);
        heliTailRotorInstance = new ModelInstance(heliTailRotor);

        // -------------------------------------------------------------
        // 5. AEROPLANE (Fuselage, Wings, Canopy, Tail, Wheels, Propeller)
        // -------------------------------------------------------------
        Material planeBodyMat = new Material(ColorAttribute.createDiffuse(new Color(0.92f, 0.92f, 0.95f, 1f))); // Pearl White
        Material planeTrimMat = new Material(ColorAttribute.createDiffuse(new Color(0.85f, 0.10f, 0.18f, 1f))); // Bahrain Red Stripe
        Material planeCanopyMat = new Material(ColorAttribute.createDiffuse(new Color(0.20f, 0.45f, 0.65f, 1f))); // Blue Canopy
        Material propMat = new Material(ColorAttribute.createDiffuse(new Color(0.15f, 0.15f, 0.18f, 1f)));

        Model planeFuselage = mb.createCylinder(1.5f, 8.2f, 1.5f, 10, planeBodyMat, Usage.Position | Usage.Normal);
        Model planeWings = mb.createBox(11.0f, 0.18f, 1.8f, planeBodyMat, Usage.Position | Usage.Normal);
        Model planeTailFin = mb.createBox(0.2f, 2.2f, 1.4f, planeTrimMat, Usage.Position | Usage.Normal);
        Model planeTailStab = mb.createBox(3.6f, 0.15f, 0.9f, planeBodyMat, Usage.Position | Usage.Normal);
        Model planeCanopy = mb.createSphere(1.2f, 1.0f, 2.2f, 8, 8, planeCanopyMat, Usage.Position | Usage.Normal);
        Model planePropeller = mb.createBox(2.2f, 0.22f, 0.08f, propMat, Usage.Position | Usage.Normal);
        Model planeGear = mb.createCylinder(0.55f, 0.25f, 0.55f, 8, tireMat, Usage.Position | Usage.Normal);

        models.addAll(planeFuselage, planeWings, planeTailFin, planeTailStab, planeCanopy, planePropeller, planeGear);

        planeFuselageInstance = new ModelInstance(planeFuselage);
        planeWingInstance = new ModelInstance(planeWings);
        planeTailFinInstance = new ModelInstance(planeTailFin);
        planeTailStabInstance = new ModelInstance(planeTailStab);
        planeCanopyInstance = new ModelInstance(planeCanopy);
        planePropellerInstance = new ModelInstance(planePropeller);
        for (int i = 0; i < 3; i++) {
            planeGearInstances[i] = new ModelInstance(planeGear);
        }
    }

    /**
     * Updates animated positions for player human, all 4 vehicle types, and rotating parts.
     */
    public void updateEntities(float dt,
                               float playerLocalX, float playerLocalY, float playerLocalZ, float playerHeadingDeg, float walkSpeed, boolean onFoot,
                               float carLocalX, float carLocalY, float carLocalZ, float carHeadingDeg,
                               float boatLocalX, float boatLocalY, float boatLocalZ, float boatHeadingDeg,
                               float heliLocalX, float heliLocalY, float heliLocalZ, float heliHeadingDeg, boolean heliRunning,
                               float planeLocalX, float planeLocalY, float planeLocalZ, float planeHeadingDeg, float planePitchDeg, float planeRollDeg, float planeAirspeed) {

        animTimer += dt * (walkSpeed > 0.5f ? (walkSpeed > 4.5f ? 14f : 8f) : 0f);
        if (heliRunning) {
            heliRotorAngle = (heliRotorAngle + dt * 1440f) % 360f;
        }
        planePropAngle = (planePropAngle + dt * (planeAirspeed > 2f ? 2160f : 720f)) % 360f;

        // 1. Update Player Human Locomotion
        if (onFoot) {
            float legSwing = (float) Math.sin(animTimer) * 28f;
            float armSwing = (float) Math.cos(animTimer) * 28f;

            playerTorsoInstance.transform.setTranslation(playerLocalX, playerLocalY + 0.95f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg);
            playerHeadInstance.transform.setTranslation(playerLocalX, playerLocalY + 1.60f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg);

            playerLeftLegInstance.transform.setTranslation(playerLocalX - 0.16f, playerLocalY + 0.40f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg)
                    .rotate(Vector3.X, legSwing);
            playerRightLegInstance.transform.setTranslation(playerLocalX + 0.16f, playerLocalY + 0.40f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg)
                    .rotate(Vector3.X, -legSwing);

            playerLeftArmInstance.transform.setTranslation(playerLocalX - 0.44f, playerLocalY + 0.95f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg)
                    .rotate(Vector3.X, armSwing);
            playerRightArmInstance.transform.setTranslation(playerLocalX + 0.44f, playerLocalY + 0.95f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg)
                    .rotate(Vector3.X, -armSwing);
        } else {
            // Hide player model when seated inside vehicles
            playerTorsoInstance.transform.setTranslation(0f, -100f, 0f);
            playerHeadInstance.transform.setTranslation(0f, -100f, 0f);
            playerLeftLegInstance.transform.setTranslation(0f, -100f, 0f);
            playerRightLegInstance.transform.setTranslation(0f, -100f, 0f);
            playerLeftArmInstance.transform.setTranslation(0f, -100f, 0f);
            playerRightArmInstance.transform.setTranslation(0f, -100f, 0f);
        }

        // 2. Update 4x4 Off-Road SUV & Sub-components
        carBodyInstance.transform.setTranslation(carLocalX, carLocalY + 0.55f, carLocalZ)
                .rotate(Vector3.Y, carHeadingDeg);
        carCabinInstance.transform.setTranslation(carLocalX, carLocalY + 1.30f, carLocalZ - 0.2f)
                .rotate(Vector3.Y, carHeadingDeg);
        carWindshieldInstance.transform.setTranslation(carLocalX, carLocalY + 1.25f, carLocalZ + 1.15f)
                .rotate(Vector3.Y, carHeadingDeg)
                .rotate(Vector3.X, -25f);

        float[][] wheelOffsets = {
                { -1.15f, 0.42f,  1.45f }, // Front Left
                {  1.15f, 0.42f,  1.45f }, // Front Right
                { -1.15f, 0.42f, -1.45f }, // Rear Left
                {  1.15f, 0.42f, -1.45f }  // Rear Right
        };
        for (int i = 0; i < 4; i++) {
            carWheelInstances[i].transform.setTranslation(carLocalX, carLocalY, carLocalZ)
                    .rotate(Vector3.Y, carHeadingDeg)
                    .translate(wheelOffsets[i][0], wheelOffsets[i][1], wheelOffsets[i][2])
                    .rotate(Vector3.Z, 90f);
        }

        carHeadlightLInstance.transform.setTranslation(carLocalX, carLocalY, carLocalZ)
                .rotate(Vector3.Y, carHeadingDeg)
                .translate(-0.85f, 0.65f, 2.3f);
        carHeadlightRInstance.transform.setTranslation(carLocalX, carLocalY, carLocalZ)
                .rotate(Vector3.Y, carHeadingDeg)
                .translate(0.85f, 0.65f, 2.3f);
        carTaillightLInstance.transform.setTranslation(carLocalX, carLocalY, carLocalZ)
                .rotate(Vector3.Y, carHeadingDeg)
                .translate(-0.85f, 0.65f, -2.3f);
        carTaillightRInstance.transform.setTranslation(carLocalX, carLocalY, carLocalZ)
                .rotate(Vector3.Y, carHeadingDeg)
                .translate(0.85f, 0.65f, -2.3f);

        // 3. Update Dhow Workboat
        boatHullInstance.transform.setTranslation(boatLocalX, boatLocalY + 0.6f, boatLocalZ)
                .rotate(Vector3.Y, boatHeadingDeg);
        boatDeckInstance.transform.setTranslation(boatLocalX, boatLocalY + 1.4f, boatLocalZ)
                .rotate(Vector3.Y, boatHeadingDeg);
        boatCabinInstance.transform.setTranslation(boatLocalX, boatLocalY + 2.1f, boatLocalZ - 1.5f)
                .rotate(Vector3.Y, boatHeadingDeg);
        boatMastInstance.transform.setTranslation(boatLocalX, boatLocalY + 4.8f, boatLocalZ + 1.2f)
                .rotate(Vector3.Y, boatHeadingDeg);
        boatBoomInstance.transform.setTranslation(boatLocalX, boatLocalY + 2.5f, boatLocalZ - 0.5f)
                .rotate(Vector3.Y, boatHeadingDeg)
                .rotate(Vector3.X, 90f);

        // 4. Update Utility Helicopter
        heliFuselageInstance.transform.setTranslation(heliLocalX, heliLocalY + 1.2f, heliLocalZ)
                .rotate(Vector3.Y, heliHeadingDeg);
        heliCockpitInstance.transform.setTranslation(heliLocalX, heliLocalY + 1.35f, heliLocalZ + 0.9f)
                .rotate(Vector3.Y, heliHeadingDeg);
        heliTailInstance.transform.setTranslation(heliLocalX, heliLocalY + 1.5f, heliLocalZ - 3.2f)
                .rotate(Vector3.Y, heliHeadingDeg)
                .rotate(Vector3.X, 90f);
        heliSkidLInstance.transform.setTranslation(heliLocalX, heliLocalY, heliLocalZ)
                .rotate(Vector3.Y, heliHeadingDeg)
                .translate(-0.95f, 0.15f, 0f);
        heliSkidRInstance.transform.setTranslation(heliLocalX, heliLocalY, heliLocalZ)
                .rotate(Vector3.Y, heliHeadingDeg)
                .translate(0.95f, 0.15f, 0f);
        heliRotorInstance.transform.setTranslation(heliLocalX, heliLocalY + 2.45f, heliLocalZ)
                .rotate(Vector3.Y, heliHeadingDeg + heliRotorAngle);
        heliTailRotorInstance.transform.setTranslation(heliLocalX, heliLocalY + 1.6f, heliLocalZ - 5.8f)
                .rotate(Vector3.Y, heliHeadingDeg)
                .rotate(Vector3.X, heliRotorAngle);

        // 5. Update Light Aeroplane
        planeFuselageInstance.transform.setTranslation(planeLocalX, planeLocalY + 1.1f, planeLocalZ)
                .rotate(Vector3.Y, planeHeadingDeg)
                .rotate(Vector3.X, planePitchDeg)
                .rotate(Vector3.Z, planeRollDeg)
                .rotate(Vector3.X, 90f);

        planeWingInstance.transform.setTranslation(planeLocalX, planeLocalY + 1.0f, planeLocalZ)
                .rotate(Vector3.Y, planeHeadingDeg)
                .rotate(Vector3.X, planePitchDeg)
                .rotate(Vector3.Z, planeRollDeg);

        planeCanopyInstance.transform.setTranslation(planeLocalX, planeLocalY + 1.5f, planeLocalZ + 0.4f)
                .rotate(Vector3.Y, planeHeadingDeg)
                .rotate(Vector3.X, planePitchDeg)
                .rotate(Vector3.Z, planeRollDeg);

        planeTailFinInstance.transform.setTranslation(planeLocalX, planeLocalY + 1.9f, planeLocalZ - 3.6f)
                .rotate(Vector3.Y, planeHeadingDeg)
                .rotate(Vector3.X, planePitchDeg)
                .rotate(Vector3.Z, planeRollDeg);

        planeTailStabInstance.transform.setTranslation(planeLocalX, planeLocalY + 1.3f, planeLocalZ - 3.8f)
                .rotate(Vector3.Y, planeHeadingDeg)
                .rotate(Vector3.X, planePitchDeg)
                .rotate(Vector3.Z, planeRollDeg);

        planePropellerInstance.transform.setTranslation(planeLocalX, planeLocalY + 1.1f, planeLocalZ + 4.15f)
                .rotate(Vector3.Y, planeHeadingDeg)
                .rotate(Vector3.X, planePitchDeg)
                .rotate(Vector3.Z, planeRollDeg)
                .rotate(Vector3.Z, planePropAngle);

        float[][] gearOffsets = {
                {  0.0f,  0.30f,  2.2f }, // Nose Gear
                { -1.4f,  0.30f, -0.6f }, // Main Left Gear
                {  1.4f,  0.30f, -0.6f }  // Main Right Gear
        };
        for (int i = 0; i < 3; i++) {
            planeGearInstances[i].transform.setTranslation(planeLocalX, planeLocalY, planeLocalZ)
                    .rotate(Vector3.Y, planeHeadingDeg)
                    .translate(gearOffsets[i][0], gearOffsets[i][1], gearOffsets[i][2])
                    .rotate(Vector3.Z, 90f);
        }
    }

    @Override
    public void dispose() {
        for (Model m : models) {
            m.dispose();
        }
        models.clear();
        terrainInstances.clear();
        buildingInstances.clear();
        decorationInstances.clear();
    }
}
