// UISystem.js - UI管理システム
class UISystem {
  constructor() {
    this.gameState = null;
    this.romajiSystem = null;
  }

  init(gameState, romajiSystem) {
    this.gameState = gameState;
    this.romajiSystem = romajiSystem;
  }

  // バトルログ管理
  addBattleLog(message) {
    const logDiv = document.getElementById("battleLog");
    if (!logDiv) return;
    logDiv.innerHTML += message + "<br>";
    logDiv.scrollTop = logDiv.scrollHeight;
  }

  logDamage(text, isEnemy = false) {
    if (isEnemy) {
      this.addBattleLog(`<span class='damage-label'>${this.gameState.currentEnemy.name}の攻撃</span> <span class='damage-value'>${text}</span>（タイプミス：${this.gameState.missCount}）`);
    } else {
      this.addBattleLog(`<span class='damage-label'>プレイヤーの攻撃</span> <span class='damage-value'>${text}</span>`);
    }
  }

  // HP表示更新
  updateHPDisplay() {
    // プレイヤーHP表示
    const playerHPDiv = document.getElementById("playerHP");
    if (playerHPDiv) {
      playerHPDiv.textContent = `HP: ${this.gameState.playerHP} / ${this.gameState.maxPlayerHP}`;
    }
    
    // 敵HP表示
    const enemyHPDiv = document.getElementById("enemyHP");
    if (enemyHPDiv && this.gameState.currentEnemy) {
      enemyHPDiv.textContent = `HP: ${this.gameState.enemyHP} / ${this.gameState.currentEnemy.maxHP}`;
    } else if (enemyHPDiv) {
      enemyHPDiv.textContent = `HP: 0 / 0`;
    }
  }

  // 敵表示更新
  updateEnemyDisplay() {
    // 敵の名前表示（パネル内）
    const enemyPanel = document.querySelector('.enemy-panel .status-title');
    if (enemyPanel && this.gameState.currentEnemy) {
      enemyPanel.textContent = `${this.gameState.currentEnemy.name}`;
    } else if (enemyPanel) {
      enemyPanel.textContent = '敵';
    }
  }

  // リアルタイムフィードバック更新
  updateLiveFeedback() {
    let result = "";
    const word = this.gameState.word;
    
    for (let i = 0; i < word.length; i++) {
      if (word[i] === " ") {
        result += `<span style="color:gray">${word[i]}</span>`;
      } else if (this.romajiSystem.getNonSpaceIndex(i, word) < this.gameState.currentIndex) {
        result += `<span class="correct">${word[i]}</span>`;
      } else if (this.romajiSystem.getNonSpaceIndex(i, word) === this.gameState.currentIndex) {
        result += `<span class="underline">${word[i]}</span>`;
      } else {
        result += `<span>${word[i]}</span>`;
      }
    }
    
    // 日本語モード時は日本語表記も表示
    if (this.gameState.langMode === 'ja' && window.currentJaWord) {
      result = `<span class='ja-word'>${window.currentJaWord}</span><br><span class='roma-word'>${result}</span>`;
    }
    
    document.getElementById("word").innerHTML = result;
  }

  // タイマー表示開始
  startTimer() {
    this.gameState.isTimeout = false;
    const timerDisplay = document.getElementById("timer");
    if (timerDisplay) timerDisplay.textContent = `${this.gameState.timer}`;
    
    clearInterval(this.gameState.timerInterval);
    this.gameState.timerInterval = setInterval(() => {
      this.gameState.timer--;
      timerDisplay.textContent = `${this.gameState.timer}`;
      if (this.gameState.timer <= 0) {
        clearInterval(this.gameState.timerInterval);
        this.gameState.isTimeout = true;
        window.battleSystem.finishTurn();
      }
    }, 1000);
  }

  // カウントダウン表示
  showCountdown(callback) {
    let countdown = 3;
    document.getElementById("countdown").textContent = countdown;
    // カウントダウン中はお題・日本語表記を非表示
    document.getElementById("word").innerHTML = "";
    window.currentJaWord = null;
    
    this.gameState.countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        document.getElementById("countdown").textContent = countdown;
      } else if (countdown === 0) {
        document.getElementById("countdown").textContent = "START!!";
      } else {
        clearInterval(this.gameState.countdownInterval);
        document.getElementById("countdown").textContent = "";
        callback();
      }
    }, 1000);
  }

  // 入力フィールドの設定
  setupInputField() {
    const inputField = document.getElementById("input");
    inputField.value = "";
    inputField.disabled = true;
    return inputField;
  }

  // 入力フィールドを有効化
  enableInputField() {
    const inputField = document.getElementById("input");
    inputField.disabled = false;
    inputField.focus();
    return inputField;
  }

  // ボタン表示制御
  showButtons(buttons) {
    Object.keys(buttons).forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = buttons[id] ? "inline-block" : "none";
    });
  }

  // UI要素の表示/非表示
  hideNotice() {
    const inputNotice = document.getElementById("inputNotice");
    if (inputNotice) inputNotice.style.display = "none";
  }

  // バトル終了時のUI処理
  handleBattleEnd(result) {
    const buttons = {
      startBtn: false,
      nextBattleBtn: result === 'victory',
      backToStageBtn: true
    };
    this.showButtons(buttons);
  }
}

// グローバルに公開（main.jsで設定されるため、ここでは削除）
