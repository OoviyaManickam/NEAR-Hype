import {
  NearBindgen,
  near,
  call,
  view,
  initialize,
  NearPromise,
} from "near-sdk-js";

// ─── Immutable launch parameters ────────────────────────────────────────────
const TOTAL_SUPPLY      = 1_000_000_000n; // 1B tokens (no decimals for simplicity)
const REWARDS_POOL_PCT  = 60n;            // 60% in rewards pool
const MINT_THRESHOLD    = 92;             // trends score >= 92 → mint (calibrated to 1-H NEAR data)
const BURN_THRESHOLD    = 87;             // trends score < 87  → burn
const MINT_PER_TICK     = 10_000n;        // tokens released from pool per mint tick
const BURN_PCT          = 2n;             // 2% of treasury burns per burn tick
const STREAK_MULTIPLIER_THRESHOLD = 3;   // 3 consecutive mints → 1.5x next mint
const STREAK_BONUS_PCT  = 50n;           // +50% on streak bonus tick

@NearBindgen({})
export class HypeToken {
  constructor() {
    // Token metadata
    this.name           = "HYPE";
    this.symbol         = "HYPE";
    this.keyword        = "NEAR";          // locked forever at deploy

    // Supply state
    this.totalSupply    = TOTAL_SUPPLY.toString();
    this.rewardsPool    = ((TOTAL_SUPPLY * REWARDS_POOL_PCT) / 100n).toString();
    this.treasury       = ((TOTAL_SUPPLY * 20n) / 100n).toString();
    this.circulatingSupply = ((TOTAL_SUPPLY * 20n) / 100n).toString(); // 20% initial liquidity

    // Balances map: account_id → amount (string)
    this.balances       = {};

    // Oracle state
    this.oracleAccount  = "";              // set at init
    this.latestScore    = 0;
    this.lastUpdateTime = 0;

    // Streak state
    this.consecutiveMints = 0;
    this.totalMintEvents  = 0;
    this.totalBurnEvents  = 0;
    this.longestStreak    = 0;

    // History (last 50 events)
    this.history        = [];
  }

  @initialize({})
  init({ oracle_account, owner_account }) {
    this.oracleAccount = oracle_account;
    // Give owner the initial liquidity allocation
    const initLiquidity = (TOTAL_SUPPLY * 20n) / 100n;
    this.balances[owner_account] = initLiquidity.toString();
    near.log(`$HYPE initialized. Oracle: ${oracle_account}. Keyword: ${this.keyword}`);
  }

  // ─── Oracle: update trends score ──────────────────────────────────────────
  @call({})
  update_score({ score }) {
    // Only the oracle account can call this
    if (near.predecessorAccountId() !== this.oracleAccount) {
      throw new Error("Unauthorized: only oracle can update score");
    }
    if (score < 0 || score > 100) {
      throw new Error("Score must be 0-100");
    }

    this.latestScore    = score;
    this.lastUpdateTime = Number(near.blockTimestamp() / 1_000_000n); // ms

    if (score >= MINT_THRESHOLD) {
      this._mint(score);
    } else if (score < BURN_THRESHOLD) {
      this._burn();
    } else {
      // neutral zone — reset streak
      this.consecutiveMints = 0;
      this._addHistory("neutral", score, 0n);
    }
  }

  // ─── Internal mint ────────────────────────────────────────────────────────
  _mint(score) {
    const pool = BigInt(this.rewardsPool);
    if (pool === 0n) {
      near.log("Rewards pool empty — no mint");
      return;
    }

    this.consecutiveMints += 1;
    if (this.consecutiveMints > this.longestStreak) {
      this.longestStreak = this.consecutiveMints;
    }

    // Apply streak bonus every STREAK_MULTIPLIER_THRESHOLD consecutive mints
    let amount = MINT_PER_TICK;
    if (this.consecutiveMints % STREAK_MULTIPLIER_THRESHOLD === 0) {
      amount = amount + (amount * STREAK_BONUS_PCT) / 100n;
      near.log(`Streak bonus applied! ${this.consecutiveMints} consecutive mints`);
    }

    // Cap at remaining pool
    const actual = amount > pool ? pool : amount;

    this.rewardsPool       = (pool - actual).toString();
    this.circulatingSupply = (BigInt(this.circulatingSupply) + actual).toString();
    this.totalMintEvents  += 1;

    this._addHistory("mint", score, actual);
    near.log(`MINT: ${actual} $HYPE released. Pool remaining: ${this.rewardsPool}`);
  }

  // ─── Internal burn ────────────────────────────────────────────────────────
  _burn() {
    const treasury = BigInt(this.treasury);
    if (treasury === 0n) {
      near.log("Treasury empty — nothing to burn");
      return;
    }

    this.consecutiveMints = 0; // reset streak on burn

    const burnAmount = (treasury * BURN_PCT) / 100n;
    this.treasury        = (treasury - burnAmount).toString();
    this.totalSupply     = (BigInt(this.totalSupply) - burnAmount).toString();
    this.totalBurnEvents += 1;

    this._addHistory("burn", this.latestScore, burnAmount);
    near.log(`BURN: ${burnAmount} $HYPE burned. Treasury remaining: ${this.treasury}`);
  }

  // ─── Add to history (keep last 50) ────────────────────────────────────────
  _addHistory(type, score, amount) {
    this.history.push({
      type,
      score,
      amount: amount.toString(),
      timestamp: Number(near.blockTimestamp() / 1_000_000n),
    });
    if (this.history.length > 50) {
      this.history.shift();
    }
  }

  // ─── NEP-141 core views ───────────────────────────────────────────────────
  @view({})
  ft_total_supply() {
    return this.totalSupply;
  }

  @view({})
  ft_balance_of({ account_id }) {
    return this.balances[account_id] ?? "0";
  }

  // ─── NEP-141 transfer ─────────────────────────────────────────────────────
  @call({})
  ft_transfer({ receiver_id, amount, memo }) {
    const sender  = near.predecessorAccountId();
    const sendBal = BigInt(this.balances[sender] ?? "0");
    const amt     = BigInt(amount);

    if (amt <= 0n) throw new Error("Amount must be > 0");
    if (sendBal < amt) throw new Error("Insufficient balance");

    this.balances[sender]      = (sendBal - amt).toString();
    this.balances[receiver_id] = (BigInt(this.balances[receiver_id] ?? "0") + amt).toString();

    near.log(`TRANSFER: ${sender} → ${receiver_id}: ${amount}`);
  }

  // ─── Dashboard views ──────────────────────────────────────────────────────
  @view({})
  get_state() {
    return {
      keyword:           this.keyword,
      latestScore:       this.latestScore,
      lastUpdateTime:    this.lastUpdateTime,
      totalSupply:       this.totalSupply,
      circulatingSupply: this.circulatingSupply,
      rewardsPool:       this.rewardsPool,
      treasury:          this.treasury,
      consecutiveMints:  this.consecutiveMints,
      longestStreak:     this.longestStreak,
      totalMintEvents:   this.totalMintEvents,
      totalBurnEvents:   this.totalBurnEvents,
      mintThreshold:     MINT_THRESHOLD,
      burnThreshold:     BURN_THRESHOLD,
    };
  }

  @view({})
  get_history() {
    return this.history;
  }
}
