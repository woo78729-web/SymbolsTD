/**
 * SymbolsTD — portrait tower defense.
 * Grid map, BFS route, two towers, waves, projectiles, economy.
 * Ads go through window.AdManager (see admob-bridge.js).
 */
'use strict';

(function () {
  var COLS = 9;
  var ROWS = 13;
  var START_GOLD = 60;
  var START_LIVES = 20;
  var SELL_RATIO = 0.6;
  var FONT = '"PingFang TC","Microsoft JhengHei","Segoe UI",sans-serif';

  var ELEMENT_TYPES = ['poison', 'fire', 'ice', 'bolt'];

  var TOWERS = {
    basic: {
      name: '無屬性塔',
      blurb: '3 等分支為箭塔或砲塔',
      cost: 40,
      color: '#9aa69a',
      category: 'neutral',
      upgradeCost: [35, 60, 95, 135, 180, 250, 340, 460, 620],
      levels: [
        { damage: 16, range: 2.35, cooldown: 0.38, splash: 0, targets: 1 },
        { damage: 26, range: 2.5, cooldown: 0.32, splash: 0, targets: 1 },
      ],
      specs: {
        arrow: {
          name: '箭塔',
          blurb: '便宜高傷 · 攻速快 · 滿等打兩隻 · 單體輸出最高',
          color: '#7dcea0',
          levels: [
            { damage: 42, range: 2.6, cooldown: 0.28, splash: 0, targets: 1 },
            { damage: 58, range: 2.7, cooldown: 0.24, splash: 0, targets: 1 },
            { damage: 78, range: 2.8, cooldown: 0.2, splash: 0, targets: 1 },
            { damage: 100, range: 2.9, cooldown: 0.16, splash: 0, targets: 2 },
          ],
        },
        cannon: {
          name: '砲塔',
          blurb: '範圍擴散 · 一次最多 3 發 · 中心傷高外圍遞減 · 擴散不疊加',
          color: '#e7a15a',
          levels: [
            { damage: 44, range: 2.15, cooldown: 1.12, splash: 1.05, shots: 2 },
            { damage: 58, range: 2.25, cooldown: 1.02, splash: 1.2, shots: 2 },
            { damage: 74, range: 2.35, cooldown: 0.92, splash: 1.35, shots: 3 },
            { damage: 92, range: 2.45, cooldown: 0.84, splash: 1.5, shots: 3 },
          ],
        },
      },
    },
    poison: {
      name: '毒塔',
      blurb: '單體毒液 · 克制再生／治療／地獄回血 · 觸發後持續扣總血%',
      cost: 80,
      color: '#3cbf4a',
      category: 'element',
      upgradeCost: [55, 85, 120, 160, 210, 290, 390, 520, 700],
      levels: [
        { damage: 12, range: 2.35, cooldown: 1.05, splash: 0, effect: 'poison', poison: 22, poisonTime: 3.2, poisonEvery: 0.4 },
        { damage: 14, range: 2.4, cooldown: 0.95, splash: 0, effect: 'poison', poison: 28, poisonTime: 3.2, poisonEvery: 0.4 },
        { damage: 16, range: 2.45, cooldown: 0.86, splash: 0, effect: 'poison', poison: 34, poisonTime: 3.2, poisonEvery: 0.4 },
        { damage: 18, range: 2.5, cooldown: 0.78, splash: 0, effect: 'poison', poison: 40, poisonTime: 3.2, poisonEvery: 0.4 },
        { damage: 20, range: 2.55, cooldown: 0.7, splash: 0, effect: 'poison', poison: 46, poisonTime: 3.2, poisonEvery: 0.4 },
        { damage: 24, range: 2.6, cooldown: 0.62, splash: 0, effect: 'poison', poison: 54, poisonTime: 3.2, poisonEvery: 0.4 },
      ],
    },
    fire: {
      name: '火塔',
      blurb: '紅色炸彈 · 破盾／克制鐵甲／地獄厚皮 · 觸發時打血量%',
      cost: 90,
      color: '#ff7a45',
      category: 'element',
      upgradeCost: [60, 95, 135, 180, 230, 310, 420, 560, 750],
      levels: [
        { damage: 48, range: 2.25, cooldown: 1.1, splash: 0.95, effect: 'burn', burn: 4, burnTime: 2.4, burnEvery: 0.5 },
        { damage: 58, range: 2.3, cooldown: 1.0, splash: 1.02, effect: 'burn', burn: 5, burnTime: 2.4, burnEvery: 0.5 },
        { damage: 70, range: 2.35, cooldown: 0.9, splash: 1.1, effect: 'burn', burn: 5, burnTime: 2.4, burnEvery: 0.5 },
        { damage: 84, range: 2.4, cooldown: 0.82, splash: 1.18, effect: 'burn', burn: 6, burnTime: 2.4, burnEvery: 0.5 },
        { damage: 98, range: 2.45, cooldown: 0.74, splash: 1.26, effect: 'burn', burn: 7, burnTime: 2.4, burnEvery: 0.5 },
        { damage: 114, range: 2.5, cooldown: 0.66, splash: 1.34, effect: 'burn', burn: 8, burnTime: 2.4, burnEvery: 0.5 },
      ],
    },
    ice: {
      name: '冰塔',
      blurb: '藍色光波 · 緩速 · 第 3 次凍結',
      cost: 85,
      color: '#8fd4ff',
      category: 'element',
      upgradeCost: [55, 90, 130, 175, 220, 300, 400, 540, 720],
      levels: [
        { damage: 28, range: 2.3, cooldown: 1.1, splash: 1.1, effect: 'slow', slow: 0.35, slowTime: 1.8 },
        { damage: 34, range: 2.35, cooldown: 1.0, splash: 1.2, effect: 'slow', slow: 0.38, slowTime: 1.8 },
        { damage: 40, range: 2.4, cooldown: 0.9, splash: 1.32, effect: 'slow', slow: 0.4, slowTime: 1.8 },
        { damage: 46, range: 2.45, cooldown: 0.82, splash: 1.42, effect: 'slow', slow: 0.4, slowTime: 1.8 },
        { damage: 52, range: 2.5, cooldown: 0.74, splash: 1.52, effect: 'slow', slow: 0.42, slowTime: 1.8 },
        { damage: 60, range: 2.55, cooldown: 0.66, splash: 1.62, effect: 'slow', slow: 0.45, slowTime: 1.8 },
      ],
    },
    bolt: {
      name: '雷塔',
      blurb: '對空、跳躍增傷 · 麻痺',
      cost: 85,
      color: '#e0b000',
      category: 'element',
      upgradeCost: [55, 90, 130, 175, 220, 300, 400, 540, 720],
      levels: [
        { damage: 24, range: 2.45, cooldown: 0.72, splash: 0, targets: 1, chain: 2, chainRange: 1.75, stunTime: 1.0 },
        { damage: 32, range: 2.5, cooldown: 0.64, splash: 0, targets: 1, chain: 2, chainRange: 1.85, stunTime: 1.05 },
        { damage: 42, range: 2.55, cooldown: 0.56, splash: 0, targets: 1, chain: 3, chainRange: 1.9, stunTime: 1.1 },
        { damage: 54, range: 2.6, cooldown: 0.5, splash: 0, targets: 1, chain: 3, chainRange: 2.0, stunTime: 1.15 },
        { damage: 68, range: 2.65, cooldown: 0.44, splash: 0, targets: 1, chain: 4, chainRange: 2.05, stunTime: 1.2 },
        { damage: 84, range: 2.7, cooldown: 0.38, splash: 0, targets: 1, chain: 4, chainRange: 2.15, stunTime: 1.3 },
      ],
    },
    mint: {
      name: '產錢塔',
      blurb: '不攻擊 · 定期產出金幣',
      cost: 70,
      color: '#f2c14e',
      category: 'economy',
      upgradeCost: [50, 80, 115, 155, 200, 270, 360, 480, 640],
      levels: [
        { damage: 0, range: 0, cooldown: 5.0, goldGen: 5 },
        { damage: 0, range: 0, cooldown: 4.6, goldGen: 6 },
        { damage: 0, range: 0, cooldown: 4.2, goldGen: 8 },
        { damage: 0, range: 0, cooldown: 3.8, goldGen: 10 },
        { damage: 0, range: 0, cooldown: 3.4, goldGen: 13 },
        { damage: 0, range: 0, cooldown: 3.0, goldGen: 16 },
      ],
    },
    smith: {
      name: '鐵匠',
      blurb: '不攻擊。在場時，其他塔可以用金幣升到 10 等。',
      cost: 480,
      color: '#8d6e63',
      category: 'support',
      upgradeCost: [],
      levels: [
        { damage: 0, range: 0, cooldown: 99 },
      ],
    },
  };

  var BOSSES = [
    { id: 'regen', name: '再生王', blurb: '會持續回復生命', color: '#3ecf8e' },
    { id: 'rush', name: '狂暴王', blurb: '生命低於一半就加速', color: '#ff5a36' },
    { id: 'summon', name: '召喚王', blurb: '沿路叫出步兵', color: '#f2c14e' },
    { id: 'ward', name: '護盾王', blurb: '週期張開護盾', color: '#67e8f9' },
    { id: 'split', name: '分裂王', blurb: '死後分成三隻', color: '#c084fc' },
    { id: 'mend', name: '治癒王', blurb: '治療附近的敵人', color: '#ff8fab' },
    { id: 'frost', name: '冰封王', blurb: '定期凍結所有防禦塔', color: '#9bd4ff' },
    { id: 'armor', name: '鐵甲王', blurb: '受到的傷害減半', color: '#8aa0b8' },
  ];

  var Ads = window.AdManager || {
    init: function () { return Promise.resolve({ mode: 'missing' }); },
    showRewarded: function () { return Promise.resolve({ rewarded: false, error: 'missing' }); },
    showInterstitial: function () { return Promise.resolve(); },
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canvas = document.getElementById('game');
  var stage = document.getElementById('stage');
  var ctx = canvas.getContext('2d', { alpha: false });
  var hudLives = document.getElementById('hud-lives');
  var hudGold = document.getElementById('hud-gold');
  var hudWave = document.getElementById('hud-wave');
  var hudWaveSub = document.getElementById('hud-wave-sub');
  var statLife = document.getElementById('stat-life');
  var waveBtn = document.getElementById('btn-wave');
  var speedBtn = document.getElementById('btn-speed');
  var itemBar = document.getElementById('item-bar');
  var itemWallBtn = document.getElementById('btn-item-wall');
  var itemPushBtn = document.getElementById('btn-item-push');
  var itemWallCount = document.getElementById('item-wall');
  var itemPushCount = document.getElementById('item-push');
  var waveBtnLabel = document.getElementById('wave-btn-label');
  var waveBtnSub = document.getElementById('wave-btn-sub');
  var soundBtn = document.getElementById('btn-sound');
  var bgmBtn = document.getElementById('btn-bgm');
  var pauseBtn = document.getElementById('btn-pause');
  var screenWelcome = document.getElementById('screen-welcome');
  var screenIndex = document.getElementById('screen-index');
  var screenBoard = document.getElementById('screen-board');
  var screenFriends = document.getElementById('screen-friends');
  var screenAura = document.getElementById('screen-aura');
  var inspector = document.getElementById('inspector');
  var inspectTitle = document.getElementById('inspect-title');
  var inspectMeta = document.getElementById('inspect-meta');
  var inspectActions = document.getElementById('inspect-actions');
  var modal = document.getElementById('modal');
  var modalKicker = document.getElementById('modal-kicker');
  var modalTitle = document.getElementById('modal-title');
  var modalDesc = document.getElementById('modal-desc');
  var modalActions = document.getElementById('modal-actions');
  var toastEl = document.getElementById('toast');
  var screenMenu = document.getElementById('screen-menu');
  var screenDifficulty = document.getElementById('screen-difficulty');
  var difficultyList = document.getElementById('difficulty-list');
  var routeBar = document.getElementById('route-bar');
  var tileStraightEl = document.getElementById('tile-straight');
  var tileTurnEl = document.getElementById('tile-turn');
  var routeHint = document.getElementById('route-hint');
  var backBtn = document.getElementById('btn-back');

  var view = { w: 360, h: 520, dpr: 1, tile: 32, originX: 0, originY: 0 };
  var route = { cells: [], set: new Set() };
  var altarCache = null;
  var HERO_COST = 1000;
  var HERO_IDS = ['sword', 'archer', 'mage', 'priest'];
  var HERALD_RADIUS = 4.5;
  var WAYPOINTS = [];

  var state = {
    gold: START_GOLD,
    lives: START_LIVES,
    shownLives: START_LIVES,
    wave: 0,
    waveTime: 0,
    berserk: false,
    phase: 'prep',
    paused: false,
    userPaused: false,
    best: loadNumber('fantasia-td-best'),
    difficulty: 'normal',
    difficultyMode: 'infinite',
    clearCountdown: 0,
    clearKind: '',
    editCountdown: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    floaters: [],
    flashes: [],
    shocks: [],
    arcs: [],
    pendingSpawns: [],
    spawnQueue: [],
    spawnTimer: 0,
    nextId: 1,
    selectedId: null,
    buildType: null,
    buildSite: null,
    buildMenu: 'root',
    splashLedger: {},
    hellDeffs: [],
    hellDeffHalf: false,
    hellDeffWave: 0,
    hellLockCd: 0,
    hellWheel: null,
    sellArmed: false,
    hover: null,
    mode: 'menu',
    level: 0,
    chapter: 0,
    stagePlan: null,
    levelName: '',
    chapterName: '',
    levelWaves: 0,
    hpScale: 1,
    lifeLost: 0,
    tiles: { straight: 0, turn: 0 },
    editTool: null,
    outcome: '',
    tileGainText: '',
    stars: loadStars(),
    reviveUsed: false,
    waveGoldEarned: 0,
    waveDoubled: false,
    waveGiftDone: false,
    speed: (function () {
      try {
        var n = Number(localStorage.getItem('fantasia-td-speed') || 1);
        return n === 2 || n === 4 ? n : 1;
      } catch (error) {
        return 1;
      }
    })(),
    adBusy: false,
    banner: null,
    rangePing: null,
    shake: 0,
    hurt: 0,
    time: 0,
    walls: [],
    traps: [],
    fogs: [],
    gusts: [],
    interestLeft: 0,
    items: { wall: 0, push: 0 },
    pickMode: '',
    cardWave: 0,
    pendingChoices: null,
    meteor: null,
    pendingHero: '',
    freeSpec: false,
  };

  var pointer = null;
  var toastTimer = 0;
  var lastVibrate = 0;
  var lastTs = 0;

  function loadBgmMuted() {
    try {
      var raw = localStorage.getItem('fantasia-td-bgm-mute');
      if (raw == null) return loadNumber('fantasia-td-mute') === 1;
      return Number(raw) === 1;
    } catch (error) {
      return false;
    }
  }

  var Sfx = {
    muted: loadNumber('fantasia-td-mute') === 1,
    ctx: null,
    unlock: function () {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!this.ctx) {
        try { this.ctx = new AC(); } catch (error) { return; }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(function () {});
    },
    context: function () {
      if (this.muted || !this.ctx) return null;
      return this.ctx;
    },
    arrow: function () { this.blip(880, 0.05, 'square', 0.035, -420); },
    cannon: function () {
      var ctx = this.context();
      if (!ctx) return;
      tone(ctx, { freq: 130, dur: 0.18, type: 'triangle', gain: 0.07, slide: -70 });
      noise(ctx, 0.16, 0.05);
    },
    build: function () {
      var ctx = this.context();
      if (!ctx) return;
      tone(ctx, { freq: 523, dur: 0.07, type: 'triangle', gain: 0.05 });
      tone(ctx, { freq: 784, dur: 0.1, type: 'triangle', gain: 0.05, when: ctx.currentTime + 0.07 });
    },
    sell: function () { this.blip(420, 0.12, 'triangle', 0.05, -180); },
    kill: function () { this.blip(680, 0.07, 'sine', 0.05, 180); },
    base: function () { this.blip(96, 0.28, 'triangle', 0.08, -50); },
    bad: function () { this.blip(170, 0.1, 'square', 0.04, -40); },
    ui: function () { this.blip(720, 0.035, 'sine', 0.03, 0); },
    coin: function () {
      var ctx = this.context();
      if (!ctx) return;
      tone(ctx, { freq: 880, dur: 0.07, type: 'sine', gain: 0.05 });
      tone(ctx, { freq: 1175, dur: 0.1, type: 'sine', gain: 0.05, when: ctx.currentTime + 0.08 });
    },
    fanfare: function () {
      var ctx = this.context();
      if (!ctx) return;
      [523, 659, 784].forEach(function (freq, i) {
        tone(ctx, { freq: freq, dur: 0.12, type: 'triangle', gain: 0.055, when: ctx.currentTime + i * 0.09 });
      });
    },
    boss: function () {
      var ctx = this.context();
      if (!ctx) return;
      tone(ctx, { freq: 196, dur: 0.24, type: 'triangle', gain: 0.07, slide: -50 });
      tone(ctx, { freq: 146, dur: 0.4, type: 'triangle', gain: 0.08, slide: -36, when: ctx.currentTime + 0.16 });
    },
    gameOver: function () {
      var ctx = this.context();
      if (!ctx) return;
      [392, 349, 311, 233].forEach(function (freq, i) {
        tone(ctx, { freq: freq, dur: 0.2, type: 'triangle', gain: 0.06, slide: -70, when: ctx.currentTime + i * 0.12 });
      });
    },
    blip: function (freq, dur, type, gain, slide) {
      var ctx = this.context();
      if (!ctx) return;
      tone(ctx, { freq: freq, dur: dur, type: type, gain: gain, slide: slide });
    },
  };

  function tone(audio, opts) {
    try {
      var t = opts.when || audio.currentTime;
      var osc = audio.createOscillator();
      var amp = audio.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(Math.max(40, opts.freq), t);
      if (opts.slide) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freq + opts.slide), t + opts.dur);
      }
      amp.gain.setValueAtTime(Math.max(0.0001, opts.gain), t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
      osc.connect(amp);
      amp.connect(audio.destination);
      osc.start(t);
      osc.stop(t + opts.dur + 0.02);
    } catch (error) { /* ignore unlocked or missing output */ }
  }

  function noise(audio, dur, gain) {
    try {
      var length = Math.floor(audio.sampleRate * dur);
      var buffer = audio.createBuffer(1, length, audio.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      var src = audio.createBufferSource();
      var amp = audio.createGain();
      var t = audio.currentTime;
      src.buffer = buffer;
      amp.gain.setValueAtTime(gain, t);
      amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(amp);
      amp.connect(audio.destination);
      src.start(t);
      src.stop(t + dur);
    } catch (error) { /* ignore */ }
  }

  // 輕量 Web Audio 循環 BGM：選單輕鬆冒險、章節特色、王關緊張、無限刺激輪換
  var Bgm = {
    muted: loadBgmMuted(),
    master: null,
    key: '',
    profile: null,
    step: 0,
    nextTime: 0,
    timer: 0,
    profiles: {
      menu: { bpm: 86, root: 62, gain: 0.028, type: 'triangle', scale: [0, 2, 4, 7, 9], bass: [0, 0, 7, 4], style: 'soft' },
      regen: { bpm: 94, root: 60, gain: 0.026, type: 'sine', scale: [0, 2, 3, 5, 7, 9], bass: [0, 5, 0, 7], style: 'soft' },
      rush: { bpm: 126, root: 57, gain: 0.03, type: 'square', scale: [0, 2, 4, 5, 7, 10], bass: [0, 0, 5, 7], style: 'drive' },
      summon: { bpm: 100, root: 55, gain: 0.027, type: 'triangle', scale: [0, 1, 4, 5, 7, 8], bass: [0, 7, 3, 7], style: 'mystic' },
      ward: { bpm: 98, root: 64, gain: 0.025, type: 'sine', scale: [0, 2, 5, 7, 9, 12], bass: [0, 7, 0, 5], style: 'glass' },
      split: { bpm: 112, root: 58, gain: 0.028, type: 'triangle', scale: [0, 3, 5, 7, 10], bass: [0, 3, 7, 3], style: 'drive' },
      mend: { bpm: 92, root: 61, gain: 0.026, type: 'sine', scale: [0, 2, 4, 5, 7, 9], bass: [0, 4, 7, 4], style: 'soft' },
      frost: { bpm: 84, root: 66, gain: 0.024, type: 'sine', scale: [0, 2, 5, 7, 11], bass: [0, 7, 5, 0], style: 'ice' },
      armor: { bpm: 104, root: 50, gain: 0.03, type: 'triangle', scale: [0, 2, 5, 7, 8], bass: [0, 0, 5, 0], style: 'heavy' },
      wheel: { bpm: 108, root: 48, gain: 0.03, type: 'sawtooth', scale: [0, 1, 3, 6, 7, 10], bass: [0, 3, 6, 3], style: 'dark' },
      tension: { bpm: 118, root: 52, gain: 0.032, type: 'triangle', scale: [0, 1, 3, 5, 7, 8], bass: [0, 0, 3, 7], style: 'tense' },
      boss: { bpm: 122, root: 45, gain: 0.034, type: 'sawtooth', scale: [0, 1, 3, 6, 7], bass: [0, 0, 1, 3], style: 'boss' },
      intense0: { bpm: 138, root: 50, gain: 0.033, type: 'square', scale: [0, 2, 3, 5, 7, 10], bass: [0, 0, 5, 7], style: 'drive' },
      intense1: { bpm: 146, root: 53, gain: 0.034, type: 'sawtooth', scale: [0, 1, 4, 5, 7, 11], bass: [0, 5, 0, 7], style: 'drive' },
      intense2: { bpm: 142, root: 48, gain: 0.035, type: 'square', scale: [0, 3, 5, 6, 7, 10], bass: [0, 0, 3, 6], style: 'boss' },
    },
    midiHz: function (midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    },
    ensure: function () {
      if (!Sfx.ctx) Sfx.unlock();
      if (!Sfx.ctx) return null;
      if (!this.master) {
        this.master = Sfx.ctx.createGain();
        this.master.gain.value = 0.0001;
        this.master.connect(Sfx.ctx.destination);
      }
      return this.master;
    },
    note: function (when, midi, dur, type, gain) {
      var ctx = Sfx.ctx;
      var dest = this.ensure();
      if (!ctx || !dest) return;
      try {
        var osc = ctx.createOscillator();
        var amp = ctx.createGain();
        osc.type = type || 'triangle';
        osc.frequency.setValueAtTime(this.midiHz(midi), when);
        amp.gain.setValueAtTime(0.0001, when);
        amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), when + 0.02);
        amp.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.05, dur));
        osc.connect(amp);
        amp.connect(dest);
        osc.start(when);
        osc.stop(when + dur + 0.03);
      } catch (error) { /* ignore */ }
    },
    kick: function (when, gain) {
      var ctx = Sfx.ctx;
      var dest = this.ensure();
      if (!ctx || !dest) return;
      try {
        var osc = ctx.createOscillator();
        var amp = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, when);
        osc.frequency.exponentialRampToValueAtTime(42, when + 0.12);
        amp.gain.setValueAtTime(Math.max(0.0001, gain), when);
        amp.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);
        osc.connect(amp);
        amp.connect(dest);
        osc.start(when);
        osc.stop(when + 0.16);
      } catch (error) { /* ignore */ }
    },
    resolveKey: function () {
      if (this.muted) return '';
      if (state.phase === 'menu' || state.phase === 'gameover' || (screenMenu && !screenMenu.hidden)) return 'menu';
      if (state.mode === 'infinite' || state.mode === 'custom') {
        if (state.wave > 0 && isBossWave(state.wave)) return 'boss';
        if (state.wave <= 0) return 'intense0';
        return 'intense' + ((state.wave + (state.difficulty === 'hell' ? 1 : 0)) % 3);
      }
      if (state.mode === 'campaign') {
        var kit = campaignKit();
        var kitId = (kit && kit.id) || 'regen';
        var bossStage = !!(state.stagePlan && state.stagePlan.index === 5);
        if (state.wave > 0 && isBossWave(state.wave)) return 'boss';
        if (bossStage) return 'tension';
        if (kitId === 'wheel') return 'wheel';
        return kitId;
      }
      return 'menu';
    },
    fadeTo: function (level) {
      var dest = this.ensure();
      var ctx = Sfx.ctx;
      if (!dest || !ctx) return;
      try {
        dest.gain.cancelScheduledValues(ctx.currentTime);
        dest.gain.setValueAtTime(Math.max(0.0001, dest.gain.value), ctx.currentTime);
        dest.gain.exponentialRampToValueAtTime(Math.max(0.0001, level), ctx.currentTime + 0.35);
      } catch (error) { /* ignore */ }
    },
    stop: function () {
      if (!this.key && !this.timer) return;
      this.key = '';
      this.profile = null;
      this.fadeTo(0.0001);
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = 0;
      }
    },
    start: function (key) {
      var profile = this.profiles[key];
      if (!profile) {
        this.stop();
        return;
      }
      Sfx.unlock();
      if (!this.ensure()) return;
      this.key = key;
      this.profile = profile;
      this.step = 0;
      this.nextTime = Sfx.ctx.currentTime + 0.08;
      this.fadeTo(1);
      if (!this.timer) {
        var self = this;
        this.timer = setInterval(function () { self.pump(); }, 80);
      }
      this.pump();
    },
    sync: function () {
      if (this.muted || document.hidden) {
        this.stop();
        return;
      }
      var key = this.resolveKey();
      if (!key) {
        this.stop();
        return;
      }
      if (key !== this.key) this.start(key);
    },
    pump: function () {
      if (this.muted || !this.profile || !Sfx.ctx) return;
      var ctx = Sfx.ctx;
      var profile = this.profile;
      var stepSec = 60 / profile.bpm / 2;
      var scale = profile.scale;
      var bass = profile.bass || [0, 0, 7, 4];
      while (this.nextTime < ctx.currentTime + 0.14) {
        var i = this.step;
        var when = this.nextTime;
        var beat = i % 8;
        var bar = Math.floor(i / 8) % 4;
        var bassDeg = bass[i % bass.length];
        this.note(when, profile.root + bassDeg - 12, stepSec * 1.6, 'triangle', profile.gain * 0.9);
        if (profile.style === 'drive' || profile.style === 'boss' || profile.style === 'tense' || profile.style === 'heavy') {
          if (beat % 2 === 0) this.kick(when, profile.gain * (profile.style === 'boss' ? 1.15 : 0.9));
        } else if (beat === 0 || beat === 4) {
          this.kick(when, profile.gain * 0.55);
        }
        var leadDeg = scale[(i * (profile.style === 'mystic' ? 3 : 2) + bar) % scale.length];
        if (profile.style === 'soft' || profile.style === 'glass' || profile.style === 'ice') {
          if (beat % 2 === 0) {
            this.note(when, profile.root + leadDeg, stepSec * 1.8, profile.type, profile.gain);
            if (profile.style === 'glass' || profile.style === 'ice') {
              this.note(when + 0.02, profile.root + leadDeg + 12, stepSec * 1.1, 'sine', profile.gain * 0.45);
            }
          }
        } else if (profile.style === 'mystic' || profile.style === 'dark') {
          this.note(when, profile.root + leadDeg, stepSec * 1.3, profile.type, profile.gain);
          if (beat === 3 || beat === 7) {
            this.note(when, profile.root + scale[(leadDeg + 2) % scale.length] + 12, stepSec * 0.9, 'sine', profile.gain * 0.5);
          }
        } else {
          this.note(when, profile.root + leadDeg, stepSec * 1.15, profile.type, profile.gain);
          if (beat === 2 || beat === 6) {
            var hop = scale[(i + 3) % scale.length];
            this.note(when + stepSec * 0.5, profile.root + hop + 12, stepSec * 0.7, 'triangle', profile.gain * 0.55);
          }
          if ((profile.style === 'boss' || profile.style === 'tense') && beat === 0) {
            this.note(when, profile.root + 3 - 12, stepSec * 3, 'sawtooth', profile.gain * 0.35);
          }
        }
        this.nextTime += stepSec;
        this.step += 1;
      }
    },
  };

  function vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch (error) { /* ignore */ }
  }

  function vibrateHit() {
    var now = performance.now();
    if (now - lastVibrate < 110) return;
    lastVibrate = now;
    vibrate(10);
  }

  function loadNumber(key) {
    try { return Number(localStorage.getItem(key)) || 0; } catch (error) { return 0; }
  }

  function saveNumber(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (error) { /* ignore */ }
  }

  function progressAccountUid() {
    var account = null;
    try { account = JSON.parse(localStorage.getItem('symbols-td-account') || 'null'); } catch (error) { account = null; }
    if (!account || !account.uid) return '';
    // Local-only guest ids stay device-bound; Firebase accounts (含匿名) 可雲端同步
    if (String(account.uid).indexOf('guest-') === 0) return '';
    return String(account.uid);
  }

  function starsStorageKey() {
    var uid = progressAccountUid();
    return uid ? ('fantasy_td_stars:' + uid) : 'fantasy_td_stars';
  }

  function deedsStorageKey() {
    var uid = progressAccountUid();
    return uid ? ('symbols-td-deeds:' + uid) : 'symbols-td-deeds';
  }

  function normalizeStarMap(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return raw;
  }

  function migrateLegacyStarBits(raw, key) {
    if (localStorage.getItem('fantasy_td_star_bits') === '1') return raw;
    var keys = Object.keys(raw);
    for (var i = 0; i < keys.length; i++) {
      var n = raw[keys[i]] | 0;
      if (n >= 3) raw[keys[i]] = 7;
      else if (n === 2) raw[keys[i]] = 3;
      else if (n === 1) raw[keys[i]] = 1;
      else raw[keys[i]] = 0;
    }
    try {
      localStorage.setItem('fantasy_td_star_bits', '1');
      localStorage.setItem(key, JSON.stringify(raw));
    } catch (error) { /* ignore */ }
    return raw;
  }

  function loadStars() {
    try {
      var key = starsStorageKey();
      var raw = normalizeStarMap(JSON.parse(localStorage.getItem(key) || 'null'));
      // 帳號 key 永遠 OR 合併舊的本機進度，避免登入後把較高進度留在無帳號 key
      if (key !== 'fantasy_td_stars') {
        var legacy = normalizeStarMap(JSON.parse(localStorage.getItem('fantasy_td_stars') || '{}'));
        raw = mergeStarMaps(raw, legacy);
      }
      if (!Object.keys(raw).length) raw = {};
      raw = migrateLegacyStarBits(raw, key);
      if (key !== 'fantasy_td_stars') {
        try { localStorage.setItem(key, JSON.stringify(raw)); } catch (error) { /* ignore */ }
      }
      return raw;
    } catch (error) { return {}; }
  }

  function saveStars() {
    try { localStorage.setItem(starsStorageKey(), JSON.stringify(state.stars || {})); } catch (error) { /* ignore */ }
    queueCloudProgressPush();
  }

  function sellRatio() {
    return state.mode === 'custom' ? 0.8 : 0.6;
  }

  function isPath(c, r) {
    return route.set.has(c + ',' + r);
  }

  var PATH_JUMPS = [];

  function rebuildPathJumps() {
    PATH_JUMPS = [];
    for (var i = 0; i < WAYPOINTS.length; i++) {
      for (var j = i + 4; j < WAYPOINTS.length; j++) {
        var dx = WAYPOINTS[j].x - WAYPOINTS[i].x;
        var dy = WAYPOINTS[j].y - WAYPOINTS[i].y;
        var spatial = Math.hypot(dx, dy);
        if (spatial <= 3.05 && (j - i) > spatial + 1.5) {
          PATH_JUMPS.push({ from: i, to: j, span: spatial });
        }
      }
    }
  }

  function setRoute(cells) {
    route.cells = cells.map(function (cell) { return { c: cell.c, r: cell.r }; });
    route.set = new Set(route.cells.map(function (cell) { return cell.c + ',' + cell.r; }));
    WAYPOINTS = route.cells.map(function (cell) {
      return { x: cell.c + 0.5, y: cell.r + 0.5 };
    });
    rebuildPathJumps();
    altarCache = null;
    if (state && state.walls) {
      state.walls = state.walls.filter(function (wall) { return route.set.has(wall.c + ',' + wall.r); });
      state.traps = state.traps.filter(function (trap) { return route.set.has(trap.c + ',' + trap.r); });
    }
  }

  function straightColumn(col) {
    var cells = [];
    for (var r = 0; r < ROWS; r++) cells.push({ c: col, r: r });
    return cells;
  }

  function chain(points) {
    var cells = [];
    for (var i = 0; i < points.length - 1; i++) {
      var c = points[i][0];
      var r = points[i][1];
      var c2 = points[i + 1][0];
      var r2 = points[i + 1][1];
      if (!cells.length) cells.push({ c: c, r: r });
      while (c !== c2 || r !== r2) {
        if (c !== c2) c += c2 > c ? 1 : -1;
        else r += r2 > r ? 1 : -1;
        cells.push({ c: c, r: r });
      }
    }
    return cells;
  }

  function cellOnInfinite(c, r) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return false;
    if (r === 0 && c <= 7) return true;
    if (c === 7 && r <= 3) return true;
    if (r === 3 && c >= 1 && c <= 7) return true;
    if (c === 1 && r >= 3 && r <= 6) return true;
    if (r === 6 && c >= 1 && c <= 7) return true;
    if (c === 7 && r >= 6 && r <= 9) return true;
    if (r === 9 && c >= 1 && c <= 7) return true;
    if (c === 1 && r >= 9 && r <= 12) return true;
    if (r === 12 && c >= 1 && c <= 6) return true;
    return false;
  }

  function traceMask(mask, start, end) {
    var key = function (c, r) { return c + ',' + r; };
    var prev = new Map();
    var seen = new Set([key(start.c, start.r)]);
    var queue = [start];
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var found = false;
    while (queue.length) {
      var cur = queue.shift();
      if (cur.c === end.c && cur.r === end.r) { found = true; break; }
      for (var i = 0; i < dirs.length; i++) {
        var nc = cur.c + dirs[i][0];
        var nr = cur.r + dirs[i][1];
        var k = key(nc, nr);
        if (!mask(nc, nr) || seen.has(k)) continue;
        seen.add(k);
        prev.set(k, cur);
        queue.push({ c: nc, r: nr });
      }
    }
    if (!found) throw new Error('Map path is not connected');
    var cells = [end];
    var walk = end;
    while (walk.c !== start.c || walk.r !== start.r) {
      walk = prev.get(key(walk.c, walk.r));
      cells.push(walk);
    }
    cells.reverse();
    return cells;
  }

  function buildInfinitePath() {
    return traceMask(cellOnInfinite, { c: 0, r: 0 }, { c: 6, r: 12 });
  }

  function infiniteStart() { return { c: 0, r: 0 }; }
  function infiniteEnd() { return { c: 6, r: 12 }; }

  function towerBlockSet() {
    var blocked = new Set();
    for (var i = 0; i < state.towers.length; i++) {
      blocked.add(state.towers[i].c + ',' + state.towers[i].r);
    }
    blocked.delete(infiniteStart().c + ',' + infiniteStart().r);
    blocked.delete(infiniteEnd().c + ',' + infiniteEnd().r);
    return blocked;
  }

  function pathCellKey(c, r) { return c + ',' + r; }

  function pathStickiness(cells) {
    var index = {};
    for (var i = 0; i < cells.length; i++) index[pathCellKey(cells[i].c, cells[i].r)] = i;
    var sticky = 0;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var n = 0; n < cells.length; n++) {
      for (var d = 0; d < dirs.length; d++) {
        var nk = pathCellKey(cells[n].c + dirs[d][0], cells[n].r + dirs[d][1]);
        if (index[nk] == null) continue;
        if (Math.abs(index[nk] - n) === 1) continue;
        sticky += 1;
      }
    }
    return sticky / 2;
  }

  function pathTurnCount(cells) {
    var turns = 0;
    for (var i = 1; i < cells.length - 1; i++) {
      var dx0 = cells[i].c - cells[i - 1].c;
      var dy0 = cells[i].r - cells[i - 1].r;
      var dx1 = cells[i + 1].c - cells[i].c;
      var dy1 = cells[i + 1].r - cells[i].r;
      if (dx0 !== dx1 || dy0 !== dy1) turns += 1;
    }
    return turns;
  }

  function sanitizePathCells(cells, blocked) {
    var seen = new Set();
    var out = [];
    for (var i = 0; i < cells.length; i++) {
      var k = pathCellKey(cells[i].c, cells[i].r);
      if (blocked.has(k)) return null;
      if (seen.has(k)) return null;
      seen.add(k);
      out.push({ c: cells[i].c, r: cells[i].r });
    }
    for (var n = 1; n < out.length; n++) {
      if (Math.abs(out[n].c - out[n - 1].c) + Math.abs(out[n].r - out[n - 1].r) !== 1) return null;
    }
    return out;
  }

  function acceptGeneratedPath(cells, blocked) {
    if (!cells) return null;
    cells = sanitizePathCells(cells, blocked || new Set());
    if (!cells || cells.length < 30) return null;
    if (cells[0].c !== 0 || cells[0].r !== 0) return null;
    var end = infiniteEnd();
    if (cells[cells.length - 1].c !== end.c || cells[cells.length - 1].r !== end.r) return null;
    if (pathTurnCount(cells) < 7) return null;
    if (pathStickiness(cells) > Math.max(2, cells.length * 0.1)) return null;
    return cells;
  }

  function buildWindingInfinitePath(blocked) {
    blocked = blocked || new Set();
    var end = infiniteEnd();
    for (var attempt = 0; attempt < 40; attempt++) {
      var leftEdge = Math.floor(Math.random() * 3);
      var rightEdge = 6 + Math.floor(Math.random() * 3);
      if (rightEdge - leftEdge < 5) rightEdge = Math.min(8, leftEdge + 5);

      var rows = [0];
      var cur = 0;
      while (cur < ROWS - 1) {
        var remain = ROWS - 1 - cur;
        var gap = remain <= 3 ? remain : (2 + Math.floor(Math.random() * 3));
        cur += gap;
        if (cur > ROWS - 1) cur = ROWS - 1;
        if (cur !== rows[rows.length - 1]) rows.push(cur);
        if (cur >= ROWS - 1) break;
      }
      if (rows.length < 5) continue;

      var points = [[0, 0]];
      var c = 0;
      var goRight = Math.random() < 0.5;
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (i > 0) points.push([c, row]);
        if (i === rows.length - 1) {
          points.push([end.c, row]);
          continue;
        }
        var span = 3 + Math.floor(Math.random() * 4);
        var target = goRight ? Math.min(rightEdge, c + span) : Math.max(leftEdge, c - span);
        if (target === c) target = goRight ? Math.min(8, c + 4) : Math.max(0, c - 4);
        points.push([target, row]);
        c = target;
        goRight = !goRight;
      }
      var cells = acceptGeneratedPath(chain(points), blocked);
      if (cells) return cells;
    }
    return null;
  }

  function buildColumnWindingPath(blocked) {
    blocked = blocked || new Set();
    var end = infiniteEnd();
    for (var attempt = 0; attempt < 40; attempt++) {
      var topEdge = Math.floor(Math.random() * 2);
      var bottomEdge = 10 + Math.floor(Math.random() * 3);
      if (bottomEdge > 12) bottomEdge = 12;
      var cols = [0];
      var cur = 0;
      while (cur < end.c) {
        var step = 2 + Math.floor(Math.random() * 3);
        cur = Math.min(end.c, cur + step);
        if (cur !== cols[cols.length - 1]) cols.push(cur);
        if (cur >= end.c) break;
      }
      if (cols[cols.length - 1] !== end.c) cols.push(end.c);
      if (cols.length < 4) continue;

      var points = [[0, 0]];
      var r = 0;
      var goDown = true;
      for (var i = 0; i < cols.length; i++) {
        var col = cols[i];
        if (i > 0) points.push([col, r]);
        if (i === cols.length - 1) {
          points.push([col, end.r]);
          continue;
        }
        var targetR = goDown ? bottomEdge : topEdge;
        targetR = goDown
          ? Math.min(12, Math.max(r + 3, bottomEdge - Math.floor(Math.random() * 2)))
          : Math.max(0, Math.min(r - 3, topEdge + Math.floor(Math.random() * 2)));
        if (targetR === r) targetR = goDown ? Math.min(12, r + 4) : Math.max(0, r - 4);
        points.push([col, targetR]);
        r = targetR;
        goDown = !goDown;
      }
      var cells = acceptGeneratedPath(chain(points), blocked);
      if (cells) return cells;
    }
    return null;
  }

  function buildScatteredWaypointPath(blocked) {
    blocked = blocked || new Set();
    var end = infiniteEnd();
    for (var attempt = 0; attempt < 50; attempt++) {
      var points = [[0, 0]];
      var count = 4 + Math.floor(Math.random() * 4);
      var used = new Set(['0,0', end.c + ',' + end.r]);
      for (var n = 0; n < count; n++) {
        var picks = [];
        for (var tries = 0; tries < 30; tries++) {
          var pc = 1 + Math.floor(Math.random() * (COLS - 2));
          var pr = 1 + Math.floor(Math.random() * (ROWS - 2));
          var pk = pathCellKey(pc, pr);
          if (used.has(pk) || blocked.has(pk)) continue;
          var last = points[points.length - 1];
          var dist = Math.abs(pc - last[0]) + Math.abs(pr - last[1]);
          if (dist < 4 || dist > 14) continue;
          picks.push([pc, pr]);
        }
        if (!picks.length) break;
        var choose = picks[Math.floor(Math.random() * picks.length)];
        used.add(pathCellKey(choose[0], choose[1]));
        points.push(choose);
      }
      points.push([end.c, end.r]);
      if (points.length < 6) continue;
      var cells = acceptGeneratedPath(chain(points), blocked);
      if (cells) return cells;
    }
    return null;
  }

  function pathSignature(cells) {
    if (!cells || !cells.length) return '';
    var step = Math.max(1, Math.floor(cells.length / 8));
    var parts = [];
    for (var i = 0; i < cells.length; i += step) parts.push(cells[i].c + ':' + cells[i].r);
    parts.push(cells[cells.length - 1].c + ':' + cells[cells.length - 1].r);
    return parts.join('|');
  }

  function randomWeightPath(start, end, blocked) {
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var best = {};
    var prev = {};
    var queue = [start];
    var startKey = pathCellKey(start.c, start.r);
    best[startKey] = 0;
    while (queue.length) {
      var cur = queue.shift();
      var ck = pathCellKey(cur.c, cur.r);
      if (cur.c === end.c && cur.r === end.r) break;
      var order = dirs.slice().sort(function () { return Math.random() - 0.5; });
      for (var i = 0; i < order.length; i++) {
        var nc = cur.c + order[i][0];
        var nr = cur.r + order[i][1];
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS) continue;
        var nk = pathCellKey(nc, nr);
        if (blocked.has(nk)) continue;
        var stick = 0;
        for (var d = 0; d < dirs.length; d++) {
          var ak = pathCellKey(nc + dirs[d][0], nr + dirs[d][1]);
          if (best[ak] == null) continue;
          if (ak === ck) continue;
          stick += 1;
        }
        var nextCost = best[ck] + 1 + Math.random() * 6 + stick * 3.5;
        if (best[nk] == null || nextCost < best[nk]) {
          best[nk] = nextCost;
          prev[nk] = cur;
          queue.push({ c: nc, r: nr });
        }
      }
    }
    var endKey = pathCellKey(end.c, end.r);
    if (best[endKey] == null) return null;
    var cells = [end];
    var walk = end;
    while (walk.c !== start.c || walk.r !== start.r) {
      walk = prev[pathCellKey(walk.c, walk.r)];
      if (!walk) return null;
      cells.push(walk);
    }
    cells.reverse();
    return cells;
  }

  function scoreRandomPath(cells) {
    if (!cells) return -1;
    return cells.length * 2 + pathTurnCount(cells) * 4 - pathStickiness(cells) * 8;
  }

  function buildRandomInfinitePath() {
    var start = infiniteStart();
    var end = infiniteEnd();
    var blocked = towerBlockSet();
    var candidates = [];
    var lastSig = state.lastPathSig || '';

    function pushCandidate(cells) {
      if (!cells) return;
      var sig = pathSignature(cells);
      if (sig && sig === lastSig) return;
      candidates.push(cells);
    }

    for (var i = 0; i < 18; i++) {
      var roll = Math.random();
      if (roll < 0.34) pushCandidate(buildWindingInfinitePath(blocked));
      else if (roll < 0.67) pushCandidate(buildColumnWindingPath(blocked));
      else pushCandidate(buildScatteredWaypointPath(blocked));
    }
    for (var a = 0; a < 24; a++) {
      var weighted = acceptGeneratedPath(randomWeightPath(start, end, blocked), blocked);
      pushCandidate(weighted);
    }

    if (!candidates.length) {
      pushCandidate(buildWindingInfinitePath(new Set()));
      pushCandidate(buildColumnWindingPath(new Set()));
      pushCandidate(buildScatteredWaypointPath(new Set()));
      pushCandidate(acceptGeneratedPath(randomWeightPath(start, end, new Set()), new Set()));
    }
    if (!candidates.length) return buildInfinitePath();

    candidates.sort(function (a, b) { return scoreRandomPath(b) - scoreRandomPath(a); });
    var pool = candidates.slice(0, Math.min(8, candidates.length));
    var chosen = pool[Math.floor(Math.random() * pool.length)];
    state.lastPathSig = pathSignature(chosen);
    return chosen;
  }

  function refundTowersOnPath() {
    var kept = [];
    var refund = 0;
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
      if (isPath(tower.c, tower.r)) {
        refund += Math.floor(tower.invested * sellRatio());
      } else kept.push(tower);
    }
    if (kept.length === state.towers.length) return;
    state.towers = kept;
    if (refund > 0) {
      state.gold += refund;
      toast('路線佔用塔位，退回 ' + refund + ' 金幣');
    }
    state.selectedId = null;
    renderInspector();
  }

  var CHAPTERS = [
    { id: 1, name: '潮濕藤蔓地牢', boss: '再生王' },
    { id: 2, name: '部落熔岩', boss: '狂暴王' },
    { id: 3, name: '碎骨殿堂', boss: '召喚王' },
    { id: 4, name: '晶礦大廳', boss: '護盾王' },
    { id: 5, name: '劇毒巢穴', boss: '分裂王' },
    { id: 6, name: '邪教神殿', boss: '治癒王' },
    { id: 7, name: '冰霜囚牢', boss: '冰封王' },
    { id: 8, name: '廢鐵工坊', boss: '鐵甲王' },
    { id: 9, name: '魔王城', boss: '骷髏王' },
  ];

  var CHAPTER_KITS = [
    { id: 'regen', name: '再生', blurb: '小怪每秒回復 1.5% 血' },
    { id: 'rush', name: '狂暴', blurb: '小怪血量低於一半就加速' },
    { id: 'summon', name: '召喚', blurb: '沿路會不斷叫出小怪' },
    { id: 'ward', name: '護盾', blurb: '小怪出場就帶一層護盾' },
    { id: 'split', name: '分裂', blurb: '小怪死後會裂成兩隻' },
    { id: 'mend', name: '治癒', blurb: '小怪會慢慢把彼此補血' },
    { id: 'frost', name: '冰封', blurb: '會定期把塔凍住一下' },
    { id: 'armor', name: '鐵甲', blurb: '小怪受到的傷害減少' },
    { id: 'wheel', name: '轉盤', blurb: '開局與每 10 波轉動命運轉盤' },
  ];

  var MINION_PAIRS = [
    [
      { id: 'slime', name: '綠史萊姆', color: '#3dcf62' },
      { id: 'crawler', name: '沼澤爬行者', color: '#7dce4a' },
    ],
    [
      { id: 'goblin', name: '小哥布林', color: '#8fd14a' },
      { id: 'pup', name: '狂暴幼狼', color: '#d5d5de' },
    ],
    [
      { id: 'skel', name: '骷髏步兵', color: '#efe6d6' },
      { id: 'soul', name: '幽魂火球', color: '#c084fc' },
    ],
    [
      { id: 'tort', name: '晶礦陸龜', color: '#5ec8f0' },
      { id: 'imp', name: '持盾小鬼', color: '#e7a15a' },
    ],
    [
      { id: 'mini', name: '小史萊姆', color: '#c084fc' },
      { id: 'mucus', name: '黏液跳躍者', color: '#8fd14a' },
    ],
    [
      { id: 'acolyte', name: '異教徒學徒', color: '#e6c75a' },
      { id: 'wisp', name: '療癒光球', color: '#ffe08a' },
    ],
    [
      { id: 'frost', name: '小冰魂', color: '#b9e6ff' },
      { id: 'ice', name: '極地冰蟻', color: '#7ec8ff' },
    ],
    [
      { id: 'beetle', name: '發甲甲殼蟲', color: '#b7aa9a' },
      { id: 'golem', name: '廢鐵小魔像', color: '#d9c7a6' },
    ],
    [
      { id: 'bones', name: '魔城骷髏', color: '#efe6d6' },
      { id: 'ember', name: '魔火小鬼', color: '#e07a2f' },
    ],
  ];

  function chapterPair(chapter) {
    return MINION_PAIRS[((chapter || 1) - 1) % MINION_PAIRS.length];
  }

  function allMinions() {
    var list = [];
    for (var i = 0; i < MINION_PAIRS.length; i++) {
      list.push(MINION_PAIRS[i][0]);
      list.push(MINION_PAIRS[i][1]);
    }
    return list;
  }

  function minionById(id) {
    if (!id) return null;
    var all = allMinions();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function pickMinion(role) {
    if (state.mode === 'campaign') {
      var pair = chapterPair(state.chapter);
      return role === 'swift' ? pair[1] : pair[0];
    }
    var all = allMinions();
    return all[Math.floor(Math.random() * all.length)];
  }

  var STAGE_TITLES = ['前哨', '巡路', '折道', '混戰', '首領'];
  var PATH_BANK = [
    [[4, 0], [4, 12]],
    [[1, 0], [1, 7], [6, 7], [6, 12]],
    [[2, 0], [2, 4], [7, 4], [7, 8], [3, 8], [3, 12]],
    [[6, 0], [6, 3], [2, 3], [2, 6], [6, 6], [6, 9], [2, 9], [2, 12]],
    [[0, 0], [7, 0], [7, 3], [1, 3], [1, 6], [7, 6], [7, 9], [1, 9], [1, 12], [6, 12]],
  ];

  function nudgePath(points, nudge) {
    var minC = 8;
    var maxC = 0;
    for (var i = 0; i < points.length; i++) {
      if (points[i][0] < minC) minC = points[i][0];
      if (points[i][0] > maxC) maxC = points[i][0];
    }
    var delta = nudge;
    if (minC + delta < 0) delta = -minC;
    if (maxC + delta > 8) delta = 8 - maxC;
    if (!delta) return points;
    return points.map(function (point) { return [point[0] + delta, point[1]]; });
  }

  function buildWaves(chapter, stage) {
    var count = [12, 15, 18, 22, 25][stage - 1];
    var waves = [];
    for (var w = 1; w <= count; w++) {
      var boss = stage === 5 && w === count;
      var elite = stage < 5 && w === count;
      var beat = Math.max(1, Math.ceil((w / count) * 10));
      var late = Math.max(0, beat - 2);
      var grunts = 4 + beat + Math.floor(late * 0.9) + Math.floor(w / 6) + (chapter >= 2 ? 1 : 0) + (chapter >= 5 ? 1 : 0) + (chapter >= 7 ? 1 : 0);
      // Opening: wave 1 holds with one Lv1; wave 2+ needs upgrade or a second tower.
      if (w === 1) grunts = 4;
      else if (w === 2) grunts = 8;
      else if (w === 3) grunts = Math.max(grunts, 8);
      else if (w === 4) grunts = Math.max(grunts, 9);
      var swifts = 0;
      if (w === 2) swifts = 3;
      else if (w === 3) swifts = 3;
      else if (w === 4) swifts = 4;
      else if (w >= 5) swifts = beat >= 2 ? 2 : 1;
      if (w >= 5 && beat >= 3) swifts += 1;
      if (beat >= 5) swifts += Math.floor(beat / 2.5);
      if (stage >= 3 && beat >= 4) swifts += 1;
      if (stage >= 5 && beat >= 5) swifts += 1;
      if (chapter >= 3 && beat >= 5) swifts += 1;
      var brutes = 0;
      // Elite from wave 6 so early 1-5 is not an auto-leak.
      if (!boss && w >= 6) brutes = 1;
      if (!boss && stage >= 3 && beat >= 5 && w >= 8) brutes = Math.max(brutes, 1);
      if (!boss && stage >= 4 && beat >= 6 && w >= 10) brutes += 1;
      if (!boss && stage === 5 && beat >= 5 && w >= 10 && w % 2 === 0) brutes += 1;
      if (!boss && chapter >= 5 && stage >= 3 && beat >= 6 && w >= 10) brutes += 1;
      if (!boss && chapter >= 7 && stage >= 4 && w === count - 1) brutes += 1;
      var hoppers = 0;
      if (!boss && w >= 6) {
        hoppers = 1 + Math.floor((w - 6) / 5);
        if (stage >= 3 && w >= 10) hoppers += 1;
        if (chapter >= 4 && beat >= 6) hoppers += 1;
        hoppers = Math.min(stage >= 4 ? 3 : 2, hoppers);
      }
      var devils = 0;
      if (!boss && w >= 8) {
        devils = 1 + Math.floor((w - 8) / 6);
        if (stage >= 4 && w >= 12) devils += 1;
        if (chapter >= 5 && beat >= 7) devils += 1;
        devils = Math.min(stage >= 5 ? 3 : 2, devils);
      }
      var bones = 0;
      if (chapter === 9 && !boss) {
        if (stage === 1) bones = w >= 8 && w % 2 === 0 ? 1 : 0;
        else if (stage === 2) bones = w >= 5 ? 1 : 0;
        else if (stage === 3) bones = w >= 4 ? (w % 3 === 0 ? 2 : 1) : 0;
        else if (stage === 4) bones = w >= 3 ? (w % 2 === 0 ? 2 : 1) : 0;
        else bones = w >= 4 ? 2 : (w >= 2 ? 1 : 0);
      }
      waves.push({
        grunts: grunts,
        swifts: swifts,
        brutes: brutes,
        hoppers: hoppers,
        devils: devils,
        bones: bones,
        boss: boss,
        elite: elite,
      });
    }
    return waves;
  }

  var GOAL_TYPES = ['poison', 'fire', 'ice', 'bolt'];

  function stageGoalList(chapter, index) {
    var main = GOAL_TYPES[(chapter - 1) % GOAL_TYPES.length];
    var side = GOAL_TYPES[chapter % GOAL_TYPES.length];
    if (index === 1) {
      return [
        { kind: 'clear' },
        { kind: 'flawless' },
        chapter % 2 ? { kind: 'ban', type: 'mint' } : { kind: 'least', type: side, count: 2 },
      ];
    }
    if (index === 2) {
      return [
        { kind: 'clear' },
        { kind: 'bruise', max: 5 },
        { kind: 'ban', type: main },
      ];
    }
    if (index === 3) {
      return [
        { kind: 'clear' },
        { kind: 'rank', type: main, level: 5 },
        chapter >= 4 ? { kind: 'nohero' } : { kind: 'ban', type: 'mint' },
      ];
    }
    if (index === 4) {
      return [
        { kind: 'clear' },
        { kind: 'flawless' },
        chapter % 2 ? { kind: 'cap', max: 6 } : { kind: 'nosell' },
      ];
    }
    return [
      { kind: 'clear' },
      { kind: 'rank', type: side, level: 5 },
      chapter >= 5 ? { kind: 'nohero' } : { kind: 'bruise', max: 3 },
    ];
  }

  function towerShort(type) {
    if (type === 'basic') return '無屬';
    if (type === 'poison') return '毒塔';
    if (type === 'fire') return '火塔';
    if (type === 'ice') return '冰塔';
    if (type === 'bolt') return '雷塔';
    if (type === 'mint') return '產錢';
    if (type === 'hero') return '英雄';
    return '塔';
  }

  function goalLabel(goal) {
    if (!goal) return '';
    if (goal.kind === 'clear') return '通關';
    if (goal.kind === 'flawless') return '無傷';
    if (goal.kind === 'bruise') return '受傷≤' + goal.max;
    if (goal.kind === 'ban') return '不放' + towerShort(goal.type);
    if (goal.kind === 'rank') return towerShort(goal.type) + goal.level + '等';
    if (goal.kind === 'cap') return '最多' + goal.max + '塔';
    if (goal.kind === 'least') return towerShort(goal.type) + '×' + goal.count;
    if (goal.kind === 'nohero') return '不放英雄';
    if (goal.kind === 'nosell') return '不賣塔';
    return '';
  }

  function buildStages() {
    var list = [];
    for (var c = 1; c <= CHAPTERS.length; c++) {
      for (var s = 1; s <= 5; s++) {
        var path = nudgePath(PATH_BANK[(s - 1 + c - 1) % PATH_BANK.length], (c % 3) - 1);
        list.push({
          stageId: c + '-' + s,
          chapter: c,
          index: s,
          name: STAGE_TITLES[s - 1],
          path: path,
          waves: buildWaves(c, s),
          goals: stageGoalList(c, s),
          initialGold: 65 + (c - 1) * 4 + (s - 1) * 2 + (c >= 5 ? 6 : 0) + (c >= 7 ? 8 : 0),
          hpScale: Math.round((1 + (c - 1) * 0.08 + (s - 1) * 0.03) * 1.05 * 100) / 100,
        });
      }
    }
    return list;
  }

  var STAGES = buildStages();

  function stageById(id) {
    for (var i = 0; i < STAGES.length; i++) {
      if (STAGES[i].stageId === id) return STAGES[i];
    }
    return null;
  }

  function chapterById(id) {
    return CHAPTERS[id - 1];
  }

  function chapterUnlocked(id) {
    if (id <= 1) return true;
    return (state.stars[(id - 1) + '-5'] || 0) >= 1;
  }

  function stageUnlocked(stage) {
    if (!chapterUnlocked(stage.chapter)) return false;
    if (stage.index === 1) return true;
    return (state.stars[stage.chapter + '-' + (stage.index - 1)] || 0) >= 1;
  }

  function chapterStarTotal(id) {
    var total = 0;
    for (var s = 1; s <= 5; s++) total += state.stars[id + '-' + s] || 0;
    return total;
  }

  function nextStage(stage) {
    if (!stage) return null;
    if (stage.index < 5) return stageById(stage.chapter + '-' + (stage.index + 1));
    if (stage.chapter < 8) return stageById((stage.chapter + 1) + '-1');
    return null;
  }

  function sameCell(a, b) { return a.c === b.c && a.r === b.r; }
  function stepOf(a, b) { return { c: b.c - a.c, r: b.r - a.r }; }
  function isUnitStep(s) { return Math.abs(s.c) + Math.abs(s.r) === 1; }
  function inBounds(cell) { return cell.c >= 0 && cell.r >= 0 && cell.c < COLS && cell.r < ROWS; }

  function isMinimalBend(a, s1, s2, b) {
    var as = stepOf(a, s1);
    var ss = stepOf(s1, s2);
    var sb = stepOf(s2, b);
    var ab = stepOf(a, b);
    if (!isUnitStep(as) || !isUnitStep(ss) || !isUnitStep(sb) || !isUnitStep(ab)) return false;
    if (as.c !== -sb.c || as.r !== -sb.r) return false;
    if (ss.c !== ab.c || ss.r !== ab.r) return false;
    return as.c * ss.c + as.r * ss.r === 0;
  }

  function isExtendedBend(a, s1, o1, o2, s2, b) {
    var perp = stepOf(a, s1);
    if (!isUnitStep(perp)) return false;
    if (o1.c !== s1.c + perp.c || o1.r !== s1.r + perp.r) return false;
    if (s2.c !== b.c + perp.c || s2.r !== b.r + perp.r) return false;
    if (o2.c !== s2.c + perp.c || o2.r !== s2.r + perp.r) return false;
    var along = stepOf(o1, o2);
    var ab = stepOf(a, b);
    if (!isUnitStep(along) || !isUnitStep(ab)) return false;
    if (along.c !== ab.c || along.r !== ab.r) return false;
    return perp.c * along.c + perp.r * along.r === 0;
  }

  function pureLineDir() {
    var path = route.cells;
    if (path.length < 2) return null;
    var dir = stepOf(path[0], path[1]);
    if (!isUnitStep(dir)) return null;
    for (var i = 1; i < path.length; i++) {
      var s = stepOf(path[i - 1], path[i]);
      if (s.c !== dir.c || s.r !== dir.r) return null;
    }
    return dir;
  }

  function pointAt(dist) {
    var max = WAYPOINTS.length - 1;
    var d = Math.max(0, Math.min(max, dist));
    var i = Math.floor(d);
    var t = d - i;
    var a = WAYPOINTS[i];
    var b = WAYPOINTS[Math.min(max, i + 1)];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function enemyPos(enemy) {
    if (enemy.jumping) {
      var from = WAYPOINTS[enemy.jumping.from];
      var to = WAYPOINTS[enemy.jumping.to];
      var t = Math.max(0, Math.min(1, enemy.jumping.t));
      return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * 1.15,
      };
    }
    return pointAt(enemy.dist);
  }

  var HOPPER_JUMP_MAX = 3;
  var HOPPER_JUMP_CD = 5.2;

  function hoppingCount() {
    var n = 0;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (!e.dead && e.type === 'hopper' && e.jumping) n += 1;
    }
    return n;
  }

  function tryHopperJump(enemy) {
    if (!PATH_JUMPS.length || enemy.jumpCd > 0 || enemy.jumping) return;
    if (enemy.recoverGuard > 0) return;
    if (!state.berserk && (enemy.freeze > 0 || enemy.stun > 0)) return;
    if (hoppingCount() >= HOPPER_JUMP_MAX) return;
    var best = null;
    for (var i = 0; i < PATH_JUMPS.length; i++) {
      var jump = PATH_JUMPS[i];
      if (enemy.dist < jump.from - 0.1 || enemy.dist > jump.from + 0.35) continue;
      if (jump.to <= enemy.dist + 2.5) continue;
      if (!best || jump.to - jump.from > best.to - best.from) best = jump;
    }
    if (!best) return;
    enemy.jumping = { from: best.from, to: best.to, t: 0, dur: 0.4 };
    enemy.jumpCd = HOPPER_JUMP_CD;
  }

  function worldX(x) { return view.originX + x * view.tile; }
  function worldY(y) { return view.originY + y * view.tile; }

  function cellHash(c, r) {
    var n = (c * 374761393 + r * 668265263) | 0;
    n = Math.imul(n ^ (n >> 13), 1274126177);
    return (n ^ (n >> 16)) >>> 0;
  }

  function lerpAngle(a, b, t) {
    var d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  function hexToRgba(hex, alpha) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function fmt(n) {
  var rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

function selectedTower() {
    if (state.selectedId == null) return null;
    for (var i = 0; i < state.towers.length; i++) {
      if (state.towers[i].id === state.selectedId) return state.towers[i];
    }
    return null;
  }

  function towerAt(c, r) {
    for (var i = 0; i < state.towers.length; i++) {
      if (state.towers[i].c === c && state.towers[i].r === r) return state.towers[i];
    }
    return null;
  }

  function isBossWave(wave) {
    if (wave <= 0) return false;
    if (state.mode === 'campaign') {
      var spec = state.stagePlan && state.stagePlan.waves[wave - 1];
      return !!(spec && spec.boss);
    }
    if (state.mode === 'infinite' || state.mode === 'custom') return wave % 10 === 0;
    return false;
  }

  function bossIndexFor(wave) {
    if (state.mode === 'campaign') return Math.max(0, (state.chapter || 1) - 1);
    return Math.max(0, Math.floor(wave / 10) - 1);
  }

  function threatWave(wave) {
    if (state.mode === 'campaign' && state.stagePlan) {
      var total = (state.stagePlan.waves && state.stagePlan.waves.length) || 12;
      var progress = (wave - 1) / Math.max(1, total - 1);
      // Wave 1 stays soft for one Lv1; from wave 2 threat jumps so a lone Lv1 cannot cruise.
      if (wave <= 1) {
        return 1 + (state.stagePlan.chapter - 1) * 0.2;
      }
      var within = 2.6 + (wave - 2) * 0.95;
      if (wave >= 5) within += (Math.min(wave, 12) - 4) * 0.4;
      if (wave > 12) within += (wave - 12) * 0.24;
      within += progress * 1.2;
      var stageRamp = Math.min(1, Math.max(0, (wave - 1) / 5));
      var stageBoost = (state.stagePlan.chapter - 1) * 0.48 + (state.stagePlan.index - 1) * 0.48 * stageRamp;
      var raw = within + stageBoost;
      // Soft-cap very high threat so late bosses do not explode while mid-run stays harsh.
      if (raw > 16) return 16 + (raw - 16) * 0.42;
      return raw;
    }
    if ((state.mode === 'infinite' || state.mode === 'custom') && wave > 30) {
      return wave + (wave - 30) * 0.18;
    }
    return wave;
  }

  function bossForWave(wave) {
    if (state.mode === 'infinite' && wave === 50) {
      return { id: 'skull', name: '骷髏王', blurb: '隕石會把塔炸暈 1 秒' };
    }
    if (!isBossWave(wave)) return null;
    if (state.mode === 'campaign' && state.chapter === 9) {
      return { id: 'skull', name: '骷髏王', blurb: '隕石暈塔，並召喚小怪' };
    }
    return BOSSES[bossIndexFor(wave) % BOSSES.length];
  }

  function rollTitanTraits() {
    var ids = [];
    for (var i = 0; i < BOSSES.length; i++) ids.push(BOSSES[i].id);
    for (var n = ids.length - 1; n > 0; n--) {
      var swap = Math.floor(Math.random() * (n + 1));
      var held = ids[n];
      ids[n] = ids[swap];
      ids[swap] = held;
    }
    return ids.slice(0, 3);
  }

  function titanBlurb(traits) {
    var names = [];
    for (var i = 0; i < traits.length; i++) {
      for (var b = 0; b < BOSSES.length; b++) {
        if (BOSSES[b].id === traits[i]) names.push(BOSSES[b].name);
      }
    }
    return names.join('、');
  }

  function planFromSpec(spec, wave) {
    var gap = Math.max(0.4, 1.05 - (wave - 1) * 0.035);
    if (wave === 1) gap = Math.max(gap, 1.35);
    else if (wave === 2) gap = 0.55;
    else if (wave === 3) gap = 0.5;
    else if (wave === 4) gap = 0.46;
    if (state.mode === 'campaign' && state.stagePlan) {
      gap = Math.max(0.32, gap - (state.stagePlan.chapter - 1) * 0.012 - Math.max(0, wave - 6) * 0.014);
    }
    var jobs = [];
    var grunts = spec.grunts;
    var swifts = spec.swifts;
    var placed = 0;
    var every = Math.max(2, Math.floor(grunts / (swifts + 1)));
    // Wave 1: no lead swift. Wave 2-4: dump swifts first so one Lv1 cannot hold.
    var lead = wave <= 1 ? 0 : Math.min(wave <= 4 ? Math.min(3, swifts) : (wave <= 7 ? 1 : 2), swifts);
    for (var leadI = 0; leadI < lead; leadI++) {
      jobs.push({ type: 'swift', gap: gap * 0.48 });
      placed += 1;
    }
    for (var i = 0; i < grunts; i++) {
      if (placed < swifts && i > 0 && i % every === 0) {
        jobs.push({ type: 'swift', gap: gap * 0.48 });
        placed += 1;
      }
      jobs.push({ type: 'grunt', gap: gap });
    }
    while (placed < swifts) {
      jobs.push({ type: 'swift', gap: gap * 0.48 });
      placed += 1;
    }
    for (var b = 0; b < spec.brutes; b++) jobs.push({ type: 'brute', gap: 1.0 });
    var hoppers = spec.hoppers || 0;
    for (var h = 0; h < hoppers; h++) jobs.push({ type: 'hopper', gap: Math.max(1.15, gap * 2.0) });
    var devils = spec.devils || 0;
    for (var d = 0; d < devils; d++) jobs.push({ type: 'devil', gap: Math.max(1.05, gap * 1.7) });
    var bones = spec.bones || 0;
    for (var bone = 0; bone < bones; bone++) jobs.push({ type: 'bone', gap: gap });
    var elite = null;
    if (spec.elite) {
      elite = chapterEliteDef();
      jobs.push({ type: 'elite', gap: 1.45 });
    }
    var boss = null;
    if (spec.boss) {
      if (state.chapter === 9) {
        boss = { id: 'skull', name: '骷髏王', blurb: '隕石暈塔，並召喚小怪' };
        jobs.push({ type: 'skull', gap: 1.7, kit: 'castle' });
      } else {
        boss = BOSSES[bossIndexFor(wave) % BOSSES.length];
        jobs.push({ type: 'boss', gap: 1.7, bossIndex: bossIndexFor(wave) });
      }
    }
    return {
      jobs: jobs,
      grunts: grunts,
      swifts: swifts,
      brutes: spec.brutes,
      hoppers: hoppers,
      devils: devils,
      bones: bones,
      elite: elite,
      boss: boss,
    };
  }

  function chapterEliteDef() {
    if (state.chapter === 9) {
      return { id: 'skull', name: '骷髏小王', blurb: '偶爾放一顆隕石，把塔炸暈一下', color: '#f4efe4' };
    }
    var boss = BOSSES[Math.max(0, (state.chapter || 1) - 1) % BOSSES.length];
    return {
      id: boss.id,
      name: boss.name.replace(/王$/, '小王'),
      blurb: boss.blurb,
      color: boss.color,
    };
  }

  function makeElite(wave) {
    var def = chapterEliteDef();
    var body = makeEnemy('grunt', wave);
    var hp = Math.round(body.maxHp * 4.2);
    body.type = 'elite';
    body.elite = true;
    body.bossId = def.id;
    body.name = def.name;
    body.ability = def.blurb;
    body.hp = hp;
    body.maxHp = hp;
    body.speed *= 0.78;
    body.baseSpeed = body.speed;
    body.gold = Math.max(6, 6 + wave * 2);
    body.radius = 0.42;
    body.leak = 2;
    body.color = def.color || body.color;
    body.shield = def.id === 'ward' ? Math.max(1, Math.round(hp * 0.1)) : 0;
    body.shieldCut = body.shield > 0 ? 1 : 0;
    body.summonTimer = 7.5;
    body.meteorTimer = 6.5;
    body.meteorCount = 1;
    body.frostTimer = 7;
    body.wardTimer = 8;
    body.mendAcc = 0;
    body.mendPower = Math.max(4, Math.round(hp * 0.06));
    body.splitHp = Math.max(1, Math.round(hp * 0.32));
    body.pulse = 0;
    return body;
  }

  var INFINITE_PROFILES = {
    normal: {
      id: 'normal', name: '普通',
      blurb: '血量與數量適中，擊殺金幣稍少。起始 100 金、20 生命。',
      hp: 1.25, growth: 1.185, speed: 1.04, speedGrow: 0.035, speedCap: 1.55,
      gold: 0.92, gap: 0.95, gapMin: 0.52, extra: 0, rush: 0.1,
      lives: 20, purse: 100, swiftFrom: 3, swiftEvery: 3, bruteEvery: 5,
    },
    hell: {
      id: 'hell', name: '地獄',
      blurb: '基礎更高。另有地獄詞綴：1–9 波隨機 1 則（半效），之後每 10 波重抽 2 則。起始 100 金、14 生命。',
      hp: 1.78, growth: 1.295, speed: 1.18, speedGrow: 0.051, speedCap: 2.05,
      gold: 0.62, gap: 0.76, gapMin: 0.38, extra: 2, rush: 0.24,
      lives: 14, purse: 100, swiftFrom: 2, swiftEvery: 2, bruteEvery: 3,
    },
  };

  var HELL_DEFFS = [
    { id: 'speed', name: '疾行', blurb: '怪移速 +10%', full: 0.10 },
    { id: 'lock', name: '鎖塔', blurb: '隨機鎖住一座塔 2 秒', full: 2 },
    { id: 'boss', name: '亂王', blurb: '每波隨機出一支王', full: 1 },
    { id: 'split', name: '分裂', blurb: '怪死後裂成兩隻 20% 血', full: 0.20 },
    { id: 'regen', name: '回血', blurb: '怪每秒回復 3% 血', full: 0.03 },
    { id: 'enrage', name: '殘暴', blurb: '怪血到 10% 時加速 15%', full: 0.15 },
    { id: 'thick', name: '厚皮', blurb: '怪血量 +50%', full: 0.50 },
  ];

  function hellModeActive() {
    return (state.mode === 'infinite' || state.mode === 'custom') && state.difficulty === 'hell';
  }

  function chapterKitById(id) {
    return CHAPTER_KITS[(id || 1) - 1] || null;
  }

  function campaignKit() {
    if (state.mode !== 'campaign') return null;
    return chapterKitById(state.chapter);
  }

  function chapterHasKit(id) {
    var kit = campaignKit();
    return !!(kit && kit.id === id);
  }

  function wheelRulesActive() {
    return hellModeActive() || chapterHasKit('wheel');
  }

  function hellDeffDef(id) {
    for (var i = 0; i < HELL_DEFFS.length; i++) {
      if (HELL_DEFFS[i].id === id) return HELL_DEFFS[i];
    }
    return null;
  }

  function hasHellDeff(id) {
    var list = state.hellDeffs || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return true;
    return false;
  }

  function hellDeffValue(id) {
    if (!hasHellDeff(id)) return 0;
    var def = hellDeffDef(id);
    if (!def) return 0;
    return state.hellDeffHalf ? def.full * 0.5 : def.full;
  }

  function pickHellDeffs(count) {
    var pool = HELL_DEFFS.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    return pool.slice(0, Math.min(count, pool.length)).map(function (item) {
      return { id: item.id, name: item.name, blurb: item.blurb };
    });
  }

  function hellDeffLabel() {
    var list = state.hellDeffs || [];
    if (!list.length) return '';
    var names = list.map(function (item) { return item.name; }).join(' · ');
    return names + (state.hellDeffHalf ? '（半效）' : '');
  }

  function syncHellDeffs(wave) {
    if (!wheelRulesActive()) {
      state.hellDeffs = [];
      state.hellDeffHalf = false;
      state.hellDeffWave = 0;
      state.hellLockCd = 0;
      return;
    }
    if (wave <= 9) {
      state.hellDeffHalf = true;
      if (state.hellDeffs && state.hellDeffs.length && state.hellDeffWave >= 1) return;
      state.hellDeffs = pickHellDeffs(1);
      state.hellDeffWave = 1;
      state.hellLockCd = 1.2;
      return;
    }
    if (wave % 10 === 0) {
      state.hellDeffHalf = false;
      if (state.hellDeffWave === wave && state.hellDeffs && state.hellDeffs.length) return;
      state.hellDeffs = pickHellDeffs(2);
      state.hellDeffWave = wave;
      state.hellLockCd = 1.2;
    }
  }

  function hellRefreshNeeded(wave) {
    if (!wheelRulesActive()) return false;
    if (wave === 1) return !(state.hellDeffs && state.hellDeffs.length && state.hellDeffWave >= 1);
    return wave >= 10 && wave % 10 === 0 && state.hellDeffWave !== wave;
  }

  function requestStartWave(n) {
    if (hellRefreshNeeded(n)) {
      openHellWheel({
        count: n <= 9 ? 1 : 2,
        half: n <= 9,
        wave: n,
        onDone: function (picks) {
          state.hellDeffs = picks;
          state.hellDeffHalf = n <= 9;
          state.hellDeffWave = n <= 9 ? 1 : n;
          state.hellLockCd = 1.2;
          startWave(n);
        },
      });
      return;
    }
    startWave(n);
  }

  function hellWheelEls() {
    return {
      root: document.getElementById('hell-wheel'),
      canvas: document.getElementById('hell-wheel-canvas'),
      kicker: document.getElementById('hell-wheel-kicker'),
      title: document.getElementById('hell-wheel-title'),
      desc: document.getElementById('hell-wheel-desc'),
      result: document.getElementById('hell-wheel-result'),
      spin: document.getElementById('hell-wheel-spin'),
      ok: document.getElementById('hell-wheel-ok'),
    };
  }

  function hellWheelNoise(i) {
    var n = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function drawHellWheelGlyph(ctx2, id, s) {
    ctx2.save();
    ctx2.strokeStyle = '#161616';
    ctx2.fillStyle = '#161616';
    ctx2.lineWidth = Math.max(2.2, s * 0.16);
    ctx2.lineCap = 'round';
    ctx2.lineJoin = 'round';
    if (id === 'speed') {
      ctx2.beginPath();
      ctx2.moveTo(-s * 0.45, -s * 0.35);
      ctx2.lineTo(s * 0.05, 0);
      ctx2.lineTo(-s * 0.45, s * 0.35);
      ctx2.moveTo(-s * 0.05, -s * 0.35);
      ctx2.lineTo(s * 0.45, 0);
      ctx2.lineTo(-s * 0.05, s * 0.35);
      ctx2.stroke();
    } else if (id === 'lock') {
      ctx2.strokeRect(-s * 0.35, -s * 0.05, s * 0.7, s * 0.55);
      ctx2.beginPath();
      ctx2.arc(0, -s * 0.05, s * 0.28, Math.PI, 0);
      ctx2.stroke();
    } else if (id === 'boss') {
      ctx2.beginPath();
      ctx2.moveTo(-s * 0.45, s * 0.15);
      ctx2.lineTo(-s * 0.3, -s * 0.4);
      ctx2.lineTo(-s * 0.05, s * 0.05);
      ctx2.lineTo(0, -s * 0.5);
      ctx2.lineTo(s * 0.05, s * 0.05);
      ctx2.lineTo(s * 0.3, -s * 0.4);
      ctx2.lineTo(s * 0.45, s * 0.15);
      ctx2.closePath();
      ctx2.stroke();
    } else if (id === 'split') {
      ctx2.beginPath();
      ctx2.arc(-s * 0.28, 0, s * 0.28, 0, Math.PI * 2);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.arc(s * 0.28, 0, s * 0.28, 0, Math.PI * 2);
      ctx2.stroke();
    } else if (id === 'regen') {
      ctx2.beginPath();
      ctx2.arc(0, 0, s * 0.38, 0.4, Math.PI * 1.7);
      ctx2.stroke();
      ctx2.beginPath();
      ctx2.moveTo(s * 0.18, -s * 0.42);
      ctx2.lineTo(s * 0.42, -s * 0.18);
      ctx2.lineTo(s * 0.08, -s * 0.12);
      ctx2.closePath();
      ctx2.fill();
    } else if (id === 'enrage') {
      ctx2.beginPath();
      ctx2.moveTo(0, -s * 0.5);
      ctx2.lineTo(s * 0.22, -s * 0.05);
      ctx2.lineTo(s * 0.08, -s * 0.05);
      ctx2.lineTo(s * 0.32, s * 0.48);
      ctx2.lineTo(-s * 0.12, s * 0.05);
      ctx2.lineTo(s * 0.02, s * 0.05);
      ctx2.closePath();
      ctx2.stroke();
    } else {
      // thick: shield
      ctx2.beginPath();
      ctx2.moveTo(0, -s * 0.48);
      ctx2.lineTo(s * 0.4, -s * 0.2);
      ctx2.lineTo(s * 0.34, s * 0.2);
      ctx2.quadraticCurveTo(0, s * 0.55, -s * 0.34, s * 0.2);
      ctx2.lineTo(-s * 0.4, -s * 0.2);
      ctx2.closePath();
      ctx2.stroke();
    }
    ctx2.restore();
  }

  function drawHellWheelFace(angle) {
    var els = hellWheelEls();
    var canvas = els.canvas;
    if (!canvas) return;
    var ctx2 = canvas.getContext('2d');
    if (!ctx2) return;
    var size = canvas.width;
    var cx = size / 2;
    var cy = size / 2;
    var r = size * 0.44;
    var hub = r * 0.22;
    var n = HELL_DEFFS.length;
    var slice = (Math.PI * 2) / n;
    var scale = size / 300;
    ctx2.clearRect(0, 0, size, size);
    ctx2.save();
    ctx2.translate(cx, cy);
    ctx2.rotate(angle || 0);
    ctx2.lineCap = 'round';
    ctx2.lineJoin = 'round';

    function inkStroke2(lw) {
      ctx2.save();
      ctx2.globalAlpha = 0.18;
      ctx2.lineWidth = lw * 1.45;
      ctx2.stroke();
      ctx2.restore();
      ctx2.lineWidth = lw;
      ctx2.stroke();
    }

    function rimPath(rr, wobAmp, seed) {
      var steps = 48;
      ctx2.beginPath();
      for (var s = 0; s <= steps; s++) {
        var a = (s / steps) * Math.PI * 2 - Math.PI / 2;
        var wob = 1 + (hellWheelNoise(seed + s) - 0.5) * wobAmp;
        var x = Math.cos(a) * rr * wob;
        var y = Math.sin(a) * rr * wob;
        if (s === 0) ctx2.moveTo(x, y);
        else ctx2.lineTo(x, y);
      }
      ctx2.closePath();
    }

    // soft outer shadow ring
    rimPath(r * 1.04, 0.018, 11);
    ctx2.fillStyle = 'rgba(22,22,22,0.06)';
    ctx2.fill();

    // pie fills (clean arcs, readable)
    for (var i = 0; i < n; i++) {
      var a0 = -Math.PI / 2 + i * slice;
      var a1 = a0 + slice;
      ctx2.beginPath();
      ctx2.moveTo(0, 0);
      ctx2.arc(0, 0, r, a0, a1);
      ctx2.closePath();
      ctx2.fillStyle = i % 2 ? '#ffffff' : '#f0f0f0';
      ctx2.fill();
    }

    // outer ink rim
    rimPath(r, 0.022, 40);
    ctx2.strokeStyle = '#161616';
    inkStroke2(3.6 * scale);

    // spokes
    for (var sp = 0; sp < n; sp++) {
      var sa = -Math.PI / 2 + sp * slice;
      var j = (hellWheelNoise(sp + 70) - 0.5) * 0.018;
      ctx2.beginPath();
      ctx2.moveTo(Math.cos(sa) * hub * 0.85, Math.sin(sa) * hub * 0.85);
      ctx2.lineTo(Math.cos(sa + j) * r * 0.98, Math.sin(sa + j) * r * 0.98);
      ctx2.strokeStyle = '#161616';
      inkStroke2(2.4 * scale);
    }

    // glyphs + labels (radial, flip left side so readable)
    for (var k = 0; k < n; k++) {
      var mid = -Math.PI / 2 + k * slice + slice / 2;
      var flip = Math.cos(mid) < -0.08;
      ctx2.save();
      ctx2.rotate(mid);
      if (flip) ctx2.rotate(Math.PI);
      var dir = flip ? -1 : 1;
      ctx2.translate(dir * r * 0.46, 0);
      drawHellWheelGlyph(ctx2, HELL_DEFFS[k].id, 14 * scale);
      ctx2.translate(dir * r * 0.2, 0);
      ctx2.font = '800 ' + Math.round(15 * scale) + 'px ' + FONT;
      ctx2.textAlign = 'center';
      ctx2.textBaseline = 'middle';
      ctx2.lineWidth = 3.5 * scale;
      ctx2.strokeStyle = 'rgba(255,255,255,0.92)';
      ctx2.fillStyle = '#161616';
      ctx2.strokeText(HELL_DEFFS[k].name, 0, 0);
      ctx2.fillText(HELL_DEFFS[k].name, 0, 0);
      ctx2.restore();
    }

    // center hub
    rimPath(hub, 0.03, 200);
    ctx2.fillStyle = '#fff';
    ctx2.fill();
    ctx2.strokeStyle = '#161616';
    inkStroke2(3.2 * scale);
    rimPath(hub * 0.55, 0.04, 230);
    ctx2.strokeStyle = '#c62828';
    inkStroke2(2.2 * scale);
    ctx2.fillStyle = '#c62828';
    ctx2.font = '800 ' + Math.round(18 * scale) + 'px ' + FONT;
    ctx2.textAlign = 'center';
    ctx2.textBaseline = 'middle';
    ctx2.fillText('獄', 0, 1 * scale);
    ctx2.restore();
  }

  function hellWheelIndexAtPointer(angle) {
    var n = HELL_DEFFS.length;
    var slice = (Math.PI * 2) / n;
    // pointer at top (-PI/2). segment i starts at -PI/2 + i*slice in wheel local space before rotation.
    // After rotating by `angle`, local angle under pointer is (-PI/2 - angle).
    var local = (-Math.PI / 2 - angle) % (Math.PI * 2);
    if (local < 0) local += Math.PI * 2;
    // map so 0 is first segment start
    var fromStart = (local + Math.PI / 2) % (Math.PI * 2);
    return Math.floor(fromStart / slice) % n;
  }

  function openHellWheel(opts) {
    opts = opts || {};
    var els = hellWheelEls();
    if (!els.root) {
      var fallback = pickHellDeffs(opts.count || 1);
      if (opts.onDone) opts.onDone(fallback);
      return;
    }
    state.paused = true;
    state.hellWheel = {
      count: opts.count || 1,
      half: !!opts.half,
      wave: opts.wave || 0,
      onDone: opts.onDone || null,
      picks: [],
      spinning: false,
      angle: 0,
      anim: null,
    };
    els.kicker.textContent = opts.half ? '地獄詞綴 · 半效' : '地獄詞綴 · 全效';
    els.title.textContent = opts.count > 1 ? '雙重命運' : '命運轉盤';
    els.desc.textContent = opts.wave
      ? ('第 ' + opts.wave + ' 波 · 點轉動抽出 ' + opts.count + ' 則詞綴')
      : ('點轉動抽出 ' + opts.count + ' 則詞綴');
    els.result.textContent = '';
    els.spin.hidden = false;
    els.spin.disabled = false;
    els.spin.textContent = '轉動';
    els.ok.hidden = true;
    els.root.hidden = false;
    els.root.classList.add('is-open');
    els.root.setAttribute('aria-hidden', 'false');
    drawHellWheelFace(0);
    Sfx.ui();
  }

  function closeHellWheel() {
    var els = hellWheelEls();
    if (els.root) {
      els.root.classList.remove('is-open');
      els.root.hidden = true;
      els.root.setAttribute('aria-hidden', 'true');
    }
    if (state.hellWheel && state.hellWheel.anim) {
      cancelAnimationFrame(state.hellWheel.anim);
      state.hellWheel.anim = null;
    }
    var done = state.hellWheel && state.hellWheel.onDone;
    var picks = (state.hellWheel && state.hellWheel.picks) ? state.hellWheel.picks.slice() : [];
    state.hellWheel = null;
    if (state.phase === 'prep') state.paused = false;
    if (done) done(picks);
  }

  function spinHellWheelOnce() {
    var wheel = state.hellWheel;
    var els = hellWheelEls();
    if (!wheel || wheel.spinning || !els.canvas) return;
    wheel.spinning = true;
    els.spin.disabled = true;
    els.result.textContent = '轉動中…';
    var targetIdx = Math.floor(Math.random() * HELL_DEFFS.length);
    // avoid duplicate when picking second
    if (wheel.picks.length) {
      var guard = 0;
      while (guard < 12 && wheel.picks.some(function (p) { return p.id === HELL_DEFFS[targetIdx].id; })) {
        targetIdx = Math.floor(Math.random() * HELL_DEFFS.length);
        guard += 1;
      }
    }
    var n = HELL_DEFFS.length;
    var slice = (Math.PI * 2) / n;
    // Want pointer on center of segment targetIdx after spin
    var centerLocal = -Math.PI / 2 + targetIdx * slice + slice / 2;
    // angle such that local under pointer equals centerLocal: -PI/2 - angle = centerLocal  => angle = -PI/2 - centerLocal
    var finalAngle = -Math.PI / 2 - centerLocal;
    var turns = 4 + Math.floor(Math.random() * 3);
    var start = wheel.angle || 0;
    // normalize so we always spin forward many turns
    while (finalAngle <= start) finalAngle += Math.PI * 2;
    finalAngle += turns * Math.PI * 2;
    var t0 = performance.now();
    var dur = 2200 + Math.random() * 600;
    function easeOut(t) {
      return 1 - Math.pow(1 - t, 3);
    }
    function frame(now) {
      if (!state.hellWheel) return;
      var u = Math.min(1, (now - t0) / dur);
      var a = start + (finalAngle - start) * easeOut(u);
      state.hellWheel.angle = a;
      drawHellWheelFace(a);
      if (u < 1) {
        state.hellWheel.anim = requestAnimationFrame(frame);
        return;
      }
      state.hellWheel.anim = null;
      state.hellWheel.spinning = false;
      state.hellWheel.angle = finalAngle;
      var landed = HELL_DEFFS[targetIdx];
      var pick = { id: landed.id, name: landed.name, blurb: landed.blurb };
      state.hellWheel.picks.push(pick);
      var label = pick.name + (state.hellWheel.half ? '（半效）' : '');
      var remain = state.hellWheel.count - state.hellWheel.picks.length;
      if (remain > 0) {
        els.result.textContent = '抽中：' + label + ' · 再轉一次（剩 ' + remain + '）';
        els.spin.disabled = false;
        els.spin.textContent = '再轉一次';
        Sfx.unlock();
      } else {
        var names = state.hellWheel.picks.map(function (p) {
          return p.name + (state.hellWheel.half ? '（半效）' : '');
        }).join(' · ');
        els.result.textContent = '本輪詞綴：' + names;
        els.spin.hidden = true;
        els.ok.hidden = false;
        Sfx.fanfare();
      }
    }
    state.hellWheel.anim = requestAnimationFrame(frame);
    Sfx.ui();
  }

  function applyHellBossDeff(plan) {
    if (!plan || !hasHellDeff('boss')) return plan;
    if (plan.boss || plan.elite) return plan;
    if (state.mode === 'campaign' && state.stagePlan && state.stagePlan.index < 5) return plan;
    var idx = Math.floor(Math.random() * BOSSES.length);
    plan.boss = BOSSES[idx];
    plan.jobs = plan.jobs ? plan.jobs.slice() : [];
    plan.jobs.splice(Math.min(2, plan.jobs.length), 0, { type: 'boss', gap: 1.2, bossIndex: idx });
    return plan;
  }

  function tickChapterKit(dt) {
    if (state.mode !== 'campaign' || state.phase !== 'combat') return;
    if (chapterHasKit('summon')) {
      state.kitSummonCd = (state.kitSummonCd == null ? 7 : state.kitSummonCd) - dt;
      if (state.kitSummonCd <= 0) {
        state.kitSummonCd = 8;
        if (state.enemies.length + state.pendingSpawns.length < 24) {
          var host = null;
          for (var i = 0; i < state.enemies.length; i++) {
            if (!state.enemies[i].dead) { host = state.enemies[i]; break; }
          }
          if (host) {
            var minion = makeEnemy('grunt', state.wave);
            minion.dist = Math.max(0, host.dist - 0.4);
            queueEnemy(minion);
            var hostPos = enemyPos(host);
            spawnFloater(hostPos.x, hostPos.y - 0.5, '召喚', '#f2c14e');
          }
        }
      }
    }
    if (chapterHasKit('frost')) {
      state.kitFrostCd = (state.kitFrostCd == null ? 6 : state.kitFrostCd) - dt;
      if (state.kitFrostCd <= 0) {
        state.kitFrostCd = 8;
        if (state.towers.length) {
          for (var t = 0; t < state.towers.length; t++) {
            state.towers[t].chill = Math.max(state.towers[t].chill || 0, 0.7);
          }
          spawnFloater(state.towers[0].c + 0.5, state.towers[0].r + 0.4, '冰封', '#9bd4ff');
        }
      }
    }
    if (chapterHasKit('mend')) {
      state.kitMendCd = (state.kitMendCd == null ? 2 : state.kitMendCd) - dt;
      if (state.kitMendCd <= 0) {
        state.kitMendCd = 2.2;
        for (var m = 0; m < state.enemies.length; m++) {
          var foe = state.enemies[m];
          if (foe.dead || foe.boss || foe.hp >= foe.maxHp) continue;
          if (healBlocked(foe)) {
            triggerPoisonCounter(foe);
            continue;
          }
          foe.hp = Math.min(foe.maxHp, foe.hp + foe.maxHp * 0.02 * healScale(foe));
        }
      }
    }
  }

  function tickHellLock(dt) {
    if (!hasHellDeff('lock') || state.phase !== 'combat') return;
    state.hellLockCd = (state.hellLockCd || 0) - dt;
    if (state.hellLockCd > 0) return;
    state.hellLockCd = 4.8;
    if (!state.towers.length) return;
    var tower = state.towers[Math.floor(Math.random() * state.towers.length)];
    var dur = Math.max(0.6, hellDeffValue('lock'));
    tower.chill = Math.max(tower.chill || 0, dur);
    var pos = { x: tower.c + 0.5, y: tower.r + 0.5 };
    spawnFloater(pos.x, pos.y - 0.55, '鎖塔', '#161616');
  }

  function applyHellSpawnStats(enemy) {
    if (!enemy || !wheelRulesActive() || enemy.skipHellStats || enemy.hellBuffed) return enemy;
    enemy.hellBuffed = true;
    var thick = hellDeffValue('thick');
    if (thick > 0) {
      enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * (1 + thick)));
      enemy.hp = enemy.maxHp;
      if (enemy.shield > 0) enemy.shield = Math.round(enemy.shield * (1 + thick));
      if (enemy.splitHp) enemy.splitHp = Math.round(enemy.splitHp * (1 + thick));
    }
    var spd = hellDeffValue('speed');
    if (spd > 0) {
      enemy.speed *= 1 + spd;
      if (enemy.baseSpeed) enemy.baseSpeed *= 1 + spd;
    }
    if (hasHellDeff('boss') && state.hellDeffHalf && enemy.boss) {
      enemy.maxHp = Math.max(1, Math.round(enemy.maxHp * 0.5));
      enemy.hp = enemy.maxHp;
      if (enemy.shield > 0) enemy.shield = Math.round(enemy.shield * 0.5);
    }
    return enemy;
  }

  function infiniteProfile() {
    return state.difficulty === 'hell' ? INFINITE_PROFILES.hell : INFINITE_PROFILES.normal;
  }

  function runProfile() {
    if (state.mode === 'infinite') return infiniteProfile();
    if (state.mode === 'custom' && state.difficulty === 'hell') return INFINITE_PROFILES.hell;
    return null;
  }

  function loadBest(id, mode) {
    var keyMode = mode || 'infinite';
    var key = (keyMode === 'custom' ? 'fantasia-td-custom-best-' : 'fantasia-td-best-') + id;
    var saved = loadNumber(key);
    if (keyMode === 'infinite' && id === 'normal' && saved <= 0) saved = loadNumber('fantasia-td-best');
    return saved;
  }

  function planInfiniteWave(wave) {
    var diff = infiniteProfile();
    var gap = Math.max(diff.gapMin, (1.05 - (wave - 1) * 0.045) * diff.gap);
    var gruntCount = 5 + wave + diff.extra + Math.floor((wave - 1) * diff.rush);
    if (wave > 30) gruntCount += 1 + Math.floor((wave - 30) / 3);
    var jobs = [];
    var swifts = 0;
    for (var i = 0; i < gruntCount; i++) {
      if (wave >= diff.swiftFrom && i > 0 && i % diff.swiftEvery === 0) {
        jobs.push({ type: 'swift', gap: gap * 0.7 });
        swifts += 1;
      }
      jobs.push({ type: 'grunt', gap: gap });
    }
    var hoppers = 0;
    if (wave >= 6) {
      hoppers = 1 + Math.floor((wave - 6) / 9);
      if (diff.id === 'hell' && wave >= 12) hoppers += 1;
      hoppers = Math.min(diff.id === 'hell' ? 3 : 2, hoppers);
      if (wave > 30) hoppers = Math.min(hoppers + 1, diff.id === 'hell' ? 4 : 3);
      for (var h = 0; h < hoppers; h++) jobs.push({ type: 'hopper', gap: Math.max(1.35, gap * 2.2) });
    }
    var devils = 0;
    if (wave >= 8) {
      devils = 1 + Math.floor((wave - 8) / 10);
      if (diff.id === 'hell' && wave >= 14) devils += 1;
      devils = Math.min(diff.id === 'hell' ? 3 : 2, devils);
      if (wave > 30) devils = Math.min(devils + 1, diff.id === 'hell' ? 4 : 3);
      for (var d = 0; d < devils; d++) jobs.push({ type: 'devil', gap: Math.max(1.2, gap * 1.8) });
    }
    var rams = 0;
    if (wave >= 40) {
      rams = 1;
      jobs.splice(Math.min(jobs.length, Math.max(2, Math.floor(jobs.length * 0.35))), 0, { type: 'ram', gap: Math.max(1.3, gap * 1.6) });
    }
    var bones = laterBoneCount(wave, diff.id === 'hell');
    for (var bone = 0; bone < bones; bone++) jobs.push({ type: 'bone', gap: Math.max(0.9, gap) });
    var brutes = 0;
    var boss = bossForWave(wave);
    if (boss) {
      if (diff.id === 'hell' && wave >= 20) {
        jobs.push({ type: 'brute', gap: 0.9 });
        brutes += 1;
      }
      var bossJob = boss.id === 'skull'
        ? { type: 'skull', gap: 1.2, kit: 'meteor' }
        : { type: 'boss', gap: 1.2, bossIndex: bossIndexFor(wave) };
      if (diff.id === 'hell') jobs.splice(Math.min(3, jobs.length), 0, bossJob);
      else jobs.push(bossJob);
    } else if (wave % diff.bruteEvery === 0) {
      var pack = 1;
      if (diff.id === 'hell' && wave >= 15) pack = 2;
      for (var b = 0; b < pack; b++) jobs.push({ type: 'brute', gap: 1.05 });
      brutes += pack;
    }
    return { jobs: jobs, grunts: gruntCount, swifts: swifts, brutes: brutes, hoppers: hoppers, devils: devils, rams: rams, bones: bones, boss: boss };
  }

  function laterBoneCount(wave, hell) {
    var start = hell ? 18 : 22;
    if (wave < start) return 0;
    return Math.min(hell ? 3 : 2, 1 + Math.floor((wave - start) / 8));
  }

  function planWave(wave) {
    if (state.mode === 'campaign' && state.stagePlan) {
      var spec = state.stagePlan.waves[wave - 1];
      if (spec) return planFromSpec(spec, wave);
    }
    if (state.mode === 'infinite' || (state.mode === 'custom' && state.difficulty === 'hell')) return planInfiniteWave(wave);
    var gap = Math.max(0.52, 0.98 - (wave - 1) * 0.042);
    var gruntCount = 6 + wave;
    if (wave > 30) gruntCount += 1 + Math.floor((wave - 30) / 3);
    var jobs = [];
    var swifts = 0;
    for (var i = 0; i < gruntCount; i++) {
      if (wave >= 3 && i > 0 && i % 3 === 0) {
        jobs.push({ type: 'swift', gap: gap * 0.72 });
        swifts += 1;
      }
      jobs.push({ type: 'grunt', gap: gap });
    }
    var hoppers = 0;
    if (wave >= 6) {
      hoppers = Math.min(2, 1 + Math.floor((wave - 6) / 10));
      if (wave > 30) hoppers = Math.min(3, hoppers + 1);
      for (var h = 0; h < hoppers; h++) jobs.push({ type: 'hopper', gap: Math.max(1.4, gap * 2.1) });
    }
    var devils = 0;
    if (wave >= 8) {
      devils = Math.min(2, 1 + Math.floor((wave - 8) / 11));
      if (wave > 30) devils = Math.min(3, devils + 1);
      for (var d = 0; d < devils; d++) jobs.push({ type: 'devil', gap: Math.max(1.25, gap * 1.85) });
    }
    var rams = 0;
    if (wave >= 40) {
      rams = 1;
      jobs.splice(Math.min(jobs.length, Math.max(2, Math.floor(jobs.length * 0.35))), 0, { type: 'ram', gap: Math.max(1.35, gap * 1.7) });
    }
    var bones = laterBoneCount(wave, false);
    for (var bone = 0; bone < bones; bone++) jobs.push({ type: 'bone', gap: Math.max(0.95, gap) });
    var brutes = 0;
    var boss = null;
    if (state.mode === 'infinite' && wave === 50) {
      jobs.push({ type: 'skull', gap: 1.7, kit: 'meteor' });
      boss = { id: 'skull', name: '骷髏王', blurb: '隕石會把塔炸暈 1 秒' };
    } else {
      boss = bossForWave(wave);
      if (boss) {
        jobs.push({ type: 'boss', gap: 1.7, bossIndex: bossIndexFor(wave) });
      } else if (wave % 5 === 0) {
        jobs.push({ type: 'brute', gap: 1.15 });
        brutes = 1;
      }
    }
    return { jobs: jobs, grunts: gruntCount, swifts: swifts, brutes: brutes, hoppers: hoppers, devils: devils, rams: rams, bones: bones, boss: boss };
  }

  function compositionText(plan) {
    if (state.mode !== 'campaign') {
      var count = plan.grunts + plan.swifts + plan.brutes + (plan.hoppers || 0) + (plan.devils || 0);
      var text = '隨機小怪 ' + count;
      if (plan.hoppers) text += ' · 跳躍 ' + plan.hoppers;
      if (plan.devils) text += ' · 惡魔 ' + plan.devils;
      if (plan.rams) text += ' · 破塔 ' + plan.rams;
      if (plan.bones) text += ' · 骷髏 ' + plan.bones;
      if (plan.brutes) text += ' · 精英 ' + plan.brutes;
      if (plan.boss) text += ' · ' + plan.boss.name;
      return text;
    }
    var pair = chapterPair(state.chapter);
    var parts = [pair[0].name + ' ' + plan.grunts];
    if (plan.swifts) parts.push(pair[1].name + ' ' + plan.swifts);
    if (plan.brutes) parts.push(pair[0].name + '精英 ' + plan.brutes);
    if (plan.hoppers) parts.push('跳躍怪 ' + plan.hoppers);
    if (plan.devils) parts.push('小惡魔 ' + plan.devils);
    if (plan.bones) parts.push('骷髏小怪 ' + plan.bones);
    if (plan.elite) parts.push(plan.elite.name);
    if (plan.boss) parts.push(plan.boss.name);
    return parts.join(' · ');
  }

  var RESISTS = {
    freeze: { name: '抗凍', color: '#2f7bff' },
    shock: { name: '抗電', color: '#e0b000' },
    burn: { name: '抗燒', color: '#e02323' },
    poison: { name: '抗毒', color: '#3cbf4a' },
    slow: { name: '抗緩', color: '#5b6cff' },
  };

  function resists(enemy, id) {
    return !!(enemy && enemy.resist === id);
  }

  function resistFloater(enemy, text) {
    if (!enemy || state.time - (enemy.resistAt || 0) < 0.7) return;
    enemy.resistAt = state.time;
    var pos = pointAt(enemy.dist);
    var info = RESISTS[enemy.resist];
    spawnFloater(pos.x, pos.y - 0.55, text, info ? info.color : '#161616');
  }

  function rollResist(wave) {
    if (state.mode !== 'infinite' && state.mode !== 'custom') return '';
    if (wave < 3) return '';
    var chance = Math.min(0.4, 0.16 + (wave - 3) * 0.02);
    if (Math.random() >= chance) return '';
    var keys = ['freeze', 'shock', 'burn', 'poison', 'slow'];
    return keys[Math.floor(Math.random() * keys.length)];
  }

  function makeEnemy(type, wave) {
    var scaledWave = threatWave(wave);
    var growth = 1.17;
    var hpMul = state.hpScale || 1;
    var speedMul = 1;
    var goldMul = 1;
    var speedGrow = 0.035;
    var speedCap = 1.45;
    var diff = runProfile();
    if (diff) {
      growth = diff.growth;
      hpMul *= diff.hp;
      speedMul = diff.speed;
      goldMul = diff.gold;
      speedGrow = diff.speedGrow;
      speedCap = diff.speedCap;
    } else if (state.mode === 'campaign') {
      growth = 1.15;
      goldMul = 0.72;
      speedMul = 1.02;
      speedGrow = 0.032;
      speedCap = 1.48;
    } else if (state.mode === 'custom') {
      growth = 1.2;
      hpMul *= 1.22;
      speedMul = 1.08;
      goldMul = 0.9;
      speedGrow = 0.038;
      speedCap = 1.55;
    }
    var baseHp = state.mode === 'campaign' ? 30 : 32;
    var gruntHp = Math.round(baseHp * Math.pow(growth, scaledWave - 1) * hpMul);
    var gruntSpeed = Math.min(speedCap, (1.0 + (scaledWave - 1) * speedGrow) * speedMul);
    var softWaveGold = wave <= 20 ? wave : Math.round(20 + (wave - 20) * 0.4);
    // Early campaign kills leave enough for an upgrade or second tower after wave 1.
    if (state.mode === 'campaign' && wave <= 3) softWaveGold = Math.max(softWaveGold, 5);
    var table = {
      grunt: { hp: gruntHp, speed: gruntSpeed, gold: Math.max(2, softWaveGold), radius: 0.3, color: '#e25b4a', leak: 1 },
      swift: { hp: Math.round(gruntHp * 0.62), speed: Math.min(diff ? speedCap + 0.45 : 2.1, gruntSpeed * 1.55), gold: Math.max(2, softWaveGold - 1), radius: 0.23, color: '#f0a202', leak: 1 },
      hopper: { hp: Math.round(gruntHp * 0.8), speed: Math.min((diff ? speedCap : 1.7) + 0.15, gruntSpeed * 1.25), gold: Math.max(3, softWaveGold + 1), radius: 0.26, color: '#4ec6e8', leak: 1 },
      devil: { hp: Math.round(gruntHp * 0.95), speed: Math.min((diff ? speedCap : 1.7) + 0.2, gruntSpeed * 1.2), gold: Math.max(4, softWaveGold + 2), radius: 0.28, color: '#c62828', leak: 1 },
      ram: { hp: Math.round(gruntHp * 2.8), speed: gruntSpeed * 0.82, gold: Math.max(5, softWaveGold + 3), radius: 0.36, color: '#5c4033', leak: 1 },
      bone: { hp: Math.round(gruntHp * 0.85), speed: gruntSpeed * 0.88, gold: Math.max(3, softWaveGold + 1), radius: 0.28, color: '#efe6d6', leak: 1 },
      brute: { hp: Math.round(gruntHp * 7.5), speed: gruntSpeed * 0.52, gold: 8 + softWaveGold * 2, radius: 0.44, color: '#8d6bff', leak: 3 },
    };
    var spec = table[type] || table.grunt;
    if (goldMul !== 1) spec.gold = Math.max(2, Math.round(spec.gold * goldMul));
    var kind = type === 'ram'
      ? { id: 'ram', name: '破塔怪', color: '#5c4033' }
      : (type === 'bone'
      ? { id: 'bone', name: '骷髏小怪', color: '#efe6d6' }
      : (type === 'hopper'
      ? { id: 'hopper', name: '跳躍怪', color: '#4ec6e8' }
      : (type === 'devil'
        ? { id: 'devil', name: '小惡魔', color: '#c62828' }
        : pickMinion(type === 'swift' ? 'swift' : 'grunt'))));
    var resist = (type === 'hopper' || type === 'devil') ? '' : rollResist(wave);
    return {
      id: state.nextId++,
      type: type,
      kind: kind.id,
      name: kind.name,
      resist: resist,
      dist: 0,
      hp: spec.hp,
      maxHp: spec.hp,
      speed: spec.speed,
      gold: spec.gold,
      radius: spec.radius,
      color: kind.color || spec.color,
      leak: spec.leak,
      dead: false,
      hitFlash: 0,
      lastNum: 0,
      jumpCd: type === 'hopper' ? 2.8 : 0,
      jumping: null,
      flying: type === 'swift',
      hexCd: type === 'devil' ? 1.6 + Math.random() * 0.8 : 0,
      ramCd: 0,
      revived: false,
      rise: 0,
    };
  }

  function makeBoss(index, wave) {
    var def = BOSSES[index % BOSSES.length];
    var scaledWave = threatWave(wave);
    var gruntHp = Math.round(34 * Math.pow(1.2, scaledWave - 1) * (state.hpScale || 1));
    var gruntSpeed = Math.min(1.55, 0.95 + (scaledWave - 1) * 0.045);
    var gold = 16 + wave * 3;
    var diff = runProfile();
    if (diff) {
      gruntHp = Math.round(34 * Math.pow(diff.growth + 0.02, scaledWave - 1) * diff.hp * (state.hpScale || 1));
      gruntSpeed = Math.min(diff.speedCap + 0.1, (0.95 + (scaledWave - 1) * (diff.speedGrow + 0.008)) * diff.speed);
      gold = Math.max(4, Math.round(gold * diff.gold));
    } else if (state.mode === 'custom') {
      gruntHp = Math.round(gruntHp * 1.15);
      gruntSpeed = Math.min(1.62, gruntSpeed * 1.06);
      gold = Math.max(4, Math.round(gold * 0.9));
    }
    var bossMul = 9.5 + Math.min(wave, 30) * 0.18 + Math.max(0, wave - 30) * 0.28;
    if (diff && diff.id === 'hell') bossMul = 5.4 + Math.min(wave, 30) * 0.1 + Math.max(0, wave - 30) * 0.16;
    var hp = Math.round(gruntHp * bossMul);
    return {
      id: state.nextId++,
      type: 'boss',
      boss: true,
      bossId: def.id,
      name: def.name,
      ability: def.blurb,
      dist: 0,
      hp: hp,
      maxHp: hp,
      speed: gruntSpeed * 0.46,
      baseSpeed: gruntSpeed * 0.46,
      gold: gold,
      radius: 0.52,
      color: def.color,
      leak: 6,
      dead: false,
      hitFlash: 0,
      lastNum: 0,
      shield: def.id === 'ward' ? Math.round(hp * 0.22) : 0,
      abilityTimer: def.id === 'summon' ? 2.4 : def.id === 'frost' ? 3.2 : def.id === 'ward' ? 7 : 0,
      enraged: false,
      mendAcc: 0,
      pulse: 0,
      splitHp: Math.round(gruntHp * 1.35),
      mendPower: Math.max(8, Math.round(gruntHp * 0.22)),
    };
  }

  function makeTitan(wave, traits) {
    var boss = makeBoss(0, wave);
    var picked = traits && traits.length ? traits.slice(0, 3) : rollTitanTraits();
    boss.bossId = 'titan';
    boss.name = '迴廊巨王';
    boss.ability = titanBlurb(picked);
    boss.traits = picked;
    boss.hp = Math.round(boss.hp * 2.6);
    boss.maxHp = boss.hp;
    boss.radius = 0.9;
    boss.leak = 8;
    boss.speed = boss.baseSpeed * 0.78;
    boss.baseSpeed = boss.speed;
    boss.color = '#1a1a1a';
    boss.shield = 0;
    boss.abilityTimer = 3.2;
    for (var i = 0; i < picked.length; i++) {
      if (picked[i] === 'ward') boss.shield = Math.round(boss.maxHp * 0.18);
    }
    return boss;
  }

  function makeSkull(wave, kit) {
    var boss = makeBoss(0, wave);
    var castle = kit === 'castle';
    boss.bossId = 'skull';
    boss.name = '骷髏王';
    boss.ability = castle ? '隕石暈塔，沿路召喚小怪' : '隕石會把塔炸暈 1 秒';
    boss.traits = castle ? ['summon'] : [];
    boss.color = '#f4efe4';
    boss.radius = castle ? 0.7 : 0.82;
    boss.shield = 0;
    boss.meteorTimer = 2.4;
    boss.meteorCount = castle ? 1 : 2;
    boss.castPose = 0;
    boss.summonTimer = 3.2;
    if (!castle) {
      boss.hp = Math.round(boss.hp * 2.2);
      boss.maxHp = boss.hp;
      boss.leak = 8;
      boss.speed = boss.baseSpeed * 0.72;
      boss.baseSpeed = boss.speed;
    }
    return boss;
  }

  function applyChapterSpawn(enemy) {
    if (!enemy || enemy.boss || enemy.kitReady) return enemy;
    enemy.kitReady = true;
    if (chapterHasKit('ward')) {
      enemy.shield = Math.max(enemy.shield || 0, Math.max(1, Math.round(enemy.maxHp * 0.12)));
      if (enemy.shieldCut == null) enemy.shieldCut = 1;
    }
    return enemy;
  }

  function queueEnemy(enemy) {
    applyHellSpawnStats(enemy);
    applyChapterSpawn(enemy);
    state.pendingSpawns.push(enemy);
  }

  function flushSpawns() {
    if (!state.pendingSpawns.length) return;
    for (var i = 0; i < state.pendingSpawns.length; i++) state.enemies.push(state.pendingSpawns[i]);
    state.pendingSpawns = [];
  }

  function markBest(wave) {
    if ((state.mode === 'infinite' || state.mode === 'custom') && runProfile() && runProfile().id === 'hell') {
      rememberScore((state.mode === 'custom' ? 'custom-' : 'infinite-') + 'hell', wave);
    }
    if (wave <= state.best) return;
    state.best = wave;
    if (state.mode === 'infinite' || state.mode === 'custom') {
      var diff = runProfile();
      var id = diff ? diff.id : 'normal';
      var key = (state.mode === 'custom' ? 'fantasia-td-custom-best-' : 'fantasia-td-best-') + id;
      saveNumber(key, wave);
      if (state.mode === 'infinite' && id === 'normal') saveNumber('fantasia-td-best', wave);
      return;
    }
    saveNumber('fantasia-td-best', wave);
  }

  var HELL_MIN_WAVE = 25;
  var BOARD_TABS = [
    { id: 'infinite-hell', label: '無限地獄' },
    { id: 'custom-hell', label: '自訂地獄' },
  ];
  var boardTab = 'infinite-hell';

  var cloudDb = null;
  var onlineBoards = {};
  var onlineRanks = {};
  var weekBests = {};
  var rankedWeek = 0;
  var rankHintShown = false;

  function currentWeekKey(ms) {
    var shifted = (ms == null ? Date.now() : ms) + 8 * 3600000;
    var day = Math.floor(shifted / 86400000);
    return day - ((day + 3) % 7);
  }

  function nextWeekStartMs() {
    return (currentWeekKey() + 7) * 86400000 - 8 * 3600000;
  }

  function weekRemainText() {
    var left = Math.max(0, nextWeekStartMs() - Date.now());
    var days = Math.floor(left / 86400000);
    var hours = Math.floor((left % 86400000) / 3600000);
    if (days > 0) return '距離週一結算還有 ' + days + ' 天 ' + hours + ' 小時';
    var mins = Math.max(1, Math.floor((left % 3600000) / 60000));
    return '距離週一結算還有 ' + hours + ' 小時 ' + mins + ' 分';
  }

  function ensureWeek() {
    var week = currentWeekKey();
    if (rankedWeek === week) return week;
    var rolled = rankedWeek !== 0;
    rankedWeek = week;
    if (!rolled) return week;
    onlineBoards = {};
    onlineRanks = {};
    weekBests = {};
    paintPlayerCard();
    if (cloudReady()) refreshAllBoards();
    return week;
  }

  function profileRank(person) {
    if (!person || Number(person.rankWeek) !== currentWeekKey()) return 0;
    return Number(person.hellRank) || 0;
  }

  function cloudReady() {
    var cfg = window.FIREBASE_CONFIG;
    return !!(cfg && cfg.apiKey && cfg.projectId && window.firebase && firebase.auth && firebase.firestore);
  }

  function loadAccount() {
    try {
      var raw = JSON.parse(localStorage.getItem('symbols-td-account') || 'null');
      if (!(raw && raw.uid && raw.name)) return null;
      return raw;
    } catch (error) {
      return null;
    }
  }

  function saveAccount(account) {
    try { localStorage.setItem('symbols-td-account', JSON.stringify(account)); } catch (error) { /* ignore */ }
  }

  var FRIEND_ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function makeFriendId() {
    var id = '';
    for (var i = 0; i < 6; i++) {
      id += FRIEND_ID_ALPHABET.charAt(Math.floor(Math.random() * FRIEND_ID_ALPHABET.length));
    }
    return id;
  }

  function validFriendId(id) {
    return /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(String(id || ''));
  }

  function normalizeFriendId(raw) {
    return String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function keptFriendId(uid) {
    var prev = null;
    try { prev = JSON.parse(localStorage.getItem('symbols-td-account') || 'null'); } catch (error) { prev = null; }
    if (prev && prev.uid === uid && validFriendId(prev.friendId)) return prev.friendId;
    // 不要在新裝置亂生 ID；等雲端 users/{uid}.friendId 還原
    return '';
  }

  function clearAccount() {
    try { localStorage.removeItem('symbols-td-account'); } catch (error) { /* ignore */ }
    state.stars = loadStars();
  }

  function guestLabel() {
    var name = '';
    try { name = localStorage.getItem('symbols-td-guest-name') || ''; } catch (error) { name = ''; }
    name = String(name).trim().slice(0, 24);
    if (name) return name;
    name = '訪客' + String(Math.floor(1000 + Math.random() * 9000));
    try { localStorage.setItem('symbols-td-guest-name', name); } catch (error) { /* ignore */ }
    return name;
  }

  function playerName() {
    var account = loadAccount();
    if (account && account.name) return String(account.name).trim().slice(0, 24) || '玩家';
    return '玩家';
  }

  function sortScores(rows) {
    rows.sort(function (a, b) {
      if (b.wave !== a.wave) return b.wave - a.wave;
      return String(a.name).localeCompare(String(b.name));
    });
    return rows;
  }

  function rankInRows(rows, index) {
    var wave = rows[index].wave || 0;
    if (wave >= HELL_MIN_WAVE) return index + 1;
    var qualified = 0;
    var unqualifiedBefore = 0;
    for (var i = 0; i < rows.length; i++) {
      if ((rows[i].wave || 0) >= HELL_MIN_WAVE) qualified += 1;
      else if (i < index) unqualifiedBefore += 1;
    }
    return Math.max(11, qualified + 1) + unqualifiedBefore;
  }

  function scoreRow(account, wave) {
    return {
      uid: account.uid,
      name: String((account && account.name) || '玩家').trim().slice(0, 24) || '玩家',
      picture: profilePicture(account),
      frame: frameUnlocked(account && account.frame) ? account.frame : '',
      title: titleUnlocked(account && account.title) ? account.title : '',
      wave: Math.floor(Number(wave) || 0),
    };
  }

  function applyCloudBest(boardId, wave) {
    wave = Math.floor(Number(wave) || 0);
    if (!(wave > 0)) return;
    var mode = boardId.indexOf('custom-') === 0 ? 'custom' : 'infinite';
    var diff = boardId.indexOf('-hell') >= 0 ? 'hell' : 'normal';
    var key = (mode === 'custom' ? 'fantasia-td-custom-best-' : 'fantasia-td-best-') + diff;
    if (wave > loadNumber(key)) saveNumber(key, wave);
    if (mode === 'infinite' && diff === 'normal' && wave > loadNumber('fantasia-td-best')) {
      saveNumber('fantasia-td-best', wave);
    }
    if ((state.mode === 'infinite' || state.mode === 'custom') && runProfile() && runProfile().id === diff) {
      if (wave > state.best) state.best = wave;
    }
  }

  function paintLocalBoardCard() {
    var account = loadAccount();
    if (!account) return;
    var card = scoreRow(account, 0);
    for (var id in onlineBoards) {
      var rows = onlineBoards[id];
      if (!rows) continue;
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].uid !== account.uid) continue;
        rows[i].name = card.name;
        rows[i].picture = card.picture;
        rows[i].frame = card.frame;
        rows[i].title = card.title;
      }
    }
  }

  function updateBoardCard() {
    if (!cloudReady() || !cloudDb) return;
    var account = loadAccount();
    if (!account || String(account.uid).indexOf('guest-') === 0) return;
    var week = ensureWeek();
    var card = scoreRow(account, 0);
    delete card.wave;
    delete card.uid;
    BOARD_TABS.forEach(function (tab) {
      if (String(tab.id).indexOf('-hell') < 0) return;
      var ref = cloudDb.collection('boards').doc(tab.id).collection('weeks').doc(String(week)).collection('entries').doc(account.uid);
      ref.get().then(function (snap) {
        if (!snap.exists) return null;
        return ref.set(card, { merge: true });
      }).catch(function () {});
    });
  }

  function bumpCachedScore(boardId, account, wave) {
    if (!onlineBoards[boardId]) return;
    var rows = onlineBoards[boardId].slice();
    var found = false;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].uid !== account.uid) continue;
      found = true;
      if (wave > rows[i].wave) rows[i] = scoreRow(account, wave);
    }
    if (!found) rows.push(scoreRow(account, wave));
    onlineBoards[boardId] = sortScores(rows).slice(0, 20);
    for (var n = 0; n < onlineBoards[boardId].length; n++) {
      if (onlineBoards[boardId][n].uid !== account.uid) continue;
      onlineRanks[boardId] = rankInRows(onlineBoards[boardId], n);
    }
  }

  function refreshBoard(boardId) {
    if (!cloudReady() || !cloudDb) return Promise.resolve();
    var week = ensureWeek();
    var col = cloudDb.collection('boards').doc(boardId).collection('weeks').doc(String(week)).collection('entries');
    var account = loadAccount();
    return col.orderBy('wave', 'desc').limit(20).get().then(function (snap) {
      var rows = [];
      snap.forEach(function (doc) {
        var data = doc.data() || {};
        rows.push({
          uid: doc.id,
          name: data.name || '玩家',
          wave: Number(data.wave) || 0,
          picture: data.picture || '',
          frame: data.frame || '',
          title: data.title || '',
        });
      });
      onlineBoards[boardId] = rows;
      if (!account) {
        onlineRanks[boardId] = 0;
        return null;
      }
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].uid !== account.uid) continue;
        onlineRanks[boardId] = rankInRows(rows, i);
        applyCloudBest(boardId, rows[i].wave);
        weekBests[boardId] = { week: week, wave: Math.max((weekBests[boardId] && weekBests[boardId].week === week ? weekBests[boardId].wave : 0), rows[i].wave) };
        return null;
      }
      return col.doc(account.uid).get().then(function (mine) {
        if (!mine.exists) {
          onlineRanks[boardId] = 0;
          return null;
        }
        var mineWave = Number((mine.data() || {}).wave) || 0;
        applyCloudBest(boardId, mineWave);
        weekBests[boardId] = { week: week, wave: Math.max((weekBests[boardId] && weekBests[boardId].week === week ? weekBests[boardId].wave : 0), mineWave) };
        if (mineWave >= HELL_MIN_WAVE) {
          return col.where('wave', '>', mineWave).count().get().then(function (countSnap) {
            onlineRanks[boardId] = (countSnap.data().count || 0) + 1;
          });
        }
        return Promise.all([
          col.where('wave', '>=', HELL_MIN_WAVE).count().get(),
          col.where('wave', '>', mineWave).count().get(),
        ]).then(function (snaps) {
          var qualified = snaps[0].data().count || 0;
          var above = snaps[1].data().count || 0;
          onlineRanks[boardId] = Math.max(11, qualified + 1) + Math.max(0, above - qualified);
        });
      });
    }).catch(function () {
      if (!onlineBoards[boardId]) onlineBoards[boardId] = [];
    }).then(function () {
      paintPlayerCard();
      publishProfile();
    });
  }

  function refreshAllBoards() {
    var jobs = [];
    for (var i = 0; i < BOARD_TABS.length; i++) jobs.push(refreshBoard(BOARD_TABS[i].id));
    return Promise.all(jobs).then(function () {
      pushLocalBoardBests();
      if (screenBoard && !screenBoard.hidden) renderBoard();
    });
  }

  // 登入後把本機地獄最遠波次補上雲端（修寫入失敗留下的落差）
  function pushLocalBoardBests() {
    if (!cloudReady()) return;
    var account = loadAccount();
    if (!account || String(account.uid).indexOf('guest-') === 0) return;
    var infiniteHell = loadBest('hell', 'infinite');
    var customHell = loadBest('hell', 'custom');
    if (infiniteHell > 0) rememberScore('infinite-hell', infiniteHell);
    if (customHell > 0) rememberScore('custom-hell', customHell);
  }

  function rememberScore(boardId, wave) {
    wave = Math.floor(Number(wave) || 0);
    if (!(wave > 0)) return;
    if (String(boardId).indexOf('-hell') < 0) return;
    if (!cloudReady()) return;
    var account = loadAccount();
    if (!account || String(account.uid).indexOf('guest-') === 0) {
      if (!account && !rankHintShown) {
        rankHintShown = true;
        toast('用 Google 登入後，成績才會計入線上排行');
      }
      return;
    }
    var week = ensureWeek();
    var cached = weekBests[boardId];
    if (cached && cached.week === week && wave <= cached.wave) return;
    bumpCachedScore(boardId, account, wave);
    var ref = cloudDb.collection('boards').doc(boardId).collection('weeks').doc(String(week)).collection('entries').doc(account.uid);
    ref.get().then(function (snap) {
      if (currentWeekKey() !== week) return null;
      var prev = snap.exists && snap.data() ? Number(snap.data().wave) || 0 : 0;
      if (wave <= prev) {
        weekBests[boardId] = { week: week, wave: prev };
        applyCloudBest(boardId, prev);
        return null;
      }
      var row = scoreRow(account, wave);
      row.updated = firebase.firestore.FieldValue.serverTimestamp();
      return ref.set(row).then(function () {
        weekBests[boardId] = { week: week, wave: wave };
        applyCloudBest(boardId, wave);
      });
    }).then(function () {
      return refreshBoard(boardId);
    }).catch(function (error) {
      // 失敗時清掉快取，下次登入／破波還能再試
      if (weekBests[boardId] && weekBests[boardId].week === week && weekBests[boardId].wave === wave) {
        delete weekBests[boardId];
      }
      console.warn('board score failed', error && error.code, error && error.message);
      toast(error && error.code === 'permission-denied' ? '排行寫入被拒，請更新 Firestore 規則' : '成績沒送到線上');
    });
  }

  function boardRank(boardId) {
    return onlineRanks[boardId] || 0;
  }

  function bestPlayerRank() {
    return hellRank();
  }

  function hellRank() {
    ensureWeek();
    var infinite = onlineRanks['infinite-hell'] || 0;
    var custom = onlineRanks['custom-hell'] || 0;
    if (!infinite) return custom;
    if (!custom) return infinite;
    return Math.min(infinite, custom);
  }

  function auraForRank(rank) {
    if (rank === 1) return 'diamond';
    if (rank >= 2 && rank <= 5) return 'special';
    if (rank >= 6 && rank <= 10) return 'ordinary';
    return '';
  }

  function rankTitle(rank) {
    if (rank === 1) return { id: 'diamond', name: '鑽石' };
    if (rank >= 2 && rank <= 3) return { id: 'gold', name: '黃金' };
    if (rank >= 4 && rank <= 5) return { id: 'silver', name: '白銀' };
    if (rank >= 6 && rank <= 10) return { id: 'bronze', name: '青銅' };
    return null;
  }

  function rankEpithet(rank) {
    if (rank === 1) return '絕對王者';
    if (rank === 2) return '不滅霸主';
    if (rank === 3) return '災厄之主';
    if (rank >= 4 && rank <= 5) return '白銀';
    if (rank >= 6 && rank <= 10) return '青銅';
    return '';
  }

  function paintNamed(el, name, rank, chosenId, trusted) {
    if (!el) return;
    el.classList.add('name-line');
    el.replaceChildren();
    var text = document.createElement('span');
    text.className = 'name-text';
    text.textContent = name || '玩家';
    el.appendChild(text);
    var epithet = rankEpithet(rank);
    if (epithet) {
      var tag = document.createElement('span');
      tag.className = 'name-epithet is-' + rank;
      tag.textContent = epithet;
      el.appendChild(tag);
    }
    var chosen = titleById(chosenId);
    if (!chosen || chosen.name === epithet) return;
    if (!trusted && !titleUnlocked(chosenId)) return;
    var extra = document.createElement('span');
    extra.className = 'name-epithet is-chosen';
    extra.textContent = chosen.name;
    el.appendChild(extra);
  }

  function rankHeroUnlocked(id) {
    var rank = hellRank();
    if (id === 'god') return rank >= 1 && rank <= 3;
    if (id === 'herald') return rank >= 4 && rank <= 10;
    return true;
  }

  function fillMedal(node, rank) {
    if (!node) return;
    var title = rankTitle(rank);
    node.hidden = !title;
    node.className = 'card-medal' + (title ? ' is-' + title.id : '');
    var label = node.querySelector('.card-medal-name');
    if (label) label.textContent = title ? title.name : '';
  }

  function profileBest() {
    var items = [
      { label: '無限普通', wave: loadBest('normal', 'infinite') },
      { label: '無限地獄', wave: loadBest('hell', 'infinite') },
      { label: '自訂普通', wave: loadBest('normal', 'custom') },
      { label: '自訂地獄', wave: loadBest('hell', 'custom') },
    ];
    var account = loadAccount();
    if (account) {
      for (var t = 0; t < BOARD_TABS.length; t++) {
        var rows = onlineBoards[BOARD_TABS[t].id] || [];
        for (var i = 0; i < rows.length; i++) {
          if (rows[i].uid === account.uid) items.push({ label: BOARD_TABS[t].label, wave: rows[i].wave || 0 });
        }
      }
    }
    var best = { label: '', wave: 0 };
    for (var n = 0; n < items.length; n++) {
      if (items[n].wave > best.wave) best = items[n];
    }
    return best;
  }

  var AVATARS = [
    { id: 'slime', name: '史萊姆' },
    { id: 'ghost', name: '幽靈' },
    { id: 'frog', name: '青蛙' },
    { id: 'skull', name: '骷髏' },
    { id: 'shroom', name: '蘑菇' },
    { id: 'gear', name: '齒輪' },
    { id: 'gem', name: '晶石' },
    { id: 'eye', name: '眼石' },
    { id: 'trophy', name: '獎盃', lock: 'rank' },
    { id: 'clear', name: '全通關', lock: 'clear' },
  ];

  function allChaptersCleared() {
    for (var id = 1; id <= 8; id++) {
      if ((state.stars[id + '-5'] || 0) < 1) return false;
    }
    return true;
  }

  function avatarUnlocked(id) {
    if (id === 'trophy') {
      var rank = hellRank();
      return rank >= 1 && rank <= 10;
    }
    if (id === 'clear') return allChaptersCleared();
    return !!id;
  }

  function avatarLockText(id) {
    if (id === 'trophy') return '本週名次';
    if (id === 'clear') return '八章全過';
    return '';
  }

  function shownAvatar(account) {
    if (!account || !account.avatar || !avatarUnlocked(account.avatar)) return '';
    return account.avatar;
  }

  function avatarIdFromPicture(picture) {
    var text = String(picture || '');
    if (text.indexOf('doodle:') !== 0) return '';
    return text.slice(7);
  }

  function profilePicture(account) {
    return 'doodle:' + (shownAvatar(account) || 'slime');
  }

  function avatarById(id) {
    for (var i = 0; i < AVATARS.length; i++) if (AVATARS[i].id === id) return AVATARS[i];
    return null;
  }

  function boardAvatarId(picture, name) {
    var doodle = avatarIdFromPicture(picture);
    if (doodle && avatarById(doodle)) return doodle;
    var free = ['slime', 'ghost', 'frog', 'skull', 'shroom', 'gear', 'gem', 'eye'];
    var text = String(name || '玩家');
    var hash = 0;
    for (var i = 0; i < text.length; i++) hash = (hash + text.charCodeAt(i) * (i + 1)) % free.length;
    return free[hash];
  }

  function avatarDot(x, y, r) {
    ctx.beginPath();
    ctx.fillStyle = '#161616';
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function avatarInk(s) {
    inkSeed = Math.round(s * 17 + 5);
    inkSetup(Math.max(2, s * 0.11));
    ctx.strokeStyle = '#161616';
    ctx.fillStyle = '#fff';
  }

  function avatarSmile(s, y) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.16, y);
    ctx.quadraticCurveTo(0, y + s * 0.22, s * 0.18, y - s * 0.02);
    inkStroke();
  }

  function drawAvatarMark(id, s) {
    avatarInk(s);
    if (id === 'ghost') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, s * 0.42);
      ctx.quadraticCurveTo(-s * 0.78, -s * 0.2, 0, -s * 0.62);
      ctx.quadraticCurveTo(s * 0.78, -s * 0.15, s * 0.55, s * 0.4);
      ctx.quadraticCurveTo(s * 0.28, s * 0.1, s * 0.02, s * 0.5);
      ctx.quadraticCurveTo(-s * 0.22, s * 0.12, -s * 0.55, s * 0.42);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      avatarDot(-s * 0.16, -s * 0.08, s * 0.07);
      avatarDot(s * 0.16, -s * 0.08, s * 0.07);
      ctx.beginPath();
      ctx.arc(0, s * 0.08, s * 0.1, 0.2, Math.PI - 0.2);
      inkStroke();
      return;
    }
    if (id === 'frog') {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.55);
      ctx.quadraticCurveTo(-s * 0.55, s * 0.32, -s * 0.68, 0);
      ctx.quadraticCurveTo(-s * 0.88, -s * 0.22, -s * 0.38, -s * 0.2);
      ctx.quadraticCurveTo(-s * 0.52, -s * 0.72, -s * 0.1, -s * 0.28);
      ctx.quadraticCurveTo(0, -s * 0.08, s * 0.1, -s * 0.28);
      ctx.quadraticCurveTo(s * 0.52, -s * 0.72, s * 0.38, -s * 0.2);
      ctx.quadraticCurveTo(s * 0.88, -s * 0.18, s * 0.66, s * 0.04);
      ctx.quadraticCurveTo(s * 0.48, s * 0.38, 0, s * 0.55);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      avatarDot(-s * 0.22, -s * 0.32, s * 0.06);
      avatarDot(s * 0.22, -s * 0.32, s * 0.06);
      avatarSmile(s, s * 0.08);
      return;
    }
    if (id === 'skull') {
      inkCircle(0, -s * 0.02, s * 0.58, 14);
      ctx.fill();
      inkStroke();
      ctx.fillStyle = '#161616';
      inkCircle(-s * 0.2, -s * 0.08, s * 0.12, 8);
      ctx.fill();
      inkCircle(s * 0.2, -s * 0.08, s * 0.12, 8);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, s * 0.02);
      ctx.lineTo(-s * 0.06, s * 0.16);
      ctx.lineTo(s * 0.06, s * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, s * 0.28);
      ctx.quadraticCurveTo(0, s * 0.42, s * 0.22, s * 0.28);
      ctx.lineTo(s * 0.18, s * 0.48);
      ctx.lineTo(s * 0.06, s * 0.36);
      ctx.lineTo(0, s * 0.5);
      ctx.lineTo(-s * 0.06, s * 0.36);
      ctx.lineTo(-s * 0.18, s * 0.48);
      ctx.closePath();
      ctx.fillStyle = '#fff';
      ctx.fill();
      inkStroke();
      return;
    }
    if (id === 'shroom') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.18, s * 0.02);
      ctx.quadraticCurveTo(-s * 0.28, s * 0.55, 0, s * 0.62);
      ctx.quadraticCurveTo(s * 0.26, s * 0.55, s * 0.16, 0);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.62, s * 0.02);
      ctx.quadraticCurveTo(-s * 0.72, -s * 0.68, s * 0.02, -s * 0.58);
      ctx.quadraticCurveTo(s * 0.78, -s * 0.48, s * 0.58, s * 0.06);
      ctx.quadraticCurveTo(0, s * 0.2, -s * 0.62, s * 0.02);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      avatarDot(-s * 0.22, -s * 0.18, s * 0.07);
      avatarDot(s * 0.16, -s * 0.28, s * 0.06);
      avatarSmile(s * 0.7, s * 0.28);
      return;
    }
    if (id === 'gear') {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var a0 = -Math.PI / 2 + i * Math.PI / 3;
        var a1 = a0 + Math.PI / 6;
        var a2 = a0 + Math.PI / 3;
        var reach = s * (0.7 + inkJitter(i + 2, 0.06));
        var x0 = Math.cos(a0) * s * 0.4;
        var y0 = Math.sin(a0) * s * 0.4;
        if (i === 0) ctx.moveTo(x0, y0);
        else ctx.lineTo(x0, y0);
        ctx.quadraticCurveTo(Math.cos(a1) * reach, Math.sin(a1) * reach, Math.cos(a2) * s * 0.4, Math.sin(a2) * s * 0.4);
      }
      ctx.closePath();
      ctx.fill();
      inkStroke();
      avatarDot(-s * 0.12, -s * 0.04, s * 0.06);
      avatarDot(s * 0.12, -s * 0.04, s * 0.06);
      avatarSmile(s * 0.8, s * 0.1);
      return;
    }
    if (id === 'gem') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.62);
      ctx.quadraticCurveTo(-s * 0.7, -s * 0.2, -s * 0.42, s * 0.28);
      ctx.quadraticCurveTo(-s * 0.15, s * 0.72, s * 0.08, s * 0.48);
      ctx.quadraticCurveTo(s * 0.62, s * 0.15, s * 0.4, -s * 0.22);
      ctx.quadraticCurveTo(s * 0.15, -s * 0.78, -s * 0.08, -s * 0.62);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.02, -s * 0.4);
      ctx.quadraticCurveTo(s * 0.12, -s * 0.05, -s * 0.04, s * 0.22);
      inkStroke();
      avatarDot(-s * 0.12, s * 0.02, s * 0.05);
      avatarDot(s * 0.12, -s * 0.02, s * 0.05);
      return;
    }
    if (id === 'eye') {
      inkCircle(0, s * 0.06, s * 0.62, 14);
      ctx.fill();
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.36, s * 0.02);
      ctx.quadraticCurveTo(0, -s * 0.36, s * 0.36, s * 0.02);
      ctx.quadraticCurveTo(0, s * 0.32, -s * 0.36, s * 0.02);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      avatarDot(s * 0.04, s * 0.02, s * 0.1);
      avatarSmile(s, s * 0.32);
      return;
    }
    if (id === 'trophy') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, -s * 0.48);
      ctx.quadraticCurveTo(-s * 0.4, s * 0.02, -s * 0.1, s * 0.12);
      ctx.lineTo(s * 0.1, s * 0.12);
      ctx.quadraticCurveTo(s * 0.4, s * 0.02, s * 0.28, -s * 0.48);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.26, -s * 0.32);
      ctx.quadraticCurveTo(-s * 0.58, -s * 0.12, -s * 0.24, s * 0.02);
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.26, -s * 0.32);
      ctx.quadraticCurveTo(s * 0.58, -s * 0.12, s * 0.24, s * 0.02);
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, s * 0.12);
      ctx.lineTo(-s * 0.12, s * 0.32);
      ctx.lineTo(s * 0.12, s * 0.32);
      ctx.lineTo(s * 0.08, s * 0.12);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.34, s * 0.3);
      ctx.quadraticCurveTo(0, s * 0.4, s * 0.34, s * 0.3);
      ctx.lineTo(s * 0.3, s * 0.48);
      ctx.quadraticCurveTo(0, s * 0.58, -s * 0.3, s * 0.48);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      return;
    }
    if (id === 'clear') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, -s * 0.08);
      ctx.lineTo(-s * 0.34, -s * 0.58);
      ctx.lineTo(-s * 0.02, -s * 0.22);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.12, -s * 0.08);
      ctx.lineTo(s * 0.34, -s * 0.58);
      ctx.lineTo(s * 0.02, -s * 0.22);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      inkCircle(0, s * 0.16, s * 0.4, 14);
      ctx.fill();
      inkStroke();
      avatarDot(-s * 0.12, s * 0.1, s * 0.05);
      avatarDot(s * 0.12, s * 0.1, s * 0.05);
      avatarSmile(s * 0.75, s * 0.24);
      return;
    }
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, s * 0.12);
    ctx.quadraticCurveTo(-s * 0.9, -s * 0.32, -s * 0.15, -s * 0.52);
    ctx.quadraticCurveTo(s * 0.12, -s * 0.78, s * 0.5, -s * 0.28);
    ctx.quadraticCurveTo(s * 0.92, s * 0.08, s * 0.45, s * 0.42);
    ctx.quadraticCurveTo(0, s * 0.7, -s * 0.4, s * 0.45);
    ctx.quadraticCurveTo(-s * 0.75, s * 0.4, -s * 0.7, s * 0.12);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    avatarDot(-s * 0.16, -s * 0.02, s * 0.07);
    avatarDot(s * 0.2, s * 0.02, s * 0.07);
    avatarSmile(s, s * 0.2);
  }

  function centerAvatarPixels(g, canvas) {
    var w = canvas.width;
    var h = canvas.height;
    var data = g.getImageData(0, 0, w, h);
    var px = data.data;
    var minX = w;
    var minY = h;
    var maxX = -1;
    var maxY = -1;
    for (var y = 0; y < h; y++) {
      var row = y * w * 4;
      for (var x = 0; x < w; x++) {
        if (px[row + x * 4 + 3] < 20) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0) return;
    var dx = Math.round(w / 2 - (minX + maxX + 1) / 2);
    var dy = Math.round(h / 2 - (minY + maxY + 1) / 2);
    if (!dx && !dy) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.putImageData(data, dx, dy);
  }

  function paintAvatarCanvas(canvas, id) {
    if (!canvas) return;
    var g = canvas.getContext('2d');
    if (!g) return;
    var prev = ctx;
    ctx = g;
    try {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.translate(canvas.width / 2, canvas.height / 2);
      drawAvatarMark(id || 'slime', canvas.width * 0.34);
      centerAvatarPixels(g, canvas);
    } finally {
      ctx = prev;
    }
  }

  function avatarCanvas(id) {
    var face = document.createElement('canvas');
    face.width = 64;
    face.height = 64;
    paintAvatarCanvas(face, id);
    return face;
  }


  function paintAvatarSlot(img, canvas, letter, account) {
    var avatar = account ? (shownAvatar(account) || 'slime') : '';
    if (avatar && canvas) {
      paintAvatarCanvas(canvas, avatar);
      canvas.hidden = false;
      if (img) img.hidden = true;
      if (letter) letter.hidden = true;
      return;
    }
    if (canvas) canvas.hidden = true;
    if (img) img.hidden = true;
    if (letter) {
      letter.hidden = false;
      letter.textContent = account ? String(account.name || '?').slice(0, 1) : '?';
    }
  }

  var profileEditTab = 'face';
  var profilePick = null;

  function ensureProfilePick(account) {
    if (profilePick) return profilePick;
    profilePick = {
      avatar: account && account.avatar && avatarUnlocked(account.avatar) ? account.avatar : 'slime',
      frame: account && frameUnlocked(account.frame) ? account.frame : '',
      title: account && titleUnlocked(account.title) ? account.title : '',
    };
    return profilePick;
  }

  var CARD_FRAMES = [
    { id: 'vine', chapter: 1, name: '藤蔓' },
    { id: 'lava', chapter: 2, name: '熔岩' },
    { id: 'bone', chapter: 3, name: '碎骨' },
    { id: 'crystal', chapter: 4, name: '晶礦' },
    { id: 'poison', chapter: 5, name: '劇毒' },
    { id: 'cult', chapter: 6, name: '邪教' },
    { id: 'frost', chapter: 7, name: '冰霜' },
    { id: 'scrap', chapter: 8, name: '廢鐵' },
    { id: 'all', chapter: 0, name: '全通關' },
  ];

  function chapterFullStars(id) {
    for (var s = 1; s <= 5; s++) {
      if (starCount(state.stars[id + '-' + s] || 0) < 3) return false;
    }
    return true;
  }

  function frameById(id) {
    for (var i = 0; i < CARD_FRAMES.length; i++) if (CARD_FRAMES[i].id === id) return CARD_FRAMES[i];
    return null;
  }

  function frameUnlocked(id) {
    var frame = frameById(id);
    if (!frame) return false;
    if (frame.id === 'all') return allChaptersCleared();
    return chapterFullStars(frame.chapter);
  }

  function frameClass(id) {
    return frameUnlocked(id) ? (' card-frame is-' + id) : '';
  }

  function loadDeeds() {
    try {
      var key = deedsStorageKey();
      var raw = JSON.parse(localStorage.getItem(key) || 'null');
      if ((!raw || typeof raw !== 'object' || Array.isArray(raw)) && key !== 'symbols-td-deeds') {
        raw = JSON.parse(localStorage.getItem('symbols-td-deeds') || '{}');
      }
      return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    } catch (error) { return {}; }
  }

  function saveDeeds(deeds) {
    try { localStorage.setItem(deedsStorageKey(), JSON.stringify(deeds || {})); } catch (error) { /* ignore */ }
    queueCloudProgressPush();
  }

  function mergeStarMaps(a, b) {
    var out = {};
    function eat(map) {
      if (!map || typeof map !== 'object') return;
      var keys = Object.keys(map);
      for (var i = 0; i < keys.length; i++) {
        var id = keys[i];
        out[id] = (out[id] || 0) | (map[id] | 0);
      }
    }
    eat(a);
    eat(b);
    return out;
  }

  function sanitizeStarMap(map) {
    var out = {};
    if (!map || typeof map !== 'object') return out;
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      var n = map[keys[i]] | 0;
      if (n > 0) out[keys[i]] = n;
    }
    return out;
  }

  function sanitizeDeedsMap(map) {
    var out = {};
    if (!map || typeof map !== 'object' || Array.isArray(map)) return out;
    var keys = Object.keys(map);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = map[k];
      if (typeof v === 'boolean') out[k] = v;
      else if (typeof v === 'number' && isFinite(v)) out[k] = Math.floor(v);
    }
    return out;
  }

  function mergeDeedsMaps(a, b) {
    var left = a && typeof a === 'object' ? a : {};
    var right = b && typeof b === 'object' ? b : {};
    var out = {};
    var keys = {};
    Object.keys(left).forEach(function (k) { keys[k] = 1; });
    Object.keys(right).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      var lv = left[k];
      var rv = right[k];
      if (typeof lv === 'number' || typeof rv === 'number') out[k] = Math.max(lv || 0, rv || 0);
      else if (typeof lv === 'boolean' || typeof rv === 'boolean') out[k] = !!(lv || rv);
      else out[k] = rv != null ? rv : lv;
    });
    return sanitizeDeedsMap(out);
  }

  var progressPushTimer = 0;
  var progressPullBusy = false;
  var progressSyncBound = false;

  function queueCloudProgressPush() {
    if (progressPushTimer) clearTimeout(progressPushTimer);
    progressPushTimer = setTimeout(function () {
      progressPushTimer = 0;
      pushCloudProgress();
    }, 450);
  }

  function buildUserCloudPayload(account, stars, deeds) {
    var best = profileBest();
    return {
      name: String((account && account.name) || '玩家').trim().slice(0, 24) || '玩家',
      picture: profilePicture(account),
      frame: String((account && account.frame) || ''),
      title: String((account && account.title) || ''),
      bestLabel: String(best.label || '').slice(0, 24),
      bestWave: Math.floor(Number(best.wave) || 0),
      hellRank: Math.floor(Number(hellRank()) || 0),
      rankWeek: Math.floor(Number(currentWeekKey()) || 0),
      guest: !!(account && account.guest),
      friendId: (account && account.friendId) || '',
      stars: sanitizeStarMap(stars != null ? stars : state.stars),
      deeds: sanitizeDeedsMap(deeds != null ? deeds : loadDeeds()),
      progressAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
  }

  function applyCloudProfile(account, data, mergedStars) {
    if (!account || !data) return account;
    var prevStars = state.stars;
    state.stars = mergedStars || prevStars;
    var cloudAvatar = avatarIdFromPicture(data.picture);
    if (cloudAvatar && avatarById(cloudAvatar) && avatarUnlocked(cloudAvatar)) {
      if (!account.avatar || !avatarUnlocked(account.avatar)) account.avatar = cloudAvatar;
    }
    var cloudFrame = data.frame || '';
    if (cloudFrame && frameUnlocked(cloudFrame)) account.frame = cloudFrame;
    else if (account.frame && !frameUnlocked(account.frame)) account.frame = '';
    var cloudTitle = data.title || '';
    if (cloudTitle && titleUnlocked(cloudTitle)) account.title = cloudTitle;
    else if (account.title && !titleUnlocked(account.title)) account.title = '';
    if (!account.nameCustom && data.name) {
      account.name = String(data.name).trim().slice(0, 24) || account.name;
    }
    if (account.frame && !frameUnlocked(account.frame)) account.frame = '';
    if (account.title && !titleUnlocked(account.title)) account.title = '';
    state.stars = prevStars;
    return account;
  }

  // 讀雲端 → 合併星星／成就／名片 → 寫回；失敗會提示
  function syncUserProgressDoc(account) {
    var latest = loadAccount() || account;
    if (!validFriendId(latest.friendId)) return Promise.resolve(null);
    var ref = cloudDb.collection('users').doc(latest.uid);
    var localStars = mergeStarMaps(state.stars, loadStars());
    var localDeeds = loadDeeds();
    return ref.get().then(function (doc) {
      var data = doc.exists ? (doc.data() || {}) : {};
      if (validFriendId(data.friendId) && data.friendId !== latest.friendId) {
        latest.friendId = data.friendId;
      }
      var mergedStars = sanitizeStarMap(mergeStarMaps(localStars, data.stars || {}));
      var mergedDeeds = mergeDeedsMaps(localDeeds, data.deeds || {});
      latest = applyCloudProfile(latest, data, mergedStars);
      // 解鎖檢查用合併後星星
      var prevStars = state.stars;
      state.stars = mergedStars;
      if (latest.frame && !frameUnlocked(latest.frame)) latest.frame = '';
      if (latest.title && !titleUnlocked(latest.title)) latest.title = '';
      if (latest.avatar && !avatarUnlocked(latest.avatar)) latest.avatar = '';
      var payload = buildUserCloudPayload(latest, mergedStars, mergedDeeds);
      state.stars = prevStars;
      if (!validFriendId(payload.friendId)) return null;
      saveAccount(latest);
      return ref.set(payload, { merge: true }).then(function () {
        state.stars = mergedStars;
        try { localStorage.setItem(starsStorageKey(), JSON.stringify(mergedStars || {})); } catch (error) { /* ignore */ }
        try { localStorage.setItem(deedsStorageKey(), JSON.stringify(mergedDeeds || {})); } catch (error) { /* ignore */ }
        return {
          stars: mergedStars,
          deeds: mergedDeeds,
          friendId: payload.friendId,
          starCount: Object.keys(mergedStars).length,
        };
      });
    });
  }

  function reportCloudProgressError(error) {
    console.warn('cloud progress failed', error && error.code, error && error.message);
    var code = error && error.code;
    if (code === 'permission-denied') toast('進度同步被拒絕，請再發布一次 Firestore 規則');
    else if (code) toast('進度同步失敗：' + code);
  }

  function pushCloudProgress() {
    if (!cloudReady() || !cloudDb) return Promise.resolve();
    var account = loadAccount();
    if (!account || !progressAccountUid()) return Promise.resolve();
    return claimFriendId(account).then(function () {
      return syncUserProgressDoc(loadAccount() || account);
    }).catch(reportCloudProgressError);
  }

  function pullCloudProgress(opts) {
    opts = opts || {};
    if (!cloudReady() || !cloudDb) return Promise.resolve();
    var account = loadAccount();
    if (!account || !progressAccountUid()) return Promise.resolve();
    if (progressPullBusy) return Promise.resolve();
    progressPullBusy = true;
    state.stars = loadStars();
    var beforeSum = starSum();
    var beforeId = account.friendId || '';
    return claimFriendId(account).then(function () {
      return syncUserProgressDoc(loadAccount() || account).then(function (merged) {
        if (screenMenu && !screenMenu.hidden) paintPlayHome();
        paintAccount();
        renderFriendCode();
        if (!opts.toast || !merged) return;
        if (starSum() > beforeSum) toast('已同步關卡進度');
        else if (validFriendId(merged.friendId) && merged.friendId !== beforeId) toast('已對齊帳號 ID');
      });
    }).catch(reportCloudProgressError).then(function () {
      progressPullBusy = false;
    });
  }

  function bindAccountProgress() {
    state.stars = loadStars();
    if (!progressSyncBound) {
      progressSyncBound = true;
      window.addEventListener('focus', function () {
        if (progressAccountUid()) pullCloudProgress({ toast: false });
      });
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden && progressAccountUid()) pullCloudProgress({ toast: false });
      });
    }
    return pullCloudProgress({ toast: true });
  }

  function renderFriendCode() {
    var account = loadAccount();
    var codeEl = document.getElementById('friend-code');
    if (codeEl) {
      codeEl.textContent = account && validFriendId(account.friendId)
        ? ('你的 ID　' + account.friendId)
        : (account ? 'ID 同步中…' : '登入後才有 ID。');
    }
    var idEl = document.getElementById('player-card-id');
    if (idEl && account) {
      idEl.hidden = false;
      idEl.textContent = validFriendId(account.friendId)
        ? ('ID　' + account.friendId)
        : 'ID 同步中…';
    }
  }

  function castleCleared() {
    return (state.stars['9-5'] || 0) >= 1;
  }

  var TITLES = [
    { id: 'corridor', name: '無限迴廊之主', hint: '無限模式打過第 50 波骷髏王', ok: function (d) { return !!d.corridor; } },
    { id: 'starmap', name: '滿天星斗', hint: '累積拿到 45 顆星星', ok: function () { return starSum() >= 45; } },
    { id: 'castle', name: '魔王城征服者', hint: '打通 9-5', ok: function () { return castleCleared(); } },
    { id: 'overload', name: '運算超載', hint: '無限或自訂打到第 40 波', ok: function (d) { return (d.infiniteWave || 0) >= 40 || (d.customWave || 0) >= 40; } },
    { id: 'wheel', name: '地獄轉輪手', hint: '地獄模式打到第 10 波', ok: function (d) { return (d.hellWave || 0) >= 10; } },
    { id: 'demolish', name: '防線拆遷辦主任', hint: '累積賣掉 15 座塔', ok: function (d) { return (d.sells || 0) >= 15; } },
    { id: 'micro', name: '微操天花板', hint: '首領關無傷通關', ok: function (d) { return !!d.flawlessBoss; } },
    { id: 'godpush', name: '全知全能的推塔者', hint: '本週地獄榜進過前 3', ok: function (d) { return !!d.godpush; } },
    { id: 'affix', name: '詞綴虐待狂', hint: '地獄模式打到第 20 波', ok: function (d) { return (d.hellWave || 0) >= 20; } },
    { id: 'wraith', name: '第 26 波的亡靈', hint: '地獄模式打到第 26 波', ok: function (d) { return (d.hellWave || 0) >= 26; } },
    { id: 'symbol', name: '符號魔法師', hint: '一關同時放上毒火冰雷', ok: function (d) { return !!d.allElements; } },
    { id: 'geo', name: '幾何陣列大師', hint: '一關放滿 8 座塔並通關', ok: function (d) { return !!d.geo; } },
    { id: 'overflow', name: '火力溢出專家', hint: '把一座塔升到 10 等', ok: function (d) { return !!d.overflow; } },
    { id: 'nexus', name: '完美交匯點', hint: '四種屬性塔都至少 3 等並通關', ok: function (d) { return !!d.nexus; } },
    { id: 'pure', name: '純粹符號學家', hint: '只用一種屬性塔通關', ok: function (d) { return !!d.pure; } },
    { id: 'pierce', name: '全圖貫通', hint: '無限或自訂打到第 30 波', ok: function (d) { return (d.infiniteWave || 0) >= 30 || (d.customWave || 0) >= 30; } },
    { id: 'builder', name: '終極防線構築者', hint: '八章首領都打過', ok: function () { return allChaptersCleared(); } },
    { id: 'steward', name: '精打細算大掌櫃', hint: '有產錢塔、不賣塔、受傷不超過 5 並通關', ok: function (d) { return !!d.steward; } },
    { id: 'interest', name: '利息滾動永動機', hint: '用過 3 次利息卡', ok: function (d) { return (d.interest || 0) >= 3; } },
    { id: 'rich', name: '暴富防禦者', hint: '手上同時有 1000 金', ok: function (d) { return !!d.rich; } },
    { id: 'blood', name: '極限扣血流', hint: '剩 3 點生命以內通關', ok: function (d) { return !!d.lowLife; } },
    { id: 'wreck', name: '路過的拆塔專家', hint: '同一局賣掉 6 座塔', ok: function (d) { return !!d.wreck; } },
    { id: 'panic', name: '手忙腳亂指揮官', hint: '自訂模式改過一次路', ok: function (d) { return !!d.edit; } },
    { id: 'drop', name: '差一滴血大師', hint: '剩 1 點生命通關', ok: function (d) { return !!d.oneLife; } },
    { id: 'victim', name: '隨機命運受害者', hint: '地獄模式打到第 15 波', ok: function (d) { return (d.hellWave || 0) >= 15; } },
    { id: 'idle', name: '摸魚防禦理事長', hint: '只用無屬塔和產錢塔通關', ok: function (d) { return !!d.idle; } },
    { id: 'luck', name: '通關靠賽，快樂常在', hint: '作戰模式通關 3 次', ok: function (d) { return (d.clears || 0) >= 3; } },
  ];

  function titleById(id) {
    for (var i = 0; i < TITLES.length; i++) if (TITLES[i].id === id) return TITLES[i];
    return null;
  }

  function titleUnlocked(id) {
    var title = titleById(id);
    return !!(title && title.ok(loadDeeds()));
  }

  function unlockedTitleIds() {
    var deeds = loadDeeds();
    var ids = [];
    for (var i = 0; i < TITLES.length; i++) if (TITLES[i].ok(deeds)) ids.push(TITLES[i].id);
    return ids;
  }

  function noteNewTitles(before) {
    var after = unlockedTitleIds();
    for (var i = 0; i < after.length; i++) {
      if (before.indexOf(after[i]) >= 0) continue;
      var title = titleById(after[i]);
      if (title) toast('獲得稱號　' + title.name);
    }
  }

  function recordRunDeeds() {
    var before = unlockedTitleIds();
    var deeds = loadDeeds();
    if (state.mode === 'infinite') deeds.infiniteWave = Math.max(deeds.infiniteWave || 0, state.wave || 0);
    if (state.mode === 'custom') deeds.customWave = Math.max(deeds.customWave || 0, state.wave || 0);
    if (hellModeActive()) deeds.hellWave = Math.max(deeds.hellWave || 0, state.wave || 0);
    if (state.mode === 'infinite' && state.wave >= 50 && state.phase !== 'gameover') deeds.corridor = true;
    if (state.gold >= 1000) deeds.rich = true;
    var rank = hellRank();
    if (rank >= 1 && rank <= 3) deeds.godpush = true;
    for (var towerIndex = 0; towerIndex < state.towers.length; towerIndex++) {
      if (state.towers[towerIndex].level + 1 >= 10) deeds.overflow = true;
    }
    if ((state.soldRun || 0) >= 6) deeds.wreck = true;
    if (state.mode === 'campaign' && state.wave >= state.levelWaves) {
      deeds.clears = (deeds.clears || 0) + 1;
      if (state.lives === 1) deeds.oneLife = true;
      if (state.lives > 0 && state.lives <= 3) deeds.lowLife = true;
      if (state.stagePlan && state.stagePlan.index === 5 && state.lifeLost <= 0 && !state.reviveUsed) deeds.flawlessBoss = true;
      var types = {};
      var field = 0;
      var elementLevels = { poison: 0, fire: 0, ice: 0, bolt: 0 };
      for (var i = 0; i < state.towers.length; i++) {
        var tower = state.towers[i];
        types[tower.type] = (types[tower.type] || 0) + 1;
        if (tower.type !== 'hero' && tower.type !== 'smith') field += 1;
        if (elementLevels[tower.type] != null) elementLevels[tower.type] = Math.max(elementLevels[tower.type], tower.level + 1);
        if (tower.level + 1 >= 10) deeds.overflow = true;
      }
      var elements = ['poison', 'fire', 'ice', 'bolt'];
      var used = 0;
      var nexus = true;
      for (var e = 0; e < elements.length; e++) {
        if (types[elements[e]]) used += 1;
        if (elementLevels[elements[e]] < 3) nexus = false;
      }
      if (used === 4) deeds.allElements = true;
      if (used === 4 && nexus) deeds.nexus = true;
      if (used === 1 && !types.hero) deeds.pure = true;
      if (!used && !types.hero && types.basic) deeds.idle = true;
      if (field >= 8) deeds.geo = true;
      if (types.mint && !state.soldAny && state.lifeLost <= 5 && !state.reviveUsed) deeds.steward = true;
      if ((state.soldRun || 0) >= 6) deeds.wreck = true;
    }
    saveDeeds(deeds);
    noteNewTitles(before);
  }

  function renderProfileEditor() {
    var list = document.getElementById('modal-notes');
    if (!list) return;
    var draftName = list.querySelector('#profile-name');
    var account = loadAccount();
    var pick = ensureProfilePick(account);
    var keptName = draftName ? draftName.value : (account ? account.name : '');
    list.replaceChildren();
    list.hidden = false;
    var label = document.createElement('label');
    label.className = 'profile-name';
    label.appendChild(document.createTextNode('名字'));
    var input = document.createElement('input');
    input.id = 'profile-name';
    input.maxLength = 12;
    input.value = keptName;
    label.appendChild(input);
    list.appendChild(label);
    var tabs = document.createElement('div');
    tabs.className = 'profile-tabs';
    [['face', '頭像'], ['frame', '框'], ['title', '稱號']].forEach(function (pair) {
      var tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'profile-tab' + (profileEditTab === pair[0] ? ' is-on' : '');
      tab.textContent = pair[1];
      tab.addEventListener('click', function () {
        profileEditTab = pair[0];
        renderProfileEditor();
      });
      tabs.appendChild(tab);
    });
    list.appendChild(tabs);
    if (profileEditTab === 'frame') list.appendChild(renderFramePicks(pick));
    else if (profileEditTab === 'title') list.appendChild(renderTitlePicks(pick));
    else list.appendChild(renderAvatarPicks(pick));
  }

  function renderAvatarPicks(pick) {
    var grid = document.createElement('div');
    grid.className = 'avatar-grid';
    var current = pick.avatar && avatarUnlocked(pick.avatar) ? pick.avatar : 'slime';
    AVATARS.forEach(function (item) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'avatar-pick' + (item.id === current ? ' is-on' : '');
      btn.setAttribute('data-avatar', item.id);
      var open = avatarUnlocked(item.id);
      if (!open) btn.classList.add('is-locked');
      var face = avatarCanvas(item.id);
      var caption = document.createElement('small');
      caption.textContent = open ? item.name : avatarLockText(item.id);
      btn.appendChild(face);
      btn.appendChild(caption);
      btn.addEventListener('click', function () {
        if (!avatarUnlocked(item.id)) {
          toast(item.id === 'trophy' ? '本週進前 10 名才有獎盃頭像' : '八章首領都過關才有這個頭像');
          return;
        }
        var picks = grid.querySelectorAll('.avatar-pick');
        for (var i = 0; i < picks.length; i++) picks[i].classList.remove('is-on');
        selectPick(grid, '.avatar-pick', btn);
        pick.avatar = item.id;
      });
      grid.appendChild(btn);
    });
    return grid;
  }

  function renderFramePicks(pick) {
    var grid = document.createElement('div');
    grid.className = 'frame-grid';
    var current = pick.frame && frameUnlocked(pick.frame) ? pick.frame : '';
    var none = document.createElement('button');
    none.type = 'button';
    none.className = 'frame-pick' + (current ? '' : ' is-on');
    none.setAttribute('data-frame', '');
    none.textContent = '無框';
    none.addEventListener('click', function () { selectPick(grid, '.frame-pick', none); pick.frame = ''; });
    grid.appendChild(none);
    CARD_FRAMES.forEach(function (frame) {
      var btn = document.createElement('button');
      btn.type = 'button';
      var open = frameUnlocked(frame.id);
      btn.className = 'frame-pick card-frame is-' + frame.id + (frame.id === current ? ' is-on' : '') + (open ? '' : ' is-locked');
      btn.setAttribute('data-frame', frame.id);
      var caption = document.createElement('small');
      caption.textContent = frame.name;
      btn.appendChild(caption);
      btn.addEventListener('click', function () {
        if (!open) {
          toast(frame.id === 'all' ? '八章首領都過關才有這個框' : '這一章五關都三星才有這個框');
          return;
        }
        selectPick(grid, '.frame-pick', btn);
        pick.frame = frame.id;
      });
      grid.appendChild(btn);
    });
    return grid;
  }

  function renderTitlePicks(pick) {
    var wrap = document.createElement('div');
    wrap.className = 'title-list';
    var current = pick.title && titleUnlocked(pick.title) ? pick.title : '';
    var none = document.createElement('button');
    none.type = 'button';
    none.className = 'title-pick' + (current ? '' : ' is-on');
    none.setAttribute('data-title', '');
    none.textContent = '不顯示自選稱號';
    none.addEventListener('click', function () { selectPick(wrap, '.title-pick', none); pick.title = ''; });
    wrap.appendChild(none);
    TITLES.forEach(function (title) {
      var open = title.ok(loadDeeds());
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'title-pick' + (title.id === current ? ' is-on' : '') + (open ? '' : ' is-locked');
      btn.setAttribute('data-title', title.id);
      var name = document.createElement('b');
      name.textContent = title.name;
      var hint = document.createElement('small');
      hint.textContent = title.hint;
      btn.appendChild(name);
      btn.appendChild(hint);
      btn.addEventListener('click', function () {
        if (!open) { toast(title.hint); return; }
        selectPick(wrap, '.title-pick', btn);
        pick.title = title.id;
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function selectPick(root, selector, btn) {
    var picks = root.querySelectorAll(selector);
    for (var i = 0; i < picks.length; i++) picks[i].classList.remove('is-on');
    btn.classList.add('is-on');
  }

  function saveProfileCard() {
    var account = loadAccount();
    if (!account) return;
    var input = document.getElementById('profile-name');
    var name = String(input && input.value || '').trim().slice(0, 12);
    if (!name) { toast('名字不能是空的'); return; }
    var pick = profilePick || {};
    var avatar = pick.avatar || 'slime';
    var frame = pick.frame || '';
    var title = pick.title || '';
    if (avatar && !avatarUnlocked(avatar)) { toast('這個頭像還不能用'); return; }
    if (frame && !frameUnlocked(frame)) { toast('這個框還不能用'); return; }
    if (title && !titleUnlocked(title)) { toast('這個稱號還不能用'); return; }
    account.name = name;
    account.nameCustom = true;
    account.avatar = avatar || 'slime';
    account.frame = frame;
    account.title = title;
    saveAccount(account);
    paintLocalBoardCard();
    paintAccount();
    publishProfile();
    updateBoardCard();
    closeModal();
    toast('名片已更新');
  }

  function applyCardFrame(el, id, trusted) {
    if (!el) return;
    el.classList.remove('card-frame');
    for (var i = 0; i < CARD_FRAMES.length; i++) el.classList.remove('is-' + CARD_FRAMES[i].id);
    if (!id || !frameById(id)) return;
    if (!trusted && !frameUnlocked(id)) return;
    el.classList.add('card-frame', 'is-' + id);
  }

  function noteRankDeed() {
    var rank = hellRank();
    if (rank < 1 || rank > 3) return;
    var deeds = loadDeeds();
    if (deeds.godpush) return;
    var before = unlockedTitleIds();
    deeds.godpush = true;
    saveDeeds(deeds);
    noteNewTitles(before);
  }

  function paintPlayerCard() {
    var card = document.getElementById('player-card');
    if (!card) return;
    var account = loadAccount();
    var nameEl = document.getElementById('player-card-name');
    var bestEl = document.getElementById('player-card-best');
    var rankEl = document.getElementById('player-card-rank');
    var img = document.getElementById('player-avatar-img');
    var letter = document.getElementById('player-avatar-letter');
    var rank = hellRank();
    var aura = account ? auraForRank(rank) : '';
    var title = account ? rankTitle(rank) : null;
    card.classList.toggle('is-diamond', aura === 'diamond');
    card.classList.toggle('is-special', aura === 'special');
    card.classList.toggle('is-ordinary', aura === 'ordinary');
    applyCardFrame(card, account ? account.frame : '', false);
    fillMedal(document.getElementById('player-medal'), account ? rank : 0);
    var idEl = document.getElementById('player-card-id');
    if (!account) {
      if (nameEl) nameEl.textContent = '尚未登入';
      if (idEl) idEl.hidden = true;
      if (bestEl) bestEl.textContent = '登入後才有名片';
      if (rankEl) rankEl.textContent = '第 11 名起沒有稱號';
      if (img) img.hidden = true;
      var emptyFace = document.getElementById('player-avatar-doodle');
      if (emptyFace) emptyFace.hidden = true;
      if (letter) { letter.hidden = false; letter.textContent = '?'; }
      return;
    }
    paintNamed(nameEl, account.name, rank, account.title);
    noteRankDeed();
    if (idEl) {
      idEl.hidden = false;
      idEl.textContent = validFriendId(account.friendId)
        ? ('ID　' + account.friendId)
        : 'ID 同步中…';
    }
    var best = profileBest();
    if (bestEl) bestEl.textContent = best.wave > 0 ? ('最高 ' + best.label + ' 第 ' + best.wave + ' 波') : '還沒有紀錄';
    if (rankEl) {
      rankEl.textContent = !rank
        ? '本週還沒有名次'
        : title
          ? ('本週地獄榜第 ' + rank + ' · ' + title.name)
          : ('本週地獄榜第 ' + rank + ' · 無稱號');
    }
    paintAvatarSlot(img, document.getElementById('player-avatar-doodle'), letter, account);
  }

  function openAuraPreview() {
    state.phase = 'menu';
    hideStoryScreens();
    if (screenAura) screenAura.hidden = false;
  }

  function openFriends() {
    state.phase = 'menu';
    hideStoryScreens();
    if (screenFriends) screenFriends.hidden = false;
    renderFriends();
  }

  function friendAuraClass(rank) {
    var aura = auraForRank(rank || 0);
    if (aura === 'diamond') return ' is-diamond';
    if (aura === 'special') return ' is-special';
    if (aura === 'ordinary') return ' is-ordinary';
    return '';
  }

  function appendFriendCard(listEl, person) {
    var item = document.createElement('li');
    var shown = profileRank(person);
    item.className = 'friend-card' + friendAuraClass(shown);
    if (person.frame && frameById(person.frame)) item.classList.add('card-frame', 'is-' + person.frame);
    var fx = document.createElement('span');
    fx.className = 'card-fx';
    fx.setAttribute('aria-hidden', 'true');
    item.appendChild(fx);
    var avatar = document.createElement('span');
    avatar.className = 'player-avatar';
    var doodleId = avatarIdFromPicture(person.picture);
    if (doodleId) {
      avatar.appendChild(avatarCanvas(doodleId));
    } else if (person.picture) {
      var photo = document.createElement('img');
      photo.alt = '';
      photo.src = person.picture;
      avatar.appendChild(photo);
    } else {
      avatar.textContent = String(person.name || '?').slice(0, 1);
    }
    var copy = document.createElement('div');
    var name = document.createElement('strong');
    paintNamed(name, person.name || '玩家', shown, person.title, true);
    var best = document.createElement('p');
    best.textContent = person.bestWave > 0 ? ('最高 ' + (person.bestLabel || '紀錄') + ' 第 ' + person.bestWave + ' 波') : '還沒有紀錄';
    var title = rankTitle(shown);
    var rank = document.createElement('p');
    rank.textContent = title ? ('本週' + title.name) : '本週無稱號';
    copy.appendChild(name);
    copy.appendChild(best);
    copy.appendChild(rank);
    var medal = document.createElement('span');
    medal.className = 'card-medal';
    medal.innerHTML = '<span class="card-medal-gem" aria-hidden="true"></span><span class="card-medal-name"></span>';
    fillMedal(medal, shown);
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'friend-remove';
    remove.textContent = '移除';
    remove.addEventListener('click', function () { removeFriend(person.uid); });
    item.appendChild(avatar);
    item.appendChild(copy);
    if (!medal.hidden) item.appendChild(medal);
    item.appendChild(remove);
    listEl.appendChild(item);
  }

  function renderFriends() {
    var codeEl = document.getElementById('friend-code');
    var listEl = document.getElementById('friend-list');
    if (!listEl) return;
    var account = loadAccount();
    renderFriendCode();
    listEl.replaceChildren();
    if (!account) {
      var need = document.createElement('p');
      need.className = 'board-empty';
      need.textContent = '請先用 Google 或訪客登入。';
      listEl.appendChild(need);
      return;
    }
    if (!cloudReady() || !cloudDb || String(account.uid).indexOf('guest-') === 0) {
      var offline = document.createElement('p');
      offline.className = 'board-empty';
      offline.textContent = '線上帳號接上後才能加好友，並看到對方的名片。';
      listEl.appendChild(offline);
      return;
    }
    if (!validFriendId(account.friendId)) {
      var waiting = document.createElement('p');
      waiting.className = 'board-empty';
      waiting.textContent = '正在對齊帳號 ID…';
      listEl.appendChild(waiting);
      pullCloudProgress({ toast: false }).then(function () { renderFriends(); });
      return;
    }
    var loading = document.createElement('p');
    loading.className = 'board-empty';
    loading.textContent = '正在讀取好友…';
    listEl.appendChild(loading);
    cloudDb.collection('users').doc(account.uid).collection('friends').get().then(function (snap) {
      var ids = [];
      snap.forEach(function (doc) { ids.push(doc.id); });
      if (!ids.length) {
        listEl.replaceChildren();
        var empty = document.createElement('p');
        empty.className = 'board-empty';
        empty.textContent = '還沒有好友。把 ID 給對方，或貼上對方的 ID。';
        listEl.appendChild(empty);
        return null;
      }
      return Promise.all(ids.map(function (id) {
        return cloudDb.collection('users').doc(id).get().then(function (userDoc) {
          var data = userDoc.exists ? userDoc.data() : { name: '找不到這位玩家' };
          data.uid = id;
          return data;
        });
      }));
    }).then(function (people) {
      if (!people || screenFriends.hidden) return;
      listEl.replaceChildren();
      people.forEach(function (person) { appendFriendCard(listEl, person); });
    }).catch(function () {
      listEl.replaceChildren();
      var failed = document.createElement('p');
      failed.className = 'board-empty';
      failed.textContent = '好友名單讀不到。';
      listEl.appendChild(failed);
    });
  }

  function addFriend() {
    var account = loadAccount();
    var input = document.getElementById('friend-code-input');
    var code = normalizeFriendId(input ? input.value : '');
    if (!account) { toast('請先登入'); return; }
    if (!cloudReady() || String(account.uid).indexOf('guest-') === 0) { toast('線上帳號還沒接上'); return; }
    if (!validFriendId(code) || code === account.friendId) { toast('請輸入別人的 ID'); return; }
    cloudDb.collection('handles').doc(code).get().then(function (handle) {
      var friendUid = handle.exists && handle.data() ? handle.data().uid : '';
      if (!friendUid || friendUid === account.uid) {
        toast('找不到這個 ID');
        return false;
      }
      return cloudDb.collection('users').doc(account.uid).collection('friends').doc(friendUid).set({ uid: friendUid }).then(function () {
        return true;
      });
    }).then(function (ok) {
      if (!ok) return;
      if (input) input.value = '';
      toast('已加上好友');
      renderFriends();
    }).catch(function () { toast('加好友失敗'); });
  }

  function removeFriend(friendUid) {
    var account = loadAccount();
    if (!account || !cloudReady() || !friendUid) return;
    cloudDb.collection('users').doc(account.uid).collection('friends').doc(friendUid).delete().then(function () {
      toast('已移除好友');
      renderFriends();
    }).catch(function () { toast('移除失敗'); });
  }

  function copyFriendCode() {
    var account = loadAccount();
    if (!account) { toast('請先登入'); return; }
    var code = account.friendId || '';
    if (!code) { toast('還沒有 ID'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(function () { toast('已複製 ID'); }).catch(function () { toast(code); });
      return;
    }
    toast(code);
  }

  function publishProfile() {
    if (!cloudReady() || !cloudDb) return;
    var account = loadAccount();
    if (!account || !progressAccountUid()) return;
    pushCloudProgress().then(function () { renderFriendCode(); });
  }

  function claimFriendId(account, left) {
    if (!cloudReady() || !cloudDb || !account || !progressAccountUid()) return Promise.resolve(account);
    if (left == null) left = 8;
    if (!left) return Promise.resolve(account);
    return cloudDb.collection('users').doc(account.uid).get().then(function (userDoc) {
      var data = userDoc.exists ? (userDoc.data() || {}) : {};
      if (validFriendId(data.friendId)) {
        account.friendId = data.friendId;
        saveAccount(account);
      } else if (!validFriendId(account.friendId)) {
        account.friendId = makeFriendId();
        saveAccount(account);
      }
      var handle = cloudDb.collection('handles').doc(account.friendId);
      return handle.get().then(function (doc) {
        if (doc.exists && doc.data() && doc.data().uid === account.uid) return account;
        if (doc.exists) {
          // 雲端名片已指定此 ID 但 handle 被佔用：另開新碼
          if (validFriendId(data.friendId) && data.friendId === account.friendId) {
            account.friendId = makeFriendId();
            saveAccount(account);
            return claimFriendId(account, left - 1);
          }
          account.friendId = makeFriendId();
          saveAccount(account);
          return claimFriendId(account, left - 1);
        }
        return handle.set({ uid: account.uid }).then(function () { return account; });
      });
    });
  }

  function renderBoard() {
    var tabs = document.getElementById('board-tabs');
    var listEl = document.getElementById('board-list');
    if (!tabs || !listEl) return;
    tabs.replaceChildren();
    BOARD_TABS.forEach(function (tab) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'board-tab' + (tab.id === boardTab ? ' is-on' : '');
      btn.textContent = tab.label;
      btn.addEventListener('click', function () {
        boardTab = tab.id;
        renderBoard();
        refreshBoard(tab.id).then(function () {
          if (screenBoard && !screenBoard.hidden && boardTab === tab.id) renderBoard();
        });
      });
      tabs.appendChild(btn);
    });
    var rows = onlineBoards[boardTab];
    var account = loadAccount();
    listEl.replaceChildren();
    if (!cloudReady()) {
      var offline = document.createElement('p');
      offline.className = 'board-empty';
      offline.textContent = '線上排行還沒接上。把 Firebase 設定貼進 firebase-config.js 後，成績才會記到帳號。';
      listEl.appendChild(offline);
    } else if (!rows) {
      var loading = document.createElement('p');
      loading.className = 'board-empty';
      loading.textContent = '正在讀取線上排行…';
      listEl.appendChild(loading);
    } else if (!rows.length) {
      var empty = document.createElement('p');
      empty.className = 'board-empty';
      empty.textContent = account ? '本週地獄榜還沒有紀錄。' : '先用 Google 或訪客登入，成績才會記在你的帳號上。';
      listEl.appendChild(empty);
    } else {
    rows.forEach(function (row, index) {
      var item = document.createElement('li');
      item.className = 'board-row' + (account && row.uid === account.uid ? ' is-me' : '');
      var place = rankInRows(rows, index);
      var picture = row.picture || '';
      var frameId = row.frame || '';
      var chosen = row.title || '';
      if (account && row.uid === account.uid) {
        var mine = scoreRow(account, row.wave);
        picture = mine.picture || picture;
        if (!frameId) frameId = mine.frame;
        if (!chosen) chosen = mine.title;
      }
      if (frameId && frameById(frameId)) item.classList.add('card-frame', 'is-' + frameId);
      var rank = document.createElement('span');
      rank.className = 'board-rank';
      rank.textContent = String(place);
      var face = document.createElement('span');
      face.className = 'board-face';
      face.appendChild(avatarCanvas(boardAvatarId(picture, row.name)));
      var who = document.createElement('span');
      paintNamed(who, row.name, place, chosen, true);
      var wave = document.createElement('span');
      wave.className = 'board-wave';
      wave.textContent = '第 ' + row.wave + ' 波';
      item.appendChild(rank);
      item.appendChild(face);
      item.appendChild(who);
      item.appendChild(wave);
      listEl.appendChild(item);
    });
    }
    if (cloudReady()) {
      var note = document.createElement('p');
      note.className = 'board-empty';
      var rankNow = bestPlayerRank();
      note.textContent = weekRemainText() + '。' + (rankNow ? ('你本週最好名次是第 ' + rankNow + '。') : '本週還沒上榜。下週沒有名次，光環和稱號會消失。');
      listEl.appendChild(note);
    }
  }

  function openBoard() {
    state.phase = 'menu';
    hideStoryScreens();
    if (screenBoard) screenBoard.hidden = false;
    var line = document.getElementById('board-account');
    var account = loadAccount();
    if (line) line.textContent = account ? ('登入帳號：' + account.name) : '尚未登入。用 Google 或訪客進入後，成績才記入排行。';
    renderBoard();
    refreshBoard(boardTab).then(function () {
      if (screenBoard && !screenBoard.hidden) renderBoard();
    });
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-on');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove('is-on'); }, 1700);
  }

  function addShake(amount) {
    if (reduceMotion) return;
    state.shake = Math.min(12, state.shake + amount);
  }

  function burst(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      var speed = 0.7 + Math.random() * 1.8;
      var life = 0.28 + Math.random() * 0.28;
      state.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: life,
        max: life,
        color: color,
        size: 0.07 + Math.random() * 0.08,
      });
    }
    while (state.particles.length > 180) state.particles.shift();
  }

  function shatterShieldFx(x, y) {
    for (var i = 0; i < 12; i++) {
      var angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.25;
      var speed = 1.1 + Math.random() * 2.2;
      var life = 0.32 + Math.random() * 0.28;
      state.particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.4,
        life: life,
        max: life,
        color: i % 2 ? '#67e8f9' : '#ffffff',
        size: 0.1 + Math.random() * 0.12,
        shard: true,
        spin: (Math.random() - 0.5) * 10,
        ang: angle,
      });
    }
    burst(x, y, '#67e8f9', 8);
    while (state.particles.length > 180) state.particles.shift();
  }

  var ABILITY_FX_COLOR = {
    regen: '#3ecf8e',
    rush: '#ff5a36',
    summon: '#f2c14e',
    ward: '#67e8f9',
    split: '#c084fc',
    mend: '#ff8fab',
    frost: '#9bd4ff',
    armor: '#8aa0b8',
    skull: '#e07a2f',
    recover: '#fde68a',
  };

  function spawnRecoverGuardFx(x, y) {
    burst(x, y, '#fde68a', 14);
    burst(x, y, '#86efac', 8);
    for (var i = 0; i < 10; i++) {
      var ang = (Math.PI * 2 * i) / 10;
      var life = 0.45 + Math.random() * 0.2;
      state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(ang) * 1.8,
        vy: Math.sin(ang) * 1.8,
        life: life,
        max: life,
        color: i % 2 ? '#fde68a' : '#ffffff',
        size: 0.1 + Math.random() * 0.08,
        shard: true,
        ang: ang,
      });
    }
    while (state.particles.length > 180) state.particles.shift();
  }

  // 破甲結束：原地短暫無敵再回復能力
  function beginRecoverGuard(enemy) {
    if (!enemy || enemy.dead) return;
    enemy.recoverGuard = Math.max(enemy.recoverGuard || 0, 0.85);
    clearControl(enemy);
    markAbilityFx(enemy, 'recover');
    var pos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
    spawnRecoverGuardFx(pos.x, pos.y);
    spawnFloater(pos.x, pos.y - 0.55, '恢復', '#fde68a');
  }

  function markAbilityFx(enemy, kind) {
    enemy.abilityFx = 0.55;
    enemy.abilityFxKind = kind;
    var pos = enemyPos(enemy);
    var color = ABILITY_FX_COLOR[kind] || '#161616';
    burst(pos.x, pos.y, color, kind === 'rush' ? 14 : 10);
    if (kind === 'ward') shatterShieldFx(pos.x, pos.y);
    else if (kind === 'frost') {
      for (var i = 0; i < 8; i++) {
        var ang = (Math.PI * 2 * i) / 8;
        state.particles.push({
          x: pos.x, y: pos.y,
          vx: Math.cos(ang) * 1.4,
          vy: Math.sin(ang) * 1.4,
          life: 0.4,
          max: 0.4,
          color: '#9bd4ff',
          size: 0.09,
          shard: true,
          ang: ang,
        });
      }
    } else if (kind === 'split') {
      for (var s = 0; s < 6; s++) {
        var sa = (Math.PI * 2 * s) / 6;
        state.particles.push({
          x: pos.x, y: pos.y,
          vx: Math.cos(sa) * 1.6,
          vy: Math.sin(sa) * 1.6,
          life: 0.36,
          max: 0.36,
          color: '#c084fc',
          size: 0.1,
          shard: true,
          ang: sa,
        });
      }
    }
    while (state.particles.length > 180) state.particles.shift();
  }

  function spawnFloater(x, y, text, color) {
    state.floaters.push({ x: x, y: y, text: text, color: color, life: 0.75, vy: -0.85 });
    if (state.floaters.length > 36) state.floaters.shift();
  }

  function startWave(n) {
    dismissBuildMenu();
    Sfx.unlock();
    if (state.interestLeft > 0) {
      state.gold += 30;
      state.interestLeft -= 1;
      toast('利息 +30');
    }
    var refreshed = wheelRulesActive() && (n === 1 || n % 10 === 0);
    syncHellDeffs(n);
    var plan = applyHellBossDeff(planWave(n));
    state.wave = n;
    state.waveTime = 0;
    state.berserk = false;
    state.phase = 'combat';
    state.paused = false;
    state.waveGoldEarned = 0;
    state.waveDoubled = false;
    state.waveGiftDone = false;
    state.spawnQueue = plan.jobs.slice();
    state.spawnTimer = 0.55;
    var deffText = hellDeffLabel();
    if (refreshed && deffText) toast((chapterHasKit('wheel') ? '魔王城' : '地獄') + '詞綴 · ' + deffText);
    state.banner = plan.boss
      ? { text: '第 ' + n + ' 波 · ' + plan.boss.name, sub: deffText || plan.boss.blurb, life: 3.2 }
      : (plan.elite
        ? { text: '第 ' + n + ' 波 · ' + plan.elite.name, sub: plan.elite.blurb, life: 2.8 }
        : { text: '第 ' + n + ' 波', sub: deffText || compositionText(plan), life: 2.2 });
    if (state.mode === 'infinite' || state.mode === 'custom') markBest(n);
    if (plan.boss || plan.elite) Sfx.boss();
    else Sfx.fanfare();
    Bgm.sync();
    syncHud();
  }

  function update(dt) {
    if (state.phase !== 'combat') return;
    updateSpawns(dt);
    updateWalls(dt);
    updateEnemies(dt);
    tickHellLock(dt);
    tickChapterKit(dt);
    updateTowers(dt);
    updateGusts(dt);
    updateFogs(dt);
    updateMeteor(dt);
    updateSkyfalls(dt);
    updateProjectiles(dt);
    flushSpawns();
    state.enemies = state.enemies.filter(function (enemy) { return !enemy.dead; });
    state.projectiles = state.projectiles.filter(function (shot) { return !shot.dead; });
    if (state.phase === 'combat' && state.spawnQueue.length === 0 && state.enemies.length === 0) {
      onWaveClear();
    }
  }

  function updateSpawns(dt) {
    if (!state.spawnQueue.length || state.phase !== 'combat') return;
    state.spawnTimer -= dt;
    if (state.spawnTimer > 0) return;
    var job = state.spawnQueue.shift();
    var spawned = job.type === 'skull'
      ? makeSkull(state.wave, job.kit)
      : (job.type === 'titan'
        ? makeTitan(state.wave, job.traits)
        : (job.type === 'elite'
          ? makeElite(state.wave)
          : (job.type === 'boss' ? makeBoss(job.bossIndex, state.wave) : makeEnemy(job.type, state.wave))));
    applyHellSpawnStats(spawned);
    applyChapterSpawn(spawned);
    state.enemies.push(spawned);
    state.spawnTimer = state.spawnQueue.length ? state.spawnQueue[0].gap : 0;
  }

  function updateEnemies(dt) {
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead || state.phase !== 'combat') continue;
      tightenShield(enemy);
      if (enemy.jumpCd > 0) enemy.jumpCd -= dt;
      if (enemy.jumping) {
        enemy.jumping.t += dt / enemy.jumping.dur;
        if (enemy.jumping.t >= 1) {
          enemy.dist = enemy.jumping.to;
          enemy.jumping = null;
          enemy.jumpCd = Math.max(enemy.jumpCd || 0, HOPPER_JUMP_CD);
        }
      } else {
        var step = moveSpeed(enemy) * dt;
        var block = wallStop(enemy.dist);
        if (block != null) step = Math.min(step, Math.max(0, block - 0.32 - enemy.dist));
        enemy.dist += step;
        if (enemy.type === 'hopper') tryHopperJump(enemy);
      }
      if (enemy.type === 'devil') tickDevilHex(enemy, dt);
      if (enemy.type === 'ram') tickRam(enemy, dt);
      triggerTrap(enemy);
      tickLateWaveControlWard(enemy, dt);
      tickFireBreak(enemy, dt);
      tickRecoverGuard(enemy, dt);
      if (enemy.freeze > 0) enemy.freeze -= dt;
      if (enemy.stun > 0) enemy.stun -= dt;
      if (enemy.rise > 0) enemy.rise = Math.max(0, enemy.rise - dt);
      if (enemy.slowTime > 0) {
        enemy.slowTime -= dt;
        if (enemy.slowTime <= 0) enemy.slow = 0;
      }
      if (!enemy.jumping && enemy.dist >= WAYPOINTS.length - 1) {
        leakEnemy(enemy);
        continue;
      }
      if (enemy.fogTime > 0) enemy.fogTime -= dt;
      if (enemy.poisonRuinTime > 0) {
        enemy.poisonRuinTime -= dt;
        enemy.poisonRuinAcc = (enemy.poisonRuinAcc || 0) + enemy.maxHp * (enemy.poisonRuinRate || 0.03) * dt;
        if (enemy.poisonRuinAcc >= 1) {
          var ruinDmg = Math.floor(enemy.poisonRuinAcc);
          enemy.poisonRuinAcc -= ruinDmg;
          hurtEnemy(enemy, ruinDmg, null, { pierce: true, ignoreShield: true });
          if (enemy.dead) continue;
        }
        if (enemy.poisonRuinTime <= 0) {
          enemy.poisonRuin = false;
          enemy.poisonRuinAcc = 0;
          beginRecoverGuard(enemy);
        }
      }
      var regenRate = hellDeffValue('regen');
      if (regenRate > 0 && enemy.hp < enemy.maxHp) {
        if (healBlocked(enemy)) {
          triggerPoisonCounter(enemy);
        } else {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * regenRate * dt * healScale(enemy));
        }
      }
      if (chapterHasKit('regen') && !enemy.boss && !enemy.elite && enemy.hp < enemy.maxHp) {
        if (healBlocked(enemy)) triggerPoisonCounter(enemy);
        else enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.015 * dt * healScale(enemy));
      }
      if (chapterHasKit('rush') && !enemy.boss && !enemy.elite && !enemy.kitRushed && enemy.hp <= enemy.maxHp * 0.5) {
        enemy.kitRushed = true;
        enemy.speed *= 1.45;
        if (enemy.baseSpeed) enemy.baseSpeed *= 1.45;
        var rushPos = enemyPos(enemy);
        spawnFloater(rushPos.x, rushPos.y - 0.55, '狂暴', '#ff5a36');
        markAbilityFx(enemy, 'rush');
      }
      var enrageMul = hellDeffValue('enrage');
      if (enrageMul > 0 && !enemy.hellEnraged && enemy.hp <= enemy.maxHp * 0.1) {
        enemy.hellEnraged = true;
        enemy.speed *= 1 + enrageMul;
        if (enemy.baseSpeed) enemy.baseSpeed *= 1 + enrageMul;
        var ragePos = enemyPos(enemy);
        spawnFloater(ragePos.x, ragePos.y - 0.55, '殘暴', '#ff5a36');
      }
      if (enemy.burnTime > 0) {
        enemy.burnTime -= dt;
        enemy.burnTick -= dt;
        if (enemy.burnTick <= 0) {
          enemy.burnTick += enemy.burnEvery || 0.5;
          hurtEnemy(enemy, enemy.burn || 0);
        }
        if (enemy.burnTime <= 0) enemy.burn = 0;
        if (enemy.dead) continue;
      }
      if (enemy.poisonTime > 0) {
        enemy.poisonTime -= dt;
        enemy.poisonTick -= dt;
        if (enemy.poisonTick <= 0) {
          enemy.poisonTick += enemy.poisonEvery || 0.4;
          hurtEnemy(enemy, enemy.poison || 0);
        }
        if (enemy.poisonTime <= 0) enemy.poison = 0;
        if (enemy.dead) continue;
      }
      if (enemy.boss) tickBoss(enemy, dt);
      else if (enemy.elite) tickElite(enemy, dt);
    }
    spreadAilments();
  }

  function spreadAilments() {
    var sources = [];
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (!enemy.dead && (enemy.burnTime > 0 || enemy.poisonTime > 0)) sources.push(enemy);
    }
    for (var s = 0; s < sources.length; s++) {
      var from = sources[s];
      var fromPos = pointAt(from.dist);
      for (var j = 0; j < state.enemies.length; j++) {
        var other = state.enemies[j];
        if (other === from || other.dead) continue;
        var pos = pointAt(other.dist);
        if (Math.hypot(pos.x - fromPos.x, pos.y - fromPos.y) > from.radius + other.radius + 0.06) continue;
        if (from.burnTime > 0 && !(other.burnTime > 0) && !resists(other, 'burn')) passBurn(from, other, pos);
        if (from.poisonTime > 0 && !(other.poisonTime > 0) && !resists(other, 'poison')) passPoison(from, other, pos);
      }
    }
  }

  function ailmentLeft(enemy, prefix, duration) {
    if (!(enemy[prefix + 'Time'] > 0)) {
      enemy[prefix + 'Born'] = state.time;
      enemy[prefix + 'Until'] = state.time + Math.min(duration, 3);
    }
    return Math.max(0, enemy[prefix + 'Until'] - state.time);
  }

  function passBurn(from, other, pos) {
    var left = (from.burnUntil || 0) - state.time;
    if (left <= 0.05) return;
    other.burn = from.burn;
    other.burnBorn = from.burnBorn;
    other.burnUntil = from.burnUntil;
    other.burnTime = left;
    other.burnEvery = from.burnEvery || 0.5;
    other.burnTick = other.burnEvery;
    spawnFloater(pos.x, pos.y - 0.45, '灼燒', '#e02323');
    if (isFireCounterTarget(other)) triggerFireCounter(other);
  }

  function passPoison(from, other, pos) {
    var left = (from.poisonUntil || 0) - state.time;
    if (left <= 0.05) return;
    other.poison = from.poison;
    other.poisonBorn = from.poisonBorn;
    other.poisonUntil = from.poisonUntil;
    other.poisonTime = left;
    other.poisonEvery = from.poisonEvery || 0.4;
    other.poisonTick = other.poisonEvery;
    spawnFloater(pos.x, pos.y - 0.7, '中毒', '#3cbf4a');
    if (isPoisonCounterTarget(other) || from.poisonRuin) triggerPoisonCounter(other);
  }

  function bossHas(enemy, id) {
    if (!enemy || !id) return false;
    if (enemy.bossId === id) return true;
    var traits = enemy.traits;
    if (!traits) return false;
    for (var i = 0; i < traits.length; i++) if (traits[i] === id) return true;
    return false;
  }

  function isHealRegenEnemy(enemy) {
    return !!(enemy && (bossHas(enemy, 'regen') || bossHas(enemy, 'mend')));
  }

  function isPoisonCounterTarget(enemy) {
    return !!(enemy && (isHealRegenEnemy(enemy) || hasHellDeff('regen') || (!enemy.boss && (chapterHasKit('regen') || chapterHasKit('mend')))));
  }

  function isFireCounterTarget(enemy) {
    return !!(enemy && (enemy.shield > 0 || bossHas(enemy, 'armor') || hasHellDeff('thick') || (chapterHasKit('armor') && !enemy.boss)));
  }

  function triggerPoisonCounter(enemy) {
    if (!enemy || enemy.dead) return;
    var fresh = !enemy.poisonRuin;
    enemy.poisonRuin = true;
    enemy.poisonRuinRate = 0.03;
    // 破再生／治癒約 3 秒，之後可再回復
    enemy.poisonRuinTime = Math.max(enemy.poisonRuinTime || 0, 3);
    if (fresh) {
      var pos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
      spawnFloater(pos.x, pos.y - 0.7, hasHellDeff('regen') && !isHealRegenEnemy(enemy) ? '克制回血' : '毒蝕', '#3cbf4a');
    }
  }

  function triggerFireCounter(enemy) {
    if (!enemy || enemy.dead) return;
    var pos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
    var fresh = false;
    if (enemy.shield > 0) {
      enemy.shield = 0;
      fresh = !enemy.fireShieldPaid;
      enemy.fireShieldPaid = true;
      // 破盾後約 3 秒可再長護盾
      enemy.wardTimer = Math.min(enemy.wardTimer == null ? 3 : enemy.wardTimer, 3);
      spawnFloater(pos.x, pos.y - 0.55, '破盾', '#e02323');
      shatterShieldFx(pos.x, pos.y);
    }
    if (bossHas(enemy, 'armor') || (chapterHasKit('armor') && !enemy.boss)) {
      if (!enemy.firePierce) {
        fresh = true;
        spawnFloater(pos.x, pos.y - 0.75, '破甲', '#e02323');
      }
      enemy.firePierce = true;
    }
    if (hasHellDeff('thick')) {
      if (!enemy.fireThickPaid) {
        fresh = true;
        spawnFloater(pos.x, pos.y - 0.95, '克制厚皮', '#e02323');
      }
      enemy.fireThickPaid = true;
    }
    // 破甲／厚皮／護盾壓制約 3 秒，之後能力可回復
    if (fresh || enemy.firePierce || enemy.fireThickPaid || enemy.fireShieldPaid) {
      enemy.fireBreakTime = Math.max(enemy.fireBreakTime || 0, 3);
    }
    if (!fresh) return;
    if (enemy.firePctAt && state.time - enemy.firePctAt < 0.85) return;
    enemy.firePctAt = state.time;
    hurtEnemy(enemy, Math.max(1, Math.round(enemy.maxHp * 0.06)), null, { pierce: true, ignoreShield: true });
  }

  function healBlocked(enemy) {
    return !!(enemy && (enemy.poisonTime > 0 || enemy.poisonRuin || enemy.fogTime > 0 || (enemy.fireBreakTime > 0)));
  }

  function controlImmune(enemy) {
    return !!(enemy && enemy.controlWard > 0);
  }

  function tickLateWaveControlWard(enemy, dt) {
    if (!enemy || enemy.dead || state.wave <= 50) return;
    if (enemy.controlWard > 0) {
      enemy.controlWard -= dt;
      if (enemy.controlWard <= 0) enemy.controlWard = 0;
    }
    enemy.controlWardCd = (enemy.controlWardCd == null ? (3 + Math.random() * 5) : enemy.controlWardCd) - dt;
    if (enemy.controlWardCd > 0) return;
    enemy.controlWardCd = 6 + Math.random() * 8;
    enemy.controlWard = 2;
    clearControl(enemy);
    var pos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
    spawnFloater(pos.x, pos.y - 0.55, '抗控', '#c4b5fd');
  }

  function tickFireBreak(enemy, dt) {
    if (!enemy || !(enemy.fireBreakTime > 0)) return;
    enemy.fireBreakTime -= dt;
    if (enemy.fireBreakTime > 0) return;
    enemy.fireBreakTime = 0;
    enemy.firePierce = false;
    enemy.fireThickPaid = false;
    enemy.fireShieldPaid = false;
    beginRecoverGuard(enemy);
  }

  function tickRecoverGuard(enemy, dt) {
    if (!enemy || !(enemy.recoverGuard > 0)) return;
    enemy.recoverGuard -= dt;
    if (enemy.recoverGuard <= 0) enemy.recoverGuard = 0;
  }

  function castSkullMeteors(enemy) {
    if (!state.towers.length) return;
    if (!state.skyfalls) state.skyfalls = [];
    var count = enemy.meteorCount || 1;
    var used = {};
    for (var n = 0; n < count; n++) {
      var tower = null;
      for (var attempt = 0; attempt < 6; attempt++) {
        var pick = state.towers[Math.floor(Math.random() * state.towers.length)];
        if (!used[pick.id]) {
          tower = pick;
          used[pick.id] = true;
          break;
        }
      }
      if (!tower) tower = state.towers[Math.floor(Math.random() * state.towers.length)];
      var hx = tower.hero === 'sword' && tower.fx != null ? tower.fx : tower.c + 0.5;
      var hy = tower.hero === 'sword' && tower.fy != null ? tower.fy : tower.r + 0.5;
      state.skyfalls.push({
        x: hx,
        y: hy,
        life: 0.62,
        max: 0.62,
        radius: 0.82,
        armed: true,
      });
    }
    enemy.castPose = 0.85;
    var pos = pointAt(enemy.dist);
    spawnFloater(pos.x, pos.y - 0.7, '隕石', '#e07a2f');
  }

  function updateSkyfalls(dt) {
    var list = state.skyfalls;
    if (!list || !list.length) return;
    for (var i = list.length - 1; i >= 0; i--) {
      var rock = list[i];
      rock.life -= dt;
      if (rock.armed && rock.life <= rock.max * 0.28) {
        rock.armed = false;
        for (var t = 0; t < state.towers.length; t++) {
          var tower = state.towers[t];
          var hx = tower.hero === 'sword' && tower.fx != null ? tower.fx : tower.c + 0.5;
          var hy = tower.hero === 'sword' && tower.fy != null ? tower.fy : tower.r + 0.5;
          if (Math.hypot(hx - rock.x, hy - rock.y) > rock.radius) continue;
          tower.chill = Math.max(tower.chill || 0, 1);
          tower.dizzy = Math.max(tower.dizzy || 0, 1);
          spawnFloater(hx, hy - 0.45, '暈眩', '#e07a2f');
        }
        burst(rock.x, rock.y, '#e07a2f', 10);
        Sfx.cannon();
      }
      if (rock.life <= 0) list.splice(i, 1);
    }
  }

  function tickElite(enemy, dt) {
    enemy.pulse = (enemy.pulse || 0) + dt;
    if (enemy.abilityFx > 0) enemy.abilityFx -= dt;
    if (enemy.regenShow > 0) enemy.regenShow -= dt;
    var pos = pointAt(enemy.dist);
    var id = enemy.bossId;
    if (id === 'skull') {
      enemy.castPose = Math.max(0, (enemy.castPose || 0) - dt);
      enemy.meteorTimer = (enemy.meteorTimer == null ? 6.5 : enemy.meteorTimer) - dt;
      if (enemy.meteorTimer <= 0) {
        enemy.meteorTimer = 8.5;
        enemy.meteorCount = 1;
        castSkullMeteors(enemy);
        markAbilityFx(enemy, 'skull');
      }
      return;
    }
    if (id === 'regen' && enemy.hp < enemy.maxHp) {
      if (healBlocked(enemy)) {
        if (enemy.poisonTime > 0 || enemy.poisonRuin) triggerPoisonCounter(enemy);
      } else {
        var before = enemy.hp;
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.02 * dt * healScale(enemy));
        if (enemy.hp > before && enemy.regenShow <= 0) {
          enemy.regenShow = 1.1;
          markAbilityFx(enemy, 'regen');
        }
      }
    }
    if (id === 'rush' && !enemy.enraged && enemy.hp <= enemy.maxHp * 0.6) {
      enemy.enraged = true;
      enemy.kitRushed = true;
      enemy.speed = (enemy.baseSpeed || enemy.speed) * 1.55;
      spawnFloater(pos.x, pos.y - 0.55, '狂暴', '#ff5a36');
      markAbilityFx(enemy, 'rush');
    }
    if (id === 'summon') {
      enemy.summonTimer = (enemy.summonTimer == null ? 7.5 : enemy.summonTimer) - dt;
      if (enemy.summonTimer <= 0 && state.enemies.length + state.pendingSpawns.length < 24) {
        enemy.summonTimer = 9;
        var minion = makeEnemy('grunt', state.wave);
        minion.dist = Math.max(0, enemy.dist - 0.4);
        queueEnemy(minion);
        spawnFloater(pos.x, pos.y - 0.55, '召喚', '#f2c14e');
        markAbilityFx(enemy, 'summon');
      }
    }
    if (id === 'ward' && enemy.shield <= 0) {
      enemy.wardTimer = (enemy.wardTimer == null ? 3 : enemy.wardTimer) - dt;
      if (enemy.wardTimer <= 0) {
        enemy.wardTimer = 7;
        enemy.shield = Math.max(1, Math.round(enemy.maxHp * 0.1));
        enemy.shieldCut = 1;
        tightenShield(enemy);
        spawnFloater(pos.x, pos.y - 0.55, '護盾', '#67e8f9');
        markAbilityFx(enemy, 'ward');
      }
    }
    if (id === 'frost') {
      enemy.frostTimer = (enemy.frostTimer == null ? 7 : enemy.frostTimer) - dt;
      if (enemy.frostTimer <= 0) {
        enemy.frostTimer = 9;
        for (var t = 0; t < state.towers.length; t++) {
          state.towers[t].chill = Math.max(state.towers[t].chill || 0, 0.55);
        }
        spawnFloater(pos.x, pos.y - 0.55, '冰封', '#9bd4ff');
        markAbilityFx(enemy, 'frost');
      }
    }
    if (id === 'mend') {
      enemy.mendAcc = (enemy.mendAcc || 0) + dt;
      if (enemy.mendAcc >= 1.4) {
        enemy.mendAcc = 0;
        if (healBlocked(enemy)) {
          if (enemy.poisonTime > 0 || enemy.poisonRuin) triggerPoisonCounter(enemy);
        } else {
          var mended = false;
          for (var i = 0; i < state.enemies.length; i++) {
            var other = state.enemies[i];
            if (other === enemy || other.dead || other.hp >= other.maxHp) continue;
            var otherPos = pointAt(other.dist);
            if (Math.hypot(otherPos.x - pos.x, otherPos.y - pos.y) > 1.35) continue;
            if (healBlocked(other)) continue;
            var heal = Math.min(other.maxHp - other.hp, Math.max(2, Math.round(other.maxHp * 0.04 * healScale(other))));
            other.hp += heal;
            other.regenShow = Math.max(other.regenShow || 0, 0.7);
            mended = true;
          }
          if (mended) {
            spawnFloater(pos.x, pos.y - 0.55, '治癒', '#ff8fab');
            markAbilityFx(enemy, 'mend');
          }
        }
      }
    }
    if (id === 'split') enemy.splitGlow = true;
    if (id === 'armor') enemy.armorGlow = true;
  }

  function tickBoss(enemy, dt) {
    enemy.pulse += dt;
    if (enemy.abilityFx > 0) enemy.abilityFx -= dt;
    var pos = pointAt(enemy.dist);
    if (enemy.bossId === 'skull') {
      enemy.castPose = Math.max(0, (enemy.castPose || 0) - dt);
      enemy.meteorTimer = (enemy.meteorTimer == null ? 2.4 : enemy.meteorTimer) - dt;
      if (enemy.meteorTimer <= 0) {
        enemy.meteorTimer = 4.8;
        castSkullMeteors(enemy);
        markAbilityFx(enemy, 'skull');
      }
    }
    if (bossHas(enemy, 'regen')) {
      if (healBlocked(enemy)) {
        if (enemy.poisonTime > 0 || enemy.poisonRuin) triggerPoisonCounter(enemy);
        enemy.regenShow = (enemy.regenShow || 0) - dt;
      } else {
        var before = enemy.hp;
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.025 * dt * healScale(enemy));
        enemy.regenShow = (enemy.regenShow || 0) - dt;
        if (enemy.hp > before && enemy.hp < enemy.maxHp && enemy.regenShow <= 0) {
          enemy.regenShow = 1.15;
          spawnFloater(pos.x, pos.y - 0.6, '回復', '#3ecf8e');
          markAbilityFx(enemy, 'regen');
        }
      }
    }
    if (bossHas(enemy, 'rush')) {
      if (!enemy.enraged && enemy.hp <= enemy.maxHp * 0.5) {
        enemy.enraged = true;
        enemy.speed = enemy.baseSpeed * 2.2;
        spawnFloater(pos.x, pos.y - 0.6, '狂暴', '#ff5a36');
        markAbilityFx(enemy, 'rush');
      }
    }
    if (bossHas(enemy, 'summon')) {
      enemy.summonTimer = (enemy.summonTimer == null ? 2.4 : enemy.summonTimer) - dt;
      if (enemy.summonTimer <= 0 && state.enemies.length + state.pendingSpawns.length < 28) {
        enemy.summonTimer = 4.4;
        var minion = enemy.bossId === 'skull' ? makeEnemy('bone', state.wave) : makeEnemy('grunt', state.wave);
        minion.dist = Math.max(0, enemy.dist - 0.45);
        queueEnemy(minion);
        spawnFloater(pos.x, pos.y - 0.6, '召喚', '#f2c14e');
        markAbilityFx(enemy, 'summon');
      }
    }
    if (bossHas(enemy, 'ward')) {
      if (enemy.shield <= 0) {
        enemy.wardTimer = (enemy.wardTimer == null ? 3 : enemy.wardTimer) - dt;
        if (enemy.wardTimer <= 0) {
          enemy.wardTimer = 6;
          enemy.shield = Math.round(enemy.maxHp * 0.2);
          enemy.shieldCut = 1;
          tightenShield(enemy);
          spawnFloater(pos.x, pos.y - 0.6, '護盾', '#67e8f9');
          markAbilityFx(enemy, 'ward');
        }
      }
    }
    if (bossHas(enemy, 'frost')) {
      enemy.frostTimer = (enemy.frostTimer || enemy.abilityTimer || 3.2) - dt;
      if (enemy.frostTimer <= 0) {
        enemy.frostTimer = 5.4;
        for (var t = 0; t < state.towers.length; t++) {
          state.towers[t].cooldown += 1.05;
          state.towers[t].chill = 0.85;
        }
        spawnFloater(pos.x, pos.y - 0.6, '冰封', '#9bd4ff');
        markAbilityFx(enemy, 'frost');
      }
    }
    if (bossHas(enemy, 'mend')) {
      enemy.mendAcc += dt;
      if (enemy.mendAcc >= 0.5) {
        enemy.mendAcc = 0;
        if (healBlocked(enemy)) {
          if (enemy.poisonTime > 0 || enemy.poisonRuin) triggerPoisonCounter(enemy);
        } else {
          var mended = false;
          for (var i = 0; i < state.enemies.length; i++) {
            var other = state.enemies[i];
            if (other === enemy || other.dead || other.hp >= other.maxHp) continue;
            var otherPos = pointAt(other.dist);
            if (Math.hypot(otherPos.x - pos.x, otherPos.y - pos.y) > 1.8) continue;
            if (healBlocked(other)) {
              triggerPoisonCounter(other);
              if (state.time - (other.lastMend || 0) > 0.9) {
                other.lastMend = state.time;
                spawnFloater(otherPos.x, otherPos.y - 0.35, '治療失敗', '#3cbf4a');
              }
              continue;
            }
            var heal = Math.min(other.maxHp - other.hp, enemy.mendPower * healScale(other));
            other.hp += heal;
            other.regenShow = Math.max(other.regenShow || 0, 0.7);
            mended = true;
            if (state.time - (other.lastMend || 0) > 0.9) {
              other.lastMend = state.time;
              spawnFloater(otherPos.x, otherPos.y - 0.35, '+' + heal, '#ff8fab');
            }
          }
          if (mended) markAbilityFx(enemy, 'mend');
        }
      }
    }
  }

  function crushNearestTower(enemy) {
    var pos = enemyPos(enemy);
    var best = null;
    var bestDist = 1.42;
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
      if (tower.type === 'hero') continue;
      var dist = Math.hypot((tower.c + 0.5) - pos.x, (tower.r + 0.5) - pos.y);
      if (dist < bestDist) {
        best = tower;
        bestDist = dist;
      }
    }
    if (!best) return;
    state.towers = state.towers.filter(function (item) { return item.id !== best.id; });
    if (state.selectedId === best.id) {
      state.selectedId = null;
      state.sellArmed = false;
      renderInspector();
    }
    enemy.ramCd = 0.5;
    spawnFloater(best.c + 0.5, best.r + 0.5 - 0.45, '撞破', '#161616');
    burst(best.c + 0.5, best.r + 0.5, '#161616', 10);
    Sfx.cannon();
  }

  function tickRam(enemy, dt) {
    if (enemy.ramCd > 0) enemy.ramCd -= dt;
    if ((!state.berserk && (enemy.stun > 0 || enemy.freeze > 0)) || enemy.ramCd > 0) return;
    crushNearestTower(enemy);
  }

  function tickDevilHex(enemy, dt) {
    if (!state.berserk && (enemy.stun > 0 || enemy.freeze > 0)) return;
    enemy.hexCd = (enemy.hexCd || 0) - dt;
    if (enemy.hexCd > 0 || !state.towers.length) return;
    enemy.hexCd = 3.0;
    var pos = enemyPos(enemy);
    var best = null;
    var bestDist = 2.35;
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
      var d = Math.hypot(tower.c + 0.5 - pos.x, tower.r + 0.5 - pos.y);
      if (d < bestDist) {
        bestDist = d;
        best = tower;
      }
    }
    if (!best) return;
    best.chill = Math.max(best.chill || 0, 1.6);
    best.devilFork = Math.max(best.devilFork || 0, 1.6);
    spawnFloater(best.c + 0.5, best.r + 0.5 - 0.5, '惡咒', '#c62828');
  }

  function leakEnemy(enemy) {
    if (enemy.dead || state.phase !== 'combat') return;
    enemy.dead = true;
    state.lifeLost += enemy.leak;
    state.lives -= enemy.leak;
    if (state.mode === 'campaign' && state.stagePlan && state.stagePlan.goals) {
      var leakGoals = state.stagePlan.goals;
      for (var g = 0; g < leakGoals.length; g++) {
        if (leakGoals[g].kind === 'flawless' && state.lifeLost > 0) noteGoalFail('flawless', '基地受傷了，無傷這顆星沒了');
        if (leakGoals[g].kind === 'bruise' && state.lifeLost > leakGoals[g].max) noteGoalFail('bruise', '受傷超過 ' + leakGoals[g].max + '，這顆星沒了');
      }
    }
    state.hurt = 0.5;
    addShake(8);
    var end = WAYPOINTS[WAYPOINTS.length - 1];
    spawnFloater(end.x, end.y - 0.25, '-' + enemy.leak, '#ff8b98');
    if (enemy.type === 'devil') {
      var steal = Math.min(state.gold, Math.max(4, 3 + Math.floor(state.wave / 3)));
      if (steal > 0) {
        state.gold -= steal;
        spawnFloater(end.x, end.y - 0.55, '-' + steal + '金', '#c62828');
        syncHud();
      }
    }
    burst(end.x, end.y, '#ff6b81', 12);
    Sfx.base();
    vibrate([36, 40, 36]);
    if (state.lives <= 0) {
      state.lives = 0;
      onGameOver();
    }
  }

  function towerSpec(tower) {
    var def = TOWERS[tower.type];
    if (!def || !tower.spec || !def.specs || !def.specs[tower.spec]) return null;
    return def.specs[tower.spec];
  }

  function cloneStats(stats) {
    var copy = {};
    for (var key in stats) {
      if (Object.prototype.hasOwnProperty.call(stats, key)) copy[key] = stats[key];
    }
    return copy;
  }

  function rankBoost(stats) {
    var copy = cloneStats(stats);
    // 6 等覺醒加成略降，避免 10 等後期傷害失控
    copy.damage = Math.max(1, Math.round(copy.damage * 1.25));
    if (copy.range) copy.range = Math.round(copy.range * 1.35 * 100) / 100;
    if (copy.splash) copy.splash = Math.round(copy.splash * 1.3 * 100) / 100;
    if (copy.chainRange) copy.chainRange = Math.round(copy.chainRange * 1.3 * 100) / 100;
    if (copy.poison) copy.poison = Math.max(1, Math.round(copy.poison * 1.25));
    if (copy.burn) copy.burn = Math.max(1, Math.round(copy.burn * 1.25));
    if (copy.goldGen) copy.goldGen = Math.max(1, Math.round(copy.goldGen * 1.2));
    return copy;
  }

  function lookupLevels(table, index) {
    var used = Math.max(0, Math.min(table.length - 1, index));
    return { stats: table[used], extra: Math.max(0, index - used) };
  }

  function growPastCap(stats, steps) {
    var copy = cloneStats(stats);
    // 超過表定等數後每等約 +8%（舊 15%），產金更保守
    var power = Math.pow(1.08, steps);
    var goldPower = Math.pow(1.05, steps);
    var haste = Math.pow(1.04, steps);
    if (copy.damage) copy.damage = Math.max(1, Math.round(copy.damage * power));
    if (copy.poison) copy.poison = Math.max(1, Math.round(copy.poison * power));
    if (copy.burn) copy.burn = Math.max(1, Math.round(copy.burn * power));
    if (copy.goldGen) copy.goldGen = Math.max(1, Math.round(copy.goldGen * goldPower));
    if (copy.range) copy.range = Math.round(copy.range * (1 + steps * 0.015) * 100) / 100;
    if (copy.cooldown) copy.cooldown = Math.max(0.08, copy.cooldown / haste);
    return copy;
  }

  function towerStats(tower) {
    var def = TOWERS[tower.type];
    if (!def || !def.levels) return { damage: 0, range: 0, cooldown: 1 };
    var found = def.specs && tower.level >= 2 && tower.spec
      ? lookupLevels(def.specs[tower.spec].levels, tower.level - 2)
      : lookupLevels(def.levels, tower.level);
    var stats = found.extra ? growPastCap(found.stats, found.extra) : found.stats;
    if (tower.level >= 5) stats = rankBoost(stats);
    return applyDivine(applySupport(stats, tower), tower);
  }

  function isArrowPath(tower) {
    return tower.type === 'basic' && (!tower.spec || tower.spec === 'arrow');
  }

  function isCannonPath(tower) {
    return tower.type === 'basic' && tower.spec === 'cannon';
  }

  function towerLabel(tower) {
    if (tower.type === 'hero') return heroName(tower.hero);
    var spec = towerSpec(tower);
    return spec ? spec.name : TOWERS[tower.type].name;
  }

  function towerColor(tower) {
    if (tower.type === 'hero') return '#161616';
    var spec = towerSpec(tower);
    return spec && spec.color ? spec.color : TOWERS[tower.type].color;
  }

  function hasBlacksmith() {
    for (var i = 0; i < state.towers.length; i++) {
      if (state.towers[i].type === 'smith') return true;
    }
    return false;
  }

  function smithReady() {
    if (hasBlacksmith()) return false;
    if (state.wave >= 20) return true;
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
      if (tower.type !== 'hero' && tower.type !== 'smith' && tower.level >= 4) return true;
    }
    return false;
  }

  function goldLevelCap() {
    return hasBlacksmith() ? 9 : 4;
  }

  function towerMaxed(tower) {
    return !tower || tower.type === 'hero' || tower.type === 'smith' || tower.level >= goldLevelCap();
  }

  function nextUpgradeCost(tower) {
    if (!tower || tower.type === 'hero' || tower.type === 'smith' || tower.level >= goldLevelCap()) return 0;
    var costs = TOWERS[tower.type] && TOWERS[tower.type].upgradeCost;
    if (!costs || !costs.length) return 0;
    if (tower.level < costs.length) return costs[tower.level];
    var last = costs[costs.length - 1];
    return Math.round(last * Math.pow(1.32, tower.level - (costs.length - 1)));
  }

  function heroName(id) {
    if (id === 'sword') return '緋紅劍客';
    if (id === 'archer') return '叢林獵手';
    if (id === 'mage') return '萬象法師';
    if (id === 'priest') return '戰靈樂手';
    if (id === 'god') return '全知全能的神';
    if (id === 'herald') return '光之神使';
    return '英雄';
  }

  function heroSkillName(id) {
    if (id === 'sword') return '修羅附體';
    if (id === 'archer') return '致命毒霧';
    if (id === 'mage') return '隕石術';
    if (id === 'priest') return '致命節奏';
    if (id === 'god' || id === 'herald') return '';
    return '技能';
  }

  function priestAura(tower) {
    var radius = 2.15 + tower.level * (2.45 / 9);
    var bonus = 0.08 + tower.level * (0.14 / 9);
    var haste = 0.06 + tower.level * (0.12 / 9);
    var tempo = 0.005 + tower.level * (0.006 / 9);
    return { radius: radius, bonus: bonus, haste: haste, tempo: tempo };
  }

  function supportAura(tower) {
    var bonus = 0;
    var haste = 0;
    for (var i = 0; i < state.towers.length; i++) {
      var other = state.towers[i];
      if (other.type !== 'hero' || other.hero !== 'priest' || other.id === tower.id) continue;
      var aura = priestAura(other);
      var dist = Math.hypot((other.c + 0.5) - (tower.c + 0.5), (other.r + 0.5) - (tower.r + 0.5));
      if (dist > aura.radius + 0.001) continue;
      bonus = Math.max(bonus, aura.bonus);
      haste = Math.max(haste, aura.haste);
    }
    return { bonus: bonus, haste: haste };
  }

  function supportBonus(tower) {
    return supportAura(tower).bonus;
  }

  function applySupport(stats, tower) {
    var aura = supportAura(tower);
    if (aura.bonus <= 0 && aura.haste <= 0) return stats;
    var copy = cloneStats(stats);
    if (tower.type === 'mint') {
      if (copy.cooldown) copy.cooldown = copy.cooldown / (1 + aura.haste);
      return copy;
    }
    copy.damage = Math.max(1, Math.round((copy.damage || 0) * (1 + aura.bonus)));
    if (copy.cooldown) copy.cooldown = copy.cooldown / (1 + aura.haste);
    return copy;
  }

  function heroStats(tower) {
    var lv = tower.level;
    var stats;
    if (tower.hero === 'god') {
      stats = { range: 0, damage: 0, cooldown: 1, targets: 0 };
    } else if (tower.hero === 'herald') {
      stats = { range: HERALD_RADIUS, damage: 0, cooldown: 1, targets: 0 };
    } else if (tower.hero === 'priest') {
      stats = { range: priestAura(tower).radius, damage: 0, cooldown: 1, targets: 0 };
    } else if (tower.hero === 'sword') {
      stats = {
        range: 2.4 + lv * 0.16,
        damage: 26 + lv * 7,
        cooldown: Math.max(0.48, 0.78 - lv * 0.028),
        targets: 1,
        slashDist: 3.4 + lv * 0.18,
        slashMul: 1.2,
      };
    } else if (tower.hero === 'archer') {
      stats = {
        range: 3.6 + lv * (4.8 / 9),
        damage: 18 + lv * 5,
        cooldown: Math.max(0.55, 0.92 - lv * 0.03),
        targets: 1,
      };
    } else {
      stats = {
        range: 2.45 + lv * 0.08,
        damage: 20 + lv * 4,
        cooldown: Math.max(0.72, 1.08 - lv * 0.03),
        targets: 1,
      };
    }
    if (tower.hero !== 'priest' && tower.hero !== 'god' && tower.hero !== 'herald') stats = applySupport(stats, tower);
    return applyDivine(stats, tower);
  }

  function heroBlurb(tower) {
    var need = tower.level >= 9 ? 0 : 6 + tower.level * 4;
    var xp = tower.level >= 9 ? '已滿等' : ('經驗 ' + tower.xp + '/' + need);
    if (tower.hero === 'sword') return '走到射程內的路上追砍，刀路傷敵。每三下半月劍氣。主動：修羅附體。' + xp;
    if (tower.hero === 'archer') return '超遠單箭，打穿護盾、鐵甲並打掉抗性。主動：致命毒霧。' + xp;
    if (tower.hero === 'mage') return '火破盾、冰緩速、風擊退。主動：隕石術，全圖持續。' + xp;
    if (tower.hero === 'god') return '不攻擊。全場怪物減速 10%，回血與護盾減半。全體塔攻速 +20%、攻擊 +10%。';
    if (tower.hero === 'herald') return '不攻擊。半張圖光環內是神之力的一半：減速 5%，回血與護盾剩 75%，塔攻速 +10%、攻擊 +5%。';
    var aura = priestAura(tower);
    return '不攻擊。光環半徑 ' + fmt(aura.radius) + '，攻擊 +' + Math.round(aura.bonus * 100) + '%、攻速 +' + Math.round(aura.haste * 100) + '%。主動：致命節奏。' + xp;
  }

  function towerById(id) {
    if (id == null) return null;
    for (var i = 0; i < state.towers.length; i++) {
      if (state.towers[i].id === id) return state.towers[i];
    }
    return null;
  }

  function hasHeroId(id) {
    for (var i = 0; i < state.towers.length; i++) {
      if (state.towers[i].type === 'hero' && state.towers[i].hero === id) return true;
    }
    return false;
  }

  function heraldTower() {
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
      if (tower.type === 'hero' && tower.hero === 'herald') return tower;
    }
    return null;
  }

  function inHerald(x, y) {
    var herald = heraldTower();
    if (!herald) return false;
    return Math.hypot(x - (herald.c + 0.5), y - (herald.r + 0.5)) <= HERALD_RADIUS + 0.001;
  }

  function divineTowerBuff(tower) {
    if (!tower || (tower.type === 'hero' && (tower.hero === 'god' || tower.hero === 'herald'))) {
      return { power: 0, haste: 0 };
    }
    if (hasHeroId('god')) return { power: 0.1, haste: 0.2 };
    if (inHerald(tower.c + 0.5, tower.r + 0.5)) return { power: 0.05, haste: 0.1 };
    return { power: 0, haste: 0 };
  }

  function applyDivine(stats, tower) {
    var buff = divineTowerBuff(tower);
    if (!buff.power && !buff.haste) return stats;
    var copy = cloneStats(stats);
    if (copy.damage) copy.damage = Math.max(1, Math.round(copy.damage * (1 + buff.power)));
    if (copy.cooldown) copy.cooldown = copy.cooldown / (1 + buff.haste);
    return copy;
  }

  function healScale(enemy) {
    if (hasHeroId('god')) return 0.5;
    var pos = enemyPos(enemy);
    if (inHerald(pos.x, pos.y)) return 0.75;
    return 1;
  }

  function shieldFactor(enemy) {
    if (hasHeroId('god')) return 0.5;
    var pos = enemyPos(enemy);
    if (inHerald(pos.x, pos.y)) return 0.75;
    return 1;
  }

  function tightenShield(enemy) {
    if (!enemy) return;
    var factor = shieldFactor(enemy);
    var prev = enemy.shieldCut == null ? 1 : enemy.shieldCut;
    if (Math.abs(factor - prev) < 0.001) return;
    if (enemy.shield > 0) enemy.shield = Math.max(0, Math.round(enemy.shield * (factor / prev)));
    enemy.shieldCut = factor;
  }

  function heroRosterFull() {
    for (var i = 0; i < HERO_IDS.length; i++) {
      if (!hasHeroId(HERO_IDS[i])) return false;
    }
    return true;
  }

  function grantHeroXp(tower, amount) {
    if (!tower || tower.type !== 'hero' || tower.level >= 9) return;
    tower.xp += amount;
    var rose = false;
    var need = 6 + tower.level * 4;
    while (tower.level < 9 && tower.xp >= need) {
      tower.xp -= need;
      tower.level += 1;
      rose = true;
      need = 6 + tower.level * 4;
    }
    if (rose) {
      toast(heroName(tower.hero) + ' 升到 Lv.' + (tower.level + 1));
      if (state.selectedId === tower.id) renderInspector();
    }
  }

  function rewardHeroKill(enemy) {
    var killer = towerById(enemy.heroTag);
    if (killer) grantHeroXp(killer, 1);
    var pos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
      if (tower.type !== 'hero' || tower.hero !== 'priest') continue;
      if (killer && killer.id === tower.id) continue;
      var aura = priestAura(tower);
      if (Math.hypot(pos.x - (tower.c + 0.5), pos.y - (tower.r + 0.5)) <= aura.radius) grantHeroXp(tower, 1);
    }
  }

  function clearRunExtras() {
    state.walls = [];
    state.traps = [];
    state.fogs = [];
    state.gusts = [];
    state.interestLeft = 0;
    state.items = { wall: 0, push: 0 };
    state.pickMode = '';
    state.cardWave = 0;
    state.meteor = null;
    state.skyfalls = [];
    state.pendingHero = '';
    state.freeSpec = false;
    state.splashLedger = {};
    state.buildMenu = 'root';
    state.hellDeffs = [];
    state.hellDeffHalf = false;
    state.hellLockCd = 0;
  }

  function pathIndex(c, r) {
    for (var i = 0; i < route.cells.length; i++) {
      if (route.cells[i].c === c && route.cells[i].r === r) return i;
    }
    return -1;
  }

  function wallStop(dist) {
    var block = null;
    for (var i = 0; i < state.walls.length; i++) {
      var wall = state.walls[i];
      if (wall.dist > dist + 0.05 && (block == null || wall.dist < block)) block = wall.dist;
    }
    return block;
  }

  function updateWalls(dt) {
    for (var i = state.walls.length - 1; i >= 0; i--) {
      state.walls[i].life -= dt;
      if (state.walls[i].life <= 0) state.walls.splice(i, 1);
    }
  }

  function triggerTrap(enemy) {
    if (enemy.dead) return;
    var pos = pointAt(enemy.dist);
    var c = Math.floor(pos.x);
    var r = Math.floor(pos.y);
    for (var i = 0; i < state.traps.length; i++) {
      var trap = state.traps[i];
      if (trap.c !== c || trap.r !== r) continue;
      state.traps.splice(i, 1);
      if (state.berserk || controlImmune(enemy)) spawnFloater(pos.x, pos.y - 0.4, state.berserk ? '狂暴' : '抗控', '#c4b5fd');
      else if (resists(enemy, 'freeze')) resistFloater(enemy, '抗凍');
      else {
        enemy.freeze = Math.max(enemy.freeze || 0, 3);
        spawnFloater(pos.x, pos.y - 0.4, '陷阱', '#161616');
      }
      return;
    }
  }

  function dropTrap() {
    if (state.traps.length >= 10 || !route.cells.length) return;
    var open = [];
    for (var i = 0; i < route.cells.length; i++) {
      var cell = route.cells[i];
      var taken = false;
      for (var t = 0; t < state.traps.length; t++) {
        if (state.traps[t].c === cell.c && state.traps[t].r === cell.r) taken = true;
      }
      if (!taken) open.push(cell);
    }
    if (!open.length) return;
    var cell = open[Math.floor(Math.random() * open.length)];
    state.traps.push({ c: cell.c, r: cell.r });
  }

  function updateGusts(dt) {
    for (var i = state.gusts.length - 1; i >= 0; i--) {
      var gust = state.gusts[i];
      gust.life -= dt;
      if (gust.life <= 0) {
        state.gusts.splice(i, 1);
        continue;
      }
      for (var n = 0; n < state.enemies.length; n++) {
        var enemy = state.enemies[n];
        if (enemy.dead) continue;
        var pos = pointAt(enemy.dist);
        if (Math.hypot(pos.x - gust.x, pos.y - gust.y) <= gust.radius + enemy.radius) {
          enemy.dist = Math.max(0, enemy.dist - gust.pull * dt);
        }
      }
    }
  }

  function updateMeteor(dt) {
    if (!state.meteor) return;
    state.meteor.life -= dt;
    state.meteor.tick -= dt;
    var rocks = state.meteor.rocks || (state.meteor.rocks = []);
    for (var r = rocks.length - 1; r >= 0; r--) {
      rocks[r].life -= dt;
      if (rocks[r].life <= 0) rocks.splice(r, 1);
    }
    if (state.meteor.tick <= 0) {
      state.meteor.tick = 0.5;
      for (var i = 0; i < state.enemies.length; i++) {
        var enemy = state.enemies[i];
        if (enemy.dead) continue;
        hurtEnemy(enemy, Math.max(1, enemy.maxHp * state.meteor.pct), state.meteor.ownerId, { pierce: true, ignoreShield: true, keepDamage: true });
      }
      for (var n = 0; n < 3; n++) {
        rocks.push({
          tx: Math.random() * COLS,
          ty: Math.random() * ROWS,
          life: 0.48,
          max: 0.48,
        });
      }
    }
    if (state.meteor.life <= 0) state.meteor = null;
  }

  function updateFogs(dt) {
    for (var i = state.fogs.length - 1; i >= 0; i--) {
      var fog = state.fogs[i];
      fog.life -= dt;
      if (fog.life <= 0) {
        state.fogs.splice(i, 1);
        continue;
      }
      for (var n = 0; n < state.enemies.length; n++) {
        var enemy = state.enemies[n];
        if (enemy.dead) continue;
        var pos = enemyPos(enemy);
        if (Math.hypot(pos.x - fog.x, pos.y - fog.y) > fog.radius + enemy.radius * 0.4) continue;
        var fresh = !(enemy.fogTime > 0);
        enemy.fogTime = 0.35;
        enemy.fogAcc = (enemy.fogAcc || 0) + enemy.maxHp * fog.pct * dt;
        if (enemy.fogAcc >= 1) {
          var chip = Math.floor(enemy.fogAcc);
          enemy.fogAcc -= chip;
          hurtEnemy(enemy, chip, fog.ownerId, { pierce: true, ignoreShield: true, keepDamage: true });
        }
        if (fresh) spawnFloater(pos.x, pos.y - 0.45, '毒霧', '#3cbf4a');
      }
    }
  }

  function updateSlash(shot, dt) {
    shot.life -= dt;
    shot.spin = (shot.spin || 0) + dt * 12;
    var step = shot.speed * dt;
    shot.x += Math.cos(shot.angle) * step;
    shot.y += Math.sin(shot.angle) * step;
    shot.travel += step;
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead || shot.hit[enemy.id]) continue;
      var pos = pointAt(enemy.dist);
      if (Math.hypot(pos.x - shot.x, pos.y - shot.y) <= enemy.radius + 0.32) {
        shot.hit[enemy.id] = true;
        var dmg = shot.hpPct ? Math.max(1, enemy.maxHp * shot.hpPct) : shot.damage;
        hurtEnemy(enemy, dmg, shot.ownerId, {
          slashKill: true,
          keepDamage: !!shot.hpPct,
          pierce: !!shot.hpPct,
          ignoreShield: !!shot.hpPct,
        });
      }
    }
    if (shot.travel >= shot.maxDist || shot.life <= 0) shot.dead = true;
  }

  function updateCut(shot, dt) {
    shot.life -= dt;
    if (shot.life <= 0) shot.dead = true;
  }

  function swordBody(tower) {
    if (tower.fx == null || tower.fy == null) {
      tower.fx = tower.c + 0.5;
      tower.fy = tower.r + 0.5;
    }
    return { x: tower.fx, y: tower.fy };
  }

  function clampToHome(tower, x, y, range) {
    var hx = tower.c + 0.5;
    var hy = tower.r + 0.5;
    var dx = x - hx;
    var dy = y - hy;
    var dist = Math.hypot(dx, dy);
    var max = Math.max(0.25, range - 0.1);
    if (dist <= max) return { x: x, y: y };
    return { x: hx + (dx / dist) * max, y: hy + (dy / dist) * max };
  }

  function launchCrescent(tower, stats, hpPct) {
    var body = swordBody(tower);
    state.projectiles.push({
      kind: 'slash',
      x: body.x,
      y: body.y,
      angle: tower.aim || 0,
      spin: 0,
      crescent: true,
      damage: Math.round(stats.damage * (stats.slashMul || 1.2)),
      hpPct: hpPct || 0,
      speed: 6.4,
      travel: 0,
      maxDist: stats.slashDist || 3.4,
      life: 1.15,
      ownerId: tower.id,
      hit: {},
      dead: false,
    });
  }

  function swordSwing(tower, stats) {
    var body = swordBody(tower);
    var asura = tower.buffTime > 0;
    var reach = asura ? 1.5 : 1.15;
    var arc = asura ? 1.4 : 1.05;
    var hpPct = asura ? (0.0014 + tower.level * (0.0004 / 9)) : 0;
    tower.shots = (tower.shots || 0) + 1;
    tower.swing = 1;
    state.projectiles.push({
      kind: 'cut',
      x: body.x,
      y: body.y,
      angle: tower.aim || 0,
      life: asura ? 0.16 : 0.28,
      maxLife: asura ? 0.16 : 0.28,
      wide: asura,
      dead: false,
    });
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead) continue;
      var pos = enemyPos(enemy);
      var dx = pos.x - body.x;
      var dy = pos.y - body.y;
      var dist = Math.hypot(dx, dy);
      if (dist > reach + enemy.radius) continue;
      if (dist > 0.32) {
        var ang = Math.atan2(dy, dx);
        var diff = Math.atan2(Math.sin(ang - (tower.aim || 0)), Math.cos(ang - (tower.aim || 0)));
        if (Math.abs(diff) > arc) continue;
      }
      hurtEnemy(enemy, hpPct ? enemy.maxHp * hpPct : stats.damage, tower.id, {
        slashKill: true,
        keepDamage: !!hpPct,
        pierce: !!hpPct,
        ignoreShield: !!hpPct,
      });
    }
    if (tower.shots % 3 === 0) launchCrescent(tower, stats, hpPct);
    Sfx.arrow();
  }

  function updateSword(tower, dt, stats) {
    var asura = tower.buffTime > 0;
    var speed = (asura ? 11 : 1) * (2.55 + tower.level * 0.12);
    tower.cooldown -= dt;
    var body = swordBody(tower);
    var targets = targetsInRange(tower, stats.range, 8);
    var dest = { x: tower.c + 0.5, y: tower.r + 0.5 };
    if (targets.length) {
      var pick = targets[0];
      if (asura) {
        var far = -1;
        for (var t = 0; t < targets.length; t++) {
          var spot = enemyPos(targets[t]);
          var away = Math.hypot(spot.x - body.x, spot.y - body.y);
          if (away > far) {
            far = away;
            pick = targets[t];
          }
        }
      }
      var pos = enemyPos(pick);
      dest = clampToHome(tower, pos.x, pos.y, stats.range);
      tower.aim = Math.atan2(pos.y - body.y, pos.x - body.x);
    }
    tower.trail = tower.trail || [];
    tower.trail.push({ x: body.x, y: body.y });
    if (tower.trail.length > 5) tower.trail.shift();
    var mx = dest.x - tower.fx;
    var my = dest.y - tower.fy;
    var md = Math.hypot(mx, my);
    var step = speed * dt;
    if (md > 0.05) {
      var move = Math.min(md, step);
      tower.fx += (mx / md) * move;
      tower.fy += (my / md) * move;
      if (!targets.length) tower.aim = Math.atan2(my, mx);
    }
    if (tower.cooldown > 0) return;
    var melee = enemiesNear(tower.fx, tower.fy, asura ? 1.25 : 0.82);
    if (!melee.length) return;
    swordSwing(tower, stats);
    tower.cooldown = asura ? Math.max(0.05, stats.cooldown / 11) : stats.cooldown;
  }

  function enemiesNear(x, y, radius) {
    var list = [];
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead) continue;
      var pos = pointAt(enemy.dist);
      if (Math.hypot(pos.x - x, pos.y - y) <= radius + enemy.radius) list.push(enemy);
    }
    return list;
  }

  function castElement(tower, target) {
    tower.element = ((tower.element || 0) + 1) % 3;
    var roll = tower.element;
    var pos = pointAt(target.dist);
    var rank = tower.level / 9;
    if (roll === 0) {
      var burned = enemiesNear(pos.x, pos.y, 1.05);
      for (var i = 0; i < burned.length; i++) {
        var foe = burned[i];
        if (foe.shield > 0) {
          foe.shield = 0;
          spawnFloater(pointAt(foe.dist).x, pointAt(foe.dist).y - 0.55, '破盾', '#e02323');
        }
        hurtEnemy(foe, 28 + tower.level * 8, tower.id, { ignoreShield: true });
      }
      state.shocks.push({ x: pos.x, y: pos.y, life: 0.36, maxLife: 0.36, radius: 1.05, color: '#e02323', rings: 2, bomb: true });
    } else if (roll === 1) {
      var chilled = enemiesNear(pos.x, pos.y, 1.1);
      var slow = Math.min(0.55, 0.28 + rank * 0.22);
      for (var n = 0; n < chilled.length; n++) {
        hurtEnemy(chilled[n], 12 + tower.level * 3, tower.id);
        if (state.berserk || resists(chilled[n], 'slow')) {
          if (!state.berserk && resists(chilled[n], 'slow')) resistFloater(chilled[n], '抗緩');
        } else {
          chilled[n].slow = Math.max(chilled[n].slow || 0, slow);
          chilled[n].slowTime = Math.max(chilled[n].slowTime || 0, 1.8);
        }
      }
      state.shocks.push({ x: pos.x, y: pos.y, life: 0.36, maxLife: 0.36, radius: 1.1, color: '#2f7bff', rings: 2, bomb: false });
    } else {
      var pushed = enemiesNear(pos.x, pos.y, 1.15);
      var knock = 0.75 + rank * 0.55;
      for (var g = 0; g < pushed.length; g++) {
        hurtEnemy(pushed[g], 8 + tower.level * 2, tower.id);
        pushed[g].dist = Math.max(0, pushed[g].dist - knock);
      }
      state.gusts.push({ x: pos.x, y: pos.y, life: 0.45, radius: 1.15, pull: 0 });
    }
  }

  function hunterGuarded(enemy) {
    return !!(enemy && (enemy.shield > 0 || bossHas(enemy, 'armor') || bossHas(enemy, 'ward') || enemy.resist || hasHellDeff('thick')));
  }

  function hunterStrike(enemy, tower, damage) {
    var opts = { pierce: true, ignoreShield: true };
    var amount = damage;
    if (hunterGuarded(enemy)) {
      amount = Math.max(damage, enemy.maxHp * (0.012 + tower.level * 0.0011));
      var pos = enemyPos(enemy);
      if (enemy.shield > 0) enemy.shield = 0;
      if (enemy.resist) enemy.resist = '';
      enemy.firePierce = true;
      spawnFloater(pos.x, pos.y - 0.6, '貫甲', '#1c7a34');
    }
    hurtEnemy(enemy, amount, tower.id, opts);
  }

  function heroFire(tower, targets, stats) {
    tower.shots = (tower.shots || 0) + 1;
    tower.swing = 1;
    if (tower.hero === 'archer') {
      state.projectiles.push({
        kind: 'arrow',
        hunter: true,
        x: tower.c + 0.5,
        y: tower.r + 0.5,
        angle: tower.aim,
        damage: stats.damage,
        speed: 11,
        targetId: targets[0].id,
        dead: false,
        life: 1.6,
        ownerId: tower.id,
      });
      Sfx.arrow();
    } else if (tower.hero === 'mage') {
      castElement(tower, targets[0]);
      Sfx.arrow();
    }
  }

  function updateHero(tower, dt) {
    if (tower.skillCd > 0) tower.skillCd -= dt;
    if (tower.buffTime > 0) tower.buffTime -= dt;
    if (tower.hero === 'priest' || tower.hero === 'god' || tower.hero === 'herald') return;
    var stats = heroStats(tower);
    if (tower.hero === 'sword') {
      updateSword(tower, dt, stats);
      return;
    }
    tower.cooldown -= dt;
    var targets = targetsInRange(tower, stats.range, stats.targets || 1);
    if (!targets.length) return;
    var pos = enemyPos(targets[0]);
    tower.aim = Math.atan2(pos.y - (tower.r + 0.5), pos.x - (tower.c + 0.5));
    if (tower.cooldown > 0) return;
    heroFire(tower, targets, stats);
    tower.cooldown = stats.cooldown;
  }

  function castHeroSkill(tower) {
    if (!tower || tower.type !== 'hero') return;
    if (tower.hero === 'god' || tower.hero === 'herald') return;
    if (state.phase !== 'combat') { toast('戰鬥中才能施放'); return; }
    if (tower.skillCd > 0) return;
    var lv = tower.level;
    if (tower.hero === 'archer') {
      state.pickMode = 'fog';
      state.fogHeroId = tower.id;
      state.banner = { text: '致命毒霧', sub: '點一處丟出毒霧', life: 6 };
      toast('點地圖施放毒霧');
      renderInspector();
      return;
    }
    if (tower.hero === 'sword') {
      tower.skillCd = 36;
      tower.buffTime = Math.min(5, 3 + lv * 0.22);
      toast('修羅附體');
    } else if (tower.hero === 'priest') {
      tower.skillCd = 40;
      tower.buffTime = 5;
      toast('致命節奏');
    } else if (tower.hero === 'mage') {
      tower.skillCd = 42;
      state.meteor = {
        life: 7,
        tick: 0.05,
        pct: 0.004 + (lv / 9) * 0.0045,
        ownerId: tower.id,
        rocks: [],
      };
      toast('隕石術');
    }
    Sfx.ui();
    renderInspector();
  }

  function cardWaveDue(wave) {
    return (state.mode === 'infinite' || state.mode === 'custom') && wave > 0 && wave % 10 === 0;
  }

  function giftWaveDue(wave) {
    return wave > 0 && wave % 5 === 0;
  }

  function cardPool() {
    return [
      { id: 'gold', name: '金幣 +200', desc: '立刻獲得 200 金幣' },
      { id: 'interest', name: '利息', desc: '立刻 +50，接下來 5 波每波 +30' },
      { id: 'level', name: '塔升級', desc: '選一座塔永久 +1 等。沒有鐵匠時金幣最高 5 等，這張卡可到 6 等。有鐵匠後，金幣可升到 10 等。' },
      { id: 'wall', name: '阻擋物', desc: '放在路上，擋住怪物 10 秒' },
      { id: 'push', name: '擊退', desc: '使用後全場怪物沿路退回總長的 10%' },
      { id: 'hero', name: '英雄塔', desc: '自選一位尚未登場的英雄，免費放置，之後可拖曳換位' },
    ].filter(function (card) { return card.id !== 'hero' || !heroRosterFull(); });
  }

  function pickRandomCard(exceptId) {
    var pool = cardPool().filter(function (card) { return card.id !== exceptId; });
    if (!pool.length) pool = cardPool();
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function finishCard() {
    var cleared = state.cardWave;
    state.pickMode = '';
    state.freeSpec = false;
    state.pendingCard = null;
    state.pendingChoices = null;
    state.banner = null;
    syncHud();
    if (state.mode === 'custom' && cleared % 10 === 0) enterEdit();
    else requestStartWave(cleared + 1);
  }

  function applyLevelCard(tower) {
    if (tower.type === 'hero') { toast('英雄靠擊殺升級'); return false; }
    if (tower.type === 'smith') { toast('鐵匠不用升級'); return false; }
    var cardCap = hasBlacksmith() ? 9 : 5;
    if (tower.level >= cardCap) {
      toast(hasBlacksmith() ? '這座塔已是 10 等' : '這座塔已是 6 等');
      return false;
    }
    if (needsSpec(tower)) {
      state.freeSpec = true;
      selectTower(tower);
      toast('這次特化免費');
      renderInspector();
      return false;
    }
    state.freeSpec = false;
    tower.level += 1;
    toast(towerLabel(tower) + ' 升到 Lv.' + (tower.level + 1));
    Sfx.build();
    return true;
  }

  function placeHero(cell, invested, opts) {
    var heroId = state.pendingHero;
    state.towers.push({
      id: state.nextId++,
      type: 'hero',
      hero: heroId,
      c: cell.c,
      r: cell.r,
      level: 0,
      xp: 0,
      spec: null,
      invested: invested || 0,
      cooldown: 0.2,
      aim: -Math.PI / 2,
      shots: 0,
      skillCd: 0,
      buffTime: 0,
      fx: cell.c + 0.5,
      fy: cell.r + 0.5,
      trail: [],
      element: 0,
    });
    state.pendingHero = '';
    noteBuilt('hero', opts);
    Sfx.build();
    toast(heroName(heroId) + (invested ? ' 已從祭壇登場' : ' 已就位') + '，可拖曳換位');
  }

  function altarSpot() {
    if (altarCache && !isPath(altarCache.c, altarCache.r)) return altarCache;
    var prefs = [
      { c: 0, r: 0 }, { c: 8, r: 0 }, { c: 0, r: 12 }, { c: 8, r: 12 },
      { c: 0, r: 1 }, { c: 8, r: 1 }, { c: 1, r: 0 }, { c: 7, r: 0 },
    ];
    for (var i = 0; i < prefs.length; i++) {
      if (!isPath(prefs[i].c, prefs[i].r)) {
        altarCache = prefs[i];
        return altarCache;
      }
    }
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (!isPath(c, r)) {
          altarCache = { c: c, r: r };
          return altarCache;
        }
      }
    }
    altarCache = { c: 0, r: 0 };
    return altarCache;
  }

  function isAltarCell(c, r) {
    var spot = altarSpot();
    return !!(spot && spot.c === c && spot.r === r);
  }

  function heroSpawnCell() {
    var altar = altarSpot();
    var best = null;
    var bestD = 99;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (isPath(c, r) || towerAt(c, r) || isAltarCell(c, r)) continue;
        var dist = Math.abs(c - altar.c) + Math.abs(r - altar.r);
        if (dist < bestD) {
          bestD = dist;
          best = { c: c, r: r };
        }
      }
    }
    return best;
  }

  function canDropHero(cell, hero) {
    if (!cell || isPath(cell.c, cell.r) || isAltarCell(cell.c, cell.r)) return false;
    var other = towerAt(cell.c, cell.r);
    return !other || other.id === hero.id;
  }

  function summonHero(id) {
    if ((id === 'god' || id === 'herald') && !rankHeroUnlocked(id)) { toast('名次不夠，不能召喚'); return; }
    if (hasHeroId(id)) { toast('這位英雄已在場上'); return; }
    if (state.gold < HERO_COST) { toast('需要 ' + HERO_COST + ' 金幣'); return; }
    var cell = heroSpawnCell();
    if (!cell) { toast('沒有空地可登場'); return; }
    state.gold -= HERO_COST;
    state.pendingHero = id;
    placeHero(cell, HERO_COST);
    closeModal();
    syncHud();
  }

  function heroCatalog() {
    var list = [
      { id: 'sword', name: '緋紅劍客', desc: '追砍刀路，三下半月劍氣。1000 金' },
      { id: 'archer', name: '叢林獵手', desc: '超遠貫甲，毒霧禁療。1000 金' },
      { id: 'mage', name: '萬象法師', desc: '火破盾、冰緩、風退。1000 金' },
      { id: 'priest', name: '戰靈樂手', desc: '光環加攻與攻速。1000 金' },
      { id: 'god', name: '全知全能的神', desc: '第 1 到 3 名。全場減速、回血與盾減半。1000 金', locked: !rankHeroUnlocked('god') },
      { id: 'herald', name: '光之神使', desc: '第 4 到 10 名。半張圖，神之力的一半。1000 金', locked: !rankHeroUnlocked('herald') },
    ];
    return list;
  }

  function openAltar() {
    var classes = heroCatalog().filter(function (hero) { return !hasHeroId(hero.id); });
    if (!classes.length) { toast('沒有可召喚的英雄'); return; }
    openModal({
      tone: 'reward',
      shop: true,
      kicker: '祭壇',
      title: '召喚英雄',
      desc: '點商品即可召喚。同一種只能有一隻，放好後可拖曳換位。',
      actions: classes.map(function (hero) {
        var locked = !!hero.locked;
        return {
          heroId: hero.id,
          title: hero.name,
          note: hero.desc.replace(/[。．]?\s*\d+\s*金\s*$/, ''),
          side: locked ? '未解鎖' : (HERO_COST + ' 金'),
          label: hero.name,
          className: 'hero-pick' + (locked ? ' is-locked' : ''),
          disabled: locked,
          onClick: function () { if (!locked) summonHero(hero.id); },
        };
      }).concat([{ label: '退出', className: 'btn-ghost is-exit', onClick: closeModal }]),
    });
  }

  function placeWall(cell) {
    if (state.items.wall <= 0) return;
    var index = pathIndex(cell.c, cell.r);
    if (index < 0) { toast('點在道路上'); return; }
    for (var i = 0; i < state.walls.length; i++) {
      if (state.walls[i].c === cell.c && state.walls[i].r === cell.r) {
        toast('這裡已經有阻擋');
        return;
      }
    }
    state.walls.push({ dist: index, life: 10, c: cell.c, r: cell.r });
    state.items.wall -= 1;
    toast('阻擋 10 秒');
    syncItems();
  }

  function usePush() {
    if (state.items.push <= 0) return;
    var living = [];
    for (var i = 0; i < state.enemies.length; i++) {
      if (!state.enemies[i].dead) living.push(state.enemies[i]);
    }
    if (!living.length) { toast('場上沒有怪物'); return; }
    var back = (WAYPOINTS.length - 1) * 0.1;
    for (var n = 0; n < living.length; n++) living[n].dist = Math.max(0, living[n].dist - back);
    state.items.push -= 1;
    toast('全場退回一成路線');
    syncItems();
    Sfx.ui();
  }

  function handlePick(cell) {
    if (state.pickMode === 'level') {
      var tower = towerAt(cell.c, cell.r);
      if (!tower) { toast('點一座已放置的塔'); return true; }
      if (applyLevelCard(tower)) finishCard();
      return true;
    }
    if (state.pickMode === 'heroPlace') {
      if (isPath(cell.c, cell.r) || towerAt(cell.c, cell.r) || isAltarCell(cell.c, cell.r)) { toast('點沒有塔的空地'); return true; }
      placeHero(cell);
      finishCard();
      return true;
    }
    if (state.pickMode === 'fog') {
      var hero = towerById(state.fogHeroId);
      state.pickMode = '';
      state.banner = null;
      if (!hero || hero.skillCd > 0) return true;
      state.fogs.push({
        x: cell.c + 0.5,
        y: cell.r + 0.5,
        radius: 1.35 + hero.level * 0.08,
        life: 10,
        pct: 0.008 + hero.level * 0.0009,
        ownerId: hero.id,
      });
      hero.skillCd = 30;
      toast('致命毒霧');
      Sfx.ui();
      renderInspector();
      syncHud();
      return true;
    }
    if (state.pickMode === 'wall') {
      if (!isPath(cell.c, cell.r)) return false;
      placeWall(cell);
      state.pickMode = '';
      state.banner = null;
      syncHud();
      return true;
    }
    return false;
  }

  function chooseHero(id) {
    state.pendingHero = id;
    state.phase = 'prep';
    state.paused = false;
    state.pickMode = 'heroPlace';
    state.banner = { text: heroName(id), sub: '點空地放置，之後可拖曳換位', life: 6 };
    closeModal();
    toast('點空地放置' + heroName(id));
    syncHud();
  }

  function openHeroPick() {
    var classes = heroCatalog().filter(function (hero) {
      return HERO_IDS.indexOf(hero.id) >= 0 && !hasHeroId(hero.id);
    });
    if (!classes.length) { toast('沒有可召喚的英雄'); return; }
    openModal({
      tone: 'reward',
      kicker: '英雄',
      title: '選擇英雄',
      desc: '同一種只能有一隻。放好後可拖曳換位，靠擊殺升到 10 等。',
      actions: classes.map(function (hero) {
        return {
          label: hero.name + '　' + hero.desc,
          className: 'btn-ghost',
          onClick: function () { chooseHero(hero.id); },
        };
      }),
    });
  }

  function chooseCard(id) {
    closeModal();
    if (id === 'gold') {
      state.gold += 200;
      toast('獲得 200 金幣');
      finishCard();
    } else if (id === 'interest') {
      state.gold += 50;
      state.interestLeft += 5;
      var beforeInterest = unlockedTitleIds();
      var interestDeeds = loadDeeds();
      interestDeeds.interest = (interestDeeds.interest || 0) + 1;
      saveDeeds(interestDeeds);
      noteNewTitles(beforeInterest);
      toast('獲得 50 金幣，接下來 5 波每波 +30');
      finishCard();
    } else if (id === 'wall') {
      state.items.wall += 1;
      toast('獲得阻擋物');
      syncItems();
      finishCard();
    } else if (id === 'push') {
      state.items.push += 1;
      toast('獲得擊退');
      syncItems();
      finishCard();
    } else if (id === 'level') {
      var canBoost = false;
      for (var i = 0; i < state.towers.length; i++) {
        if (state.towers[i].type !== 'hero' && state.towers[i].level < 5) canBoost = true;
      }
      if (!canBoost) {
        toast('沒有可以升級的塔');
        finishCard();
        return;
      }
      state.phase = 'prep';
      state.paused = false;
      state.pickMode = 'level';
      state.selectedId = null;
      state.sellArmed = false;
      renderInspector();
      state.banner = { text: '點一座塔', sub: '永久 +1 等，最高 6 等', life: 6 };
      toast('點選要升級的塔');
      syncHud();
    } else if (id === 'hero') {
      if (heroRosterFull()) { toast('四位英雄都在場上'); finishCard(); return; }
      var room = false;
      for (var r = 0; r < ROWS && !room; r++) {
        for (var c = 0; c < COLS; c++) {
          if (!isPath(c, r) && !towerAt(c, r)) { room = true; break; }
        }
      }
      if (!room) { toast('沒有空地放英雄'); finishCard(); return; }
      openHeroPick();
    }
  }

  function showRandomCardModal() {
    var card = state.pendingCard;
    if (!card) return;
    openModal({
      tone: 'reward',
      kicker: '第 ' + state.cardWave + ' 波',
      title: '隨機獎勵',
      desc: '抽到「' + card.name + '」。' + card.desc + (state.cardRerolled ? '' : ' 不滿意可看廣告換一次。'),
      actions: [
        {
          label: '接受 ' + card.name,
          className: 'btn-mint',
          onClick: function () { chooseCard(card.id); },
        },
      ].concat(state.cardRerolled ? [] : [{
        label: '觀看廣告更換獎勵',
        className: 'btn-gold',
        ad: true,
        onClick: rerollCardAd,
      }]),
    });
  }

  function openCardDraft(cleared) {
    state.phase = 'reward';
    state.paused = true;
    state.cardWave = cleared;
    state.cardRerolled = false;
    state.pendingChoices = null;
    state.pendingCard = pickRandomCard();
    showRandomCardModal();
  }

  function rerollCardAd() {
    if (state.adBusy || state.cardRerolled || !state.pendingCard) return;
    state.adBusy = true;
    setModalBusy(true);
    Ads.showRewarded({ placement: 'card_reroll' }).then(function (result) {
      state.adBusy = false;
      if (!result || !result.rewarded) {
        setModalBusy(false);
        toast(result && result.error ? '廣告載入失敗' : '未看完廣告，獎勵未更換');
        return;
      }
      state.cardRerolled = true;
      state.pendingCard = pickRandomCard(state.pendingCard.id);
      Sfx.unlock();
      Sfx.ui();
      toast('已更換為 ' + state.pendingCard.name);
      showRandomCardModal();
    });
  }

  function needsSpec(tower) {
    var def = TOWERS[tower.type];
    return !!(def && def.specs && tower.level === 1 && !tower.spec);
  }

  function moveSpeed(enemy) {
    if (enemy.recoverGuard > 0) return 0;
    var speed = enemy.speed;
    if (!state.berserk && !controlImmune(enemy)) {
      if (enemy.freeze > 0 || enemy.stun > 0) return 0;
      if (enemy.slowTime > 0) speed *= 1 - (enemy.slow || 0);
    }
    if (hasHeroId('god')) speed *= 0.9;
    else {
      var pos = enemyPos(enemy);
      if (inHerald(pos.x, pos.y)) speed *= 0.95;
    }
    return speed;
  }

  function updateTowers(dt) {
    if (state.phase !== 'combat') return;
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
      if (tower.chill > 0) continue;
      if (tower.type === 'hero') {
        updateHero(tower, dt);
        continue;
      }
      if (tower.type === 'smith') continue;
      var stats = towerStats(tower);
      tower.cooldown -= dt;
      if (tower.type === 'mint') {
        if (tower.cooldown <= 0) {
          var gain = Math.max(1, stats.goldGen || 0);
          state.gold += gain;
          state.waveGoldEarned += gain;
          spawnFloater(tower.c + 0.5, tower.r + 0.15, '+' + gain, '#f2c14e');
          tower.cooldown = stats.cooldown;
          tower.flash = 1;
          syncHud();
        }
        continue;
      }
      var want = isCannonPath(tower) ? Math.min(3, stats.shots || 1) : (stats.targets || 1);
      var targets = targetsInRange(tower, stats.range, want);
      if (!targets.length) continue;
      var pos = enemyPos(targets[0]);
      var desired = Math.atan2(pos.y - (tower.r + 0.5), pos.x - (tower.c + 0.5));
      tower.aim = lerpAngle(tower.aim, desired, Math.min(1, dt * 12));
      if (tower.cooldown <= 0) {
        fire(tower, targets, stats);
        tower.cooldown = stats.cooldown;
      }
    }
  }

  function scaledKillGold(base) {
    var gold = Math.max(1, base || 1);
    if (state.wave <= 20) return gold;
    var over = state.wave - 20;
    // 後期擊殺金幣遞減，避免無限模式錢淹；產錢塔補經濟
    var mul = Math.max(0.26, 1 - over * 0.032);
    return Math.max(1, Math.round(gold * mul));
  }

  function targetsInRange(tower, range, limit) {
    var ox = tower.c + 0.5;
    var oy = tower.r + 0.5;
    var found = [];
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead) continue;
      var pos = enemyPos(enemy);
      var dx = pos.x - ox;
      var dy = pos.y - oy;
      if (dx * dx + dy * dy > range * range) continue;
      found.push(enemy);
    }
    found.sort(function (a, b) { return b.dist - a.dist; });
    if (found.length > limit) found.length = limit;
    return found;
  }

  function launchShell(tower, enemy, stats, volleyId) {
    var originX = tower.c + 0.5;
    var originY = tower.r + 0.5;
    var pos = pointAt(enemy.dist);
    var travel = Math.max(0.12, Math.hypot(pos.x - originX, pos.y - originY) / 4.2);
    var lead = Math.min(WAYPOINTS.length - 1, enemy.dist + moveSpeed(enemy) * travel * 0.8);
    var target = pointAt(lead);
    var total = Math.hypot(target.x - originX, target.y - originY) || 0.01;
    state.projectiles.push({
      kind: 'shell',
      x: originX,
      y: originY,
      tx: target.x,
      ty: target.y,
      total: total,
      damage: stats.damage,
      splash: stats.splash,
      ownerId: tower.id,
      speed: 4.2,
      dead: false,
      effect: stats.effect || '',
      slow: stats.slow || 0,
      slowTime: stats.slowTime || 0,
      burn: stats.burn || 0,
      burnTime: stats.burnTime || 0,
      burnEvery: stats.burnEvery || 0.5,
      color: tower.type === 'fire' ? '#e02323' : '#161616',
      rings: tower.type === 'fire' || isCannonPath(tower) ? 3 : 1,
      bomb: tower.type === 'fire',
      falloff: isCannonPath(tower) || tower.type === 'fire',
      volleyId: volleyId || 0,
    });
  }

  function boltPreyBonus(enemy) {
    if (!enemy) return 1;
    if (enemy.flying || enemy.type === 'hopper' || enemy.jumping) return 1.4;
    return 1;
  }

  function stunEnemy(enemy, time) {
    if (!enemy || enemy.dead || state.berserk || controlImmune(enemy) || resists(enemy, 'shock')) return;
    var fresh = !(enemy.stun > 0);
    enemy.stun = Math.max(enemy.stun || 0, time || 1);
    if (!fresh) return;
    var pos = pointAt(enemy.dist);
    spawnFloater(pos.x, pos.y - 0.55, '麻痺', '#e0b000');
  }

  function fire(tower, targets, stats) {
    var originX = tower.c + 0.5;
    var originY = tower.r + 0.5;
    tower.flash = 1;
    if (tower.type === 'bolt') {
      var chain = chainFrom(targets[0], stats.chain || 1, stats.chainRange || 1.8);
      if (!chain.length) {
        resistFloater(targets[0], '抗電');
        Sfx.arrow();
        return;
      }
      var fromX = originX;
      var fromY = originY;
      for (var c = 0; c < chain.length; c++) {
        var hit = pointAt(chain[c].dist);
        state.arcs.push({
          x1: fromX,
          y1: fromY,
          x2: hit.x,
          y2: hit.y,
          life: 0.16,
          maxLife: 0.16,
        });
        hurtEnemy(chain[c], Math.round(stats.damage * boltPreyBonus(chain[c])), tower.id);
        if (!chain[c].dead) stunEnemy(chain[c], stats.stunTime || 1);
        fromX = hit.x;
        fromY = hit.y;
      }
      Sfx.arrow();
      vibrateHit();
      return;
    }
    if (isArrowPath(tower)) {
      for (var i = 0; i < targets.length; i++) {
        state.projectiles.push({
          kind: 'arrow',
          x: originX,
          y: originY,
          angle: tower.aim,
          damage: stats.damage,
          speed: 9.5,
          targetId: targets[i].id,
          dead: false,
          life: 1.5,
          ownerId: tower.id,
        });
      }
      Sfx.arrow();
      vibrateHit();
      return;
    }
    if (tower.type === 'ice') {
      state.projectiles.push({
        kind: 'wave',
        x: originX,
        y: originY,
        ownerId: tower.id,
        radius: 0,
        maxRadius: stats.range,
        speed: stats.range / 0.42,
        damage: stats.damage,
        slow: stats.slow || 0,
        slowTime: stats.slowTime || 0,
        color: '#2f7bff',
        hit: {},
        dead: false,
      });
      Sfx.cannon();
      vibrate(16);
      return;
    }
    if (tower.type === 'poison') {
      state.projectiles.push({
        kind: 'poison',
        x: originX,
        y: originY,
        ownerId: tower.id,
        damage: stats.damage,
        poison: stats.poison,
        poisonTime: stats.poisonTime,
        poisonEvery: stats.poisonEvery,
        speed: 6.2,
        targetId: targets[0].id,
        color: '#3cbf4a',
        dead: false,
        life: 1.6,
      });
      Sfx.cannon();
      vibrate(12);
      return;
    }
    if (isCannonPath(tower)) {
      var volleyId = state.nextId++;
      state.splashLedger[volleyId] = {};
      var shots = Math.min(3, stats.shots || 1, targets.length);
      for (var s = 0; s < shots; s++) launchShell(tower, targets[s], stats, volleyId);
      Sfx.cannon();
      vibrate(16);
      return;
    }
    if (tower.type === 'fire') {
      var fireVolley = state.nextId++;
      state.splashLedger[fireVolley] = {};
      launchShell(tower, targets[0], stats, fireVolley);
      Sfx.cannon();
      vibrate(16);
      return;
    }
  }

  function chainFrom(first, count, reach) {
    var hits = [];
    var used = {};
    used[first.id] = true;
    var from = pointAt(first.dist);
    if (!resists(first, 'shock')) hits.push(first);
    var limit = reach * reach;
    while (hits.length < count) {
      var next = null;
      var best = limit;
      for (var i = 0; i < state.enemies.length; i++) {
        var enemy = state.enemies[i];
        if (enemy.dead || used[enemy.id] || resists(enemy, 'shock')) continue;
        var pos = pointAt(enemy.dist);
        var dx = pos.x - from.x;
        var dy = pos.y - from.y;
        var dist = dx * dx + dy * dy;
        if (dist <= best) {
          best = dist;
          next = enemy;
        }
      }
      if (!next) break;
      hits.push(next);
      used[next.id] = true;
      from = pointAt(next.dist);
    }
    return hits;
  }

  function updateProjectiles(dt) {
    if (state.phase !== 'combat') return;
    var liveVolley = {};
    for (var i = 0; i < state.projectiles.length; i++) {
      var shot = state.projectiles[i];
      if (shot.dead) continue;
      if (shot.volleyId) liveVolley[shot.volleyId] = true;
      if (shot.kind === 'arrow') updateArrow(shot, dt);
      else if (shot.kind === 'slash') updateSlash(shot, dt);
      else if (shot.kind === 'cut' || shot.kind === 'killslash') updateCut(shot, dt);
      else if (shot.kind === 'poison') updatePoison(shot, dt);
      else if (shot.kind === 'wave') updateWave(shot, dt);
      else updateShell(shot, dt);
      if (!shot.dead && shot.volleyId) liveVolley[shot.volleyId] = true;
    }
    for (var key in state.splashLedger) {
      if (!Object.prototype.hasOwnProperty.call(state.splashLedger, key)) continue;
      if (!liveVolley[key]) delete state.splashLedger[key];
    }
  }

  function updateArrow(shot, dt) {
    shot.life -= dt;
    if (shot.life <= 0) { shot.dead = true; return; }
    var target = findEnemy(shot.targetId);
    if (!target) {
      target = nearestEnemy(shot.x, shot.y, 1.2);
      if (target) shot.targetId = target.id;
    }
    if (!target) { shot.dead = true; return; }
    var pos = enemyPos(target);
    var dx = pos.x - shot.x;
    var dy = pos.y - shot.y;
    var dist = Math.hypot(dx, dy) || 0.0001;
    shot.angle = Math.atan2(dy, dx);
    if (dist <= target.radius + 0.12) {
      shot.dead = true;
      if (shot.hunter) {
        var hunter = towerById(shot.ownerId);
        if (hunter) hunterStrike(target, hunter, shot.damage);
        else hurtEnemy(target, shot.damage, shot.ownerId, { pierce: true, ignoreShield: true });
      } else hurtEnemy(target, shot.damage, shot.ownerId);
      return;
    }
    var step = Math.min(dist, shot.speed * dt);
    shot.x += (dx / dist) * step;
    shot.y += (dy / dist) * step;
  }

  function updatePoison(shot, dt) {
    shot.life -= dt;
    if (shot.life <= 0) { shot.dead = true; return; }
    var target = findEnemy(shot.targetId);
    if (!target) {
      target = nearestEnemy(shot.x, shot.y, 1.2);
      if (target) shot.targetId = target.id;
    }
    if (!target) { shot.dead = true; return; }
    var pos = enemyPos(target);
    var dx = pos.x - shot.x;
    var dy = pos.y - shot.y;
    var dist = Math.hypot(dx, dy) || 0.0001;
    if (dist <= target.radius + 0.12) {
      shot.dead = true;
      hurtEnemy(target, shot.damage, shot.ownerId);
      if (!target.dead) applyPoison(target, shot.poison, shot.poisonTime, shot.poisonEvery);
      return;
    }
    var step = Math.min(dist, shot.speed * dt);
    shot.x += (dx / dist) * step;
    shot.y += (dy / dist) * step;
  }

  function applyPoison(enemy, amount, time, every) {
    if (resists(enemy, 'poison')) {
      resistFloater(enemy, '抗毒');
      return;
    }
    var fresh = !(enemy.poisonTime > 0);
    var left = ailmentLeft(enemy, 'poison', time);
    if (left <= 0) return;
    if (!enemy.poison || amount >= enemy.poison) enemy.poison = amount;
    enemy.poisonTime = left;
    enemy.poisonEvery = every || 0.4;
    if (fresh) {
      enemy.poisonTick = enemy.poisonEvery;
      spawnFloater(pointAt(enemy.dist).x, pointAt(enemy.dist).y - 0.45, '中毒', '#3cbf4a');
    }
    if (isPoisonCounterTarget(enemy)) triggerPoisonCounter(enemy);
  }

  function updateShell(shot, dt) {
    var dx = shot.tx - shot.x;
    var dy = shot.ty - shot.y;
    var dist = Math.hypot(dx, dy) || 0.0001;
    if (dist <= 0.16) {
      shot.dead = true;
      explode(shot);
      return;
    }
    var step = Math.min(dist, shot.speed * dt);
    shot.x += (dx / dist) * step;
    shot.y += (dy / dist) * step;
  }

  function splashFalloff(dist, radius) {
    if (radius <= 0) return 1;
    var t = Math.min(1, Math.max(0, dist / radius));
    return Math.max(0.25, 1 - t * 0.75);
  }

  function applySplashHit(enemy, shot, amount) {
    var ledger = shot.volleyId ? state.splashLedger[shot.volleyId] : null;
    if (ledger) {
      var prev = ledger[enemy.id] || 0;
      if (amount <= prev) return false;
      hurtEnemy(enemy, amount - prev, shot.ownerId);
      ledger[enemy.id] = amount;
    } else {
      hurtEnemy(enemy, amount, shot.ownerId);
    }
    return true;
  }

  function explode(shot) {
    Sfx.cannon();
    burst(shot.tx, shot.ty, shot.color || '#ffb15a', shot.bomb ? 22 : 14);
    state.shocks.push({
      x: shot.tx,
      y: shot.ty,
      life: shot.bomb ? 0.42 : 0.34,
      maxLife: shot.bomb ? 0.42 : 0.34,
      radius: shot.splash,
      color: shot.color || '#ffb15a',
      rings: shot.rings || 1,
      bomb: shot.bomb,
    });
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead) continue;
      var pos = pointAt(enemy.dist);
      var dist = Math.hypot(pos.x - shot.tx, pos.y - shot.ty);
      var reach = shot.splash + enemy.radius * 0.35;
      if (dist > reach) continue;
      var mul = shot.falloff ? splashFalloff(dist, shot.splash) : (dist <= shot.splash * 0.5 ? 1 : 0.62);
      applySplashHit(enemy, shot, shot.damage * mul);
      if (!enemy.dead) applyShellEffect(enemy, shot);
    }
  }

  function applyShellEffect(enemy, shot) {
    var pos = pointAt(enemy.dist);
    if (shot.effect === 'slow' && shot.slow > 0) {
      chillEnemy(enemy, shot.slow, shot.slowTime);
    } else if (shot.effect === 'burn' && shot.burn > 0) {
      if (resists(enemy, 'burn')) {
        resistFloater(enemy, '抗燒');
        return;
      }
      var freshBurn = !(enemy.burnTime > 0);
      var left = ailmentLeft(enemy, 'burn', shot.burnTime);
      if (left <= 0) return;
      if (!enemy.burn || shot.burn >= enemy.burn) enemy.burn = shot.burn;
      enemy.burnTime = left;
      enemy.burnEvery = shot.burnEvery;
      if (freshBurn) {
        enemy.burnTick = enemy.burnEvery || 0.5;
        spawnFloater(pos.x, pos.y - 0.45, '灼燒', '#e02323');
      }
      if (isFireCounterTarget(enemy)) triggerFireCounter(enemy);
    }
  }

  function chillEnemy(enemy, slow, slowTime) {
    if (state.berserk || controlImmune(enemy)) return;
    var pos = pointAt(enemy.dist);
    if (resists(enemy, 'slow')) resistFloater(enemy, '抗緩');
    else {
      var freshSlow = !(enemy.slowTime > 0);
      enemy.slow = Math.max(enemy.slow || 0, slow);
      enemy.slowTime = slowTime;
      if (freshSlow) spawnFloater(pos.x, pos.y - 0.45, '緩速', '#2f7bff');
    }
    enemy.iceHits = (enemy.iceHits || 0) + 1;
    if (enemy.iceHits < 3) return;
    enemy.iceHits = 0;
    if (resists(enemy, 'freeze')) {
      resistFloater(enemy, '抗凍');
      return;
    }
    enemy.freeze = 0.9;
    spawnFloater(pos.x, pos.y - 0.7, '凍結', '#2f7bff');
  }

  function updateWave(shot, dt) {
    shot.radius += shot.speed * dt;
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead || shot.hit[enemy.id]) continue;
      var pos = pointAt(enemy.dist);
      var dist = Math.hypot(pos.x - shot.x, pos.y - shot.y);
      if (dist > shot.maxRadius || dist > shot.radius + enemy.radius * 0.2) continue;
      shot.hit[enemy.id] = true;
      hurtEnemy(enemy, shot.damage, shot.ownerId);
      if (!enemy.dead) chillEnemy(enemy, shot.slow, shot.slowTime);
    }
    if (shot.radius >= shot.maxRadius) shot.dead = true;
  }

  function findEnemy(id) {
    for (var i = 0; i < state.enemies.length; i++) {
      if (state.enemies[i].id === id && !state.enemies[i].dead) return state.enemies[i];
    }
    return null;
  }

  function nearestEnemy(x, y, radius) {
    var best = null;
    var bestDist = radius;
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead) continue;
      var pos = enemyPos(enemy);
      var dist = Math.hypot(pos.x - x, pos.y - y);
      if (dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }
    return best;
  }

  function hurtEnemy(enemy, amount, ownerId, opts) {
    if (!enemy || enemy.dead || state.phase !== 'combat') return;
    if (enemy.recoverGuard > 0) return;
    opts = opts || {};
    if (ownerId) {
      var owner = towerById(ownerId);
      if (owner && owner.type === 'hero') enemy.heroTag = owner.id;
    }
    var damage = Math.max(1, Math.round(amount));
    if (ownerId && !opts.keepDamage) {
      var tempo = tempoHit(ownerId, enemy);
      if (tempo > 0) {
        damage = Math.max(1, Math.round(tempo));
        opts.ignoreShield = true;
      }
    }
    var kitArmor = chapterHasKit('armor') && !enemy.boss;
    var eliteArmor = !!(enemy.elite && bossHas(enemy, 'armor'));
    var pierceArmor = opts.pierce || enemy.firePierce || (enemy.burnTime > 0 && (bossHas(enemy, 'armor') || kitArmor));
    if (bossHas(enemy, 'armor') && !enemy.elite && !pierceArmor) damage = Math.max(1, Math.round(damage * 0.5));
    else if ((eliteArmor || kitArmor) && !pierceArmor) damage = Math.max(1, Math.round(damage * 0.75));
    if (enemy.shield > 0 && !opts.ignoreShield) {
      var blocked = Math.min(enemy.shield, damage);
      enemy.shield -= blocked;
      damage -= blocked;
      enemy.hitFlash = 0.12;
      if (enemy.shield <= 0) {
        var broken = pointAt(enemy.dist);
        spawnFloater(broken.x, broken.y - 0.6, '護盾破裂', '#67e8f9');
        shatterShieldFx(broken.x, broken.y);
      }
      if (damage <= 0) return;
    }
    enemy.hp -= damage;
    enemy.hitFlash = 0.12;
    if (state.time - enemy.lastNum > 0.07) {
      enemy.lastNum = state.time;
      var pos = enemyPos(enemy);
      spawnFloater(pos.x, pos.y - 0.35, String(damage), '#e02323');
    }
    if (enemy.hp <= 0) {
      if (enemy.type === 'bone' && !enemy.revived) {
        reviveBone(enemy);
        return;
      }
      if (opts.slashKill) spawnSlashKill(enemy);
      killEnemy(enemy);
    }
  }

  function tempoHit(ownerId, enemy) {
    var tower = towerById(ownerId);
    if (!tower || !enemy || enemy.maxHp <= 0) return 0;
    var best = 0;
    for (var i = 0; i < state.towers.length; i++) {
      var bard = state.towers[i];
      if (bard.type !== 'hero' || bard.hero !== 'priest' || !(bard.buffTime > 0)) continue;
      var aura = priestAura(bard);
      var dist = Math.hypot((bard.c + 0.5) - (tower.c + 0.5), (bard.r + 0.5) - (tower.r + 0.5));
      if (dist <= aura.radius + 0.001) best = Math.max(best, aura.tempo);
    }
    if (best <= 0) return 0;
    var stats = tower.type === 'hero' ? heroStats(tower) : towerStats(tower);
    var cd = Math.max(0.18, stats.cooldown || 0.8);
    return enemy.maxHp * best * cd;
  }

  function spawnSlashKill(enemy) {
    var pos = enemyPos(enemy);
    state.projectiles.push({
      kind: 'killslash',
      x: pos.x,
      y: pos.y,
      life: 0.42,
      maxLife: 0.42,
      dead: false,
    });
    burst(pos.x, pos.y, '#e02323', 12);
  }

  function reviveBone(enemy) {
    enemy.revived = true;
    enemy.hp = Math.max(1, Math.round(enemy.maxHp * 0.5));
    enemy.hitFlash = 0.28;
    enemy.rise = 0.45;
    var pos = enemyPos(enemy);
    spawnFloater(pos.x, pos.y - 0.55, '復活', '#e07a2f');
    burst(pos.x, pos.y, '#efe6d6', 8);
  }

  function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    if (bossHas(enemy, 'split')) {
      var splitCount = enemy.elite ? 2 : 3;
      for (var s = 0; s < splitCount; s++) {
        var shard = makeEnemy('swift', state.wave);
        shard.type = 'shard';
        shard.hp = enemy.splitHp;
        shard.maxHp = enemy.splitHp;
        shard.color = '#e4c6ff';
        shard.radius = 0.26;
        shard.gold = 5 + state.wave;
        shard.leak = 1;
        shard.resist = '';
        shard.flying = false;
        shard.noSplit = true;
        shard.dist = Math.max(0, Math.min(enemy.dist + (s - (splitCount - 1) / 2) * 0.22, WAYPOINTS.length - 1.05));
        queueEnemy(shard);
      }
      var splitPos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
      spawnFloater(splitPos.x, splitPos.y - 0.5, '分裂', '#c084fc');
      markAbilityFx(enemy, 'split');
    }
    if (chapterHasKit('split') && !enemy.boss && !enemy.elite && !enemy.noSplit && enemy.type !== 'shard') {
      var kitChildHp = Math.max(1, Math.round(enemy.maxHp * 0.3));
      for (var ks = 0; ks < 2; ks++) {
        var kitChild = makeEnemy('grunt', state.wave);
        kitChild.hp = kitChildHp;
        kitChild.maxHp = kitChildHp;
        kitChild.gold = Math.max(1, Math.floor((enemy.gold || 1) * 0.2));
        kitChild.leak = 1;
        kitChild.noSplit = true;
        kitChild.radius = Math.max(0.2, (enemy.radius || 0.3) * 0.78);
        kitChild.dist = Math.max(0, Math.min(enemy.dist + (ks === 0 ? -0.18 : 0.18), WAYPOINTS.length - 1.05));
        queueEnemy(kitChild);
      }
      var kitSplitPos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
      spawnFloater(kitSplitPos.x, kitSplitPos.y - 0.45, '分裂', '#c084fc');
    }
    var hellSplit = hellDeffValue('split');
    if (hellSplit > 0 && !enemy.boss && !enemy.noSplit && enemy.type !== 'shard') {
      var childType = enemy.type === 'hopper' || enemy.type === 'brute' || enemy.type === 'devil' || enemy.type === 'ram' || enemy.type === 'bone' ? 'grunt' : (enemy.type || 'grunt');
      var childHp = Math.max(1, Math.round(enemy.maxHp * hellSplit));
      var spdBonus = hellDeffValue('speed');
      for (var h = 0; h < 2; h++) {
        var child = makeEnemy(childType, state.wave);
        child.hp = childHp;
        child.maxHp = childHp;
        child.gold = Math.max(1, Math.floor((enemy.gold || 1) * 0.2));
        child.leak = 1;
        child.noSplit = true;
        child.skipHellStats = true;
        child.resist = enemy.resist || '';
        child.radius = Math.max(0.2, (enemy.radius || 0.3) * 0.78);
        if (spdBonus > 0) child.speed *= 1 + spdBonus;
        child.dist = Math.max(0, Math.min(enemy.dist + (h === 0 ? -0.18 : 0.18), WAYPOINTS.length - 1.05));
        queueEnemy(child);
      }
      var hellPos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
      spawnFloater(hellPos.x, hellPos.y - 0.45, '裂殖', '#ff8fab');
    }
    var gain = scaledKillGold(enemy.gold);
    state.gold += gain;
    state.waveGoldEarned += gain;
    enemy.gold = gain;
    rewardHeroKill(enemy);
    var pos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
    spawnFloater(pos.x, pos.y - 0.1, '+' + enemy.gold, '#f2c14e');
    burst(pos.x, pos.y, enemy.color, 10);
    Sfx.kill();
  }

  function countdownBuildOpen() {
    return state.clearCountdown > 0 && (state.phase === 'reward' || state.phase === 'victory');
  }

  function beginClearCountdown(kind) {
    state.clearKind = kind || 'wave';
    state.clearCountdown = 5;
    state.paused = false;
    state.projectiles = [];
    state.arcs = [];
    var title = kind === 'victory' ? (starGlyph(starCount(state.runStarMask || 0)) + ' 通過') : ('第 ' + state.wave + ' 波守住了');
    var sub = kind === 'victory'
      ? (victoryStarLine() + ' · ' + (nextStage(state.stagePlan) && stageUnlocked(nextStage(state.stagePlan)) ? '即將下一關' : '即將返回關卡'))
      : (state.mode === 'custom' && state.wave % 10 === 0
        ? '5 秒後獎勵，領完再改道（可點提前）'
        : (cardWaveDue(state.wave)
          ? '5 秒後隨機獎勵（可點提前）'
          : (giftWaveDue(state.wave) ? '5 秒後廣告贈塔（可點提前）' : '5 秒後下一波（可點提前）')));
    state.banner = { text: title, sub: sub, life: 5.2, countdown: true };
  }

  function tickClearCountdown(dt) {
    if (!(state.clearCountdown > 0)) return;
    state.clearCountdown -= dt;
    var left = Math.max(0, Math.ceil(state.clearCountdown));
    if (state.banner && state.banner.countdown) {
      state.banner.life = Math.max(state.banner.life, state.clearCountdown + 0.05);
      if (state.clearKind === 'victory') {
        var upcoming = nextStage(state.stagePlan);
        state.banner.text = starGlyph(starCount(state.runStarMask || 0)) + ' 通過';
        state.banner.sub = victoryStarLine() + ' · ' + (upcoming && stageUnlocked(upcoming) ? '下一關 ' : '返回關卡 ') + left;
      } else if (state.mode === 'custom' && state.wave % 10 === 0) state.banner.sub = '獎勵後改道 ' + left + '（可點提前）';
      else if (cardWaveDue(state.wave)) state.banner.sub = '隨機獎勵 ' + left + '（可點提前）';
      else if (giftWaveDue(state.wave)) state.banner.sub = '廣告贈塔 ' + left + '（可點提前）';
      else state.banner.sub = '下一波 ' + left + '（可點提前）';
    }
    syncHud();
    if (state.clearCountdown > 0) return;
    state.clearCountdown = 0;
    state.banner = null;
    if (state.clearKind === 'victory') finishVictoryAdvance();
    else goNextWave();
  }

  function tickEditCountdown(dt) {
    if (state.phase !== 'edit' || !(state.editCountdown > 0)) return;
    state.editCountdown -= dt;
    var left = Math.max(0, Math.ceil(state.editCountdown));
    if (state.banner && state.banner.countdown) {
      state.banner.life = Math.max(state.banner.life, state.editCountdown + 0.05);
      state.banner.sub = '還有 ' + left + ' 秒 · 點完成改道即可';
    }
    syncHud();
    if (state.editCountdown > 0) return;
    state.editCountdown = 0;
    finishEdit();
  }

  function finishVictoryAdvance() {
    state.clearKind = '';
    closeModal();
    var upcoming = nextStage(state.stagePlan);
    if (upcoming && stageUnlocked(upcoming)) startRun('campaign', upcoming.stageId);
    else openStages(state.chapter);
  }

  function onWaveClear() {
    if (state.phase !== 'combat') return;
    recordRunDeeds();
    state.paused = true;
    state.projectiles = [];
    state.arcs = [];
    state.tileGainText = '';
    if (state.mode === 'custom' && state.wave % 5 === 0) state.tileGainText = grantRouteTiles();
    Sfx.fanfare();
    toast(rewardDesc());
    if (state.tileGainText) toast('獲得路線圖 ' + state.tileGainText);
    if (state.mode === 'campaign' && state.wave >= state.levelWaves) {
      state.phase = 'victory';
      state.outcome = 'victory';
      var beforeStars = unlockedTitleIds();
      var mask = recordStarMask();
      noteNewTitles(beforeStars);
      beginClearCountdown('victory');
      if (state.banner) state.banner.text = starGlyph(starCount(mask)) + ' 通過';
      return;
    }
    state.phase = 'reward';
    state.outcome = 'reward';
    beginClearCountdown('wave');
  }

  function grantRouteTiles() {
    var names = [];
    for (var i = 0; i < 3; i++) {
      var kind = Math.random() < 0.5 ? 'straight' : 'turn';
      state.tiles[kind] += 1;
      names.push(kind === 'straight' ? '直線' : '轉彎');
    }
    return names.join('、');
  }

  function starCount(mask) {
    var n = mask | 0;
    var count = 0;
    if (n & 1) count += 1;
    if (n & 2) count += 1;
    if (n & 4) count += 1;
    return count;
  }

  function towerCountOf(type) {
    var total = 0;
    for (var i = 0; i < state.towers.length; i++) {
      if (state.towers[i].type === type) total += 1;
    }
    return total;
  }

  function builtTowerCount() {
    var total = 0;
    var built = state.built || {};
    var keys = Object.keys(built);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] === 'hero') continue;
      total += built[keys[i]] || 0;
    }
    return total;
  }

  function towerRankMet(type, displayLevel) {
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
      if (tower.type === type && tower.level + 1 >= displayLevel) return true;
    }
    return false;
  }

  function stageClearedNow() {
    return state.phase === 'victory' || state.outcome === 'victory';
  }

  function goalMet(goal) {
    if (!goal) return false;
    // 通關星：一定要真正打通這一關
    if (goal.kind === 'clear') return stageClearedNow();
    // 其他星：先通關才算；看廣告復活只留通關
    if (!stageClearedNow()) return false;
    if (state.reviveUsed) return false;
    if (goal.kind === 'flawless') return state.lifeLost <= 0;
    if (goal.kind === 'bruise') return state.lifeLost <= goal.max;
    if (goal.kind === 'ban') return !(state.built && state.built[goal.type]);
    if (goal.kind === 'rank') return towerRankMet(goal.type, goal.level);
    if (goal.kind === 'cap') return builtTowerCount() <= goal.max;
    if (goal.kind === 'least') return towerCountOf(goal.type) >= goal.count;
    if (goal.kind === 'nohero') return !(state.built && state.built.hero);
    if (goal.kind === 'nosell') return !state.soldAny;
    return false;
  }

  function runStarMask() {
    var goals = state.stagePlan && state.stagePlan.goals;
    if (!goals || !goals.length) return stageClearedNow() ? 1 : 0;
    var mask = 0;
    // 沒通關就不給任何星
    if (!stageClearedNow()) return 0;
    for (var i = 0; i < goals.length && i < 3; i++) {
      if (goalMet(goals[i])) mask |= 1 << i;
    }
    return mask;
  }

  function recordStarMask() {
    var mask = runStarMask();
    state.runStarMask = mask;
    var prev = state.stars[state.level] || 0;
    var next = prev | mask;
    if (next !== prev) {
      state.stars[state.level] = next;
      saveStars();
    }
    return mask;
  }

  function paintGoalBar() {
    var bar = document.getElementById('goal-bar');
    if (!bar) return;
    var goals = state.mode === 'campaign' && state.phase !== 'menu' && state.stagePlan && state.stagePlan.goals;
    if (!goals || !goals.length) {
      var wasOpen = !bar.hidden;
      bar.hidden = true;
      bar.dataset.sig = '';
      if (wasOpen) resize();
      return;
    }
    var parts = [];
    var flags = [];
    for (var i = 0; i < goals.length && i < 3; i++) {
      var on = goalMet(goals[i]);
      flags.push(on ? '1' : '0');
      parts.push((on ? '★' : '☆') + goalLabel(goals[i]));
    }
    var sig = parts.join('|');
    if (bar.dataset.sig === sig && !bar.hidden) return;
    var wasHidden = bar.hidden;
    bar.dataset.sig = sig;
    bar.hidden = false;
    bar.replaceChildren();
    for (var n = 0; n < parts.length; n++) {
      var chip = document.createElement('span');
      if (flags[n] === '1') chip.className = 'is-on';
      chip.textContent = parts[n];
      bar.appendChild(chip);
    }
    if (wasHidden) resize();
  }

  function victoryStarLine() {
    var goals = state.stagePlan && state.stagePlan.goals;
    var mask = state.runStarMask || 0;
    if (!goals) return starGlyph(starCount(mask));
    var parts = [];
    for (var i = 0; i < goals.length && i < 3; i++) {
      parts.push((mask & (1 << i) ? '★' : '☆') + goalLabel(goals[i]));
    }
    return parts.join(' ');
  }

  function noteGoalFail(key, message) {
    if (state.mode !== 'campaign') return;
    if (!state.goalWarned) state.goalWarned = {};
    if (state.goalWarned[key]) return;
    state.goalWarned[key] = true;
    toast(message);
  }

  function noteBuilt(type, opts) {
    // 每 5 波廣告贈塔不算「自己放的」，不影響不放某塔／不放英雄等星星
    if (opts && opts.fromGift) return;
    if (!state.built) state.built = {};
    state.built[type] = (state.built[type] || 0) + 1;
    if (state.mode !== 'campaign' || !state.stagePlan || !state.stagePlan.goals) return;
    var goals = state.stagePlan.goals;
    for (var i = 0; i < goals.length; i++) {
      var goal = goals[i];
      if (goal.kind === 'ban' && goal.type === type) noteGoalFail('ban-' + type, '放了' + towerShort(type) + '，這顆星沒了');
      if (goal.kind === 'nohero' && type === 'hero') noteGoalFail('nohero', '放了英雄，這顆星沒了');
      if (goal.kind === 'cap' && type !== 'hero' && builtTowerCount() > goal.max) noteGoalFail('cap', '塔超過 ' + goal.max + ' 座，這顆星沒了');
    }
  }

  function starGlyph(n) {
    var text = '';
    for (var i = 0; i < 3; i++) text += i < n ? '★' : '☆';
    return text;
  }

  function clearControl(enemy) {
    if (!enemy) return;
    enemy.freeze = 0;
    enemy.stun = 0;
    enemy.slow = 0;
    enemy.slowTime = 0;
  }

  function beginBerserk() {
    if (state.phase !== 'combat' || state.berserk) return;
    state.berserk = true;
    for (var i = 0; i < state.enemies.length; i++) clearControl(state.enemies[i]);
    toast('怪物狂暴，緩速、麻痺、冰凍無效');
    state.banner = { text: '怪物狂暴', sub: '緩速、麻痺、冰凍無效', life: 2.8 };
  }

  function onGameOver() {
    if (state.phase === 'gameover') return;
    state.phase = 'gameover';
    state.paused = true;
    Sfx.gameOver();
    Bgm.sync();
    openGameOverModal();
  }

  function updateCosmetic(dt) {
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 16);
    state.hurt = Math.max(0, state.hurt - dt);
    tickClearCountdown(dt);
    tickEditCountdown(dt);
    if (state.banner) {
      if (!state.banner.countdown) state.banner.life -= dt;
      if (state.banner.life <= 0) state.banner = null;
    }
    if (state.rangePing) {
      state.rangePing.t -= dt;
      if (state.rangePing.t <= 0) state.rangePing = null;
    }
    for (var t = 0; t < state.towers.length; t++) {
      state.towers[t].flash = Math.max(0, state.towers[t].flash - dt * 4);
      if (state.towers[t].swing) state.towers[t].swing = Math.max(0, state.towers[t].swing - dt * 3.4);
      if (state.towers[t].auraTime) state.towers[t].auraTime = Math.max(0, state.towers[t].auraTime - dt);
      if (state.towers[t].chill) state.towers[t].chill = Math.max(0, state.towers[t].chill - dt);
      if (state.towers[t].dizzy) state.towers[t].dizzy = Math.max(0, state.towers[t].dizzy - dt);
      if (state.towers[t].devilFork) {
        state.towers[t].devilFork = Math.max(0, state.towers[t].devilFork - dt);
        if (state.towers[t].devilFork <= 0) state.towers[t].devilFork = 0;
      }
    }
    for (var e = 0; e < state.enemies.length; e++) {
      state.enemies[e].hitFlash = Math.max(0, state.enemies[e].hitFlash - dt);
    }
    for (var f = 0; f < state.flashes.length; f++) state.flashes[f].life -= dt;
    state.flashes = state.flashes.filter(function (flash) { return flash.life > 0; });
    for (var p = 0; p < state.particles.length; p++) {
      var particle = state.particles[p];
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 1.5 * dt;
      if (particle.spin) particle.ang = (particle.ang || 0) + particle.spin * dt;
    }
    state.particles = state.particles.filter(function (particle) { return particle.life > 0; });
    for (var i = 0; i < state.floaters.length; i++) {
      state.floaters[i].life -= dt;
      state.floaters[i].y += state.floaters[i].vy * dt;
    }
    state.floaters = state.floaters.filter(function (floater) { return floater.life > 0; });
    for (var s = 0; s < state.shocks.length; s++) state.shocks[s].life -= dt;
    state.shocks = state.shocks.filter(function (shock) { return shock.life > 0; });
    for (var a = 0; a < state.arcs.length; a++) state.arcs[a].life -= dt;
    state.arcs = state.arcs.filter(function (arc) { return arc.life > 0; });
  }

  function giftTowerAdReady() {
    return giftWaveDue(state.wave) && !state.waveGiftDone;
  }

  function rewardDesc() {
    var text = '本波 +' + state.waveGoldEarned + ' 金幣';
    if (state.tileGainText) text += ' · 路線圖 ' + state.tileGainText;
    if (state.mode === 'custom' && state.wave % 10 === 0) text += ' · 獎勵後可改道';
    else if (cardWaveDue(state.wave)) text += ' · 隨機獎勵';
    if (giftWaveDue(state.wave)) text += ' · 可看廣告送塔';
    return text;
  }

  function emptyBuildCells() {
    var list = [];
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (!isPath(c, r) && !towerAt(c, r)) list.push({ c: c, r: r });
      }
    }
    return list;
  }

  function pathDistance(c, r) {
    var best = 99;
    for (var i = 0; i < route.cells.length; i++) {
      var cell = route.cells[i];
      var dist = Math.abs(cell.c - c) + Math.abs(cell.r - r);
      if (dist < best) best = dist;
    }
    return best;
  }

  function emptyBuildCellsNearPath() {
    var all = emptyBuildCells();
    if (!all.length) return all;
    var near = all.filter(function (cell) { return pathDistance(cell.c, cell.r) <= 1; });
    if (near.length) return near;
    near = all.filter(function (cell) { return pathDistance(cell.c, cell.r) <= 2; });
    return near.length ? near : all;
  }

  function giftTowerInvested(type, level) {
    var def = TOWERS[type];
    if (!def) return 0;
    var invested = def.cost || 0;
    for (var i = 0; i < level; i++) {
      invested += def.upgradeCost && def.upgradeCost[i] ? def.upgradeCost[i] : 0;
    }
    return invested;
  }

  function placeFreeTower(type, cell) {
    var def = TOWERS[type];
    if (!def || !cell) return false;
    var level = Math.floor(Math.random() * 3);
    var spec = null;
    if (def.specs && level >= 2) {
      var ids = Object.keys(def.specs);
      spec = ids[Math.floor(Math.random() * ids.length)];
    }
    var invested = giftTowerInvested(type, level);
    var tower = {
      id: state.nextId++,
      type: type,
      c: cell.c,
      r: cell.r,
      level: level,
      cooldown: 0.15,
      aim: -Math.PI / 2,
      flash: 0,
      chill: 0,
      spec: spec,
      invested: invested,
    };
    state.towers.push(tower);
    noteBuilt(tower.type, { fromGift: true });
    flashCell(cell.c, cell.r, true);
    var stats = towerStats(tower);
    state.rangePing = { c: cell.c, r: cell.r, range: stats.range, color: towerColor(tower), t: 0.9 };
    burst(cell.c + 0.5, cell.r + 0.5, towerColor(tower), 8);
    Sfx.build();
    return tower;
  }

  function grantAdTower() {
    var empties = emptyBuildCellsNearPath();
    if (!empties.length) {
      toast('沒有空地可放塔');
      return false;
    }
    var cell = empties[Math.floor(Math.random() * empties.length)];
    if (Math.random() < 0.08 && !heroRosterFull()) {
      var heroes = HERO_IDS.filter(function (id) { return !hasHeroId(id); });
      var heroId = heroes[Math.floor(Math.random() * heroes.length)];
      state.pendingHero = heroId;
      placeHero(cell, 0, { fromGift: true });
      toast('廣告贈送英雄：' + heroName(heroId));
      return true;
    }
    var pool = ['basic', 'basic', 'poison', 'fire', 'ice', 'bolt', 'mint'];
    var type = pool[Math.floor(Math.random() * pool.length)];
    var tower = placeFreeTower(type, cell);
    if (tower) {
      var refund = Math.floor(tower.invested * sellRatio());
      toast('廣告贈送 ' + towerLabel(tower) + ' Lv.' + (tower.level + 1) + '（可出售約 ' + refund + '）');
    }
    syncHud();
    return !!tower;
  }

  function continueAfterWaveAds(cleared) {
    if (cardWaveDue(cleared)) openCardDraft(cleared);
    else if (state.mode === 'custom' && cleared % 10 === 0) enterEdit();
    else requestStartWave(cleared + 1);
  }

  function openGiftTowerOffer(cleared) {
    state.phase = 'reward';
    state.paused = true;
    state.cardWave = cleared;
    openModal({
      tone: 'reward',
      kicker: '第 ' + cleared + ' 波',
      title: '廣告贈禮',
      desc: '觀看廣告可隨機獲得一座防禦塔（低機率英雄塔）。不想要可直接跳過。',
      actions: [
        {
          label: '跳過',
          className: 'btn-ghost',
          onClick: function () {
            state.waveGiftDone = true;
            closeModal();
            continueAfterWaveAds(cleared);
          },
        },
        {
          label: '觀看廣告，隨機送塔',
          className: 'btn-gold',
          ad: true,
          onClick: function () { watchGiftTower(cleared); },
        },
      ],
    });
  }

  function watchGiftTower(cleared) {
    if (state.adBusy || state.waveGiftDone) return;
    state.adBusy = true;
    setModalBusy(true);
    Ads.showRewarded({ placement: 'wave_gift_tower' }).then(function (result) {
      state.adBusy = false;
      if (!result || !result.rewarded) {
        setModalBusy(false);
        toast(result && result.error ? '廣告載入失敗' : '未看完廣告，獎勵未發放');
        return;
      }
      state.waveGiftDone = true;
      closeModal();
      Sfx.unlock();
      grantAdTower();
      continueAfterWaveAds(cleared);
    });
  }

  function openGameOverModal() {
    var actions = [];
    if (!state.reviveUsed) {
      actions.push({
        label: '觀看廣告立即滿血復活繼續防守（每局限一次）',
        className: 'btn-gold',
        ad: true,
        onClick: watchRevive,
      });
    }
    var retryLabel = state.mode === 'campaign' ? '重試本關' : '重新開始';
    actions.push({ label: retryLabel, className: 'btn-ghost', onClick: restartGame });
    if (state.mode === 'campaign') {
      actions.push({ label: '返回關卡選擇', className: 'btn-ghost', onClick: function () { closeModal(); openStages(state.chapter); } });
    }
    actions.push({ label: '返回選單', className: 'btn-ghost', onClick: function () { closeModal(); showWelcome(); } });
    var record = (state.mode === 'infinite' || state.mode === 'custom') && state.best > 0
      ? (state.difficulty === 'hell' ? '地獄' : '普通') + '最遠第 ' + state.best + ' 波。'
      : '';
    if (record && (state.mode === 'infinite' || state.mode === 'custom')) {
      var rankId = (state.mode === 'custom' ? 'custom-' : 'infinite-') + (state.difficulty === 'hell' ? 'hell' : 'normal');
      var rank = boardRank(rankId);
      if (!loadAccount()) record += '尚未登入，未記入線上排行。';
      else if (rank) record += '線上排行第 ' + rank + '。';
    }
    var where = state.mode === 'campaign' ? state.level + ' ' + state.chapterName + ' ' + state.levelName + '，' : '';
    openModal({
      tone: 'over',
      kicker: '遊戲結束',
      title: '防線崩潰',
      desc: where + '止步於第 ' + state.wave + ' 波。' + record,
      actions: actions,
    });
  }

  function openVictoryModal() {
    var stars = recordStarMask();
    var actions = [];
    var upcoming = nextStage(state.stagePlan);
    if (upcoming && stageUnlocked(upcoming)) {
      actions.push({
        label: '下一關 ' + upcoming.stageId,
        className: 'btn-mint',
        onClick: function () { closeModal(); startRun('campaign', upcoming.stageId); },
      });
    }
    actions.push({ label: '返回關卡選擇', className: 'btn-ghost', onClick: function () { closeModal(); openStages(state.chapter); } });
    var starNote = state.reviveUsed
      ? '用了復活，只算通關這一顆。'
      : victoryStarLine();
    openModal({
      tone: 'reward',
      kicker: '關卡通過',
      title: starGlyph(starCount(stars)) + '  ' + state.level,
      desc: state.chapterName + ' ' + state.levelName + ' 守住了。' + starNote,
      actions: actions,
    });
  }

  var PATCH_NOTES = [
    {
      date: '10/30',
      title: '排行榜同步、HUD 音樂音效、金幣顯示',
      detail: [
        '排行：同一 Google 手機／電腦地獄成績會合併上榜；本機較高波次登入後會補推雲端',
        '介面：音樂與音效鈕排在一起；金幣達 1000 起顯示為 1.00K',
      ],
      full: [
        '排行：寫入規則允許名片框／稱號；地獄榜成績不再被擋',
        '同步：讀榜時雲端較高波次寫回本機；登入後也會把本機較高地獄波次補上雲端',
        'HUD：音樂／音效並排在暫停右側，不再換行拆開',
        '金幣：≥1000 顯示為千分位 K，小數兩位（例如 1234 → 1.23K）',
      ],
    },
    {
      date: '10/29',
      title: '後期壓力、抗控、破甲恢復、背景音樂、產錢調整',
      detail: [
        '難度：10 等後傷害成長變緩；第 50 波後敵人會不定時抗控 2 秒',
        '克制：毒／火破甲約 3 秒後回復；回復時原地無敵一下並有光環特效',
        '音樂：輕鬆冒險 BGM；各章特色、王關緊張；無限／自訂以刺激循環為主',
        '介面：設定可分開開關音樂與音效',
        '經濟：產錢塔產金下調',
      ],
      full: [
        '傷害：6 等覺醒約 ×1.25（舊 ×1.4）；超過表定等後每等約 +8%（舊 +15%）',
        '第 50 波後：敵人不定時進入抗控 2 秒，期間麻痺／冰凍／緩速無效，並清掉身上控場',
        '破甲節奏：毒蝕／火破壓制約 3 秒；結束時原地無敵約 0.85 秒再回復能力，並有金綠光環與碎片特效',
        'BGM：選單輕鬆冒險；作戰依章節特色；第五關與首領波偏緊張；無限／自訂刺激輪換',
        '設定／作戰右上：音樂與音效各一個開關',
        '產錢塔：各等產金 5／6／8／10／13／16；高階產金成長也較慢',
      ],
    },
    {
      date: '10/28',
      title: '章節特色、小王／大王、稱號、設定、難度、進度與 ID 同步',
      detail: [
        '玩法：前八章整章首領特色；第九章魔王城',
        '首領：第五關尾波大王；前四關尾波小王',
        '難度：起始金 65；第 1 波一座 1 等可過，第 2 波起要升級或兩座塔',
        '星星：先通關才算；廣告贈塔不算自己放的；同一 Google 換裝置會合併關卡進度、名片與好友 ID',
        '稱號：滿天星斗、魔王城征服者',
        '介面：選關進度、作戰星星位置、建造選單、目錄設定',
        '特效：各章能力施放效果',
      ],
      full: [
        '玩法：前八章整章帶該章首領特色（再生／狂暴／召喚／護盾／分裂／治癒／冰封／鐵甲），小怪也算',
        '第九章：骷髏王隕石暈塔；骷髏小怪打死再站一次（半血）；命運轉盤同地獄',
        '首領：有手腳大王只在 x-5 尾波；前四關尾波是小王（弱化能力、圓圓王圖）',
        '難度：起始金 65；第 1 波 4 普怪一座 1 等可過；第 2 波起快怪群＋更密，單座 1 等扛不住；精英約第 6 波起',
        '星星：必須真正通關才算其他星；每 5 波廣告贈塔不算自己建造',
        '同步：Google 登入後，關卡星星、成就、頭像／框／稱號與好友 ID 跟帳號走；換裝置合併較高進度，並還原名片',
        '稱號：累積 45 星「滿天星斗」；打通 9-5「魔王城征服者」',
        '介面：選關點在外框底邊；作戰星星在上方 HUD 下；建造選單點外面會收',
        '設定：目錄好友右側齒輪可開關音量、預設速度、輸入代碼、看更新細項、意見提供',
      ],
    },
    {
      date: '10/27',
      title: '名片框、稱號、第 50 波巨王',
      detail: [
        '收集：章節三星框；八章通關再多一框',
        '稱號：可自選；地獄榜前 10 另有榜上稱號',
        '無限：第 50 波骷髏王；過關得「無限迴廊之主」',
        '章節：第八章後開啟第九章魔王城',
      ],
      full: [
        '每一章五關都三星會得到一種名片框，八章都過關再多一個',
        '稱號可以自己選一個，地獄榜前 10 名會再顯示一個榜上稱號',
        '無限模式第 50 波是骷髏王，會放隕石把塔炸暈；打過得「無限迴廊之主」',
        '第八章過關後會開第九章魔王城',
      ],
    },
    {
      date: '10/27',
      title: '關卡星星各關不同',
      detail: [
        '條件：通關＋兩項挑戰（各關不同）',
        '種類：無傷、少受傷、禁塔、升等、塔數等',
        '復活：看廣告復活只保留通關星',
      ],
      full: [
        '作戰選關時，點左上星星可看這一關三個條件',
        '第一個是通關；另外兩個含無傷、少受傷、至少放幾座塔、不放產錢或某屬性塔、某塔升到 5 等、塔數上限、不賣塔或不放英雄',
        '看過廣告復活只保留通關那一顆',
      ],
    },
    {
      date: '10/27',
      title: '鐵匠讓塔升到 10 等',
      detail: [
        '解鎖：第 20 波起，或已有塔升滿',
        '效果：鐵匠在場可升到 10 等',
        '限制：賣走鐵匠後不能再往上升',
      ],
      full: [
        '第 20 波起，或已經有塔升滿時，建造選單會多出鐵匠，480 金，不攻擊',
        '有他在場，其他塔可用原本升級一路升到 10 等',
        '賣走之後不能再往上升，已升過的等級會留著',
      ],
    },
    {
      date: '10/27',
      title: '打太久怪物會狂暴',
      detail: [
        '觸發：單波戰鬥超過 2 分鐘',
        '效果：緩速、麻痺、冰凍無效',
        '介面：點技能或資訊框外會收起框',
      ],
      full: [
        '每一波戰鬥超過 2 分鐘不會直接失敗；場上怪會狂暴，緩速、麻痺、冰凍無效',
        '點英雄技能後，底下資訊框會收起來；點資訊框外面也會關掉',
      ],
    },
    {
      date: '10/27',
      title: '第 40 波出現破塔怪',
      detail: [
        '出現：無限／自訂第 40 波起每波一隻',
        '效果：撞破一般塔，不退金幣',
        '例外：英雄塔不會被撞掉',
      ],
      full: [
        '無限和自訂從第 40 波起，每波多一隻破塔怪',
        '走近一般塔會把塔撞破，直接消失不退金幣；英雄塔不會被撞掉',
      ],
    },
    {
      date: '10/27',
      title: '30 波以後無限和自訂更難',
      detail: [
        '無限／自訂：30 波後血量、速度、數量再加',
        '作戰：不受這段加難影響',
      ],
      full: [
        '第 30 波之後，無限和自訂的怪物血量、速度和數量會再往上加',
        '一般關卡不受這段加難；當時一般關起始金改回 50，血量略提高',
      ],
    },
    {
      date: '10/27',
      title: '血量百分比技能調低',
      detail: [
        '技能：致命節奏、修羅、隕石、毒霧等調低',
        '火塔：破盾／破甲額外約 6% 總血',
        '毒蝕：仍約每秒 3% 總血',
      ],
      full: [
        '致命節奏、修羅附體、隕石術、致命毒霧，以及獵手打護盾的百分比傷害都調低',
        '火塔打掉護盾、第一次打穿護甲或厚皮時，只額外打一次約 6% 總血',
        '毒蝕還是每秒約 3% 總血',
      ],
    },
    {
      date: '10/27',
      title: '名片可以改名、選頭像',
      detail: [
        '名片：可改名、選手繪頭像',
        '頭像：地獄榜前 10 暫有獎盃頭像',
        '頭像：八章第 5 關有星再開通關頭像',
      ],
      full: [
        '點名片可以改名字，也能選手繪頭像',
        '本週地獄榜第 1 到 10 名會暫時多一個獎盃頭像',
        '八個章節的第 5 關都有星星時，會多一個通關頭像',
      ],
    },
    {
      date: '10/27',
      title: '快怪改成飛行蝙蝠',
      detail: [
        '快怪：改為飛行蝙蝠',
        '雷塔：麻痺更久，對飛行／跳躍傷害更高',
        '小惡魔：仍走在地上',
      ],
      full: [
        '快怪改成會飛的蝙蝠',
        '雷塔麻痺時間拉長，打飛行怪和跳躍怪（含跳起來時）傷害更高',
        '小惡魔還是走在地上',
      ],
    },
    {
      date: '10/27',
      title: '地獄成績記到雲端排行',
      detail: [
        '榜單：無限／自訂地獄週榜（需登入）',
        '結算：每週一 00:00（台北）',
        '獎勵：前 10 名階梯光環與召喚權',
      ],
      full: [
        'Google 登入後，無限地獄和自訂地獄波次進同一張週榜',
        '每週一 00:00（台北時間）結算；打過第 25 波才能進前 10',
        '第 1～3 名可召全知全能的神；第 4～10 名可召光之神使',
        '第 1 名鑽石／絕對王者；第 2 黃金／不滅霸主；第 3 黃金／災厄之主；第 4～5 白銀；第 6～10 青銅',
      ],
    },
    {
      date: '10/27',
      title: '可以加好友看名片',
      detail: [
        'ID：登入後有 6 碼好友碼',
        '名片：可看對方頭像、紀錄、地獄光環',
        '星星：關卡星仍只留在自己裝置',
      ],
      full: [
        '登入後有一組 6 碼 ID；把 ID 給對方或貼上對方 ID 即可加好友',
        '好友名片會顯示頭像、最高紀錄，以及這週地獄光環',
        '關卡星星還是留在自己的手機上',
      ],
    },
    {
      date: '10/26',
      title: '關卡目錄換成章節圖',
      detail: [
        '目錄：章節圖＋左右換章＋1～5 關',
        '章圖：八章地牢主題圖',
      ],
      full: [
        '進目錄後，中間是這一章的圖，左右箭頭換章，下面 1 到 5 是關卡',
        '八張圖依序是潮濕藤蔓地牢、部落熔岩、碎骨殿堂、晶礦大廳、劇毒巢穴、邪教神殿、冰霜囚牢、廢鐵工坊',
      ],
    },
    {
      date: '10/26',
      title: '按鈕和外框改成手繪線',
      detail: [
        '介面：圖鑑、排行、好友、開始用手繪框',
        '作戰：黑底白字；自訂／無限維持文字鈕',
      ],
      full: [
        '圖鑑、排行、好友、開始，還有底下的作戰，都用同一套手繪框',
        '作戰是黑底白字；自訂和無限維持文字按鈕',
      ],
    },
    {
      date: '10/26',
      title: '祭壇改成商品卡',
      detail: [
        '祭壇：兩欄英雄商品卡，一隻 1000 金',
        '鎖定：名次不夠的神／神使顯示未解鎖',
        '地圖：圓形祭壇＋空心尖頂',
      ],
      full: [
        '召喚英雄改成兩欄；每張卡有英雄圖、名字、能力和價錢，一隻 1000 金',
        '名次不夠的全知全能的神、光之神使是灰色，寫著未解鎖',
        '地圖上的祭壇是一顆圓，中間是空心尖頂',
      ],
    },
  ];

  function fillNoticeDetail(el, detail) {
    el.replaceChildren();
    var lines = Array.isArray(detail)
      ? detail.filter(function (line) { return !!line; })
      : String(detail || '').split(/\n+/).map(function (line) { return line.trim(); }).filter(Boolean);
    if (!lines.length) return;
    if (lines.length === 1 && !Array.isArray(detail)) {
      el.textContent = lines[0];
      return;
    }
    var ul = document.createElement('ul');
    ul.className = 'notice-outline';
    lines.forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      ul.appendChild(li);
    });
    el.appendChild(ul);
  }

  function renderPatchNotes(notes, page) {
    var list = document.getElementById('modal-notes');
    if (!list) return;
    list.replaceChildren();
    if (!notes || !notes.length) {
      list.hidden = true;
      return;
    }
    list.hidden = false;
    var pageSize = 5;
    var pages = Math.max(1, Math.ceil(notes.length / pageSize));
    var index = Math.max(0, Math.min(pages - 1, page || 0));
    notes.slice(index * pageSize, index * pageSize + pageSize).forEach(function (note) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'notice-item';
      item.setAttribute('aria-expanded', 'false');
      var date = document.createElement('span');
      date.className = 'notice-date';
      date.textContent = note.date;
      var title = document.createElement('span');
      title.className = 'notice-title';
      title.textContent = note.title;
      var more = document.createElement('span');
      more.className = 'notice-more';
      more.textContent = '大綱';
      var detail = document.createElement('span');
      detail.className = 'notice-detail';
      fillNoticeDetail(detail, note.detail);
      item.appendChild(date);
      item.appendChild(more);
      item.appendChild(title);
      item.appendChild(detail);
      item.addEventListener('click', function () {
        var open = item.classList.toggle('is-open');
        item.setAttribute('aria-expanded', open ? 'true' : 'false');
        more.textContent = open ? '收合' : '大綱';
      });
      list.appendChild(item);
    });
    if (pages < 2) return;
    var pager = document.createElement('div');
    pager.className = 'notice-pager';
    function pageButton(label, target, flags) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'notice-page' + (flags.current ? ' is-on' : '');
      btn.textContent = label;
      btn.disabled = !!flags.disabled;
      if (flags.current) btn.setAttribute('aria-current', 'page');
      if (!flags.disabled && !flags.current) {
        btn.addEventListener('click', function () { renderPatchNotes(notes, target); });
      }
      return btn;
    }
    pager.appendChild(pageButton('上一頁', index - 1, { disabled: index === 0 }));
    for (var p = 0; p < pages; p++) {
      pager.appendChild(pageButton(String(p + 1), p, { current: p === index }));
    }
    pager.appendChild(pageButton('下一頁', index + 1, { disabled: index >= pages - 1 }));
    list.appendChild(pager);
  }

  function patchNotesForView(kind) {
    return PATCH_NOTES.map(function (note) {
      return {
        date: note.date,
        title: note.title,
        detail: kind === 'full' ? (note.full || note.detail) : note.detail,
      };
    });
  }

  function openPatchNotes() {
    openModal({
      tone: 'reward',
      kicker: '公告',
      title: '更新資訊',
      desc: '一頁五則。點一則看分類大綱；更細的數值請到設定 → 更新細項。',
      notes: patchNotesForView('outline'),
      actions: [{ label: '知道了', className: 'btn-ghost is-exit', onClick: closeModal }],
    });
  }

  function preferredSpeed() {
    var n = loadNumber('fantasia-td-speed');
    return n === 2 || n === 4 ? n : 1;
  }

  function setPreferredSpeed(speed) {
    var n = speed === 2 || speed === 4 ? speed : 1;
    saveNumber('fantasia-td-speed', n);
    state.speed = n;
    syncSpeedButton();
  }

  function cyclePreferredSpeed() {
    var cur = preferredSpeed();
    setPreferredSpeed(cur === 1 ? 2 : (cur === 2 ? 4 : 1));
    Sfx.ui();
    openSettings();
  }

  function setSfxMuted(on) {
    Sfx.muted = !!on;
    saveNumber('fantasia-td-mute', Sfx.muted ? 1 : 0);
    syncSoundButton();
    if (!Sfx.muted) {
      Sfx.unlock();
      Sfx.ui();
    }
  }

  function setBgmMuted(on) {
    Bgm.muted = !!on;
    saveNumber('fantasia-td-bgm-mute', Bgm.muted ? 1 : 0);
    syncSoundButton();
    if (!Bgm.muted) {
      Sfx.unlock();
      Bgm.sync();
    } else {
      Bgm.stop();
    }
  }

  function togglePreferredSfx() {
    setSfxMuted(!Sfx.muted);
    openSettings();
  }

  function togglePreferredBgm() {
    setBgmMuted(!Bgm.muted);
    openSettings();
  }

  function loadRedeemedCodes() {
    try {
      var raw = JSON.parse(localStorage.getItem('symbols-td-redeemed') || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    } catch (error) {
      return {};
    }
  }

  function saveRedeemedCodes(map) {
    try { localStorage.setItem('symbols-td-redeemed', JSON.stringify(map || {})); } catch (error) { /* ignore */ }
  }

  // 之後在這裡加可用代碼與獎勵；目前先保留輸入流程。
  var REDEEM_CODES = {};

  function redeemCode(raw) {
    var code = String(raw || '').trim().toUpperCase();
    if (!code) {
      toast('請輸入代碼');
      return false;
    }
    var used = loadRedeemedCodes();
    if (used[code]) {
      toast('這個代碼用過了');
      return false;
    }
    var gift = REDEEM_CODES[code];
    if (!gift) {
      toast('代碼無效或尚未開放');
      return false;
    }
    used[code] = Date.now();
    saveRedeemedCodes(used);
    toast(gift.message || '兌換成功');
    Sfx.unlock();
    return true;
  }

  function openCodeRedeem() {
    openModal({
      tone: 'reward',
      kicker: '設定',
      title: '輸入代碼',
      desc: '輸入兌換碼後按下兌換。之後可用來領免廣告券、神使券等。',
      actions: [
        {
          label: '兌換',
          className: 'btn-gold',
          onClick: function () {
            var input = document.getElementById('redeem-code-input');
            if (redeemCode(input && input.value)) {
              if (input) input.value = '';
            }
          },
        },
        { label: '返回設定', className: 'btn-ghost', onClick: openSettings },
      ],
    });
    var desc = document.getElementById('modal-desc');
    if (!desc) return;
    var wrap = document.createElement('label');
    wrap.className = 'settings-code';
    wrap.textContent = '代碼';
    var input = document.createElement('input');
    input.id = 'redeem-code-input';
    input.maxLength = 24;
    input.placeholder = '貼上或輸入代碼';
    input.autocomplete = 'off';
    wrap.appendChild(input);
    desc.insertAdjacentElement('afterend', wrap);
    setTimeout(function () { input.focus(); }, 40);
  }

  function openPatchFullNotes() {
    openModal({
      tone: 'reward',
      kicker: '設定',
      title: '更新細項',
      desc: '大綱以外的實際改動與數值。一頁五則，點一則展開。',
      notes: patchNotesForView('full'),
      actions: [{ label: '返回設定', className: 'btn-ghost', onClick: openSettings }],
    });
  }

  function openFeedback() {
    openModal({
      tone: 'reward',
      kicker: '設定',
      title: '意見提供',
      desc: '之後提供回饋可送券。券系統好了再開這個入口，現在先保留按鈕。',
      actions: [{ label: '返回設定', className: 'btn-ghost', onClick: openSettings }],
    });
  }

  function openSettings() {
    var musicLabel = Bgm.muted ? '音樂：關' : '音樂：開';
    var sfxLabel = Sfx.muted ? '音效：關' : '音效：開';
    var speedLabel = '預設速度：×' + preferredSpeed();
    openModal({
      tone: 'reward',
      kicker: '目錄',
      title: '設定',
      desc: '音樂、音效、預設速度、代碼與更新細項。',
      actions: [
        { label: musicLabel, className: 'btn-ghost', onClick: togglePreferredBgm },
        { label: sfxLabel, className: 'btn-ghost', onClick: togglePreferredSfx },
        { label: speedLabel, className: 'btn-ghost', onClick: cyclePreferredSpeed },
        { label: '輸入代碼', className: 'btn-ghost', onClick: openCodeRedeem },
        { label: '更新細項', className: 'btn-ghost', onClick: openPatchFullNotes },
        { label: '意見提供', className: 'btn-ghost', onClick: openFeedback },
        { label: '關閉', className: 'btn-ghost is-exit', onClick: closeModal },
      ],
    });
  }

  function openModal(options) {
    modal.classList.remove('is-over', 'is-reward', 'is-shop', 'is-notice', 'is-profile');
    modal.classList.add(options.tone === 'over' ? 'is-over' : 'is-reward');
    if (options.shop) modal.classList.add('is-shop');
    if (options.notes) modal.classList.add('is-notice');
    if (options.profile) modal.classList.add('is-profile');
    modalKicker.textContent = options.kicker;
    modalTitle.textContent = options.title;
    modalDesc.textContent = options.desc;
    var stale = modal.querySelectorAll('.settings-code');
    for (var s = 0; s < stale.length; s++) stale[s].remove();
    renderPatchNotes(options.notes);
    if (options.profile) renderProfileEditor();
    modalActions.replaceChildren();
    options.actions.forEach(function (action) {
      modalActions.appendChild(actionButton(action));
    });
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modal.classList.remove('is-open', 'is-over', 'is-reward', 'is-shop', 'is-notice', 'is-profile');
    modal.setAttribute('aria-hidden', 'true');
  }

  function heroShopThumb(id) {
    var canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    canvas.className = 'hero-shop-art';
    canvas.setAttribute('aria-hidden', 'true');
    var g = canvas.getContext('2d');
    if (!g) return canvas;
    var prev = ctx;
    ctx = g;
    try {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, 64, 64);
      g.translate(32, 34);
      drawHeroGlyph(id, 20);
    } finally {
      ctx = prev;
    }
    return canvas;
  }

  function actionButton(action) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn ' + action.className;
    if (action.ad) {
      var tag = document.createElement('span');
      tag.className = 'ad-tag';
      tag.textContent = 'AD';
      btn.appendChild(tag);
    }
    if (action.title) {
      if (action.heroId) btn.appendChild(heroShopThumb(action.heroId));
      var copy = document.createElement('span');
      copy.className = 'hero-pick-copy';
      var name = document.createElement('strong');
      name.textContent = action.title;
      var note = document.createElement('small');
      note.textContent = action.note || '';
      copy.appendChild(name);
      copy.appendChild(note);
      btn.appendChild(copy);
      var side = document.createElement('b');
      side.className = 'hero-price';
      side.textContent = action.side || '';
      btn.appendChild(side);
    } else {
      btn.appendChild(document.createTextNode(action.label));
    }
    if (action.disabled) btn.disabled = true;
    btn.addEventListener('click', action.onClick);
    return btn;
  }

  function setModalBusy(busy) {
    var buttons = modalActions.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) buttons[i].disabled = busy;
  }

  function watchRevive() {
    if (state.adBusy || state.reviveUsed) return;
    state.adBusy = true;
    setModalBusy(true);
    Ads.showRewarded({ placement: 'revive' }).then(function (result) {
      state.adBusy = false;
      if (!result || !result.rewarded) {
        setModalBusy(false);
        toast(result && result.error ? '廣告載入失敗' : '未看完廣告，獎勵未發放');
        return;
      }
      state.reviveUsed = true;
      state.lives = START_LIVES;
      state.waveTime = 0;
      state.berserk = false;
      state.phase = 'combat';
      state.paused = false;
      closeModal();
      Sfx.unlock();
      Sfx.fanfare();
      toast('滿血復活，繼續防守');
      syncHud();
    });
  }

  function goNextWave() {
    if (state.adBusy || state.phase !== 'reward') return;
    var cleared = state.wave;
    state.clearCountdown = 0;
    state.clearKind = '';
    closeModal();
    if (giftTowerAdReady()) {
      openGiftTowerOffer(cleared);
      return;
    }
    continueAfterWaveAds(cleared);
  }

  function enterEdit() {
    state.phase = 'edit';
    state.paused = true;
    state.editTool = null;
    state.buildType = null;
    state.buildSite = null;
    state.selectedId = null;
    state.sellArmed = false;
    state.editCountdown = 60;
    state.banner = {
      text: '修改路線',
      sub: '還有 60 秒 · 點完成改道即可',
      life: 60.2,
      countdown: true,
    };
    toast('可改路線。塔不能搬，要換位子請出售，返還 8 成');
    renderInspector();
    syncHud();
    syncRouteBar();
  }

  function finishEdit() {
    if (state.phase !== 'edit') return;
    state.editTool = null;
    state.editCountdown = 0;
    var beforeEdit = unlockedTitleIds();
    var editDeeds = loadDeeds();
    editDeeds.edit = true;
    saveDeeds(editDeeds);
    noteNewTitles(beforeEdit);
    state.banner = null;
    syncRouteBar();
    requestStartWave(state.wave + 1);
  }

  function skipClearCountdown() {
    if (!(state.clearCountdown > 0)) return;
    if (state.pickMode === 'level' || state.pickMode === 'heroPlace') {
      toast('先完成卡牌選擇');
      return;
    }
    state.clearCountdown = 0;
    state.banner = null;
    if (state.clearKind === 'victory') finishVictoryAdvance();
    else goNextWave();
  }

  function routeEditTap(cell) {
    if (!state.editTool) {
      toast('先選擇直線或轉彎');
      return;
    }
    if (towerAt(cell.c, cell.r)) {
      toast('這格有塔，請先出售');
      Sfx.bad();
      return;
    }
    if (state.editTool === 'turn') {
      if (peelTurn(cell)) return;
      if (state.tiles.turn <= 0) { toast('沒有轉彎圖'); Sfx.bad(); return; }
      if (!applyTurn(cell)) { toast('這裡不能轉彎'); Sfx.bad(); }
      return;
    }
    if (peelStraight(cell)) return;
    if (state.tiles.straight <= 0) { toast('沒有直線圖'); Sfx.bad(); return; }
    if (applyStraight(cell) || shiftStraight(cell)) return;
    toast('這裡不能鋪直線');
    Sfx.bad();
  }

  function peelTurn(cell) {
    var path = route.cells;
    for (var i = 0; i < path.length - 3; i++) {
      var a = path[i];
      var s1 = path[i + 1];
      var s2 = path[i + 2];
      var b = path[i + 3];
      if (!sameCell(cell, s1) && !sameCell(cell, s2)) continue;
      if (!isMinimalBend(a, s1, s2, b)) continue;
      setRoute(path.slice(0, i + 1).concat(path.slice(i + 3)));
      state.tiles.turn += 1;
      toast('拆掉轉彎，圖檔已退回');
      Sfx.sell();
      syncRouteBar();
      return true;
    }
    return false;
  }

  function applyTurn(cell) {
    var path = route.cells;
    for (var i = 0; i < path.length - 1; i++) {
      var a = path[i];
      var b = path[i + 1];
      var dir = stepOf(a, b);
      if (!isUnitStep(dir)) continue;
      var perps = [{ c: -dir.r, r: dir.c }, { c: dir.r, r: -dir.c }];
      for (var p = 0; p < perps.length; p++) {
        var s1 = { c: a.c + perps[p].c, r: a.r + perps[p].r };
        var s2 = { c: b.c + perps[p].c, r: b.r + perps[p].r };
        if (!sameCell(cell, s1) && !sameCell(cell, s2)) continue;
        if (!inBounds(s1) || !inBounds(s2)) continue;
        if (towerAt(s1.c, s1.r) || towerAt(s2.c, s2.r)) {
          toast('這格有塔，請先出售');
          Sfx.bad();
          return true;
        }
        if (isPath(s1.c, s1.r) || isPath(s2.c, s2.r)) continue;
        setRoute(path.slice(0, i + 1).concat([s1, s2], path.slice(i + 1)));
        state.tiles.turn -= 1;
        toast('已鋪上轉彎');
        Sfx.build();
        syncRouteBar();
        return true;
      }
    }
    return false;
  }

  function peelStraight(cell) {
    var path = route.cells;
    for (var i = 0; i < path.length - 5; i++) {
      var a = path[i];
      var s1 = path[i + 1];
      var o1 = path[i + 2];
      var o2 = path[i + 3];
      var s2 = path[i + 4];
      var b = path[i + 5];
      if (!sameCell(cell, o1) && !sameCell(cell, o2)) continue;
      if (!isExtendedBend(a, s1, o1, o2, s2, b)) continue;
      setRoute(path.slice(0, i + 2).concat(path.slice(i + 4)));
      state.tiles.straight += 1;
      toast('拆掉直線，圖檔已退回');
      Sfx.sell();
      syncRouteBar();
      return true;
    }
    return false;
  }

  function applyStraight(cell) {
    var path = route.cells;
    for (var i = 0; i < path.length - 3; i++) {
      var a = path[i];
      var s1 = path[i + 1];
      var s2 = path[i + 2];
      var b = path[i + 3];
      if (!isMinimalBend(a, s1, s2, b)) continue;
      var perp = stepOf(a, s1);
      var o1 = { c: s1.c + perp.c, r: s1.r + perp.r };
      var o2 = { c: s2.c + perp.c, r: s2.r + perp.r };
      if (!sameCell(cell, o1) && !sameCell(cell, o2)) continue;
      if (!inBounds(o1) || !inBounds(o2)) continue;
      if (towerAt(o1.c, o1.r) || towerAt(o2.c, o2.r)) {
        toast('這格有塔，請先出售');
        Sfx.bad();
        return true;
      }
      if (isPath(o1.c, o1.r) || isPath(o2.c, o2.r)) continue;
      setRoute(path.slice(0, i + 2).concat([o1, o2], path.slice(i + 2)));
      state.tiles.straight -= 1;
      toast('直線已向外拉長');
      Sfx.build();
      syncRouteBar();
      return true;
    }
    return false;
  }

  function shiftStraight(cell) {
    var dir = pureLineDir();
    if (!dir) return false;
    var path = route.cells;
    var vertical = dir.c === 0;
    var next = [];
    var i;
    if (vertical) {
      var minR = Math.min(path[0].r, path[path.length - 1].r);
      var maxR = Math.max(path[0].r, path[path.length - 1].r);
      if (Math.abs(cell.c - path[0].c) !== 1 || cell.r < minR || cell.r > maxR) return false;
      for (i = 0; i < path.length; i++) {
        if (towerAt(cell.c, path[i].r)) {
          toast('這格有塔，請先出售');
          Sfx.bad();
          return true;
        }
        next.push({ c: cell.c, r: path[i].r });
      }
    } else {
      var minC = Math.min(path[0].c, path[path.length - 1].c);
      var maxC = Math.max(path[0].c, path[path.length - 1].c);
      if (Math.abs(cell.r - path[0].r) !== 1 || cell.c < minC || cell.c > maxC) return false;
      for (i = 0; i < path.length; i++) {
        if (towerAt(path[i].c, cell.r)) {
          toast('這格有塔，請先出售');
          Sfx.bad();
          return true;
        }
        next.push({ c: path[i].c, r: cell.r });
      }
    }
    setRoute(next);
    state.tiles.straight -= 1;
    toast('直線已平移');
    Sfx.build();
    syncRouteBar();
    return true;
  }

  function routeMarks() {
    var marks = [];
    var path = route.cells;
    var i;
    if (state.editTool === 'turn') {
      for (i = 0; i < path.length - 3; i++) {
        if (!isMinimalBend(path[i], path[i + 1], path[i + 2], path[i + 3])) continue;
        marks.push({ c: path[i + 1].c, r: path[i + 1].r, kind: 'undo' });
        marks.push({ c: path[i + 2].c, r: path[i + 2].r, kind: 'undo' });
      }
      for (i = 0; i < path.length - 1; i++) {
        var dir = stepOf(path[i], path[i + 1]);
        if (!isUnitStep(dir)) continue;
        var perps = [{ c: -dir.r, r: dir.c }, { c: dir.r, r: -dir.c }];
        for (var p = 0; p < perps.length; p++) {
          var s1 = { c: path[i].c + perps[p].c, r: path[i].r + perps[p].r };
          var s2 = { c: path[i + 1].c + perps[p].c, r: path[i + 1].r + perps[p].r };
          if (!inBounds(s1) || !inBounds(s2)) continue;
          if (towerAt(s1.c, s1.r) || towerAt(s2.c, s2.r) || isPath(s1.c, s1.r) || isPath(s2.c, s2.r)) continue;
          marks.push({ c: s1.c, r: s1.r, kind: 'add' });
          marks.push({ c: s2.c, r: s2.r, kind: 'add' });
        }
      }
    } else if (state.editTool === 'straight') {
      for (i = 0; i < path.length - 5; i++) {
        if (!isExtendedBend(path[i], path[i + 1], path[i + 2], path[i + 3], path[i + 4], path[i + 5])) continue;
        marks.push({ c: path[i + 2].c, r: path[i + 2].r, kind: 'undo' });
        marks.push({ c: path[i + 3].c, r: path[i + 3].r, kind: 'undo' });
      }
      for (i = 0; i < path.length - 3; i++) {
        if (!isMinimalBend(path[i], path[i + 1], path[i + 2], path[i + 3])) continue;
        var perp = stepOf(path[i], path[i + 1]);
        var o1 = { c: path[i + 1].c + perp.c, r: path[i + 1].r + perp.r };
        var o2 = { c: path[i + 2].c + perp.c, r: path[i + 2].r + perp.r };
        if (!inBounds(o1) || !inBounds(o2)) continue;
        if (towerAt(o1.c, o1.r) || towerAt(o2.c, o2.r) || isPath(o1.c, o1.r) || isPath(o2.c, o2.r)) continue;
        marks.push({ c: o1.c, r: o1.r, kind: 'add' });
        marks.push({ c: o2.c, r: o2.r, kind: 'add' });
      }
      var line = pureLineDir();
      if (line && state.tiles.straight > 0) {
        var vertical = line.c === 0;
        [-1, 1].forEach(function (delta) {
          var lane = [];
          for (var n = 0; n < path.length; n++) {
            var spot = vertical
              ? { c: path[n].c + delta, r: path[n].r }
              : { c: path[n].c, r: path[n].r + delta };
            if (!inBounds(spot) || towerAt(spot.c, spot.r)) { lane = null; break; }
            lane.push(spot);
          }
          if (!lane) return;
          lane.forEach(function (spot) { marks.push({ c: spot.c, r: spot.r, kind: 'add' }); });
        });
      }
    }
    return marks;
  }

  function syncRouteBar() {
    var show = state.mode === 'custom' && state.phase !== 'menu' && state.phase !== 'gameover';
    routeBar.hidden = !show;
    tileStraightEl.textContent = String(state.tiles.straight);
    tileTurnEl.textContent = String(state.tiles.turn);
    var editing = state.phase === 'edit';
    var buttons = routeBar.querySelectorAll('[data-tile]');
    for (var i = 0; i < buttons.length; i++) {
      var kind = buttons[i].getAttribute('data-tile');
      buttons[i].disabled = !editing;
      buttons[i].classList.toggle('is-selected', editing && state.editTool === kind);
    }
    routeHint.textContent = editing
      ? '點亮格鋪路，再點同一段可拆回圖檔。塔不能搬，出售返還 8 成。'
      : '每 5 波隨機 +3 張路線圖，每 10 波獎勵後可改道';
  }

  function selectTile(kind) {
    if (state.phase !== 'edit') return;
    state.editTool = state.editTool === kind ? null : kind;
    state.buildType = null;
    state.buildSite = null;
    state.selectedId = null;
    state.sellArmed = false;
    Sfx.ui();
    renderInspector();
    syncRouteBar();
  }

  function restartGame() {
    if (state.adBusy) return;
    closeModal();
    state.adBusy = true;
    state.paused = true;
    Ads.showInterstitial({ placement: 'restart' }).then(function () {
      state.adBusy = false;
      startRun(state.mode, state.level);
    });
  }

  function hideStoryScreens() {
    if (screenWelcome) screenWelcome.hidden = true;
    if (screenIndex) screenIndex.hidden = true;
    if (screenBoard) screenBoard.hidden = true;
    if (screenFriends) screenFriends.hidden = true;
    if (screenAura) screenAura.hidden = true;
    screenMenu.hidden = true;
    screenDifficulty.hidden = true;
  }

  function paintCodexThumb(spec) {
    var canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    canvas.className = 'info-art';
    canvas.setAttribute('aria-hidden', 'true');
    var g = canvas.getContext('2d');
    if (!g) return canvas;
    var prev = ctx;
    ctx = g;
    try {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, 96, 96);
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, 96, 96);
      g.save();
      g.translate(48, spec.elite ? 52 : (spec.bossId ? 54 : 50));
      inkSetup(2.8);
      if (spec.kind === 'enemy') {
        var enemy = {
          type: spec.type || 'grunt',
          color: spec.color || '#e25b4a',
          boss: !!spec.bossId && !spec.elite,
          elite: !!spec.elite,
          bossId: spec.bossId || '',
          resist: spec.resist || '',
        };
        var resist = enemy.resist && RESISTS[enemy.resist] ? RESISTS[enemy.resist] : null;
        var colors = enemyBodyColors(enemy, resist);
        var rad = spec.bossId ? (spec.elite ? 28 : 26) : 26;
        if (spec.elite && spec.bossId) {
          drawEliteBody(enemy, rad, colors, 0);
        } else if (spec.bossId) {
          enemy.boss = true;
          drawBossBody(enemy, rad, colors, 0);
        } else if (spec.type === 'hopper') drawHopperBody(rad, colors, 0, false);
        else if (spec.type === 'devil') drawDevilBody(rad, colors, 0);
        else if (spec.type === 'swift') drawSwiftBody(rad, colors, 0);
        else if (spec.type === 'brute') drawBruteBody(rad, colors, 0);
        else if (spec.type === 'ram') drawRamBody(rad, colors, 0);
        else if (spec.type === 'bone') drawBoneBody(rad, colors, 0, false);
        else drawGruntBody(rad, colors, 0);
        if (resist) {
          g.font = '800 11px ' + FONT;
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.lineWidth = 3;
          g.strokeStyle = '#fff';
          g.fillStyle = resist.color;
          g.strokeText(resist.name, 0, -rad - 10);
          g.fillText(resist.name, 0, -rad - 10);
        }
      } else if (spec.kind === 'tower') {
        drawTowerGlyph(spec.type || 'basic', 22, -0.35);
      } else if (spec.kind === 'hero') {
        drawHeroGlyph(spec.hero || 'sword', 26);
      } else if (spec.kind === 'hell') {
        inkCircle(0, -2, 18);
        ctx.fillStyle = '#fff';
        ctx.fill();
        inkStroke();
        ctx.fillStyle = '#161616';
        g.font = '800 16px ' + FONT;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(spec.mark || '!', 0, -1);
      }
      g.restore();
    } finally {
      ctx = prev;
    }
    return canvas;
  }

  function renderDifficulties() {
    difficultyList.replaceChildren();
    var mode = state.difficultyMode === 'custom' ? 'custom' : 'infinite';
    var ids = ['normal', 'hell'];
    for (var i = 0; i < ids.length; i++) {
      var diff = INFINITE_PROFILES[ids[i]];
      var best = loadBest(diff.id, mode);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mode-card';
      var title = document.createElement('span');
      title.className = 'mode-name';
      title.textContent = diff.name;
      var copy = document.createElement('span');
      copy.className = 'mode-desc';
      var blurb = mode === 'custom' && diff.id === 'normal'
        ? '怪物稍厚、稍密，擊殺金幣稍少。起始 100 金、20 生命。'
        : diff.blurb;
      copy.textContent = blurb + (best > 0 ? ' 最遠第 ' + best + ' 波。' : '');
      btn.appendChild(title);
      btn.appendChild(copy);
      btn.addEventListener('click', (function (id) {
        return function () {
          state.difficulty = id;
          startRun(mode, 0);
        };
      })(diff.id));
      difficultyList.appendChild(btn);
    }
  }

  function openDifficulty(mode) {
    state.difficultyMode = mode === 'custom' ? 'custom' : 'infinite';
    state.phase = 'menu';
    state.paused = true;
    closeModal();
    hideStoryScreens();
    var kicker = document.getElementById('difficulty-kicker');
    var note = document.getElementById('difficulty-note');
    if (kicker) kicker.textContent = state.difficultyMode === 'custom' ? '自訂路線' : '無限隨機模式';
    if (note) {
      note.textContent = state.difficultyMode === 'custom'
        ? '普通與地獄分開記錄最遠波次。第 3 波起會出現抗性怪。'
        : '開局隨機地圖後固定路線。普通與地獄分開記錄最遠波次。第 3 波起會出現抗性怪。';
    }
    screenDifficulty.hidden = false;
    renderDifficulties();
  }

  function initCloud() {
    if (!cloudReady()) return;
    if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
    cloudDb = firebase.firestore();
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) {
        var localGuest = loadAccount();
        if (localGuest && String(localGuest.uid).indexOf('guest-') === 0) {
          paintAccount();
          return;
        }
        clearAccount();
        onlineBoards = {};
        onlineRanks = {};
        paintAccount();
        return;
      }
      var named = String(user.displayName || user.email || '').trim();
      var prev = loadAccount();
      var same = prev && prev.uid === user.uid;
      // 本機有合法 ID 就先留著；沒有則空著，等雲端 users/{uid}.friendId
      var prevId = (same && validFriendId(prev.friendId)) ? prev.friendId : keptFriendId(user.uid);
      saveAccount({
        uid: user.uid,
        name: (same && prev.nameCustom && prev.name) ? prev.name : (user.isAnonymous || !named ? guestLabel() : named).slice(0, 24),
        nameCustom: !!(same && prev.nameCustom),
        email: user.email || '',
        picture: user.photoURL || (same ? prev.picture : '') || '',
        avatar: same && prev.avatar ? prev.avatar : '',
        frame: same && prev.frame ? prev.frame : '',
        title: same && prev.title ? prev.title : '',
        guest: !!user.isAnonymous,
        friendId: prevId || '',
      });
      paintAccount();
      bindAccountProgress();
      refreshAllBoards();
    });
  }

  function paintAccount() {
    var account = loadAccount();
    var welcomeUser = document.getElementById('welcome-user');
    var welcomeName = document.getElementById('welcome-user-name');
    var welcomeAvatar = document.getElementById('welcome-avatar');
    var welcomeAccount = document.getElementById('btn-welcome-account');
    var welcomeGuest = document.getElementById('btn-welcome-guest');
    var welcomeStart = document.getElementById('btn-welcome-start');
    var chip = document.getElementById('account-chip');
    var chipName = document.getElementById('account-name');
    var chipAvatar = document.getElementById('account-avatar');
    if (welcomeUser) welcomeUser.hidden = !account;
    if (welcomeAccount) welcomeAccount.hidden = !!account;
    if (welcomeGuest) welcomeGuest.hidden = !!account;
    if (welcomeStart) welcomeStart.hidden = !account;
    if (chip) chip.hidden = !account;
    paintPlayerCard();
    if (!account) return;
    if (welcomeName) welcomeName.textContent = account.name + (rankEpithet(hellRank()) ? ('　' + rankEpithet(hellRank())) : '');
    if (chipName) chipName.textContent = account.name;
    if (welcomeAvatar) {
      paintAvatarSlot(welcomeAvatar, document.getElementById('welcome-avatar-doodle'), null, account);
    }
    if (chipAvatar) {
      var chipPhoto = account.picture && String(account.picture).indexOf('doodle:') !== 0;
      chipAvatar.hidden = !chipPhoto;
      if (chipPhoto) chipAvatar.src = account.picture;
    }
  }

  function beginGoogleSignIn() {
    if (!cloudReady()) {
      openModal({
        tone: 'reward',
        kicker: 'Google',
        title: '線上排行還沒接上',
        desc: '成績要用 Google 帳號寫進 Firebase。把專案設定貼進 firebase-config.js，並開啟 Google 登入。現在先可以玩，成績不會記到帳號。',
        actions: [
          { label: '先開始遊戲', className: 'btn-mint', onClick: function () { closeModal(); showMenu(); } },
          { label: '返回', className: 'btn-ghost', onClick: closeModal },
        ],
      });
      return;
    }
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    firebase.auth().signInWithPopup(provider).then(function () {
      closeModal();
      showMenu();
      toast('已登入，成績會記到這個帳號');
    }).catch(function (error) {
      var code = error && error.code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        firebase.auth().signInWithRedirect(provider);
        return;
      }
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      toast('登入失敗');
    });
  }

  function enterLocalGuest() {
    var id = '';
    try { id = localStorage.getItem('symbols-td-guest-id') || ''; } catch (error) { id = ''; }
    if (!id || id.indexOf('guest-') !== 0) {
      id = 'guest-' + Date.now().toString(36);
      try { localStorage.setItem('symbols-td-guest-id', id); } catch (error) { /* ignore */ }
    }
    var prevGuest = loadAccount();
    var sameGuest = prevGuest && prevGuest.uid === id;
    saveAccount({
      uid: id,
      name: (sameGuest && prevGuest.nameCustom && prevGuest.name) ? prevGuest.name : guestLabel(),
      nameCustom: !!(sameGuest && prevGuest.nameCustom),
      email: '',
      picture: '',
      avatar: sameGuest && prevGuest.avatar ? prevGuest.avatar : '',
      frame: sameGuest && prevGuest.frame ? prevGuest.frame : '',
      title: sameGuest && prevGuest.title ? prevGuest.title : '',
      guest: true,
      friendId: keptFriendId(id),
    });
    state.stars = loadStars();
    paintAccount();
    showMenu();
    toast('已用訪客進入');
  }

  function beginGuestSignIn() {
    if (!cloudReady()) {
      enterLocalGuest();
      return;
    }
    firebase.auth().signInAnonymously().then(function () {
      closeModal();
      showMenu();
      toast('已用訪客進入');
    }).catch(function () {
      enterLocalGuest();
    });
  }

  function openAccountCard() {
    var account = loadAccount();
    if (!account) return;
    var epithet = rankEpithet(hellRank());
    profilePick = null;
    profileEditTab = 'face';
    openModal({
      tone: 'reward',
      kicker: '名片',
      title: '編輯名片',
      desc: 'ID　' + account.friendId + '。名字最多 12 字。頭像、框和稱號可以自己選。前 10 名的榜上稱號會另外顯示。',
      profile: true,
      actions: [
        { label: '儲存', className: 'btn-mint', onClick: saveProfileCard },
        { label: '登出', className: 'btn-ghost', onClick: function () {
          var done = function () {
            clearAccount();
            onlineBoards = {};
            onlineRanks = {};
            closeModal();
            paintAccount();
            toast('已登出');
          };
          if (cloudReady()) firebase.auth().signOut().then(done).catch(done);
          else done();
        } },
        { label: '關閉', className: 'btn-mint', onClick: closeModal },
      ],
    });
  }

  function showWelcome() {
    state.phase = 'menu';
    state.paused = true;
    state.editTool = null;
    closeModal();
    hideStoryScreens();
    if (screenDifficulty) screenDifficulty.hidden = true;
    if (screenWelcome) screenWelcome.hidden = false;
    paintAccount();
    syncRouteBar();
    Bgm.sync();
  }

  var homePick = null;
  var homeGoalsOpen = false;

  function firstOpenStage() {
    var last = STAGES[0];
    for (var i = 0; i < STAGES.length; i++) {
      if (!stageUnlocked(STAGES[i])) continue;
      last = STAGES[i];
      if ((state.stars[STAGES[i].stageId] || 0) < 1) return STAGES[i];
    }
    return last;
  }

  function ensureHomePick() {
    if (homePick) {
      var current = stageById(homePick.chapter + '-' + homePick.index);
      if (current) return current;
    }
    var stage = firstOpenStage();
    homePick = { chapter: stage.chapter, index: stage.index };
    return stage;
  }

  function starSum() {
    var total = 0;
    for (var i = 0; i < STAGES.length; i++) total += starCount(state.stars[STAGES[i].stageId] || 0);
    return total;
  }

  function paintHomeGoals(stage) {
    var row = document.getElementById('home-goals');
    var button = document.getElementById('home-stars');
    if (!row) return;
    row.replaceChildren();
    row.hidden = !homeGoalsOpen;
    if (button) {
      button.setAttribute('aria-expanded', homeGoalsOpen ? 'true' : 'false');
      var got = stage ? starCount(state.stars[stage.stageId] || 0) : 0;
      button.setAttribute('aria-label', (stage ? stage.stageId + ' ' : '') + '星星 ' + got + '，點開看這關條件');
    }
    if (!stage) return;
    var title = document.createElement('p');
    title.textContent = stage.stageId + ' 條件';
    row.appendChild(title);
    var goals = stage.goals || [];
    var mask = state.stars[stage.stageId] || 0;
    for (var i = 0; i < goals.length && i < 3; i++) {
      var item = document.createElement('div');
      var on = !!(mask & (1 << i));
      item.className = 'home-goal' + (on ? ' is-on' : '');
      var mark = document.createElement('span');
      mark.className = 'goal-mark';
      mark.textContent = on ? '★' : '☆';
      var label = document.createElement('span');
      label.textContent = goalLabel(goals[i]);
      item.appendChild(mark);
      item.appendChild(label);
      row.appendChild(item);
    }
  }

  function drawHomeArt(chapter) {
    var img = document.getElementById('home-art');
    if (!img) return;
    var info = chapterById(chapter);
    var frame = img.closest('.home-frame');
    var blank = !!(info && info.art === false);
    if (frame) {
      frame.classList.toggle('is-blank', blank);
      frame.classList.toggle('is-zoom', chapter === 9 && !blank);
    }
    if (blank) {
      img.removeAttribute('src');
      img.alt = '';
      img.hidden = true;
      return;
    }
    img.hidden = false;
    img.src = 'assets/ui/chapters/' + chapter + '.jpg?v=4';
    img.alt = '';
  }

  function paintPlayHome() {
    var stage = ensureHomePick();
    var chapter = chapterById(stage.chapter);
    var kicker = document.getElementById('home-chapter-kicker');
    var title = document.getElementById('home-chapter-name');
    var progress = document.getElementById('home-progress');
    var starButton = document.getElementById('home-stars');
    var waves = document.getElementById('home-waves');
    var gold = document.getElementById('home-gold');
    var boss = document.getElementById('home-boss');
    var lock = document.getElementById('home-lock');
    var start = document.getElementById('btn-home-start');
    var box = document.getElementById('home-stages');
    var unlocked = stageUnlocked(stage);
    var done = 0;
    for (var s = 1; s <= 5; s++) if ((state.stars[stage.chapter + '-' + s] || 0) >= 1) done += 1;
    if (kicker) kicker.textContent = '章節 ' + chapter.id;
    if (title) title.textContent = chapter.name;
    var homeKit = chapterKitById(chapter.id);
    if (progress) progress.textContent = stage.stageId + ' ' + stage.name + (homeKit ? ' · ' + homeKit.name : '') + ' · 進度 ' + done + '/5';
    paintHomeGoals(stage);
    if (starButton) {
      starButton.dataset.stars = String(starCount(state.stars[stage.stageId] || 0));
      starButton.classList.remove('is-won');
    }
    if (waves) waves.textContent = String(stage.waves.length);
    if (gold) gold.textContent = String(stage.initialGold);
    if (boss) {
      var finalStage = stage.index === 5;
      boss.textContent = finalStage ? chapter.boss.replace(/王$/, '') : '小王';
      if (boss.nextElementSibling) boss.nextElementSibling.textContent = finalStage ? '首領' : '菁英';
    }
    if (lock) lock.hidden = chapterUnlocked(chapter.id);
    if (start) {
      start.disabled = !unlocked;
      start.textContent = unlocked ? '開始' : '未解鎖';
    }
    drawHomeArt(chapter.id);
    if (!box) return;
    box.replaceChildren();
    for (var n = 1; n <= 5; n++) {
      var node = stageById(chapter.id + '-' + n);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'home-node sketch-circle' + (n === stage.index ? ' is-on sketch-circle-dark' : '');
      btn.disabled = !stageUnlocked(node);
      btn.setAttribute('data-stage', node.stageId);
      var label = document.createElement('span');
      label.className = 'home-node-num';
      label.textContent = String(n);
      btn.appendChild(label);
      box.appendChild(btn);
    }
  }

  function showMenu() {
    state.phase = 'menu';
    state.paused = true;
    state.editTool = null;
    closeModal();
    hideStoryScreens();
    if (screenDifficulty) screenDifficulty.hidden = true;
    screenMenu.hidden = false;
    paintAccount();
    paintPlayHome();
    syncRouteBar();
    Bgm.sync();
  }

  function appendInfoCard(list, entry) {
    var card = document.createElement('article');
    card.className = 'info-card' + (entry.cardClass ? (' ' + entry.cardClass) : '');
    var thumb = entry.paint ? paintCodexThumb(entry.paint) : document.createElement('div');
    if (!entry.paint) {
      thumb.className = 'info-art';
      thumb.setAttribute('aria-hidden', 'true');
    }
    var body = document.createElement('div');
    body.className = 'info-body';
    var tag = document.createElement('span');
    tag.className = 'info-tag';
    tag.textContent = entry.tag;
    var title = document.createElement('h3');
    title.textContent = entry.title;
    body.appendChild(tag);
    body.appendChild(title);
    if (entry.desc) {
      var desc = document.createElement('p');
      desc.textContent = entry.desc;
      body.appendChild(desc);
    }
    if (entry.stats && entry.stats.length) {
      var ul = document.createElement('ul');
      ul.className = 'info-stats';
      for (var s = 0; s < entry.stats.length; s++) {
        var li = document.createElement('li');
        li.innerHTML = entry.stats[s];
        ul.appendChild(li);
      }
      body.appendChild(ul);
    }
    card.appendChild(thumb);
    card.appendChild(body);
    list.appendChild(card);
    return card;
  }

  function appendInfoBanner(list, text) {
    var ban = document.createElement('div');
    ban.className = 'info-banner';
    ban.textContent = text;
    list.appendChild(ban);
  }

  function renderCodex() {
    var list = document.getElementById('codex-list');
    if (!list) return;
    list.replaceChildren();
    var entries = [
      {
        tag: '小怪', title: '普通怪', paint: { kind: 'enemy', type: 'grunt', color: '#e25b4a' },
        desc: '手繪史萊姆，最常見的基礎怪。',
        stats: [
          '<strong>血量</strong>：約 32 × 波次成長（依難度倍率）',
          '<strong>移速</strong>：基準約 1.0，隨波次緩升',
          '<strong>金幣</strong>：約等於波次（20 波後軟上限）',
          '<strong>漏關</strong>：扣 1 生命',
        ],
      },
      {
        tag: '小怪', title: '快怪', paint: { kind: 'enemy', type: 'swift', color: '#f0a202' },
        desc: '手繪蝙蝠，沿著路飛，跑得比普通怪快。',
        stats: [
          '<strong>血量</strong>：普通怪 ×0.62',
          '<strong>移速</strong>：普通怪 ×1.55（較快）',
          '<strong>飛行</strong>：雷塔對它增傷',
          '<strong>金幣</strong>：略低於普通怪',
          '<strong>漏關</strong>：扣 1 生命',
        ],
      },
      {
        tag: '小怪', title: '精英怪', paint: { kind: 'enemy', type: 'brute', color: '#8d6bff' },
        desc: '手繪裝甲獸，厚重肉盾。',
        stats: [
          '<strong>血量</strong>：普通怪 ×7.5',
          '<strong>移速</strong>：普通怪 ×0.52（很慢）',
          '<strong>金幣</strong>：8 + 波次×2（後期軟上限）',
          '<strong>漏關</strong>：扣 3 生命',
        ],
      },
      {
        tag: '小怪', title: '跳躍怪', paint: { kind: 'enemy', type: 'hopper', color: '#4ec6e8' },
        desc: '手繪彈簧蛙，可抄捷徑跳躍。',
        stats: [
          '<strong>血量</strong>：普通怪 ×0.8',
          '<strong>移速</strong>：略快於普通怪',
          '<strong>跳躍</strong>：同時最多 3 隻、有冷卻。雷塔增傷',
          '<strong>金幣</strong>：略高於普通怪',
          '<strong>漏關</strong>：扣 1 生命',
        ],
      },
      {
        tag: '小怪', title: '小惡魔', paint: { kind: 'enemy', type: 'devil', color: '#c62828' },
        desc: '手繪小惡魔，走在地上。惡咒鎖塔時會把紅叉插在塔旁。漏關還會偷金幣。',
        stats: [
          '<strong>血量</strong>：普通怪 ×0.95',
          '<strong>移速</strong>：普通怪 ×1.2',
          '<strong>惡咒</strong>：約每 3 秒鎖附近一座塔',
          '<strong>漏關</strong>：扣 1 生命，並偷走部分金幣',
          '<strong>出現</strong>：約第 8 波起',
        ],
      },
      {
        tag: '小怪', title: '骷髏小怪', paint: { kind: 'enemy', type: 'bone', color: '#efe6d6' },
        desc: '魔王城的小骷髏。打死會再站起來一次，復活時只剩一半血，第二次才真的倒下。復活過的眼睛會發橙。',
        stats: [
          '<strong>血量</strong>：普通怪 ×0.85，復活後剩一半',
          '<strong>移速</strong>：比普通怪慢一點',
          '<strong>復活</strong>：每隻只復活一次',
          '<strong>作戰</strong>：只有第九章魔王城',
          '<strong>無限、自訂</strong>：普通第 22 波起，地獄第 18 波起，每波最多 2 到 3 隻',
        ],
      },
      {
        tag: '小怪', title: '破塔怪', paint: { kind: 'enemy', type: 'ram', color: '#5c4033' },
        desc: '手繪衝角獸。無限和自訂模式第 40 波起出現，走近一般塔會把塔撞破。英雄塔不會被撞掉。',
        stats: [
          '<strong>血量</strong>：普通怪 ×2.8',
          '<strong>移速</strong>：普通怪 ×0.82',
          '<strong>撞塔</strong>：撞破後塔消失，不退金幣',
          '<strong>出現</strong>：無限、自訂，第 40 波起每波 1 隻',
        ],
      },
      {
        tag: '抗性', title: '屬性抗性', paint: { kind: 'enemy', type: 'grunt', color: '#e25b4a', resist: 'burn' },
        desc: '第 3 波起有機率掛抗性標籤。',
        stats: [
          '<strong>種類</strong>：抗凍／抗電／抗燒／抗毒／抗緩',
          '<strong>效果</strong>：對應屬性幾乎無效',
          '<strong>顯示</strong>：邊緣會標抗性名',
          '<strong>出現率</strong>：約 16% 起，隨波次上升（上限約 40%）',
        ],
      },
      {
        tag: '小王', title: '各章小王', paint: { kind: 'enemy', type: 'grunt', color: '#3ecf8e', bossId: 'regen', elite: true },
        desc: '各章前四關的尾王。外型統一是舊的圓頭王圖加黃冠，不另外畫造型；差別在能力特效：回血、狂暴、召喚、護盾、分裂、治癒、冰封、鐵甲各自不同。',
        stats: [
          '<strong>出現</strong>：1-1～1-4、2-1～2-4 … 到 9-1～9-4，每關最後一波',
          '<strong>血量</strong>：普通怪 ×4.2',
          '<strong>特效</strong>：施放能力時會爆光、外框跟粒子跟著變',
          '<strong>骷髏小王</strong>：偶爾放一顆隕石暈塔',
        ],
      },
      {
        tag: '首領', title: '再生王', paint: { kind: 'enemy', type: 'grunt', color: '#3ecf8e', bossId: 'regen' },
        desc: '有手腳的大王，頭側長綠葉，一手拿葉，戴黃冠。只會在 1-5 最後一波出現。',
        stats: [
          '<strong>出現</strong>：1-5 最後一波',
          '<strong>特性</strong>：戰鬥中持續回血',
          '<strong>克制</strong>：毒塔毒蝕（持續扣總血 %）',
        ],
      },
      {
        tag: '首領', title: '狂暴王', paint: { kind: 'enemy', type: 'grunt', color: '#ff5a36', bossId: 'rush' },
        desc: '有手腳的大王，紅髮張嘴，一隻手往前揮，戴黃冠。只會在 2-5 最後一波出現。',
        stats: ['<strong>出現</strong>：2-5 最後一波', '<strong>觸發</strong>：血量低於 50%', '<strong>效果</strong>：大幅加速'],
      },
      {
        tag: '首領', title: '召喚王', paint: { kind: 'enemy', type: 'grunt', color: '#f2c14e', bossId: 'summon' },
        desc: '有手腳的大王，一隻手高舉黃球，戴黃冠。只會在 3-5 最後一波出現。',
        stats: ['<strong>出現</strong>：3-5 最後一波', '<strong>特性</strong>：週期召喚小怪', '<strong>壓力</strong>：增加漏關與干擾火力'],
      },
      {
        tag: '首領', title: '護盾王', paint: { kind: 'enemy', type: 'grunt', color: '#67e8f9', bossId: 'ward' },
        desc: '有手腳的大王，左手握著大盾，戴黃冠。只會在 4-5 最後一波出現。',
        stats: ['<strong>出現</strong>：4-5 最後一波', '<strong>特性</strong>：護盾期間減傷／擋彈', '<strong>克制</strong>：火塔破盾並打血量 10%'],
      },
      {
        tag: '首領', title: '分裂王', paint: { kind: 'enemy', type: 'grunt', color: '#c084fc', bossId: 'split' },
        desc: '有手腳的大王，肩膀還長兩顆小頭，戴黃冠。只會在 5-5 最後一波出現。',
        stats: ['<strong>出現</strong>：5-5 最後一波', '<strong>死亡</strong>：分成 3 隻小怪', '<strong>金幣</strong>：分裂體金幣較低'],
      },
      {
        tag: '首領', title: '治癒王', paint: { kind: 'enemy', type: 'grunt', color: '#ff8fab', bossId: 'mend' },
        desc: '有手腳的大王，一隻手高舉治療十字，戴黃冠。只會在 6-5 最後一波出現。',
        stats: ['<strong>出現</strong>：6-5 最後一波', '<strong>特性</strong>：範圍治療友軍', '<strong>克制</strong>：毒塔毒蝕'],
      },
      {
        tag: '首領', title: '冰封王', paint: { kind: 'enemy', type: 'grunt', color: '#9bd4ff', bossId: 'frost' },
        desc: '有手腳的大王，瀏海掛冰柱，一隻手高舉冰晶，戴黃冠。只會在 7-5 最後一波出現。',
        stats: ['<strong>出現</strong>：7-5 最後一波', '<strong>技能</strong>：定期凍結所有塔', '<strong>應對</strong>：預留輸出與節奏'],
      },
      {
        tag: '首領', title: '鐵甲王', paint: { kind: 'enemy', type: 'grunt', color: '#8aa0b8', bossId: 'armor' },
        desc: '有手腳的大王，戴頭盔跟肩甲，胸前有鐵板，戴黃冠。只會在 8-5 最後一波出現。',
        stats: ['<strong>出現</strong>：8-5 最後一波', '<strong>減傷</strong>：受到傷害減半', '<strong>克制</strong>：火塔破甲並打血量 10%'],
      },
      {
        tag: '首領', title: '骷髏王', paint: { kind: 'enemy', type: 'grunt', color: '#f4efe4', bossId: 'skull' },
        desc: '有手腳的大王，走路會擺動，施法時舉起法杖。作戰只會在 9-5 最後一波出現；無限第 50 波也會遇到。',
        stats: [
          '<strong>出現</strong>：9-5 最後一波；無限第 50 波',
          '<strong>魔王城</strong>：隕石再加上召喚骷髏小怪',
          '<strong>暈眩</strong>：炸到的塔 1 秒不能攻擊',
        ],
      },
      {
        tag: '地獄', title: '地獄詞綴', paint: { kind: 'hell', mark: '獄' },
        desc: '地獄難度額外詞綴，可疊加壓力。',
        stats: [
          '<strong>疾行</strong>：移速 +10%',
          '<strong>鎖塔</strong>：週期鎖住防禦塔',
          '<strong>亂王／分裂</strong>：干擾與增殖',
          '<strong>回血</strong>：被毒克制',
          '<strong>殘暴</strong>：血到 10% 加速 15%',
          '<strong>厚皮</strong>：加血；被火克制',
        ],
      },
    ];
    for (var i = 0; i < entries.length; i++) appendInfoCard(list, entries[i]);
  }

  function renderTowerInfo() {
    var list = document.getElementById('tower-info-list');
    if (!list) return;
    list.replaceChildren();

    appendInfoBanner(list, '無屬／分支');
    appendInfoCard(list, {
      tag: '無屬', title: '無屬性塔', paint: { kind: 'tower', type: 'basic' },
      desc: '便宜起步。3 等分支為箭塔或砲塔。金幣最高 5 等，卡牌可到 6 等×1.4。',
      stats: [
        '<strong>造價</strong>：40',
        '<strong>1→2 等</strong>：傷 16→26 · 射程 2.35→2.5',
        '<strong>升級金</strong>：35 → 60 →（分支）',
      ],
    });
    appendInfoCard(list, {
      tag: '分支', title: '箭塔', paint: { kind: 'tower', type: 'arrow' },
      desc: '高傷高攻速；滿等打 2 隻。',
      stats: [
        '<strong>傷</strong>：42→58→78→100',
        '<strong>攻速</strong>：0.28→0.16 秒／發',
        '<strong>滿等</strong>：2 目標 · 單體 DPS 最高',
      ],
    });
    appendInfoCard(list, {
      tag: '分支', title: '砲塔', paint: { kind: 'tower', type: 'cannon' },
      desc: '擴散清群；中心傷高、外圍遞減、不疊加。',
      stats: [
        '<strong>傷</strong>：44→58→74→92（中心）',
        '<strong>彈數</strong>：2→3 · 擴散 1.05→1.5',
        '<strong>定位</strong>：清群、壓線',
      ],
    });

    appendInfoBanner(list, '屬性塔');
    var attrWrap = document.createElement('div');
    attrWrap.className = 'info-attr-grid';
    list.appendChild(attrWrap);
    var attrs = [
      {
        tag: '毒', title: '毒塔', cardClass: 'info-card--attr info-card--poison',
        paint: { kind: 'tower', type: 'poison' },
        desc: '傳染毒 · 克制回血',
        stats: [
          '<strong>造價</strong> 80',
          '<strong>毒</strong> 22→54／0.4秒',
          '<strong>克制</strong> 再生／治療／回血',
        ],
      },
      {
        tag: '火', title: '火塔', cardClass: 'info-card--attr info-card--fire',
        paint: { kind: 'tower', type: 'fire' },
        desc: '爆炸灼燒 · 破盾破甲',
        stats: [
          '<strong>造價</strong> 90',
          '<strong>爆</strong> 48→114',
          '<strong>克制</strong> 破盾、破甲、厚皮時打一次總血 6%',
        ],
      },
      {
        tag: '冰', title: '冰塔', cardClass: 'info-card--attr info-card--ice',
        paint: { kind: 'tower', type: 'ice' },
        desc: '緩速 · 第 3 次凍結',
        stats: [
          '<strong>造價</strong> 85',
          '<strong>緩</strong> 35%→45%',
          '<strong>擴散</strong> 1.1→1.62',
        ],
      },
      {
        tag: '雷', title: '雷塔', cardClass: 'info-card--attr info-card--bolt',
        paint: { kind: 'tower', type: 'bolt' },
        desc: '串連跳電 · 對空與跳躍增傷 · 麻痺',
        stats: [
          '<strong>造價</strong> 85',
          '<strong>傷</strong> 24→84，飛行與跳躍 ×1.4',
          '<strong>麻痺</strong> 1.0→1.3 秒',
          '<strong>串連</strong> 2→4 跳',
        ],
      },
    ];
    for (var a = 0; a < attrs.length; a++) appendInfoCard(attrWrap, attrs[a]);

    appendInfoBanner(list, '經濟／英雄');
    appendInfoCard(list, {
      tag: '經濟', title: '產錢塔', paint: { kind: 'tower', type: 'mint' },
      desc: '不攻擊，定期產金。後期擊殺金遞減時補經濟。',
      stats: [
        '<strong>造價</strong>：70',
        '<strong>產金</strong>：6→22／次 · 間隔 5.0→3.0 秒',
        '<strong>滿等卡</strong>：產金 ×1.4',
      ],
    });
    appendInfoCard(list, {
      tag: '經濟', title: '鐵匠', paint: { kind: 'tower', type: 'smith' },
      desc: '不攻擊。第 20 波起，或已經有塔升滿時可造，全場一隻。在場時其他塔可以用金幣升到 10 等。',
      stats: [
        '<strong>造價</strong>：480',
        '<strong>效果</strong>：其他塔金幣上限 5 等 → 10 等',
        '<strong>賣掉</strong>：已升過的等級留著，但不能再往上升',
      ],
    });
    appendInfoCard(list, {
      tag: '英雄', title: '緋紅劍客', paint: { kind: 'hero', hero: 'sword' },
      desc: '走到放置點的射程內追砍。刀揮過的怪都會受傷，每三下射出旋轉半月劍氣。主動：修羅附體。',
      stats: ['<strong>主動</strong>：攻速約 11 倍，每下總血 0.14%→0.18%，最多 5 秒', '<strong>操作</strong>：可拖曳換位，技能點放置處'],
    });
    appendInfoCard(list, {
      tag: '英雄', title: '叢林獵手', paint: { kind: 'hero', hero: 'archer' },
      desc: '最遠的單體貫穿。打到護盾、鐵甲或抗性時，那一發改打總血，並打掉那層。',
      stats: ['<strong>貫甲</strong>：每發總血 1.2%→2.2%', '<strong>主動</strong>：致命毒霧，每秒總血 0.8%→1.6%，禁療 10 秒'],
    });
    appendInfoCard(list, {
      tag: '英雄', title: '萬象法師', paint: { kind: 'hero', hero: 'mage' },
      desc: '火破盾、冰緩速、風把怪沿路推回去。主動：隕石術，全圖持續落下。',
      stats: ['<strong>普攻</strong>：三系輪流', '<strong>主動</strong>：每 0.5 秒全圖總血 0.4%→0.85%，共 7 秒'],
    });
    appendInfoCard(list, {
      tag: '英雄', title: '戰靈樂手', paint: { kind: 'hero', hero: 'priest' },
      desc: '不攻擊。光環提升裡面每座塔的攻擊與攻速，滿等大約蓋住半張圖。',
      stats: ['<strong>光環</strong>：攻擊約 +8%～22%，攻速約 +6%～18%', '<strong>主動</strong>：每座塔每秒總血 0.5%→1.1%，5 秒，不疊原本傷害'],
    });
    appendInfoCard(list, {
      tag: '英雄', title: '全知全能的神', paint: { kind: 'hero', hero: 'god' },
      desc: '本週地獄榜第 1 到 3 名可在祭壇召喚。下週沒有這個名次就不能再招。不攻擊，沒有主動技。放上後整張圖生效。名次不夠時，祭壇裡這顆按鈕是灰色的。',
      stats: [
        '<strong>解鎖</strong>：本週地獄榜第 1、2、3 名，下週沒有這個名次就不能召喚',
        '<strong>費用</strong>：1000 金幣，全場只能一隻，可拖曳換位',
        '<strong>怪物</strong>：移動速度 -10%',
        '<strong>怪物</strong>：回血效果減半，護盾減半',
        '<strong>其他塔</strong>：攻速 +20%，攻擊 +10%',
        '<strong>自己</strong>：不受這份加成',
      ],
    });
    appendInfoCard(list, {
      tag: '英雄', title: '光之神使', paint: { kind: 'hero', hero: 'herald' },
      desc: '本週地獄榜第 4 到 10 名可在祭壇召喚。下週沒有這個名次就不能再招。不攻擊。光環大約蓋住半張圖，裡面是神之力的一半。場上若已有全知全能的神，以神的全圖效果為準。',
      stats: [
        '<strong>解鎖</strong>：本週地獄榜第 4 到 10 名，下週沒有這個名次就不能召喚',
        '<strong>費用</strong>：1000 金幣，全場只能一隻，可拖曳換位',
        '<strong>光環</strong>：半徑約 4.5 格，大約半張圖',
        '<strong>光環內怪物</strong>：移速 -5%，回血剩 75%，護盾剩 75%',
        '<strong>光環內其他塔</strong>：攻速 +10%，攻擊 +5%',
      ],
    });
  }

  function renderHellInfo() {
    var list = document.getElementById('hell-info-list');
    if (!list) return;
    list.replaceChildren();
    appendInfoCard(list, {
      tag: '說明', title: '地獄模式', cardClass: 'info-card--hell',
      paint: { kind: 'hell', mark: '獄' },
      desc: '無限／自訂選地獄時啟用。詞綴會隨波次疊加，怪更厚、更密。',
      stats: [
        '<strong>克制</strong>：毒塔克制「回血」',
        '<strong>克制</strong>：火塔克制「厚皮」',
        '<strong>建議</strong>：先看清楚詞綴再調陣容',
      ],
    });
    for (var h = 0; h < HELL_DEFFS.length; h++) {
      var def = HELL_DEFFS[h];
      var detail = '';
      if (def.id === 'speed') detail = '<strong>數值</strong>：移速 +' + Math.round(def.full * 100) + '%';
      else if (def.id === 'lock') detail = '<strong>數值</strong>：隨機鎖塔 ' + def.full + ' 秒';
      else if (def.id === 'boss') detail = '<strong>效果</strong>：每波額外隨機出一支王';
      else if (def.id === 'split') detail = '<strong>數值</strong>：死後裂成兩隻，各帶 ' + Math.round(def.full * 100) + '% 血';
      else if (def.id === 'regen') detail = '<strong>數值</strong>：每秒回復 ' + Math.round(def.full * 100) + '% 血 · 毒克制';
      else if (def.id === 'enrage') detail = '<strong>觸發</strong>：血量 ≤10% 時加速 ' + Math.round(def.full * 100) + '%';
      else if (def.id === 'thick') detail = '<strong>數值</strong>：血量 +' + Math.round(def.full * 100) + '% · 火克制';
      appendInfoCard(list, {
        tag: '詞綴',
        title: def.name,
        cardClass: 'info-card--hell',
        paint: { kind: 'hell', mark: def.name.charAt(0) },
        desc: def.blurb,
        stats: [detail],
      });
    }
  }

  var indexTab = 'codex';
  var INDEX_NOTES = {
    codex: '先看清楚怪的特性與克制，再開戰。',
    towers: '各塔效果、分支與克制一覽。',
    hell: '地獄難度會疊加詞綴。毒克制回血，火克制厚皮。',
  };

  function showIndex(tab) {
    hideStoryScreens();
    indexTab = tab === 'towers' || tab === 'hell' ? tab : 'codex';
    if (indexTab === 'towers') renderTowerInfo();
    else if (indexTab === 'hell') renderHellInfo();
    else renderCodex();
    var tabs = document.querySelectorAll('.index-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('is-on', tabs[i].getAttribute('data-index') === indexTab);
    }
    var panels = document.querySelectorAll('.index-panel');
    for (var p = 0; p < panels.length; p++) {
      panels[p].hidden = panels[p].getAttribute('data-index-panel') !== indexTab;
    }
    var note = document.getElementById('index-note');
    if (note) note.textContent = INDEX_NOTES[indexTab];
    if (screenIndex) {
      screenIndex.hidden = false;
      screenIndex.scrollTop = 0;
    }
  }

  function openCodex() { showIndex('codex'); }
  function openHellInfo() { showIndex('hell'); }
  function openTowerInfo() { showIndex('towers'); }

  function togglePause() {
    dismissBuildMenu();
    if (state.phase === 'menu' || state.phase === 'gameover' || state.phase === 'victory') return;
    if (modal.classList.contains('is-open') && !state.userPaused) return;
    if (state.userPaused) {
      state.userPaused = false;
      state.paused = false;
      if (pauseBtn) pauseBtn.setAttribute('aria-pressed', 'false');
      closeModal();
      return;
    }
    state.userPaused = true;
    state.paused = true;
    if (pauseBtn) pauseBtn.setAttribute('aria-pressed', 'true');
    openModal({
      tone: 'reward',
      kicker: '暫停',
      title: '遊戲暫停',
      desc: '戰鬥已暫停。可繼續，或返回選單（本局進度不保留）。',
      actions: [
        { label: '繼續遊戲', className: 'btn-mint', onClick: function () { togglePause(); } },
        { label: '返回選單', className: 'btn-ghost', onClick: function () { state.userPaused = false; if (pauseBtn) pauseBtn.setAttribute('aria-pressed', 'false'); closeModal(); showWelcome(); } },
      ],
    });
  }

  function focusHomeChapter(chapterId) {
    var chapter = chapterId || state.chapter || 1;
    var picked = null;
    if (state.level) {
      var current = stageById(state.level);
      if (current && current.chapter === chapter) picked = current;
    }
    if (!picked) {
      for (var s = 1; s <= 5; s++) {
        var node = stageById(chapter + '-' + s);
        if (node && stageUnlocked(node)) picked = node;
      }
    }
    if (!picked) picked = stageById(chapter + '-1');
    if (picked) homePick = { chapter: picked.chapter, index: picked.index };
  }

  function openChapters() {
    showMenu();
  }

  function openStages(chapterId) {
    focusHomeChapter(chapterId);
    showMenu();
  }

  function startRun(mode, levelIndex) {
    var level = mode === 'campaign' ? stageById(levelIndex) : null;
    state.mode = mode;
    state.level = level ? level.stageId : (levelIndex || 0);
    state.chapter = level ? level.chapter : 0;
    state.stagePlan = level;
    state.levelName = level ? level.name : '';
    state.chapterName = level ? chapterById(level.chapter).name : '';
    state.levelWaves = level ? level.waves.length : 0;
    state.hpScale = level && level.hpScale ? level.hpScale : 1;
    if (mode === 'infinite' || mode === 'custom') {
      if (state.difficulty !== 'hell') state.difficulty = 'normal';
    }
    var diff = runProfile();
    state.gold = level ? level.initialGold : (diff ? diff.purse : (mode === 'custom' ? 100 : START_GOLD));
    state.lives = diff ? diff.lives : START_LIVES;
    state.shownLives = state.lives;
    if (diff) state.best = loadBest(diff.id, mode);
    else if (mode === 'custom') state.best = loadBest('normal', 'custom');
    state.lifeLost = 0;
    state.built = {};
    state.soldAny = false;
    state.soldRun = 0;
    state.goalWarned = {};
    state.runStarMask = 0;
    state.wave = 0;
    state.phase = 'prep';
    state.paused = false;
    state.userPaused = false;
    state.speed = preferredSpeed();
    syncSpeedButton();
    if (pauseBtn) pauseBtn.setAttribute('aria-pressed', 'false');
    state.adBusy = false;
    state.towers = [];
    state.enemies = [];
    state.projectiles = [];
    state.particles = [];
    state.floaters = [];
    state.flashes = [];
    state.shocks = [];
    state.arcs = [];
    state.pendingSpawns = [];
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.selectedId = null;
    state.buildType = null;
    state.buildSite = null;
    state.sellArmed = false;
    state.tiles = { straight: 0, turn: 0 };
    state.editTool = null;
    state.editCountdown = 0;
    state.outcome = '';
    state.tileGainText = '';
    state.reviveUsed = false;
    state.waveGoldEarned = 0;
    state.waveDoubled = false;
    state.waveGiftDone = false;
    state.pendingCard = null;
    state.pendingChoices = null;
    state.cardRerolled = false;
    state.banner = null;
    state.hellDeffs = [];
    state.hellDeffHalf = false;
    state.hellDeffWave = 0;
    state.kitSummonCd = 7;
    state.kitFrostCd = 6;
    state.kitMendCd = 2;
    if (mode === 'campaign' && level && level.goals) {
      var goalBits = [];
      for (var gi = 0; gi < level.goals.length; gi++) goalBits.push(goalLabel(level.goals[gi]));
      var runKit = chapterKitById(level.chapter);
      state.banner = { text: level.stageId + ' ' + level.name, sub: (runKit ? runKit.name + ' · ' : '') + goalBits.join(' · '), life: 3.6 };
      if (runKit) toast('本章 · ' + runKit.name + '：' + runKit.blurb);
    }
    state.rangePing = null;
    state.shake = 0;
    state.hurt = 0;
    state.clearCountdown = 0;
    state.clearKind = '';
    state.lastPathSig = '';
    state.hellDeffs = [];
    state.hellDeffHalf = false;
    state.hellDeffWave = 0;
    state.hellLockCd = 0;
    state.hellWheel = null;
    clearRunExtras();
    if (mode === 'campaign') setRoute(chain(level.path));
    else if (mode === 'custom') setRoute(straightColumn(4));
    else setRoute(buildRandomInfinitePath());
    hideStoryScreens();
    closeModal();
    renderInspector();
    syncHud();
    syncRouteBar();
    requestAnimationFrame(resize);
    if (hellModeActive()) {
      openHellWheel({
        count: 1,
        half: true,
        wave: 1,
        onDone: function (picks) {
          state.hellDeffs = picks;
          state.hellDeffHalf = true;
          state.hellDeffWave = 1;
          state.hellLockCd = 1.2;
          toast('地獄詞綴 · ' + hellDeffLabel());
          syncHud();
        },
      });
    }
    Bgm.sync();
  }

  function resetGame() {
    state.gold = START_GOLD;
    state.lives = START_LIVES;
    state.shownLives = START_LIVES;
    state.wave = 0;
    state.phase = 'prep';
    state.paused = false;
    state.adBusy = false;
    state.towers = [];
    state.enemies = [];
    state.projectiles = [];
    state.particles = [];
    state.floaters = [];
    state.flashes = [];
    state.shocks = [];
    state.arcs = [];
    state.pendingSpawns = [];
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.selectedId = null;
    state.buildType = null;
    state.buildSite = null;
    state.sellArmed = false;
    state.reviveUsed = false;
    state.waveGoldEarned = 0;
    state.waveDoubled = false;
    state.banner = null;
    state.rangePing = null;
    state.shake = 0;
    state.hurt = 0;
    state.clearCountdown = 0;
    state.clearKind = '';
    state.editCountdown = 0;
    state.editTool = null;
    state.pendingChoices = null;
    clearRunExtras();
    closeModal();
    renderInspector();
    syncHud();
    syncRouteBar();
  }

  function placeChosen(type) {
    var site = state.buildSite;
    if (!site) return;
    if (state.phase !== 'prep' && state.phase !== 'combat' && state.phase !== 'edit' && !countdownBuildOpen()) return;
    if (isPath(site.c, site.r) || towerAt(site.c, site.r)) {
      state.buildSite = null;
      return;
    }
    var def = TOWERS[type];
    if (!def) return;
    if (type === 'smith' && hasBlacksmith()) {
      toast('已經有鐵匠了');
      Sfx.bad();
      return;
    }
    if (state.gold < def.cost) {
      flashCell(site.c, site.r, false);
      toast('金幣不足');
      Sfx.bad();
      vibrate([12, 30, 12]);
      return;
    }
    state.gold -= def.cost;
    state.towers.push({
      id: state.nextId++,
      type: type,
      c: site.c,
      r: site.r,
      level: 0,
      cooldown: 0.15,
      aim: -Math.PI / 2,
      flash: 0,
      chill: 0,
      spec: null,
      invested: def.cost,
    });
    noteBuilt(type);
    flashCell(site.c, site.r, true);
    state.rangePing = { c: site.c, r: site.r, range: def.levels[0].range, color: def.color, t: 0.9 };
    burst(site.c + 0.5, site.r + 0.5, def.color, 8);
    state.buildSite = null;
    Sfx.build();
    vibrate(15);
    syncHud();
  }

  function toggleBuildSite(c, r) {
    if (state.buildSite && state.buildSite.c === c && state.buildSite.r === r) {
      state.buildSite = null;
      state.buildMenu = 'root';
    } else {
      state.buildSite = { c: c, r: r };
      state.buildMenu = 'root';
      state.selectedId = null;
      state.sellArmed = false;
    }
    Sfx.ui();
    renderInspector();
  }

  function flashCell(c, r, ok) {
    state.flashes.push({ c: c, r: r, ok: ok, life: 0.32 });
  }

  function selectTower(tower) {
    state.buildType = null;
    state.buildSite = null;
    state.selectedId = tower.id;
    state.sellArmed = false;
    renderInspector();
    syncHud();
  }

  function clearSelection() {
    state.buildType = null;
    state.buildSite = null;
    state.buildMenu = 'root';
    state.selectedId = null;
    state.sellArmed = false;
    renderInspector();
    syncHud();
  }

  function payUpgrade(tower) {
    var cost = nextUpgradeCost(tower);
    if (towerMaxed(tower)) return false;
    if (state.gold < cost) {
      toast('金幣不足');
      Sfx.bad();
      return false;
    }
    state.gold -= cost;
    tower.invested += cost;
    return true;
  }

  function upgradeSelected() {
    var tower = selectedTower();
    if (!tower || tower.type === 'hero' || towerMaxed(tower) || needsSpec(tower)) return;
    if (!payUpgrade(tower)) return;
    tower.level += 1;
    state.sellArmed = false;
    Sfx.build();
    vibrate(12);
    renderInspector();
    syncHud();
  }

  function specialize(specId) {
    var tower = selectedTower();
    if (!tower || !needsSpec(tower)) return;
    var spec = TOWERS[tower.type].specs[specId];
    if (!spec) return;
    if (state.freeSpec) state.freeSpec = false;
    else if (!payUpgrade(tower)) return;
    tower.spec = specId;
    tower.level = 2;
    state.sellArmed = false;
    Sfx.build();
    vibrate(12);
    toast(spec.name + ' · ' + spec.blurb);
    renderInspector();
    syncHud();
    if (state.pickMode === 'level') finishCard();
  }

  function sellSelected() {
    var tower = selectedTower();
    if (!tower) return;
    var refund = Math.floor(tower.invested * sellRatio());
    if (state.sellArmed !== tower.id) {
      state.sellArmed = tower.id;
      renderInspector();
      return;
    }
    state.gold += refund;
    state.soldAny = true;
    state.soldRun = (state.soldRun || 0) + 1;
    var beforeSell = unlockedTitleIds();
    var sellDeeds = loadDeeds();
    sellDeeds.sells = (sellDeeds.sells || 0) + 1;
    if (state.soldRun >= 6) sellDeeds.wreck = true;
    saveDeeds(sellDeeds);
    noteNewTitles(beforeSell);
    state.towers = state.towers.filter(function (item) { return item.id !== tower.id; });
    state.selectedId = null;
    state.sellArmed = false;
    Sfx.sell();
    toast('出售獲得 ' + refund + ' 金幣');
    if (state.mode === 'campaign' && state.stagePlan && state.stagePlan.goals) {
      for (var soldGoal = 0; soldGoal < state.stagePlan.goals.length; soldGoal++) {
        if (state.stagePlan.goals[soldGoal].kind === 'nosell') noteGoalFail('nosell', '賣了塔，這顆星沒了');
      }
    }
    renderInspector();
    syncHud();
  }

  function appendSellRow(refund) {
    var row = document.createElement('div');
    row.className = 'sell-row';
    if (state.sellArmed === (selectedTower() && selectedTower().id)) {
      row.appendChild(makeActButton('取消', 'btn-ghost', 'sell-cancel'));
      var confirm = makeActButton('確認出售 +' + refund, 'btn-sell-confirm', 'sell');
      row.appendChild(confirm);
    } else {
      var sell = makeActButton('出售 +' + refund, 'btn-sell', 'sell');
      row.appendChild(sell);
    }
    inspectActions.appendChild(row);
  }

  function placeInspector() {
    if (!inspector.classList.contains('is-open')) return;
    var tower = selectedTower();
    if (!tower || !view.tile) return;
    var hx = tower.c + 0.5;
    var hy = tower.r + 0.5;
    if (tower.hero === 'sword' && tower.fx != null) {
      hx = tower.fx;
      hy = tower.fy;
    }
    var cardW = Math.min(210, Math.max(168, view.w - 16));
    inspector.style.width = cardW + 'px';
    inspector.style.right = 'auto';
    inspector.style.bottom = 'auto';
    var cardH = inspector.offsetHeight || 92;
    var cx = view.originX + hx * view.tile;
    var top = view.originY + (hy - 0.5) * view.tile;
    var bottom = top + view.tile;
    var x = Math.max(8, Math.min(view.w - cardW - 8, cx - cardW / 2));
    var y = top - cardH - 8;
    if (y < 8) y = bottom + 8;
    if (y + cardH > view.h - 8) y = Math.max(8, view.h - cardH - 8);
    inspector.style.left = Math.round(x) + 'px';
    inspector.style.top = Math.round(y) + 'px';
  }

  function renderInspector() {
    var tower = selectedTower();
    if (!tower) {
      inspector.classList.remove('is-open');
      inspectActions.replaceChildren();
      return;
    }
    inspector.classList.add('is-open');
    inspectActions.replaceChildren();
    if (tower.type === 'smith') {
      inspectTitle.textContent = '鐵匠';
      inspectMeta.textContent = '不攻擊。在場時，其他塔可以用金幣升到 10 等。賣走之後就不能再往上升。';
      appendSellRow(Math.floor(tower.invested * sellRatio()));
      placeInspector();
      return;
    }
    if (tower.type === 'hero') {
      inspectTitle.textContent = heroName(tower.hero) + '  Lv.' + (tower.level + 1);
      inspectMeta.textContent = heroBlurb(tower);
      var skillName = heroSkillName(tower.hero);
      if (skillName) {
        var cd = tower.skillCd || 0;
        var skillLabel = state.pickMode === 'fog' && state.fogHeroId === tower.id
          ? '點地圖施放'
          : (cd > 0 ? skillName + ' ' + Math.ceil(cd) + '秒' : skillName);
        var skill = makeActButton(skillLabel, 'btn-mint btn-primary-act', 'skill');
        skill.disabled = cd > 0 || state.phase !== 'combat';
        inspectActions.appendChild(skill);
      }
      appendSellRow(Math.floor(tower.invested * sellRatio()));
      placeInspector();
      return;
    }
    var stats = towerStats(tower);
    var refund = Math.floor(tower.invested * sellRatio());
    var maxed = towerMaxed(tower);
    inspectTitle.textContent = towerLabel(tower) + '  Lv.' + (tower.level + 1);
    inspectMeta.textContent = needsSpec(tower) ? specChoiceText(tower) : statLine(stats, tower);
    if (maxed && !hasBlacksmith() && tower.level < 9) inspectMeta.textContent += ' 金幣升滿了。造一隻鐵匠後可升到 10 等。';
    if (needsSpec(tower)) {
      var row = document.createElement('div');
      row.className = 'spec-row';
      var ids = Object.keys(TOWERS[tower.type].specs);
      for (var s = 0; s < ids.length; s++) {
        var spec = TOWERS[tower.type].specs[ids[s]];
        var specBtn = makeActButton(state.freeSpec ? spec.name + ' 免費' : spec.name + ' ' + nextUpgradeCost(tower), 'btn spec-' + ids[s], 'spec');
        specBtn.dataset.spec = ids[s];
        specBtn.disabled = !state.freeSpec && state.gold < nextUpgradeCost(tower);
        row.appendChild(specBtn);
      }
      inspectActions.appendChild(row);
    } else {
      var capped = tower.level >= goldLevelCap();
      var upgrade = makeActButton(capped ? '已滿級' : ('升級 ' + nextUpgradeCost(tower)), 'btn-mint btn-primary-act', 'upgrade');
      upgrade.disabled = capped || state.gold < nextUpgradeCost(tower);
      inspectActions.appendChild(upgrade);
    }
    appendSellRow(refund);
    placeInspector();
  }

  function statLine(stats, tower) {
    var bits = [
      '傷害 ' + stats.damage,
      '射程 ' + fmt(stats.range),
      '攻速 ' + fmt(1 / stats.cooldown) + '/秒',
    ];
    if (stats.chain) bits.push('串連 ' + stats.chain);
    if (stats.splash && stats.effect !== 'slow') bits.push('範圍 ' + fmt(stats.splash));
    if (stats.shots) bits.push('彈數 ' + Math.min(3, stats.shots));
    if (stats.targets > 1) bits.push('目標 ' + stats.targets);
    if (tower && tower.level >= 5) bits.push('滿等×1.4');
    if (tower && tower.level > 5) bits.push('鐵匠再強化');
    if (stats.effect === 'slow') bits.push('緩速 ' + Math.round(stats.slow * 100) + '%', '3次凍結');
    if (stats.effect === 'burn') bits.push('灼燒 ' + Math.round(stats.burn / stats.burnEvery) + '/秒', '破盾／破甲／厚皮+10%血', '傳染3秒');
    if (stats.effect === 'poison') bits.push('中毒 ' + Math.round(stats.poison / stats.poisonEvery) + '/秒', '克制再生／治療／回血', '傳染3秒');
    if (stats.goldGen) bits = ['產金 ' + stats.goldGen + '/次', '間隔 ' + fmt(stats.cooldown) + '秒', '不攻擊'];
    return bits.join(' · ');
  }

  function specChoiceText(tower) {
    return '升到 3 等選擇特化。箭塔：高傷高攻速，滿等可同時打兩隻。砲塔：擴散範圍傷，一次最多 3 發，中心最高、外圍遞減，擴散傷害不疊加。';
  }

  function makeActButton(label, className, act) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn ' + className;
    btn.dataset.act = act;
    var span = document.createElement('span');
    span.textContent = label;
    btn.appendChild(span);
    return btn;
  }

  function formatGold(amount) {
    var n = Math.floor(Number(amount) || 0);
    if (n < 1000) return String(n);
    return (n / 1000).toFixed(2) + 'K';
  }

  function syncHud() {
    hudLives.textContent = String(state.lives);
    hudGold.textContent = formatGold(state.gold);
    statLife.classList.toggle('is-low', state.lives > 0 && state.lives <= 6);
    if (state.lives < state.shownLives) {
      statLife.classList.remove('is-hurt');
      void statLife.offsetWidth;
      statLife.classList.add('is-hurt');
    }
    state.shownLives = state.lives;
    if (state.mode === 'campaign') {
      hudWave.textContent = String(state.level || '');
      var campKit = campaignKit();
      var campDeff = campKit && campKit.id === 'wheel' ? hellDeffLabel() : '';
      var bossNow = state.phase === 'combat' ? bossForWave(state.wave) : null;
      var eliteNow = null;
      if (!bossNow && state.phase === 'combat' && state.stagePlan && state.stagePlan.waves[state.wave - 1] && state.stagePlan.waves[state.wave - 1].elite) {
        eliteNow = chapterEliteDef();
      }
      hudWaveSub.textContent = bossNow
        ? '王 · ' + bossNow.name
        : (eliteNow
          ? '小王 · ' + eliteNow.name
          : (campDeff
          ? campDeff
          : (state.wave === 0
            ? ((campKit ? campKit.name + ' · ' : '') + (state.levelName || ''))
            : ((campKit && campKit.id !== 'wheel' ? campKit.name + ' · ' : '') + '第 ' + state.wave + '/' + state.levelWaves + ' 波'))));
    } else if (state.mode === 'custom') {
      var customName = state.difficulty === 'hell' ? '地獄' : '普通';
      hudWave.textContent = state.wave === 0 ? customName : '第 ' + state.wave + ' 波';
      var customDeff = hellDeffLabel();
      var customBoss = state.phase === 'combat' ? bossForWave(state.wave) : null;
      hudWaveSub.textContent = customDeff
        ? customDeff
        : (customBoss
          ? '王 · ' + customBoss.name
          : customName + ' · 直線 ' + state.tiles.straight + ' · 轉彎 ' + state.tiles.turn);
    } else if (state.wave === 0) {
      hudWave.textContent = state.mode === 'infinite' ? infiniteProfile().name : '準備';
      hudWaveSub.textContent = '點空地放塔';
    } else {
      hudWave.textContent = '第 ' + state.wave + ' 波';
      var infiniteDeff = hellDeffLabel();
      var infiniteBoss = state.phase === 'combat' ? bossForWave(state.wave) : null;
      hudWaveSub.textContent = infiniteDeff
        ? infiniteDeff
        : (infiniteBoss
          ? '王 · ' + infiniteBoss.name
          : (state.mode === 'infinite' ? infiniteProfile().name : (state.phase === 'combat' ? '入侵中' : '整補')));
    }
    var selected = selectedTower();
    var upgradeBtn = inspectActions.querySelector('[data-act="upgrade"]');
    if (upgradeBtn && selected) {
      upgradeBtn.disabled = towerMaxed(selected) || state.gold < nextUpgradeCost(selected);
    }
    if (selected && needsSpec(selected)) {
      var specBtns = inspectActions.querySelectorAll('[data-act="spec"]');
      var poor = !state.freeSpec && state.gold < nextUpgradeCost(selected);
      for (var b = 0; b < specBtns.length; b++) specBtns[b].disabled = poor;
    }
    var skillBtn = inspectActions.querySelector('[data-act="skill"]');
    if (skillBtn && selected && selected.type === 'hero') {
      var skillCd = selected.skillCd || 0;
      var skillName = heroSkillName(selected.hero);
      skillBtn.disabled = skillCd > 0 || state.phase !== 'combat';
      skillBtn.textContent = skillCd > 0 ? skillName + ' ' + Math.ceil(skillCd) + '秒' : skillName;
    }
    syncItems();
    if (state.phase === 'combat') {
      waveBtn.disabled = true;
      waveBtnLabel.textContent = '防守中';
      var left = state.spawnQueue.length;
      for (var n = 0; n < state.enemies.length; n++) if (!state.enemies[n].dead) left += 1;
      waveBtnSub.textContent = '剩餘 ' + left + ' · ' + waveClockLabel();
    } else if (state.phase === 'prep') {
      waveBtn.disabled = false;
      waveBtnLabel.textContent = state.mode === 'campaign'
        ? '開始第 1/' + state.levelWaves + ' 波'
        : '開始第 ' + (state.wave + 1) + ' 波';
      waveBtnSub.textContent = '準備就緒';
    } else if (state.phase === 'edit') {
      waveBtn.disabled = false;
      waveBtnLabel.textContent = '完成改道';
      waveBtnSub.textContent = state.editCountdown > 0
        ? Math.ceil(state.editCountdown) + ' 秒 · 接著第 ' + (state.wave + 1) + ' 波'
        : '接著第 ' + (state.wave + 1) + ' 波';
    } else if (state.clearCountdown > 0 && (state.phase === 'reward' || state.phase === 'victory')) {
      waveBtn.disabled = false;
      waveBtnLabel.textContent = '提前開始';
      waveBtnSub.textContent = Math.ceil(state.clearCountdown) + ' 秒（點我跳過）';
    } else {
      waveBtn.disabled = true;
      waveBtnLabel.textContent = state.phase === 'gameover' ? '防線崩潰' : (state.phase === 'victory' ? '關卡通過' : '下一波');
      waveBtnSub.textContent = state.phase === 'gameover' ? '本局結束' : '準備中';
    }
    if (state.pickMode === 'level' || state.pickMode === 'heroPlace') {
      waveBtn.disabled = true;
      waveBtnLabel.textContent = state.pickMode === 'level' ? '點一座塔' : '點空地放英雄';
      waveBtnSub.textContent = '完成後才會進下一波';
    }
  }

  function syncItems() {
    if (!itemBar) return;
    var wall = state.items ? state.items.wall : 0;
    var push = state.items ? state.items.push : 0;
    var show = (wall > 0 || push > 0) && (state.mode === 'infinite' || state.mode === 'custom');
    itemBar.classList.toggle('is-on', show);
    itemWallBtn.hidden = wall <= 0;
    itemPushBtn.hidden = push <= 0;
    itemWallCount.textContent = String(wall);
    itemPushCount.textContent = String(push);
  }

  function playRate() {
    if (state.paused || (state.phase !== 'combat' && state.phase !== 'prep')) return 1;
    return state.speed === 2 || state.speed === 4 ? state.speed : 1;
  }

  function syncSpeedButton() {
    var speed = state.speed === 2 || state.speed === 4 ? state.speed : 1;
    state.speed = speed;
    var label = speed === 1 ? '一倍速' : (speed === 2 ? '二倍速' : '四倍速');
    speedBtn.textContent = '×' + speed;
    speedBtn.setAttribute('aria-label', label);
  }

  function cycleSpeed() {
    dismissBuildMenu();
    state.speed = state.speed === 1 ? 2 : (state.speed === 2 ? 4 : 1);
    syncSpeedButton();
    Sfx.ui();
    toast(speedBtn.getAttribute('aria-label'));
  }

  function syncSoundButton() {
    if (soundBtn) {
      soundBtn.setAttribute('aria-pressed', Sfx.muted ? 'true' : 'false');
      soundBtn.setAttribute('aria-label', Sfx.muted ? '開啟音效' : '關閉音效');
    }
    if (bgmBtn) {
      bgmBtn.setAttribute('aria-pressed', Bgm.muted ? 'true' : 'false');
      bgmBtn.setAttribute('aria-label', Bgm.muted ? '開啟音樂' : '關閉音樂');
    }
  }

  function fitViewport() {
    var app = document.getElementById('app');
    if (!app) return;
    var vv = window.visualViewport;
    var narrow = window.innerWidth < 520;
    if (narrow && vv) {
      app.style.position = 'fixed';
      app.style.top = Math.round(vv.offsetTop) + 'px';
      app.style.left = '0';
      app.style.right = '0';
      app.style.width = '100%';
      app.style.height = Math.round(vv.height) + 'px';
      app.style.maxHeight = Math.round(vv.height) + 'px';
      app.classList.toggle('is-compact', vv.height < 760);
    } else {
      app.style.position = '';
      app.style.top = '';
      app.style.left = '';
      app.style.right = '';
      app.style.width = '';
      app.style.height = '';
      app.style.maxHeight = '';
      app.classList.remove('is-compact');
    }
    resize();
    placeInspector();
  }

  function goalBarPad() {
    var bar = document.getElementById('goal-bar');
    return bar && !bar.hidden ? 32 : 0;
  }

  function resize() {
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    if (w < 2 || h < 2) return;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    var nextW = Math.round(w * view.dpr);
    var nextH = Math.round(h * view.dpr);
    var pad = 8;
    var topPad = goalBarPad();
    var tile = Math.min((w - pad * 2) / COLS, (h - pad * 2 - topPad) / ROWS);
    var originX = (w - tile * COLS) / 2;
    var originY = topPad + Math.max(pad, (h - topPad - tile * ROWS) / 2);
    if (
      view.w === w && view.h === h &&
      canvas.width === nextW && canvas.height === nextH &&
      view.tile === tile && view.originX === originX && view.originY === originY
    ) return;
    view.w = w;
    view.h = h;
    view.tile = tile;
    view.originX = originX;
    view.originY = originY;
    canvas.width = nextW;
    canvas.height = nextH;
  }

  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.fillStyle = '#f4f1ea';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.save();
    if (state.shake > 0.25 && !reduceMotion) {
      ctx.translate((Math.random() - 0.5) * state.shake * 2, (Math.random() - 0.5) * state.shake * 2);
    }
    drawBoard();
    drawAltar();
    drawFogs();
    drawPriestAuras();
    drawRouteMarks();
    drawRouteHints();
    drawFlashes();
    drawRanges();
    drawTowers();
    drawEnemies();
    drawBeams();
    drawProjectiles();
    drawMeteors();
    drawSkyfalls();
    drawShocks();
    drawParticles();
    drawFloaters();
    ctx.restore();
    drawHurt();
    drawBanner();
    drawBuildMenu();
    paintGoalBar();
    if (inspector.classList.contains('is-open')) placeInspector();
    if (state.pickMode === 'level') drawHint('點一座塔，永久提升 1 等');
    else if (state.pickMode === 'heroPlace') drawHint('點空地放置' + heroName(state.pendingHero));
    else if (state.pickMode === 'fog') drawHint('點一處丟出致命毒霧');
    else if (state.pickMode === 'wall') drawHint('點道路放置阻擋物');
    else if (state.phase === 'edit' && !state.editTool && !state.buildSite) {
      drawHint('選擇直線或轉彎，再點亮起的空地');
    } else if (state.phase === 'prep' && state.towers.length === 0 && !state.buildSite && !state.banner) {
      drawHint(state.mode === 'custom'
        ? '直線開局。每 5 波拿 3 張路線圖'
        : (state.mode === 'campaign'
          ? (state.stagePlan && state.stagePlan.index === 5 ? '最後一波是本章首領' : '守住基地。受傷越少，星星越多')
          : '點空地放塔，每 10 波隨機獎勵'));
    }
  }

  function drawPriestAuras() {
    if (hasHeroId('god')) {
      ctx.save();
      ctx.strokeStyle = 'rgba(201, 162, 39, 0.7)';
      ctx.lineWidth = 3;
      ctx.strokeRect(worldX(0) + 3, worldY(0) + 3, COLS * view.tile - 6, ROWS * view.tile - 6);
      ctx.restore();
    }
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
      if (tower.type === 'hero' && tower.hero === 'herald') {
        ctx.beginPath();
        ctx.arc(worldX(tower.c + 0.5), worldY(tower.r + 0.5), HERALD_RADIUS * view.tile, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 214, 90, 0.14)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(201, 162, 39, 0.85)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (tower.type !== 'hero' || tower.hero !== 'priest') continue;
      var aura = priestAura(tower);
      var alpha = tower.buffTime > 0 ? 0.16 : 0.07;
      ctx.beginPath();
      ctx.arc(worldX(tower.c + 0.5), worldY(tower.r + 0.5), aura.radius * view.tile, 0, Math.PI * 2);
      ctx.fillStyle = tower.buffTime > 0 ? 'rgba(224, 35, 35, ' + alpha + ')' : 'rgba(201, 162, 39, ' + alpha + ')';
      ctx.fill();
    }
  }

  function drawRouteMarks() {
    var tile = view.tile;
    for (var i = 0; i < state.walls.length; i++) {
      var wall = state.walls[i];
      var x = worldX(wall.c);
      var y = worldY(wall.r);
      ctx.save();
      ctx.strokeStyle = '#161616';
      ctx.fillStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.fillRect(x + tile * 0.18, y + tile * 0.28, tile * 0.64, tile * 0.44);
      ctx.strokeRect(x + tile * 0.18, y + tile * 0.28, tile * 0.64, tile * 0.44);
      ctx.beginPath();
      ctx.moveTo(x + tile * 0.28, y + tile * 0.28);
      ctx.lineTo(x + tile * 0.28, y + tile * 0.12);
      ctx.moveTo(x + tile * 0.72, y + tile * 0.28);
      ctx.lineTo(x + tile * 0.72, y + tile * 0.12);
      ctx.stroke();
      ctx.restore();
    }
    for (var t = 0; t < state.traps.length; t++) {
      var trap = state.traps[t];
      var tx = worldX(trap.c + 0.5);
      var ty = worldY(trap.r + 0.5);
      ctx.save();
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, tile * 0.16, 0, Math.PI * 2);
      ctx.moveTo(tx - tile * 0.16, ty);
      ctx.lineTo(tx + tile * 0.16, ty);
      ctx.moveTo(tx, ty - tile * 0.16);
      ctx.lineTo(tx, ty + tile * 0.16);
      ctx.stroke();
      ctx.restore();
    }
    for (var g = 0; g < state.gusts.length; g++) {
      var gust = state.gusts[g];
      ctx.save();
      ctx.translate(worldX(gust.x), worldY(gust.y));
      ctx.rotate(state.time * 6);
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, gust.radius * tile * 0.55, 0.2, Math.PI * 1.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, gust.radius * tile * 0.28, Math.PI, Math.PI * 2.1);
      ctx.stroke();
      ctx.restore();
    }
  }

  function skillAuraOn(tower) {
    if (!tower || tower.type !== 'hero') return false;
    if (tower.hero === 'sword') return tower.buffTime > 0;
    if (tower.hero === 'priest') return tower.buffTime > 0;
    if (tower.hero === 'archer') return tower.auraTime > 0 || state.pickMode === 'fog' && state.fogHeroId === tower.id;
    if (tower.hero === 'mage') return !!(state.meteor && state.meteor.ownerId === tower.id);
    return false;
  }

  function drawPossess(tower, s) {
    var hero = tower.hero;
    var pulse = 1 + (reduceMotion ? 0 : Math.sin(state.time * 5 + tower.id) * 0.06);
    var stroke = hero === 'archer' ? '#1c7a34' : (hero === 'mage' ? '#c81e1e' : (hero === 'priest' ? '#c9a227' : '#ff2a2a'));
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2, s * 0.12);
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.15 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  var inkSeed = 1;

  function inkSetup(width) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = width || 2.4;
  }

  function inkNoise(i) {
    var n = Math.sin(inkSeed * 12.9898 + i * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function inkJitter(i, amp) {
    return (inkNoise(i) - 0.5) * 2 * (amp || 1);
  }

  function inkStroke() {
    var lw = ctx.lineWidth;
    var alpha = ctx.globalAlpha;
    ctx.save();
    ctx.globalAlpha = alpha * 0.22;
    ctx.lineWidth = lw * 1.55;
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = lw * (0.92 + inkNoise(3) * 0.16);
    ctx.stroke();
    ctx.lineWidth = lw;
  }

  function inkCircle(cx, cy, r, steps) {
    steps = steps || 18;
    ctx.beginPath();
    for (var i = 0; i <= steps; i++) {
      var a = (i / steps) * Math.PI * 2;
      var wobble = 1 + inkJitter(i + 1, 0.045);
      var x = cx + Math.cos(a) * r * wobble;
      var y = cy + Math.sin(a) * r * wobble;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function inkRect(x, y, w, h) {
    var j = Math.max(0.6, Math.min(w, h) * 0.04);
    ctx.beginPath();
    ctx.moveTo(x + inkJitter(1, j), y + inkJitter(2, j));
    ctx.lineTo(x + w + inkJitter(3, j), y + inkJitter(4, j));
    ctx.lineTo(x + w + inkJitter(5, j), y + h + inkJitter(6, j));
    ctx.lineTo(x + inkJitter(7, j), y + h + inkJitter(8, j));
    ctx.closePath();
  }

  function inkLine(x1, y1, x2, y2, segs) {
    segs = segs || 4;
    ctx.beginPath();
    ctx.moveTo(x1 + inkJitter(1, 0.35), y1 + inkJitter(2, 0.35));
    for (var i = 1; i < segs; i++) {
      var t = i / segs;
      var amp = 0.55;
      ctx.lineTo(
        x1 + (x2 - x1) * t + inkJitter(i * 3, amp),
        y1 + (y2 - y1) * t + inkJitter(i * 3 + 1, amp)
      );
    }
    ctx.lineTo(x2 + inkJitter(20, 0.35), y2 + inkJitter(21, 0.35));
  }

  function drawGlyphPlate(shape, s) {
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#161616';
    if (shape === 'circle') {
      inkCircle(0, 0, s);
      ctx.fill();
      inkStroke();
    } else {
      inkRect(-s, -s, s * 2, s * 2);
      ctx.fill();
      inkStroke();
    }
  }

  function markDroplet(s) {
    ctx.beginPath();
    ctx.moveTo(inkJitter(1, 0.3), -s + inkJitter(2, 0.3));
    ctx.quadraticCurveTo(s * 0.85 + inkJitter(3, 0.4), -s * 0.15, inkJitter(4, 0.3), s);
    ctx.quadraticCurveTo(-s * 0.85 + inkJitter(5, 0.4), -s * 0.15, inkJitter(6, 0.3), -s);
    ctx.closePath();
  }

  function markFlame(s) {
    ctx.beginPath();
    ctx.moveTo(inkJitter(1, 0.3), s);
    ctx.quadraticCurveTo(s * 0.95, s * 0.15, s * 0.35 + inkJitter(2, 0.4), -s * 0.35);
    ctx.quadraticCurveTo(s * 0.12, -s * 0.78, inkJitter(3, 0.3), -s);
    ctx.quadraticCurveTo(-s * 0.12, -s * 0.78, -s * 0.35 + inkJitter(4, 0.4), -s * 0.35);
    ctx.quadraticCurveTo(-s * 0.95, s * 0.15, inkJitter(5, 0.3), s);
    ctx.closePath();
  }

  function markSnowflake(s) {
    for (var i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((Math.PI / 3) * i + inkJitter(i, 0.04));
      inkLine(0, -s, 0, s, 3);
      inkStroke();
      inkLine(-s * 0.28, -s * 0.55, 0, -s * 0.35, 2);
      ctx.lineTo(s * 0.28, -s * 0.55);
      inkStroke();
      inkLine(-s * 0.28, s * 0.55, 0, s * 0.35, 2);
      ctx.lineTo(s * 0.28, s * 0.55);
      inkStroke();
      ctx.restore();
    }
  }

  function markBolt(s) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.15 + inkJitter(1, 0.4), -s);
    ctx.lineTo(s * 0.35 + inkJitter(2, 0.4), -s * 0.08);
    ctx.lineTo(s * 0.02, -s * 0.08 + inkJitter(3, 0.3));
    ctx.lineTo(s * 0.2 + inkJitter(4, 0.4), s);
    ctx.lineTo(-s * 0.35, s * 0.05 + inkJitter(5, 0.3));
    ctx.lineTo(-s * 0.02 + inkJitter(6, 0.3), s * 0.05);
    ctx.closePath();
  }

  function markArrow(s) {
    inkLine(-s * 0.55, 0, s * 0.2, 0, 3);
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.05 + inkJitter(1, 0.3), -s * 0.38);
    ctx.lineTo(s * 0.7, inkJitter(2, 0.25));
    ctx.lineTo(s * 0.05 + inkJitter(3, 0.3), s * 0.38);
    inkStroke();
  }

  function markCannon(s) {
    inkCircle(0, s * 0.12, s * 0.32, 14);
    ctx.fill();
    inkStroke();
    var prev = ctx.lineWidth;
    ctx.lineWidth = Math.max(3, s * 0.28);
    inkLine(s * 0.1, 0, s * 0.85, -s * 0.18, 3);
    inkStroke();
    ctx.lineWidth = prev;
  }

  function drawTowerGlyph(type, s, aim) {
    inkSeed = (type || 'x').length * 17 + (type ? type.charCodeAt(0) : 1) * 13 + Math.round((s || 1) * 10);
    inkSetup(Math.max(2.2, s * 0.13));
    if (type === 'arrow' || type === 'bolt' || type === 'basic') {
      drawGlyphPlate('circle', s);
      ctx.save();
      ctx.rotate(aim || 0);
      if (type === 'bolt') {
        ctx.fillStyle = '#ffe14a';
        markBolt(s * 0.62);
        ctx.fill();
        inkStroke();
      } else {
        markArrow(s * 0.72);
      }
      ctx.restore();
    } else if (type === 'mint') {
      ctx.fillStyle = '#f2c14e';
      inkCircle(0, 0, s * 0.92);
      ctx.fill();
      inkStroke();
      inkCircle(0, 0, s * 0.62, 14);
      inkStroke();
      ctx.fillStyle = '#161616';
      ctx.font = '800 ' + Math.max(10, Math.round(s * 0.95)) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', inkJitter(9, 0.4), 1 + inkJitter(10, 0.3));
    } else if (type === 'smith') {
      drawGlyphPlate('square', s);
      ctx.fillStyle = '#5d4037';
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, s * 0.28);
      ctx.lineTo(s * 0.42, s * 0.28);
      ctx.lineTo(s * 0.34, s * 0.08);
      ctx.lineTo(-s * 0.34, s * 0.08);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      ctx.fillStyle = '#161616';
      ctx.fillRect(-s * 0.1, -s * 0.42, s * 0.2, s * 0.5);
      ctx.beginPath();
      ctx.moveTo(-s * 0.34, -s * 0.18);
      ctx.lineTo(s * 0.34, -s * 0.18);
      ctx.lineTo(s * 0.22, -s * 0.42);
      ctx.lineTo(-s * 0.22, -s * 0.42);
      ctx.closePath();
      ctx.fill();
      inkStroke();
    } else {
      drawGlyphPlate('square', s);
      if (type === 'poison') {
        ctx.fillStyle = '#3cbf4a';
        markDroplet(s * 0.55);
        ctx.fill();
        inkStroke();
      } else if (type === 'fire') {
        ctx.fillStyle = '#e02323';
        markFlame(s * 0.55);
        ctx.fill();
        inkStroke();
      } else if (type === 'ice') {
        ctx.strokeStyle = '#2f7bff';
        ctx.lineWidth = Math.max(2.4, s * 0.14);
        markSnowflake(s * 0.55);
        ctx.strokeStyle = '#161616';
        ctx.lineWidth = Math.max(2.2, s * 0.12);
      } else if (type === 'cannon') {
        ctx.fillStyle = '#161616';
        markCannon(s);
      } else {
        inkCircle(0, 0, s * 0.36, 14);
        inkStroke();
      }
    }
  }

  function drawHeroGlyph(hero, s) {
    inkSeed = (hero || 'h').charCodeAt(0) * 19 + Math.round(s * 8);
    inkSetup(Math.max(2.2, s * 0.12));
    drawGlyphPlate('circle', s);
    ctx.strokeStyle = '#161616';
    ctx.fillStyle = '#161616';
    if (hero === 'sword') {
      inkLine(0, s * 0.72, 0, -s * 0.55, 4);
      inkStroke();
      inkLine(-s * 0.32, -s * 0.18, s * 0.32, -s * 0.18, 3);
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.16, -s * 0.55);
      ctx.lineTo(inkJitter(1, 0.3), -s * 0.78);
      ctx.lineTo(s * 0.16, -s * 0.55);
      inkStroke();
    } else if (hero === 'archer') {
      ctx.beginPath();
      ctx.arc(s * 0.08, 0, s * 0.55, -1.2, 1.2);
      inkStroke();
      inkLine(s * 0.08, -s * 0.52, -s * 0.35, 0, 3);
      ctx.lineTo(s * 0.08, s * 0.52);
      inkStroke();
      inkLine(-s * 0.35, 0, s * 0.72, 0, 3);
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.42, -s * 0.18);
      ctx.lineTo(s * 0.78, 0);
      ctx.lineTo(s * 0.42, s * 0.18);
      inkStroke();
    } else if (hero === 'mage') {
      inkLine(0, s * 0.55, 0, -s * 0.15, 3);
      inkStroke();
      inkLine(-s * 0.28, -s * 0.05, s * 0.28, -s * 0.05, 3);
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(inkJitter(1, 0.3), -s * 0.78);
      ctx.lineTo(s * 0.28, -s * 0.32);
      ctx.lineTo(0, -s * 0.42);
      ctx.lineTo(-s * 0.28, -s * 0.32);
      ctx.closePath();
      ctx.fill();
    } else if (hero === 'god') {
      inkCircle(0, 0, s * 0.28, 12);
      inkStroke();
      inkCircle(0, 0, s * 0.55, 16);
      inkStroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.72, -1.15, -0.15);
      inkStroke();
    } else if (hero === 'herald') {
      inkCircle(0, -s * 0.22, s * 0.24, 12);
      inkStroke();
      inkLine(-s * 0.5, -s * 0.22, s * 0.5, -s * 0.22, 2);
      inkStroke();
      inkLine(0, s * 0.05, 0, s * 0.62, 3);
      inkStroke();
    } else {
      inkCircle(0, -s * 0.55, s * 0.22, 12);
      inkStroke();
      inkLine(0, -s * 0.2, 0, s * 0.55, 3);
      inkStroke();
      inkLine(-s * 0.32, s * 0.05, s * 0.32, s * 0.05, 3);
      inkStroke();
    }
  }

  function drawBladeWave(scale, alpha) {
    var r = view.tile * 0.85 * scale;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = Math.max(5, view.tile * 0.1);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, r, -1.05, 1.05);
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(2.2, view.tile * 0.045);
    ctx.beginPath();
    ctx.arc(0, 0, r, -1.05, 1.05);
    ctx.stroke();
    ctx.restore();
  }

  function drawSlash(shot) {
    var x = worldX(shot.x);
    var y = worldY(shot.y);
    ctx.save();
    ctx.translate(x, y);
    if (shot.crescent) {
      ctx.rotate((shot.angle || 0) + (shot.spin || 0));
      ctx.strokeStyle = '#161616';
      ctx.fillStyle = '#ff4d4d';
      ctx.lineWidth = Math.max(2.2, view.tile * 0.045);
      ctx.beginPath();
      ctx.arc(0, 0, view.tile * 0.22, 0.4, Math.PI - 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, view.tile * 0.12, 0.55, Math.PI - 0.55, true);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.rotate(shot.angle);
      ctx.translate(-view.tile * 0.34, 0);
      drawBladeWave(0.62, 0.4);
      ctx.translate(view.tile * 0.34, 0);
      drawBladeWave(1, 1);
    }
    ctx.restore();
  }

  function drawKillSlash(shot) {
    var p = shot.maxLife ? shot.life / shot.maxLife : 0;
    ctx.save();
    ctx.translate(worldX(shot.x), worldY(shot.y));
    ctx.globalAlpha = Math.min(1, p * 1.4);
    ctx.strokeStyle = '#ff2a2a';
    ctx.lineWidth = Math.max(3, view.tile * 0.07);
    ctx.beginPath();
    ctx.arc(0, 0, view.tile * (0.2 + (1 - p) * 0.45), -0.9, 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, view.tile * (0.12 + (1 - p) * 0.28), Math.PI - 0.7, Math.PI + 0.7);
    ctx.stroke();
    ctx.restore();
  }

  function drawCut(shot) {
    var p = shot.maxLife ? shot.life / shot.maxLife : 0;
    ctx.save();
    ctx.translate(worldX(shot.x), worldY(shot.y));
    ctx.rotate(shot.angle - 1.05 + (1 - p) * 1.7);
    ctx.globalAlpha = Math.min(1, p * 1.5);
    if (shot.wide) ctx.globalAlpha = Math.min(1, p * 1.6);
    drawBladeWave(shot.wide ? 1.15 : 0.78, 1);
    if (shot.wide) {
      ctx.strokeStyle = '#ff2a2a';
      ctx.lineWidth = Math.max(3, view.tile * 0.07);
      ctx.beginPath();
      ctx.arc(0, 0, view.tile * 0.7, -1.05, 1.05);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRouteHints() {
    if (state.phase !== 'edit' || !state.editTool) return;
    var marks = routeMarks();
    for (var i = 0; i < marks.length; i++) {
      ctx.fillStyle = marks[i].kind === 'undo' ? 'rgba(242, 193, 78, 0.28)' : 'rgba(125, 206, 160, 0.28)';
      ctx.fillRect(worldX(marks[i].c) + 3, worldY(marks[i].r) + 3, view.tile - 6, view.tile - 6);
    }
  }

  function drawBoard() {
    var tile = view.tile;
    ctx.fillStyle = '#f7f4ee';
    ctx.fillRect(worldX(0), worldY(0), tile * COLS, tile * ROWS);
    ctx.strokeStyle = 'rgba(20, 20, 20, 0.16)';
    ctx.lineWidth = 1;
    var r;
    var c;
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) {
        ctx.strokeRect(worldX(c) + 0.5, worldY(r) + 0.5, tile - 1, tile - 1);
      }
    }
    ctx.fillStyle = '#fff';
    for (var i = 0; i < route.cells.length; i++) {
      var cell = route.cells[i];
      ctx.fillRect(worldX(cell.c) - 0.5, worldY(cell.r) - 0.5, tile + 1, tile + 1);
    }
    ctx.beginPath();
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = 4;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';
    for (var n = 0; n < route.cells.length; n++) {
      var spot = route.cells[n];
      var x = worldX(spot.c);
      var y = worldY(spot.r);
      if (!isPath(spot.c + 1, spot.r)) {
        ctx.moveTo(x + tile, y);
        ctx.lineTo(x + tile, y + tile);
      }
      if (!isPath(spot.c - 1, spot.r)) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + tile);
      }
      if (!isPath(spot.c, spot.r - 1)) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + tile, y);
      }
      if (!isPath(spot.c, spot.r + 1)) {
        ctx.moveTo(x, y + tile);
        ctx.lineTo(x + tile, y + tile);
      }
    }
    ctx.stroke();
    if (!route.cells.length) return;
    ctx.strokeStyle = '#161616';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    var start = route.cells[0];
    var end = route.cells[route.cells.length - 1];
    ctx.beginPath();
    ctx.arc(worldX(start.c + 0.5), worldY(start.r + 0.5), tile * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (route.cells.length > 1) {
      var next = route.cells[1];
      var ang = Math.atan2(next.r - start.r, next.c - start.c);
      ctx.save();
      ctx.translate(worldX(next.c + 0.5), worldY(next.r + 0.5));
      ctx.rotate(ang);
      var s = tile * 0.16;
      ctx.beginPath();
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.75, s * 0.55);
      ctx.moveTo(s, 0);
      ctx.lineTo(-s * 0.75, -s * 0.55);
      ctx.stroke();
      ctx.restore();
    }
    var ex = worldX(end.c + 0.5);
    var ey = worldY(end.r + 0.5);
    ctx.strokeRect(ex - tile * 0.22, ey - tile * 0.22, tile * 0.44, tile * 0.44);
    ctx.fillStyle = '#161616';
    ctx.font = '700 ' + Math.max(11, Math.round(tile * 0.26)) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.max(0, state.lives)), ex, ey + 0.5);
  }

  function traceRoad() {
    ctx.beginPath();
    for (var i = 0; i < WAYPOINTS.length; i++) {
      var x = worldX(WAYPOINTS[i].x);
      var y = worldY(WAYPOINTS[i].y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  }

  function drawRoad() {
    var tile = view.tile;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#6a5844';
    ctx.lineWidth = tile * 0.7;
    traceRoad();
    ctx.stroke();
    ctx.strokeStyle = '#3e342b';
    ctx.lineWidth = tile * 0.48;
    traceRoad();
    ctx.stroke();
    var max = WAYPOINTS.length - 1;
    var offset = reduceMotion ? 0.2 : (state.time * 0.9) % 0.8;
    ctx.fillStyle = 'rgba(236, 214, 170, 0.8)';
    for (var d = offset; d < max - 0.2; d += 0.8) {
      var a = pointAt(d);
      var b = pointAt(d + 0.08);
      ctx.save();
      ctx.translate(worldX(a.x), worldY(a.y));
      ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
      ctx.beginPath();
      ctx.moveTo(tile * 0.11, 0);
      ctx.lineTo(-tile * 0.06, tile * 0.065);
      ctx.lineTo(-tile * 0.06, -tile * 0.065);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function buildMenuTypes() {
    var types = ['basic', 'poison', 'fire', 'ice', 'bolt', 'mint'];
    if (smithReady()) types.push('smith');
    return types;
  }

  function buildMenuLabel(type) {
    if (type === 'basic') return '無屬';
    if (type === 'poison') return '毒';
    if (type === 'fire') return '火';
    if (type === 'ice') return '冰';
    if (type === 'bolt') return '雷';
    if (type === 'mint') return '錢';
    if (type === 'smith') return '鐵匠';
    return TOWERS[type] ? TOWERS[type].name : type;
  }

  function buildMenuLayout() {
    if (!state.buildSite) return null;
    var tile = view.tile;
    var gap = 6;
    var types = buildMenuTypes();
    var cols = 3;
    var rows = Math.ceil(types.length / cols);
    var btnW = Math.max(64, Math.min(88, tile * 1.45));
    var btnH = Math.max(72, Math.min(96, tile * 1.65));
    var panelW = btnW * cols + gap * (cols + 1);
    var panelH = btnH * rows + gap * (rows + 1) + 18;
    var cx = worldX(state.buildSite.c + 0.5);
    var cellTop = worldY(state.buildSite.r);
    var cellBottom = worldY(state.buildSite.r + 1);
    var x = cx - panelW / 2;
    var y = cellTop - panelH - 12;
    var below = false;
    if (y < 6) {
      y = cellBottom + 12;
      below = true;
    }
    x = Math.max(6, Math.min(view.w - panelW - 6, x));
    if (y + panelH > view.h - 6) {
      y = Math.max(6, cellTop - panelH - 12);
      below = false;
    }
    var buttons = [];
    for (var i = 0; i < types.length; i++) {
      var col = i % cols;
      var row = Math.floor(i / cols);
      var rowCount = Math.min(cols, types.length - row * cols);
      var rowOffset = (panelW - (rowCount * btnW + (rowCount + 1) * gap)) / 2;
      buttons.push({
        type: types[i],
        x: x + gap + rowOffset + col * (btnW + gap),
        y: y + gap + 16 + row * (btnH + gap),
        w: btnW,
        h: btnH,
      });
    }
    return { x: x, y: y, w: panelW, h: panelH, below: below, buttons: buttons };
  }

  function pointInRect(px, py, rect) {
    return px >= rect.x && py >= rect.y && px <= rect.x + rect.w && py <= rect.y + rect.h;
  }

  function drawBuildMenu() {
    if (!state.buildSite) return;
    var site = state.buildSite;
    var tile = view.tile;
    var sx = worldX(site.c);
    var sy = worldY(site.r);
    ctx.save();
    ctx.fillStyle = 'rgba(22, 22, 22, 0.1)';
    ctx.fillRect(sx + 2, sy + 2, tile - 4, tile - 4);
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sx + 2.5, sy + 2.5, tile - 5, tile - 5);

    var menu = buildMenuLayout();
    if (!menu) {
      ctx.restore();
      return;
    }
    var anchorX = Math.max(menu.x + 18, Math.min(menu.x + menu.w - 18, worldX(site.c + 0.5)));
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    if (menu.below) {
      ctx.moveTo(anchorX - 8, menu.y);
      ctx.lineTo(anchorX, menu.y - 9);
      ctx.lineTo(anchorX + 8, menu.y);
    } else {
      ctx.moveTo(anchorX - 8, menu.y + menu.h);
      ctx.lineTo(anchorX, menu.y + menu.h + 9);
      ctx.lineTo(anchorX + 8, menu.y + menu.h);
    }
    ctx.fill();
    roundRect(menu.x, menu.y, menu.w, menu.h, 14);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#6d675f';
    ctx.font = '700 11px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('選擇防禦塔', menu.x + menu.w / 2, menu.y + 11);

    for (var i = 0; i < menu.buttons.length; i++) {
      var btn = menu.buttons[i];
      var def = TOWERS[btn.type];
      var label = buildMenuLabel(btn.type);
      var cost = def ? def.cost : 0;
      var poor = def && state.gold < def.cost;
      roundRect(btn.x, btn.y, btn.w, btn.h, 10);
      ctx.fillStyle = poor ? '#f3f0ea' : '#fff';
      ctx.fill();
      ctx.strokeStyle = poor ? 'rgba(22,22,22,0.35)' : '#161616';
      ctx.lineWidth = poor ? 1.5 : 2;
      ctx.stroke();
      ctx.save();
      ctx.translate(btn.x + btn.w / 2, btn.y + btn.h * 0.34);
      ctx.globalAlpha = poor ? 0.45 : 1;
      ctx.strokeStyle = '#161616';
      ctx.fillStyle = def && def.color ? def.color : '#161616';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawBuildGlyph(btn.type);
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = poor ? 0.5 : 1;
      ctx.fillStyle = '#161616';
      ctx.font = '800 12px ' + FONT;
      ctx.fillText(label, btn.x + btn.w / 2, btn.y + btn.h - 26);
      ctx.font = '800 12px ' + FONT;
      ctx.fillText(String(cost), btn.x + btn.w / 2, btn.y + btn.h - 11);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawBuildGlyph(type) {
    drawTowerGlyph(type, 11, -0.2);
  }

  function drawFlashes() {
    for (var i = 0; i < state.flashes.length; i++) {
      var flash = state.flashes[i];
      ctx.globalAlpha = Math.max(0, flash.life / 0.32);
      ctx.fillStyle = flash.ok ? 'rgba(22, 22, 22, 0.18)' : 'rgba(22, 22, 22, 0.08)';
      ctx.fillRect(worldX(flash.c) + 2, worldY(flash.r) + 2, view.tile - 4, view.tile - 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawRanges() {
    var selected = selectedTower();
    if (selected) {
      var stats = selected.type === 'hero' ? heroStats(selected) : towerStats(selected);
      strokeRange(selected.c + 0.5, selected.r + 0.5, stats.range, towerColor(selected), 0.14, 0.85);
    }
    if (!state.rangePing) return;
    if (selected && selected.c === state.rangePing.c && selected.r === state.rangePing.r) return;
    var alpha = Math.max(0, state.rangePing.t / 0.9);
    strokeRange(state.rangePing.c + 0.5, state.rangePing.r + 0.5, state.rangePing.range, state.rangePing.color, 0.12 * alpha, alpha);
  }

  function strokeRange(wx, wy, range, color, fillAlpha, strokeAlpha) {
    ctx.beginPath();
    ctx.arc(worldX(wx), worldY(wy), range * view.tile, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(22, 22, 22, ' + fillAlpha + ')';
    ctx.fill();
    ctx.strokeStyle = 'rgba(22, 22, 22, ' + strokeAlpha + ')';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function inkX(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y - s);
    ctx.lineTo(x - s, y + s);
    ctx.stroke();
  }

  function drawAltar() {
    if (state.phase === 'menu' || state.phase === 'gameover') return;
    var spot = altarSpot();
    if (!spot) return;
    var x = worldX(spot.c + 0.5);
    var y = worldY(spot.r + 0.5);
    var s = view.tile * 0.36;
    ctx.save();
    ctx.translate(x, y);
    inkSeed = 41;
    inkSetup(Math.max(2.6, view.tile * 0.07));
    drawGlyphPlate('circle', s);
    ctx.beginPath();
    ctx.moveTo(-s * 0.46, s * 0.06);
    ctx.lineTo(0, -s * 0.52);
    ctx.lineTo(s * 0.46, s * 0.06);
    inkStroke();
    inkLine(-s * 0.54, s * 0.4, s * 0.54, s * 0.4, 3);
    inkStroke();
    ctx.restore();
  }

  function drawFogs() {
    for (var i = 0; i < state.fogs.length; i++) {
      var fog = state.fogs[i];
      var x = worldX(fog.x);
      var y = worldY(fog.y);
      var rad = fog.radius * view.tile;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(60, 191, 74, 0.28)';
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(28, 90, 36, 0.65)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  function drawSkyfalls() {
    var list = state.skyfalls;
    if (!list || !list.length) return;
    for (var i = 0; i < list.length; i++) {
      var rock = list[i];
      var fall = 1 - rock.life / rock.max;
      var x = worldX(rock.x);
      var y = worldY(rock.y - (1 - fall) * 3.4);
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = '#ffb15a';
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = Math.max(3, view.tile * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, view.tile * 0.28);
      ctx.lineTo(-view.tile * 0.16, -view.tile * 0.72);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#5a4030';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(5, view.tile * 0.14), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      if (!rock.armed) {
        ctx.save();
        ctx.strokeStyle = '#e07a2f';
        ctx.globalAlpha = Math.max(0, rock.life / (rock.max * 0.28));
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(worldX(rock.x), worldY(rock.y), rock.radius * view.tile, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawMeteors() {
    if (!state.meteor || !state.meteor.rocks) return;
    for (var i = 0; i < state.meteor.rocks.length; i++) {
      var rock = state.meteor.rocks[i];
      var t = 1 - rock.life / (rock.max || 0.48);
      var x = worldX(rock.tx);
      var y = worldY(rock.ty - (1 - t) * 3.2);
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = '#ffb15a';
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = Math.max(3, view.tile * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, view.tile * 0.35);
      ctx.lineTo(-view.tile * 0.08, -view.tile * 0.55);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#5a4030';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(4, view.tile * 0.1), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#e02323';
      ctx.beginPath();
      ctx.arc(-2, -2, Math.max(2, view.tile * 0.04), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawTowers() {
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
      if (tower.type === 'hero' && tower.hero === 'sword') drawSwordGhosts(tower);
    }
    for (var n = 0; n < state.towers.length; n++) drawTower(state.towers[n]);
  }

  function drawSwordGhosts(tower) {
    if (!(tower.buffTime > 0) || !tower.trail) return;
    for (var i = 0; i < tower.trail.length; i++) {
      var ghost = tower.trail[i];
      ctx.save();
      ctx.translate(worldX(ghost.x), worldY(ghost.y - 0.08));
      ctx.globalAlpha = 0.12 + (i / tower.trail.length) * 0.28;
      ctx.fillStyle = '#ff2a2a';
      ctx.beginPath();
      ctx.arc(0, 0, view.tile * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff2a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, view.tile * 0.28, -1, 1);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawTower(tower) {
    var tile = view.tile;
    var ax = tower.c + 0.5;
    var ay = tower.r + 0.42;
    if (tower.type === 'hero' && tower.hero === 'sword' && tower.fx != null) {
      ax = tower.fx;
      ay = tower.fy - 0.08;
      ctx.save();
      ctx.strokeStyle = 'rgba(224, 35, 35, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(worldX(tower.c + 0.5), worldY(tower.r + 0.5), tile * 0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    var x = worldX(ax);
    var y = worldY(ay);
    var s = tower.type === 'hero' ? tile * 0.3 : tile * 0.26;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#161616';
    ctx.fillStyle = '#fff';
    ctx.fillStyle = 'rgba(22, 22, 22, 0.1)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.95, s * 0.7, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    inkSeed = (tower.id || 1) * 17 + (tower.level || 0) * 3;
    if (tower.type === 'hero') {
      if (skillAuraOn(tower)) drawPossess(tower, s);
      drawHeroGlyph(tower.hero, s);
    } else {
      var glyphType = tower.type;
      if (isArrowPath(tower)) glyphType = 'arrow';
      else if (isCannonPath(tower)) glyphType = 'cannon';
      drawTowerGlyph(glyphType, s, tower.aim || 0);
    }
    ctx.restore();
    if (tower.type !== 'smith') {
    var shown = tower.level + 1;
    ctx.fillStyle = '#161616';
    if (shown > 6) {
      ctx.font = '800 ' + Math.max(10, Math.round(tile * 0.22)) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Lv.' + shown, x, y + tile * 0.36);
    } else {
      var pip = tile * 0.055;
      var gap = tile * 0.02;
      var pipX = x - (shown * pip + (shown - 1) * gap) / 2;
      for (var n = 0; n < shown; n++) {
        ctx.fillRect(pipX + n * (pip + gap), y + tile * 0.34, pip, pip);
      }
    }
    }
    if (state.selectedId === tower.id) {
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(worldX(tower.c) + 3, worldY(tower.r) + 3, tile - 6, tile - 6);
    }
    if (tower.chill > 0) {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, tile * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (tower.dizzy > 0) {
      ctx.save();
      ctx.translate(x, y - tile * 0.46);
      ctx.rotate(state.time * 6);
      ctx.fillStyle = '#e07a2f';
      ctx.beginPath();
      ctx.arc(-tile * 0.12, 0, Math.max(2, tile * 0.05), 0, Math.PI * 2);
      ctx.arc(tile * 0.12, 0, Math.max(2, tile * 0.05), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (tower.devilFork > 0) {
      ctx.save();
      ctx.translate(x + tile * 0.38, y - tile * 0.08);
      ctx.rotate(0.55);
      drawRedPitchfork(tile * 0.28);
      ctx.restore();
    }
  }

  function drawRedPitchfork(s) {
    ctx.save();
    ctx.strokeStyle = '#c62828';
    ctx.fillStyle = '#c62828';
    ctx.lineWidth = Math.max(2, s * 0.22);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // shaft
    ctx.beginPath();
    ctx.moveTo(0, s * 0.95);
    ctx.lineTo(0, -s * 0.15);
    ctx.stroke();
    // three triangular prongs
    var tips = [-s * 0.42, 0, s * 0.42];
    for (var i = 0; i < tips.length; i++) {
      ctx.beginPath();
      ctx.moveTo(tips[i] * 0.35, -s * 0.05);
      ctx.lineTo(tips[i], -s * 0.95);
      ctx.lineTo(tips[i] * 0.55 + (i === 1 ? 0 : tips[i] * 0.15), -s * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = Math.max(1.2, s * 0.1);
      ctx.stroke();
      ctx.strokeStyle = '#c62828';
      ctx.lineWidth = Math.max(2, s * 0.22);
    }
    // crossbar
    ctx.beginPath();
    ctx.moveTo(-s * 0.38, -s * 0.08);
    ctx.lineTo(s * 0.38, -s * 0.08);
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawEnemies() {
    for (var i = 0; i < state.enemies.length; i++) {
      if (!state.enemies[i].dead) drawEnemy(state.enemies[i]);
    }
  }

  function enemyBodyColors(enemy, resist) {
    var hit = enemy.hitFlash > 0;
    return {
      fill: hit ? '#161616' : '#fff',
      ink: hit ? '#fff' : '#161616',
      accent: resist ? resist.color : (enemy.color || '#161616'),
      rim: resist ? resist.color : '#161616',
    };
  }

  function drawEnemyEyes(rad, ink, opts) {
    opts = opts || {};
    var eye = Math.max(1.5, rad * (opts.size || 0.14));
    var gap = rad * (opts.gap || 0.3);
    var ey = rad * (opts.y || -0.06);
    ctx.fillStyle = ink;
    inkCircle(-gap, ey, eye, 10);
    ctx.fill();
    inkCircle(gap, ey, eye, 10);
    ctx.fill();
    if (opts.shine) {
      ctx.fillStyle = '#fff';
      inkCircle(-gap - eye * 0.2, ey - eye * 0.25, eye * 0.28, 6);
      ctx.fill();
      inkCircle(gap - eye * 0.2, ey - eye * 0.25, eye * 0.28, 6);
      ctx.fill();
    }
  }

  function drawEnemyShadow(rad) {
    ctx.fillStyle = 'rgba(22, 22, 22, 0.12)';
    ctx.beginPath();
    ctx.ellipse(0, rad * 0.92, rad * 0.72, rad * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function doodleInk(colors, width) {
    inkSetup(width);
    ctx.strokeStyle = colors.ink;
    ctx.fillStyle = colors.fill;
  }

  function doodleEye(x, y, r) {
    inkCircle(x, y, r, 6);
    ctx.fill();
  }

  function drawBoneBody(rad, colors, bob, revived) {
    ctx.translate(0, (bob || 0) * 0.3);
    doodleInk(colors, Math.max(2, rad * 0.16));
    ctx.strokeStyle = colors.ink;
    ctx.fillStyle = '#f7f1e4';
    inkLine(-rad * 0.16, rad * 0.12, -rad * 0.24, rad * 0.7, 2);
    inkStroke();
    inkLine(rad * 0.16, rad * 0.12, rad * 0.24, rad * 0.7, 2);
    inkStroke();
    inkLine(-rad * 0.26, -rad * 0.08, -rad * 0.52, rad * 0.16, 2);
    inkStroke();
    inkLine(rad * 0.26, -rad * 0.08, rad * 0.52, rad * 0.1, 2);
    inkStroke();
    inkCircle(0, 0, rad * 0.26, 12);
    ctx.fill();
    inkStroke();
    inkCircle(0, -rad * 0.42, rad * 0.32, 14);
    ctx.fill();
    inkStroke();
    ctx.fillStyle = revived ? '#e07a2f' : '#161616';
    ctx.beginPath();
    ctx.arc(-rad * 0.11, -rad * 0.46, rad * 0.07, 0, Math.PI * 2);
    ctx.arc(rad * 0.11, -rad * 0.46, rad * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-rad * 0.12, -rad * 0.28);
    ctx.lineTo(rad * 0.12, -rad * 0.28);
    inkStroke();
  }

  function drawGruntBody(rad, colors, bob) {
    inkSeed = Math.round(rad * 17 + 3);
    ctx.translate(0, bob * 0.35);
    doodleInk(colors, Math.max(2, rad * 0.16));
    ctx.beginPath();
    ctx.moveTo(-rad * 0.78, rad * 0.18);
    ctx.quadraticCurveTo(-rad * 1.05, -rad * 0.28, -rad * 0.32, -rad * 0.58);
    ctx.quadraticCurveTo(rad * 0.05, -rad * 0.92, rad * 0.52, -rad * 0.46);
    ctx.quadraticCurveTo(rad * 1.02, rad * 0.02, rad * 0.62, rad * 0.4);
    ctx.quadraticCurveTo(rad * 0.18, rad * 0.78, -rad * 0.28, rad * 0.58);
    ctx.quadraticCurveTo(-rad * 0.72, rad * 0.7, -rad * 0.78, rad * 0.18);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.fillStyle = colors.ink;
    doodleEye(-rad * 0.22, -rad * 0.08, Math.max(1.4, rad * 0.09));
    doodleEye(rad * 0.26, -rad * 0.02, Math.max(1.4, rad * 0.09));
    ctx.beginPath();
    ctx.moveTo(-rad * 0.16, rad * 0.2);
    ctx.quadraticCurveTo(rad * 0.06, rad * 0.42, rad * 0.3, rad * 0.16);
    inkStroke();
  }

  function drawSwiftBody(rad, colors, bob) {
    inkSeed = Math.round(rad * 19 + 8);
    var flap = Math.sin((state.time || 0) * 14 + inkSeed) * rad * 0.12;
    ctx.translate(0, -rad * 0.36 + bob);
    doodleInk(colors, Math.max(1.8, rad * 0.12));
    ctx.beginPath();
    ctx.moveTo(-rad * 0.22, rad * 0.08);
    ctx.quadraticCurveTo(-rad * 0.95, -rad * 0.35 - flap, -rad * 1.05, rad * 0.05);
    ctx.quadraticCurveTo(-rad * 0.7, rad * 0.42 + flap, -rad * 0.2, rad * 0.22);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(rad * 0.22, rad * 0.08);
    ctx.quadraticCurveTo(rad * 0.95, -rad * 0.35 - flap, rad * 1.05, rad * 0.05);
    ctx.quadraticCurveTo(rad * 0.7, rad * 0.42 + flap, rad * 0.2, rad * 0.22);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    inkCircle(0, rad * 0.04, rad * 0.4, 12);
    ctx.fill();
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(-rad * 0.2, -rad * 0.22);
    ctx.quadraticCurveTo(-rad * 0.28, -rad * 0.68, -rad * 0.02, -rad * 0.28);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(rad * 0.2, -rad * 0.22);
    ctx.quadraticCurveTo(rad * 0.28, -rad * 0.68, rad * 0.02, -rad * 0.28);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.fillStyle = colors.ink;
    doodleEye(-rad * 0.13, rad * 0.02, Math.max(1.2, rad * 0.07));
    doodleEye(rad * 0.13, rad * 0.02, Math.max(1.2, rad * 0.07));
    ctx.beginPath();
    ctx.moveTo(-rad * 0.06, rad * 0.16);
    ctx.lineTo(-rad * 0.02, rad * 0.28);
    ctx.lineTo(rad * 0.03, rad * 0.16);
    ctx.lineTo(rad * 0.08, rad * 0.28);
    ctx.lineTo(rad * 0.12, rad * 0.16);
    inkStroke();
  }

  function drawBruteBody(rad, colors, bob) {
    inkSeed = Math.round(rad * 13 + 4);
    ctx.translate(0, bob * 0.2);
    doodleInk(colors, Math.max(2.2, rad * 0.15));
    ctx.beginPath();
    ctx.moveTo(-rad * 0.72, rad * 0.08);
    ctx.quadraticCurveTo(-rad * 1.02, -rad * 0.22, -rad * 0.42, -rad * 0.32);
    ctx.quadraticCurveTo(-rad * 0.22, -rad * 0.88, rad * 0.02, -rad * 0.38);
    ctx.quadraticCurveTo(rad * 0.28, -rad * 0.72, rad * 0.38, -rad * 0.22);
    ctx.quadraticCurveTo(rad * 0.98, rad * 0.02, rad * 0.58, rad * 0.32);
    ctx.quadraticCurveTo(rad * 0.42, rad * 0.78, rad * 0.12, rad * 0.36);
    ctx.quadraticCurveTo(-rad * 0.02, rad * 0.86, -rad * 0.28, rad * 0.34);
    ctx.quadraticCurveTo(-rad * 0.52, rad * 0.8, -rad * 0.72, rad * 0.08);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(-rad * 0.55, rad * 0.02);
    ctx.quadraticCurveTo(0, rad * 0.18, rad * 0.48, -rad * 0.02);
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(rad * 0.22, rad * 0.02);
    ctx.quadraticCurveTo(rad * 0.42, rad * 0.18, rad * 0.34, rad * 0.32);
    inkStroke();
    ctx.fillStyle = colors.ink;
    doodleEye(-rad * 0.16, -rad * 0.08, Math.max(1.5, rad * 0.08));
    ctx.beginPath();
    ctx.moveTo(-rad * 0.34, -rad * 0.16);
    ctx.quadraticCurveTo(-rad * 0.12, -rad * 0.02, rad * 0.08, -rad * 0.18);
    inkStroke();
  }

  function drawRamBody(rad, colors, bob) {
    inkSeed = Math.round(rad * 31 + 5);
    ctx.translate(0, bob * 0.15);
    doodleInk(colors, Math.max(2.1, rad * 0.14));
    ctx.beginPath();
    ctx.moveTo(-rad * 0.62, rad * 0.28);
    ctx.quadraticCurveTo(-rad * 0.95, -rad * 0.05, -rad * 0.4, -rad * 0.32);
    ctx.quadraticCurveTo(rad * 0.05, -rad * 0.55, rad * 0.42, -rad * 0.18);
    ctx.quadraticCurveTo(rad * 0.9, rad * 0.12, rad * 0.38, rad * 0.46);
    ctx.quadraticCurveTo(-rad * 0.08, rad * 0.72, -rad * 0.62, rad * 0.28);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(rad * 0.02, -rad * 0.28);
    ctx.quadraticCurveTo(rad * 0.42, -rad * 0.95, rad * 0.62, -rad * 0.22);
    ctx.quadraticCurveTo(rad * 0.28, -rad * 0.38, rad * 0.08, -rad * 0.16);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.fillStyle = colors.ink;
    doodleEye(-rad * 0.16, -rad * 0.02, Math.max(1.4, rad * 0.08));
    ctx.beginPath();
    ctx.moveTo(-rad * 0.36, -rad * 0.16);
    ctx.quadraticCurveTo(-rad * 0.12, rad * 0.02, -rad * 0.02, -rad * 0.14);
    inkStroke();
  }

  function drawHopperBody(rad, colors, bob, jumping) {
    inkSeed = Math.round(rad * 23 + 6);
    ctx.translate(0, bob + (jumping ? -rad * 0.2 : 0));
    doodleInk(colors, Math.max(2, rad * 0.14));
    ctx.beginPath();
    ctx.moveTo(0, rad * 0.62);
    ctx.quadraticCurveTo(-rad * 0.55, rad * 0.4, -rad * 0.78, rad * 0.02);
    ctx.quadraticCurveTo(-rad * 0.98, -rad * 0.28, -rad * 0.48, -rad * 0.32);
    ctx.quadraticCurveTo(-rad * 0.62, -rad * 0.92, -rad * 0.18, -rad * 0.4);
    ctx.quadraticCurveTo(0, -rad * 0.22, rad * 0.18, -rad * 0.4);
    ctx.quadraticCurveTo(rad * 0.62, -rad * 0.92, rad * 0.48, -rad * 0.32);
    ctx.quadraticCurveTo(rad * 0.98, -rad * 0.22, rad * 0.72, rad * 0.08);
    ctx.quadraticCurveTo(rad * 0.48, rad * 0.48, 0, rad * 0.62);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(-rad * 0.42, rad * 0.48);
    ctx.quadraticCurveTo(-rad * 0.7, rad * 0.72, -rad * 0.28, rad * 0.78);
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(rad * 0.38, rad * 0.48);
    ctx.quadraticCurveTo(rad * 0.68, rad * 0.74, rad * 0.22, rad * 0.8);
    inkStroke();
    ctx.fillStyle = colors.ink;
    doodleEye(-rad * 0.28, -rad * 0.5, Math.max(1.3, rad * 0.08));
    doodleEye(rad * 0.28, -rad * 0.5, Math.max(1.3, rad * 0.08));
    ctx.beginPath();
    ctx.moveTo(-rad * 0.28, rad * 0.12);
    ctx.quadraticCurveTo(0, rad * 0.38, rad * 0.32, rad * 0.08);
    inkStroke();
  }

  function drawDevilHorn(rad, side) {
    ctx.beginPath();
    ctx.moveTo(side * rad * 0.12, -rad * 0.4);
    ctx.quadraticCurveTo(side * rad * 0.58, -rad * 0.48, side * rad * 0.4, -rad * 0.78);
    ctx.quadraticCurveTo(side * rad * 0.2, -rad * 0.55, side * rad * 0.28, -rad * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawDevilBody(rad, colors, bob) {
    ctx.translate(0, bob * 0.12);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = colors.ink;
    ctx.fillStyle = colors.fill;
    ctx.lineWidth = Math.max(2.2, rad * 0.15);
    ctx.beginPath();
    ctx.arc(0, rad * 0.1, rad * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    drawDevilHorn(rad, -1);
    drawDevilHorn(rad, 1);
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = Math.max(2.4, rad * 0.18);
    ctx.beginPath();
    ctx.moveTo(-rad * 0.32, -rad * 0.02);
    ctx.lineTo(-rad * 0.06, rad * 0.14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rad * 0.32, -rad * 0.02);
    ctx.lineTo(rad * 0.06, rad * 0.14);
    ctx.stroke();
    ctx.lineWidth = Math.max(2.2, rad * 0.15);
    ctx.beginPath();
    ctx.arc(0, rad * 0.08, rad * 0.3, 0.4, Math.PI - 0.4);
    ctx.stroke();
  }

  function drawShardBody(rad, colors) {
    inkSeed = Math.round(rad * 11 + 9);
    doodleInk(colors, Math.max(2, rad * 0.16));
    ctx.beginPath();
    ctx.moveTo(-rad * 0.15, -rad * 0.68);
    ctx.quadraticCurveTo(-rad * 0.9, -rad * 0.35, -rad * 0.68, rad * 0.18);
    ctx.quadraticCurveTo(-rad * 0.82, rad * 0.72, -rad * 0.05, rad * 0.58);
    ctx.quadraticCurveTo(rad * 0.62, rad * 0.88, rad * 0.7, rad * 0.12);
    ctx.quadraticCurveTo(rad * 0.95, -rad * 0.38, rad * 0.18, -rad * 0.52);
    ctx.quadraticCurveTo(-rad * 0.02, -rad * 0.95, -rad * 0.15, -rad * 0.68);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(-rad * 0.02, -rad * 0.48);
    ctx.lineTo(rad * 0.1, -rad * 0.12);
    ctx.lineTo(-rad * 0.06, rad * 0.08);
    ctx.lineTo(rad * 0.12, rad * 0.38);
    inkStroke();
    ctx.fillStyle = colors.ink;
    doodleEye(-rad * 0.22, rad * 0.02, Math.max(1.2, rad * 0.08));
    doodleEye(rad * 0.22, -rad * 0.02, Math.max(1.2, rad * 0.08));
    ctx.beginPath();
    ctx.arc(rad * 0.02, rad * 0.16, rad * 0.16, Math.PI * 0.15, Math.PI * 0.85, true);
    inkStroke();
  }

  function drawBossHead(rad, colors, y) {
    inkCircle(0, y, rad * 0.7, 16);
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.ink;
    ctx.fill();
    inkStroke();
  }

  function drawBossFace(rad, colors, y, mood) {
    var eye = Math.max(1.5, rad * 0.07);
    ctx.fillStyle = colors.ink;
    ctx.strokeStyle = colors.ink;
    if (mood === 'shut') {
      ctx.beginPath();
      ctx.moveTo(-rad * 0.28, y);
      ctx.quadraticCurveTo(-rad * 0.16, y - rad * 0.12, -rad * 0.04, y);
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(rad * 0.04, y);
      ctx.quadraticCurveTo(rad * 0.16, y - rad * 0.12, rad * 0.28, y);
      inkStroke();
    } else {
      doodleEye(-rad * 0.2, y, eye);
      doodleEye(rad * 0.2, y, eye);
    }
    ctx.beginPath();
    if (mood === 'angry' || mood === 'yell') {
      ctx.moveTo(-rad * 0.34, y - rad * 0.16);
      ctx.quadraticCurveTo(-rad * 0.16, y - rad * 0.02, -rad * 0.02, y - rad * 0.14);
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(rad * 0.34, y - rad * 0.16);
      ctx.quadraticCurveTo(rad * 0.16, y - rad * 0.02, rad * 0.02, y - rad * 0.14);
      inkStroke();
    }
    ctx.beginPath();
    if (mood === 'yell') {
      inkCircle(0, y + rad * 0.24, rad * 0.12, 8);
      ctx.fillStyle = colors.ink;
      ctx.fill();
    } else if (mood === 'angry') {
      ctx.moveTo(-rad * 0.16, y + rad * 0.22);
      ctx.quadraticCurveTo(0, y + rad * 0.1, rad * 0.18, y + rad * 0.24);
      inkStroke();
    } else {
      ctx.moveTo(-rad * 0.16, y + rad * 0.18);
      ctx.quadraticCurveTo(0, y + rad * 0.36, rad * 0.2, y + rad * 0.16);
      inkStroke();
    }
  }

  function drawBossDoodle(id, rad, colors) {
    var y = rad * 0.08;
    if (id === 'split') {
      var bits = [[-rad * 0.4, rad * 0.2, rad * 0.4], [rad * 0.42, rad * 0.16, rad * 0.38], [0, rad * 0.02, rad * 0.5]];
      for (var s = 0; s < bits.length; s++) {
        inkSeed += 5;
        inkCircle(bits[s][0], bits[s][1], bits[s][2], 12);
        ctx.fillStyle = colors.fill;
        ctx.strokeStyle = colors.ink;
        ctx.fill();
        inkStroke();
        ctx.fillStyle = colors.ink;
        doodleEye(bits[s][0] - bits[s][2] * 0.28, bits[s][1] - bits[s][2] * 0.05, Math.max(1.2, bits[s][2] * 0.14));
        doodleEye(bits[s][0] + bits[s][2] * 0.28, bits[s][1] - bits[s][2] * 0.05, Math.max(1.2, bits[s][2] * 0.14));
      }
      return;
    }
    if (id === 'ward') {
      inkCircle(0, -rad * 0.22, rad * 0.42, 12);
      ctx.fillStyle = colors.fill;
      ctx.strokeStyle = colors.ink;
      ctx.fill();
      inkStroke();
      ctx.fillStyle = colors.ink;
      doodleEye(-rad * 0.14, -rad * 0.28, Math.max(1.4, rad * 0.07));
      doodleEye(rad * 0.14, -rad * 0.28, Math.max(1.4, rad * 0.07));
      ctx.beginPath();
      ctx.moveTo(0, -rad * 0.02);
      ctx.quadraticCurveTo(rad * 0.78, rad * 0.08, rad * 0.55, rad * 0.58);
      ctx.quadraticCurveTo(0, rad * 1.02, -rad * 0.55, rad * 0.58);
      ctx.quadraticCurveTo(-rad * 0.78, rad * 0.08, 0, -rad * 0.02);
      ctx.closePath();
      ctx.fillStyle = colors.fill;
      ctx.fill();
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(0, rad * 0.08);
      ctx.quadraticCurveTo(rad * 0.06, rad * 0.4, 0, rad * 0.72);
      inkStroke();
      return;
    }
    drawBossHead(rad, colors, y);
    if (id === 'regen') {
      ctx.beginPath();
      ctx.moveTo(-rad * 0.62, y);
      ctx.quadraticCurveTo(-rad * 1.05, -rad * 0.15, -rad * 0.72, -rad * 0.42);
      ctx.quadraticCurveTo(-rad * 0.48, -rad * 0.05, -rad * 0.62, y);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(-rad * 0.58, -rad * 0.02);
      ctx.quadraticCurveTo(-rad * 0.95, rad * 0.28, -rad * 0.55, rad * 0.22);
      ctx.quadraticCurveTo(-rad * 0.4, rad * 0.05, -rad * 0.58, -rad * 0.02);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      drawBossFace(rad, colors, y, 'shut');
    } else if (id === 'rush') {
      var tufts = [[-rad * 0.55, -rad * 0.35, -rad * 0.35, -rad * 0.45], [rad * 0.5, -rad * 0.32, rad * 0.4, -rad * 0.42], [-rad * 0.15, -rad * 0.5, -rad * 0.05, -rad * 0.38]];
      for (var t = 0; t < tufts.length; t++) {
        ctx.beginPath();
        ctx.moveTo(tufts[t][0], tufts[t][1]);
        ctx.quadraticCurveTo(tufts[t][0] + tufts[t][2] * 0.2, tufts[t][1] + tufts[t][3], tufts[t][0] + tufts[t][2], tufts[t][1] + tufts[t][3] * 0.15);
        ctx.quadraticCurveTo(tufts[t][0] + tufts[t][2] * 0.35, tufts[t][1] + rad * 0.02, tufts[t][0] + tufts[t][2] * 0.05, tufts[t][1] + rad * 0.08);
        ctx.closePath();
        ctx.fill();
        inkStroke();
      }
      drawBossFace(rad, colors, y, 'yell');
    } else if (id === 'summon') {
      ctx.beginPath();
      ctx.moveTo(rad * 0.48, y + rad * 0.12);
      ctx.quadraticCurveTo(rad * 0.9, -rad * 0.05, rad * 0.7, -rad * 0.55);
      inkStroke();
      inkCircle(rad * 0.7, -rad * 0.62, rad * 0.1, 6);
      ctx.fill();
      inkStroke();
      drawBossFace(rad, colors, y, 'yell');
    } else if (id === 'frost') {
      var drips = [-rad * 0.42, -rad * 0.16, rad * 0.22, rad * 0.46];
      for (var d = 0; d < drips.length; d++) {
        ctx.beginPath();
        ctx.moveTo(drips[d] - rad * 0.08, -rad * 0.28);
        ctx.quadraticCurveTo(drips[d], rad * 0.05 + (d % 2) * rad * 0.12, drips[d] + rad * 0.08, -rad * 0.28);
        ctx.closePath();
        ctx.fill();
        inkStroke();
      }
      drawBossFace(rad, colors, y, 'angry');
    } else if (id === 'armor') {
      ctx.beginPath();
      ctx.moveTo(-rad * 0.58, y + rad * 0.08);
      ctx.quadraticCurveTo(-rad * 0.72, -rad * 0.72, 0, -rad * 0.62);
      ctx.quadraticCurveTo(rad * 0.72, -rad * 0.72, rad * 0.58, y + rad * 0.08);
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(0, y - rad * 0.2);
      ctx.quadraticCurveTo(rad * 0.04, y + rad * 0.08, 0, y + rad * 0.16);
      inkStroke();
      drawBossFace(rad, colors, y + rad * 0.02, 'angry');
    } else if (id === 'mend') {
      drawBossFace(rad, colors, y, 'shut');
      ctx.beginPath();
      ctx.moveTo(rad * 0.34, y + rad * 0.02);
      ctx.lineTo(rad * 0.34, y + rad * 0.28);
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(rad * 0.2, y + rad * 0.14);
      ctx.lineTo(rad * 0.48, y + rad * 0.14);
      inkStroke();
    } else {
      drawBossFace(rad, colors, y, 'shut');
    }
  }

  function drawBossCrown(rad) {
    ctx.fillStyle = '#f2c14e';
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = Math.max(1.6, rad * 0.1);
    ctx.beginPath();
    ctx.moveTo(-rad * 0.46, -rad * 0.62);
    ctx.lineTo(-rad * 0.26, -rad * 1.02);
    ctx.lineTo(-rad * 0.05, -rad * 0.68);
    ctx.lineTo(0, -rad * 1.08);
    ctx.lineTo(rad * 0.05, -rad * 0.68);
    ctx.lineTo(rad * 0.26, -rad * 1.02);
    ctx.lineTo(rad * 0.46, -rad * 0.62);
    ctx.lineTo(rad * 0.5, -rad * 0.46);
    ctx.lineTo(-rad * 0.5, -rad * 0.46);
    ctx.closePath();
    ctx.fill();
    inkStroke();
  }

  function drawSkullKing(enemy, rad, colors) {
    var t = state.time * 6 + (enemy.id || 0);
    var step = Math.sin(t);
    var casting = (enemy.castPose || 0) > 0;
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.ink;
    var hip = rad * 0.46;
    inkLine(-rad * 0.16, hip, -rad * 0.24 + step * rad * 0.14, rad * 0.98, 2);
    inkStroke();
    inkLine(rad * 0.16, hip, rad * 0.24 - step * rad * 0.14, rad * 0.98, 2);
    inkStroke();
    inkCircle(0, rad * 0.08, rad * 0.32, 14);
    ctx.fillStyle = '#f7f1e4';
    ctx.fill();
    inkStroke();
    for (var rib = 0; rib < 3; rib++) {
      ctx.beginPath();
      ctx.arc(0, rad * (-0.02 + rib * 0.12), rad * 0.2, 0.2, Math.PI - 0.2);
      inkStroke();
    }
    var lift = casting ? -rad * 0.62 : rad * 0.02;
    var sway = casting ? Math.sin(state.time * 14) * rad * 0.06 : step * rad * 0.1;
    inkLine(-rad * 0.28, -rad * 0.02, -rad * 0.64, lift + sway, 2);
    inkStroke();
    inkLine(rad * 0.28, 0, rad * 0.58, lift - sway * 0.35, 2);
    inkStroke();
    var staffX = rad * 0.62;
    var staffTop = casting ? -rad * 1.2 : -rad * 0.82;
    var staffBot = casting ? lift - sway * 0.35 + rad * 0.08 : rad * 0.28;
    inkLine(staffX, staffBot, staffX, staffTop, 2);
    inkStroke();
    ctx.beginPath();
    ctx.arc(staffX, staffTop, rad * 0.1, 0, Math.PI * 2);
    ctx.fillStyle = casting ? '#ffb15a' : '#e07a2f';
    ctx.fill();
    ctx.strokeStyle = colors.ink;
    ctx.stroke();
    ctx.save();
    ctx.rotate(casting ? -0.08 : step * 0.05);
    inkCircle(0, -rad * 0.4, rad * 0.4, 16);
    ctx.fillStyle = '#f7f1e4';
    ctx.fill();
    inkStroke();
    ctx.fillStyle = '#161616';
    ctx.beginPath();
    ctx.arc(-rad * 0.14, -rad * 0.44, rad * 0.08, 0, Math.PI * 2);
    ctx.arc(rad * 0.14, -rad * 0.44, rad * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -rad * 0.34);
    ctx.lineTo(-rad * 0.05, -rad * 0.24);
    ctx.lineTo(rad * 0.05, -rad * 0.24);
    ctx.closePath();
    ctx.fill();
    var jaw = casting ? rad * 0.12 : rad * 0.03;
    ctx.beginPath();
    ctx.moveTo(-rad * 0.16, -rad * 0.22);
    ctx.quadraticCurveTo(0, -rad * 0.06 + jaw, rad * 0.16, -rad * 0.22);
    inkStroke();
    ctx.restore();
  }

  function drawKingLimb(x1, y1, x2, y2) {
    inkLine(x1, y1, x2, y2, 2);
    inkStroke();
  }

  function drawKingHand(x, y, rad, fill) {
    inkCircle(x, y, Math.max(1.8, rad * 0.1), 7);
    ctx.fillStyle = fill;
    ctx.fill();
    inkStroke();
  }

  function drawKingFoot(x, y, rad, side) {
    ctx.beginPath();
    ctx.ellipse(x + side * rad * 0.06, y, rad * 0.16, rad * 0.07, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    inkStroke();
  }

  function drawKingLeaf(x, y, s, accent) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - s * 0.9, y - s * 0.35, x - s * 0.35, y - s * 1.05);
    ctx.quadraticCurveTo(x + s * 0.15, y - s * 0.35, x, y);
    ctx.closePath();
    ctx.fill();
    inkStroke();
  }

  function drawKingMiniHead(x, y, r, ink) {
    inkCircle(x, y, r, 10);
    ctx.fillStyle = '#fff';
    ctx.fill();
    inkStroke();
    ctx.fillStyle = ink;
    doodleEye(x - r * 0.28, y - r * 0.08, Math.max(1.1, r * 0.18));
    doodleEye(x + r * 0.28, y - r * 0.08, Math.max(1.1, r * 0.18));
  }

  function drawKingBody(enemy, rad, colors) {
    var id = enemy.bossId;
    var t = (state.time || 0) * 6 + (enemy.id || 0);
    var step = Math.sin(t);
    var accent = colors.accent || '#161616';
    var hip = rad * 0.42;
    var shoulder = -rad * 0.02;
    var footY = rad * 1.05;
    var lx = -rad * 0.2 + step * rad * 0.2;
    var rx = rad * 0.2 - step * rad * 0.2;
    var raiseRight = id === 'summon' || id === 'mend' || id === 'frost' || id === 'regen';
    var punchRight = id === 'rush';
    ctx.strokeStyle = colors.ink;
    ctx.fillStyle = colors.fill;
    ctx.lineWidth = Math.max(2.2, rad * 0.14);

    drawKingLimb(-rad * 0.14, hip, lx, footY);
    drawKingLimb(rad * 0.14, hip, rx, footY);
    drawKingFoot(lx, footY, rad, -1);
    drawKingFoot(rx, footY, rad, 1);

    inkCircle(0, rad * 0.12, rad * 0.3, 14);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    inkStroke();
    if (id === 'armor') {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(-rad * 0.18, -rad * 0.02);
      ctx.lineTo(rad * 0.18, -rad * 0.02);
      ctx.lineTo(rad * 0.14, rad * 0.34);
      ctx.lineTo(-rad * 0.14, rad * 0.34);
      ctx.closePath();
      ctx.fill();
      inkStroke();
      inkCircle(-rad * 0.34, shoulder, rad * 0.14, 8);
      ctx.fill();
      inkStroke();
      inkCircle(rad * 0.34, shoulder, rad * 0.14, 8);
      ctx.fill();
      inkStroke();
    }
    if (id === 'split') {
      drawKingMiniHead(-rad * 0.42, rad * 0.02, rad * 0.2, colors.ink);
      drawKingMiniHead(rad * 0.44, rad * 0.08, rad * 0.17, colors.ink);
    }

    var leftHandX = -rad * 0.62;
    var leftHandY = rad * 0.22 + step * rad * 0.08;
    var rightHandX = rad * 0.6;
    var rightHandY = rad * 0.18 - step * rad * 0.08;
    if (raiseRight) {
      rightHandX = rad * 0.48;
      rightHandY = -rad * 0.58;
    } else if (punchRight) {
      rightHandX = rad * 0.82;
      rightHandY = -rad * 0.12 + step * rad * 0.05;
      leftHandX = -rad * 0.72;
      leftHandY = rad * 0.28 - step * rad * 0.08;
    }
    if (id === 'ward') {
      leftHandX = -rad * 0.38;
      leftHandY = rad * 0.18;
      drawKingLimb(-rad * 0.22, shoulder, leftHandX, leftHandY);
      ctx.beginPath();
      ctx.moveTo(-rad * 0.78, -rad * 0.18);
      ctx.quadraticCurveTo(-rad * 0.18, -rad * 0.28, -rad * 0.16, rad * 0.12);
      ctx.quadraticCurveTo(-rad * 0.22, rad * 0.62, -rad * 0.78, rad * 0.38);
      ctx.closePath();
      ctx.fillStyle = accent;
      ctx.fill();
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(-rad * 0.62, -rad * 0.02);
      ctx.quadraticCurveTo(-rad * 0.36, rad * 0.1, -rad * 0.54, rad * 0.3);
      inkStroke();
      drawKingLimb(rad * 0.22, shoulder, rightHandX, rightHandY);
      drawKingHand(rightHandX, rightHandY, rad, colors.fill);
    } else {
      drawKingLimb(-rad * 0.24, shoulder, leftHandX, leftHandY);
      drawKingHand(leftHandX, leftHandY, rad, colors.fill);
      drawKingLimb(rad * 0.24, shoulder, rightHandX, rightHandY);
      if (id === 'summon') {
        inkCircle(rightHandX, rightHandY - rad * 0.12, rad * 0.14, 8);
        ctx.fillStyle = accent;
        ctx.fill();
        inkStroke();
        inkCircle(rightHandX + rad * 0.28, rightHandY + rad * 0.08, rad * 0.06, 6);
        ctx.fillStyle = colors.fill;
        ctx.fill();
        inkStroke();
      } else if (id === 'mend') {
        drawKingHand(rightHandX, rightHandY, rad, colors.fill);
        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(2.2, rad * 0.1);
        inkLine(rightHandX, rightHandY - rad * 0.28, rightHandX, rightHandY + rad * 0.08, 2);
        inkStroke();
        inkLine(rightHandX - rad * 0.16, rightHandY - rad * 0.1, rightHandX + rad * 0.16, rightHandY - rad * 0.1, 2);
        inkStroke();
        ctx.strokeStyle = colors.ink;
        ctx.lineWidth = Math.max(2.2, rad * 0.14);
      } else if (id === 'frost') {
        ctx.beginPath();
        ctx.moveTo(rightHandX, rightHandY - rad * 0.28);
        ctx.lineTo(rightHandX + rad * 0.16, rightHandY);
        ctx.lineTo(rightHandX, rightHandY + rad * 0.2);
        ctx.lineTo(rightHandX - rad * 0.16, rightHandY);
        ctx.closePath();
        ctx.fillStyle = accent;
        ctx.fill();
        inkStroke();
      } else if (id === 'regen') {
        drawKingHand(rightHandX, rightHandY, rad, colors.fill);
        drawKingLeaf(leftHandX - rad * 0.02, leftHandY - rad * 0.04, rad * 0.42, accent);
      } else {
        drawKingHand(rightHandX, rightHandY, rad, colors.fill);
      }
    }

    ctx.save();
    ctx.rotate(step * 0.05);
    inkCircle(0, -rad * 0.4, rad * 0.38, 16);
    ctx.fillStyle = colors.fill;
    ctx.fill();
    inkStroke();
    if (id === 'regen') {
      drawKingLeaf(-rad * 0.12, -rad * 0.48, rad * 0.5, accent);
      drawKingLeaf(rad * 0.18, -rad * 0.42, rad * 0.38, accent);
    }
    if (id === 'rush') {
      var tufts = [[-rad * 0.3, -rad * 0.58], [0, -rad * 0.72], [rad * 0.3, -rad * 0.56]];
      ctx.fillStyle = accent;
      for (var u = 0; u < tufts.length; u++) {
        ctx.beginPath();
        ctx.moveTo(tufts[u][0], tufts[u][1] + rad * 0.16);
        ctx.quadraticCurveTo(tufts[u][0] + rad * 0.18, tufts[u][1] - rad * 0.22, tufts[u][0] + rad * 0.02, tufts[u][1] - rad * 0.04);
        ctx.quadraticCurveTo(tufts[u][0] - rad * 0.14, tufts[u][1] + rad * 0.04, tufts[u][0], tufts[u][1] + rad * 0.16);
        ctx.closePath();
        ctx.fill();
        inkStroke();
      }
    }
    if (id === 'frost') {
      var drips = [-rad * 0.24, -rad * 0.04, rad * 0.14, rad * 0.28];
      ctx.fillStyle = accent;
      for (var d = 0; d < drips.length; d++) {
        ctx.beginPath();
        ctx.moveTo(drips[d] - rad * 0.07, -rad * 0.68);
        ctx.lineTo(drips[d], -rad * 0.38);
        ctx.lineTo(drips[d] + rad * 0.07, -rad * 0.68);
        ctx.closePath();
        ctx.fill();
        inkStroke();
      }
    }
    if (id === 'armor') {
      ctx.beginPath();
      ctx.moveTo(-rad * 0.34, -rad * 0.34);
      ctx.quadraticCurveTo(-rad * 0.38, -rad * 0.86, 0, -rad * 0.78);
      ctx.quadraticCurveTo(rad * 0.38, -rad * 0.86, rad * 0.34, -rad * 0.34);
      inkStroke();
      ctx.beginPath();
      ctx.moveTo(0, -rad * 0.52);
      ctx.lineTo(0, -rad * 0.28);
      inkStroke();
    }
    var mood = (id === 'rush' || id === 'summon') ? 'yell' : (id === 'frost' || id === 'armor' || id === 'ward') ? 'angry' : 'shut';
    drawBossFace(rad, colors, -rad * 0.44, mood);
    ctx.restore();
    ctx.strokeStyle = colors.ink;
    ctx.fillStyle = colors.fill;
  }

  function drawEliteBody(enemy, rad, colors, bob) {
    inkSeed = (enemy.bossId || 'x').charCodeAt(0) * 17 + Math.round(rad * 12);
    ctx.translate(0, bob * 0.3);
    doodleInk(colors, Math.max(2.2, rad * 0.14));
    if (enemy.bossId === 'skull') drawBoneBody(rad, colors, 0, false);
    else drawBossDoodle(enemy.bossId, rad, colors);
    drawBossCrown(rad);
  }

  function drawBossBody(enemy, rad, colors, bob) {
    inkSeed = (enemy.bossId || 'x').charCodeAt(0) * 17 + Math.round(rad * 12);
    ctx.translate(0, bob * 0.3);
    doodleInk(colors, Math.max(2.4, rad * 0.14));
    if (enemy.bossId === 'skull') {
      drawSkullKing(enemy, rad, colors);
      drawBossCrown(rad);
      return;
    }
    drawKingBody(enemy, rad, colors);
    drawBossCrown(rad);
  }

  function drawInkAuraRing(x, y, rad, color, phase, wobble) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, rad * 0.12);
    ctx.globalAlpha = 0.35 + Math.sin(phase) * 0.15;
    ctx.beginPath();
    var steps = 18;
    var r = rad + 6 + Math.sin(phase * 1.4) * 2;
    for (var i = 0; i <= steps; i++) {
      var a = (i / steps) * Math.PI * 2 + phase * 0.2;
      var rr = r * (1 + Math.sin(a * 3 + phase) * (wobble || 0.04));
      var px = Math.cos(a) * rr;
      var py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawAbilityPulse(x, y, rad, color, life) {
    if (!(life > 0)) return;
    var p = Math.max(0, Math.min(1, life / 0.55));
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, rad * 0.12);
    ctx.globalAlpha = 0.75 * p;
    ctx.beginPath();
    ctx.arc(x, y, rad + 6 + (1 - p) * rad * 1.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35 * p;
    ctx.beginPath();
    ctx.arc(x, y, rad + 2 + (1 - p) * rad * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawRegenAbilityFx(x, y, rad, t, strong) {
    drawInkAuraRing(x, y, rad, '#3ecf8e', t * 3, 0.05);
    if (strong) drawInkAuraRing(x, y, rad + 5, '#3ecf8e', t * 3 + 1.1, 0.03);
    ctx.save();
    ctx.strokeStyle = '#3ecf8e';
    ctx.fillStyle = '#3ecf8e';
    ctx.lineWidth = Math.max(1.6, rad * 0.08);
    for (var i = 0; i < 4; i++) {
      var rise = ((t * 0.9 + i * 0.22) % 1);
      var ang = t * 1.4 + i * 1.7;
      var px = x + Math.cos(ang) * (rad * 0.55);
      var py = y + rad * 0.55 - rise * rad * 1.5;
      ctx.globalAlpha = 0.85 * (1 - rise);
      ctx.beginPath();
      ctx.moveTo(px - rad * 0.12, py);
      ctx.lineTo(px + rad * 0.12, py);
      ctx.moveTo(px, py - rad * 0.12);
      ctx.lineTo(px, py + rad * 0.12);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRushAbilityFx(x, y, rad, t, enraged) {
    if (!enraged) {
      drawInkAuraRing(x, y, rad, '#ff5a36', t * 2, 0.04);
      return;
    }
    ctx.save();
    ctx.strokeStyle = '#ff5a36';
    ctx.lineWidth = Math.max(2, rad * 0.11);
    ctx.globalAlpha = 0.7 + Math.sin(t * 12) * 0.2;
    for (var s = 0; s < 4; s++) {
      var ox = -rad * (0.75 + s * 0.32) - Math.sin(t * 9 + s) * 2;
      var oy = (s - 1.5) * rad * 0.28 + Math.cos(t * 8 + s) * 2;
      ctx.beginPath();
      ctx.moveTo(x + ox, y + oy - rad * 0.22);
      ctx.lineTo(x + ox + rad * 0.42, y + oy);
      ctx.lineTo(x + ox, y + oy + rad * 0.22);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(1.4, rad * 0.07);
    ctx.beginPath();
    ctx.ellipse(x - rad * 0.15, y, rad * 1.15, rad * 0.72, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawSummonAbilityFx(x, y, rad, t) {
    ctx.save();
    ctx.fillStyle = '#f2c14e';
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = Math.max(1.2, rad * 0.06);
    for (var d = 0; d < 4; d++) {
      var da = t * 2.4 + d * (Math.PI * 2 / 4);
      var dx = x + Math.cos(da) * (rad + 11);
      var dy = y + Math.sin(da) * (rad + 11);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(dx, dy, Math.max(2.4, rad * 0.13), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = '#f2c14e';
    ctx.lineWidth = Math.max(1.5, rad * 0.07);
    ctx.beginPath();
    ctx.arc(x, y, rad + 11, t, t + Math.PI * 1.2);
    ctx.stroke();
    ctx.restore();
  }

  function drawWardAbilityFx(x, y, rad, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = Math.max(2.4, rad * 0.14);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 3 + t * 0.55;
      var rr = rad + 9 + Math.sin(t * 5 + i) * 1.4;
      var px = Math.cos(a) * rr;
      var py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = Math.max(1.4, rad * 0.08);
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(0, 0, rad + 4, 0, Math.PI * 2);
    ctx.stroke();
    for (var f = 0; f < 3; f++) {
      var fa = t * 3 + f * 2.1;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(Math.cos(fa) * (rad + 4), Math.sin(fa) * (rad + 4), Math.max(1.6, rad * 0.08), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawSplitAbilityFx(x, y, rad, t) {
    drawInkAuraRing(x, y, rad, '#c084fc', t * 2.5, 0.06);
    ctx.save();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = Math.max(1.6, rad * 0.08);
    ctx.globalAlpha = 0.55;
    for (var p = 0; p < 3; p++) {
      var pa = t * 1.8 + p * (Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.arc(x + Math.cos(pa) * (rad * 0.4), y + Math.sin(pa) * (rad * 0.4), rad * 0.42, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.7;
    for (var c = 0; c < 3; c++) {
      var ca = t * 2.2 + c * (Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ca) * (rad + 10), y + Math.sin(ca) * (rad + 10));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMendAbilityFx(x, y, rad, t, strong) {
    drawInkAuraRing(x, y, rad, '#ff8fab', t * 2.8, 0.05);
    if (strong) drawInkAuraRing(x, y, rad + 5, '#ff8fab', t * 2.8 + 1, 0.03);
    ctx.save();
    ctx.strokeStyle = '#ff8fab';
    ctx.lineWidth = Math.max(2, rad * 0.1);
    ctx.globalAlpha = 0.8;
    var pulse = 0.85 + Math.sin(t * 6) * 0.15;
    ctx.beginPath();
    ctx.moveTo(x, y - rad * 0.55 * pulse);
    ctx.lineTo(x, y + rad * 0.55 * pulse);
    ctx.moveTo(x - rad * 0.4 * pulse, y);
    ctx.lineTo(x + rad * 0.4 * pulse, y);
    ctx.stroke();
    ctx.restore();
  }

  function drawFrostAbilityFx(x, y, rad, t) {
    drawInkAuraRing(x, y, rad, '#9bd4ff', t * 2, 0.03);
    ctx.save();
    ctx.strokeStyle = '#9bd4ff';
    ctx.fillStyle = '#9bd4ff';
    ctx.lineWidth = Math.max(1.6, rad * 0.08);
    ctx.globalAlpha = 0.65 + Math.sin(t * 4) * 0.15;
    for (var c = 0; c < 6; c++) {
      var ca = c * Math.PI / 3 + t * 0.35;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ca) * (rad + 3), y + Math.sin(ca) * (rad + 3));
      ctx.lineTo(x + Math.cos(ca) * (rad + 13), y + Math.sin(ca) * (rad + 13));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(ca) * (rad + 9), y + Math.sin(ca) * (rad + 9));
      ctx.lineTo(x + Math.cos(ca + 0.25) * (rad + 7), y + Math.sin(ca + 0.25) * (rad + 7));
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawArmorAbilityFx(x, y, rad, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#8aa0b8';
    ctx.lineWidth = Math.max(2.2, rad * 0.12);
    ctx.globalAlpha = 0.78;
    inkRect(-rad - 6, -rad - 6, (rad + 6) * 2, (rad + 6) * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = Math.max(1.4, rad * 0.07);
    inkRect(-rad - 2, -rad - 2, (rad + 2) * 2, (rad + 2) * 2);
    ctx.stroke();
    for (var r = 0; r < 4; r++) {
      var ra = t * 1.5 + r * Math.PI / 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(Math.cos(ra) * (rad + 6), Math.sin(ra) * (rad + 6), Math.max(1.5, rad * 0.07), 0, Math.PI * 2);
      ctx.fillStyle = '#8aa0b8';
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRecoverGuardFx(x, y, rad, life) {
    if (!(life > 0)) return;
    var p = Math.max(0, Math.min(1, life / 0.85));
    var pulse = 0.5 + 0.5 * Math.sin(state.time * 14);
    ctx.save();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = Math.max(2.4, rad * 0.14);
    ctx.globalAlpha = (0.55 + 0.35 * pulse) * p;
    ctx.beginPath();
    ctx.arc(x, y, rad + 8 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#86efac';
    ctx.lineWidth = Math.max(1.6, rad * 0.08);
    ctx.globalAlpha = 0.45 * p;
    ctx.beginPath();
    ctx.arc(x, y, rad + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    for (var i = 0; i < 6; i++) {
      var ang = state.time * 3 + i * Math.PI / 3;
      var rr = rad + 10 + pulse * 2;
      ctx.globalAlpha = 0.8 * p;
      ctx.beginPath();
      ctx.arc(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, Math.max(1.8, rad * 0.08), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemyStatusFx(enemy, x, y, rad) {
    inkSeed = Math.round((enemy.id || 1) * 17 + rad * 3);
    var t = state.time + (enemy.id || 0) * 0.37;
    var id = enemy.bossId || '';
    var king = !!(enemy.boss || enemy.elite);
    if (enemy.recoverGuard > 0) drawRecoverGuardFx(x, y, rad, enemy.recoverGuard);
    var regenAura = id === 'regen' || ((hasHellDeff('regen') || chapterHasKit('regen')) && !enemy.boss && !enemy.elite);
    if (regenAura || (enemy.regenShow > 0 && id !== 'mend')) {
      drawRegenAbilityFx(x, y, rad, t, !!(enemy.regenShow > 0 || id === 'regen'));
    }
    if (id === 'mend' || (enemy.regenShow > 0 && id === 'mend')) {
      drawMendAbilityFx(x, y, rad, t, enemy.regenShow > 0 || enemy.abilityFxKind === 'mend');
    }
    var raging = (bossHas(enemy, 'rush') && enemy.enraged) || enemy.hellEnraged || enemy.kitRushed || state.berserk;
    var swiftDebuff = hasHellDeff('speed') && !enemy.boss;
    if (raging || swiftDebuff || (bossHas(enemy, 'rush') && !enemy.enraged)) {
      drawRushAbilityFx(x, y, rad, t, raging || !!swiftDebuff);
    }
    if (enemy.shield > 0) drawWardAbilityFx(x, y, rad, t);
    if ((bossHas(enemy, 'armor') || (chapterHasKit('armor') && !enemy.boss && !enemy.elite)) && !enemy.firePierce) {
      drawArmorAbilityFx(x, y, rad, t);
    }
    if (id === 'summon' || (king && id === 'skull' && enemy.castPose > 0)) drawSummonAbilityFx(x, y, rad, t);
    if (bossHas(enemy, 'split')) drawSplitAbilityFx(x, y, rad, t);
    if (id === 'frost') drawFrostAbilityFx(x, y, rad, t);
    if (enemy.abilityFx > 0) {
      drawAbilityPulse(x, y, rad, ABILITY_FX_COLOR[enemy.abilityFxKind] || '#161616', enemy.abilityFx);
    }
  }

  function drawEnemy(enemy) {
    var pos = enemyPos(enemy);
    var x = worldX(pos.x);
    var y = worldY(pos.y);
    var rad = Math.max(7, enemy.radius * view.tile);
    var resist = enemy.resist && RESISTS[enemy.resist] ? RESISTS[enemy.resist] : null;
    var colors = enemyBodyColors(enemy, resist);
    var bob = Math.sin(state.time * (enemy.type === 'swift' ? 11 : 7) + enemy.id * 1.7) * rad * 0.08;
    if ((enemy.freeze > 0 && !state.berserk) || enemy.recoverGuard > 0) bob = 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (enemy.flying) {
      ctx.save();
      ctx.translate(0, rad * 0.42);
      drawEnemyShadow(rad * 0.62);
      ctx.restore();
    } else {
      drawEnemyShadow(rad);
    }
    ctx.save();
    if (enemy.type === 'bone' && enemy.rise > 0) ctx.scale(1 + enemy.rise * 0.4, 1 + enemy.rise * 0.4);
    if (enemy.boss) drawBossBody(enemy, rad, colors, bob);
    else if (enemy.elite) drawEliteBody(enemy, rad, colors, bob);
    else if (enemy.type === 'shard') drawShardBody(rad, colors);
    else if (enemy.type === 'hopper') drawHopperBody(rad, colors, bob, !!enemy.jumping);
    else if (enemy.type === 'devil') drawDevilBody(rad, colors, bob);
    else if (enemy.type === 'swift') drawSwiftBody(rad, colors, bob);
    else if (enemy.type === 'brute') drawBruteBody(rad, colors, bob);
    else if (enemy.type === 'ram') drawRamBody(rad, colors, bob);
    else if (enemy.type === 'bone') drawBoneBody(rad, colors, bob, !!enemy.revived);
    else drawGruntBody(rad, colors, bob);
    ctx.restore();
    ctx.restore();
    drawEnemyStatusFx(enemy, x, y, rad);
    if (!state.berserk && enemy.freeze > 0) {
      ctx.strokeStyle = '#2f7bff';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - rad - 3, y - rad - 3, (rad + 3) * 2, (rad + 3) * 2);
    } else if (!state.berserk && enemy.stun > 0) {
      ctx.strokeStyle = '#e0b000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - rad * 0.2, y - rad - 6);
      ctx.lineTo(x + rad * 0.05, y - rad - 1);
      ctx.lineTo(x - rad * 0.05, y - rad + 3);
      ctx.lineTo(x + rad * 0.22, y - rad + 8);
      ctx.stroke();
    } else if (!state.berserk && enemy.slowTime > 0) {
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#2f7bff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, rad + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (enemy.burnTime > 0) {
      ctx.strokeStyle = '#e02323';
      ctx.lineWidth = 2;
      inkX(x + rad * 0.9, y - rad * 0.9, Math.max(3, rad * 0.28));
    }
    if (enemy.poisonTime > 0) {
      ctx.fillStyle = '#3cbf4a';
      ctx.beginPath();
      ctx.arc(x + rad * 0.75, y + rad * 0.2, Math.max(3, rad * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
    var ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    if (ratio < 0.995) {
      var bh = Math.max(3, rad * 0.2);
      var bw = rad * 1.5;
      var bx = x - bw / 2;
      var by = y + rad + Math.max(4, view.tile * 0.08);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = 1.5;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.fillStyle = ratio < 0.3 ? '#e02323' : '#161616';
      ctx.fillRect(bx, by, Math.max(0, bw * Math.max(0, ratio)), bh);
    }
    if (enemy.boss || enemy.elite) {
      ctx.font = '700 ' + Math.max(10, Math.round(view.tile * 0.22)) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = '#161616';
      ctx.strokeText(enemy.name, x, y + rad + Math.max(14, view.tile * 0.32));
      ctx.fillText(enemy.name, x, y + rad + Math.max(14, view.tile * 0.32));
    }
    if (resist) {
      ctx.font = '800 ' + Math.max(10, Math.round(view.tile * 0.2)) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = resist.color;
      var labelY = y - rad - Math.max(10, view.tile * 0.2);
      ctx.strokeText(resist.name, x, labelY);
      ctx.fillText(resist.name, x, labelY);
    }
  }

  function drawBossSymbol(id, rad) {
    var s = rad * 0.42;
    inkSetup(Math.max(2.2, rad * 0.16));
    if (id === 'regen') {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.72, 0.5, Math.PI * 1.75);
      inkStroke();
      inkLine(s * 0.15, -s * 0.85, s * 0.55, -s * 0.35, 2);
      ctx.lineTo(s * 0.05, -s * 0.2);
      inkStroke();
    } else if (id === 'rush') {
      inkLine(-s * 0.55, -s * 0.05, 0, -s * 0.7, 2);
      ctx.lineTo(s * 0.55, -s * 0.05);
      inkStroke();
      inkLine(-s * 0.55, s * 0.55, 0, -s * 0.1, 2);
      ctx.lineTo(s * 0.55, s * 0.55);
      inkStroke();
    } else if (id === 'summon') {
      var dots = [[0, -s * 0.45], [-s * 0.48, s * 0.32], [s * 0.48, s * 0.32]];
      for (var i = 0; i < dots.length; i++) {
        inkCircle(dots[i][0], dots[i][1], s * 0.22, 10);
        ctx.fill();
        inkStroke();
      }
    } else if (id === 'ward') {
      ctx.beginPath();
      ctx.moveTo(inkJitter(1, 0.3), -s);
      ctx.lineTo(s * 0.78, -s * 0.45);
      ctx.lineTo(s * 0.78, s * 0.15);
      ctx.quadraticCurveTo(0, s * 1.15, -s * 0.78, s * 0.15);
      ctx.lineTo(-s * 0.78, -s * 0.45);
      ctx.closePath();
      inkStroke();
    } else if (id === 'split') {
      var parts = [[0, -s * 0.42], [-s * 0.46, s * 0.34], [s * 0.46, s * 0.34]];
      for (var p = 0; p < parts.length; p++) {
        inkCircle(parts[p][0], parts[p][1], s * 0.28, 10);
        inkStroke();
      }
    } else if (id === 'mend') {
      inkLine(0, -s * 0.75, 0, s * 0.75, 3);
      inkStroke();
      inkLine(-s * 0.75, 0, s * 0.75, 0, 3);
      inkStroke();
    } else if (id === 'frost') {
      for (var a = 0; a < 3; a++) {
        var ang = a * Math.PI / 3;
        inkLine(Math.cos(ang) * s, Math.sin(ang) * s, -Math.cos(ang) * s, -Math.sin(ang) * s, 3);
        inkStroke();
      }
    } else {
      inkRect(-s * 0.62, -s * 0.62, s * 1.24, s * 1.24);
      inkStroke();
      inkRect(-s * 0.32, -s * 0.32, s * 0.64, s * 0.64);
      inkStroke();
    }
  }

  function drawBossMark(enemy, x, y, rad) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.moveTo(-rad * 0.62, -rad * 0.7);
    ctx.lineTo(-rad * 0.4, -rad * 1.15);
    ctx.lineTo(-rad * 0.16, -rad * 0.7);
    ctx.lineTo(0, -rad * 1.28);
    ctx.lineTo(rad * 0.16, -rad * 0.7);
    ctx.lineTo(rad * 0.4, -rad * 1.15);
    ctx.lineTo(rad * 0.62, -rad * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.8 + Math.sin((enemy.pulse || 0) * 4) * 0.15;
    ctx.strokeStyle = enemy.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, rad + 5, 0, Math.PI * 2);
    ctx.stroke();
    if (enemy.shield > 0) {
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, rad + 9, -1.1, 1.1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBeams() {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var a = 0; a < state.arcs.length; a++) {
      var arc = state.arcs[a];
      var x1 = worldX(arc.x1);
      var y1 = worldY(arc.y1);
      var x2 = worldX(arc.x2);
      var y2 = worldY(arc.y2);
      ctx.globalAlpha = Math.max(0.5, arc.life / arc.maxLife);
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = Math.max(4.2, view.tile * 0.09);
      strokeBolt(x1, y1, x2, y2);
      ctx.strokeStyle = '#ffe14a';
      ctx.lineWidth = Math.max(2.4, view.tile * 0.055);
      strokeBolt(x1, y1, x2, y2);
    }
    ctx.restore();
  }

  function strokeBolt(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len;
    var ny = dx / len;
    var steps = Math.max(3, Math.round(len / 16));
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      var jag = (i % 2 ? 1 : -1) * Math.min(10, view.tile * 0.1);
      ctx.lineTo(x1 + dx * t + nx * jag, y1 + dy * t + ny * jag);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawProjectiles() {
    for (var i = 0; i < state.projectiles.length; i++) {
      var shot = state.projectiles[i];
      if (shot.dead) continue;
      if (shot.kind === 'arrow') drawArrowShot(shot);
      else if (shot.kind === 'slash') drawSlash(shot);
      else if (shot.kind === 'cut') drawCut(shot);
      else if (shot.kind === 'killslash') drawKillSlash(shot);
      else if (shot.kind === 'wave') drawWave(shot);
      else if (shot.kind === 'poison') drawPoisonShot(shot);
      else drawShell(shot);
    }
  }

  function drawArrowShot(shot) {
    ctx.save();
    ctx.translate(worldX(shot.x), worldY(shot.y));
    ctx.rotate(shot.angle || 0);
    inkSeed = Math.round((shot.x || 0) * 40 + (shot.y || 0) * 17);
    inkSetup(Math.max(2.2, view.tile * 0.05));
    markArrow(view.tile * 0.14);
    ctx.restore();
  }

  function drawWave(shot) {
    var radius = Math.max(2, shot.radius * view.tile);
    var x = worldX(shot.x);
    var y = worldY(shot.y);
    ctx.save();
    inkSeed = Math.round((shot.x || 0) * 21 + (shot.y || 0) * 13);
    ctx.translate(x, y);
    ctx.strokeStyle = shot.color || '#2f7bff';
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = Math.max(7, view.tile * 0.14);
    inkCircle(0, 0, radius, 20);
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = Math.max(2.2, view.tile * 0.045);
    inkStroke();
    ctx.lineWidth = Math.max(2, view.tile * 0.04);
    markSnowflake(Math.max(4, view.tile * 0.1));
    ctx.restore();
  }

  function drawPoisonShot(shot) {
    var s = Math.max(5, view.tile * 0.11);
    ctx.save();
    ctx.translate(worldX(shot.x), worldY(shot.y));
    ctx.rotate(shot.angle || 0);
    inkSeed = Math.round((shot.x || 0) * 33 + (shot.y || 0) * 19);
    inkSetup(Math.max(1.8, view.tile * 0.035));
    ctx.fillStyle = shot.color || '#3cbf4a';
    markDroplet(s);
    ctx.fill();
    inkStroke();
    ctx.restore();
  }

  function drawShell(shot) {
    var remain = Math.hypot(shot.tx - shot.x, shot.ty - shot.y);
    var t = 1 - remain / (shot.total || 1);
    var lift = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * view.tile * 0.28;
    var x = worldX(shot.x);
    var y = worldY(shot.y) - lift;
    var s = Math.max(shot.bomb ? 5 : 3.5, view.tile * (shot.bomb ? 0.12 : 0.08));
    ctx.save();
    ctx.translate(x, y);
    inkSeed = Math.round((shot.x || 0) * 29 + (shot.y || 0) * 11);
    inkSetup(Math.max(1.8, view.tile * 0.035));
    if (shot.bomb) {
      ctx.fillStyle = shot.color || '#e02323';
      markFlame(s);
      ctx.fill();
      inkStroke();
    } else {
      ctx.fillStyle = shot.color || '#161616';
      inkCircle(0, 0, s, 12);
      ctx.fill();
      inkStroke();
    }
    ctx.restore();
  }

  function drawShocks() {
    ctx.save();
    for (var i = 0; i < state.shocks.length; i++) {
      var shock = state.shocks[i];
      var k = 1 - shock.life / shock.maxLife;
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = shock.color || '#ffb15a';
      ctx.lineWidth = shock.bomb ? 4 : 3;
      if (shock.bomb) {
        ctx.fillStyle = shock.color || '#e02323';
        ctx.globalAlpha = (1 - k) * 0.3;
        ctx.beginPath();
        ctx.arc(worldX(shock.x), worldY(shock.y), shock.radius * view.tile * Math.max(0.28, k), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1 - k;
      }
      var rings = shock.rings || 1;
      for (var ring = 0; ring < rings; ring++) {
        var rk = Math.max(0.12, k - ring * 0.18);
        ctx.beginPath();
        ctx.arc(worldX(shock.x), worldY(shock.y), shock.radius * view.tile * rk, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawParticles() {
    ctx.save();
    for (var i = 0; i < state.particles.length; i++) {
      var particle = state.particles[i];
      ctx.globalAlpha = Math.max(0, particle.life / particle.max);
      ctx.fillStyle = particle.color;
      var size = particle.size * view.tile;
      var px = worldX(particle.x);
      var py = worldY(particle.y);
      if (particle.shard) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(particle.ang || 0);
        ctx.strokeStyle = '#161616';
        ctx.lineWidth = Math.max(1.2, size * 0.18);
        ctx.beginPath();
        ctx.moveTo(0, -size * 0.7);
        ctx.lineTo(size * 0.55, size * 0.45);
        ctx.lineTo(-size * 0.55, size * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }
    }
    ctx.restore();
  }

  function drawFloaters() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 ' + Math.max(11, Math.round(view.tile * 0.28)) + 'px ' + FONT;
    for (var i = 0; i < state.floaters.length; i++) {
      var floater = state.floaters[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, floater.life * 1.6));
      ctx.fillStyle = floater.color;
      ctx.fillText(floater.text, worldX(floater.x), worldY(floater.y));
    }
    ctx.restore();
  }

  function drawHurt() {
    if (state.hurt <= 0) return;
    ctx.fillStyle = 'rgba(255, 70, 80, ' + (state.hurt * 0.35) + ')';
    ctx.fillRect(0, 0, view.w, view.h);
  }

  function drawBanner() {
    if (!state.banner) return;
    var alpha = Math.max(0, Math.min(1, state.banner.life));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#161616';
    ctx.font = '800 ' + Math.max(22, Math.round(view.tile * 0.72)) + 'px ' + FONT;
    var y = view.originY + view.tile * 2.3;
    ctx.strokeText(state.banner.text, view.w / 2, y);
    ctx.fillText(state.banner.text, view.w / 2, y);
    ctx.font = '600 ' + Math.max(12, Math.round(view.tile * 0.3)) + 'px ' + FONT;
    ctx.strokeText(state.banner.sub, view.w / 2, y + view.tile * 0.55);
    ctx.fillText(state.banner.sub, view.w / 2, y + view.tile * 0.55);
    ctx.restore();
  }

  function drawHint(text) {
    ctx.save();
    ctx.font = '700 ' + Math.max(12, Math.round(view.tile * 0.3)) + 'px ' + FONT;
    var width = Math.min(view.w - 28, ctx.measureText(text).width + 28);
    var x = (view.w - width) / 2;
    var y = view.originY + view.tile * 4.15;
    ctx.fillStyle = '#fff';
    roundRect(x, y, width, 32, 16);
    ctx.fill();
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#161616';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, view.w / 2, y + 16);
    ctx.restore();
  }

  function canvasPoint(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (view.w / rect.width),
      y: (clientY - rect.top) * (view.h / rect.height),
    };
  }

  function cellAt(x, y) {
    var c = Math.floor((x - view.originX) / view.tile);
    var r = Math.floor((y - view.originY) / view.tile);
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return null;
    return { c: c, r: r };
  }

  function waveClockLabel() {
    if (state.berserk) return '狂暴';
    var left = Math.max(0, Math.ceil(120 - (state.waveTime || 0)));
    var min = Math.floor(left / 60);
    var sec = left % 60;
    return min + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function tapHitsTower(point, cell) {
    if (cell && towerAt(cell.c, cell.r)) return true;
    return !!heroAtPoint(point.x, point.y);
  }

  function dismissBuildMenu() {
    if (!state.buildSite) return false;
    state.buildSite = null;
    state.buildMenu = 'root';
    return true;
  }

  function handleTap(clientX, clientY) {
    if (modal.classList.contains('is-open') || state.adBusy) return;
    if (state.phase === 'gameover' || state.phase === 'menu') return;
    if ((state.phase === 'reward' || state.phase === 'victory') && !countdownBuildOpen()) return;
    Sfx.unlock();
    var point = canvasPoint(clientX, clientY);
    var menu = buildMenuLayout();
    if (menu) {
      for (var i = 0; i < menu.buttons.length; i++) {
        if (pointInRect(point.x, point.y, menu.buttons[i])) {
          placeChosen(menu.buttons[i].type);
          return;
        }
      }
      // 點選單空白或畫面其他地方就收起，不要一直佔著
      dismissBuildMenu();
      if (pointInRect(point.x, point.y, menu)) {
        Sfx.ui();
        renderInspector();
        return;
      }
    }
    var cell = cellAt(point.x, point.y);
    if (!cell) {
      clearSelection();
      return;
    }
    if (state.selectedId && !tapHitsTower(point, cell)) {
      var placing = state.pickMode === 'fog' || state.pickMode === 'wall' || state.pickMode === 'heroPlace';
      clearSelection();
      if (!placing) return;
    }
    if (state.pickMode && handlePick(cell)) return;
    var existing = towerAt(cell.c, cell.r);
    if (existing) {
      state.editTool = null;
      selectTower(existing);
      syncRouteBar();
      Sfx.ui();
      return;
    }
    var wandering = heroAtPoint(point.x, point.y);
    if (wandering && wandering.hero === 'sword') {
      state.editTool = null;
      selectTower(wandering);
      syncRouteBar();
      Sfx.ui();
      return;
    }
    if (isAltarCell(cell.c, cell.r)) {
      openAltar();
      Sfx.ui();
      return;
    }
    if (state.phase === 'edit' && state.editTool) {
      state.buildSite = null;
      routeEditTap(cell);
      return;
    }
    if ((state.phase === 'prep' || state.phase === 'combat' || state.phase === 'edit' || countdownBuildOpen()) && !isPath(cell.c, cell.r)) {
      toggleBuildSite(cell.c, cell.r);
      return;
    }
    if (isPath(cell.c, cell.r) && state.phase !== 'edit') {
      state.buildSite = null;
      flashCell(cell.c, cell.r, false);
      toast('道路上不能建造');
      Sfx.bad();
      renderInspector();
      return;
    }
    clearSelection();
  }

  function heroAtPoint(px, py) {
    var best = null;
    var bestD = view.tile * 0.62;
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
      if (tower.type !== 'hero') continue;
      var hx = tower.c + 0.5;
      var hy = tower.r + 0.5;
      if (tower.hero === 'sword' && tower.fx != null) {
        hx = tower.fx;
        hy = tower.fy;
      }
      var dist = Math.hypot(worldX(hx) - px, worldY(hy) - py);
      if (dist < bestD) {
        bestD = dist;
        best = tower;
      }
    }
    return best;
  }

  function bindUi() {
    document.addEventListener('pointerdown', function () { Sfx.unlock(); }, { passive: true });
    document.addEventListener('gesturestart', function (event) { event.preventDefault(); }, { passive: false });
    document.addEventListener('selectstart', function (event) { event.preventDefault(); });
    document.addEventListener('contextmenu', function (event) { event.preventDefault(); });
    document.addEventListener('touchmove', function (event) {
      if (event.touches && event.touches.length > 1) event.preventDefault();
    }, { passive: false });

    canvas.addEventListener('pointerdown', function (event) {
      if (pointer) return;
      var point = canvasPoint(event.clientX, event.clientY);
      var hero = heroAtPoint(point.x, point.y);
      pointer = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        heroId: hero ? hero.id : 0,
        origin: hero ? { c: hero.c, r: hero.r } : null,
        moved: false,
      };
    });
    canvas.addEventListener('pointermove', function (event) {
      var point = canvasPoint(event.clientX, event.clientY);
      state.hover = cellAt(point.x, point.y);
      if (!pointer || pointer.id !== event.pointerId || !pointer.heroId) return;
      var dx = event.clientX - pointer.x;
      var dy = event.clientY - pointer.y;
      if (dx * dx + dy * dy > 64) pointer.moved = true;
      if (!pointer.moved) return;
      var hero = towerById(pointer.heroId);
      var cell = state.hover;
      if (!hero || !cell || !canDropHero(cell, hero)) return;
      hero.c = cell.c;
      hero.r = cell.r;
      if (hero.hero === 'sword') {
        hero.fx = cell.c + 0.5;
        hero.fy = cell.r + 0.5;
      }
    });
    canvas.addEventListener('pointerleave', function () { state.hover = null; });
    canvas.addEventListener('pointerup', function (event) {
      if (!pointer || pointer.id !== event.pointerId) return;
      var start = pointer;
      pointer = null;
      if (start.moved && start.heroId) {
        var hero = towerById(start.heroId);
        var point = canvasPoint(event.clientX, event.clientY);
        var cell = cellAt(point.x, point.y);
        if (hero && (!cell || !canDropHero(cell, hero))) {
          hero.c = start.origin.c;
          hero.r = start.origin.r;
          if (hero.hero === 'sword') {
            hero.fx = hero.c + 0.5;
            hero.fy = hero.r + 0.5;
          }
          toast('這裡不能放');
          Sfx.bad();
        } else if (hero) {
          selectTower(hero);
          toast('已移動' + heroName(hero.hero));
          Sfx.ui();
        }
        return;
      }
      var dx = event.clientX - start.x;
      var dy = event.clientY - start.y;
      if (dx * dx + dy * dy > 400) return;
      handleTap(event.clientX, event.clientY);
    });
    canvas.addEventListener('pointercancel', function () { pointer = null; });

    waveBtn.addEventListener('click', function () {
      if (state.adBusy) return;
      if (state.hellWheel) return;
      dismissBuildMenu();
      if (state.pickMode === 'level' || state.pickMode === 'heroPlace') {
        toast('先完成卡牌選擇');
        return;
      }
      if (state.clearCountdown > 0 && (state.phase === 'reward' || state.phase === 'victory')) {
        skipClearCountdown();
        return;
      }
      if (state.phase === 'prep') requestStartWave(state.wave + 1);
      else if (state.phase === 'edit') finishEdit();
    });
    var hellSpinBtn = document.getElementById('hell-wheel-spin');
    var hellOkBtn = document.getElementById('hell-wheel-ok');
    if (hellSpinBtn) hellSpinBtn.addEventListener('click', spinHellWheelOnce);
    if (hellOkBtn) hellOkBtn.addEventListener('click', closeHellWheel);
    itemWallBtn.addEventListener('click', function () {
      if (state.items.wall <= 0) return;
      if (state.pickMode === 'level' || state.pickMode === 'heroPlace') {
        toast('先完成卡牌選擇');
        return;
      }
      if (state.phase !== 'prep' && state.phase !== 'combat' && state.phase !== 'edit' && !countdownBuildOpen()) return;
      dismissBuildMenu();
      state.pickMode = 'wall';
      state.banner = { text: '阻擋物', sub: '點道路，擋住怪物 10 秒', life: 4 };
      toast('點在道路上');
    });
    itemPushBtn.addEventListener('click', function () {
      dismissBuildMenu();
      usePush();
    });
    routeBar.addEventListener('click', function (event) {
      var tile = event.target.closest('[data-tile]');
      if (!tile || tile.disabled) return;
      selectTile(tile.getAttribute('data-tile'));
    });
    var welcomeStart = document.getElementById('btn-welcome-start');
    var welcomeAccount = document.getElementById('btn-welcome-account');
    var welcomeGuest = document.getElementById('btn-welcome-guest');
    var accountChip = document.getElementById('account-chip');
    var openIndexBtn = document.getElementById('btn-open-index');
    var menuBack = document.getElementById('btn-menu-back');
    var indexBack = document.getElementById('btn-index-back');
    var indexTabs = document.getElementById('index-tabs');
    var openBoardBtn = document.getElementById('btn-open-board');
    var openFriendsBtn = document.getElementById('btn-open-friends');
    var openAuraBtn = document.getElementById('btn-open-aura');
    var auraBack = document.getElementById('btn-aura-back');
    var friendsBack = document.getElementById('btn-friends-back');
    var addFriendBtn = document.getElementById('btn-add-friend');
    var copyCodeBtn = document.getElementById('btn-copy-code');
    var playerCard = document.getElementById('player-card');
    var boardBack = document.getElementById('btn-board-back');
    if (welcomeStart) welcomeStart.addEventListener('click', function () {
      Sfx.unlock();
      showMenu();
      Bgm.sync();
      openPatchNotes();
    });
    if (welcomeAccount) welcomeAccount.addEventListener('click', beginGoogleSignIn);
    if (welcomeGuest) welcomeGuest.addEventListener('click', beginGuestSignIn);
    if (accountChip) accountChip.addEventListener('click', openAccountCard);
    paintAccount();
    if (openIndexBtn) openIndexBtn.addEventListener('click', function () { showIndex('codex'); });
    if (menuBack) menuBack.addEventListener('click', showWelcome);
    if (indexBack) indexBack.addEventListener('click', showMenu);
    if (indexTabs) indexTabs.addEventListener('click', function (event) {
      var tab = event.target.closest('[data-index]');
      if (!tab) return;
      showIndex(tab.getAttribute('data-index'));
    });
    if (openBoardBtn) openBoardBtn.addEventListener('click', openBoard);
    if (openFriendsBtn) openFriendsBtn.addEventListener('click', openFriends);
    var openSettingsBtn = document.getElementById('btn-open-settings');
    if (openSettingsBtn) openSettingsBtn.addEventListener('click', function () { Sfx.ui(); openSettings(); });
    if (openAuraBtn) openAuraBtn.addEventListener('click', openAuraPreview);
    if (auraBack) auraBack.addEventListener('click', showMenu);
    if (friendsBack) friendsBack.addEventListener('click', showMenu);
    if (addFriendBtn) addFriendBtn.addEventListener('click', addFriend);
    if (copyCodeBtn) copyCodeBtn.addEventListener('click', copyFriendCode);
    if (playerCard) playerCard.addEventListener('click', function () {
      if (loadAccount()) openAccountCard();
      else toast('請先在歡迎頁登入');
    });
    if (boardBack) boardBack.addEventListener('click', showMenu);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    document.getElementById('btn-mode-campaign').addEventListener('click', showMenu);
    document.getElementById('home-stars').addEventListener('click', function (event) {
      event.stopPropagation();
      homeGoalsOpen = !homeGoalsOpen;
      paintHomeGoals(ensureHomePick());
    });
    document.getElementById('home-goals').addEventListener('click', function (event) {
      event.stopPropagation();
    });
    document.addEventListener('click', function () {
      if (!homeGoalsOpen) return;
      homeGoalsOpen = false;
      paintHomeGoals(ensureHomePick());
    });
    document.getElementById('btn-home-start').addEventListener('click', function () {
      var stage = ensureHomePick();
      if (!stageUnlocked(stage)) {
        toast('這關還沒解鎖');
        return;
      }
      startRun('campaign', stage.stageId);
    });
    document.getElementById('home-prev').addEventListener('click', function () {
      var stage = ensureHomePick();
      var id = Math.max(1, stage.chapter - 1);
      var pick = stageById(id + '-1');
      homePick = { chapter: pick.chapter, index: pick.index };
      paintPlayHome();
    });
    document.getElementById('home-next').addEventListener('click', function () {
      var stage = ensureHomePick();
      var id = Math.min(CHAPTERS.length, stage.chapter + 1);
      var pick = stageById(id + '-1');
      homePick = { chapter: pick.chapter, index: pick.index };
      paintPlayHome();
    });
    document.getElementById('home-stages').addEventListener('click', function (event) {
      var btn = event.target.closest('[data-stage]');
      if (!btn || btn.disabled) return;
      var stage = stageById(btn.getAttribute('data-stage'));
      if (!stage) return;
      homePick = { chapter: stage.chapter, index: stage.index };
      paintPlayHome();
    });
    document.getElementById('btn-mode-custom').addEventListener('click', function () { openDifficulty('custom'); });
    document.getElementById('btn-mode-infinite').addEventListener('click', function () { openDifficulty('infinite'); });
    document.getElementById('btn-difficulty-back').addEventListener('click', showMenu);
    backBtn.addEventListener('click', requestMenu);
    inspectActions.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      var act = btn.dataset.act;
      if (act === 'upgrade') upgradeSelected();
      else if (act === 'spec') specialize(btn.dataset.spec);
      else if (act === 'skill') {
        castHeroSkill(selectedTower());
        state.selectedId = null;
        state.sellArmed = false;
        renderInspector();
        syncHud();
      }
      else if (act === 'sell') sellSelected();
      else if (act === 'sell-cancel') {
        state.sellArmed = false;
        renderInspector();
      }
    });
    speedBtn.addEventListener('click', cycleSpeed);
    if (bgmBtn) {
      bgmBtn.addEventListener('click', function () {
        setBgmMuted(!Bgm.muted);
      });
    }
    if (soundBtn) {
      soundBtn.addEventListener('click', function () {
        setSfxMuted(!Sfx.muted);
      });
    }
    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (state.userPaused || (state.phase !== 'menu' && !modal.classList.contains('is-open'))) togglePause();
        else clearSelection();
        return;
      }
      if (event.target.closest && event.target.closest('button')) return;
      if ((event.key === ' ' || event.key === 'Enter') && state.phase === 'prep' && !state.pickMode && !state.adBusy && !state.hellWheel && screenMenu.hidden && screenDifficulty.hidden) {
        event.preventDefault();
        requestStartWave(state.wave + 1);
      } else if (event.key === '1') placeChosen('basic');
      else if (event.key === '2') placeChosen('poison');
      else if (event.key === '3') placeChosen('fire');
      else if (event.key === '4') placeChosen('ice');
      else if (event.key === '5') placeChosen('bolt');
      else if (event.key === '6') placeChosen('mint');
    });
    document.addEventListener('visibilitychange', function () { lastTs = 0; });
    window.addEventListener('resize', fitViewport);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', fitViewport);
      window.visualViewport.addEventListener('scroll', fitViewport);
    }
    if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  }

  function frame(now) {
    try {
      if (!lastTs) lastTs = now;
      var dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      if (!document.hidden) {
        var rate = playRate();
        if (!state.paused) {
          for (var step = 0; step < rate; step++) update(dt);
          if (state.phase === 'combat') {
            state.waveTime = (state.waveTime || 0) + dt;
            if (state.waveTime >= 120) beginBerserk();
          }
        }
        updateCosmetic(dt * rate);
        syncHud();
        syncRouteBar();
        if (Sfx.ctx && !Bgm.muted) Bgm.sync();
      } else if (Bgm.key) {
        Bgm.stop();
      }
      render();
    } catch (error) {
      console.error(error);
    }
    requestAnimationFrame(frame);
  }

  function requestMenu() {
    if (state.phase === 'menu') {
      showWelcome();
      return;
    }
    if (state.mode === 'campaign') {
      openModal({
        tone: 'over',
        kicker: '返回',
        title: '離開這一關？',
        desc: '這一局的進度不會保留。星星只在通關時計入。',
        actions: [
          { label: '返回關卡選擇', className: 'btn-mint', onClick: function () { closeModal(); openStages(state.chapter); } },
          { label: '回到主選單', className: 'btn-ghost', onClick: function () { closeModal(); showWelcome(); } },
          { label: '繼續', className: 'btn-ghost', onClick: closeModal },
        ],
      });
      return;
    }
    if (state.phase === 'combat' || state.phase === 'edit') {
      openModal({
        tone: 'over',
        kicker: '返回',
        title: '回到選單？',
        desc: '這一局的進度不會保留。',
        actions: [
          { label: '回到選單', className: 'btn-mint', onClick: function () { closeModal(); showWelcome(); } },
          { label: '繼續', className: 'btn-ghost', onClick: closeModal },
        ],
      });
      return;
    }
    showWelcome();
  }

  function loadSheets(done) {
    done();
  }

  function boot() {
    bindUi();
    setRoute(buildInfinitePath());
    fitViewport();
    showWelcome();
    syncSpeedButton();
    syncSoundButton();
    initCloud();
    ensureWeek();
    window.setInterval(ensureWeek, 30000);
    Ads.init().catch(function () {});
    loadSheets(function () { requestAnimationFrame(frame); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
