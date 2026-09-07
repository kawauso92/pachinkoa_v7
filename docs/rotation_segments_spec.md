# 区間入力モード 実装指示書

**対象ファイル:** `index.html`（単一ファイルアプリ）  
**目的:** データ機に通常総回転が出ない店向けに、G数メモから総回転を積算する入力モードを追加する  
**既存機能:** 開始回転・終了回転のシンプルモードは残す（非表示にするだけ、データは保持）

---

## 1. 背景・ユーザー運用

- 従来店: データ機の「通常総回転」が見える → 終了回転 − 開始回転で十分
- 新しい店: 総回転は見えない → 打ちながら G数をメモし、差分で通常回転を出す
- メモの意味:
  - **左列:** 区間の起点 G数（打ち始め = 開始、または 時短抜け後 = 時短抜け）
  - **右列:** 区間の終点 G数（当たり時 = 当たり、または やめるとき = 終了）
- 左・右は「どちらの種類か」はユーザーが頭の中で区別。画面上は **1行 = 左1数値 + 右1数値** のみ
- 当たりタブ（大当たり種類・出玉内訳）とは **連動しない**
- 試しうち機種選択時は、既存どおり回転数セクション全体を非表示（区間モードも含む）

---

## 2. UI仕様

### 2.1 配置

`#section-rotation`（回転数セクション）内に追加。

```
[回転数]
  [ シンプル | 区間入力 ]  ← モード切替チップ（2択）

--- シンプルモード ON ---
  （既存）開始回転 / 終了回転 の input-grid
  （既存）総回転・通常回転・回転率の rotation-display

--- 区間入力モード ON ---
  （既存の開始/終了 input-grid は非表示）
  列ヘッダー（1行・テキストのみ）:
    左: 開始・時短抜け          右: 終了・当たり
  入力行リスト（#rot-segment-list）:
    行1: [ input 左 ] [ input 右 ] [削除]
    行2: ...
  [ ＋ 区間追加 ]
  合計表示: 総回転: 12,345（自動）  ← rotation-display の総回転と同じ値
  （既存）通常回転・回転率の rotation-display は表示継続
```

### 2.2 モード切替

- チップ2つ: `シンプル` / `区間入力`（既存の打ち手チップ `.chip` スタイルを流用可）
- 区間ON → `#simple-rot-inputs`（開始・終了の input-grid）を `display:none`
- シンプルON → `#segment-rot-panel` を `display:none`
- **どちらのモードの入力値も消さない**（切り替えても localStorage に残る）

### 2.3 区間行

- 初期状態: **0行**（ユーザーが「＋ 区間追加」で追加）
- 当たり0回の日: 1行だけ（左=打ち始めG、右=終了G）
- 当たりが多い日: 20行程度になる想定 → 折りたたみなし、全行表示
- 各行:
  - 左: `type="number"` `inputmode="numeric"` プレースホルダ `0`
  - 右: 同上
  - 削除ボタン（当たり記録の `.hit-del` と同系）
  - 行内または行下に小さく `→ この区間: 1,234`（差分、0以下は0または「—」表示で要検討。負数は入力ミスなので `—` 推奨）

### 2.4 ラベル文言（固定）

| 位置 | 表示テキスト |
|------|-------------|
| 列ヘッダー左 | 開始・時短抜け |
| 列ヘッダー右 | 終了・当たり |
| 追加ボタン | ＋ 区間追加 |
| モードチップ | シンプル / 区間入力 |

---

## 3. 計算ロジック

### 3.1 1行の区間回転

```js
function calcSegmentRot(left, right) {
  const l = parseFloat(left);
  const r = parseFloat(right);
  if (!isFinite(l) || !isFinite(r)) return 0;
  const diff = r - l;
  return diff > 0 ? diff : 0; // 負数は0扱い（表示は「—」でも可）
}
```

### 3.2 総回転 `soKaiten`

`recalc()` および `doSend()` 内で、**1箇所に集約**して分岐:

```js
function getSoKaiten() {
  if (S.rotationMode === 'segments') {
    return S.rotSegments.reduce((sum, row) => {
      return sum + calcSegmentRot(row.left, row.right);
    }, 0);
  }
  const rotStart = parseFloat(document.getElementById('in-rot-start').value) || 0;
  const rotEnd   = parseFloat(document.getElementById('in-rot-end').value) || 0;
  return rotEnd - rotStart;
}
```

- `normalKaiten` は現状 `soKaiten` と同値のため、そのまま `getSoKaiten()` の結果を使う
- 回転率・仕事量・ボーダー比較など、既存で `soKaiten` / `normalKaiten` を使っている箇所は **変更不要**（入力元だけ変わる）

### 3.3 表示

- `disp-total-rot`: `getSoKaiten()` の結果（区間モード時は合計）
- 区間モード時、セグメントパネル内にも `総回転: X,XXX` を表示（`disp-total-rot` と同値でOK）

---

## 4. 状態・永続化

### 4.1 グローバル状態 `S` に追加

```js
S.rotationMode = 'simple'; // 'simple' | 'segments'
S.rotSegments  = [];       // [{ left: '', right: '' }, ...]
```

### 4.2 `save()` に追加するフィールド

