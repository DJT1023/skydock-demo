import * as THREE from 'three';

// House color palettes
const WALL_COLORS = [0xd4b896, 0xc9a882, 0xe8d5c0, 0xb8a090, 0xdcc8b0, 0xc4b4a0];
const ROOF_COLORS = [0x8b4513, 0x6b3410, 0xa0522d, 0x7a3b20, 0x5c2d0e, 0x9b6b3a];
const TRIM_COLORS = [0xffffff, 0xf5f0e8, 0xe8e0d0, 0xddd5c5];

// Delivery house position (where the receptacle will be)
export const DELIVERY_HOUSE_POS = new THREE.Vector3(60, 0, -30);

export function buildNeighborhood(scene) {
  const houses = [];

  // Grid of houses — two rows either side of the X-road
  const houseConfigs = [
    // Row north of road
    { x: -80, z: -30 }, { x: -40, z: -35 }, { x: 0,   z: -28 },
    { x: 40,  z: -32 }, { x: 80,  z: -30 }, { x: 110, z: -35 },
    // Row south of road
    { x: -80, z: 30  }, { x: -40, z: 35  }, { x: 0,   z: 32  },
    { x: 40,  z: 30  }, { x: 80,  z: 34  }, { x: 110, z: 30  },
    // Second row back
    { x: -70, z: -70 }, { x: -20, z: -65 }, { x: 30,  z: -68 }, { x: 80, z: -72 },
    { x: -70, z: 70  }, { x: -20, z: 75  }, { x: 30,  z: 68  }, { x: 80, z: 72  },
  ];

  houseConfigs.forEach((cfg, i) => {
    const isDelivery =
      Math.abs(cfg.x - DELIVERY_HOUSE_POS.x) < 5 &&
      Math.abs(cfg.z - DELIVERY_HOUSE_POS.z) < 5;

    if (isDelivery) return;  // skip it in the loop

    const house = buildHouse(scene, cfg.x, cfg.z, i, isDelivery);
    houses.push(house);
  });

  // The delivery house — built specially, slightly highlighted
  const deliveryHouse = buildHouse(scene, DELIVERY_HOUSE_POS.x, DELIVERY_HOUSE_POS.z, 99, true);
  houses.push(deliveryHouse);

  // Trees scattered around
  const treePositions = [
    [-60,-20],[-30,-22],[10,-18],[50,-22],[-50,22],[20,25],[70,20],
    [-85,-50],[15,-75],[60,-60],[-65,60],[25,75],[85,55],
  ];
  treePositions.forEach(([x, z]) => buildTree(scene, x, z));

  return { houses, deliveryHousePos: DELIVERY_HOUSE_POS };
}

