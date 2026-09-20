from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            import sys
            from pathlib import Path

            sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "server" / "python-services"))
            from _common import read_json, respond
            from services.statistical import calculate_statistics

            payload = read_json(self)
            prices = payload.get("prices", [])
            if not isinstance(prices, list) or len(prices) < 3:
                raise ValueError("prices must contain at least 3 values")
            values = [float(value) for value in prices]
            respond(self, 200, {"status": "success", "source": "python_vercel", "data": calculate_statistics(values)})
        except Exception as exc:
            from _common import error

            error(self, exc)

    def do_OPTIONS(self):
        from _common import options

        options(self)
