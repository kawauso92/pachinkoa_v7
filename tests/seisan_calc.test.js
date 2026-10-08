'use strict';
// 清算計算機の純関数テスト（外部依存なし・Node標準のみ）
// index.html 内のマーカーで囲まれた純関数ブロックを抽出して検証する。
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const START = '// ==== 清算計算 純関数（ここから）';
const END   = '// ==== 清算計算 純関数（ここまで）';

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const si = html.indexOf(START);
const ei = html.indexOf(END);
if (si < 0 || ei < 0 || ei <= si) {
  console.error('純関数マーカーが見つかりません。index.html を確認してください。');
  process.exit(1);
}
const src = html.slice(si, ei);
const { computeSeisan, seisanKosshi, seisanSummary, seisanNum } =
  new Function('"use strict";\n' + src + '\nreturn { computeSeisan, seisanKosshi, seisanSummary, seisanNum };')();

// ===== テスト用ユーティリティ =====
let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('ok   - ' + name);
  } catch (e) {
    failed++;
    console.error('FAIL - ' + name);
    console.error('       ' + (e && e.message));
  }
}
function closeTo(actual, expected, tol, msg) {
  const t = tol === undefined ? 1e-9 : tol;
  assert.ok(Math.abs(actual - expected) <= t,
    (msg || '') + ' actual=' + actual + ' expected=' + expected);
}

// 旧実装（b7579bb 相当）を再現した参照関数。パチンコのみの回帰確認に使う。
function oldPachinko(kokan, jGenkin, jTama, jRecover, aGenkin, aTama, aRecover) {
  const k = parseFloat(kokan) || 28;
  const ballToYen = (balls) => balls / k * 100;
  const calcK = (g, t, r) => ballToYen(r) - ballToYen(t) - g;
  const jKosshi = calcK(jGenkin || 0, jTama || 0, jRecover || 0);
  const aKosshi = calcK(aGenkin || 0, aTama || 0, aRecover || 0);
  const gassan = jKosshi + aKosshi;
  const hitori = gassan / 2;
  const seisan = jKosshi - hitori;
  const seisanYen = Math.abs(Math.round(seisan));
  return {
    jKosshi, aKosshi, gassan, hitori, seisan,
    seisanYen,
    seisanTama: Math.round(seisanYen / 100 * k),
    direction: seisan <= 0 ? '相手→自分' : '自分→相手',
  };
}

// パチンコ入力オブジェクト生成ヘルパー
function pk(rate, jG, jT, jR, aG, aT, aR, jCash, aCash) {
  return {
    rate: rate,
    jibun: { genkin: jG, stock: jT, recover: jR, recoverCash: jCash },
    aite:  { genkin: aG, stock: aT, recover: aR, recoverCash: aCash },
  };
}
function sl(rate, jG, jM, jR, aG, aM, aR, jCash, aCash) {
  return {
    rate: rate,
    jibun: { genkin: jG, stock: jM, recover: jR, recoverCash: jCash },
    aite:  { genkin: aG, stock: aM, recover: aR, recoverCash: aCash },
  };
}

// ===== 1. 既存ケース（パチンコのみ）の回帰 =====
const regressionCases = [
  ['28', 10000, 0, 500, 0, 0, 300],
  ['20', 0, 1000, 2000, 5000, 0, 0],
  ['',   3000, 0, 0, 0, 2000, 1500],   // 交換率空欄→28
  ['0',  1000, 500, 800, 0, 0, 0],     // 0→28
  ['abc', 4000, 0, 900, 1000, 0, 700], // 非数→28
  ['33.5', 5000, 1200, 3000, 2000, 800, 2500],
  [28,   0, 0, 0, 0, 0, 0],
];
regressionCases.forEach((c, i) => {
  test('回帰: パチンコのみ ケース' + (i + 1), () => {
    const [rate, jG, jT, jR, aG, aT, aR] = c;
    const r = computeSeisan({ pachinko: pk(rate, jG, jT, jR, aG, aT, aR), slot: {} });
    const o = oldPachinko(rate, jG, jT, jR, aG, aT, aR);
    assert.strictEqual(r.mode, 'pachinko');
    closeTo(r.pachinko.jKosshi, o.jKosshi, 1e-6);
    closeTo(r.pachinko.aKosshi, o.aKosshi, 1e-6);
    closeTo(r.pachinko.gassan,  o.gassan,  1e-6);
    closeTo(r.pachinko.hitori,  o.hitori,  1e-6);
    closeTo(r.pachinko.seisan,  o.seisan,  1e-6);
    assert.strictEqual(r.pachinko.seisanYen, o.seisanYen);
    assert.strictEqual(r.pachinko.direction, o.direction);
    // 玉換算（描画側と同じ式）
    assert.strictEqual(Math.round(r.pachinko.seisanYen / 100 * r.pachinko.rate), o.seisanTama);
    assert.strictEqual(r.combined, null);
    assert.strictEqual(r.warning, null);
  });
});

// ===== 2. 現金回収あり =====
test('現金回収あり: 玉回収に現金分が加算される', () => {
  const r = computeSeisan({ pachinko: pk('28', 10000, 0, 500, 0, 0, 300, 1500, 200), slot: {} });
  const o = oldPachinko('28', 10000, 0, 500, 0, 0, 300);
  // 現金回収があるため 自分/相手 の収支がそれぞれ +1500 / +200 になる
  closeTo(r.pachinko.jKosshi, o.jKosshi + 1500, 1e-6);
  closeTo(r.pachinko.aKosshi, o.aKosshi + 200, 1e-6);
  closeTo(r.pachinko.gassan, o.gassan + 1700, 1e-6);
  assert.strictEqual(r.mode, 'pachinko');
});

