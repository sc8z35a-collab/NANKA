
### [2026-10-01 10:51:35 UTC] B
- 症状: 同一サンドボックス(/home/user/webapp)を C と共有していた。B が先に main から branch を切った直後に C の join.sh が checkout し作業ツリーが agent-C に切替わった
- 原因/解決: B は join.sh B により .wt/B worktree へ移動（join.sh の別worktree機能で解決）。※ .wt/B の autosave は COMMS=$ROOT/.comms を見るため心拍が更新されない(comms.sh は .comms_path を使うので発言は可)
