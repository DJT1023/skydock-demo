import * as THREE from 'three';
import { updateDrone } from './drone.js';
import { DELIVERY_HOUSE_POS } from './neighborhood.js';

// ── Cinema flight path waypoints ──────────────────────────────────────────────
// Each waypoint: drone position, camera offset, subtitle text, phase trigger
const CINEMA_WAYPOINTS = [
  {
    pos: new THREE.Vector3(-140, 5, 0),
    camOffset: new THREE.Vector3(0, 6, 20),
    subtitle: 'Warehouse dispatch — package secured. Initiating delivery flight.',
    phase: 'pickup',
  },
  {
    pos: new THREE.Vector3(-140, 40, 0),
    camOffset: new THREE.Vector3(20, 10, 20),
    subtitle: 'Ascending to cruise altitude. Autonomous navigation engaged.',
    phase: 'ascend',
  },
  {
    pos: new THREE.Vector3(-80, 45, -20),
    camOffset: new THREE.Vector3(0, 15, 30),
    subtitle: 'Crossing residential airspace. Obstacle avoidance active.',
    phase: 'cruise',
  },
  {
    pos: new THREE.Vector3(0, 45, -20),
    camOffset: new THREE.Vector3(0, 12, 35),
    subtitle: 'Mid-flight. Estimated delivery time: 4 minutes.',
    phase: 'cruise2',
  },
  {
    pos: new THREE.Vector3(50, 30, -20),
    camOffset: new THREE.Vector3(-20, 10, 20),
    subtitle: 'Destination in range. Initiating descent protocol.',
    phase: 'approach',
  },
  {
    pos: new THREE.Vector3(60,20, -22),
    camOffset: new THREE.Vector3(-10, 8, 15),
    subtitle: 'Target acquired: SkyDock rooftop unit. Signaling activation…',
    phase: 'preopen',
    triggerReceptacle: true,
  },
  {
    pos: new THREE.Vector3(60, 20, -22),
    camOffset: new THREE.Vector3(-8, 6, 12),
    subtitle: 'Phase 1 — Dock rotating to horizontal position.',
    phase: 'phase1',
  },
  {
    pos: new THREE.Vector3(60, 20, -22),
    camOffset: new THREE.Vector3(-6, 5, 10),
    subtitle: 'Phase 2 — Delivery platform extending.',
    phase: 'phase2',
  },
  {
    pos: new THREE.Vector3(56, 16, -22),
    camOffset: new THREE.Vector3(0, 4, 12),
    subtitle: 'Phase 3 — Landing surface deploying. Cleared for approach.',
    phase: 'phase3',
  },
  {
    pos: new THREE.Vector3(56, 14, -30),
    camOffset: new THREE.Vector3(15, 5, 8),
    subtitle: 'Package delivered. Mission complete. SkyDock securing.',
    phase: 'land',
    dropPackage: true,
  },
];

const GEOFENCE_CENTER = new THREE.Vector3(55, 13, -30);
const GEOFENCE_RADIUS = 15;  // adjust this trigger distance

export class AppControls {
  constructor({ scene, camera, renderer, drone, receptacle, neighborhood, clock }) {
    this.scene       = scene;
    this.camera      = camera;
    this.renderer    = renderer;
    this.drone       = drone;
    this.receptacle  = receptacle;
    this.neighborhood = neighborhood;
    this.clock       = clock;

    this.mode = 'menu';  // 'menu' | 'cinema' | 'game'

    // Cinema state
    this.cinemaWaypointIdx = 0;
    this.cinemaT = 0;  // 0..1 progress between waypoints
    this.cinemaSpeed = 0.3; // waypoint units/sec (lower = slower, more cinematic)
    this.receptacleTriggered = false;

    // Game state
    this.keys = {};
    this.yaw = 0;
    this.gamePhase = 'warehouse'; // 'warehouse'|'flight'|'approach'|'delivered'
    this.deliveryTriggered = false;

    // Camera interpolation
    this.cameraTarget = new THREE.Vector3();
    this.cameraLookAt = new THREE.Vector3();

    this._setupUI();
    this._setupKeyboard();
    this._placeReceptacle();
  }

