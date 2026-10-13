package ai.example.bahrain.islandkingdom.render;

import com.badlogic.gdx.graphics.Color;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.VertexAttributes.Usage;
import com.badlogic.gdx.graphics.g3d.Material;
import com.badlogic.gdx.graphics.g3d.Model;
import com.badlogic.gdx.graphics.g3d.ModelInstance;
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute;
import com.badlogic.gdx.graphics.g3d.utils.ModelBuilder;
import com.badlogic.gdx.math.Matrix4;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.Disposable;

/**
 * Procedural 3D World Geometry and Entity Meshes for Bahrain.
 * Implements a low-poly open-world aesthetic inspired by classic 3D sandboxes:
 * - Island terrain tiles (sand, city concrete, roads, turquoise Gulf water).
 * - Manama skyline (commercial high-rises, Bahrain World Trade Center twin sail towers).
 * - Historic architecture (Bab Al Bahrain gate arch, coastal fort massing).
 * - 3D drivable vehicles (4x4 off-road SUV, coastal dhow boat, utility helicopter).
 * - 3D third-person player character with animated locomotion.
 */
public class ProceduralWorldMesh implements Disposable {

    private final Array<Model> models = new Array<>();
    public final Array<ModelInstance> terrainInstances = new Array<>();
    public final Array<ModelInstance> buildingInstances = new Array<>();
    public final Array<ModelInstance> decorationInstances = new Array<>();

    // Entity Model Instances
    public ModelInstance playerTorsoInstance;
    public ModelInstance playerHeadInstance;
    public ModelInstance playerLeftArmInstance;
    public ModelInstance playerRightArmInstance;
    public ModelInstance playerLeftLegInstance;
    public ModelInstance playerRightLegInstance;

    public ModelInstance carBodyInstance;
    public ModelInstance[] carWheelInstances = new ModelInstance[4];

    public ModelInstance boatHullInstance;
    public ModelInstance boatCabinInstance;
    public ModelInstance boatMastInstance;

    public ModelInstance heliFuselageInstance;
    public ModelInstance heliTailInstance;
    public ModelInstance heliRotorInstance;

    private float animTimer = 0.0f;
    private float heliRotorAngle = 0.0f;

    public ProceduralWorldMesh() {
        buildWorldGeometry();
        buildEntityModels();
    }

