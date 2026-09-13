"use client";
import { useEffect, useRef, useState } from "react";

// Animated numeral: eases from previous to next value.
// Jumps instantly under prefers-reduced-motion. Tabular figures via .num.
export default function CountUp({ value, duration = 700, className = "", style }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={`num ${className}`} style={style}>
      {display.toLocaleString("en-IN")}
    </span>
  );
}
