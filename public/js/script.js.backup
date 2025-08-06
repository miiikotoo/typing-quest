// --- 敵キャラ情報 ---
let enemies = [];

// --- ステージ情報 ---
const stages = {
  field: { name: "草原", start: 0, end: 4 },
  cave: { name: "洞窟", start: 4, end: 9 },
  forest: { name: "魔法の森", start: 0, end: 0 },
  magma: { name: "地下神殿", start: 0, end: 0 },
  castle: { name: "魔王の城", start: 9, end: enemies.length },
  secret: { name: "裏ダンジョン", start: 0, end: 0 } // 隠しステージ
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
let words_ja = [];
let langMode = 'ja'; // 'ja' or 'en'

async function loadGameData() {
  const [enemiesRes, wordsRes] = await Promise.all([
    fetch('js/enemies.json'),
    fetch('js/words.json')
  ]);
  enemies = await enemiesRes.json();
  const wordsJson = await wordsRes.json();
  if (Array.isArray(wordsJson)) {
    words = wordsJson;
    words_ja = [];
  } else {
    words = wordsJson.words || [];
    // words_jaを { ja, roma } 形式に変換
    words_ja = (wordsJson.words_ja || []).map(w =>
      typeof w === "string" ? { ja: w, roma: kanaToRomaji(w) } : w
    );
  }
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

// --- ローマ字変換テーブル（拡張版: 小文字・複数表記対応） ---
const kanaToRomajiMap = {
  'あ':'a','い':'i','う':'u','え':'e','お':'o',
  'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
  'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
  'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
  'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
  'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
  'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
  'や':'ya','ゆ':'yu','よ':'yo',
  'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
  'わ':'wa','を':'wo','ん':'n',
  'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
  'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
  'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do',
  'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
  'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po',
  // 拗音・小文字対応
  'きゃ':['kya','kilya'], 'きゅ':['kyu','kiyu'], 'きょ':['kyo','kiyo'],
  'しゃ':['sha','sya'], 'しゅ':['shu','syu'], 'しょ':['sho','syo'],
  'ちゃ':['cha','tya','cya'], 'ちゅ':['chu','tyu','cyu'], 'ちょ':['cho','tyo','cyo'],
  'にゃ':['nya'], 'にゅ':['nyu'], 'にょ':['nyo'],
  'ひゃ':['hya'], 'ひゅ':['hyu'], 'ひょ':['hyo'],
  'みゃ':['mya'], 'みゅ':['myu'], 'みょ':['myo'],
  'りゃ':['rya'], 'りゅ':['ryu'], 'りょ':['ryo'],
  'ぎゃ':['gya'], 'ぎゅ':['gyu'], 'ぎょ':['gyo'],
  'じゃ':['ja','jya','zya'], 'じゅ':['ju','jyu','zyu'], 'じょ':['jo','jyo','zyo'],
  'びゃ':['bya'], 'びゅ':['byu'], 'びょ':['byo'],
  'ぴゃ':['pya'], 'ぴゅ':['pyu'], 'ぴょ':['pyo'],
  // 小文字
  'ぁ':['xa','la'], 'ぃ':['xi','li'], 'ぅ':['xu','lu'], 'ぇ':['xe','le'], 'ぉ':['xo','lo'],
  'ゃ':['xya','lya'], 'ゅ':['xyu','lyu'], 'ょ':['xyo','lyo'],
  'っ':['xtsu','xtu','ltu','ltsu','っ'], // 促音
  'ゎ':['xwa','lwa'],
  'ー':'-', '　':' ', ' ':' '
};

function kanaToRomaji(str) {
  // 2文字→1文字の順で変換
  let result = '';
  for (let i = 0; i < str.length; i++) {
    // 2文字の拗音・小書き対応
    let two = str.slice(i, i+2);
    if (kanaToRomajiMap[two]) {
      let roma = kanaToRomajiMap[two];
      if (Array.isArray(roma)) roma = roma[0];
      result += roma;
      i++;
      continue;
    }
    // 促音「っ」→次の子音を重ねる
    if (str[i] === 'っ' && i+1 < str.length) {
      let next = str[i+1];
      let roma = kanaToRomajiMap[str[i+1]];
      if (roma) {
        let c = Array.isArray(roma) ? roma[0][0] : roma[0];
        result += c;
        continue;
      }
    }
    let roma = kanaToRomajiMap[str[i]];
    if (Array.isArray(roma)) {
      // つ/ツ/っ などは ["tsu","tu",...] で両方対応
      result += roma[0];
    } else if (str[i] === 'つ' || str[i] === 'ツ') {
      result += 'tsu'; // デフォルト
    } else {
      result += roma || str[i];
    }
  }
  // "tsu"→"tu"も許容するため、両方のパターンを返す
  // ただしゲームロジック側で判定する場合は、入力と比較時に"tsu"→"tu"置換も許容
  return result;
}

// 入力判定時に"tsu"→"tu"も許容（部分一致・複数表記対応に拡張・バックトラック型）
function isRomajiMatch(input, answer) {
  if (input === answer) return true;
  // ローマ字分割候補テーブル
  const romaTable = [
    // 長い順に
    ["kya","kyu","kyo"],["sha","shu","sho","sya","syu","syo"],["cha","chu","cho","cya","cyu","cyo","tya","tyu","tyo"],
    ["nya","nyu","nyo"],["hya","hyu","hyo"],["mya","myu","myo"],["rya","ryu","ryo"],
    ["gya","gyu","gyo"],["ja","ju","jo","jya","jyu","jyo","zya","zyu","zyo"],
    ["bya","byu","byo"],["pya","pyu","pyo"],
    ["tsu","tu"],["shi","si"],["chi","ti"],["fu","hu"],["ji","zi"],
    ["nn","n"],
    // 1文字
    ["a"],["i"],["u"],["e"],["o"],["ka"],["ki"],["ku"],["ke"],["ko"],["sa"],["su"],["se"],["so"],["ta"],["te"],["to"],["na"],["ni"],["nu"],["ne"],["no"],["ha"],["hi"],["he"],["ho"],["ma"],["mi"],["mu"],["me"],["mo"],["ya"],["yu"],["yo"],["ra"],["ri"],["ru"],["re"],["ro"],["wa"],["wo"],["ga"],["gi"],["gu"],["ge"],["go"],["za"],["ji"],["zu"],["ze"],["zo"],["da"],["de"],["do"],["ba"],["bi"],["bu"],["be"],["bo"],["pa"],["pi"],["pu"],["pe"],["po"],["xa"],["xi"],["xu"],["xe"],["xo"],["xya"],["xyu"],["xyo"],["xwa"],["la"],["li"],["lu"],["le"],["lo"],["lya"],["lyu"],["lyo"],["lwa"],["xtsu"],["xtu"],["ltu"],["ltsu"]
  ];
  // answerをローマ字分割する再帰関数
  function splitRomaji(str, pos = 0, path = []) {
    if (pos === str.length) return [path];
    let results = [];
    for (const group of romaTable) {
      for (const roma of group) {
        if (str.startsWith(roma, pos)) {
          results = results.concat(splitRomaji(str, pos + roma.length, path.concat(roma)));
        }
      }
    }
    return results;
  }
  // inputがanswerの分割パターンの先頭から一致するか
  const patterns = splitRomaji(answer);
  for (const ptn of patterns) {
    let acc = '';
    for (let i = 0; i < ptn.length; i++) {
      acc += ptn[i];
      if (input.length === acc.length && input === acc) return true;
      // 途中一致も許容
      if (input.startsWith(acc)) {
        if (input.length <= acc.length) return true;
      }
    }
    // 1文字ずつ比較（従来の部分一致も残す）
    if (input === ptn.join('').slice(0, input.length)) return true;
  }
  // ん→n（nnでなくてもOK）: input, answerともnを全て除去して一致ならOK
  if (answer.includes('n')) {
    if (input.replace(/n/g, '') === answer.replace(/n/g, '').slice(0, input.length)) return true;
  }
  return false;
}

function pickRandomWord() {
  if (langMode === 'ja' && words_ja.length > 0) {
    let wordPool = words_ja;
    switch (selectedStage) {
      case "field":
        wordPool = wordPool.filter(w => w.ja.length <= 6 && !w.ja.includes(" "));
        break;
      case "cave":
        wordPool = wordPool.filter(w => w.ja.length >= 7 && w.ja.length <= 10 && !w.ja.includes(" "));
        break;
      case "castle":
        wordPool = wordPool.filter(w => (w.ja.length > 10 && !w.ja.includes(" ")) || w.ja.includes(" "));
        break;
      case "forest":
        wordPool = wordPool.filter(w => /魔法|森|伝説|冒険|杖|塔|鍵|扉|秘密|光|闇|自然|精霊|魔力|魔法陣|予言|導き|旅|不思議|謎|魔女|魔王|勇者|剣|城|森|扉|鍵/i.test(w.ja));
        break;
      case "magma":
        wordPool = wordPool.filter(w => /火|マグマ|溶岩|地底|ダンジョン|罠|熱|炎|燃|危険|最終|骨|闇|敵|力|不滅|蘇生|変身|達成|疑い|区別/i.test(w.ja));
        break;
      default:
        // そのまま
    }
    if (wordPool.length === 0) wordPool = words_ja;
    const picked = wordPool[Math.floor(Math.random() * wordPool.length)];
    // ja/roma両方返す
    return { ja: picked.ja, roma: picked.roma };
  } else {
    let wordPool = words;
    switch (selectedStage) {
      case "field":
        wordPool = wordPool.filter(w => w.length <= 6 && !w.includes(" "));
        break;
      case "cave":
        wordPool = wordPool.filter(w => w.length >= 7 && w.length <= 10 && !w.includes(" "));
        break;
      case "castle":
        wordPool = wordPool.filter(w => (w.length > 10 && !w.includes(" ")) || w.includes(" "));
        break;
      case "forest":
        wordPool = wordPool.filter(w => /magic|crystal|amulet|wind|element|sorcery|phantom|fortune|mystery|shelter|journey|forest|whisper|enchanted|circle|prophecy|wizard|staff|spellbook|stranger|guidance|passage|legendary|enchanted|tower|key|secret|door/i.test(w));
        break;
      case "magma":
        wordPool = wordPool.filter(w => /fire|magma|lava|underground|dungeon|trap|heat|flame|burn|danger|final|bone|dark|enemy|power|unbreakable|invincibility|resurrection|transformation|accomplishment|unquestionability|indistinguishable/i.test(w));
        break;
      default:
        // そのまま
    }
    if (wordPool.length === 0) wordPool = words;
    return wordPool[Math.floor(Math.random() * wordPool.length)];
  }
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
    stageEnemies = candidates.filter(e => e.name === '魔王');
  } else if (stageKey === 'secret') {
    stageEnemies = candidates.filter(e => e.stage === 'secret');
  } else {
    stageEnemies = candidates; // 無限ループ用に全候補を使う
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
  // 日本語モード時は日本語表記も表示
  if (langMode === 'ja' && window.currentJaWord) {
    result = `<span class='ja-word'>${window.currentJaWord}</span><br><span class='roma-word'>${result}</span>`;
  }
  document.getElementById("word").innerHTML = result;
}

// --- バトル進行 ---
function startBattle(isNewBattle = false) {
  if (playerHP <= 0 || stageEnemies.length === 0) return;
  // バトル開始時にバトル開始ボタンを必ず非表示
  const startButton = document.getElementById("startBtn");
  if (startButton) startButton.style.display = "none";
  // バトル開始時に戻るボタンを非表示
  const backBtn = document.getElementById('backToStageBtn');
  if (backBtn) backBtn.style.display = 'none';
  // 新しいバトル（新しい敵）開始時のみバトルログをリセット
  if (isNewBattle) {
    const logDiv = document.getElementById("battleLog");
    if (logDiv) logDiv.innerHTML = "";
    // 新バトル時は必ず新しい敵をセット
    currentEnemy = stageEnemies[Math.floor(Math.random() * stageEnemies.length)];
    enemyHP = currentEnemy.maxHP;
    updateEnemyDisplay();
  } else if (!currentEnemy || enemyHP <= 0) {
    currentEnemy = stageEnemies[Math.floor(Math.random() * stageEnemies.length)];
    enemyHP = currentEnemy.maxHP;
    updateEnemyDisplay();
  }
  currentIndex = 0;
  missCount = 0;
  isTurnFinished = false;
  // タイマー調整
  const minTime = 3, maxTime = 20, baseTimePerChar = currentEnemy.timePerChar || 1.0;
  let timeBaseLength = processedWord.length;
  if (langMode === 'ja' && window.currentJaWord) {
    // 日本語モード時はローマ字の長さで計算
    timeBaseLength = word.length;
  }
  timer = Math.min(maxTime, Math.max(minTime, Math.ceil(timeBaseLength * baseTimePerChar)));
  updateHPDisplay();
  updateLiveFeedback();
  const inputField = document.getElementById("input");
  inputField.value = "";
  inputField.disabled = true;
  document.getElementById("countdown").textContent = "";
  clearInterval(timerInterval);
  clearInterval(countdownInterval);
  // バトル開始時に注意文を非表示
  const inputNotice = document.getElementById("inputNotice");
  if (inputNotice) inputNotice.style.display = "none";
  if (isNewBattle) {
    let countdown = 3;
    document.getElementById("countdown").textContent = countdown;
    // カウントダウン中はお題・日本語表記を非表示
    document.getElementById("word").innerHTML = "";
    window.currentJaWord = null;
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
        let picked = pickRandomWord();
        if (langMode === 'ja' && picked && typeof picked === 'object' && picked.ja && picked.roma) {
          word = picked.roma;
          console.log(`Picked word: ${picked.ja} (${picked.roma})`);
          processedWord = word.toLowerCase().replace(/ /g, "");
          window.currentJaWord = picked.ja; // 日本語表記も保持
        } else {
          word = typeof picked === 'string' ? picked : '';
          processedWord = word.toLowerCase().replace(/ /g, "");
          window.currentJaWord = null;
        }
        // タイマー再設定
        let timeBaseLength2 = processedWord.length;
        if (langMode === 'ja' && window.currentJaWord) {
          timeBaseLength2 = word.length;
        }
        timer = Math.min(maxTime, Math.max(minTime, Math.ceil(timeBaseLength2 * baseTimePerChar)));
        updateLiveFeedback();
        inputField.disabled = false;
        inputField.focus();
        startTimer();
      }
    }, 1000);
  } else {
    // 通常ターン開始時もお題・タイマーを表示
    let picked = pickRandomWord();
    if (langMode === 'ja' && picked && typeof picked === 'object' && picked.ja && picked.roma) {
      word = picked.roma;
      processedWord = word.toLowerCase().replace(/ /g, "");
      window.currentJaWord = picked.ja;
    } else {
      word = typeof picked === 'string' ? picked : '';
      processedWord = word.toLowerCase().replace(/ /g, "");
      window.currentJaWord = null;
    }
    let timeBaseLength3 = processedWord.length;
    if (langMode === 'ja' && window.currentJaWord) {
      timeBaseLength3 = word.length;
    }
    timer = Math.min(maxTime, Math.max(minTime, Math.ceil(timeBaseLength3 * baseTimePerChar)));
    updateLiveFeedback();
    inputField.disabled = false;
    inputField.focus();
    startTimer();
  }
  inputField.oninput = handleInput;
}

