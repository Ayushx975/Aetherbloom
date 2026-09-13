"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Lock, Gem, CircleCheck, TriangleAlert } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, SectionHead, Progress, Avatar, EmptyState, Skeleton } from "@/components/ui";
import { ACHIEVEMENT_ICONS, GEAR_ICONS } from "@/components/icons";
import { store } from "@/lib/store";
import {
  xpForLevel, rankForLevel, RANK_LADDER, ATTRIBUTES, ATTRIBUTE_NAMES,
  SKILLS, SHOP_ITEMS, evaluateAchievements, activityFeed, defaultProfile, displayNameOf,
} from "@/lib/gameLogic";

const timeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const u = await store.getUser();
        if (!u) { router.push("/#start"); return; }
        setUser(u);
        let p = await store.getProfile(u.id);
        if (!p?.user_id) p = defaultProfile(u.id);
        setProfile(p);
        setMissions(await store.listMissions(u.id));
      } catch (e) {
        setError(e.message || "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function onLogout() {
    const { supabase } = await import("@/lib/supabaseClient");
    if (supabase) await supabase.auth.signOut();
    try { localStorage.removeItem("pp_demo_user"); } catch {}
    router.push("/");
  }

  if (loading) {
    return (
      <AppShell active="profile" title="Profile" user={user} profile={profile} missions={missions} onLogout={onLogout}>
        <Skeleton style={{ height: 220 }} />
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <Skeleton style={{ height: 260 }} /><Skeleton style={{ height: 260 }} />
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell active="profile" title="Profile" user={user} missions={missions} onLogout={onLogout}>
        <div className="banner warn"><TriangleAlert aria-hidden="true" /><p><strong>Profile unavailable.</strong> {error || "Your profile could not be loaded."}</p></div>
      </AppShell>
    );
  }

  const need = xpForLevel(profile.level);
  const rank = rankForLevel(profile.level);
  const heroName = displayNameOf(user, profile);
  const done = missions.filter((m) => m.status === "done").length;
  const achievements = evaluateAchievements(profile, missions);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const owned = profile.owned_items || [];
  const nextRank = RANK_LADDER.find((r) => r.minLevel > profile.level) || null;
  const feed = activityFeed(missions, 12);

  return (
    <AppShell active="profile" title="Profile" user={user} profile={profile} missions={missions} onLogout={onLogout}>
      <div className="page-head">
        <h1>Player profile</h1>
        <p>Everything the system knows about your journey.</p>
      </div>

      <Card className="card-pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
          <span className={profile.active_aura === "aura-blue" ? "aura-blue" : profile.active_aura === "aura-shadow" ? "aura-shadow" : undefined}>
            <Avatar name={heroName} size="lg" frameGold={profile.active_aura === "frame-gold"} />
          </span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 className="display" style={{ fontSize: 28, margin: "0 0 4px" }}>{heroName}</h2>
            <p className="muted small" style={{ margin: "0 0 10px" }}>
              {profile.active_title ? `${profile.active_title} · ` : ""}{rank.rank} · Level {profile.level}
            </p>
            <div className="row small" style={{ justifyContent: "space-between", marginBottom: 6, maxWidth: 420 }}>
              <span className="muted"><span className="num">{profile.xp}</span> / <span className="num">{need}</span> XP</span>
              {nextRank && <span className="muted">Next: {nextRank.rank} at {nextRank.minLevel}</span>}
            </div>
            <div style={{ maxWidth: 420 }}><Progress value={profile.xp} max={need} label="Experience to next level" /></div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, minmax(110px, 1fr))", gap: 12 }}>
            {[["Quests done", done], ["Day streak", `${profile.streak}d`], ["Coins", profile.coins], ["Achievements", `${unlockedCount}/${achievements.length}`]].map(([k, v]) => (
              <div key={k}>
                <p className="eyebrow" style={{ marginBottom: 2 }}>{k}</p>
                <p className="display num" style={{ fontSize: 22, margin: 0 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="dash">
        <div className="stack">
          <Card className="card-pad">
            <SectionHead title="Rank ladder" />
            <ul className="list-plain small">
              {RANK_LADDER.map((r) => {
                const reached = profile.level >= r.minLevel;
                const isCurrent = rank.rank === r.rank;
                return (
                  <li key={r.rank} className="row" style={{ justifyContent: "space-between", opacity: reached ? 1 : .55 }}>
                    <span className="row" style={{ gap: 8 }}>
                      {reached
                        ? <CircleCheck size={16} aria-hidden="true" style={{ color: "var(--success)" }} />
                        : <Lock size={15} aria-hidden="true" className="muted" />}
                      <strong style={isCurrent ? { color: "var(--accent)" } : {}}>{r.rank}{isCurrent ? " · current" : ""}</strong>
                    </span>
                    <span className="muted num">Lv {r.minLevel}+</span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="card-pad">
            <SectionHead title="Attributes & skills" />
            {ATTRIBUTES.map((a) => (
              <div key={a} style={{ marginBottom: 10 }}>
                <div className="row small" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                  <span>{ATTRIBUTE_NAMES[a]}</span>
                  <strong className="num">Lv {profile.attributes?.[a] ?? 1}</strong>
                </div>
                <Progress thin value={Math.min(profile.attributes?.[a] ?? 1, 10)} max={10} label={`${ATTRIBUTE_NAMES[a]} level`} />
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              {SKILLS.map((s) => (
                <div key={s.attr} className="row small" style={{ justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--border)" }}>
                  <span><strong>{s.name}</strong> <span className="muted">· {s.desc}</span></span>
                  <span className="chip">Lv <span className="num">{profile.attributes?.[s.attr] ?? 1}</span></span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="card-pad">
            <SectionHead title="History" />
            {feed.length === 0 ? (
              <EmptyState icon={<CircleCheck aria-hidden="true" />} title="No history yet" body="Complete quests to build your record." action={<Link href="/quests" className="btn btn-sm">Go to quests</Link>} />
            ) : (
              <ul className="list-plain small">
                {feed.map((f) => (
                  <li key={f.id} className="row" style={{ alignItems: "flex-start" }}>
                    <CircleCheck size={16} aria-hidden="true" style={{ color: f.done ? "var(--success)" : "var(--text-3)", flexShrink: 0, marginTop: 3 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0 }}>{f.done ? "Completed" : "Reopened"} <strong>{f.title}</strong></p>
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>{timeFmt.format(new Date(f.time))}{f.done ? ` · +${f.reward.xp} XP` : ""}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="stack">
          <Card className="card-pad">
            <SectionHead title={`Achievements · ${unlockedCount}/${achievements.length}`} />
            <div className="grid grid-2" style={{ gap: 10 }}>
              {achievements.map((a) => {
                const Icon = ACHIEVEMENT_ICONS[a.icon] || Trophy;
                return (
                  <div key={a.id} className="row" style={{ alignItems: "flex-start", opacity: a.unlocked ? 1 : .6, border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
                    <span className={`feature-icon ${a.unlocked ? "gold" : ""}`} style={{ width: 34, height: 34, margin: 0 }} aria-hidden="true">
                      {a.unlocked ? <Icon size={16} /> : <Lock size={15} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 13.5 }}>{a.name}</strong>
                      <p className="muted" style={{ margin: 0, fontSize: 12 }}>{a.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="card-pad">
            <SectionHead title={`Equipment · ${owned.length} owned`} action={<Link href="/shop" className="link">Open vault</Link>} />
            {owned.length === 0 ? (
              <EmptyState icon={<Gem aria-hidden="true" />} title="Vault is empty" body="Earn coins from quests and acquire your first upgrade." action={<Link href="/shop" className="btn btn-sm">Browse vault</Link>} />
            ) : (
              <ul className="list-plain small">
                {SHOP_ITEMS.filter((i) => owned.includes(i.id)).map((i) => {
                  const Icon = GEAR_ICONS[i.icon] || Gem;
                  const equipped = (i.type === "Title" && profile.active_title === i.name) || (i.type === "Theme" && profile.active_theme === i.id) || (profile.active_aura === i.id);
                  return (
                    <li key={i.id} className="row">
                      <span className="feature-icon" style={{ width: 32, height: 32, margin: 0 }} aria-hidden="true"><Icon size={15} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}><strong>{i.name}</strong><p className="muted" style={{ margin: 0, fontSize: 12 }}>{i.type} · {i.rarity}</p></div>
                      {equipped && <span className="chip green">Equipped</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
