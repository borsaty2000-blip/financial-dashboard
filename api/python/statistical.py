from http.server import BaseHTTPRequestHandler
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server" / "python-services"))

from _common import error, options, read_json, respond
from services.statistical import calculate_statistics


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            payload = read_json(self)
            prices = payload.get("prices", [])
            if not isinstance(prices, list) or len(prices) < 3:
                raise ValueError("prices must contain at least 3 values")
            respond(self, 200, {"status": "success", "source": "python_vercel", "data": calculate_statistics([float(x) for x in prices])})
        except Exception as exc:
            error(self, exc)

    def do_OPTIONS(self):
        options(self)
