import os
import sys
import time
import json
import subprocess
import logging
from pytrends.request import TrendReq

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
log = logging.getLogger("hype-oracle")

# ─── Config ───────────────────────────────────────────────────────────────────
KEYWORD        = "NEAR"
CONTRACT_ID    = "hype-token-test.testnet"
ORACLE_ACCOUNT = "hype-token-test.testnet"
NETWORK        = "testnet"

LIVE_INTERVAL  = 60    # production: one real pytrends point per minute
DEMO_INTERVAL  = 10    # demo: new on-chain tx every 10 seconds

# Curated demo sequence — all values from real observed NEAR 1-H range (84-100)
# Designed to show mint → mint → burn → mint → mint → streak bonus in ~60s
DEMO_SCORES = [95, 93, 85, 94, 92, 94, 86, 96, 88, 93, 84, 97]

# ─── Fetch live Google Trends score ───────────────────────────────────────────
def fetch_score() -> int:
    try:
        pytrends = TrendReq(hl="en-US", tz=0, timeout=(10, 30))
        pytrends.build_payload([KEYWORD], timeframe="now 1-H")
        df = pytrends.interest_over_time()
        if df.empty or KEYWORD not in df.columns:
            log.warning("No trends data returned — skipping tick")
            return -1
        score = int(df[KEYWORD].iloc[-1])
        log.info(f"Google Trends score for '{KEYWORD}': {score}")
        return score
    except Exception as e:
        log.error(f"Trends fetch error: {e}")
        return -1

# ─── Push score to NEAR contract ──────────────────────────────────────────────
def push_score(score: int) -> bool:
    args = json.dumps({"score": score})
    cmd = [
        "near", "call", CONTRACT_ID, "update_score",
        args,
        "--accountId", ORACLE_ACCOUNT,
        "--networkId", NETWORK,
    ]
    env = {**os.environ, "PATH": "/Users/I578433/.npm-global/bin:" + os.environ.get("PATH", "")}
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, env=env)
        if result.returncode == 0:
            log.info(f"Score {score} pushed. TX: {result.stdout[:150]}")
            return True
        else:
            log.error(f"NEAR CLI error: {result.stderr[:300]}")
            return False
    except subprocess.TimeoutExpired:
        log.error("NEAR CLI call timed out")
        return False
    except FileNotFoundError:
        log.error("near-cli not found — ensure /Users/I578433/.npm-global/bin is on PATH")
        return False

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    demo_mode = "--demo" in sys.argv

    if demo_mode:
        log.info("=" * 50)
        log.info("$HYPE Oracle — DEMO MODE")
        log.info(f"Cycling {len(DEMO_SCORES)} curated scores every {DEMO_INTERVAL}s")
        log.info(f"Contract: {CONTRACT_ID}")
        log.info("=" * 50)

        for i, score in enumerate(DEMO_SCORES):
            log.info(f"[{i+1}/{len(DEMO_SCORES)}] Demo score: {score}")
            push_score(score)
            if i < len(DEMO_SCORES) - 1:
                log.info(f"Next tick in {DEMO_INTERVAL}s...")
                time.sleep(DEMO_INTERVAL)

        log.info("Demo sequence complete.")

    else:
        log.info("=" * 50)
        log.info("$HYPE Oracle — LIVE MODE")
        log.info(f"Polling Google Trends for '{KEYWORD}' every {LIVE_INTERVAL}s")
        log.info(f"Contract: {CONTRACT_ID}")
        log.info("=" * 50)

        while True:
            score = fetch_score()
            if score == -1:
                log.warning("Skipping tick due to fetch error")
            else:
                push_score(score)
            log.info(f"Next tick in {LIVE_INTERVAL}s...")
            time.sleep(LIVE_INTERVAL)

if __name__ == "__main__":
    main()
