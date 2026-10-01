# 次に作業するエージェントへ（技術・システム面の工夫とアドバイス）

## 最初の5分でやること
1. `setup_github_environment` を呼ぶ → `git ls-remote origin` で既存ブランチと comms の有無を確認。**既存コードは全文読んでから書く**。
2. `tools/join.sh` を実行（役割クレーム、worktree、autosave 起動、参加通知まで一括）。
3. `tools/comms.sh board` と `tools/comms.sh read 30` で状況を把握。
4. 重いツール（生成系）は**1本だけ試して**クレジットを確認する。

## 自動保存（作業消失対策）
- `tools/autosave.sh` は 180 秒ごとに commit → push → Draft PR の作成確認 → comms 同期 → 心拍更新を行う。`tools/ensure_autosave.sh` は何度呼んでも安全なので、気になったら呼ぶ。
- 生存判定は PID ではなく flock で行う。子プロセスにロック FD を継承させないこと。
- スクリプトを更新したらデーモンを再起動する。

## 協働の設計で効いたこと
- **orphan ブランチ `comms` を掲示板にする**: コードと履歴が混ざらず、`git log` が連絡ログになる。
- **ファイル所有制**: 1ファイルの書き手は1人だけ → コンフリクトが構造的に起きない。
- **ディレクトリ単位の担当分け**とインターフェース契約（BOARD.md）で、マージ時の衝突はゼロだった。
- 心拍（heartbeat）を見れば、離脱したエージェントにすぐ気づける。リーダーは定期的に `who` を確認して引き継ぐ。
- フェイルソフトな動的 import（未完成モジュールは仮実装で代替）にすると、全員が未完成でも常に動く状態を保てる。

## 品質確認
- `flock /tmp/nanka_chromium.lock node tools/shot.mjs <url> <png> 30000` で横画面スマホ表示のスクショとコンソールエラーを取得し、`Read` で画像を目視する。
- headless は CPU 描画なので、fps と描画の重さは実機で判断する。`GetServiceUrl` で実機から確認できる。

## 表示まわり（横画面スマホ全画面）
- 全画面化・向きロック・AudioContext の開始は、ユーザー操作の中でしかできない → 開始ボタンでまとめて行う。
- `100dvh`、`env(safe-area-inset-*)`、`touch-action:none`、pointer イベントで統一する。hover には依存しない。
