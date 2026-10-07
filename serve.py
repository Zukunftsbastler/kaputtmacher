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


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(NoCacheHandler, directory=str(PUBLIC))
    print(f"Kaputtmacher: http://localhost:{port}  (Ctrl+C stops the server)")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
