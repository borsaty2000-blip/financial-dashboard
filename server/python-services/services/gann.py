from datetime import datetime, timedelta
from typing import Any

import numpy as np


def calculate_gann_angles(low: float, high: float, bars: int) -> dict[str, dict[str, float]]:
    price_range = high - low
    safe_bars = max(1, bars)
    return {
        "1x1": {"angle": 45.0, "value": low + price_range, "slope": price_range / safe_bars},
        "2x1": {"angle": 63.75, "value": low + price_range * 2, "slope": price_range * 2 / safe_bars},
        "1x2": {"angle": 26.25, "value": low + price_range * 0.5, "slope": price_range * 0.5 / safe_bars},
        "4x1": {"angle": 75.0, "value": low + price_range * 4, "slope": price_range * 4 / safe_bars},
        "1x4": {"angle": 15.0, "value": low + price_range * 0.25, "slope": price_range * 0.25 / safe_bars},
    }


def square_of_nine(low: float, high: float) -> dict[str, float]:
    midpoint = max((low + high) / 2, 0.000001)
    base = float(np.sqrt(midpoint))
    return {
        "base": base,
        "level_45": (base + 0.125) ** 2,
        "level_90": (base + 0.25) ** 2,
        "level_180": (base + 0.5) ** 2,
        "level_360": (base + 1.0) ** 2,
        "resistance": (base + 0.25) ** 2,
        "support": max(0.0, (base - 0.25) ** 2),
    }


def calculate_time_cycles(dates: list[str]) -> list[dict[str, Any]]:
    if not dates:
        return []
    first = datetime.fromisoformat(dates[0].replace("Z", "+00:00"))
    cycles = ((30, "Monthly Cycle"), (45, "45-Day Cycle"), (60, "2-Month Cycle"), (90, "Quarterly Cycle"), (120, "4-Month Cycle"), (180, "Semi-Annual Cycle"), (270, "9-Month Cycle"), (360, "Annual Cycle"))
    return [
        {"days": days, "name": name, "target_date": (first + timedelta(days=days)).isoformat()}
        for days, name in cycles
    ]


def gann_fan_levels(low: float, high: float) -> dict[str, float]:
    distance = high - low
    return {f"level_{index}_8": low + distance * index / 8 for index in range(9)}


def analyze_gann(prices: list[float], dates: list[str]) -> dict[str, Any]:
    if not prices:
        raise ValueError("prices must not be empty")
    if len(prices) != len(dates):
        raise ValueError("dates must have the same length as prices")
    low = float(np.min(prices))
    high = float(np.max(prices))
    low_index = int(np.argmin(prices))
    high_index = int(np.argmax(prices))
    return {
        "high": high,
        "low": low,
        "high_index": high_index,
        "low_index": low_index,
        "angles": calculate_gann_angles(low, high, abs(high_index - low_index)),
        "square_of_nine": square_of_nine(low, high),
        "time_cycles": calculate_time_cycles(dates),
        "gann_fan": gann_fan_levels(low, high),
    }
