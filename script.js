/* =========================================================================
   HELIX DROP 3D — Real-Time WebGL Engine with Three.js
   ========================================================================= */

(() => {
"use strict";

/* ========================================================================
   1. I18N & PROFILE CONFIGURATION
   ======================================================================== */
const I18N = {
  en:{ tagline:"Spin. Fall. Fly.", play:"▶ PLAY", levels:"Levels", ballShop:"Ball Shop", themes:"Themes",
    stats:"Stats", daily:"Daily", settings:"Settings", selectLevel:"Select Level", music:"Music",
    sound:"Sound Effects", vibration:"Vibration", graphics:"Graphics Quality", low:"Low", medium:"Medium",
    high:"High", sensitivity:"Sensitivity", brightness:"Brightness", language:"Language",
    dailyReward:"Daily Reward", claim:"CLAIM 50 🪙", achievements:"Achievements", paused:"Paused",
    resume:"▶ Resume", restart:"⟲ Restart", quit:"🏠 Main Menu", gameOver:"Game Over", depth:"depth",
    playAgain:"⟲ Play Again", levelComplete:"🎉 Level Complete!", nextLevel:"Next Level →" }
};

const SAVE_KEY = "helixDropSave_v1";
const defaultProfile = () => ({
  coins: 60, totalCoinsEarned: 0, gamesPlayed: 0, bestCombo: 0,
  highScores: { easy:0, medium:0, hard:0, expert:0, endless:0 },
  unlockedLevels: { easy:true, medium:true, hard:false, expert:false, endless:true },
  unlockedSkins: ["neon"], unlockedThemes: ["sky"],
  selectedSkin: "neon", selectedTheme: "sky", achievements: {}, lastDailyClaim: null,
  settings: { music:true, sound:true, vibration:true, graphics:"high", sensitivity:1, brightness:1, language:"en" }
});

let profile = loadProfile();

function loadProfile(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return defaultProfile();
    return Object.assign(defaultProfile(), JSON.parse(raw));
  }catch(e){ return defaultProfile(); }
}
function saveProfile(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); }catch(e){}
}

/* ========================================================================
   2. AUDIO ENGINE
   ======================================================================== */
const Audio_ = (() => {
  let ctx = null;
  function ensureCtx(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(AC) ctx = new AC();
    }
    if(ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, delay){
    if(!profile.settings.sound) return;
    const c = ensureCtx(); if(!c) return;
    const t0 = c.currentTime + (delay||0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol||0.18, t0+0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0); osc.stop(t0+dur+0.02);
  }
  return {
    sfx: {
      bounce(){ tone(320,0.12,"sine",0.22); },
      coin(){ tone(880,0.08,"triangle",0.2); tone(1320,0.1,"triangle",0.16,0.05); },
      combo(){ tone(600,0.2,"sawtooth",0.2); },
      gameover(){ tone(180,0.4,"sawtooth",0.25); },
      breakfx(){ tone(120,0.15,"square",0.3); }
    },
    ensureCtx
  };
})();

/* ========================================================================
   3. GAME DATA & THEMES
   ======================================================================== */
const LEVELS = [
  { id:"easy", name:"Easy", gapDeg:120, redChance:0.1, gravity:0.025, bounce:0.42, ringsToWin:20 },
  { id:"medium", name:"Medium", gapDeg:90, redChance:0.2, gravity:0.028, bounce:0.44, ringsToWin:30 }
];

const THEMES = {
  sky: { bg: 0x111625, pole: 0xffffff, safe: 0x22c176, hazard: 0x222222 },
  neon: { bg: 0x0a0017, pole: 0xffffff, safe: 0xff2ea6, hazard: 0x111111 },
  volcano: { bg: 0x1a0500, pole: 0xffffff, safe: 0xff5f1f, hazard: 0x1f1f1f }
};

/* ========================================================================
   4. THREE.JS 3D ENGINE
   ======================================================================== */
