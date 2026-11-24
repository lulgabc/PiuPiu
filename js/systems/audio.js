import {
  state,
  WORD_EASTER_EGGS,
  SURPRISES,
  IS_IOS,
  TOUCH_DEVICE,
} from "../core/state.js";
import { events } from "../core/events.js";

export const AUDIO_BOOST = TOUCH_DEVICE || IS_IOS ? 1.8 : 1;

function getPets() {
  const g = typeof window !== "undefined" ? window : globalThis;
  return g && g.PiuPets && typeof g.PiuPets === "object" ? g.PiuPets : null;
}

function nowMs() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function ensureAudio() {
  if (state.muted) return null;
  const g = typeof window !== "undefined" ? window : globalThis;
  const Ctx = g ? g.AudioContext || g.webkitAudioContext : null;
  if (!Ctx) return null;
  if (!state.audioCtx) {
    state.audioCtx = new Ctx();
    const master = state.audioCtx.createGain();
    master.gain.value = 1;
    if (typeof state.audioCtx.createDynamicsCompressor === "function") {
      const compressor = state.audioCtx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 24;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.22;
      master.connect(compressor).connect(state.audioCtx.destination);
    } else {
      master.connect(state.audioCtx.destination);
    }
    state.masterGain = master;
  }
  if (state.audioCtx.state === "suspended" && typeof state.audioCtx.resume === "function") {
    state.audioCtx.resume().catch(() => {});
  }
  return state.audioCtx;
}

export const audio = ensureAudio;

export function soundOut(ctx) {
  return state.masterGain || ctx.destination;
}

// Safari infers the iOS audio-session category from the APIs a page uses.
// Declaring it explicitly keeps the microphone and the loudspeaker on the
// same route instead of letting iOS fall back to the quiet receiver route.
export function setAudioSession(type) {
  if (!IS_IOS) return;
  const nav = typeof navigator !== "undefined" ? navigator : null;
  const session = nav && nav.audioSession;
  if (!session) return;
  try {
    if (session.type !== type) session.type = type;
  } catch {}
}

export function tone(freq, duration, type = "sine", volume = 0.04, delay = 0, slideTo = null) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume * AUDIO_BOOST, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(soundOut(ctx));
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

export function noiseBurst(duration = 0.09, volume = 0.03, delay = 0) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 800;
  const gain = ctx.createGain();
  gain.gain.value = volume * AUDIO_BOOST;
  src.connect(filter).connect(gain).connect(soundOut(ctx));
  src.start(ctx.currentTime + delay);
}

export function whoosh(duration = 0.35, from = 300, to = 1800, volume = 0.03) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.1;
  const start = ctx.currentTime;
  filter.frequency.setValueAtTime(from, start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), start + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume * AUDIO_BOOST, start + duration * 0.25);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  src.connect(filter).connect(gain).connect(soundOut(ctx));
  src.start(start);
  src.stop(start + duration + 0.02);
}

export function sequence(freqs, type = "triangle", volume = 0.03, step = 0.08, delay = 0) {
  freqs.forEach((freq, index) => {
    tone(freq, step * 1.6, type, volume, delay + index * step);
  });
}

export function sparkleNotes(delay = 0, volume = 0.018) {
  sequence([1046.5, 1318.5, 1568, 2093], "sine", volume, 0.055, delay);
}

export function thump(delay = 0, volume = 0.035) {
  tone(132, 0.13, "sine", volume, delay, 55);
  noiseBurst(0.045, volume * 0.45, delay);
}

export function playPop() {
  noiseBurst(0.14, 0.035);
  tone(180, 0.18, "sine", 0.055, 0, 62);
  tone(920, 0.09, "triangle", 0.025, 0.01, 1500);
  tone(1560, 0.07, "sine", 0.012, 0.04, 2100);
}

export function playMiss() {
  tone(140, 0.18, "sine", 0.05, 0, 72);
  tone(260, 0.12, "triangle", 0.018, 0.06, 180);
  noiseBurst(0.05, 0.018);
}

export function playCrack() {
  noiseBurst(0.07, 0.03);
  tone(1180, 0.035, "square", 0.022);
  tone(520, 0.06, "square", 0.02, 0.05);
}

export function playFly() {
  whoosh(0.38, 260, 2200, 0.035);
  tone(520, 0.28, "sine", 0.022, 0, 1240);
}

export function playDrop() {
  tone(620, 0.3, "sine", 0.04, 0, 110);
  tone(170, 0.12, "triangle", 0.03, 0.24);
  whoosh(0.22, 800, 200, 0.02);
}

export function playSpin() {
  tone(660, 0.09, "triangle", 0.028);
  tone(880, 0.09, "triangle", 0.028, 0.07);
  tone(1320, 0.12, "triangle", 0.03, 0.14);
  tone(1760, 0.16, "sine", 0.02, 0.22);
}

