#!/usr/bin/env python3
"""Local development server for Kaputtmacher.

Serves the public/ folder and tells the browser not to cache anything. Without that, a browser
may keep an old copy of one source file next to a new copy of another after an update, and the
game stops with errors such as "... is not a function".

Usage: python3 serve.py [port]      (default port: 8000, then open http://localhost:8000)
Standard library only.
"""
import functools
import http.server
import pathlib
import sys

PUBLIC = pathlib.Path(__file__).resolve().parent / "public"


def load_headers():
    """Read the security headers from public/_headers so local dev runs under the same CSP as Netlify."""
    out = []
    path = PUBLIC / "_headers"
    if not path.is_file():
        return out
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith((" ", "\t")) or ":" not in line:
            continue
        name, value = line.split(":", 1)
        name, value = name.strip(), value.strip()
        # Local dev disables caching completely and runs over plain HTTP (skip HSTS on localhost).
        if name.lower() in ("cache-control", "strict-transport-security"):
            continue
        out.append((name, value))
    return out


SECURITY_HEADERS = load_headers()


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        for name, value in SECURITY_HEADERS:
            self.send_header(name, value)
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(NoCacheHandler, directory=str(PUBLIC))
    print(f"Kaputtmacher: http://localhost:{port}  (Ctrl+C stops the server)")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
