const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
assert.ok(html.includes('id="nori-toggle"'));
assert.ok(html.includes('id="in-stock-card"'));
const start = '// ==== 台帳送信の純関数（ここから）';
const end = '// ==== 台帳送信の純関数（ここまで）';
const code = html.slice(html.indexOf(start), html.indexOf(end));
assert.ok(html.includes(start) && html.includes(end));
const {normalizeNoriDraft, buildSendValues, buildStockSubmission, buildSubmitPayload, calcStockLedgerDelta, stockConfirmationLine, stockStartDecision} =
  new Function(`${code}\nreturn {normalizeNoriDraft, buildSendValues, buildStockSubmission, buildSubmitPayload, calcStockLedgerDelta, stockConfirmationLine, stockStartDecision};`)();

assert.deepEqual(normalizeNoriDraft({uchi:'ノリうち'}), {uchi:'自分', noriuchi:true});
assert.deepEqual(normalizeNoriDraft({uchi:'代1', noriuchi:true}), {uchi:'代1', noriuchi:true});
assert.deepEqual(normalizeNoriDraft({uchi:'代1'}), {uchi:'代1', noriuchi:false});

const raw = {kosshi:1001, sagitama:1001, shigoto:3001, soKaiten:201, soRounds:31,
  todayHits:3, hitBalls:1001, jikanStr:'5:30', kadoH:5.5, shigotoJikyu:545.6, hoshu:9000, koujoAmt:100};
const oldNori = {sendUchi:'自分', sendKosshi:500.5, sendSagitama:500.5, sendShigoto:1500.5,
  sendSoKaiten:100.5, sendSoRounds:15.5, sendTodayHits:1.5, sendHitBalls:500.5,
  sendJikanStr:'2:45', sendShigotoJikyu:1500.5 / 2.75, sendHoshu:0, sendKoujoAmt:0};
assert.deepEqual(buildSendValues(raw, '代1', true), oldNori);
assert.deepEqual(buildSendValues(raw, '自分', true), oldNori);
assert.equal(buildSendValues(raw, '代1', false).sendUchi, '代1');
assert.equal(buildSendValues(raw, '代1', false).sendHoshu, 9000);

const fields = {date:'2026-10-08', shop:'A', kishu:'B', event:'', daiban:'123',
  kitaiJikyu:1800.4, kaitenRitsu:19.876, border:20.876, un:90.5,
  genkinInvest:3000, mochiRatio:0.42, choTamaInvest:400, genkinInvestBalls:840,
  watashita:100, moratta:50, memo:'メモ'};
const actual = buildSubmitPayload(fields, oldNori, {});
assert.deepEqual(actual, {action:'submit', date:'2026-10-08', shop:'A', kishu:'B', event:'', daiban:'123',
  uchi:'自分', kosshi:501, jikan:'2:45', kitaiJikyu:1800, shigoto:1501, shigotoJikyu:546,
  soKaiten:100.5, kaitenRitsu:19.88, border:20.88, un:91, sagitama:501, kariHoshu:0,
  soRounds:15.5, todayHits:1.5, hitBalls:501, jitsu1R:32.3, genkinInvest:3000,
  mochiRatio:0.42, choTamaInvest:400, genkinInvestBalls:840, watashita:100, moratta:50, memo:'メモ'});

assert.deepEqual(buildStockSubmission('', '自分', '800', '300'), {});
assert.deepEqual(buildStockSubmission('1000', '', '800', '300'), {});
assert.deepEqual(buildStockSubmission('1000', '代1', '800', '300'),
  {stockStart:'1000', stockCard:'代1', stockEnd:'800', stockRecoverRaw:'300'});
assert.deepEqual(buildStockSubmission('0', '自分', '', ''),
  {stockStart:'0', stockCard:'自分', stockEnd:'0', stockRecoverRaw:''});
assert.deepEqual(buildStockSubmission('1000', '自分', '', '300', '400'),
  {stockStart:'1000', stockCard:'自分', stockEnd:'600', stockRecoverRaw:'300'});
assert.deepEqual(buildStockSubmission('1000', '自分', '', '300', ''),
  {stockStart:'1000', stockCard:'自分', stockEnd:'1000', stockRecoverRaw:'300'});
assert.deepEqual(buildStockSubmission('100', '自分', '', '', '200'),
  {stockStart:'100', stockCard:'自分', stockEnd:'', stockRecoverRaw:''});
assert.deepEqual(buildStockSubmission('1000', '自分', '800', '300', '400'),
  {stockStart:'1000', stockCard:'自分', stockEnd:'800', stockRecoverRaw:'300'});
assert.equal(calcStockLedgerDelta('1000', '800', '300'), 100);
assert.equal(calcStockLedgerDelta('1000', '', '300', '400'), -100);
assert.equal(calcStockLedgerDelta('1000', '', '300', ''), 300);
assert.equal(calcStockLedgerDelta('100', '', '', '200'), -200);
assert.equal(calcStockLedgerDelta('1000', '800', '300', '400'), 100);
assert.equal(calcStockLedgerDelta('', '800', '300'), null);
assert.equal(calcStockLedgerDelta('0', '', ''), 0);
assert.equal(stockConfirmationLine(buildStockSubmission('1000', '自分', '', '3300', '300'), '300'),
  '貯玉台帳 カード「自分」 +3,000玉');
assert.equal(stockConfirmationLine(buildStockSubmission('1000', '自分', '', '300', '400'), '400'),
  '貯玉台帳 カード「自分」 -100玉');
assert.equal(stockConfirmationLine({}, '400'), '');
assert.deepEqual(stockStartDecision('', false, null, 750), {value:'750', auto:true, warning:false});
assert.deepEqual(stockStartDecision('750', true, 750, 900), {value:'900', auto:true, warning:false});
assert.deepEqual(stockStartDecision('700', false, null, 750), {value:'700', auto:false, warning:true});
assert.deepEqual(stockStartDecision('750', false, null, 750), {value:'750', auto:false, warning:false});
console.log('PASS: ノリうち旧記録、送信データ互換、台帳増減と未入力');
