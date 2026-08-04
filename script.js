/* =========================================================
   HELIX STACK BALL ENGINE — Updated Script
   ========================================================= */

// --- GLOBAL GAME STATE ---
const state = {
  score: 0,
  currentLevel: 1,
  isPressing: false,
  isPlaying: false,
  isGameOver: false,
  isVictory: false,
  fireMode: false,
  fireStreak: 0
};

// --- THREE.JS GLOBALS ---
let scene, camera, renderer;
let towerGroup, ballMesh;
let stackPlatforms = [];
let particles = [];

// Physics & Mechanics Parameters
const GRAVITY = -0.012;
const SMASH_SPEED = -0.32;
const BOUNCE_IMPULSE = 0.22;
const BALL_RADIUS = 0.35;
const TOWER_RADIUS = 1.6;
const LAYER_HEIGHT = 0.35;
const TOTAL_LAYERS = 45;

let ballPosY = 0;
let ballVelocityY = 0;

window.addEventListener('DOMContentLoaded', () => {
  initUI();
  initThree();
  setupTouchAndInput();
  animate();
  setTimeout(() => switchScreen('screen-menu'), 500);
});

// --- SCREEN MANAGEMENT ---
function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

function hideOverlays() {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
}

function initUI() {
  document.getElementById('btnPlay').addEventListener('click', startGame);
  document.getElementById('btnRestartFromGO').addEventListener('click', () => { hideOverlays(); startGame(); });
  document.getElementById('btnNextLevel').addEventListener('click', () => {
    state.currentLevel++;
    hideOverlays();
    startGame();
  });
}

// --- THREE.JS SCENE SETUP ---
function initThree() {
  const canvas = document.getElementById('gameCanvas');

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 4, 8);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(5, 15, 8);
  scene.add(dirLight);

  // Tower Container
  towerGroup = new THREE.Group();
  scene.add(towerGroup);

  // Ball
  const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0x00d2ff,
    roughness: 0.1,
    metalness: 0.2,
    emissive: 0x004466
  });
  ballMesh = new THREE.Mesh(ballGeo, ballMat);
  scene.add(ballMesh);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- TOUCH & POINTER CONTROLS ---
function setupTouchAndInput() {
  // Bind global screen listeners to eliminate unresponsive touch zones
  window.addEventListener('pointerdown', (e) => {
    if (!state.isPlaying || state.isGameOver || state.isVictory) return;
    state.isPressing = true;
  });

  window.addEventListener('pointerup', () => {
    state.isPressing = false;
  });

  window.addEventListener('pointercancel', () => {
    state.isPressing = false;
  });
}


// --- BUILD STACK TOWER (VOLUMETRIC 3D BLOCKS) ---
function buildStackTower() {
  while (towerGroup.children.length > 0) {
    const obj = towerGroup.children[0];
    towerGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }
  stackPlatforms = [];

  // Center Shaft (White Center Pole)
  const poleGeo = new THREE.CylinderGeometry(0.7, 0.7, TOTAL_LAYERS * LAYER_HEIGHT + 10, 32);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = -(TOTAL_LAYERS * LAYER_HEIGHT) / 2;
  towerGroup.add(pole);

  // Colors matching the Stack Ball theme from your image
  const themeColors = [0x0099ff, 0xffd700, 0x00e640, 0xff3300];
  const safeColor = themeColors[state.currentLevel % themeColors.length];
  const dangerColor = 0x1a1a1a; // Dark black segments from image

  for (let i = 0; i < TOTAL_LAYERS; i++) {
    const posY = -i * LAYER_HEIGHT;
    // Spiral twist angle for the stack layers
    const rotationY = i * 0.18; 
    const isBase = i === TOTAL_LAYERS - 1;

    const layerGroup = new THREE.Group();
    layerGroup.position.y = posY;
    layerGroup.rotation.y = rotationY;

    const sliceCount = 12; // 12 thick blocks form a full ring
    const slices = [];

    for (let j = 0; j < sliceCount; j++) {
      // Create black danger blocks
      const isDanger = !isBase && (j % 5 === 0 || j % 5 === 1);
      
      const angleStart = (j / sliceCount) * Math.PI * 2;
      const angleSize = (1 / sliceCount) * Math.PI * 2 - 0.04; // Gap between blocks

      // Create thick curved 3D block geometry using ExtrudeGeometry
      const shape = new THREE.Shape();
      const innerR = 0.75;
      const outerR = 1.85;

      shape.absarc(0, 0, outerR, angleStart, angleStart + angleSize, false);
      shape.absarc(0, 0, innerR, angleStart + angleSize, angleStart, true);

      const extrudeSettings = {
        depth: 0.28, // Height/Thickness of block
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.02,
        bevelThickness: 0.02
      };

      const sliceGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      sliceGeo.rotateX(Math.PI / 2); // Rotate to lay horizontal

      const sliceMat = new THREE.MeshStandardMaterial({
        color: isDanger ? dangerColor : safeColor,
        roughness: 0.25,
        metalness: 0.1
      });

      const sliceMesh = new THREE.Mesh(sliceGeo, sliceMat);
      layerGroup.add(sliceMesh);

      slices.push({
        mesh: sliceMesh,
        isDanger: isDanger
      });
    }

    towerGroup.add(layerGroup);
    stackPlatforms.push({
      group: layerGroup,
      posY: posY,
      slices: slices,
      destroyed: false,
      isBase: isBase
    });
  }
}


