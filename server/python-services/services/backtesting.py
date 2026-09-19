from typing import Any, Callable

import numpy as np

from .elliott_wave import analyze_elliott_wave
from .gann import analyze_gann


def _validate(prices: list[float], lookback: int, horizon: int) -> np.ndarray:
    values = np.asarray(prices, dtype=float)
    if values.size < max(lookback + horizon + 1, 10):
        raise ValueError("prices do not contain enough observations for the requested backtest")
    if not np.all(np.isfinite(values)) or np.any(values <= 0):
        raise ValueError("prices must contain only finite positive values")
    if lookback < 5 or horizon < 1:
        raise ValueError("lookback must be at least 5 and horizon must be positive")
    return values


def _metrics(returns: list[float], equity_curve: list[float], trades: list[dict[str, Any]], strategy: str, horizon: int) -> dict[str, Any]:
    array = np.asarray(returns, dtype=float)
    winning = array[array > 0]
    losing = array[array <= 0]
    sharpe = float(np.mean(array) / np.std(array, ddof=1) * np.sqrt(252 / horizon)) if array.size > 1 and np.std(array, ddof=1) > 0 else 0.0
    equity = np.asarray(equity_curve, dtype=float)
    running_max = np.maximum.accumulate(equity) if equity.size else np.asarray([1.0])
    drawdowns = equity / running_max - 1 if equity.size else np.asarray([0.0])
    gross_profit = float(np.sum(winning))
    gross_loss = abs(float(np.sum(losing)))
    downside = array[array < 0]
    sortino = float(np.mean(array) / np.std(downside, ddof=1) * np.sqrt(252 / horizon)) if downside.size > 1 and np.std(downside, ddof=1) > 0 else 0.0
    return {
        "strategy": strategy,
        "horizon": horizon,
        "total_trades": int(array.size),
        "winning_trades": int(winning.size),
        "losing_trades": int(losing.size),
        "win_rate": round(float(winning.size / array.size * 100), 4) if array.size else 0.0,
        "avg_return": round(float(np.mean(array) * 100), 6) if array.size else 0.0,
        "avg_loss": round(float(np.mean(losing) * 100), 6) if losing.size else 0.0,
        "sharpe_ratio": round(sharpe, 6),
        "sharpe": round(sharpe, 6),
        "sortino": round(sortino, 6),
        "profit_factor": round(gross_profit / gross_loss, 6) if gross_loss else None,
        "expectancy": round(float(np.mean(array) * 100), 6) if array.size else 0.0,
        "max_drawdown": round(float(np.min(drawdowns) * 100), 6) if drawdowns.size else 0.0,
        "equity_curve": [round(float(value), 8) for value in equity_curve],
        "trades": trades,
        "available": bool(array.size),
        "disclaimer": "Backtest تاريخي تعليمي؛ النتائج السابقة لا تضمن النتائج المستقبلية.",
    }


def _run(prices: list[float], signal: Callable[[np.ndarray], int], strategy: str, lookback: int = 30, horizon: int = 7, commission: float = 0.0, slippage: float = 0.0) -> dict[str, Any]:
    values = _validate(prices, lookback, horizon)
    returns: list[float] = []
    trades: list[dict[str, Any]] = []
    equity = [1.0]
    for index in range(lookback, len(values) - horizon):
        direction = int(signal(values[index - lookback : index]))
        if direction == 0:
            continue
        gross = direction * (values[index + horizon] / values[index] - 1)
        realized = gross - commission * 2 - slippage * 2
        returns.append(float(realized))
        equity.append(equity[-1] * (1 + float(realized)))
        trades.append({"entry_index": index, "exit_index": index + horizon, "direction": "long" if direction > 0 else "short", "gross_return": round(float(gross * 100), 6), "return": round(float(realized * 100), 6)})
    return _metrics(returns, equity, trades, strategy, horizon)


def backtest_elliott(prices: list[float], lookback: int = 30, horizon: int = 7, commission: float = 0.0, slippage: float = 0.0) -> dict[str, Any]:
    def signal(window: np.ndarray) -> int:
        result = analyze_elliott_wave(window.tolist(), order=max(1, min(5, len(window) // 6)))
        direction = result["current_wave"].get("direction")
        return 1 if direction == "up" else -1 if direction == "down" else 0
    return _run(prices, signal, "elliott", lookback, horizon, commission, slippage)


def backtest_gann(prices: list[float], lookback: int = 30, horizon: int = 7, commission: float = 0.0, slippage: float = 0.0) -> dict[str, Any]:
    def signal(window: np.ndarray) -> int:
        low = float(np.min(window))
        high = float(np.max(window))
        current = float(window[-1])
        one_by_one = low + (high - low)
        return 1 if current >= one_by_one * 0.995 else -1 if current < (low + high) / 2 else 0
    return _run(prices, signal, "gann", lookback, horizon, commission, slippage)


def _rsi(values: np.ndarray, period: int = 14) -> float:
    changes = np.diff(values)
    gains = np.maximum(changes, 0)
    losses = np.maximum(-changes, 0)
    if len(changes) < period:
        return 50.0
    average_gain = np.mean(gains[-period:])
    average_loss = np.mean(losses[-period:])
    if average_loss == 0:
        return 100.0
    return float(100 - 100 / (1 + average_gain / average_loss))


def _indicator_signal(window: np.ndarray) -> int:
    rsi = _rsi(window)
    short = float(np.mean(window[-12:]))
    long = float(np.mean(window[-26:]))
    if rsi < 35 and short >= long:
        return 1
    if rsi > 65 and short <= long:
        return -1
    return 0


def backtest_indicators(prices: list[float], strategy: str = "rsi_macd", lookback: int = 30, horizon: int = 7, commission: float = 0.0, slippage: float = 0.0) -> dict[str, Any]:
    if strategy != "rsi_macd":
        raise ValueError("unsupported strategy; use rsi_macd")
    return _run(prices, _indicator_signal, strategy, lookback, horizon, commission, slippage)
