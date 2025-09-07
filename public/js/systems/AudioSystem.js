// AudioSystem.js - 音楽・効果音管理システム
class AudioSystem {
  constructor() {
    // BGMトラック
    this.bgmTracks = {
      battle: 'audio/bgm/battle.mp3',
      battleBoss: 'audio/bgm/battle_boss.mp3'
    };

    // 効果音
    this.seTracks = {
      attack: 'audio/se/attack.mp3',
      attackCritical: 'audio/se/attack_critical.mp3',
      damage: 'audio/se/damage.mp3',
      levelup: 'audio/se/levelup.mp3',
      enemyDefeat: 'audio/se/enemy_defeat.mp3',
      gameOver: 'audio/se/game_over.mp4'
    };

    // オーディオオブジェクト
    this.currentBGM = null;
    this.audioCache = new Map();
    
    // Web Audio API用のコンテキスト（共有）
    this.audioContext = null;
    
    // 設定
    this.bgmVolume = 0.5;
    this.seVolume = 0.5;
    this.isBGMEnabled = true;
    this.isSEEnabled = true;
    
    // ユーザーインタラクション検知
    this.hasUserInteracted = false;
    
    // タイピング音のスロットリング用
    this.lastTypeSoundTime = 0;
    this.typeSoundDelay = 20; // 20ms間隔で制限
    
    // 設定をローカルストレージから読み込み
    this.loadSettings();
    
    // ユーザーインタラクション検知の設定
    this.setupUserInteractionDetection();
  }

  // ユーザーインタラクション検知
  setupUserInteractionDetection() {
    const enableAudio = () => {
      this.hasUserInteracted = true;
      console.log('ユーザーインタラクション検知: 音声有効化');
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
    };
    
    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
  }

