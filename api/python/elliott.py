from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            import sys
            from pathlib import Path

            file_path = Path(__file__).resolve()
            sys.path.insert(0, str(file_path.parent))
            sys.path.insert(0, str(file_path.parents[2] / "server" / "python-services"))
            from _common import read_json, respond
            from services.elliott_pro import ElliottPro

            payload = read_json(self)
            candles_by_tf = payload.get("candles_by_tf")
            single_candles = payload.get("candles")
            prices = payload.get("prices")

            if candles_by_tf is None and isinstance(single_candles, list):
                candles_by_tf = {"daily": single_candles}
            elif candles_by_tf is None and isinstance(prices, list):
                candles_by_tf = {
                    "daily": [
                        {"open": float(close), "high": float(close), "low": float(close), "close": float(close), "volume": 0}
                        for close in prices
                        if isinstance(close, (int, float)) and float(close) > 0
                    ]
                }

            if not isinstance(candles_by_tf, dict):
                raise ValueError("candles_by_tf, candles, or prices is required")

            frames = {
                timeframe: ElliottPro.analyze(candles)
                for timeframe, candles in candles_by_tf.items()
                if isinstance(candles, list)
            }
            available = [frame for frame in frames.values() if frame.get("available")]
            directions = [frame.get("current_wave", {}).get("direction") for frame in available]
            dominant = max(set(directions), key=directions.count) if directions else "unknown"
            confidence = sum(float(frame.get("confidence", 0)) for frame in available) / len(available) if available else 0
            result = {
                "by_timeframe": frames,
                "consensus": {
                    "direction": dominant,
                    "confidence": round(confidence, 4),
                    "agreement": round(directions.count(dominant) / len(directions), 4) if directions else 0,
                    "timeframes": len(available),
                },
            }
            if len(frames) == 1:
                result.update(next(iter(frames.values())))
            respond(self, 200, {"status": "success", "source": "python_vercel", "data": result})
        except Exception as exc:
            from _common import error
            error(self, exc)

    def do_OPTIONS(self):
        from _common import options
        options(self)

    def do_GET(self):
        self.send_error(405, "POST required")
