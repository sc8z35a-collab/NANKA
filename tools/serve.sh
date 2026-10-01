#!/usr/bin/env bash
# 静的サーバ (no-cache) 起動: tools/serve.sh [port]  → GetServiceUrl で公開URL取得
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; PORT="${1:-8080}"
if curl -s -o /dev/null "http://127.0.0.1:$PORT/"; then echo "already serving :$PORT"; exit 0; fi
cd "$ROOT" && ( setsid nohup python3 -c "
import http.server,functools
class H(http.server.SimpleHTTPRequestHandler):
    extensions_map={**http.server.SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.webmanifest':'application/manifest+json'}
    def end_headers(self):
        self.send_header('Cache-Control','no-store'); super().end_headers()
    def log_message(self,*a): pass
http.server.ThreadingHTTPServer(('0.0.0.0',$PORT),H).serve_forever()
" >/dev/null 2>&1 < /dev/null & )
sleep 0.7; curl -s -o /dev/null -w "serve :$PORT -> %{http_code}\n" "http://127.0.0.1:$PORT/"
