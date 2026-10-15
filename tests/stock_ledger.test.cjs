// 「台帳から」の残高探索の純関数のテスト
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = '// ==== 台帳の残高 純関数（ここから）';
const end = '// ==== 台帳の残高 純関数（ここまで）';
assert.ok(html.includes(start) && html.includes(end), '純関数マーカーが見つかる');
const code = html.slice(html.indexOf(start), html.indexOf(end));
const { findStockBalance } = new Function(`${code}\nreturn { findStockBalance };`)();

const balances = [
  { shop: 'A店', card: '自分', balance: 8400 },
  { shop: 'A店', card: '代1', balance: 0 },
  { shop: 'B店', card: '自分', balance: 1200 },
];

// 店×カードで探す
assert.deepEqual(findStockBalance(balances, 'A店', '自分'), { shop: 'A店', card: '自分', balance: 8400 });
assert.deepEqual(findStockBalance(balances, 'A店', '代1'), { shop: 'A店', card: '代1', balance: 0 });
assert.deepEqual(findStockBalance(balances, 'B店', '自分'), { shop: 'B店', card: '自分', balance: 1200 });
// 見つからない
assert.equal(findStockBalance(balances, 'A店', '代2'), null);
assert.equal(findStockBalance(balances, 'C店', '自分'), null);
// 店・カードが空、台帳が無い
assert.equal(findStockBalance(balances, '', '自分'), null);
assert.equal(findStockBalance(balances, 'A店', ''), null);
assert.equal(findStockBalance(null, 'A店', '自分'), null);
assert.equal(findStockBalance(undefined, 'A店', '自分'), null);
assert.equal(findStockBalance('x', 'A店', '自分'), null);
assert.equal(findStockBalance([], 'A店', '自分'), null);
// 壊れた行は無視する
assert.equal(findStockBalance([null, { shop: 'A店' }], 'A店', '自分'), null);

// --- 画面の作り ---
assert.ok(html.includes('id="stock-from-ledger-btn"'), '開始時貯玉の横に「台帳から」');
assert.ok(html.includes('onclick="fillStockFromLedger()"'));
assert.ok(html.includes('function fillStockFromLedger'));
assert.ok(html.includes('loadStockBalances(true).then(applyLedgerBalanceToStock)'), '手元に無ければ取り直す');
assert.ok(html.includes('S.stockStartAuto = true'));
assert.ok(html.includes('S.stockAutoValue = balance'));
assert.ok(html.includes('店と貯玉カードを選んでください'));
assert.ok(html.includes('この店・カードの台帳の残高がありません'));

console.log('PASS: 台帳の残高の探索と「台帳から」の作り');
