from __future__ import annotations

from typing import Any, Callable

import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression

from .forecasting import forecast_arima, forecast_lstm


def _clean(prices: list[float], minimum: int = 30) -> np.ndarray:
    values = np.asarray(prices, dtype=float)
    if values.size < minimum:
        raise ValueError(f"prices must contain at least {minimum} values")
    if not np.all(np.isfinite(values)) or np.any(values <= 0):
        raise ValueError("prices must contain only finite positive values")
    return values


def _trend(values: np.ndarray, steps: int) -> np.ndarray:
    model = LinearRegression().fit(np.arange(values.size).reshape(-1, 1), values)
    future = np.arange(values.size, values.size + steps).reshape(-1, 1)
    return np.maximum(model.predict(future), 1e-6)


def _random_forest(values: np.ndarray, steps: int, lookback: int = 8) -> np.ndarray:
    lookback = max(3, min(lookback, values.size // 3))
    x = np.asarray([values[i - lookback : i] for i in range(lookback, values.size)])
    y = values[lookback:]
    model = RandomForestRegressor(
        n_estimators=80, random_state=42, min_samples_leaf=2, n_jobs=1
    ).fit(x, y)
    window = values.tolist()
    output: list[float] = []
    for _ in range(steps):
        value = float(model.predict(np.asarray(window[-lookback:]).reshape(1, -1))[0])
        value = max(value, 1e-6)
        output.append(value)
        window.append(value)
    return np.asarray(output)


def _prophet(values: np.ndarray, steps: int) -> tuple[np.ndarray, str | None]:
    try:
        from prophet import Prophet  # type: ignore
        import pandas as pd

        dates = pd.date_range("2020-01-01", periods=values.size, freq="D")
        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=False,
        )
        model.fit(pd.DataFrame({"ds": dates, "y": values}))
        future = model.make_future_dataframe(periods=steps, freq="D")
        prediction = model.predict(future)["yhat"].tail(steps).to_numpy()
        return np.maximum(prediction, 1e-6), None
    except Exception as error:
        return _trend(values, steps), f"Prophet unavailable: {error}"


def _xgboost(values: np.ndarray, steps: int) -> tuple[np.ndarray, str | None]:
    try:
        from xgboost import XGBRegressor  # type: ignore

        lookback = max(3, min(8, values.size // 3))
        x = np.asarray([values[i - lookback : i] for i in range(lookback, values.size)])
        y = values[lookback:]
        model = XGBRegressor(
            n_estimators=80,
            max_depth=3,
            learning_rate=0.05,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=1,
        ).fit(x, y, verbose=False)
        window = values.tolist()
        output: list[float] = []
        for _ in range(steps):
            value = max(float(model.predict(np.asarray(window[-lookback:]).reshape(1, -1))[0]), 1e-6)
            output.append(value)
            window.append(value)
        return np.asarray(output), None
    except Exception as error:
        return _random_forest(values, steps), f"XGBoost unavailable: {error}"


def _mse(values: np.ndarray, predictor: Callable[[np.ndarray, int], np.ndarray]) -> float:
    holdout = min(max(5, values.size // 5), 20)
    if values.size <= holdout + 10:
        return max(float(np.var(values)), 1e-8)
    train, actual = values[:-holdout], values[-holdout:]
    try:
        predicted = np.asarray(predictor(train, holdout), dtype=float)[:holdout]
        return max(float(np.mean(np.square(actual - predicted))), 1e-8)
    except Exception:
        return max(float(np.mean(np.square(actual - train[-1]))), 1e-8)


def weighted_ensemble(predictions: list[dict[str, Any]]) -> dict[str, Any]:
    available = [item for item in predictions if item.get("forecast")]
    if not available:
        raise ValueError("no forecast model is available")
    inverse_mse = [1.0 / max(float(item["mse"]), 1e-8) for item in available]
    total = sum(inverse_mse)
    for item, inverse in zip(available, inverse_mse):
        item["weight"] = round(inverse / total, 6)
    horizon = min(len(item["forecast"]) for item in available)
    combined = np.zeros(horizon, dtype=float)
    for item in available:
        combined += np.asarray(item["forecast"][:horizon]) * item["weight"]
    return {
        "forecast": [round(float(value), 8) for value in combined],
        "models": predictions,
        "mse": round(sum(item["mse"] * item["weight"] for item in available), 8),
    }


def ensemble_forecast(prices: list[float], steps: int = 30) -> dict[str, Any]:
    values = _clean(prices)
    horizon = max(1, min(int(steps), 90))
    model_specs: list[tuple[str, Callable[[np.ndarray, int], np.ndarray], Callable[[], tuple[np.ndarray, str | None]]]] = [
        (
            "ARIMA",
            lambda data, count: np.asarray(forecast_arima(data.tolist(), count)["forecast"]),
            lambda: (_trend(values, horizon), "ARIMA fallback"),
        ),
        (
            "LSTM",
            lambda data, count: np.asarray(forecast_lstm(data.tolist(), count)["forecast"]),
            lambda: (_trend(values, horizon), "LSTM fallback"),
        ),
        ("Prophet", lambda data, count: _prophet(data, count)[0], lambda: _prophet(values, horizon)),
        ("XGBoost", lambda data, count: _xgboost(data, count)[0], lambda: _xgboost(values, horizon)),
        ("Random Forest", lambda data, count: _random_forest(data, count), lambda: (_trend(values, horizon), "Random Forest fallback")),
    ]
    results: list[dict[str, Any]] = []
    for name, predictor, fallback in model_specs:
        note: str | None = None
        try:
            forecast = predictor(values, horizon)
        except Exception as error:
            forecast, note = fallback()
            note = note or str(error)
        mse = _mse(values, predictor)
        accuracy = 100.0 / (1.0 + mse / max(float(values[-1] ** 2), 1e-8))
        results.append(
            {
                "model": name,
                "forecast": [round(float(value), 8) for value in forecast[:horizon]],
                "mse": round(float(mse), 8),
                "accuracy": round(float(accuracy), 2),
                "available": note is None,
                "note": note,
            }
        )
    result = weighted_ensemble(results)
    result["steps"] = horizon
    result["confidence"] = round(float(np.mean([item["accuracy"] for item in results])), 2)
    return result


def arima_forecast(prices: list[float], steps: int = 30) -> dict[str, Any]:
    return forecast_arima(prices, steps)


def lstm_forecast(prices: list[float], steps: int = 30) -> dict[str, Any]:
    return forecast_lstm(prices, steps)


def prophet_forecast(prices: list[float], steps: int = 30) -> dict[str, Any]:
    values = _clean(prices)
    forecast, note = _prophet(values, steps)
    return {"model": "Prophet", "steps": steps, "forecast": forecast.tolist(), "note": note}


def xgboost_forecast(prices: list[float], steps: int = 30) -> dict[str, Any]:
    values = _clean(prices)
    forecast, note = _xgboost(values, steps)
    return {"model": "XGBoost", "steps": steps, "forecast": forecast.tolist(), "note": note}


def random_forest_forecast(prices: list[float], steps: int = 30) -> dict[str, Any]:
    values = _clean(prices)
    return {"model": "Random Forest", "steps": steps, "forecast": _random_forest(values, steps).tolist()}


forecast = ensemble_forecast
available_models = lambda: ["ARIMA", "LSTM", "Prophet", "XGBoost", "Random Forest"]

__all__ = [
    "ensemble_forecast",
    "weighted_ensemble",
    "arima_forecast",
    "lstm_forecast",
    "prophet_forecast",
    "xgboost_forecast",
    "random_forest_forecast",
    "available_models",
]
