"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserRound, Volume2, VolumeX, MonitorCog, Palette, LogOut, TriangleAlert, Check } from "lucide-react";
import AppShell from "@/components/AppShell";
import { SectionHead, EmptyState, Skeleton, Segmented } from "@/components/ui";
import { LiquidGlassPanel, RewardToast } from "@/components/liquid";
import { store } from "@/lib/store";
import { defaultProfile, displayNameOf } from "@/lib/gameLogic";
import { getQuality, setQuality } from "@/lib/prefs";
import { isSoundOn, setSoundOn } from "@/lib/sound";

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [quality, setQualityState] = useState("auto");
  const [sound, setSoundState] = useState(true);
  const [fx, setFx] = useState(true);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }

  useEffect(() => {
    (async () => {
      try {
        const u = await store.getUser();
        if (!u) { router.push("/#start"); return; }
        setUser(u);
        let p = await store.getProfile(u.id);
        if (!p?.user_id) p = defaultProfile(u.id);
        setProfile(p);
        setName(p.display_name || "");
        setMissions(await store.listMissions(u.id));
      } catch (e) {
        setError(e.message || "Could not load settings.");
      } finally {
        setLoading(false);
      }
    })();
    setQualityState(getQuality());
    setSoundState(isSoundOn());
    try {
      setFx(localStorage.getItem("pp_fx") !== "off");
    } catch {}
  }, [router]);

  async function onLogout() {
    const { supabase } = await import("@/lib/supabaseClient");
    if (supabase) await supabase.auth.signOut();
    try { localStorage.removeItem("pp_demo_user"); } catch {}
    router.push("/");
  }

  async function saveName(e) {
    e.preventDefault();
    setError("");
    const value = name.trim().slice(0, 40);
    if (value && value.length < 2) { setError("Display name needs at least 2 characters."); return; }
    setSaving(true);
    try {
      const saved = await store.saveProfile({ ...profile, display_name: value || null });
      setProfile(saved.user_id ? saved : { ...profile, display_name: value || null });
      showToast("Profile updated.");
    } catch (err) {
      setError(err.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  function pickQuality(q) {
    setQuality(q);
    setQualityState(q);
    showToast(`3D quality: ${q}. Takes effect on the next scene load.`);
  }

  function toggleSound() {
    const next = !sound;
    setSoundOn(next);
    setSoundState(next);
  }

  function toggleFx() {
    const next = !fx;
    try {
      localStorage.setItem("pp_fx", next ? "on" : "off");
    } catch {}
    setFx(next);
  }

  if (loading) {
    return (
      <AppShell active="settings" title="Settings" user={user} profile={profile} missions={missions} onLogout={onLogout}>
        <Skeleton style={{ height: 180 }} />
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <Skeleton style={{ height: 220 }} /><Skeleton style={{ height: 220 }} />
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell active="settings" title="Settings" user={user} missions={missions} onLogout={onLogout}>
        <div className="banner warn"><TriangleAlert aria-hidden="true" /><p><strong>Settings unavailable.</strong> {error || "Your profile could not be loaded."}</p></div>
      </AppShell>
    );
  }

  return (
    <AppShell active="settings" title="Settings" user={user} profile={profile} missions={missions} onLogout={onLogout}>
      <div className="page-head">
        <h1>Settings</h1>
        <p>Identity, comfort and session controls. Device choices stay on this device.</p>
      </div>
      {error && <p className="field-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <LiquidGlassPanel className="glass-pad">
          <SectionHead title="Profile" />
          <form onSubmit={saveName} aria-label="Edit profile">
            <div className="field">
              <label htmlFor="set-name">Display name</label>
              <input
                id="set-name" name="display-name" type="text" autoComplete="nickname"
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder={`${displayNameOf(user, profile)}…`} maxLength={40}
              />
            </div>
            <div className="field">
              <label htmlFor="set-email">Email</label>
              <input id="set-email" type="email" value={user?.email || ""} disabled aria-describedby="email-note" />
              <p className="muted small" id="email-note" style={{ margin: 0 }}>Email identifies your account and cannot be changed here.</p>
            </div>
            <button className="lbtn lbtn-jade" type="submit" disabled={saving}>
              <UserRound aria-hidden="true" /> {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </LiquidGlassPanel>

        <div className="stack">
          <LiquidGlassPanel className="glass-pad">
            <SectionHead title="Experience" />
            <div className="field">
              <label id="q-label">3D quality</label>
              <div role="group" aria-labelledby="q-label">
                <Segmented
                  label="3D quality"
                  value={quality}
                  onChange={pickQuality}
                  options={[
                    { value: "auto", label: "Auto" },
                    { value: "high", label: "High" },
                    { value: "low", label: "Low" },
                  ]}
                />
              </div>
              <p className="muted small" style={{ margin: "6px 0 0" }}>Low disables shadows, reflections and dense particles. Auto simplifies on small screens.</p>
            </div>
            <div className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <span className="small"><strong>Reward sounds</strong><br /><span className="muted">Chime on completion</span></span>
              <button className="lbtn lbtn-ghost lbtn-sm" onClick={toggleSound} aria-pressed={sound}>
                {sound ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />} {sound ? "On" : "Off"}
              </button>
            </div>
            <div className="row" style={{ justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <span className="small"><strong>Chamber effects</strong><br /><span className="muted">3D scene in HQ</span></span>
              <button className="lbtn lbtn-ghost lbtn-sm" onClick={toggleFx} aria-pressed={fx}>
                <MonitorCog aria-hidden="true" /> {fx ? "On" : "Off"}
              </button>
            </div>
            <p className="muted small" style={{ margin: "8px 0 0" }}>Motion follows your system reduced-motion setting automatically.</p>
          </LiquidGlassPanel>

          <LiquidGlassPanel className="glass-pad">
            <SectionHead title="Theme" />
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="small"><Palette size={15} aria-hidden="true" style={{ verticalAlign: -3 }} /> <strong>{profile.active_theme === "theme-crimson" ? "Ember Dusk" : "Meadow Dawn"}</strong></span>
              <Link href="/shop" className="lbtn lbtn-ghost lbtn-sm">Open vault</Link>
            </div>
            <p className="muted small" style={{ margin: "8px 0 0" }}>Themes are vault artifacts. Owning Ember Dusk shifts the whole atlas mood.</p>
          </LiquidGlassPanel>

          <LiquidGlassPanel className="glass-pad">
            <SectionHead title="Session" />
            <p className="small muted" style={{ margin: "0 0 12px" }}>Signed in as <strong style={{ color: "var(--text-1)" }}>{user?.email}</strong></p>
            <button className="lbtn lbtn-danger" onClick={onLogout}><LogOut aria-hidden="true" /> Sign out</button>
          </LiquidGlassPanel>
        </div>
      </div>

      {toast && <RewardToast icon={<Check aria-hidden="true" />}>{toast}</RewardToast>}
    </AppShell>
  );
}
