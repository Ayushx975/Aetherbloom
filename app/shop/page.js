"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Coins, Lock, Check, TriangleAlert, Gem } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, SectionHead, EmptyState, Dialog, Toast, Skeleton, Segmented } from "@/components/ui";
import { SceneErrorBoundary, ChamberFallback } from "@/components/three/PowerCoreScene";

const ItemPreview = dynamic(
  () => import("@/components/three/ItemPreview3D").then((m) => m.ItemPreview3D),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: 240 }} aria-hidden="true" /> }
);

const PREVIEW_COLORS = { common: "#8b93a3", rare: "#45b8f0", epic: "#a78bfa", legendary: "#e5ac4e" };
import { GEAR_ICONS } from "@/components/icons";
import { store } from "@/lib/store";
import { SHOP_ITEMS, RARITY_ORDER, defaultProfile } from "@/lib/gameLogic";

const TYPES = ["All", "Aura", "Title", "Frame", "Theme"];
const RARITY_LABEL = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };

export default function Vault() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [type, setType] = useState("All");
  const [confirmId, setConfirmId] = useState(null);
  const [acquired, setAcquired] = useState(null);
  const [denied, setDenied] = useState(null);
  const [inspectId, setInspectId] = useState(null);
  const [reduced] = useState(() => {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });

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
        setMissions(await store.listMissions(u.id));
      } catch (e) {
        setError(e.message || "Could not load the vault.");
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

  function isEquipped(item) {
    if (!profile) return false;
    if (item.type === "Title") return profile.active_title === item.name;
    if (item.type === "Theme") return profile.active_theme === item.id;
    return profile.active_aura === item.id; // Aura + Frame share the avatar slot
  }

  async function buy(item) {
    setError("");
    try {
      const via = await store.apiPurchase(item.id);
      if (via) {
        // Trusted server result (eligibility checked with the service key).
        setProfile(via.profile);
      } else {
        // Direct fallback (demo mode or no service key configured).
        const patch = {
          ...profile,
          coins: profile.coins - item.price,
          owned_items: [...(profile.owned_items || []), item.id],
        };
        const saved = await store.saveProfile(patch);
        setProfile(saved.user_id ? saved : patch);
      }
      setConfirmId(null);
      setAcquired(item);
    } catch (e) {
      setError(e.message || "Purchase failed. Try again.");
    }
  }

  async function equip(item, on = true) {
    const patch = { ...profile };
    if (item.type === "Title") patch.active_title = on ? item.name : null;
    else if (item.type === "Theme") patch.active_theme = on ? item.id : null;
    else patch.active_aura = on ? item.id : null;
    try {
      const saved = await store.saveProfile(patch);
      setProfile(saved.user_id ? saved : patch);
      setAcquired(null);
      showToast(on ? `${item.name} equipped.` : `${item.name} unequipped.`);
    } catch (e) {
      setError(e.message || "Could not update equipment.");
    }
  }

  const items = useMemo(() => {
    return SHOP_ITEMS.filter((i) => type === "All" || i.type === type)
      .sort((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || a.price - b.price);
  }, [type]);

  if (loading) {
    return (
      <AppShell active="vault" title="Vault" user={user} profile={profile} missions={missions} onLogout={onLogout}>
        <Skeleton style={{ height: 120 }} />
        <div className="vault-grid" style={{ marginTop: 16 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} style={{ height: 260 }} />)}
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell active="vault" title="Vault" user={user} missions={missions} onLogout={onLogout}>
        <div className="banner warn"><TriangleAlert aria-hidden="true" /><p><strong>Vault unavailable.</strong> {error || "Profile could not be loaded."}</p></div>
      </AppShell>
    );
  }

  const owned = profile.owned_items || [];
  const confirmItem = SHOP_ITEMS.find((i) => i.id === confirmId) || null;
  const inspectItem = SHOP_ITEMS.find((i) => i.id === inspectId) || null;
  const inspectOwned = inspectItem ? owned.includes(inspectItem.id) : false;
  const inspectEquipped = inspectItem ? isEquipped(inspectItem) : false;
  const inspectGated = inspectItem ? profile.level < inspectItem.unlockLevel : false;
  const inspectAfford = inspectItem ? profile.coins >= inspectItem.price : false;

  return (
    <AppShell active="vault" title="Vault" user={user} profile={profile} missions={missions} onLogout={onLogout}>
      <div className="page-head">
        <h1>Vault</h1>
        <p>Cosmetic upgrades earned with coins. Higher levels unlock higher rarities.</p>
      </div>

      <Card className="card-pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="row">
            <span className="stat-pill gold"><Coins aria-hidden="true" /><span className="num">{profile.coins} coins</span></span>
            <span className="stat-pill"><Gem aria-hidden="true" /><span className="num">{owned.length}/{SHOP_ITEMS.length} owned</span></span>
          </div>
          <Segmented label="Filter by category" value={type} onChange={setType} options={TYPES.map((t) => ({ value: t, label: t === "All" ? "All" : `${t}s` }))} />
        </div>
      </Card>

      {error && <p className="field-error" role="alert" style={{ marginBottom: 12 }}>{error}</p>}

      {items.length === 0 ? (
        <Card className="card-pad">
          <EmptyState icon={<Gem aria-hidden="true" />} title="Nothing in this category" body="Try a different category to browse the full collection." />
        </Card>
      ) : (
        <div className="vault-grid">
          {items.map((item) => {
            const Icon = GEAR_ICONS[item.icon] || Gem;
            const has = owned.includes(item.id);
            const equipped = isEquipped(item);
            const levelGated = profile.level < item.unlockLevel;
            const afford = profile.coins >= item.price;
            return (
              <Card key={item.id} className={`card-pad rarity-${item.rarity}`} hover>
                <button type="button" className="preview-btn" onClick={() => setInspectId(item.id)} aria-label={`Inspect ${item.name} in 3D`}>
                <div className="item-preview" aria-hidden="true">
                  {item.type === "Title" ? (
                    <span className="display" style={{ fontSize: 23, padding: "0 18px", textAlign: "center" }}>{item.name}</span>
                  ) : item.type === "Frame" ? (
                    <span className="avatar lg gold-frame">A</span>
                  ) : item.type === "Theme" ? (
                    <span className="row" style={{ gap: 10 }}>
                      <i style={{ width: 26, height: 26, borderRadius: "50%", background: item.id === "theme-crimson" ? "#e0656c" : "var(--accent)" }} />
                      <i style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--surface-3)", border: "1px solid var(--border-strong)" }} />
                      <i style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--reward)" }} />
                    </span>
                  ) : (
                    <span className="halo"><Icon /></span>
                  )}
                  <span className="item-state">
                    {equipped ? <span className="chip green">Equipped</span>
                      : has ? <span className="chip">Owned</span>
                      : levelGated ? <span className="chip"><Lock size={11} aria-hidden="true" /> Lv {item.unlockLevel}</span>
                      : <span className="chip gold">{RARITY_LABEL[item.rarity]}</span>}
                  </span>
                </div>
                </button>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                  <strong style={{ fontSize: 15 }}>{item.name}</strong>
                </div>
                <p className="muted small" style={{ margin: "0 0 4px" }}>{item.type} · {RARITY_LABEL[item.rarity]}{!levelGated || has ? "" : ` · Unlocks at level ${item.unlockLevel}`}</p>
                <p className="muted small" style={{ margin: "0 0 14px", minHeight: 40 }}>{item.desc}</p>
                {equipped ? (
                  <div className="row">
                    <span className="chip green"><Check size={12} aria-hidden="true" /> Active</span>
                    <span style={{ flex: 1 }} />
                    <button className="btn btn-sm" onClick={() => equip(item, false)}>Unequip</button>
                  </div>
                ) : has ? (
                  <button className="btn btn-block" onClick={() => equip(item, true)}>Equip</button>
                ) : levelGated ? (
                  <button className="btn btn-block" disabled title={`Reach level ${item.unlockLevel} to unlock`}><Lock aria-hidden="true" /> Requires level {item.unlockLevel}</button>
                ) : (
                  <button
                    className="btn btn-reward btn-block"
                    onClick={() => (afford ? setConfirmId(item.id) : setDenied(item))}
                  >
                    Acquire · <span className="num">{item.price}</span> <Coins size={14} aria-hidden="true" />
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {inspectItem && (
        <Dialog
          title={inspectItem.name}
          onClose={() => setInspectId(null)}
          wide
          actions={
            inspectEquipped ? (
              <>
                <button className="btn" onClick={() => setInspectId(null)}>Close</button>
                <button className="btn" onClick={() => { equip(inspectItem, false); setInspectId(null); }}>Unequip</button>
              </>
            ) : inspectOwned ? (
              <>
                <button className="btn" onClick={() => setInspectId(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => { equip(inspectItem, true); setInspectId(null); }} autoFocus>Equip</button>
              </>
            ) : inspectGated ? (
              <button className="btn" onClick={() => setInspectId(null)} autoFocus>Close</button>
            ) : (
              <>
                <button className="btn" onClick={() => setInspectId(null)}>Close</button>
                <button
                  className="btn btn-reward"
                  onClick={() => { setInspectId(null); if (inspectAfford) setConfirmId(inspectItem.id); else setDenied(inspectItem); }}
                  autoFocus
                >
                  Acquire · <span className="num">{inspectItem.price}</span> coins
                </button>
              </>
            )
          }
        >
          <div style={{ height: 250, marginBottom: 12 }}>
            <SceneErrorBoundary fallback={<ChamberFallback label="3D preview unavailable" />}>
              <ItemPreview
                kind={inspectItem.icon === "ghost" ? "ghost" : inspectItem.type.toLowerCase()}
                color={PREVIEW_COLORS[inspectItem.rarity]}
                reducedMotion={reduced}
              />
            </SceneErrorBoundary>
          </div>
          <p>
            <span className="chip" style={{ marginRight: 6 }}>{inspectItem.type}</span>
            <span className="chip gold" style={{ marginRight: 6 }}>{RARITY_LABEL[inspectItem.rarity]}</span>
            {inspectGated && <span className="chip">Unlocks at level {inspectItem.unlockLevel}</span>}
          </p>
          <p>{inspectItem.desc} Costs <strong className="num">{inspectItem.price} coins</strong> — you hold <strong className="num">{profile.coins}</strong>. Drag the preview to inspect it.</p>
        </Dialog>
      )}

      {confirmItem && (
        <Dialog
          title={`Acquire ${confirmItem.name}?`}
          onClose={() => setConfirmId(null)}
          actions={
            <>
              <button className="btn" onClick={() => setConfirmId(null)}>Cancel</button>
              <button className="btn btn-reward" onClick={() => buy(confirmItem)} autoFocus>
                Confirm · <span className="num">{confirmItem.price}</span> coins
              </button>
            </>
          }
        >
          <p>Balance after purchase: <strong className="num">{profile.coins - confirmItem.price} coins</strong>. {confirmItem.desc}</p>
        </Dialog>
      )}

      {acquired && (
        <Dialog
          title="Added to your inventory"
          onClose={() => setAcquired(null)}
          actions={
            <>
              <button className="btn" onClick={() => setAcquired(null)}>Later</button>
              <button className="btn btn-primary" onClick={() => equip(acquired, true)} autoFocus>Equip now</button>
            </>
          }
        >
          <p><strong>{acquired.name}</strong> ({acquired.type} · {RARITY_LABEL[acquired.rarity]}) is yours. Equip it to show it on your profile.</p>
        </Dialog>
      )}

      {denied && (
        <Dialog
          title="Not enough coins"
          onClose={() => setDenied(null)}
          actions={
            <>
              <button className="btn" onClick={() => setDenied(null)}>Close</button>
              <Link href="/quests" className="btn btn-primary" onClick={() => setDenied(null)}>Earn coins</Link>
            </>
          }
        >
          <p><strong>{denied.name}</strong> costs <strong className="num">{denied.price} coins</strong> and you hold <strong className="num">{profile.coins}</strong>. S-rank quests pay up to 160 coins each.</p>
        </Dialog>
      )}

      {toast && <Toast icon={<Check aria-hidden="true" />}>{toast}</Toast>}
    </AppShell>
  );
}
