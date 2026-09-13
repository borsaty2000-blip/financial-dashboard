from services.candlestick import detect_candlestick_patterns

result = detect_candlestick_patterns(
    [100, 98, 103, 105],
    [101, 104, 106, 106],
	[97, 97, 102, 104],
    [98, 103, 105, 105],
    ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"],
)
assert result["available"] is True
assert any(pattern["pattern"] == "bullish_engulfing" for pattern in result["patterns"])
try:
    detect_candlestick_patterns([1, 2], [2], [0.5, 1], [1.5, 2])
except ValueError:
    pass
else:
    raise AssertionError("mismatched OHLC arrays should fail")
print("candlestick_ok", result["count"])
