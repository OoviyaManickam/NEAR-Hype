import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface ContractState {
  latestScore: number;
  mintThreshold: number;
  burnThreshold: number;
  keyword: string;
  consecutiveMints: number;
  longestStreak: number;
}

interface ScoreGaugeProps {
  state: ContractState | null;
}

// ── Arc math ──────────────────────────────────────────────────────────────────
const CX = 150, CY = 130, R = 100;
const START_DEG = 225;
const SWEEP_DEG = 270;
const TRACK_LEN = 2 * Math.PI * R * (SWEEP_DEG / 360); // ≈ 471.2

function toRad(deg: number) { return (deg * Math.PI) / 180; }

function pointOnArc(deg: number) {
  return {
    x: CX + R * Math.cos(toRad(deg)),
    y: CY + R * Math.sin(toRad(deg)),
  };
}

function arcPath(startDeg: number, endDeg: number) {
  const s = pointOnArc(startDeg);
  const e = pointOnArc(endDeg);
  const sweep = endDeg - startDeg;
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

const RED_LEN    = TRACK_LEN * (87  / 100);
const YELLOW_LEN = TRACK_LEN * (5   / 100);
const GREEN_LEN  = TRACK_LEN * (8   / 100);

function scoreToColor(score: number, mint: number, burn: number) {
  if (score >= mint) return "#16a34a";
  if (score < burn)  return "#dc2626";
  return "#ca8a04";
}

export default function ScoreGauge({ state }: ScoreGaugeProps) {
  const score = state?.latestScore ?? 0;
  const mint  = state?.mintThreshold ?? 92;
  const burn  = state?.burnThreshold ?? 87;

  const scoreMotion = useMotionValue(0);
  const smoothScore = useSpring(scoreMotion, { stiffness: 70, damping: 22 });

  useEffect(() => { scoreMotion.set(score); }, [score, scoreMotion]);

  // Needle tip
  const needleX = useTransform(smoothScore, (s) => {
    const deg = START_DEG + (s / 100) * SWEEP_DEG;
    return (CX + 78 * Math.cos(toRad(deg))).toFixed(2);
  });
  const needleY = useTransform(smoothScore, (s) => {
    const deg = START_DEG + (s / 100) * SWEEP_DEG;
    return (CY + 78 * Math.sin(toRad(deg))).toFixed(2);
  });

  // Dashoffsets per zone
  const redOffset = useTransform(smoothScore, (s) => {
    const fill = Math.min(s, 87) / 100 * TRACK_LEN;
    return Math.max(0, RED_LEN - fill);
  });
  const yellowOffset = useTransform(smoothScore, (s) => {
    if (s < 87) return YELLOW_LEN;
    const fill = (Math.min(s, 92) - 87) / 100 * TRACK_LEN;
    return Math.max(0, YELLOW_LEN - fill);
  });
  const greenOffset = useTransform(smoothScore, (s) => {
    if (s < 92) return GREEN_LEN;
    const fill = (Math.min(s, 100) - 92) / 100 * TRACK_LEN;
    return Math.max(0, GREEN_LEN - fill);
  });

  // Smooth display score for the HTML number
  const displayScore = useTransform(smoothScore, Math.round);

  const statusLabel = score >= mint ? "↑ Minting" : score < burn ? "↓ Burning" : "◆ Neutral";
  const statusColor = scoreToColor(score, mint, burn);

  const burnTick = pointOnArc(START_DEG + (burn / 100) * SWEEP_DEG);
  const mintTick = pointOnArc(START_DEG + (mint / 100) * SWEEP_DEG);

  const redPath    = arcPath(START_DEG, START_DEG + (87  / 100) * SWEEP_DEG);
  const yellowPath = arcPath(START_DEG + (87  / 100) * SWEEP_DEG, START_DEG + (92  / 100) * SWEEP_DEG);
  const greenPath  = arcPath(START_DEG + (92  / 100) * SWEEP_DEG, START_DEG + SWEEP_DEG);
  const trackPath  = arcPath(START_DEG, START_DEG + SWEEP_DEG);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        background: "#fff",
        border: "1px solid #f0f0f0",
        borderRadius: 16,
        padding: "20px 16px 18px",
        textAlign: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Section label */}
      <p style={{
        fontFamily: "var(--sans)",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--muted)",
        marginBottom: 4,
        letterSpacing: "0.01em",
      }}>
        Google Trends · <span style={{ color: "var(--accent)", fontWeight: 700 }}>NEAR</span> · 1H
      </p>

      {/* SVG — arcs and needle only, NO text inside */}
      <svg
        viewBox="0 0 300 210"
        style={{ maxWidth: 300, margin: "0 auto", display: "block", overflow: "visible" }}
      >
        {/* Background track */}
        <path d={trackPath} fill="none" stroke="#e5e7eb" strokeWidth={16} strokeLinecap="round" />

        {/* Red zone arc */}
        <motion.path
          d={redPath} fill="none" stroke="#dc2626" strokeWidth={16} strokeLinecap="round"
          strokeDasharray={RED_LEN} style={{ strokeDashoffset: redOffset }}
        />
        {/* Yellow zone arc */}
        <motion.path
          d={yellowPath} fill="none" stroke="#ca8a04" strokeWidth={16} strokeLinecap="round"
          strokeDasharray={YELLOW_LEN} style={{ strokeDashoffset: yellowOffset }}
        />
        {/* Green zone arc */}
        <motion.path
          d={greenPath} fill="none" stroke="#16a34a" strokeWidth={16} strokeLinecap="round"
          strokeDasharray={GREEN_LEN} style={{ strokeDashoffset: greenOffset }}
        />

        {/* Threshold ticks */}
        <circle cx={burnTick.x} cy={burnTick.y} r={5} fill="#ca8a04" />
        <circle cx={mintTick.x} cy={mintTick.y} r={5} fill="#16a34a" />

        {/* Needle — drawn last so it's always on top */}
        <motion.line
          x1={CX} y1={CY} x2={needleX} y2={needleY}
          stroke={statusColor} strokeWidth={2.5} strokeLinecap="round"
        />
        {/* Hub */}
        <circle cx={CX} cy={CY} r={9} fill={statusColor} />
        <circle cx={CX} cy={CY} r={5} fill="white" />
      </svg>

      {/* Score number and status — sits cleanly below the arc */}
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <motion.div style={{
          fontFamily: "var(--mono)",
          fontSize: 58,
          fontWeight: 700,
          color: statusColor,
          lineHeight: 1,
        }}>
          {displayScore}
        </motion.div>
        <div style={{
          fontFamily: "var(--sans)",
          fontSize: 14,
          fontWeight: 600,
          color: statusColor,
          marginTop: 6,
          letterSpacing: "0.01em",
        }}>
          {statusLabel}
        </div>
      </div>

      {/* Threshold pills */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 16 }}>
        <div style={{
          background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 50,
          padding: "4px 12px", fontFamily: "var(--mono)", fontSize: 11, color: "#dc2626",
        }}>
          burn &lt; {burn}
        </div>
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 50,
          padding: "4px 12px", fontFamily: "var(--mono)", fontSize: 11, color: "#16a34a",
        }}>
          mint ≥ {mint}
        </div>
      </div>

      {/* Streak info */}
      {state && (
        <div style={{
          marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)",
          display: "flex", justifyContent: "center", gap: 40,
        }}>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700, color: "#d97706" }}>
              {state.consecutiveMints}
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              streak
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>
              {state.longestStreak}
            </div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              best streak
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
