// 期待時給を「実力（持ち玉100%）」と「持ち玉比率ごと」に分けた計算のテスト
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = '// ==== 期待時給の純関数（ここから）';
const end = '// ==== 期待時給の純関数（ここまで）';
assert.ok(html.includes(start) && html.includes(end));
const code = html.slice(html.indexOf(start), html.indexOf(end));
const {getExpectedCostPerBall, calcKitaiJikyu} =
  new Function(`${code}\nreturn {getExpectedCostPerBall, calcKitaiJikyu};`)();

// 3.6円（27.78玉）の店、時速230・トータル1/128.4・平均出玉1370の機種
const k = {jikan:230, total:128.4};
const kokan = 27.78;
const kankin = 100 / kokan;
const full = calcKitaiJikyu(k, 1370, 19.2, kokan, 1);
// 従来式（持ち玉100%）と一致する
const expected = 1370 * 230 / 128.4 * kankin - 250 * 230 / 19.2 * kankin;
assert.ok(Math.abs(full - expected) < 1e-9);
// 現金を混ぜるほど下がり、0%は1玉4円で計算する
const half = calcKitaiJikyu(k, 1370, 19.2, kokan, 0.5);
const cash = calcKitaiJikyu(k, 1370, 19.2, kokan, 0);
assert.ok(full > half && half > cash);
assert.ok(Math.abs(cash - (1370 * 230 / 128.4 * kankin - 250 * 230 / 19.2 * 4)) < 1e-9);
assert.equal(getExpectedCostPerBall(kokan, 1), kankin);
// 回転率なし・スペック不正は計算しない
assert.equal(calcKitaiJikyu(k, 1370, null, kokan, 1), null);
assert.equal(calcKitaiJikyu({jikan:230, total:0}, 1370, 19.2, kokan, 1), null);

// 送信と報酬は常に持ち玉100%：ボーダータブのスライダー（S.ratio）を送信側で使わない
const submitStart = html.indexOf('// 送信と報酬は常に持ち玉100%');
assert.ok(submitStart > 0);
assert.ok(html.slice(submitStart, submitStart + 200).includes('calcKitaiJikyu(k, heikin, kaitenRitsu, kokan, 1)'));
assert.equal((html.match(/S\.ratio \/ 100/g) || []).length, 1, 'S.ratio を比率に使うのは recalc の試算だけ');
console.log('PASS: 期待時給の実力（100%）・今の比率・試算の分離、送信は常に100%');
