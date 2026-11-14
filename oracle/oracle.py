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
KEYWORD         = "NEAR"
POLL_INTERVAL   = 120          # seconds (2 minutes)
CONTRACT_ID     = "hype-token-test.testnet"
ORACLE_ACCOUNT  = "hype-token-test.testnet"
NETWORK         = "testnet"

# ─── Fetch Google Trends score ─────────────────────────────────────────────────
def fetch_score(keyword: str) -> int:
    """Returns a 0-100 interest score for the keyword from Google Trends."""
    try:
        pytrends = TrendReq(hl="en-US", tz=0, timeout=(10, 30))
        pytrends.build_payload([keyword], timeframe="now 1-H")
        df = pytrends.interest_over_time()

        if df.empty or keyword not in df.columns:
            log.warning("No trends data returned — using 0")
            return 0

        score = int(df[keyword].iloc[-1])
        log.info(f"Google Trends score for '{keyword}': {score}")
        return score

    except Exception as e:
        log.error(f"Trends fetch error: {e}")
        return -1  # signal error, skip this tick

# ─── Push score to NEAR contract ───────────────────────────────────────────────
def push_score(score: int) -> bool:
    """Calls update_score on the NEAR contract via near-cli v4."""
    args = json.dumps({"score": score})
    cmd = [
        "near", "call", CONTRACT_ID, "update_score",
        args,
        "--accountId", ORACLE_ACCOUNT,
        "--networkId", NETWORK,
    ]
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=30,
            env={**__import__("os").environ, "PATH": "/Users/I578433/.npm-global/bin:" + __import__("os").environ.get("PATH", "")}
        )
        if result.returncode == 0:
            log.info(f"Score {score} pushed to contract. TX: {result.stdout[:150]}")
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

# ─── Main loop ─────────────────────────────────────────────────────────────────
def main():
    log.info(f"$HYPE Oracle starting. Keyword: '{KEYWORD}', interval: {POLL_INTERVAL}s")
    log.info(f"Contract: {CONTRACT_ID} | Oracle account: {ORACLE_ACCOUNT}")

    while True:
        score = fetch_score(KEYWORD)

        if score == -1:
            log.warning("Skipping this tick due to fetch error")
        else:
            push_score(score)

        log.info(f"Sleeping {POLL_INTERVAL}s until next tick...")
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