let scene, camera, renderer;
let poleMesh, ballMesh;
let helixGroup;
let rings3D = [];
let fragments3D = [];
let running = false, paused = false;
let level = LEVELS[0];
let ballState = { y: 0, vy: 0, radius: 0.5 };
let towerRotation = 0;
let runStats = { coinsThisRun:0, ringsCleared:0, comboSinceBounce:0, bestComboRun:0 };

const RING_GAP = 3.5;
const TOWER_RADIUS = 2.2;
const SEGMENTS_PER_RING = 16;

function initThreeJS(){
  const canvas = document.getElementById("gameCanvas");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 12);
  camera.lookAt(0, 0, 0);

  // Lighting Setup
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 15);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Central White Pole
  const poleGeo = new THREE.CylinderGeometry(0.8, 0.8, 500, 32);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  poleMesh = new THREE.Mesh(poleGeo, poleMat);
  poleMesh.position.y = -200;
  scene.add(poleMesh);

  // Helix Container
  helixGroup = new THREE.Group();
  scene.add(helixGroup);

  // Player Ball
  const ballGeo = new THREE.SphereGeometry(ballState.radius, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({ color: 0xff2a5f, roughness: 0.1, metalness: 0.2 });
  ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.castShadow = true;
  ballMesh.position.set(0, 0, TOWER_RADIUS);
  scene.add(ballMesh);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/* ========================================================================
   5. HELIX GEOMETRY GENERATION
   ======================================================================== */
function createRing3D(index) {
  const ringGroup = new THREE.Group();
  ringGroup.position.y = -index * RING_GAP;

  const activeTheme = THEMES[profile.selectedTheme] || THEMES.sky;
  const safeMat = new THREE.MeshStandardMaterial({ color: activeTheme.safe, roughness: 0.3 });
  const hazardMat = new THREE.MeshStandardMaterial({ color: activeTheme.hazard, roughness: 0.4 });

  const totalAngle = Math.PI * 2;
  const gapAngle = (level.gapDeg * Math.PI) / 180;
  const arcPerSeg = (totalAngle - gapAngle) / SEGMENTS_PER_RING;

  const hasHazard = Math.random() < level.redChance;
  const hazardIndex = hasHazard ? Math.floor(Math.random() * (SEGMENTS_PER_RING - 2)) : -1;

  for (let i = 0; i < SEGMENTS_PER_RING; i++) {
    const startAngle = i * arcPerSeg;
    const isHazard = (i === hazardIndex || i === hazardIndex + 1);

    // Create extruded 3D block segment
    const shape = new THREE.Shape();
    shape.absarc(0, 0, TOWER_RADIUS + 0.6, startAngle, startAngle + arcPerSeg - 0.02, false);
    shape.absarc(0, 0, 0.85, startAngle + arcPerSeg - 0.02, startAngle, true);

    const extrudeSettings = { depth: 0.4, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(Math.PI / 2);

    const block = new THREE.Mesh(geometry, isHazard ? hazardMat : safeMat);
    block.receiveShadow = true;
    block.castShadow = true;
    block.userData = { isHazard, index, segmentIndex: i };

    ringGroup.add(block);
  }

  ringGroup.userData = { index, resolved: false, hasHazard };
  helixGroup.add(ringGroup);
  rings3D.push(ringGroup);
}

function shatterRing(ring) {
  Audio_.sfx.breakfx();
  const children = [...ring.children];
  children.forEach(block => {
    helixGroup.remove(block);
    scene.add(block); // Move to world scene space for physics animation
    
    // Convert relative position to world coordinates
    block.position.y += ring.position.y;
    block.rotation.y += helixGroup.rotation.y;

    const angle = Math.atan2(block.position.z, block.position.x) + Math.random() * 0.4 - 0.2;
    const force = 0.15 + Math.random() * 0.1;

    fragments3D.push({
      mesh: block,
      vx: Math.cos(angle) * force,
      vy: 0.1 + Math.random() * 0.15,
      vz: Math.sin(angle) * force,
      rvx: Math.random() * 0.2,
      rvy: Math.random() * 0.2,
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
    f.vy -= 0.015; // Explosive gravity

    f.mesh.rotation.x += f.rvx;
    f.mesh.rotation.y += f.rvy;

    f.life -= 0.025;
    f.mesh.scale.multiplyScalar(0.96);

    if (f.life <= 0) {
      scene.remove(f.mesh);
      f.mesh.geometry.dispose();
      fragments3D.splice(i, 1);
    }
  }
}

/* ========================================================================
   6. GAME LOOP & PHYSICS
   ======================================================================== */
function startGame(levelId) {
  level = LEVELS.find(l => l.id === levelId) || LEVELS[0];
  
  // Clear old meshes
  rings3D.forEach(r => helixGroup.remove(r));
  fragments3D.forEach(f => scene.remove(f.mesh));
  rings3D = []; fragments3D = [];

  ballState.y = 1.2;
  ballState.vy = 0;
  towerRotation = 0;
  helixGroup.rotation.y = 0;
  runStats = { coinsThisRun:0, ringsCleared:0, comboSinceBounce:0, bestComboRun:0 };

  for (let i = 0; i < 25; i++) createRing3D(i);

  running = true; paused = false;
  showScreen("screen-game");
  requestAnimationFrame(loop);
}

function loop() {
  if (!running) return;
  requestAnimationFrame(loop);

  if (!paused) {
    // Apply gravity
    ballState.vy -= level.gravity;
    ballState.y += ballState.vy;

    const currentRingIndex = Math.floor((-ballState.y + 0.5) / RING_GAP);
    const ring = rings3D.find(r => r.userData.index === currentRingIndex);

    if (ring && !ring.userData.resolved) {
      const ringY = -currentRingIndex * RING_GAP;
      
      // Collision detection check
      if (ballState.y - ballState.radius <= ringY + 0.2 && ballState.vy < 0) {
        
        // Calculate collision angle relative to helix rotation
        let angle = (Math.PI / 2 - helixGroup.rotation.y) % (Math.PI * 2);
        if (angle < 0) angle += Math.PI * 2;

        const gapRad = (level.gapDeg * Math.PI) / 180;
        const inGap = angle > (Math.PI * 2 - gapRad);

        if (inGap) {
          // Passed safely through gap
          runStats.comboSinceBounce++;
          runStats.ringsCleared++;
          ring.userData.resolved = true;

          // Shatter ring if combo is active
          if (runStats.comboSinceBounce >= 2) {
            shatterRing(ring);
          }
        } else {
          // Hit platform surface
          if (ring.userData.hasHazard && Math.random() < 0.25) {
            // Hit obstacle - Game Over
            Audio_.sfx.gameover();
            running = false;
            showOverlay("overlay-gameover");
            return;
          }

          // Safe bounce
          ballState.vy = level.bounce;
          ballState.y = ringY + ballState.radius + 0.2;
          runStats.comboSinceBounce = 0;
          Audio_.sfx.bounce();
        }
      }
    }

    // Dynamic Camera Tracking
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, ballState.y + 3.5, 0.1);
    ballMesh.position.y = ballState.y;

    updateFragments();
  }

  renderer.render(scene, camera);
}

/* ========================================================================
   7. CONTROLS & UI MOUNT
   ======================================================================== */
function attachControls() {
  let isDown = false;
  let lastX = 0;

  window.addEventListener('pointerdown', e => {
    isDown = true;
    lastX = e.clientX;
  });

  window.addEventListener('pointermove', e => {
    if (!isDown || !running || paused) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    helixGroup.rotation.y += dx * 0.008 * profile.settings.sensitivity;
  });

  window.addEventListener('pointerup', () => isDown = false);
}

function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}
function showOverlay(id){ document.getElementById(id).classList.add("active"); }

document.addEventListener("DOMContentLoaded", () => {
  initThreeJS();
  attachControls();

  document.getElementById("btnPlay").addEventListener("click", () => startGame("easy"));
  
  // Transition Loader to Menu
  setTimeout(() => {
    showScreen("screen-menu");
  }, 800);
});

})();
