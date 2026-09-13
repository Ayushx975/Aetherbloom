"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Plus, Flame, Coins, Zap, Trophy, Lock, ChevronRight,
  Target, ListChecks, CircleCheck, TriangleAlert, Volume2, VolumeX, Sparkles, Sparkle,
} from "lucide-react";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import { Card, SectionHead, Progress, Avatar, EmptyState, Dialog, Toast, Skeleton } from "@/components/ui";
import CountUp from "@/components/CountUp";
import RankUpDialog from "@/components/RankUpDialog";
import RadarChart from "@/components/RadarChart";
import { SceneErrorBoundary, ChamberFallback, useSmallScreen, BIOMES, padPosition } from "@/components/three/PowerCoreScene";
import { playReward, playLevelUp, isSoundOn, setSoundOn as persistSound } from "@/lib/sound";
import { getQuality, resolveDense } from "@/lib/prefs";
import { ACHIEVEMENT_ICONS } from "@/components/icons";
import { store } from "@/lib/store";
import {
  xpForLevel, rankForLevel, DIFFICULTY, ATTRIBUTE_MAP,
  ATTRIBUTE_NAMES, SKILLS, SHOP_ITEMS,
  evaluateAchievements, activityFeed, completeMission, questStatus,
  updateStreak, todayStr, defaultProfile, displayNameOf,
} from "@/lib/gameLogic";

const timeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" });

const Chamber = dynamic(
  () => import("@/components/three/PowerCoreScene").then((m) => m.PowerCoreScene),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: 360 }} aria-hidden="true" /> }
);

