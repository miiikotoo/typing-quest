// RomajiSystem.js - ローマ字変換システム
class RomajiSystem {
  constructor() {
    // ローマ字変換テーブル（拡張版: 小文字・複数表記対応）
    this.kanaToRomajiMap = {
      'あ':'a','い':'i','う':'u','え':'e','お':'o',
      'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
      'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
      'た':'ta','ち':['chi','ti'],'つ':['tsu','tu'],'て':'te','と':'to',
      'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
      'は':'ha','ひ':'hi','ふ':['fu','hu'],'へ':'he','ほ':'ho',
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

    // ローマ字分割候補テーブル
    this.romaTable = [
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

  // 入力判定時に"tsu"→"tu"も許容（部分一致・複数表記対応に拡張・バックトラック型）
  isRomajiMatch(input, answer) {
    if (input === answer) return true;
    
    // answerをローマ字分割する再帰関数
    const splitRomaji = (str, pos = 0, path = []) => {
      if (pos === str.length) return [path];
      let results = [];
      for (const group of this.romaTable) {
        for (const roma of group) {
          if (str.startsWith(roma, pos)) {
            results = results.concat(splitRomaji(str, pos + roma.length, path.concat(roma)));
          }
        }
      }
      return results;
    };
    
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

  // processedInputがprocessedWordの先頭からどこまで一致しているか（ローマ字バリエーション考慮）
  getRomajiMatchLength(input, answer) {
    if (!input) return 0;
    
    let maxMatchLength = 0;
    
    for (let answerPos = 0; answerPos < answer.length; answerPos++) {
      for (const group of this.romaTable) {
        for (const roma of group) {
          if (answer.startsWith(roma, answerPos)) {
            for (const alternative of group) {
              if (input.startsWith(alternative)) {
                const matchLen = Math.min(alternative.length, input.length);
                if (input.substr(0, matchLen) === alternative.substr(0, matchLen)) {
                  const remainingInput = input.substr(alternative.length);
                  const remainingAnswer = answer.substr(answerPos + roma.length);
                  const remainingMatch = remainingInput.length > 0 ? 
                    this.getRomajiMatchLength(remainingInput, remainingAnswer) : 0;
                  
                  const totalMatch = roma.length + remainingMatch;
                  maxMatchLength = Math.max(maxMatchLength, totalMatch);
                  
                  if (alternative.length > input.length) {
                    maxMatchLength = Math.max(maxMatchLength, roma.length * (input.length / alternative.length));
                  }
                }
              }
            }
          }
        }
      }
      
      if (answerPos === 0) continue;
      else break;
    }
    
    if (maxMatchLength === 0) {
      for (let i = 0; i < input.length && i < answer.length; i++) {
        if (input[i] === answer[i]) maxMatchLength++;
        else break;
      }
    }
    
    return Math.floor(maxMatchLength);
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
