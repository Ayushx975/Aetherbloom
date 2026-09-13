"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Target, CircleCheck, TriangleAlert, X } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, SectionHead, EmptyState, Dialog, Toast, Skeleton, Segmented } from "@/components/ui";
import RankUpDialog from "@/components/RankUpDialog";
import { store } from "@/lib/store";
import {
  DIFFICULTY, ATTRIBUTE_MAP, completeMission, questStatus,
  updateStreak, todayStr, defaultProfile, rankForLevel,
} from "@/lib/gameLogic";
import { playReward, playLevelUp } from "@/lib/sound";

const STATUS = [
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Done" },
  { value: "all", label: "All" },
];
const DIFFS = ["All", "E", "D", "C", "B", "S"];

export default function Quests() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [completing, setCompleting] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "Coding", difficulty: "E", due_date: "" });
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("active");
  const [diff, setDiff] = useState("All");
  const [cat, setCat] = useState("All");

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
        if (!p || !p.user_id) p = defaultProfile(u.id);
        const today = todayStr();
        if (p.last_active_date !== today) {
          const s = updateStreak(p.last_active_date, today);
          if (s.streak === "increment") p = { ...p, streak: (p.streak || 0) + 1, last_active_date: today };
          else if (s.streak === "reset") {
            p = { ...p, streak: 1, last_active_date: today, coins: Math.max(0, (p.coins || 0) - 20) };
            setDialog({ kind: "penalty" });
          } else if (s.streak === 1) p = { ...p, streak: 1, last_active_date: today };
          await store.saveProfile(p);
        }
        setProfile(p);
        const ms = await store.listMissions(u.id);
        setMissions(ms);
        if (ms.length === 0) setShowForm(true);
      } catch (e) {
        setError(e.message || "Could not load missions.");
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

  async function addMission(e) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) { setError("Give the quest a title first."); return; }
    if (form.difficulty === "S" && profile.level < 3) { setError("S-rank quests unlock at level 3. Train lower ranks first."); return; }
    if (!navigator.onLine) { setError("You appear offline. Quests save to the server — reconnect and retry."); return; }
    try {
      const row = await store.addMission(user.id, { ...form, title: form.title.trim(), due_date: form.due_date || null });
      setMissions((ms) => [row, ...ms]);
      setForm({ title: "", description: "", category: "Coding", difficulty: "E", due_date: "" });
      setShowForm(false);
      showToast("Quest accepted. Complete it to earn the reward.");
    } catch (e) {
      setError(e.message || "Could not create the quest.");
    }
  }

  async function onComplete(m) {
    if (completing) return;
    setCompleting(m.id);
    setError("");
    const stamp = new Date().toISOString();
    const prev = missions;
    setMissions((ms) => ms.map((x) => (x.id === m.id ? { ...x, status: "done", completed_at: stamp } : x)));
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
        await store.updateMission(m.id, { status: "done", completed_at: stamp });
        const local = completeMission(profile, m);
        const saved = await store.saveProfile(local.profile);
        setProfile(saved.user_id ? saved : local.profile);
        res = local;
      }
      if (res.leveledUp) {
        playLevelUp();
        setDialog({ kind: "levelup", level: res.profile.level, reward: res.reward, attr: res.attr });
      } else {
        playReward();
        showToast(`Quest complete — +${res.reward.xp} XP, +${res.reward.coins} Coins, ${res.attr} +1.`);
      }
    } catch (e) {
      setMissions(prev);
      setError(e.message || "Could not complete the quest. Your board was restored.");
    } finally {
      setCompleting(null);
    }
  }

  async function onReopen(m) {
    try {
      const updated = await store.updateMission(m.id, { status: "active", completed_at: null });
      setMissions((ms) => ms.map((x) => (x.id === m.id ? { ...x, ...updated, status: "active", completed_at: null } : x)));
    } catch (e) {
      setError(e.message || "Could not reopen the quest.");
    }
  }

  async function onDelete() {
    if (!deleteId) return;
    try {
      await store.deleteMission(deleteId);
      setMissions((ms) => ms.filter((m) => m.id !== deleteId));
      setDeleteId(null);
      showToast("Quest abandoned.");
    } catch (e) {
      setError(e.message || "Could not delete the quest.");
    }
  }

  async function saveEdit(id) {
    if (!editTitle.trim()) { setError("Title cannot be empty."); return; }
    try {
      const updated = await store.updateMission(id, { title: editTitle.trim() });
      setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, ...updated } : m)));
      setEditingId(null);
    } catch (e) {
      setError(e.message || "Could not save changes.");
    }
  }

  const cats = useMemo(() => ["All", ...Object.keys(ATTRIBUTE_MAP)], []);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const order = { overdue: 0, active: 1, scheduled: 1, completed: 2 };
    return missions
      .filter((m) => {
        if (status !== "all" && questStatus(m) !== status) return false;
        if (diff !== "All" && m.difficulty !== diff) return false;
        if (cat !== "All" && m.category !== cat) return false;
        if (needle && !`${m.title} ${m.description || ""}`.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort((a, b) => {
        const sa = questStatus(a);
        const sb = questStatus(b);
        if (order[sa] !== order[sb]) return order[sa] - order[sb];
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }, [missions, q, status, diff, cat]);

  if (loading) {
    return (
      <AppShell active="quests" title="Quests" user={user} profile={profile} missions={missions} onLogout={onLogout}>
        <Skeleton style={{ height: 120 }} />
        <div className="stack" style={{ marginTop: 16 }}>
          <Skeleton style={{ height: 90 }} /><Skeleton style={{ height: 90 }} /><Skeleton style={{ height: 90 }} />
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell active="quests" title="Quests" user={user} missions={missions} onLogout={onLogout}>
        <div className="banner warn"><TriangleAlert aria-hidden="true" /><p><strong>Quests unavailable.</strong> {error || "Profile could not be loaded."}</p></div>
      </AppShell>
    );
  }

  const deleteTarget = missions.find((m) => m.id === deleteId) || null;

  return (
    <AppShell active="quests" title="Quests" user={user} profile={profile} missions={missions} onLogout={onLogout}>
      <div className="page-head row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>Quests</h1>
          <p>Create ranked work, complete it for XP and coins, and keep the streak alive.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)} aria-expanded={showForm}>
          {showForm ? <><X aria-hidden="true" /> Close form</> : <><Plus aria-hidden="true" /> New quest</>}
        </button>
      </div>

      {error && <p className="field-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}

      {showForm && (
        <Card className="card-pad" style={{ marginBottom: 16 }}>
          <SectionHead title="New quest" />
          <form onSubmit={addMission} aria-label="Create quest">
            <div className="field">
              <label htmlFor="q-title">Title</label>
              <input id="q-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What exactly counts as done?…" maxLength={120} required />
            </div>
            <div className="form-row cols-2">
              <div className="field">
                <label htmlFor="q-cat">Category — trains stat</label>
                <select id="q-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {Object.keys(ATTRIBUTE_MAP).map((c) => <option key={c} value={c}>{c} → {ATTRIBUTE_MAP[c]}</option>)}
                </select>
              </div>
                <div className="field">
                  <label htmlFor="q-diff">Difficulty — sets reward</label>
                  <select id="q-diff" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                    {Object.entries(DIFFICULTY).map(([k, v]) => <option key={k} value={k}>{v.label} · +{v.xp} XP, +{v.coins} coins</option>)}
                  </select>
                </div>
                  {form.difficulty === "S" && profile.level < 3 && (
                    <p className="field-error" role="note" style={{ marginTop: -6 }}>S-rank quests unlock at level 3 — you are level {profile.level}. Pick another rank or keep training.</p>
                  )}
                <div className="field">
                  <label htmlFor="q-due">Due date <span className="muted">(optional)</span></label>
                  <input id="q-due" type="date" value={form.due_date} min={todayStr()} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
            </div>
            <div className="field">
              <label htmlFor="q-desc">Briefing <span className="muted">(optional)</span></label>
              <textarea id="q-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Acceptance criteria, links, notes…" />
            </div>
              <button className="btn btn-primary" type="submit">Accept quest</button>
          </form>
        </Card>
      )}

      <Card className="card-pad" style={{ marginBottom: 16 }}>
        <div className="form-row cols-2" style={{ marginBottom: 12 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="q-search">Search</label>
            <input id="q-search" type="search" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or briefing…" />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="q-catf">Category</label>
            <select id="q-catf" value={cat} onChange={(e) => setCat(e.target.value)}>
              {cats.map((c) => <option key={c} value={c}>{c === "All" ? "All categories" : `${c} → ${ATTRIBUTE_MAP[c]}`}</option>)}
            </select>
          </div>
        </div>
        <div className="row" style={{ flexWrap: "wrap", gap: 10 }}>
          <Segmented label="Filter by status" value={status} onChange={setStatus} options={STATUS} />
          <Segmented label="Filter by difficulty" value={diff} onChange={setDiff} options={DIFFS.map((d) => ({ value: d, label: d === "All" ? "Any rank" : `${d}-rank` }))} />
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card className="card-pad">
          <EmptyState
            icon={<Target aria-hidden="true" />}
            title={missions.length === 0 ? "No quests yet" : "No matches"}
            body={missions.length === 0 ? "Create your first quest to start earning XP." : "Loosen the filters to see more quests."}
            action={missions.length === 0 ? <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus aria-hidden="true" /> New quest</button> : undefined}
          />
        </Card>
      ) : (
        <ul className="list-plain">
          <AnimatePresence initial={false}>
            {visible.map((m) => (
              <motion.li key={m.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className={`check ${m.status === "done" ? "done" : ""}`}>
                  <input
                    type="checkbox" checked={m.status === "done"}
                    onChange={() => (m.status === "done" ? onReopen(m) : onComplete(m))}
                    disabled={completing === m.id}
                    aria-label={m.status === "done" ? `Reopen ${m.title}` : `Complete ${m.title} for ${DIFFICULTY[m.difficulty]?.xp} XP`}
                  />
                  <div className="check-body">
                    {editingId === m.id ? (
                      <span className="row">
                        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} aria-label="Quest title" style={{ flex: 1 }} maxLength={120} />
                        <button className="btn btn-sm btn-primary" onClick={() => saveEdit(m.id)}>Save</button>
                        <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                      </span>
                    ) : (
                      <>
                        <strong>{m.title}</strong>
                        {m.description && <p className="muted small" style={{ margin: "4px 0 0" }}>{m.description}</p>}
                        <div className="check-meta">
                          <span className="chip">{m.difficulty}-rank · +{DIFFICULTY[m.difficulty]?.xp} XP · +{DIFFICULTY[m.difficulty]?.coins} coins</span>
                              <span className="chip">{m.category} → {ATTRIBUTE_MAP[m.category]}</span>
                              {m.due_date && <span className="chip">Due {m.due_date}</span>}
                              {questStatus(m) === "overdue" && <span className="chip red">Overdue</span>}
                              {questStatus(m) === "scheduled" && <span className="chip accent">Scheduled</span>}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="check-actions">
                    {editingId !== m.id && (
                      <button className="icon-btn" onClick={() => { setEditingId(m.id); setEditTitle(m.title); }} aria-label={`Rename ${m.title}`} title="Rename">
                        <Pencil aria-hidden="true" />
                      </button>
                    )}
                    <button className="icon-btn" onClick={() => setDeleteId(m.id)} aria-label={`Abandon ${m.title}`} title="Abandon">
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {deleteTarget && (
        <Dialog
          title="Abandon this quest?"
          onClose={() => setDeleteId(null)}
          actions={<><button className="btn" onClick={() => setDeleteId(null)}>Keep it</button><button className="btn btn-danger" onClick={onDelete} autoFocus>Abandon quest</button></>}
        >
          <p><strong>{deleteTarget.title}</strong> will be removed permanently. Completed history for other quests is unaffected.</p>
        </Dialog>
      )}
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
          actions={<button className="btn btn-primary" onClick={() => setDialog(null)} autoFocus>Rebuild it today</button>}
        >
          <p>You missed a day, so the streak restarted at 1 and 20 coins were deducted.</p>
        </Dialog>
      )}
      {toast && <Toast icon={<CircleCheck aria-hidden="true" />}>{toast}</Toast>}
    </AppShell>
  );
}
