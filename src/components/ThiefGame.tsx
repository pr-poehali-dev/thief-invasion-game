import { useEffect, useRef, useState } from 'react';

const TILE = 32;
const MAP_W = 30;
const MAP_H = 20;

// 0 = пол, 1 = стена, 2 = пол подвала, 3 = кровать, 4 = мебель/препятствие
// Карта: трёхкомнатная квартира + коридор с дверью + подвал
const MAP: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,3,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,4,4,0,0,1,2,2,2,2,2,1],
  [1,3,3,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,2,2,2,2,2,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,2,2,2,2,2,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,2,2,2,2,2,1],
  [1,1,1,0,1,1,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,1,1,1,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,4,4,4,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,4,4,4,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const isWall = (tx: number, ty: number) => {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  const t = MAP[ty][tx];
  return t === 1 || t === 4;
};

type Vec = { x: number; y: number };

interface Entity {
  x: number; y: number;
  vx: number; vy: number;
  dir: number; // 0 down,1 left,2 right,3 up
  walkFrame: number;
  walkTimer: number;
  hp: number;
}

interface Blood { x: number; y: number; life: number; size: number; vx: number; vy: number; }

export default function ThiefGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'play' | 'win' | 'lose'>('menu');
  const [hud, setHud] = useState({ hp: 100, hasGun: false, ammo: 0 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateRef = useRef<any>(null);
  const joyRef = useRef({ active: false, baseX: 0, baseY: 0, dx: 0, dy: 0, id: -1 });
  const rafRef = useRef<number>(0);

  function initGame() {
    const player: Entity = { x: 2 * TILE, y: 2 * TILE, vx: 0, vy: 0, dir: 0, walkFrame: 0, walkTimer: 0, hp: 100 };
    const thief: Entity = { x: 27 * TILE, y: 16 * TILE, vx: 0, vy: 0, dir: 3, walkFrame: 0, walkTimer: 0, hp: 100 };
    stateRef.current = {
      player, thief,
      bloods: [] as Blood[],
      gunPos: { x: 26 * TILE, y: 2 * TILE }, // пистолет в подвале
      switchPos: { x: 16 * TILE, y: 16 * TILE }, // рубильник
      hasGun: false, ammo: 6,
      lightsOff: false,
      thiefHit: 0, playerHit: 0,
      thiefState: 'breaking', breakTimer: 180,
      cam: { x: 0, y: 0 },
      shake: 0,
      muzzle: 0,
      bullets: [] as { x: number; y: number; vx: number; vy: number; life: number }[],
    };
  }

  function startGame() {
    initGame();
    setGameState('play');
    setHud({ hp: 100, hasGun: false, ammo: 6 });
  }

  // === Игровой цикл ===
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
      let dt = now - last;
      last = now;
      if (dt > 50) dt = 50; // не ниже ~20fps скачок
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 3) {
        update();
        acc -= STEP;
        steps++;
      }
      render(ctx, canvas);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState]);

  function moveEntity(e: Entity, nx: number, ny: number, r: number) {
    // коллизия по X
    const testX = e.x + nx;
    const corners = (px: number, py: number) => [
      [px - r, py - r], [px + r, py - r], [px - r, py + r], [px + r, py + r],
    ];
    let blockedX = false;
    for (const [cx, cy] of corners(testX, e.y)) {
      if (isWall(Math.floor(cx / TILE), Math.floor(cy / TILE))) blockedX = true;
    }
    if (!blockedX) e.x = testX;
    const testY = e.y + ny;
    let blockedY = false;
    for (const [cx, cy] of corners(e.x, testY)) {
      if (isWall(Math.floor(cx / TILE), Math.floor(cy / TILE))) blockedY = true;
    }
    if (!blockedY) e.y = testY;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function spawnBlood(s: any, x: number, y: number, amount: number) {
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * 2 + 0.5;
      s.bloods.push({ x, y, life: 60 + Math.random() * 40, size: 2 + Math.random() * 3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
    }
  }

  function update() {
    const s = stateRef.current;
    if (!s) return;
    const { player, thief } = s;
    const speed = 2.2;

    // движение игрока джойстиком
    const j = joyRef.current;
    let mx = 0, my = 0;
    if (j.active) {
      const len = Math.hypot(j.dx, j.dy);
      if (len > 6) {
        mx = j.dx / len; my = j.dy / len;
      }
    }
    if (mx !== 0 || my !== 0) {
      moveEntity(player, mx * speed, my * speed, 10);
      player.walkTimer++;
      if (player.walkTimer > 8) { player.walkFrame = (player.walkFrame + 1) % 4; player.walkTimer = 0; }
      if (Math.abs(mx) > Math.abs(my)) player.dir = mx > 0 ? 2 : 1;
      else player.dir = my > 0 ? 0 : 3;
    } else { player.walkFrame = 0; }

    // === ИИ вора ===
    if (s.thiefState === 'breaking') {
      s.breakTimer--;
      if (s.breakTimer % 20 === 0) s.shake = 6;
      if (s.breakTimer <= 0) s.thiefState = 'chase';
    } else {
      // преследование по направлению к игроку (с обходом стен — пробуем по осям)
      const dx = player.x - thief.x;
      const dy = player.y - thief.y;
      const dist = Math.hypot(dx, dy);
      const tspeed = 1.7;
      if (dist > 2) {
        const nx = dx / dist, ny = dy / dist;
        const before = { x: thief.x, y: thief.y };
        moveEntity(thief, nx * tspeed, ny * tspeed, 10);
        // если застрял — пробуем скользить по одной оси
        if (Math.hypot(thief.x - before.x, thief.y - before.y) < 0.5) {
          moveEntity(thief, (nx > 0 ? 1 : -1) * tspeed, 0, 10);
          moveEntity(thief, 0, (ny > 0 ? 1 : -1) * tspeed, 10);
        }
        thief.walkTimer++;
        if (thief.walkTimer > 8) { thief.walkFrame = (thief.walkFrame + 1) % 4; thief.walkTimer = 0; }
        if (Math.abs(dx) > Math.abs(dy)) thief.dir = dx > 0 ? 2 : 1;
        else thief.dir = dy > 0 ? 0 : 3;
      }
      // атака ломом
      s.thiefHit = Math.max(0, s.thiefHit - 1);
      if (dist < 30 && s.thiefHit === 0) {
        s.thiefHit = 50;
        player.hp -= 12;
        s.shake = 8;
        spawnBlood(s, player.x, player.y, 10);
        setHud((h) => ({ ...h, hp: Math.max(0, player.hp) }));
        if (player.hp <= 0) { setGameState('lose'); }
      }
    }

    // пули
    for (const b of s.bullets) {
      b.x += b.vx; b.y += b.vy; b.life--;
      if (isWall(Math.floor(b.x / TILE), Math.floor(b.y / TILE))) b.life = 0;
      if (s.thiefState === 'chase' && Math.hypot(b.x - thief.x, b.y - thief.y) < 14) {
        b.life = 0;
        thief.hp -= 34;
        spawnBlood(s, thief.x, thief.y, 14);
        s.shake = 5;
        if (thief.hp <= 0) setGameState('win');
      }
    }
    s.bullets = s.bullets.filter((b: { life: number }) => b.life > 0);

    // кровь
    for (const bl of s.bloods) { bl.x += bl.vx; bl.y += bl.vy; bl.vx *= 0.9; bl.vy *= 0.9; bl.life--; }
    s.bloods = s.bloods.filter((b: Blood) => b.life > 0);

    if (s.shake > 0) s.shake *= 0.85;
    if (s.muzzle > 0) s.muzzle--;

    // камера
    const cw = canvasRef.current!.width, ch = canvasRef.current!.height;
    s.cam.x = player.x - cw / 2;
    s.cam.y = player.y - ch / 2;
    s.cam.x = Math.max(0, Math.min(MAP_W * TILE - cw, s.cam.x));
    s.cam.y = Math.max(0, Math.min(MAP_H * TILE - ch, s.cam.y));
  }

  // === Рендер пиксель-спрайтов ===
  function drawBoy(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, frame: number) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    // ноги
    ctx.fillStyle = '#2b3a67';
    const legSwing = frame === 1 ? 2 : frame === 3 ? -2 : 0;
    ctx.fillRect(-7 + legSwing, 8, 5, 8);
    ctx.fillRect(2 - legSwing, 8, 5, 8);
    // тело (пижама)
    ctx.fillStyle = '#4cc9f0';
    ctx.fillRect(-8, -6 + bob, 16, 16);
    // руки
    ctx.fillStyle = '#3aa0c9';
    ctx.fillRect(-10, -4 + bob, 3, 10);
    ctx.fillRect(7, -4 + bob, 3, 10);
    // голова
    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(-7, -16 + bob, 14, 12);
    // волосы
    ctx.fillStyle = '#5a3210';
    ctx.fillRect(-7, -16 + bob, 14, 4);
    ctx.fillRect(-7, -16 + bob, 3, 8);
    ctx.fillRect(4, -16 + bob, 3, 8);
    // глаза по направлению
    ctx.fillStyle = '#000';
    if (dir === 3) { /* спина */ } else {
      const ex = dir === 1 ? -5 : dir === 2 ? 1 : -4;
      ctx.fillRect(ex, -10 + bob, 2, 2);
      if (dir === 0) ctx.fillRect(2, -10 + bob, 2, 2);
    }
    ctx.restore();
  }

  function drawThief(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, frame: number, attacking: boolean) {
    const bob = (frame === 1 || frame === 3) ? 1 : 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    // ноги
    ctx.fillStyle = '#111';
    const legSwing = frame === 1 ? 2 : frame === 3 ? -2 : 0;
    ctx.fillRect(-7 + legSwing, 8, 5, 9);
    ctx.fillRect(2 - legSwing, 8, 5, 9);
    // тело (чёрная куртка)
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(-9, -6 + bob, 18, 16);
    // руки
    ctx.fillStyle = '#222';
    ctx.fillRect(-11, -4 + bob, 3, 11);
    ctx.fillRect(8, -4 + bob, 3, 11);
    // лом
    ctx.fillStyle = '#888';
    if (attacking) { ctx.fillRect(10, -16 + bob, 4, 22); ctx.fillRect(10, -16 + bob, 10, 4); }
    else { ctx.fillRect(10, -6 + bob, 4, 18); }
    // голова + маска
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(-7, -17 + bob, 14, 13);
    ctx.fillStyle = '#d99';
    ctx.fillRect(-5, -12 + bob, 10, 4);
    // глаза злые
    ctx.fillStyle = '#f00';
    if (dir !== 3) {
      ctx.fillRect(-4, -11 + bob, 2, 2);
      ctx.fillRect(2, -11 + bob, 2, 2);
    }
    ctx.restore();
  }

  function render(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    const s = stateRef.current;
    if (!s) return;
    const { player, thief, cam } = s;
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    let shx = 0, shy = 0;
    if (s.shake > 0.3) { shx = (Math.random() - 0.5) * s.shake; shy = (Math.random() - 0.5) * s.shake; }
    ctx.translate(-Math.round(cam.x) + shx, -Math.round(cam.y) + shy);

    // фон
    ctx.fillStyle = '#1a1320';
    ctx.fillRect(cam.x, cam.y, canvas.width, canvas.height);

    // тайлы
    const startX = Math.max(0, Math.floor(cam.x / TILE));
    const endX = Math.min(MAP_W, Math.ceil((cam.x + canvas.width) / TILE));
    const startY = Math.max(0, Math.floor(cam.y / TILE));
    const endY = Math.min(MAP_H, Math.ceil((cam.y + canvas.height) / TILE));
    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        const t = MAP[ty][tx];
        const px = tx * TILE, py = ty * TILE;
        if (t === 1) {
          ctx.fillStyle = '#3d2b4a'; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#4d3a5a'; ctx.fillRect(px, py, TILE, 4);
        } else if (t === 2) {
          ctx.fillStyle = '#3a3026'; ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = '#2a221a'; ctx.strokeRect(px, py, TILE, TILE);
        } else if (t === 3) {
          ctx.fillStyle = '#6b4a3a'; ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = '#e8e0d0'; ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
          ctx.fillStyle = '#c44'; ctx.fillRect(px + 3, py + 3, TILE - 6, 8);
        } else if (t === 4) {
          ctx.fillStyle = '#5a4a3a'; ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
          ctx.fillStyle = '#6a5a4a'; ctx.fillRect(px + 2, py + 2, TILE - 4, 5);
        } else {
          ctx.fillStyle = (tx + ty) % 2 === 0 ? '#2a2230' : '#2e2636';
          ctx.fillRect(px, py, TILE, TILE);
        }
      }
    }

    // окно над спальней (декор на стене)
    ctx.fillStyle = '#1a2a4a'; ctx.fillRect(3 * TILE, 0 * TILE + 6, 3 * TILE, 18);
    ctx.fillStyle = '#3a5a8a'; ctx.fillRect(3 * TILE + 2, 8, 3 * TILE - 4, 14);
    ctx.strokeStyle = '#6a8aba'; ctx.strokeRect(3 * TILE + 2, 8, 3 * TILE - 4, 14);

    // дверь (коридор, где вор)
    ctx.fillStyle = s.thiefState === 'breaking' ? '#8a4a2a' : '#5a3a2a';
    ctx.fillRect(26 * TILE, 6 * TILE, TILE, 6);
    if (s.thiefState === 'breaking') {
      ctx.fillStyle = '#000';
      for (let i = 0; i < 4; i++) ctx.fillRect(26 * TILE + 4 + i * 6, 6 * TILE + 1, 2, 4);
    }

    // кровь под спрайтами
    for (const bl of s.bloods) {
      ctx.globalAlpha = Math.min(1, bl.life / 50);
      ctx.fillStyle = '#a00';
      ctx.fillRect(Math.round(bl.x - bl.size / 2), Math.round(bl.y + 14), bl.size, bl.size);
    }
    ctx.globalAlpha = 1;

    // === Пистолет в подвале (подсветка при близости) ===
    if (!s.hasGun) {
      const g = s.gunPos;
      const near = Math.hypot(player.x - g.x, player.y - g.y) < 40;
      if (near) {
        ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2;
        ctx.strokeRect(g.x - 12, g.y - 8, 24, 16);
      }
      ctx.fillStyle = '#444'; ctx.fillRect(g.x - 8, g.y - 3, 14, 6);
      ctx.fillRect(g.x - 6, g.y + 3, 5, 6);
      ctx.fillStyle = '#666'; ctx.fillRect(g.x + 4, g.y - 2, 6, 3);
    }

    // === Рубильник ===
    const sw = s.switchPos;
    const nearSw = Math.hypot(player.x - sw.x, player.y - sw.y) < 40;
    if (nearSw) { ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2; ctx.strokeRect(sw.x - 8, sw.y - 10, 16, 20); }
    ctx.fillStyle = '#222'; ctx.fillRect(sw.x - 6, sw.y - 8, 12, 16);
    ctx.fillStyle = s.lightsOff ? '#a00' : '#0a0';
    ctx.fillRect(sw.x - 3, s.lightsOff ? sw.y : sw.y - 6, 6, 6);

    // спрайты
    if (s.thiefState !== 'breaking') {
      drawThief(ctx, thief.x, thief.y, thief.dir, thief.walkFrame, s.thiefHit > 30);
    }
    drawBoy(ctx, player.x, player.y, player.dir, player.walkFrame);

    // вспышка выстрела
    if (s.muzzle > 0) {
      ctx.fillStyle = '#ffea00';
      ctx.beginPath(); ctx.arc(player.x, player.y, 8, 0, Math.PI * 2); ctx.fill();
    }
    // пули
    ctx.fillStyle = '#ffea00';
    for (const b of s.bullets) ctx.fillRect(b.x - 2, b.y - 2, 4, 4);

    ctx.restore();

    // === Затемнение при выключенном свете (виньетка-фонарик) ===
    if (s.lightsOff) {
      const px = player.x - cam.x, py = player.y - cam.y;
      const grad = ctx.createRadialGradient(px, py, 30, px, py, 160);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // resize canvas
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current;
      if (!c) return;
      c.width = Math.min(window.innerWidth, 480);
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [gameState]);

  // === Джойстик (левая половина) и действия (тап правая половина) ===
  function onTouchStart(e: React.TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const half = window.innerWidth / 2;
      if (t.clientX < half && !joyRef.current.active) {
        joyRef.current = { active: true, baseX: t.clientX, baseY: t.clientY, dx: 0, dy: 0, id: t.identifier };
        setJoyVis({ show: true, bx: t.clientX, by: t.clientY, kx: t.clientX, ky: t.clientY });
      } else {
        handleAction();
      }
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyRef.current.id) {
        let dx = t.clientX - joyRef.current.baseX;
        let dy = t.clientY - joyRef.current.baseY;
        const len = Math.hypot(dx, dy);
        const max = 50;
        if (len > max) { dx = dx / len * max; dy = dy / len * max; }
        joyRef.current.dx = dx; joyRef.current.dy = dy;
        setJoyVis((v) => ({ ...v, kx: joyRef.current.baseX + dx, ky: joyRef.current.baseY + dy }));
      }
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyRef.current.id) {
        joyRef.current = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0, id: -1 };
        setJoyVis((v) => ({ ...v, show: false }));
      }
    }
  }

  const [joyVis, setJoyVis] = useState({ show: false, bx: 0, by: 0, kx: 0, ky: 0 });

  function handleAction() {
    const s = stateRef.current;
    if (!s) return;
    const p = s.player;
    // взять пистолет
    if (!s.hasGun && Math.hypot(p.x - s.gunPos.x, p.y - s.gunPos.y) < 40) {
      s.hasGun = true;
      setHud((h) => ({ ...h, hasGun: true }));
      return;
    }
    // рубильник
    if (Math.hypot(p.x - s.switchPos.x, p.y - s.switchPos.y) < 40) {
      s.lightsOff = !s.lightsOff;
      return;
    }
    // стрелять
    if (s.hasGun && s.ammo > 0) {
      s.ammo--;
      s.muzzle = 5;
      s.shake = 4;
      const dirMap: Record<number, Vec> = { 0: { x: 0, y: 1 }, 1: { x: -1, y: 0 }, 2: { x: 1, y: 0 }, 3: { x: 0, y: -1 } };
      const d = dirMap[p.dir];
      s.bullets.push({ x: p.x, y: p.y, vx: d.x * 9, vy: d.y * 9, life: 60 });
      setHud((h) => ({ ...h, ammo: s.ammo }));
    }
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex justify-center select-none touch-none"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <canvas ref={canvasRef} className="bg-black" style={{ imageRendering: 'pixelated' }} />

      {gameState === 'menu' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 px-6 text-center">
          <div className="text-5xl mb-2">🌙</div>
          <h1 className="font-pixel text-2xl text-red-500 mb-2" style={{ textShadow: '2px 2px #400' }}>НОЧНОЙ ВОР</h1>
          <p className="text-gray-300 text-sm mb-6 max-w-xs leading-relaxed">
            Ночь. В дверь ломится вор с ломом. Найди травматический пистолет в подвале и защити квартиру!
          </p>
          <ul className="text-gray-400 text-xs mb-8 space-y-1 text-left">
            <li>🕹️ Левая часть экрана — джойстик</li>
            <li>👆 Тап справа — взять / стрелять / рубильник</li>
            <li>🔫 Пистолет в подвале (справа сверху)</li>
            <li>💡 Жёлтый контур — можно взаимодействовать</li>
          </ul>
          <button onClick={startGame}
            className="font-pixel bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-lg text-lg active:scale-95 transition">
            ИГРАТЬ
          </button>
        </div>
      )}

      {gameState === 'play' && (
        <>
          {/* HUD */}
          <div className="absolute top-3 left-3 z-20 pointer-events-none">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-red-500 text-lg">❤️</span>
              <div className="w-32 h-4 bg-black/60 border-2 border-red-900 rounded">
                <div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-sm transition-all"
                  style={{ width: `${hud.hp}%` }} />
              </div>
            </div>
            <div className="font-pixel text-xs text-yellow-400">
              {hud.hasGun ? `🔫 ПАТРОНЫ: ${hud.ammo}` : '🔍 НАЙДИ ПИСТОЛЕТ'}
            </div>
          </div>
          {/* кнопка действия (визуальная подсказка) */}
          <div className="absolute bottom-10 right-8 z-20 w-20 h-20 rounded-full bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center pointer-events-none">
            <span className="font-pixel text-yellow-300 text-xs text-center leading-tight">{hud.hasGun ? 'ОГОНЬ' : 'ВЗЯТЬ'}</span>
          </div>
          {/* джойстик визуал */}
          {joyVis.show && (
            <div className="absolute z-20 pointer-events-none">
              <div className="absolute rounded-full bg-white/10 border-2 border-white/30"
                style={{ width: 100, height: 100, left: joyVis.bx - 50, top: joyVis.by - 50 }} />
              <div className="absolute rounded-full bg-white/40 border-2 border-white/60"
                style={{ width: 44, height: 44, left: joyVis.kx - 22, top: joyVis.ky - 22 }} />
            </div>
          )}
        </>
      )}

      {gameState === 'win' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 px-6 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="font-pixel text-2xl text-green-400 mb-3">ВОР ОБЕЗВРЕЖЕН!</h1>
          <p className="text-gray-300 text-sm mb-8">Ты защитил свою квартиру. Можно спать спокойно.</p>
          <button onClick={startGame} className="font-pixel bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-lg active:scale-95 transition">ЕЩЁ РАЗ</button>
        </div>
      )}

      {gameState === 'lose' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 px-6 text-center">
          <div className="text-5xl mb-3">💀</div>
          <h1 className="font-pixel text-2xl text-red-500 mb-3">ТЕБЯ ОДОЛЕЛ ВОР</h1>
          <p className="text-gray-300 text-sm mb-8">В следующий раз быстрее добеги до подвала за пистолетом!</p>
          <button onClick={startGame} className="font-pixel bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-lg active:scale-95 transition">ПОПРОБОВАТЬ СНОВА</button>
        </div>
      )}
    </div>
  );
}