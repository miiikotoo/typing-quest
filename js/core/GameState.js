// GameState.js - ゲーム状態管理
class GameState {
  constructor() {
    // プレイヤー情報
    this.playerLevel = 1;
    this.playerExp = 0;
    this.nextExp = 20;
    this.maxPlayerHP = 30;
    this.playerATK = 1;
    this.playerHP = this.maxPlayerHP;
    
    // 敵・ステージ情報
    this.enemyHP = 0;
    this.currentEnemy = null;
    this.currentEnemyIndex = 0;
    this.selectedStage = "field";
    this.stageEnemies = [];
    
    // バトル情報
    this.word = "";
    this.processedWord = "";
    this.timer = 10;
    this.timerInterval = null;
    this.countdownInterval = null;
    this.currentIndex = 0;
    this.missCount = 0;
    this.isTurnFinished = false;
    this.isTimeout = false;
    
    // 設定
    this.langMode = 'ja'; // 'ja' or 'en'
  }

  // プレイヤーステータス管理
  gainExp(amount) {
    this.playerExp += amount;
    while (this.playerExp >= this.nextExp) {
      this.playerExp -= this.nextExp;
      this.playerLevel++;
      // レベルアップごとにHP・ATK上昇
      this.maxPlayerHP += 5;
      this.playerATK += 1;
      this.playerHP = this.maxPlayerHP; // レベルアップ時に全回復
      this.nextExp = Math.floor(this.nextExp * 1.3 + 10); // 必要経験値も増加
      window.uiSystem.addBattleLog(`<span class='levelup'>レベルが${this.playerLevel}に上がった！HPと攻撃力が上昇！</span>`);
      this.updateStatusDisplay();
      this.save();
    }
    this.updateStatusDisplay();
    this.save();
  }

  updateStatusDisplay() {
    // #playerLevelLabelが存在すればレベル表記を更新
    const levelLabel = document.getElementById("playerLevelLabel");
    if (levelLabel) levelLabel.textContent = `Lv:${this.playerLevel}`;
    this.updateStageSelectPlayerStatus();
  }

  updateStageSelectPlayerStatus() {
    // ステージ選択画面用のプレイヤーステータス表示を更新
    const lv = document.getElementById("playerLevelLabel_stage");
    if (lv) lv.textContent = `Lv:${this.playerLevel}`;
    const hp = document.getElementById("playerHP_stage");
    if (hp) hp.textContent = `HP: ${this.playerHP} / ${this.maxPlayerHP}`;
    const atk = document.getElementById("playerATK_stage");
    if (atk) atk.textContent = this.playerATK;
    const exp = document.getElementById("playerExp_stage");
    if (exp) exp.textContent = this.playerExp;
    const nextExpEl = document.getElementById("nextExp_stage");
    if (nextExpEl) nextExpEl.textContent = this.nextExp;
  }

  // セーブ・ロード
  save() {
    const data = {
      playerLevel: this.playerLevel,
      playerExp: this.playerExp,
      nextExp: this.nextExp,
      maxPlayerHP: this.maxPlayerHP,
      playerATK: this.playerATK,
      playerHP: this.playerHP
    };
    localStorage.setItem('typingQuestPlayerStatus', JSON.stringify(data));
  }

  load() {
    const data = localStorage.getItem('typingQuestPlayerStatus');
    if (data) {
      try {
        const obj = JSON.parse(data);
        this.playerLevel = obj.playerLevel ?? 1;
        this.playerExp = obj.playerExp ?? 0;
        this.nextExp = obj.nextExp ?? 20;
        this.maxPlayerHP = obj.maxPlayerHP ?? 30;
        this.playerATK = obj.playerATK ?? 1;
        this.playerHP = obj.playerHP ?? this.maxPlayerHP;
      } catch (e) {
        console.warn('セーブデータの読み込みに失敗しました:', e);
      }
    }
  }

  // ステージ管理
  setStage(stageKey) {
    this.selectedStage = stageKey;
    const enemies = window.gameData.enemies;
    
    let candidates = enemies.filter(e => {
      if (Array.isArray(e.stage)) {
        return e.stage.includes(stageKey);
      } else if (typeof e.stage === 'string') {
        return e.stage === stageKey;
      }
      return true;
    });
    
    if (stageKey === 'castle') {
      this.stageEnemies = candidates.filter(e => e.name === '魔王');
    } else if (stageKey === 'secret') {
      this.stageEnemies = candidates.filter(e => e.stage === 'secret');
    } else {
      this.stageEnemies = candidates; // 無限ループ用に全候補を使う
    }
    
    this.currentEnemyIndex = 0;
    this.currentEnemy = null;
    
    // 背景画像切り替え
    this.updateBackground(stageKey);
  }

  updateBackground(stageKey) {
    const container = document.querySelector('.container');
    if (!container) return;
    
    let bgPath = '';
    switch(stageKey) {
      case 'field':
        bgPath = 'img/bg-field.jpg'; break;
      case 'cave':
        bgPath = 'img/bg-cave.jpg'; break;
      case 'forest':
        bgPath = 'img/bg-forest.jpg'; break;
      case 'magma':
        bgPath = 'img/bg-magma.jpg'; break;
      case 'castle':
        bgPath = 'img/bg-castle.jpg'; break;
      case 'secret':
        bgPath = 'img/bg-secret.jpg'; break;
      default:
        bgPath = '';
    }
    
    if (bgPath) {
      container.style.backgroundImage = `url('${bgPath}')`;
    } else {
      container.style.backgroundImage = '';
    }
  }

  // バトル状態管理
  resetBattleState() {
    this.currentIndex = 0;
    this.missCount = 0;
    this.isTurnFinished = false;
    this.isTimeout = false;
    this.word = "";
    this.processedWord = "";
    clearInterval(this.timerInterval);
    clearInterval(this.countdownInterval);
  }
}

// グローバルに公開（main.jsで設定されるため、ここでは削除）
