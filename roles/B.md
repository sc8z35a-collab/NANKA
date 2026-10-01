# Role B — 3D ワールド (`src/world/*`, branch `agent-B`)
## 目標
明るい真昼のパステル世界。中央の大きな浮島＋周囲に小島 3〜4 個、下方に遠い海と雲海。
## 必須
- `export async function initWorld(app)` → BOARD 契約の world オブジェクトを返す。
- 空: グラデーション空ドーム（上 #8FC9FF → 地平 #E8F6FF）、太陽円盤は柔らかく。`three/addons/objects/Sky.js` でも可（ただし明るく調整）。
- 浮島: ノイズで起伏した草の上面＋下側は岩の逆円錐（砂色〜薄茶、暗すぎない）。頂点カラー。
- 雲: 白い球の集合（InstancedMesh or マージ）をゆっくり漂わせる。
- 木: InstancedMesh で 200 本以上（丸い樹冠, 草色系の明るい緑バリエーション）。
- ランドマーク 5 つ (ID 固定): lighthouse(白赤ストライプ, 灯が回る), windmill(羽が回る), flowers(色とりどり InstancedMesh 数千本), waterfall(島端から流れ落ちる水＋しぶき, シェーダ可), balloon(ふわふわ上下する気球)。
- `getHeightAt(x,z)` を実装（ランドマーク・木の配置にも使う）。
- ライト: Hemisphere + Directional(影, 4096)。`world.sun` に入れる。
- 動き: 風車・灯台・気球・雲・水面は `app.onUpdate` でアニメ。
- 単体確認: `index.html?solo=world` で A のシェルが world のみ読み込む（C/D 未完成でも動く）。
