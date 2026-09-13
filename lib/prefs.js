// Device preferences (localStorage). Per-device choices, not account data:
// 3D quality, chamber effects, sound and display name live where they fit best.
export function getQuality() {
  try {
    const v = localStorage.getItem("pp_quality");
    return v === "high" || v === "low" || v === "auto" ? v : "auto";
  } catch {
    return "auto";
  }
}

export function setQuality(q) {
  try {
    localStorage.setItem("pp_quality", q);
  } catch {}
}

// auto → full scene on capable desktops, simplified on small/reduced-motion screens.
export function resolveDense(quality, small, reduced) {
  if (quality === "low") return false;
  if (quality === "high") return true;
  return !small && !reduced;
}
