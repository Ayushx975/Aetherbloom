"use client";
import { motion } from "framer-motion";
import { Zap, Coins, TrendingUp } from "lucide-react";
import { useEffect } from "react";

// The rank-up moment: restrained celebration overlay.
// Display-font rank reveal, reward breakdown, single action.
export default function RankUpDialog({ level, rankName, rankColor, reward, attr, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const rows = [
    { icon: Zap, label: "Experience gained", value: `+${reward.xp} XP` },
    { icon: Coins, label: "Coins earned", value: `+${reward.coins}` },
    { icon: TrendingUp, label: `${attr} training`, value: "+1 level" },
  ];

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="dialog"
        style={{ maxWidth: 480, textAlign: "center" }}
        role="alertdialog"
        aria-modal="true"
        aria-label={`Level ${level} reached: ${rankName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rankup-rule" aria-hidden="true" />
        <p className="eyebrow" style={{ textAlign: "center" }}>Assessment complete</p>
        <p className="rankup-name" style={{ color: rankColor }}>{rankName}</p>
        <p className="muted" style={{ margin: "0 0 18px" }}>Level {level} reached. The new rank is now active on your profile.</p>
        <ul className="list-plain" style={{ textAlign: "left" }}>
          {rows.map((r) => {
            const Icon = r.icon;
            return (
              <li key={r.label} className="row" style={{ justifyContent: "space-between", padding: "9px 2px", borderTop: "1px solid var(--border)" }}>
                <span className="row" style={{ gap: 9, color: "var(--text-2)", fontSize: 14 }}>
                  <Icon size={16} aria-hidden="true" /> {r.label}
                </span>
                <strong className="num" style={{ fontSize: 14 }}>{r.value}</strong>
              </li>
            );
          })}
        </ul>
        <div className="dialog-actions" style={{ justifyContent: "center" }}>
          <button className="btn btn-reward" onClick={onClose} autoFocus>Continue training</button>
        </div>
      </motion.div>
    </div>
  );
}
