// 敵キャラ情報（弱い順に並んでいる）
const enemies = [
  { name: "スライム", maxHP: 20, attack: 5, timePerChar: 1.0 },
  { name: "バット", maxHP: 28, attack: 8, timePerChar: 1.1 },
  { name: "スケルトン", maxHP: 35, attack: 10, timePerChar: 0.95 },
  { name: "スパイダー", maxHP: 40, attack: 13, timePerChar: 0.9 },
  { name: "ゴブリン", maxHP: 50, attack: 15, timePerChar: 0.8 },
  { name: "ウルフ", maxHP: 55, attack: 17, timePerChar: 0.85 },
  { name: "リザードマン", maxHP: 70, attack: 18, timePerChar: 0.7 },
  { name: "ミミック", maxHP: 65, attack: 22, timePerChar: 0.7 },
  { name: "オーク", maxHP: 80, attack: 20, timePerChar: 0.5 },
  { name: "ゴーレム", maxHP: 90, attack: 25, timePerChar: 0.6 },
  { name: "デーモン", maxHP: 100, attack: 28, timePerChar: 0.5 },
  { name: "グリフォン", maxHP: 110, attack: 27, timePerChar: 0.4 },
  { name: "ドラゴン", maxHP: 120, attack: 30, timePerChar: 0.3 },
  { name: "リッチ", maxHP: 130, attack: 35, timePerChar: 0.3 }
];

// お題候補（複数）
const words = [
  "fireball",
  "lightning",
  "heal",
  "thunder",
  "dragon",
  "goblin",
  "magic",
  "sword",
  "shield",
  "spell",
  "attack",
  "defend",
  "monster",
  "quest",
  "battle",
  "adventure",
  "warrior",
  "mage",
  "knight",
  "archer",
  "dungeon",
  "treasure",
  "potion",
  "enemy",
  "ally",
  "victory",
  "defeat",
  "strategy",
  "skill",
  "power",
  "strength",
  "agility",
  // 短い単語
  "ice",
  "wind",
  "dark",
  "trap",
  "key",
  "ring",
  "gold",
  "map",
  "trap",
  "bone",
  // 中程度の単語
  "phantom",
  "element",
  "fortune",
  "sorcery",
  "crystal",
  "monster",
  "amulet",
  "shelter",
  "journey",
  "mystery",
  // 長めの単語
  "invincibility",
  "transformation",
  "resurrection",
  "enlightenment",
  "reincarnation",
  "unbreakable",
  "unpredictability",
  "unquestionably",
  // 追加: 長めの単語
  "determination",
  "manifestation",
  "extraordinary",
  "misunderstanding",
  "transformationist",
  "responsibility",
  "accomplishment",
  "reincarnationist",
  "enlightenmental",
  "unquestionability",
  "indistinguishable",
  // 長めのフレーズ
  "The treasure chest was a trap",
  "A mysterious wind blows gently",
  "The ancient ruins hide many secrets",
  "The wizards staff glows in the dark",
  "The heros courage never falters",
  "A shadow moves behind the curtain",
  "The princess waits in the tower",
  "The final battle begins now",
  "The spellbook opens by itself",
  "The enemys power is overwhelming",
  // 追加: 長めのフレーズ
  "The ancient prophecy has been fulfilled",
  "A hidden passage opens behind the wall",
  "The legendary sword shines brightly",
  "The mysterious stranger offers guidance",
  "The castle gates slowly creak open",
  "The enchanted forest whispers secrets",
  "The hero stands at the crossroads",
  "The enemy army approaches the castle",
  "The magic circle glows with power",
  "The final key unlocks the secret door",
  "A sudden silence falls over the land",
];

const maxPlayerHP = 100;
let playerHP = maxPlayerHP;

let enemyHP = 0;
let currentEnemy = null;
let currentEnemyIndex = 0; // ★敵の進行管理用

let word = "";
let processedWord = ""; // スペース除外、小文字化した比較用お題

let timer = 10;
let timerInterval;
let countdownInterval;

let currentIndex = 0;
let missCount = 0;
let isTurnFinished = false;

const playerATK = 20;

let isFirstBattle = true;

let isTimeout = false; // 時間切れフラグ

function updateHPDisplay() {
  document.getElementById("playerHP").textContent = `HP: ${playerHP} / ${maxPlayerHP}`;
  document.getElementById("enemyHP").textContent = `HP: ${enemyHP} / ${currentEnemy ? currentEnemy.maxHP : 0}`;
}

function updateEnemyDisplay() {
  if (currentEnemy) {
    // ステータスパネルのタイトルを敵名に変更
    document.querySelector('.enemy-panel .status-title').textContent = currentEnemy.name;
  } else {
    document.querySelector('.enemy-panel .status-title').textContent = "敵";
  }
}

