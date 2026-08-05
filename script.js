/* =========================================================
   HELIX STACK BALL ENGINE — Fully Rotating Rod & Passive Touch
   ========================================================= */

// --- GLOBAL GAME STATE ---
const state = {
  score: 0,
  currentLevel: 1,
  isPressing: false,
  isPlaying: false,
  isGameOver: false,
  isVictory: false,
  isPaused: false,
  fireMode: false,
  fireStreak: 0,

  // Customization & Shop Stats
  coins: parseInt(localStorage.getItem('helix_coins') || '100'),
  highScore: parseInt(localStorage.getItem('helix_highscore') || '0'),
  selectedBall: localStorage.getItem('helix_selected_ball') || 'default',
  selectedTheme: parseInt(localStorage.getItem('helix_selected_theme') || '0'),
  ownedBalls: JSON.parse(localStorage.getItem('helix_owned_balls') || '["default"]'),

  // Settings
  musicEnabled: localStorage.getItem('helix_music') !== 'false',
  soundEnabled: localStorage.getItem('helix_sound') !== 'false',
  vibrationEnabled: localStorage.getItem('helix_vibration') !== 'false',
  sensitivity: parseFloat(localStorage.getItem('helix_sensitivity') || '1.0'),
  brightness: parseFloat(localStorage.getItem('helix_brightness') || '1.0'),
  graphics: localStorage.getItem('helix_graphics') || 'medium',
  lang: localStorage.getItem('helix_lang') || 'en',

  // Stats
  totalGames: parseInt(localStorage.getItem('helix_stat_games') || '0'),
  totalSmashed: parseInt(localStorage.getItem('helix_stat_smashed') || '0'),
  totalCoins: parseInt(localStorage.getItem('helix_stat_coins') || '100'),
  highestLevel: parseInt(localStorage.getItem('helix_stat_highest_level') || '1'),
};

// --- TRANSLATIONS DICTIONARY ---
const TRANSLATIONS = {
  en: {
    tagline: "Spin. Fall. Fly.",
    play: "▶ PLAY",
    levels: "Levels",
    ballShop: "Ball Shop",
    themes: "Themes",
    stats: "Stats",
    daily: "Daily",
    settings: "Settings",
    selectLevel: "Select Level",
    music: "Music",
    sound: "Sound Effects",
    vibration: "Vibration",
    graphics: "Graphics Quality",
    low: "Low",
    medium: "Medium",
    high: "High",
    sensitivity: "Sensitivity",
    brightness: "Brightness",
    language: "Language",
    dailyReward: "Daily Reward",
    claim: "CLAIM 50 🪙",
    achievements: "Achievements",
    paused: "Paused",
    resume: "▶ Resume",
    restart: "⟲ Restart",
    quit: "🏠 Main Menu",
    gameOver: "Game Over",
    depth: "depth",
    playAgain: "⟲ Play Again",
    levelComplete: "🎉 Level Complete!",
    nextLevel: "Next Level →",
    alreadyClaimed: "Already Claimed"
  },
  es: {
    tagline: "Gira. Cae. Vuela.",
    play: "▶ JUGAR",
    levels: "Niveles",
    ballShop: "Tienda",
    themes: "Temas",
    stats: "Estadísticas",
    daily: "Diario",
    settings: "Ajustes",
    selectLevel: "Seleccionar Nivel",
    music: "Música",
    sound: "Sonido",
    vibration: "Vibración",
    graphics: "Calidad Gráfica",
    low: "Baja",
    medium: "Media",
    high: "Alta",
    sensitivity: "Sensibilidad",
    brightness: "Brillo",
    language: "Idioma",
    dailyReward: "Premio Diario",
    claim: "RECLAMAR 50 🪙",
    achievements: "Logros",
    paused: "Pausado",
    resume: "▶ Reanudar",
    restart: "⟲ Reiniciar",
    quit: "🏠 Menú Principal",
    gameOver: "Fin del Juego",
    depth: "profundidad",
    playAgain: "⟲ Jugar de Nuevo",
    levelComplete: "🎉 ¡Nivel Completo!",
    nextLevel: "Siguiente Nivel →",
    alreadyClaimed: "Ya reclamado"
  },
  hi: {
    tagline: "घूमें। गिरें। उड़ें।",
    play: "▶ खेलें",
    levels: "स्तर",
    ballShop: "गेंद दुकान",
    themes: "थीम",
    stats: "आँकड़े",
    daily: "दैनिक",
    settings: "सेटिंग्स",
    selectLevel: "स्तर चुनें",
    music: "संगीत",
    sound: "ध्वनि प्रभाव",
    vibration: "कंपन",
    graphics: "ग्राफिक्स गुणवत्ता",
    low: "कम",
    medium: "मध्यम",
    high: "उच्च",
    sensitivity: "संवेदनशीलता",
    brightness: "चमक",
    language: "भाषा",
    dailyReward: "दैनिक पुरस्कार",
    claim: "दावा करें 50 🪙",
    achievements: "उपलब्धियां",
    paused: "रुका हुआ",
    resume: "▶ जारी रखें",
    restart: "⟲ पुनः आरंभ",
    quit: "🏠 मुख्य मेनू",
    gameOver: "खेल खत्म",
    depth: "गहराई",
    playAgain: "⟲ फिर से खेलें",
    levelComplete: "🎉 स्तर पूरा हुआ!",
    nextLevel: "अगला स्तर →",
    alreadyClaimed: "पहले ही दावा किया"
  }
};

