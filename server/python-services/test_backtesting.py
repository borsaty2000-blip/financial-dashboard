import math

from services.backtesting import backtest_elliott, backtest_gann, backtest_indicators

prices = [100 * math.exp(0.0015 * index + 0.05 * math.sin(index / 4)) for index in range(180)]
for result in (backtest_elliott(prices), backtest_gann(prices), backtest_indicators(prices)):
    assert result["total_trades"] >= 0
    assert "win_rate" in result and "equity_curve" in result
try:
    backtest_indicators(prices, strategy="unknown")
except ValueError:
    pass
else:
    raise AssertionError("unsupported strategy should fail")
print("backtest_ok", len(prices))
