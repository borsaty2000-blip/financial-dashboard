from http.server import BaseHTTPRequestHandler
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server" / "python-services"))

from _common import error, options, read_json, respond
from services.gann_pro import GannPro


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            payload = read_json(self)
            candles = payload.get("candles", [])
            if not isinstance(candles, list) or len(candles) < 50:
                raise ValueError("candles must contain at least 50 items")
            result = GannPro.analyze(candles)
            respond(self, 200, {"status": "success", "source": "python_vercel", "data": result})
        except Exception as exc:
            error(self, exc)

    def do_OPTIONS(self):
        options(self)
