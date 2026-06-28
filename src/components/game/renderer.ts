import { TILE, MAP, MAP_W, MAP_H, Blood, Bullet, Wound, Entity, DamageStage, GamePhase } from './constants';

// ─── СПРАЙТ ИГРОКА ───────────────────────────────────────────────────────────
export function drawBoy(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  dir: number, frame: number,
  stage: DamageStage
): void {
  const bob = (frame === 1 || frame === 3) ? 1 : 0;
  const limp = stage >= 3 ? (frame % 2 === 0 ? 4 : 0) : 0;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y) + limp);
  const ls = frame === 1 ? 3 : frame === 3 ? -3 : 0;
  ctx.fillStyle = '#2b3a67'; ctx.fillRect(-7 + ls, 9, 5, 9); ctx.fillRect(2 - ls, 9, 5, 9);
  ctx.fillStyle = stage >= 2 ? '#3a6a80' : '#4cc9f0'; ctx.fillRect(-9, -6 + bob, 18, 17);
  ctx.fillStyle = '#38a6cc'; ctx.fillRect(-12, -4 + bob, 4, 11); ctx.fillRect(8, -4 + bob, 4, 11);
  ctx.fillStyle = '#ffcc99'; ctx.fillRect(-8, -18 + bob, 16, 14);
  ctx.fillStyle = '#5a3210'; ctx.fillRect(-8, -18 + bob, 16, 5); ctx.fillRect(-8, -18 + bob, 4, 9); ctx.fillRect(4, -18 + bob, 4, 9);
  ctx.fillStyle = '#000';
  if (dir === 0) { ctx.fillRect(-4, -11 + bob, 2, 2); ctx.fillRect(2, -11 + bob, 2, 2); }
  else if (dir === 1) ctx.fillRect(-6, -11 + bob, 2, 2);
  else if (dir === 2) ctx.fillRect(4, -11 + bob, 2, 2);
  if (stage >= 1) { ctx.fillStyle = 'rgba(80,0,80,0.55)'; ctx.fillRect(-6, -14 + bob, 5, 3); }
  if (stage >= 2) { ctx.fillStyle = 'rgba(120,0,0,0.5)'; ctx.fillRect(1, -12 + bob, 4, 4); }
  if (stage >= 3) { ctx.fillStyle = '#cc0000'; ctx.fillRect(-5, -10 + bob, 2, 6); ctx.fillRect(2, -9 + bob, 1, 4); }
  ctx.restore();
}

// ─── СПРАЙТ ВОРА ─────────────────────────────────────────────────────────────
export function drawThief(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  dir: number, frame: number,
  attacking: boolean,
  wounds: Wound[],
  thiefHp: number
): void {
  const bob = (frame === 1 || frame === 3) ? 1 : 0;
  const limp = thiefHp < 50 ? (frame % 2 === 0 ? 3 : 0) : 0;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y) + limp);
  const ls = frame === 1 ? 3 : frame === 3 ? -3 : 0;
  ctx.fillStyle = '#111'; ctx.fillRect(-7 + ls, 9, 5, 10); ctx.fillRect(2 - ls, 9, 5, 10);
  ctx.fillStyle = thiefHp < 35 ? '#4a1010' : '#2d2d2d'; ctx.fillRect(-10, -6 + bob, 20, 17);
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(-13, -4 + bob, 4, 12); ctx.fillRect(9, -4 + bob, 4, 12);
  ctx.fillStyle = '#888';
  if (attacking) { ctx.fillRect(11, -20 + bob, 5, 26); ctx.fillRect(9, -20 + bob, 12, 5); }
  else { ctx.fillRect(11, -6 + bob, 4, 20); }
  ctx.fillStyle = '#3a3a3a'; ctx.fillRect(-8, -19 + bob, 16, 15);
  ctx.fillStyle = '#a55';    ctx.fillRect(-6, -13 + bob, 12, 5);
  ctx.fillStyle = '#f00';
  if (dir !== 3) { ctx.fillRect(-5, -13 + bob, 3, 3); ctx.fillRect(2, -13 + bob, 3, 3); }
  // дырки от пуль
  for (const w of wounds) {
    const wx = w.x - x, wy = w.y - y;
    if (wx > -14 && wx < 14 && wy > -22 && wy < 22) {
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(wx, wy, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#880000'; ctx.beginPath(); ctx.arc(wx, wy, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(180,0,0,0.7)'; ctx.fillRect(wx - 1, wy + 2, 2, 5);
    }
  }
  ctx.restore();
}

// ─── ПРИЦЕЛ ──────────────────────────────────────────────────────────────────
export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  spread: number
): void {
  const s = Math.round(spread);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,100,0.85)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - s - 8, cy); ctx.lineTo(cx - s, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + s, cy);     ctx.lineTo(cx + s + 8, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - s - 8); ctx.lineTo(cx, cy - s); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy + s);     ctx.lineTo(cx, cy + s + 8); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,100,0.6)';
  ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ─── ИНТЕРФЕЙС СОСТОЯНИЯ ─────────────────────────────────────────────────────
