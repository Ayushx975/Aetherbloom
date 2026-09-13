"use client";
import Link from "next/link";
import { useEffect, useState, Fragment } from "react";
import {
  LayoutDashboard, ListChecks, Gem, UserRound, Bell, Menu,
  ChevronsLeft, LogOut, Flame, Coins, Zap, Settings,
} from "lucide-react";
import { xpForLevel, displayNameOf } from "@/lib/gameLogic";

const NAV = [
  { href: "/dashboard", key: "hq", label: "HQ", icon: LayoutDashboard },
  { href: "/quests", key: "quests", label: "Quests", icon: ListChecks, badge: (ctx) => ctx.activeMissions || null },
  { href: "/shop", key: "vault", label: "Vault", icon: Gem },
  { href: "/profile", key: "profile", label: "Profile", icon: UserRound },
  { href: "/settings", key: "settings", label: "Settings", icon: Settings },
];

function buildNotifications(profile, missions) {
  const items = [];
  if (!profile) return items;
  const doneToday = (missions || []).filter((m) => m.status === "done").length;
  if (doneToday < 3) {
    items.push({ icon: "quest", title: `${3 - doneToday} quests left in today's rhythm`, body: "Complete 3 quests to hold your streak." });
  } else {
    items.push({ icon: "quest", title: "Daily rhythm complete", body: "All 3 quests done. Streak secured." });
  }
  if ((profile.streak || 0) === 0) {
    items.push({ icon: "streak", title: "Streak at risk", body: "Complete a quest today to start a streak." });
  }
  const need = profile ? Math.max(0, xpForLevel(profile.level) - (profile.xp || 0)) : 0;
  items.push({ icon: "xp", title: `${need} XP to next level`, body: `Level ${profile.level} → ${profile.level + 1}. S-rank quests pay the most.` });
  return items;
}

const NOTIF_ICON = {
  quest: ListChecks,
  streak: Flame,
  xp: Zap,
};

export default function AppShell({ active, title, user, profile, missions = [], onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("pp_sidebar") === "collapsed");
    } catch {}
  }, []);

  // Ember Dusk theme (vault unlock) re-skins the functional accent.
  useEffect(() => {
    try {
      if (profile?.active_theme === "theme-crimson") document.body.dataset.theme = "crimson";
      else delete document.body.dataset.theme;
    } catch {}
  }, [profile?.active_theme]);

  function toggleSidebar() {
    setCollapsed((c) => {
      try { localStorage.setItem("pp_sidebar", c ? "expanded" : "collapsed"); } catch {}
      return !c;
    });
  }

  const notes = buildNotifications(profile, missions);
  const displayName = displayNameOf(user, profile);
  const ctx = { activeMissions: missions.filter((m) => m.status === "active").length };

  return (
    <div className={`shell ${collapsed ? "collapsed" : ""}`}>
      <a className="skip-link" href="#main">Skip to main content</a>

      <aside className="sidebar" aria-label="Primary">
        <Link href="/dashboard" className="brand" aria-label="Aetherbloom home">
          <span className="brand-mark" aria-hidden="true"><Zap size={16} /></span>
          <span className="brand-name">Aether<span>bloom</span></span>
        </Link>
        <nav className="sidenav">
          <p className="nav-section">Atlas</p>
          {NAV.map((n) => {
            const Icon = n.icon;
            const badge = n.badge ? n.badge(ctx) : null;
            return (
              <Fragment key={n.key}>
              {n.key === "settings" && <p className="nav-section">System</p>}
              <Link href={n.href} className="navlink" aria-current={active === n.key ? "page" : undefined}>
                <Icon aria-hidden="true" />
                <span className="nav-label">{n.label}</span>
                {badge ? <span className="nav-badge num">{badge}</span> : null}
              </Link>
              </Fragment>
            );
          })}
        </nav>
        <div className="side-footer">
          <div className="side-user">
            <span className="avatar" aria-hidden="true">{displayName.charAt(0).toUpperCase()}</span>
            <span className="side-user-meta">
              <strong>{displayName}</strong>
              <span>Level {profile?.level ?? "–"}</span>
            </span>
            {onLogout && (
              <button className="icon-btn" onClick={onLogout} aria-label={`Log out ${user?.email || ""}`} title="Log out">
                <LogOut aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={toggleSidebar} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <Menu aria-hidden="true" /> : <ChevronsLeft aria-hidden="true" />}
          </button>
          <span className="topbar-title">{title}</span>
          <span className="topbar-spacer" />
          <div className="topbar-stats">
            {profile && (
              <>
                <span className="stat-pill xp hide-m" title="Experience this level">
                  <Zap aria-hidden="true" /><span className="num">{profile.xp} XP</span>
                </span>
                <span className="stat-pill" title="Training streak">
                  <Flame aria-hidden="true" /><span className="num">{profile.streak}d</span>
                </span>
                <span className="stat-pill gold" title="Coin balance">
                  <Coins aria-hidden="true" /><span className="num">{profile.coins}</span>
                </span>
              </>
            )}
            <span className="pop-wrap">
              <button className="icon-btn" onClick={() => { setNotifOpen((o) => !o); setStatsOpen(false); }} aria-label={`Notifications, ${notes.length} items`} aria-expanded={notifOpen} title="Notifications">
                <Bell aria-hidden="true" />
              </button>
              {notifOpen && (
                <div className="popover" role="dialog" aria-label="Notifications">
                  <h3>Notifications</h3>
                  {notes.map((n, i) => {
                    const Icon = NOTIF_ICON[n.icon] || Bell;
                    return (
                      <div key={i} className="notif">
                        <Icon aria-hidden="true" />
                        <div><p><strong>{n.title}</strong></p><small>{n.body}</small></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </span>
            <span className="pop-wrap">
              <button className="icon-btn" onClick={() => { setStatsOpen((o) => !o); setNotifOpen(false); }} aria-label="Account menu" aria-expanded={statsOpen} title="Account">
                <span className="avatar" aria-hidden="true" style={{ width: 30, height: 30, fontSize: 12 }}>{displayName.charAt(0).toUpperCase()}</span>
              </button>
              {statsOpen && (
                <div className="popover" role="menu" aria-label="Account">
                  <h3>{user?.email || "Player"}</h3>
                  <div className="notif"><UserRound aria-hidden="true" /><div><p><Link href="/profile">View profile</Link></p></div></div>
                  {onLogout && (
                    <div className="notif">
                      <LogOut aria-hidden="true" />
                      <div><p><button type="button" onClick={onLogout} style={{ background: "none", border: "none", padding: 0, color: "inherit", font: "inherit", cursor: "pointer", textDecoration: "underline" }}>Log out</button></p></div>
                    </div>
                  )}
                </div>
              )}
            </span>
          </div>
        </header>

        <main id="main" className="page">
          {children}
        </main>

        <nav className="bottomnav" aria-label="Primary mobile">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <Link key={n.key} href={n.href} aria-current={active === n.key ? "page" : undefined}>
                <Icon aria-hidden="true" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
