import * as THREE from 'three';

export function createDrone(scene) {
  const group = new THREE.Group();
  // Make the drone findable from DevTools: give it a name and (when available) expose on window
  group.name = 'drone';
  if (typeof window !== 'undefined') window.drone = group;

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
    // Runtime toggle to invert pitch mapping if the model's forward orientation differs
    pitchSign: 1,
  };

  group.position.set(-140, 5, 0);

  // Ensure a rotation order that applies yaw (Y) before pitch (X) and roll (Z)
  group.rotation.order = 'YXZ';

  // Auto-detect approximate facing (E/W vs N/S) and pick a pitchSign so
  // forward motion yields a consistent nose-down visual across headings.
  // getWorldDirection returns the object's local -Z direction in world space.
  const _fw = new THREE.Vector3();
  group.getWorldDirection(_fw);
  if (Math.abs(_fw.x) > Math.abs(_fw.z)) {
    // Facing mostly east/west: if +X (east) prefer -1, if -X (west) prefer +1
    group.userData.pitchSign = _fw.x > 0 ? -1 : 1;
    console.log('[Drone] auto pitchSign=', group.userData.pitchSign, 'forwardWorld=', _fw.toArray());
  }

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
  // Compute velocity in the drone's local frame (world -> local via inverse quaternion)
  const pitchFactor = 0.04;
  const rollFactor = 0.04;

  const localVel = d.velocity.clone().applyQuaternion(drone.quaternion.clone().invert());
  // localVel.z is forward/back in drone local space (negative means forward if the model faces -Z)
  const localForwardZ = localVel.z;
  const localRightX = localVel.x;

  // Map local forward/right speeds to pitch (rotation.x) and roll (rotation.z).
  // Apply runtime pitch sign so user can invert mapping from DevTools if needed.
  const targetTiltX = (d.pitchSign ?? 1) * localForwardZ * pitchFactor;
  const targetTiltZ = -localRightX * rollFactor;

  // Debug: log local-frame velocities and target tilt when significant forward/back motion present
  if (Math.abs(localForwardZ) > 0.08) {
    console.log('[Drone] yaw=', drone.rotation.y.toFixed(2), 'vel(world)=', d.velocity.toArray().map(v=>v.toFixed(2)), 'vel(local)=', localVel.toArray().map(v=>v.toFixed(2)), 'localZ=', localForwardZ.toFixed(2), 'targetPitch=', targetTiltX.toFixed(3));
  }

  d.tiltX += (targetTiltX - d.tiltX) * 5 * delta;
  d.tiltZ += (targetTiltZ - d.tiltZ) * 5 * delta;
  drone.rotation.x = d.tiltX;
  drone.rotation.z = d.tiltZ;
}
