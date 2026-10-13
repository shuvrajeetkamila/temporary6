import * as THREE from 'three';

/**
 * Detailed 3D Body and Parts Factory for all 5 Bahrain Entities:
 * 1. Human (Jersey, trousers, shoes, head, articulated limbs)
 * 2. Car (4x4 SUV chassis, cabin, tinted glass, headlights, taillights, 4 wheels)
 * 3. Boat (Traditional Dhow wood hull, deck, cabin, mast, boom)
 * 4. Aeroplane (Fuselage, wings, canopy, tail fin, wheels, spinning propeller)
 * 5. Helicopter (Bubble fuselage, skids, tail boom, main & tail rotors)
 */

export function createHumanModel() {
  const group = new THREE.Group();

  // Materials
  const redJerseyMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.6 }); // Bahrain Flag Red
  const whiteCrestMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const denimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69, roughness: 0.7 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

  // 1. Torso & Jersey
  const torsoGeo = new THREE.BoxGeometry(0.55, 0.75, 0.32);
  const torsoMesh = new THREE.Mesh(torsoGeo, redJerseyMat);
  torsoMesh.position.y = 0.95;
  group.add(torsoMesh);

  // White chevron crest on chest
  const crestGeo = new THREE.BoxGeometry(0.3, 0.12, 0.02);
  const crestMesh = new THREE.Mesh(crestGeo, whiteCrestMat);
  crestMesh.position.set(0, 1.1, 0.17);
  group.add(crestMesh);

  // 2. Head & Hair
  const headGeo = new THREE.SphereGeometry(0.2, 16, 16);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 1.5;
  group.add(headMesh);

  const hairGeo = new THREE.SphereGeometry(0.21, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
  const hairMesh = new THREE.Mesh(hairGeo, hairMat);
  hairMesh.position.y = 1.52;
  group.add(hairMesh);

  // 3. Articulated Legs
  const legGeo = new THREE.BoxGeometry(0.18, 0.7, 0.2);
  const shoeGeo = new THREE.BoxGeometry(0.19, 0.12, 0.3);

  // Left Leg Pivot
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.16, 0.65, 0);
  const leftLeg = new THREE.Mesh(legGeo, denimMat);
  leftLeg.position.y = -0.35;
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, -0.68, 0.04);
  leftLegPivot.add(leftLeg, leftShoe);
  group.add(leftLegPivot);

  // Right Leg Pivot
  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.16, 0.65, 0);
  const rightLeg = new THREE.Mesh(legGeo, denimMat);
  rightLeg.position.y = -0.35;
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, -0.68, 0.04);
  rightLegPivot.add(rightLeg, rightShoe);
  group.add(rightLegPivot);

  // 4. Articulated Arms
  const armGeo = new THREE.BoxGeometry(0.14, 0.65, 0.16);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.36, 1.25, 0);
  const leftArm = new THREE.Mesh(armGeo, skinMat);
  leftArm.position.y = -0.32;
  leftArmPivot.add(leftArm);
  group.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.36, 1.25, 0);
  const rightArm = new THREE.Mesh(armGeo, skinMat);
  rightArm.position.y = -0.32;
  rightArmPivot.add(rightArm);
  group.add(rightArmPivot);

  group.userData = { leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot };
  return group;
}

export function createCarModel() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.4 }); // Pearl White
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, transmission: 0.7, thickness: 0.5 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
  const lightHeadMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 0.8 });
  const lightTailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.8 });

  // Chassis lower body
  const chassisGeo = new THREE.BoxGeometry(2.1, 0.65, 4.4);
  const chassisMesh = new THREE.Mesh(chassisGeo, bodyMat);
  chassisMesh.position.y = 0.65;
  group.add(chassisMesh);

  // Cabin upper superstructure
  const cabinGeo = new THREE.BoxGeometry(1.85, 0.75, 2.6);
  const cabinMesh = new THREE.Mesh(cabinGeo, bodyMat);
  cabinMesh.position.set(0, 1.35, -0.2);
  group.add(cabinMesh);

  // Tinted Windshield
  const windshieldGeo = new THREE.BoxGeometry(1.78, 0.6, 0.1);
  const windshield = new THREE.Mesh(windshieldGeo, glassMat);
  windshield.position.set(0, 1.3, 1.15);
  windshield.rotation.x = -Math.PI * 0.12;
  group.add(windshield);

  // Side & rear windows
  const rearWindowGeo = new THREE.BoxGeometry(1.78, 0.55, 0.1);
  const rearWindow = new THREE.Mesh(rearWindowGeo, glassMat);
  rearWindow.position.set(0, 1.35, -1.52);
  group.add(rearWindow);

  // Roof luggage rack
  const rackGeo = new THREE.BoxGeometry(1.4, 0.08, 2.0);
  const rackMesh = new THREE.Mesh(rackGeo, trimMat);
  rackMesh.position.set(0, 1.78, -0.2);
  group.add(rackMesh);

  // Headlights
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.08), lightHeadMat);
  headL.position.set(-0.75, 0.72, 2.22);
  const headR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.08), lightHeadMat);
  headR.position.set(0.75, 0.72, 2.22);
  group.add(headL, headR);

  // Taillights
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.08), lightTailMat);
  tailL.position.set(-0.75, 0.72, -2.22);
  const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.08), lightTailMat);
  tailR.position.set(0.75, 0.72, -2.22);
  group.add(tailL, tailR);

  // 4 Wheels
  const wheelMeshes = [];
  const wheelOffsets = [
    [-1.05, 0.42,  1.35], // Front Left
    [ 1.05, 0.42,  1.35], // Front Right
    [-1.05, 0.42, -1.35], // Rear Left
    [ 1.05, 0.42, -1.35]  // Rear Right
  ];

  wheelOffsets.forEach(([wx, wy, wz]) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, wy, wz);

    const tireGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 18);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, tireMat);

    const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.34, 12);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, rimMat);

    wheelGroup.add(tire, rim);
    group.add(wheelGroup);
    wheelMeshes.push(wheelGroup);
  });

  group.userData = { wheelMeshes };
  return group;
}

