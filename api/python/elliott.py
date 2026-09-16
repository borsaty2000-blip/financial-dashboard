from http.server import BaseHTTPRequestHandler
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server" / "python-services"))

from _common import error, options, read_json, respond
from services.elliott_pro import ElliottPro


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            payload = read_json(self)
            candles_by_tf = payload.get("candles_by_tf", {})
            if not isinstance(candles_by_tf, dict):
                raise ValueError("candles_by_tf must be an object")
            frames = {
                timeframe: ElliottPro.analyze(candles)
                for timeframe, candles in candles_by_tf.items()
                if isinstance(candles, list)
            }
            available = [frame for frame in frames.values() if frame.get("available")]
            directions = [frame.get("current_wave", {}).get("direction") for frame in available]
            dominant = max(set(directions), key=directions.count) if directions else "unknown"
            confidence = sum(float(frame.get("confidence", 0)) for frame in available) / len(available) if available else 0
            result = {"by_timeframe": frames, "consensus": {"direction": dominant, "confidence": round(confidence, 4), "agreement": round(directions.count(dominant) / len(directions), 4) if directions else 0, "timeframes": len(available)}}
            respond(self, 200, {"status": "success", "source": "python_vercel", "data": result})
        except Exception as exc:
            error(self, exc)

    def do_OPTIONS(self):
        options(self)
