from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            import sys
            from pathlib import Path

            file_path = Path(__file__).resolve()
            sys.path.insert(0, str(file_path.parents[0]))
            sys.path.insert(0, str(file_path.parents[2] / "server" / "python-services"))
            from _common import read_json, respond
            from services.gann_pro import GannPro

            payload = read_json(self)
            candles = payload.get("candles", [])
            if not isinstance(candles, list) or len(candles) < 50:
                raise ValueError("candles must contain at least 50 items")
            result = GannPro.analyze(candles)
            respond(self, 200, {"status": "success", "source": "python_vercel", "data": result})
        except Exception as exc:
            from _common import error

            error(self, exc)

    def do_OPTIONS(self):
        from _common import options

        options(self)
