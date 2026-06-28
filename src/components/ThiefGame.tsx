import { useEffect, useRef, useState, useCallback } from 'react';
import {
  TILE, MAP_W, MAP_H, PLAYER_R, THIEF_R,
  isWall, bfsPath,
  Entity, Blood, Bullet, Wound,
  DamageStage, GamePhase,
} from './game/constants';
import { SFX } from './game/audio';
import { render as renderFrame } from './game/renderer';
import GameHUD, { HudState, JoyVis } from './GameHUD';

// HIDE-SPOTS — тайники вора при побеге
const HIDE_SPOTS = [
  { x: 10, y: 9 }, { x: 20, y: 7 }, { x: 8, y: 13 }, { x: 29, y: 3 }, { x: 22, y: 15 },
];

export default function ThiefGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  type GS = 'intro' | 'dialog' | 'menu' | 'play' | 'win' | 'lose';
  const [gameState, setGameState] = useState<GS>('intro');
  const [dialogLine, setDialogLine] = useState(0);
  const [hud, setHud]         = useState<HudState>({ hp: 100, hasGun: false, ammo: 0, phase: 'normal' });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [portrait, setPortrait]         = useState(window.innerHeight > window.innerWidth);
  const [joyVis,   setJoyVis]           = useState<JoyVis>({ show: false, bx: 0, by: 0, kx: 0, ky: 0 });
  const [showEPrompt, setShowEPrompt]   = useState(false);
  const [showHint, setShowHint]         = useState('');
  const [damageMsg, setDamageMsg]       = useState('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stateRef  = useRef<any>(null);
  const joyRef    = useRef({ active: false, baseX: 0, baseY: 0, dx: 0, dy: 0, id: -1 });
  const aimRef    = useRef({ x: 0, y: 0, spread: 18 });
  const rafRef    = useRef<number>(0);
  const stepTimer = useRef(0);
  const bfsTimer  = useRef(0);
  const bfsPath_  = useRef<{ x: number; y: number }[]>([]);
  const ePromptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      } catch { /**/ }
    } catch { /**/ }
  }, []);

  useEffect(() => {
    const onFS = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFS);
    return () => document.removeEventListener('fullscreenchange', onFS);
  }, []);
  useEffect(() => {
    const fn = () => setPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // ─── Инициализация игры ──────────────────────────────────────────────────
  function initGame() {
    const player: Entity = { x: 2.5 * TILE, y: 2.5 * TILE, vx: 0, vy: 0, dir: 0, walkFrame: 0, walkTimer: 0, hp: 100 };
    const thief:  Entity = { x: 30 * TILE,  y: 16 * TILE,  vx: 0, vy: 0, dir: 3, walkFrame: 0, walkTimer: 0, hp: 100 };
    // центр укрытия — в темноте
    const spot = HIDE_SPOTS[Math.floor(Math.random() * HIDE_SPOTS.length)];
    stateRef.current = {
      player, thief,
      bloods: [] as Blood[],
      wounds: [] as Wound[],
      gunPos:          { x: 28 * TILE, y: 2.5 * TILE },
      ammoPos:         { x: 11 * TILE, y: 9.5 * TILE },
      switchPos:       { x: 16.5 * TILE, y: 16.5 * TILE },
      flashlightPos:   { x: 5.5 * TILE, y: 1.5 * TILE }, // в ящике стола спальни
      hasGun: false, ammo: 6, extraAmmo: true,
      hasFlashlight: false,
      lightsOff: false,
      thiefHit: 0,
      thiefState: 'breaking',
      breakTimer: 220,
      crowbarTimer: 0,
      cam: { x: 0, y: 0 },
      shake: 0, muzzle: 0,
      bullets: [] as Bullet[],
      damageStage: 0 as DamageStage,
      phase: 'normal' as GamePhase,
      hideSpot: spot,
      ambushCooldown: 0,
      policeActive: false,
      policeFlash: 0,
      aimX: 0, aimY: 0, aimSpread: 18,
    };
    bfsPath_.current = [];
    bfsTimer.current = 0;
    aimRef.current = { x: 0, y: 0, spread: 18 };
  }

  function startGame() {
    initGame();
    setGameState('play');
    setHud({ hp: 100, hasGun: false, ammo: 6, phase: 'normal' });
    setDamageMsg('');
    setShowHint('');
  }

  // ─── Игровой цикл ────────────────────────────────────────────────────────
  useEffect(() => {
    if (gameState !== 'play') return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    let last = performance.now(), acc = 0;
    const STEP = 1000 / 60;
    const loop = (now: number) => {
      rafRef.current = requestAnimationFrame(loop);
      let dt = now - last; last = now;
      if (dt > 50) dt = 50;
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < 3) { update(); acc -= STEP; steps++; }
      const s = stateRef.current;
      if (s) {
        s.aimX = aimRef.current.x; s.aimY = aimRef.current.y; s.aimSpread = aimRef.current.spread;
        renderFrame(ctx, canvas, s);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current; if (!c) return;
      c.width = window.innerWidth; c.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [gameState]);

  // ─── Физика движения ─────────────────────────────────────────────────────
  function moveEntity(e: Entity, nx: number, ny: number, r: number) {
    const corners = (px: number, py: number) => [
      [px - r, py - r], [px + r, py - r], [px - r, py + r], [px + r, py + r],
    ];
    const testX = e.x + nx;
    let bX = false;
    for (const [cx, cy] of corners(testX, e.y)) if (isWall(Math.floor(cx/TILE), Math.floor(cy/TILE))) bX = true;
    if (!bX) e.x = testX;
    const testY = e.y + ny;
    let bY = false;
    for (const [cx, cy] of corners(e.x, testY)) if (isWall(Math.floor(cx/TILE), Math.floor(cy/TILE))) bY = true;
    if (!bY) e.y = testY;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function spawnBlood(s: any, x: number, y: number, amount: number) {
    for (let i = 0; i < amount; i++) {
      const a = Math.random() * Math.PI * 2, sp = Math.random() * 2.5 + 0.5;
      s.bloods.push({ x, y, life: 80 + Math.random() * 40, size: 2 + Math.random() * 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
    }
  }

  function update() {
    const s = stateRef.current;
    if (!s) return;
    const { player, thief } = s;
    const speed = s.damageStage >= 3 ? 1.6 : 2.5;

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

    // прицел дрейфует к центру
    const cw = canvasRef.current!.width, ch = canvasRef.current!.height;
    const aimCX = cw / 2, aimCY = ch / 2;
    if (aimRef.current.x === 0 && aimRef.current.y === 0) {
      aimRef.current.x = aimCX; aimRef.current.y = aimCY;
    }
    // разброс медленно уменьшается
    aimRef.current.spread = Math.max(6, aimRef.current.spread - 0.15);

    // ─── ИИ вора ─────────────────────────────────────────────────────────
    if (s.thiefState === 'breaking') {
      s.breakTimer--; s.crowbarTimer++;
      if (s.crowbarTimer % 25 === 0) { s.shake = 7; SFX.crowbar(); }
      if (s.breakTimer <= 0) s.thiefState = 'chase';

    } else if (s.thiefState === 'chase') {
      // BFS pathfinding — пересчёт каждые 45 тиков
      bfsTimer.current++;
      if (bfsTimer.current >= 45) {
        bfsTimer.current = 0;
        const tx = Math.floor(thief.x / TILE), ty2 = Math.floor(thief.y / TILE);
        const px = Math.floor(player.x / TILE), py = Math.floor(player.y / TILE);
        bfsPath_.current = bfsPath(tx, ty2, px, py);
      }
      // движение по пути
      const path = bfsPath_.current;
      if (path.length > 1) {
        const next = path[1];
        const nx = next.x * TILE + TILE / 2 - thief.x;
        const ny = next.y * TILE + TILE / 2 - thief.y;
        const dist = Math.hypot(nx, ny);
        const tspeed = 1.75;
        if (dist > 2) {
          moveEntity(thief, (nx / dist) * tspeed, (ny / dist) * tspeed, THIEF_R);
          if (dist < 6) bfsPath_.current = path.slice(1); // продвигаемся по пути
        }
        thief.walkTimer++;
        if (thief.walkTimer > 7) { thief.walkFrame = (thief.walkFrame + 1) % 4; thief.walkTimer = 0; }
        if (Math.abs(nx) > Math.abs(ny)) thief.dir = nx > 0 ? 2 : 1;
        else thief.dir = ny > 0 ? 0 : 3;
      }

      // атака ломом
      s.thiefHit = Math.max(0, s.thiefHit - 1);
      const dist = Math.hypot(player.x - thief.x, player.y - thief.y);
      if (dist < 34 && s.thiefHit === 0) {
        s.thiefHit = 58;
        s.damageStage = Math.min(4, s.damageStage + 1) as DamageStage;
        s.shake = 10;
        spawnBlood(s, player.x, player.y, 14);
        SFX.hit();
        player.hp -= 20;
        // сообщения по стадиям
        const msgs = ['', 'БОЛЬНО!', 'ТЕМНЕЕТ В ГЛАЗАХ...', 'ИДТИ ТЯЖЕЛО...', ''];
        if (msgs[s.damageStage]) setDamageMsg(msgs[s.damageStage]);
        setHud((h) => ({ ...h, hp: Math.max(0, player.hp) }));
        if (s.damageStage >= 4 || player.hp <= 0) {
          player.hp = 0;
          setGameState('lose');
          SFX.defeat();
        }
      }

      // переход в фазу охоты при низком HP вора
      if (thief.hp <= 35 && s.phase === 'normal') {
        s.phase = 'hunt' as GamePhase;
        s.thiefState = 'hide';
        s.lightsOff = true;
        // вор убегает в тайник
        bfsTimer.current = 0;
        const hs = s.hideSpot;
        bfsPath_.current = bfsPath(Math.floor(thief.x / TILE), Math.floor(thief.y / TILE), hs.x, hs.y);
        setHud((h) => ({ ...h, phase: 'hunt' }));
        setShowHint('ВОР СКРЫЛСЯ! НАЙДИ ФОНАРИК В СТОЛЕ СПАЛЬНИ');
        setTimeout(() => setShowHint(''), 4000);
      }

    } else if (s.thiefState === 'hide') {
      // вор ползёт к тайнику
      bfsTimer.current++;
      if (bfsTimer.current >= 60) {
        bfsTimer.current = 0;
        const hs = s.hideSpot;
        bfsPath_.current = bfsPath(Math.floor(thief.x / TILE), Math.floor(thief.y / TILE), hs.x, hs.y);
      }
      const path = bfsPath_.current;
      if (path.length > 1) {
        const next = path[1];
        const nx = next.x * TILE + TILE / 2 - thief.x;
        const ny = next.y * TILE + TILE / 2 - thief.y;
        const dist = Math.hypot(nx, ny);
        if (dist > 2) {
          moveEntity(thief, (nx / dist) * 1.2, (ny / dist) * 1.2, THIEF_R);
          if (dist < 6) bfsPath_.current = path.slice(1);
        }
        thief.walkTimer++;
        if (thief.walkTimer > 10) { thief.walkFrame = (thief.walkFrame + 1) % 4; thief.walkTimer = 0; }
      }

      // засада: если игрок близко — вор выскакивает
      const distToPlayer = Math.hypot(player.x - thief.x, player.y - thief.y);
      s.ambushCooldown = Math.max(0, s.ambushCooldown - 1);
      if (distToPlayer < 50 && s.ambushCooldown === 0) {
        // показать кнопку E
        SFX.ambush();
        s.ambushCooldown = 200;
        setShowEPrompt(true);
        if (ePromptTimer.current) clearTimeout(ePromptTimer.current);
        ePromptTimer.current = setTimeout(() => {
          setShowEPrompt(false);
          // если не нажал — удар
          const cur = stateRef.current;
          if (cur && cur.thiefState === 'hide') {
            cur.damageStage = Math.min(4, cur.damageStage + 2) as DamageStage;
            cur.player.hp -= 40;
            cur.shake = 12;
            spawnBlood(cur, cur.player.x, cur.player.y, 20);
            SFX.stunned();
            setHud((h) => ({ ...h, hp: Math.max(0, cur.player.hp) }));
            setShowHint('ДОЛБАЁБ, НА Е НАЖИМАТЬ НАДО!');
            setTimeout(() => setShowHint(''), 3000);
            if (cur.damageStage >= 4 || cur.player.hp <= 0) {
              cur.player.hp = 0;
              setGameState('lose');
              SFX.defeat();
            }
          }
        }, 900); // 0.9 сек на реакцию
      }
    }

    // пули
    for (const b of s.bullets) {
      b.x += b.vx; b.y += b.vy; b.life--;
      if (isWall(Math.floor(b.x / TILE), Math.floor(b.y / TILE))) b.life = 0;
      const distBT = Math.hypot(b.x - thief.x, b.y - thief.y);
      const hitR = b.headshot ? 8 : 18;
      if ((s.thiefState === 'chase' || s.thiefState === 'hide') && distBT < hitR) {
        b.life = 0;
        const dmg = b.headshot ? 50 : 34;
        thief.hp = Math.max(0, thief.hp - dmg);
        s.wounds.push({ x: thief.x + (Math.random() - 0.5) * 10, y: thief.y + (Math.random() - 0.5) * 14 });
        spawnBlood(s, thief.x, thief.y, b.headshot ? 22 : 14);
        s.shake = b.headshot ? 8 : 5;
        SFX.groan();
        if (thief.hp <= 0) {
          // победа — полиция приезжает
          s.policeActive = true;
          s.thiefState = 'dead';
          s.phase = 'normal' as GamePhase;
          s.lightsOff = false;
          setHud((h) => ({ ...h, phase: 'normal' }));
          let flash = 0;
          const sirenInterval = setInterval(() => {
            SFX.siren(); flash++;
            if (stateRef.current) stateRef.current.policeFlash = flash;
            if (flash > 14) { clearInterval(sirenInterval); setGameState('win'); }
          }, 400);
        }
      }
    }
    s.bullets = s.bullets.filter((b: Bullet) => b.life > 0);

    // кровь
    for (const bl of s.bloods) { bl.x += bl.vx; bl.y += bl.vy; bl.vx *= 0.88; bl.vy *= 0.88; bl.life--; }
    s.bloods = s.bloods.filter((b: Blood) => b.life > 0);

    if (s.shake > 0) s.shake *= 0.82;
    if (s.muzzle > 0) s.muzzle--;
    if (s.policeActive) s.policeFlash++;

    // камера
    s.cam.x = player.x - cw / 2;
    s.cam.y = player.y - ch / 2;
    s.cam.x = Math.max(0, Math.min(MAP_W * TILE - cw, s.cam.x));
    s.cam.y = Math.max(0, Math.min(MAP_H * TILE - ch, s.cam.y));
  }

  // ─── Тач-управление ──────────────────────────────────────────────────────
  const [joyVis2, setJoyVis2] = useState<JoyVis>({ show: false, bx: 0, by: 0, kx: 0, ky: 0 });

  function onTouchStart(e: React.TouchEvent) {
    e.preventDefault();
    const half = window.innerWidth / 2;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.clientX < half) {
        if (!joyRef.current.active) {
          joyRef.current = { active: true, baseX: t.clientX, baseY: t.clientY, dx: 0, dy: 0, id: t.identifier };
          setJoyVis({ show: true, bx: t.clientX, by: t.clientY, kx: t.clientX, ky: t.clientY });
          setJoyVis2({ show: true, bx: t.clientX, by: t.clientY, kx: t.clientX, ky: t.clientY });
        }
      } else {
        handleAction(t.clientX, t.clientY);
      }
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyRef.current.id) {
        let dx = t.clientX - joyRef.current.baseX, dy = t.clientY - joyRef.current.baseY;
        const len = Math.hypot(dx, dy);
        if (len > 52) { dx = dx / len * 52; dy = dy / len * 52; }
        joyRef.current.dx = dx; joyRef.current.dy = dy;
        const upd = { show: true, bx: joyRef.current.baseX, by: joyRef.current.baseY, kx: joyRef.current.baseX + dx, ky: joyRef.current.baseY + dy };
        setJoyVis(upd); setJoyVis2(upd);
      } else {
        // правая рука — прицел
        const half = window.innerWidth / 2;
        if (t.clientX > half) {
          aimRef.current.x = t.clientX;
          aimRef.current.y = t.clientY;
        }
      }
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyRef.current.id) {
        joyRef.current = { active: false, baseX: 0, baseY: 0, dx: 0, dy: 0, id: -1 };
        const upd = { show: false, bx: 0, by: 0, kx: 0, ky: 0 };
        setJoyVis(upd); setJoyVis2(upd);
      }
    }
  }

  function handleAction(tapX = 0, tapY = 0) {
    const s = stateRef.current; if (!s) return;
    const p = s.player;

    // кнопка E — блок удара из засады
    if (showEPrompt) {
      if (ePromptTimer.current) clearTimeout(ePromptTimer.current);
      setShowEPrompt(false);
      SFX.block();
      setShowHint('ЗАБЛОКИРОВАЛ!');
      setTimeout(() => setShowHint(''), 1500);
      return;
    }

    if (!s.hasGun && Math.hypot(p.x - s.gunPos.x, p.y - s.gunPos.y) < 44) {
      s.hasGun = true; SFX.pickup();
      setHud((h) => ({ ...h, hasGun: true, ammo: 6 })); return;
    }
    if (s.extraAmmo && Math.hypot(p.x - s.ammoPos.x, p.y - s.ammoPos.y) < 44) {
      s.ammo = Math.min(s.ammo + 6, 12); s.extraAmmo = false; SFX.extra_ammo();
      setHud((h) => ({ ...h, ammo: s.ammo })); return;
    }
    if (!s.hasFlashlight && Math.hypot(p.x - s.flashlightPos.x, p.y - s.flashlightPos.y) < 44) {
      s.hasFlashlight = true; SFX.flashlight();
      setShowHint('ФОНАРИК НАЙДЕН!');
      setTimeout(() => setShowHint(''), 2000); return;
    }
    if (Math.hypot(p.x - s.switchPos.x, p.y - s.switchPos.y) < 44) {
      s.lightsOff = !s.lightsOff; SFX.switch(); return;
    }
    // выстрел — прицел с разбросом
    if (s.hasGun && s.ammo > 0 && s.thiefState !== 'breaking') {
      s.ammo--; s.muzzle = 6; s.shake = 5; SFX.bang();
      aimRef.current.spread = Math.min(35, aimRef.current.spread + 12); // отдача

      // направление от прицела (или от направления игрока если нет aim)
      const cam = s.cam;
      let bvx: number, bvy: number;
      let headshot = false;
      if (tapX !== 0 || tapY !== 0) {
        // мировые координаты прицела
        const wx = tapX + cam.x, wy = tapY + cam.y;
        const spread = aimRef.current.spread;
        const angle = Math.atan2(wy - p.y, wx - p.x);
        const jitter = ((Math.random() - 0.5) * spread * 0.025);
        bvx = Math.cos(angle + jitter) * 10;
        bvy = Math.sin(angle + jitter) * 10;
        // хедшот: прицел близко к голове вора
        const thf = s.thief;
        if (Math.hypot(wx - thf.x, wy - (thf.y - 15)) < 12) headshot = true;
      } else {
        const dm: Record<number, { x: number; y: number }> = { 0: {x:0,y:1}, 1:{x:-1,y:0}, 2:{x:1,y:0}, 3:{x:0,y:-1} };
        const d = dm[p.dir];
        bvx = d.x * 10; bvy = d.y * 10;
      }
      s.bullets.push({ x: p.x, y: p.y, vx: bvx, vy: bvy, life: 70, headshot });
      if (headshot) { setShowHint('ХЕДШОТ!'); setTimeout(() => setShowHint(''), 1200); }
      setHud((h) => ({ ...h, ammo: s.ammo }));
    }
  }

  // Клавиша E на клавиатуре
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'e' || e.key === 'E') && gameState === 'play') handleAction();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, showEPrompt]);

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
      <GameHUD
        gameState={gameState}
        dialogLine={dialogLine}
        hud={hud}
        joyVis={joyVis2}
        isFullscreen={isFullscreen}
        portrait={portrait}
        showEPrompt={showEPrompt}
        showHint={showHint}
        damageMsg={damageMsg}
        onStart={startGame}
        onDialogNext={() => {
          if (dialogLine < 3) setDialogLine((l) => l + 1);
          else { setDialogLine(0); startGame(); }
        }}
        onRequestFS={requestFS}
        onAction={() => handleAction()}
      />
    </div>
  );
}
