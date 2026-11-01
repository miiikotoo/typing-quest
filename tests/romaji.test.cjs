// Run: node tests/romaji.test.cjs (no dependencies)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const wordElement = { innerHTML: '' };
const context = vm.createContext({ window: {}, document: { getElementById() { return wordElement; } }, Utils: { showMissEffect() {} } });
for (const file of ['systems/RomajiSystem.js', 'systems/UISystem.js', 'systems/BattleSystem.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'public/js', file), 'utf8'), context);
}
const romaji = vm.runInContext('new RomajiSystem()', context);
let checks = 0;
function complete(input, answer, lang = 'ja') {
  const result = romaji.matchInput(input, answer, lang);
  assert.equal(result.acceptedLength, input.length, `${input} -> ${answer}`);
  assert.equal(result.matchedLength, answer.length, `${input} -> ${answer}`);
  assert.equal(result.complete, true, `${input} -> ${answer}`);
  checks++;
}
for (const [input, answer] of [
  ['si', 'shi'], ['shi', 'si'], ['tu', 'tsu'], ['ti', 'chi'], ['hu', 'fu'], ['zi', 'ji'],
  ['sya', 'sha'], ['syu', 'shu'], ['syo', 'sho'], ['tya', 'cha'], ['cyu', 'chu'],
  ['tyo', 'cho'], ['zya', 'ja'], ['jyu', 'ju'], ['zyo', 'jo'],
  ['kilya', 'kya'], ['kixyu', 'kyu'], ['la', 'xa'], ['ltsu', 'xtsu'],
  ['shinnpi', 'shinpi'], ["shin'pi", 'shinpi'], ['shixnpi', 'shinpi'],
  ['kannna', 'kanna'], ['xtsuka', 'kka'], ['ssi', 'sshi'],
  ['ltusi', 'sshi'], ['simettakuuki', 'shimettakuuki'],
  ['himitu no tuuro', 'himitsunotsuuro'].map(s => s.replace(/ /g, '')),
  ["dragon'sroar.", "dragon'sroar."]
]) complete(input, answer);
for (const [input, answer] of [['syo', 'sha'], ['kyu', 'kya'], ['sipi', 'shinpi'], ['a', 'na'], ['sin', 'shin', 'en']]) {
  assert.equal(romaji.matchInput(input, answer, input === 'sin' ? 'en' : 'ja').complete, false);
  checks++;
}
// Every existing question remains typeable, including punctuation and unknown syllables.
const words = JSON.parse(fs.readFileSync(path.join(root, 'public/js/data/words.json'), 'utf8'));
for (const word of words.words_ja) complete(word.roma.replace(/ /g, ''), word.roma.replace(/ /g, ''));
for (const word of words.words) complete(word.toLowerCase().replace(/ /g, ''), word.toLowerCase().replace(/ /g, ''), 'en');

// Exercise the actual input handler: keep alternate prefixes, count only errors,
// support backspace, and finish exactly once with canonical damage progress.
function battle(answer, lang = 'ja') {
  const instance = vm.runInContext('new BattleSystem()', context);
  const state = { processedWord: answer, word: answer, langMode: lang, currentIndex: 0, missCount: 0, isTurnFinished: false };
  instance.init(state, null, romaji, { updateLiveFeedback() {} });
  let finishes = 0;
  instance.finishTurn = () => { finishes++; state.isTurnFinished = true; };
  const field = { value: '' };
  return { state, field, input(value) { field.value = value; instance.handleInput({ target: field }); }, get finishes() { return finishes; } };
}
let game = battle('shinjitsu');
for (const char of 'sinnzitu') game.input(game.field.value + char);
assert.equal(game.field.value, 'sinnzitu');
assert.equal(game.state.currentIndex, 9);
assert.equal(game.state.missCount, 0);
assert.equal(game.finishes, 1);
game.input('sinnzitu!');
assert.equal(game.finishes, 1);
checks++;
game = battle('shi');
game.input('s'); game.input('sx');
assert.equal(game.field.value, 's');
assert.equal(game.state.missCount, 1);
game.input('');
assert.equal(game.state.currentIndex, 0);
game.input('si');
assert.equal(game.finishes, 1);
assert.equal(game.state.missCount, 1);
checks++;
game = battle('fish', 'en');
game.input('f'); game.input('fi'); game.input('fis'); game.input('fisi');
assert.equal(game.field.value, 'fis');
assert.equal(game.finishes, 0);
assert.equal(game.state.missCount, 1);
game.input('fish');
assert.equal(game.finishes, 1);
checks++;
game = battle('shi');
game.input('six');
assert.equal(game.field.value, 'si');
assert.equal(game.finishes, 1);
assert.equal(game.state.missCount, 1);
checks++;
// Many ambiguous n sequences must not cause exponential pattern enumeration.
complete('nn'.repeat(100) + 'pi', 'n'.repeat(100) + 'pi');
// The displayed target follows accepted spelling, while damage uses the original.
for (const [answer, input, expected] of [
  ['kka', 'x', 'xtuka'], ['kka', 'xt', 'xtuka'], ['kka', 'xtu', 'xtuka'],
  ['kka', 'xtuka', 'xtuka'], ['shi', 'si', 'si'], ['si', 'sh', 'shi'],
  ['chi', 't', 'ti'], ['ti', 'ch', 'chi'], ['kya', 'kily', 'kilya'],
  ['shinpi', 'shinn', 'shinnpi'], ['kka', 'xts', 'xtsuka'],
  ['kka', 'xtux', 'xtuka'], ['kka', '', 'kka']
]) {
  const match = romaji.matchInput(input, answer);
  assert.equal(match.displayAnswer, expected, `${input} display for ${answer}`);
  assert.equal(romaji.getDisplayWord(answer, match, 'ja'), expected);
  checks++;
}
game = battle('kka');
game.input('xt');
assert.equal(game.state.inputDisplay.word, 'xtuka');
assert.equal(game.state.inputDisplay.currentIndex, 2);
game.input('x');
assert.equal(game.state.inputDisplay.currentIndex, 1);
game.input('');
assert.equal(game.state.inputDisplay.word, 'kka');
game.input('xtuka');
assert.equal(game.state.inputDisplay.word, 'xtuka');
assert.equal(game.state.inputDisplay.currentIndex, 5);
assert.equal(game.state.currentIndex, 3);
assert.equal(game.state.word, 'kka');
assert.equal(game.state.processedWord, 'kka');
assert.equal(game.state.missCount, 0);
const ui = vm.runInContext('new UISystem()', context);
ui.init(game.state, romaji);
ui.updateLiveFeedback();
assert.equal(wordElement.innerHTML.replace(/<[^>]*>/g, ''), 'xtuka');
assert.equal((wordElement.innerHTML.match(/class="correct"/g) || []).length, 5);
checks++;
const spaced = romaji.matchInput('sinn', 'shinpinohikari');
assert.equal(romaji.getDisplayWord('shinpi no hikari', spaced, 'ja'), 'sinnpi no hikari');
assert.equal(romaji.getDisplayWord('Fish', romaji.matchInput('fi', 'fish', 'en'), 'en'), 'Fish');
checks++;
console.log(`Passed ${checks} romaji and battle input checks.`);
