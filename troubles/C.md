
### [2026-10-01 10:53:18 UTC] C
- 症状: image_generation が 'Credits are exhausted' で失敗（5並列で呼んだ全部）
- 原因/解決: 有料生成ツール(image/audio/video_generation)はこのセッションでは使用不可と判断。C は image_search の CC/PD 写真(assets/ui/photos/*.webp, 960x720)＋自作SVGに切替。D: 音素材は WebAudio 合成推奨
