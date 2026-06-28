import { useEffect, useRef, useState, useCallback } from 'react';

// ─── КОНСТАНТЫ ────────────────────────────────────────────────────────────────
const TILE = 36;
const MAP_W = 34;
const MAP_H = 20;
const PLAYER_R = 11;
const THIEF_R = 11;

// 0=пол  1=стена  2=подвал  3=кровать  4=мебель  5=дверь-вход
const MAP: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,3,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,4,4,0,0,1,2,2,2,2,2,2,2,2,2,1],
  [1,3,3,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,0,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,1,1,1,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,4,4,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,4,4,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const isWall = (tx: number, ty: number) => {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  const t = MAP[ty][tx];
  return t === 1 || t === 4;
};

// ─── ТИПЫ ────────────────────────────────────────────────────────────────────
interface Entity {
  x: number; y: number;
  vx: number; vy: number;
  dir: number; // 0=вниз 1=влево 2=вправо 3=вверх
  walkFrame: number; walkTimer: number;
  hp: number;
}
interface Blood { x: number; y: number; life: number; size: number; vx: number; vy: number; }
interface Bullet { x: number; y: number; vx: number; vy: number; life: number; }

// ─── СЮЖЕТ ────────────────────────────────────────────────────────────────────
const STORY_ACTS = [
  {
    title: 'АКТ I — НОЧНОЙ КОШМАР',
    lines: [
      'Глубокая ночь. Ты спишь в своей квартире.',
      'Внезапно — удар металла о дверь. Ещё один.',
      'КТО-ТО ЛОМАЕТ ТВОЮ ДВЕРЬ ЛОМОМ.',
      'Ты должен найти пистолет в подвале!',
    ],
  },
  {
    title: 'АКТ II — В ТЕМНОТЕ',
    lines: [
      'Вор ворвался! Он ищет тебя по комнатам.',
      'Выключи свет — это собьёт его с толку.',
      'Найди патроны в кухонном ящике.',
      'Не дай ему тебя поймать!',
    ],
  },
  {
    title: 'АКТ III — ФИНАЛЬНАЯ СХВАТКА',
    lines: [
      'Вор ранен, но всё ещё опасен.',
      'У тебя последний шанс.',
      'Останови его — защити свой дом!',
      'ОГОНЬ!',
    ],
  },
];

// ─── ВЕБ-АУДИО ───────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;
function getAudio() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}
function playTone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.18) {
  try {
    const ac = getAudio();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, ac.currentTime);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.start(); osc.stop(ac.currentTime + dur);
  } catch { /* silent */ }
}
function playNoise(dur: number, vol = 0.2) {
  try {
    const ac = getAudio();
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const gain = ac.createGain();
    src.connect(gain); gain.connect(ac.destination);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    src.start(); src.stop(ac.currentTime + dur);
  } catch { /* silent */ }
}
const SFX = {
  step: () => playTone(120 + Math.random() * 40, 0.07, 'square', 0.05),
  bang: () => { playNoise(0.12, 0.4); playTone(80, 0.15, 'sawtooth', 0.3); },
  crowbar: () => { playNoise(0.18, 0.35); playTone(60, 0.2, 'sawtooth', 0.25); },
  pickup: () => { playTone(660, 0.08, 'sine', 0.2); playTone(880, 0.12, 'sine', 0.2); },
  groan: () => { playTone(120, 0.3, 'sawtooth', 0.22); playTone(80, 0.4, 'sawtooth', 0.15); },
  hit: () => { playNoise(0.09, 0.3); playTone(100, 0.1, 'square', 0.2); },
  switch: () => { playTone(440, 0.05, 'square', 0.1); playTone(220, 0.07, 'square', 0.1); },
  extra_ammo: () => { playTone(550, 0.07, 'sine', 0.18); playTone(770, 0.1, 'sine', 0.18); },
};

