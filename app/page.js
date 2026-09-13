"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  Zap, ArrowRight, Check, ScrollText, CircleCheck, TrendingUp, Gem,
  Swords, Brain, ShieldCheck, HeartPulse, Lightbulb, Users,
} from "lucide-react";
import AuthBox from "@/components/AuthBox";
import { SceneErrorBoundary, ChamberFallback, useSmallScreen } from "@/components/three/PowerCoreScene";
import { DIFFICULTY, ATTRIBUTES, ATTRIBUTE_NAMES, ACHIEVEMENTS, SHOP_ITEMS } from "@/lib/gameLogic";
import { getQuality, resolveDense } from "@/lib/prefs";

const Chamber = dynamic(
  () => import("@/components/three/PowerCoreScene").then((m) => m.PowerCoreScene),
  { ssr: false, loading: () => <div className="skeleton" style={{ height: "100%", minHeight: 480 }} aria-hidden="true" /> }
);

const DEMO_NODES = [
  { id: "n1", title: "Morning run", difficulty: "D", color: "#2cbfa3" },
  { id: "n2", title: "Deep work block", difficulty: "S", color: "#c9d4e8" },
  { id: "n3", title: "Read 30 pages", difficulty: "C", color: "#a98be8" },
  { id: "n4", title: "Gym session", difficulty: "B", color: "#d9a066" },
  { id: "n5", title: "Call family", difficulty: "E", color: "#f6b75f" },
];

const LOOP = [
  { icon: ScrollText, title: "Accept a quest", body: "Name real work — a workout, a study block, a difficult conversation. Set its rank and due date; the reward is stated up front." },
  { icon: CircleCheck, title: "Complete it", body: "Check it off to trigger the reward sequence: XP, coins, attribute growth, streak progress and a reaction from your core." },
  { icon: TrendingUp, title: "Rank up", body: "Every level demands more than the last. Climb from Seed to Everbloom across six attributes." },
  { icon: Gem, title: "Spend in the vault", body: "Coins buy titles, auras, frames and themes — some only unlock at higher levels. Your look proves your history." },
];

const ATTR_ICONS = { STR: Swords, INT: Brain, DIS: ShieldCheck, HLT: HeartPulse, CRT: Lightbulb, SOC: Users };
const ATTR_BLURB = {
  STR: "Gym quests",
  INT: "Coding and study",
  DIS: "Work and meditation",
  HLT: "Runs and recovery",
  CRT: "Reading and ideas",
  SOC: "People and community",
};

