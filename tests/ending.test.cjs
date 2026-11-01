// Run: node tests/ending.test.cjs (no dependencies)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, { style: {}, textContent: '' });
  return elements.get(id);
};
const pending = [];
const events = [];
const context = vm.createContext({
  window: { audioSystem: {
    playSE(name) { events.push(name); },
    stopBGM() { events.push('stopBGM'); }
  } },
  document: { getElementById: element },
  setTimeout(callback) { pending.push(callback); }
});
for (const file of ['utils/utils.js', 'systems/BattleSystem.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js', file), 'utf8'), context);
}
const utils = context.window.Utils;
const battle = vm.runInContext('new BattleSystem()', context);
const state = {
  selectedStage: 'castle', currentEnemy: { name: '魔王', exp: 99999 },
  enemyHP: 0, playerHP: 30, word: 'maou', processedWord: 'maou',
  gainExp(amount) { events.push(`exp:${amount}`); }
};
battle.init(state, null, null, { addBattleLog() {}, showButtons() {} });
utils.showScreen('battle');
battle.processBattleResult();
assert.equal(element('endingScreen').style.display, 'block');
assert.equal(element('battleScreen').style.display, 'none');
assert.equal(element('stageSelectScreen').style.display, 'none');
assert.deepEqual(events, ['enemyDefeat', 'exp:99999', 'stopBGM']);
assert.equal(state.word, '');
assert.equal(state.processedWord, '');
assert.equal(pending.length, 0, 'Boss victory must not schedule a later ending transition');
utils.showScreen('stage');
assert.equal(element('endingScreen').style.display, 'none');
assert.equal(element('stageSelectScreen').style.display, 'block');

// Secret boss victory must retain its battle-result screen.
state.selectedStage = 'secret';
state.currentEnemy = { name: '神', exp: 999999 };
utils.showScreen('battle');
battle.processBattleResult();
assert.equal(element('battleScreen').style.display, 'block');
assert.equal(element('endingScreen').style.display, 'none');
assert.equal(pending.length, 0);
console.log('Passed immediate boss ending, rewards/BGM, title return, and secret boss regression checks.');
