// ─── ВЕБ-АУДИО ───────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getAudio(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.18): void {
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

function playNoise(dur: number, vol = 0.2): void {
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

export const SFX = {
  step:       () => playTone(120 + Math.random() * 40, 0.07, 'square', 0.05),
  bang:       () => { playNoise(0.12, 0.4); playTone(80, 0.15, 'sawtooth', 0.3); },
  crowbar:    () => { playNoise(0.18, 0.35); playTone(60, 0.2, 'sawtooth', 0.25); },
  pickup:     () => { playTone(660, 0.08, 'sine', 0.2); playTone(880, 0.12, 'sine', 0.2); },
  groan:      () => { playTone(120, 0.3, 'sawtooth', 0.22); playTone(80, 0.4, 'sawtooth', 0.15); },
  hit:        () => { playNoise(0.09, 0.3); playTone(100, 0.1, 'square', 0.2); },
  switch:     () => { playTone(440, 0.05, 'square', 0.1); playTone(220, 0.07, 'square', 0.1); },
  extra_ammo: () => { playTone(550, 0.07, 'sine', 0.18); playTone(770, 0.1, 'sine', 0.18); },
};
