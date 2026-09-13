from typing import Any

import numpy as np
from arch import arch_model
from scipy.stats import norm, skew, kurtosis


def _returns(prices: list[float]) -> np.ndarray:
    values = np.asarray(prices, dtype=float)
    if values.size < 3:
        raise ValueError("prices must contain at least 3 values")
    if not np.all(np.isfinite(values)) or np.any(values <= 0):
        raise ValueError("prices must contain only finite positive values")
    return np.diff(np.log(values))


def calculate_statistics(prices: list[float]) -> dict[str, Any]:
    returns = _returns(prices)
    mean = float(np.mean(returns))
    std_dev = float(np.std(returns, ddof=1)) if returns.size > 1 else 0.0
    variance = float(np.var(returns, ddof=1)) if returns.size > 1 else 0.0
    skewness = float(skew(returns, bias=False)) if returns.size > 2 else 0.0
    excess_kurtosis = float(kurtosis(returns, fisher=True, bias=False)) if returns.size > 3 else 0.0
    distribution = {
        "pdf_at_mean": float(norm.pdf(mean, loc=mean, scale=max(std_dev, 1e-12))),
        "cdf_at_zero": float(norm.cdf(0.0, loc=mean, scale=max(std_dev, 1e-12))),
    }
    var_95 = float(-(mean + norm.ppf(0.05) * max(std_dev, 1e-12)))
    sharpe = float(mean / std_dev * np.sqrt(252)) if std_dev > 0 else 0.0
    garch: dict[str, Any]
    try:
        model = arch_model(returns * 100, mean="Constant", vol="GARCH", p=1, q=1, rescale=False)
        result = model.fit(disp="off", show_warning=False)
        forecast = result.forecast(horizon=1)
        variance_forecast = float(forecast.variance.iloc[-1, 0] / 10000)
        garch = {
            "omega": float(result.params.get("omega", 0.0)),
            "alpha": float(result.params.get("alpha[1]", 0.0)),
            "beta": float(result.params.get("beta[1]", 0.0)),
            "next_variance": variance_forecast,
            "next_volatility": float(np.sqrt(max(variance_forecast, 0.0))),
        }
    except Exception as error:
        garch = {"available": False, "error": str(error)}
    return {
        "observations": int(returns.size),
        "mean": mean,
        "std_dev": std_dev,
        "variance": variance,
        "skewness": skewness,
        "kurtosis": excess_kurtosis,
        "distribution": distribution,
        "garch": garch,
        "var_95": var_95,
        "sharpe_ratio": sharpe,
    }
