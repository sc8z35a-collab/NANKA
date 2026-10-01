# TIPS — 細部作成のコツ（リーダーA 集約。各自の追記は tips/<ID>.md）

## 見た目（明るい・非ネオン・高品質）
- `renderer.toneMapping = NeutralToneMapping` (ACES は彩度が落ちて灰色化→暗色禁止に抵触), exposure 1.0, `outputColorSpace = SRGBColorSpace`。テクスチャ色は `texture.colorSpace = SRGBColorSpace`。
- 明るさは **HemisphereLight(空色, 草色, 0.9〜1.2) + DirectionalLight(暖白 #FFF4E0, 2.5〜3)** が基本。影は `PCFSoftShadowMap`, mapSize 4096, `shadow.radius` 低め+`normalBias 0.02`。
- 影が黒くなりすぎたら Hemisphere を上げる。**影色が暗い＝暗い色禁止違反に見える**ので注意。
- 遠景は `scene.fog = new Fog('#DDF1FF', near, far)` で空色に溶かす（黒フォグ禁止）。
- フラット/ロウポリでも `flatShading` + 頂点カラーのグラデで“絵本感”。MeshStandardMaterial roughness 0.8〜1、metalness 0。
- 色を決めるとき HSL の L が 0.45 未満の色は使わない（文字色 #3B4A5A のみ例外）。
- 紹介カード等は `backdrop-filter: blur(14px) saturate(1.4)` + 白半透明。フォントは system-ui + 'Hiragino Maru Gothic ProN', 'M PLUS Rounded 1c'（ローカルに無ければフォールバック）。

## スマホ横画面全画面
- `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">`
- CSS: `html,body{height:100%;overflow:hidden;overscroll-behavior:none;touch-action:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}`
- サイズは `100dvh` / JS は `visualViewport` ではなく **canvas の clientWidth/Height** を真実とする（全画面切替時にずれない）。
- 全画面・向きロック・AudioContext 開始は **ユーザー操作(pointerup)の中でのみ** 可能。`app:start` で一括実行。
- `pointer` イベント統一（touch/mouse 両対応）。`setPointerCapture` を使う。ピンチは2ポインタの距離。
- タップ判定はドラッグ距離 < 8px かつ < 300ms。

## three.js
- addons は `three/addons/...`（import map で `vendor/three/addons/` に解決）。
- DPR: `Math.min(devicePixelRatio, 3)`。コンポーザ使用時は `composer.setPixelRatio` も同値に。
- 毎フレーム new しない（Vector3 などは使い回し）。GC スパイクはカクつきの元。
- InstancedMesh で木・花・草を大量に（花畑 数千本OK）。

## Git / 協働
- 自分の担当ディレクトリ以外は触らない → マージ衝突ゼロ。共通ファイル変更は A に依頼。
- 3分autosave が勝手に commit するので、手動 `git commit` 時に "nothing to commit" でも正常。
