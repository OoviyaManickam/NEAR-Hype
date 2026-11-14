import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  signIn, signOut, getAccountId, getSelector,
  getContractState, getHistory, getBalance, ensureStorageRegistered,
  buyHype, CONTRACT_ID,
} from "../near";
import ScoreGauge from "../components/ScoreGauge";
import SupplyChart from "../components/SupplyChart";
import Navbar from "../components/Navbar";

interface ContractState {
  keyword: string;
  latestScore: number;
  lastUpdateTime: number;
  totalSupply: string;
  circulatingSupply: string;
  rewardsPool: string;
  treasury: string;
  consecutiveMints: number;
  longestStreak: number;
  totalMintEvents: number;
  totalBurnEvents: number;
  mintThreshold: number;
  burnThreshold: number;
}

interface HistoryEvent {
  type: "mint" | "burn" | "neutral";
  score: number;
  amount: string;
  timestamp: number;
}

function fmt(n: string | number) {
  return Number(n).toLocaleString();
}

function timeSince(ms: number) {
  if (!ms) return "never";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

// ── KPI Card  ─────────────────────────────────────────────────────────────────
// Matches screenshot: label top-left, value large, trend chip, compare text
function KpiCard({
  label, value, trend, trendLabel, icon, iconBg,
}: {
  label: string;
  value: string | number;
  trend?: number;          // positive = green, negative = red
  trendLabel?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #f0f0f0",
      borderRadius: 16,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{
          fontSize: 13,
          fontWeight: 500,
          color: "#6b7280",
          fontFamily: "var(--sans)",
        }}>{label}</span>
        <span style={{
          width: 32, height: 32,
          borderRadius: 8,
          background: iconBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, flexShrink: 0,
        }}>{icon}</span>
      </div>

      <div style={{
        fontFamily: "var(--sans)",
        fontSize: 30,
        fontWeight: 700,
        color: "#111827",
        lineHeight: 1.1,
      }}>
        {value}
      </div>

      {trend !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 2,
            background: up ? "#f0fdf4" : "#fef2f2",
            color: up ? "#16a34a" : "#dc2626",
            borderRadius: 50,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "var(--sans)",
          }}>
            {up ? "▲" : "▼"} {Math.abs(trend)}%
          </span>
          {trendLabel && (
            <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "var(--sans)" }}>
              {trendLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Oracle Event Table ────────────────────────────────────────────────────────
const EVENT_CFG = {
  mint:    { label: "MINT",    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "↑" },
  burn:    { label: "BURN",    color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: "↓" },
  neutral: { label: "HOLD",   color: "#ca8a04", bg: "#fffbeb", border: "#fde68a", icon: "◆" },
};

function EventTable({ history }: { history: HistoryEvent[] }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #f0f0f0",
      borderRadius: 16,
      padding: "20px 22px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16,
      }}>
        <span style={{
          fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: "var(--sans)",
        }}>Oracle Events</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="pulse" style={{ width: 6, height: 6 }} />
          <span style={{ fontSize: 11, color: "#9ca3af", fontFamily: "var(--sans)" }}>Live</span>
        </div>
      </div>

      {history.length === 0 ? (
        <div style={{
          padding: "32px 0", textAlign: "center",
          color: "#9ca3af", fontSize: 13, fontStyle: "italic", fontFamily: "var(--sans)",
        }}>
          No events yet — oracle hasn't pushed a score.
        </div>
      ) : (
        <>
          {/* Header row */}
          <div style={{
            display: "grid", gridTemplateColumns: "80px 1fr 120px 80px 90px",
            padding: "0 0 10px",
            borderBottom: "1px solid #f3f4f6",
          }}>
            {["Event", "Amount", "Score", "Time", ""].map(h => (
              <span key={h} style={{
                fontSize: 11, fontWeight: 600, color: "#9ca3af",
                textTransform: "uppercase", letterSpacing: "0.06em",
                fontFamily: "var(--sans)",
              }}>{h}</span>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {history.slice(0, 12).map((e, i) => {
              const cfg = EVENT_CFG[e.type];
              return (
                <motion.div
                  key={e.timestamp}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: i * 0.03 }}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 120px 80px 90px",
                    alignItems: "center",
                    padding: "11px 0",
                    borderBottom: i < 11 ? "1px solid #f9fafb" : "none",
                  }}
                >
                  {/* Badge */}
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                    borderRadius: 50, padding: "3px 10px",
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                    fontFamily: "var(--mono)", width: "fit-content",
                  }}>
                    {cfg.icon} {cfg.label}
                  </span>

                  {/* Amount */}
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: e.type === "mint" ? "#16a34a" : e.type === "burn" ? "#dc2626" : "#9ca3af",
                    fontFamily: "var(--mono)",
                  }}>
                    {e.type !== "neutral" ? `${e.type === "mint" ? "+" : "−"}${fmt(e.amount)} HYPE` : "—"}
                  </span>

                  {/* Score */}
                  <span style={{ fontSize: 13, color: "#374151", fontFamily: "var(--mono)" }}>
                    {e.score}
                  </span>

                  {/* Time */}
                  <span style={{ fontSize: 12, color: "#9ca3af", fontFamily: "var(--sans)" }}>
                    {timeSince(e.timestamp)}
                  </span>

                  {/* Explorer link */}
                  <a
                    href={`https://testnet.nearblocks.io/address/${CONTRACT_ID}`}
                    target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: "#f59e0b", textDecoration: "none", fontFamily: "var(--sans)" }}
                  >
                    View ↗
                  </a>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

