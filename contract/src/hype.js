import {
  NearBindgen,
  near,
  call,
  view,
  initialize,
  NearPromise,
} from "near-sdk-js";

// ─── Immutable launch parameters ────────────────────────────────────────────
const TOTAL_SUPPLY                = 1_000_000_000n; // 1B tokens
const REWARDS_POOL_PCT            = 60n;             // 60% in rewards pool
const MINT_THRESHOLD              = 92;              // trends score >= 92 → mint
const BURN_THRESHOLD              = 87;              // trends score < 87  → burn
const MINT_PER_TICK               = 10_000n;         // tokens released per mint tick
const BURN_PCT                    = 2n;              // 2% of treasury burns per tick
const STREAK_MULTIPLIER_THRESHOLD = 3;               // 3 consecutive mints → bonus
const STREAK_BONUS_PCT            = 50n;             // +50% on streak bonus tick

// NEP-145 storage cost — 0.00125 NEAR per account (125 * 10^19 yoctoNEAR)
const STORAGE_COST_PER_ACCOUNT = 1_250_000_000_000_000_000_000n;

@NearBindgen({})
export class HypeToken {
  constructor() {
    // Token metadata
    this.name    = "HYPE";
    this.symbol  = "HYPE";
    this.keyword = "NEAR"; // locked forever at deploy

    // Supply state
    this.totalSupply       = TOTAL_SUPPLY.toString();
    this.rewardsPool       = ((TOTAL_SUPPLY * REWARDS_POOL_PCT) / 100n).toString();
    this.treasury          = ((TOTAL_SUPPLY * 20n) / 100n).toString();
    this.circulatingSupply = ((TOTAL_SUPPLY * 20n) / 100n).toString();

    // Balances map: account_id → amount (string)
    this.balances = {};

    // Storage deposits map: account_id → yoctoNEAR deposited (string)
    this.storageDeposits = {};

    // Oracle state
    this.oracleAccount  = "";
    this.latestScore    = 0;
    this.lastUpdateTime = 0;

    // Streak state
    this.consecutiveMints = 0;
    this.totalMintEvents  = 0;
    this.totalBurnEvents  = 0;
    this.longestStreak    = 0;

    // History (last 50 events)
    this.history = [];
  }

  @initialize({})
  init({ oracle_account, owner_account }) {
    this.oracleAccount = oracle_account;
    const initLiquidity = (TOTAL_SUPPLY * 20n) / 100n;
    this.balances[owner_account]        = initLiquidity.toString();
    this.storageDeposits[owner_account] = STORAGE_COST_PER_ACCOUNT.toString();
    near.log(`$HYPE initialized. Oracle: ${oracle_account}. Keyword: ${this.keyword}`);
  }

  // ─── Oracle: update trends score ──────────────────────────────────────────
  @call({})
  update_score({ score }) {
    if (near.predecessorAccountId() !== this.oracleAccount) {
      throw new Error("Unauthorized: only oracle can update score");
    }
    if (score < 0 || score > 100) {
      throw new Error("Score must be 0-100");
    }

    this.latestScore    = score;
    this.lastUpdateTime = Number(near.blockTimestamp() / 1_000_000n);

    if (score >= MINT_THRESHOLD) {
      this._mint(score);
    } else if (score < BURN_THRESHOLD) {
      this._burn();
    } else {
      this.consecutiveMints = 0;
      this._addHistory("neutral", score, 0n);
    }
  }

  // ─── Option A: Fixed-rate buy — 1 NEAR = 1000 HYPE from rewards pool ────────
  @call({ payableFunction: true })
  buy_hype() {
    const buyer    = near.predecessorAccountId();
    const attached = near.attachedDeposit(); // yoctoNEAR
    if (attached <= 0n) throw new Error("Attach NEAR to buy $HYPE");

    // Auto-register storage if needed
    if (!this.storageDeposits) this.storageDeposits = {};
    if (!this.balances) this.balances = {};
    if (!this.storageDeposits[buyer]) {
      if (attached < STORAGE_COST_PER_ACCOUNT) {
        throw new Error(`Need at least ${STORAGE_COST_PER_ACCOUNT} yoctoNEAR`);
      }
      this.storageDeposits[buyer] = STORAGE_COST_PER_ACCOUNT.toString();
      this.balances[buyer] = this.balances[buyer] ?? "0";
    }

    // 1 NEAR (10^24 yocto) = 1000 HYPE
    const ONE_NEAR = 1_000_000_000_000_000_000_000_000n;
    const hypeAmt  = (attached * 1000n) / ONE_NEAR;
    if (hypeAmt <= 0n) throw new Error("Amount too small to buy any $HYPE");

    const pool = BigInt(this.rewardsPool);
    const actual = hypeAmt > pool ? pool : hypeAmt;
    if (actual === 0n) throw new Error("Rewards pool empty");

    this.rewardsPool       = (pool - actual).toString();
    this.circulatingSupply = (BigInt(this.circulatingSupply) + actual).toString();
    this.balances[buyer]   = (BigInt(this.balances[buyer] ?? "0") + actual).toString();

    near.log(`BUY: ${buyer} bought ${actual} $HYPE for ${attached} yoctoNEAR`);
    return actual.toString();
  }

