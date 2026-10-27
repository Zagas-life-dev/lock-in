"use client";

export const buzz = (p: number | number[] = 12) => {
  try {
    navigator.vibrate?.(p);
  } catch {}
};

let actx: AudioContext | null = null;
export function beep(n = 2) {
  try {
    actx = actx || new (window.AudioContext || (window as any).webkitAudioContext)();
    for (let i = 0; i < n; i++) {
      const o = actx.createOscillator(),
        g = actx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(actx.destination);
      const t = actx.currentTime + i * 0.35;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.start(t);
      o.stop(t + 0.32);
    }
  } catch {}
}
