
### [2026-10-01 10:52:20 UTC] D
- 症状: tools/join.sh D が初回『空き役割なし』で失敗（D は空いていた）
- 原因/解決: C の comms push と同時刻に競合し push 失敗→reset→return1 になっていた。pull --rebase 後に手動で roles/D.claim を push して取得。claim() に pull --rebase リトライを入れると良い