  _placeReceptacle() {
    const houseData = this.neighborhood.houses.find(h => h.isDelivery);
    const ry = houseData ? houseData.roofY : 10;
    this.receptacle.placeAt(
      DELIVERY_HOUSE_POS.x - 2.5,
      DELIVERY_HOUSE_POS.y + ry + 3.95,
      DELIVERY_HOUSE_POS.z
    );
  }

  _setupUI() {
    document.getElementById('btn-cinema').addEventListener('click', () => this._startCinema());
    document.getElementById('btn-game').addEventListener('click', () => this._startGame());
    document.getElementById('btn-back').addEventListener('click', () => this._goMenu());
  }

  _setupKeyboard() {
    window.addEventListener('keydown', e => { 
      this.keys[e.code] = true;
      if (e.code === 'Space') e.preventDefault(); // prevent page scroll
     });
    window.addEventListener('keyup',   e => { this.keys[e.code] = false; });
  }

  // ── Mode transitions ───────────────────────────────────────────────────────
  _startCinema() {
    this.mode = 'cinema';
    this.cinemaWaypointIdx = 0;
    this.cinemaT = 0;
    this.receptacleTriggered = false;
    this.drone.userData.isFlying = true;
    this.drone.userData.hasPackage = true;
    this.drone.userData.packageMesh.visible = true;

    document.getElementById('mode-select').style.display = 'none';
    document.getElementById('hud').classList.add('visible');
    document.getElementById('btn-back').classList.add('visible');
    document.getElementById('mission-title').textContent = 'AUTONOMOUS DELIVERY MISSION';
    document.getElementById('game-controls').classList.remove('visible');
    document.getElementById('telemetry').classList.remove('visible');

    this._setPhaseHUD(0, 'Departing warehouse');
    this.drone.position.copy(CINEMA_WAYPOINTS[0].pos);
    this.receptacle.showClosed();
    this.receptacle.isVisible = true;
  }

  _startGame() {
    this.mode = 'game';
    this.yaw = 0;
    this.gamePhase = 'warehouse';
    this.deliveryTriggered = false;
    this.drone.userData.isFlying = true;
    this.drone.userData.hasPackage = true;
    this.drone.userData.packageMesh.visible = true;
    this.drone.userData.velocity.set(0, 0, 0);

    document.getElementById('mode-select').style.display = 'none';
    document.getElementById('hud').classList.add('visible');
    document.getElementById('btn-back').classList.add('visible');
    document.getElementById('mission-title').textContent = 'DELIVERY MISSION — MANUAL CONTROL';
    document.getElementById('game-controls').classList.add('visible');
    document.getElementById('telemetry').classList.add('visible');

    this.drone.position.set(-140, 5, 0);
    this.receptacle.showClosed();
    this.receptacle.isVisible = true;
    this._setPhaseHUD(0, 'Pick up the package & fly to the delivery house');
    this._showSubtitle('Use W/A/S/D and arrow keys to fly. Press SPACE near the house to deliver!');
  }

  _goMenu() {
    this.mode = 'menu';
    this.drone.userData.isFlying = false;
    this.receptacle.hide();

    document.getElementById('mode-select').style.display = 'flex';
    document.getElementById('hud').classList.remove('visible');
    document.getElementById('btn-back').classList.remove('visible');
    document.getElementById('game-controls').classList.remove('visible');
    document.getElementById('telemetry').classList.remove('visible');
    document.getElementById('subtitle').classList.remove('show');

    this.drone.position.set(-140, 5, 0);
    this.drone.userData.velocity.set(0, 0, 0);
  }

  // ── Main update tick ───────────────────────────────────────────────────────
  update(delta) {
    updateDrone(this.drone, delta);
    this.receptacle.update(delta);
  // handle cinematic move if active
    if (this.pendingMove) {
      const pm = this.pendingMove;
      const elapsed = this.clock.elapsedTime - pm.startTime;
      const t = Math.min(elapsed / pm.duration, 1);
      const eased = this._easeInOut(t);

      this.drone.position.lerpVectors(pm.startPos, pm.targetPos, eased);

    // camera follows smoothly
      const camOffset = new THREE.Vector3(-10, 8, 15);
      const camTarget = this.drone.position.clone().add(camOffset);
      this.camera.position.lerp(camTarget, 0.05);
      this.camera.lookAt(this.drone.position.clone().add(new THREE.Vector3(0, 2, 0)));

      if (t >= 1) {
        this.pendingMove = null;
        if (pm.onComplete) pm.onComplete();
      }
    }

    if (this.mode === 'cinema') this._updateCinema(delta);
    if (this.mode === 'game')   this._updateGame(delta);
  }

