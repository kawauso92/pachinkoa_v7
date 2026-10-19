// メリハリ改修で足した表示用の値（期待回数・差・現金のボーダー・差し色）のテスト
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = '// ==== 表示用の純関数（ここから）';
const end = '// ==== 表示用の純関数（ここまで）';
assert.ok(html.includes(start) && html.includes(end));
const code = html.slice(html.indexOf(start), html.indexOf(end));
const { expectedCount, expectedDiff, cashBorder, diffInfo, accentColor, accentIsRainbow } =
  new Function(`${code}\nreturn { expectedCount, expectedDiff, cashBorder, diffInfo, accentColor, accentIsRainbow };`)();

// --- 期待回数＝通常回転 ÷ 確率 ---
assert.equal(expectedCount(1180, 319.7).toFixed(1), '3.7');
assert.equal(expectedCount(1180, 128.4).toFixed(1), '9.2');
assert.equal(expectedCount(0, 319.7), null, '通常回転0は出さない');
assert.equal(expectedCount(1180, 0), null, '確率0は出さない');
assert.equal(expectedCount(1180, null), null);
assert.equal(expectedCount(1180, undefined), null);
assert.equal(expectedCount(1180, 'abc'), null);

// --- 差＝実測 − 期待 ---
assert.equal(expectedDiff(3, 2.4).toFixed(1), '0.6');
assert.equal(expectedDiff(2, 2.4).toFixed(1), '-0.4');
assert.equal(expectedDiff(3, null), null);
assert.equal(expectedDiff(null, 2.4), null);
assert.equal(expectedDiff(0, 2.4), -2.4, '実測0でも差は出す');

// --- 現金のボーダー＝持ち玉のボーダー × 4 ÷ (100 ÷ kokan) ---
assert.equal(cashBorder(16.9, 27.78).toFixed(2), '18.78');
assert.equal(cashBorder(16.9, 25).toFixed(2), '16.90', '4円交換（kokan25）は持ち玉と同じ');
assert.equal(cashBorder(0, 27.78), null);
assert.equal(cashBorder(16.9, 0), null);
assert.equal(cashBorder(null, 27.78), null);

// --- 差の表示（余剰／欠損、＋／−、小数1桁、色） ---
assert.deepEqual(diffInfo(0.6), { has: true, text: '+0.6', label: '余剰', cls: 'plus' });
assert.deepEqual(diffInfo(-0.6), { has: true, text: '-0.6', label: '欠損', cls: 'minus' });
assert.deepEqual(diffInfo(0), { has: true, text: '±0.0', label: '', cls: '' });
assert.deepEqual(diffInfo(3.14), { has: true, text: '+3.1', label: '余剰', cls: 'plus' });
assert.deepEqual(diffInfo(-0.04), { has: true, text: '±0.0', label: '', cls: '' });
assert.deepEqual(diffInfo(null), { has: false, text: '—', label: '', cls: '' });
assert.deepEqual(diffInfo(undefined), { has: false, text: '—', label: '', cls: '' });
assert.deepEqual(diffInfo('abc'), { has: false, text: '—', label: '', cls: '' });

// --- 差し色（見送り・未計算は灰。虹は代表色＋虹の印） ---
assert.equal(accentColor(-1), 'var(--fg2)');
assert.equal(accentColor(0), 'var(--fg2)');
assert.equal(accentColor(1), 'var(--t1)');
assert.equal(accentColor(2), 'var(--t2)');
assert.equal(accentColor(3), 'var(--t3)');
assert.equal(accentColor(4), 'var(--t4)');
assert.equal(accentColor(5), '#c45cff');
assert.equal(accentIsRainbow(5), true);
assert.equal(accentIsRainbow(4), false);
assert.equal(accentIsRainbow(-1), false);

// --- 画面の作り（主役→2番目→小さい、差し色の使い所） ---
assert.ok(html.includes('class="main-stats"'), 'メインの見る数字');
assert.ok(html.includes('class="hit-hero"'), '当たりの主役');
assert.ok(html.includes('class="border-hero"'), '機種の主役（ボーダー2つ）');
assert.ok(html.includes('id="disp-border-cash"'), '現金のボーダー');
assert.ok(html.includes('id="disp-border-cash-diff"'));
assert.ok(html.includes('id="hatsua-expected"') && html.includes('id="hatsua-diff"'));
assert.ok(html.includes('id="total-expected"') && html.includes('id="total-diff"'));
assert.ok(html.includes('id="jisoku-diff"'), '実測の時速の差');
assert.ok(html.includes('id="kitai-fuel-val"') && html.includes('id="kpi-kado"'), '3行目の持ち玉比率・稼働');
assert.ok(html.includes('label-row'), '台帳からはラベルの行に置く');
assert.ok(html.includes('warn-empty'), '終了時間が空なら枠を注意の色に');
assert.ok(html.includes("classList.toggle('warn-empty'"), 'recalc で枠を切り替える');
// 差し色の使い所
assert.ok(html.includes('var(--accent)'), '差し色の変数を使う');
assert.ok(/\.nav-item\.active::before\{[^}]*var\(--accent\)/.test(html), '下部ナビの選択中の印');
assert.ok(/\.group h2::before\{[^}]*var\(--accent\)/.test(html), '見出しの横の小さな印');
assert.ok(html.includes('border-color:var(--accent)'), '入力中の欄の枠');
assert.ok(/\.switch\[aria-pressed="true"\]::after\{[^}]*var\(--accent\)/.test(html), '切り替えスイッチのオン');
assert.ok(html.includes('accent-rainbow'), '虹のときの印');
// 清算計算機は設定タブ（ノリうちの行のすぐ下）で常に表示
assert.ok(html.indexOf('id="section-seisan"') > html.indexOf('id="nori-toggle"'), 'ノリうちの行より後ろ');
assert.ok(html.indexOf('id="section-seisan"') < html.indexOf('id="theme-seg"'), '画面の行より前');
assert.ok(html.indexOf('id="section-seisan"') > html.indexOf('id="tab-setting"'), '設定タブの中');

console.log('PASS: 期待回数・差・現金のボーダー・差し色の表示用純関数');
