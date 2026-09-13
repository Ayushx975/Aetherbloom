// Sound-ready feedback hooks. Tiny WebAudio synth, zero assets.
// AudioContext is created lazily on first user gesture (completion clicks
// qualify), so autoplay policies are respected. Mute persists in localStorage.

let ctx = null;

function ac() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function isSoundOn() {
  try {
    return localStorage.getItem("pp_sound") !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on) {
  try {
    localStorage.setItem("pp_sound", on ? "on" : "off");
  } catch {}
}

function tone(freq, delay, dur, type = "sine", vol = 0.05) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function playReward() {
  if (!isSoundOn()) return;
  try {
    tone(660, 0, 0.18);
    tone(990, 0.09, 0.24);
  } catch {}
}

export function playLevelUp() {
  if (!isSoundOn()) return;
  try {
    tone(523, 0, 0.16);
    tone(659, 0.1, 0.16);
    tone(784, 0.2, 0.2);
    tone(1047, 0.3, 0.34);
  } catch {}
}
