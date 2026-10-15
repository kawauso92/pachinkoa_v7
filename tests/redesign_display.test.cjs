// 見た目刷新で足した表示用の純関数のテスト（期待時給の段階・メーター・初当たり要約・11R判定）
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = '// ==== 表示用の純関数（ここから）';
const end = '// ==== 表示用の純関数（ここまで）';
assert.ok(html.includes(start) && html.includes(end));
const code = html.slice(html.indexOf(start), html.indexOf(end));
const { KITAI_METER_MIN, KITAI_METER_MAX, KITAI_TIER_NAMES, KITAI_GLOW,
  kitaiMeterPos, kitaiTier, kitaiMeterBands, kitaiTierStyle,
  hatsuaJikkyoRate, hatsuaAverageBalls, hasRound11Plus } =
  new Function(`${code}\nreturn { KITAI_METER_MIN, KITAI_METER_MAX, KITAI_TIER_NAMES, KITAI_GLOW,
    kitaiMeterPos, kitaiTier, kitaiMeterBands, kitaiTierStyle,
    hatsuaJikkyoRate, hatsuaAverageBalls, hasRound11Plus };`)();

// 初期値：及第1500・合格1800・良台2200・神台2600・虹3000
const TH = { warn: 1500, ok: 1800, good: 2200, great: 2600, rainbow: 3000 };

// --- メーターの位置（%） ---
assert.equal(kitaiMeterPos(KITAI_METER_MIN), 0);
assert.equal(kitaiMeterPos(KITAI_METER_MAX), 100);
assert.equal(kitaiMeterPos(KITAI_METER_MIN - 500), 0, '下限より下は0に丸める');
assert.equal(kitaiMeterPos(KITAI_METER_MAX + 500), 100, '上限より上は100に丸める');
assert.equal(kitaiMeterPos(null), null);
assert.equal(kitaiMeterPos('abc'), null);
// 中央は50%になる（800〜3800の中間2300）
assert.equal(kitaiMeterPos(2300), 50);

// --- 6段階の判定 ---
assert.equal(kitaiTier(1400, TH), 0, 'しきい値未満は見送り');
assert.equal(kitaiTier(1500, TH), 1, 'ちょうど及第は及第');
assert.equal(kitaiTier(1800, TH), 2);
assert.equal(kitaiTier(2200, TH), 3);
assert.equal(kitaiTier(2600, TH), 4);
assert.equal(kitaiTier(3000, TH), 5, 'ちょうど虹は虹');
assert.equal(kitaiTier(9000, TH), 5);
assert.equal(kitaiTier(null, TH), -1);
assert.deepEqual(KITAI_TIER_NAMES, ['見送り', '及第', '合格', '良台', '神台', '虹']);

// --- 6区間の幅はしきい値に比例 ---
const geo = kitaiMeterBands(TH);
assert.deepEqual(geo.edges, [800, 1500, 1800, 2200, 2600, 3000, 3800]);
assert.deepEqual(geo.widths, [700, 300, 400, 400, 400, 800]);
assert.equal(geo.widths.length, 6, '区間は6つ');
assert.equal(geo.widths.reduce((a, b) => a + b, 0), KITAI_METER_MAX - KITAI_METER_MIN);
// しきい値を変えても幅が比例して変わる
const geo2 = kitaiMeterBands({ warn: 1000, ok: 2000, good: 2500, great: 2700, rainbow: 3200 });
assert.deepEqual(geo2.widths, [200, 1000, 500, 200, 500, 600]);

// --- 段階の色・ラベル（虹はグラデーション） ---
assert.deepEqual(kitaiTierStyle(5), { color: 'var(--rainbow)', number: 'var(--rainbow)', label: '虹', rainbow: true });
assert.deepEqual(kitaiTierStyle(4), { color: 'var(--t4)', number: 'var(--t4)', label: '神台', rainbow: false });
assert.deepEqual(kitaiTierStyle(3), { color: 'var(--t3)', number: 'var(--t3)', label: '良台', rainbow: false });
assert.deepEqual(kitaiTierStyle(2), { color: 'var(--t2)', number: 'var(--t2)', label: '合格', rainbow: false });
assert.deepEqual(kitaiTierStyle(1), { color: 'var(--t1)', number: 'var(--fg)', label: '及第', rainbow: false });
assert.deepEqual(kitaiTierStyle(0), { color: 'var(--t0)', number: 'var(--fg2)', label: '見送り', rainbow: false });
assert.equal(kitaiTierStyle(-1).label, '—');
assert.equal(kitaiTierStyle(-1).rainbow, false);
// 枠の光の段数ぶん（見送り・虹は別扱い）
assert.equal(KITAI_GLOW.length, 6);
assert.equal(KITAI_GLOW[0], 0);
assert.ok(KITAI_GLOW[4] > KITAI_GLOW[3] && KITAI_GLOW[3] > KITAI_GLOW[2], '上の段ほど光が強い');

// --- 初当たり確率（実測） ---
assert.equal(hatsuaJikkyoRate(3, 1180).toFixed(2), '393.33');
assert.equal(hatsuaJikkyoRate(0, 1180), null, '件数0は出さない');
assert.equal(hatsuaJikkyoRate(3, 0), null, '回転0は出さない');

// --- 初当たり1回あたりの平均出玉 ---
assert.equal(hatsuaAverageBalls(6540, 3), 2180);
assert.equal(hatsuaAverageBalls(6540, 0), null);
assert.equal(hatsuaAverageBalls(0, 3), 0);

// --- 11R以上のラウンドがあるか（データランプとのズレ注意） ---
assert.equal(hasRound11Plus({ rounds: [{ name: '10R' }, { name: '4R' }] }), false);
assert.equal(hasRound11Plus({ rounds: [{ name: '11R' }] }), true);
assert.equal(hasRound11Plus({ rounds: [{ name: '20R' }, { name: '10R' }] }), true);
assert.equal(hasRound11Plus({ rounds: [] }), false);
assert.equal(hasRound11Plus({}), false);
assert.equal(hasRound11Plus(null), false);

console.log('PASS: 期待時給6段階・メーター・初当たり要約・11R判定の表示用純関数');
