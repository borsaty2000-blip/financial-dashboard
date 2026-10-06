from __future__ import annotations

from typing import Any

import numpy as np


class ElliottMTF:
    """Deterministic multi-timeframe Elliott analysis with explicit hierarchy."""

    TIMEFRAMES = {
        "monthly": {"name": "شهري", "weight": 0.20, "step": 21},
        "weekly": {"name": "أسبوعي", "weight": 0.30, "step": 5},
        "daily": {"name": "يومي", "weight": 0.50, "step": 1},
        "4h": {"name": "4 ساعات", "weight": 0.10, "step": 1},
        "hourly": {"name": "ساعة", "weight": 0.05, "step": 1},
    }
    PERSONALITIES = {
        "1": "بداية الاتجاه الجديد — تجميع",
        "2": "تصحيح أولي — 50–61.8% من الموجة 1",
        "3": "موجة الدفع — الأقوى والأطول عادة",
        "4": "تصحيح — لا يتداخل مع الموجة 1",
        "5": "نهاية الاتجاه — تناقضات تبدأ",
        "A": "بداية التصحيح الكبير",
        "B": "ارتداد مضلل — فخ",
        "C": "نهاية التصحيح — إشارة انعكاس",
        "a": "تصحيح فرعي صاعد داخل C",
        "b": "ارتداد مضلل داخل C",
        "c": "اكتمال تصحيح داخل C",
        "?": "تصنيف غير مكتمل",
    }
    FIBS = (0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618, 2.0, 2.618)

    @classmethod
    def analyze(cls, candles_by_tf: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
        results: dict[str, Any] = {}
        for timeframe, candles in candles_by_tf.items():
            prices = np.asarray(
                [float(item["close"]) for item in candles if float(item.get("close", 0)) > 0],
                dtype=float,
            )
            config = cls.TIMEFRAMES.get(timeframe, {"name": timeframe, "weight": 0.0, "step": 1})
            if prices.size < 30:
                results[timeframe] = cls._unavailable(timeframe, int(prices.size), config)
                continue
            results[timeframe] = cls._analyze_timeframe(timeframe, prices)

        cls._enforce_hierarchy(results)
        consensus = cls._consensus(results)
        conflicts = cls._detect_timeframe_conflicts(results)
        return {
            "by_timeframe": results,
            "consensus": consensus,
            "conflicts": conflicts,
            "dominant_direction": consensus["direction"],
            "dominant_confidence": consensus["confidence"],
            "methodology": "pivot_structure_fibonacci_hierarchy_weighted_consensus",
            "disclaimer": "تصنيف Elliott احتمالي؛ لا يثبت الموجة ولا يمثل توصية تداول.",
        }

    @classmethod
    def _unavailable(cls, timeframe: str, count: int, config: dict[str, Any]) -> dict[str, Any]:
        return {
            "available": False,
            "availability_reason": "عدد الشموع غير كافٍ لهذا الإطار",
            "availability_reason_ar": "عدد الشموع غير كافٍ (يحتاج 30 على الأقل)",
            "timeframe": timeframe,
            "timeframe_ar": config["name"],
            "weight": config["weight"],
            "candles_count": count,
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
        config = cls.TIMEFRAMES.get(timeframe, {"name": timeframe, "weight": 0.0, "step": 1})
        prices = cls._resample(prices, int(config["step"]))
        pivots = cls._pivots(prices)
        wave = cls._identify(pivots, prices)
        alternate = cls._alternate(pivots, prices, wave)
        relationships = cls._relationships(pivots, wave["wave"])
        targets = cls._targets(pivots, wave)
        invalidation = cls._invalidation(pivots, wave)
        available = len(pivots) >= 4
        current_wave = {
            "number": wave["wave"],
            "direction": wave["direction"],
            "current_price": round(float(prices[-1]), 6),
            "label": f"الموجة {wave['wave']}",
            "next_expected": "3" if wave["wave"] in ("1", "2") else "C" if wave["wave"] == "5" else "5",
        }
        return {
            "available": available,
            "availability_reason": "بيانات محورية كافية" if available else "Insufficient candles: at least 30 are required",
            "availability_reason_ar": "بيانات محورية كافية" if available else "عدد الشموع غير كافٍ (يحتاج 30 على الأقل)",
            "timeframe": timeframe,
            "timeframe_ar": config["name"],
            "weight": config["weight"],
            "pivots": pivots[-10:],
            "waves": cls._wave_markers(pivots, wave["wave"]),
            "current_wave": current_wave,
            "wave_type": wave["type"],
            "wave_personality": cls.PERSONALITIES.get(wave["wave"], cls.PERSONALITIES["?"]),
            "personality": cls.PERSONALITIES.get(wave["wave"], cls.PERSONALITIES["?"]),
            "direction": wave["direction"],
            "confidence": wave["confidence"],
            "primary_count": wave,
            "alternate_count": alternate,
            "fib_relationships": relationships,
            "relationships": relationships,
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
            return {"wave": "?", "type": "unknown", "direction": "sideways", "confidence": 0.0}
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
    def _relationships(cls, pivots: list[dict[str, Any]], current_wave: str) -> dict[str, Any]:
        if len(pivots) < 4:
            return {}
        first, second, third, fourth = pivots[-4:]
        wave_one = abs(second["price"] - first["price"])
        wave_two = abs(third["price"] - second["price"])
        wave_three = abs(fourth["price"] - third["price"])
        retracement = wave_two / wave_one if wave_one else None
        extension = wave_three / wave_one if wave_one else None
        relationships: dict[str, Any] = {
            "wave2_retracement": {
                "value": round(retracement * 100, 2) if retracement is not None else None,
                "nearest_fib": cls._nearest_fib(retracement),
                "expected_range": "23.6% - 78.6%",
                "valid": cls._is_valid_range(retracement * 100 if retracement is not None else None, "23.6% - 78.6%"),
                "label": "تصحيح الموجة 2",
            },
            "wave3_extension": {
                "value": round(extension, 4) if extension is not None else None,
                "nearest_fib": cls._nearest_fib(extension),
                "expected_range": "1.0 - 2.618",
                "valid": cls._is_valid_range(extension, "1.0 - 2.618"),
                "label": "امتداد الموجة 3",
            },
        }
        if current_wave in {"3", "4", "5", "C"}:
            wave4 = abs(pivots[-1]["price"] - pivots[-2]["price"])
            ratio = wave4 / wave_three if wave_three else None
            relationships["wave4_retracement"] = {
                "value": round(ratio * 100, 2) if ratio is not None else None,
                "nearest_fib": cls._nearest_fib(ratio),
                "expected_range": "23.6% - 38.2%",
                "valid": cls._is_valid_range(ratio * 100 if ratio is not None else None, "23.6% - 38.2%"),
                "label": "تصحيح الموجة 4",
            }
        if current_wave in {"4", "5", "C"}:
            relationships["wave5_extension"] = {
                "value": None,
                "nearest_fib": None,
                "expected_range": "61.8% - 161.8%",
                "valid": False,
                "label": "امتداد الموجة 5",
            }
        return relationships

    @classmethod
    def _nearest_fib(cls, value: float | None) -> float | None:
        return min(cls.FIBS, key=lambda fib: abs(fib - value)) if value is not None else None

    @staticmethod
    def _is_valid_range(value: float | None, expected_range: str | None) -> bool:
        if value is None or not expected_range:
            return False
        try:
            parts = expected_range.replace("%", "").split(" - ")
            if len(parts) != 2:
                return False
            low, high = sorted((float(parts[0]), float(parts[1])))
            return low <= value <= high
        except (TypeError, ValueError):
            return False

    @staticmethod
    def _targets(pivots: list[dict[str, Any]], wave: dict[str, Any]) -> dict[str, Any]:
        if len(pivots) < 3:
            return {}
        base = pivots[-1]["price"]
        length = abs(pivots[-2]["price"] - pivots[-3]["price"])
        direction = 1 if wave["direction"] == "up" else -1 if wave["direction"] == "down" else 0
        return {
            "target_1": {"price": round(base + direction * length, 6), "fib_ratio": 1.0},
            "target_2": {"price": round(base + direction * length * 1.618, 6), "fib_ratio": 1.618},
            "target_3": {"price": round(base + direction * length * 2.618, 6), "fib_ratio": 2.618},
            "method": "Fibonacci extension",
        }

    @staticmethod
    def _invalidation(pivots: list[dict[str, Any]], wave: dict[str, Any]) -> dict[str, Any]:
        if len(pivots) < 2:
            return {}
        previous = pivots[-2]
        current = pivots[-1]
        if wave["direction"] == "up":
            level = previous["price"]
            reason = f"كسر قاع/مستوى الموجة السابقة عند {level}"
        elif wave["direction"] == "down":
            level = previous["price"]
            reason = f"اختراق قمة/مستوى الموجة السابقة عند {level}"
        else:
            level = previous["price"]
            reason = "تغير التصنيف عند كسر مستوى الموجة السابقة بإغلاق مؤكد"
        price = float(current["price"])
        return {"level": round(float(level), 6), "reason": reason, "distance_pct": round(abs(price - float(level)) / price * 100, 2) if price else None}

    @staticmethod
    def _wave_markers(pivots: list[dict[str, Any]], current_wave: str) -> list[dict[str, Any]]:
        labels = ["1", "2", "3", "4", "5", "A", "B", "C"]
        markers = []
        for index, pivot in enumerate(pivots[-8:]):
            marker_index = int(pivot["index"])
            number = labels[index % len(labels)]
            markers.append({"index": marker_index, "end_date": None, "number": number, "direction": "up" if pivot["type"] == "LOW" else "down", "label": f"الموجة {number}"})
        return markers

    @classmethod
    def _enforce_hierarchy(cls, frames: dict[str, Any]) -> None:
        monthly = frames.get("monthly", {})
        weekly = frames.get("weekly", {})
        daily = frames.get("daily", {})
        if monthly.get("available") and weekly.get("available"):
            monthly_wave = cls._wave_number(monthly)
            weekly_wave = cls._wave_number(weekly)
            if monthly_wave in {"A", "B", "C"} and weekly_wave in {"1", "2", "3"}:
                weekly["current_wave"]["number"] = "c"
                weekly["current_wave"]["label"] = "الموجة c الفرعية"
                weekly["wave_personality"] = cls.PERSONALITIES["c"]
                weekly["parent_wave"] = monthly_wave
                weekly["context_note"] = f"الموجة الأسبوعية داخل الموجة {monthly_wave} الشهرية"
        if weekly.get("available") and daily.get("available"):
            if cls._direction(weekly) == "down" and cls._wave_number(weekly) == "C" and cls._direction(daily) == "up":
                daily["is_correction_within"] = "C"
                daily["parent_trend"] = "down"
                daily["context_note"] = "تصحيح صاعد داخل ترند هابط أسبوعي"

    @staticmethod
    def _wave_number(frame: dict[str, Any]) -> str:
        current = frame.get("current_wave", {})
        return str(current.get("number", "")) if isinstance(current, dict) else str(current)

    @staticmethod
    def _direction(frame: dict[str, Any]) -> str:
        current = frame.get("current_wave", {})
        return str(current.get("direction", frame.get("direction", "sideways"))) if isinstance(current, dict) else str(frame.get("direction", "sideways"))

    @classmethod
    def _consensus(cls, results: dict[str, Any]) -> dict[str, Any]:
        details = []
        total_weight = 0.0
        total_score = 0.0
        for timeframe, config in cls.TIMEFRAMES.items():
            frame = results.get(timeframe)
            if not frame or not frame.get("available"):
                continue
            weight = float(config["weight"])
            direction = cls._direction(frame)
            confidence = float(frame.get("confidence", 0.0))
            direction_value = {"up": 1.0, "down": -1.0, "sideways": 0.0}.get(direction, 0.0)
            contribution = weight * direction_value * confidence
            total_weight += weight
            total_score += contribution
            details.append({"timeframe": timeframe, "direction": direction, "confidence": confidence, "weight": weight, "contribution": round(contribution, 3)})
        normalized = total_score / total_weight if total_weight else 0.0
        direction = "up" if normalized > 0.15 else "down" if normalized < -0.15 else "mixed"
        return {
            "direction": direction,
            "score": round(normalized, 3),
            "confidence": round(abs(normalized), 4),
            "confidence_pct": round(abs(normalized) * 100),
            "details": details,
            "timeframes": len(details),
            "explanation_ar": " | ".join(f"{item['timeframe']}: {item['direction']} ({round(item['confidence'] * 100)}%) × وزن {round(item['weight'] * 100)}%" for item in details),
        }

    @classmethod
    def _detect_timeframe_conflicts(cls, frames: dict[str, Any]) -> list[dict[str, Any]]:
        conflicts = []
        weekly = frames.get("weekly", {})
        daily = frames.get("daily", {})
        weekly_direction = cls._direction(weekly)
        daily_direction = cls._direction(daily)
        if weekly.get("available") and daily.get("available") and weekly_direction != daily_direction and {weekly_direction, daily_direction} <= {"up", "down"}:
            conflicts.append({"type": "weekly_vs_daily", "weekly": weekly_direction, "daily": daily_direction, "severity": "high", "message_ar": f"تعارض بين الأسبوعي ({weekly_direction}) واليومي ({daily_direction})"})
        if cls._wave_number(weekly) == "C" and cls._wave_number(daily) == "A":
            conflicts.append({"type": "wave_logic", "severity": "critical", "message_ar": "الموجة C (نهاية التصحيح) لا يمكن أن تتزامن مع الموجة A (بداية التصحيح)"})
        return conflicts


def analyze_elliott_mtf(candles_by_tf: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    return ElliottMTF.analyze(candles_by_tf)
