// AETHERBLOOM - Core game math (must match README + video explanation)
// Non-linear leveling: each next level needs more XP than last.

export function xpForLevel(level) {
  // Level 1 -> 100, Level 2 -> ~282, Level 3 -> ~519 ... non-linear
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function rankForLevel(level) {
  if (level >= 10) return { rank: "Everbloom", color: "#F4D06F" };
  if (level === 9) return { rank: "Sanctuary", color: "#F6B75F" };
  if (level >= 7) return { rank: "Grove", color: "#A98BE8" };
  if (level >= 5) return { rank: "Bloom", color: "#8FA8F8" };
  if (level >= 3) return { rank: "Sprout", color: "#2CBFA3" };
  return { rank: "Seed", color: "#93A0B4" };
}

// Mission difficulty -> Power (XP) + Coins reward
export const DIFFICULTY = {
  E: { xp: 20, coins: 10, label: "E-Rank" },
  D: { xp: 40, coins: 20, label: "D-Rank" },
  C: { xp: 80, coins: 40, label: "C-Rank" },
  B: { xp: 150, coins: 80, label: "B-Rank" },
  S: { xp: 300, coins: 160, label: "S-Rank" },
};

// Task category -> trained attribute
export const ATTRIBUTE_MAP = {
  Coding: "INT",
  Study: "INT",
  Reading: "CRT",
  Work: "DIS",
  Gym: "STR",
  Run: "HLT",
  Meditation: "DIS",
  Social: "SOC",
  Other: "INT",
};

// Normalize legacy 5-stat profiles to the current 6-attribute system.
export function normalizeAttributes(attrs) {
  const a = attrs || {};
  const num = (v) => (Number.isFinite(+v) && +v > 0 ? Math.floor(+v) : 1);
  return {
    STR: num(a.STR),
    INT: num(a.INT),
    DIS: Math.max(num(a.DIS), num(a.FOC), num(a.WILL)),
    HLT: Math.max(num(a.HLT), num(a.AGI)),
    CRT: num(a.CRT),
    SOC: num(a.SOC),
  };
}

// Normalize stored profiles across versions (attributes + coins key).
export function normalizeProfile(p) {
  if (!p) return p;
  const out = { ...p };
  let attrs = out.attributes;
  if (typeof attrs === "string") {
    try {
      attrs = JSON.parse(attrs);
    } catch {
      attrs = {};
    }
  }
  out.attributes = normalizeAttributes(attrs);
  if (out.coins === undefined && out.credits !== undefined) out.coins = out.credits;
  if (out.coins === undefined) out.coins = 0;
  delete out.credits;
  if (!Array.isArray(out.owned_items)) out.owned_items = [];
  return out;
}

// Derived quest status (stored status stays 'active' | 'done').
export function questStatus(m, today = todayStr()) {
  if (!m || m.status === "done") return "completed";
  if (m.due_date) {
    if (m.due_date < today) return "overdue";
    if (m.due_date > today) return "scheduled";
  }
  return "active";
}

export const ATTRIBUTES = ["STR", "INT", "DIS", "HLT", "CRT", "SOC"];

export const ATTRIBUTE_NAMES = {
  STR: "Strength",
  INT: "Intellect",
  DIS: "Discipline",
  HLT: "Health",
  CRT: "Creativity",
  SOC: "Social",
};

// Apply mission completion to profile. Returns { profile, leveledUp, levelsGained }
export function applyMissionReward(profile, difficulty) {
  const reward = DIFFICULTY[difficulty] || DIFFICULTY.E;
  let { level, xp, coins, streak } = profile;
  xp += reward.xp;
  coins += reward.coins;

  let levelsGained = 0;
  // Handle multiple level-ups in one go
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
    levelsGained += 1;
    coins += 50 * level; // rank-up bonus
  }

  return {
    profile: { ...profile, level, xp, coins },
    leveledUp: levelsGained > 0,
    levelsGained,
    reward,
  };
}

