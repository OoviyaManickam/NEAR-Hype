import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  signIn, signOut, getAccountId, getSelector,
  getBalance, getHistory, getContractState, CONTRACT_ID,
} from "../near";
import Navbar from "../components/Navbar";

interface HistoryEvent {
  type: "mint" | "burn" | "neutral";
  score: number;
  amount: string;
  timestamp: number;
}

interface ContractState {
  circulatingSupply: string;
  totalSupply: string;
  latestScore: number;
  mintThreshold: number;
  burnThreshold: number;
}

const NEAR_USD_APPROX = 4.2;  // rough testnet display value

function fmt(n: string | number) {
  return Number(n).toLocaleString();
}

function timeSince(ms: number) {
  if (!ms) return "—";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function Badge({ type }: { type: "mint" | "burn" | "neutral" }) {
  const map = {
    mint:    { label: "MINT",    bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
    burn:    { label: "BURN",    bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
    neutral: { label: "HOLD",   bg: "#fafaf8", color: "#6b7280", border: "#e8e4dc" },
  };
  const s = map[type];
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 50,
      padding: "2px 10px",
      fontSize: 10,
      fontFamily: "var(--mono)",
      fontWeight: 700,
      letterSpacing: "0.1em",
    }}>
      {s.label}
    </span>
  );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: 18,
      padding: "24px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: "var(--mono)",
      fontSize: 10,
      letterSpacing: "0.18em",
      color: "var(--muted)",
      textTransform: "uppercase",
      marginBottom: 16,
    }}>{children}</p>
  );
}

// ── Stat Row ──────────────────────────────────────────────────────────────────
function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "11px 0",
      borderBottom: "1px solid var(--border)",
    }}>
      <span style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--sans)" }}>{label}</span>
      <span style={{
        fontSize: 14,
        fontFamily: "var(--mono)",
        fontWeight: 700,
        color: accent ?? "var(--text)",
      }}>{value}</span>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyWallet({ onConnect }: { onConnect: () => void }) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 80,
      gap: 20,
      textAlign: "center",
    }}>
      <div style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: "rgba(245,158,11,0.08)",
        border: "1px dashed rgba(245,158,11,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 28,
      }}>
        🪙
      </div>
      <div>
        <h2 style={{
          fontFamily: "var(--sans)",
          fontSize: "1.3rem",
          fontWeight: 700,
          color: "var(--text)",
          marginBottom: 8,
        }}>
          Connect your wallet
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", maxWidth: 340, lineHeight: 1.6 }}>
          Connect your NEAR wallet to see your $HYPE balance, purchase history, and portfolio breakdown.
        </p>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={onConnect}
          style={{
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            color: "#fff",
            border: "none",
            borderRadius: 50,
            padding: "13px 32px",
            fontSize: "0.9rem",
            fontFamily: "var(--sans)",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(245,158,11,0.3)",
          }}
        >
          Connect Wallet
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            background: "none",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: 50,
            padding: "13px 24px",
            fontSize: "0.9rem",
            fontFamily: "var(--sans)",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          View Dashboard ↗
        </button>
      </div>
    </div>
  );
}

