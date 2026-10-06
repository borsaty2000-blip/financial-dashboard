from services.elliott_mtf import ElliottMTF, analyze_elliott_mtf


def candles(count: int, trend: float = 0.12, phase: float = 0.0):
    rows = []
    for index in range(count):
        close = 100 + trend * index + 4.0 * __import__("math").sin(index / 4.0 + phase)
        rows.append({
            "date": f"2025-01-{(index % 28) + 1:02d}",
            "open": close - 0.5,
            "high": close + 1.0,
            "low": close - 1.0,
            "close": close,
            "volume": 1000 + index,
        })
    return rows


def test_mtf_returns_all_explicit_timeframes_and_unavailable_reason():
    result = analyze_elliott_mtf({
        "monthly": candles(40),
        "weekly": candles(180, phase=0.4),
        "daily": candles(260, phase=0.8),
    })
    assert set(result["by_timeframe"]) == {"monthly", "weekly", "daily"}
    assert result["by_timeframe"]["monthly"]["available"] is False
    assert "30" in result["by_timeframe"]["monthly"]["availability_reason_ar"]
    assert result["by_timeframe"]["daily"]["available"] is True


def test_consensus_is_weighted_and_exposes_contributions():
    result = analyze_elliott_mtf({
        "weekly": candles(180, trend=-0.20, phase=0.1),
        "daily": candles(260, trend=0.25, phase=1.5),
    })
    consensus = result["consensus"]
    assert consensus["timeframes"] == 2
    assert consensus["details"]
    assert all("weight" in item and "contribution" in item for item in consensus["details"])
    assert consensus["direction"] in {"up", "down", "mixed"}
    assert 0 <= consensus["confidence"] <= 1


def test_frame_contains_three_targets_invalidation_and_fibonacci_rules():
    result = analyze_elliott_mtf({"daily": candles(260, trend=0.18)})
    frame = result["by_timeframe"]["daily"]
    assert frame["available"] is True
    assert set(frame["targets"]) >= {"target_1", "target_2", "target_3"}
    assert all(frame["targets"][key]["price"] > 0 for key in ("target_1", "target_2", "target_3"))
    assert frame["invalidation"]["level"] > 0
    assert frame["relationships"]
    assert "wave2_retracement" in frame["relationships"]
    assert "expected_range" in frame["relationships"]["wave2_retracement"]


def test_hierarchy_can_mark_lower_timeframe_as_subwave():
    result = analyze_elliott_mtf({
        "monthly": candles(700, trend=-0.08),
        "weekly": candles(220, trend=0.14),
        "daily": candles(260, trend=0.2),
    })
    monthly = result["by_timeframe"]["monthly"]
    weekly = result["by_timeframe"]["weekly"]
    assert monthly["available"] is True
    assert weekly["available"] is True
    if weekly.get("parent_wave"):
        assert weekly["current_wave"]["number"] == "c"
        assert "داخل الموجة" in weekly["context_note"]


def test_conflicts_are_reported_as_structured_objects():
    result = analyze_elliott_mtf({
        "weekly": candles(220, trend=-0.25),
        "daily": candles(260, trend=0.25),
    })
    assert isinstance(result["conflicts"], list)
    for conflict in result["conflicts"]:
        assert "type" in conflict
        assert "severity" in conflict
        assert "message_ar" in conflict


def test_empty_input_is_safe_and_never_invents_analysis():
    result = analyze_elliott_mtf({"daily": []})
    frame = result["by_timeframe"]["daily"]
    assert frame["available"] is False
    assert result["consensus"]["timeframes"] == 0
    assert result["consensus"]["confidence"] == 0


def test_fibonacci_nearest_level_is_numeric():
    assert ElliottMTF._nearest_fib(0.618) == 0.618
    assert ElliottMTF._nearest_fib(None) is None
