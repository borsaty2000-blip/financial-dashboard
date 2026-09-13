from typing import Any

import numpy as np
from sklearn.preprocessing import MinMaxScaler
from statsmodels.tsa.arima.model import ARIMA


def _clean(prices: list[float], minimum: int = 20) -> np.ndarray:
    values = np.asarray(prices, dtype=float)
    if values.size < minimum:
        raise ValueError(f"prices must contain at least {minimum} values")
    if not np.all(np.isfinite(values)) or np.any(values <= 0):
        raise ValueError("prices must contain only finite positive values")
    return values


def forecast_arima(prices: list[float], steps: int = 30) -> dict[str, Any]:
    values = _clean(prices)
    horizon = max(1, min(int(steps), 365))
    model = ARIMA(values, order=(1, 1, 1), enforce_stationarity=False, enforce_invertibility=False)
    fitted = model.fit()
    forecast = np.asarray(fitted.forecast(steps=horizon), dtype=float)
    return {
        "model": "ARIMA(1,1,1)",
        "steps": horizon,
        "forecast": [round(float(value), 8) for value in forecast],
    }


def forecast_lstm(prices: list[float], steps: int = 30, lookback: int = 10) -> dict[str, Any]:
    values = _clean(prices, minimum=max(20, lookback + 2))
    horizon = max(1, min(int(steps), 365))
    if lookback < 2 or lookback >= len(values):
        raise ValueError("lookback must be at least 2 and smaller than prices length")
    import tensorflow as tf

    tf.keras.utils.set_random_seed(42)
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(values.reshape(-1, 1))
    x_train = []
    y_train = []
    for index in range(lookback, len(scaled)):
        x_train.append(scaled[index - lookback : index, 0])
        y_train.append(scaled[index, 0])
    x = np.asarray(x_train, dtype=np.float32).reshape(-1, lookback, 1)
    y = np.asarray(y_train, dtype=np.float32)
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(lookback, 1)),
        tf.keras.layers.LSTM(16),
        tf.keras.layers.Dense(1),
    ])
    model.compile(optimizer="adam", loss="mse")
    model.fit(x, y, epochs=5, batch_size=min(16, len(x)), verbose=0)
    window = scaled[-lookback:, 0].astype(np.float32).tolist()
    predictions: list[float] = []
    for _ in range(horizon):
        predicted = float(model.predict(np.asarray(window[-lookback:]).reshape(1, lookback, 1), verbose=0)[0, 0])
        window.append(predicted)
        predictions.append(predicted)
    forecast = scaler.inverse_transform(np.asarray(predictions).reshape(-1, 1)).ravel()
    return {
        "model": "LSTM(16)",
        "steps": horizon,
        "lookback": lookback,
        "forecast": [round(float(value), 8) for value in forecast],
    }