// ── Buy Panel (inline, no component file change needed) ───────────────────────
function BuyWidget({
  accountId, nearInput, setNearInput, txStatus, balance, onBuy,
}: {
  accountId: string | null;
  nearInput: string;
  setNearInput: (v: string) => void;
  txStatus: { type: "pending" | "success" | "error"; msg: string } | null;
  balance: string;
  onBuy: () => void;
}) {
  const nearAmt = parseFloat(nearInput);
  const hypePreview = isNaN(nearAmt) || nearAmt <= 0 ? 0 : Math.floor(nearAmt * 1000);

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #f0f0f0",
      borderRadius: 16,
      padding: "20px 22px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: "var(--sans)", marginBottom: 16 }}>
        Buy $HYPE
      </div>

      {accountId && (
        <div style={{
          background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10,
          padding: "10px 14px", marginBottom: 14,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 12, color: "#92400e", fontFamily: "var(--sans)" }}>Your balance</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, color: "#d97706" }}>
            {Number(balance).toLocaleString()} HYPE
          </span>
        </div>
      )}

      <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 5, fontFamily: "var(--sans)" }}>
        Amount in NEAR
      </label>
      <input
        type="number" min="0.001" step="0.1" value={nearInput}
        onChange={e => setNearInput(e.target.value)}
        placeholder="1"
        style={{
          width: "100%", padding: "11px 13px",
          background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10,
          fontSize: 15, fontFamily: "var(--mono)", color: "#111827",
          outline: "none", transition: "border-color 0.15s", marginBottom: 10,
          boxSizing: "border-box",
        }}
        onFocus={e => (e.target.style.borderColor = "#f59e0b")}
        onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
      />

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "9px 12px", background: "#f9fafb", borderRadius: 8, marginBottom: 14,
      }}>
        <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "var(--sans)" }}>You receive</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b", fontFamily: "var(--mono)" }}>
          {hypePreview.toLocaleString()} HYPE
        </span>
      </div>

      <button
        onClick={onBuy}
        disabled={txStatus?.type === "pending"}
        style={{
          width: "100%",
          background: txStatus?.type === "pending" ? "#e5e7eb" : "linear-gradient(135deg,#f59e0b,#d97706)",
          color: txStatus?.type === "pending" ? "#9ca3af" : "#fff",
          border: "none", borderRadius: 10, padding: "13px",
          fontSize: 14, fontFamily: "var(--sans)", fontWeight: 700,
          cursor: txStatus?.type === "pending" ? "not-allowed" : "pointer",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={e => { if (txStatus?.type !== "pending") (e.currentTarget as HTMLButtonElement).style.opacity = "0.9"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      >
        {txStatus?.type === "pending" ? "Processing…" : accountId ? "Buy $HYPE →" : "Connect Wallet"}
      </button>

      {txStatus && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: 10, padding: "9px 12px", borderRadius: 8, fontSize: 12,
            fontFamily: "var(--sans)",
            background: txStatus.type === "success" ? "#f0fdf4" : txStatus.type === "error" ? "#fef2f2" : "#f9fafb",
            color: txStatus.type === "success" ? "#16a34a" : txStatus.type === "error" ? "#dc2626" : "#6b7280",
            border: `1px solid ${txStatus.type === "success" ? "#bbf7d0" : txStatus.type === "error" ? "#fecaca" : "#e5e7eb"}`,
          }}
        >
          {txStatus.msg}
        </motion.div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: "#9ca3af", textAlign: "center", fontFamily: "var(--sans)" }}>
        1 NEAR = 1,000 HYPE · fixed rate
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [walletReady, setWalletReady] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [state, setState] = useState<ContractState | null>(null);
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [balance, setBalance] = useState<string>("0");
  const [nearInput, setNearInput] = useState("1");
  const [txStatus, setTxStatus] = useState<{ type: "pending" | "success" | "error"; msg: string } | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([getContractState(), getHistory()]);
      setState(s);
      setHistory([...(h as HistoryEvent[])].reverse());
      setLastRefresh(new Date());
      const id = await getAccountId();
      if (id) setBalance(await getBalance(id));
    } catch (e) { console.error("refresh error", e); }
  }, []);

  useEffect(() => {
    (async () => {
      const id = await getAccountId();
      setAccountId(id);
      setWalletReady(true);
      await refresh();
      const selector = await getSelector();
      selector.store.observable.subscribe((ss) => {
        setAccountId(ss.accounts.find(a => a.active)?.accountId ?? null);
      });
    })();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function handleBuy() {
    if (!accountId) { signIn(); return; }
    const amt = parseFloat(nearInput);
    if (isNaN(amt) || amt <= 0) return;
    setTxStatus({ type: "pending", msg: "Registering storage + buying $HYPE..." });
    try {
      await ensureStorageRegistered(accountId);
      await buyHype(nearInput);
      setTxStatus({ type: "success", msg: `Bought ${Math.floor(amt * 1000).toLocaleString()} $HYPE!` });
      setTimeout(refresh, 2000);
    } catch (e: unknown) {
      setTxStatus({ type: "error", msg: e instanceof Error ? e.message : "Transaction failed" });
    }
  }

  const totalEvents = (state?.totalMintEvents ?? 0) + (state?.totalBurnEvents ?? 0);
  const mintRatio   = totalEvents > 0
    ? Math.round((state!.totalMintEvents / totalEvents) * 100)
    : 0;

  return (
    <div style={{ background: "#f8f9fb", minHeight: "100vh" }}>
      <Navbar accountId={accountId} walletReady={walletReady} onSignIn={signIn} onSignOut={signOut} />

      {/* Thin live-refresh banner */}
      {lastRefresh && (
        <div style={{
          background: "#fff", borderBottom: "1px solid #f0f0f0",
          padding: "5px 28px", display: "flex", alignItems: "center", gap: 7,
          fontSize: 11, color: "#9ca3af", fontFamily: "var(--sans)",
        }}>
          <div className="pulse" style={{ width: 6, height: 6 }} />
          Auto-refresh every 15s · last updated {timeSince(lastRefresh.getTime())}
        </div>
      )}

      <main style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 28px 80px" }}>

        {/* Page title + contract link */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 22,
        }}>
          <div>
            <h1 style={{
              fontFamily: "var(--sans)", fontSize: 22, fontWeight: 700,
              color: "#111827", margin: 0,
            }}>Dashboard</h1>
            <p style={{ fontFamily: "var(--sans)", fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
              Google Trends oracle · NEAR testnet
            </p>
          </div>
          <a
            href={`https://testnet.nearblocks.io/address/${CONTRACT_ID}`}
            target="_blank" rel="noreferrer"
            style={{
              fontFamily: "var(--mono)", fontSize: 11, color: "#9ca3af",
              textDecoration: "none", transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.target as HTMLAnchorElement).style.color = "#f59e0b"}
            onMouseLeave={e => (e.target as HTMLAnchorElement).style.color = "#9ca3af"}
          >
            ↗ {CONTRACT_ID}
          </a>
        </div>

        {/* ── Row 1 — 4 KPI cards ──────────────────────────────────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20,
        }}>
          <KpiCard
            label="Trend Score"
            value={state?.latestScore ?? "—"}
            trend={state ? (state.latestScore >= state.mintThreshold ? 5 : state.latestScore < state.burnThreshold ? -5 : 0) : undefined}
            trendLabel="vs threshold"
            icon="📈"
            iconBg="#eff6ff"
          />
          <KpiCard
            label="Circulating Supply"
            value={state ? fmt(state.circulatingSupply) : "—"}
            trend={mintRatio > 50 ? mintRatio - 50 : undefined}
            trendLabel={`${mintRatio}% mint ratio`}
            icon="🪙"
            iconBg="#fffbeb"
          />
          <KpiCard
            label="Mint Events"
            value={state?.totalMintEvents ?? "—"}
            trend={mintRatio}
            trendLabel="of all events"
            icon="↑"
            iconBg="#f0fdf4"
          />
          <KpiCard
            label="Burn Events"
            value={state?.totalBurnEvents ?? "—"}
            trend={mintRatio > 0 ? -(100 - mintRatio) : undefined}
            trendLabel="of all events"
            icon="↓"
            iconBg="#fef2f2"
          />
        </div>

        {/* ── Row 2 — Supply chart (2/3) + Score gauge (1/3) ──────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 340px", gap: 14, marginBottom: 14,
        }}>
          {/* Supply chart card */}
          <div style={{
            background: "#fff", border: "1px solid #f0f0f0", borderRadius: 16,
            padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: "var(--sans)" }}>
                  Supply History
                </div>
                {state?.circulatingSupply && (
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#111827", fontFamily: "var(--sans)", marginTop: 2 }}>
                    {fmt(state.circulatingSupply)}
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af", marginLeft: 6 }}>HYPE circulating</span>
                  </div>
                )}
              </div>
              {state && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  background: mintRatio >= 50 ? "#f0fdf4" : "#fef2f2",
                  color: mintRatio >= 50 ? "#16a34a" : "#dc2626",
                  borderRadius: 50, padding: "3px 10px",
                  fontSize: 11, fontWeight: 700, fontFamily: "var(--sans)",
                }}>
                  {mintRatio >= 50 ? "▲" : "▼"} {mintRatio}% mint ratio
                </span>
              )}
            </div>
            <SupplyChart history={history} circulatingSupply={state?.circulatingSupply} />
          </div>

          {/* Score gauge */}
          <ScoreGauge state={state} />
        </div>

        {/* ── Row 3 — Events table (left) + Buy panel (right) ─────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 340px", gap: 14,
        }}>
          <EventTable history={history} />

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <BuyWidget
              accountId={accountId}
              nearInput={nearInput}
              setNearInput={setNearInput}
              txStatus={txStatus}
              balance={balance}
              onBuy={handleBuy}
            />

            {/* Streak card */}
            {state && (
              <div style={{
                background: "#fff", border: "1px solid #f0f0f0", borderRadius: 16,
                padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", fontFamily: "var(--sans)", marginBottom: 14 }}>
                  Streak Stats
                </div>
                <div style={{ display: "flex", gap: 0 }}>
                  {[
                    { label: "Current streak", value: state.consecutiveMints, color: "#f59e0b" },
                    { label: "Best streak", value: state.longestStreak, color: "#111827" },
                    { label: "Rewards pool", value: fmt(state.rewardsPool), color: "#111827", small: true },
                  ].map(item => (
                    <div key={item.label} style={{
                      flex: 1,
                      borderRight: "1px solid #f3f4f6",
                      paddingRight: 16, marginRight: 16,
                    }}>
                      <div style={{
                        fontFamily: "var(--mono)", fontSize: item.small ? 16 : 22,
                        fontWeight: 700, color: item.color, lineHeight: 1,
                      }}>
                        {item.value}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontFamily: "var(--sans)", marginTop: 4 }}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
