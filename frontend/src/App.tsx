import { useEffect, useState, useCallback } from "react";
import {
  signIn, signOut, getAccountId, getSelector,
  getContractState, getHistory, getBalance, ensureStorageRegistered,
  buyHype, CONTRACT_ID,
} from "./near";

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

function scoreClass(score: number, mint: number, burn: number) {
  if (score >= mint) return "mint";
  if (score < burn) return "burn";
  return "neutral";
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

export default function App() {
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
      if (id) {
        const bal = await getBalance(id);
        setBalance(bal);
      }
    } catch (e) {
      console.error("refresh error", e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const id = await getAccountId();
      setAccountId(id);
      setWalletReady(true);
      await refresh();

      // Subscribe to wallet-selector account changes (connect/disconnect)
      const selector = await getSelector();
      selector.store.observable.subscribe((state) => {
        const active = state.accounts.find(a => a.active);
        setAccountId(active?.accountId ?? null);
      });
    })();
  }, [refresh]);

  // auto-refresh every 15s
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
    } catch (e: any) {
      setTxStatus({ type: "error", msg: e?.message ?? "Transaction failed" });
    }
  }

  const sc = state ? scoreClass(state.latestScore, state.mintThreshold, state.burnThreshold) : "neutral";

  const eventIcon = (t: string) => t === "mint" ? "🟢" : t === "burn" ? "🔴" : "🟡";
  const eventTitle = (e: HistoryEvent) => {
    if (e.type === "mint") return `Minted ${fmt(e.amount)} $HYPE`;
    if (e.type === "burn") return `Burned ${fmt(e.amount)} $HYPE`;
    return "Neutral — no change";
  };

  return (
    <>
      <header className="header">
        <div className="logo">
          <h1>$HYPE</h1>
          <span>The Attention Token</span>
        </div>
        {walletReady && (
          accountId ? (
            <button className="wallet-btn connected" onClick={signOut}>
              {accountId.length > 20 ? accountId.slice(0, 18) + "…" : accountId} · Sign out
            </button>
          ) : (
            <button className="wallet-btn" onClick={signIn}>
              Connect Meteor Wallet
            </button>
          )
        )}
      </header>

      {lastRefresh && (
        <div className="refresh-bar">
          <div className="pulse" />
          Live · refreshes every 15s · last {timeSince(lastRefresh.getTime())}
        </div>
      )}

      {/* Row 1: Score + Stats */}
      <div className="grid">
        <div className="card">
          <h2>Google Trends · NEAR · 1H</h2>
          <div className="score-display">
            <div className={`score-number ${sc}`}>
              {state ? state.latestScore : "—"}
            </div>
            <span className={`score-label ${sc}`}>
              {sc === "mint" ? "↑ Minting" : sc === "burn" ? "↓ Burning" : "◆ Neutral"}
            </span>
            <div className="keyword-pill">
              Tracking <span>{state?.keyword ?? "NEAR"}</span>
            </div>
            <div className="thresholds">
              <span className="t-mint">mint ≥ {state?.mintThreshold ?? 92}</span>
              <span>·</span>
              <span className="t-burn">burn &lt; {state?.burnThreshold ?? 87}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Token Supply</h2>
          <div className="stat-value">{state ? fmt(state.circulatingSupply) : "—"}</div>
          <div className="stat-sub">circulating $HYPE</div>

          <div style={{ marginTop: 16 }}>
            <div className="stat-value" style={{ fontSize: "1.1rem" }}>
              {state ? fmt(state.rewardsPool) : "—"}
            </div>
            <div className="stat-sub">rewards pool remaining</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="stat-value" style={{ fontSize: "1.1rem" }}>
              {state ? fmt(state.totalSupply) : "—"}
            </div>
            <div className="stat-sub">total supply (deflationary)</div>
          </div>
        </div>
      </div>

      {/* Row 2: Three stat cards */}
      <div className="grid-3">
        <div className="card">
          <h2>Streak</h2>
          <div className="stat-value">{state?.consecutiveMints ?? 0}</div>
          <div className="stat-sub">consecutive mints</div>
          {state && state.consecutiveMints >= 2 && (
            <div className="streak-badge">
              ⚡ {3 - (state.consecutiveMints % 3)} till bonus
            </div>
          )}
          <div style={{ marginTop: 8 }}>
            <div className="stat-sub">longest streak: {state?.longestStreak ?? 0}</div>
          </div>
        </div>

        <div className="card">
          <h2>Events</h2>
          <div style={{ display: "flex", gap: 20, marginTop: 4 }}>
            <div>
              <div className="stat-value" style={{ color: "var(--green)" }}>
                {state?.totalMintEvents ?? 0}
              </div>
              <div className="stat-sub">mints</div>
            </div>
            <div>
              <div className="stat-value" style={{ color: "var(--red)" }}>
                {state?.totalBurnEvents ?? 0}
              </div>
              <div className="stat-sub">burns</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Last Update</h2>
          <div className="stat-value" style={{ fontSize: "1.2rem" }}>
            {state?.lastUpdateTime ? timeSince(state.lastUpdateTime) : "—"}
          </div>
          <div className="stat-sub" style={{ marginTop: 8, fontFamily: "var(--mono)", fontSize: "0.7rem" }}>
            {CONTRACT_ID}
          </div>
        </div>
      </div>

      {/* Row 3: Buy + Feed */}
      <div className="grid">
        <div className="card buy-panel">
          <h2>Buy $HYPE</h2>
          <div className="buy-row">
            <div className="input-group">
              <label>Amount (NEAR)</label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={nearInput}
                onChange={e => setNearInput(e.target.value)}
                placeholder="1"
              />
            </div>
            <button
              className="buy-btn"
              onClick={handleBuy}
              disabled={txStatus?.type === "pending"}
            >
              {accountId ? "Buy $HYPE" : "Connect Wallet"}
            </button>
          </div>

          <div className="rate-hint">
            You receive: <b>{isNaN(parseFloat(nearInput)) ? 0 : Math.floor(parseFloat(nearInput) * 1000).toLocaleString()} $HYPE</b>
            {" "}· rate: 1 NEAR = 1,000 $HYPE (fixed)
          </div>

          {txStatus && (
            <div className={`tx-status ${txStatus.type}`}>{txStatus.msg}</div>
          )}

          {accountId && (
            <div className="balance-row">
              <span className="label">Your $HYPE balance</span>
              <span className="val">{fmt(balance)} $HYPE</span>
            </div>
          )}
        </div>

        <div className="card feed">
          <h2>Live Event Feed</h2>
          {history.length === 0 ? (
            <div className="empty-feed">No events yet — oracle hasn't pushed a score.</div>
          ) : (
            <div className="feed-list">
              {history.slice(0, 20).map((e, i) => (
                <div key={i} className={`feed-item ${e.type}`}>
                  <span className="feed-icon">{eventIcon(e.type)}</span>
                  <div className="feed-body">
                    <div className="feed-title">{eventTitle(e)}</div>
                    <div className="feed-meta">score {e.score} · {timeSince(e.timestamp)}</div>
                  </div>
                  {e.type !== "neutral" && (
                    <span className={`feed-amount ${e.type}`}>
                      {e.type === "mint" ? "+" : "-"}{fmt(e.amount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
