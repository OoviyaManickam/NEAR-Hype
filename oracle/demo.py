#!/usr/bin/env python3
"""
$HYPE — Live Demo Script
Run this during the presentation AFTER the audience has seen the landing page
and you've bought $HYPE on the dashboard.

Flow (designed for ~3 min live demo):
  1. Context: explain what the oracle is about to do
  2. MINT   score 95  → +500 $HYPE  (clear mint, audience sees gauge jump green)
  3. MINT   score 93  → +500 $HYPE  (second consecutive mint, streak=2)
  4. BURN   score 84  → −320 $HYPE  (score drops, gauge goes red, supply shrinks)
  5. MINT   score 96  → +500 $HYPE  (recovery)
  6. MINT   score 92  → +500 $HYPE  (streak=2 again)
  7. MINT   score 94  → +750 $HYPE  (3rd consecutive → streak bonus fires!)
  8. NEUTRAL score 89 → nothing     (between thresholds — nothing happens)

Usage:
  python3 oracle/demo.py            # full sequence, 12s between events
  python3 oracle/demo.py --fast     # 6s between events (faster crowd)
  python3 oracle/demo.py --single 95  # push one score immediately
"""

import os
import sys
import json
import time
import subprocess

# ── Config ────────────────────────────────────────────────────────────────────

CONTRACT_ID    = "hype-token-test.testnet"
ORACLE_ACCOUNT = "hype-token-test.testnet"
NETWORK        = "testnet"
NEAR_BIN       = "/Users/I578433/.npm-global/bin/near"

INTERVAL_NORMAL = 12   # seconds between events (default)
INTERVAL_FAST   = 6    # --fast flag

# ── ANSI colours ──────────────────────────────────────────────────────────────

RESET  = "\033[0m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
WHITE  = "\033[97m"
BLUE   = "\033[94m"

def g(s): return f"{GREEN}{s}{RESET}"
def r(s): return f"{RED}{s}{RESET}"
def y(s): return f"{YELLOW}{s}{RESET}"
def c(s): return f"{CYAN}{s}{RESET}"
def b(s): return f"{BOLD}{s}{RESET}"
def dim(s): return f"{DIM}{s}{RESET}"

# ── Demo sequence ─────────────────────────────────────────────────────────────
# Each entry: (score, talking_point)
SEQUENCE = [
    (
        95,
        [
            b("EVENT 1 — MINT"),
            "Google Trends just returned a score of " + g("95") + " for 'NEAR'.",
            "That's above the mint threshold of " + g("≥ 92") + ".",
            "The oracle is about to sign a transaction minting " + g("+500 $HYPE") + " on-chain.",
            dim("→ Watch the gauge on the dashboard jump green."),
        ]
    ),
    (
        93,
        [
            b("EVENT 2 — MINT (streak: 2)"),
            "Score came back " + g("93") + " — still above 92.",
            "That's two consecutive mints. " + y("Streak counter is now 2."),
            "Another " + g("+500 $HYPE") + " enters circulation.",
            dim("→ Streak counter on the dashboard should tick up."),
        ]
    ),
    (
        84,
        [
            b("EVENT 3 — BURN"),
            "Score dropped to " + r("84") + " — below the burn threshold of " + r("< 87") + ".",
            "The oracle has no choice. It burns " + r("−320 $HYPE") + " from circulation.",
            "No vote, no button, no override. This is the contract.",
            dim("→ Gauge goes red. Supply chart dips."),
        ]
    ),
    (
        96,
        [
            b("EVENT 4 — MINT (recovery)"),
            "NEAR attention bounced back. Score: " + g("96") + ".",
            "Contract mints " + g("+500 $HYPE") + ". Streak resets to 1 after the burn.",
            dim("→ Green again. Supply recovers."),
        ]
    ),
    (
        92,
        [
            b("EVENT 5 — MINT (streak: 2)"),
            "Score: " + g("92") + " — exactly on the mint threshold.",
            "Mint fires. Streak is now 2 again.",
            g("+500 $HYPE") + " added.",
            dim("→ One more mint and the streak bonus fires."),
        ]
    ),
    (
        94,
        [
            b("EVENT 6 — MINT + ") + y("STREAK BONUS 🔥"),
            "Score: " + g("94") + ". Third consecutive mint.",
            "The streak bonus rule triggers: " + y("+250 $HYPE bonus") + " on top of the regular mint.",
            "Total this event: " + g("+500") + " + " + y("+250") + " = " + b(g("+750 $HYPE")) + ".",
            dim("→ Watch the streak badge light up on the dashboard."),
        ]
    ),
    (
        89,
        [
            b("EVENT 7 — NEUTRAL"),
            "Score: " + y("89") + " — between 87 and 92.",
            "Nothing happens. No mint, no burn.",
            "The contract enforces the dead zone. " + dim("This is the point."),
            dim("→ Gauge stays still. Supply unchanged."),
        ]
    ),
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def divider(char="─", width=58):
    print(dim(char * width))

def push_score(score: int) -> bool:
    args = json.dumps({"score": score})
    cmd = [
        NEAR_BIN, "call", CONTRACT_ID, "update_score",
        args,
        "--accountId", ORACLE_ACCOUNT,
        "--networkId", NETWORK,
    ]
    env = {**os.environ, "PATH": os.path.dirname(NEAR_BIN) + ":" + os.environ.get("PATH", "")}
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, env=env)
        if result.returncode == 0:
            return True
        else:
            print(r(f"  TX error: {result.stderr[:200]}"))
            return False
    except subprocess.TimeoutExpired:
        print(r("  TX timed out after 30s"))
        return False
    except FileNotFoundError:
        print(r(f"  near-cli not found at {NEAR_BIN}"))
        return False