// processedInputがprocessedWordの先頭からどこまで一致しているか（ローマ字バリエーション考慮）
function getRomajiMatchLength(input, answer) {
  if (!input) return 0;
  let len = 0;
  for (let i = 0; i < input.length && i < answer.length; i++) {
    if (input[i] === answer[i]) len++;
    else break;
  }
  return len;
}

function handleInput(e) {
  if (isTurnFinished) return;
  const rawInput = e.target.value;
  const processedInput = rawInput.toLowerCase().replace(/ /g, "");
  // 最大一致長を探索
  const matchLen = getRomajiMatchLength(processedInput, processedWord);
  currentIndex = matchLen;
  if (processedInput.length > matchLen) {
    // ミスタイプ時
    missCount++;
    showMissEffect();
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
        addBattleLog(`<span class='exp-gain'>経験値を${currentEnemy.exp}獲得！</span>`);
        gainExp(currentEnemy.exp);
        savePlayerStatus();
        // --- 無限ループ仕様: 次の敵をランダムで選ぶ ---
        if (selectedStage === 'castle' || selectedStage === 'secret') {
          // 魔王・裏ボスは1体のみ
          word = "";
          processedWord = "";
          document.getElementById("countdown").textContent = "";
          const nextBtn = document.getElementById("nextBattleBtn");
          if (nextBtn) nextBtn.style.display = "none";
          const backBtn = document.getElementById('backToStageBtn');
          if (backBtn) backBtn.style.display = 'inline-block';
          // 魔王・裏ボス撃破時はエンディング画面へ
          if (currentEnemy.name === '魔王') {
            addBattleLog("魔王を倒した！");
            setTimeout(() => {
              showScreen('ending');
            }, 3000);
          }
          return;
        }
        // 通常ステージ: 無限ループで次の敵をランダム選出
        currentEnemy = stageEnemies[Math.floor(Math.random() * stageEnemies.length)];
        enemyHP = currentEnemy.maxHP;
        word = "";
        processedWord = "";
        document.getElementById("countdown").textContent = "";
        // バトル終了時に「次のバトルを開始」ボタンを表示
        const nextBtn = document.getElementById("nextBattleBtn");
        if (nextBtn) nextBtn.style.display = "inline-block";
        const backBtn = document.getElementById('backToStageBtn');
        if (backBtn) backBtn.style.display = 'inline-block';
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
  // --- 隠しステージ解放用 ---
  let secretInput = '';
  document.addEventListener('keydown', function(e) {
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

  const nextBattleBtn = document.getElementById("nextBattleBtn");
  if (nextBattleBtn) {
    nextBattleBtn.onclick = function () {
      // 新たな敵でバトル再開
      startBattle(true);
      nextBattleBtn.style.display = "none";
    };
  }
  // 言語切替セレクトボックス
  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.value = langMode;
    langSelect.addEventListener('change', function () {
      langMode = langSelect.value;
    });
  }
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
    enemyPanel.textContent = `${currentEnemy.name}`;
  } else if (enemyPanel) {
    enemyPanel.textContent = '敵';
  }
}