// --- GAME LOOP & MECHANICS ---
function startGame() {
  state.isPlaying = true;
  state.isGameOver = false;
  state.isVictory = false;
  state.isPressing = false;
  state.score = 0;
  state.fireStreak = 0;
  state.fireMode = false;

  ballPosY = 1.0;
  ballVelocityY = 0;
  ballMesh.position.set(0, ballPosY, TOWER_RADIUS - 0.3);

  buildStackTower();
  switchScreen('screen-game');
  updateHUD();
}

function updatePhysics() {
  if (!state.isPlaying || state.isGameOver || state.isVictory) return;

  // Touch action physics processing
  if (state.isPressing) {
    ballVelocityY = SMASH_SPEED; // Constant downward smash force
  } else {
    ballVelocityY += GRAVITY; // Normal freefall gravity
  }

  ballPosY += ballVelocityY;

  // Constant slow rotation of entire tower
  towerGroup.rotation.y += 0.015;

  // Camera Follow
  camera.position.y = ballPosY + 3.2;
  camera.lookAt(0, ballPosY - 0.5, 0);

  ballMesh.position.y = ballPosY;

  // Collision detection with current stack layer
  for (let i = 0; i < stackPlatforms.length; i++) {
    const layer = stackPlatforms[i];
    if (layer.destroyed) continue;

    const diffY = ballPosY - layer.posY;

    // Check layer collision boundary
    if (diffY <= BALL_RADIUS) {
      if (state.isPressing || state.fireMode) {
        // Continuous Smash Logic
        const hitDanger = checkDangerHit(layer);

        if (hitDanger && !state.fireMode) {
          triggerGameOver();
          return;
        }

        // Shatter Layer
        shatterStackLayer(layer);
        state.score += 10;
        state.fireStreak++;

        if (state.fireStreak >= 8) {
          state.fireMode = true;
          ballMesh.material.color.setHex(0xff3300);
        }

        updateHUD();

        if (layer.isBase) {
          triggerVictory();
          return;
        }
      } else {
        // Bounce off top layer
        ballPosY = layer.posY + BALL_RADIUS;
        ballVelocityY = BOUNCE_IMPULSE;
        state.fireStreak = 0;
        state.fireMode = false;
        ballMesh.material.color.setHex(0x00d2ff);
      }
      break;
    }
  }

  updateParticles();
}

function checkDangerHit(layer) {
  // Angle alignment check against black danger blocks
  const angleNorm = ((-layer.group.rotation.y - towerGroup.rotation.y) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const sliceAngle = (Math.PI * 2) / layer.slices.length;
  const index = Math.floor(angleNorm / sliceAngle) % layer.slices.length;
  
  return layer.slices[index] ? layer.slices[index].isDanger : false;
}

function shatterStackLayer(layer) {
  layer.destroyed = true;
  
  layer.slices.forEach(s => {
    const mesh = s.mesh;
    // Explode pieces outwards
    const pGeo = mesh.geometry.clone();
    const pMat = mesh.material.clone();
    const p = new THREE.Mesh(pGeo, pMat);
    
    p.position.copy(layer.group.position);
    p.rotation.copy(layer.group.rotation);
    
    p.userData = {
      vx: (Math.random() - 0.5) * 0.3,
      vy: Math.random() * 0.2 + 0.1,
      vz: (Math.random() - 0.5) * 0.3,
      life: 25
    };

    scene.add(p);
    particles.push(p);
  });

  towerGroup.remove(layer.group);
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.position.x += p.userData.vx;
    p.position.y += p.userData.vy;
    p.position.z += p.userData.vz;
    p.userData.life--;

    if (p.userData.life <= 0) {
      scene.remove(p);
      if (p.geometry) p.geometry.dispose();
      if (p.material) p.material.dispose();
      particles.splice(i, 1);
    }
  }
}

function updateHUD() {
  const depthEl = document.getElementById('hudDepth');
  const coinsEl = document.getElementById('hudCoins');
  if (depthEl) depthEl.textContent = `${state.score}`;
  if (coinsEl) coinsEl.textContent = state.score;
}

function triggerGameOver() {
  state.isPlaying = false;
  state.isGameOver = true;
  document.getElementById('goDepth').textContent = state.score;
  document.getElementById('overlay-gameover').classList.add('active');
}

function triggerVictory() {
  state.isPlaying = false;
  state.isVictory = true;
  document.getElementById('vicCoins').textContent = state.score + 100;
  document.getElementById('overlay-victory').classList.add('active');
}

// --- RENDER LOOP ---
function animate() {
  requestAnimationFrame(animate);
  updatePhysics();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}
