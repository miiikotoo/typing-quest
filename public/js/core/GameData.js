// GameData.js - データ読み込み・管理
class GameData {
  constructor() {
    this.enemies = [];
    this.words = [];
    this.words_ja = [];
  }

  async loadData() {
    try {
      const [enemiesRes, wordsRes] = await Promise.all([
        fetch('js/data/enemies.json'),
        fetch('js/data/words.json')
      ]);
      
      this.enemies = await enemiesRes.json();
      const wordsJson = await wordsRes.json();
      
      if (Array.isArray(wordsJson)) {
        this.words = wordsJson;
        this.words_ja = [];
      } else {
        this.words = wordsJson.words || [];
        // words_jaを { ja, roma } 形式に変換
        this.words_ja = (wordsJson.words_ja || []).map(w =>
          typeof w === "string" ? { ja: w, roma: window.romajiSystem.kanaToRomaji(w) } : w
        );
      }
      
      console.log('ゲームデータ読み込み完了');
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      throw error;
    }
  }

  pickRandomWord(selectedStage, langMode) {
    if (langMode === 'ja' && this.words_ja.length > 0) {
      let wordPool = this.words_ja;
      
      switch (selectedStage) {
        case "field":
          wordPool = wordPool.filter(w => w.roma.length <= 6 && !w.ja.includes(" "));
          break;
        case "cave":
          wordPool = wordPool.filter(w => w.roma.length >= 7 && w.roma.length <= 10 && !w.ja.includes(" "));
          break;
        case "castle":
          wordPool = wordPool.filter(w => (w.roma.length > 10 && !w.ja.includes(" ")) || w.ja.includes(" "));
          break;
        case "forest":
          wordPool = wordPool.filter(w => /魔法|森|伝説|冒険|杖|塔|鍵|扉|秘密|光|闇|自然|精霊|魔力|魔法陣|予言|導き|旅|不思議|謎|魔女|魔王|勇者|剣|城|森|扉|鍵/i.test(w.ja));
          break;
        case "magma":
          wordPool = wordPool.filter(w => /火|マグマ|溶岩|地底|ダンジョン|罠|熱|炎|燃|危険|最終|骨|闇|敵|力|不滅|蘇生|変身|達成|疑い|区別/i.test(w.ja));
          break;
      }
      
      if (wordPool.length === 0) wordPool = this.words_ja;
      const picked = wordPool[Math.floor(Math.random() * wordPool.length)];
      return { ja: picked.ja, roma: picked.roma };
    } else {
      let wordPool = this.words;
      
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
      }
      
      if (wordPool.length === 0) wordPool = this.words;
      return wordPool[Math.floor(Math.random() * wordPool.length)];
    }
  }
}

// グローバルに公開（main.jsで設定されるため、ここでは削除）
