#!/usr/bin/env python3
"""
Coinbase Trading Bot for Lukas
Strategy: RSI momentum trading on BTC-USDC and ETH-USDC
- Buy when RSI crosses above 35 (oversold recovery)
- Sell when RSI crosses above 65 (overbought) or stop-loss at -7%
- Never risk more than 45% of portfolio on one trade
- Logs all actions to trade_log.txt
"""

import os
import time
import logging
from datetime import datetime, timezone
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
PAIRS        = ["BTC-USDC", "ETH-USDC"]
RSI_PERIOD   = 14
RSI_BUY      = 35    # buy signal threshold
RSI_SELL     = 65    # sell signal threshold
STOP_LOSS    = 0.93  # -7% stop loss multiplier
CHECK_EVERY  = 300   # seconds between checks (5 min)
GRANULARITY  = "FIVE_MINUTE"
CANDLE_LIMIT = 50

# ── Position sizing based on RSI signal strength ──────────────────────────
# Deeper oversold = more conviction = bigger position
# Minimum $40 per trade to ensure gains can clear Coinbase fees (~1.2% round-trip)
MIN_TRADE_USDC = 40.0

def get_allocation(rsi):
    """Return fraction of portfolio to allocate based on RSI signal strength."""
    if rsi < 25:
        return 0.80   # very strong signal — go big
    elif rsi < 30:
        return 0.65   # strong signal
    elif rsi < 35:
        return 0.50   # moderate signal
    else:
        return 0.0    # no signal

# ── Client ───────────────────────────────────────────────────────────────────
key    = os.getenv("COINBASE_API_KEY_NAME")
secret = os.getenv("COINBASE_PRIVATE_KEY").replace("\\n", "\n")
client = RESTClient(api_key=key, api_secret=secret)

# Track open positions: {pair: {"qty": float, "entry_price": float}}
positions = {}


def get_balance(currency="USDC"):
    accounts = client.get_accounts()
    for a in accounts["accounts"]:
        if a["currency"] == currency:
            return float(a["available_balance"]["value"])
    return 0.0


def get_candles(pair):
    now   = int(time.time())
    start = now - (CANDLE_LIMIT * 300)
    resp  = client.get_candles(pair, start=str(start), end=str(now), granularity=GRANULARITY)
    rows  = [{"start": c["start"], "low": c["low"], "high": c["high"],
              "open": c["open"], "close": c["close"], "volume": c["volume"]}
             for c in resp["candles"]]
    df = pd.DataFrame(rows)
    df["close"] = df["close"].astype(float)
    df = df.sort_values("start").reset_index(drop=True)
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
        return
    qty = round(usdc_amount / ask, 6)
    try:
        order = client.market_order_buy(
            client_order_id=f"buy-{pair}-{int(time.time())}",
            product_id=pair,
            base_size=str(qty)
        )
        positions[pair] = {"qty": qty, "entry_price": ask}
        log.info(f"✅ BUY  {qty} {base} @ ${ask:,.2f} | spent ${usdc_amount:.2f} USDC")
    except Exception as e:
        log.error(f"BUY failed for {pair}: {e}")


def sell(pair):
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
        order = client.market_order_sell(
            client_order_id=f"sell-{pair}-{int(time.time())}",
            product_id=pair,
            base_size=str(qty)
        )
        del positions[pair]
        log.info(f"{'✅' if pnl_pct >= 0 else '🛑'} SELL {qty} {base} @ ${bid:,.2f} | P&L: {pnl_pct:+.2f}%")
    except Exception as e:
        log.error(f"SELL failed for {pair}: {e}")


def run():
    log.info("🤖 Trading bot started")
    log.info(f"   Pairs: {PAIRS}")
    log.info(f"   Strategy: RSI({RSI_PERIOD}) | Buy<{RSI_BUY} | Sell>{RSI_SELL} | Stop-loss {int((1-STOP_LOSS)*100)}%")

    while True:
        try:
            usdc = get_balance("USDC")
            log.info(f"💰 Portfolio: ${usdc:.2f} USDC | Open positions: {list(positions.keys())}")

            for pair in PAIRS:
                try:
                    df  = get_candles(pair)
                    rsi = calc_rsi(df)
                    _, bid = get_price(pair)
                    log.info(f"   {pair} | RSI: {rsi:.1f} | Price: ${bid:,.2f}")

                    # ── Check stop-loss on open positions ──
                    if pair in positions:
                        entry = positions[pair]["entry_price"]
                        if bid and bid <= entry * STOP_LOSS:
                            log.warning(f"🛑 STOP-LOSS triggered for {pair}")
                            sell(pair)
                            continue

                    # ── Sell signal ──
                    if pair in positions and rsi > RSI_SELL:
                        log.info(f"📈 RSI overbought ({rsi:.1f}) — selling {pair}")
                        sell(pair)

                    # ── Buy signal ──
                    elif pair not in positions and rsi < RSI_BUY:
                        usdc = get_balance("USDC")
                        frac = get_allocation(rsi)
                        alloc = usdc * frac
                        if alloc < MIN_TRADE_USDC:
                            log.info(f"   Skipping {pair} — position ${alloc:.2f} too small to beat fees (min ${MIN_TRADE_USDC})")
                        else:
                            log.info(f"📉 RSI oversold ({rsi:.1f}) — buying {pair} with ${alloc:.2f} ({int(frac*100)}% of portfolio)")
                            buy(pair, alloc)

                except Exception as e:
                    log.error(f"Error processing {pair}: {e}")

        except Exception as e:
            log.error(f"Main loop error: {e}")

        log.info(f"   Sleeping {CHECK_EVERY}s...\n")
        time.sleep(CHECK_EVERY)


if __name__ == "__main__":
    run()
