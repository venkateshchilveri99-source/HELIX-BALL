/* =========================================================
   HELIX DROP — Game Logic Engine (Three.js)
   ========================================================= */

// --- GLOBAL GAME STATE ---
const state = {
  coins: 0,
  highScore: 0,
  currentLevel: 1,
  depth: 0,
  score: 0,
  comboCount: 0,
  isPaused: false,
  isPlaying: false,
  sensitivity: 1.0,
  graphicsQuality: 'high',
  activeBallSkin: 'default',
  activeTheme: 'classic'
};

// --- THREE.JS GLOBALS ---
let scene, camera, renderer;
let towerGroup, ballMesh;
let platforms = [];
let particles = [];

// Physics Constants
const GRAVITY = -0.015;
const BOUNCE_IMPULSE = 0.28;
const BALL_RADIUS = 0.35;
const TOWER_RADIUS = 1.8;
const PLATFORM_GAP_HEIGHT = 3.2;
const PASS_THRESHOLD_FOR_BREAK = 3;

let ballVelocityY = 0;
let ballPosY = 0;
let isDragging = false;
let previousTouchX = 0;

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
  initUI();
  initThree();
  setupTouchEvents();
  animate();
  simulateLoading();
});

// --- UI & SCREEN NAVIGATION ---
function initUI() {
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => switchScreen(btn.dataset.back));
  });

  document.getElementById('btnPlay').addEventListener('click', () => startGame());
  document.getElementById('btnPause').addEventListener('click', pauseGame);
  document.getElementById('btnResume').addEventListener('click', resumeGame);
  document.getElementById('btnRestartFromPause').addEventListener('click', () => { hideOverlays(); startGame(); });
  document.getElementById('btnRestartFromGO').addEventListener('click', () => { hideOverlays(); startGame(); });
  document.getElementById('btnQuitToMenu').addEventListener('click', quitToMenu);
  document.getElementById('btnMenuFromGO').addEventListener('click', quitToMenu);
  document.getElementById('btnNextLevel').addEventListener('click', () => {
    state.currentLevel++;
    hideOverlays();
    startGame();
  });

  const sensInput = document.getElementById('sliderSensitivity');
  if (sensInput) {
    sensInput.addEventListener('input', (e) => {
      state.sensitivity = parseFloat(e.target.value);
    });
  }
}

function simulateLoading() {
  const fill = document.getElementById('loaderFill');
  const text = document.getElementById('loaderText');
  let progress = 0;
  const interval = setInterval(() => {
    progress += 15;
    if (fill) fill.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(interval);
      if (text) text.textContent = "Ready!";
      setTimeout(() => switchScreen('screen-menu'), 400);
    }
  }, 100);
}

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

function hideOverlays() {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
}

// --- THREE.JS SCENE SETUP ---
function initThree() {
  const container = document.getElementById('gameCanvasWrap');
  const canvas = document.getElementById('gameCanvas');

  scene = new THREE.Scene();
  scene.background = null; // Transparent to view ambient gradient background

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 5, 9);
  camera.lookAt(0, 1, 0);

  renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 12, 7);
  scene.add(dirLight);

  // Tower Container
  towerGroup = new THREE.Group();
  scene.add(towerGroup);

  // Ball
  const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({
    color: 0xff5fb0,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0x330011
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

// --- TOUCH & MOUSE INPUT CONTROLS ---
function setupTouchEvents() {
  const canvas = document.getElementById('gameCanvas');

  // Touch Start
  const onTouchStart = (e) => {
    if (!state.isPlaying || state.isPaused) return;
    isDragging = true;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    previousTouchX = x;
  };

  // Touch Move
  const onTouchMove = (e) => {
    if (!isDragging || !state.isPlaying || state.isPaused) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = x - previousTouchX;

    if (towerGroup) {
      towerGroup.rotation.y += deltaX * 0.008 * state.sensitivity;
    }
    previousTouchX = x;
  };

  // Touch End
  const onTouchEnd = () => { isDragging = false; };

  // Canvas Event Listeners
  canvas.addEventListener('touchstart', onTouchStart, { passive: true });
  canvas.addEventListener('touchmove', onTouchMove, { passive: true });
  canvas.addEventListener('touchend', onTouchEnd, { passive: true });
  canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });

  // Mouse fallback for PC browser testing
  canvas.addEventListener('mousedown', onTouchStart);
  window.addEventListener('mousemove', onTouchMove);
  window.addEventListener('mouseup', onTouchEnd);
}

