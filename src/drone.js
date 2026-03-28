import * as THREE from 'three';

export function createDrone(scene) {
  const group = new THREE.Group();

  const bodyMat  = new THREE.MeshLambertMaterial({ color: 0x222831 });
  const armMat   = new THREE.MeshLambertMaterial({ color: 0x333d4a });
  const propMat  = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
  const redMat   = new THREE.MeshBasicMaterial({ color: 0xff4444 });

  // Central body (flat disc)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.0, 0.35, 8), bodyMat);
  body.castShadow = true;
  group.add(body);

  // Top dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat);
  dome.position.y = 0.18;
  group.add(dome);

  // Package holder (underneath)
  const hookMat = new THREE.MeshLambertMaterial({ color: 0xcc8800 });
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), hookMat);
  hook.position.y = -0.35;
  group.add(hook);
  group.userData.packageHook = hook;

  // 4 Arms + props
  const armAngles = [45, 135, 225, 315];
  const propGroups = [];

  armAngles.forEach((deg) => {
    const angle = (deg * Math.PI) / 180;
    const armLen = 1.6;

    // Arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.12, 0.18), armMat);
    arm.rotation.y = angle;
    arm.position.set(
      Math.cos(angle) * (armLen / 2),
      0,
      Math.sin(angle) * (armLen / 2)
    );
    group.add(arm);

    // Motor hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 8), armMat);
    hub.position.set(Math.cos(angle) * armLen, 0.05, Math.sin(angle) * armLen);
    group.add(hub);

    // Propeller group (spins during flight)
    const propGroup = new THREE.Group();
    propGroup.position.set(Math.cos(angle) * armLen, 0.18, Math.sin(angle) * armLen);

    const blade1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.2), propMat);
    const blade2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.2), propMat);
    blade2.rotation.y = Math.PI / 2;
    propGroup.add(blade1, blade2);
    group.add(propGroup);
    propGroups.push(propGroup);
  });

  // Nav lights
  const frontLight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), lightMat);
  frontLight.position.set(0, 0, -1.15);
  group.add(frontLight);

  const backLight = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), redMat);
  backLight.position.set(0, 0, 1.15);
  group.add(backLight);

  // Package box (visible when carrying)
  const pkgMat = new THREE.MeshLambertMaterial({ color: 0xcc8822 });
  const pkg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.9), pkgMat);
  pkg.position.y = -0.85;
  pkg.visible = true;
  group.add(pkg);
  group.userData.packageMesh = pkg;

  scene.add(group);

  // ── Drone state ───────────────────────────────────────────────────────────
  group.userData = {
    ...group.userData,
    propGroups,
    velocity: new THREE.Vector3(),
    targetPos: new THREE.Vector3(-140, 5, 0),  // Start above warehouse
    isFlying: false,
    hasPackage: true,
    propSpeed: 0,
    tiltX: 0,
    tiltZ: 0,
  };

  group.position.set(-140, 5, 0);

  return group;
}

// ── Drone tick called from controls.js ────────────────────────────────────────
export function updateDrone(drone, delta) {
  const d = drone.userData;

  // Spin props (faster = more speed)
  const targetPropSpeed = d.isFlying ? (8 + d.velocity.length() * 2) : 0;
  d.propSpeed += (targetPropSpeed - d.propSpeed) * 5 * delta;
  d.propGroups.forEach((pg, i) => {
    pg.rotation.y += d.propSpeed * delta * (i % 2 === 0 ? 1 : -1);
  });

  // Gentle hover bob (only when nearly stationary)
  if (d.isFlying) {
    drone.position.y += Math.sin(Date.now() * 0.002) * 0.005;
  }

  // Smooth tilt based on velocity
  const targetTiltZ = -d.velocity.x * 0.04;
  const targetTiltX =  d.velocity.z * 0.04;
  d.tiltX += (targetTiltX - d.tiltX) * 5 * delta;
  d.tiltZ += (targetTiltZ - d.tiltZ) * 5 * delta;
  drone.rotation.x = d.tiltX;
  drone.rotation.z = d.tiltZ;
}
