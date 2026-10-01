#!/usr/bin/env bash
# 冪等: autosave デーモンが死んでいれば起動する。どのコマンドの前に付けても安全・高速。
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDF="$ROOT/.tmp/autosave.pid"
if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then exit 0; fi
mkdir -p "$ROOT/.tmp"
( setsid nohup "$ROOT/tools/autosave.sh" >/dev/null 2>&1 < /dev/null & )
sleep 0.3; echo "autosave (re)started pid=$(cat "$PIDF" 2>/dev/null)"
