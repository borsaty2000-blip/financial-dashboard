from typing import Any

RATIOS = (0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.618)


def retracement(low: float, high: float) -> dict[str, float]:
    distance = high - low
    return {str(ratio): high - distance * ratio for ratio in RATIOS[:-1]}


def extension(start: float, end: float) -> dict[str, float]:
    distance = end - start
    return {str(ratio): end + distance * ratio for ratio in (0.618, 1.0, 1.618)}


def target_from_pivots(pivots: list[dict[str, Any]]) -> dict[str, float]:
    if len(pivots) < 2:
        return {}
    start = float(pivots[-2]["price"])
    end = float(pivots[-1]["price"])
    targets = extension(start, end)
    targets["stop_loss"] = end * 0.97
    return {key: round(value, 6) for key, value in targets.items()}
