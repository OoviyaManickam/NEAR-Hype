# $HYPE

A NEAR Protocol memecoin whose entire monetary policy is a single Google Trends score.

Every interval, an oracle queries Google Trends for the keyword `"NEAR"` and pushes the result on-chain. The contract decides — mint, burn, or nothing. No team signs off. No governance vote. The internet's attention is the rule.

**Live on NEAR testnet:** `hype-token-test.testnet`
**Frontend:** deployed on Vercel

---

## The Mechanic

| Condition | Result |
|---|---|
| Score ≥ 92 | Oracle mints **10,000 $HYPE** into circulation |
| Score < 87 | Oracle burns **2% of treasury** |
| Score 87–91 | Dead zone — nothing moves |
| 3 consecutive mints | Streak bonus: +50% on that mint tick |

- **Dead zone** between 87–91 prevents threshold gaming
- **Streak bonus** rewards sustained attention, not a single spike
- **Burns are irreversible** — enforced by the contract, not a multisig
- **Keyword is locked forever** at deploy (`"NEAR"`) — immutable

---

## Repo Structure

```
HYPE/
├── contract/          # NEAR smart contract (near-sdk-js)
│   └── src/hype.js    # NEP-141 token + oracle mechanic
├── frontend/          # React + Vite frontend
│   └── src/
│       ├── pages/     # Landing, Dashboard, Portfolio
│       ├── components/ # ScoreGauge, SupplyChart, EventTimeline, BuyPanel
│       └── near.ts    # NEAR wallet-selector + contract calls
└── oracle/
    ├── oracle.py      # Production oracle (real Google Trends, 60s interval)
    └── demo.py        # Presentation demo (curated scores, instant replay)
```

---

## Run It Locally

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`. Connect Meteor Wallet (NEAR testnet) to interact.

### 2. Demo Oracle (no API key needed, works offline)

```bash
cd oracle
python3 demo.py
```

Fires 7 curated oracle events (mint → mint → burn → recovery → streak bonus → neutral) every 12 seconds against the live testnet contract. Press Enter to start.

```bash
python3 demo.py --fast        # 6s between events
python3 demo.py --single 95   # push one score immediately
```

### 3. Production Oracle (real Google Trends)

```bash
pip3 install pytrends
python3 oracle/oracle.py
```

Queries Google Trends for `"NEAR"` every 60 seconds and pushes the score on-chain. Requires the oracle account key to be available to NEAR CLI.

---

## How an AI Agent Can Verify This

The contract is live and all state is public. An agent can verify the mechanic end-to-end:

**Read contract state:**
```bash
near view hype-token-test.testnet get_state '{}' --networkId testnet
```

**Read oracle score history (last 50 events):**
```bash
near view hype-token-test.testnet get_history '{}' --networkId testnet
```

**Check a specific account balance:**
```bash
near view hype-token-test.testnet ft_balance_of '{"account_id": "YOUR_ACCOUNT.testnet"}' --networkId testnet
```

**Push a score manually (requires oracle account key):**
```bash
near call hype-token-test.testnet update_score '{"score": 95}' \
  --accountId hype-token-test.testnet \
  --networkId testnet
```

**Verify mint fired (score ≥ 92):**
```bash
near view hype-token-test.testnet get_state '{}' --networkId testnet
# circulatingSupply increases by 10,000 tokens
```

**Verify burn fired (score < 87):**
```bash
near view hype-token-test.testnet get_state '{}' --networkId testnet
# treasury decreases by 2%
```

**Verify streak bonus (after 3 consecutive mints):**
```bash
near view hype-token-test.testnet get_state '{}' --networkId testnet
# consecutiveMints = 3, that tick's mint was 1.5x normal
```

---

## Contract Constants

| Parameter | Value |
|---|---|
| Total supply | 1,000,000,000 $HYPE |
| Mint per tick | 10,000 $HYPE |
| Burn per tick | 2% of treasury |
| Mint threshold | score ≥ 92 |
| Burn threshold | score < 87 |
| Streak threshold | 3 consecutive mints |
| Streak bonus | +50% on that tick |
| Tracked keyword | `"NEAR"` (immutable) |
| Network | NEAR testnet |

---

## Build the Contract

```bash
cd contract
npm install
npm run build
# outputs build/hype.wasm
```

Requires `near-sdk-js` and `QJSC` (QuickJS compiler). The contract is already deployed — this is only needed if you want to redeploy.

---

## Tech Stack

- **Contract:** near-sdk-js (JavaScript → WASM), NEP-141 + NEP-145 compliant
- **Frontend:** React 19 + Vite + TypeScript, NEAR wallet-selector, Framer Motion
- **Oracle:** Python 3, pytrends, NEAR CLI
- **Network:** NEAR testnet

---

## Why $HYPE fits "Memecoins With Mechanics"

Most memecoins die when the hype does. $HYPE makes that the literal mechanism.

The mechanic isn't inside the community — it's outside it. Google Trends measures the whole internet's attention to NEAR, not just token holders. Holders cannot pump the oracle by talking more. The signal is external, public, and verifiable by anyone.

The streak bonus adds a temporal dimension no other entry in this track has: sustained attention over consecutive intervals is worth more than a single spike. That's a mechanic, not a chart.
