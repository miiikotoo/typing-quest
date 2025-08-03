// --- 敵キャラ情報 ---
let enemies = [];

// --- ステージ情報 ---
const stages = {
  field: { name: "草原", start: 0, end: 4 },
  cave: { name: "洞窟", start: 4, end: 9 },
  forest: { name: "魔法の森", start: 0, end: 0 }, // 新ステージ1
  magma: { name: "マグマの地下ダンジョン", start: 0, end: 0 }, // 旧: tower → 新: magma
  castle: { name: "魔王の城", start: 9, end: enemies.length } // 魔王の城を最後に
};

// --- ゲーム状態 ---
let playerLevel = 1;
let playerExp = 0;
let nextExp = 20;
let maxPlayerHP = 30;
let playerATK = 1;
let playerHP = maxPlayerHP;
let enemyHP = 0;
let currentEnemy = null;
let currentEnemyIndex = 0;
let selectedStage = "field";
let stageEnemies = [];
let word = "";
let processedWord = "";
let timer = 10;
let timerInterval;
let countdownInterval;
let currentIndex = 0;
let missCount = 0;
let isTurnFinished = false;
let isTimeout = false;

// --- データ外部読み込み ---
let words = [];

async function loadGameData() {
  const [enemiesRes, wordsRes] = await Promise.all([
    fetch('js/enemies.json'),
    fetch('js/words.json')
  ]);
  enemies = await enemiesRes.json();
  words = await wordsRes.json();
}

// --- ユーティリティ ---
function isHalfWidth(str) {
  // 半角英数・記号のみ許可
  return /^[\x20-\x7E]*$/.test(str);
}

function getNonSpaceIndex(pos) {
  let count = 0;
  for (let i = 0; i <= pos; i++) if (word[i] !== " ") count++;
  return count - 1;
}

function getWordIndex(nonSpaceIdx) {
  let count = -1;
  for (let i = 0; i < word.length; i++) {
    if (word[i] !== " ") count++;
    if (count === nonSpaceIdx) return i;
  }
  return -1;
}

function pickRandomWord() {
  // ステージごとにお題の難易度を振り分け
  let wordPool = words;
  switch (selectedStage) {
    case "field":
      wordPool = words.filter(w => w.length <= 6 && !w.includes(" "));
      break;
    case "cave":
      wordPool = words.filter(w => w.length >= 7 && w.length <= 10 && !w.includes(" "));
      break;
    case "castle":
      wordPool = words.filter(w => (w.length > 10 && !w.includes(" ")) || w.includes(" "));
      break;
    case "forest":
      // 魔法の森: 魔法・自然・ファンタジー系ワード
      wordPool = words.filter(w => /magic|crystal|amulet|wind|element|sorcery|phantom|fortune|mystery|shelter|journey|forest|whisper|enchanted|circle|prophecy|wizard|staff|spellbook|stranger|guidance|passage|legendary|enchanted|tower|key|secret|door/i.test(w));
      break;
    case "magma":
      // マグマの地下ダンジョン: 火・熱・地底・危険・強敵系ワード
      wordPool = words.filter(w => /fire|magma|lava|underground|dungeon|trap|heat|flame|burn|danger|final|bone|dark|enemy|power|unbreakable|invincibility|resurrection|transformation|accomplishment|unquestionability|indistinguishable/i.test(w));
      break;
    default:
      wordPool = words;
  }
  if (wordPool.length === 0) wordPool = words;
  return wordPool[Math.floor(Math.random() * wordPool.length)];
}

// --- ステージ・敵管理 ---
function setStage(stageKey) {
  selectedStage = stageKey;
  let candidates = enemies.filter(e => {
    if (Array.isArray(e.stage)) {
      return e.stage.includes(stageKey);
    } else if (typeof e.stage === 'string') {
      return e.stage === stageKey;
    }
    return true;
  });
  if (stageKey === 'castle') {
    // 魔王の城は魔王のみ出現
    stageEnemies = candidates.filter(e => e.name === '魔王');
  } else {
    stageEnemies = candidates.length > 5 ? shuffleArray(candidates).slice(0, 5) : candidates;
  }
  currentEnemyIndex = 0;
  currentEnemy = null;
  // --- 背景画像切り替え ---
  const container = document.querySelector('.container');
  if (container) {
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
      default:
        bgPath = '';
    }
    if (bgPath) {
      container.style.backgroundImage = `url('${bgPath}')`;
    } else {
      container.style.backgroundImage = '';
    }
  }
}

