from http.server import BaseHTTPRequestHandler
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server" / "python-services"))

from _common import error, options, read_json, respond
from services.elliott_mtf import analyze_elliott_mtf


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            payload = read_json(self)
            candles = payload.get("candles_by_tf", {})
            if not isinstance(candles, dict):
                raise ValueError("candles_by_tf must be an object")
            result = analyze_elliott_mtf(candles)
            respond(self, 200, {"status": "success", "source": "python_vercel", "data": result})
        except Exception as exc:
            error(self, exc)

    def do_OPTIONS(self):
        options(self)