// --- SKINS & THEMES DEFINITIONS ---
const BALL_SKINS = [
  { id: 'default', name: 'Standard Blue', color: 0x00d2ff, emissive: 0x004466, price: 0 },
  { id: 'neon_aqua', name: 'Neon Aqua', color: 0x00ffff, emissive: 0x003333, price: 50 },
  { id: 'golden_spark', name: 'Golden Spark', color: 0xffd700, emissive: 0x332200, price: 100 },
  { id: 'ruby_fire', name: 'Ruby Fire', color: 0xff0055, emissive: 0x330011, price: 150 },
  { id: 'purple_shadow', name: 'Purple Shadow', color: 0x8a4dff, emissive: 0x220033, price: 200 }
];

const TOWER_THEMES = [
  { name: "Ocean Breeze", safeColor: 0x0099ff, dangerColor: 0x1a1a1a, sky: "#5ec8ff", pink: "#ff5fb0" },
  { name: "Sunset Lava", safeColor: 0xff5f4d, dangerColor: 0x111111, sky: "#ffb347", pink: "#ff5fb0" },
  { name: "Emerald Forest", safeColor: 0x00e640, dangerColor: 0x222222, sky: "#39e6d0", pink: "#8a4dff" },
  { name: "Royal Cyber", safeColor: 0x7b5cff, dangerColor: 0x0a0c10, sky: "#8a4dff", pink: "#ff5fb0" }
];

// --- THREE.JS GLOBALS ---
let scene, camera, renderer;
let towerGroup, ballMesh, poleMesh;
let stackPlatforms = [];
let particles = [];

// Physics & Mechanics Parameters
const GRAVITY = -0.007;
const SMASH_SPEED = -0.18;
const BOUNCE_IMPULSE = 0.14;
const BALL_RADIUS = 0.35;
const TOWER_RADIUS = 1.6;
const LAYER_HEIGHT = 0.35;
const TOTAL_LAYERS = 45;

let ballPosY = 0;
let ballVelocityY = 0;

// --- DOM INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
  initUI();
  initThree();
  setupTouchAndInput();
  animate();

  let progress = 0;
  const interval = setInterval(() => {
    progress += 20;
    const loader = document.getElementById('loaderFill');
    if (loader) loader.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(interval);
      switchScreen('screen-menu');
    }
  }, 150);
});

// --- SCREEN SWITCHER ---
function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
  }

  if (screenId === 'screen-menu') {
    updateMenuStats();
  } else if (screenId === 'screen-shop') {
    renderShop();
  } else if (screenId === 'screen-themes') {
    renderThemes();
  } else if (screenId === 'screen-levels') {
    renderLevels();
  } else if (screenId === 'screen-stats') {
    renderStatsPage();
  } else if (screenId === 'screen-settings') {
    loadSettingsPage();
  }
}

function hideOverlays() {
  document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
}

