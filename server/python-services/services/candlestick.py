from typing import Any


def _candle(open_price: float, high: float, low: float, close: float) -> dict[str, float]:
    body = abs(close - open_price)
    upper = high - max(open_price, close)
    lower = min(open_price, close) - low
    range_size = high - low
    return {"open": open_price, "high": high, "low": low, "close": close, "body": body, "upper": upper, "lower": lower, "range": range_size}


def detect_candlestick_patterns(opens: list[float], highs: list[float], lows: list[float], closes: list[float], dates: list[str] | None = None) -> dict[str, Any]:
    if not (len(opens) == len(highs) == len(lows) == len(closes)):
        raise ValueError("opens, highs, lows and closes must have the same length")
    if len(closes) < 2:
        raise ValueError("at least 2 candles are required")
    if dates is not None and len(dates) != len(closes):
        raise ValueError("dates must have the same length as candles")
    candles = [_candle(float(o), float(h), float(l), float(c)) for o, h, l, c in zip(opens, highs, lows, closes)]
    for candle in candles:
        if candle["low"] <= 0 or candle["high"] < max(candle["open"], candle["close"]) or candle["low"] > min(candle["open"], candle["close"]):
            raise ValueError("invalid OHLC values")
    patterns: list[dict[str, Any]] = []
    for index, candle in enumerate(candles):
        body = max(candle["body"], 1e-12)
        label_date = dates[index] if dates else str(index)
        if candle["range"] > 0 and candle["body"] <= candle["range"] * 0.1:
            patterns.append({"index": index, "date": label_date, "pattern": "doji", "direction": "neutral", "strength": "medium"})
        if candle["lower"] >= body * 2 and candle["upper"] <= body and candle["close"] >= candle["open"]:
            patterns.append({"index": index, "date": label_date, "pattern": "hammer", "direction": "bullish", "strength": "strong"})
        if candle["upper"] >= body * 2 and candle["lower"] <= body and candle["close"] <= candle["open"]:
            patterns.append({"index": index, "date": label_date, "pattern": "shooting_star", "direction": "bearish", "strength": "strong"})
        if index == 0:
            continue
        previous = candles[index - 1]
        if previous["close"] < previous["open"] and candle["close"] > candle["open"] and candle["open"] <= previous["close"] and candle["close"] >= previous["open"]:
            patterns.append({"index": index, "date": label_date, "pattern": "bullish_engulfing", "direction": "bullish", "strength": "strong"})
        if previous["close"] > previous["open"] and candle["close"] < candle["open"] and candle["open"] >= previous["close"] and candle["close"] <= previous["open"]:
            patterns.append({"index": index, "date": label_date, "pattern": "bearish_engulfing", "direction": "bearish", "strength": "strong"})
    latest = patterns[-1] if patterns else None
    return {"patterns": patterns, "latest": latest, "count": len(patterns), "available": True, "disclaimer": "الأنماط التعليمية لا تمثل توصية استثمارية."}