    private void buildWorldGeometry() {
        ModelBuilder mb = new ModelBuilder();

        // 1. Terrain Ground Slabs (Sand & City Concrete)
        Material sandMat = new Material(ColorAttribute.createDiffuse(new Color(0.83f, 0.72f, 0.53f, 1f)));
        Material cityPavingMat = new Material(ColorAttribute.createDiffuse(new Color(0.55f, 0.58f, 0.62f, 1f)));
        Material waterMat = new Material(ColorAttribute.createDiffuse(new Color(0.12f, 0.45f, 0.65f, 0.85f)));
        Material roadMat = new Material(ColorAttribute.createDiffuse(new Color(0.20f, 0.20f, 0.22f, 1f)));
        Material roadLineMat = new Material(ColorAttribute.createDiffuse(new Color(0.95f, 0.95f, 0.90f, 1f)));

        Model sandChunk = mb.createBox(120f, 0.5f, 120f, sandMat, Usage.Position | Usage.Normal);
        Model cityPlaza = mb.createBox(80f, 0.6f, 80f, cityPavingMat, Usage.Position | Usage.Normal);
        Model waterPlane = mb.createBox(400f, 0.2f, 400f, waterMat, Usage.Position | Usage.Normal);
        Model roadStraight = mb.createBox(14f, 0.65f, 120f, roadMat, Usage.Position | Usage.Normal);
        Model roadLine = mb.createBox(0.4f, 0.68f, 110f, roadLineMat, Usage.Position | Usage.Normal);

        models.addAll(sandChunk, cityPlaza, waterPlane, roadStraight, roadLine);

        // Position ground layers relative to player spawn origin (0, 0, 0)
        ModelInstance groundInst = new ModelInstance(sandChunk, 0f, -0.25f, 0f);
        ModelInstance plazaInst = new ModelInstance(cityPlaza, 0f, -0.2f, 0f);
        ModelInstance waterInst = new ModelInstance(waterPlane, 100f, -1.8f, 80f);
        ModelInstance roadInst1 = new ModelInstance(roadStraight, 12f, -0.15f, 0f);
        ModelInstance roadLineInst1 = new ModelInstance(roadLine, 12f, -0.12f, 0f);
        ModelInstance roadInst2 = new ModelInstance(roadStraight, -18f, -0.15f, 0f);

        terrainInstances.addAll(groundInst, plazaInst, waterInst, roadInst1, roadLineInst1, roadInst2);

        // 2. City High-Rises & Manama Landmarks
        Material towerGlassMat1 = new Material(ColorAttribute.createDiffuse(new Color(0.25f, 0.45f, 0.55f, 1f)));
        Material towerGlassMat2 = new Material(ColorAttribute.createDiffuse(new Color(0.35f, 0.50f, 0.60f, 1f)));
        Material whiteConcreteMat = new Material(ColorAttribute.createDiffuse(new Color(0.90f, 0.90f, 0.92f, 1f)));
        Material limestoneMat = new Material(ColorAttribute.createDiffuse(new Color(0.78f, 0.68f, 0.52f, 1f)));
        Material darkRoofMat = new Material(ColorAttribute.createDiffuse(new Color(0.30f, 0.32f, 0.35f, 1f)));

        Model bldgTowerA = mb.createBox(18f, 65f, 18f, towerGlassMat1, Usage.Position | Usage.Normal);
        Model bldgTowerB = mb.createBox(22f, 48f, 20f, towerGlassMat2, Usage.Position | Usage.Normal);
        Model bldgTowerC = mb.createBox(16f, 80f, 16f, whiteConcreteMat, Usage.Position | Usage.Normal);
        Model bldgCommercial = mb.createBox(25f, 18f, 25f, limestoneMat, Usage.Position | Usage.Normal);

        // Bahrain World Trade Center (BWTC) Twin Towers & Skybridges
        Model wtcTower = mb.createBox(12f, 95f, 14f, towerGlassMat1, Usage.Position | Usage.Normal);
        Model wtcBridge = mb.createBox(16f, 2.5f, 3.5f, whiteConcreteMat, Usage.Position | Usage.Normal);

        // Bab Al Bahrain Historic Gate Archway
        Model babBase = mb.createBox(26f, 14f, 6f, limestoneMat, Usage.Position | Usage.Normal);
        Model babTop = mb.createBox(14f, 6f, 7f, whiteConcreteMat, Usage.Position | Usage.Normal);

        models.addAll(bldgTowerA, bldgTowerB, bldgTowerC, bldgCommercial, wtcTower, wtcBridge, babBase, babTop);

        // Place Skyline Buildings around Manama Core
        buildingInstances.add(new ModelInstance(bldgTowerA, -40f, 32.5f, 40f));
        buildingInstances.add(new ModelInstance(bldgTowerB, -40f, 24.0f, -25f));
        buildingInstances.add(new ModelInstance(bldgTowerC, -45f, 40.0f, 10f));
        buildingInstances.add(new ModelInstance(bldgCommercial, 35f, 9.0f, -30f));
        buildingInstances.add(new ModelInstance(bldgCommercial, 35f, 9.0f, 25f));

        // Position BWTC Twin Towers & Connecting Bridges
        buildingInstances.add(new ModelInstance(wtcTower, -15f, 47.5f, 65f));
        buildingInstances.add(new ModelInstance(wtcTower, 5f, 47.5f, 65f));
        buildingInstances.add(new ModelInstance(wtcBridge, -5f, 35.0f, 65f));
        buildingInstances.add(new ModelInstance(wtcBridge, -5f, 55.0f, 65f));
        buildingInstances.add(new ModelInstance(wtcBridge, -5f, 75.0f, 65f));

        // Position Bab Al Bahrain Gateway Arch
        buildingInstances.add(new ModelInstance(babBase, 0f, 7.0f, -45f));
        buildingInstances.add(new ModelInstance(babTop, 0f, 17.0f, -45f));

        // 3. Street Decorations (Palm Trees & Streetlights)
        Material trunkMat = new Material(ColorAttribute.createDiffuse(new Color(0.45f, 0.32f, 0.20f, 1f)));
        Material palmLeafMat = new Material(ColorAttribute.createDiffuse(new Color(0.22f, 0.50f, 0.20f, 1f)));
        Material poleMat = new Material(ColorAttribute.createDiffuse(new Color(0.40f, 0.42f, 0.45f, 1f)));

        Model palmTrunk = mb.createCylinder(0.6f, 6.5f, 0.6f, 8, trunkMat, Usage.Position | Usage.Normal);
        Model palmCanopy = mb.createSphere(4.5f, 2.2f, 4.5f, 8, 8, palmLeafMat, Usage.Position | Usage.Normal);
        Model lightPole = mb.createCylinder(0.25f, 7.5f, 0.25f, 6, poleMat, Usage.Position | Usage.Normal);

        models.addAll(palmTrunk, palmCanopy, lightPole);

        // Place rows of palms and streetlamps along the boulevard
        for (float z = -50f; z <= 50f; z += 25f) {
            decorationInstances.add(new ModelInstance(palmTrunk, 4.5f, 3.25f, z));
            decorationInstances.add(new ModelInstance(palmCanopy, 4.5f, 6.8f, z));
            decorationInstances.add(new ModelInstance(lightPole, 18.5f, 3.75f, z));
        }
    }

