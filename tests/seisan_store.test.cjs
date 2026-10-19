// 清算計算機の入力の保存・復元・クリアの純関数のテスト
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = '// ==== 清算の保存 純関数（ここから）';
const end = '// ==== 清算の保存 純関数（ここまで）';
assert.ok(html.includes(start) && html.includes(end), '純関数マーカーが見つかる');
const code = html.slice(html.indexOf(start), html.indexOf(end));
const { SEISAN_FIELD_IDS, collectSeisanValues, applySeisanValues,
  clearSeisanValues, parseSeisanValues, serializeSeisanValues } =
  new Function(`${code}\nreturn { SEISAN_FIELD_IDS, collectSeisanValues, applySeisanValues,
    clearSeisanValues, parseSeisanValues, serializeSeisanValues };`)();

// --- 保存する欄の一覧 ---
assert.equal(SEISAN_FIELD_IDS.length, 18);
assert.ok(SEISAN_FIELD_IDS.includes('seisan-kokan'));
assert.ok(SEISAN_FIELD_IDS.includes('seisan-jibun-recover-cash'));
assert.ok(SEISAN_FIELD_IDS.includes('seisan-slot-rate'));
assert.ok(SEISAN_FIELD_IDS.includes('seisan-slot-aite-recover-cash'));

// --- section-seisan の中の input すべてが保存対象になっている ---
// （清算計算機は設定タブへ移したので、id から次の </section> までを切り出す）
const secStart = html.indexOf('id="section-seisan"');
const secEnd = html.indexOf('</section>', secStart);
assert.ok(secStart > 0 && secEnd > secStart);
const section = html.slice(secStart, secEnd);
const inputIds = [...section.matchAll(/<input[^>]*\bid="([^"]+)"/g)].map(m => m[1]);
assert.deepEqual([...inputIds].sort(), [...SEISAN_FIELD_IDS].sort(),
  'section-seisan の input と保存対象の id が一致する');

// --- 取り出し（空欄もそのまま持つ） ---
const fake = { 'seisan-kokan': '28', 'seisan-jibun-genkin': '10000', 'seisan-slot-rate': '' };
const collected = collectSeisanValues(id => (id in fake ? fake[id] : ''));
assert.equal(Object.keys(collected).length, 18);
assert.equal(collected['seisan-kokan'], '28');
assert.equal(collected['seisan-jibun-genkin'], '10000');
assert.equal(collected['seisan-slot-rate'], '');
assert.equal(collected['seisan-aite-tama'], '');
// 数値など文字列以外は空として扱う
assert.equal(collectSeisanValues(() => 123)['seisan-kokan'], '');

// --- 文字列にして読む（往復） ---
const raw = serializeSeisanValues({ 'seisan-kokan': '30', 'seisan-jibun-genkin': '5000' });
assert.equal(raw, JSON.stringify({ 'seisan-kokan': '30', 'seisan-jibun-genkin': '5000' }));
assert.deepEqual(parseSeisanValues(raw), { 'seisan-kokan': '30', 'seisan-jibun-genkin': '5000' });
// 保存する値が無ければ空文字（保存しない合図）
assert.equal(serializeSeisanValues({ 'seisan-kokan': '' }), '');
assert.equal(serializeSeisanValues(null), '');
assert.equal(serializeSeisanValues({}), '');

// --- 壊れた保存値は空として扱う（取り直しではなく空） ---
assert.deepEqual(parseSeisanValues(''), {});
assert.deepEqual(parseSeisanValues('not json'), {});
assert.deepEqual(parseSeisanValues('[1,2,3]'), {});
assert.deepEqual(parseSeisanValues('null'), {});
assert.deepEqual(parseSeisanValues('"x"'), {});
assert.deepEqual(parseSeisanValues('{"seisan-kokan":"30","unknown":"x"}'), { 'seisan-kokan': '30' });
assert.deepEqual(parseSeisanValues('{"seisan-kokan":123}'), {}, '文字列以外は捨てる');

// --- 戻し（保存値に無い欄は触らない＝換金率の初期値28を消さない） ---
const setCalls = {};
const applied = applySeisanValues({ 'seisan-kokan': '30' }, (id, v) => { setCalls[id] = v; });
assert.deepEqual(applied, ['seisan-kokan']);
assert.deepEqual(setCalls, { 'seisan-kokan': '30' });
// 壊れた値・空は何もしない
assert.deepEqual(applySeisanValues(null, () => {}), []);
assert.deepEqual(applySeisanValues([1, 2], () => {}), []);
assert.deepEqual(applySeisanValues('x', () => {}), []);
// 複数まとめて戻す
const many = {};
const appliedMany = applySeisanValues({ 'seisan-kokan': '30', 'seisan-slot-rate': '5.6' }, (id, v) => { many[id] = v; });
assert.deepEqual(appliedMany.sort(), ['seisan-kokan', 'seisan-slot-rate']);
assert.deepEqual(many, { 'seisan-kokan': '30', 'seisan-slot-rate': '5.6' });

// --- クリアは全項目を空にする ---
const cleared = {};
const clearedIds = clearSeisanValues((id, v) => { cleared[id] = v; });
assert.equal(clearedIds.length, 18);
assert.deepEqual(Object.keys(cleared).sort(), [...SEISAN_FIELD_IDS].sort());
assert.ok(Object.values(cleared).every(v => v === ''), 'すべて空');

// --- 画面の作り（入力のたびに保存・クリアボタン・リセットで消す） ---
assert.equal((html.match(/oninput="calcSeisan\(\);saveSeisan\(\)"/g) || []).length, 18,
  '清算計算機の入力はすべて入力のたびに保存する');
assert.ok(html.includes('id="seisan-clear-btn"'));
assert.ok(html.includes('onclick="clearSeisan()"'));
assert.ok(html.includes("const SEISAN_KEY = 'seisan_v1'"), 'pachinkoLog_v5 とは別のキーに保存する');
assert.ok(html.includes('clearSeisan(); // 清算計算機の入力と保存も消す'), '全データのリセットで清算も消す');

console.log('PASS: 清算計算機の保存・復元・クリアの純関数');
