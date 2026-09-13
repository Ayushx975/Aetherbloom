"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Card({ className = "", hover = false, children, ...rest }) {
  return (
    <section className={`card ${hover ? "card-hover" : ""} ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function SectionHead({ title, action }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function Progress({ value, max = 100, gold = false, label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`progress ${gold ? "gold" : ""}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label || "Progress"}>
      <span style={{ width: pct + "%" }} />
    </div>
  );
}

export function Avatar({ name, size = "", frameGold = false }) {
  const initial = (name || "H").trim().charAt(0).toUpperCase() || "H";
  return (
    <span className={`avatar ${size} ${frameGold ? "gold-frame" : ""}`} aria-hidden="true">
      {initial}
    </span>
  );
}

export function EmptyState({ icon, title, body, action }) {
  return (
    <div className="empty">
      {icon}
      <strong>{title}</strong>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toast({ icon, children }) {
  return (
    <div className="toast" role="status">
      {icon}
      <span>{children}</span>
    </div>
  );
}

// Accessible modal: Escape to close, backdrop click, initial focus on primary action.
export function Dialog({ title, children, onClose, actions, wide = false }) {
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
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="dialog"
          style={wide ? { maxWidth: 560 } : {}}
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

export function Skeleton({ style }) {
  return <div className="skeleton" style={style} aria-hidden="true" />;
}