def countdown(seconds: int):
    for i in range(seconds, 0, -1):
        print(f"\r  {dim('next event in')} {c(str(i)+'s')} {dim('...')}   ", end="", flush=True)
        time.sleep(1)
    print()

# ── Entry points ──────────────────────────────────────────────────────────────

def run_single(score: int):
    print()
    print(c(f"  Pushing single score: {b(str(score))}"))
    ok = push_score(score)
    if ok:
        color = g if score >= 92 else (r if score < 87 else y)
        action = "MINT +500" if score >= 92 else ("BURN −320" if score < 87 else "NEUTRAL")
        print(f"  {color('✓')}  Score {b(str(score))} → {color(action)}")
    else:
        print(r("  ✗  TX failed"))
    print()

def run_demo(interval: int):
    print()
    divider("═")
    print(f"  {b(c('$HYPE'))}  {b('LIVE DEMO ORACLE')}")
    print(f"  Contract : {dim(CONTRACT_ID)}")
    print(f"  Interval : {interval}s between events")
    print(f"  Events   : {len(SEQUENCE)} (mint / burn / streak)")
    divider("═")
    print()
    print(f"  {dim('Wallet is connected. Dashboard is open.')}")
    print(f"  {dim('Press Enter to begin...')}", end="")
    input()
    print()

    for i, (score, lines) in enumerate(SEQUENCE):
        divider()
        print(f"  {dim(f'[{i+1}/{len(SEQUENCE)}]')}  ", end="")
        for j, line in enumerate(lines):
            if j == 0:
                print(line)
            else:
                print(f"       {line}")
        print()

        print(f"  {dim('Signing TX...')} ", end="", flush=True)
        ok = push_score(score)

        if ok:
            color = g if score >= 92 else (r if score < 87 else y)
            action = "MINT +500 $HYPE" if score >= 92 else ("BURN −320 $HYPE" if score < 87 else "NEUTRAL — nothing moves")
            if score == 94 and i == 5:  # streak bonus event
                action = "MINT +500 + STREAK BONUS +250 $HYPE"
            print(color(f"✓  on-chain: {action}"))
        else:
            print(r("✗  TX failed — check near-cli / network"))

        print()

        if i < len(SEQUENCE) - 1:
            countdown(interval)
            print()

    divider("═")
    print()
    print(f"  {g(b('Demo complete.'))}  {len(SEQUENCE)} oracle events fired.")
    print(f"  {dim('The supply chart, gauge, and event feed on the dashboard reflect the full sequence.')}")
    print()
    divider("═")
    print()

def main():
    args = sys.argv[1:]

    if "--single" in args:
        idx = args.index("--single")
        try:
            score = int(args[idx + 1])
        except (IndexError, ValueError):
            print(r("Usage: python3 demo.py --single <score>"))
            sys.exit(1)
        run_single(score)

    elif "--fast" in args:
        run_demo(INTERVAL_FAST)

    else:
        run_demo(INTERVAL_NORMAL)

if __name__ == "__main__":
    main()
