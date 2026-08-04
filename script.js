/* =========================================================================
   HELIX DROP — script.js
   Vanilla JS Helix-Jump style game. No external libraries.
   Sections:
     1. i18n & translations
     2. Persistent profile (localStorage)
     3. Audio engine (WebAudio synth — no external sound files)
     4. Data: levels, ball skins, tower themes, achievements
     5. Screen / navigation manager
     6. UI builders (menus, shop, settings, stats, daily reward)
     7. Game engine (tower, ball, physics, rendering, input, particles)
     8. Boot sequence
   ========================================================================= */

(() => {
"use strict";

/* ========================================================================
   1. I18N
   ======================================================================== */
const I18N = {
  en:{ tagline:"Spin. Fall. Fly.", play:"▶ PLAY", levels:"Levels", ballShop:"Ball Shop", themes:"Themes",
    stats:"Stats", daily:"Daily", settings:"Settings", selectLevel:"Select Level", music:"Music",
    sound:"Sound Effects", vibration:"Vibration", graphics:"Graphics Quality", low:"Low", medium:"Medium",
    high:"High", sensitivity:"Sensitivity", brightness:"Brightness", language:"Language",
    dailyReward:"Daily Reward", claim:"CLAIM 50 🪙", achievements:"Achievements", paused:"Paused",
    resume:"▶ Resume", restart:"⟲ Restart", quit:"🏠 Main Menu", gameOver:"Game Over", depth:"depth",
    playAgain:"⟲ Play Again", levelComplete:"🎉 Level Complete!", nextLevel:"Next Level →" },
  es:{ tagline:"Gira. Cae. Vuela.", play:"▶ JUGAR", levels:"Niveles", ballShop:"Tienda", themes:"Temas",
    stats:"Stats", daily:"Diario", settings:"Ajustes", selectLevel:"Elige Nivel", music:"Música",
    sound:"Efectos", vibration:"Vibración", graphics:"Calidad Gráfica", low:"Baja", medium:"Media",
    high:"Alta", sensitivity:"Sensibilidad", brightness:"Brillo", language:"Idioma",
    dailyReward:"Recompensa Diaria", claim:"RECLAMAR 50 🪙", achievements:"Logros", paused:"Pausa",
    resume:"▶ Continuar", restart:"⟲ Reiniciar", quit:"🏠 Menú", gameOver:"Fin del Juego", depth:"profundidad",
    playAgain:"⟲ Jugar de Nuevo", levelComplete:"🎉 ¡Nivel Completo!", nextLevel:"Siguiente →" },
  hi:{ tagline:"घुमाएँ। गिरें। उड़ें।", play:"▶ खेलें", levels:"स्तर", ballShop:"बॉल शॉप", themes:"थीम",
    stats:"आँकड़े", daily:"रोज़ाना", settings:"सेटिंग्स", selectLevel:"स्तर चुनें", music:"संगीत",
    sound:"ध्वनि", vibration:"कंपन", graphics:"ग्राफिक्स", low:"कम", medium:"मध्यम",
    high:"उच्च", sensitivity:"संवेदनशीलता", brightness:"चमक", language:"भाषा",
    dailyReward:"दैनिक इनाम", claim:"प्राप्त करें 50 🪙", achievements:"उपलब्धियाँ", paused:"रुका हुआ",
    resume:"▶ जारी रखें", restart:"⟲ पुनः आरंभ", quit:"🏠 मुख्य मेनू", gameOver:"खेल समाप्त", depth:"गहराई",
    playAgain:"⟲ फिर खेलें", levelComplete:"🎉 स्तर पूर्ण!", nextLevel:"अगला स्तर →" },
};
function applyLanguage(lang){
  const dict = I18N[lang] || I18N.en;
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const key = el.getAttribute("data-i18n");
    if(dict[key]) el.textContent = dict[key];
  });
}

/* ========================================================================
   2. PERSISTENT PROFILE
   ======================================================================== */
const SAVE_KEY = "helixDropSave_v1";
const defaultProfile = () => ({
  coins: 60,
  totalCoinsEarned: 0,
  gamesPlayed: 0,
  bestCombo: 0,
  highScores: { easy:0, medium:0, hard:0, expert:0, endless:0 },
  unlockedLevels: { easy:true, medium:true, hard:false, expert:false, endless:true },
  unlockedSkins: ["neon"],
  unlockedThemes: ["sky"],
  selectedSkin: "neon",
  selectedTheme: "sky",
  achievements: {},
  lastDailyClaim: null,
  settings: {
    music:true, sound:true, vibration:true, graphics:"high",
    sensitivity:1, brightness:1, language:"en"
  }
});
let profile = loadProfile();
function loadProfile(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    return Object.assign(defaultProfile(), parsed, {
      settings: Object.assign(defaultProfile().settings, parsed.settings||{}),
      highScores: Object.assign(defaultProfile().highScores, parsed.highScores||{}),
      unlockedLevels: Object.assign(defaultProfile().unlockedLevels, parsed.unlockedLevels||{}),
    });
  }catch(e){ return defaultProfile(); }
}
function saveProfile(){
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); }catch(e){/* storage unavailable */}
}

/* ========================================================================
   3. AUDIO ENGINE — synthesized, no external files
   ======================================================================== */
