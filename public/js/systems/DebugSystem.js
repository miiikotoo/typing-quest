class DebugSystem {
  constructor() {
    this.gameData = null;
    this.romajiSystem = null;
    this.currentText = "";
    this.processedText = "";
    this.currentIndex = 0;
    this.missCount = 0;
    this.startTime = null;
    this.endTime = null;
    this.isFinished = false;
    this.langMode = 'ja';
  }

  init(gameData, romajiSystem) {
    this.gameData = gameData;
    this.romajiSystem = romajiSystem;
    this.setupEventListeners();
    this.populateWordSelect();
  }

  setupEventListeners() {
    const debugBtn = document.getElementById('debugBtn');
    if (debugBtn) {
      debugBtn.replaceWith(debugBtn.cloneNode(true));
      const newDebugBtn = document.getElementById('debugBtn');
      newDebugBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Utils.showScreen('debug');
        this.showTextSelection();
        this.populateWordSelect();
      });
    }

    const langToggleBtn = document.getElementById('debugLangToggleBtn');
    if (langToggleBtn) {
      langToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentLang = langToggleBtn.getAttribute('data-lang');
        const newLang = currentLang === 'ja' ? 'en' : 'ja';
        langToggleBtn.setAttribute('data-lang', newLang);
        this.langMode = newLang;
        this.populateWordSelect();
      });
    }

    const startBtn = document.getElementById('debugStartBtn');
    if (startBtn) {
      startBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.startPractice();
      });
    }

    const resetBtn = document.getElementById('debugResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.resetPractice();
      });
    }

    const backBtn = document.getElementById('debugBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.showTextSelection();
      });
    }

    const backToStageBtn = document.getElementById('debugBackToStageBtn');
    if (backToStageBtn) {
      backToStageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Utils.showScreen('stage');
      });
    }
  }

  populateWordSelect() {
    const select = document.getElementById('debugWordSelect');
    if (!select || !this.gameData) {
      console.log('Select element or gameData not available');
      return;
    }

    select.innerHTML = '<option value="">選択してください</option>';

    if (this.langMode === 'ja' && this.gameData.words_ja) {
      this.gameData.words_ja.slice(0, 10).forEach((wordObj, index) => {
        const option = document.createElement('option');
        option.value = JSON.stringify(wordObj);
        option.textContent = `${wordObj.ja} (${wordObj.roma})`;
        select.appendChild(option);
      });
      console.log(`Populated ${Math.min(10, this.gameData.words_ja.length)} Japanese words`);
    } else if (this.gameData.words) {
      this.gameData.words.slice(0, 10).forEach((word, index) => {
        const option = document.createElement('option');
        option.value = word;
        option.textContent = word;
        select.appendChild(option);
      });
      console.log(`Populated ${Math.min(10, this.gameData.words.length)} English words`);
    }
  }

  startPractice() {
    const select = document.getElementById('debugWordSelect');
    const customText = document.getElementById('debugCustomText');
    
    let text = "";
    if (customText.value.trim()) {
      text = customText.value.trim();
      if (this.langMode === 'ja') {
        this.currentText = this.romajiSystem.kanaToRomaji(text);
        window.currentJaWord = text;
      } else {
        this.currentText = text;
        window.currentJaWord = null;
      }
    } else if (select.value) {
      if (this.langMode === 'ja') {
        const wordObj = JSON.parse(select.value);
        this.currentText = wordObj.roma;
        window.currentJaWord = wordObj.ja;
      } else {
        this.currentText = select.value;
        window.currentJaWord = null;
      }
    } else {
      alert('練習するテキストを選択または入力してください');
      return;
    }

    this.processedText = this.currentText.toLowerCase().replace(/ /g, "");
    this.currentIndex = 0;
    this.missCount = 0;
    this.startTime = Date.now();
    this.endTime = null;
    this.isFinished = false;

    this.showTypingArea();
    this.updateDisplay();
    this.setupInput();
  }

  showTextSelection() {
    document.getElementById('debugTypingArea').style.display = 'none';
    document.querySelector('.debug-text-selection').style.display = 'block';
  }

  showTypingArea() {
    document.querySelector('.debug-text-selection').style.display = 'none';
    document.getElementById('debugTypingArea').style.display = 'block';
  }

  setupInput() {
    const inputField = document.getElementById('debugInput');
    inputField.value = "";
    inputField.disabled = false;
    inputField.focus();
    
    inputField.oninput = (e) => this.handleInput(e);
  }

  handleInput(e) {
    if (this.isFinished) return;

    const rawInput = e.target.value;
    const processedInput = rawInput.toLowerCase().replace(/ /g, "");

    // 最大一致長を探索
    const matchLen = this.romajiSystem.getRomajiMatchLength(processedInput, this.processedText);
    this.currentIndex = matchLen;

    if (processedInput.length > matchLen) {
      // ミスタイプ時
      this.missCount++;
      Utils.showMissEffect();
    }

    this.updateDisplay();

    const maxDisplayIndex = this.romajiSystem.getWordIndex(this.currentIndex - 1, this.currentText);
    e.target.value = maxDisplayIndex >= 0 ? this.currentText.slice(0, maxDisplayIndex + 1) : "";
    e.target.selectionStart = e.target.selectionEnd = e.target.value.length;

    if (this.currentIndex === this.processedText.length) {
      this.finishPractice();
    }
  }

  updateDisplay() {
    let result = "";
    const word = this.currentText;
    
    for (let i = 0; i < word.length; i++) {
      if (word[i] === " ") {
        result += `<span style="color:gray">${word[i]}</span>`;
      } else if (this.romajiSystem.getNonSpaceIndex(i, word) < this.currentIndex) {
        result += `<span class="correct">${word[i]}</span>`;
      } else if (this.romajiSystem.getNonSpaceIndex(i, word) === this.currentIndex) {
        result += `<span class="underline">${word[i]}</span>`;
      } else {
        result += `<span>${word[i]}</span>`;
      }
    }
    
    // 日本語モード時は日本語表記も表示
    if (this.langMode === 'ja' && window.currentJaWord) {
      result = `<span class='ja-word'>${window.currentJaWord}</span><br><span class='roma-word'>${result}</span>`;
    }
    
    document.getElementById("debugWord").innerHTML = result;
  }

  finishPractice() {
    if (this.isFinished) return;
    this.isFinished = true;
    this.endTime = Date.now();

    const inputField = document.getElementById('debugInput');
    inputField.disabled = true;

    this.showResults();
  }

  showResults() {
    const totalTime = (this.endTime - this.startTime) / 1000;
    const accuracy = ((this.processedText.length - this.missCount) / this.processedText.length * 100).toFixed(1);
    const wpm = (this.processedText.length / totalTime * 60 / 5).toFixed(1); // 5文字を1単語として計算

    const resultsContent = document.getElementById('debugResultsContent');
    resultsContent.innerHTML = `
      <div style="margin-bottom: 10px;">完了時間: ${totalTime.toFixed(2)}秒</div>
      <div style="margin-bottom: 10px;">正確率: ${accuracy}%</div>
      <div style="margin-bottom: 10px;">WPM: ${wpm}</div>
      <div style="margin-bottom: 10px;">ミスタイプ数: ${this.missCount}</div>
      <div>文字数: ${this.processedText.length}</div>
    `;
  }

  resetPractice() {
    this.currentIndex = 0;
    this.missCount = 0;
    this.startTime = Date.now();
    this.endTime = null;
    this.isFinished = false;

    this.updateDisplay();
    this.setupInput();

    const resultsContent = document.getElementById('debugResultsContent');
    resultsContent.innerHTML = '';
  }
}

// グローバルに公開
window.DebugSystem = DebugSystem;
