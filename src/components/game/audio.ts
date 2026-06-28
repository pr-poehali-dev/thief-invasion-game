let audioCtx: AudioContext | null = null;
function getAudio(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}
function playTone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.18): void {
  try {
    const ac = getAudio();
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, ac.currentTime);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.start(); osc.stop(ac.currentTime + dur);
  } catch { /**/ }
}
function playNoise(dur: number, vol = 0.2): void {
  try {
    const ac = getAudio();
    const buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const gain = ac.createGain(); src.connect(gain); gain.connect(ac.destination);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    src.start(); src.stop(ac.currentTime + dur);
  } catch { /**/ }
}

export const SFX = {
  step:        () => playTone(110 + Math.random() * 40, 0.06, 'square', 0.04),
  bang:        () => { playNoise(0.13, 0.45); playTone(75, 0.18, 'sawtooth', 0.35); },
  crowbar:     () => { playNoise(0.2, 0.4); playTone(55, 0.22, 'sawtooth', 0.3); },
  pickup:      () => { playTone(660, 0.08, 'sine', 0.2); playTone(880, 0.12, 'sine', 0.2); },
  groan:       () => { playTone(110, 0.35, 'sawtooth', 0.25); playTone(75, 0.45, 'sawtooth', 0.18); },
  hit:         () => { playNoise(0.1, 0.35); playTone(95, 0.12, 'square', 0.22); },
  switch:      () => { playTone(440, 0.05, 'square', 0.1); playTone(220, 0.07, 'square', 0.1); },
  extra_ammo:  () => { playTone(550, 0.07, 'sine', 0.18); playTone(770, 0.1, 'sine', 0.18); },
  headshot:    () => { playNoise(0.08, 0.5); playTone(60, 0.25, 'sawtooth', 0.4); playTone(200, 0.1, 'square', 0.15); },
  block:       () => { playNoise(0.07, 0.3); playTone(300, 0.08, 'square', 0.2); },
  stunned:     () => { for (let i = 0; i < 4; i++) setTimeout(() => playTone(200 - i*30, 0.15, 'sawtooth', 0.15), i*80); },
  // нагнетающая музыка поражения
  defeat: () => {
    const freqs = [110, 104, 98, 92, 87, 82];
    freqs.forEach((f, i) => {
      setTimeout(() => { playTone(f, 0.6, 'sawtooth', 0.18); playTone(f * 1.5, 0.6, 'square', 0.08); }, i * 400);
    });
    setTimeout(() => playNoise(1.2, 0.25), 2200);
  },
  // сирена полиции
  siren: () => {
    playTone(880, 0.25, 'square', 0.12);
    setTimeout(() => playTone(660, 0.25, 'square', 0.12), 280);
  },
  // вор выскакивает из засады
  ambush: () => { playNoise(0.06, 0.5); playTone(150, 0.2, 'sawtooth', 0.3); },
  // подбор фонарика
  flashlight: () => { playTone(500, 0.05, 'sine', 0.15); playTone(700, 0.05, 'sine', 0.15); playTone(900, 0.1, 'sine', 0.2); },
};
