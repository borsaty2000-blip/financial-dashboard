from typing import Any

import numpy as np
from scipy.signal import find_peaks


def detect_pivots(prices: np.ndarray, order: int = 5) -> dict[str, list[tuple[int, float]]]:
    if prices.ndim != 1 or len(prices) < (order * 2 + 1):
        return {"peaks": [], "troughs": []}
    peaks, _ = find_peaks(prices, distance=order)
    troughs, _ = find_peaks(-prices, distance=order)
    return {
        "peaks": [(int(index), float(prices[index])) for index in peaks],
        "troughs": [(int(index), float(prices[index])) for index in troughs],
    }


def ordered_pivots(prices: list[float], order: int = 5) -> list[dict[str, Any]]:
    raw = detect_pivots(np.asarray(prices, dtype=float), order)
    pivots = [
        {"index": index, "price": price, "type": "peak"}
        for index, price in raw["peaks"]
    ] + [
        {"index": index, "price": price, "type": "trough"}
        for index, price in raw["troughs"]
    ]
    return sorted(pivots, key=lambda pivot: pivot["index"])