export function playEffect(effect) {
  if (effect === "crack") playCrack();
  else if (effect === "fly") playFly();
  else if (effect === "drop") playDrop();
  else if (effect === "spin") playSpin();
  else playPop();
}

export function playRewardClear() {
  whoosh(0.55, 160, 3200, 0.045);
  thump(0.02, 0.035);
  tone(523.25, 0.12, "triangle", 0.035, 0.02);
  tone(783.99, 0.13, "triangle", 0.035, 0.12);
  tone(1046.5, 0.16, "triangle", 0.032, 0.24);
  tone(1567.98, 0.3, "sine", 0.025, 0.38);
  sparkleNotes(0.46, 0.018);
  noiseBurst(0.22, 0.025, 0.12);
}

export function playLevel() {
  sequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.03, 0.075);
  thump(0.01, 0.028);
}

export function playOver() {
  tone(392, 0.18, "triangle", 0.04);
  tone(330, 0.2, "sawtooth", 0.018, 0.12, 270);
  tone(294, 0.22, "triangle", 0.04, 0.16);
  tone(196, 0.42, "sine", 0.05, 0.34, 140);
  noiseBurst(0.3, 0.015, 0.02);
}

export function playPoemLine() {
  tone(660, 0.16, "sine", 0.03);
  tone(990, 0.2, "triangle", 0.02, 0.05);
  sparkleNotes(0.09, 0.011);
}

export function playPoemFinish() {
  sequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.035, 0.12);
  sparkleNotes(0.24, 0.02);
}

export function playStart() {
  sequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.028, 0.085);
  tone(1568, 0.22, "sine", 0.014, 0.28);
}

export function playPause() {
  sequence([523.25, 440, 349.23], "triangle", 0.024, 0.075);
}

export function playResume() {
  sequence([349.23, 440, 523.25, 659.25], "triangle", 0.024, 0.07);
}

export function playBubble() {
  [380, 540, 760].forEach((freq, index) => {
    tone(freq, 0.09, "sine", 0.018, index * 0.045, freq * 1.45);
  });
}

export function playBoing() {
  tone(170, 0.2, "sine", 0.04, 0, 680);
  tone(680, 0.16, "triangle", 0.018, 0.13, 210);
}

export function playSqueak() {
  tone(880, 0.07, "square", 0.018, 0, 1500);
  tone(1250, 0.06, "square", 0.016, 0.08, 1900);
}

export function playPetVoice(id) {
  const Pets = getPets();
  const def = Pets && typeof Pets.byId === "function" ? Pets.byId(id) : null;
  const voice = def && def.voice;
  if (!voice || !Array.isArray(voice.notes) || !voice.notes.length) {
    playSqueak();
    return;
  }
  const wave = voice.wave || "sine";
  const gain = Number.isFinite(voice.gain) ? voice.gain : 0.02;
  const dur = Number.isFinite(voice.dur) ? voice.dur : 0.08;
  const step = Number.isFinite(voice.step) ? voice.step : 0.07;
  const slide = Number.isFinite(voice.slide) ? voice.slide : 1;
  voice.notes.forEach((frequency, index) => {
    const note = Math.max(60, Math.min(2200, frequency));
    tone(note, dur, wave, gain, index * step, Math.max(60, Math.round(note * slide)));
  });
  if (voice.noise) noiseBurst(voice.noise, gain * 0.5);
}

export function playPetStep() {
  const now = nowMs();
  if (now - (state.lastPetStep || 0) < 190) return;
  state.lastPetStep = now;
  tone(155, 0.045, "triangle", 0.006, 0, 105);
}

export function playPetLand() {
  const now = nowMs();
  if (now - (state.lastPetLand || 0) < 220) return;
  state.lastPetLand = now;
  tone(92, 0.075, "sine", 0.016, 0, 56);
  noiseBurst(0.028, 0.004);
}

export function playPetPurr() {
  const now = nowMs();
  if (now - (state.lastPetPurr || 0) < 900) return;
  state.lastPetPurr = now;
  tone(86, 0.3, "sine", 0.018, 0, 72);
  tone(72, 0.34, "sine", 0.014, 0.2, 62);
}

export function playSlide() {
  tone(280, 0.38, "sine", 0.025, 0, 1500);
  tone(1500, 0.28, "sine", 0.018, 0.34, 320);
}

export function playKazoo() {
  tone(310, 0.18, "sawtooth", 0.018, 0, 330);
  tone(330, 0.16, "sawtooth", 0.016, 0.18, 300);
  tone(300, 0.2, "sawtooth", 0.014, 0.36, 260);
}

export function playRobot() {
  sequence([440, 660, 880, 660, 440], "square", 0.018, 0.055);
}

export function playRocket() {
  whoosh(0.45, 180, 2600, 0.028);
  tone(240, 0.4, "sawtooth", 0.018, 0, 1200);
}