// バトルログにメッセージを追加
function addBattleLog(message) {
  const logDiv = document.getElementById("battleLog");
  if (!logDiv) return;
  logDiv.innerHTML += message + "<br>";
  logDiv.scrollTop = logDiv.scrollHeight;
}

// バトルログにダメージを表示
function logDamage(text, isEnemy = false) {
  if (isEnemy) {
    addBattleLog(`<span class='damage-label'>${currentEnemy.name}の攻撃</span> <span class='damage-value'>${text}</span>（タイプミス：${missCount}）`);
  } else {
    addBattleLog(`<span class='damage-label'>プレイヤーの攻撃</span> <span class='damage-value'>${text}</span>`);
  }
}

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

function getNonSpaceIndex(pos) {
  let count = 0;
  for (let i = 0; i <= pos; i++) {
    if (word[i] !== " ") count++;
  }
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
  let wordPool = words;
  if (currentEnemy) {
    const name = currentEnemy.name;
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
  }
  const idx = Math.floor(Math.random() * wordPool.length);
  return wordPool[idx];
}

function startBattle(isNewBattle = false) {
  if (playerHP <= 0 || currentEnemyIndex >= enemies.length) {
    return;
  }

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
    currentEnemy = enemies[currentEnemyIndex];
    enemyHP = currentEnemy.maxHP;
    updateEnemyDisplay();
  }

  document.getElementById("result").textContent = "";
  currentIndex = 0;
  missCount = 0;
  isTurnFinished = false;

  // タイマー調整
  const minTime = 3;
  const maxTime = 20;
  const baseTimePerChar = currentEnemy.timePerChar || 1.0;
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
        const minTime = 3;
        const maxTime = 20;
        const baseTimePerChar = currentEnemy.timePerChar || 1.0;
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
    const minTime = 3;
    const maxTime = 20;
    const baseTimePerChar = currentEnemy.timePerChar || 1.0;
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

  if (currentIndex === processedWord.length) {
    finishTurn();
  }
}

function startTimer() {
  isTimeout = false; // タイマー開始時にリセット

  const timerDisplay = document.getElementById("timer");
  if (timerDisplay) {
    timerDisplay.textContent = `${timer}`;
  }

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer--;
    timerDisplay.textContent = `${timer}`;
    if (timer <= 0) {
      clearInterval(timerInterval);
      isTimeout = true; // タイムアウト発生
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
  if (timerDiv) {
    timerDiv.textContent = ""; // タイマーをリセット
  }
  const questionDiv = document.getElementById("question");
  if (questionDiv) {
    questionDiv.querySelector("#word").textContent = ""; // お題をリセット
  }

  const inputField = document.getElementById("input");
  inputField.disabled = true;

  const remaining = processedWord.length - currentIndex;
  if (remaining > 0) missCount += remaining;

  const damagePerChar = 2;
  let damageToEnemy = currentIndex * damagePerChar;

  if (isTimeout) {
    damageToEnemy = Math.floor(damageToEnemy * 0.5);
  }

  enemyHP -= damageToEnemy;
  if (enemyHP < 0) enemyHP = 0;
  updateHPDisplay();
  logDamage(`${damageToEnemy}`, false); // プレイヤーの攻撃をログに表示

  // 0.5秒後に敵の攻撃ダメージ演出
  setTimeout(() => {
    const accuracy = currentIndex / processedWord.length;
    const missRate = 1 - accuracy;

    // ミスタイプ数に応じて被ダメージを大幅強化
    let damageToPlayer = Math.floor(currentEnemy.attack * missRate + missCount * 2);
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
      if (enemyHP <= 0 && playerHP <= 0) {
        addBattleLog("両者ともに倒れた！引き分け！");
        word = "";
        processedWord = "";
      } else if (enemyHP <= 0 && playerHP > 0) {
        addBattleLog(`${currentEnemy.name}を倒した！`);
        currentEnemyIndex++;
        word = "";
        processedWord = "";
        if (currentEnemyIndex >= enemies.length) {
          message += `<p>すべての敵を倒しました！あなたの勝利です！🎉</p>`;
          document.getElementById("countdown").textContent = "";
        } else {
          // 次のバトル開始ボタンを表示
          const nextBtn = document.getElementById("nextBattleBtn");
          if (nextBtn) {
            nextBtn.style.display = "inline-block";
          }
        }
      } else if (playerHP <= 0) {
        addBattleLog("あなたは倒れた…ゲームオーバー！");
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

// 半角英数チェック
function isHalfWidth(str) {
  // 半角英数・記号のみ許可
  return /^[\x20-\x7E]*$/.test(str);
}

window.addEventListener('DOMContentLoaded', function () {
  const inputField = document.getElementById("input");
  const startBtn = document.getElementById("startBtn");
  const inputNotice = document.getElementById("inputNotice");
  const zenkakuWarning = document.getElementById("zenkakuWarning");

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
});
