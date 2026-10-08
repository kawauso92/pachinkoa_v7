const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const elements = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    value:'', textContent:'', className:'', style:{}, attributes:{},
    classList:{toggle(){},add(){},remove(){}}, setAttribute(name, value){this.attributes[name] = value;},
    replaceChildren(){},
  });
  return elements.get(id);
}
let selected = {textContent:'自分'};
const context = vm.createContext({window:{addEventListener(){}},
  document:{getElementById:element, querySelector:() => selected, querySelectorAll:() => []},
  localStorage:{getItem:() => null}, console, setTimeout(){}, clearTimeout(){}});
vm.runInContext(script, context);
vm.runInContext('recalc = () => {}; save = () => {}; triggerRuikeiSync = () => {}', context);

vm.runInContext('toggleNoriuchi()', context);
assert.equal(vm.runInContext('S.noriuchi', context), true);
assert.equal(element('section-seisan').style.display, '');
assert.equal(element('nori-toggle').attributes['aria-pressed'], 'true');
selected = {textContent:'代1'};
vm.runInContext('setDefaultStockCard(false)', context);
assert.equal(element('in-stock-card').value, '代1');
vm.runInContext('S.stockCardManual = true', context);
element('in-stock-card').value = '友達';
selected = {textContent:'自分'};
vm.runInContext('setDefaultStockCard(false)', context);
assert.equal(element('in-stock-card').value, '友達');
vm.runInContext('toggleNoriuchi()', context);
assert.equal(vm.runInContext('S.noriuchi', context), false);
assert.equal(element('section-seisan').style.display, 'none');
vm.runInContext("S.shop = {name:'A'}; stockBalancesCache = [{shop:'A', card:'自分', balance:750}]; S.stockStartAuto = false", context);
element('in-stock-card').value = '自分';
element('in-stock-start').value = '';
vm.runInContext('applyStockBalance()', context);
assert.equal(element('in-stock-start').value, '750');
assert.equal(vm.runInContext('S.stockStartAuto', context), true);
element('in-stock-start').value = '700';
vm.runInContext('onStockInput(true)', context);
assert.equal(vm.runInContext('S.stockStartAuto', context), false);
assert.ok(element('stock-balance-note').textContent.includes('異なります'));
const chips = ['自分', '代1'].map(name => ({textContent:name, selected:false,
  classList:{toggle(_name, enabled){this.owner.selected = enabled}}}));
chips.forEach(chip => { chip.classList.owner = chip; });
context.document.querySelectorAll = () => chips;
context.document.querySelector = () => chips.find(chip => chip.selected) || null;
context.localStorage.getItem = key => key === 'pachinkoLog_v5' ? JSON.stringify({uchi:'ノリうち'}) : null;
vm.runInContext('updateRotationModeUI=()=>{}; renderRotSegments=()=>{}; updateInvestBallBadge=()=>{}; updateStockClampNote=()=>{}; getRuikeiData=()=>({rewardVersion:1}); updateHeader=()=>{}; updateTrialMode=()=>{}', context);
vm.runInContext('loadData()', context);
assert.equal(vm.runInContext('S.noriuchi', context), true);
assert.equal(chips[0].selected, true);
assert.equal(chips[1].selected, false);
assert.equal(element('in-stock-card').value, '自分');
const chipWrap = element('uchi-chips');
chipWrap.children = [];
chipWrap.appendChild = child => chipWrap.children.push(child);
element('stock-card-options').appendChild = () => {};
context.document.createElement = () => ({});
vm.runInContext("UCHI = [{name:'自分'}, {name:'代1'}]; buildUchiChips()", context);
assert.deepEqual(chipWrap.children.map(chip => chip.textContent), ['自分', '代1']);
console.log('PASS: ノリうち独立切替、打ち手カード既定、手入力保持');
