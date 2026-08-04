/* =========================================================================
   HELIX DROP 3D — High-Fidelity WebGL Engine
   ========================================================================= */

(() => {
"use strict";

/* ========================================================================
   1. GLOBAL ENGINE STATE & CONFIG
   ======================================================================== */
const CONFIG = {
  poleRadius: 1.2,
  towerRadius: 3.4,
  ringGap: 3.6,
  segmentsPerRing: 12,
  ballRadius: 0.6,
  gravity: 0.026,
  bounceForce: 0.45
};

const THEMES = {
  neon: { bg1: "#0a0017", bg2: "#1f0038", pole: 0xffffff, safe: 0xff2ea6, hazard: 0x111118, ball: 0x39ffea },
  volcano: { bg1: "#1a0500", bg2: "#380d00", pole: 0xeeeeee, safe: 0xff5f1f, hazard: 0x221111, ball: 0xffd23f },
  ocean: { bg1: "#031b2e", bg2: "#083b63", pole: 0xffffff, safe: 0x00d2ff, hazard: 0x0e1a24, ball: 0xff4d6d }
};

let scene, camera, renderer;
let poleMesh, ballMesh, ballGlow;
let helixGroup;
let rings3D = [];
let fragments3D = [];
let splatters3D = [];
let particles3D = [];

let running = false, paused = false;
let ballState = { y: 1.2, vy: 0, squash: 1 };
let targetRotation = 0, currentRotation = 0;
let runStats = { coinsThisRun: 0, ringsCleared: 0, comboSinceBounce: 0 };

/* ========================================================================
   2. THREE.JS INITIALIZATION
   ======================================================================== */
function initEngine() {
  const canvas = document.getElementById("gameCanvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(THEMES.neon.bg1);

  // Perspective Camera angled slightly downward
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 6, 14);

  setupLighting();
  setupEnvironment();
  attachInputListeners();

  window.addEventListener('resize', onWindowResize);
}

function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
  mainLight.position.set(8, 20, 12);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 1024;
  mainLight.shadow.mapSize.height = 1024;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.bias = -0.0005;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x8a4dff, 0.4);
  fillLight.position.set(-10, -10, -10);
  scene.add(fillLight);
}

