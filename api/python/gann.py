from http.server import BaseHTTPRequestHandler
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server" / "python-services"))

from _common import error, options, read_json, respond
from services.gann import analyze_gann


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            payload = read_json(self)
            candles = payload.get("candles", [])
            if not isinstance(candles, list) or len(candles) < 3:
                raise ValueError("candles must contain at least 3 items")
            prices = [float(item["close"]) for item in candles]
            dates = [str(item.get("date", "")) for item in candles]
            if not all(dates):
                dates = [f"2000-01-{(index % 28) + 1:02d}" for index in range(len(prices))]
            result = analyze_gann(prices, dates)
            respond(self, 200, {"status": "success", "source": "python_vercel", "data": result})
        except Exception as exc:
            error(self, exc)

    def do_OPTIONS(self):
        options(self)
