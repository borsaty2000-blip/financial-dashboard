from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler
from typing import Any


def read_json(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0"))
    if length <= 0:
        return {}
    value = json.loads(handler.rfile.read(length).decode("utf-8"))
    if not isinstance(value, dict):
        raise ValueError("request body must be a JSON object")
    return value


def respond(handler: BaseHTTPRequestHandler, status: int, payload: Any) -> None:
    body = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")
    handler.end_headers()
    handler.wfile.write(body)


def options(handler: BaseHTTPRequestHandler) -> None:
    respond(handler, 204, {})


def error(handler: BaseHTTPRequestHandler, exc: Exception) -> None:
    respond(handler, 422 if isinstance(exc, ValueError) else 500, {
        "status": "error",
        "message": str(exc) if isinstance(exc, ValueError) else "Python analysis failed",
    })
