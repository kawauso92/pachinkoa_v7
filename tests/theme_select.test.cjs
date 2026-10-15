// 見た目（レース／計器盤）と書体（Michroma／Titillium）の選択の純関数のテスト
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const start = '// ==== 表示用の純関数（ここから）';
const end = '// ==== 表示用の純関数（ここまで）';
assert.ok(html.includes(start) && html.includes(end));
const code = html.slice(html.indexOf(start), html.indexOf(end));
const { parseThemeStyle, parseThemeFont, themeClasses } =
  new Function(`${code}\nreturn { parseThemeStyle, parseThemeFont, themeClasses };`)();

// --- 見た目の選択（初期はレース。不正・未設定はレース） ---
assert.equal(parseThemeStyle('race'), 'race');
assert.equal(parseThemeStyle('meter'), 'meter');
assert.equal(parseThemeStyle(undefined), 'race');
assert.equal(parseThemeStyle(null), 'race');
assert.equal(parseThemeStyle(''), 'race');
assert.equal(parseThemeStyle('unknown'), 'race');
assert.equal(parseThemeStyle('METER'), 'race', '大文字や別名は受け付けない');

// --- 書体の選択（初期は Michroma。不正・未設定は Michroma） ---
assert.equal(parseThemeFont('michroma'), 'michroma');
assert.equal(parseThemeFont('titillium'), 'titillium');
assert.equal(parseThemeFont(undefined), 'michroma');
assert.equal(parseThemeFont(null), 'michroma');
assert.equal(parseThemeFont(''), 'michroma');
assert.equal(parseThemeFont('saira'), 'michroma');

// --- <html> に付けるクラス ---
assert.deepEqual(themeClasses('race', 'michroma'), ['theme-race', 'font-michroma']);
assert.deepEqual(themeClasses('meter', 'titillium'), ['theme-meter', 'font-titillium']);
assert.deepEqual(themeClasses(undefined, undefined), ['theme-race', 'font-michroma']);
assert.deepEqual(themeClasses('meter', undefined), ['theme-meter', 'font-michroma']);

// --- 画面の初期クラスがレース・Michroma になっている ---
assert.ok(/<html[^>]*class="theme-race font-michroma"/.test(html), 'html の初期クラス');

// --- 設定に「見た目」「書体」「虹」の行がある ---
assert.ok(html.includes('id="theme-seg"'));
assert.ok(html.includes('id="font-seg"'));
assert.ok(html.includes('id="th-rainbow"'));

console.log('PASS: 見た目・書体の選択の読み書き純関数');