  // ── Cinema mode ────────────────────────────────────────────────────────────
  _updateCinema(delta) {
    const wps = CINEMA_WAYPOINTS;
    if (this.cinemaWaypointIdx >= wps.length - 1) return;

    const wp0 = wps[this.cinemaWaypointIdx];
    const wp1 = wps[this.cinemaWaypointIdx + 1];

    this.cinemaT += delta * this.cinemaSpeed;

    if (this.cinemaT >= 1) {
      this.cinemaT = 0;
      this.cinemaWaypointIdx++;

      if (this.cinemaWaypointIdx < wps.length) {
        const wp = wps[this.cinemaWaypointIdx];
        this._showSubtitle(wp.subtitle);
        this._setPhaseHUD(
          Math.floor((this.cinemaWaypointIdx / wps.length) * 4),
          wp.subtitle.split('.')[0]
        );

        // Trigger receptacle transition
        if (wp.triggerReceptacle && !this.receptacleTriggered) {
          this.receptacleTriggered = true;
          setTimeout(() => {
            this.receptacle.startTransition(() => {
              this._showSubtitle('SkyDock fully deployed. Ready to receive package.');
            });
          }, 800);
        }

        // Drop package at delivery
        if (wp.dropPackage) {
          this.drone.userData.packageMesh.visible = false;
        }
      }
      return;
    }

    const t = this._easeInOut(this.cinemaT);

    // Interpolate drone position
    this.drone.position.lerpVectors(wp0.pos, wp1.pos, t);

    // Face direction of travel
    const dir = wp1.pos.clone().sub(wp0.pos);
    if (dir.length() > 0.01) {
      const targetYaw = Math.atan2(dir.x, dir.z);
      this.drone.rotation.y += (targetYaw - this.drone.rotation.y) * 0.08;
    }

    // Camera follows with offset
    const camOff0 = wp0.camOffset;
    const camOff1 = wp1.camOffset;
    const camOff = new THREE.Vector3().lerpVectors(camOff0, camOff1, t);
    const camTarget = this.drone.position.clone().add(camOff);
    this.camera.position.lerp(camTarget, 0.05);
    this.camera.lookAt(this.drone.position.clone().add(new THREE.Vector3(0, 1, 0)));

    // Telemetry
    this.drone.userData.velocity.lerpVectors(
      new THREE.Vector3(),
      wp1.pos.clone().sub(wp0.pos),
      0.1
    );
  }

 // ── _startDeliverySequence ────────────────────────────────────────────────────────────
_startDeliverySequence() {
  // freeze player input
  this.mode = 'delivery';

  this._showSubtitle('SkyDock unit detected — initiating delivery sequence');
  this._setPhaseHUD(2, 'Delivery sequence initiated');

  // cinema takeover waypoints from current position to deposit point
  const depositPos = new THREE.Vector3(56, 14, -30);
  const approachPos = new THREE.Vector3(55, 18, -22);  // slightly above and south

  // smoothly fly drone to approach position first
  this._cinematicMoveTo(approachPos, 2.0, () => {

    // then trigger receptacle
    this._triggerGameDelivery();

    // wait for receptacle to fully open then descend to deposit
    setTimeout(() => {
      this._cinematicMoveTo(depositPos, 3.0, () => {

        // deposit package
        setTimeout(() => {
          this.drone.userData.packageMesh.visible = false;
          this._showSubtitle('Package delivered! Mission complete.');
          this._setPhaseHUD(3, 'Delivery complete');

          // hand control back to player after a moment
          setTimeout(() => {
            this.mode = 'game';
            this._showSubtitle('Control restored — fly free!');
          }, 2000);
        }, 1000);
      });
    }, 4000);  // wait for receptacle phases to complete
  });
}
// ── cinematic move ──────────────────────────────────────────────────────────────
_cinematicMoveTo(targetPos, duration, onComplete) {
  const startPos = this.drone.position.clone();
  const startTime = this.clock.elapsedTime;

  // store as pending cinematic move, picked up in update()
  this.pendingMove = { startPos, targetPos, startTime, duration, onComplete };
}