// --- LEVEL GENERATION ---
function buildLevel(levelNum) {
  // Clear previous tower slices
  while (towerGroup.children.length > 0) {
    const obj = towerGroup.children[0];
    towerGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }
  platforms = [];

  // Central pole
  const poleGeo = new THREE.CylinderGeometry(0.5, 0.5, 120, 32);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.y = -55;
  towerGroup.add(pole);

  // Generate Helix Ring Platforms
  const platformCount = 15 + levelNum * 2;
  for (let i = 0; i < platformCount; i++) {
    const posY = -i * PLATFORM_GAP_HEIGHT;
    const isGoal = i === platformCount - 1;
    const platform = createHelixPlatform(posY, isGoal);
    towerGroup.add(platform.group);
    platforms.push(platform);
  }
}

function createHelixPlatform(posY, isGoal) {
  const group = new THREE.Group();
  group.position.y = posY;

  const segmentCount = 12; // 12 slices make up 360 degrees
  const gapIndex1 = Math.floor(Math.random() * segmentCount);
  const gapIndex2 = (gapIndex1 + 1) % segmentCount;

  // Danger red zone placement
  const dangerIndex = (gapIndex1 + 4) % segmentCount;

  const slices = [];

  for (let i = 0; i < segmentCount; i++) {
    // Leave missing segments for open gaps
    if (i === gapIndex1 || i === gapIndex2) continue;

    const angleStart = (i / segmentCount) * Math.PI * 2;
    const angleLength = (1 / segmentCount) * Math.PI * 2;

    const isDanger = !isGoal && (i === dangerIndex);
    const sliceGeo = new THREE.RingGeometry(0.5, TOWER_RADIUS, 16, 1, angleStart, angleLength);
    sliceGeo.rotateX(-Math.PI / 2); // Lay flat horizontally

    const color = isGoal ? 0xffd23f : (isDanger ? 0xff4d6d : 0x8a4dff);
    const sliceMat = new THREE.MeshStandardMaterial({
      color: color,
      side: THREE.DoubleSide,
      roughness: 0.3
    });

    const sliceMesh = new THREE.Mesh(sliceGeo, sliceMat);
    group.add(sliceMesh);

    slices.push({
      mesh: sliceMesh,
      angleStart: angleStart,
      angleEnd: angleStart + angleLength,
      isDanger: isDanger,
      isGoal: isGoal
    });
  }

  return { group, posY, slices, passed: false };
}

// --- GAMEPLAY ENGINE & LOOPS ---
function startGame() {
  state.isPlaying = true;
  state.isPaused = false;
  state.depth = 0;
  state.score = 0;
  state.comboCount = 0;

  ballPosY = 1.2;
  ballVelocityY = 0;
  ballMesh.position.set(0, ballPosY, TOWER_RADIUS - 0.4);

  buildLevel(state.currentLevel);
  switchScreen('screen-game');
  updateHUD();
}

function pauseGame() {
  if (!state.isPlaying) return;
  state.isPaused = true;
  document.getElementById('overlay-pause').classList.add('active');
}

function resumeGame() {
  state.isPaused = false;
  document.getElementById('overlay-pause').classList.remove('active');
}

function quitToMenu() {
  state.isPlaying = false;
  state.isPaused = false;
  hideOverlays();
  switchScreen('screen-menu');
}

