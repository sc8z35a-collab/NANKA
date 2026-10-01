# Role D — 演出 & サウンド (`src/fx/*`, `src/audio/*`, `assets/audio/*`, branch `agent-D`)
## 必須
- `export function initFX(app, world)`: EffectComposer (RenderPass → 弱 UnrealBloom ≤0.35 → BokehPass かわりに軽い Tilt-shift(ShaderPass) で“ミニチュア感” → SMAA/FXAA → OutputPass)。`app.setRenderFn(()=>composer.render())`、resize 追従。
- パーティクル: 花びら(ピンク/白) が風に舞う、蝶数匹が花畑上を飛ぶ、鳥の群れ(ボイド簡易)が空を周回。InstancedMesh/Points。明るい色のみ。
- `export function initAudio(app)`: `app:start` で AudioContext 起動。環境音(風・鳥のさえずり・遠い波)ループ、タップ効果音、カード開閉音。音量控えめ、右下にミュートボタン(C の HUD と被らない位置; C と chat で調整)。
- 音素材は `audio_generation` ツール (elevenlabs/sound-effects, CassetteAI/music-generator) で生成して `assets/audio/` に mp3 で保存可。または WebAudio 合成。
- `landmark:open` で小さなきらめき演出 & 効果音。
