// ブラウザーや通信を使わず、実際の送信入口から入力検証を確認する。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, {value:'', textContent:'', classList:{add(){},remove(){}}});
  return elements.get(id);
};
let alert = '', confirmation = '';
const context = vm.createContext({window:{addEventListener(){}},
  document:{getElementById:element, querySelector:() => null},
  localStorage:{getItem:() => null}, console});
vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
context.showAlert = message => { alert = message; };
context.showConfirm = message => { confirmation = message; };
vm.runInContext("S.shop = {name:'A', kokan:28}; S.kishu = {name:'試しうち'}; getRuikeiData = () => ({rewardVersion:1}); getSoKaiten = () => 0", context);
element('in-date').value = '2026-10-14';
element('in-stock-card').value = '自分';
async function send(start, end, balances) {
  alert = ''; confirmation = '';
  element('in-stock-start').value = start;
  element('in-stock-end').value = end;
  context.balances = balances;
  vm.runInContext('stockBalancesCache = balances', context);
  await vm.runInContext('doSend()', context);
}
(async () => {
  await send('700', '600', [{shop:'A', card:'自分', balance:750}]);
  assert.match(alert, /台帳残高/);
  assert.equal(confirmation, '');
  await send('', '600', []);
  assert.match(alert, /開始時貯玉/);
  assert.equal(confirmation, '');
  await send('7350', '7000', [{shop:'A', card:'自分', balance:-2000}]);
  assert.match(alert, /棚卸し/);
  assert.equal(confirmation, '');
  await send('7350', '7000', []);
  assert.equal(alert, '');
  assert.match(confirmation, /初回残高.*7,350/);
  await send('750', '600', [{shop:'A', card:'自分', balance:750}]);
  assert.equal(alert, '');
  assert.match(confirmation, /送信確認/);
  await send('', '', []);
  assert.equal(alert, '');
  assert.match(confirmation, /送信確認/);
  console.log('PASS: 送信入口の空欄・不一致・負残高検証と初回登録の確認表示');
})().catch(error => { console.error(error); process.exitCode = 1; });
