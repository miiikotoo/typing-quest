// BattleSystem.js - バトルシステム
class BattleSystem {
  constructor() {
    this.gameState = null;
    this.gameData = null;
    this.romajiSystem = null;
    this.uiSystem = null;
  }

  init(gameState, gameData, romajiSystem, uiSystem) {
    this.gameState = gameState;
    this.gameData = gameData;
    this.romajiSystem = romajiSystem;
    this.uiSystem = uiSystem;
  }

  // バトル開始
  startBattle(isNewBattle = false) {
    if (this.gameState.playerHP <= 0 || this.gameState.stageEnemies.length === 0) return;
    
    // UI初期化
    this.uiSystem.showButtons({
      startBtn: false,
      backToStageBtn: false
    });
    
    // バトル状態リセット
    if (isNewBattle) {
      const logDiv = document.getElementById("battleLog");
      if (logDiv) logDiv.innerHTML = "";
      // 新バトル時は必ず新しい敵をセット
      this.gameState.currentEnemy = this.gameState.stageEnemies[Math.floor(Math.random() * this.gameState.stageEnemies.length)];
      this.gameState.enemyHP = this.gameState.currentEnemy.maxHP;
      this.uiSystem.updateEnemyDisplay();
    } else if (!this.gameState.currentEnemy || this.gameState.enemyHP <= 0) {
      this.gameState.currentEnemy = this.gameState.stageEnemies[Math.floor(Math.random() * this.gameState.stageEnemies.length)];
      this.gameState.enemyHP = this.gameState.currentEnemy.maxHP;
      this.uiSystem.updateEnemyDisplay();
    }

    this.gameState.resetBattleState();
    this.setupBattleTurn(isNewBattle);
  }

  // バトルターンセットアップ
  setupBattleTurn(isFirstTurn = false) {
    // タイマー調整
    const minTime = 3, maxTime = 20;
    const baseTimePerChar = this.gameState.currentEnemy.timePerChar || 1.0;
    let timeBaseLength = this.gameState.processedWord.length;
    
    if (this.gameState.langMode === 'ja' && window.currentJaWord) {
      timeBaseLength = this.gameState.word.length;
    }
    
    this.gameState.timer = Math.min(maxTime, Math.max(minTime, Math.ceil(timeBaseLength * baseTimePerChar)));
    
    this.uiSystem.updateHPDisplay();
    this.uiSystem.updateLiveFeedback();
    
    const inputField = this.uiSystem.setupInputField();
    this.uiSystem.hideNotice();
    
    // 初回ターンのみカウントダウン表示、それ以外は即座に開始
    if (isFirstTurn && this.gameState.word === "") {
      this.uiSystem.showCountdown(() => {
        this.setupWord();
        this.startInput();
      });
    } else {
      if (this.gameState.word === "") {
        this.setupWord();
      }
      this.startInput();
    }
  }

  // お題設定
  setupWord() {
    const picked = this.gameData.pickRandomWord(this.gameState.selectedStage, this.gameState.langMode);
    
    if (this.gameState.langMode === 'ja' && picked && typeof picked === 'object' && picked.ja && picked.roma) {
      this.gameState.word = picked.roma;
      this.gameState.processedWord = this.gameState.word.toLowerCase().replace(/ /g, "");
      window.currentJaWord = picked.ja; // 日本語表記も保持
    } else {
      this.gameState.word = typeof picked === 'string' ? picked : '';
      this.gameState.processedWord = this.gameState.word.toLowerCase().replace(/ /g, "");
      window.currentJaWord = null;
    }

    // タイマー再設定
    const minTime = 3, maxTime = 20;
    const baseTimePerChar = this.gameState.currentEnemy.timePerChar || 1.0;
    let timeBaseLength = this.gameState.processedWord.length;
    
    if (this.gameState.langMode === 'ja' && window.currentJaWord) {
      timeBaseLength = this.gameState.word.length;
    }
    
    this.gameState.timer = Math.min(maxTime, Math.max(minTime, Math.ceil(timeBaseLength * baseTimePerChar)));
  }

  // 入力開始
  startInput() {
    this.uiSystem.updateLiveFeedback();
    const inputField = this.uiSystem.enableInputField();
    this.uiSystem.startTimer();
    
    inputField.oninput = (e) => this.handleInput(e);
  }

  // 入力処理
  handleInput(e) {
    if (this.gameState.isTurnFinished) return;
    
    const rawInput = e.target.value;
    const processedInput = rawInput.toLowerCase().replace(/ /g, "");
    
    // 最大一致長を探索
    const matchLen = this.romajiSystem.getRomajiMatchLength(processedInput, this.gameState.processedWord);
    this.gameState.currentIndex = matchLen;
    
    if (processedInput.length > matchLen) {
      // ミスタイプ時
      this.gameState.missCount++;
      Utils.showMissEffect();
    }
    
    this.uiSystem.updateLiveFeedback();
    
    const maxDisplayIndex = this.romajiSystem.getWordIndex(this.gameState.currentIndex - 1, this.gameState.word);
    e.target.value = maxDisplayIndex >= 0 ? this.gameState.word.slice(0, maxDisplayIndex + 1) : "";
    e.target.selectionStart = e.target.selectionEnd = e.target.value.length;
    
    if (this.gameState.currentIndex === this.gameState.processedWord.length) {
      this.finishTurn();
    }
  }