export default function Home() {
  const small = useSmallScreen(760);
  const [fx, setFx] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [quality, setQualityState] = useState("auto");

  useEffect(() => {
    try {
      setFx(localStorage.getItem("pp_fx") !== "off");
      setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      setQualityState(getQuality());
    } catch {}
  }, []);

  function goStart() {
    document.getElementById("start")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  }

  const showScene = fx && !reduced;

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link href="/" className="brand" style={{ border: "none", height: "auto", padding: 0 }} aria-label="Aetherbloom home">
            <span className="brand-mark" aria-hidden="true"><Zap size={16} /></span>
            <span className="brand-name">Aether<span>bloom</span></span>
          </Link>
          <span style={{ flex: 1 }} />
          <Link href="#loop" className="muted small" style={{ textDecoration: "none" }}>The loop</Link>
          <Link href="#start" className="lbtn lbtn-ghost lbtn-sm">Sign in</Link>
        </div>
      </header>

      <main id="main">
        <section className="cinema" aria-label="Introduction">
          <div className="cinema-bg" aria-hidden="true">
            {showScene ? (
              <SceneErrorBoundary fallback={<ChamberFallback label="Cinematic chamber unavailable" />}>
                <Chamber
                  level={7}
                  progress={0.64}
                  rankColor="#A98BE8"
                  accent="#8FA8F8"
                  mood="dawn"
                  nodes={DEMO_NODES}
                  biomeCounts={{ STR: 1, INT: 2, DIS: 1, HLT: 1, CRT: 1, SOC: 1 }}
                  blooms={9}
                  artifacts={4}
                  pulse={0}
                  interactive
                  reducedMotion={false}
                  dense={resolveDense(quality, small, false)}
                  focus={small ? [0, 1, 0] : [-2.5, 1, 0]}
                  autoRotate={false}
                  onNodeSelect={goStart}
                />
              </SceneErrorBoundary>
            ) : (
              <ChamberFallback label="Cinematic chamber disabled" />
            )}
          </div>
          <div className="cinema-scrim" aria-hidden="true" />
          <div className="cinema-inner">
            <p className="eyebrow" style={{ color: "var(--text-2)" }}>Aetherbloom · The Living Atlas · Tech Zephyr 4.0 entry</p>
            <h1>Stop checking boxes.<br />Start building your character.</h1>
            <p className="lead">
              Aetherbloom turns studying, training and deep work into quests.
              Finish one and your core reacts instantly — experience, coins,
              attributes, streaks. Miss days and it notices that too.
            </p>
            <div className="hero-cta">
              <Link href="#start" className="lbtn lbtn-jade">Create your character <ArrowRight aria-hidden="true" /></Link>
              <Link href="/dashboard" className="lbtn lbtn-ghost">Enter HQ</Link>
            </div>
            <div className="hero-proof">
              <div><strong className="num">{ATTRIBUTES.length}</strong><span>Trainable attributes</span></div>
              <div><strong className="num">{ACHIEVEMENTS.length}</strong><span>Achievements to earn</span></div>
              <div><strong className="num">{SHOP_ITEMS.length}</strong><span>Vault artifacts</span></div>
            </div>
          </div>
        </section>

        <section id="loop" className="loop-wrap" aria-label="The progression loop" style={{ scrollMarginTop: 70 }}>
          <p className="eyebrow">The loop</p>
          <h2 className="display" style={{ fontSize: 30, margin: "0 0 8px" }}>Four steps. Every single day.</h2>
          <p className="muted" style={{ margin: "0 0 20px", maxWidth: 560 }}>The whole product is this cycle. Everything else — ranks, vault, streaks — exists to make step two feel incredible.</p>
          <div className="grid grid-2">
            {LOOP.map((s, i) => {
              const Icon = s.icon;
              return (
                <article key={s.title} className="card card-pad">
                  <div className="row" style={{ gap: 12, marginBottom: 8 }}>
                    <span className="feature-icon" style={{ margin: 0 }} aria-hidden="true"><Icon /></span>
                    <p className="muted small num" style={{ margin: 0 }}>Step {i + 1}</p>
                  </div>
                  <h3 style={{ fontSize: 16, margin: "0 0 6px" }}>{s.title}</h3>
                  <p className="muted small" style={{ margin: 0 }}>{s.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="loop-wrap" aria-label="Attributes">
          <p className="eyebrow">Attributes</p>
          <h2 className="display" style={{ fontSize: 30, margin: "0 0 8px" }}>Six stats. Zero vanity.</h2>
          <p className="muted" style={{ margin: "0 0 20px", maxWidth: 560 }}>Each stat only grows when you do the matching work. The radar in HQ never lies.</p>
          <div className="grid grid-3">
            {ATTRIBUTES.map((a) => {
              const Icon = ATTR_ICONS[a];
              return (
                <article key={a} className="card card-pad">
                  <div className="feature-icon" aria-hidden="true"><Icon /></div>
                  <h3 style={{ fontSize: 15, margin: "0 0 4px" }}>{ATTRIBUTE_NAMES[a]}</h3>
                  <p className="muted small" style={{ margin: 0 }}>Trained by {ATTR_BLURB[a]}.</p>
                </article>
              );
            })}
          </div>
        </section>

        <section style={{ maxWidth: 1180, margin: "0 auto", padding: "8px 24px" }} aria-label="Reward table">
          <div className="card card-pad">
            <p className="eyebrow">Transparent rewards</p>
            <h2 style={{ fontSize: 20, margin: "0 0 4px" }}>Every rank pays what it says.</h2>
            <p className="muted small" style={{ margin: "0 0 12px" }}>No hidden math. Harder quests pay more, and every level-up adds a coin bonus on top.</p>
            <table className="xp-table">
              <thead>
                <tr><th scope="col">Quest rank</th><th scope="col">Experience</th><th scope="col">Coins</th></tr>
              </thead>
              <tbody>
                {["E", "D", "C", "B", "S"].map((r) => (
                  <tr key={r}>
                    <td><strong>{r}-rank</strong></td>
                    <td className="num">+{DIFFICULTY[r].xp} XP</td>
                    <td className="num">+{DIFFICULTY[r].coins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="start" style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 24px 8px", scrollMarginTop: 70 }} aria-label="Get started">
          <div className="grid grid-2" style={{ alignItems: "start" }}>
            <div>
              <h2 className="display" style={{ fontSize: 30, margin: "0 0 10px" }}>Begin at level 1.</h2>
              <p className="muted" style={{ margin: "0 0 16px", maxWidth: 440 }}>
                Create an account to get your player profile with 50 starter coins.
                Your quests sync to your account — sign in from any device.
              </p>
              <ul className="list-plain small">
                {["Secure sign-in; you only ever see your own data", "Server-side persistence, proven on refresh", "Free to play during the hackathon"].map((t) => (
                  <li key={t} className="row" style={{ gap: 8 }}>
                    <Check size={15} aria-hidden="true" style={{ color: "var(--success)", flexShrink: 0 }} />
                    <span className="muted">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card card-pad">
              <AuthBox />
            </div>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-inner">
            <span>Aetherbloom · Built for the Tech Zephyr 4.0 Web Hackathon, IIT Bhubaneswar.</span>
            <span>Next.js + Supabase + Three.js · All game systems original.</span>
          </div>
        </footer>
      </main>
    </>
  );
}
