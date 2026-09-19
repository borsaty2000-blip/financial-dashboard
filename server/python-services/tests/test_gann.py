from services.gann_pro import GannPro


def test_gann_returns_angles(simple_uptrend):
    result = GannPro.analyze(simple_uptrend)
    assert result["available"] is True
    assert "1x1" in result["angles"]
    assert result["square_of_nine"]["base"] > 0
    assert len(result["time_cycles"]) >= 8


def test_gann_insufficient_data():
    result = GannPro.analyze([{"close": 100}] * 10)
    assert result["available"] is False
    assert "reason" in result
