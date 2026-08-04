import { useEffect, useRef } from "react";

const SLOTS = 16;
const LEVELS = 60;
const LEVEL_GAP = 62;
const RX = 118;
const RY = 34;
const INNER = 0.34;
const THICK = 16;
const GRAVITY = 0.55;
const BOUNCE = -11;
const SMASH_SPEED = 17;

type Slot = 0 | 1 | 2; // 0 = hole, 1 = platform, 2 = deadly
type Level = { slots: Slot[]; destroyed: boolean };

const PALETTES = [
  { a: "#37d3f5", b: "#5ce6a5", block: "#2f6df6", dark: "#15171c" },
  { a: "#ff8a3d", b: "#ff4f81", block: "#ffd400", dark: "#15171c" },
  { a: "#7b5cff", b: "#ff7bd5", block: "#2ecc4a", dark: "#15171c" },
  { a: "#ff5f4d", b: "#ffb43d", block: "#e6392b", dark: "#15171c" },
];

function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * (1 + amt));
  const g = clamp(((n >> 8) & 255) * (1 + amt));
  const b = clamp((n & 255) * (1 + amt));
  return `rgb(${r},${g},${b})`;
}

function makeLevels(): Level[] {
  const out: Level[] = [];
  for (let i = 0; i < LEVELS; i++) {
    const slots: Slot[] = new Array(SLOTS).fill(1) as Slot[];
    const holeSize = 3 + Math.floor(Math.random() * 2);
    const holeStart = Math.floor(Math.random() * SLOTS);
    for (let h = 0; h < holeSize; h++) slots[(holeStart + h) % SLOTS] = 0;
    if (i > 2 && Math.random() < 0.75) {
      const dSize = 2 + Math.floor(Math.random() * 3);
      const dStart = Math.floor(Math.random() * SLOTS);
      for (let d = 0; d < dSize; d++) {
        const idx = (dStart + d) % SLOTS;
        if (slots[idx] === 1) slots[idx] = 2;
      }
    }
    out.push({ slots, destroyed: false });
  }
  out[out.length - 1]!.slots = new Array(SLOTS).fill(1) as Slot[];
  return out;
}