// --- LOCALSTORAGE UTILITIES ---
function saveToStorage() {
  localStorage.setItem('helix_coins', state.coins.toString());
  localStorage.setItem('helix_highscore', state.highScore.toString());
  localStorage.setItem('helix_selected_ball', state.selectedBall);
  localStorage.setItem('helix_selected_theme', state.selectedTheme.toString());
  localStorage.setItem('helix_owned_balls', JSON.stringify(state.ownedBalls));
  localStorage.setItem('helix_stat_games', state.totalGames.toString());
  localStorage.setItem('helix_stat_smashed', state.totalSmashed.toString());
  localStorage.setItem('helix_stat_coins', state.totalCoins.toString());
  localStorage.setItem('helix_stat_highest_level', state.highestLevel.toString());
}

// --- TRANSLATE PAGE ---
function translatePage() {
  const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      if (el.tagName === 'INPUT' && el.type === 'button') {
        el.value = dict[key];
      } else {
        el.textContent = dict[key];
      }
    }
  });
}

// --- LOAD MENU STATS ---
function updateMenuStats() {
  const menuCoins = document.getElementById('menuCoins');
  const menuHigh = document.getElementById('menuHigh');
  if (menuCoins) menuCoins.textContent = state.coins;
  if (menuHigh) menuHigh.textContent = state.highScore;
  translatePage();
}

// --- RENDER LEVELS PAGE ---
function renderLevels() {
  const container = document.getElementById('levelList');
  if (!container) return;
  container.innerHTML = '';

  for (let i = 1; i <= 10; i++) {
    const isLocked = i > state.highestLevel;
    const card = document.createElement('div');
    card.className = `level-card ${isLocked ? 'locked' : ''}`;

    card.innerHTML = `
      <div>
        <h3>Level ${i}</h3>
        <p>${isLocked ? 'Locked' : 'Click to play'}</p>
      </div>
      <div class="level-badge">${isLocked ? '🔒' : '⭐'}</div>
    `;

    if (!isLocked) {
      card.addEventListener('click', () => {
        state.currentLevel = i;
        startGame();
      });
    }
    container.appendChild(card);
  }
}

// --- RENDER SHOP ---
function renderShop() {
  const container = document.getElementById('ballGrid');
  const shopCoins = document.getElementById('shopCoins');
  if (shopCoins) shopCoins.textContent = state.coins;
  if (!container) return;
  container.innerHTML = '';

  BALL_SKINS.forEach(skin => {
    const isOwned = state.ownedBalls.includes(skin.id);
    const isSelected = state.selectedBall === skin.id;

    const card = document.createElement('div');
    card.className = `item-card ${isSelected ? 'selected' : ''}`;

    const hexStr = '#' + skin.color.toString(16).padStart(6, '0');

    card.innerHTML = `
      <div class="item-preview-ball" style="background: radial-gradient(circle at 35% 30%, #fff, ${hexStr} 50%, #000 100%)"></div>
      <div class="item-name">${skin.name}</div>
      <div class="item-price">${isSelected ? 'Equipped' : isOwned ? 'Equip' : skin.price + ' 🪙'}</div>
      ${!isOwned ? '<div class="item-lock">🔒</div>' : ''}
    `;

    card.addEventListener('click', () => {
      if (isOwned) {
        state.selectedBall = skin.id;
        saveToStorage();
        updateBallMaterial();
        renderShop();
      } else {
        if (state.coins >= skin.price) {
          state.coins -= skin.price;
          state.ownedBalls.push(skin.id);
          state.selectedBall = skin.id;
          saveToStorage();
          updateBallMaterial();
          renderShop();
        } else {
          alert('Not enough coins!');
        }
      }
    });

    container.appendChild(card);
  });
}

// --- RENDER THEMES ---
function renderThemes() {
  const container = document.getElementById('themeGrid');
  const themeCoins = document.getElementById('themeCoins');
  if (themeCoins) themeCoins.textContent = state.coins;
  if (!container) return;
  container.innerHTML = '';

  TOWER_THEMES.forEach((theme, idx) => {
    const isSelected = state.selectedTheme === idx;
    const card = document.createElement('div');
    card.className = `item-card ${isSelected ? 'selected' : ''}`;

    card.innerHTML = `
      <div class="item-preview-theme" style="background: linear-gradient(135deg, ${theme.sky}, ${theme.pink})"></div>
      <div class="item-name">${theme.name}</div>
      <div class="item-price">${isSelected ? 'Equipped' : 'Select'}</div>
    `;

    card.addEventListener('click', () => {
      state.selectedTheme = idx;
      saveToStorage();
      updateTowerTheme();
      renderThemes();
    });

    container.appendChild(card);
  });
}

