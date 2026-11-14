/**
 * Landing page — $HYPE
 *
 * Plan (tasteskill, kind: software)
 * Deal: split hero · nav-centre · footer-dark · close-type · dark-band · pill buttons · wordmark
 * Voice: technical-dry with proof (register 2)
 * Limit stated: the oracle decides, not you
 *
 * Sections (1 screen each unless noted):
 *   1. hero — split: copy left, live score gauge fragment right
 *   2. app-frame — full oracle dashboard fragment (2 screens)
 *   3. features — bento 3-card: MINT / BURN / STREAK
 *   4. how — steps, dark-band: 3 mechanism steps
 *   5. limit — split-text-left: honest admission
 *   6. footer.closing — close-type + footer-dark
 */

import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

// ─── Micro components ─────────────────────────────────────────────────────────

function PillBadge({ children, color = "var(--accent)" }: { children: React.ReactNode; color?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em",
      color, border: `1px solid ${color}`,
      borderRadius: 100, padding: "4px 12px",
      opacity: 0.85,
    }}>
      {children}
    </span>
  );
}

// Live-looking score gauge — actual rendered SVG, not a 3D scene
function ScoreFragment({ score = 74 }: { score?: number }) {
  const CX = 120, CY = 110, R = 82;
  const startDeg = 215, sweep = 290;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (deg: number) => ({
    x: CX + R * Math.cos(toRad(deg)),
    y: CY + R * Math.sin(toRad(deg)),
  });
  const arc = (s: number, e: number) => {
    const a = pt(s), b = pt(e);
    return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} A ${R} ${R} 0 ${e - s > 180 ? 1 : 0} 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  };
  const trackEnd = startDeg + sweep;
  const fillEnd  = startDeg + (score / 100) * sweep;
  const needleDeg = fillEnd;
  const nx = CX + 66 * Math.cos(toRad(needleDeg));
  const ny = CY + 66 * Math.sin(toRad(needleDeg));
  const color = score >= 92 ? "#16a34a" : score < 87 ? "#dc2626" : "#ca8a04";
  const label = score >= 92 ? "MINTING" : score < 87 ? "BURNING" : "NEUTRAL";

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #eeebff",
      borderRadius: 16,
      padding: "28px 24px 20px",
      boxShadow: "0 2px 24px rgba(26,26,46,0.06)",
      maxWidth: 280,
    }}>
      <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", marginBottom: 4 }}>
        GOOGLE TRENDS · NEAR · LIVE
      </p>
      <svg viewBox="0 0 240 165" style={{ width: "100%", overflow: "visible" }}>
        {/* Track */}
        <path d={arc(startDeg, trackEnd)} fill="none" stroke="#f0eeff" strokeWidth={14} strokeLinecap="round" />
        {/* Filled arc */}
        <path d={arc(startDeg, fillEnd)} fill="none" stroke={color} strokeWidth={14} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
        {/* Threshold ticks */}
        {[87, 92].map(t => {
          const d = startDeg + (t / 100) * sweep;
          const inner = { x: CX + (R - 12) * Math.cos(toRad(d)), y: CY + (R - 12) * Math.sin(toRad(d)) };
          const outer = { x: CX + (R + 4)  * Math.cos(toRad(d)), y: CY + (R + 4)  * Math.sin(toRad(d)) };
          return <line key={t} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke={t === 92 ? "#16a34a" : "#ca8a04"} strokeWidth={2.5} strokeLinecap="round" />;
        })}
        {/* Needle */}
        <line x1={CX} y1={CY} x2={nx.toFixed(1)} y2={ny.toFixed(1)}
          stroke={color} strokeWidth={2} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={7} fill={color} />
        <circle cx={CX} cy={CY} r={3.5} fill="#fff" />
      </svg>

      <div style={{ textAlign: "center", marginTop: -8 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 52, fontWeight: 700, color, lineHeight: 1 }}>{score}</div>
        <div style={{
          display: "inline-block", marginTop: 8,
          fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.1em",
          color, background: color + "18", borderRadius: 100, padding: "3px 12px",
        }}>{label}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: "1px solid #f3f0ff" }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>burn &lt; 87</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--muted)" }}>mint ≥ 92</span>
      </div>
    </div>
  );
}

