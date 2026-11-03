// Run: node tests/bgm.test.cjs (no dependencies)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const flush = require('node:timers/promises').setImmediate;
const context = vm.createContext({
  window: {}, console: { log() {}, warn() {} },
  document: { addEventListener() {}, getElementById() { return { innerHTML: '' }; } },
  localStorage: { getItem() { return null; }, setItem() {} }
});
for (const name of ['AudioSystem', 'BattleSystem']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/js/systems', name + '.js'), 'utf8'), context);
}
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function fixture() {
  const audio = vm.runInContext('new AudioSystem()', context);
  const loads = [];
  audio.preloadAudio = path => {
    const load = { path, ...deferred() };
    loads.push(load);
    return load.promise;
  };
  return { audio, loads };
}
function track(playPromise = Promise.resolve()) {
  return {
    plays: 0, pauses: 0, currentTime: 12,
    play() { this.plays++; return playPromise; },
    pause() { this.pauses++; }
  };
}
module.exports = (async () => {
  let checks = 0;
  // Loading requests must stay cancelled even if BGM is enabled again.
  for (const cancel of ['stop', 'off', 'off-on']) {
    const { audio, loads } = fixture();
    const pending = audio.playBGM('battle');
    if (cancel === 'stop') audio.stopBGM();
    else {
      audio.toggleBGM();
      if (cancel === 'off-on') audio.toggleBGM();
    }
    const oldTrack = track();
    loads[0].resolve(oldTrack);
    await pending;
    assert.equal(oldTrack.plays, 0, cancel);
    assert.equal(audio.currentBGM, null, cancel);
    checks++;
  }
  // Latest request wins regardless of network completion order, even for the same song.
  for (const reverse of [false, true]) {
    for (const nextName of ['battle', 'battleBoss']) {
      const { audio, loads } = fixture();
      const old = audio.playBGM('battle');
      const latest = audio.playBGM(nextName);
      const oldTrack = track(), newTrack = track();
      const finishOld = async () => { loads[0].resolve(oldTrack); await old; };
      const finishLatest = async () => { loads[1].resolve(newTrack); await latest; };
      if (reverse) { await finishLatest(); await finishOld(); }
      else { await finishOld(); await finishLatest(); }
      assert.equal(oldTrack.plays, 0);
      assert.equal(newTrack.plays, 1);
      assert.equal(audio.currentBGM, newTrack);
      audio.stopBGM();
      assert.equal(newTrack.pauses, 1);
      assert.equal(newTrack.currentTime, 0);
      checks++;
    }
  }
  // stopBGM must reach an Audio whose play() promise is still pending.
  for (const rejectPlay of [false, true]) {
    const { audio, loads } = fixture();
    const playing = deferred();
    const oldTrack = track(playing.promise);
    const old = audio.playBGM('battle');
    loads[0].resolve(oldTrack);
    await flush();
    assert.equal(audio.currentBGM, oldTrack);
    audio.stopBGM();
    assert.equal(oldTrack.pauses, 1);
    assert.equal(oldTrack.currentTime, 0);
    const latest = audio.playBGM('battleBoss');
    const newTrack = track();
    loads[1].resolve(newTrack);
    await latest;
    if (rejectPlay) playing.reject(new Error('Playback aborted'));
    else playing.resolve();
    await old;
    assert.equal(audio.currentBGM, newTrack);
    assert.equal(newTrack.pauses, 0);
    checks++;
  }
  // Playback rejection cleans up its own Audio; normal options still apply.
  {
    const { audio, loads } = fixture();
    const playing = deferred();
    const current = track(playing.promise);
    const pending = audio.playBGM('battle', { loop: false });
    audio.setBGMVolume(0.2);
    loads[0].resolve(current);
    await flush();
    assert.equal(current.volume, 0.2);
    assert.equal(current.loop, false);
    playing.reject(new Error('Playback failed'));
    await pending;
    assert.equal(audio.currentBGM, null);
    assert.equal(current.pauses, 1);
    checks++;
  }
  {
    const { audio, loads } = fixture();
    audio.toggleBGM();
    await audio.playBGM('battle');
    assert.equal(loads.length, 0);
    checks++;
  }
  // Route by the newly selected enemy, not the previous enemy or null.
  for (const [previousName, nextName, expected] of [
    [null, '魔王', 'boss'], ['スライム', '魔王', 'boss'],
    ['魔王', 'スライム', 'normal'], [null, '神', 'normal']
  ]) {
    const calls = [];
    context.window.audioSystem = {
      playBossBattleBGM() { calls.push('boss'); },
      playBattleBGM() { calls.push('normal'); }
    };
    const state = {
      playerHP: 30, stageEnemies: [{ name: nextName, maxHP: 20 }],
      currentEnemy: previousName ? { name: previousName } : null,
      resetBattleState() {}
    };
    const battle = vm.runInContext('new BattleSystem()', context);
    battle.init(state, null, null, { showButtons() {}, updateEnemyDisplay() {} });
    battle.setupBattleTurn = () => {};
    battle.startBattle(true);
    assert.equal(state.currentEnemy.name, nextName);
    assert.equal(state.enemyHP, 20);
    assert.deepEqual(calls, [expected]);
    battle.startBattle(false);
    assert.deepEqual(calls, [expected], 'Continuing a turn must not restart BGM');
    checks++;
  }
  console.log(`Passed ${checks} BGM cancellation, race, playback, and enemy-selection checks.`);
})();