```js
rotationMode: S.rotationMode,
rotSegments:  S.rotSegments,
```

既存キー `pachinkoLog_v5` を継続使用（キー名変更しない）。

### 4.3 `loadData()` で復元

- `rotationMode` → チップの selected 状態とパネル表示切替
- `rotSegments` → 行リスト再描画 `renderRotSegments()`
- 未保存データ（旧バージョン）の場合は `rotationMode: 'simple'`, `rotSegments: []` デフォルト

### 4.4 `afterSendReload()`

- 送信後リロード時、**区間行はリセット**（当たり `hits` と同様）
- `rotationMode` は **保持**（店によって毎日区間モード使う想定）
- シンプルモードの開始・終了も既存どおり空にする

```js
d.rotSegments = [];
// rotationMode は d に残す（save 済みなら load で復元）
```

---

## 5. 関数一覧（新規・変更）

| 関数 | 役割 |
|------|------|
| `getSoKaiten()` | モードに応じた総回転取得（**新規**） |
| `setRotationMode(mode)` | チップ切替・パネル表示・save・recalc |
| `renderRotSegments()` | `S.rotSegments` から DOM 生成 |
| `addRotSegment()` | 空行追加 |
| `removeRotSegment(index)` | 行削除 |
| `onSegmentInput(index, side, value)` | 値更新・save・recalc |
| `recalc()` | `soKaiten` 取得を `getSoKaiten()` に置き換え |
| `doSend()` | 同上（重複計算している箇所も統一） |

### `bindEvents()` に追加

- モードチップ click
- `#add-rot-segment-btn` click

---

## 6. HTML追加案（`#section-rotation` 内）

既存 `input-grid`（開始・終了）を `id="simple-rot-inputs"` でラップ。

```html
<!-- モード切替 -->
<div class="chip-select" id="rot-mode-chips" style="margin-bottom:10px;">
  <div class="chip selected" data-mode="simple">シンプル</div>
  <div class="chip" data-mode="segments">区間入力</div>
</div>

<!-- 既存: simple-rot-inputs でラップ -->
<div id="simple-rot-inputs"> ... 既存 input-grid ... </div>

<!-- 新規: 区間入力パネル（初期非表示） -->
<div id="segment-rot-panel" style="display:none;">
  <div class="segment-header" style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;font-size:9px;color:var(--text2);margin-bottom:6px;padding:0 4px;">
    <span>開始・時短抜け</span>
    <span>終了・当たり</span>
    <span style="width:52px;"></span>
  </div>
  <div id="rot-segment-list"></div>
  <button type="button" class="add-hit-btn" id="add-rot-segment-btn" style="margin-top:8px;">＋ 区間追加</button>
  <div style="margin-top:8px;font-size:11px;color:var(--text2);font-family:'JetBrains Mono',monospace;">
    区間合計: <span id="disp-segment-sum">—</span>
  </div>
</div>
```

`rotation-display`（総回転・通常回転・回転率）は **モード共通で表示**。

---

## 7. 試しうち・ガード

- `updateTrialMode()` で `#section-rotation` 全体を非表示にしている既存処理は **そのまま**（区間パネルも含めて隠れる）
- 店・機種未選択のガードは既存のまま

---

## 8. やらないこと（スコープ外）

- 当たりタブとの連動・自動行追加
- GAS ペイロードの新フィールド追加（`soKaiten` は既存フィールドで送る）
- 区間行の GAS への個別送信
- 折りたたみUI

---

## 9. テストチェックリスト

1. **シンプルモード** — 開始5000・終了15000 → 総回転10000（既存と同じ）
2. **区間モード** — 行1: 100→500(400)、行2: 520→900(380) → 総回転780
3. **当たり0回** — 1行: 100→800 → 総回転700
4. **モード切替** — 両方入力後、切り替えても各モードの値が保持される
5. **save/load** — リロード後にモード・区間行が復元される
6. **送信後** — `afterSendReload` で区間行は空、モードは保持
7. **試しうち** — 回転セクション非表示
8. **回転率・仕事量** — 区間合計を元に既存計算が動く
9. **負の差分** — 左>右 の行は 0 または — 表示、合計に含めない
10. **空行** — 左右未入力の行は 0 として無視

---

## 10. 実装時の注意

- `recalc()` と `doSend()` で `rotEnd - rotStart` が **二重定義**されている。`getSoKaiten()` に統一すること
- 区間行の DOM 生成は `renderHitList()` パターンに合わせる（innerHTML より createElement 推奨、削除ボタンのクロージャに index 注意）
- 既存 CSS を最大活用（`.input-field`, `.add-hit-btn`, `.hit-del`, `.chip`）
- コミット・push はユーザー指示があるまで行わない

---

## 11. Codex への短いプロンプト例

```
index.html に区間入力モードを実装してください。
仕様は docs/rotation_segments_spec.md に記載。
要点: 回転数セクションにシンプル/区間入力の切替。区間モードは列ヘッダー
「開始・時短抜け | 終了・当たり」の下に行追加式の2欄入力。総回転=各行(右-左)の合計。
getSoKaiten()でrecalc/doSendを統一。localStorage保存。当たりタブ連動なし。
```