function setupEnvironment() {
  // Central White Column
  const poleGeo = new THREE.CylinderGeometry(CONFIG.poleRadius, CONFIG.poleRadius, 400, 32);
  const poleMat = new THREE.MeshStandardMaterial({ 
    color: THEMES.neon.pole, 
    roughness: 0.1, 
    metalness: 0.05 
  });
  poleMesh = new THREE.Mesh(poleGeo, poleMat);
  poleMesh.position.y = -150;
  poleMesh.receiveShadow = true;
  scene.add(poleMesh);

  // Main Helix Group
  helixGroup = new THREE.Group();
  scene.add(helixGroup);

  // Player Ball
  const ballGeo = new THREE.SphereGeometry(CONFIG.ballRadius, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({ 
    color: THEMES.neon.ball, 
    roughness: 0.1, 
    metalness: 0.1,
    emissive: THEMES.neon.ball,
    emissiveIntensity: 0.2
  });
  ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.castShadow = true;
  ballMesh.position.set(0, 0, CONFIG.towerRadius);
  scene.add(ballMesh);
}

/* ========================================================================
   3. HIGH-REALISM BLOCK & RING GEOMETRY
   ======================================================================== */
function createVolumetricSegment(startAngle, arcLength, isHazard, theme) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, CONFIG.towerRadius + 0.6, startAngle, startAngle + arcLength - 0.03, false);
  shape.absarc(0, 0, CONFIG.poleRadius + 0.02, startAngle + arcLength - 0.03, startAngle, true);

  const extrudeSettings = {
    depth: 0.6,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.06
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geometry.rotateX(Math.PI / 2);

  const material = new THREE.MeshStandardMaterial({
    color: isHazard ? theme.hazard : theme.safe,
    roughness: isHazard ? 0.5 : 0.2,
    metalness: isHazard ? 0.1 : 0.05
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { isHazard };
  return mesh;
}

function buildRing3D(index) {
  const ringGroup = new THREE.Group();
  ringGroup.position.y = -index * CONFIG.ringGap;

  const theme = THEMES.neon;
  const totalAngle = Math.PI * 2;
  const gapAngle = (100 * Math.PI) / 180;
  const usableAngle = totalAngle - gapAngle;
  const arcPerSeg = usableAngle / CONFIG.segmentsPerRing;

  const hasHazard = Math.random() < 0.25;
  const hazardIdx = hasHazard ? Math.floor(Math.random() * (CONFIG.segmentsPerRing - 2)) : -1;

  for (let i = 0; i < CONFIG.segmentsPerRing; i++) {
    const startAngle = i * arcPerSeg;
    const isHazard = (i === hazardIdx || i === hazardIdx + 1);
    const segmentMesh = createVolumetricSegment(startAngle, arcPerSeg, isHazard, theme);
    ringGroup.add(segmentMesh);
  }

  ringGroup.userData = { index, resolved: false, hasHazard };
  helixGroup.add(ringGroup);
  rings3D.push(ringGroup);
}

/* ========================================================================
   4. IMPACT EFFECTS & SHATTER PHYSICS
   ======================================================================== */
function addPaintSplatter(yPos) {
  const splatterGeo = new THREE.CircleGeometry(CONFIG.ballRadius * 1.1, 16);
  const splatterMat = new THREE.MeshBasicMaterial({ 
    color: THEMES.neon.ball, 
    transparent: true, 
    opacity: 0.85,
    depthWrite: false
  });
  
  const splatter = new THREE.Mesh(splatterGeo, splatterMat);
  splatter.rotation.x = -Math.PI / 2;
  splatter.position.set(0, yPos + 0.31, CONFIG.towerRadius);
  
  // Attach directly to the active platform level so it rotates with the tower
  const currentRingIndex = Math.floor((-yPos + 0.5) / CONFIG.ringGap);
  const ring = rings3D.find(r => r.userData.index === currentRingIndex);
  if (ring) ring.add(splatter);
}

function shatterRing(ring) {
  const children = [...ring.children];
  children.forEach(block => {
    if (block.geometry.type !== "ExtrudeGeometry") return;

    ring.remove(block);
    scene.add(block);

    block.position.y += ring.position.y;
    block.rotation.y += helixGroup.rotation.y;

    const angle = Math.atan2(block.position.z, block.position.x) + (Math.random() * 0.4 - 0.2);
    const speed = 0.18 + Math.random() * 0.12;

    fragments3D.push({
      mesh: block,
      vx: Math.cos(angle) * speed,
      vy: 0.12 + Math.random() * 0.15,
      vz: Math.sin(angle) * speed,
      rx: (Math.random() - 0.5) * 0.3,
      ry: (Math.random() - 0.5) * 0.3,
      life: 1.0
    });
  });

  helixGroup.remove(ring);
}

function updateFragments() {
  for (let i = fragments3D.length - 1; i >= 0; i--) {
    const f = fragments3D[i];
    f.mesh.position.x += f.vx;
    f.mesh.position.y += f.vy;
    f.mesh.position.z += f.vz;
    f.vy -= 0.012; // Gravity

    f.mesh.rotation.x += f.rx;
    f.mesh.rotation.y += f.ry;

    f.life -= 0.025;
    f.mesh.scale.multiplyScalar(0.95);

    if (f.life <= 0) {
      scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      f.mesh.material.dispose();
      fragments3D.splice(i, 1);
    }
  }
}

/* ========================================================================
   5. ENGINE GAME LOOP
   ======================================================================== */
function startGame() {
  rings3D.forEach(r => helixGroup.remove(r));
  fragments3D.forEach(f => scene.remove(f.mesh));
  rings3D = []; fragments3D = [];

  ballState.y = 1.2;
  ballState.vy = 0;
  targetRotation = 0;
  currentRotation = 0;
  helixGroup.rotation.y = 0;
  runStats = { coinsThisRun: 0, ringsCleared: 0, comboSinceBounce: 0 };

  for (let i = 0; i < 25; i++) buildRing3D(i);

  running = true;
  paused = false;
  requestAnimationFrame(loop);
}

function loop() {
  if (!running) return;
  requestAnimationFrame(loop);

  if (!paused) {
    // Smooth input interpolation for rotation
    currentRotation += (targetRotation - currentRotation) * 0.25;
    helixGroup.rotation.y = currentRotation;

    // Ball physics
    ballState.vy -= CONFIG.gravity;
    ballState.y += ballState.vy;

    // Ball squash deformation logic
    ballState.squash += (1 - ballState.squash) * 0.2;
    ballMesh.scale.set(1 / Math.sqrt(ballState.squash), ballState.squash, 1 / Math.sqrt(ballState.squash));

    const currentRingIdx = Math.floor((-ballState.y + 0.5) / CONFIG.ringGap);
    const ring = rings3D.find(r => r.userData.index === currentRingIdx);

    if (ring && !ring.userData.resolved) {
      const ringY = -currentRingIdx * CONFIG.ringGap;

      if (ballState.y - CONFIG.ballRadius <= ringY + 0.3 && ballState.vy < 0) {
        let angle = (Math.PI / 2 - helixGroup.rotation.y) % (Math.PI * 2);
        if (angle < 0) angle += Math.PI * 2;

        const gapRad = (100 * Math.PI) / 180;
        const inGap = angle > (Math.PI * 2 - gapRad);

        if (inGap) {
          runStats.comboSinceBounce++;
          runStats.ringsCleared++;
          ring.userData.resolved = true;

          if (runStats.comboSinceBounce >= 2) {
            shatterRing(ring);
          }
        } else {
          // Bounce or death collision
          ballState.vy = CONFIG.bounceForce;
          ballState.y = ringY + CONFIG.ballRadius + 0.3;
          ballState.squash = 0.5; // Squash on impact
          runStats.comboSinceBounce = 0;

          addPaintSplatter(ringY);
        }
      }
    }

    // Dynamic camera tracking
    camera.position.y += (ballState.y + 3.8 - camera.position.y) * 0.1;
    ballMesh.position.y = ballState.y;

    updateFragments();
  }

  renderer.render(scene, camera);
}

/* ========================================================================
   6. CONTROLS & RESIZE
   ======================================================================== */
function attachInputListeners() {
  let isDragging = false;
  let previousX = 0;

  window.addEventListener("pointerdown", e => {
    isDragging = true;
    previousX = e.clientX;
  });

  window.addEventListener("pointermove", e => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousX;
    previousX = e.clientX;
    targetRotation += deltaX * 0.008;
  });

  window.addEventListener("pointerup", () => isDragging = false);
  window.addEventListener("pointercancel", () => isDragging = false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

document.addEventListener("DOMContentLoaded", () => {
  initEngine();
  startGame();
});

})();
