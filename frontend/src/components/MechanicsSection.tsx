import { motion, type Easing } from "framer-motion";

const EASE_OUT: Easing = [0.25, 0.46, 0.45, 0.94] as unknown as Easing;

const CARDS = [
  {
    index: "01",
    label: "MINT",
    title: "Attention Mints $HYPE",
    body: "When Google Trends score for NEAR hits ≥ 92, the oracle pushes a mint event. Tokens release from the rewards pool into circulating supply.",
    icon: "↑",
    color: "#16a34a",
    bg: "#f0fdf4",
    border: "#bbf7d0",
  },
  {
    index: "02",
    label: "BURN",
    title: "Silence Burns Supply",
    body: "Score below 87 and the contract burns tokens permanently. Deflationary pressure keeps $HYPE scarce during quiet market periods.",
    icon: "↓",
    color: "#dc2626",
    bg: "#fef2f2",
    border: "#fecaca",
  },
  {
    index: "03",
    label: "STREAK",
    title: "Consecutive Mints Bonus",
    body: "Three mints in a row unlocks a +50% streak bonus. Holders who rode the wave of NEAR attention earn a larger share of newly minted supply.",
    icon: "⚡",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  },
];

export default function MechanicsSection() {
  return (
    <section
      id="mechanics"
      style={{
        background: "var(--bg)",
        padding: "120px 24px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          style={{ textAlign: "center", marginBottom: 64 }}
        >
          <p style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "var(--accent)",
            textTransform: "uppercase",
            marginBottom: 12,
          }}>
            How It Works
          </p>
          <h2 style={{
            fontFamily: "var(--sans)",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.2,
          }}>
            Attention as a Price Signal
          </h2>
          <p style={{
            marginTop: 16,
            color: "var(--muted)",
            fontSize: "1.05rem",
            maxWidth: 520,
            margin: "16px auto 0",
            lineHeight: 1.6,
          }}>
            $HYPE is a memecoin whose supply is algorithmically tied to real-world interest in NEAR Protocol, measured via Google Trends.
          </p>
        </motion.div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24,
        }}>
          {CARDS.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{
                duration: 0.6,
                delay: i * 0.15,
                ease: EASE_OUT,
              }}
              style={{
                background: card.bg,
                border: `1px solid ${card.border}`,
                borderRadius: 20,
                padding: "32px 28px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Decorative large icon in background */}
              <div style={{
                position: "absolute",
                top: -10,
                right: 16,
                fontSize: 80,
                opacity: 0.06,
                lineHeight: 1,
                userSelect: "none",
                pointerEvents: "none",
              }}>
                {card.icon}
              </div>

              {/* Icon circle */}
              <div style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: card.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                marginBottom: 20,
              }}>
                {card.icon}
              </div>

              {/* Label */}
              <p style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "0.2em",
                color: card.color,
                textTransform: "uppercase",
                marginBottom: 8,
              }}>
                {card.index} · {card.label}
              </p>

              {/* Title */}
              <h3 style={{
                fontFamily: "var(--sans)",
                fontSize: "1.2rem",
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 12,
                lineHeight: 1.3,
              }}>
                {card.title}
              </h3>

              {/* Body */}
              <p style={{
                fontSize: "0.9rem",
                color: "var(--muted)",
                lineHeight: 1.65,
              }}>
                {card.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
