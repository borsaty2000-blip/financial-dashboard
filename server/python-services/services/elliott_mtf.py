from __future__ import annotations

from typing import Any

import numpy as np


class ElliottMTF:
    TIMEFRAMES = {
        "monthly": {"name": "شهري", "weight": 4.0, "step": 21},
        "weekly": {"name": "أسبوعي", "weight": 3.0, "step": 5},
        "daily": {"name": "يومي", "weight": 2.0, "step": 1},
        "4h": {"name": "4 ساعات", "weight": 1.0, "step": 1},
        "hourly": {"name": "ساعة", "weight": 0.5, "step": 1},
    }
    PERSONALITIES = {
        "1": "موجة تجميع — بداية اتجاه محتمل",
        "2": "موجة تصحيح — اختبار لمدى الموجة الأولى",
        "3": "موجة دفع — عادةً الأقوى داخل الاتجاه",
        "4": "موجة تصحيح — مراقبة عدم التداخل",
        "5": "موجة دفع نهائية — احتمال نضج الاتجاه",
        "A": "بداية تصحيح أكبر",
        "B": "ارتداد داخل تصحيح — خطر الإشارة المضللة",
        "C": "موجة تصحيح نهائية محتملة",
        "?": "تصنيف غير مكتمل",
    }
    FIBS = (0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618, 2.0, 2.618)

    @classmethod
    def analyze(cls, candles_by_tf: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
        results: dict[str, Any] = {}
        for timeframe, candles in candles_by_tf.items():
            prices = np.asarray([float(item["close"]) for item in candles if float(item.get("close", 0)) > 0], dtype=float)
            if prices.size < 30:
                continue
            results[timeframe] = cls._analyze_timeframe(timeframe, prices)
        consensus = cls._consensus(results)
        return {
            "by_timeframe": results,
            "consensus": consensus,
            "dominant_direction": consensus["direction"],
            "dominant_confidence": consensus["confidence"],
            "methodology": "pivot_structure_fibonacci_alternatives",
            "disclaimer": "تصنيف Elliott احتمالي تعليمي؛ لا يثبت الموجة ولا يمثل توصية تداول.",
        }

    @classmethod
    def _resample(cls, prices: np.ndarray, step: int) -> np.ndarray:
        if step <= 1:
            return prices
        count = prices.size // step
        if count < 30:
            return prices
        return prices[-count * step :].reshape(count, step)[:, -1]

    @classmethod
    def _analyze_timeframe(cls, timeframe: str, prices: np.ndarray) -> dict[str, Any]:
        config = cls.TIMEFRAMES.get(timeframe, {"name": timeframe, "weight": 1.0, "step": 1})
        prices = cls._resample(prices, int(config["step"]))
        pivots = cls._pivots(prices)
        wave = cls._identify(pivots, prices)
        alternate = cls._alternate(pivots, prices, wave)
        relationships = cls._relationships(pivots)
        targets = cls._targets(pivots, wave)
        invalidation = cls._invalidation(pivots, wave)
        return {
	            "available": len(pivots) >= 4,
	            "availability_reason": "بيانات محورية كافية" if len(pivots) >= 4 else "لا توجد نقاط محورية كافية لهذا الإطار",
            "timeframe": timeframe,
            "timeframe_ar": config["name"],
            "weight": config["weight"],
            "pivots": pivots[-10:],
            "current_wave": wave["wave"],
            "wave_type": wave["type"],
            "wave_personality": cls.PERSONALITIES[wave["wave"]],
            "direction": wave["direction"],
            "confidence": wave["confidence"],
            "primary_count": wave,
            "alternate_count": alternate,
            "fib_relationships": relationships,
            "targets": targets,
            "invalidation_level": invalidation,
            "invalidation": invalidation,
            "alternatives": alternate,
            "sample_size": int(prices.size),
        }

    @staticmethod
    def _pivots(prices: np.ndarray, order: int = 3) -> list[dict[str, Any]]:
        pivots: list[dict[str, Any]] = []
        for index in range(order, len(prices) - order):
            window = prices[index - order : index + order + 1]
            if prices[index] == np.max(window) and prices[index] > prices[index - 1]:
                pivots.append({"index": index, "price": round(float(prices[index]), 6), "type": "HIGH"})
            elif prices[index] == np.min(window) and prices[index] < prices[index - 1]:
                pivots.append({"index": index, "price": round(float(prices[index]), 6), "type": "LOW"})
        return pivots

    @staticmethod
    def _identify(pivots: list[dict[str, Any]], prices: np.ndarray) -> dict[str, Any]:
        if len(pivots) < 5:
            return {"wave": "?", "type": "unknown", "direction": "unknown", "confidence": 0.0}
        moves = [abs(pivots[i]["price"] - pivots[i - 1]["price"]) for i in range(len(pivots) - 4, len(pivots))]
        trend = float(prices[-1] - prices[-20]) if len(prices) >= 20 else 0.0
        last_type = pivots[-1]["type"]
        if last_type == "LOW" and trend < 0:
            return {"wave": "C", "type": "corrective", "direction": "down", "confidence": 0.70}
        if last_type == "HIGH" and trend < 0:
            return {"wave": "B", "type": "corrective", "direction": "up", "confidence": 0.55}
        if trend > 0 and moves[-1] >= moves[-3] * 1.35:
            return {"wave": "3", "type": "impulse", "direction": "up", "confidence": 0.78}
        if trend > 0:
            return {"wave": "5" if last_type == "HIGH" else "3", "type": "impulse", "direction": "up", "confidence": 0.62}
        if trend < 0:
            return {"wave": "A", "type": "corrective", "direction": "down", "confidence": 0.58}
        return {"wave": "?", "type": "sideways", "direction": "sideways", "confidence": 0.42}

    @classmethod
    def _alternate(cls, pivots: list[dict[str, Any]], prices: np.ndarray, primary: dict[str, Any]) -> dict[str, Any]:
        if primary["wave"] in {"3", "5"}:
            return {"wave": "5" if primary["wave"] == "3" else "3", "direction": "up", "confidence": 0.35, "condition": "تأكيد الاختراق واستمرار القمم الصاعدة"}
        if primary["wave"] in {"A", "C"}:
            return {"wave": "3", "direction": "down", "confidence": 0.32, "condition": "استمرار القيعان الهابطة دون استعادة المقاومة"}
        return {"wave": "?", "direction": "sideways", "confidence": 0.25, "condition": "الحاجة إلى نقاط محورية إضافية"}

    @classmethod
    def _relationships(cls, pivots: list[dict[str, Any]]) -> dict[str, Any]:
        if len(pivots) < 4:
            return {}
        first, second, third, fourth = pivots[-4:]
        wave_one = abs(second["price"] - first["price"])
        wave_two = abs(third["price"] - second["price"])
        wave_three = abs(fourth["price"] - third["price"])
        retracement = wave_two / wave_one if wave_one else None
        extension = wave_three / wave_one if wave_one else None
        return {
            "wave2_retracement": {
                "value": round(retracement * 100, 2) if retracement is not None else None,
                "nearest_fib": min(cls.FIBS, key=lambda value: abs(value - retracement)) if retracement is not None else None,
                "valid": bool(retracement is not None and 0.236 <= retracement <= 0.786),
            },
            "wave3_extension": {
                "value": round(extension, 4) if extension is not None else None,
                "nearest_fib": min(cls.FIBS, key=lambda value: abs(value - extension)) if extension is not None else None,
                "valid": bool(extension is not None and extension >= 1.0),
            },
        }

    @staticmethod
    def _targets(pivots: list[dict[str, Any]], wave: dict[str, Any]) -> dict[str, Any]:
        if len(pivots) < 3:
            return {}
        base = pivots[-1]["price"]
        length = abs(pivots[-2]["price"] - pivots[-3]["price"])
        direction = 1 if wave["direction"] == "up" else -1 if wave["direction"] == "down" else 0
        return {
            "target_1": round(base + direction * length, 6),
            "target_2": round(base + direction * length * 1.618, 6),
            "target_3": round(base + direction * length * 2.618, 6),
            "method": "Fibonacci extension",
        }

    @staticmethod
    def _invalidation(pivots: list[dict[str, Any]], wave: dict[str, Any]) -> dict[str, Any]:
        if len(pivots) < 3:
            return {}
        level = pivots[-2]["price"] if wave["direction"] == "up" else pivots[-2]["price"]
        return {"level": level, "reason": "يتغير التصنيف عند كسر المستوى بإغلاق مؤكد"}

    @staticmethod
    def _consensus(results: dict[str, Any]) -> dict[str, Any]:
        if not results:
            return {"direction": "unknown", "confidence": 0, "agreement": 0, "timeframes": 0}
        scores = {"up": 1.0, "down": -1.0, "sideways": 0.0, "unknown": 0.0}
        total = sum(float(item["weight"]) for item in results.values())
        weighted = sum(scores[item["direction"]] * float(item["weight"]) * float(item["confidence"]) for item in results.values())
        normalized = weighted / total if total else 0
        direction = "up" if normalized > 0.15 else "down" if normalized < -0.15 else "sideways"
        agreement = sum(1 for item in results.values() if item["direction"] == direction) / len(results)
        return {"direction": direction, "confidence": round(abs(normalized), 4), "agreement": round(agreement, 4), "timeframes": len(results)}


def analyze_elliott_mtf(candles_by_tf: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    return ElliottMTF.analyze(candles_by_tf)