// --- UPDATE TOWER THEME ---
function updateTowerTheme() {
  const activeTheme = TOWER_THEMES[state.selectedTheme] || TOWER_THEMES[0];
  const bgGrad = document.querySelector('.bg-gradient');
  if (bgGrad) {
    bgGrad.style.background = `
      radial-gradient(circle at 15% 15%, ${activeTheme.sky} 0%, transparent 45%),
      radial-gradient(circle at 85% 20%, ${activeTheme.pink} 0%, transparent 50%),
      linear-gradient(160deg, ${activeTheme.sky}, #170b33)
    `;
  }
}

// --- RENDER STATS & ACHIEVEMENTS ---
function renderStatsPage() {
  const totalGames = document.getElementById('statTotalGames');
  const totalSmashed = document.getElementById('statTotalSmashed');
  const totalCoins = document.getElementById('statTotalCoins');
  const highestLevel = document.getElementById('statHighestLevel');

  if (totalGames) totalGames.textContent = state.totalGames;
  if (totalSmashed) totalSmashed.textContent = state.totalSmashed;
  if (totalCoins) totalCoins.textContent = state.coins;
  if (highestLevel) highestLevel.textContent = state.highestLevel;

  const achv1 = document.getElementById('achv-1');
  const achv2 = document.getElementById('achv-2');
  const achv3 = document.getElementById('achv-3');

  if (achv1) {
    if (state.highestLevel >= 2) achv1.classList.add('unlocked');
    else achv1.classList.remove('unlocked');
  }
  if (achv2) {
    if (state.totalSmashed >= 8) achv2.classList.add('unlocked');
    else achv2.classList.remove('unlocked');
  }
  if (achv3) {
    if (state.coins >= 500) achv3.classList.add('unlocked');
    else achv3.classList.remove('unlocked');
  }
}

// --- LOAD SETTINGS PAGE ---
function loadSettingsPage() {
  const musicChk = document.getElementById('toggleMusic');
  const soundChk = document.getElementById('toggleSound');
  const vibChk = document.getElementById('toggleVibration');
  const sensSlider = document.getElementById('sliderSensitivity');
  const brightSlider = document.getElementById('sliderBrightness');

  if (musicChk) musicChk.checked = state.musicEnabled;
  if (soundChk) soundChk.checked = state.soundEnabled;
  if (vibChk) vibChk.checked = state.vibrationEnabled;
  if (sensSlider) sensSlider.value = state.sensitivity;
  if (brightSlider) brightSlider.value = state.brightness;

  document.querySelectorAll('#graphicsSeg button').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-val') === state.graphics);
  });

  document.querySelectorAll('#langSeg button').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-val') === state.lang);
  });
}

