"use client";

// Six-axis attribute radar as crisp SVG (no chart dependency).
// Values are levels; max sets the outer ring.
export default function RadarChart({ values, max = 10, size = 230, labels }) {
  const keys = Object.keys(values || {});
  const n = keys.length || 1;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 34;
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, frac) => [cx + Math.cos(angle(i)) * R * frac, cy + Math.sin(angle(i)) * R * frac];

  const rings = [0.33, 0.66, 1];
  const poly = keys
    .map((k, i) => pt(i, Math.max(0.06, Math.min(1, (values[k] || 0) / max))).join(","))
    .join(" ");

  return (
    <div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Attribute radar chart" style={{ maxWidth: "100%", height: "auto", display: "block", margin: "0 auto" }}>
        {rings.map((f) => (
          <polygon
            key={f}
            points={keys.map((_, i) => pt(i, f).join(",")).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,.12)"
            strokeWidth={1}
          />
        ))}
        {keys.map((_, i) => {
          const [x, y] = pt(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.1)" strokeWidth={1} />;
        })}
        <polygon points={poly} fill="rgba(69,184,240,.22)" stroke="#45b8f0" strokeWidth={2} strokeLinejoin="round" />
        {keys.map((k, i) => {
          const [x, y] = pt(i, Math.max(0.06, Math.min(1, (values[k] || 0) / max)));
          return <circle key={k} cx={x} cy={y} r={3.5} fill="#45b8f0" />;
        })}
        {keys.map((k, i) => {
          const [x, y] = pt(i, 1.18);
          return (
            <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={600} fill="#a6adbb">
              {k} · {values[k] || 0}
            </text>
          );
        })}
      </svg>
      <ul className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {keys.map((k) => (
          <li key={k}>{labels?.[k] || k}: level {values[k] || 0}</li>
        ))}
      </ul>
    </div>
  );
}