const Audio_ = (() => {
  let ctx = null;
  let musicTimer = null;
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
  const sfx = {
    bounce(){ tone(320,0.12,"sine",0.22); tone(480,0.08,"sine",0.1,0.02); },
    coin(){ tone(880,0.08,"triangle",0.2); tone(1320,0.1,"triangle",0.16,0.05); },
    combo(){ [0,0.06,0.12].forEach((d,i)=>tone(500+i*220,0.16,"sawtooth",0.16,d)); },
    gameover(){ tone(220,0.3,"sawtooth",0.2); tone(140,0.4,"sawtooth",0.18,0.15); },
    click(){ tone(600,0.05,"square",0.08); },
    victory(){ [0,0.1,0.2,0.32].forEach((d,i)=>tone(440+i*160,0.22,"triangle",0.18,d)); },
    breakfx(){ tone(150,0.18,"square",0.14); },
  };
  function startMusic(){
    if(musicTimer || !profile.settings.music) return;
    const c = ensureCtx(); if(!c) return;
    const notes = [261.6,329.6,392.0,440.0,523.3,440.0,392.0,329.6];
    let i = 0;
    function playNote(){
      if(!profile.settings.music){ stopMusic(); return; }
      tone(notes[i % notes.length], 1.1, "sine", 0.045);
      tone(notes[i % notes.length]/2, 1.4, "sine", 0.03, 0.05);
      i++;
    }
    playNote();
    musicTimer = setInterval(playNote, 900);
  }
  function stopMusic(){ if(musicTimer){ clearInterval(musicTimer); musicTimer = null; } }
  function vibrate(pattern){
    if(profile.settings.vibration && navigator.vibrate) navigator.vibrate(pattern);
  }
  return { sfx, startMusic, stopMusic, vibrate, ensureCtx };
})();

/* ========================================================================
   4. GAME DATA
   ======================================================================== */
const LEVELS = [
  { id:"easy",   name:"Easy",   icon:"🟢", gapDeg:132, redChance:0.04, gravity:0.30, bounce:-11.0, rotSpeed:1.00, ringsToWin:18, grad:["#6fe6a3","#22c176"] },
  { id:"medium", name:"Medium", icon:"🟡", gapDeg:108, redChance:0.10, gravity:0.34, bounce:-11.4, rotSpeed:1.05, ringsToWin:28, grad:["#ffd23f","#ff9f1c"] },
  { id:"hard",   name:"Hard",   icon:"🟠", gapDeg:88,  redChance:0.17, gravity:0.38, bounce:-11.9, rotSpeed:1.12, ringsToWin:38, grad:["#ff8a5c","#ff5f6d"] },
  { id:"expert", name:"Expert", icon:"🔴", gapDeg:70,  redChance:0.25, gravity:0.42, bounce:-12.4, rotSpeed:1.20, ringsToWin:52, grad:["#ff5f9d","#c93cff"] },
  { id:"endless",name:"Endless",icon:"♾️", gapDeg:112, redChance:0.08, gravity:0.32, bounce:-11.3, rotSpeed:1.00, ringsToWin:null, grad:["#5ec8ff","#8a4dff"] },
];
const LEVEL_UNLOCK_COST = { hard:150, expert:400 };

const BALL_SKINS = [
  { id:"neon",     name:"Neon Glow", price:0,   colors:["#39ffea","#0d8f9c"], glow:"#39ffea" },
  { id:"crystal",  name:"Crystal",   price:80,  colors:["#e8f9ff","#8fd3ff"], glow:"#bdeeff" },
  { id:"fire",     name:"Fire Ball", price:120, colors:["#ffdd55","#ff4d1c"], glow:"#ff7a3d" },
  { id:"ice",      name:"Ice Ball",  price:120, colors:["#d6f3ff","#4aa8ff"], glow:"#9fe0ff" },
  { id:"galaxy",   name:"Galaxy",    price:200, colors:["#c98bff","#331d7a"], glow:"#a85bff" },
  { id:"rainbow",  name:"Rainbow",   price:260, colors:["#ff5f6d","#ffd23f","#39ffea"], glow:"#ffffff" },
  { id:"metallic", name:"Metallic",  price:180, colors:["#f0f4f8","#8a97a6"], glow:"#e2e8f0" },
];

const TOWER_THEMES = [
  { id:"sky",     name:"Sky Tower",   price:0,   platform:["#7bd0ff","#3f8bff"], bg:["#5ec8ff","#8a4dff"] },
  { id:"neon",    name:"Neon City",   price:100, platform:["#ff5fd3","#8a4dff"], bg:["#1a0033","#ff2ea6"] },
  { id:"space",   name:"Space Station", price:160, platform:["#9fb4ff","#3a3f8f"], bg:["#05061a","#2a2f6e"] },
  { id:"candy",   name:"Candy World", price:140, platform:["#ff9ecf","#ff5f9d"], bg:["#ffd6ec","#ff8ad1"] },
  { id:"crystal", name:"Crystal Cave",price:180, platform:["#bdfcff","#3fd6c9"], bg:["#0c2b3a","#1f6f7a"] },
  { id:"volcano", name:"Volcano",     price:220, platform:["#ffb347","#ff4d1c"], bg:["#3a0b0b","#ff5f1f"] },
  { id:"ocean",   name:"Ocean",       price:150, platform:["#4adede","#1c7fc2"], bg:["#032b4a","#1c8fc2"] },
  { id:"cyber",   name:"Cyber World", price:240, platform:["#39ffea","#c93cff"], bg:["#050014","#7b2ff7"] },
];

