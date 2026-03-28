import * as THREE from 'three';
import { buildScene } from './scene.js';
import { buildNeighborhood } from './neighborhood.js';
import { createDrone } from './drone.js';
import { ReceptacleController } from './receptacle.js';
import { AppControls } from './controls.js';

// ── Renderer ──────────────────────────────────────────────────────────────────
const container = document.getElementById('canvas-container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// ── Scene & Camera ────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 30, 80);
camera.lookAt(0, 0, 0);

const clock = new THREE.Clock();

// ── Build world ───────────────────────────────────────────────────────────────
buildScene(scene);
const neighborhood = buildNeighborhood(scene);
const drone = createDrone(scene);

// ── Receptacle controller (your GLB sequence) ─────────────────────────────────
const receptacle = new ReceptacleController(scene);

// ── App controls (cinema / game modes) ───────────────────────────────────────
const appControls = new AppControls({
  scene, camera, renderer, drone, receptacle, neighborhood, clock
});

// ── Resize handler ────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Animation loop ────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  appControls.update(delta);
  renderer.render(scene, camera);
}

animate();

// ── Loading complete ──────────────────────────────────────────────────────────
// Brief artificial delay so fonts load, then fade out loading screen
setTimeout(() => {
  const ls = document.getElementById('loading-screen');
  const fill = document.getElementById('loading-bar-fill');
  fill.style.width = '100%';
  setTimeout(() => {
    ls.classList.add('fade-out');
    setTimeout(() => ls.remove(), 900);
  }, 400);
}, 800);
