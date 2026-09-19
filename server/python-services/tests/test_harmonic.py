import numpy as np

from services.backtesting import backtest_gann, backtest_indicators
from services.elliott_pro import ElliottPro


def test_harmonic_insufficient_data_is_explicit():
    result = ElliottPro.analyze([{"close": 100}] * 12)
    assert result["available"] is False


def test_backtest_applies_costs():
    prices = (100 + np.sin(np.arange(180) / 4) * 5 + np.arange(180) * 0.05).tolist()
    result = backtest_gann(prices, lookback=30, horizon=7, commission=0.002, slippage=0.001)
    assert result["available"] is True
    assert "equity_curve" in result
    assert "profit_factor" in result
    assert all("return" in trade for trade in result["trades"])


def test_indicator_backtest_contract():
    prices = (100 + np.sin(np.arange(180) / 5) * 4).tolist()
    result = backtest_indicators(prices, lookback=30, horizon=7)
    assert result["strategy"] == "rsi_macd"
    assert "max_drawdown" in result
    assert "disclaimer" in result
