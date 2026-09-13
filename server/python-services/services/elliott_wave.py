from typing import Any

import numpy as np

from .fibonacci import target_from_pivots
from .pivots import ordered_pivots


def _wave_size(left: dict[str, Any], right: dict[str, Any]) -> float:
    return abs(float(right["price"]) - float(left["price"]))


def find_impulse_pattern(pivots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    patterns: list[dict[str, Any]] = []
    for offset in range(max(0, len(pivots) - 5)):
        points = pivots[offset : offset + 6]
        if len(points) < 6:
            continue
        types = [point["type"] for point in points]
        if types not in (["trough", "peak", "trough", "peak", "trough", "peak"], ["peak", "trough", "peak", "trough", "peak", "trough"]):
            continue
        sizes = [_wave_size(points[i], points[i + 1]) for i in range(5)]
        upward = points[1]["price"] > points[0]["price"]
        direction_ok = all(
            (points[i + 1]["price"] > points[i]["price"]) == (i % 2 == 0) == upward
            for i in range(5)
        )
        if not direction_ok or sizes[0] == 0 or sizes[2] == 0:
            continue
        wave2_retrace = sizes[1] / sizes[0]
        wave4_retrace = sizes[3] / sizes[2]
        wave3_not_shortest = sizes[2] >= min(sizes[0], sizes[4])
        wave4_no_overlap = (points[4]["price"] > points[1]["price"]) if upward else (points[4]["price"] < points[1]["price"])
        if wave2_retrace < 1 and wave4_retrace < 1 and wave3_not_shortest and wave4_no_overlap and sizes[4] >= sizes[2] * 0.618:
            patterns.append(
                {
                    "start_index": points[0]["index"],
                    "end_index": points[5]["index"],
                    "direction": "up" if upward else "down",
                    "waves": [
                        {"number": number + 1, "from": points[number]["price"], "to": points[number + 1]["price"]}
                        for number in range(5)
                    ],
                    "validity_score": round(min(1.0, 0.5 + (1 - wave2_retrace) * 0.25 + (1 - wave4_retrace) * 0.25), 4),
                }
            )
    return patterns


def find_corrective_pattern(pivots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    patterns: list[dict[str, Any]] = []
    for offset in range(max(0, len(pivots) - 3)):
        points = pivots[offset : offset + 4]
        if len(points) < 4 or len({point["type"] for point in points}) < 2:
            continue
        if points[1]["price"] == points[0]["price"] or points[3]["price"] == points[2]["price"]:
            continue
        direction = "down" if points[1]["price"] < points[0]["price"] else "up"
        patterns.append(
            {
                "start_index": points[0]["index"],
                "end_index": points[3]["index"],
                "direction": direction,
                "waves": [
                    {"label": label, "from": points[index]["price"], "to": points[index + 1]["price"]}
                    for index, label in enumerate(("A", "B", "C"))
                ],
                "validity_score": 0.5,
            }
        )
    return patterns


def identify_current_wave(impulse: list[dict[str, Any]], corrective: list[dict[str, Any]]) -> dict[str, str]:
    if impulse and (not corrective or impulse[-1]["end_index"] >= corrective[-1]["end_index"]):
        return {"wave": "5", "type": "impulse", "direction": impulse[-1]["direction"]}
    if corrective:
        return {"wave": "C", "type": "corrective", "direction": corrective[-1]["direction"]}
    return {"wave": "unclear", "type": "unknown", "direction": "unknown"}


def analyze_elliott_wave(prices: list[float], order: int = 5) -> dict[str, Any]:
    if len(prices) < 3:
        raise ValueError("prices must contain at least 3 values")
    prices_array = np.asarray(prices, dtype=float)
    pivots = ordered_pivots(prices_array.tolist(), order=max(1, int(order)))
    impulse = find_impulse_pattern(pivots)
    corrective = find_corrective_pattern(pivots)
    current = identify_current_wave(impulse, corrective)
    evidence = len(impulse) + len(corrective)
    confidence = round(min(0.95, 0.3 + evidence * 0.1), 4)
    return {
        "pivots": pivots,
        "impulse_patterns": impulse,
        "corrective_patterns": corrective,
        "current_wave": current,
        "targets": target_from_pivots(pivots),
        "confidence": confidence,
    }
