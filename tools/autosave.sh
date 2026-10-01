#!/usr/bin/env bash
# =====================================================================
# NANKA autosave daemon  (何もしなくても3分おきに作業を保存する)
#  - 180秒ごと: 作業ブランチを commit → push → Draft PR を保証
#  - 同時に comms(共有連絡) worktree を pull/commit/push し、心拍を更新
#  - flock で多重起動防止 / 失敗しても止まらず次周期に再試行
# 使い方: tools/ensure_autosave.sh を呼ぶだけ(冪等)。直接起動も可:
#   setsid nohup tools/autosave.sh >/dev/null 2>&1 &
# 環境変数: AUTOSAVE_INTERVAL(秒,既定180) AUTOSAVE_ONCE=1(1回だけ実行)
# =====================================================================
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT" || exit 1
AGENT="$(cat .agent_id 2>/dev/null || echo X)"
INTERVAL="${AUTOSAVE_INTERVAL:-180}"
LOGDIR="$ROOT/.tmp"; mkdir -p "$LOGDIR"
LOG="$LOGDIR/autosave.log"
LOCK="$LOGDIR/autosave.lock"
PIDF="$LOGDIR/autosave.pid"
COMMS="$(cat "$ROOT/.comms_path" 2>/dev/null || echo "$ROOT/.comms")"   # worktree(.wt/X)は .comms_path で共有comms を指す
BASE_BRANCH="genspark_ai_developer"

log(){ echo "[$(date '+%F %T')][$AGENT] $*" >> "$LOG"; }
# ログ肥大化防止
trim_log(){ [ -f "$LOG" ] && [ "$(wc -l <"$LOG")" -gt 2000 ] && tail -n 800 "$LOG" > "$LOG.t" && mv "$LOG.t" "$LOG"; }

busy(){ # rebase/merge/cherry-pick 中は触らない
  local g; g="$(git -C "$1" rev-parse --git-dir 2>/dev/null)" || return 0
  case "$g" in /*) ;; *) g="$1/$g";; esac
  [ -d "$g/rebase-merge" ] || [ -d "$g/rebase-apply" ] || [ -f "$g/MERGE_HEAD" ] || [ -f "$g/CHERRY_PICK_HEAD" ]
}

push_retry(){ # $1=dir $2=branch
  local i
  for i in 1 2 3; do
    timeout 60 git -C "$1" push -q origin "HEAD:$2" 2>>"$LOG" && return 0
    timeout 60 git -C "$1" pull -q --rebase --autostash origin "$2" 2>>"$LOG" || git -C "$1" rebase --abort 2>/dev/null
    sleep $((i*3))
  done
  return 1
}

save_work(){
  busy "$ROOT" && { log "skip work: git busy"; return; }
  local br; br="$(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  [ "$br" = "HEAD" ] && { log "skip: detached HEAD"; return; }
  # 50MB超のファイルは誤コミット防止で除外
  { cat .git/info/exclude 2>/dev/null; find . -path ./.git -prune -o -path ./node_modules -prune -o -path ./.comms -prune -o -type f -size +50M -print 2>/dev/null | sed "s|^\./||"; } | sort -u > .tmp/excl && cp .tmp/excl .git/info/exclude
  git add -A 2>>"$LOG"
  if ! git diff --cached --quiet; then
    git commit -qm "autosave($AGENT): $(date '+%F %T')" --no-verify 2>>"$LOG" && log "committed on $br"
  fi
  if [ -n "$(git log "origin/$br..HEAD" --oneline 2>/dev/null)" ] || ! git rev-parse -q --verify "origin/$br" >/dev/null; then
    push_retry "$ROOT" "$br" && log "pushed $br" || log "PUSH FAILED $br"
    git fetch -q origin "$br" 2>/dev/null
  fi
  # Draft PR を保証 (main以外のブランチ)
  if [ "$br" != "main" ] && command -v gh >/dev/null; then
    local target="$BASE_BRANCH"; [ "$br" = "$BASE_BRANCH" ] && target="main"
    if ! timeout 30 gh pr view "$br" --json number >/dev/null 2>&1; then
      timeout 40 gh pr create --draft --base "$target" --head "$br" \
        --title "WIP($AGENT): $br" --body "autosave により自動作成。担当: Agent $AGENT" >>"$LOG" 2>&1 \
        && log "PR created $br -> $target"
    fi
  fi
}

save_comms(){
  [ -d "$COMMS/.git" ] || [ -f "$COMMS/.git" ] || return
  # comms.sh と同じロックで排他 (同時 git 操作による "Cannot fast-forward" 防止)
  exec 7>"$COMMS/../.comms.lock" 2>/dev/null || exec 7>/tmp/.comms.lock
  flock -w 90 7 || { log "comms lock timeout"; return; }
  busy "$COMMS" && { log "skip comms: busy"; return; }
  mkdir -p "$COMMS/heartbeat"
  printf 'agent=%s\nlast=%s\nbranch=%s\nhead=%s\n' "$AGENT" "$(date -u '+%FT%TZ')" \
    "$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)" "$(git -C "$ROOT" rev-parse --short HEAD)" > "$COMMS/heartbeat/$AGENT.txt"
  git -C "$COMMS" add -A
  git -C "$COMMS" diff --cached --quiet || git -C "$COMMS" commit -qm "comms($AGENT): $(date '+%T')" --no-verify
  timeout 60 git -C "$COMMS" pull -q --rebase --autostash origin comms 2>>"$LOG" || git -C "$COMMS" rebase --abort 2>/dev/null
  push_retry "$COMMS" comms >/dev/null || log "COMMS PUSH FAILED"
  flock -u 7
}

cycle(){ trim_log; save_work; save_comms; }

if [ "${AUTOSAVE_ONCE:-0}" = "1" ]; then cycle; exit 0; fi

exec 9>"$LOCK"
flock -n 9 || { echo "autosave already running"; exit 0; }
echo $$ > "$PIDF"
log "daemon start pid=$$ interval=${INTERVAL}s"
SLEEP_PID=""
trap 'log "signal -> final save"; [ -n "$SLEEP_PID" ] && kill "$SLEEP_PID" 2>/dev/null; cycle; exit 0' TERM INT HUP
while true; do
  cycle
  # 9>&- : sleep 子プロセスにロックFDを継承させない (親を kill しても sleep がロックを握り続ける事故の防止)
  sleep "$INTERVAL" 9>&- 7>&- & SLEEP_PID=$!; wait $SLEEP_PID
done