// --- INIT UI EVENT HANDLERS ---
function initUI() {
  const bindClick = (id, handler) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
      });
    }
  };

  bindClick('btnPlay', startGame);
  bindClick('btnLevels', () => switchScreen('screen-levels'));
  bindClick('btnShop', () => switchScreen('screen-shop'));
  bindClick('btnThemes', () => switchScreen('screen-themes'));
  bindClick('btnStats', () => switchScreen('screen-stats'));
  bindClick('btnDaily', () => switchScreen('screen-daily'));
  bindClick('btnSettings', () => switchScreen('screen-settings'));

  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = btn.getAttribute('data-back') || 'screen-menu';
      switchScreen(target);
    });
  });

  bindClick('btnPause', () => {
    if (!state.isPlaying) return;
    state.isPaused = true;
    document.getElementById('overlay-pause').classList.add('active');
  });

  bindClick('btnResume', () => {
    state.isPaused = false;
    hideOverlays();
  });

  bindClick('btnRestartFromPause', () => {
    state.isPaused = false;
    hideOverlays();
    startGame();
  });

  bindClick('btnQuitToMenu', () => {
    state.isPlaying = false;
    state.isPaused = false;
    hideOverlays();
    switchScreen('screen-menu');
  });

  bindClick('btnRestartFromGO', () => {
    hideOverlays();
    startGame();
  });

  bindClick('btnMenuFromGO', () => {
    hideOverlays();
    switchScreen('screen-menu');
  });

  bindClick('btnNextLevel', () => {
    state.currentLevel++;
    if (state.currentLevel > state.highestLevel) {
      state.highestLevel = state.currentLevel;
    }
    saveToStorage();
    hideOverlays();
    startGame();
  });

  bindClick('btnMenuFromVic', () => {
    hideOverlays();
    switchScreen('screen-menu');
  });

  const musicChk = document.getElementById('toggleMusic');
  if (musicChk) {
    musicChk.addEventListener('change', () => {
      state.musicEnabled = musicChk.checked;
      localStorage.setItem('helix_music', state.musicEnabled.toString());
    });
  }

  const soundChk = document.getElementById('toggleSound');
  if (soundChk) {
    soundChk.addEventListener('change', () => {
      state.soundEnabled = soundChk.checked;
      localStorage.setItem('helix_sound', state.soundEnabled.toString());
    });
  }

  const vibChk = document.getElementById('toggleVibration');
  if (vibChk) {
    vibChk.addEventListener('change', () => {
      state.vibrationEnabled = vibChk.checked;
      localStorage.setItem('helix_vibration', state.vibrationEnabled.toString());
    });
  }

  const sensSlider = document.getElementById('sliderSensitivity');
  if (sensSlider) {
    sensSlider.addEventListener('input', () => {
      state.sensitivity = parseFloat(sensSlider.value);
      localStorage.setItem('helix_sensitivity', state.sensitivity.toString());
    });
  }

  const brightSlider = document.getElementById('sliderBrightness');
  if (brightSlider) {
    brightSlider.addEventListener('input', () => {
      state.brightness = parseFloat(brightSlider.value);
      localStorage.setItem('helix_brightness', state.brightness.toString());
      document.getElementById('app').style.filter = `brightness(${state.brightness})`;
      document.querySelector('.bg-scene').style.filter = `brightness(${state.brightness})`;
    });
  }

  document.querySelectorAll('#graphicsSeg button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#graphicsSeg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.graphics = btn.getAttribute('data-val');
      localStorage.setItem('helix_graphics', state.graphics);

      if (renderer) {
        if (state.graphics === 'low') renderer.setPixelRatio(0.75);
        else if (state.graphics === 'medium') renderer.setPixelRatio(1);
        else renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }
    });
  });

  document.querySelectorAll('#langSeg button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#langSeg button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.lang = btn.getAttribute('data-val');
      localStorage.setItem('helix_lang', state.lang);
      translatePage();
    });
  });

  bindClick('btnClaimDaily', () => {
    const claimBtn = document.getElementById('btnClaimDaily');
    const lastClaim = parseInt(localStorage.getItem('helix_last_claim') || '0');
    const now = Date.now();

    if (now - lastClaim >= 86400000) {
      state.coins += 50;
      state.totalCoins += 50;
      localStorage.setItem('helix_last_claim', now.toString());
      saveToStorage();

      const dict = TRANSLATIONS[state.lang] || TRANSLATIONS.en;
      if (claimBtn) {
        claimBtn.textContent = dict.alreadyClaimed || "Already Claimed";
        claimBtn.disabled = true;
      }
      alert('You claimed 50 🪙!');
      updateMenuStats();
    } else {
      alert('You have already claimed your reward today! Check back later.');
    }
  });

  document.getElementById('app').style.filter = `brightness(${state.brightness})`;
  updateTowerTheme();
}