// Streak logic: consecutive days of activity.
// lastActiveDate: 'YYYY-MM-DD' or null. today: 'YYYY-MM-DD'
export function updateStreak(lastActiveDate, todayStr) {
  if (!lastActiveDate) return { streak: 1, penalized: false, lastActiveDate: todayStr };
  if (lastActiveDate === todayStr) return { streak: null, penalized: false, lastActiveDate }; // no change, already active today

  const last = new Date(lastActiveDate + "T00:00:00");
  const today = new Date(todayStr + "T00:00:00");
  const diffDays = Math.round((today - last) / 86400000);

  if (diffDays === 1) {
    return { streak: "increment", penalized: false, lastActiveDate: todayStr };
  }
  // Missed 1+ days -> the streak wilts (resets)
  return { streak: "reset", penalized: true, lastActiveDate: todayStr };
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Shop items (Power Vault). Owned items stored as array of ids.
// rarity drives preview treatment + sort order. unlockLevel gates purchase.
export const RARITY_ORDER = { common: 0, rare: 1, epic: 2, legendary: 3 };
export const SHOP_ITEMS = [
  { id: "title-iron", name: "Dawnkeeper", type: "Title", price: 150, rarity: "common", unlockLevel: 1, icon: "crown", desc: "A title for steady early risers." },
  { id: "aura-blue", name: "Sunpetal Aura", type: "Aura", price: 100, rarity: "rare", unlockLevel: 1, icon: "sparkles", desc: "Warm petals drift around your avatar." },
  { id: "frame-gold", name: "Gilded Frame", type: "Frame", price: 200, rarity: "rare", unlockLevel: 2, icon: "frame", desc: "A sunlit frame for your avatar." },
  { id: "theme-crimson", name: "Ember Dusk", type: "Theme", price: 250, rarity: "epic", unlockLevel: 3, icon: "palette", desc: "A warm dusk mood for the atlas." },
  { id: "aura-shadow", name: "Moonmoth Aura", type: "Aura", price: 300, rarity: "epic", unlockLevel: 4, icon: "ghost", desc: "Pale moth-light follows your avatar." },
  { id: "title-monarch", name: "Everbloom Warden", type: "Title", price: 500, rarity: "legendary", unlockLevel: 5, icon: "crown", desc: "The highest honor of the atlas." },
];

export function defaultProfile(userId) {
  return {
    user_id: userId,
    level: 1,
    xp: 0,
    coins: 50, // starter coins so shop demo works in video
    streak: 0,
    last_active_date: null,
    attributes: { STR: 1, INT: 1, DIS: 1, HLT: 1, CRT: 1, SOC: 1 },
    owned_items: [],
    active_title: null,
    active_aura: null,
    active_theme: null,
  };
}

// Attributes -> trainable hero skills. Skill level always equals the attribute value.
export const SKILLS = [
  { attr: "STR", name: "Stoneform", desc: "Trained by Gym quests." },
  { attr: "HLT", name: "Vital Surge", desc: "Trained by Run quests." },
  { attr: "INT", name: "Star Chart", desc: "Trained by Coding quests." },
  { attr: "DIS", name: "Ironroot", desc: "Trained by Work and Meditation." },
  { attr: "CRT", name: "Wildbloom", desc: "Trained by Reading quests." },
  { attr: "SOC", name: "Kindred Call", desc: "Trained by Social quests." },
];

// Rank ladder for progress display: minimum level per rank.
export const RANK_LADDER = [
  { minLevel: 1, rank: "Seed" },
  { minLevel: 3, rank: "Sprout" },
  { minLevel: 5, rank: "Bloom" },
  { minLevel: 7, rank: "Grove" },
  { minLevel: 9, rank: "Sanctuary" },
  { minLevel: 10, rank: "Everbloom" },
];

// Achievements are derived from existing data (no schema change).
// Each test receives (profile, missions) and returns true when unlocked.
export const ACHIEVEMENTS = [
  { id: "first-steps", name: "First Bloom", desc: "Complete your first quest.", icon: "flag", test: (p, m) => m.some((x) => x.status === "done") },
  { id: "decathlon", name: "Decathlon", desc: "Complete 10 missions.", icon: "medal", test: (p, m) => m.filter((x) => x.status === "done").length >= 10 },
  { id: "streak-3", name: "Consistent", desc: "Reach a 3-day streak.", icon: "flame", test: (p) => (p.streak || 0) >= 3 },
  { id: "streak-7", name: "Unbroken", desc: "Reach a 7-day streak.", icon: "flame", test: (p) => (p.streak || 0) >= 7 },
  { id: "level-5", name: "Rising Hero", desc: "Reach level 5.", icon: "trending", test: (p) => (p.level || 1) >= 5 },
  { id: "level-10", name: "Everbloom Ascendant", desc: "Reach level 10.", icon: "crown", test: (p) => (p.level || 1) >= 10 },
  { id: "scholar", name: "Specialist", desc: "Raise any attribute to 5.", icon: "brain", test: (p) => Math.max(...Object.values(p.attributes || { v: 1 })) >= 5 },
  { id: "big-game", name: "Big Game Hunter", desc: "Complete an S-rank mission.", icon: "swords", test: (p, m) => m.some((x) => x.status === "done" && x.difficulty === "S") },
  { id: "collector", name: "Collector", desc: "Own 3 vault items.", icon: "package", test: (p) => (p.owned_items || []).length >= 3 },
  { id: "fully-geared", name: "Fully Geared", desc: "Own every vault item.", icon: "gem", test: (p) => (p.owned_items || []).length >= SHOP_ITEMS.length },
];

export function evaluateAchievements(profile, missions) {
  if (!profile) return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false }));
  return ACHIEVEMENTS.map((a) => {
    let unlocked = false;
    try { unlocked = Boolean(a.test(profile, missions || [])); } catch { unlocked = false; }
    return { ...a, unlocked };
  });
}

// Recent activity, newest first. Built from mission history only.
export function activityFeed(missions, limit = 8) {
  return (missions || [])
    .slice()
    .sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at))
    .slice(0, limit)
    .map((m) => ({
      id: m.id,
      done: m.status === "done",
      title: m.title,
      time: m.completed_at || m.created_at,
      reward: DIFFICULTY[m.difficulty] || DIFFICULTY.E,
    }));
}

// Shared completion flow used by HQ and Quests pages.
// Returns { profile, reward, leveledUp, levelsGained, attr }.
export function completeMission(profile, mission) {
  const attr = ATTRIBUTE_MAP[mission.category] || "INT";
  const res = applyMissionReward(profile, mission.difficulty);
  const next = {
    ...res.profile,
    attributes: { ...res.profile.attributes, [attr]: (res.profile.attributes?.[attr] || 1) + 1 },
  };
  return { ...res, profile: next, attr };
}

// Display name for UI (Settings → profile). Falls back to the email prefix.
export function displayNameOf(user, profile) {
  const d = profile?.display_name;
  if (typeof d === "string" && d.trim()) return d.trim().slice(0, 40);
  return user?.email?.split("@")[0] || "Player";
}
