"use client";
import Link from "next/link";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

const spring = { type: "spring", stiffness: 380, damping: 30 };

/* Layered translucent surface. `featured` adds the iridescent liquid edge
   (use sparingly — active/important surfaces only). */
export function LiquidGlassPanel({ className = "", featured = false, bright = false, grain = false, children, ...rest }) {
  return (
    <section
      className={`glass ${featured ? "glass-featured" : ""} ${bright ? "glass-bright" : ""} ${grain ? "glass-grain" : ""} ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

/* Illuminated liquid-crystal control. Renders <a> when href is given. */
export function LiquidButton({ href, variant = "", size = "", block = false, className = "", children, ...rest }) {
  const cls = `lbtn ${variant ? `lbtn-${variant}` : ""} ${size ? `lbtn-${size}` : ""} ${block ? "lbtn-block" : ""} ${className}`;
  if (href) {
    return <Link href={href} className={cls} {...rest}>{children}</Link>;
  }
  return (
    <motion.button whileTap={{ scale: 0.965 }} transition={spring} className={cls} {...rest}>
      {children}
    </motion.button>
  );
}

/* Glossy stat gauge with readable label row. */
export function StatGauge({ label, value, display, color, max = 100, thin = false }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="gauge">
      <div className="gauge-head">
        <strong>{label}</strong>
        <span className="num muted">{display ?? `${value} / ${max}`}</span>
      </div>
      <div className="gauge-track" style={thin ? { height: 7 } : {}} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <motion.span
          className="gauge-fill"
          initial={false}
          animate={{ width: pct + "%" }}
          transition={spring}
          style={{ background: color || "linear-gradient(180deg,#8ff2dc,#2cbfa3 60%,#17876f)" }}
        />
      </div>
    </div>
  );
}

/* Touch-friendly quest row on glass. */
export function QuestCard({ title, meta = [], done = false, busy = false, checkLabel, onToggle, actions, tone }) {
  return (
    <motion.div layout className={`glass qcard ${done ? "done" : ""}`} style={{ borderRadius: 16 }} transition={spring}>
      <button
        type="button"
        className="qcard-check"
        disabled={busy}
        onClick={onToggle}
        aria-label={checkLabel || (done ? `Reopen ${title}` : `Complete ${title}`)}
        aria-pressed={done}
      >
        <Check aria-hidden="true" strokeWidth={3.5} />
      </button>
      <div className="qcard-body">
        <strong className="qcard-title">{title}</strong>
        {meta.length > 0 && <div className="qcard-meta">{meta}</div>}
      </div>
      {actions}
    </motion.div>
  );
}

/* Reward toast: gold-rimmed glass, pops with a spring. */
export function RewardToast({ icon, children }) {
  return (
    <div className="rtoast" role="status">
      {icon}
      <span>{children}</span>
    </div>
  );
}

/* Glass bottom nav with active liquid indicator. */
export function BottomNav({ items, active }) {
  return (
    <nav className="bnav" aria-label="Primary mobile">
      {items.map((n) => {
        const Icon = n.icon;
        const isActive = active === n.key;
        return (
          <Link key={n.key} href={n.href} aria-current={isActive ? "page" : undefined}>
            {isActive ? (
              <motion.span layoutId="bnav-liquid" transition={spring} style={{ position: "absolute", inset: 2, borderRadius: 14, zIndex: -1 }} aria-hidden="true" />
            ) : null}
            <Icon aria-hidden="true" />
            {n.label}
            {n.badge ? <span className="nav-badge num" style={{ position: "absolute", top: 4, right: "50%", marginRight: -22 }}>{n.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/* Accessible modal on liquid glass: Escape, backdrop click, focus on open. */
export function LiquidModal({ title, children, onClose, actions, wide = false }) {
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

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={spring}
          className="dialog glass"
          style={wide ? { maxWidth: 580 } : {}}
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
        >
          <h2>{title}</h2>
          <div>{children}</div>
          {actions && <div className="dialog-actions">{actions}</div>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
