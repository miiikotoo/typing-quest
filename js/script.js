// 敵キャラ情報（弱い順に並んでいる）
const enemies = [
  { name: "スライム", maxHP: 20, attack: 10, timePerChar: 1.0 },
  { name: "ゴブリン", maxHP: 50, attack: 15, timePerChar: 0.8 },
  { name: "オーク", maxHP: 80, attack: 20, timePerChar: 0.5 },
  { name: "ドラゴン", maxHP: 120, attack: 30, timePerChar: 0.3 }
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
  // 長めの単語
  "extraordinary",
  "unbelievable",
  "incomprehensible",
  "unpredictable",
  "extraordinary",
  "uncontrollable",
  "unquestionable",
  "unforgettable",
  "unbelievable",
  "unimaginable",
  "The dragon roars fiercely",
  "The knight draws his sword",
  "The mage casts a powerful spell",
  "The goblin sneaks in the shadows",
  "The warrior charges into battle",
  "The archer aims for the target",
  "The healer restores the fallen",
  "The orc swings his axe",
  "The wizard conjures a fireball",
  "The rogue disappears into the night",
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
  document.getElementById("playerHP").textContent = `プレイヤーHP: ${playerHP} / ${maxPlayerHP}`;
  document.getElementById("enemyHP").textContent = `HP: ${enemyHP} / ${currentEnemy ? currentEnemy.maxHP : 0}`;
}

function updateEnemyDisplay() {
  if (currentEnemy) {
    document.getElementById("enemy").textContent = `${currentEnemy.name}`;
  } else {
    document.getElementById("enemy").textContent = "敵: なし";
  }
  document.getElementById("enemy").style.display = currentEnemy ? "block" : "none";
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
  const idx = Math.floor(Math.random() * words.length);
  return words[idx];
}

function startBattle(isNewBattle = false) {
  if (playerHP <= 0 || currentEnemyIndex >= enemies.length) {
    return;
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

  word = pickRandomWord();
  processedWord = word.toLowerCase().replace(/ /g, "");

  document.getElementById("question").style.display = "none";

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

  document.getElementById("question").style.display = "none";
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
        document.getElementById("question").style.display = "block";
        inputField.disabled = false;
        inputField.focus();
        startTimer();
      }
    }, 1000);
  } else {
    document.getElementById("question").style.display = "block";
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
  timerDisplay.style.display = "block";
  timerDisplay.textContent = `残り時間: ${timer}秒`;

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timer--;
    timerDisplay.textContent = `残り時間: ${timer}秒`;
    if (timer <= 0) {
      clearInterval(timerInterval);
      isTimeout = true; // タイムアウト発生
      finishTurn();
    }
  }, 1000);
}

function showDamage(text, isEnemy = false) {
  // isEnemy: true→被ダメージ(下), false→与ダメージ(上)
  const container = isEnemy
    ? document.getElementById("damageContainerEnemy")
    : document.getElementById("damageContainerPlayer");
  const div = document.createElement("div");
  div.className = `damage-popup ${isEnemy ? "damage-enemy" : "damage-player"}`;
  div.textContent = text;
  container.appendChild(div);

  // 一定時間後に自動削除
  setTimeout(() => {
    container.removeChild(div);
  }, 2000);
}

function finishTurn() {
  if (isTurnFinished) return;
  isTurnFinished = true;

  clearInterval(timerInterval);

  document.getElementById("timer").style.display = "none";
  document.getElementById("question").style.display = "none";

  const inputField = document.getElementById("input");
  inputField.disabled = true;

  const remaining = processedWord.length - currentIndex;
  if (remaining > 0) missCount += remaining;

  const damagePerChar = 2;
  let damageToEnemy = currentIndex * damagePerChar;

  if (isTimeout) {
    damageToEnemy = Math.floor(damageToEnemy * 0.5);
  }

  // 1. プレイヤーの攻撃ダメージ演出
  enemyHP -= damageToEnemy;
  if (enemyHP < 0) enemyHP = 0;
  updateHPDisplay();
  showDamage(`${damageToEnemy}`, false);

  // 2. 0.5秒後に敵の攻撃ダメージ演出
  setTimeout(() => {
    const accuracy = currentIndex / processedWord.length;
    const missRate = 1 - accuracy;

    let damageToPlayer = Math.floor(currentEnemy.attack * missRate);
    if (missCount > 0 && damageToPlayer < 3) {
      damageToPlayer = 3;
    }
    if (isTimeout) {
      const minTimeoutDamage = Math.floor(currentEnemy.attack * 0.5);
      damageToPlayer = Math.max(damageToPlayer, minTimeoutDamage);
    }

    playerHP -= damageToPlayer;
    if (playerHP < 0) playerHP = 0;
    updateHPDisplay();
    showDamage(`${damageToPlayer}`, true);

    // 3. さらに0.5秒後にresult表示
    setTimeout(() => {
      let message = `<p>ミスタイプ数: ${missCount}</p>`;

      // 結果判定
      if (enemyHP <= 0 && playerHP <= 0) {
        message += `<p>両者ともに倒れました…引き分けです。</p>`;
      } else if (enemyHP <= 0 && playerHP > 0) {
        message += `<p>敵を倒しました！</p>`;
        currentEnemyIndex++;

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
        message += `<p>あなたは倒れました…ゲームオーバーです。</p>`;
        document.getElementById("countdown").textContent = "";
      } else {
        // 両者生存 → 自動で次ターン
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
