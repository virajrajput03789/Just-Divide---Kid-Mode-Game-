/**
 * A lightweight, dependency-free Web Audio API synthesizer for the "Just Divide" game.
 */

let audioCtx = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const createOscillator = (freq, type, startTime, duration, volume = 0.1) => {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
};

export const playPop = () => {
  initAudio();
  const now = audioCtx.currentTime;
  createOscillator(600, 'sine', now, 0.1, 0.2);
  createOscillator(1200, 'sine', now, 0.05, 0.1);
};

export const playMerge = (score) => {
  initAudio();
  const now = audioCtx.currentTime;
  const baseFreq = 400 + Math.min(score * 10, 800);
  
  // Chime effect: multiple oscillators for a richer sound
  createOscillator(baseFreq, 'sine', now, 0.4, 0.2);
  createOscillator(baseFreq * 1.5, 'sine', now + 0.05, 0.3, 0.1);
  createOscillator(baseFreq * 2, 'sine', now + 0.1, 0.2, 0.05);
};

export const playError = () => {
  initAudio();
  const now = audioCtx.currentTime;
  createOscillator(150, 'square', now, 0.2, 0.1);
};

export const playLevelUp = () => {
  initAudio();
  const now = audioCtx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    createOscillator(freq, 'triangle', now + (i * 0.1), 0.5, 0.1);
  });
};

export const playTrash = () => {
  initAudio();
  const now = audioCtx.currentTime;
  // Noise-like effect using frequency sweep
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.3);
};
