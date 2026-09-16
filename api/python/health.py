from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

from _common import options, respond


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        respond(self, 200, {
            "status": "ok",
            "service": "borsaty-python",
            "runtime": "vercel-python-serverless",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def do_OPTIONS(self):
        options(self)
