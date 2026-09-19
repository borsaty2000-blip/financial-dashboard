from services.elliott_pro import ElliottPro


def test_elliott_returns_targets(swing_candles):
    result = ElliottPro.analyze(swing_candles)
    assert result["available"] is True
    assert "targets" in result
    assert result["targets"]["target_1"]["price"] > 0
    assert result["invalidation"]["level"] > 0


def test_elliott_insufficient_data():
    result = ElliottPro.analyze([{"close": 100}] * 10)
    assert result["available"] is False
    assert "reason" in result


def test_elliott_validation_is_explicit(swing_candles):
    result = ElliottPro.analyze(swing_candles)
    assert "validation" in result
    assert result["validation"]["total_rules"] >= 0
