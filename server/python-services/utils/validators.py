from datetime import datetime
from typing import Sequence


def validate_prices(prices: Sequence[float], minimum: int = 3) -> list[float]:
    if len(prices) < minimum:
        raise ValueError(f"prices must contain at least {minimum} values")
    cleaned: list[float] = []
    for value in prices:
        number = float(value)
        if number <= 0:
            raise ValueError("prices must contain only positive values")
        cleaned.append(number)
    return cleaned


def validate_dates(dates: Sequence[str], expected_length: int) -> list[str]:
    if len(dates) != expected_length:
        raise ValueError("dates must have the same length as prices")
    for date in dates:
        datetime.fromisoformat(date.replace("Z", "+00:00"))
    return list(dates)
