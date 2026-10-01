# TOOLS — 現状使える全ツール / ハーネス / 便利機能（リーダーA調べ・2026-10-01）

> 開発者から **「細部作成のためにはありとあらゆる手段を自由に行使してよい」** と明示的許可あり。全部使ってよい。

## エージェント組み込みツール（関数呼び出し）
| ツール | 用途・コツ |
|---|---|
| `Bash` (run_in_background 可) | **毎回 cwd=/home/user から始まる** → 必ず `cd /home/user/webapp && ...`。長時間処理は background + `BashOutput`/`KillBash` |
| `Read` / `Write` / `Edit` / `MultiEdit` / `Glob` / `Grep` / `LS` | ファイル操作。Write/Edit は事前に Read 必須。巨大ファイルは小さく Write → Edit で追記 |
| `TodoWrite` | 自分のタスク管理 |
| `setup_github_environment` | **git/gh 認証。最初に必ず呼ぶ**（トークン期限切れ時も再実行） |
| `GetServiceUrl` | サンドボックス内ポートの公開URL取得（スマホ実機確認に使える） |
| `PlaywrightConsoleCapture` | URLを実ブラウザで開きconsoleログ取得 → JSエラー検出に最適 |
| `image_search` | CCライセンス画像検索（商用ストック画像は使用禁止） |
| `image_generation` | 画像生成（テクスチャ/イラスト/UIアイコン）。クレジット消費 |
| `understand_images` / `analyze_media_content` | 画像/動画/音声の内容解析。**スクショの見た目QAに使える**（http URL 必須→ UploadFileWrapper で上げる） |
| `audio_generation` | 効果音(elevenlabs/sound-effects ≤22s)、BGM(CassetteAI ≤180s, elevenlabs/music)、TTS |
| `video_generation` | 動画生成 |
| `merge_audio` / `audio_transcribe` / `extract_audio_from_video` | 音声加工 |
| `web_search` / `WebSearch` / `crawler` / `summarize_large_document` | 調査（three.js のAPI確認など） |
| `UploadFileWrapper` / `DownloadFileWrapper` | サンドボックス⇔共有URL。生成物URLのダウンロードにも |
| `meta_info` | プロジェクトメタ情報 |
| `activate_ai_developer_skill` | スキル: cf-byok-deploy / gsk-hosted-deploy / gsk-hosted-identity / designer-handoff |
| `ResetSandbox` | サンドボックス凍結時の復旧（ファイルは残る・プロセスは全部死ぬ → `tools/ensure_autosave.sh` 再実行） |

## サンドボックス内 CLI（確認済）
- node v22 / npm 10.9 / python3 / git 2.47 / **gh (ログイン済)** / jq / flock / setsid / nohup / timeout
- **無い**: cron, crontab, tmux, screen, inotifywait, playwright(npm 未導入), python playwright
- メモリ **約1GB / 2コア** → 重い npm install・Chromium 同時起動に注意。
- `/mnt/aidrive` = ユーザーのAIドライブ（遅い。再帰操作禁止）

## プロジェクト内ハーネス（A作成）
| コマンド | 内容 |
|---|---|
| `tools/join.sh [ID]` | 参加：役割クレーム→ブランチ→autosave→参加通知 |
| `tools/ensure_autosave.sh` | autosave 死活監視＋起動（冪等） |
| `tools/autosave.sh` | 3分毎 commit/push/Draft PR/comms同期/心拍。`AUTOSAVE_ONCE=1` で即時1回 |
| `tools/comms.sh say/read/status/trouble/tip/who/board/sync` | 掲示板 |
| `tools/serve.sh` | 静的サーバ起動 (port 8080, python http.server, no-cache) → `GetServiceUrl 8080` |
| `tools/shot.sh <url> <out.png>` | 横画面スマホ(915x412 @DPR3, touch)でスクショ+consoleエラー出力（playwright を .tmp に導入して使う） |
| `vendor/three/` | three.js r186 同梱（CDN不要。import map で 'three', 'three/addons/'） |
