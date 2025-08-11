// main.js - メインの初期化とイベント処理
class TypingQuest {
  constructor() {
    // システムクラスのインスタンス化
    this.gameState = new GameState();
    this.gameData = new GameData();
    this.romajiSystem = new RomajiSystem();
    this.uiSystem = new UISystem();
    this.battleSystem = new BattleSystem();
    this.debugSystem = new DebugSystem();
    
    // 相互参照の設定
    this.uiSystem.init(this.gameState, this.romajiSystem);
    this.battleSystem.init(this.gameState, this.gameData, this.romajiSystem, this.uiSystem);
    this.debugSystem.init(this.gameData, this.romajiSystem);
    
    // グローバルアクセス用
    window.gameState = this.gameState;
    window.gameData = this.gameData;
    window.romajiSystem = this.romajiSystem;
    window.uiSystem = this.uiSystem;
    window.battleSystem = this.battleSystem;
    window.debugSystem = this.debugSystem;
  }

  async init() {
    console.log('ゲーム初期化開始');
    
    try {
      // データ読み込み
      await this.gameData.loadData();
      
      // セーブデータ読み込み
      this.gameState.load();
      this.gameState.updateStatusDisplay();
      
      // 画面初期化
      Utils.showScreen('stage');
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      console.log('ゲーム初期化完了');
    } catch (error) {
      console.error('ゲーム初期化エラー:', error);
    }
  }

  setupEventListeners() {
    // ステージ選択ボタンイベント
    this.setupStageSelectButtons();
    
    // 隠しステージ解放
    this.setupSecretStage();
    
    // 戻るボタン
    this.setupBackButton();
    
    // エンディング画面ボタン
    this.setupEndingButton();
    
    // 入力フィールドイベント
    this.setupInputField();
    
    // バトル関連ボタン
    this.setupBattleButtons();
    
    // 言語切り替え
    this.setupLanguageSelector();
  }

  setupStageSelectButtons() {
    document.querySelectorAll('.stage-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const stage = btn.dataset.stage;
        this.gameState.setStage(stage);
        this.gameState.playerHP = this.gameState.maxPlayerHP;
        
        // UI更新
        const logDiv = document.getElementById('battleLog');
        if (logDiv) logDiv.innerHTML = '';
        
        this.uiSystem.updateHPDisplay();
        this.uiSystem.updateEnemyDisplay();
        this.uiSystem.showButtons({
          startBtn: true,
          nextBattleBtn: false
        });
        
        this.gameState.updateStatusDisplay();
        Utils.showScreen('battle');
      });
    });
  }

  setupSecretStage() {
    let secretInput = '';
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('stageSelectScreen').style.display !== 'block') return;
      
      if (e.key.length === 1) {
        secretInput += e.key;
        if (secretInput.length > 20) secretInput = secretInput.slice(-20);
        
        if (secretInput.toLowerCase().includes('secretstage')) {
          const secretBtn = document.getElementById('secretStageBtn');
          if (secretBtn) secretBtn.style.display = 'inline-block';
        }
      } else if (e.key === 'Backspace') {
        secretInput = secretInput.slice(0, -1);
      }
    });
  }

  setupBackButton() {
    const backBtn = document.getElementById('backToStageBtn');
    if (backBtn) {
      backBtn.onclick = () => {
        Utils.showScreen('stage');
        backBtn.style.display = 'inline-block';
        
        // ステージ選択画面に戻るとき背景を初期画像に戻す
        const container = document.querySelector('.container');
        if (container) {
          container.style.backgroundImage = "url('img/bg01.jpg')";
        }
      };
    }
  }

  setupEndingButton() {
    const endingBtn = document.getElementById('endingToTitleBtn');
    if (endingBtn) {
      endingBtn.onclick = () => {
        Utils.showScreen('stage');
        // 背景も初期化
        const container = document.querySelector('.container');
        if (container) container.style.backgroundImage = "url('img/bg01.jpg')";
      };
    }
  }

  setupInputField() {
    const inputField = document.getElementById("input");
    const startBtn = document.getElementById("startBtn");
    const inputNotice = document.getElementById("inputNotice");
    const zenkakuWarning = document.getElementById("zenkakuWarning");
    
    if (!inputField) return;
    
    // 全角警告の表示（常時チェック）
    inputField.addEventListener("input", () => {
      if (Utils.isHalfWidth(inputField.value)) {
        if (zenkakuWarning) zenkakuWarning.style.display = "none";
        // バトル前のみstartBtn活性化
        if (inputNotice && inputNotice.style.display !== "none") {
          if (startBtn) startBtn.disabled = false;
        }
      } else {
        if (zenkakuWarning) zenkakuWarning.style.display = "block";
        if (inputNotice && inputNotice.style.display !== "none") {
          if (startBtn) startBtn.disabled = true;
        }
      }
    });
    
    // 初期状態でボタンを活性化
    if (startBtn) startBtn.disabled = false;
  }

  setupBattleButtons() {
    // バトル開始ボタン
    const startBtn = document.getElementById("startBtn");
    if (startBtn) {
      startBtn.onclick = () => {
        this.battleSystem.startBattle(true);
      };
    }
    
    // 次のバトルボタン
    const nextBattleBtn = document.getElementById("nextBattleBtn");
    if (nextBattleBtn) {
      nextBattleBtn.onclick = () => {
        this.battleSystem.startBattle(true);
        nextBattleBtn.style.display = "none";
      };
    }
  }

  setupLanguageSelector() {
    const langToggleBtn = document.getElementById('langToggleBtn');
    if (langToggleBtn) {
      // 初期状態を設定
      langToggleBtn.setAttribute('data-lang', this.gameState.langMode);
      
      // クリックイベントでトグル
      langToggleBtn.addEventListener('click', () => {
        const currentLang = langToggleBtn.getAttribute('data-lang');
        const newLang = currentLang === 'ja' ? 'en' : 'ja';
        
        // UI更新
        langToggleBtn.setAttribute('data-lang', newLang);
        
        // ゲーム状態更新
        this.gameState.langMode = newLang;
        console.log(`言語モードを${this.gameState.langMode}に変更`);
      });
    }
  }

  // レガシーサポート用の古いステージ選択
  setupLegacyStageSelect() {
    const stageSelect = document.getElementById("stageSelect");
    if (stageSelect) {
      stageSelect.addEventListener("change", () => {
        this.gameState.setStage(stageSelect.value);
        // ステージ変更時はHPやログなどリセット
        this.gameState.playerHP = this.gameState.maxPlayerHP;
        const logDiv = document.getElementById("battleLog");
        if (logDiv) logDiv.innerHTML = "";
        
        this.uiSystem.updateHPDisplay();
        this.uiSystem.updateEnemyDisplay();
        this.uiSystem.showButtons({
          startBtn: true,
          nextBattleBtn: false
        });
      });
      this.gameState.setStage(stageSelect.value); // 初期化
    }
  }
}

// DOMContentLoaded時にゲーム初期化
document.addEventListener('DOMContentLoaded', async () => {
  const game = new TypingQuest();
  await game.init();
  
  // グローバルアクセス用
  window.typingQuest = game;
});
