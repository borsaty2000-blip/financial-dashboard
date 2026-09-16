from http.server import BaseHTTPRequestHandler
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server" / "python-services"))

from _common import error, options, read_json, respond
from services.forecasting import forecast_arima, forecast_lstm


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            payload = read_json(self)
            prices = payload.get("prices", [])
            if not isinstance(prices, list) or len(prices) < 20:
                raise ValueError("prices must contain at least 20 values")
            steps = int(payload.get("steps", 30))
            model = payload.get("type", "arima")
            if model == "lstm":
                result = forecast_lstm([float(x) for x in prices], steps)
            else:
                result = forecast_arima([float(x) for x in prices], steps)
            respond(self, 200, {"status": "success", "source": "python_vercel", "data": result})
        except Exception as exc:
            error(self, exc)

    def do_OPTIONS(self):
        options(self)
