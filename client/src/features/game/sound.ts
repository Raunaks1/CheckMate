export type SoundName = 'move' | 'capture' | 'check' | 'castle' | 'end' | 'lowTime';

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  audio: AudioContext,
  freq: number,
  startAt: number,
  dur: number,
  type: OscillatorType,
  gainValue: number
): void {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.02);
}

export function playSound(name: SoundName, enabled: boolean): void {
  if (!enabled) return;
  const audio = ensureCtx();
  if (!audio) return;
  try {
    const t = audio.currentTime;
    switch (name) {
      case 'move':
        tone(audio, 520, t, 0.08, 'sine', 0.18);
        break;
      case 'capture':
        tone(audio, 300, t, 0.09, 'triangle', 0.22);
        tone(audio, 180, t + 0.05, 0.1, 'triangle', 0.2);
        break;
      case 'check':
        tone(audio, 880, t, 0.09, 'sine', 0.2);
        tone(audio, 880, t + 0.11, 0.12, 'sine', 0.2);
        break;
      case 'castle':
        tone(audio, 440, t, 0.07, 'sine', 0.16);
        tone(audio, 560, t + 0.06, 0.07, 'sine', 0.16);
        tone(audio, 680, t + 0.12, 0.1, 'sine', 0.16);
        break;
      case 'end':
        tone(audio, 392, t, 0.14, 'sine', 0.2);
        tone(audio, 494, t + 0.12, 0.14, 'sine', 0.2);
        tone(audio, 587, t + 0.24, 0.22, 'sine', 0.2);
        break;
      case 'lowTime':
        tone(audio, 1050, t, 0.05, 'square', 0.06);
        break;
    }
  } catch {
    // Audio must never break the game
  }
}
