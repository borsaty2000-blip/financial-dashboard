from services.elliott_mtf import analyze_elliott_mtf


def candles(prices):
    return [
        {"open": price - 0.3, "high": price + 1, "low": price - 1, "close": price, "volume": 1000}
        for price in prices
    ]


# Deterministic zig-zag with a final corrective leg.
prices = [100 + i * 0.5 + ((i // 5) % 2) * 3 for i in range(220)]
prices.extend([prices[-1] - i * 1.1 for i in range(1, 36)])
result = analyze_elliott_mtf({"daily": candles(prices), "weekly": candles(prices)})
assert result["by_timeframe"]
assert result["consensus"]["timeframes"] == len(result["by_timeframe"])
for frame in result["by_timeframe"].values():
    if not frame["available"]:
        assert frame["availability_reason"]
        continue
    assert "wave2_retracement" in frame["fib_relationships"]
    assert "wave3_extension" in frame["fib_relationships"]
    assert "target_1" in frame["targets"]
    assert frame["invalidation_level"]["level"] > 0
    if frame["current_wave"] == "C":
        assert frame["direction"] == "down"
print("elliott_mtf_integrity_ok")
