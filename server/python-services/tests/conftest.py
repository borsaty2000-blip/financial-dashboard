import pytest


def _candles(values):
    return [{"date": f"2026-01-{(i % 28) + 1:02d}", "open": v - 0.5, "high": v + 1, "low": v - 1, "close": v, "volume": 1_000_000} for i, v in enumerate(values)]


@pytest.fixture
def simple_uptrend():
    return _candles([100 + i for i in range(80)])


@pytest.fixture
def comi_candles():
    return _candles([100 + i * 0.15 + ((i % 7) - 3) for i in range(250)])


@pytest.fixture
def swing_candles():
    values = [100, 102, 105, 110, 106, 101, 96, 100, 108, 118, 113, 106, 99, 105, 115, 128, 120, 111, 104, 110, 122, 135, 126, 116, 108, 115, 130, 145, 136, 125, 115, 122, 138, 153, 143, 132, 120, 128, 145, 160, 150, 139, 128, 135, 150, 166, 156, 145, 134, 142, 158, 174, 164, 153, 142, 150, 166, 182, 172, 161]
    return _candles(values)
