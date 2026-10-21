// 必須の未入力の判定と、投資玉数の元の数字の説明のテスト
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = '// ==== 必須の未入力・投資玉数の表示 純関数（ここから） ====';
const end = '// ==== 必須の未入力・投資玉数の表示 純関数（ここまで） ====';
assert.ok(html.includes(start) && html.includes(end));
const code = html.slice(html.indexOf(start), html.indexOf(end));
const {requiredMissing, investBallSourceText} = new Function(`${code}\nreturn {requiredMissing, investBallSourceText};`)();

// 全部空：時間・回転・投資・回収が未入力。初めての店でなければ開始時貯玉は求めない
const empty = requiredMissing({rotMode:'simple'});
assert.deepEqual(empty, {ts:true, te:true, rs:true, re:true, inv:true, se:true, rc:true, ss:false});
// 0 は入力済み
const zero = requiredMissing({ts:'10:00', te:'12:00', rotMode:'simple', rs:'0', re:'100', inv:'0', rc:'0'});
assert.deepEqual(zero, {ts:false, te:false, rs:false, re:false, inv:false, se:false, rc:false, ss:false});
// 投資：投資終了時貯玉だけでも足りる／手入力の投資玉数でも足りる／自動の投資玉数だけでは足りない
assert.equal(requiredMissing({se:'531'}).inv, false);
assert.equal(requiredMissing({ib:'1000', ibManual:true}).inv, false);
assert.equal(requiredMissing({ib:'1000', ibManual:false}).inv, true);
// 区間入力のときは開始・終了回転を求めない
const seg = requiredMissing({rotMode:'segments'});
assert.equal(seg.rs, false); assert.equal(seg.re, false);
// 初めての店では開始時貯玉を求める（0なら入力済み）
assert.equal(requiredMissing({firstVisit:true}).ss, true);
assert.equal(requiredMissing({firstVisit:true, ss:'0'}).ss, false);
// 投資玉数の説明
assert.equal(investBallSourceText('1531', '531'), '開始 1,531 − 終了 531');
assert.equal(investBallSourceText('', '531'), '開始時貯玉と投資終了時貯玉から出します');
assert.equal(investBallSourceText(undefined, undefined), '開始時貯玉と投資終了時貯玉から出します');
console.log('PASS: 必須の未入力の判定（0は入力済み、投資は3つのどれかで可、区間・初めての店）と投資玉数の説明');
