// RomajiSystem.js - ローマ字変換システム
class RomajiSystem {
  constructor() {
    // ローマ字変換テーブル（拡張版: 小文字・複数表記対応）
    this.kanaToRomajiMap = {
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

    // 同じ音の表記だけをまとめる。異なる拗音（kya/kyu等）は別のトークン。
    this.variants = [
      ['shi', 'si'], ['chi', 'ti'], ['tsu', 'tu'], ['fu', 'hu'], ['ji', 'zi'],
      ['sha', 'sya', 'shya'], ['shu', 'syu', 'shyu'], ['sho', 'syo', 'shyo'],
      ['cha', 'tya', 'cya'], ['chu', 'tyu', 'cyu'], ['cho', 'tyo', 'cyo'],
      ['ja', 'jya', 'zya'], ['ju', 'jyu', 'zyu'], ['jo', 'jyo', 'zyo'],
      ['xa', 'la'], ['xi', 'li'], ['xu', 'lu'], ['xe', 'le'], ['xo', 'lo'],
      ['xya', 'lya'], ['xyu', 'lyu'], ['xyo', 'lyo'], ['xwa', 'lwa'],
      ['xtsu', 'xtu', 'ltu', 'ltsu']
    ];
    for (const consonant of ['k', 'n', 'h', 'm', 'r', 'g', 'b', 'p']) {
      for (const vowel of ['a', 'u', 'o']) {
        this.variants.push([
          consonant + 'y' + vowel,
          consonant + 'ixy' + vowel,
          consonant + 'ily' + vowel
        ]);
      }
    }
    this.variantEntries = this.variants.flatMap(options =>
      options.map(spelling => ({ spelling, options }))
    ).sort((a, b) => b.spelling.length - a.spelling.length);
    this.cachedKey = null;
    this.cachedTokens = [];
  }

  kanaToRomaji(str) {
    // 2文字→1文字の順で変換
    let result = '';
    for (let i = 0; i < str.length; i++) {
      // 2文字の拗音・小書き対応
      let two = str.slice(i, i+2);
      if (this.kanaToRomajiMap[two]) {
        let roma = this.kanaToRomajiMap[two];
        if (Array.isArray(roma)) roma = roma[0];
        result += roma;
        i++;
        continue;
      }
      // 促音「っ」→次の子音を重ねる
      if (str[i] === 'っ' && i+1 < str.length) {
        let next = str[i+1];
        let roma = this.kanaToRomajiMap[str[i+1]];
        if (roma) {
          let c = Array.isArray(roma) ? roma[0][0] : roma[0];
          result += c;
          continue;
        }
      }
      let roma = this.kanaToRomajiMap[str[i]];
      if (Array.isArray(roma)) {
        // つ/ツ/っ などは ["tsu","tu",...] で両方対応
        result += roma[0];
      } else if (str[i] === 'つ' || str[i] === 'ツ') {
        result += 'tsu'; // デフォルト
      } else {
        result += roma || str[i];
      }
    }
    return result;
  }

  // お題をトークン化し、表記の組み合わせを全列挙せず入力候補を追跡する。
  tokenize(answer, langMode) {
    const key = langMode + ':' + answer;
    if (this.cachedKey === key) return this.cachedTokens;
    const tokens = [];
    for (let pos = 0; pos < answer.length;) {
      let spelling = answer[pos];
      let options = [spelling];
      if (langMode === 'ja') {
        const entry = this.variantEntries.find(item => answer.startsWith(item.spelling, pos));
        if (entry) {
          spelling = entry.spelling;
          options = entry.options;
        } else if (spelling === 'n' && (!answer[pos + 1] || !/[aiueoy]/.test(answer[pos + 1]))) {
          // na/nya等の子音nは省略・置換しない。
          options = ['n', 'nn', "n'", 'xn'];
        } else if (/[bcdfghjklmpqrstvwxyz]/.test(spelling) && answer[pos + 1] === spelling) {
          options = [spelling, 'xtsu', 'xtu', 'ltu', 'ltsu'];
        }
      }
      tokens.push({ start: pos, end: pos + spelling.length, options });
      pos += spelling.length;
    }
    this.cachedKey = key;
    this.cachedTokens = tokens;
    return tokens;
  }

  matchInput(input, answer, langMode = 'ja') {
    const tokens = this.tokenize(answer, langMode);
    const expand = (index, path = []) => index === tokens.length
      ? [{ index, option: '', offset: 0, path }]
      : tokens[index].options.map(option => ({ index, option, offset: 0, path }));
    let states = expand(0);
    let acceptedLength = 0;
    for (const char of input) {
      const next = new Map();
      for (const state of states) {
        if (state.option[state.offset] !== char) continue;
        const offset = state.offset + 1;
        const candidates = offset === state.option.length
          ? expand(state.index + 1, [...state.path, state.option])
          : [{ ...state, offset }];
        for (const candidate of candidates) {
          next.set(candidate.index + ':' + candidate.option + ':' + candidate.offset, candidate);
        }
      }
      if (next.size === 0) break;
      states = [...next.values()];
      acceptedLength++;
    }
    // 入力文字数とお題の進捗を分離し、短い別表記でも同じダメージにする。
    const matchedLength = Math.max(...states.map(state => {
      if (state.index === tokens.length) return answer.length;
      const token = tokens[state.index];
      return token.start + Math.floor((token.end - token.start) * state.offset / state.option.length);
    }));
    // 元の表記を優先し、入力により候補が絞られたらその表記を表示する。
    const preferred = [...states].sort((a, b) => {
      if (a.index !== b.index) return b.index - a.index;
      const original = tokens[a.index] && answer.slice(tokens[a.index].start, tokens[a.index].end);
      return Number(b.option === original) - Number(a.option === original)
        || a.option.length - b.option.length;
    })[0];
    const displayTokens = [...preferred.path];
    if (preferred.index < tokens.length) displayTokens.push(preferred.option);
    for (let i = displayTokens.length; i < tokens.length; i++) {
      displayTokens.push(answer.slice(tokens[i].start, tokens[i].end));
    }
    return {
      acceptedLength,
      matchedLength,
      displayTokens,
      displayAnswer: displayTokens.join(''),
      complete: acceptedLength === input.length && states.some(state => state.index === tokens.length)
    };
  }

  // 空白を元のお題の位置に残しつつ、選択された表記で表示を構築する。
  getDisplayWord(word, match, langMode) {
    if (langMode !== 'ja') return word;
    const answer = word.toLowerCase().replace(/ /g, '');
    const tokens = this.tokenize(answer, langMode);
    let result = '';
    let sourceIndex = 0;
    for (let i = 0; i < tokens.length; i++) {
      const start = this.getWordIndex(tokens[i].start, word);
      const end = this.getWordIndex(tokens[i].end - 1, word) + 1;
      result += word.slice(sourceIndex, start) + match.displayTokens[i];
      sourceIndex = end;
    }
    return result + word.slice(sourceIndex);
  }

  isRomajiMatch(input, answer) {
    return this.matchInput(input, answer).acceptedLength === input.length;
  }

  getRomajiMatchLength(input, answer, langMode = 'ja') {
    return this.matchInput(input, answer, langMode).matchedLength;
  }

  // 単語内の位置計算ヘルパー
  getNonSpaceIndex(pos, word) {
    let count = 0;
    for (let i = 0; i <= pos; i++) if (word[i] !== " ") count++;
    return count - 1;
  }

  getWordIndex(nonSpaceIdx, word) {
    let count = -1;
    for (let i = 0; i < word.length; i++) {
      if (word[i] !== " ") count++;
      if (count === nonSpaceIdx) return i;
    }
    return -1;
  }
}

// グローバルに公開（main.jsで設定されるため、ここでは削除）
