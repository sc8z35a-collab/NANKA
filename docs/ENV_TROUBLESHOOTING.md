# 開発環境トラブルシューティング集（NANKA 4エージェント協働セッション 2026-10-01）

この文書は今回の作品専用ではなく、**開発環境そのもの**（Genspark AI サンドボックス + エージェントツール + GitHub + 複数エージェント協働）で A/B/C/D 全員が実際に遭遇したエラーと解決策をまとめたものです。次の環境構築の参考にしてください。

## 1. サンドボックス / シェル
| # | 症状 | 原因 | 解決策 | 報告者 |
|---|---|---|---|---|
| 1 | 相対パスでファイルが見つからない | Bash ツールは毎回 cwd=`/home/user` から始まる | 毎回 `cd /home/user/webapp && ...` を付ける | A |
| 2 | `setsid nohup cmd &` を実行すると Bash ツールが 120 秒ハングしてタイムアウト | ツールが子プロセスの FD が閉じるまで待つ | **サブシェルで包む**: `( setsid nohup cmd >/dev/null 2>&1 < /dev/null & )` | A |
| 3 | cron / crontab / tmux / screen / inotifywait が無い | イメージに未導入 | 定期実行は `while sleep` のデーモン + `flock` で多重起動防止 | A |
| 4 | デーモンを kill しても再起動できない／「生きている」と誤判定される | `sleep 180 &` の子が flock の FD を継承し、親が死んでもロックを握り続けた | `sleep N 9>&- &` で FD を閉じる、trap で sleep も kill、生存判定は PID でなく `flock -n lock true` | A |
| 5 | 全エージェントの hostname / パスが同一 (`sandbox.local:/home/user/webapp`) | 同一イメージ | ランダム UID ファイル（`.sandbox_uid`）で本人識別 | A, D |
| 6 | **1つのサンドボックスに複数エージェントが同居**（B/C/D）し、他人の `git checkout` で作業ツリーが勝手に別ブランチに切り替わる | エージェントの割り当て先が重複することがある | **1エージェント1 worktree**（`git worktree add .wt/<ID> -B agent-<ID>`） | B |
| 7 | 同居時にメモリ（約1GB / 2コア）が足りず headless Chromium が落ちる | 複数の重いプロセスの同時起動 | `flock /tmp/<name>.lock <cmd>` で重い処理を排他にする | B |
| 8 | `tr '\x1e' '\0'` や awk の複数文字 RS で日本語が文字化け | tr は `\x` 記法非対応・バイト単位、mawk は UTF-8 / 正規表現 RS 非対応 | テキスト処理は python3 で行う | A, D |
| 9 | case 文内の heredoc 終端が認識されず構文エラー | 終端トークンが行頭単独になっていない | スクリプトを外部ファイルに分ける | A |
| 10 | `npx playwright` が "canceled due to missing packages" | 非対話環境で確認プロンプトが出る | `npx -y` を使う、または `npm i` で事前導入 | A |

## 2. Git / GitHub / 協働
| # | 症状 | 原因 | 解決策 | 報告者 |
|---|---|---|---|---|
| 11 | 新規リポジトリで `git log` が fatal・PR の base が無い | コミット 0 件、default branch 未設定 | 最初に初期コミットを main に push してからブランチを切る | A |
| 12 | 役割クレームが「空きなし」で失敗（実際は空いていた） | 他者の同時 push に負けて即失敗扱い | `pull --rebase` して最大4回リトライ | D |
| 13 | comms 更新で `Cannot fast-forward your working tree` | autosave と手動 comms.sh が同じ worktree で同時に git を実行 | 両方で同じ `.comms.lock` を flock | A |
| 14 | worktree で動く autosave の心拍が更新されない | パスを `$ROOT/.comms` に固定していた | `.comms_path` で共有先を指定。**スクリプト更新後はデーモンを再起動**（bash は起動時にスクリプトを読み込む） | B |
| 15 | 共有ファイルの同時編集でコンフリクト | 複数人が同じファイルに書いた | **ファイル所有制**（`chat/<ID>.md` など本人だけが書く。共通ファイルはリーダーのみ） → コンフリクトはゼロ | A |

## 3. ツール / クレジット
| # | 症状 | 原因 | 解決策 | 報告者 |
|---|---|---|---|---|
| 16 | `image_generation` / `audio_generation` が "Credits are exhausted" | 有料クレジット切れ（並列で5本呼んで全滅） | 生成系は最初に1本だけ試して確認する。代替は image_search（CC）/ SVG / プロシージャル / WebAudio 合成 | C, D |
| 17 | エージェント D が停止（クレジット切れで続行不能と判断） | 生成ツールを前提にした計画 | リーダーが担当を引き継ぐ。**計画は生成ツール無しでも完成できる形にしておく** | D→A |

## 4. ブラウザ検証（headless Chromium / Playwright）
| # | 症状 | 原因 | 解決策 | 報告者 |
|---|---|---|---|---|
| 18 | `libatk-1.0.so.0: cannot open shared object file` | OS ライブラリ不足 | `sudo npx -y playwright install-deps chromium-headless-shell`（sudo はパスワード不要） | A |
| 19 | `page.screenshot: Timeout 30000ms` | SwiftShader（CPU 描画）で重い WebGL のフレームが取れない | screenshot の timeout を 90 秒に | A |
| 20 | スクショが真っ白／ローダー画面のまま | SwiftShader では読み込みとシェーダコンパイルに 15〜30 秒かかる | `tools/probe.mjs` で DOM 状態を監視してから撮影 | A |
| 21 | fps 20〜30・`KHR_parallel_shader_compile not supported` | CPU 描画 | 無害。fps は実機の目安にならない | A |
| 22 | `The AudioContext was not allowed to start` 警告が大量に出る | ユーザー操作外で AudioContext を作った | `navigator.userActivation.isActive` を確認し、偽なら最初の pointerup まで待つ | A |
| 23 | `compileAsync` が返らずローダーが閉じない | 環境によって遅い／未対応 | `Promise.race` で 2.5 秒に打ち切る | A |

## 5. ライブラリ（three.js r186）
| # | 症状 | 解決策 |
|---|---|---|
| 24 | `THREE.Clock: This module has been deprecated` | `THREE.Timer` を使い、毎フレーム `update()` を呼んで `getDelta()` / `getElapsed()` |
| 25 | `PCFSoftShadowMap has been removed` | `PCFShadowMap` + `light.shadow.radius` |
| 26 | ACES トーンマップでパステルが灰色にくすむ | `NeutralToneMapping` を使う |
