/**
 * Synthesized combat sound effects via the Web Audio API — no external
 * audio assets are fetched (self-contained, consistent with the fonts
 * decision in docs/DESIGN.md, and avoids autoplay/licensing/asset-size
 * concerns entirely). Every sound is a short procedural tone/sweep.
 *
 * Wrapped defensively: browsers gate audio behind a user gesture and some
 * environments (headless test runners, restrictive WebViews) may not
 * support it at all. A sound that fails to play should never break combat.
 */

let audioCtx = null;

function getContext() {
  if (audioCtx) return audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

function tone(ctx, { freq, duration, type = 'sine', gain = 0.15, delay = 0, freqEnd = null }) {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  const startAt = ctx.currentTime + delay;
  osc.frequency.setValueAtTime(freq, startAt);
  if (freqEnd !== null) {
    osc.frequency.linearRampToValueAtTime(freqEnd, startAt + duration);
  }
  gainNode.gain.setValueAtTime(gain, startAt);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
}

const SOUNDS = {
  hit: (ctx) => tone(ctx, { freq: 160, freqEnd: 90, duration: 0.12, type: 'square', gain: 0.16 }),
  crit: (ctx) => {
    tone(ctx, { freq: 220, freqEnd: 110, duration: 0.14, type: 'sawtooth', gain: 0.18 });
    tone(ctx, { freq: 320, freqEnd: 160, duration: 0.1, type: 'square', gain: 0.12, delay: 0.05 });
  },
  heal: (ctx) => tone(ctx, { freq: 440, freqEnd: 660, duration: 0.28, type: 'sine', gain: 0.13 }),
  buff: (ctx) => {
    tone(ctx, { freq: 392, duration: 0.09, type: 'triangle', gain: 0.12 });
    tone(ctx, { freq: 523, duration: 0.14, type: 'triangle', gain: 0.12, delay: 0.09 });
  },
  fleeSuccess: (ctx) => tone(ctx, { freq: 500, freqEnd: 250, duration: 0.2, type: 'sine', gain: 0.12 }),
  fleeFail: (ctx) => tone(ctx, { freq: 140, freqEnd: 100, duration: 0.22, type: 'square', gain: 0.14 }),
  ambush: (ctx) => tone(ctx, { freq: 500, freqEnd: 80, duration: 0.18, type: 'sawtooth', gain: 0.18 }),
  victory: (ctx) => {
    tone(ctx, { freq: 392, duration: 0.12, type: 'triangle', gain: 0.14 });
    tone(ctx, { freq: 494, duration: 0.12, type: 'triangle', gain: 0.14, delay: 0.12 });
    tone(ctx, { freq: 587, duration: 0.22, type: 'triangle', gain: 0.16, delay: 0.24 });
  },
  defeat: (ctx) => tone(ctx, { freq: 220, freqEnd: 90, duration: 0.4, type: 'sawtooth', gain: 0.14 }),
};

export function playSound(name) {
  const ctx = getContext();
  const play = SOUNDS[name];
  if (!ctx || !play) return;
  try {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    play(ctx);
  } catch {
    // audio is a nice-to-have; never let it break combat
  }
}