// --- プレイヤーステータス ---
function gainExp(amount) {
  playerExp += amount;
  while (playerExp >= nextExp) {
    playerExp -= nextExp;
    playerLevel++;
    // レベルアップごとにHP・ATK上昇
    maxPlayerHP += 5;
    playerATK += 1;
    playerHP = maxPlayerHP; // レベルアップ時に全回復
    nextExp = Math.floor(nextExp * 1.3 + 10); // 必要経験値も増加
    addBattleLog(`<span class='levelup'>レベルが${playerLevel}に上がった！HPと攻撃力が上昇！</span>`);
    updateStatusDisplay();
    savePlayerStatus();
  }
  updateStatusDisplay();
  savePlayerStatus();
}

function updateStatusDisplay() {
  // #playerLevelLabelが存在すればレベル表記を更新
  const levelLabel = document.getElementById("playerLevelLabel");
  if (levelLabel) levelLabel.textContent = `Lv:${playerLevel}`;
  updateStageSelectPlayerStatus();
}

function updateStageSelectPlayerStatus() {
  // ステージ選択画面用のプレイヤーステータス表示を更新
  const lv = document.getElementById("playerLevelLabel_stage");
  if (lv) lv.textContent = `Lv:${playerLevel}`;
  const hp = document.getElementById("playerHP_stage");
  if (hp) hp.textContent = `HP: ${playerHP} / ${maxPlayerHP}`;
  const atk = document.getElementById("playerATK_stage");
  if (atk) atk.textContent = playerATK;
  const exp = document.getElementById("playerExp_stage");
  if (exp) exp.textContent = playerExp;
  const nextExpEl = document.getElementById("nextExp_stage");
  if (nextExpEl) nextExpEl.textContent = nextExp;
}

// --- バトルログ ---
function addBattleLog(message) {
  const logDiv = document.getElementById("battleLog");
  if (!logDiv) return;
  logDiv.innerHTML += message + "<br>";
  logDiv.scrollTop = logDiv.scrollHeight;
}

function logDamage(text, isEnemy = false) {
  if (isEnemy) {
    addBattleLog(`<span class='damage-label'>${currentEnemy.name}の攻撃</span> <span class='damage-value'>${text}</span>（タイプミス：${missCount}）`);
  } else {
    addBattleLog(`<span class='damage-label'>プレイヤーの攻撃</span> <span class='damage-value'>${text}</span>`);
  }
}

// --- UIフィードバック ---
function updateLiveFeedback() {
  let result = "";
  for (let i = 0; i < word.length; i++) {
    if (word[i] === " ") {
      result += `<span style="color:gray">${word[i]}</span>`;
    } else if (getNonSpaceIndex(i) < currentIndex) {
      result += `<span class="correct">${word[i]}</span>`;
    } else if (getNonSpaceIndex(i) === currentIndex) {
      result += `<span class="underline">${word[i]}</span>`;
    } else {
      result += `<span>${word[i]}</span>`;
    }
  }
  document.getElementById("word").innerHTML = result;
}

