// --- 敵キャラ情報 ---
let enemies = [];

// --- ステージ情報 ---
const stages = {
  field: { name: "草原", start: 0, end: 4 },
  cave: { name: "洞窟", start: 4, end: 9 },
  castle: { name: "魔王の城", start: 9, end: enemies.length }
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
  // モンスターの強さに応じてお題の長さを調整
  if (!currentEnemy) return words[Math.floor(Math.random() * words.length)];
  const name = currentEnemy.name;
  let wordPool = words;
  if (["スライム", "バット", "スケルトン"].includes(name)) {
    // 短い単語のみ（6文字以下）
    wordPool = words.filter(w => w.length <= 6 && !w.includes(" "));
  } else if (["スパイダー", "ゴブリン", "ウルフ", "リザードマン", "ミミック"].includes(name)) {
    // 中程度の単語（7～10文字、スペースなし）
    wordPool = words.filter(w => w.length >= 7 && w.length <= 10 && !w.includes(" "));
  } else if (["オーク", "ゴーレム", "デーモン", "グリフォン"].includes(name)) {
    // 長めの単語（11文字以上、スペースなし）
    wordPool = words.filter(w => w.length > 10 && !w.includes(" "));
  } else if (["ドラゴン", "リッチ"].includes(name)) {
    // 長めのフレーズ（スペースを含むもの）
    wordPool = words.filter(w => w.includes(" "));
  }
  // 万一該当がなければ全体から出題
  if (wordPool.length === 0) wordPool = words;
  return wordPool[Math.floor(Math.random() * wordPool.length)];
}

// --- ステージ・敵管理 ---
function setStage(stageKey) {
  selectedStage = stageKey;
  // enemiesの各データにstageプロパティを持たせ、そのstageに該当する敵のみ抽出
  stageEnemies = enemies.filter(e => {
    if (Array.isArray(e.stage)) {
      return e.stage.includes(stageKey);
    } else if (typeof e.stage === 'string') {
      return e.stage === stageKey;
    }
    // 互換性のため、stage未指定なら全ステージで出現
    return true;
  });
  currentEnemyIndex = 0;
  currentEnemy = null;
}

function updateHPDisplay() {
  document.getElementById("playerHP").textContent = `HP: ${playerHP} / ${maxPlayerHP}`;
  document.getElementById("enemyHP").textContent = `HP: ${enemyHP} / ${currentEnemy ? currentEnemy.maxHP : 0}`;
}

function updateEnemyDisplay() {
  const title = document.querySelector('.enemy-panel .status-title');
  if (title) title.textContent = currentEnemy ? currentEnemy.name : "敵";
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
  }
  updateStatusDisplay();
}

function updateStatusDisplay() {
  // #playerLevelLabelが存在すればレベル表記を更新
  const levelLabel = document.getElementById("playerLevelLabel");
  if (levelLabel) levelLabel.textContent = `Lv:${playerLevel}`;
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
  document.getElementById("result").textContent = "";
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
  }
  updateLiveFeedback();
  const maxDisplayIndex = getWordIndex(currentIndex - 1);
  e.target.value = maxDisplayIndex >= 0 ? word.slice(0, maxDisplayIndex + 1) : "";
  e.target.selectionStart = e.target.selectionEnd = e.target.value.length;
  if (currentIndex === processedWord.length) finishTurn();
}

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
    let damageToPlayer = Math.floor(currentEnemy.attack * missRate + missCount * 3);
    if (isTimeout) {
      const minTimeoutDamage = Math.floor(currentEnemy.attack * 0.5);
      damageToPlayer = Math.max(damageToPlayer, minTimeoutDamage);
    }
    playerHP -= damageToPlayer;
    if (playerHP < 0) playerHP = 0;
    updateHPDisplay();
    logDamage(`${damageToPlayer}`, true); // 敵の攻撃をログに表示
    // さらに0.5秒後にresult表示
    setTimeout(() => {
      let message = ``;
      // 結果判定
      if (enemyHP <= 0 && playerHP > 0) {
        addBattleLog(`${currentEnemy.name}を倒した！`);
        addBattleLog(`<span class='exp-gain'>経験値を${currentEnemy.exp}獲得！</span>`); // 経験値獲得ログを追加
        gainExp(currentEnemy.exp);
        currentEnemyIndex++;
        word = "";
        processedWord = "";
        if (currentEnemyIndex >= stageEnemies.length) {
          addBattleLog("すべての敵を倒した！");
          document.getElementById("countdown").textContent = "";
          // ステージクリア時は次のバトルボタンを非表示
          const nextBtn = document.getElementById("nextBattleBtn");
          if (nextBtn) nextBtn.style.display = "none";
        } else {
          // 次のバトル開始ボタンを表示
          const nextBtn = document.getElementById("nextBattleBtn");
          if (nextBtn) {
            nextBtn.style.display = "inline-block";
          }
        }
      } else if (playerHP <= 0) {
        addBattleLog("あなたは力尽きた…ゲームオーバー！");
        word = "";
        processedWord = "";
        document.getElementById("countdown").textContent = "";
      } else {
        // 両者生存 → 自動で次ターン
        addBattleLog("次のターンへ…");
        countdownInterval = setInterval(() => {
          clearInterval(countdownInterval);
          startBattle();
        }, 2000);
      }
      document.getElementById("result").innerHTML = message;
    }, 500); // result表示をさらに0.5秒遅らせる
  }, 500); // 敵の攻撃を0.5秒遅らせる
}

// --- ゲーム初期化 ---
window.addEventListener('DOMContentLoaded', async function () {
  await loadGameData();
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
      document.getElementById("result").textContent = "";
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