// App-frame: the dashboard as it actually looks — real HTML, not a screenshot
function AppFrameFragment() {
  const events = [
    { type: "MINT", score: 94, amount: "+500", time: "2m ago", color: "#16a34a" },
    { type: "BURN", score: 84, amount: "−320", time: "17m ago", color: "#dc2626" },
    { type: "MINT", score: 93, amount: "+500", time: "32m ago", color: "#16a34a" },
  ];

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #ebe8ff",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 4px 40px rgba(26,26,46,0.08)",
      fontFamily: "var(--mono)",
    }}>
      {/* Browser chrome */}
      <div style={{ background: "#f5f3ff", padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #ebe8ff" }}>
        {["#ff5f57","#febc2e","#28c840"].map((c, i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c, display: "inline-block" }} />
        ))}
        <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>hype-token-test.testnet · oracle dashboard</span>
      </div>

      <div style={{ padding: "20px 20px 16px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "CIRCULATING", value: "48,200", unit: "$HYPE" },
          { label: "ORACLE SCORE", value: "74", unit: "/ 100" },
          { label: "MINT STREAK", value: "2", unit: "consecutive" },
        ].map(k => (
          <div key={k.label} style={{ background: "#fafaf8", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>{k.unit}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 20px 20px" }}>
        <div style={{ fontSize: 9, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 10 }}>RECENT ORACLE EVENTS</div>
        {events.map((e, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "9px 0", borderBottom: i < events.length - 1 ? "1px solid #f3f0ff" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                color: e.color, background: e.color + "18", borderRadius: 4, padding: "2px 8px",
              }}>{e.type}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>score {e.score}</span>
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: e.color }}>{e.amount}</span>
              <span style={{ fontSize: 10, color: "var(--muted)" }}>{e.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

// ─── Dashboard collage — replica of the reference screenshot ─────────────────
// White cards on soft blue-grey, dashed grid, stacked bars + line chart + keyword list

function DashboardCollage() {
  // Bar chart data: weekly NEAR trends score breakdown (Mint / Neutral / Burn %)
  const weeks = [
    { label: "1 Nov", mint: 45, neutral: 30, burn: 25 },
    { label: "8 Nov", mint: 38, neutral: 32, burn: 30 },
    { label: "15 Nov", mint: 55, neutral: 28, burn: 17 },
    { label: "22 Nov", mint: 70, neutral: 20, burn: 10 },
    { label: "30 Nov", mint: 62, neutral: 22, burn: 16 },
  ];

  // Line chart: average NEAR trends score over 6 weeks
  const lineData = [48, 55, 42, 68, 75, 58, 82, 71, 88, 94, 76, 83];
  const LW = 340, LH = 120, LP = 12;
  const lplotW = LW - LP * 2, lplotH = LH - LP * 2;
  const lx = (i: number) => LP + (i / (lineData.length - 1)) * lplotW;
  const ly = (v: number) => LP + lplotH - (v / 100) * lplotH;
  const lPath = lineData.map((v, i) => `${i === 0 ? "M" : "L"} ${lx(i).toFixed(1)} ${ly(v).toFixed(1)}`).join(" ");

  // Keywords (top right card)
  const keywords = [
    { name: "NEAR Protocol", score: 74, delta: "+15", status: "Neutral", color: "#6b7280", bar: "#e5e7eb" },
    { name: "NEAR token", score: 50, delta: "+8",  status: "Burning",  color: "#dc2626", bar: "#fecaca" },
    { name: "NEAR crypto",  score: 92, delta: "+22", status: "Minting",  color: "#16a34a", bar: "#bbf7d0" },
  ];

  // Dashed grid lines helper
  const gridY = [0, 25, 50, 75, 100];

  const BAR_W = 300, BAR_H = 160, BAR_PL = 28, BAR_PR = 48, BAR_PT = 16, BAR_PB = 28;
  const bplotW = BAR_W - BAR_PL - BAR_PR;
  const bplotH = BAR_H - BAR_PT - BAR_PB;
  const bx = (i: number) => BAR_PL + (i + 0.5) * (bplotW / weeks.length);
  const bBarW = (bplotW / weeks.length) * 0.55;
  const bpct = (v: number) => (v / 100) * bplotH;

  return (
    <div style={{
      position: "relative",
      width: "100%",
      height: 420,
      background: "linear-gradient(135deg, #eef2f7 0%, #e8eef5 100%)",
      borderRadius: 20,
      overflow: "hidden",
      userSelect: "none",
    }}>
      {/* ── Top-left card: Oracle Score Summary (stacked bar) ── */}
      <div style={{
        position: "absolute", top: 24, left: 16,
        background: "#fff",
        borderRadius: 16,
        padding: "18px 18px 14px",
        boxShadow: "0 8px 32px rgba(30,40,80,0.10)",
        width: 310,
        transform: "perspective(900px) rotateY(2deg) rotateX(-2deg)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
            Oracle Score Summary
          </span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#9ca3af" }}>Last 30 days ▾</span>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
          {[
            { label: "Minting", color: "#6ee7b7" },
            { label: "Neutral", color: "#d1d5db" },
            { label: "Burning", color: "#fca5a5" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: "inline-block" }} />
              <span style={{ fontFamily: "var(--sans)", fontSize: 10, color: "#6b7280" }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Bar chart SVG */}
        <svg viewBox={`0 0 ${BAR_W} ${BAR_H}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
          {/* Dashed grid lines */}
          {gridY.map(pct => {
            const gy = BAR_PT + bplotH - (pct / 100) * bplotH;
            return (
              <g key={pct}>
                <line x1={BAR_PL} y1={gy} x2={BAR_PL + bplotW} y2={gy}
                  stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4 4" />
                <text x={BAR_PL + bplotW + 4} y={gy + 4}
                  fontFamily="system-ui" fontSize={8} fill="#d1d5db">{pct}%</text>
              </g>
            );
          })}

          {/* Stacked bars */}
          {weeks.map((w, i) => {
            const x = bx(i) - bBarW / 2;
            const burnH = bpct(w.burn);
            const neutH = bpct(w.neutral);
            const mintH = bpct(w.mint);
            const base = BAR_PT + bplotH;
            return (
              <g key={w.label}>
                {/* Burn (bottom) */}
                <rect x={x} y={base - burnH} width={bBarW} height={burnH}
                  fill="#fca5a5" rx={2} />
                {/* Neutral */}
                <rect x={x} y={base - burnH - neutH} width={bBarW} height={neutH}
                  fill="#d1d5db" />
                {/* Mint (top) */}
                <rect x={x} y={base - burnH - neutH - mintH} width={bBarW} height={mintH}
                  fill="#6ee7b7" rx={2} />
                {/* X label */}
                <text x={bx(i)} y={base + 10} textAnchor="middle"
                  fontFamily="system-ui" fontSize={8} fill="#9ca3af">{w.label}</text>
              </g>
            );
          })}
        </svg>

        <div style={{ fontFamily: "var(--sans)", fontSize: 10, color: "#9ca3af", marginTop: 4 }}>
          Last update: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>

      {/* ── Top-right card: Keywords ── */}
      <div style={{
        position: "absolute", top: 16, right: 12,
        background: "#fff",
        borderRadius: 14,
        padding: "14px 14px 10px",
        boxShadow: "0 6px 24px rgba(30,40,80,0.10)",
        width: 190,
        transform: "perspective(900px) rotateY(-3deg) rotateX(-1deg)",
      }}>
        <div style={{ fontFamily: "var(--sans)", fontSize: 11, fontWeight: 700, color: "#1a1a2e", marginBottom: 10, letterSpacing: "0.04em" }}>
          GOOGLE TRENDS
        </div>
        {keywords.map((k, i) => (
          <div key={k.name} style={{
            paddingBottom: i < keywords.length - 1 ? 10 : 0,
            marginBottom: i < keywords.length - 1 ? 10 : 0,
            borderBottom: i < keywords.length - 1 ? "1px solid #f3f4f6" : "none",
          }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 10, color: "#6b7280", marginBottom: 3 }}>{k.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 4, height: 28, borderRadius: 2, background: k.bar }} />
              <div>
                <span style={{ fontFamily: "var(--sans)", fontSize: 18, fontWeight: 800, color: "#1a1a2e" }}>{k.score}</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 11, color: k.color, marginLeft: 4, fontWeight: 600 }}>{k.delta}</span>
                <span style={{ fontFamily: "var(--sans)", fontSize: 10, color: "#9ca3af", marginLeft: 4 }}>{k.status}</span>
              </div>
            </div>
          </div>
        ))}
        <button style={{
          marginTop: 10, width: "100%",
          background: "#f59e0b", border: "none", borderRadius: 8,
          padding: "7px 0", fontFamily: "var(--sans)", fontSize: 11,
          fontWeight: 700, color: "#fff", cursor: "pointer", letterSpacing: "0.04em",
        }}>+ Add keyword</button>
      </div>

      {/* ── Bottom card: Average Trend Score (line chart) ── */}
      <div style={{
        position: "absolute", bottom: 18, left: 48,
        background: "#fff",
        borderRadius: 16,
        padding: "16px 16px 12px",
        boxShadow: "0 8px 32px rgba(30,40,80,0.10)",
        width: 340,
        transform: "perspective(900px) rotateY(2deg) rotateX(1deg)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontFamily: "var(--sans)", fontSize: 13, fontWeight: 700, color: "#1a1a2e" }}>
            Average Trend Score
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          {/* Big number */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--sans)", fontSize: 44, fontWeight: 900, color: "#1a1a2e", lineHeight: 1 }}>74</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 3, marginTop: 4,
              background: "#f0fdf4", borderRadius: 100, padding: "2px 8px",
              fontFamily: "var(--sans)", fontSize: 10, color: "#16a34a", fontWeight: 600,
            }}>↑ +12 <span style={{ color: "#9ca3af", fontWeight: 400 }}>vs last month</span></div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 10, color: "#16a34a", fontWeight: 600, marginTop: 2 }}>Good</div>
          </div>

          {/* Line chart */}
          <svg viewBox={`0 0 ${LW} ${LH}`} style={{ flex: 1, display: "block", overflow: "visible" }}>
            {/* Dashed grid */}
            {[0, 25, 50, 75, 100].map(pct => {
              const gy = LP + lplotH - (pct / 100) * lplotH;
              return (
                <line key={pct} x1={LP} y1={gy} x2={LP + lplotW} y2={gy}
                  stroke="#e5e7eb" strokeWidth={1} strokeDasharray="4 4" />
              );
            })}
            {/* Mint threshold */}
            <line x1={LP} y1={ly(92)} x2={LP + lplotW} y2={ly(92)}
              stroke="#dc2626" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
            <text x={LP + lplotW + 3} y={ly(92) + 4} fontFamily="system-ui" fontSize={8} fill="#dc2626" opacity={0.6}>92</text>

            {/* Line */}
            <path d={lPath} fill="none" stroke="#3b82f6" strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round" />

            {/* Dots at peaks */}
            {lineData.map((v, i) => v > 85 ? (
              <circle key={i} cx={lx(i)} cy={ly(v)} r={3.5}
                fill="#3b82f6" stroke="#fff" strokeWidth={1.5} />
            ) : null)}

            {/* X axis labels */}
            {["1 Nov","8 Nov","15 Nov","22 Nov","30 Nov"].map((lbl, i) => (
              <text key={lbl} x={lx(Math.round(i * (lineData.length - 1) / 4))} y={LP + lplotH + 14}
                textAnchor="middle" fontFamily="system-ui" fontSize={8} fill="#9ca3af">{lbl}</text>
            ))}
          </svg>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
          <span style={{
            fontFamily: "var(--sans)", fontSize: 10, color: "#3b82f6", fontWeight: 600, cursor: "pointer",
          }}>View details →</span>
        </div>
      </div>
    </div>
  );
}

// kept for potential future use
function _TrendsPanelUnused() { return null; }

function Hero({ onCta }: { onCta: () => void }) {
  return (
    <section className="hero" id="top" data-enter style={{ overflow: "hidden" }}>
      <div className="wrap">
        <div className="split hero-split">
          {/* Left: copy */}
          <div>
            <PillBadge>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", animation: "pulse 2s infinite" }} />
              NEAR TESTNET · LIVE
            </PillBadge>

            <h1 style={{
              fontFamily: "var(--sans)",
              fontSize: "clamp(52px, 6.5vw, 88px)",
              fontWeight: 800,
              color: "var(--text)",
              lineHeight: 0.96,
              letterSpacing: "-0.04em",
              margin: "20px 0 0",
            }}>
              $HYPE
            </h1>

            <p style={{
              fontFamily: "var(--sans)",
              fontSize: "clamp(17px, 2vw, 21px)",
              fontWeight: 500,
              color: "var(--text)",
              lineHeight: 1.35,
              marginTop: 20,
              maxWidth: 380,
            }}>
              A NEAR token whose supply is decided by Google Trends.
            </p>

            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={onCta}
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 100,
                  padding: "14px 32px",
                  fontFamily: "var(--sans)",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                  transition: "transform 0.15s ease, background 0.15s ease",
                }}
                onMouseEnter={e => { (e.currentTarget).style.background = "var(--accent2)"; (e.currentTarget).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget).style.background = "var(--accent)"; (e.currentTarget).style.transform = "translateY(0)"; }}
              >
                Get Hyped →
              </button>
              <a
                href="#how"
                onClick={e => { e.preventDefault(); document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }); }}
                style={{
                  fontFamily: "var(--sans)", fontSize: 14, color: "var(--muted)",
                  textDecoration: "none", letterSpacing: "0.01em",
                  transition: "color 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--text)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted)"; }}
              >
                How it works ↓
              </a>
            </div>

            <div style={{ marginTop: 40, display: "flex", gap: 36 }}>
              {[
                { n: "≥ 92", l: "Mint score" },
                { n: "< 87",  l: "Burn score" },
                { n: "3rd",   l: "Streak bonus" },
              ].map(f => (
                <div key={f.l}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{f.n}</div>
                  <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--muted)", marginTop: 3 }}>{f.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: dashboard collage */}
          <div className="hero-visual">
            <DashboardCollage />
          </div>
        </div>
      </div>

      <style>{`
        .hero-split { align-items: center; }
        .hero-visual { display: block; }
        @media (max-width: 1023px) {
          .hero-visual { display: none; }
        }
      `}</style>
    </section>
  );
}

function AppFrameSection() {
  return (
    <section id="dashboard-preview" className="ground-surface">
      <div className="wrap">
        <div style={{ marginBottom: 40 }}>
          <h2 style={{
            fontFamily: "var(--sans)", fontSize: "clamp(30px, 4vw, 48px)", fontWeight: 700,
            color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>
            The oracle dashboard,<br />in the open.
          </h2>
          <p style={{ fontSize: 16, color: "var(--muted)", marginTop: 12, maxWidth: 480, lineHeight: 1.65 }}>
            Every mint, every burn, and the live Trends score that drove them — on-chain,
            readable, not under a paywall.
          </p>
        </div>
        <AppFrameFragment />
      </div>
    </section>
  );
}

function FeaturesSection() {
  const cards = [
    {
      tag: "MINT",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      title: "Score hits 92.",
      body: "The oracle reads Google Trends. When NEAR attention crosses 92, it mints 500 $HYPE into circulation. No manual trigger.",
      detail: "500 $HYPE per mint event",
    },
    {
      tag: "BURN",
      color: "#dc2626",
      bg: "#fef2f2",
      border: "#fecaca",
      title: "Score drops below 87.",
      body: "Attention falls — the oracle burns 320 $HYPE. Supply contracts without a governance vote or a team decision.",
      detail: "320 $HYPE per burn event",
    },
    {
      tag: "STREAK",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
      title: "Third consecutive mint.",
      body: "Three mints in a row earn a streak bonus. Sustained attention is rewarded with an extra 250 tokens.",
      detail: "250 $HYPE streak bonus",
    },
  ];

  return (
    <section id="mechanics">
      <div className="wrap">
        <h2 style={{
          fontFamily: "var(--sans)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700,
          color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 36,
        }}>
          Three rules. No exceptions.
        </h2>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20,
        }}
          className="features-grid">
          {cards.map(c => (
            <div key={c.tag} className="card-lift" style={{
              background: "#fff",
              border: `1px solid ${c.border}`,
              borderRadius: 14,
              padding: "28px 24px",
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <span style={{
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em",
                color: c.color, background: c.bg, borderRadius: 100,
                padding: "3px 12px", alignSelf: "flex-start",
              }}>{c.tag}</span>
              <h3 style={{
                fontFamily: "var(--sans)", fontSize: 20, fontWeight: 700,
                color: "var(--text)", lineHeight: 1.2, letterSpacing: "-0.02em",
              }}>{c.title}</h3>
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.65 }}>{c.body}</p>
              <div style={{
                marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${c.border}`,
                fontFamily: "var(--mono)", fontSize: 12, color: c.color, fontWeight: 500,
              }}>{c.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .features-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 639px) {
          .features-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function HowSection() {
  const steps = [
    {
      n: "01",
      title: "Attention sampled",
      body: `Every interval, the oracle queries Google Trends for the keyword "NEAR" and returns a score from 0 to 100.`,
    },
    {
      n: "02",
      title: "Threshold checked",
      body: "Score ≥ 92: mint. Score < 87: burn. Between 87 and 91: nothing moves. The contract enforces this.",
    },
    {
      n: "03",
      title: "Chain updated",
      body: "The oracle signs a transaction on NEAR testnet. $HYPE supply changes. The event is on-chain and public.",
    },
  ];

  return (
    <section id="how" className="ground-inverse">
      <div className="wrap">
        <h2 style={{
          fontFamily: "var(--sans)", fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 700,
          color: "#f8f8f2", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 48,
        }}>
          How the oracle works.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }} className="steps-grid">
          {steps.map(s => (
            <div key={s.n}>
              <div style={{
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em",
                color: "var(--accent)", marginBottom: 16,
              }}>{s.n}</div>
              <h3 style={{
                fontFamily: "var(--sans)", fontSize: 20, fontWeight: 700,
                color: "#f8f8f2", lineHeight: 1.2, letterSpacing: "-0.02em", marginBottom: 12,
              }}>{s.title}</h3>
              <p style={{ fontSize: 15, color: "#9ca3af", lineHeight: 1.7 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 639px) { .steps-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function LimitSection({ onCta }: { onCta: () => void }) {
  return (
    <section id="limit">
      <div className="wrap">
        <div className="split" style={{ alignItems: "center" }}>
          <div>
            <PillBadge color="var(--muted)">One honest thing</PillBadge>
            <h2 style={{
              fontFamily: "var(--sans)", fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 700,
              color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 16,
            }}>
              You cannot mint on demand.
            </h2>
            <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, marginTop: 16, maxWidth: 400 }}>
              The oracle runs on a schedule. Between intervals, there are no buttons.
              If the score does not clear 92, no $HYPE enters the supply — regardless
              of price, demand, or what you want.
            </p>
            <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, marginTop: 12, maxWidth: 400 }}>
              That is the point.
            </p>
            <button
              onClick={onCta}
              style={{
                display: "inline-block",
                marginTop: 28,
                background: "var(--accent)",
                color: "#fff",
                border: "none",
                borderRadius: 100,
                padding: "13px 28px",
                fontFamily: "var(--sans)",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                transition: "transform 0.15s ease, background 0.15s ease",
              }}
              onMouseEnter={e => { (e.currentTarget).style.background = "var(--accent2)"; (e.currentTarget).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget).style.background = "var(--accent)"; (e.currentTarget).style.transform = "translateY(0)"; }}
            >
              Watch the oracle →
            </button>
          </div>

          {/* Right: diagram card — how the oracle feeds the chain */}
          <div style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "32px 28px",
            fontFamily: "var(--mono)",
          }}>
            <div style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 24 }}>ORACLE FLOW</div>

            {[
              { label: "Google Trends", sub: "score 0–100", icon: "📊" },
              { label: "Oracle contract", sub: "hype-token-test.testnet", icon: "⚙️", accent: true },
              { label: "$HYPE supply", sub: "NEP-141 token", icon: "◈" },
            ].map((node, i) => (
              <div key={node.label}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px",
                  background: node.accent ? "rgba(245,158,11,0.07)" : "#fff",
                  border: node.accent ? "1px solid rgba(245,158,11,0.3)" : "1px solid var(--border)",
                  borderRadius: 8,
                }}>
                  <span style={{ fontSize: 20 }}>{node.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{node.label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{node.sub}</div>
                  </div>
                </div>
                {i < 2 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 24px" }}>
                    <svg width="24" height="20" viewBox="0 0 24 20" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M12 0 L12 12 M8 8 L12 12 L16 8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="6" r="2" fill="var(--accent)" style={{ animation: "travel 1.2s linear infinite" }}>
                        <animateMotion dur="1.4s" repeatCount="indefinite" path="M0,0 L0,10" />
                      </circle>
                    </svg>
                    <span style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.08em" }}>
                      {i === 0 ? "score ≥ 92 or < 87" : "mint / burn tx"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ onCta }: { onCta: () => void }) {
  return (
    <footer className="closing ground-inverse" style={{
      padding: "80px 0 0",
      minHeight: "100svh",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
    }}>
      {/* Close: type */}
      <div className="wrap" style={{ paddingBottom: 64 }}>
        <p style={{
          fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.12em",
          color: "var(--accent)", marginBottom: 20,
        }}>
          NEAR TESTNET · NEP-141 · hype-token-test.testnet
        </p>
        <h2 style={{
          fontFamily: "var(--sans)", fontSize: "clamp(32px, 5vw, 64px)", fontWeight: 800,
          color: "#f8f8f2", letterSpacing: "-0.04em", lineHeight: 1.0, maxWidth: 700,
          marginBottom: 32,
        }}>
          Supply changes when attention does.
        </h2>
        <button
          onClick={onCta}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            borderRadius: 100,
            padding: "15px 36px",
            fontFamily: "var(--sans)",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
            transition: "transform 0.15s ease, background 0.15s ease",
          }}
          onMouseEnter={e => { (e.currentTarget).style.background = "var(--accent2)"; (e.currentTarget).style.transform = "translateY(-1px)"; }}
          onMouseLeave={e => { (e.currentTarget).style.background = "var(--accent)"; (e.currentTarget).style.transform = "translateY(0)"; }}
        >
          Get Hyped →
        </button>
      </div>

      {/* Footer links */}
      <div className="wrap" style={{
        paddingBottom: 32, paddingTop: 32,
        borderTop: "1px solid rgba(248,248,242,0.1)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 16,
      }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>$HYPE</span>
        <nav style={{ display: "flex", gap: 24 }}>
          {[["Dashboard", "/dashboard"], ["Portfolio", "/portfolio"]].map(([label, path]) => (
            <a key={path} href={path} style={{
              fontFamily: "var(--sans)", fontSize: 13, color: "#9ca3af",
              textDecoration: "none", transition: "color 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#f8f8f2"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#9ca3af"; }}
            >{label}</a>
          ))}
        </nav>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "#4b5563" }}>Testnet only — not financial advice</span>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate();
  const toDash = () => navigate("/dashboard");

  return (
    <div id="landing-root" className="m-enter" style={{ background: "var(--bg)" }}>
      <Navbar />
      <main>
        <Hero onCta={toDash} />
        <AppFrameSection />
        <FeaturesSection />
        <HowSection />
        <LimitSection onCta={toDash} />
      </main>
      <Footer onCta={toDash} />
    </div>
  );
}
