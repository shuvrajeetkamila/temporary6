import * as THREE from 'three';
import { BAHRAIN_HIGHWAYS, BAHRAIN_BUILDING_FOOTPRINTS, geoToWorld } from '../data/bahrain_osm_data.js';
import { createBuildingWindowTexture, createAsphaltRoadTexture, createWaterTexture } from '../render/textures.js';

/**
 * Step 1: OpenStreetMap to 3D Map Generation.
 * Converts georeferenced OSM highway networks and building perimeter footprints
 * into 3D meshes using coordinate projection and THREE.ExtrudeGeometry.
 */
export function buildBahrain3DWorld(scene) {
  const worldGroup = new THREE.Group();

  // 1. Arabian Gulf Ocean Water Plane (Y = 0)
  const waterTexture = createWaterTexture();
  const waterGeo = new THREE.PlaneGeometry(12000, 12000, 32, 32);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0e7490, // Gulf turquoise
    roughness: 0.1,
    metalness: 0.2,
    map: waterTexture
  });
  const oceanMesh = new THREE.Mesh(waterGeo, waterMat);
  oceanMesh.position.y = 0;
  worldGroup.add(oceanMesh);

  // 2. Bahrain Limestone & Desert Sand Landmass Slab (Y = 0.6)
  const landGeo = new THREE.BoxGeometry(6000, 1.2, 8000);
  const sandMat = new THREE.MeshStandardMaterial({
    color: 0xd4b886, // Bahrain coastal sand / limestone
    roughness: 0.9,
    metalness: 0.05
  });
  const landMesh = new THREE.Mesh(landGeo, sandMat);
  landMesh.position.set(0, 0.4, 0);
  worldGroup.add(landMesh);

  // 3. Extrude OpenStreetMap Highways as Ribbon Meshes
  const roadTexture = createAsphaltRoadTexture();
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.8,
    map: roadTexture
  });

  BAHRAIN_HIGHWAYS.forEach(hwy => {
    const points = hwy.nodes.map(([lat, lon]) => {
      const { x, z } = geoToWorld(lat, lon);
      return new THREE.Vector3(x, 1.05, z);
    });

    if (points.length < 2) return;

    // Build ribbon vertices along path
    const halfW = (hwy.width || 16) / 2;
    const vertices = [];
    const uvs = [];
    const indices = [];

    let totalDist = 0;
    for (let i = 0; i < points.length; i++) {
      const cur = points[i];
      let dir = new THREE.Vector3();

      if (i < points.length - 1) {
        dir.subVectors(points[i + 1], cur).normalize();
      } else {
        dir.subVectors(cur, points[i - 1]).normalize();
      }

      // Normal perpendicular to direction in XZ plane
      const normal = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

      const left = cur.clone().add(normal.clone().multiplyScalar(-halfW));
      const right = cur.clone().add(normal.clone().multiplyScalar(halfW));

      vertices.push(left.x, left.y, left.z);
      vertices.push(right.x, right.y, right.z);

      if (i > 0) {
        totalDist += points[i].distanceTo(points[i - 1]);
      }
      const vCoord = totalDist / 20; // Texture repeat along road
      uvs.push(0, vCoord);
      uvs.push(1, vCoord);

      if (i < points.length - 1) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    worldGroup.add(roadMesh);
  });

  // 4. Extrude OpenStreetMap Building Footprints into 3D Architectural Masses
  const windowTextures = {
    sapphire: createBuildingWindowTexture('sapphire'),
    cyan: createBuildingWindowTexture('cyan'),
    limestone: createBuildingWindowTexture('limestone'),
    mashrabiya: createBuildingWindowTexture('mashrabiya')
  };

  const materials = {
    sail_reflective_glass: new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.2,
      metalness: 0.6,
      map: windowTextures.sapphire
    }),
    sapphire_curtain_wall: new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.15,
      metalness: 0.7,
      map: windowTextures.sapphire
    }),
    cyan_glass_tower: new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      roughness: 0.25,
      metalness: 0.5,
      map: windowTextures.cyan
    }),
    gridded_concrete_glass: new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.3,
      map: windowTextures.sapphire
    }),
    balcony_bay_windows: new THREE.MeshStandardMaterial({
      color: 0xc4b5fd,
      roughness: 0.4,
      map: windowTextures.cyan
    }),
    limestone_mashrabiya: new THREE.MeshStandardMaterial({
      color: 0xd4b886,
      roughness: 0.8,
      map: windowTextures.mashrabiya
    }),
    ancient_limestone_fort: new THREE.MeshStandardMaterial({
      color: 0xb59e7d,
      roughness: 0.9,
      map: windowTextures.limestone
    }),
    travertine_white_stone: new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.6
    })
  };

  BAHRAIN_BUILDING_FOOTPRINTS.forEach(bldg => {
    if (!bldg.footprint || bldg.footprint.length < 3) return;

    // Convert footprint GPS coordinates to 2D Shape in XZ world space
    const shape = new THREE.Shape();
    const firstPt = geoToWorld(bldg.footprint[0][0], bldg.footprint[0][1]);
    shape.moveTo(firstPt.x, -firstPt.z);

    for (let i = 1; i < bldg.footprint.length; i++) {
      const pt = geoToWorld(bldg.footprint[i][0], bldg.footprint[i][1]);
      shape.lineTo(pt.x, -pt.z);
    }
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: bldg.height,
      bevelEnabled: false
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Orient so that extrusion goes along positive Y axis
    geom.rotateX(Math.PI / 2);

    const bMat = materials[bldg.facade] || materials.sapphire_curtain_wall;
    const mesh = new THREE.Mesh(geom, bMat);
    mesh.position.y = 1.0; // Rest directly on ground
    worldGroup.add(mesh);

    // Architectural Landmark Special Features
    // Bahrain World Trade Center (BWTC) Triple Skybridges and Wind Turbines
    if (bldg.id === "bldg_bwtc_west_tower") {
      const { x, z } = geoToWorld(26.2396, 50.5816);
      const bridgeHeights = [45, 75, 105];
      const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const turbineMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });

      bridgeHeights.forEach(bh => {
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 3, 4), bridgeMat);
        bridge.position.set(x, bh, z);
        worldGroup.add(bridge);

        const turbine = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 0.6, 12), turbineMat);
        turbine.rotateX(Math.PI / 2);
        turbine.position.set(x, bh, z);
        worldGroup.add(turbine);
      });
    }

    // Bab Al Bahrain Historic Gate Clock Tower
    if (bldg.id === "bldg_bab_al_bahrain") {
      const { x, z } = geoToWorld(26.2355, 50.5758);
      const clockTowerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
      const clockTower = new THREE.Mesh(new THREE.BoxGeometry(6, 10, 6), clockTowerMat);
      clockTower.position.set(x, 26, z);

      // Clock face
      const clockDial = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), new THREE.MeshBasicMaterial({ color: 0x1e293b }));
      clockDial.position.set(x, 26, z + 3.05);
      worldGroup.add(clockTower, clockDial);
    }
  });

  scene.add(worldGroup);
  return worldGroup;
}
