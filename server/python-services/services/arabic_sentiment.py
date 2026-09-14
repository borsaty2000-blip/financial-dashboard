from __future__ import annotations

import json
import os
from urllib.parse import quote
from urllib.request import Request, urlopen
from typing import Any

POSITIVE = {"ارتفاع", "نمو", "أرباح", "إيجابي", "توزيع", "قوي", "تحسن", "صعود", "توسع", "شراء"}
NEGATIVE = {"هبوط", "خسائر", "سلبي", "تراجع", "انخفاض", "ديون", "بيع", "تحذير", "أزمة", "ضعف"}


def fetch_arabic_news(symbol: str, limit: int = 5) -> list[dict[str, Any]]:
    base_url = os.getenv("ARABIC_NEWS_URL", "").strip()
    if not base_url:
        return []
    url = f"{base_url.rstrip('/')}/{quote(symbol.upper())}"
    try:
        request = Request(url, headers={"Accept": "application/json", "User-Agent": "Borsaty/1.0"})
        with urlopen(request, timeout=8) as response:
            body = json.loads(response.read().decode("utf-8"))
        items = body.get("articles", body if isinstance(body, list) else [])
        return [
            {
                "title": str(item.get("title", "")),
                "url": item.get("url"),
                "source": item.get("source", ""),
                "publishedAt": item.get("publishedAt"),
            }
            for item in items[:limit]
            if isinstance(item, dict) and item.get("title")
        ]
    except Exception:
        return []


def analyze_sentiment(text: str) -> dict[str, Any]:
    text = text or ""
    try:
        from transformers import pipeline  # type: ignore

        model_name = os.getenv("ARABIC_SENTIMENT_MODEL", "CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment")
        classifier = pipeline("sentiment-analysis", model=model_name)
        result = classifier(text[:512])[0]
        label = str(result.get("label", "neutral")).lower()
        score = float(result.get("score", 0.0))
        normalized = "positive" if "pos" in label else "negative" if "neg" in label else "neutral"
        return {"label": normalized, "score": round(score, 4), "model": model_name}
    except Exception:
        words = set(text.replace("،", " ").split())
        positive = len(words & POSITIVE)
        negative = len(words & NEGATIVE)
        if positive > negative:
            label = "positive"
        elif negative > positive:
            label = "negative"
        else:
            label = "neutral"
        score = min(1.0, abs(positive - negative) / max(len(words), 1) * 4)
        return {"label": label, "score": round(score, 4), "model": "arabic-lexicon-fallback"}


def get_stock_sentiment(symbol: str) -> dict[str, Any]:
    articles = fetch_arabic_news(symbol)
    analyzed = [{**article, "sentiment": analyze_sentiment(article["title"])} for article in articles]
    counts = {"positive": 0, "negative": 0, "neutral": 0}
    for article in analyzed:
        counts[article["sentiment"]["label"]] += 1
    total = len(analyzed)
    distribution = {key: round(value / total * 100, 2) if total else 0 for key, value in counts.items()}
    return {
        "symbol": symbol.upper(),
        "articles": analyzed,
        "articleCount": total,
        "counts": counts,
        "distribution": distribution,
        "available": total > 0,
        "disclaimer": "تحليل آلي تعليمي؛ لا يمثل توصية استثمارية.",
    }
