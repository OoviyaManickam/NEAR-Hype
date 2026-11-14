import { useRef, useEffect, useMemo } from "react";

interface HistoryEvent {
  type: "mint" | "burn" | "neutral";
  score: number;
  amount: string;
  timestamp: number;
}

interface SupplyChartProps {
  history: HistoryEvent[];
  circulatingSupply?: string;
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toLocaleString();
}

function timeLabelShort(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function SupplyChart({ history, circulatingSupply }: SupplyChartProps) {
  const lineRef = useRef<SVGPathElement>(null);

  const points = useMemo(() => {
    const chrono = [...history].reverse();
    let running = 0;
    return chrono.map(e => {
      const delta = Number(e.amount) || 0;
      if (e.type === "mint") running += delta;
      if (e.type === "burn") running = Math.max(0, running - delta);
      return { t: e.timestamp, supply: running, type: e.type };
    });
  }, [history]);

  const W = 560, H = 160;
  const PADL = 64, PADR = 20, PADT = 16, PADB = 32;
  const plotW = W - PADL - PADR;
  const plotH = H - PADT - PADB;

  const minT = points[0]?.t ?? 0;
  const maxT = points[points.length - 1]?.t ?? 1;
  const maxS = Math.max(...points.map(p => p.supply), 1) * 1.15;
  const minS = 0;

  const px = (t: number) => PADL + ((t - minT) / Math.max(maxT - minT, 1)) * plotW;
  const py = (s: number) => PADT + plotH - ((s - minS) / (maxS - minS)) * plotH;

  const pathD = points.length < 2
    ? ""
    : "M " + points.map(p => `${px(p.t).toFixed(1)} ${py(p.supply).toFixed(1)}`).join(" L ");

  const areaD = pathD
    ? `${pathD} L ${px(maxT).toFixed(1)} ${(PADT + plotH).toFixed(1)} L ${px(minT).toFixed(1)} ${(PADT + plotH).toFixed(1)} Z`
    : "";

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: py(minS + f * maxS),
    label: fmt(minS + f * maxS),
  }));

  const xTicks = points.length > 1
    ? [0, 0.33, 0.66, 1].map(f => {
        const idx = Math.min(Math.floor(f * (points.length - 1)), points.length - 1);
        return { x: px(points[idx].t), label: timeLabelShort(points[idx].t) };
      })
    : [];

  useEffect(() => {
    const el = lineRef.current;
    if (!el || !pathD) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    el.getBoundingClientRect();
    el.style.transition = "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)";
    el.style.strokeDashoffset = "0";
  }, [pathD]);

  // Suppress unused warning — circulatingSupply is displayed by parent
  void circulatingSupply;

  if (points.length < 2) {
    return (
      <div style={{
        height: H,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#9ca3af", fontSize: 13, fontStyle: "italic", fontFamily: "var(--sans)",
      }}>
        Chart appears after 2+ oracle events.
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", overflow: "visible" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="supplyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={PADL} y1={tick.y} x2={W - PADR} y2={tick.y}
            stroke="#f3f4f6" strokeWidth={1} strokeDasharray={i === 0 ? "0" : "4 4"}
          />
          <text x={PADL - 8} y={tick.y + 4} textAnchor="end"
            fontFamily="Space Mono, monospace" fontSize={9} fill="#d1d5db">
            {tick.label}
          </text>
        </g>
      ))}

      {xTicks.map((tick, i) => (
        <text key={i} x={tick.x} y={H - 4} textAnchor="middle"
          fontFamily="Space Mono, monospace" fontSize={9} fill="#d1d5db">
          {tick.label}
        </text>
      ))}

      {areaD && <path d={areaD} fill="url(#supplyGrad)" />}

      <path
        ref={lineRef} d={pathD} fill="none"
        stroke="#f59e0b" strokeWidth={2.5}
        strokeLinejoin="round" strokeLinecap="round"
      />

      {points.map((p, i) => p.type !== "neutral" && (
        <circle key={i} cx={px(p.t)} cy={py(p.supply)} r={3.5}
          fill={p.type === "mint" ? "#16a34a" : "#dc2626"}
          stroke="white" strokeWidth={1.5}
        />
      ))}
    </svg>
  );
}
