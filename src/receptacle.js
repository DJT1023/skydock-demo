import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ── File sequences (matches your actual file names) ────────────────────────────

// Phase 1: Rotation from 45° down to 0° (10 steps, 5° each)
const PHASE1_FILES = [
  'RotateDock_045deg.glb',
  'RotateDock_040deg.glb',
  'RotateDock_035deg.glb',
  'RotateDock_030deg.glb',
  'RotateDock_025deg.glb',
  'RotateDock_020deg.glb',
  'RotateDock_015deg.glb',
  'RotateDock_010deg.glb',
  'RotateDock_005deg.glb',
  'RotateDock_000deg.glb',
];

// Phase 2: Platform extends outward 5in–25in (5 steps)
const PHASE2_FILES = [
  'RD_Plat5in.glb',
  'RD_Plat10in.glb',
  'RD_Plat15in.glb',
  'RD_Plat20in.glb',
  'RD_Plat25in.glb',
];

// Phase 3: Platform panels slide apart (7 steps)
const PHASE3_FILES = [
  'LSPan01.glb',
  'LSPan02.glb',
  'LSPan03.glb',
  'LSPan04.glb',
  'LSPan05.glb',
  'LSPan06.glb',
  'LSPan07.glb',
];
// Phase 4 — reverse of phase 3
const PHASE4_FILES = [...PHASE3_FILES].reverse();

// Phase 5 — reverse of phase 2
const PHASE5_FILES = [...PHASE2_FILES].reverse();

// Phase 6 — tilt inward urging package inside
const PHASE6_FILES = [
  'RoofDock_-05deg.glb', 'RoofDock_-10deg.glb', 'RoofDock_-15deg.glb',
  'RoofDock_-20deg.glb', 'RoofDock_-25deg.glb', 'RoofDock_-30deg.glb',
  'RoofDock_-35deg.glb', 'RoofDock_-40deg.glb',
];

// Phase 7 — return to closed (reverse of phase 6 then phase 1)
const PHASE7_FILES = [
  ...[...PHASE6_FILES].reverse(),
  ...PHASE1_FILES.slice().reverse(),
];

const ALL_PHASES = [
  PHASE1_FILES,
  PHASE2_FILES,
  PHASE3_FILES,
  PHASE4_FILES,
  PHASE5_FILES,
  PHASE6_FILES,
  PHASE7_FILES,
];

export class ReceptacleController {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();

    // Current displayed mesh
    this.currentMesh = null;

    // Cached loaded GLTFs per filename
    this.cache = {};

    // State
    this.isVisible = false;
    this.currentPhase = 0;      // 0, 1, 2
    this.currentFrame = 0;      // index within phase
    this.isAnimating = false;
    this.animTimer = 0;
    this.frameDuration = 0.18;  // seconds per frame (adjust for speed)

    // Where to place the receptacle (set by controls.js when approaching delivery house)
    this.position = new THREE.Vector3(60, 0, -30);
    this.roofY = 0; // set dynamically

    // Fallback: procedural placeholder shown when GLB not yet loaded
    this._buildPlaceholder();

    // Preload all frames in background
    this._preloadAll();
  }

  // ── Placeholder (shown before GLBs load or if they fail) ──────────────────
  _buildPlaceholder() {
    const geo = new THREE.BoxGeometry(3, 0.15, 3);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2244aa, transparent: true, opacity: 0.85 });
    this.placeholder = new THREE.Mesh(geo, mat);
