# BOARD — リーダーA 管理（他者は編集禁止・chatで提案）

## 開発者からの明示的許可（原文趣旨）
> **現状使える全ツール、ハーネス、その他便利機能の共有、細部作成のためにはありとあらゆる手段を自由に行使してよい** と開発者（ユーザー）から明示的に言われている。
> → 画像生成/検索、音声生成、Web検索、クローラ、Playwright、npm、ブラウザ検証など全て遠慮なく使ってよい。迷ったら使う。

## 作品
**「NANKA — 空にうかぶ島」** 横画面スマホ全画面専用の 3D インタラクティブWebサイト。
真昼の明るいパステル空に浮かぶ島々を指で巡り、各ランドマーク（灯台・風車・花畑・滝・気球）をタップすると紹介カードが開く“触れる絵本”サイト。

## 絶対ルール（ユーザー指定）
1. **ネオン調禁止 / 暗い色禁止**。背景・UIとも明るい色。蛍光グロー、黒背景、ダークモード、サイバーパンク調 NG。
   - 推奨パレット: 空 `#BFE6FF` `#E8F6FF`, 雲 `#FFFFFF`, 草 `#9ED37A` `#C7E89A`, 砂 `#F4E3B5`, 海 `#7FD3E8`, アクセント `#FF9F7A` `#FFD36E` `#8FB8FF`, 文字 `#3B4A5A`(最も濃い色はこれ。純黒禁止)
   - UIパネル: 白 `rgba(255,255,255,0.78)` + `backdrop-filter: blur()` + 角丸 + 柔らかい影（影も `rgba(60,90,120,0.18)` 程度）
   - Bloom を使うなら strength ≤ 0.35 で“光のにじみ”程度。発光ライン表現禁止。
2. **プレイ環境 = 横画面・全画面のスマホ (超高性能Android/Chrome) のみ**。PC表示は考慮不要（開発確認用に動けばよい）。
   - 単位は `100dvw/100dvh`、`env(safe-area-inset-*)` 対応、タッチ操作のみ前提（hover 依存禁止）
   - 縦向き時は A の「横にしてね」ゲートが出る。全画面化は A が担当（最初のタップで requestFullscreen + screen.orientation.lock('landscape')）
   - グラフィック妥協不要: devicePixelRatio は最大 3 まで、影・ポスト処理・高ポリゴン OK。
3. 作業は 3分autosave により勝手に保存される。それでも区切りで手動 commit してよい。

## 割り振り
| ID | 担当 | ブランチ | 主ファイル（ここ以外は原則触らない） |
|---|---|---|---|
| **A** (リーダー) | コアシェル: index.html / 全画面＋横向きゲート / ローダ / レンダラ・ループ / イベントバス / 統合・QA / 文書 | `genspark_ai_developer` | `index.html` `src/main.js` `src/core/*` `styles/base.css` `docs/*` |
| **B** | 3Dワールド: 浮島地形・海・空・雲・木・ランドマーク5種のモデル（プロシージャル）・ライティング/影 | `agent-B` | `src/world/*` |
| **C** | 操作＆UI: カメラ操作(ドラッグ回転/ピンチズーム/慣性)・ランドマークのタップ判定・紹介カード・HUD・ミニマップ | `agent-C` | `src/ui/*` `styles/ui.css` |
| **D** | 演出: ポストプロセス(SMAA/弱Bloom/被写界深度)・パーティクル(花びら/蝶/鳥)・環境音と効果音(WebAudio) | `agent-D` | `src/fx/*` `src/audio/*` `assets/audio/*` |

詳細仕様は `roles/<ID>.md`。

## インターフェース契約（全員これに従う。変更はAに相談）
ビルド無し・素のES Modules。three は import map で `import * as THREE from 'three'` / `'three/addons/...'`（`vendor/three/` に同梱済み）。
```js
// A が提供: src/core/app.js
app = {
  THREE, renderer, scene, camera, clock,      // clock は THREE.Timer (getElapsed())
  canvas, dpr, quality: 'ultra',            // 将来の段階的品質用
  bus,                                      // bus.on(evt, fn) / bus.emit(evt, payload)
  onUpdate(fn),                             // fn(dt, elapsed) 毎フレーム
  setRenderFn(fn),                          // D がコンポーザで描画を差し替える。既定 = renderer.render(scene,camera)
  size: {w,h},                              // bus 'resize' {w,h,dpr}
  progress(label, ratio),                   // ローダ表示
}
// B: src/world/world.js
export async function initWorld(app) → world = {
  getHeightAt(x, z) → number,               // 地表高さ (C のカメラ・D のパーティクル用)
  landmarks: [{ id, name, position: THREE.Vector3, object: THREE.Object3D, radius }],
  sun: THREE.DirectionalLight, bounds: { radius },
}
// C: src/ui/ui.js
export function initUI(app, world)           // bus.emit('landmark:open', id) / 'landmark:close'
// D: src/fx/fx.js, src/audio/audio.js
export function initFX(app, world)
export function initAudio(app)               // 'app:start'(初回タップ) で AudioContext 開始
```
### イベント一覧（bus）
`ui:press {kind}` / `camera:focus {id|null}` / `app:ready`（ローディング完了）/ `app:start`（初回タップ＝全画面化直後, ユーザー操作扱い）/ `resize` / `landmark:open {id}` / `landmark:close` / `ui:tap {x,y}` / `orientation {landscape:bool}`

### ランドマーク ID（固定）
`lighthouse`(灯台) `windmill`(風車) `flowers`(花畑) `waterfall`(滝) `balloon`(気球)
紹介文は C が `src/ui/content.js` に書く。

## 変更履歴（リーダー決定）
- 10:57 **D 停止（有料生成ツールのクレジット切れ）→ D 担当 (src/fx, src/audio) は A が引き継ぐ**。音は全て WebAudio 合成（外部音源ファイル無し）。D が復帰したら A に連絡 → 未着手部分を返却。
- 10:57 C 提案承認: イベント `ui:press {kind}` / `camera:focus {id|null}` 追加。カード表示中は `body.card-open`。Google Fonts 'M PLUS Rounded 1c' を ui.js から <link> 注入 OK（オフライン時は system フォールバック）。
- 10:57 getHeightAt 契約明確化: **島の外は `-Infinity`**。landmarks[].position = 根元(地面)座標。radius = 見た目の大きさ(半径, m)。島群は中心 (0,0) で bounds.radius 内。
- 生成ツール (image/audio/video_generation) は **クレジット切れ** のため使用禁止。画像は image_search(CC) か プロシージャル/CSS/SVG で。

## 進め方
1. 各自 `roles/<ID>.md` を読む → `status` に着手宣言。
2. 自分のブランチで実装。単体確認用に `?solo=world` などで自分だけ動かしてよい。
3. 完成したら `say A "ready for merge"`。A が `genspark_ai_developer` にマージ→統合確認。
4. 全員完了後、A が ENV_TROUBLESHOOTING.md / NEXT_AGENT_ADVICE.md を作成。そのため **troubles 記録を必ず**。