export function playDragon() {
  noiseBurst(0.28, 0.02);
  tone(120, 0.35, "sawtooth", 0.025, 0, 55);
  tone(70, 0.3, "square", 0.018, 0.1, 45);
}

export function playCoin() {
  tone(1046.5, 0.07, "square", 0.02);
  tone(1568, 0.18, "triangle", 0.025, 0.07);
}

export function playGhost() {
  tone(500, 0.3, "sine", 0.02, 0, 180);
  tone(360, 0.32, "triangle", 0.016, 0.1, 120);
}

export function playCat() {
  tone(640, 0.12, "triangle", 0.02, 0, 1100);
  tone(980, 0.18, "triangle", 0.018, 0.12, 560);
}

export function playDog() {
  noiseBurst(0.04, 0.015);
  tone(190, 0.09, "square", 0.022);
  tone(145, 0.1, "square", 0.018, 0.12);
}

export function playSparkle() {
  sparkleNotes(0, 0.018);
  tone(2637, 0.2, "sine", 0.012, 0.2);
}

export function playMystery() {
  sequence([392, 466.16, 554.37, 659.25], "sine", 0.018, 0.09);
  tone(784, 0.3, "sine", 0.014, 0.36, 523.25);
}

export function playFanfare() {
  sequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.03, 0.08);
  thump(0.02, 0.028);
}

export function playGolden() {
  playFanfare();
  playCoin();
  sparkleNotes(0.22, 0.014);
}

export function playCombo(combo) {
  const notes = combo >= 10 ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99];
  sequence(notes, "triangle", 0.026, 0.06);
  thump(0, 0.022);
}

export function playSecret() {
  sequence([523.25, 659.25, 783.99, 1046.5, 1318.5, 1568], "sine", 0.022, 0.055);
  noiseBurst(0.18, 0.015, 0.1);
}

export function playMeteorLaunch() {
  whoosh(0.5, 180, 2400, 0.05);
  tone(220, 0.3, "sawtooth", 0.02, 0, 880);
  noiseBurst(0.12, 0.02);
}

export function playMeteorHit(bounces) {
  tone(420 + bounces * 70, 0.075, "square", 0.022);
  noiseBurst(0.03, 0.01);
}

export function playMeteorSweep(count) {
  tone(660 + Math.min(count, 8) * 70, 0.075, "triangle", 0.026);
  noiseBurst(0.035, 0.012);
}

export function playMeteorFinish() {
  whoosh(0.45, 2200, 280, 0.03);
  thump(0.01, 0.05);
  sequence([523.25, 659.25, 783.99, 1046.5], "triangle", 0.032, 0.065);
  sparkleNotes(0.22, 0.02);
  noiseBurst(0.32, 0.028, 0.04);
}

export function playPaintShot() {
  whoosh(0.2, 700, 2600, 0.038);
  tone(280, 0.14, "triangle", 0.03, 0, 760);
  noiseBurst(0.04, 0.012);
}

export function playPaintSplat() {
  noiseBurst(0.2, 0.05);
  thump(0.012, 0.045);
  tone(620, 0.07, "square", 0.018, 0.01, 220);
  tone(180, 0.22, "sine", 0.03, 0.02, 70);
}

export function playNamedSound(name) {
  if (name === "boing") playBoing();
  else if (name === "squeak") playSqueak();
  else if (name === "slide") playSlide();
  else if (name === "kazoo") playKazoo();
  else if (name === "bubble") playBubble();
  else if (name === "robot") playRobot();
  else if (name === "rocket") playRocket();
  else if (name === "dragon") playDragon();
  else if (name === "coin") playCoin();
  else if (name === "ghost") playGhost();
  else if (name === "cat") playCat();
  else if (name === "dog") playDog();
  else if (name === "sparkle") playSparkle();
  else if (name === "mystery") playMystery();
  else if (name === "fanfare") playFanfare();
  else if (name === "secret") playSecret();
}

export function playWordEasterEgg(word, cx, cy) {
  const key = word ? String(word).toLowerCase() : "";
  const entry = key && Object.hasOwn(WORD_EASTER_EGGS, key) ? WORD_EASTER_EGGS[key] : null;
  if (!entry) return false;
  playNamedSound(entry[0]);
  events.emit("fx:emojiBurst", { emoji: entry[1], cx, cy });
  return true;
}

export function maybeSurprise(cx, cy) {
  const now = nowMs();
  if (now - state.lastSurpriseAt < 7000) return false;
  if (Math.random() > 0.12) return false;
  state.lastSurpriseAt = now;
  const [sound, emoji] = SURPRISES[Math.floor(Math.random() * SURPRISES.length)];
  playNamedSound(sound);
  events.emit("fx:emojiBurst", { emoji, cx, cy });
  return true;
}
