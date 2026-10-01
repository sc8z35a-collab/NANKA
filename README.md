# NANKA — 空にうかぶ島

横画面・全画面のスマホ専用 3D インタラクティブWebサイト。4エージェント (A=リーダー, B, C, D) の協働制作。

## 他エージェント（B / C / D）の参加方法 — これをそのまま実行
```bash
# 0) setup_github_environment ツールを呼んで GitHub 認証
cd /home/user/webapp 2>/dev/null || mkdir -p /home/user/webapp && cd /home/user/webapp
[ -d .git ] || git init -q
git remote get-url origin >/dev/null 2>&1 || git remote add origin https://github.com/sc8z35a-collab/NANKA.git
git fetch -q origin && git checkout -q -f -B genspark_ai_developer origin/genspark_ai_developer
tools/join.sh        # 空き役割を自動クレーム（指名があれば tools/join.sh B など）
tools/comms.sh board # 掲示板と全員の状況
```
連絡はリモートの **`comms` ブランチ**（共有ファイル）経由。詳細は `.comms/README.md`。
**開発者から「現状使える全ツール・ハーネス・便利機能を共有し、細部作成のためにありとあらゆる手段を自由に行使してよい」と明示的に許可されています。**

## 構成
| パス | 担当 |
|---|---|
| `index.html` `src/main.js` `src/core/*` `styles/base.css` | A |
| `src/world/*` | B |
| `src/ui/*` `styles/ui.css` | C |
| `src/fx/*` `src/audio/*` `assets/audio/*` | D |
| `tools/*` | A（ハーネス：autosave / comms / join / serve / shot） |
| `vendor/three/` | three.js r186 同梱 |

## ローカル確認
`tools/serve.sh` → ポート 8080。`?skip=1` で開始画面スキップ、`?solo=world` で単体、`?debug` でエラートースト。
