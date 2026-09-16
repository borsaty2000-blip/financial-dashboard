from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
import math


@dataclass
class Wave:
    number: str
    kind: str
    start_price: float
    end_price: float
    start_index: int
    end_index: int
    length: float
    fibonacci_ratio: Optional[float] = None
    personality: str = ""
    label_ar: str = ""


class ElliottPro:
    MIN_SWING_PCT = 0.02
    LOOKBACK = 5
    LABELS = {
        "1": ("الموجة 1", "بداية الاتجاه الجديد — تجميع"),
        "2": ("الموجة 2", "تصحيح أولي — غالباً 50–61.8%"),
        "3": ("الموجة 3", "موجة الدفع — الأقوى عادةً"),
        "4": ("الموجة 4", "تصحيح لا يتداخل مع الموجة 1"),
        "5": ("الموجة 5", "نهاية الاتجاه وتراجع الزخم"),
        "A": ("الموجة A", "بداية التصحيح الكبير"),
        "B": ("الموجة B", "ارتداد تصحيحي قد يكون مضللاً"),
        "C": ("الموجة C", "نهاية التصحيح المحتملة"),
    }

    @classmethod
    def analyze(cls, candles: List[Dict[str, Any]]) -> Dict[str, Any]:
        clean = [c for c in candles if cls._valid_candle(c)]
        if len(clean) < 30:
            return {"available": False, "reason": "بيانات غير كافية؛ يلزم 30 شمعة على الأقل"}
        closes = [float(c["close"]) for c in clean]
        highs = [float(c.get("high", c["close"])) for c in clean]
        lows = [float(c.get("low", c["close"])) for c in clean]
        pivots = cls._zigzag(closes, highs, lows)
        if len(pivots) < 5:
            return {"available": False, "reason": "لم يتم كشف خمس نقاط تأرجح واضحة", "pivots_count": len(pivots)}
        waves = cls._waves(pivots)
        validation = cls._validate(waves)
        current = cls._current(waves, closes[-1])
        relationships = cls._relationships(waves)
        targets = cls._targets(waves, current, closes[-1])
        invalidation = cls._invalidation(waves, current, closes[-1])
        confidence = cls._confidence(validation, relationships)
        return {
            "available": True,
            "method": "ZigZag + Elliott rules + Fibonacci relationships",
            "pivots": pivots,
            "pivots_count": len(pivots),
            "waves": [cls._wave_dict(w) for w in waves],
            "validation": validation,
            "relationships": relationships,
            "current_wave": current,
            "personality": cls.LABELS.get(current["number"], ("غير محددة", "بيانات غير كافية"))[1],
            "targets": targets,
            "invalidation": invalidation,
            "alternatives": cls._alternatives(current, invalidation),
            "confidence": confidence / 100,
            "confidence_percent": confidence,
            "confidence_label": "درجة توافق الأدلة وليست احتمالاً مضموناً",
            "disclaimer": "تحليل تعليمي احتمالي؛ لا يضمن حركة السعر ولا يمثل توصية استثمارية.",
        }

    @staticmethod
    def _valid_candle(c: Dict[str, Any]) -> bool:
        try:
            return all(math.isfinite(float(c[k])) and float(c[k]) > 0 for k in ("close",))
        except (KeyError, TypeError, ValueError):
            return False

    @classmethod
    def _zigzag(cls, prices: List[float], highs: List[float], lows: List[float]) -> List[Dict[str, Any]]:
        threshold = max(prices[-1] * cls.MIN_SWING_PCT, 1e-9)
        candidates: List[Dict[str, Any]] = []
        for i in range(cls.LOOKBACK, len(prices) - cls.LOOKBACK):
            hi = highs[i] >= max(highs[i-cls.LOOKBACK:i+cls.LOOKBACK+1])
            lo = lows[i] <= min(lows[i-cls.LOOKBACK:i+cls.LOOKBACK+1])
            if hi:
                candidates.append({"index": i, "price": highs[i], "type": "HIGH"})
            if lo:
                candidates.append({"index": i, "price": lows[i], "type": "LOW"})
        pivots: List[Dict[str, Any]] = []
        for point in sorted(candidates, key=lambda x: x["index"]):
            prev = pivots[-1] if pivots else None
            if prev and point["type"] == prev["type"]:
                stronger = point["price"] > prev["price"] if point["type"] == "HIGH" else point["price"] < prev["price"]
                if stronger:
                    pivots[-1] = point
                continue
            if prev and abs(point["price"] - prev["price"]) < threshold:
                continue
            pivots.append(point)
        return pivots

    @classmethod
    def _waves(cls, pivots: List[Dict[str, Any]]) -> List[Wave]:
        waves: List[Wave] = []
        labels = ["1", "2", "3", "4", "5", "A", "B", "C"]
        for i, (a, b) in enumerate(zip(pivots, pivots[1:])):
            number = labels[i % len(labels)]
            label, personality = cls.LABELS[number]
            waves.append(Wave(number, "impulse" if number in "135" else "corrective", a["price"], b["price"], a["index"], b["index"], abs(b["price"] - a["price"]), personality=personality, label_ar=label))
        return waves[-8:]

    @classmethod
    def _validate(cls, waves: List[Wave]) -> Dict[str, Any]:
        if len(waves) < 5:
            return {"valid": False, "total_rules": 0, "passed_rules": 0, "errors": [], "rule_checks": {}}
        w1, w2, w3, w4, w5 = waves[-5:]
        r2 = w2.length / w1.length if w1.length else 99
        checks = {
            "wave2_retracement": {"passed": r2 <= 1, "value_percent": round(r2 * 100, 1), "rule": "الموجة 2 لا تتجاوز 100% من الموجة 1"},
            "wave3_not_shortest": {"passed": w3.length >= min(w1.length, w5.length), "value": round(w3.length, 4), "rule": "الموجة 3 ليست الأقصر"},
            "wave4_no_overlap": {"passed": not (w4.start_price >= min(w1.start_price, w1.end_price) and w4.start_price <= max(w1.start_price, w1.end_price)), "rule": "الموجة 4 لا تتداخل مع الموجة 1"},
        }
        errors = [v["rule"] for v in checks.values() if not v["passed"]]
        return {"valid": not errors, "total_rules": len(checks), "passed_rules": sum(1 for v in checks.values() if v["passed"]), "errors": errors, "rule_checks": checks}

    @staticmethod
    def _fib(value: float) -> float:
        return min((0.236, 0.382, 0.5, 0.618, 0.786, 1.0, 1.272, 1.618, 2.0, 2.618), key=lambda x: abs(x - abs(value)))

    @classmethod
    def _relationships(cls, waves: List[Wave]) -> Dict[str, Any]:
        if len(waves) < 5:
            return {}
        w1, w2, w3, w4, w5 = waves[-5:]
        ratios = [("wave2_retracement", w2.length / w1.length if w1.length else 0, "50% - 61.8%"), ("wave3_extension", w3.length / w1.length if w1.length else 0, "1.618 - 2.618"), ("wave4_retracement", w4.length / w3.length if w3.length else 0, "23.6% - 38.2%"), ("wave5_extension", w5.length / (w1.length + w3.length) if (w1.length + w3.length) else 0, "0.618")]
        return {name: {"value": round(ratio * 100, 2) if "retracement" in name else round(ratio, 3), "ratio": round(ratio, 4), "nearest_fib": cls._fib(ratio), "expected_range": expected, "valid": (0.4 <= ratio <= 0.7 if name == "wave2_retracement" else ratio >= 1 if name == "wave3_extension" else 0.2 <= ratio <= 0.5 if name == "wave4_retracement" else 0.4 <= ratio <= 1), "label": name} for name, ratio, expected in ratios}

    @staticmethod
    def _current(waves: List[Wave], price: float) -> Dict[str, Any]:
        w = waves[-1]
        direction = "up" if w.end_price > w.start_price else "down"
        return {"number": w.number, "direction": direction, "current_price": price, "label": w.label_ar, "next_expected": "3" if w.number in ("1", "2") else "C" if w.number == "5" else "5"}

    @staticmethod
    def _targets(waves: List[Wave], current: Dict[str, Any], price: float) -> Dict[str, Any]:
        swing = max(waves[-1].length, price * 0.02)
        sign = 1 if current["direction"] == "up" else -1
        return {f"target_{i}": {"price": round(price + sign * swing * ratio, 2), "fib_ratio": ratio, "label": f"هدف {i} — امتداد Fibonacci {ratio * 100:.1f}%"} for i, ratio in enumerate((0.618, 1.0, 1.618), 1)} | {"based_on": "آخر موجة مكتملة"}

    @staticmethod
    def _invalidation(waves: List[Wave], current: Dict[str, Any], price: float) -> Dict[str, Any]:
        level = waves[-2].start_price if len(waves) > 1 else waves[-1].start_price
        return {"level": round(level, 2), "reason": "يبطل السيناريو عند كسر المستوى بإغلاق مؤكد وتأكيد حجم التداول.", "distance_pct": round(abs(price - level) / price * 100, 2)}

    @staticmethod
    def _alternatives(current: Dict[str, Any], invalidation: Dict[str, Any]) -> Dict[str, Any]:
        return {"primary": {"wave": current["number"], "scenario": "العد الأساسي وفق آخر نقاط ZigZag والقواعد المتاحة."}, "alternate": {"wave": "C" if current["direction"] == "up" else "3", "scenario": "البديل التصحيحي/الدافع يحتاج كسر مستوى الإبطال أو ظهور Pivot جديد.", "invalidation": invalidation.get("level")}}

    @staticmethod
    def _confidence(validation: Dict[str, Any], relationships: Dict[str, Any]) -> float:
        rule_score = validation.get("passed_rules", 0) / max(validation.get("total_rules", 1), 1)
        fib_score = sum(1 for x in relationships.values() if x.get("valid")) / max(len(relationships), 1)
        return round(max(35, min(82, 35 + rule_score * 30 + fib_score * 17)), 1)

    @classmethod
    def _wave_dict(cls, wave: Wave) -> Dict[str, Any]:
        return {"number": wave.number, "type": wave.kind, "start": wave.start_price, "end": wave.end_price, "start_index": wave.start_index, "end_index": wave.end_index, "length": round(wave.length, 4), "direction": "up" if wave.end_price > wave.start_price else "down", "label": wave.label_ar, "personality": wave.personality}


analyze = ElliottPro.analyze
