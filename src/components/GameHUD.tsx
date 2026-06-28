import { STORY_ACTS } from './game/constants';

const PX = '"Press Start 2P", monospace';

// ─── ТИПЫ ────────────────────────────────────────────────────────────────────
export interface HudState { hp: number; hasGun: boolean; ammo: number; act: number; }
export interface JoyVis   { show: boolean; bx: number; by: number; kx: number; ky: number; }

interface Props {
  gameState: 'menu' | 'story' | 'play' | 'win' | 'lose';
  hud: HudState;
  joyVis: JoyVis;
  storyAct: number;
  storyLine: number;
  isFullscreen: boolean;
  portrait: boolean;
  currentAct: number;
  onStartAct: (act: number) => void;
  onAdvanceStory: () => void;
  onRequestFS: () => void;
}

export default function GameHUD({
  gameState, hud, joyVis, storyAct, storyLine,
  isFullscreen, portrait, currentAct,
  onStartAct, onAdvanceStory, onRequestFS,
}: Props) {
  return (
    <>
      {/* ── МЕНЮ ── */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 px-6 text-center">
          <div className="mb-3" style={{ fontSize: 52 }}>🌙</div>
          <h1 style={{ fontFamily: PX, fontSize: 22, color: '#ee2222', textShadow: '3px 3px #400', marginBottom: 6 }}>
            НОЧНОЙ ВОР
          </h1>
          <p style={{ fontFamily: PX, fontSize: 9, color: '#aa7777', marginBottom: 20, lineHeight: 1.8 }}>
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
              onClick={onRequestFS}
              style={{ fontFamily: PX, fontSize: 9, background: '#223344', color: '#88aacc', border: '2px solid #446688', padding: '10px 18px', marginBottom: 12, cursor: 'pointer', borderRadius: 4 }}
            >
              ⛶ ПОЛНЫЙ ЭКРАН
            </button>
          )}
          <button
            onClick={() => onStartAct(1)}
            style={{ fontFamily: PX, fontSize: 11, background: '#aa1111', color: '#fff', border: '3px solid #ff4444', padding: '14px 28px', cursor: 'pointer', borderRadius: 4, boxShadow: '0 0 18px #ff222288' }}
          >
            ▶ ИГРАТЬ
          </button>
        </div>
      )}

      {/* ── СЮЖЕТНЫЙ ЭКРАН ── */}
      {gameState === 'story' && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black px-8"
          onClick={onAdvanceStory}
          onTouchStart={(e) => { e.preventDefault(); onAdvanceStory(); }}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #1a0a0a 0%, #000 100%)' }} />
          <div style={{ position: 'relative', maxWidth: 400, textAlign: 'center' }}>
            <p style={{ fontFamily: PX, fontSize: 9, color: '#884444', marginBottom: 18, letterSpacing: 2 }}>
              {STORY_ACTS[storyAct].title}
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: 14, color: '#ddccbb', lineHeight: 1.9, minHeight: 60 }}>
              {STORY_ACTS[storyAct].lines[storyLine]}
            </p>
            <p style={{ fontFamily: PX, fontSize: 7, color: '#555', marginTop: 32, animation: 'pulse 1.2s infinite' }}>
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
                <div style={{ height: '100%', background: 'linear-gradient(90deg, #cc2222, #ff4444)', width: `${hud.hp}%`, transition: 'width 0.2s', borderRadius: 1 }} />
              </div>
            </div>
            <div style={{ fontFamily: PX, fontSize: 8, color: '#ffcc00' }}>
              {hud.hasGun ? `🔫 ${hud.ammo} патр.` : '🔍 НАЙДИ ПИСТОЛЕТ'}
            </div>
            <div style={{ fontFamily: PX, fontSize: 7, color: '#886644', marginTop: 3 }}>
              АКТ {hud.act}/3
            </div>
          </div>

          {/* Кнопка действия (правая зона) */}
          <div style={{
            position: 'absolute', bottom: 28, right: 22, zIndex: 20, pointerEvents: 'none',
            width: 72, height: 72, borderRadius: '50%',
            border: '2.5px solid #ffd60a88', background: '#ffd60a18',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: PX, fontSize: 8, color: '#ffd60a', textAlign: 'center', lineHeight: 1.4 }}>
              {hud.hasGun ? 'ОГОНЬ' : 'ВЗЯТЬ'}
            </span>
          </div>

          {/* Джойстик */}
          {joyVis.show && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
              <div style={{
                position: 'absolute', width: 104, height: 104, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)',
                left: joyVis.bx - 52, top: joyVis.by - 52,
              }} />
              <div style={{
                position: 'absolute', width: 46, height: 46, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.25)',
                left: joyVis.kx - 23, top: joyVis.ky - 23,
              }} />
            </div>
          )}

          {/* Fullscreen кнопка */}
          {!isFullscreen && (
            <button
              onClick={onRequestFS}
              style={{
                position: 'absolute', top: 10, right: 12, zIndex: 20,
                fontFamily: PX, fontSize: 8,
                background: '#11223388', color: '#6699bb', border: '1px solid #33557788',
                padding: '6px 10px', borderRadius: 3, cursor: 'pointer',
              }}
            >
              ⛶
            </button>
          )}
        </>
      )}

      {/* Предупреждение о портретном режиме */}
      {portrait && gameState === 'play' && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50, background: '#000000ee',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📱↔️</div>
          <p style={{ fontFamily: PX, fontSize: 10, color: '#ffcc44', textAlign: 'center', lineHeight: 2 }}>
            ПОВЕРНИ ТЕЛЕФОН<br />ГОРИЗОНТАЛЬНО
          </p>
        </div>
      )}

      {/* ── ПОБЕДА ── */}
      {gameState === 'win' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 px-6 text-center">
          <div style={{ fontSize: 52, marginBottom: 10 }}>🏆</div>
          <h1 style={{ fontFamily: PX, fontSize: 16, color: '#44ee44', marginBottom: 10 }}>
            ВОР ПОБЕЖДЁН!
          </h1>
          <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#aabbaa', marginBottom: 24, lineHeight: 1.8 }}>
            Ты прошёл все 3 акта и защитил свой дом.<br />Квартира в безопасности. До утра!
          </p>
          <button
            onClick={() => onStartAct(1)}
            style={{ fontFamily: PX, fontSize: 10, background: '#115511', color: '#aaffaa', border: '2px solid #44cc44', padding: '14px 24px', cursor: 'pointer', borderRadius: 4 }}
          >
            ИГРАТЬ СНОВА
          </button>
        </div>
      )}

      {/* ── ПОРАЖЕНИЕ ── */}
      {gameState === 'lose' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/92 px-6 text-center">
          <div style={{ fontSize: 52, marginBottom: 10 }}>💀</div>
          <h1 style={{ fontFamily: PX, fontSize: 16, color: '#ee2222', marginBottom: 10 }}>
            ТЫ ПОЙМАН
          </h1>
          <p style={{ fontFamily: 'monospace', fontSize: 13, color: '#bb8888', marginBottom: 24, lineHeight: 1.8 }}>
            Вор добрался до тебя.<br />Беги быстрее к пистолету в следующий раз!
          </p>
          <button
            onClick={() => onStartAct(currentAct)}
            style={{ fontFamily: PX, fontSize: 10, background: '#551111', color: '#ffaaaa', border: '2px solid #cc4444', padding: '14px 24px', cursor: 'pointer', borderRadius: 4 }}
          >
            ПОВТОРИТЬ АКТ
          </button>
        </div>
      )}
    </>
  );
}
