// utils.js - ユーティリティ関数
class Utils {
  static isHalfWidth(str) {
    // 半角英数・記号のみ許可
    return /^[\x20-\x7E]*$/.test(str);
  }

  static shuffleArray(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  static showScreen(screen) {
    document.getElementById('stageSelectScreen').style.display = (screen === 'stage') ? 'block' : 'none';
    document.getElementById('battleScreen').style.display = (screen === 'battle') ? 'block' : 'none';
    document.getElementById('debugScreen').style.display = (screen === 'debug') ? 'block' : 'none';
    const ending = document.getElementById('endingScreen');
    if (ending) ending.style.display = (screen === 'ending') ? 'block' : 'none';
  }

  static showMissEffect() {
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
}

// グローバルに公開
window.Utils = Utils;