const ACHIEVEMENTS = [
  { id:"firstDrop", icon:"🥇", name:{en:"First Drop",es:"Primera Caída",hi:"पहला ड्रॉप"}, check:(s)=>s.gamesPlayed>=1 },
  { id:"depth50",   icon:"📏", name:{en:"Reach 50m",es:"Llega a 50m",hi:"50मी पहुँचें"}, check:(s)=>s.runDepth>=50 },
  { id:"depth150",  icon:"🚀", name:{en:"Reach 150m",es:"Llega a 150m",hi:"150मी पहुँचें"}, check:(s)=>s.runDepth>=150 },
  { id:"combo3",    icon:"🔥", name:{en:"Combo x3",es:"Combo x3",hi:"कॉम्बो x3"}, check:(s)=>s.bestCombo>=3 },
  { id:"coins200",  icon:"🪙", name:{en:"Earn 200 coins",es:"Gana 200 monedas",hi:"200 सिक्के कमाएँ"}, check:(s)=>s.totalCoinsEarned>=200 },
  { id:"allLevels", icon:"👑", name:{en:"Unlock all levels",es:"Desbloquea todo",hi:"सभी स्तर अनलॉक"}, check:(s)=>Object.values(profile.unlockedLevels).every(Boolean) },
];

/* ========================================================================
   5. SCREEN MANAGER
   ======================================================================== */
function showScreen(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}
function showOverlay(id){ document.getElementById(id).classList.add("active"); }
function hideOverlay(id){ document.getElementById(id).classList.remove("active"); }
document.querySelectorAll("[data-back]").forEach(btn=>{
  btn.addEventListener("click", ()=>{ Audio_.sfx.click(); showScreen(btn.getAttribute("data-back")); });
});

/* ========================================================================
   6. UI BUILDERS
   ======================================================================== */
function refreshCoinDisplays(){
  document.getElementById("menuCoins").textContent = profile.coins;
  document.getElementById("shopCoins").textContent = profile.coins;
  document.getElementById("themeCoins").textContent = profile.coins;
  document.getElementById("hudCoins").textContent = runStats.coinsThisRun;
  document.getElementById("menuHigh").textContent = Math.max(...Object.values(profile.highScores));
}

