# pachinkoa_v7_rewardcurve

## 変更概要
- 控除率を一律計算からカーブ式 (`getKoujoRate`) に変更
- 報酬刻みを `5000` から `2500` に変更
- 共通関数 `getKoujoRate` / `calcBaseReward` / `calcFinalReward` を導入
- リアルタイム表示に「控除率xx.x% 控除額¥x,xxx」を追加
- 期待時給算出は既存の `100/kokan` (持玉100%ベース) 実装を確認済み

## バックアップ
- 変更前HTML: `backup/index_before_reward_patch.html`
- 全体バックアップ: `C:/Users/vanbe/Documents/paticodex/backups/appA/`

## テスト
- 共通テスト結果: `C:/Users/vanbe/Documents/paticodex/logs/test_results_reward_curve_20260308.txt`
