#!/opt/homebrew/bin/python3.14
"""
Coinbase Trading Bot for Lukas — v3
Strategy: High-conviction RSI swings on 1-hour candles
- Only trade on hourly RSI extremes (< 28 buy / > 68 sell)
- One position at a time — no splitting capital across two coins
- Take-profit at +3.5% (must clear ~1.2% round-trip fees with real profit)
- Stop-loss at -3% (asymmetric — small losses, big wins)
- 80% of portfolio per trade (trade big enough to matter)
- Persists position state to disk — survives restarts
"""

import os
import json
import time
import logging
from dotenv import load_dotenv
from coinbase.rest import RESTClient
import pandas as pd

load_dotenv()

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("trade_log.txt"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# ── Config ───────────────────────────────────────────────────────────────────
PAIRS          = ["BTC-USDC", "ETH-USDC"]
RSI_PERIOD     = 14
RSI_BUY        = 28    # only extreme oversold — high conviction entries
RSI_SELL       = 68    # overbought
STOP_LOSS      = 0.97  # -3% stop
TAKE_PROFIT    = 1.035 # +3.5% take-profit — must clear fees and make actual money
ALLOC_FRAC     = 0.80  # 80% of portfolio per trade
MIN_TRADE_USDC = 40.0
CHECK_EVERY    = 300   # 5 min checks, but uses 1H candles for signal quality
GRANULARITY    = "ONE_HOUR"
CANDLE_LIMIT   = 50
STATE_FILE     = "positions.json"

# ── Client ───────────────────────────────────────────────────────────────────
key    = os.getenv("COINBASE_API_KEY_NAME")
secret = os.getenv("COINBASE_PRIVATE_KEY").replace("\\n", "\n")
client = RESTClient(api_key=key, api_secret=secret)

# ── Position state (persisted to disk) ───────────────────────────────────────
def load_positions():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            data = json.load(f)
            log.info(f"📂 Loaded saved positions: {data}")
            return data
    return {}

def save_positions(positions):
    with open(STATE_FILE, "w") as f:
        json.dump(positions, f)

positions = load_positions()


def get_balance(currency="USDC"):
    accounts = client.get_accounts()
    for a in accounts["accounts"]:
        if a["currency"] == currency:
            return float(a["available_balance"]["value"])
    return 0.0


def get_candles(pair):
    now   = int(time.time())
    start = now - (CANDLE_LIMIT * 3600)
    resp  = client.get_candles(pair, start=str(start), end=str(now), granularity=GRANULARITY)
    rows  = [{"start": c["start"], "close": float(c["close"])} for c in resp["candles"]]
    df = pd.DataFrame(rows).sort_values("start").reset_index(drop=True)
    return df


def calc_rsi(df):
    delta  = df["close"].diff()
    gain   = delta.clip(lower=0)
    loss   = -delta.clip(upper=0)
    avg_g  = gain.ewm(com=RSI_PERIOD - 1, min_periods=RSI_PERIOD).mean()
    avg_l  = loss.ewm(com=RSI_PERIOD - 1, min_periods=RSI_PERIOD).mean()
    rs     = avg_g / avg_l
    rsi    = 100 - (100 / (1 + rs))
    return rsi.iloc[-1]


def get_price(pair):
    resp = client.get_best_bid_ask(product_ids=[pair])
    for p in resp["pricebooks"]:
        if p["product_id"] == pair:
            ask = float(p["asks"][0]["price"]) if p["asks"] else None
            bid = float(p["bids"][0]["price"]) if p["bids"] else None
            return ask, bid
    return None, None


def buy(pair, usdc_amount):
    base = pair.split("-")[0]
    ask, _ = get_price(pair)
    if not ask:
        log.warning(f"Could not get ask price for {pair}")
        return False
    qty = round(usdc_amount / ask, 6)
    try:
        client.market_order_buy(
            client_order_id=f"buy-{pair}-{int(time.time())}",
            product_id=pair,
            base_size=str(qty)
        )
        positions[pair] = {"qty": qty, "entry_price": ask}
        save_positions(positions)
        log.info(f"✅ BUY  {qty} {base} @ ${ask:,.2f} | spent ${usdc_amount:.2f} USDC")
        return True
    except Exception as e:
        log.error(f"BUY failed for {pair}: {e}")
        return False


def sell(pair, reason=""):
    if pair not in positions:
        return
    pos  = positions[pair]
    qty  = pos["qty"]
    base = pair.split("-")[0]
    _, bid = get_price(pair)
    if not bid:
        log.warning(f"Could not get bid price for {pair}")
        return
    pnl_pct = (bid - pos["entry_price"]) / pos["entry_price"] * 100
    try:
        client.market_order_sell(
            client_order_id=f"sell-{pair}-{int(time.time())}",
            product_id=pair,
            base_size=str(qty)
        )
        del positions[pair]
        save_positions(positions)
        icon = reason if reason else ("✅" if pnl_pct >= 0 else "🛑")
        log.info(f"{icon} SELL {qty} {base} @ ${bid:,.2f} | P&L: {pnl_pct:+.2f}%")
    except Exception as e:
        log.error(f"SELL failed for {pair}: {e}")


def run():
    log.info("🤖 Trading bot started (v3 — hourly RSI, fee-aware, persistent state)")
    log.info(f"   Pairs: {PAIRS}")
    log.info(f"   Strategy: 1H RSI({RSI_PERIOD}) | Buy<{RSI_BUY} | Sell>{RSI_SELL} | TP +{int((TAKE_PROFIT-1)*100)}% | SL -{int((1-STOP_LOSS)*100)}% | Alloc {int(ALLOC_FRAC*100)}%")
    log.info(f"   Loaded positions: {list(positions.keys()) or 'none'}")

    while True:
        try:
            usdc = get_balance("USDC")
            log.info(f"💰 Portfolio: ${usdc:.2f} USDC | Open positions: {list(positions.keys())}")

            # One position at a time — pick best signal if multiple qualify
            best_pair = None
            best_rsi  = 100

            for pair in PAIRS:
                try:
                    df  = get_candles(pair)
                    rsi = calc_rsi(df)
                    _, bid = get_price(pair)
                    log.info(f"   {pair} | RSI(1H): {rsi:.1f} | Price: ${bid:,.2f}")

                    # ── Manage open position ──
                    if pair in positions:
                        entry = positions[pair]["entry_price"]

                        if bid and bid >= entry * TAKE_PROFIT:
                            log.info(f"💸 TAKE-PROFIT ({pct(bid, entry)}) — selling {pair}")
                            sell(pair, reason="💸")
                            continue

                        if bid and bid <= entry * STOP_LOSS:
                            log.warning(f"🛑 STOP-LOSS ({pct(bid, entry)}) — selling {pair}")
                            sell(pair, reason="🛑")
                            continue

                        if rsi > RSI_SELL:
                            log.info(f"📈 RSI overbought ({rsi:.1f}) — selling {pair}")
                            sell(pair, reason="📈")
                            continue

                    # ── Track best buy candidate ──
                    elif rsi < RSI_BUY and rsi < best_rsi:
                        best_rsi  = rsi
                        best_pair = pair

                except Exception as e:
                    log.error(f"Error processing {pair}: {e}")

            # ── Execute best buy (one trade at a time) ──
            if best_pair and not positions:
                usdc = get_balance("USDC")
                alloc = usdc * ALLOC_FRAC
                if alloc < MIN_TRADE_USDC:
                    log.info(f"   Skipping {best_pair} — ${alloc:.2f} too small to beat fees (min ${MIN_TRADE_USDC})")
                else:
                    log.info(f"📉 RSI extreme ({best_rsi:.1f}) — buying {best_pair} with ${alloc:.2f} ({int(ALLOC_FRAC*100)}%)")
                    buy(best_pair, alloc)

        except Exception as e:
            log.error(f"Main loop error: {e}")

        log.info(f"   Sleeping {CHECK_EVERY}s...\n")
        time.sleep(CHECK_EVERY)


def pct(current, entry):
    return f"{(current - entry) / entry * 100:+.2f}%"


if __name__ == "__main__":
    run()
