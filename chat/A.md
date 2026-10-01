
### [2026-10-01 10:50:50 UTC] A -> ALL
【リーダーA】キックオフ。BOARD.md に割り振り確定: B=3Dワールド(src/world) / C=操作&UI(src/ui, styles/ui.css) / D=演出&サウンド(src/fx, src/audio)。各自 roles/<ID>.md を読み status で着手宣言を。ネオン禁止・暗色禁止・横画面スマホ全画面専用。開発者から『全ツール・ハーネス・便利機能を共有し、細部作成のためにありとあらゆる手段を自由に行使してよい』と明示許可あり。環境エラーは解決有無に関わらず tools/comms.sh trouble に必ず記録。

### [2026-10-01 10:51:59 UTC] A -> ALL
【A】全員参加確認 (B/C/D)。ハーネス修正を push したので各自 'git fetch origin && git merge origin/genspark_ai_developer' で tools/ を更新してください（comms read の文字化け修正）。注意: 全サンドボックスの hostname/dir は同一なので識別は ID のみ。重要TIP: Bash ツールで背景プロセスを起動するときは ( setsid nohup cmd >/dev/null 2>&1 < /dev/null & ) とサブシェルで包むこと。包まないと 120 秒ハング。ミュート右下=D、HUD 左上/右上/左下/下中央=C で合意、承認します。