export function createBoatModel() {
  const group = new THREE.Group();

  const woodHullMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.7 }); // Teak wood
  const woodDeckMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
  const cabinMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4 });
  const cabinGlassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2 });

  // Curved Dhow Hull
  const hullGeo = new THREE.BoxGeometry(3.2, 1.4, 8.8);
  const hullMesh = new THREE.Mesh(hullGeo, woodHullMat);
  hullMesh.position.y = 0.55;
  group.add(hullMesh);

  // Pointed Bow (Prow)
  const bowGeo = new THREE.ConeGeometry(1.6, 2.6, 4);
  bowGeo.rotateX(Math.PI / 2);
  const bowMesh = new THREE.Mesh(bowGeo, woodHullMat);
  bowMesh.position.set(0, 0.65, 4.8);
  bowMesh.scale.set(1.0, 0.6, 1.0);
  group.add(bowMesh);

  // Deck floor
  const deckGeo = new THREE.BoxGeometry(3.0, 0.15, 8.4);
  const deckMesh = new THREE.Mesh(deckGeo, woodDeckMat);
  deckMesh.position.y = 1.3;
  group.add(deckMesh);

  // Wheelhouse Cabin
  const cabinGeo = new THREE.BoxGeometry(2.3, 1.4, 3.2);
  const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
  cabinMesh.position.set(0, 2.0, -1.2);
  group.add(cabinMesh);

  // Cabin Windows
  const winFront = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.05), cabinGlassMat);
  winFront.position.set(0, 2.2, 0.42);
  group.add(winFront);

  // Wooden Mast
  const mastGeo = new THREE.CylinderGeometry(0.12, 0.15, 6.8, 10);
  const mastMesh = new THREE.Mesh(mastGeo, woodDeckMat);
  mastMesh.position.set(0, 4.4, 1.4);
  group.add(mastMesh);

  // Angled Boom
  const boomGeo = new THREE.CylinderGeometry(0.08, 0.08, 5.2, 8);
  boomGeo.rotateX(Math.PI * 0.45);
  const boomMesh = new THREE.Mesh(boomGeo, woodDeckMat);
  boomMesh.position.set(0, 3.6, -0.6);
  group.add(boomMesh);

  return group;
}

