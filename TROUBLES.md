# TROUBLES — 開発環境トラブルと解決策（リーダーA集約。各自は troubles/<ID>.md に追記）

| # | 症状 | 原因 | 解決 |
|---|---|---|---|
| 1 | Bash で相対パスが見つからない | Bash ツールは毎回 cwd=/home/user | 毎回 `cd /home/user/webapp && ...` |
| 2 | cron/crontab が無く定期実行できない | サンドボックスに未導入 | `setsid nohup` + `while sleep` ループ + `flock` で多重起動防止 (tools/autosave.sh) |
| 3 | 新規リポジトリで `git log` が fatal | コミット0件 | 先に初期コミットを作って push |
| 4 | npx playwright が "canceled due to missing packages" | 非対話で確認プロンプト | `npx -y` か `.tmp` に `npm i` |
| 5 | 全エージェントの hostname/パスが同一 (`sandbox.local:/home/user/webapp`) で識別できない | 各サンドボックスは同一イメージ | ランダムUID (`.sandbox_uid`) で識別（join.sh 修正済） |
| 6 | `setsid nohup cmd &` を Bash ツールで実行すると 120 秒ハングしてタイムアウト | ツールが子プロセスの終了/FD を待つ | **サブシェルで包む** `( setsid nohup cmd >/dev/null 2>&1 < /dev/null & )` |
| 7 | `tr '\x1e' '\0'` でマルチバイト文字列が文字化け | tr は `\x1e` 記法非対応 + バイト単位 | テキスト処理は python3 で |
| 8 | case 文内の heredoc 終端が認識されない | 終端トークンが行頭単独でない | 外部ファイル (tools/comms_read.py) に分離 |
| 9 | Playwright chromium 起動失敗 `libatk-1.0.so.0: cannot open shared object file` | OS依存ライブラリ未導入 | `sudo npx -y playwright install-deps chromium-headless-shell`（sudo パスワード不要） |
| 10 | three r186 で `THREE.Clock: This module has been deprecated` 警告 | r183以降 Clock 非推奨 | `THREE.Timer` + 毎フレーム `timer.update()` / `getDelta()` / `getElapsed()`。app.clock は Timer |
| 11 | headless では `KHR_parallel_shader_compile extension not supported` 警告と fps≈20台 | SwiftShader(CPU)描画 | 無害。fps は実機の目安にならない。見た目確認のみに使う |
| 12 | image_generation / audio_generation が失敗 | アカウントの有料クレジット切れ | 生成系は使わない。画像は image_search(CC) / SVG / プロシージャル、音は WebAudio 合成 |
| 13 | 同一サンドボックスに2エージェントが同居 (B と C) | エージェントが同じ sandbox に割り当てられることがある | `git worktree add .wt/<ID> -b agent-<ID>` で作業ツリー分離 (join.sh が自動) |
| 14 | `The AudioContext was not allowed to start` 警告が大量 | ユーザー操作外 (?skip 自動開始) で AudioContext 生成 | `navigator.userActivation.isActive` を確認し、偽なら最初の pointerup で生成 |
| 15 | shot.mjs が `viewport.width: expected integer, got NaN` | オプション `--tap` を位置引数 WxH として解釈 | 位置引数とフラグを分離して解析 (修正済) |
| 16 | 同居サンドボックスで headless Chromium を複数同時起動すると落ちる | メモリ 1GB | `flock /tmp/nanka_chromium.lock node tools/shot.mjs ...` で排他 (B 提案) |