function motionPrefs() {
  try {
    return {
      fx: localStorage.getItem("pp_fx") !== "off",
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  } catch {
    return { fx: true, reduced: false };
  }
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState(null); // {kind:'levelup'|'penalty', ...}
  const [completing, setCompleting] = useState(null);
  const [pulse, setPulse] = useState(0);
  const [transfer, setTransfer] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [fx, setFx] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [quality, setQualityState] = useState("auto");
  const [soundOn, setSoundOnState] = useState(true);
  const small = useSmallScreen();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  useEffect(() => {
    const p = motionPrefs();
    setFx(p.fx);
    setReduced(p.reduced);
    setSoundOnState(isSoundOn());
    setQualityState(getQuality());
  }, []);

  function toggleFx() {
    setFx((v) => {
      try {
        localStorage.setItem("pp_fx", v ? "off" : "on");
      } catch {}
      return !v;
    });
  }

  function toggleSound() {
    const next = !soundOn;
    persistSound(next);
    setSoundOnState(next);
  }

  useEffect(() => {
    (async () => {
      try {
        const u = await store.getUser();
        if (!u) { router.push("/#start"); return; }
        setUser(u);
        let p = await store.getProfile(u.id);
        if (!p || !p.user_id) p = defaultProfile(u.id);

        const today = todayStr();
        if (p.last_active_date !== today) {
          const s = updateStreak(p.last_active_date, today);
          if (s.streak === "increment") {
            p = { ...p, streak: (p.streak || 0) + 1, last_active_date: today };
            await store.saveProfile(p);
          } else if (s.streak === "reset") {
            p = { ...p, streak: 1, last_active_date: today, coins: Math.max(0, (p.coins || 0) - 20) };
            await store.saveProfile(p);
            try { localStorage.setItem("pp_recovery", today); } catch {}
            setDialog({ kind: "penalty" });
          } else if (s.streak === 1) {
            p = { ...p, streak: 1, last_active_date: today };
            await store.saveProfile(p);
          }
        }
        setProfile(p);
        setMissions(await store.listMissions(u.id));
      } catch (e) {
        setError(e.message || "Could not load your HQ. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function onComplete(m) {
    if (completing) return;
    setCompleting(m.id);
    setError("");
    try {
      const via = await store.apiComplete(m.id);
      let res;
      if (via) {
        // Trusted server result (rewards computed with the service key).
        setMissions((ms) => ms.map((x) => (x.id === m.id ? { ...x, ...via.mission } : x)));
        setProfile(via.profile);
        res = { profile: via.profile, reward: via.reward, leveledUp: via.leveledUp, levelsGained: via.levelsGained, attr: via.attr };
      } else {
        // Direct fallback (demo mode or no service key configured).
        await store.updateMission(m.id, { status: "done", completed_at: new Date().toISOString() });
        setMissions((ms) => ms.map((x) => (x.id === m.id ? { ...x, status: "done", completed_at: new Date().toISOString() } : x)));
        const local = completeMission(profile, m);
        const saved = await store.saveProfile(local.profile);
        setProfile(saved.user_id ? saved : local.profile);
        res = local;
      }
      if (fx && !reduced) {
        const biome = BIOMES.find((x) => x.attr === res.attr);
        setTransfer({ key: Date.now(), from: padPosition(res.attr), color: biome ? biome.color : "#f4d06f" });
      } else {
        setPulse((n) => n + 1);
      }
      if (res.leveledUp) {
        playLevelUp();
        setDialog({ kind: "levelup", level: res.profile.level, reward: res.reward, attr: res.attr });
      } else {
        playReward();
        showToast(`Quest complete — +${res.reward.xp} XP, +${res.reward.coins} Coins, ${res.attr} +1.`);
      }
    } catch (e) {
      setError(e.message || "Could not complete the quest. Try again.");
    } finally {
      setCompleting(null);
    }
  }

  async function onLogout() {
    const { supabase } = await import("@/lib/supabaseClient");
    if (supabase) await supabase.auth.signOut();
    try { localStorage.removeItem("pp_demo_user"); } catch {}
    router.push("/");
  }

  if (loading) {
    return (
      <AppShell active="hq" title="HQ" user={user} profile={profile} missions={missions} onLogout={onLogout}>
        <Skeleton style={{ height: 190 }} />
        <div className="dash" style={{ marginTop: 16 }}>
          <Skeleton style={{ height: 320 }} />
          <Skeleton style={{ height: 320 }} />
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell active="hq" title="HQ" user={user} missions={missions} onLogout={onLogout}>
        <div className="banner warn"><TriangleAlert aria-hidden="true" /><p><strong>HQ unavailable.</strong> {error || "Your profile could not be loaded."}</p></div>
      </AppShell>
    );
  }

  const need = xpForLevel(profile.level);
  const rank = rankForLevel(profile.level);
  const active = missions.filter((m) => m.status === "active");
  const doneToday = missions.filter((m) => m.status === "done").length;
  const dailyTarget = 3;
  const current = active[0] || null;
  const achievements = evaluateAchievements(profile, missions);
  const unlocked = achievements.filter((a) => a.unlocked);
  const nextLocked = achievements.filter((a) => !a.unlocked).slice(0, 2);
  const feed = activityFeed(missions, 5);
  const upcoming = SHOP_ITEMS.filter((i) => !(profile.owned_items || []).includes(i.id))
    .sort((a, b) => a.unlockLevel - b.unlockLevel || a.price - b.price).slice(0, 2);
  const topSkills = SKILLS.map((s) => ({ ...s, level: profile.attributes?.[s.attr] ?? 1 }))
    .sort((a, b) => b.level - a.level).slice(0, 3);
  const heroName = displayNameOf(user, profile);
  const detailMission = detailId ? missions.find((m) => m.id === detailId) || null : null;
  const recoveryMode = (() => {
    try {
      return localStorage.getItem("pp_recovery") === todayStr() && (profile.streak || 0) <= 1;
    } catch {
      return false;
    }
  })();
  const mood = profile.active_theme === "theme-crimson" ? "dusk" : recoveryMode ? "dusk" : (profile.streak || 0) >= 5 ? "day" : "dawn";
  const chamberNodes = active.slice(0, 8).map((m) => {
    const bAttr = ATTRIBUTE_MAP[m.category] || "INT";
    const biome = BIOMES.find((x) => x.attr === bAttr);
    return { id: m.id, title: m.title, difficulty: m.difficulty, color: biome ? biome.color : "#8fa8f8" };
  });
  const biomeCounts = {};
  active.forEach((m) => {
    const a = ATTRIBUTE_MAP[m.category] || "INT";
    biomeCounts[a] = (biomeCounts[a] || 0) + 1;
  });

  return (
    <AppShell active="hq" title="HQ" user={user} profile={profile} missions={missions} onLogout={onLogout}>
      {store.isDemo && (
        <div className="banner warn" role="alert" style={{ marginBottom: 16 }}>
          <TriangleAlert aria-hidden="true" />
          <p><strong>Demo mode.</strong> Connect Supabase before submitting — local-only data is disqualified.</p>
        </div>
      )}
      {error && <p className="field-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}

      {/* Command chamber — live 3D */}
      <Card style={{ marginBottom: 16, overflow: "hidden" }}>
        <div className="row" style={{ justifyContent: "space-between", padding: "14px 20px 0", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow" style={{ marginBottom: 2 }}>Living atlas</p>
            <p className="small muted" style={{ margin: 0 }}>
              {hoverNode
                ? `${hoverNode.difficulty}-rank · ${hoverNode.title} — select to open quests`
                : "Drag to orbit · hover a node to inspect it"}
            </p>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="icon-btn" onClick={toggleFx} aria-pressed={fx} aria-label={fx ? "Reduce chamber effects" : "Enable chamber effects"} title="Chamber effects">
              {fx ? <Sparkles aria-hidden="true" /> : <Sparkle aria-hidden="true" />}
            </button>
            <button className="icon-btn" onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? "Mute reward sounds" : "Unmute reward sounds"} title="Reward sounds">
              {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
            </button>
          </div>
        </div>
        <div style={{ height: small ? 280 : 380, position: "relative" }}>
          <SceneErrorBoundary fallback={<div style={{ height: "100%", padding: 20 }}><ChamberFallback /></div>}>
            {fx ? (
              <Chamber
                level={profile.level}
                progress={profile.xp / need}
                rankColor={rank.color}
                mood={mood}
                nodes={chamberNodes}
                biomeCounts={biomeCounts}
                blooms={doneToday}
                artifacts={unlocked.length}
                pulse={pulse}
                transfer={transfer}
                onTransferDone={() => { setTransfer(null); setPulse((n) => n + 1); }}
                interactive
                reducedMotion={reduced}
                dense={resolveDense(quality, small, reduced)}
                onNodeHover={setHoverNode}
                onNodeSelect={(node) => setDetailId(node.id)}
              />
            ) : (
              <div style={{ height: "100%", padding: 20 }}><ChamberFallback label="Chamber effects off — enable them above" /></div>
            )}
          </SceneErrorBoundary>
        </div>
      </Card>

      {/* Briefing hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: "easeOut" }}>
      <Card className="card-pad" style={{ marginBottom: 16 }}>
        <p className="eyebrow">{dateFmt.format(new Date())} · Daily briefing</p>
        <div className="row" style={{ alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <span className={profile.active_aura === "aura-blue" ? "aura-blue" : profile.active_aura === "aura-shadow" ? "aura-shadow" : undefined}>
            <Avatar name={heroName} size="lg" frameGold={profile.active_aura === "frame-gold"} />
          </span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 className="display" style={{ fontSize: 30, margin: "0 0 4px" }}>{rank.rank}</h1>
            <p className="muted small" style={{ margin: "0 0 12px" }}>
              {heroName}{profile.active_title ? ` · ${profile.active_title}` : ""} · Level {profile.level}
            </p>
            <div className="row small" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <span className="muted"><CountUp value={profile.xp} /> / <span className="num">{need}</span> XP</span>
              <span className="muted"><span className="num">{need - profile.xp}</span> to level {profile.level + 1}</span>
            </div>
            <Progress value={profile.xp} max={need} label="Experience to next level" />
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div><p className="eyebrow" style={{ marginBottom: 2 }}>Streak</p><p className="display num" style={{ fontSize: 22, margin: 0 }}><Flame size={17} aria-hidden="true" style={{ verticalAlign: -3 }} /> <CountUp value={profile.streak} />d</p></div>
            <div><p className="eyebrow" style={{ marginBottom: 2 }}>Coins</p><p className="display num" style={{ fontSize: 22, margin: 0, color: "var(--reward)" }}><Coins size={17} aria-hidden="true" style={{ verticalAlign: -3 }} /> <CountUp value={profile.coins} /></p></div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            {current ? (
              <p className="small" style={{ margin: 0 }}><span className="muted">Current quest: </span><strong>{current.title}</strong> <span className="chip" style={{ marginLeft: 6 }}>{current.difficulty}-rank · +{DIFFICULTY[current.difficulty]?.xp} XP</span></p>
            ) : (
              <p className="small muted" style={{ margin: 0 }}>No active quests. Create one to keep the streak alive.</p>
            )}
          </div>
          <Link href="/quests" className="btn btn-primary"><Play aria-hidden="true" /> Begin today’s quest</Link>
        </div>
      </Card>
      </motion.div>

      <div className="dash">
        <div className="stack">
          {/* Active missions */}
          <Card className="card-pad">
            <SectionHead title="Active quests" action={<Link href="/quests" className="link">Manage all <ChevronRight size={13} aria-hidden="true" style={{ verticalAlign: -2 }} /></Link>} />
            {active.length === 0 ? (
              <EmptyState icon={<Target aria-hidden="true" />} title="Board is clear" body="No active quests. New quests appear here once created." action={<Link href="/quests" className="btn btn-sm"><Plus aria-hidden="true" /> New quest</Link>} />
            ) : (
              <ul className="list-plain">
                <AnimatePresence initial={false}>
                  {active.slice(0, 3).map((m) => (
                    <motion.li key={m.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="check">
                        <input type="checkbox" checked={false} disabled={completing === m.id} onChange={() => onComplete(m)} aria-label={`Complete ${m.title} for ${DIFFICULTY[m.difficulty]?.xp} XP`} />
                        <div className="check-body">
                          <strong>{m.title}</strong>
                          <div className="check-meta">
                            <span className="chip">{m.difficulty}-rank · +{DIFFICULTY[m.difficulty]?.xp} XP</span>
                            <span className="chip">{m.category} → {ATTRIBUTE_MAP[m.category]}</span>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Card>

          {/* Daily progress */}
          <Card className="card-pad">
            <SectionHead title="Daily progress" />
            {recoveryMode && doneToday < dailyTarget && (
              <div className="banner warn" style={{ marginBottom: 12 }}>
                <Flame aria-hidden="true" />
                <p><strong>Recovery mode.</strong> Complete {dailyTarget - doneToday} more quest{dailyTarget - doneToday === 1 ? "" : "s"} today to rebuild the streak.</p>
              </div>
            )}
            <div className="row small" style={{ justifyContent: "space-between", marginBottom: 6 }}>
              <span className="muted">Quests completed today</span>
              <strong className="num">{Math.min(doneToday, dailyTarget)} / {dailyTarget}</strong>
            </div>
            <Progress value={Math.min(doneToday, dailyTarget)} max={dailyTarget} label="Daily quest target" />
            <p className="small muted" style={{ margin: "10px 0 0" }}>
              {doneToday >= dailyTarget ? "Target hit. Anything extra is bonus progress." : `${dailyTarget - doneToday} more to secure the day.`}
            </p>
          </Card>

          {/* Activity */}
          <Card className="card-pad">
            <SectionHead title="Recent activity" action={<Link href="/profile" className="link">Full history</Link>} />
            {feed.length === 0 ? (
              <EmptyState icon={<ListChecks aria-hidden="true" />} title="Nothing yet" body="Completed quests will show up here with their rewards." />
            ) : (
              <ul className="list-plain small">
                {feed.map((f) => (
                  <li key={f.id} className="row" style={{ alignItems: "flex-start" }}>
                    <CircleCheck size={16} aria-hidden="true" style={{ color: f.done ? "var(--success)" : "var(--text-3)", flexShrink: 0, marginTop: 3 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, textDecoration: f.done ? "none" : "line-through" }}>{f.done ? "Completed" : "Reopened"} <strong>{f.title}</strong></p>
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>{timeFmt.format(new Date(f.time))}{f.done ? ` · +${f.reward.xp} XP` : ""}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="stack">
          {/* Stats */}
          <Card className="card-pad">
            <SectionHead title="Attributes" action={<Link href="/profile" className="link">Details</Link>} />
            <RadarChart values={profile.attributes || {}} max={10} labels={ATTRIBUTE_NAMES} />
          </Card>

          {/* Skills */}
          <Card className="card-pad">
            <SectionHead title="Top skills" action={<Link href="/profile" className="link">All skills</Link>} />
            <ul className="list-plain small">
              {topSkills.map((s) => (
                <li key={s.attr} className="row" style={{ justifyContent: "space-between" }}>
                  <span><strong>{s.name}</strong> <span className="muted">· {ATTRIBUTE_NAMES[s.attr]}</span></span>
                  <span className="chip">Lv <span className="num">{s.level}</span></span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Achievements */}
          <Card className="card-pad">
            <SectionHead title={`Achievements · ${unlocked.length}/${achievements.length}`} action={<Link href="/profile" className="link">View all</Link>} />
            <ul className="list-plain small">
              {unlocked.slice(0, 2).map((a) => {
                const Icon = ACHIEVEMENT_ICONS[a.icon] || Trophy;
                return (
                  <li key={a.id} className="row">
                    <span className="feature-icon gold" style={{ width: 32, height: 32, margin: 0 }} aria-hidden="true"><Icon size={16} /></span>
                    <div><strong>{a.name}</strong><p className="muted" style={{ margin: 0, fontSize: 12 }}>{a.desc}</p></div>
                  </li>
                );
              })}
              {nextLocked.map((a) => {
                const Icon = ACHIEVEMENT_ICONS[a.icon] || Trophy;
                return (
                  <li key={a.id} className="row" style={{ opacity: .65 }}>
                    <span className="feature-icon" style={{ width: 32, height: 32, margin: 0 }} aria-hidden="true"><Lock size={15} /></span>
                    <div><strong>{a.name}</strong><p className="muted" style={{ margin: 0, fontSize: 12 }}>{a.desc}</p></div>
                    <span style={{ marginLeft: "auto" }}><Icon size={15} aria-hidden="true" className="muted" /></span>
                  </li>
                );
              })}
              {unlocked.length === 0 && nextLocked.length === 0 && <li className="muted">No achievements defined.</li>}
            </ul>
          </Card>

          {/* Upcoming unlocks */}
          <Card className="card-pad">
            <SectionHead title="Upcoming unlocks" action={<Link href="/shop" className="link">Open vault</Link>} />
            {upcoming.length === 0 ? (
              <p className="small muted" style={{ margin: 0 }}>Vault fully collected. New stock arrives after the event.</p>
            ) : (
              <ul className="list-plain small">
                {upcoming.map((i) => (
                  <li key={i.id} className="row" style={{ justifyContent: "space-between" }}>
                    <span><strong>{i.name}</strong> <span className="muted">· {i.type}</span></span>
                    {profile.level >= i.unlockLevel ? (
                      <span className="chip gold num">{i.price} coins</span>
                    ) : (
                      <span className="chip"><Lock size={11} aria-hidden="true" /> Level {i.unlockLevel}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {dialog?.kind === "levelup" && (
        <RankUpDialog
          level={dialog.level}
          rankName={rankForLevel(dialog.level).rank}
          rankColor={rankForLevel(dialog.level).color}
          reward={dialog.reward}
          attr={dialog.attr}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "penalty" && (
        <Dialog
          title="Streak reset"
          onClose={() => setDialog(null)}
          actions={<><button className="btn" onClick={() => setDialog(null)}>Understood</button><Link href="/quests" className="btn btn-primary" onClick={() => setDialog(null)}>Rebuild it today</Link></>}
        >
          <p>You missed a day, so the streak restarted at 1 and 20 coins were deducted. Complete a quest today to start climbing again.</p>
        </Dialog>
      )}
      {detailMission && (
        <Dialog
          title={detailMission.title}
          onClose={() => setDetailId(null)}
          actions={
            <>
              <Link href="/quests" className="btn" onClick={() => setDetailId(null)}>Open in Quests</Link>
              {detailMission.status === "active" && (
                <button className="btn btn-primary" onClick={() => { setDetailId(null); onComplete(detailMission); }} autoFocus>
                  Complete quest · +{DIFFICULTY[detailMission.difficulty]?.xp} XP
                </button>
              )}
            </>
          }
        >
          {detailMission.description && <p>{detailMission.description}</p>}
          <p>
            <span className="chip" style={{ marginRight: 6 }}>{detailMission.difficulty}-rank</span>
            <span className="chip" style={{ marginRight: 6 }}>{detailMission.category} → {ATTRIBUTE_MAP[detailMission.category]}</span>
            <span className="chip">{questStatus(detailMission) === "completed" ? "Completed" : questStatus(detailMission) === "overdue" ? "Overdue" : questStatus(detailMission) === "scheduled" ? "Scheduled" : "Active"}{detailMission.due_date ? ` · Due ${detailMission.due_date}` : ""}</span>
          </p>
          <p>Earns <strong className="num">+{DIFFICULTY[detailMission.difficulty]?.xp} XP</strong> and <strong className="num">+{DIFFICULTY[detailMission.difficulty]?.coins} coins</strong>, training {ATTRIBUTE_MAP[detailMission.category]}.</p>
        </Dialog>
      )}
      {toast && <Toast icon={<CircleCheck aria-hidden="true" />}>{toast}</Toast>}
    </AppShell>
  );
}