//trigger the same 
    // Pivot hinge indicator
    const hingeGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8);
    const hingeMat = new THREE.MeshLambertMaterial({ color: 0x00d4ff });
    const hinge = new THREE.Mesh(hingeGeo, hingeMat);
    hinge.rotation.z = Math.PI / 2;
    this.placeholder.add(hinge);

    // Border frame lines
    const edges = new THREE.EdgesGeometry(geo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00d4ff }));
    this.placeholder.add(line);

    this.placeholder.visible = false;
    this.scene.add(this.placeholder);
  }

  // ── Preload all GLB files in the background ────────────────────────────────
  _preloadAll() {
    //const allFiles = ALL_PHASES.flat();
    const allFiles = [...new Set(ALL_PHASES.flat())];
    let loaded = 0;
    const loadStatus = document.getElementById('loading-status');

    allFiles.forEach(file => {
      const url = `/assets/${file}`;
      this.loader.load(
        url,
        (gltf) => {
          this.cache[file] = gltf;
          loaded++;
          if (loadStatus) {
            const pct = Math.round((loaded / allFiles.length) * 80);
            const bar = document.getElementById('loading-bar-fill');
            if (bar) bar.style.width = pct + '%';
            loadStatus.textContent = `Loading assets... ${loaded}/${allFiles.length}`;
          }
        },
        undefined,
        (err) => {
          // GLB not found — silently mark as missing, placeholder will be used
          this.cache[file] = null;
          loaded++;
          console.warn(`[ReceptacleController] Could not load ${file} — using placeholder.`);
        }
      );
    });
  }

  // ── Place the receptacle on a rooftop ─────────────────────────────────────
  placeAt(x, y, z) {
    this.position.set(x, y, z);
    this.roofY = y;
    this.placeholder.position.set(x, y, z);
    this.placeholder.rotation.z = Math.PI / 4; // Start at 45°
    this.isVisible = false;
    this.currentPhase = 0;
    this.currentFrame = 0;
  }

  // ── Show/hide ──────────────────────────────────────────────────────────────
  show() {
    this.isVisible = true;
    this._showFrame(0, 0);
  }

  hide() {
    this.isVisible = false;
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh = null;
    }
    this.placeholder.visible = false;
  }

  // ── Start the full transition sequence ────────────────────────────────────
  startTransition(onComplete) {
    // Backwards-compatible signature:
    // startTransition(onComplete)
    // or startTransition(options, onComplete)
    if (this.isAnimating) return;
    const opts = (typeof onComplete === 'object' && onComplete) ? onComplete : null;
    if (opts) {
      this._pauseAfterPhase = opts.pauseAfterPhase ?? null;
      this._onPhase = opts.onPhase ?? null;
      this._onPhaseStart = opts.onPhaseStart ?? null;
      this._onComplete = arguments[1] || null;
    } else {
      this._pauseAfterPhase = null;
      this._onPhase = null;
      this._onPhaseStart = null;
      this._onComplete = onComplete || null;
    }

    this.isAnimating = true;
    this._isPaused = false;
    this.currentPhase = 0;
    this.currentFrame = 0;
    this.animTimer = 0;
    this.show();
    console.log('[Receptacle] startTransition', { pauseAfterPhase: this._pauseAfterPhase });
  }

  pauseTransition() {
    this.isAnimating = false;
    this._isPaused = true;
    // Consume one-shot pause so that a subsequent resume won't immediately
    // trigger the same pause again (which would prevent advancing phases).
    this._pauseAfterPhase = null;
    console.log('[Receptacle] pauseTransition at phase', this.currentPhase, '(pause consumed)');
  }

  resumeTransition() {
    if (!this._isPaused) return;
    this._isPaused = false;
    this.isAnimating = true;
    console.log('[Receptacle] resumeTransition at phase', this.currentPhase);
  }

  // ── Tick: called every frame from controls.js ─────────────────────────────
  update(delta) {
    if (!this.isAnimating || !this.isVisible) return;

    this.animTimer += delta;
    if (this.animTimer < this.frameDuration) return;
    this.animTimer = 0;

    const phase = ALL_PHASES[this.currentPhase];

    this.currentFrame++;

    // If we've just completed the current phase (passed last frame)
    if (this.currentFrame >= phase.length) {
      const completedPhase = this.currentPhase;

        // Notify phase completion callback
        console.log('[Receptacle] completedPhase', completedPhase);
        if (this._onPhase) {
          try { this._onPhase(completedPhase); } catch (e) { console.warn(e); }
        }

      // Pause if requested for this completed phase
      if (this._pauseAfterPhase !== null && this._pauseAfterPhase === completedPhase) {
        this.pauseTransition();
        // Keep showing the last frame of the completed phase (do not advance)
        this.currentFrame = phase.length - 1;
        this._showFrame(completedPhase, this.currentFrame);
        return;
      }

      // Advance to next phase
      this.currentPhase++;
      this.currentFrame = 0;

      // Notify phase-start callback (useful for syncing external objects)
      if (this._onPhaseStart) {
        try { this._onPhaseStart(this.currentPhase); } catch (e) { console.warn(e); }
      }

      if (this.currentPhase >= ALL_PHASES.length) {
        // All phases complete
        this.isAnimating = false;
        if (this._onComplete) this._onComplete();
        return;
      }
    }

    this._showFrame(this.currentPhase, this.currentFrame);
  }

  // ── Display a specific frame ───────────────────────────────────────────────
  _showFrame(phaseIdx, frameIdx) {
    const file = ALL_PHASES[phaseIdx][frameIdx];

    // Remove previous mesh
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      this.currentMesh = null;
    }

    if (this.cache[file]) {
      // Use loaded GLB
      const gltf = this.cache[file];
      const model = gltf.scene.clone();
      model.scale.setScalar(2.254);         // Adjust scale to fit rooftop
      model.position.copy(this.position);
      model.rotation.y = - Math.PI / 2;      // rotate 90° to face south
      model.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.scene.add(model);
      this.currentMesh = model;
      this.placeholder.visible = false;
      console.log('[Receptacle] showFrame', { phaseIdx, frameIdx, file });
    } else {
      // Fallback to placeholder with animated rotation/extension
      this.placeholder.visible = true;
      this.placeholder.position.copy(this.position);

      if (phaseIdx === 0) {
        // Simulate rotation: 45° → 0°
        const t = frameIdx / (PHASE1_FILES.length - 1);
        this.placeholder.rotation.z = (Math.PI / 4) * (1 - t);
      } else if (phaseIdx === 1) {
        // Simulate extension
        const t = frameIdx / (PHASE2_FILES.length - 1);
        this.placeholder.scale.x = 1 + t * 0.8;
        this.placeholder.rotation.z = 0;
      } else if (phaseIdx === 2) {
        // Simulate panels sliding
        const t = frameIdx / (PHASE3_FILES.length - 1);
        this.placeholder.scale.x = 1.8 + t * 0.8;
        this.placeholder.scale.z = 1 + t * 0.5;
      }
    }
  }

  // ── Jump directly to final (fully open) state ─────────────────────────────
  showOpen() {
    this._showFrame(2, PHASE3_FILES.length - 1);
  }

  // ── Jump to closed state ───────────────────────────────────────────────────
  showClosed() {
    this._showFrame(0, 0);
  }

  // ── Change animation speed ────────────────────────────────────────────────
  setSpeed(fps) {
    this.frameDuration = 1 / fps;
  }

  // Return number of frames in a given phase (0-based phase index)
  getPhaseLength(phaseIdx) {
    if (phaseIdx < 0 || phaseIdx >= ALL_PHASES.length) return 0;
    return ALL_PHASES[phaseIdx].length;
  }
}