// ─── КОМПОНЕНТ ────────────────────────────────────────────────────────────────
export default function ThiefGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<'menu' | 'story' | 'play' | 'win' | 'lose'>('menu');
  const [storyAct, setStoryAct] = useState(0);
  const [storyLine, setStoryLine] = useState(0);
  const [hud, setHud] = useState({ hp: 100, hasGun: false, ammo: 0, act: 1 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [portrait, setPortrait] = useState(window.innerHeight > window.innerWidth);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateRef = useRef<any>(null);
  const joyRef = useRef({ active: false, baseX: 0, baseY: 0, dx: 0, dy: 0, id: -1 });
  const rafRef = useRef<number>(0);
  const stepTimer = useRef(0);

  // ─── Fullscreen ──────────────────────────────────────────────────────────
  const requestFS = useCallback(async () => {
    try {
      const el = wrapRef.current ?? document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
      // lock landscape
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (screen.orientation as any).lock('landscape');
      } catch { /* не поддерживается на всех устройствах */ }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFS);
    return () => document.removeEventListener('fullscreenchange', onFS);
  }, []);

  useEffect(() => {
    const onOr = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', onOr);
    return () => window.removeEventListener('resize', onOr);
  }, []);

  // ─── Инициализация ───────────────────────────────────────────────────────
  function initGame(act: number) {
    const player: Entity = { x: 2.5 * TILE, y: 2.5 * TILE, vx: 0, vy: 0, dir: 0, walkFrame: 0, walkTimer: 0, hp: 100 };
    const thief: Entity = { x: 30 * TILE, y: 16 * TILE, vx: 0, vy: 0, dir: 3, walkFrame: 0, walkTimer: 0, hp: act === 3 ? 60 : 100 };
    stateRef.current = {
      player, thief,
      bloods: [] as Blood[],
      gunPos: { x: 28 * TILE, y: 2.5 * TILE },   // пистолет в подвале
      ammoPos: { x: 11 * TILE, y: 9.5 * TILE },  // доп. патроны на кухне
      switchPos: { x: 16.5 * TILE, y: 16.5 * TILE },
      hasGun: false, ammo: 6, extraAmmo: true,
      lightsOff: false,
      thiefHit: 0,
      thiefState: 'breaking',
      breakTimer: act === 3 ? 80 : 200,
      crowbarTimer: 0,
      cam: { x: 0, y: 0 },
      shake: 0, muzzle: 0,
      bullets: [] as Bullet[],
      act,
    };
  }

  function startAct(act: number) {
    setStoryAct(act - 1);
    setStoryLine(0);
    setGameState('story');
  }

  function advanceStory() {
    const lines = STORY_ACTS[storyAct].lines;
    if (storyLine < lines.length - 1) {
      setStoryLine((l) => l + 1);
    } else {
      const act = storyAct + 1;
      initGame(act);
      setGameState('play');
      setHud({ hp: 100, hasGun: false, ammo: 6, act });
    }
  }

  // ─── Игровой цикл ────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'play') return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    let last = performance.now();
    let acc = 0;
    const STEP = 1000 / 60;

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      let dt = now - last; last = now;
      if (dt > 50) dt = 50;
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 3) { update(); acc -= STEP; steps++; }
      render(ctx, canvas);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // ─── Resize canvas ───────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current; if (!c) return;
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [gameState]);

  // ─── Физика ──────────────────────────────────────────────────────────────
  function moveEntity(e: Entity, nx: number, ny: number, r: number) {
    const corners = (px: number, py: number) => [
      [px - r, py - r], [px + r, py - r], [px - r, py + r], [px + r, py + r],
    ];
    const testX = e.x + nx;
    let blockedX = false;
    for (const [cx, cy] of corners(testX, e.y))
      if (isWall(Math.floor(cx / TILE), Math.floor(cy / TILE))) blockedX = true;
    if (!blockedX) e.x = testX;

    const testY = e.y + ny;
    let blockedY = false;
    for (const [cx, cy] of corners(e.x, testY))
      if (isWall(Math.floor(cx / TILE), Math.floor(cy / TILE))) blockedY = true;
    if (!blockedY) e.y = testY;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function spawnBlood(s: any, x: number, y: number, amount: number) {
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * 2.5 + 0.5;
      s.bloods.push({ x, y, life: 80 + Math.random() * 40, size: 2 + Math.random() * 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
    }
  }

  function update() {
    const s = stateRef.current;
    if (!s) return;
    const { player, thief } = s;
    const speed = 2.5;

    // движение игрока
    const j = joyRef.current;
    let mx = 0, my = 0;
    if (j.active) {
      const len = Math.hypot(j.dx, j.dy);
      if (len > 6) { mx = j.dx / len; my = j.dy / len; }
    }
    if (mx !== 0 || my !== 0) {
      moveEntity(player, mx * speed, my * speed, PLAYER_R);
      player.walkTimer++;
      if (player.walkTimer > 7) { player.walkFrame = (player.walkFrame + 1) % 4; player.walkTimer = 0; }
      if (Math.abs(mx) > Math.abs(my)) player.dir = mx > 0 ? 2 : 1;
      else player.dir = my > 0 ? 0 : 3;
      // звук шагов
      stepTimer.current++;
      if (stepTimer.current > 18) { stepTimer.current = 0; SFX.step(); }
    } else { player.walkFrame = 0; }

    // ИИ вора
    if (s.thiefState === 'breaking') {
      s.breakTimer--;
      s.crowbarTimer++;
      if (s.crowbarTimer % 25 === 0) { s.shake = 7; SFX.crowbar(); }
      if (s.breakTimer <= 0) s.thiefState = 'chase';
    } else {
      const dx = player.x - thief.x;
      const dy = player.y - thief.y;
      const dist = Math.hypot(dx, dy);
      // вор медленнее в темноте если выключен свет
      const tspeed = s.lightsOff ? 1.1 : (s.act === 3 ? 2.0 : 1.6);
      if (dist > 2) {
        const nx = dx / dist, ny = dy / dist;
        const before = { x: thief.x, y: thief.y };
        moveEntity(thief, nx * tspeed, ny * tspeed, THIEF_R);
        if (Math.hypot(thief.x - before.x, thief.y - before.y) < 0.4) {
          moveEntity(thief, (nx > 0 ? 1 : -1) * tspeed, 0, THIEF_R);
          moveEntity(thief, 0, (ny > 0 ? 1 : -1) * tspeed, THIEF_R);
        }
        thief.walkTimer++;
        if (thief.walkTimer > 7) { thief.walkFrame = (thief.walkFrame + 1) % 4; thief.walkTimer = 0; }
        if (Math.abs(dx) > Math.abs(dy)) thief.dir = dx > 0 ? 2 : 1;
        else thief.dir = dy > 0 ? 0 : 3;
      }
      s.thiefHit = Math.max(0, s.thiefHit - 1);
      if (dist < 32 && s.thiefHit === 0) {
        s.thiefHit = 55;
        player.hp -= 14;
        s.shake = 9;
        spawnBlood(s, player.x, player.y, 12);
        SFX.hit();
        setHud((h) => ({ ...h, hp: Math.max(0, player.hp) }));
        if (player.hp <= 0) setGameState('lose');
      }
    }

    // пули
    for (const b of s.bullets) {
      b.x += b.vx; b.y += b.vy; b.life--;
      if (isWall(Math.floor(b.x / TILE), Math.floor(b.y / TILE))) b.life = 0;
      if (s.thiefState === 'chase' && Math.hypot(b.x - thief.x, b.y - thief.y) < 16) {
        b.life = 0; thief.hp -= 34;
        spawnBlood(s, thief.x, thief.y, 18);
        s.shake = 6; SFX.groan();
        if (thief.hp <= 0) {
          // переход к следующему акту или победа
          if (s.act < 3) { setTimeout(() => startAct(s.act + 1), 1200); }
          else setGameState('win');
        }
      }
    }
    s.bullets = s.bullets.filter((b: Bullet) => b.life > 0);

    // кровь
    for (const bl of s.bloods) { bl.x += bl.vx; bl.y += bl.vy; bl.vx *= 0.88; bl.vy *= 0.88; bl.life--; }
    s.bloods = s.bloods.filter((b: Blood) => b.life > 0);

    if (s.shake > 0) s.shake *= 0.82;
    if (s.muzzle > 0) s.muzzle--;

    // камера
    const cw = canvasRef.current!.width, ch = canvasRef.current!.height;
    s.cam.x = player.x - cw / 2;
    s.cam.y = player.y - ch / 2;
    s.cam.x = Math.max(0, Math.min(MAP_W * TILE - cw, s.cam.x));
    s.cam.y = Math.max(0, Math.min(MAP_H * TILE - ch, s.cam.y));
  }

  // ─── Спрайт игрока ───────────────────────────────────────────────────────
  function drawBoy(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, frame: number) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    const ls = frame === 1 ? 3 : frame === 3 ? -3 : 0;
    ctx.fillStyle = '#2b3a67'; ctx.fillRect(-7 + ls, 9, 5, 9); ctx.fillRect(2 - ls, 9, 5, 9);
    ctx.fillStyle = '#4cc9f0'; ctx.fillRect(-9, -6 + bob, 18, 17);
    ctx.fillStyle = '#38a6cc'; ctx.fillRect(-12, -4 + bob, 4, 11); ctx.fillRect(8, -4 + bob, 4, 11);
    ctx.fillStyle = '#ffcc99'; ctx.fillRect(-8, -18 + bob, 16, 14);
    ctx.fillStyle = '#5a3210'; ctx.fillRect(-8, -18 + bob, 16, 5); ctx.fillRect(-8, -18 + bob, 4, 9); ctx.fillRect(4, -18 + bob, 4, 9);
    ctx.fillStyle = '#000';
    if (dir === 0) { ctx.fillRect(-4, -11 + bob, 2, 2); ctx.fillRect(2, -11 + bob, 2, 2); }
    else if (dir === 1) ctx.fillRect(-6, -11 + bob, 2, 2);
    else if (dir === 2) ctx.fillRect(4, -11 + bob, 2, 2);
    ctx.restore();
  }

  // ─── Спрайт вора ─────────────────────────────────────────────────────────
  function drawThief(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, frame: number, attacking: boolean) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y));
    const ls = frame === 1 ? 3 : frame === 3 ? -3 : 0;
    ctx.fillStyle = '#111'; ctx.fillRect(-7 + ls, 9, 5, 10); ctx.fillRect(2 - ls, 9, 5, 10);
    ctx.fillStyle = '#2d2d2d'; ctx.fillRect(-10, -6 + bob, 20, 17);
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-13, -4 + bob, 4, 12); ctx.fillRect(9, -4 + bob, 4, 12);
    ctx.fillStyle = '#777';
    if (attacking) { ctx.fillRect(11, -20 + bob, 5, 26); ctx.fillRect(9, -20 + bob, 12, 5); }
    else { ctx.fillRect(11, -6 + bob, 4, 20); }
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-8, -19 + bob, 16, 15);
    ctx.fillStyle = '#a55'; ctx.fillRect(-6, -13 + bob, 12, 5);
    ctx.fillStyle = '#f00';
    if (dir !== 3) { ctx.fillRect(-5, -13 + bob, 3, 3); ctx.fillRect(2, -13 + bob, 3, 3); }
    ctx.restore();
  }

  // ─── Рендер ──────────────────────────────────────────────────────────────
  function render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const s = stateRef.current; if (!s) return;
    const { player, thief, cam } = s;
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    const shx = s.shake > 0.5 ? (Math.random() - 0.5) * s.shake : 0;
    const shy = s.shake > 0.5 ? (Math.random() - 0.5) * s.shake : 0;
    ctx.translate(-Math.round(cam.x) + shx, -Math.round(cam.y) + shy);

    ctx.fillStyle = '#110e1a'; ctx.fillRect(cam.x, cam.y, canvas.width, canvas.height);

    const sx = Math.max(0, Math.floor(cam.x / TILE));
    const ex = Math.min(MAP_W, Math.ceil((cam.x + canvas.width) / TILE));
    const sy2 = Math.max(0, Math.floor(cam.y / TILE));
    const ey = Math.min(MAP_H, Math.ceil((cam.y + canvas.height) / TILE));

    for (let ty = sy2; ty < ey; ty++) {
      for (let tx = sx; tx < ex; tx++) {
        const t = MAP[ty][tx];
        const px = tx * TILE, py = ty * TILE;
        if (t === 1) {
          ctx.fillStyle = '#3d2b4a'; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#4d3a5a'; ctx.fillRect(px, py, TILE, 4);
          ctx.fillStyle = '#2d1c38'; ctx.fillRect(px, py + TILE - 3, TILE, 3);
        } else if (t === 2) {
          ctx.fillStyle = '#332b20'; ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = '#241e16'; ctx.lineWidth = 1; ctx.strokeRect(px, py, TILE, TILE);
          ctx.fillStyle = '#3a3228'; ctx.fillRect(px + 2, py + 2, TILE - 4, 3);
        } else if (t === 3) {
          ctx.fillStyle = '#7a5040'; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#f0e8d8'; ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.fillStyle = '#c84040'; ctx.fillRect(px + 3, py + 3, TILE - 6, 10);
          ctx.fillStyle = '#d0c8b8'; ctx.fillRect(px + 8, py + 3, 5, 10);
        } else if (t === 4) {
          ctx.fillStyle = '#5a4a3a'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = '#6a5a4a'; ctx.fillRect(px + 2, py + 2, TILE - 4, 6);
          ctx.fillStyle = '#4a3a2a'; ctx.fillRect(px + 2, py + TILE - 5, TILE - 4, 3);
        } else {
          const even = (tx + ty) % 2 === 0;
          ctx.fillStyle = even ? '#252030' : '#2a2438'; ctx.fillRect(px, py, TILE, TILE);
        }
      }
    }

    // окно спальни
    ctx.fillStyle = '#1a2a4a'; ctx.fillRect(3 * TILE, 4, 3 * TILE, 22);
    ctx.fillStyle = '#3a5a9a'; ctx.fillRect(3 * TILE + 3, 6, 3 * TILE - 6, 18);
    ctx.strokeStyle = '#7aaad8'; ctx.lineWidth = 1.5; ctx.strokeRect(3 * TILE + 3, 6, 3 * TILE - 6, 18);
    ctx.fillStyle = '#ffffff22'; ctx.fillRect(3 * TILE + 5, 8, 6, 5);

    // входная дверь
    const doorX = 27 * TILE, doorY = 6 * TILE;
    ctx.fillStyle = s.thiefState === 'breaking' ? '#9a5030' : '#5a3020';
    ctx.fillRect(doorX, doorY, TILE, 8);
    if (s.thiefState === 'breaking') {
      ctx.fillStyle = '#00000088';
      for (let i = 0; i < 5; i++) ctx.fillRect(doorX + 3 + i * 6, doorY + 1, 2, 5);
    }

    // доп. патроны на кухне (акт 2)
    if (s.extraAmmo) {
      const a = s.ammoPos;
      const near = Math.hypot(player.x - a.x, player.y - a.y) < 44;
      if (near) { ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2; ctx.strokeRect(a.x - 10, a.y - 8, 20, 16); }
      ctx.fillStyle = '#c8a020'; ctx.fillRect(a.x - 7, a.y - 4, 4, 8); ctx.fillRect(a.x - 1, a.y - 4, 4, 8); ctx.fillRect(a.x + 5, a.y - 4, 4, 8);
    }

    // кровь
    for (const bl of s.bloods) {
      ctx.globalAlpha = Math.min(0.9, bl.life / 60);
      ctx.fillStyle = '#990000';
      ctx.fillRect(Math.round(bl.x - bl.size / 2), Math.round(bl.y + 16), Math.round(bl.size), Math.round(bl.size));
    }
    ctx.globalAlpha = 1;

    // пистолет
    if (!s.hasGun) {
      const g = s.gunPos;
      const near = Math.hypot(player.x - g.x, player.y - g.y) < 44;
      if (near) { ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2.5; ctx.strokeRect(g.x - 14, g.y - 9, 28, 18); }
      ctx.fillStyle = '#555'; ctx.fillRect(g.x - 10, g.y - 4, 17, 7);
      ctx.fillRect(g.x - 8, g.y + 3, 6, 7);
      ctx.fillStyle = '#777'; ctx.fillRect(g.x + 5, g.y - 3, 7, 4);
      ctx.fillStyle = '#333'; ctx.fillRect(g.x - 10, g.y - 4, 17, 2);
    }

    // рубильник
    const sw = s.switchPos;
    const nearSw = Math.hypot(player.x - sw.x, player.y - sw.y) < 44;
    if (nearSw) { ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2; ctx.strokeRect(sw.x - 9, sw.y - 12, 18, 24); }
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(sw.x - 7, sw.y - 10, 14, 20);
    ctx.fillStyle = s.lightsOff ? '#cc2222' : '#22cc22';
    ctx.fillRect(sw.x - 4, s.lightsOff ? sw.y - 2 : sw.y - 8, 8, 8);

    // вор (если ворвался)
    if (s.thiefState !== 'breaking')
      drawThief(ctx, thief.x, thief.y, thief.dir, thief.walkFrame, s.thiefHit > 35);
    else {
      // вор за дверью: силуэт
      ctx.globalAlpha = 0.35;
      drawThief(ctx, doorX + TILE / 2, doorY + TILE, 0, 0, true);
      ctx.globalAlpha = 1;
    }

    drawBoy(ctx, player.x, player.y, player.dir, player.walkFrame);

    // вспышка + пули
    if (s.muzzle > 0) {
      ctx.fillStyle = '#ffee66'; ctx.globalAlpha = s.muzzle / 5;
      ctx.beginPath(); ctx.arc(player.x, player.y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#ffee44';
    for (const b of s.bullets) ctx.fillRect(b.x - 3, b.y - 3, 6, 6);

    ctx.restore();

    // виньетка-фонарик
    if (s.lightsOff) {
      const px = player.x - cam.x, py = player.y - cam.y;
      const g2 = ctx.createRadialGradient(px, py, 35, px, py, 180);
      g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(0.6, 'rgba(0,0,0,0.7)'); g2.addColorStop(1, 'rgba(0,0,0,0.97)');
      ctx.fillStyle = g2; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // индикатор HP вора (полоска над головой)
    if (s.thiefState === 'chase' && stateRef.current) {
      const tx = thief.x - cam.x + shx, ty2 = thief.y - cam.y + shy - 28;
      ctx.fillStyle = '#440000'; ctx.fillRect(tx - 18, ty2, 36, 5);
      ctx.fillStyle = '#ee2222'; ctx.fillRect(tx - 18, ty2, 36 * (thief.hp / 100), 5);
    }
  }

  // ─── Управление джойстиком ───────────────────────────────────────────────
  const [joyVis, setJoyVis] = useState({ show: false, bx: 0, by: 0, kx: 0, ky: 0 });

  function onTouchStart(e: React.TouchEvent) {
    e.preventDefault();
    const half = window.innerWidth / 2;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX < half) {
        // LEFT side = joystick
        if (!joyRef.current.active) {
          joyRef.current = { active: true, baseX: t.clientX, baseY: t.clientY, dx: 0, dy: 0, id: t.identifier };
          setJoyVis({ show: true, bx: t.clientX, by: t.clientY, kx: t.clientX, ky: t.clientY });
        }
      } else {
        // RIGHT side = action
        handleAction();
      }
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyRef.current.id) {
        let dx = t.clientX - joyRef.current.baseX;
        let dy = t.clientY - joyRef.current.baseY;
        const len = Math.hypot(dx, dy);
        if (len > 52) { dx = dx / len * 52; dy = dy / len * 52; }
        joyRef.current.dx = dx; joyRef.current.dy = dy;
        setJoyVis((v) => ({ ...v, kx: joyRef.current.baseX + dx, ky: joyRef.current.baseY + dy }));
      }
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyRef.current.id) {
        joyRef.current = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0, id: -1 };
        setJoyVis((v) => ({ ...v, show: false }));
      }
    }
  }

  function handleAction() {
    const s = stateRef.current; if (!s) return;
    const p = s.player;
    // взять пистолет
    if (!s.hasGun && Math.hypot(p.x - s.gunPos.x, p.y - s.gunPos.y) < 44) {
      s.hasGun = true; SFX.pickup();
      setHud((h) => ({ ...h, hasGun: true, ammo: 6 })); return;
    }
    // подобрать доп. патроны
    if (s.extraAmmo && Math.hypot(p.x - s.ammoPos.x, p.y - s.ammoPos.y) < 44) {
      s.ammo = Math.min(s.ammo + 6, 12); s.extraAmmo = false; SFX.extra_ammo();
      setHud((h) => ({ ...h, ammo: s.ammo })); return;
    }
    // рубильник
    if (Math.hypot(p.x - s.switchPos.x, p.y - s.switchPos.y) < 44) {
      s.lightsOff = !s.lightsOff; SFX.switch(); return;
    }
    // выстрел
    if (s.hasGun && s.ammo > 0) {
      s.ammo--; s.muzzle = 6; s.shake = 5; SFX.bang();
      const dm: Record<number, { x: number; y: number }> = { 0: { x: 0, y: 1 }, 1: { x: -1, y: 0 }, 2: { x: 1, y: 0 }, 3: { x: 0, y: -1 } };
      const d = dm[p.dir];
      s.bullets.push({ x: p.x, y: p.y, vx: d.x * 10, vy: d.y * 10, life: 70 });
      setHud((h) => ({ ...h, ammo: s.ammo }));
    }
  }

  // ─── JSX ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={wrapRef}
      className="relative bg-black overflow-hidden select-none touch-none"
      style={{ width: '100dvw', height: '100dvh' }}
      onTouchStart={gameState === 'play' ? onTouchStart : undefined}
      onTouchMove={gameState === 'play' ? onTouchMove : undefined}
      onTouchEnd={gameState === 'play' ? onTouchEnd : undefined}
    >
      <canvas ref={canvasRef} style={{ display: 'block', imageRendering: 'pixelated', width: '100%', height: '100%' }} />

      {/* ── МЕНЮ ── */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 px-6 text-center">
          <div className="mb-3" style={{ fontSize: 52 }}>🌙</div>
          <h1 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 22, color: '#ee2222', textShadow: '3px 3px #400', marginBottom: 6 }}>
            НОЧНОЙ ВОР
          </h1>
          <p style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#aa7777', marginBottom: 20, lineHeight: 1.8 }}>
            ПИКСЕЛЬНЫЙ ХОРРОР-ЭКШЕН
          </p>
          <div style={{ border: '2px solid #442222', padding: '12px 20px', marginBottom: 20, maxWidth: 320 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#cc9988', lineHeight: 1.7, textAlign: 'left' }}>
              🕹️ Лево экрана — джойстик<br />
              👆 Право экрана — взять / стрелять<br />
              🔫 Пистолет в подвале (правый верх)<br />
              💡 Жёлтый контур — взаимодействие<br />
              🔦 Рубильник гасит свет — вор слепнет
            </p>
          </div>
          {!isFullscreen && (
            <button
              onClick={() => { requestFS(); }}
              style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, background: '#223344', color: '#88aacc', border: '2px solid #446688', padding: '10px 18px', marginBottom: 12, cursor: 'pointer', borderRadius: 4 }}
            >
              ⛶ ПОЛНЫЙ ЭКРАН
            </button>
          )}
          <button
            onClick={() => startAct(1)}
            style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 11, background: '#aa1111', color: '#fff', border: '3px solid #ff4444', padding: '14px 28px', cursor: 'pointer', borderRadius: 4, boxShadow: '0 0 18px #ff222288' }}
          >
            ▶ ИГРАТЬ
          </button>
        </div>
      )}

      {/* ── СЮЖЕТНЫЙ ЭКРАН ── */}
      {gameState === 'story' && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black px-8"
          onClick={advanceStory}
          onTouchStart={(e) => { e.preventDefault(); advanceStory(); }}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #1a0a0a 0%, #000 100%)' }} />
          <div style={{ position: 'relative', maxWidth: 400, textAlign: 'center' }}>
            <p style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#884444', marginBottom: 18, letterSpacing: 2 }}>
              {STORY_ACTS[storyAct].title}
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: 14, color: '#ddccbb', lineHeight: 1.9, minHeight: 60 }}>
              {STORY_ACTS[storyAct].lines[storyLine]}
            </p>
            <p style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#555', marginTop: 32, animation: 'pulse 1.2s infinite' }}>
              ТАП — ПРОДОЛЖИТЬ
            </p>
          </div>
        </div>
      )}

      {/* ── ИГРОВОЙ HUD ── */}
      {gameState === 'play' && (
        <>
          {/* HP игрока */}
          <div style={{ position: 'absolute', top: 10, left: 12, zIndex: 20, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>❤️</span>
              <div style={{ width: 110, height: 12, background: '#220000', border: '2px solid #660000', borderRadius: 2 }}>
                <div style={{ height: '100%', background: `linear-gradient(90deg, #cc2222, #ff4444)`, width: `${hud.hp}%`, transition: 'width 0.2s', borderRadius: 1 }} />
              </div>
            </div>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#ffcc00' }}>
              {hud.hasGun ? `🔫 ${hud.ammo} патр.` : '🔍 НАЙДИ ПИСТОЛЕТ'}
            </div>
            <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#886644', marginTop: 3 }}>
              АКТ {hud.act}/3
            </div>
          </div>

          {/* Кнопка действия (правая зона) */}
          <div style={{ position: 'absolute', bottom: 28, right: 22, zIndex: 20, pointerEvents: 'none',
            width: 72, height: 72, borderRadius: '50%',
            border: '2.5px solid #ffd60a88',
            background: '#ffd60a18',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#ffd60a', textAlign: 'center', lineHeight: 1.4 }}>
              {hud.hasGun ? 'ОГОНЬ' : 'ВЗЯТЬ'}
            </span>
          </div>

          {/* Джойстик */}
          {joyVis.show && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', width: 104, height: 104, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)',
                left: joyVis.bx - 52, top: joyVis.by - 52 }} />
              <div style={{ position: 'absolute', width: 46, height: 46, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.25)',
                left: joyVis.kx - 23, top: joyVis.ky - 23 }} />
            </div>
          )}

          {/* Fullscreen кнопка */}
          {!isFullscreen && (
            <button onClick={requestFS} style={{ position: 'absolute', top: 10, right: 12, zIndex: 20,
              fontFamily: '"Press Start 2P", monospace', fontSize: 8,
              background: '#11223388', color: '#6699bb', border: '1px solid #33557788',
              padding: '6px 10px', borderRadius: 3, cursor: 'pointer' }}>
              ⛶
            </button>
          )}
        </>
      )}

      {/* Предупреждение о портретном режиме */}
      {portrait && gameState === 'play' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: '#000000ee',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📱↔️</div>
          <p style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#ffcc44', textAlign: 'center', lineHeight: 2 }}>
            ПОВЕРНИ ТЕЛЕФОН<br />ГОРИЗОНТАЛЬНО
          </p>
        </div>
      )}

      {/* ── ПОБЕДА ── */}
      {gameState === 'win' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 px-6 text-center">
          <div style={{ fontSize: 52, marginBottom: 10 }}>🏆</div>
          <h1 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 16, color: '#44ee44', marginBottom: 10 }}>
            ВОР ПОБЕЖДЁН!
          </h1>
          <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#aabbaa', marginBottom: 24, lineHeight: 1.8 }}>
            Ты прошёл все 3 акта и защитил свой дом.<br />Квартира в безопасности. До утра!
          </p>
          <button onClick={() => startAct(1)} style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, background: '#115511', color: '#aaffaa', border: '2px solid #44cc44', padding: '14px 24px', cursor: 'pointer', borderRadius: 4 }}>
            ИГРАТЬ СНОВА
          </button>
        </div>
      )}

      {/* ── ПОРАЖЕНИЕ ── */}
      {gameState === 'lose' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/92 px-6 text-center">
          <div style={{ fontSize: 52, marginBottom: 10 }}>💀</div>
          <h1 style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 16, color: '#ee2222', marginBottom: 10 }}>
            ТЫ ПОЙМАН
          </h1>
          <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#bb8888', marginBottom: 24, lineHeight: 1.8 }}>
            Вор добрался до тебя.<br />Беги быстрее к пистолету в следующий раз!
          </p>
          <button onClick={() => startAct(stateRef.current?.act ?? 1)} style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, background: '#551111', color: '#ffaaaa', border: '2px solid #cc4444', padding: '14px 24px', cursor: 'pointer', borderRadius: 4 }}>
            ПОВТОРИТЬ АКТ
          </button>
        </div>
      )}
    </div>
  );
}
