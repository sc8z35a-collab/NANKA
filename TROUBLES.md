# TROUBLES — 開発環境トラブルと解決策（リーダーA集約。各自は troubles/<ID>.md に追記）

| # | 症状 | 原因 | 解決 |
|---|---|---|---|
| 1 | Bash で相対パスが見つからない | Bash ツールは毎回 cwd=/home/user | 毎回 `cd /home/user/webapp && ...` |
| 2 | cron/crontab が無く定期実行できない | サンドボックスに未導入 | `setsid nohup` + `while sleep` ループ + `flock` で多重起動防止 (tools/autosave.sh) |
| 3 | 新規リポジトリで `git log` が fatal | コミット0件 | 先に初期コミットを作って push |
| 4 | npx playwright が "canceled due to missing packages" | 非対話で確認プロンプト | `npx -y` か `.tmp` に `npm i` |