// --- UPDATE BALL SKIN COLORS ---
function updateBallMaterial() {
  if (!ballMesh) return;
  const currentSkin = BALL_SKINS.find(s => s.id === state.selectedBall) || BALL_SKINS[0];
  ballMesh.material.color.setHex(currentSkin.color);
  ballMesh.material.emissive.setHex(currentSkin.emissive);
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

  if (state.graphics === 'low') renderer.setPixelRatio(0.75);
  else if (state.graphics === 'medium') renderer.setPixelRatio(1);
  else renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
  dirLight.position.set(5, 15, 8);
  scene.add(dirLight);

  towerGroup = new THREE.Group();
  scene.add(towerGroup);

  const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
  const ballMat = new THREE.MeshStandardMaterial({
    roughness: 0.1,
    metalness: 0.2
  });
  ballMesh = new THREE.Mesh(ballGeo, ballMat);
  updateBallMaterial();
  scene.add(ballMesh);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- TOUCH & PASSIVE INPUT CONTROLS ---
let isDragging = false;
let previousPointerX = 0;

function setupTouchAndInput() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;

  canvas.addEventListener('pointerdown', (e) => {
    if (!state.isPlaying || state.isGameOver || state.isVictory || state.isPaused) return;
    if (e.target.closest('.hud-btn') || e.target.closest('.hud-coins')) return;

    isDragging = true;
    previousPointerX = e.clientX;
    state.isPressing = true; // Enables active smashing down
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging || !state.isPlaying || state.isGameOver || state.isVictory || state.isPaused) return;

    const deltaX = e.clientX - previousPointerX;
    previousPointerX = e.clientX;

    const rotSensitivity = 0.006 * state.sensitivity;
    towerGroup.rotation.y -= deltaX * rotSensitivity;
  });

  const onPointerUp = () => {
    isDragging = false;
    state.isPressing = false; // Reverts back to passive bounce state
  };

  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
}

// --- PROCEDURAL TEXTURE FOR ROD VISUAL SPIN ---
function createRodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#dddddd';
  for (let i = 0; i < 256; i += 32) {
    ctx.fillRect(i, 0, 16, 256);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 20);
  return texture;
}