// --- バトル進行 ---
function startBattle(isNewBattle = false) {
  if (playerHP <= 0 || currentEnemyIndex >= stageEnemies.length) return;
  // バトル開始時に戻るボタンを非表示
  const backBtn = document.getElementById('backToStageBtn');
  if (backBtn) backBtn.style.display = 'none';
  // 新しいバトル（新しい敵）開始時のみバトルログをリセット
  if (isNewBattle) {
    const logDiv = document.getElementById("battleLog");
    if (logDiv) logDiv.innerHTML = "";
  }
  const startButton = document.getElementById("startBtn");
  if (startButton) {
    startButton.style.display = "none";
  }
  const nextBattleBtn = document.getElementById("nextBattleBtn");
  if (nextBattleBtn) {
    nextBattleBtn.style.display = "none";
  }
  // 新しい敵をセット（初回または前の敵を倒した場合）
  if (!currentEnemy || enemyHP <= 0) {
    currentEnemy = stageEnemies[currentEnemyIndex];
    enemyHP = currentEnemy.maxHP;
    updateEnemyDisplay();
  }
  currentIndex = 0;
  missCount = 0;
  isTurnFinished = false;
  // タイマー調整
  const minTime = 3, maxTime = 20, baseTimePerChar = currentEnemy.timePerChar || 1.0;
  timer = Math.min(maxTime, Math.max(minTime, Math.ceil(processedWord.length * baseTimePerChar)));
  updateHPDisplay();
  updateLiveFeedback();
  const inputField = document.getElementById("input");
  inputField.value = "";
  inputField.disabled = true;
  // document.getElementById("question").style.display = "none";
  document.getElementById("countdown").textContent = "";
  clearInterval(timerInterval);
  clearInterval(countdownInterval);
  // バトル開始時に注意文を非表示
  const inputNotice = document.getElementById("inputNotice");
  if (inputNotice) inputNotice.style.display = "none";
  if (isNewBattle) {
    let countdown = 3;
    document.getElementById("countdown").textContent = countdown;
    countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        document.getElementById("countdown").textContent = countdown;
      } else if (countdown === 0) {
        document.getElementById("countdown").textContent = "START!!";
      } else {
        clearInterval(countdownInterval);
        document.getElementById("countdown").textContent = "";
        // カウントダウン終了時にお題・タイマーを表示
        word = pickRandomWord();
        processedWord = word.toLowerCase().replace(/ /g, "");
        const minTime = 3, maxTime = 20, baseTimePerChar = currentEnemy.timePerChar || 1.0;
        timer = Math.min(maxTime, Math.max(minTime, Math.ceil(processedWord.length * baseTimePerChar)));
        updateLiveFeedback();
        inputField.disabled = false;
        inputField.focus();
        startTimer();
      }
    }, 1000);
  } else {
    // 通常ターン開始時もお題・タイマーを表示
    word = pickRandomWord();
    processedWord = word.toLowerCase().replace(/ /g, "");
    const minTime = 3, maxTime = 20, baseTimePerChar = currentEnemy.timePerChar || 1.0;
    timer = Math.min(maxTime, Math.max(minTime, Math.ceil(processedWord.length * baseTimePerChar)));
    updateLiveFeedback();
    inputField.disabled = false;
    inputField.focus();
    startTimer();
  }
  inputField.oninput = handleInput;
}

function handleInput(e) {
  if (isTurnFinished) return;
  const rawInput = e.target.value;
  const processedInput = rawInput.toLowerCase().replace(/ /g, "");
  if (processedInput.length < currentIndex) return;
  const expectedChar = processedWord[currentIndex];
  const typedChar = processedInput[currentIndex];
  if (typedChar === expectedChar) {
    currentIndex++;
  } else {
    missCount++;
    showMissEffect(); // ミスタイプ時にエフェクト表示
  }
  updateLiveFeedback();
  const maxDisplayIndex = getWordIndex(currentIndex - 1);
  e.target.value = maxDisplayIndex >= 0 ? word.slice(0, maxDisplayIndex + 1) : "";
  e.target.selectionStart = e.target.selectionEnd = e.target.value.length;
  if (currentIndex === processedWord.length) finishTurn();
}

// ミスタイプ時のエフェクト表示
function showMissEffect() {
  const container = document.querySelector('.container');
  if (!container) return;
  container.classList.remove('shake'); // 連続ミス時のため一度外す
  // 強制再描画でアニメーションをリセット
  void container.offsetWidth;
  container.classList.add('shake');
  setTimeout(() => {
    container.classList.remove('shake');
  }, 400);
}

// タイマー関連の処理
function startTimer() {
  isTimeout = false;
  const timerDisplay = document.getElementById("timer");
  if (timerDisplay) timerDisplay.textContent = `${timer}`;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer--;
    timerDisplay.textContent = `${timer}`;
    if (timer <= 0) {
      clearInterval(timerInterval);
      isTimeout = true;
      finishTurn();
    }
  }, 1000);
}