function buildHouse(scene, x, z, seed, isDelivery = false) {
  const rng = seededRand(seed);
  // const w  = 12 + rng() * 6;
  let w  = 12 + rng() * 6;
  let d  = 10 + rng() * 5;
  let h  = 6  + rng() * 4;
  // const roofH = 3 + rng() * 2; 
  let roofH = 3 + rng() * 2;

  const wallColor  = isDelivery ? 0xe8f0ff : WALL_COLORS[Math.floor(rng() * WALL_COLORS.length)];
  const roofColor  = isDelivery ? 0x2244aa : ROOF_COLORS[Math.floor(rng() * ROOF_COLORS.length)];
  const trimColor  = TRIM_COLORS[Math.floor(rng() * TRIM_COLORS.length)];

  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // Walls
  const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  walls.position.y = h / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

  // Foundation trim
  const foundationMat = new THREE.MeshLambertMaterial({ color: trimColor });
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), foundationMat);
  foundation.position.y = 0.25;
  group.add(foundation);

  // Roof (gabled — two sloped panels)
  const roofMat = new THREE.MeshLambertMaterial({ color: roofColor, side: THREE.DoubleSide });

  // Left slope
  const slopeGeo = new THREE.BufferGeometry();
  let halfW = w / 2 + 0.5;
  let halfD = d / 2 + 0.5;
  const verts = new Float32Array([
    -halfW, h, -halfD,   // 0 front-left eave
     halfW, h, -halfD,   // 1 front-right eave
     0,     h + roofH, -halfD, // 2 front ridge
    -halfW, h,  halfD,   // 3 back-left eave
     halfW, h,  halfD,   // 4 back-right eave
     0,     h + roofH,  halfD, // 5 back ridge
  ]);
  const idx = new Uint16Array([
    0,1,2,  // front gable
    3,5,4,  // back gable
    0,3,2,  2,3,5, // left slope
    1,2,4,  2,5,4, // right slope
    0,4,3,  0,1,4, // eaves overhang bottom
  ]);
  slopeGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  slopeGeo.setIndex(new THREE.BufferAttribute(idx, 1));
  slopeGeo.computeVertexNormals();

  if (!isDelivery) {
    const roof = new THREE.Mesh(slopeGeo, roofMat);
    roof.castShadow = true;
    group.add(roof);
  }

  // Roof flat top (the receptacle-ready platform area — subtle lighter strip)
  if (isDelivery) {
    w = 16;
    d = 12;
    h = 0;
    halfW = w / 2 +0.5;
    halfD = d / 2;
    roofH = 8.5;

    const rooftopMat = new THREE.MeshBasicMaterial({ color: 0x4466cc, transparent: true, opacity: 0.8 });
//--------------
  const t_verts = new Float32Array([
    -halfW, h, -halfD,   // 0 front-left eave
     halfW, h, -halfD,   // 1 front-right eave
     0,     h + roofH, -halfD, // 2 front ridge
    -halfW, h,  halfD,   // 3 back-left eave
     halfW, h,  halfD,   // 4 back-right eave
     0,     h + roofH,  halfD, // 5 back ridge
  ]);
  const t_idx = new Uint16Array([
    0,1,2,  // front gable
    3,5,4,  // back gable
    0,3,2,  2,3,5, // left slope
    1,2,4,  2,5,4, // right slope
    0,4,3,  0,1,4, // eaves overhang bottom
  ]);
slopeGeo.setAttribute('position', new THREE.BufferAttribute(t_verts, 3));
slopeGeo.setIndex(new THREE.BufferAttribute(t_idx, 1));
slopeGeo.computeVertexNormals();
//--------------
    //const rooftop = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.6, d * 0.6), rooftopMat);
    const rooftop = new THREE.Mesh(slopeGeo, rooftopMat);
    // roofH = w * Math.tan(60* Math.PI / 180) / 2;
    // roofH = (w/2) * Math.tan(45 * Math.PI / 180);
    // rooftop.rotation.x = -Math.PI / 2;
    // rooftop.position.set(0, h + roofH + 0.05, 0);
    rooftop.position.set(0, roofH - 2.05, 0);
    group.add(rooftop);

    // Glowing ring to hint at the landing zone
    const ringGeo = new THREE.RingGeometry(1.2, 1.6, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0,roofH + 8.1, 0);
    group.add(ring);
  }

  // Door
  const doorMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.15), doorMat);
  door.position.set(0, 1.1, d / 2 + 0.08);
  group.add(door);

  // Windows (2 on front)
  const winMat = new THREE.MeshBasicMaterial({ color: 0xaad4ff, transparent: true, opacity: 0.7 });
  [-2.5, 2.5].forEach(wx => {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), winMat);
    win.position.set(wx, h * 0.55, d / 2 + 0.09);
    group.add(win);
  });

  scene.add(group);
  return { group, x, z, roofY: h + roofH, isDelivery };
}

function buildTree(scene, x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  // const h = 3 + Math.random() * 3;
  const h = 2 + Math.random() * 5;  // wider range: 2 to 7
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.35, h, 6),
    new THREE.MeshLambertMaterial({ color: 0x5c3a1e })
  );
  trunk.position.y = h / 2;
  trunk.castShadow = true;
  group.add(trunk);

  const foliage = new THREE.Mesh(
    // new THREE.ConeGeometry(2.2, 4, 7),
    new THREE.ConeGeometry(1.5 + h * 0.2, 3 + h * 0.4, 7),  // scales with h
    new THREE.MeshLambertMaterial({ color: 0x2d6a2d })
  );
  foliage.position.y = h + 1.8;
  foliage.castShadow = true;
  group.add(foliage);

  scene.add(group);
}

// Simple seeded pseudo-random for deterministic layout
function seededRand(seed) {
  let s = seed + 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