export default function HelixGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const levelRef = useRef<HTMLSpanElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const buttonTextRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;

    let W = 0;
    let H = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      W = r.width;
      H = r.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let levels = makeLevels();
    let rot = 0;
    let rotVel = 0;
    let ballY = -80;
    let vy = 0;
    let camY = -260;
    let smashing = false;
    let score = 0;
    let cleared = 0;
    let state: "ready" | "play" | "over" | "win" = "ready";
    let shake = 0;
    const shards: { x: number; y: number; vx: number; vy: number; r: number; c: string; life: number }[] = [];
    const pal = PALETTES[Math.floor(Math.random() * PALETTES.length)]!;

    const updateDOM = (newScore: number, newLevel: number, newState: typeof state) => {
      if (scoreRef.current) scoreRef.current.textContent = `${newScore}`;
      if (levelRef.current) levelRef.current.textContent = `LEVEL ${newLevel}`;
      if (overlayRef.current && titleRef.current && buttonTextRef.current) {
        if (newState === "play") {
          overlayRef.current.style.display = "none";
        } else {
          overlayRef.current.style.display = "flex";
          titleRef.current.textContent =
            newState === "ready" ? "Helix Smash" : newState === "win" ? "You Win!" : "Game Over";
          buttonTextRef.current.textContent = `Tap to ${newState === "ready" ? "start" : "retry"}`;
        }
      }
    };

    const reset = () => {
      levels = makeLevels();
      rot = 0;
      rotVel = 0;
      ballY = -80;
      vy = 0;
      camY = -260;
      score = 0;
      cleared = 0;
      shards.length = 0;
      state = "play";
      updateDOM(0, 1, "play");
    };

    let dragging = false;
    let lastX = 0;
    const down = (x: number) => {
      if (state !== "play") {
        reset();
        return;
      }
      dragging = true;
      lastX = x;
      smashing = true;
    };
    const move = (x: number) => {
      if (!dragging) return;
      const dx = x - lastX;
      lastX = x;
      rotVel = -dx * 0.012;
      if (Math.abs(dx) > 12) smashing = false;
    };
    const up = () => {
      dragging = false;
      smashing = false;
    };

    const onPD = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      down(e.clientX);
    };
    const onPM = (e: PointerEvent) => move(e.clientX);
    const onPU = () => up();
    canvas.addEventListener("pointerdown", onPD);
    canvas.addEventListener("pointermove", onPM);
    window.addEventListener("pointerup", onPU);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") rotVel = 0.06;
      if (e.key === "ArrowRight") rotVel = -0.06;
      if (e.key === " ") {
        if (state !== "play") reset();
        else smashing = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") smashing = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);

    const cx = () => W / 2;
    const baseY = () => H * 0.42;
    const screenY = (worldY: number) => baseY() + (worldY - camY);

    const frontSlot = () => {
      const step = (Math.PI * 2) / SLOTS;
      let a = Math.PI / 2 - rot;
      a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      return Math.floor(a / step) % SLOTS;
    };

    const burst = (y: number, color: string) => {
      for (let i = 0; i < 16; i++) {
        shards.push({
          x: cx() + (Math.random() - 0.5) * RX * 1.6,
          y: screenY(y),
          vx: (Math.random() - 0.5) * 9,
          vy: -Math.random() * 6 - 1,
          r: 4 + Math.random() * 7,
          c: color,
          life: 1,
        });
      }
    };

    const drawSegment = (yTop: number, from: number, to: number, color: string) => {
      ctx.beginPath();
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const a = from + ((to - from) * i) / steps;
        ctx.lineTo(cx() + Math.cos(a) * RX, yTop + Math.sin(a) * RY);
      }
      for (let i = steps; i >= 0; i--) {
        const a = from + ((to - from) * i) / steps;
        ctx.lineTo(cx() + Math.cos(a) * RX, yTop + Math.sin(a) * RY + THICK);
      }
      ctx.closePath();
      ctx.fillStyle = shade(color, -0.28);
      ctx.fill();

      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = from + ((to - from) * i) / steps;
        ctx.lineTo(cx() + Math.cos(a) * RX, yTop + Math.sin(a) * RY);
      }
      for (let i = steps; i >= 0; i--) {
        const a = from + ((to - from) * i) / steps;
        ctx.lineTo(cx() + Math.cos(a) * RX * INNER, yTop + Math.sin(a) * RY * INNER);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };

    const drawPoleSlice = (yTop: number, h: number) => {
      const r = RX * INNER;
      const g = ctx.createLinearGradient(cx() - r, 0, cx() + r, 0);
      g.addColorStop(0, "#d9dde3");
      g.addColorStop(0.35, "#ffffff");
      g.addColorStop(1, "#c3c9d2");
      ctx.fillStyle = g;
      ctx.fillRect(cx() - r, yTop, r * 2, h);
    };

    const draw = () => {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, pal.a);
      g.addColorStop(1, pal.b);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

      drawPoleSlice(0, H);

      const step = (Math.PI * 2) / SLOTS;
      for (let li = 0; li < levels.length; li++) {
        const lv = levels[li]!;
        if (lv.destroyed) continue;
        const y = screenY(li * LEVEL_GAP);
        if (y < -60 || y > H + 60) continue;

        type Seg = { from: number; to: number; color: string; depth: number };
        const segs: Seg[] = [];
        for (let s = 0; s < SLOTS; s++) {
          if (lv.slots[s] === 0) continue;
          const from = s * step + rot;
          const to = from + step;
          const mid = (from + to) / 2;
          segs.push({
            from,
            to,
            color: lv.slots[s] === 2 ? pal.dark : pal.block,
            depth: Math.sin(mid),
          });
        }
        segs.sort((p, q) => p.depth - q.depth);
        const back = segs.filter((s) => s.depth < 0);
        const front = segs.filter((s) => s.depth >= 0);

        back.forEach((s) => drawSegment(y, s.from, s.to, s.color));
        front.forEach((s) => drawSegment(y, s.from, s.to, s.color));
      }

      for (const p of shards) {
        ctx.globalAlpha = Math.max(p.life, 0);
        ctx.fillStyle = p.c;
        ctx.fillRect(p.x, p.y, p.r, p.r * 0.6);
      }
      ctx.globalAlpha = 1;

      const by = screenY(ballY);
      const br = 15;
      ctx.beginPath();
      ctx.ellipse(cx(), by + br + 4, br * 0.9, 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fill();

      const bg = ctx.createRadialGradient(cx() - 5, by - 6, 2, cx(), by, br);
      bg.addColorStop(0, "#ffffff");
      bg.addColorStop(0.35, "#6fd3ff");
      bg.addColorStop(1, "#1274d8");
      ctx.beginPath();
      ctx.arc(cx(), by, br, 0, Math.PI * 2);
      ctx.fillStyle = bg;
      ctx.fill();

      if (smashing && state === "play") {
        ctx.beginPath();
        ctx.moveTo(cx() - 9, by - 6);
        ctx.lineTo(cx(), by - 40 - Math.random() * 14);
        ctx.lineTo(cx() + 9, by - 6);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fill();
      }

      ctx.restore();
    };

    const update = () => {
      rot += rotVel;
      rotVel *= 0.9;
      shake *= 0.85;

      for (let i = shards.length - 1; i >= 0; i--) {
        const p = shards[i]!;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.6;
        p.life -= 0.03;
        if (p.life <= 0) shards.splice(i, 1);
      }

      if (state !== "play") return;

      const prevY = ballY;
      if (smashing) vy = Math.max(vy, SMASH_SPEED);
      vy += GRAVITY;
      ballY += vy;

      if (vy > 0) {
        for (let li = 0; li < levels.length; li++) {
          const lv = levels[li]!;
          if (lv.destroyed) continue;
          const ly = li * LEVEL_GAP;
          if (prevY <= ly && ballY >= ly) {
            const slot = lv.slots[frontSlot()];
            if (slot === 0) break;
            if (smashing) {
              if (slot === 2) {
                state = "over";
                shake = 14;
                burst(ly, pal.dark);
                updateDOM(score, cleared + 1, "over");
                return;
              }
              lv.destroyed = true;
              cleared++;
              score += 10;
              shake = 8;
              burst(ly, pal.block);
              updateDOM(score, cleared + 1, "play");
              continue;
            }
            if (slot === 2) {
              state = "over";
              shake = 14;
              updateDOM(score, cleared + 1, "over");
              return;
            }
            ballY = ly - 1;
            vy = BOUNCE;
            break;
          }
        }
      }

      if (ballY > (levels.length - 1) * LEVEL_GAP + 40) {
        state = "win";
        updateDOM(score + 100, cleared, "win");
      }

      const targetCam = ballY - 120;
      camY += (targetCam - camY) * 0.12;
    };

    const loop = () => {
      update();
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPD);
      canvas.removeEventListener("pointermove", onPM);
      window.removeEventListener("pointerup", onPU);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-3xl border border-border shadow-2xl">
      <canvas ref={canvasRef} className="h-full w-full touch-none select-none" />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 text-sm font-bold text-foreground/90 mix-blend-difference">
        <span ref={levelRef}>LEVEL 1</span>
        <span ref={scoreRef}>0</span>
      </div>

      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-foreground/40 text-center backdrop-blur-[2px]"
      >
        <h2 ref={titleRef} className="text-2xl font-extrabold text-background">
          Helix Smash
        </h2>
        <p className="max-w-[16rem] text-sm text-background/85">
          Drag to rotate the tower, hold to smash. Avoid the black blocks.
        </p>
        <p ref={buttonTextRef} className="mt-2 text-xs font-semibold uppercase tracking-widest text-background/70">
          Tap to start
        </p>
      </div>
    </div>
  );
}