  // ── Game mode ──────────────────────────────────────────────────────────────
  _updateGame(delta) {
    const drone = this.drone;
    const vel = drone.userData.velocity;
    const speed = 45;
    const liftSpeed = 10;
    const turnSpeed = 1.8;
    const drag = 0.88;

    // Yaw
    if (this.keys['ArrowLeft'])  this.yaw += turnSpeed * delta;
    if (this.keys['ArrowRight']) this.yaw -= turnSpeed * delta;
    drone.rotation.y = this.yaw;

    // Forward/back/strafe in local space
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    if (this.keys['KeyW']) vel.addScaledVector(fwd, speed * delta);
    if (this.keys['KeyS']) vel.addScaledVector(fwd, -speed * delta);
    if (this.keys['KeyA']) vel.addScaledVector(right, -speed * delta);
    if (this.keys['KeyD']) vel.addScaledVector(right, speed * delta);
    if (this.keys['ArrowUp'])   vel.y += liftSpeed * delta;
    if (this.keys['ArrowDown']) vel.y -= liftSpeed * delta;

    // Drag
    vel.x *= drag;
    vel.z *= drag;
    vel.y *= 0.92;

    // Apply velocity
    drone.position.addScaledVector(vel, delta);

    // Clamp altitude
    drone.position.y = Math.max(2, drone.position.y);

    // Chase camera
    const behind = new THREE.Vector3(
      Math.sin(this.yaw) * 18,
      7,
      Math.cos(this.yaw) * 18
    );
    const camTarget = drone.position.clone().add(behind);
    this.camera.position.lerp(camTarget, 0.08);
    this.camera.lookAt(drone.position.clone().add(new THREE.Vector3(0, 2, 0)));

    // Telemetry HUD
    document.getElementById('tel-alt').textContent = Math.round(drone.position.y);
    document.getElementById('tel-spd').textContent = Math.round(vel.length() * 10) / 10;
    document.getElementById('tel-x').textContent = Math.round(drone.position.x);
    document.getElementById('tel-z').textContent = Math.round(drone.position.z);

    // Proximity check — trigger delivery near the house

    const distToFence = drone.position.distanceTo(GEOFENCE_CENTER);

    if (distToFence < GEOFENCE_RADIUS && !this.deliveryTriggered) {
      this.deliveryTriggered = true;
      this._startDeliverySequence();
    }

    //const distToHouse = drone.position.distanceTo(
    //  new THREE.Vector3(DELIVERY_HOUSE_POS.x, drone.position.y, DELIVERY_HOUSE_POS.z)
    //);

    //if (distToHouse < 25 && !this.deliveryTriggered) {
    //  this._showSubtitle('SkyDock unit nearby — press SPACE to trigger delivery sequence!');
    //  this._setPhaseHUD(2, 'Approach the rooftop');
    //}

    //if (distToHouse < 15 && this.keys['Space'] && !this.deliveryTriggered) {
    //  this.deliveryTriggered = true;
    //  this._triggerGameDelivery();
   // }
  }

  _triggerGameDelivery() {
    this._setPhaseHUD(3, 'SkyDock deploying…');
    this._showSubtitle('Triggering SkyDock transition sequence!');

    this.receptacle.startTransition(() => {
      this._showSubtitle('SkyDock fully deployed! Lower the drone to deliver your package.');
      setTimeout(() => {
        this.drone.userData.packageMesh.visible = false;
        this._showSubtitle('Package delivered successfully! Mission complete.');
        this._setPhaseHUD(3, 'Delivery complete');
        document.getElementById('dot-3').classList.add('active');
      }, 3000);
    });
  }

  // ── HUD helpers ────────────────────────────────────────────────────────────
  _setPhaseHUD(dotIdx, desc) {
    document.querySelectorAll('.phase-dot').forEach((d, i) => {
      d.classList.toggle('active', i <= dotIdx);
    });
    document.getElementById('phase-desc').textContent = desc;
  }

  _showSubtitle(text) {
    const el = document.getElementById('subtitle');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._subtitleTimer);
    this._subtitleTimer = setTimeout(() => el.classList.remove('show'), 5000);
  }

  _easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}