//ターン終了処理
function finishTurn() {
  if (isTurnFinished) return;
  isTurnFinished = true;
  clearInterval(timerInterval);
  // お題・タイマーの非表示（innerHTMLリセット方式→visibleクラスとdisplay:noneに戻す）
  const timerDiv = document.getElementById("timer");
  if (timerDiv) timerDiv.textContent = ""; // タイマーをリセット
  const questionDiv = document.getElementById("question");
  if (questionDiv) questionDiv.querySelector("#word").textContent = ""; // お題をリセット
  const inputField = document.getElementById("input");
  inputField.disabled = true;
  const remaining = processedWord.length - currentIndex;
  if (remaining > 0) missCount += remaining;
  // --- 攻撃力計算（残り秒数ボーナス付き） ---
  let baseDamage = currentIndex * playerATK * 0.5;
  let timeBonus = 1;
  let isCritical = false;
  if (!isTimeout) {
    const totalTime = Math.min(currentEnemy ? Math.ceil(processedWord.length * (currentEnemy.timePerChar || 1.0)) : 10, 20);
    const remainRatio = timer / totalTime;
    if (remainRatio >= 0.8) {
      timeBonus = 2.5; // 80%以上残しでクリティカル
      isCritical = true;
    } else if (remainRatio >= 0.5) {
      timeBonus = 1.5; // 50%以上で+50%
    }
  }
  let damageToEnemy = Math.floor(baseDamage * timeBonus);
  if (isTimeout) damageToEnemy = Math.floor(damageToEnemy * 0.5);
  enemyHP -= damageToEnemy;
  if (enemyHP < 0) enemyHP = 0;
  updateHPDisplay();
  if (isCritical) {
    logDamage(`<span class="critical">クリティカル！</span> ${damageToEnemy}`, false);
  } else {
    logDamage(`${damageToEnemy}`, false);
  }
  // 0.5秒後に敵の攻撃ダメージ演出
  setTimeout(() => {
    const accuracy = currentIndex / processedWord.length;
    const missRate = 1 - accuracy;
    // ミスタイプ数に応じて被ダメージをさらに強化
    // ダメージ = Math.floor(currentEnemy.attack * 0.2 * missCount)
    let damageToPlayer = Math.floor(currentEnemy.attack * 0.2 * missCount);
    if (isTimeout) {
      const minTimeoutDamage = Math.floor(currentEnemy.attack * 0.5);
      damageToPlayer = Math.max(damageToPlayer, minTimeoutDamage);
    }
    playerHP -= damageToPlayer;
    if (playerHP < 0) playerHP = 0;
    updateHPDisplay();
    logDamage(`${damageToPlayer}`, true); // 敵の攻撃をログに表示
    setTimeout(() => {
      // 結果判定
      if (enemyHP <= 0 && playerHP > 0) {
        addBattleLog(`${currentEnemy.name}を倒した！`);
        addBattleLog(`<span class='exp-gain'>経験値を${currentEnemy.exp}獲得！</span>`); // 経験値獲得ログを追加
        gainExp(currentEnemy.exp);
        savePlayerStatus(); // モンスター撃破時にセーブ
        currentEnemyIndex++;
        word = "";
        processedWord = "";
        // 魔王を倒した場合はエンディング画面へ
        if (currentEnemy.name === '魔王') {
          addBattleLog("魔王を倒した！");
          setTimeout(() => {
            showScreen('ending');
          }, 3000);
          return;
        }
        if (currentEnemyIndex >= stageEnemies.length) {
          addBattleLog("すべての敵を倒した！");
          document.getElementById("countdown").textContent = "";
          // ステージクリア時は次のバトルボタンを非表示
          const nextBtn = document.getElementById("nextBattleBtn");
          if (nextBtn) nextBtn.style.display = "none";
          // バトル終了時に戻るボタンを再表示
          const backBtn = document.getElementById('backToStageBtn');
          if (backBtn) backBtn.style.display = 'inline-block';
        } else {
          // 次のバトル開始ボタンを表示
          const nextBtn = document.getElementById("nextBattleBtn");
          if (nextBtn) {
            nextBtn.style.display = "inline-block";
          }
        }
      } else if (playerHP <= 0) {
        addBattleLog("あなたは力尽きた…");
        word = "";
        processedWord = "";
        document.getElementById("countdown").textContent = "";
        // バトル終了時に戻るボタンを再表示
        const backBtn = document.getElementById('backToStageBtn');
        if (backBtn) backBtn.style.display = 'inline-block';
      } else {
        // 両者生存 → 自動で次ターン
        addBattleLog("次のターンへ…");
        countdownInterval = setInterval(() => {
          clearInterval(countdownInterval);
          startBattle();
        }, 2000);
      }
    }, 500);
  }, 500); // 敵の攻撃を0.5秒遅らせる
}