export function createPlaneModel() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.3 }); // White fuselage
  const redStripeMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.4 });             // Bahrain Red
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, transmission: 0.8, roughness: 0.1 });
  const propMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });

  // Aerodynamic Fuselage
  const fuseGeo = new THREE.CylinderGeometry(0.75, 0.6, 7.8, 16);
  fuseGeo.rotateX(Math.PI / 2);
  const fuseMesh = new THREE.Mesh(fuseGeo, bodyMat);
  fuseMesh.position.y = 1.1;
  group.add(fuseMesh);

  // Bahrain Red Racing Stripe
  const stripeGeo = new THREE.CylinderGeometry(0.76, 0.61, 7.8, 16, 1, true, 0, Math.PI * 0.25);
  stripeGeo.rotateX(Math.PI / 2);
  const stripeMesh = new THREE.Mesh(stripeGeo, redStripeMat);
  stripeMesh.position.y = 1.1;
  group.add(stripeMesh);

  // Cockpit Canopy Glass
  const canopyGeo = new THREE.SphereGeometry(0.7, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const canopyMesh = new THREE.Mesh(canopyGeo, glassMat);
  canopyMesh.position.set(0, 1.45, 0.5);
  canopyMesh.scale.set(0.9, 0.8, 1.8);
  group.add(canopyMesh);

  // Main Low-Mounted Wings
  const wingGeo = new THREE.BoxGeometry(10.5, 0.16, 1.6);
  const wingMesh = new THREE.Mesh(wingGeo, bodyMat);
  wingMesh.position.set(0, 0.95, 0.2);
  group.add(wingMesh);

  // Vertical Tail Fin
  const finGeo = new THREE.BoxGeometry(0.14, 1.8, 1.2);
  const finMesh = new THREE.Mesh(finGeo, redStripeMat);
  finMesh.position.set(0, 2.0, -3.4);
  group.add(finMesh);

  // Horizontal Stabilizer
  const stabGeo = new THREE.BoxGeometry(3.6, 0.12, 0.8);
  const stabMesh = new THREE.Mesh(stabGeo, bodyMat);
  stabMesh.position.set(0, 1.3, -3.5);
  group.add(stabMesh);

  // Spinning Nose Propeller
  const propHub = new THREE.Group();
  propHub.position.set(0, 1.1, 3.95);

  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.45, 12), redStripeMat);
  spinner.rotateX(Math.PI / 2);
  propHub.add(spinner);

  const bladeGeo = new THREE.BoxGeometry(2.1, 0.18, 0.04);
  const blades = new THREE.Mesh(bladeGeo, propMat);
  propHub.add(blades);
  group.add(propHub);

  // 3 Tricycle Landing Wheels
  const gearOffsets = [
    [ 0.0,  0.3,  2.2], // Nose Gear
    [-1.3,  0.3, -0.4], // Main Left
    [ 1.3,  0.3, -0.4]  // Main Right
  ];
  gearOffsets.forEach(([gx, gy, gz]) => {
    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(gx, gy, gz);
    group.add(wheel);
  });

  group.userData = { propHub };
  return group;
}

export function createHelicopterModel() {
  const group = new THREE.Group();

  const heliRedMat = new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.3 }); // Search/Rescue Red
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0284c7, transmission: 0.8, roughness: 0.1 });
  const rotorMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
  const skidMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 });

  // Rounded Bubble Fuselage
  const fuseGeo = new THREE.SphereGeometry(1.35, 16, 16);
  fuseGeo.scale(1.0, 1.0, 1.6);
  const fuseMesh = new THREE.Mesh(fuseGeo, heliRedMat);
  fuseMesh.position.y = 1.35;
  group.add(fuseMesh);

  // Cockpit Glass Windshield
  const glassGeo = new THREE.SphereGeometry(1.28, 16, 16, 0, Math.PI, 0, Math.PI * 0.7);
  glassGeo.rotateX(-Math.PI * 0.3);
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(0, 1.38, 0.6);
  group.add(glassMesh);

  // Tail Boom
  const tailGeo = new THREE.CylinderGeometry(0.22, 0.12, 4.8, 10);
  tailGeo.rotateX(Math.PI / 2);
  const tailMesh = new THREE.Mesh(tailGeo, whiteMat);
  tailMesh.position.set(0, 1.45, -3.2);
  group.add(tailMesh);

  // Landing Skids (Left and Right)
  const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.4), skidMat);
  skidL.position.set(-0.85, 0.2, 0.1);
  const skidR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.4), skidMat);
  skidR.position.set(0.85, 0.2, 0.1);
  group.add(skidL, skidR);

  // Skid Struts
  const strutGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
  const strutFL = new THREE.Mesh(strutGeo, skidMat);
  strutFL.position.set(-0.85, 0.6, 0.8);
  const strutFR = new THREE.Mesh(strutGeo, skidMat);
  strutFR.position.set(0.85, 0.6, 0.8);
  const strutRL = new THREE.Mesh(strutGeo, skidMat);
  strutRL.position.set(-0.85, 0.6, -0.6);
  const strutRR = new THREE.Mesh(strutGeo, skidMat);
  strutRR.position.set(0.85, 0.6, -0.6);
  group.add(strutFL, strutFR, strutRL, strutRR);

  // Main Rotor Hub & 4 Blades
  const mainRotorHub = new THREE.Group();
  mainRotorHub.position.set(0, 2.55, 0);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8), skidMat);
  mainRotorHub.add(shaft);

  const blade1 = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.04, 0.32), rotorMat);
  const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 9.6), rotorMat);
  mainRotorHub.add(blade1, blade2);
  group.add(mainRotorHub);

  // Tail Anti-Torque Rotor
  const tailRotorHub = new THREE.Group();
  tailRotorHub.position.set(0.24, 1.5, -5.6);
  const tailBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 0.18), rotorMat);
  tailRotorHub.add(tailBlade);
  group.add(tailRotorHub);

  group.userData = { mainRotorHub, tailRotorHub };
  return group;
}
