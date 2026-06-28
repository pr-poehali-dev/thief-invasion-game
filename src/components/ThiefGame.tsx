import { useEffect, useRef, useState, useCallback } from 'react';

import {
  TILE, MAP_W, MAP_H, PLAYER_R, THIEF_R,
  isWall, STORY_ACTS,
  Entity, Blood, Bullet,
} from './game/constants';
import { SFX } from './game/audio';
import { render as renderFrame } from './game/renderer';
import GameHUD, { HudState, JoyVis } from './GameHUD';

// ─── КОМПОНЕНТ ────────────────────────────────────────────────────────────────
export default function ThiefGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<'menu' | 'story' | 'play' | 'win' | 'lose'>('menu');
  const [storyAct,  setStoryAct]  = useState(0);
  const [storyLine, setStoryLine] = useState(0);
  const [hud,       setHud]       = useState<HudState>({ hp: 100, hasGun: false, ammo: 0, act: 1 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [portrait,     setPortrait]     = useState(window.innerHeight > window.innerWidth);
  const [joyVis,       setJoyVis]       = useState<JoyVis>({ show: false, bx: 0, by: 0, kx: 0, ky: 0 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateRef = useRef<any>(null);
  const joyRef   = useRef({ active: false, baseX: 0, baseY: 0, dx: 0, dy: 0, id: -1 });
  const rafRef   = useRef<number>(0);
  const stepTimer = useRef(0);

  // ─── Fullscreen ──────────────────────────────────────────────────────────
  const requestFS = useCallback(async () => {
    try {
      const el = wrapRef.current ?? document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
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
    const thief:  Entity = { x: 30 * TILE,  y: 16 * TILE,  vx: 0, vy: 0, dir: 3, walkFrame: 0, walkTimer: 0, hp: act === 3 ? 60 : 100 };
    stateRef.current = {
      player, thief,
      bloods: [] as Blood[],
      gunPos:    { x: 28 * TILE,    y: 2.5 * TILE  },
      ammoPos:   { x: 11 * TILE,    y: 9.5 * TILE  },
      switchPos: { x: 16.5 * TILE,  y: 16.5 * TILE },
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
    const ctx    = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    let last = performance.now();
    let acc  = 0;
    const STEP = 1000 / 60;

    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      let dt = now - last; last = now;
      if (dt > 50) dt = 50;
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 3) { update(); acc -= STEP; steps++; }
      renderFrame(ctx, canvas, stateRef.current);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // ─── Resize canvas ───────────────────────────────────────────────────────
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current; if (!c) return;
      c.width  = window.innerWidth;
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
      const a  = Math.random() * Math.PI * 2;
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
      const dx   = player.x - thief.x;
      const dy   = player.y - thief.y;
      const dist = Math.hypot(dx, dy);
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

  // ─── Управление джойстиком ───────────────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    e.preventDefault();
    const half = window.innerWidth / 2;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX < half) {
        if (!joyRef.current.active) {
          joyRef.current = { active: true, baseX: t.clientX, baseY: t.clientY, dx: 0, dy: 0, id: t.identifier };
          setJoyVis({ show: true, bx: t.clientX, by: t.clientY, kx: t.clientX, ky: t.clientY });
        }
      } else {
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
    if (!s.hasGun && Math.hypot(p.x - s.gunPos.x, p.y - s.gunPos.y) < 44) {
      s.hasGun = true; SFX.pickup();
      setHud((h) => ({ ...h, hasGun: true, ammo: 6 })); return;
    }
    if (s.extraAmmo && Math.hypot(p.x - s.ammoPos.x, p.y - s.ammoPos.y) < 44) {
      s.ammo = Math.min(s.ammo + 6, 12); s.extraAmmo = false; SFX.extra_ammo();
      setHud((h) => ({ ...h, ammo: s.ammo })); return;
    }
    if (Math.hypot(p.x - s.switchPos.x, p.y - s.switchPos.y) < 44) {
      s.lightsOff = !s.lightsOff; SFX.switch(); return;
    }
    if (s.hasGun && s.ammo > 0) {
      s.ammo--; s.muzzle = 6; s.shake = 5; SFX.bang();
      const dm: Record<number, { x: number; y: number }> = {
        0: { x: 0, y: 1 }, 1: { x: -1, y: 0 }, 2: { x: 1, y: 0 }, 3: { x: 0, y: -1 },
      };
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
      <canvas
        ref={canvasRef}
        style={{ display: 'block', imageRendering: 'pixelated', width: '100%', height: '100%' }}
      />
      <GameHUD
        gameState={gameState}
        hud={hud}
        joyVis={joyVis}
        storyAct={storyAct}
        storyLine={storyLine}
        isFullscreen={isFullscreen}
        portrait={portrait}
        currentAct={stateRef.current?.act ?? 1}
        onStartAct={startAct}
        onAdvanceStory={advanceStory}
        onRequestFS={requestFS}
      />
    </div>
  );
}
