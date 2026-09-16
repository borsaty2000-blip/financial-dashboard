from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List
import math


class GannPro:
    ANGLES = {"1x8": (7.5, 0.125), "1x4": (15.0, 0.25), "1x3": (18.43, 0.333), "1x2": (26.25, 0.5), "1x1": (45.0, 1.0), "2x1": (63.75, 2.0), "3x1": (71.57, 3.0), "4x1": (75.0, 4.0), "8x1": (82.5, 8.0)}

    @classmethod
    def analyze(cls, candles: List[Dict[str, Any]]) -> Dict[str, Any]:
        if len(candles) < 50:
            return {"available": False, "reason": "بيانات غير كافية؛ يلزم 50 شمعة على الأقل"}
        closes = [float(c["close"]) for c in candles if float(c.get("close", 0)) > 0]
        highs = [float(c.get("high", c["close"])) for c in candles]
        lows = [float(c.get("low", c["close"])) for c in candles]
        high, low, current = max(highs), min(lows), closes[-1]
        high_index, low_index = highs.index(high), lows.index(low)
        range_size = max(high - low, 0.000001)
        base = math.sqrt(max((high + low) / 2, 0.000001))
        angles = {name: {"angle": angle, "price": round(low + range_size * ratio, 4), "status": "أعلى" if current >= low + range_size * ratio else "أدنى", "distance_pct": round(abs(current - (low + range_size * ratio)) / current * 100, 2)} for name, (angle, ratio) in cls.ANGLES.items()}
        square_levels = {str(degree): round((base + degree / 360) ** 2, 4) for degree in (45, 90, 135, 180, 225, 270, 315, 360)}
        last_date = cls._date(candles[-1].get("date") or candles[-1].get("time"))
        cycles = [{"days": days, "date": (last_date + timedelta(days=days)).strftime("%Y-%m-%d"), "name": f"دورة {days} يوم"} for days in (30, 45, 60, 90, 120, 180, 270, 360)]
        return {"available": True, "method": "Gann angles + Square of Nine + time cycles", "high": {"price": high, "index": high_index}, "low": {"price": low, "index": low_index}, "current_price": current, "range": round(range_size, 4), "angles": angles, "square_of_nine": {"base": round(base, 4), "levels": square_levels, "resistance": square_levels["90"], "strong_resistance": square_levels["180"], "support": round((base - 0.25) ** 2, 4), "strong_support": round((base - 0.5) ** 2, 4)}, "time_cycles": cycles, "support_resistance": {"support": round(low + range_size * 0.382, 4), "pivot": round(low + range_size * 0.5, 4), "resistance": round(low + range_size * 0.618, 4)}, "trend": "صاعد" if current > low + range_size * 0.5 else "هابط", "confidence_label": "مستويات هندسية تعليمية وليست احتمالاً مضموناً", "disclaimer": "تحليل Gann تعليمي؛ يحتاج تأكيداً بالسعر والحجم وبنية الاتجاه."}

    @staticmethod
    def _date(value: Any) -> datetime:
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
        except (TypeError, ValueError):
            return datetime.utcnow()


analyze = GannPro.analyze