// --- BUILD STACK TOWER ---
function buildStackTower() {
  while (towerGroup.children.length > 0) {
    const obj = towerGroup.children[0];
    towerGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }
  stackPlatforms = [];

  // Central Rotating Rod Geometry & Material
  const poleGeo = new THREE.CylinderGeometry(0.65, 0.65, TOTAL_LAYERS * LAYER_HEIGHT + 10, 32);
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0xeeeeee,
    roughness: 0.3,
    metalness: 0.1,
    map: createRodTexture()
  });

  poleMesh = new THREE.Mesh(poleGeo, poleMat);
  poleMesh.position.y = -(TOTAL_LAYERS * LAYER_HEIGHT) / 2;

  // ATTACH ROD DIRECTLY TO TOWER GROUP FOR CONTINUOUS ROTATION
  towerGroup.add(poleMesh);

  const currentTheme = TOWER_THEMES[state.selectedTheme] || TOWER_THEMES[0];
  const safeColor = currentTheme.safeColor;
  const dangerColor = currentTheme.dangerColor;

  for (let i = 0; i < TOTAL_LAYERS; i++) {
    const posY = -i * LAYER_HEIGHT;
    const rotationY = i * 0.18;
    const isBase = (i === TOTAL_LAYERS - 1);

    const layerGroup = new THREE.Group();
    layerGroup.position.y = posY;
    layerGroup.rotation.y = rotationY;

    const sliceCount = 12;
    const slices = [];

    const holeIndex1 = i > 0 ? Math.floor(Math.random() * sliceCount) : -1;
    const holeIndex2 = i > 0 ? (holeIndex1 + 1) % sliceCount : -1;

    for (let j = 0; j < sliceCount; j++) {
      if (j === holeIndex1 || j === holeIndex2) continue;

      const isDanger = (i > 0) && !isBase && (j % 5 === 0 || j % 5 === 1);

      const angleStart = (j / sliceCount) * Math.PI * 2;
      const angleSize = (1 / sliceCount) * Math.PI * 2 - 0.04;

      const shape = new THREE.Shape();
      const innerR = 0.7;
      const outerR = 1.85;

      shape.absarc(0, 0, outerR, angleStart, angleStart + angleSize, false);
      shape.absarc(0, 0, innerR, angleStart + angleSize, angleStart, true);

      const extrudeSettings = {
        depth: 0.25,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.02,
        bevelThickness: 0.02
      };

      const sliceGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      sliceGeo.rotateX(-Math.PI / 2);

      const sliceMat = new THREE.MeshStandardMaterial({
        color: isDanger ? dangerColor : safeColor,
        roughness: 0.25,
        metalness: 0.1
      });

      const sliceMesh = new THREE.Mesh(sliceGeo, sliceMat);
      layerGroup.add(sliceMesh);

      slices.push({
        mesh: sliceMesh,
        isDanger: isDanger,
        angleStart: angleStart,
        angleEnd: angleStart + angleSize
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
  state.isPaused = false;
  state.totalGames++;

  saveToStorage();

  ballPosY = 1.0;
  ballVelocityY = 0;

  updateBallMaterial();
  ballMesh.position.set(0, ballPosY, TOWER_RADIUS - 0.3);

  buildStackTower();
  switchScreen('screen-game');
  updateHUD();
}

// --- PHYSICS ENGINE: ROTATING ROD & PASSIVE BOUNCING ---
function updatePhysics() {
  if (!state.isPlaying || state.isGameOver || state.isVictory || state.isPaused) return;

  // CONTINUOUS ROTATION OF CENTRAL ROD AND PLATFORMS
  towerGroup.rotation.y += 0.005;

  // PASSIVE vs ACTIVE PRESS PHYSICS
  if (state.isPressing) {
    ballVelocityY = SMASH_SPEED;
  } else {
    ballVelocityY += GRAVITY;
  }

  ballPosY += ballVelocityY;

  camera.position.y = ballPosY + 3.2;
  camera.lookAt(0, ballPosY - 0.5, 0);

  ballMesh.position.y = ballPosY;

  for (let i = 0; i < stackPlatforms.length; i++) {
    const layer = stackPlatforms[i];
    if (layer.destroyed) continue;

    if (ballVelocityY <= 0 && (ballPosY - BALL_RADIUS) <= layer.posY && (ballPosY - BALL_RADIUS) >= layer.posY - LAYER_HEIGHT) {

      const slice = getSliceUnderBall(layer);
      if (!slice) {
        continue;
      }

      // ACTIVE SMASH MODE (PRESSED OR FEVER MODE)
      if (state.isPressing || state.fireMode) {
        if (slice.isDanger && !state.fireMode) {
          triggerGameOver();
          return;
        }

        shatterStackLayer(layer);
        state.score += 10;
        state.fireStreak++;
        state.totalSmashed++;

        if (state.fireStreak >= 8 && !state.fireMode) {
          state.fireMode = true;
          ballMesh.material.color.setHex(0xff3300);
          ballMesh.material.emissive.setHex(0x550000);

          const combo = document.getElementById('comboPopup');
          if (combo) {
            combo.textContent = `FEVER MODE!`;
            combo.classList.add('show');
            setTimeout(() => combo.classList.remove('show'), 900);
          }
        }

        updateHUD();

        if (layer.isBase) {
          triggerVictory();
          return;
        }
      }
      // PASSIVE TOUCH / BOUNCE MODE (NOT PRESSING)
      // FIX: Passive contact must NEVER trigger game over — regardless of
      // whether the slice under the ball is a danger (black) slice or a
      // safe slice. The ball should just bounce normally on its own.
      // Game over is ONLY allowed to fire from the ACTIVE press branch
      // above, i.e. only when the player is pressing/smashing AND the
      // ball lands on a black slice at that exact moment.
      else {
        ballPosY = layer.posY + BALL_RADIUS;
        ballVelocityY = BOUNCE_IMPULSE; // Passive bounce impulse upward
        state.fireStreak = 0;
        state.fireMode = false;

        updateBallMaterial();
        createBounceBurst(ballMesh.position.y);
      }
      break;
    }
  }

  updateParticles();
}

function getSliceUnderBall(layer) {
  const totalRotation = towerGroup.rotation.y + layer.group.rotation.y;
  let angleNorm = (-totalRotation - Math.PI / 2) % (Math.PI * 2);
  if (angleNorm < 0) angleNorm += Math.PI * 2;

  const sliceCount = 12;
  const sliceAngle = (Math.PI * 2) / sliceCount;

  const index = Math.floor(angleNorm / sliceAngle) % sliceCount;

  return layer.slices.find(s => {
    const sIdx = Math.round(s.angleStart / sliceAngle) % sliceCount;
    return sIdx === index;
  });
}

function shatterStackLayer(layer) {
  layer.destroyed = true;

  layer.slices.forEach(s => {
    const mesh = s.mesh;
    const pGeo = mesh.geometry.clone();
    const pMat = mesh.material.clone();

    pMat.transparent = true;
    pMat.opacity = 1.0;

    const p = new THREE.Mesh(pGeo, pMat);

    p.position.copy(layer.group.position);
    p.rotation.copy(layer.group.rotation);

    p.userData = {
      vx: (Math.random() - 0.5) * 0.15,
      vy: Math.random() * 0.15 + 0.1,
      vz: (Math.random() - 0.5) * 0.15,
      rotX: (Math.random() - 0.5) * 0.1,
      rotY: (Math.random() - 0.5) * 0.1,
      life: 30
    };

    scene.add(p);
    particles.push(p);
  });

  towerGroup.remove(layer.group);
}

function createBounceBurst(posY) {
  const colors = [0xffffff, 0x00d2ff, 0x00ffff];
  const activeColor = colors[Math.floor(Math.random() * colors.length)];

  for (let i = 0; i < 8; i++) {
    const pGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const pMat = new THREE.MeshStandardMaterial({
      color: activeColor,
      transparent: true,
      opacity: 0.8
    });
    const p = new THREE.Mesh(pGeo, pMat);
    p.position.set(
      (Math.random() - 0.5) * 0.4,
      posY - BALL_RADIUS,
      TOWER_RADIUS - 0.3 + (Math.random() - 0.5) * 0.4
    );

    p.userData = {
      vx: (Math.random() - 0.5) * 0.06,
      vy: Math.random() * 0.05 + 0.05,
      vz: (Math.random() - 0.5) * 0.06,
      rotX: 0.02,
      rotY: 0.02,
      life: 20
    };

    scene.add(p);
    particles.push(p);
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.position.x += p.userData.vx;
    p.position.y += p.userData.vy;
    p.position.z += p.userData.vz;

    p.rotation.x += p.userData.rotX || 0;
    p.rotation.y += p.userData.rotY || 0;

    p.userData.vy -= 0.008;
    p.userData.life--;

    if (p.material) {
      p.material.opacity = Math.max(0, p.userData.life / 30);
    }

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
  const bestEl = document.getElementById('hudBest');

  if (depthEl) depthEl.textContent = `${state.score}m`;
  if (coinsEl) coinsEl.textContent = state.coins;
  if (bestEl) bestEl.textContent = `Best ${state.highScore}m`;
}

function triggerGameOver() {
  state.isPlaying = false;
  state.isGameOver = true;

  if (state.score > state.highScore) {
    state.highScore = state.score;
  }

  const earnedCoins = Math.floor(state.score / 10);
  state.coins += earnedCoins;
  state.totalCoins += earnedCoins;
  saveToStorage();

  const goDepth = document.getElementById('goDepth');
  const goCoins = document.getElementById('goCoins');
  const goBestMsg = document.getElementById('goBestMsg');

  if (goDepth) goDepth.textContent = state.score;
  if (goCoins) goCoins.textContent = earnedCoins;
  if (goBestMsg) {
    goBestMsg.textContent = state.score >= state.highScore ? "🏆 New Personal Best!" : `Best: ${state.highScore}m`;
  }

  document.getElementById('overlay-gameover').classList.add('active');
}

function triggerVictory() {
  state.isPlaying = false;
  state.isVictory = true;

  if (state.score + 100 > state.highScore) {
    state.highScore = state.score + 100;
  }

  const prize = 50 + state.currentLevel * 10;
  state.coins += prize;
  state.totalCoins += prize;

  if (state.currentLevel === state.highestLevel) {
    state.highestLevel = state.currentLevel + 1;
  }

  saveToStorage();

  const vicCoins = document.getElementById('vicCoins');
  const vicStars = document.getElementById('vicStars');

  if (vicCoins) vicCoins.textContent = prize;
  if (vicStars) {
    vicStars.textContent = "⭐⭐⭐";
  }

  document.getElementById('overlay-victory').classList.add('active');
}

function animate() {
  requestAnimationFrame(animate);
  updatePhysics();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