    private void buildEntityModels() {
        ModelBuilder mb = new ModelBuilder();

        // 1. Third-Person Player Human Model
        Material redPoloMat = new Material(ColorAttribute.createDiffuse(new Color(0.78f, 0.08f, 0.18f, 1f))); // Bahrain Flag Red
        Material trousersMat = new Material(ColorAttribute.createDiffuse(new Color(0.18f, 0.22f, 0.32f, 1f))); // Dark Denim
        Material skinMat = new Material(ColorAttribute.createDiffuse(new Color(0.88f, 0.72f, 0.58f, 1f)));     // Skin Tone
        Material hairMat = new Material(ColorAttribute.createDiffuse(new Color(0.15f, 0.12f, 0.10f, 1f)));     // Dark Hair

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

        // 2. Drivable 4x4 Off-Road SUV (Land Cruiser Aesthetic)
        Material suvBodyMat = new Material(ColorAttribute.createDiffuse(new Color(0.92f, 0.92f, 0.95f, 1f)));  // Metallic White
        Material suvGlassMat = new Material(ColorAttribute.createDiffuse(new Color(0.15f, 0.20f, 0.28f, 1f))); // Tinted Windows
        Material tireMat = new Material(ColorAttribute.createDiffuse(new Color(0.15f, 0.15f, 0.16f, 1f)));     // Rubber
        Material rimMat = new Material(ColorAttribute.createDiffuse(new Color(0.75f, 0.75f, 0.78f, 1f)));      // Alloy

        Model suvChassis = mb.createBox(2.2f, 1.4f, 4.6f, suvBodyMat, Usage.Position | Usage.Normal);
        Model wheelModel = mb.createCylinder(0.85f, 0.45f, 0.85f, 12, tireMat, Usage.Position | Usage.Normal);

        models.addAll(suvChassis, wheelModel);

        carBodyInstance = new ModelInstance(suvChassis);
        for (int i = 0; i < 4; i++) {
            carWheelInstances[i] = new ModelInstance(wheelModel);
        }

        // 3. Dhow Coastal Workboat Model
        Material woodHullMat = new Material(ColorAttribute.createDiffuse(new Color(0.45f, 0.28f, 0.15f, 1f)));
        Material woodDeckMat = new Material(ColorAttribute.createDiffuse(new Color(0.65f, 0.48f, 0.28f, 1f)));
        Material sailMat = new Material(ColorAttribute.createDiffuse(new Color(0.92f, 0.90f, 0.82f, 1f)));

        Model dhowHull = mb.createBox(3.4f, 1.8f, 9.5f, woodHullMat, Usage.Position | Usage.Normal);
        Model dhowCabin = mb.createBox(2.6f, 1.4f, 3.2f, woodDeckMat, Usage.Position | Usage.Normal);
        Model dhowMast = mb.createCylinder(0.3f, 7.5f, 0.3f, 8, woodDeckMat, Usage.Position | Usage.Normal);

        models.addAll(dhowHull, dhowCabin, dhowMast);

        boatHullInstance = new ModelInstance(dhowHull);
        boatCabinInstance = new ModelInstance(dhowCabin);
        boatMastInstance = new ModelInstance(dhowMast);

        // 4. Utility Helicopter Model
        Material heliMat = new Material(ColorAttribute.createDiffuse(new Color(0.85f, 0.12f, 0.20f, 1f))); // Red & White Search/Rescue
        Material bladeMat = new Material(ColorAttribute.createDiffuse(new Color(0.18f, 0.18f, 0.20f, 1f)));

        Model heliBody = mb.createSphere(2.4f, 2.2f, 3.8f, 10, 10, heliMat, Usage.Position | Usage.Normal);
        Model heliTail = mb.createCylinder(0.4f, 5.0f, 0.4f, 8, heliMat, Usage.Position | Usage.Normal);
        Model heliRotor = mb.createBox(9.5f, 0.08f, 0.45f, bladeMat, Usage.Position | Usage.Normal);

        models.addAll(heliBody, heliTail, heliRotor);

        heliFuselageInstance = new ModelInstance(heliBody);
        heliTailInstance = new ModelInstance(heliTail);
        heliRotorInstance = new ModelInstance(heliRotor);
    }