function buildLevelList(){
  const wrap = document.getElementById("levelList");
  wrap.innerHTML = "";
  LEVELS.forEach(lvl=>{
    const unlocked = !!profile.unlockedLevels[lvl.id];
    const card = document.createElement("div");
    card.className = "level-card" + (unlocked ? "" : " locked");
    const best = profile.highScores[lvl.id] || 0;
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="level-badge" style="background:linear-gradient(135deg,${lvl.grad[0]},${lvl.grad[1]})">${lvl.icon}</div>
        <div>
          <h3>${lvl.name}</h3>
          <p>${unlocked ? "Best: " + best + "m" : "🔒 " + (LEVEL_UNLOCK_COST[lvl.id]||"") + " 🪙 to unlock"}</p>
        </div>
      </div>
      <div style="font-size:1.3rem;">${unlocked ? "▶" : "🔒"}</div>
    `;
    card.addEventListener("click", ()=>{
      Audio_.sfx.click();
      if(unlocked){
        startGame(lvl.id);
      } else {
        const cost = LEVEL_UNLOCK_COST[lvl.id] || 999999;
        if(profile.coins >= cost){
          profile.coins -= cost;
          profile.unlockedLevels[lvl.id] = true;
          saveProfile(); refreshCoinDisplays(); buildLevelList();
        }
      }
    });
    wrap.appendChild(card);
  });
}

function buildBallGrid(){
  const wrap = document.getElementById("ballGrid");
  wrap.innerHTML = "";
  BALL_SKINS.forEach(skin=>{
    const owned = profile.unlockedSkins.includes(skin.id);
    const selected = profile.selectedSkin === skin.id;
    const card = document.createElement("div");
    card.className = "item-card" + (selected ? " selected" : "");
    card.innerHTML = `
      ${owned ? "" : `<div class="item-lock">🔒</div>`}
      <div class="item-preview-ball" style="background:radial-gradient(circle at 32% 28%, #fff, ${skin.colors[0]} 40%, ${skin.colors[skin.colors.length-1]} 100%); box-shadow:0 0 18px ${skin.glow}66, inset -6px -6px 12px rgba(0,0,0,.25);"></div>
      <div class="item-name">${skin.name}</div>
      <div class="item-price">${owned ? (selected ? "Selected" : "Tap to use") : skin.price + " 🪙"}</div>
    `;
    card.addEventListener("click", ()=>{
      Audio_.sfx.click();
      if(owned){ profile.selectedSkin = skin.id; }
      else if(profile.coins >= skin.price){
        profile.coins -= skin.price;
        profile.unlockedSkins.push(skin.id);
        profile.selectedSkin = skin.id;
      } else return;
      saveProfile(); refreshCoinDisplays(); buildBallGrid();
    });
    wrap.appendChild(card);
  });
}

function buildThemeGrid(){
  const wrap = document.getElementById("themeGrid");
  wrap.innerHTML = "";
  TOWER_THEMES.forEach(theme=>{
    const owned = profile.unlockedThemes.includes(theme.id);
    const selected = profile.selectedTheme === theme.id;
    const card = document.createElement("div");
    card.className = "item-card" + (selected ? " selected" : "");
    card.innerHTML = `
      ${owned ? "" : `<div class="item-lock">🔒</div>`}
      <div class="item-preview-theme" style="background:linear-gradient(135deg,${theme.bg[0]},${theme.bg[1]});"></div>
      <div class="item-name">${theme.name}</div>
      <div class="item-price">${owned ? (selected ? "Selected" : "Tap to use") : theme.price + " 🪙"}</div>
    `;
    card.addEventListener("click", ()=>{
      Audio_.sfx.click();
      if(owned){ profile.selectedTheme = theme.id; }
      else if(profile.coins >= theme.price){
        profile.coins -= theme.price;
        profile.unlockedThemes.push(theme.id);
        profile.selectedTheme = theme.id;
      } else return;
      saveProfile(); refreshCoinDisplays(); buildThemeGrid();
    });
    wrap.appendChild(card);
  });
}

function buildStats(){
  const grid = document.getElementById("statsGrid");
  const s = profile;
  const best = Math.max(...Object.values(s.highScores));
  grid.innerHTML = `
    <div class="stat-box"><b>${s.gamesPlayed}</b><span>Games Played</span></div>
    <div class="stat-box"><b>${best}m</b><span>Best Depth</span></div>
    <div class="stat-box"><b>${s.totalCoinsEarned}</b><span>Coins Earned</span></div>
    <div class="stat-box"><b>x${s.bestCombo}</b><span>Best Combo</span></div>
  `;
  const list = document.getElementById("achvList");
  list.innerHTML = "";
  const lang = profile.settings.language;
  ACHIEVEMENTS.forEach(a=>{
    const unlocked = !!profile.achievements[a.id];
    const div = document.createElement("div");
    div.className = "achv-item" + (unlocked ? " unlocked" : "");
    div.innerHTML = `<span class="achv-icon">${unlocked ? a.icon : "🔒"}</span><span>${(a.name[lang]||a.name.en)}</span>`;
    list.appendChild(div);
  });
}

function buildSettingsUI(){
  document.getElementById("toggleMusic").checked = profile.settings.music;
  document.getElementById("toggleSound").checked = profile.settings.sound;
  document.getElementById("toggleVibration").checked = profile.settings.vibration;
  document.getElementById("sliderSensitivity").value = profile.settings.sensitivity;
  document.getElementById("sliderBrightness").value = profile.settings.brightness;
  document.querySelectorAll("#graphicsSeg button").forEach(b=>{
    b.classList.toggle("active", b.dataset.val === profile.settings.graphics);
  });
  document.querySelectorAll("#langSeg button").forEach(b=>{
    b.classList.toggle("active", b.dataset.val === profile.settings.language);
  });
  document.documentElement.style.setProperty("--brightness", profile.settings.brightness);
}

function buildDailyScreen(){
  const today = new Date().toDateString();
  const claimed = profile.lastDailyClaim === today;
  const btn = document.getElementById("btnClaimDaily");
  const msg = document.getElementById("dailyMsg");
  btn.disabled = claimed;
  btn.style.opacity = claimed ? 0.45 : 1;
  msg.textContent = claimed ? "You've claimed today's reward. Come back tomorrow!" : "Claim your free coins for today!";
}

/* ---- settings event bindings ---- */
document.getElementById("toggleMusic").addEventListener("change", e=>{
  profile.settings.music = e.target.checked; saveProfile();
  if(e.target.checked) Audio_.startMusic(); else Audio_.stopMusic();
});
document.getElementById("toggleSound").addEventListener("change", e=>{ profile.settings.sound = e.target.checked; saveProfile(); });
document.getElementById("toggleVibration").addEventListener("change", e=>{ profile.settings.vibration = e.target.checked; saveProfile(); });
document.getElementById("sliderSensitivity").addEventListener("input", e=>{ profile.settings.sensitivity = parseFloat(e.target.value); saveProfile(); });
document.getElementById("sliderBrightness").addEventListener("input", e=>{
  profile.settings.brightness = parseFloat(e.target.value); saveProfile();
  document.documentElement.style.setProperty("--brightness", profile.settings.brightness);
});
document.querySelectorAll("#graphicsSeg button").forEach(b=>{
  b.addEventListener("click", ()=>{
    profile.settings.graphics = b.dataset.val; saveProfile(); buildSettingsUI(); Audio_.sfx.click();
  });
});
document.querySelectorAll("#langSeg button").forEach(b=>{
  b.addEventListener("click", ()=>{
    profile.settings.language = b.dataset.val; saveProfile(); buildSettingsUI();
    applyLanguage(profile.settings.language); buildStats(); Audio_.sfx.click();
  });
});
document.getElementById("btnClaimDaily").addEventListener("click", ()=>{
  const today = new Date().toDateString();
  if(profile.lastDailyClaim === today) return;
  profile.coins += 50; profile.totalCoinsEarned += 50; profile.lastDailyClaim = today;
  saveProfile(); refreshCoinDisplays(); buildDailyScreen();
  Audio_.sfx.coin(); Audio_.vibrate(40);
});

/* ---- menu navigation bindings ---- */
document.getElementById("btnPlay").addEventListener("click", ()=>{ Audio_.sfx.click(); startGame(lastPlayedLevel || "easy"); });
document.getElementById("btnLevels").addEventListener("click", ()=>{ Audio_.sfx.click(); buildLevelList(); showScreen("screen-levels"); });
document.getElementById("btnShop").addEventListener("click", ()=>{ Audio_.sfx.click(); buildBallGrid(); showScreen("screen-shop"); });
document.getElementById("btnThemes").addEventListener("click", ()=>{ Audio_.sfx.click(); buildThemeGrid(); showScreen("screen-themes"); });
document.getElementById("btnStats").addEventListener("click", ()=>{ Audio_.sfx.click(); buildStats(); showScreen("screen-stats"); });
document.getElementById("btnDaily").addEventListener("click", ()=>{ Audio_.sfx.click(); buildDailyScreen(); showScreen("screen-daily"); });
document.getElementById("btnSettings").addEventListener("click", ()=>{ Audio_.sfx.click(); buildSettingsUI(); showScreen("screen-settings"); });

/* ========================================================================
   7. GAME ENGINE
   ======================================================================== */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let cssW=0, cssH=0, dpr=1;

function resizeCanvas(){
  cssW = window.innerWidth; cssH = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio||1, 2);
  canvas.width = cssW*dpr; canvas.height = cssH*dpr;
  canvas.style.width = cssW+"px"; canvas.style.height = cssH+"px";
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const RING_SPACING = 92;
const REF_ANGLE = Math.PI/2; // fixed collision reference angle (screen-front)
const TWO_PI = Math.PI*2;
function norm(a){ a = a % TWO_PI; if(a<0) a += TWO_PI; return a; }

let lastPlayedLevel = null;
let level = LEVELS[0];
let rings = [];
let ringCursor = 0; // next ring index to generate
let ball, tower, cam, running=false, paused=false, rafId=null, lastTime=0;
let particles = [];
let runStats = { coinsThisRun:0, ringsCleared:0, comboSinceBounce:0, bestComboRun:0, screenShake:0 };
let inputState = { down:false, lastX:0, pointerId:null };
let trailPositions = [];

function getTowerRadius(){ return Math.min(cssW, cssH*1.3) * 0.26; }

function currentSkin(){ return BALL_SKINS.find(s=>s.id===profile.selectedSkin) || BALL_SKINS[0]; }
function currentTheme(){ return TOWER_THEMES.find(t=>t.id===profile.selectedTheme) || TOWER_THEMES[0]; }

/* ---- Ring generation ---- */
function difficultyForIndex(i){
  if(level.id !== "endless") return level;
  // endless: scale difficulty gradually with depth, clamp
  const t = Math.min(i/120, 1);
  return {
    gapDeg: 118 - t*55,
    redChance: 0.06 + t*0.28,
    gravity: level.gravity + t*0.14,
    bounce: level.bounce - t*1.6,
  };
}
function makeRing(i){
  const diff = difficultyForIndex(i);
  const gapRad = diff.gapDeg * Math.PI/180;
  const gapStart = Math.random()*TWO_PI;
  const gapEnd = gapStart + gapRad;
  const segments = [];
  // remaining arc after the gap, split into normal / red segments
  let cursor = gapEnd;
  const remaining = TWO_PI - gapRad;
  const hasRed = Math.random() < diff.redChance;
  if(hasRed){
    const redWidth = (0.12 + Math.random()*0.16) * remaining;
    const redOffset = Math.random() * (remaining - redWidth);
    segments.push({ start:cursor, end:cursor+redOffset, type:"normal" });
    segments.push({ start:cursor+redOffset, end:cursor+redOffset+redWidth, type:"red" });
    segments.push({ start:cursor+redOffset+redWidth, end:gapStart+TWO_PI, type:"normal" });
  } else {
    segments.push({ start:cursor, end:gapStart+TWO_PI, type:"normal" });
  }
  segments.push({ start:gapStart, end:gapEnd, type:"gap" });
  return {
    index:i, y:i*RING_SPACING, segments,
    hasCoin: Math.random() < 0.35, coinCollected:false,
    resolved:false, gapMidAngle: (gapStart+gapEnd)/2,
  };
}
function segmentAt(ring, angle){
  // angle is normalized to [0, 2π). Segment start/end may extend beyond 2π
  // (used for wraparound arcs), so shift `angle` by full turns until it
  // lands inside each segment's own range before testing.
  for(const seg of ring.segments){
    if(seg.end - seg.start >= TWO_PI) return seg;
    const lo = seg.start, hi = seg.end;
    let aa = angle;
    while(aa < lo) aa += TWO_PI;
    while(aa > hi) aa -= TWO_PI;
    if(aa >= lo-1e-6 && aa <= hi+1e-6) return seg;
  }
  return ring.segments[ring.segments.length-1];
}
function ensureRingsAhead(){
  const ballIndex = Math.floor(ball.y / RING_SPACING);
  while(ringCursor < ballIndex + 16){
    rings.push(makeRing(ringCursor));
    ringCursor++;
  }
  // drop rings well behind camera to keep array small
  while(rings.length && rings[0].index < ballIndex - 4) rings.shift();
}

/* ---- Particles ---- */
function spawnParticles(x,y,color,count,opts={}){
  const q = profile.settings.graphics === "low" ? 0.4 : (profile.settings.graphics === "medium" ? 0.7 : 1);
  const n = Math.round(count*q);
  for(let i=0;i<n;i++){
    const ang = Math.random()*TWO_PI;
    const spd = (opts.speed||3) * (0.4+Math.random()*0.8);
    particles.push({
      x,y, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd - (opts.up||0),
      life:0, maxLife: (opts.life||36) * (0.7+Math.random()*0.6),
      color, size: (opts.size||4) * (0.6+Math.random()*0.8),
    });
  }
}
function updateParticles(dt){
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.life += dt;
    p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 0.12*dt;
    if(p.life >= p.maxLife) particles.splice(i,1);
  }
}
function drawParticles(){
  particles.forEach(p=>{
    const t = 1 - p.life/p.maxLife;
    ctx.globalAlpha = Math.max(t,0);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(p.size*t,0.5), 0, TWO_PI); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

/* ---- Game lifecycle ---- */
function startGame(levelId){
  level = LEVELS.find(l=>l.id===levelId) || LEVELS[0];
  lastPlayedLevel = levelId;
  const theme = currentTheme();
  rings = []; ringCursor = 0; particles = []; trailPositions = [];
  ball = { y:-160, vy:0, radius:15, squash:1 };
  tower = { rotation: Math.random()*TWO_PI };
  cam = { offset:0, shakeMag:0 };
  runStats = { coinsThisRun:0, ringsCleared:0, comboSinceBounce:0, bestComboRun:0 };
  ensureRingsAhead();
  document.getElementById("hudCoins").textContent = "0";
  document.getElementById("hudDepth").textContent = "0m";
  document.getElementById("hudBest").textContent = "Best " + (profile.highScores[level.id]||0) + "m";
  showScreen("screen-game");
  running = true; paused = false;
  lastTime = performance.now();
  Audio_.ensureCtx();
  if(profile.settings.music) Audio_.startMusic();
  if(rafId) cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

function endGame(){
  running = false;
  Audio_.sfx.gameover(); Audio_.vibrate([60,40,80]);
  triggerShake(14);
  profile.gamesPlayed++;
  profile.coins += runStats.coinsThisRun;
  profile.totalCoinsEarned += runStats.coinsThisRun;
  if(runStats.bestComboRun > profile.bestCombo) profile.bestCombo = runStats.bestComboRun;
  const depth = runStats.ringsCleared;
  const isBest = depth > (profile.highScores[level.id]||0);
  if(isBest) profile.highScores[level.id] = depth;
  saveProfile();
  runAchievementCheck({ runDepth:depth, bestCombo:runStats.bestComboRun, gamesPlayed:profile.gamesPlayed, totalCoinsEarned:profile.totalCoinsEarned });

  document.getElementById("goDepth").textContent = depth;
  document.getElementById("goCoins").textContent = runStats.coinsThisRun;
  document.getElementById("goBestMsg").textContent = isBest ? "🌟 New Best Depth!" : "";
  setTimeout(()=>showOverlay("overlay-gameover"), 400);
}

function winGame(){
  running = false;
  Audio_.sfx.victory(); Audio_.vibrate([40,30,40,30,80]);
  profile.gamesPlayed++;
  const bonus = runStats.ringsCleared*2 + runStats.bestComboRun*10;
  runStats.coinsThisRun += bonus;
  profile.coins += runStats.coinsThisRun;
  profile.totalCoinsEarned += runStats.coinsThisRun;
  if(runStats.bestComboRun > profile.bestCombo) profile.bestCombo = runStats.bestComboRun;
  profile.highScores[level.id] = Math.max(profile.highScores[level.id]||0, runStats.ringsCleared);
  // unlock next level
  const idx = LEVELS.findIndex(l=>l.id===level.id);
  if(idx>=0 && idx+1<LEVELS.length){
    const next = LEVELS[idx+1];
    if(!profile.unlockedLevels[next.id] && !LEVEL_UNLOCK_COST[next.id]) profile.unlockedLevels[next.id] = true;
  }
  saveProfile();
  runAchievementCheck({ runDepth:runStats.ringsCleared, bestCombo:runStats.bestComboRun, gamesPlayed:profile.gamesPlayed, totalCoinsEarned:profile.totalCoinsEarned });
  const stars = runStats.bestComboRun>=4 ? "★★★" : runStats.bestComboRun>=2 ? "★★☆" : "★☆☆";
  document.getElementById("vicCoins").textContent = runStats.coinsThisRun;
  document.getElementById("vicStars").textContent = stars;
  setTimeout(()=>showOverlay("overlay-victory"), 300);
}

function runAchievementCheck(statCtx){
  let unlockedAny = false;
  ACHIEVEMENTS.forEach(a=>{
    if(!profile.achievements[a.id] && a.check(statCtx)){
      profile.achievements[a.id] = true; unlockedAny = true;
    }
  });
  if(unlockedAny) saveProfile();
}

function triggerShake(mag){ cam.shakeMag = Math.max(cam.shakeMag||0, mag); }

/* ---- Physics / collision resolution ---- */
function resolveRing(ring){
  ring.resolved = true;
  const originalAngle = norm(REF_ANGLE - tower.rotation);
  const seg = segmentAt(ring, originalAngle);
  runStats.ringsCleared++;

  const bx = cssW/2, by = cssH*0.32;

  if(seg.type === "red"){
    spawnParticles(bx, by, "#ff4d6d", 26, {speed:5, life:40, size:5});
    endGame();
    return;
  }
  if(seg.type === "gap"){
    runStats.comboSinceBounce++;
    if(ring.hasCoin && !ring.coinCollected){
      ring.coinCollected = true;
      runStats.coinsThisRun += 1;
      Audio_.sfx.coin();
      spawnParticles(bx, by, "#ffd23f", 10, {speed:2.4, life:26, size:3});
    }
    return;
  }
  // normal platform -> bounce
  ball.vy = level.bounce ?? -11;
  ball.squash = 1.5;
  Audio_.sfx.bounce();
  spawnParticles(bx, by+ball.radius*0.6, currentTheme().platform[0], 10, {speed:2, life:22, size:3, up:1});
  if(runStats.comboSinceBounce >= 2){
    const combo = runStats.comboSinceBounce;
    runStats.bestComboRun = Math.max(runStats.bestComboRun, combo);
    const bonus = combo*5;
    runStats.coinsThisRun += bonus;
    Audio_.sfx.combo(); Audio_.vibrate([20,20,20]);
    triggerShake(9);
    showCombo(combo);
    spawnParticles(bx, by, "#ff8a3d", 30, {speed:5.5, life:34, size:5});
  }
  runStats.comboSinceBounce = 0;
}

function showCombo(n){
  const el = document.getElementById("comboPopup");
  el.textContent = "COMBO ×" + n;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
}

/* ---- Input: pointer drag rotates tower; also basic keyboard ---- */
function attachInput(){
  canvas.addEventListener("pointerdown", e=>{
    inputState.down = true; inputState.lastX = e.clientX; inputState.pointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", e=>{
    if(!inputState.down || e.pointerId !== inputState.pointerId) return;
    const dx = e.clientX - inputState.lastX;
    inputState.lastX = e.clientX;
    tower.rotation += dx * 0.006 * profile.settings.sensitivity * (level.rotSpeed||1);
  });
  function up(e){ if(e.pointerId===inputState.pointerId){ inputState.down=false; inputState.pointerId=null; } }
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("touchmove", e=>{ e.preventDefault(); }, {passive:false});

  window.addEventListener("keydown", e=>{
    if(!running || paused) return;
    if(e.key === "ArrowLeft") tower.rotation -= 0.09 * profile.settings.sensitivity;
    if(e.key === "ArrowRight") tower.rotation += 0.09 * profile.settings.sensitivity;
  });
}
attachInput();

/* ---- HUD buttons ---- */
document.getElementById("btnPause").addEventListener("click", ()=>{
  if(!running) return;
  paused = true; Audio_.sfx.click(); showOverlay("overlay-pause");
});
document.getElementById("btnResume").addEventListener("click", ()=>{
  paused = false; hideOverlay("overlay-pause"); Audio_.sfx.click(); lastTime = performance.now();
});
document.getElementById("btnRestartFromPause").addEventListener("click", ()=>{
  hideOverlay("overlay-pause"); Audio_.sfx.click(); startGame(level.id);
});
document.getElementById("btnQuitToMenu").addEventListener("click", ()=>{
  hideOverlay("overlay-pause"); running=false; Audio_.sfx.click();
  refreshCoinDisplays(); showScreen("screen-menu");
});
document.getElementById("btnRestartFromGO").addEventListener("click", ()=>{
  hideOverlay("overlay-gameover"); Audio_.sfx.click(); startGame(level.id);
});
document.getElementById("btnMenuFromGO").addEventListener("click", ()=>{
  hideOverlay("overlay-gameover"); Audio_.sfx.click(); refreshCoinDisplays(); showScreen("screen-menu");
});
document.getElementById("btnNextLevel").addEventListener("click", ()=>{
  hideOverlay("overlay-victory"); Audio_.sfx.click();
  const idx = LEVELS.findIndex(l=>l.id===level.id);
  const next = LEVELS[Math.min(idx+1, LEVELS.length-1)];
  startGame(profile.unlockedLevels[next.id] ? next.id : level.id);
});
document.getElementById("btnMenuFromVic").addEventListener("click", ()=>{
  hideOverlay("overlay-victory"); Audio_.sfx.click(); refreshCoinDisplays(); showScreen("screen-menu");
});

/* ---- Main loop ---- */
function loop(now){
  rafId = requestAnimationFrame(loop);
  const dt = Math.min((now-lastTime)/16.6667, 2.2);
  lastTime = now;
  if(!running) return;
  if(!paused) update(dt);
  render();
}

function update(dt){
  const diff = difficultyForIndex(Math.floor(ball.y/RING_SPACING));
  const gravity = diff.gravity ?? level.gravity;
  ball.vy += gravity*dt;
  const prevY = ball.y;
  ball.y += ball.vy*dt;
  ball.squash += (1-ball.squash)*0.18*dt;

  ensureRingsAhead();
  for(const ring of rings){
    if(!ring.resolved && ball.vy>0 && prevY <= ring.y && ball.y >= ring.y){
      resolveRing(ring);
      if(!running) break;
    }
  }
  if(running && level.ringsToWin && runStats.ringsCleared >= level.ringsToWin){
    winGame();
  }

  cam.offset = ball.y - cssH*0.32;
  cam.shakeMag = (cam.shakeMag||0) * Math.max(0, 1 - 0.14*dt);
  if(cam.shakeMag < 0.05) cam.shakeMag = 0;

  updateParticles(dt);

  // trail
  trailPositions.unshift(ball.squash);
  if(trailPositions.length>6) trailPositions.pop();

  // HUD
  document.getElementById("hudDepth").textContent = Math.max(0, runStats.ringsCleared) + "m";
  document.getElementById("hudCoins").textContent = runStats.coinsThisRun;
}

function render(){
  ctx.clearRect(0,0,cssW,cssH);
  const theme = currentTheme();
  const skin = currentSkin();

  // background wash matching theme
  const bgGrad = ctx.createLinearGradient(0,0,0,cssH);
  bgGrad.addColorStop(0, theme.bg[0]+"55");
  bgGrad.addColorStop(1, theme.bg[1]+"33");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0,0,cssW,cssH);

  ctx.save();
  let shakeX=0, shakeY=0;
  if(cam.shakeMag){
    shakeX = (Math.random()-0.5)*cam.shakeMag;
    shakeY = (Math.random()-0.5)*cam.shakeMag;
    ctx.translate(shakeX, shakeY);
  }

  const centerX = cssW/2;
  const towerR = getTowerRadius();
  const ringRy = towerR * 0.30;
  const highQ = profile.settings.graphics === "high";
  const medQ = profile.settings.graphics !== "low";

  // central pole glow
  ctx.save();
  ctx.globalAlpha = 0.25;
  const poleGrad = ctx.createLinearGradient(centerX-4,0,centerX+4,0);
  poleGrad.addColorStop(0, "transparent"); poleGrad.addColorStop(0.5, theme.platform[0]); poleGrad.addColorStop(1,"transparent");
  ctx.fillStyle = poleGrad;
  ctx.fillRect(centerX-40, 0, 80, cssH);
  ctx.restore();

  // draw rings back-to-front (further ones first): higher index = deeper = drawn first is fine since alpha blend simple
  const visibleRings = rings.filter(r=>{
    const sy = r.y - cam.offset;
    return sy > -80 && sy < cssH+80;
  }).sort((a,b)=>a.index-b.index);

  visibleRings.forEach(ring=>{
    const sy = ring.y - cam.offset;
    ctx.save();
    ctx.translate(centerX, sy);
    // faint full guide ellipse
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0,0, towerR, ringRy, 0, 0, TWO_PI); ctx.stroke();
    ctx.globalAlpha = 1;

    ring.segments.forEach(seg=>{
      if(seg.type === "gap") return;
      const a0 = seg.start + tower.rotation;
      const a1 = seg.end + tower.rotation;
      ctx.beginPath();
      ctx.ellipse(0,0, towerR, ringRy, 0, a0, a1);
      ctx.lineWidth = 16;
      ctx.lineCap = "butt";
      if(seg.type === "red"){
        const g = ctx.createLinearGradient(-towerR,0,towerR,0);
        g.addColorStop(0,"#ff4d6d"); g.addColorStop(1,"#c9184a");
        ctx.strokeStyle = g;
        if(highQ){ ctx.shadowColor = "#ff4d6d"; ctx.shadowBlur = 18; }
      } else {
        const g = ctx.createLinearGradient(-towerR,0,towerR,0);
        g.addColorStop(0, theme.platform[0]); g.addColorStop(1, theme.platform[1]);
        ctx.strokeStyle = g;
        if(highQ){ ctx.shadowColor = theme.platform[0]; ctx.shadowBlur = 10; }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // coin marker
    if(ring.hasCoin && !ring.coinCollected){
      const ang = ring.gapMidAngle + tower.rotation;
      const cx = Math.cos(ang)*towerR*0.92;
      const cyp = Math.sin(ang)*ringRy*0.92;
      ctx.save();
      ctx.translate(cx, cyp);
      ctx.fillStyle = "#ffd23f";
      if(medQ){ ctx.shadowColor = "#ffd23f"; ctx.shadowBlur = 12; }
      ctx.beginPath(); ctx.arc(0,0,7,0,TWO_PI); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#a5730a"; ctx.font = "bold 8px sans-serif"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("$", 0, 0.5);
      ctx.restore();
    }
    ctx.restore();
  });

  // particles (world space uses screen coords already since spawned at ball screen pos)
  drawParticles();

  // ball trail (soft fading circles behind current squash state)
  const bx = centerX, by = cssH*0.32;
  if(medQ){
    for(let i=trailPositions.length-1;i>=1;i--){
      const t = i/trailPositions.length;
      ctx.globalAlpha = 0.10*(1-t);
      ctx.fillStyle = skin.glow;
      ctx.beginPath();
      ctx.ellipse(bx, by - i*2.2, ball.radius*0.8, ball.radius*0.8*trailPositions[i], 0,0,TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ball
  ctx.save();
  ctx.translate(bx, by);
  const stretch = Math.max(0.6, Math.min(1.5, ball.squash));
  ctx.scale(1/Math.sqrt(stretch), stretch);
  const ballGrad = ctx.createRadialGradient(-ball.radius*0.35,-ball.radius*0.4,1, 0,0, ball.radius*1.3);
  if(skin.colors.length===3){
    ballGrad.addColorStop(0,"#fff"); ballGrad.addColorStop(0.4, skin.colors[0]);
    ballGrad.addColorStop(0.7, skin.colors[1]); ballGrad.addColorStop(1, skin.colors[2]);
  } else {
    ballGrad.addColorStop(0,"#ffffff"); ballGrad.addColorStop(0.45, skin.colors[0]); ballGrad.addColorStop(1, skin.colors[1]);
  }
  if(highQ){ ctx.shadowColor = skin.glow; ctx.shadowBlur = 22; }
  ctx.fillStyle = ballGrad;
  ctx.beginPath(); ctx.arc(0,0, ball.radius, 0, TWO_PI); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.restore(); // end shake transform
}

/* ========================================================================
   8. BACKGROUND PARTICLES (menu ambience, DOM-based, cheap)
   ======================================================================== */
function spawnBgParticles(){
  const wrap = document.getElementById("bgParticles");
  const count = 22;
  for(let i=0;i<count;i++){
    const p = document.createElement("div");
    p.className = "particle";
    const size = 3+Math.random()*7;
    p.style.width = size+"px"; p.style.height = size+"px";
    p.style.left = Math.random()*100+"%";
    p.style.top = 100+Math.random()*20+"%";
    p.style.setProperty("--drift", (Math.random()*60-30)+"px");
    const dur = 10+Math.random()*14;
    p.style.animationDuration = dur+"s";
    p.style.animationDelay = (-Math.random()*dur)+"s";
    wrap.appendChild(p);
  }
}

/* ========================================================================
   9. BOOT SEQUENCE
   ======================================================================== */
function boot(){
  spawnBgParticles();
  applyLanguage(profile.settings.language);
  buildSettingsUI();
  refreshCoinDisplays();

  // unlock hard/expert cost display uses current values; nothing else needed pre-menu

  let pct = 0;
  const fill = document.getElementById("loaderFill");
  const txt = document.getElementById("loaderText");
  const iv = setInterval(()=>{
    pct += 8 + Math.random()*14;
    if(pct>=100){
      pct = 100; clearInterval(iv);
      fill.style.width = "100%";
      txt.textContent = "Ready!";
      setTimeout(()=>{
        showScreen("screen-menu");
        refreshCoinDisplays();
      }, 350);
      return;
    }
    fill.style.width = pct+"%";
  }, 120);

  // resume audio context on first user gesture (mobile autoplay policies)
  const resumeAudio = ()=>{ Audio_.ensureCtx(); window.removeEventListener("pointerdown", resumeAudio); };
  window.addEventListener("pointerdown", resumeAudio);
}

boot();

})();