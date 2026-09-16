from services.elliott_pro import ElliottPro
from services.gann_pro import GannPro


def candles(n=120):
    values = []
    for i in range(n):
        close = 100 + i * 0.4 + ((i % 9) - 4) * 1.2
        values.append({"open": close - 0.4, "high": close + 1.0, "low": close - 1.0, "close": close, "volume": 1000, "date": f"2026-01-{(i % 28) + 1:02d}"})
    return values


result = ElliottPro.analyze(candles())
assert result["available"] is True
assert result["targets"]["target_1"]["price"] > 0
assert result["targets"]["target_2"]["price"] > 0
assert result["targets"]["target_3"]["price"] > 0
assert "relationships" in result and result["relationships"]
assert 35 <= result["confidence_percent"] <= 82
assert result["invalidation"]["level"] > 0

gann = GannPro.analyze(candles())
assert gann["available"] is True
assert "1x1" in gann["angles"]
assert gann["square_of_nine"]["resistance"] > 0
assert len(gann["time_cycles"]) == 8
print("professional analysis tests passed")
