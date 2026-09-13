import math

from services.forecasting import forecast_arima, forecast_lstm

prices = [100 * math.exp(0.002 * index + 0.01 * math.sin(index / 3)) for index in range(60)]
arima = forecast_arima(prices, steps=3)
assert len(arima["forecast"]) == 3
lstm = forecast_lstm(prices, steps=3, lookback=8)
assert len(lstm["forecast"]) == 3
print({"arima": arima["forecast"], "lstm": lstm["forecast"]})