  // ターン終了処理
  finishTurn() {
    if (this.gameState.isTurnFinished) return;
    this.gameState.isTurnFinished = true;
    
    clearInterval(this.gameState.timerInterval);
    
    // UI更新
    const timerDiv = document.getElementById("timer");
    if (timerDiv) timerDiv.textContent = "";
    
    const questionDiv = document.getElementById("question");
    if (questionDiv) {
      const wordEl = questionDiv.querySelector("#word");
      if (wordEl) wordEl.textContent = "";
    }
    
    const inputField = document.getElementById("input");
    inputField.disabled = true;
    
    // ダメージ計算
    this.calculateDamage();
    
    // 結果判定（0.5秒後）
    setTimeout(() => {
      this.processEnemyAttack();
      setTimeout(() => {
        this.processBattleResult();
      }, 500);
    }, 500);
  }

  // ダメージ計算
  calculateDamage() {
    const remaining = this.gameState.processedWord.length - this.gameState.currentIndex;
    if (remaining > 0) this.gameState.missCount += remaining;
    
    // 攻撃力計算（残り秒数ボーナス付き）
    let baseDamage = this.gameState.currentIndex * this.gameState.playerATK * 0.5;
    let timeBonus = 1;
    let isCritical = false;
    
    if (!this.gameState.isTimeout) {
      const totalTime = Math.min(
        this.gameState.currentEnemy ? 
        Math.ceil(this.gameState.processedWord.length * (this.gameState.currentEnemy.timePerChar || 1.0)) : 10, 
        20
      );
      const remainRatio = this.gameState.timer / totalTime;
      
      if (remainRatio >= 0.8) {
        timeBonus = 2.5; // 80%以上残しでクリティカル
        isCritical = true;
      } else if (remainRatio >= 0.5) {
        timeBonus = 1.5; // 50%以上で+50%
      }
    }
    
    let damageToEnemy = Math.floor(baseDamage * timeBonus);
    if (this.gameState.isTimeout) damageToEnemy = Math.floor(damageToEnemy * 0.5);
    
    this.gameState.enemyHP -= damageToEnemy;
    if (this.gameState.enemyHP < 0) this.gameState.enemyHP = 0;
    
    this.uiSystem.updateHPDisplay();
    
    if (isCritical) {
      this.uiSystem.logDamage(`<span class="critical">クリティカル！</span> ${damageToEnemy}`, false);
    } else {
      this.uiSystem.logDamage(`${damageToEnemy}`, false);
    }
  }

  // 敵の攻撃処理
  processEnemyAttack() {
    const accuracy = this.gameState.currentIndex / this.gameState.processedWord.length;
    const missRate = 1 - accuracy;
    
    // ミスタイプ数に応じて被ダメージを計算
    let damageToPlayer = Math.floor(this.gameState.currentEnemy.attack * 0.2 * this.gameState.missCount);
    
    if (this.gameState.isTimeout) {
      const minTimeoutDamage = Math.floor(this.gameState.currentEnemy.attack * 0.5);
      damageToPlayer = Math.max(damageToPlayer, minTimeoutDamage);
    }
    
    this.gameState.playerHP -= damageToPlayer;
    if (this.gameState.playerHP < 0) this.gameState.playerHP = 0;
    
    this.uiSystem.updateHPDisplay();
    this.uiSystem.logDamage(`${damageToPlayer}`, true);
  }

  // バトル結果処理
  processBattleResult() {
    if (this.gameState.enemyHP <= 0 && this.gameState.playerHP > 0) {
      // 勝利
      this.uiSystem.addBattleLog(`${this.gameState.currentEnemy.name}を倒した！`);
      this.uiSystem.addBattleLog(`<span class='exp-gain'>経験値を${this.gameState.currentEnemy.exp}獲得！</span>`);
      this.gameState.gainExp(this.gameState.currentEnemy.exp);
      
      if (this.gameState.selectedStage === 'castle' || this.gameState.selectedStage === 'secret') {
        // 魔王・裏ボス撃破
        this.handleSpecialBossDefeat();
      } else {
        // 通常ステージ
        this.handleNormalVictory();
      }
    } else if (this.gameState.playerHP <= 0) {
      // 敗北
      this.handleDefeat();
    } else {
      // 両者生存 → 次ターン
      this.handleContinueBattle();
    }
  }

  // 特殊ボス撃破処理
  handleSpecialBossDefeat() {
    this.gameState.word = "";
    this.gameState.processedWord = "";
    document.getElementById("countdown").textContent = "";
    
    this.uiSystem.showButtons({
      nextBattleBtn: false,
      backToStageBtn: true
    });
    
    if (this.gameState.currentEnemy.name === '魔王') {
      this.uiSystem.addBattleLog("魔王を倒した！");
      setTimeout(() => {
        Utils.showScreen('ending');
      }, 3000);
    }
  }

  // 通常勝利処理
  handleNormalVictory() {
    // 次の敵をランダム選出
    this.gameState.currentEnemy = this.gameState.stageEnemies[Math.floor(Math.random() * this.gameState.stageEnemies.length)];
    this.gameState.enemyHP = this.gameState.currentEnemy.maxHP;
    this.gameState.word = "";
    this.gameState.processedWord = "";
    document.getElementById("countdown").textContent = "";
    
    this.uiSystem.showButtons({
      nextBattleBtn: true,
      backToStageBtn: true
    });
  }

  // 敗北処理
  handleDefeat() {
    this.uiSystem.addBattleLog("あなたは力尽きた…");
    this.gameState.word = "";
    this.gameState.processedWord = "";
    document.getElementById("countdown").textContent = "";
    
    this.uiSystem.showButtons({
      backToStageBtn: true
    });
  }

  // バトル継続処理
  handleContinueBattle() {
    this.uiSystem.addBattleLog("次のターンへ…");
    // 次のターンは即座に開始（カウントダウンなし）
    setTimeout(() => {
      this.startBattle(false); // 継続ターンなのでfalse
    }, 1000); // 短めの待機時間
  }
}

// グローバルに公開（main.jsで設定されるため、ここでは削除）