  // AudioContextの取得・初期化
  getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // AudioContextがsuspendedの場合は再開
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    return this.audioContext;
  }

  // 設定の保存・読み込み
  saveSettings() {
    const settings = {
      bgmVolume: this.bgmVolume,
      seVolume: this.seVolume,
      isBGMEnabled: this.isBGMEnabled,
      isSEEnabled: this.isSEEnabled
    };
    localStorage.setItem('typingQuestAudioSettings', JSON.stringify(settings));
  }

  loadSettings() {
    const saved = localStorage.getItem('typingQuestAudioSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.bgmVolume = settings.bgmVolume ?? 0.3;
        this.seVolume = settings.seVolume ?? 0.5;
        this.isBGMEnabled = settings.isBGMEnabled ?? true;
        this.isSEEnabled = settings.isSEEnabled ?? true;
      } catch (e) {
        console.warn('音楽設定の読み込みに失敗:', e);
      }
    }
  }

  // オーディオファイルの事前読み込み
  async preloadAudio(path) {
    if (this.audioCache.has(path)) {
      return this.audioCache.get(path);
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'auto';
      
      audio.addEventListener('canplaythrough', () => {
        this.audioCache.set(path, audio);
        resolve(audio);
      });
      
      audio.addEventListener('error', (e) => {
        console.warn(`音楽ファイルの読み込みに失敗: ${path}`, e);
        reject(e);
      });
      
      audio.src = path;
    });
  }

  // BGM再生
  async playBGM(trackName, options = {}) {
    if (!this.isBGMEnabled) return;
    
    const path = this.bgmTracks[trackName];
    if (!path) {
      console.warn(`BGMトラックが見つかりません: ${trackName}`);
      return;
    }

    try {
      // 現在のBGMを停止
      this.stopBGM();

      // 新しいBGMを読み込み・再生
      const audio = await this.preloadAudio(path);
      audio.volume = this.bgmVolume;
      audio.loop = options.loop !== false; // デフォルトはループ
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      this.currentBGM = audio;
      console.log(`BGM再生開始: ${trackName}`);
    } catch (error) {
      console.warn(`BGM再生エラー: ${trackName}`, error);
    }
  }

  // BGM停止
  stopBGM() {
    if (this.currentBGM) {
      this.currentBGM.pause();
      this.currentBGM.currentTime = 0;
      this.currentBGM = null;
    }
  }

  // BGM一時停止・再開
  pauseBGM() {
    if (this.currentBGM && !this.currentBGM.paused) {
      this.currentBGM.pause();
    }
  }

  resumeBGM() {
    if (this.currentBGM && this.currentBGM.paused) {
      this.currentBGM.play().catch(e => console.warn('BGM再開エラー:', e));
    }
  }

  // 効果音再生
  async playSE(trackName) {
    if (!this.isSEEnabled) return;
    
    if (!this.hasUserInteracted) {
      console.log('ユーザーインタラクション待機中: 効果音をスキップ');
      return;
    }
    
    // タイプ音は最初から合成音を使用
    if (trackName === 'typeCorrect' || trackName === 'typeError') {
      this.playTypingSynthSound(trackName);
      return;
    }
    
    const path = this.seTracks[trackName];
    if (!path) {
      console.warn(`効果音が見つかりません: ${trackName}`);
      return;
    }

    try {
      // 効果音は毎回新しいAudioオブジェクトを作成
      const seAudio = new Audio(path);
      seAudio.volume = this.seVolume;
      seAudio.preload = 'auto';
      
      const playPromise = seAudio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      console.log(`効果音再生: ${trackName}`);
    } catch (error) {
      console.warn(`効果音再生エラー: ${trackName}`, error);
      // ファイルが見つからない場合はダミー音を生成
      this.playDummySE(trackName);
    }
  }

  // タイピング専用合成音
  playTypingSynthSound(trackName) {
    if (!this.isSEEnabled || !this.hasUserInteracted) return;
    
    // スロットリング: 短時間の連続再生を制限
    const now = Date.now();
    if (now - this.lastTypeSoundTime < this.typeSoundDelay) {
      return;
    }
    this.lastTypeSoundTime = now;
    
    try {
      const audioContext = this.getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      let frequency, duration;
      
      if (trackName === 'typeCorrect') {
        // 正解音: 高めで短く、心地よい音
        frequency = 880;
        duration = 0.04;
        oscillator.type = 'sine';
      } else if (trackName === 'typeError') {
        // エラー音: 低めで少し長め、注意を促す音
        frequency = 220;
        duration = 0.08;
        oscillator.type = 'square';
      }
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(this.seVolume * 0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
      
      console.log(`タイピング合成音再生: ${trackName} (${frequency}Hz)`);
    } catch (error) {
      console.warn('タイピング合成音生成エラー:', error);
    }
  }

  // ダミー効果音生成（ファイルが存在しない場合）
  playDummySE(trackName) {
    if (!this.isSEEnabled || !this.hasUserInteracted) return;
    
    try {
      const audioContext = this.getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 効果音の種類に応じて音程と音色を変更
      let frequency = 440;
      let duration = 0.1;
      
      switch (trackName) {
        case 'attack':
          frequency = 600;
          duration = 0.15;
          break;
        case 'attackCritical':
          frequency = 1200;
          duration = 0.25;
          // クリティカル音は2回鳴らして特別感を演出
          setTimeout(() => {
            this.playDummySEInternal('attackCritical', 1400, 0.2);
          }, 100);
          break;
        case 'damage':
          frequency = 150;
          duration = 0.2;
          break;
        case 'levelup':
          frequency = 1000;
          duration = 0.3;
          break;
        case 'enemyDefeat':
          frequency = 500;
          duration = 0.4;
          break;
        case 'gameOver':
          frequency = 100;
          duration = 0.5;
          break;
      }
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(this.seVolume * 0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
      
      console.log(`ダミー効果音再生: ${trackName} (${frequency}Hz)`);
    } catch (error) {
      console.warn('ダミー効果音生成エラー:', error);
    }
  }

  // ダミー効果音生成内部メソッド（クリティカル音の連続再生用）
  playDummySEInternal(trackName, freq, dur) {
    if (!this.isSEEnabled || !this.hasUserInteracted) return;
    
    try {
      const audioContext = this.getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
      gainNode.gain.setValueAtTime(this.seVolume * 0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + dur);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + dur);
    } catch (error) {
      console.warn('ダミー効果音生成エラー:', error);
    }
  }

  // ボリューム調整
  setBGMVolume(volume) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.currentBGM) {
      this.currentBGM.volume = this.bgmVolume;
    }
    this.saveSettings();
  }

  setSEVolume(volume) {
    this.seVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  // BGM・SE の有効/無効切り替え
  toggleBGM() {
    this.isBGMEnabled = !this.isBGMEnabled;
    if (!this.isBGMEnabled) {
      this.stopBGM();
    }
    this.saveSettings();
    return this.isBGMEnabled;
  }

  toggleSE() {
    this.isSEEnabled = !this.isSEEnabled;
    this.saveSettings();
    return this.isSEEnabled;
  }

  // バトル関連の音楽制御
  playBattleBGM() {
    this.playBGM('battle');
  }

  playBossBattleBGM() {
    this.playBGM('battleBoss');
  }

  // 一括音楽ファイル事前読み込み（オプション）
  async preloadAllAudio() {
    const allPaths = [...Object.values(this.bgmTracks), ...Object.values(this.seTracks)];
    const loadPromises = allPaths.map(path => 
      this.preloadAudio(path).catch(e => console.warn(`事前読み込み失敗: ${path}`, e))
    );
    
    try {
      await Promise.allSettled(loadPromises);
      console.log('音楽ファイルの事前読み込み完了');
    } catch (error) {
      console.warn('一部の音楽ファイル読み込みに失敗:', error);
    }
  }

  // デバッグ用：効果音テスト
  testAllSE() {
    console.log('全効果音テスト開始...');
    const seNames = Object.keys(this.seTracks);
    
    seNames.forEach((seName, index) => {
      setTimeout(() => {
        console.log(`テスト中: ${seName}`);
        this.playSE(seName);
      }, index * 500);
    });
  }

  // デバッグ用：クリティカル音テスト
  testCriticalSound() {
    console.log('クリティカル音テスト...');
    this.playSE('attackCritical');
  }

  // デバッグ用：タイピング音テスト
  testTypingSounds() {
    console.log('タイピング音テスト...');
    this.playSE('typeCorrect');
    setTimeout(() => {
      this.playSE('typeError');
    }, 200);
  }

  // 現在の設定状態をログ出力
  logStatus() {
    console.log('AudioSystem状態:', {
      isBGMEnabled: this.isBGMEnabled,
      isSEEnabled: this.isSEEnabled,
      bgmVolume: this.bgmVolume,
      seVolume: this.seVolume,
      currentBGM: this.currentBGM ? 'playing' : 'none',
      cacheSize: this.audioCache.size,
      audioContextState: this.audioContext ? this.audioContext.state : 'not initialized',
      hasUserInteracted: this.hasUserInteracted,
      lastTypeSoundTime: this.lastTypeSoundTime
    });
  }
}

// グローバルに公開
window.AudioSystem = AudioSystem;
