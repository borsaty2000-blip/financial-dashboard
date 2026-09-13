from datetime import datetime, timezone
from typing import Sequence

from .validators import validate_dates, validate_prices


def prepare_prices(prices: Sequence[float]) -> list[float]:
    return validate_prices(prices)


def prepare_dates(dates: Sequence[str], expected_length: int) -> list[str]:
    normalized = validate_dates(dates, expected_length)
    return [
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        .astimezone(timezone.utc)
        .isoformat()
        for value in normalized
    ]