// ===== 3. スロットのみ =====
test('スロットのみ: 100円あたり枚数で収支計算', () => {
  // rate 5.6 → 1枚 = 100/5.6 円
  const r = computeSeisan({ pachinko: {}, slot: sl('5.6', 3000, 0, 100, 0, 0, 50) });
  assert.strictEqual(r.mode, 'slot');
  assert.strictEqual(r.pachinko, null);
  closeTo(r.slot.jKosshi, 100 / 5.6 * 100 - 3000, 1e-9);
  closeTo(r.slot.aKosshi, 50 / 5.6 * 100, 1e-9);
  const gassan = r.slot.jKosshi + r.slot.aKosshi;
  closeTo(r.slot.gassan, gassan, 1e-9);
  closeTo(r.slot.hitori, gassan / 2, 1e-9);
  assert.strictEqual(r.warning, null);
});

test('スロットのみ: 現金回収・貯メダル投資あり', () => {
  const r = computeSeisan({ pachinko: {}, slot: sl('20', 1000, 300, 700, 0, 0, 0, 500, 0) });
  const jK = 700 / 20 * 100 + 500 - 1000 - 300 / 20 * 100;
  closeTo(r.slot.jKosshi, jK, 1e-9);
  assert.strictEqual(r.mode, 'slot');
});

// ===== 4. パチンコ・スロット両方（合算） =====
test('両方（合算）: combined は各自収支の合計', () => {
  const r = computeSeisan({
    pachinko: pk('28', 10000, 0, 500, 0, 0, 300),
    slot: sl('5.6', 3000, 0, 100, 0, 0, 50),
  });
  assert.strictEqual(r.mode, 'both');
  assert.ok(r.pachinko && r.slot && r.combined);
  closeTo(r.combined.jKosshi, r.pachinko.jKosshi + r.slot.jKosshi, 1e-9);
  closeTo(r.combined.aKosshi, r.pachinko.aKosshi + r.slot.aKosshi, 1e-9);
  closeTo(r.combined.gassan, r.combined.jKosshi + r.combined.aKosshi, 1e-9);
  closeTo(r.combined.hitori, r.combined.gassan / 2, 1e-9);
  // 換算は各交換率
  const pTama = Math.round(r.combined.seisanYen / 100 * r.pachinko.rate);
  const sCoins = Math.round(r.combined.seisanYen / 100 * r.slot.rate);
  assert.ok(Number.isFinite(pTama) && Number.isFinite(sCoins));
});

test('片方のみ（スロット）は合算を出さない', () => {
  const r = computeSeisan({ pachinko: {}, slot: sl('5.6', 0, 0, 100, 0, 0, 0) });
  assert.strictEqual(r.mode, 'slot');
  assert.strictEqual(r.combined, null);
});

// ===== 5. 交換率不正（スロット） =====
['', '0', '-1', 'abc'].forEach((bad) => {
  test('交換率不正: スロット rate=' + JSON.stringify(bad), () => {
    const r = computeSeisan({ pachinko: {}, slot: sl(bad, 3000, 0, 100, 0, 0, 0) });
    assert.strictEqual(r.slot, null);
    assert.ok(r.warning, '警告が設定されること');
    assert.strictEqual(r.mode, 'none');
  });
});

test('交換率不正: パチンコ入力があればパチンコ結果は保持し警告を出す', () => {
  const r = computeSeisan({
    pachinko: pk('28', 10000, 0, 500, 0, 0, 300),
    slot: sl('', 3000, 0, 100, 0, 0, 0),
  });
  assert.strictEqual(r.mode, 'pachinko');
  assert.ok(r.pachinko);
  assert.ok(r.warning);
  assert.strictEqual(r.combined, null);
});

// ===== 6. 未入力 =====
test('未入力: mode=none / 各結果 null / 警告なし', () => {
  const r = computeSeisan({ pachinko: {}, slot: {} });
  assert.strictEqual(r.mode, 'none');
  assert.strictEqual(r.pachinko, null);
  assert.strictEqual(r.slot, null);
  assert.strictEqual(r.combined, null);
  assert.strictEqual(r.warning, null);
});

test('未入力: 0を入力した場合は入力扱い', () => {
  const r = computeSeisan({ pachinko: pk('28', 0, 0, 0, 0, 0, 0), slot: {} });
  assert.strictEqual(r.mode, 'pachinko');
  assert.strictEqual(r.pachinko.gassan, 0);
});

// ===== 補助関数の単体確認 =====
test('seisanNum: 空欄/非数は null、0は0', () => {
  assert.strictEqual(seisanNum(''), null);
  assert.strictEqual(seisanNum('   '), null);
  assert.strictEqual(seisanNum('abc'), null);
  assert.strictEqual(seisanNum('0'), 0);
  assert.strictEqual(seisanNum(5.6), 5.6);
});

test('seisanKosshi: 式の確認', () => {
  // 回収玉 500, 回収現金 1500, 現金投資 10000, 貯玉 100, rate 28
  const expected = 500 / 28 * 100 + 1500 - 10000 - 100 / 28 * 100;
  closeTo(seisanKosshi(28, 10000, 100, 500, 1500), expected, 1e-9);
});

// ===== 結果 =====
console.log('\n合計: ' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