// ── Portfolio Page ────────────────────────────────────────────────────────────
export default function Portfolio() {
  const navigate = useNavigate();
  const [walletReady, setWalletReady] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [contractState, setContractState] = useState<ContractState | null>(null);

  const refresh = useCallback(async () => {
    try {
      const id = await getAccountId();
      if (id) {
        const [bal, h, cs] = await Promise.all([
          getBalance(id),
          getHistory(),
          getContractState(),
        ]);
        setBalance(bal);
        setHistory([...(h as HistoryEvent[])].reverse());
        setContractState(cs);
      } else {
        const [h, cs] = await Promise.all([getHistory(), getContractState()]);
        setHistory([...(h as HistoryEvent[])].reverse());
        setContractState(cs);
      }
    } catch (e) {
      console.error("portfolio refresh error", e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const id = await getAccountId();
      setAccountId(id);
      setWalletReady(true);
      await refresh();

      const selector = await getSelector();
      selector.store.observable.subscribe((ss) => {
        const active = ss.accounts.find(a => a.active);
        setAccountId(active?.accountId ?? null);
      });
    })();
  }, [refresh]);

  // Derived values
  const balNum = Number(balance);
  const circNum = contractState ? Number(contractState.circulatingSupply) : 0;
  const portfolioShare = circNum > 0 ? ((balNum / circNum) * 100).toFixed(4) : "0";

  // Estimated NEAR value: 1000 HYPE = 1 NEAR (from buy rate in contract)
  const estimatedNear = (balNum / 1000).toFixed(4);
  const estimatedUsd = ((balNum / 1000) * NEAR_USD_APPROX).toFixed(2);

  // Personal activity: every oracle event touched everyone, so show global history
  // but highlight what the supply was doing when they held
  const mintCount = history.filter(e => e.type === "mint").length;
  const burnCount = history.filter(e => e.type === "burn").length;
  const lastEvent = history[0];

  // Short address display
  const shortId = accountId
    ? `${accountId.slice(0, 8)}...${accountId.slice(-6)}`
    : null;

  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Navbar
        accountId={accountId}
        walletReady={walletReady}
        onSignIn={signIn}
        onSignOut={signOut}
      />

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "40px 28px 80px" }}>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 32 }}
        >
          <p style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "var(--accent)",
            textTransform: "uppercase",
            marginBottom: 6,
          }}>
            Your Portfolio
          </p>
          <h1 style={{
            fontFamily: "var(--sans)",
            fontSize: "2rem",
            fontWeight: 700,
            color: "var(--text)",
            lineHeight: 1.2,
          }}>
            $HYPE Holdings
          </h1>
        </motion.div>

        {/* Wallet not connected */}
        {!accountId && walletReady && (
          <EmptyWallet onConnect={signIn} />
        )}

        {/* Connected — show portfolio */}
        {accountId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >

            {/* ── Top row: Balance card + quick stats ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}>
              {/* Main balance card */}
              <Card style={{
                background: "linear-gradient(135deg, #1a1a2e 0%, #2d1f54 100%)",
                border: "none",
              }}>
                <CardTitle>
                  <span style={{ color: "rgba(251,191,36,0.6)" }}>Your balance</span>
                </CardTitle>
                <div style={{
                  fontFamily: "var(--mono)",
                  fontSize: 44,
                  fontWeight: 700,
                  color: "#fbbf24",
                  lineHeight: 1,
                  marginBottom: 6,
                }}>
                  {fmt(balNum)}
                </div>
                <div style={{
                  fontFamily: "var(--sans)",
                  fontSize: 16,
                  color: "rgba(251,191,36,0.7)",
                  marginBottom: 20,
                }}>
                  $HYPE tokens
                </div>

                <div style={{
                  display: "flex",
                  gap: 16,
                  paddingTop: 16,
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--sans)", marginBottom: 2 }}>
                      Est. NEAR value
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 16, color: "#fff", fontWeight: 700 }}>
                      {estimatedNear} NEAR
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "var(--sans)", marginBottom: 2 }}>
                      Est. USD value
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 16, color: "#fff", fontWeight: 700 }}>
                      ~${estimatedUsd}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Position details */}
              <Card>
                <CardTitle>Position details</CardTitle>
                <StatRow label="Account" value={shortId!} />
                <StatRow
                  label="Share of supply"
                  value={`${portfolioShare}%`}
                  accent="var(--accent)"
                />
                <StatRow
                  label="Circulating supply"
                  value={fmt(circNum)}
                />
                <StatRow
                  label="Oracle score (live)"
                  value={contractState?.latestScore?.toString() ?? "—"}
                  accent={
                    (contractState?.latestScore ?? 0) >= (contractState?.mintThreshold ?? 92)
                      ? "var(--green)"
                      : (contractState?.latestScore ?? 0) < (contractState?.burnThreshold ?? 87)
                      ? "var(--red)"
                      : "var(--yellow)"
                  }
                />
                <div style={{ height: 1 }} />
                <button
                  onClick={() => navigate("/dashboard")}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "11px 0",
                    fontSize: "0.85rem",
                    fontFamily: "var(--sans)",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Buy more $HYPE →
                </button>
              </Card>
            </div>

            {/* ── Activity summary ── */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginBottom: 16,
            }}>
              {[
                { label: "Mint events (global)", value: mintCount, icon: "↑", color: "var(--green)" },
                { label: "Burn events (global)", value: burnCount, icon: "↓", color: "var(--red)" },
                { label: "Last oracle update", value: lastEvent ? timeSince(lastEvent.timestamp) : "—", icon: "🕐", color: "var(--muted)" },
              ].map(item => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--sans)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {item.label}
                    </span>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                  </div>
                  <div style={{
                    fontFamily: "var(--mono)",
                    fontSize: 24,
                    fontWeight: 700,
                    color: item.color,
                  }}>
                    {item.value}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* ── Oracle history table ── */}
            <Card>
              <CardTitle>Oracle event history</CardTitle>
              {history.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 13, fontFamily: "var(--sans)", padding: "12px 0" }}>
                  No oracle events recorded yet.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Event", "Score", "Amount", "When"].map(h => (
                          <th key={h} style={{
                            textAlign: "left",
                            padding: "6px 12px 10px",
                            fontSize: 10,
                            fontFamily: "var(--mono)",
                            letterSpacing: "0.12em",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            borderBottom: "1px solid var(--border)",
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.slice(0, 20).map((ev, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "10px 12px" }}>
                            <Badge type={ev.type} />
                          </td>
                          <td style={{
                            padding: "10px 12px",
                            fontFamily: "var(--mono)",
                            fontSize: 13,
                            color: "var(--text)",
                          }}>
                            {ev.score}
                          </td>
                          <td style={{
                            padding: "10px 12px",
                            fontFamily: "var(--mono)",
                            fontSize: 13,
                            color: ev.type === "mint" ? "var(--green)" : ev.type === "burn" ? "var(--red)" : "var(--muted)",
                          }}>
                            {ev.type === "mint" ? "+" : ev.type === "burn" ? "-" : ""}{fmt(ev.amount)}
                          </td>
                          <td style={{
                            padding: "10px 12px",
                            fontFamily: "var(--sans)",
                            fontSize: 12,
                            color: "var(--muted)",
                          }}>
                            {timeSince(ev.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {history.length > 20 && (
                    <p style={{ textAlign: "center", padding: "12px 0 0", fontSize: 11, color: "var(--muted)", fontFamily: "var(--mono)" }}>
                      showing 20 of {history.length} events
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* ── Contract link ── */}
            <div style={{ textAlign: "center", paddingTop: 20 }}>
              <a
                href={`https://testnet.nearblocks.io/address/${CONTRACT_ID}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--muted)",
                  textDecoration: "none",
                  letterSpacing: "0.05em",
                }}
                onMouseEnter={e => (e.target as HTMLAnchorElement).style.color = "var(--accent)"}
                onMouseLeave={e => (e.target as HTMLAnchorElement).style.color = "var(--muted)"}
              >
                ↗ {CONTRACT_ID}
              </a>
            </div>

          </motion.div>
        )}
      </main>
    </div>
  );
}
