import { motion } from "framer-motion";

interface BuyPanelProps {
  accountId: string | null;
  nearInput: string;
  setNearInput: (v: string) => void;
  txStatus: { type: "pending" | "success" | "error"; msg: string } | null;
  balance: string;
  onBuy: () => void;
}

export default function BuyPanel({
  accountId,
  nearInput,
  setNearInput,
  txStatus,
  balance,
  onBuy,
}: BuyPanelProps) {
  const nearAmt = parseFloat(nearInput);
  const hypePreview = isNaN(nearAmt) || nearAmt <= 0
    ? 0
    : Math.floor(nearAmt * 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
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
        Buy $HYPE
      </p>

      {/* Input */}
      <div style={{ marginBottom: 12 }}>
        <label style={{
          fontSize: 11,
          color: "var(--muted)",
          display: "block",
          marginBottom: 6,
          fontFamily: "var(--mono)",
        }}>
          Amount (NEAR)
        </label>
        <input
          type="number"
          min="0.001"
          step="0.1"
          value={nearInput}
          onChange={e => setNearInput(e.target.value)}
          placeholder="1"
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontSize: 16,
            fontFamily: "var(--mono)",
            color: "var(--text)",
            outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--accent)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {/* Rate preview */}
      <div style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>
          You receive
        </span>
        <span style={{
          fontFamily: "var(--mono)",
          fontSize: 15,
          fontWeight: 700,
          color: "var(--accent)",
        }}>
          {hypePreview.toLocaleString()} $HYPE
        </span>
      </div>

      <div style={{
        fontSize: 11,
        color: "var(--muted)",
        fontFamily: "var(--mono)",
        marginBottom: 16,
        textAlign: "center",
      }}>
        Rate: 1 NEAR = 1,000 $HYPE (fixed)
      </div>

      {/* Buy button */}
      <button
        onClick={onBuy}
        disabled={txStatus?.type === "pending"}
        style={{
          background: txStatus?.type === "pending"
            ? "#e5e7eb"
            : "linear-gradient(135deg, #f59e0b, #d97706)",
          color: txStatus?.type === "pending" ? "var(--muted)" : "#fff",
          border: "none",
          borderRadius: 12,
          padding: "14px",
          fontSize: "1rem",
          fontFamily: "var(--sans)",
          fontWeight: 700,
          cursor: txStatus?.type === "pending" ? "not-allowed" : "pointer",
          transition: "transform 0.15s ease",
          letterSpacing: "0.02em",
        }}
        onMouseEnter={e => {
          if (txStatus?.type !== "pending") {
            (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={e => {
          (e.target as HTMLButtonElement).style.transform = "translateY(0)";
        }}
      >
        {txStatus?.type === "pending"
          ? "Processing..."
          : accountId
          ? "Buy $HYPE"
          : "Connect Wallet"}
      </button>

      {/* Status message */}
      {txStatus && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: "var(--mono)",
            background:
              txStatus.type === "success" ? "#f0fdf4"
              : txStatus.type === "error" ? "#fef2f2"
              : "var(--surface2)",
            color:
              txStatus.type === "success" ? "#16a34a"
              : txStatus.type === "error" ? "#dc2626"
              : "var(--muted)",
            border: `1px solid ${
              txStatus.type === "success" ? "#bbf7d0"
              : txStatus.type === "error" ? "#fecaca"
              : "var(--border)"
            }`,
          }}
        >
          {txStatus.msg}
        </motion.div>
      )}

      {/* Balance */}
      {accountId && (
        <div style={{
          marginTop: 16,
          paddingTop: 16,
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--mono)" }}>
            Your balance
          </span>
          <span style={{
            fontFamily: "var(--mono)",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--accent)",
          }}>
            {Number(balance).toLocaleString()} $HYPE
          </span>
        </div>
      )}
    </motion.div>
  );
}