// --- PHYSICS & COLLISION DETECTION ---
function updatePhysics() {
  if (!state.isPlaying || state.isPaused) return;

  // Apply acceleration
  ballVelocityY += GRAVITY;
  ballPosY += ballVelocityY;

  // Camera tracking
  camera.position.y = ballPosY + 3.8;
  camera.lookAt(0, ballPosY - 0.5, 0);

  ballMesh.position.y = ballPosY;

  // Process Platform Collisions
  for (let i = 0; i < platforms.length; i++) {
    const plat = platforms[i];
    const diffY = ballPosY - plat.posY;

    // Check when ball passes downward through a platform level
    if (diffY <= BALL_RADIUS && diffY >= -0.4 && ballVelocityY < 0) {
      const normalizedRot = ((-towerGroup.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

      let collidedSlice = null;
      for (const slice of plat.slices) {
        if (normalizedRot >= slice.angleStart && normalizedRot <= slice.angleEnd) {
          collidedSlice = slice;
          break;
        }
      }

      if (collidedSlice) {
        // High momentum drop or power streak breaks through platform
        if (state.comboCount >= PASS_THRESHOLD_FOR_BREAK || ballVelocityY < -0.45) {
          shatterPlatform(plat);
          triggerComboPopup();
          ballVelocityY = -0.15; // Maintain downward momentum
        } 
        else if (collidedSlice.isDanger) {
          gameOver();
          return;
        } 
        else if (collidedSlice.isGoal) {
          levelComplete();
          return;
        } 
        else {
          // Normal Bounce
          ballPosY = plat.posY + BALL_RADIUS;
          ballVelocityY = BOUNCE_IMPULSE;
          state.comboCount = 0;
          createBounceSplash(ballMesh.position);
        }
      } else {
        // Passed clean through open gap
        if (!plat.passed) {
          plat.passed = true;
          state.comboCount++;
          state.depth += 1;
          state.score += 10 * state.comboCount;
          updateHUD();
        }
      }
    }
  }

  // Fallback bottom limit check
  if (ballPosY < -150) {
    levelComplete();
  }

  // Update floating shatter particles
  updateParticles();
}

// --- PLATFORM SHATTER MECHANIC ---
function shatterPlatform(platform) {
  platform.slices.forEach(slice => {
    createShatterBits(slice.mesh, platform.posY);
    platform.group.remove(slice.mesh);
    if (slice.mesh.geometry) slice.mesh.geometry.dispose();
    if (slice.mesh.material) slice.mesh.material.dispose();
  });
  platform.slices = [];
}

function createShatterBits(mesh, posY) {
  for (let i = 0; i < 5; i++) {
    const pGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const pMat = mesh.material.clone();
    const p = new THREE.Mesh(pGeo, pMat);

    p.position.set(
      (Math.random() - 0.5) * 1.5,
      posY,
      TOWER_RADIUS - 0.4 + (Math.random() - 0.5)
    );

    p.userData = {
      vx: (Math.random() - 0.5) * 0.2,
      vy: Math.random() * 0.1 + 0.1,
      vz: (Math.random() - 0.5) * 0.2,
      life: 30
    };

    scene.add(p);
    particles.push(p);
  }
}

function createBounceSplash(pos) {
  const splashGeo = new THREE.CircleGeometry(0.3, 16);
  splashGeo.rotateX(-Math.PI / 2);
  const splashMat = new THREE.MeshBasicMaterial({
    color: 0xff5fb0,
    transparent: true,
    opacity: 0.8
  });
  const splash = new THREE.Mesh(splashGeo, splashMat);
  splash.position.set(pos.x, pos.y - BALL_RADIUS + 0.01, pos.z);
  towerGroup.add(splash);

  setTimeout(() => {
    towerGroup.remove(splash);
    splashGeo.dispose();
    splashMat.dispose();
  }, 400);
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.position.x += p.userData.vx;
    p.position.y += p.userData.vy;
    p.position.z += p.userData.vz;
    p.userData.vy += GRAVITY;
    p.userData.life--;

    if (p.userData.life <= 0) {
      scene.remove(p);
      p.geometry.dispose();
      p.material.dispose();
      particles.splice(i, 1);
    }
  }
}

function triggerComboPopup() {
  const popup = document.getElementById('comboPopup');
  if (!popup) return;
  popup.textContent = `COMBO ×${state.comboCount}`;
  popup.classList.remove('show');
  void popup.offsetWidth; // Force CSS DOM reflow
  popup.classList.add('show');
}

function updateHUD() {
  const depthEl = document.getElementById('hudDepth');
  const coinsEl = document.getElementById('hudCoins');
  if (depthEl) depthEl.textContent = `${state.depth}m`;
  if (coinsEl) coinsEl.textContent = state.score;
}

function gameOver() {
  state.isPlaying = false;
  document.getElementById('goDepth').textContent = state.depth;
  document.getElementById('goCoins').textContent = state.score;
  document.getElementById('overlay-gameover').classList.add('active');
}

function levelComplete() {
  state.isPlaying = false;
  document.getElementById('vicCoins').textContent = state.score + 50;
  document.getElementById('vicStars').textContent = "⭐⭐⭐";
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