// 配列シャッフル用ユーティリティ
function shuffleArray(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- 画面切り替え用 ---
function showScreen(screen) {
  document.getElementById('stageSelectScreen').style.display = (screen === 'stage') ? 'block' : 'none';
  document.getElementById('battleScreen').style.display = (screen === 'battle') ? 'block' : 'none';
  const ending = document.getElementById('endingScreen');
  if (ending) ending.style.display = (screen === 'ending') ? 'block' : 'none';
}

// --- ステータス保存・読込 ---
function savePlayerStatus() {
  const data = {
    playerLevel,
    playerExp,
    nextExp,
    maxPlayerHP,
    playerATK,
    playerHP
  };
  localStorage.setItem('typingQuestPlayerStatus', JSON.stringify(data));
}

function loadPlayerStatus() {
  const data = localStorage.getItem('typingQuestPlayerStatus');
  if (data) {
    try {
      const obj = JSON.parse(data);
      playerLevel = obj.playerLevel ?? 1;
      playerExp = obj.playerExp ?? 0;
      nextExp = obj.nextExp ?? 20;
      maxPlayerHP = obj.maxPlayerHP ?? 30;
      playerATK = obj.playerATK ?? 1;
      playerHP = obj.playerHP ?? maxPlayerHP;
    } catch (e) {}
  }
}

// --- ゲーム初期化 ---
window.addEventListener('DOMContentLoaded', async function () {
  loadPlayerStatus();
  await loadGameData();
  // 画面初期化: ステージ選択画面のみ表示
  showScreen('stage');
  // ステージ選択ボタンにイベント
  document.querySelectorAll('.stage-select-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      setStage(btn.dataset.stage);
      playerHP = maxPlayerHP;
      const logDiv = document.getElementById('battleLog');
      if (logDiv) logDiv.innerHTML = '';
      updateHPDisplay();
      updateEnemyDisplay();
      document.getElementById('startBtn').style.display = 'inline-block';
      document.getElementById('nextBattleBtn').style.display = 'none';
      updateStatusDisplay();
      showScreen('battle');
    });
  });
  // 戻るボタンでステージ選択画面に遷移
  const backBtn = document.getElementById('backToStageBtn');
  backBtn.onclick = function () {
    showScreen('stage');
    backBtn.style.display = 'inline-block'; // ステージ選択画面に戻ったら再表示
    // ステージ選択画面に戻るとき背景を初期画像に戻す
    const container = document.querySelector('.container');
    if (container) {
      container.style.backgroundImage = "url('img/bg01.jpg')";
    }
  };
  // エンディング画面の「タイトルへ」ボタン
  const endingBtn = document.getElementById('endingToTitleBtn');
  if (endingBtn) {
    endingBtn.onclick = function () {
      showScreen('stage');
      // 背景も初期化
      const container = document.querySelector('.container');
      if (container) container.style.backgroundImage = "url('img/bg01.jpg')";
    };
  }
  const inputField = document.getElementById("input");
  const startBtn = document.getElementById("startBtn");
  const inputNotice = document.getElementById("inputNotice");
  const zenkakuWarning = document.getElementById("zenkakuWarning");
  const stageSelect = document.getElementById("stageSelect");
  // 全角警告の表示（常時チェック）
  inputField.addEventListener("input", function () {
    if (isHalfWidth(inputField.value)) {
      zenkakuWarning.style.display = "none";
      // バトル前のみstartBtn活性化
      if (inputNotice.style.display !== "none") {
        startBtn.disabled = false;
      }
    } else {
      zenkakuWarning.style.display = "block";
      if (inputNotice.style.display !== "none") {
        startBtn.disabled = true;
      }
    }
  });
  // 初期状態でボタンを活性/非活性
  startBtn.disabled = false;
  // ステージ選択UIのイベント
  if (stageSelect) {
    stageSelect.addEventListener("change", function () {
      setStage(stageSelect.value);
      // ステージ変更時はHPやログなどリセット
      playerHP = maxPlayerHP;
      const logDiv = document.getElementById("battleLog");
      if (logDiv) logDiv.innerHTML = "";
      updateHPDisplay();
      updateEnemyDisplay();
      // ボタン再表示
      document.getElementById("startBtn").style.display = "inline-block";
      document.getElementById("nextBattleBtn").style.display = "none";
    });
    setStage(stageSelect.value); // 初期化
  }
  updateStatusDisplay();
});

// ダミー関数追加
function updateHPDisplay() {
  // プレイヤーHP表示
  const playerHPDiv = document.getElementById("playerHP");
  if (playerHPDiv) {
    playerHPDiv.textContent = `HP: ${playerHP} / ${maxPlayerHP}`;
  }
  // 敵HP表示
  const enemyHPDiv = document.getElementById("enemyHP");
  if (enemyHPDiv && currentEnemy) {
    enemyHPDiv.textContent = `HP: ${enemyHP} / ${currentEnemy.maxHP}`;
  } else if (enemyHPDiv) {
    enemyHPDiv.textContent = `HP: 0 / 0`;
  }
}

function updateEnemyDisplay() {
  // 敵の名前表示（パネル内）
  const enemyPanel = document.querySelector('.enemy-panel .status-title');
  if (enemyPanel && currentEnemy) {
    enemyPanel.textContent = `敵：${currentEnemy.name}`;
  } else if (enemyPanel) {
    enemyPanel.textContent = '敵';
  }
}
