from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler


def extract_features(prices: list[float], volumes: list[float] | None = None) -> np.ndarray:
    values = np.asarray(prices, dtype=float)
    if values.size < 20 or not np.all(np.isfinite(values)) or np.any(values <= 0):
        raise ValueError("prices must contain at least 20 finite positive values")
    volume_values = np.asarray(volumes if volumes is not None else np.ones(values.size), dtype=float)
    if volume_values.size != values.size or np.any(~np.isfinite(volume_values)) or np.any(volume_values < 0):
        raise ValueError("volumes must match prices and contain non-negative finite values")
    returns = np.diff(np.log(values), prepend=np.log(values[0]))
    rolling_vol = np.asarray([np.std(returns[max(0, i - 9) : i + 1]) for i in range(values.size)])
    price_z = (values - np.mean(values)) / max(np.std(values), 1e-8)
    volume_z = (volume_values - np.mean(volume_values)) / max(np.std(volume_values), 1e-8)
    return np.column_stack((returns, rolling_vol, price_z, volume_z))


def detect_anomalies(features: np.ndarray) -> dict[str, Any]:
    if features.ndim != 2 or features.shape[0] < 20:
        raise ValueError("features must contain at least 20 rows")
    scaler = StandardScaler()
    scaled = scaler.fit_transform(features)
    forest = IsolationForest(n_estimators=120, contamination="auto", random_state=42)
    labels = forest.fit_predict(scaled)
    forest_score = -forest.score_samples(scaled)
    try:
        autoencoder = MLPRegressor(hidden_layer_sizes=(8, 3, 8), max_iter=300, random_state=42)
        autoencoder.fit(scaled, scaled)
        reconstruction = np.mean(np.square(scaled - autoencoder.predict(scaled)), axis=1)
    except Exception:
        reconstruction = np.zeros(features.shape[0])
    threshold = float(np.quantile(forest_score + reconstruction, 0.95))
    combined = forest_score + reconstruction
    indices = np.flatnonzero(combined >= threshold)
    return {
        "anomalies": [{"index": int(index), "score": round(float(combined[index]), 6)} for index in indices],
        "anomalyCount": int(indices.size),
        "latest": bool(indices.size and indices[-1] == features.shape[0] - 1),
        "latestScore": round(float(combined[-1]), 6),
        "threshold": round(threshold, 6),
        "method": "IsolationForest + AutoEncoder",
        "labels": [int(label) for label in labels],
    }


def get_anomaly_score(symbol: str, prices: list[float], volumes: list[float] | None = None) -> dict[str, Any]:
    result = detect_anomalies(extract_features(prices, volumes))
    return {"symbol": symbol.upper(), **result, "disclaimer": "الكشف إحصائي تعليمي وليس حكماً على السهم."}