    /**
     * Updates animated positions for player human, vehicles, and rotating components.
     */
    public void updateEntities(float dt,
                               float playerLocalX, float playerLocalY, float playerLocalZ, float playerHeadingDeg, float walkSpeed, boolean onFoot,
                               float carLocalX, float carLocalY, float carLocalZ, float carHeadingDeg,
                               float boatLocalX, float boatLocalY, float boatLocalZ, float boatHeadingDeg,
                               float heliLocalX, float heliLocalY, float heliLocalZ, float heliHeadingDeg, boolean heliRunning) {
        animTimer += dt * (walkSpeed > 0.5f ? (walkSpeed > 4.5f ? 14f : 8f) : 0f);
        if (heliRunning) {
            heliRotorAngle = (heliRotorAngle + dt * 1440f) % 360f;
        }

        // 1. Update Player Human Locomotion
        if (onFoot) {
            float legSwing = (float) Math.sin(animTimer) * 28f;
            float armSwing = (float) Math.cos(animTimer) * 28f;

            // Torso & Head
            playerTorsoInstance.transform.setTranslation(playerLocalX, playerLocalY + 0.95f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg);
            playerHeadInstance.transform.setTranslation(playerLocalX, playerLocalY + 1.60f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg);

            // Left & Right Legs
            playerLeftLegInstance.transform.setTranslation(playerLocalX - 0.16f, playerLocalY + 0.40f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg)
                    .rotate(Vector3.X, legSwing);
            playerRightLegInstance.transform.setTranslation(playerLocalX + 0.16f, playerLocalY + 0.40f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg)
                    .rotate(Vector3.X, -legSwing);

            // Left & Right Arms
            playerLeftArmInstance.transform.setTranslation(playerLocalX - 0.44f, playerLocalY + 0.95f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg)
                    .rotate(Vector3.X, armSwing);
            playerRightArmInstance.transform.setTranslation(playerLocalX + 0.44f, playerLocalY + 0.95f, playerLocalZ)
                    .rotate(Vector3.Y, playerHeadingDeg)
                    .rotate(Vector3.X, -armSwing);
        } else {
            // Hide player under the car floor when driving
            playerTorsoInstance.transform.setTranslation(0f, -100f, 0f);
            playerHeadInstance.transform.setTranslation(0f, -100f, 0f);
            playerLeftLegInstance.transform.setTranslation(0f, -100f, 0f);
            playerRightLegInstance.transform.setTranslation(0f, -100f, 0f);
            playerLeftArmInstance.transform.setTranslation(0f, -100f, 0f);
            playerRightArmInstance.transform.setTranslation(0f, -100f, 0f);
        }

        // 2. Update 4x4 Off-Road SUV
        carBodyInstance.transform.setTranslation(carLocalX, carLocalY + 0.85f, carLocalZ)
                .rotate(Vector3.Y, carHeadingDeg);

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

        // 3. Update Dhow Workboat
        boatHullInstance.transform.setTranslation(boatLocalX, boatLocalY + 0.6f, boatLocalZ)
                .rotate(Vector3.Y, boatHeadingDeg);
        boatCabinInstance.transform.setTranslation(boatLocalX, boatLocalY + 1.8f, boatLocalZ - 1.5f)
                .rotate(Vector3.Y, boatHeadingDeg);
        boatMastInstance.transform.setTranslation(boatLocalX, boatLocalY + 4.2f, boatLocalZ + 1.2f)
                .rotate(Vector3.Y, boatHeadingDeg);

        // 4. Update Utility Helicopter
        heliFuselageInstance.transform.setTranslation(heliLocalX, heliLocalY + 1.2f, heliLocalZ)
                .rotate(Vector3.Y, heliHeadingDeg);
        heliTailInstance.transform.setTranslation(heliLocalX, heliLocalY + 1.5f, heliLocalZ - 3.2f)
                .rotate(Vector3.Y, heliHeadingDeg)
                .rotate(Vector3.X, 90f);
        heliRotorInstance.transform.setTranslation(heliLocalX, heliLocalY + 2.45f, heliLocalZ)
                .rotate(Vector3.Y, heliHeadingDeg + heliRotorAngle);
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
