// 元に戻す（下書きの履歴）の純関数のテスト
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = '// ==== 下書きの履歴 純関数（ここから）';
const end = '// ==== 下書きの履歴 純関数（ここまで）';
assert.ok(html.includes(start) && html.includes(end), '純関数マーカーが見つかる');
const code = html.slice(html.indexOf(start), html.indexOf(end));
const { UNDO_MAX, parseJsonOrNull, buildDraftSnapshot, snapshotKey, sameDraftSnapshot,
  pushUndoHistory, popUndoHistory, parseUndoHistory, serializeUndoHistory } =
  new Function(`${code}\nreturn { UNDO_MAX, parseJsonOrNull, buildDraftSnapshot, snapshotKey, sameDraftSnapshot,
    pushUndoHistory, popUndoHistory, parseUndoHistory, serializeUndoHistory };`)();

// --- JSONの読み取り ---
assert.equal(parseJsonOrNull(''), null);
assert.equal(parseJsonOrNull(undefined), null);
assert.equal(parseJsonOrNull('not json'), null);
assert.equal(parseJsonOrNull('null'), null);
assert.deepEqual(parseJsonOrNull('{"a":1}'), { a: 1 });

// --- 下書きの状態を1つの値にまとめる ---
assert.deepEqual(buildDraftSnapshot('{"rotStart":"1"}', '{"seisan-kokan":"28"}'),
  { pachinko: { rotStart: '1' }, seisan: { 'seisan-kokan': '28' } });
assert.deepEqual(buildDraftSnapshot('bad', ''), { pachinko: null, seisan: null });

// --- 同じかどうか ---
const a = { pachinko: { rotStart: '1' }, seisan: null };
const b = { pachinko: { rotStart: '1' }, seisan: null };
const c = { pachinko: { rotStart: '2' }, seisan: null };
assert.equal(sameDraftSnapshot(a, b), true);
assert.equal(sameDraftSnapshot(a, c), false);
assert.equal(snapshotKey(a), snapshotKey(b));

// --- 積む ---
assert.deepEqual(pushUndoHistory([], a), [a]);
assert.deepEqual(pushUndoHistory([a], b), [a], '直前と同じなら積まない');
assert.deepEqual(pushUndoHistory([a], c), [a, c], '違えば積む');
// 元の配列は変えない
const base = [a];
pushUndoHistory(base, c);
assert.deepEqual(base, [a]);
// 30件で古いものから捨てる
let hist = [];
for (let i = 0; i < 31; i++) hist = pushUndoHistory(hist, { pachinko: { n: i }, seisan: null });
assert.equal(hist.length, UNDO_MAX);
assert.equal(hist.length, 30);
assert.equal(hist[0].pachinko.n, 1, 'いちばん古いものが捨てられる');
assert.equal(hist[hist.length - 1].pachinko.n, 30);
// max を指定できる
let h2 = [];
for (let i = 0; i < 5; i++) h2 = pushUndoHistory(h2, { pachinko: { n: i }, seisan: null }, 3);
assert.equal(h2.length, 3);
assert.deepEqual(h2.map(x => x.pachinko.n), [2, 3, 4]);

// --- 1つ取り出す ---
assert.deepEqual(popUndoHistory([]), { history: [], snapshot: null });
const popped = popUndoHistory([a, c]);
assert.deepEqual(popped.snapshot, c);
assert.deepEqual(popped.history, [a]);
// 元の配列は変えない
const base2 = [a, c];
popUndoHistory(base2);
assert.deepEqual(base2, [a, c]);

// --- 保存用の読み書き ---
assert.deepEqual(parseUndoHistory(''), []);
assert.deepEqual(parseUndoHistory('bad'), []);
assert.deepEqual(parseUndoHistory('null'), []);
assert.deepEqual(parseUndoHistory('{"a":1}'), [], '配列以外は空');
assert.deepEqual(parseUndoHistory('[1,2]'), [], 'オブジェクト以外の要素は捨てる');
assert.deepEqual(parseUndoHistory('[{"pachinko":{}}]'), [{ pachinko: {} }]);
// 30件を超える保存値は新しい30件だけ使う
const many = [];
for (let i = 0; i < 40; i++) many.push({ pachinko: { n: i }, seisan: null });
const parsedMany = parseUndoHistory(JSON.stringify(many));
assert.equal(parsedMany.length, 30);
assert.equal(parsedMany[0].pachinko.n, 10);
// 往復
assert.deepEqual(parseUndoHistory(serializeUndoHistory([a, c])), [a, c]);
assert.equal(serializeUndoHistory([]), '');
assert.equal(serializeUndoHistory(null), '');

// --- 画面の作り ---
assert.ok(html.includes('id="undoBtn"'));
assert.ok(/id="undoBtn"[^>]*aria-disabled="true"/.test(html), '履歴が空のときは押せない見た目');
assert.ok(html.indexOf('id="undoBtn"') < html.indexOf('id="refreshBtn"'), '「更新」の左に「戻す」');
assert.ok(html.includes("const UNDO_KEY = 'draft_undo_v1'"), '履歴は別キーに保存');
assert.ok(html.includes('function applyDataToScreen'), 'loadData の中身を切り出して使う');
assert.ok(html.includes('clearUndoHistory(); // 送信前に戻して二重送信するのを防ぐ'));
assert.ok(html.includes('clearUndoHistory(); // 元に戻すの履歴も消す'));
assert.ok(html.includes('function undoOnce'));

console.log('PASS: 下書きの履歴（積む・同じなら積まない・30件で捨てる・取り出す・読み書き）');
