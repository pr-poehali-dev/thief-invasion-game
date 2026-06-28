const PX = '"Press Start 2P", monospace';

export interface HudState { hp: number; hasGun: boolean; ammo: number; phase: string; }
export interface JoyVis   { show: boolean; bx: number; by: number; kx: number; ky: number; }

const DIALOGS = [
  { who: 'СИСТЕМА',  text: '3:47 НОЧИ. ТЫ ПРОСЫПАЕШЬСЯ ОТ СТРАННОГО ЗВУКА...' },
  { who: 'ИГРОК',   text: '*выглядываешь в коридор*' },
  { who: 'ВОР',     text: '...*крадётся с ломом, не замечает тебя*' },
  { who: 'ИГРОК',   text: 'КТО ТЫ БЛЯТЬ ТАКОЙ?!' },
];

interface Props {
  gameState: string;
  dialogLine: number;
  hud: HudState;
  joyVis: JoyVis;
  isFullscreen: boolean;
  portrait: boolean;
  showEPrompt: boolean;
  showHint: string;
  damageMsg: string;
  onStart: () => void;
  onDialogNext: () => void;
  onRequestFS: () => void;
  onAction: () => void;
}

export default function GameHUD({
  gameState, dialogLine, hud, joyVis,
  isFullscreen, portrait,
  showEPrompt, showHint, damageMsg,
  onStart, onDialogNext, onRequestFS, onAction,
}: Props) {
  return (
    <>
      {/* ══ ИНТРО — ЗАСТАВКА АВТОРА ══ */}
      {gameState === 'intro' && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center"
          style={{ background: '#000', cursor: 'pointer' }}
          onClick={onDialogNext}
          onTouchStart={(e) => { e.preventDefault(); onDialogNext(); }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, #0a0010 0%, #000 100%)' }} />
          {/* пиксельный логотип */}
          <div style={{ position: 'relative', textAlign: 'center' }}>
            <p style={{ fontFamily: PX, fontSize: 8, color: '#442222', letterSpacing: 3, marginBottom: 30 }}>
              ШАМИЛЬКА PRESENTS
            </p>
            <h1 style={{ fontFamily: PX, fontSize: 26, color: '#ee1111', textShadow: '0 0 30px #ff000088, 3px 3px #400', marginBottom: 8, lineHeight: 1.5 }}>
              НОЧНОЙ
            </h1>
            <h1 style={{ fontFamily: PX, fontSize: 26, color: '#ee1111', textShadow: '0 0 30px #ff000088, 3px 3px #400', marginBottom: 32, lineHeight: 1.5 }}>
              ВОР
            </h1>
            <p style={{ fontFamily: PX, fontSize: 7, color: '#555', marginBottom: 8 }}>ПИКСЕЛЬНЫЙ ХОРРОР-ЭКШЕН</p>
            <p style={{ fontFamily: PX, fontSize: 6, color: '#332222', marginBottom: 40 }}>АВТОР: ШАМИЛЬКА · 2025</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 40 }}>
              {['█','█','█'].map((b, i) => (
                <span key={i} style={{ fontFamily: PX, fontSize: 18, color: `hsl(${i * 40},80%,40%)`, animation: `pulse ${0.8 + i * 0.2}s infinite` }}>{b}</span>
              ))}
            </div>
            <p style={{ fontFamily: PX, fontSize: 7, color: '#444', animation: 'pulse 1.1s infinite' }}>ТАП ЧТОБЫ НАЧАТЬ</p>
          </div>
        </div>
      )}

      {/* ══ ДИАЛОГ — НАЧАЛО ИСТОРИИ ══ */}
      {gameState === 'dialog' && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-end justify-end"
          style={{ background: 'linear-gradient(to top, #000000cc 60%, transparent)', cursor: 'pointer', paddingBottom: 40, paddingLeft: 20, paddingRight: 20 }}
          onClick={onDialogNext}
          onTouchStart={(e) => { e.preventDefault(); onDialogNext(); }}
        >
          <div style={{ width: '100%', maxWidth: 520, background: '#0a0a0a', border: '2px solid #442222', borderRadius: 4, padding: '14px 18px', marginBottom: 12 }}>
            <p style={{ fontFamily: PX, fontSize: 8, color: '#884444', marginBottom: 10 }}>
              {DIALOGS[dialogLine]?.who ?? ''}
            </p>
            <p style={{ fontFamily: 'monospace', fontSize: 14, color: '#ddcccc', lineHeight: 1.8 }}>
              {DIALOGS[dialogLine]?.text ?? ''}
            </p>
          </div>
          <p style={{ fontFamily: PX, fontSize: 7, color: '#444', animation: 'pulse 1s infinite' }}>ТАП — ДАЛЕЕ</p>
        </div>
      )}

      {/* ══ ГЛАВНОЕ МЕНЮ ══ */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 px-6 text-center">
          <div className="mb-3" style={{ fontSize: 48 }}>🌙</div>
          <h1 style={{ fontFamily: PX, fontSize: 20, color: '#ee2222', textShadow: '3px 3px #400', marginBottom: 6 }}>НОЧНОЙ ВОР</h1>
          <p style={{ fontFamily: PX, fontSize: 8, color: '#663333', marginBottom: 6 }}>by ШАМИЛЬКА</p>
          <div style={{ border: '2px solid #442222', padding: '12px 18px', marginBottom: 20, maxWidth: 300 }}>
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#cc9988', lineHeight: 1.8, textAlign: 'left' }}>
              🕹️ Лево — джойстик<br />
              👆 Право — прицел / действие<br />
              🔫 Тап справа — выстрел<br />
              ⚡ E / Тап — блок удара из засады<br />
              🔦 Фонарик в ящике стола спальни
            </p>
          </div>
          {!isFullscreen && (
            <button onClick={onRequestFS}
              style={{ fontFamily: PX, fontSize: 8, background: '#223344', color: '#88aacc', border: '2px solid #446688', padding: '9px 16px', marginBottom: 10, cursor: 'pointer', borderRadius: 3 }}>
              ⛶ ПОЛНЫЙ ЭКРАН
            </button>
          )}
          <button onClick={onStart}
            style={{ fontFamily: PX, fontSize: 11, background: '#aa1111', color: '#fff', border: '3px solid #ff4444', padding: '14px 28px', cursor: 'pointer', borderRadius: 4, boxShadow: '0 0 20px #ff222299' }}>
            ▶ ИГРАТЬ
          </button>
        </div>
      )}

      {/* ══ ИГРОВОЙ HUD ══ */}
      {gameState === 'play' && (
        <>
          {/* HP */}
          <div style={{ position: 'absolute', top: 10, left: 12, zIndex: 20, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>❤️</span>
              <div style={{ width: 100, height: 11, background: '#220000', border: '2px solid #660000', borderRadius: 2 }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg,#cc2222,#ff4444)', width: `${hud.hp}%`, transition: 'width 0.2s', borderRadius: 1 }} />
              </div>
            </div>
            <div style={{ fontFamily: PX, fontSize: 7, color: '#ffcc00', marginBottom: 2 }}>
              {hud.hasGun ? `🔫 ${hud.ammo} патр.` : '🔍 НАЙДИ ПИСТОЛЕТ'}
            </div>
            {hud.phase === 'hunt' && (
              <div style={{ fontFamily: PX, fontSize: 7, color: '#ff8800', animation: 'pulse 0.8s infinite' }}>
                🔦 НАЙДИ ФОНАРИК!
              </div>
            )}
          </div>

          {/* fullscreen кнопка */}
          {!isFullscreen && (
            <button onClick={onRequestFS} style={{ position: 'absolute', top: 10, right: 12, zIndex: 20, fontFamily: PX, fontSize: 8, background: '#11223388', color: '#6699bb', border: '1px solid #33557766', padding: '6px 10px', borderRadius: 3, cursor: 'pointer' }}>⛶</button>
          )}

          {/* Кнопка действия справа */}
          <div
            onClick={onAction}
            onTouchStart={(e) => { e.preventDefault(); onAction(); }}
            style={{ position: 'absolute', bottom: 28, right: 22, zIndex: 20,
              width: 74, height: 74, borderRadius: '50%',
              border: '2.5px solid #ffd60a88', background: '#ffd60a14',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span style={{ fontFamily: PX, fontSize: 7, color: '#ffd60a', textAlign: 'center', lineHeight: 1.5 }}>
              {hud.hasGun ? 'ОГОНЬ' : 'ВЗЯТЬ'}
            </span>
          </div>

          {/* Кнопка E — блок из засады */}
          {showEPrompt && (
            <div
              onClick={onAction}
              onTouchStart={(e) => { e.preventDefault(); onAction(); }}
              style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'all' }}>
              <div style={{ fontFamily: PX, fontSize: 22, color: '#ffee00', background: '#000000cc',
                border: '4px solid #ffee00', borderRadius: 8, padding: '18px 32px',
                textShadow: '0 0 20px #ffee00', animation: 'pulse 0.3s infinite', cursor: 'pointer' }}>
                E
              </div>
            </div>
          )}

          {/* Сообщение об уроне */}
          {damageMsg && (
            <div style={{ position: 'absolute', top: '38%', left: 0, right: 0, textAlign: 'center', zIndex: 25, pointerEvents: 'none' }}>
              <span style={{ fontFamily: PX, fontSize: 13, color: '#ff2222', textShadow: '0 0 16px #ff0000', animation: 'pulse 0.4s infinite' }}>
                {damageMsg}
              </span>
            </div>
          )}

          {/* Подсказка */}
          {showHint && (
            <div style={{ position: 'absolute', bottom: 120, left: 0, right: 0, textAlign: 'center', zIndex: 25, pointerEvents: 'none' }}>
              <span style={{ fontFamily: PX, fontSize: 9, color: '#ffcc44', background: '#000000aa', padding: '6px 14px', borderRadius: 4 }}>
                {showHint}
              </span>
            </div>
          )}

          {/* Джойстик */}
          {joyVis.show && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', width: 104, height: 104, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.05)', left: joyVis.bx - 52, top: joyVis.by - 52 }} />
              <div style={{ position: 'absolute', width: 46, height: 46, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.22)', left: joyVis.kx - 23, top: joyVis.ky - 23 }} />
            </div>
          )}
        </>
      )}

      {/* Поверни телефон */}
      {portrait && gameState === 'play' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: '#000000ee', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📱↔️</div>
          <p style={{ fontFamily: PX, fontSize: 10, color: '#ffcc44', textAlign: 'center', lineHeight: 2 }}>ПОВЕРНИ ТЕЛЕФОН<br />ГОРИЗОНТАЛЬНО</p>
        </div>
      )}

      {/* ══ ПОБЕДА ══ */}
      {gameState === 'win' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/92 px-6 text-center">
          {/* мигание полицейского света */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,30,30,0.08), rgba(30,80,255,0.08))', animation: 'pulse 0.5s infinite' }} />
          <div style={{ fontSize: 52, marginBottom: 10, position: 'relative' }}>🚔</div>
          <h1 style={{ fontFamily: PX, fontSize: 15, color: '#4488ff', marginBottom: 8, position: 'relative', textShadow: '0 0 20px #4488ff' }}>
            ПОЛИЦИЯ ПРИЕХАЛА!
          </h1>
          <p style={{ fontFamily: PX, fontSize: 10, color: '#44ee44', marginBottom: 8, position: 'relative' }}>ВОР НЕЙТРАЛИЗОВАН</p>
          <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#aabbaa', marginBottom: 24, lineHeight: 1.9, position: 'relative' }}>
            Ты защитил квартиру.<br />Копы оформляют протокол.<br />Можно спать спокойно.
          </p>
          <button onClick={onStart}
            style={{ fontFamily: PX, fontSize: 9, background: '#112244', color: '#88aaff', border: '2px solid #4488ff', padding: '14px 24px', cursor: 'pointer', borderRadius: 4, position: 'relative' }}>
            ИГРАТЬ СНОВА
          </button>
        </div>
      )}

      {/* ══ ПОРАЖЕНИЕ ══ */}
      {gameState === 'lose' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center"
          style={{ background: 'radial-gradient(ellipse at center, #2a0000 0%, #000 100%)' }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>💀</div>
          <h1 style={{ fontFamily: PX, fontSize: 12, color: '#cc1111', marginBottom: 10, lineHeight: 1.8, textShadow: '0 0 20px #ff0000' }}>
            ОН ИЗБИЛ ТЕБЯ.
          </h1>
          <h2 style={{ fontFamily: PX, fontSize: 9, color: '#881111', marginBottom: 20, lineHeight: 1.8 }}>
            ТЫ БОЛЬШЕ НЕ ПРОСНЁШЬСЯ.
          </h2>
          <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#884444', marginBottom: 28, lineHeight: 1.9 }}>
            Вор скрылся в темноте.<br />Никто не успел помочь.
          </p>
          <button onClick={onStart}
            style={{ fontFamily: PX, fontSize: 9, background: '#330000', color: '#ff6666', border: '2px solid #aa2222', padding: '14px 24px', cursor: 'pointer', borderRadius: 4, boxShadow: '0 0 14px #aa000066' }}>
            ПОПРОБОВАТЬ СНОВА
          </button>
        </div>
      )}
    </>
  );
}
