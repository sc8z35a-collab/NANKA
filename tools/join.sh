#!/usr/bin/env bash
# =====================================================================
# エージェント参加スクリプト (これ1本で: 掲示板接続 → 役割クレーム → 作業ブランチ → autosave起動)
#   tools/join.sh        空いている役割(B→C→D)を自動クレーム
#   tools/join.sh C      役割Cを指定 (既に他者が持っていれば失敗)
# クレームは comms ブランチへの push の成否で原子的に決まる(先着1名)。
# =====================================================================
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; cd "$ROOT"
WANT="${1:-}"
git fetch -q origin || { echo "fetch失敗: setup_github_environment ツールを先に実行"; exit 1; }
git rev-parse -q --verify origin/comms >/dev/null || { echo "comms ブランチ未作成 = あなたがリーダー候補。BOARD参照"; exit 1; }

# 同一サンドボックスに既に別エージェントがいる場合は .wt/<ID> の別worktreeで作業する
if [ -f .agent_id ] && [ -n "$WANT" ] && [ "$(cat .agent_id)" != "$WANT" ]; then
  echo "このディレクトリは Agent $(cat .agent_id) が使用中 → .wt/$WANT に別worktreeを作成"
  git worktree add -q ".wt/$WANT" -B "agent-$WANT" origin/genspark_ai_developer 2>/dev/null || true
  echo "$WANT" > ".wt/$WANT/.agent_id"; echo "$ROOT/.comms" > ".wt/$WANT/.comms_path"
  echo "以後は cd $ROOT/.wt/$WANT で作業。"; exec ".wt/$WANT/tools/join.sh" "$WANT"
fi

C="$(cat .comms_path 2>/dev/null || echo "$ROOT/.comms")"
if [ ! -e "$C/.git" ]; then git worktree add -q "$C" -B comms origin/comms || exit 1; fi
git -C "$C" pull -q --rebase origin comms

claim(){ # $1=ID → 0:成功
  local id="$1"
  [ -f "$C/roles/$id.claim" ] && [ "$(sed -n 1p "$C/roles/$id.claim")" != "host=$(hostname) dir=$ROOT" ] && return 1
  mkdir -p "$C/roles"; printf 'host=%s dir=%s\nclaimed=%s\n' "$(hostname)" "$ROOT" "$(date -u '+%FT%TZ')" > "$C/roles/$id.claim"
  git -C "$C" add -A && git -C "$C" commit -qm "claim role $id" --no-verify
  if timeout 60 git -C "$C" push -q origin HEAD:comms 2>/dev/null; then return 0; fi
  git -C "$C" fetch -q origin comms && git -C "$C" reset -q --hard origin/comms; return 1
}
ID=""
if [ -f .agent_id ]; then ID="$(cat .agent_id)"; echo "既に Agent $ID として参加済み"
else
  for c in ${WANT:-B C D}; do claim "$c" && { ID="$c"; break; }; done
  [ -z "$ID" ] && { echo "空き役割なし。tools/comms.sh read で状況確認しAに相談"; exit 1; }
  echo "$ID" > .agent_id
fi
BR="agent-$ID"; [ "$ID" = "A" ] && BR="genspark_ai_developer"
if [ "$(git rev-parse --abbrev-ref HEAD 2>/dev/null)" != "$BR" ]; then
  if git rev-parse -q --verify "origin/$BR" >/dev/null; then git checkout -q -B "$BR" "origin/$BR"
  else git checkout -q -B "$BR" origin/genspark_ai_developer; fi
fi
"$ROOT/tools/ensure_autosave.sh"
"$ROOT/tools/comms.sh" say A "Agent $ID 参加しました (host=$(hostname), branch=$BR)" >/dev/null
echo "=========== あなたは Agent $ID / branch $BR ==========="
echo "必読: $C/README.md  $C/BOARD.md  $C/TOOLS.md  $C/TIPS.md  $C/roles/$ID.md"