  // ─── NEP-145: Storage Management ──────────────────────────────────────────
  // Required for Ref Finance and any DEX integration.
  // Accounts must deposit storage before receiving tokens.

  @call({ payableFunction: true })
  storage_deposit({ account_id, registration_only }) {
    const accountId = account_id ?? near.predecessorAccountId();
    const attached  = near.attachedDeposit();
    const minCost   = STORAGE_COST_PER_ACCOUNT;

    if (!this.storageDeposits) this.storageDeposits = {};
    if (!this.balances) this.balances = {};

    const existing = BigInt(this.storageDeposits[accountId] ?? "0");

    if (existing >= minCost) {
      near.log(`Account ${accountId} already registered. Refunding.`);
      const promise = NearPromise.new(near.predecessorAccountId());
      promise.transfer(attached);
      return promise;
    }

    if (attached < minCost) {
      throw new Error(`Requires at least ${minCost} yoctoNEAR for storage`);
    }

    this.storageDeposits[accountId] = minCost.toString();
    this.balances[accountId]        = this.balances[accountId] ?? "0";

    const refund = attached - minCost;
    if (refund > 0n) {
      const promise = NearPromise.new(near.predecessorAccountId());
      promise.transfer(refund);
      near.log(`Account ${accountId} registered. Refunding excess: ${refund}`);
      return promise;
    }

    near.log(`Account ${accountId} registered for storage.`);
  }

  @call({ payableFunction: true })
  storage_withdraw({ amount }) {
    const accountId  = near.predecessorAccountId();
    if (!this.storageDeposits) throw new Error("Not registered");
    const deposited  = BigInt(this.storageDeposits[accountId] ?? "0");
    const minCost    = STORAGE_COST_PER_ACCOUNT;

    if (deposited < minCost) {
      throw new Error("Not registered");
    }

    // Can only withdraw excess above minimum (if any)
    const withdrawable = deposited - minCost;
    const withdrawAmt  = amount ? BigInt(amount) : withdrawable;

    if (withdrawAmt > withdrawable) {
      throw new Error("Not enough excess storage to withdraw");
    }

    this.storageDeposits[accountId] = (deposited - withdrawAmt).toString();

    const promise = NearPromise.new(accountId);
    promise.transfer(withdrawAmt + 1n); // +1 yocto as per NEP-145 spec
    near.log(`Storage withdrawn: ${withdrawAmt} to ${accountId}`);
    return promise;
  }

  @view({})
  storage_balance_of({ account_id }) {
    if (!this.storageDeposits || !(account_id in this.storageDeposits)) return null;
    const deposited = BigInt(this.storageDeposits[account_id] ?? "0");
    if (deposited === 0n) return null;
    return {
      total:     deposited.toString(),
      available: (deposited - STORAGE_COST_PER_ACCOUNT).toString(),
    };
  }

  @view({})
  storage_balance_bounds() {
    return {
      min: STORAGE_COST_PER_ACCOUNT.toString(),
      max: STORAGE_COST_PER_ACCOUNT.toString(),
    };
  }

  // ─── NEP-141: ft_transfer_call (required for DEX deposits) ────────────────
  @call({ payableFunction: true })
  ft_transfer_call({ receiver_id, amount, memo, msg }) {
    const sender  = near.predecessorAccountId();
    const sendBal = BigInt(this.balances[sender] ?? "0");
    const amt     = BigInt(amount);

    if (amt <= 0n) throw new Error("Amount must be > 0");
    if (sendBal < amt) throw new Error("Insufficient balance");
    if (!this.storageDeposits[receiver_id]) {
      throw new Error(`Receiver ${receiver_id} not registered`);
    }

    // Deduct from sender immediately
    this.balances[sender]      = (sendBal - amt).toString();
    this.balances[receiver_id] = (BigInt(this.balances[receiver_id] ?? "0") + amt).toString();

    near.log(`TRANSFER_CALL: ${sender} → ${receiver_id}: ${amount} msg=${msg}`);

    // Call ft_on_transfer on receiver contract, then handle unused amount
    return NearPromise.new(receiver_id)
      .functionCall(
        "ft_on_transfer",
        JSON.stringify({ sender_id: sender, amount, msg: msg ?? "" }),
        0n,
        10_000_000_000_000n // 10 TGas
      )
      .then(
        NearPromise.new(near.currentAccountId()).functionCall(
          "ft_resolve_transfer",
          JSON.stringify({ sender_id: sender, receiver_id, amount }),
          0n,
          10_000_000_000_000n
        )
      );
  }

