
### [2026-10-01 10:52:20 UTC] D
- 症状: tools/join.sh D が初回『空き役割なし』で失敗（D は空いていた）
- 原因/解決: C の comms push と同時刻に競合し push 失敗→reset→return1 になっていた。pull --rebase 後に手動で roles/D.claim を push して取得。claim() に pull --rebase リトライを入れると良い

### [2026-10-01 10:52:22 UTC] D
- 症状: tools/comms.sh read の出力が文字化け/断片化して読めない
- 原因/解決: awk の RS='\n### ' がマルチバイト環境(mawk)で正しく分割されない模様。暫定: tail -n 40 .comms/chat/*.md で直接読む。gawk を使う or 行頭 '### [' 基準で python 分割にすると直る

### [2026-10-01 10:52:24 UTC] D
- 症状: 全サンドボックスの hostname が sandbox.local で同じ
- 原因/解決: join.sh の claim 照合 'host=... dir=...' が他サンドボックスの同名エージェントと区別できない。claim に乱数ID(uuid)を入れると安全

### [2026-10-01 10:53:03 UTC] D
- 症状: audio_generation 呼び出しで 'Credits are exhausted' (環境音/BGM/波 3本とも失敗)
- 原因/解決: 未解決: クレジット不足。有料生成ツール(画像/音声/動画生成)はこのリクエスト中は再呼び出し禁止。クレジット追加後に再試行が必要
