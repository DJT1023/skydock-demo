import * as THREE from 'three';

export function buildScene(scene) {
  // ── Sky gradient via background color + fog ───────────────────────────────
  scene.background = new THREE.Color(0x1a3a6e);
  scene.fog = new THREE.FogExp2(0x2a4a7e, 0.008);

  // ── Ambient light (soft blue-sky fill) ────────────────────────────────────
  const ambient = new THREE.AmbientLight(0x6688cc, 0.6);
  scene.add(ambient);

  // ── Sunlight (directional, casts shadows) ────────────────────────────────
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
  sun.position.set(80, 120, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  // ── Hemisphere light (sky/ground bounce) ─────────────────────────────────
  const hemi = new THREE.HemisphereLight(0x4488ff, 0x224411, 0.4);
  scene.add(hemi);

  // ── Ground plane ─────────────────────────────────────────────────────────
  const groundGeo = new THREE.PlaneGeometry(600, 600);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x3d6b35 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ── Roads (simple dark strips) ───────────────────────────────────────────
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
  // Main road X-axis
  const roadX = new THREE.Mesh(new THREE.PlaneGeometry(600, 8), roadMat);
  roadX.rotation.x = -Math.PI / 2;
  roadX.position.y = 0.01;
  scene.add(roadX);
  // Main road Z-axis
  const roadZ = new THREE.Mesh(new THREE.PlaneGeometry(8, 600), roadMat);
  roadZ.rotation.x = -Math.PI / 2;
  roadZ.position.y = 0.01;
  scene.add(roadZ);

  // ── Warehouse platform (starting point) ──────────────────────────────────
  const wPlatform = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 30),
    new THREE.MeshLambertMaterial({ color: 0x555555 })
  );
  wPlatform.rotation.x = -Math.PI / 2;
  wPlatform.position.set(-140, 0.02, 0);
  scene.add(wPlatform);

  // Warehouse building
  const warehouseGeo = new THREE.BoxGeometry(35, 18, 25);
  const warehouseMat = new THREE.MeshLambertMaterial({ color: 0x8a8070 });
  const warehouse = new THREE.Mesh(warehouseGeo, warehouseMat);
  warehouse.position.set(-160, 9, 0);
  warehouse.castShadow = true;
  warehouse.receiveShadow = true;
  scene.add(warehouse);

  // Warehouse roof detail
  const roofGeo = new THREE.BoxGeometry(37, 2, 27);
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshLambertMaterial({ color: 0x6a6055 }));
  roof.position.set(-160, 19, 0);
  scene.add(roof);

  // Warehouse sign (emissive plane)
  const signGeo = new THREE.PlaneGeometry(12, 3);
  const signMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
  const sign = new THREE.Mesh(signGeo, signMat);
  sign.position.set(-142.5, 14, 0);
  sign.rotation.y = Math.PI / 2;
  scene.add(sign);

  // ── Delivery pad marker at warehouse ─────────────────────────────────────
  const padGeo = new THREE.CircleGeometry(4, 32);
  const padMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.3 });
  const pad = new THREE.Mesh(padGeo, padMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(-140, 0.03, 0);
  scene.add(pad);

  // Circle outline
  const padRingGeo = new THREE.RingGeometry(3.8, 4.2, 32);
  const padRingMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff, side: THREE.DoubleSide });
  const padRing = new THREE.Mesh(padRingGeo, padRingMat);
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.set(-140, 0.04, 0);
  scene.add(padRing);
}
