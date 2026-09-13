import numpy as np

from services.statistical import calculate_statistics

prices = (100 * np.exp(np.cumsum(np.linspace(0.001, 0.004, 120)))).tolist()
result = calculate_statistics(prices)
for key in ("mean", "std_dev", "variance", "skewness", "kurtosis", "distribution", "garch", "var_95", "sharpe_ratio"):
    assert key in result, key
assert result["observations"] == 119
assert np.isfinite(result["var_95"])
try:
    calculate_statistics([100, 0, 101])
except ValueError:
    pass
else:
    raise AssertionError("non-positive prices should fail")
print({"observations": result["observations"], "var_95": result["var_95"], "garch": result["garch"]})
