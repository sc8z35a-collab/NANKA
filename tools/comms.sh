#!/usr/bin/env bash
# =====================================================================
# 共有連絡ツール  (リモートリポジトリの orphan ブランチ "comms" を掲示板にする)
# ファイル所有ルール: 各エージェントは自分のIDのファイルだけ書く → コンフリクトゼロ
#   chat/<ID>.md      発言(追記のみ)        status/<ID>.md  現在の状況(上書き)
#   troubles/<ID>.md  環境トラブルと解決策   tips/<ID>.md    コツ
#   heartbeat/<ID>.txt autosaveが自動更新   BOARD.md/TIPS.md/TOOLS.md はリーダーAのみ編集
# 使い方:
#   tools/comms.sh sync                 pull+push
#   tools/comms.sh read [N]             全員の最新発言N件(既定20)を時系列表示
#   tools/comms.sh say <宛先|ALL> "本文"  発言して即push
#   tools/comms.sh status "本文"         自分の状況を更新して即push
#   tools/comms.sh trouble "症状" "原因/解決策"
#   tools/comms.sh tip "コツ"
#   tools/comms.sh who                  心拍(最終autosave時刻)一覧
#   tools/comms.sh board                BOARD.md と全員のstatusを表示
# =====================================================================
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
C="${COMMS_DIR:-$(cat "$ROOT/.comms_path" 2>/dev/null || echo "$ROOT/.comms")}"
ID="$(cat "$ROOT/.agent_id" 2>/dev/null || echo X)"
now(){ date -u '+%F %T UTC'; }
[ -e "$C/.git" ] || { echo "comms worktree なし。先に tools/join.sh を実行"; exit 1; }
sync(){
  exec 8>"$C/../.comms.lock" 2>/dev/null || exec 8>/tmp/.comms.lock
  flock -w 60 8
  git -C "$C" add -A
  git -C "$C" diff --cached --quiet || git -C "$C" commit -qm "comms($ID): ${1:-sync} $(date '+%T')" --no-verify
  for i in 1 2 3 4 5; do
    timeout 60 git -C "$C" pull -q --rebase --autostash origin comms 2>/dev/null || git -C "$C" rebase --abort 2>/dev/null
    timeout 60 git -C "$C" push -q origin HEAD:comms 2>/dev/null && return 0
    sleep $((i*2))
  done
  echo "WARN: comms push failed (次のautosaveで再試行されます)"
}
cmd="${1:-read}"; shift || true
mkdir -p "$C"/{chat,status,troubles,tips,heartbeat}
case "$cmd" in
  sync) sync sync ;;
  say)  to="$1"; shift; printf '\n### [%s] %s -> %s\n%s\n' "$(now)" "$ID" "$to" "$*" >> "$C/chat/$ID.md"; sync say; echo sent ;;
  status) printf '# %s status (%s)\n\n%s\n' "$ID" "$(now)" "$*" > "$C/status/$ID.md"; sync status; echo ok ;;
  trouble) printf '\n### [%s] %s\n- 症状: %s\n- 原因/解決: %s\n' "$(now)" "$ID" "$1" "${2:-未解決}" >> "$C/troubles/$ID.md"; sync trouble; echo ok ;;
  tip) printf '\n- [%s] %s\n' "$(now)" "$*" >> "$C/tips/$ID.md"; sync tip; echo ok ;;
  read)
    git -C "$C" pull -q --rebase --autostash origin comms 2>/dev/null
    n="${1:-20}"
    python3 "$ROOT/tools/comms_read.py" "$C/chat" "$n" ;;
  who)
    git -C "$C" pull -q --rebase --autostash origin comms 2>/dev/null
    for f in "$C"/heartbeat/*.txt; do [ -f "$f" ] || continue
      l=$(grep '^last=' "$f" | cut -d= -f2); age=$(( $(date +%s) - $(date -d "$l" +%s 2>/dev/null || echo 0) ))
      echo "$(basename "$f" .txt): last=$l (${age}s ago) $(grep -E '^(branch|head)=' "$f" | tr '\n' ' ')"; done ;;
  board)
    git -C "$C" pull -q --rebase --autostash origin comms 2>/dev/null
    cat "$C/BOARD.md"; for f in "$C"/status/*.md; do echo; echo "-----"; cat "$f"; done ;;
  *) sed -n '2,20p' "$0" ;;
esac
