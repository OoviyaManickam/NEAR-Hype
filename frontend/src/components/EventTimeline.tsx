import { motion, AnimatePresence } from "framer-motion";

interface HistoryEvent {
  type: "mint" | "burn" | "neutral";
  score: number;
  amount: string;
  timestamp: number;
}

interface EventTimelineProps {
  history: HistoryEvent[];
}

function timeSince(ms: number) {
  if (!ms) return "—";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function fmt(n: string | number) {
  return Number(n).toLocaleString();
}

const EVENT_CONFIG = {
  mint: {
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
    icon: "↑",
    label: "MINT",
  },
  burn: {
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
    icon: "↓",
    label: "BURN",
  },
  neutral: {
    color: "#ca8a04",
    bg: "#fffbeb",
    border: "#fde68a",
    icon: "◆",
    label: "NEUTRAL",
  },
};

export default function EventTimeline({ history }: EventTimelineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.1 }}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: "24px",
        marginBottom: 20,
      }}
    >
      <p style={{
        fontFamily: "var(--mono)",
        fontSize: 10,
        letterSpacing: "0.2em",
        color: "var(--muted)",
        textTransform: "uppercase",
        marginBottom: 20,
      }}>
        Live Event Feed
      </p>

      {history.length === 0 ? (
        <div style={{
          padding: "40px 0",
          textAlign: "center",
          color: "var(--muted)",
          fontSize: 14,
          fontStyle: "italic",
        }}>
          No events yet — oracle hasn't pushed a score.
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {/* Vertical timeline line */}
          <div style={{
            position: "absolute",
            left: 23,
            top: 12,
            bottom: 12,
            width: 2,
            background: "linear-gradient(to bottom, var(--accent), transparent)",
            borderRadius: 2,
          }} />

          <AnimatePresence initial={false}>
            {history.slice(0, 18).map((e, i) => {
              const cfg = EVENT_CONFIG[e.type];
              return (
                <motion.div
                  key={e.timestamp}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                    paddingBottom: i < history.slice(0, 18).length - 1 ? 16 : 0,
                  }}
                >
                  {/* Dot */}
                  <div style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: cfg.color,
                    border: "2px solid var(--bg)",
                    marginTop: 4,
                    flexShrink: 0,
                    position: "relative",
                    zIndex: 1,
                    // Center the dot on the timeline line (left: 23 = 16 gap + 7 offset)
                    marginLeft: 18,
                  }} />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {/* Event type chip */}
                      <span style={{
                        background: cfg.bg,
                        border: `1px solid ${cfg.border}`,
                        color: cfg.color,
                        borderRadius: 50,
                        padding: "2px 10px",
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                      }}>
                        {cfg.icon} {cfg.label}
                      </span>

                      {/* Amount */}
                      {e.type !== "neutral" && (
                        <span style={{
                          fontFamily: "var(--mono)",
                          fontSize: 13,
                          fontWeight: 700,
                          color: cfg.color,
                        }}>
                          {e.type === "mint" ? "+" : "−"}{fmt(e.amount)} $HYPE
                        </span>
                      )}

                      {/* Meta */}
                      <span style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginLeft: "auto",
                        whiteSpace: "nowrap",
                      }}>
                        score {e.score} · {timeSince(e.timestamp)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