  // Called internally after ft_on_transfer resolves
  @call({})
  ft_resolve_transfer({ sender_id, receiver_id, amount }) {
    // Read how much the receiver actually used (returned by ft_on_transfer)
    let unusedAmount = 0n;
    try {
      const result = JSON.parse(near.promiseResult(0));
      unusedAmount = BigInt(result);
    } catch (_) {
      // If promise failed treat all as unused — refund sender
      unusedAmount = BigInt(amount);
    }

    if (unusedAmount > 0n) {
      const receiverBal = BigInt(this.balances[receiver_id] ?? "0");
      const refund      = unusedAmount > receiverBal ? receiverBal : unusedAmount;
      this.balances[receiver_id] = (receiverBal - refund).toString();
      this.balances[sender_id]   = (BigInt(this.balances[sender_id] ?? "0") + refund).toString();
      near.log(`RESOLVE: refunded ${refund} to ${sender_id}`);
    }

    return (BigInt(amount) - unusedAmount).toString();
  }

  // ─── NEP-141 core transfer ─────────────────────────────────────────────────
  @call({ payableFunction: true })
  ft_transfer({ receiver_id, amount, memo }) {
    if (!this.storageDeposits) this.storageDeposits = {};
    if (!this.balances) this.balances = {};
    const sender  = near.predecessorAccountId();
    const sendBal = BigInt(this.balances[sender] ?? "0");
    const amt     = BigInt(amount);

    if (amt <= 0n) throw new Error("Amount must be > 0");
    if (sendBal < amt) throw new Error("Insufficient balance");
    if (!this.storageDeposits[receiver_id]) {
      throw new Error(`Receiver ${receiver_id} not registered. Call storage_deposit first.`);
    }

    this.balances[sender]      = (sendBal - amt).toString();
    this.balances[receiver_id] = (BigInt(this.balances[receiver_id] ?? "0") + amt).toString();

    near.log(`TRANSFER: ${sender} → ${receiver_id}: ${amount}`);
  }

  // ─── NEP-141 metadata ─────────────────────────────────────────────────────
  @view({})
  ft_metadata() {
    return {
      spec:          "ft-1.0.0",
      name:          "HYPE Token",
      symbol:        "HYPE",
      icon:          null,
      reference:     null,
      reference_hash: null,
      decimals:      0,
    };
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

    let amount = MINT_PER_TICK;
    if (this.consecutiveMints % STREAK_MULTIPLIER_THRESHOLD === 0) {
      amount = amount + (amount * STREAK_BONUS_PCT) / 100n;
      near.log(`Streak bonus applied! ${this.consecutiveMints} consecutive mints`);
    }

    const actual           = amount > pool ? pool : amount;
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

    this.consecutiveMints = 0;
    const burnAmount       = (treasury * BURN_PCT) / 100n;
    this.treasury          = (treasury - burnAmount).toString();
    this.totalSupply       = (BigInt(this.totalSupply) - burnAmount).toString();
    this.totalBurnEvents  += 1;

    this._addHistory("burn", this.latestScore, burnAmount);
    near.log(`BURN: ${burnAmount} $HYPE burned. Treasury remaining: ${this.treasury}`);
  }

  // ─── Add to history (keep last 50) ────────────────────────────────────────
  _addHistory(type, score, amount) {
    this.history.push({
      type,
      score,
      amount:    amount.toString(),
      timestamp: Number(near.blockTimestamp() / 1_000_000n),
    });
    if (this.history.length > 50) this.history.shift();
  }

  // ─── Dashboard views ──────────────────────────────────────────────────────
  @view({})
  get_state() {
    return {
      keyword:          this.keyword,
      latestScore:      this.latestScore,
      lastUpdateTime:   this.lastUpdateTime,
      totalSupply:      this.totalSupply,
      circulatingSupply: this.circulatingSupply,
      rewardsPool:      this.rewardsPool,
      treasury:         this.treasury,
      consecutiveMints: this.consecutiveMints,
      longestStreak:    this.longestStreak,
      totalMintEvents:  this.totalMintEvents,
      totalBurnEvents:  this.totalBurnEvents,
      mintThreshold:    MINT_THRESHOLD,
      burnThreshold:    BURN_THRESHOLD,
    };
  }

  @view({})
  get_history() {
    return this.history;
  }
}