export interface RenderState {
  player: Entity; thief: Entity;
  bloods: Blood[]; bullets: Bullet[]; wounds: Wound[];
  gunPos: { x: number; y: number };
  ammoPos: { x: number; y: number };
  switchPos: { x: number; y: number };
  flashlightPos: { x: number; y: number };
  hasGun: boolean; hasFlashlight: boolean; extraAmmo: boolean; lightsOff: boolean;
  thiefHit: number; thiefState: string;
  muzzle: number; shake: number;
  cam: { x: number; y: number };
  aimX: number; aimY: number; aimSpread: number;
  damageStage: DamageStage;
  phase: GamePhase;
  policeActive: boolean; policeFlash: number;
}

// ─── ГЛАВНЫЙ РЕНДЕР ──────────────────────────────────────────────────────────
export function render(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  s: RenderState
): void {
  const { player, thief, cam } = s;
  ctx.imageSmoothingEnabled = false;
  const shx = s.shake > 0.5 ? (Math.random() - 0.5) * s.shake : 0;
  const shy = s.shake > 0.5 ? (Math.random() - 0.5) * s.shake : 0;

  ctx.save();
  ctx.translate(-Math.round(cam.x) + shx, -Math.round(cam.y) + shy);
  ctx.fillStyle = '#110e1a'; ctx.fillRect(cam.x, cam.y, canvas.width, canvas.height);

  const sx  = Math.max(0, Math.floor(cam.x / TILE));
  const ex  = Math.min(MAP_W, Math.ceil((cam.x + canvas.width) / TILE));
  const sy2 = Math.max(0, Math.floor(cam.y / TILE));
  const ey  = Math.min(MAP_H, Math.ceil((cam.y + canvas.height) / TILE));

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
      } else if (t === 6) {
        // рабочий стол с ПК
        ctx.fillStyle = '#4a3820'; ctx.fillRect(px, py, TILE * 2, TILE);
        ctx.fillStyle = '#2a2a3a'; ctx.fillRect(px + 4, py + 3, TILE - 8, TILE - 10);
        ctx.fillStyle = '#1a8aff'; ctx.fillRect(px + 6, py + 5, TILE - 14, TILE - 16);
        ctx.fillStyle = '#888'; ctx.fillRect(px + TILE - 2, py + TILE - 6, 5, 4);
        ctx.fillStyle = '#aaa';  ctx.fillRect(px + TILE, py + TILE - 5, 2, 2);
      } else {
        const even = (tx + ty) % 2 === 0;
        ctx.fillStyle = even ? '#252030' : '#2a2438'; ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }

  // окно спальни + полицейский свет
  ctx.fillStyle = '#1a2a4a'; ctx.fillRect(3 * TILE, 4, 3 * TILE, 22);
  ctx.fillStyle = '#3a5a9a'; ctx.fillRect(3 * TILE + 3, 6, 3 * TILE - 6, 18);
  ctx.strokeStyle = '#7aaad8'; ctx.lineWidth = 1.5; ctx.strokeRect(3 * TILE + 3, 6, 3 * TILE - 6, 18);
  ctx.fillStyle = '#ffffff22'; ctx.fillRect(3 * TILE + 5, 8, 6, 5);
  if (s.policeActive) {
    const fc = Math.floor(s.policeFlash / 8) % 2 === 0 ? 'rgba(255,30,30,0.5)' : 'rgba(30,80,255,0.5)';
    ctx.fillStyle = fc; ctx.fillRect(3 * TILE + 3, 6, 3 * TILE - 6, 18);
    ctx.fillStyle = fc.replace('0.5', '0.25'); ctx.fillRect(3 * TILE - 20, -15, 3 * TILE + 40, 40);
  }

  // входная дверь
  const doorX = 27 * TILE, doorY = 6 * TILE;
  ctx.fillStyle = s.thiefState === 'breaking' ? '#9a5030' : '#5a3020';
  ctx.fillRect(doorX, doorY, TILE, 8);
  if (s.thiefState === 'breaking') {
    ctx.fillStyle = '#00000088';
    for (let i = 0; i < 5; i++) ctx.fillRect(doorX + 3 + i * 6, doorY + 1, 2, 5);
  }

  // патроны
  if (s.extraAmmo) {
    const a = s.ammoPos;
    const near = Math.hypot(player.x - a.x, player.y - a.y) < 44;
    if (near) { ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2; ctx.strokeRect(a.x - 10, a.y - 8, 20, 16); }
    ctx.fillStyle = '#c8a020';
    ctx.fillRect(a.x - 7, a.y - 4, 4, 8); ctx.fillRect(a.x - 1, a.y - 4, 4, 8); ctx.fillRect(a.x + 5, a.y - 4, 4, 8);
  }

  // фонарик
  if (!s.hasFlashlight) {
    const fl = s.flashlightPos;
    const near = Math.hypot(player.x - fl.x, player.y - fl.y) < 44;
    if (near) { ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2; ctx.strokeRect(fl.x - 10, fl.y - 6, 20, 12); }
    ctx.fillStyle = '#888'; ctx.fillRect(fl.x - 8, fl.y - 3, 16, 6);
    ctx.fillStyle = '#ffee88'; ctx.fillRect(fl.x + 5, fl.y - 3, 4, 6);
    ctx.fillStyle = '#555'; ctx.fillRect(fl.x - 8, fl.y - 3, 5, 6);
  }

  // пистолет
  if (!s.hasGun) {
    const g = s.gunPos;
    const near = Math.hypot(player.x - g.x, player.y - g.y) < 44;
    if (near) { ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2.5; ctx.strokeRect(g.x - 14, g.y - 9, 28, 18); }
    ctx.fillStyle = '#555'; ctx.fillRect(g.x - 10, g.y - 4, 17, 7); ctx.fillRect(g.x - 8, g.y + 3, 6, 7);
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

  // кровь на полу
  for (const bl of s.bloods) {
    ctx.globalAlpha = Math.min(0.9, bl.life / 60);
    ctx.fillStyle = '#990000';
    ctx.fillRect(Math.round(bl.x - bl.size / 2), Math.round(bl.y + 16), Math.round(bl.size), Math.round(bl.size));
  }
  ctx.globalAlpha = 1;

  // вор
  if (s.thiefState !== 'breaking') {
    drawThief(ctx, thief.x, thief.y, thief.dir, thief.walkFrame, s.thiefHit > 35, s.wounds, thief.hp);
  } else {
    ctx.globalAlpha = 0.35;
    drawThief(ctx, doorX + TILE / 2, doorY + TILE, 0, 0, true, [], 100);
    ctx.globalAlpha = 1;
  }

  // игрок
  drawBoy(ctx, player.x, player.y, player.dir, player.walkFrame, s.damageStage);

  // пистолет в руке
  if (s.hasGun) {
    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y));
    const gd = [{ x: 0, y: 8 }, { x: -10, y: 0 }, { x: 10, y: 0 }, { x: 0, y: -10 }][player.dir] ?? { x: 10, y: 0 };
    ctx.fillStyle = '#555'; ctx.fillRect(gd.x - 4, gd.y - 2, 10, 4);
    ctx.fillStyle = '#777'; ctx.fillRect(gd.x + 4, gd.y - 1, 5, 2);
    ctx.restore();
  }

  // вспышка + пули
  if (s.muzzle > 0) {
    ctx.fillStyle = '#ffee66'; ctx.globalAlpha = s.muzzle / 6;
    ctx.beginPath(); ctx.arc(player.x, player.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#ffee44';
  for (const b of s.bullets) ctx.fillRect(b.x - 3, b.y - 3, 6, 6);

  // HP вора
  if (s.thiefState === 'chase' || s.thiefState === 'hide') {
    const hx = thief.x - cam.x + shx, hy = thief.y - cam.y + shy - 30;
    ctx.fillStyle = '#440000'; ctx.fillRect(hx - 20, hy, 40, 5);
    const pct = Math.max(0, thief.hp) / 100;
    ctx.fillStyle = pct > 0.5 ? '#ee2222' : pct > 0.25 ? '#ee8822' : '#aa0000';
    ctx.fillRect(hx - 20, hy, 40 * pct, 5);
  }

  ctx.restore(); // конец мирового transform

  // ─── POST-PROCESS ─────────────────────────────────────────────────────────

  // прицел
  if (s.hasGun) drawCrosshair(ctx, s.aimX, s.aimY, s.aimSpread);

  // темнота фазы охоты
  if (s.phase === 'hunt') {
    const px = player.x - cam.x + shx, py = player.y - cam.y + shy;
    if (s.hasFlashlight) {
      const angle = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][player.dir];
      const fx = px + Math.cos(angle) * 50, fy = py + Math.sin(angle) * 50;
      const g = ctx.createRadialGradient(fx, fy, 12, fx, fy, 210);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.35, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0.97)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      const g = ctx.createRadialGradient(px, py, 0, px, py, 85);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.45, 'rgba(0,0,0,0.72)'); g.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } else if (s.lightsOff) {
    const px = player.x - cam.x, py = player.y - cam.y;
    const g2 = ctx.createRadialGradient(px, py, 35, px, py, 180);
    g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(0.6, 'rgba(0,0,0,0.7)'); g2.addColorStop(1, 'rgba(0,0,0,0.97)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // эффекты урона
  if (s.damageStage >= 1) {
    const intensity = s.damageStage / 4;
    const vign = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.2, canvas.width / 2, canvas.height / 2, canvas.height * 0.8);
    vign.addColorStop(0, 'rgba(120,0,0,0)'); vign.addColorStop(1, `rgba(120,0,0,${intensity * 0.7})`);
    ctx.fillStyle = vign; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (s.damageStage >= 2) {
    ctx.fillStyle = `rgba(0,0,0,${(s.damageStage - 1) * 0.18})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (s.damageStage >= 4) {
    ctx.fillStyle = 'rgba(60,0,0,0.6)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}
