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
