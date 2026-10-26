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

  // Crops are pixels of the 1024×571 sheets. Ice has no separate 5th frame
  // and fire only has the final hell-tower, so those ranks reuse the closest art.
  var SPRITE_MAP = {
    regen: { sx: 20, sy: 58, sw: 124, sh: 90 },
    rush: { sx: 160, sy: 54, sw: 114, sh: 88 },
    summon: { sx: 282, sy: 50, sw: 108, sh: 100 },
    ward: { sx: 396, sy: 48, sw: 130, sh: 100 },
    split: { sx: 20, sy: 188, sw: 124, sh: 84 },
    mend: { sx: 160, sy: 184, sw: 112, sh: 90 },
    frost: { sx: 282, sy: 178, sw: 136, sh: 100 },
    armor: { sx: 436, sy: 172, sw: 96, sh: 104 },
    arrow1: { sx: 36, sy: 374, sw: 54, sh: 24 },
    arrow2: { sx: 109, sy: 374, sw: 56, sh: 24 },
    cannon1: { sx: 327, sy: 374, sw: 54, sh: 24 },
    cannon2: { sx: 412, sy: 376, sw: 58, sh: 22 },
    heavy3: { sx: 36, sy: 454, sw: 54, sh: 22 },
    heavy4: { sx: 108, sy: 452, sw: 62, sh: 24 },
    heavy5: { sx: 186, sy: 446, sw: 94, sh: 32 },
    twin3: { sx: 28, sy: 518, sw: 62, sh: 22 },
    twin4: { sx: 104, sy: 516, sw: 64, sh: 24 },
    twin5: { sx: 192, sy: 508, sw: 94, sh: 28 },
    ice3: { sx: 334, sy: 446, sw: 66, sh: 28 },
    ice4: { sx: 414, sy: 450, sw: 70, sh: 26 },
    fire5: { sx: 500, sy: 442, sw: 88, sh: 28 },
    stone3: { sx: 318, sy: 516, sw: 64, sh: 22 },
    stone4: { sx: 398, sy: 514, sw: 70, sh: 24 },
    stone5: { sx: 516, sy: 508, sw: 108, sh: 34 },
    vert: { sx: 708, sy: 100, sw: 32, sh: 56 },
    horiz: { sx: 872, sy: 246, sw: 72, sh: 26 },
    cornerUL: { sx: 840, sy: 384, sw: 72, sh: 42 },
    cornerUR: { sx: 926, sy: 384, sw: 72, sh: 42 },
    cornerDL: { sx: 696, sy: 472, sw: 72, sh: 52 },
    cornerDR: { sx: 786, sy: 472, sw: 72, sh: 52 },
    portal: { sx: 852, sy: 492, sw: 66, sh: 52 },
    chest: { sx: 936, sy: 492, sw: 74, sh: 50 },
  };

  var UI_MAP = {
    floor: { sx: 772, sy: 382, sw: 100, sh: 96 },
  };

  var gameSheet = new Image();
  var uiSheet = new Image();
  var envSheet = new Image();
  var minionSheet = new Image();
  var towerSheets = [new Image(), new Image(), new Image(), new Image(), new Image()];
  var pathSheet = new Image();
  var castBoss = new Image();
  var castMinion = new Image();
  var fieldSheet = new Image();
  var groundCh1 = new Image();
  var uiMain = new Image();
  var spritesReady = false;
  var uiReady = false;
  var envReady = false;
  var minionReady = false;
  var towerArtReady = false;
  var pathReady = false;
  var castReady = false;
  var castMinionReady = false;
  var fieldReady = false;
  var groundCh1Ready = false;
  var towerStampCache = {};
  var pathStampCache = {};
  var castStampCache = {};

  var THEME_LOCAL = {
    ground: { dx: 36, dy: 176, sw: 72, sh: 60 },
    road: { dx: 34, dy: 72, sw: 76, sh: 64 },
    bend: { dx: 148, dy: 72, sw: 76, sh: 64 },
    goal: { dx: 148, dy: 184, sw: 72, sh: 58 },
  };

  var ELEMENT_TYPES = ['poison', 'fire', 'ice', 'bolt'];

  var TOWERS = {
    basic: {
      name: '無屬性塔',
      blurb: '3 等分支為箭塔或砲塔',
      cost: 40,
      color: '#9aa69a',
      category: 'neutral',
      upgradeCost: [35, 60, 95, 135, 180],
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
      upgradeCost: [55, 85, 120, 160, 210],
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
      upgradeCost: [60, 95, 135, 180, 230],
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
      upgradeCost: [55, 90, 130, 175, 220],
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
      blurb: '一發串連跳電 · 打多隻',
      cost: 85,
      color: '#e0b000',
      category: 'element',
      upgradeCost: [55, 90, 130, 175, 220],
      levels: [
        { damage: 24, range: 2.45, cooldown: 0.72, splash: 0, targets: 1, chain: 2, chainRange: 1.75 },
        { damage: 32, range: 2.5, cooldown: 0.64, splash: 0, targets: 1, chain: 2, chainRange: 1.85 },
        { damage: 42, range: 2.55, cooldown: 0.56, splash: 0, targets: 1, chain: 3, chainRange: 1.9 },
        { damage: 54, range: 2.6, cooldown: 0.5, splash: 0, targets: 1, chain: 3, chainRange: 2.0 },
        { damage: 68, range: 2.65, cooldown: 0.44, splash: 0, targets: 1, chain: 4, chainRange: 2.05 },
        { damage: 84, range: 2.7, cooldown: 0.38, splash: 0, targets: 1, chain: 4, chainRange: 2.15 },
      ],
    },
    mint: {
      name: '產錢塔',
      blurb: '不攻擊 · 定期產出金幣',
      cost: 70,
      color: '#f2c14e',
      category: 'economy',
      upgradeCost: [50, 80, 115, 155, 200],
      levels: [
        { damage: 0, range: 0, cooldown: 5.0, goldGen: 6 },
        { damage: 0, range: 0, cooldown: 4.6, goldGen: 8 },
        { damage: 0, range: 0, cooldown: 4.2, goldGen: 11 },
        { damage: 0, range: 0, cooldown: 3.8, goldGen: 14 },
        { damage: 0, range: 0, cooldown: 3.4, goldGen: 18 },
        { damage: 0, range: 0, cooldown: 3.0, goldGen: 22 },
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
  var pauseBtn = document.getElementById('btn-pause');
  var screenWelcome = document.getElementById('screen-welcome');
  var screenCodex = document.getElementById('screen-codex');
  var screenTowersInfo = document.getElementById('screen-towers');
  var screenHell = document.getElementById('screen-hell');
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
  var screenChapters = document.getElementById('screen-chapters');
  var screenStages = document.getElementById('screen-stages');
  var screenDifficulty = document.getElementById('screen-difficulty');
  var difficultyList = document.getElementById('difficulty-list');
  var chapterList = document.getElementById('chapter-list');
  var stageTrack = document.getElementById('stage-track');
  var stageKicker = document.getElementById('stage-kicker');
  var stageTitle = document.getElementById('stage-title');
  var stageNote = document.getElementById('stage-note');
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
  var WAYPOINTS = [];

  var state = {
    gold: START_GOLD,
    lives: START_LIVES,
    shownLives: START_LIVES,
    wave: 0,
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
    speed: 1,
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
  var muteToast = false;
  var lastVibrate = 0;
  var lastTs = 0;

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

  function loadStars() {
    try {
      var raw = JSON.parse(localStorage.getItem('fantasy_td_stars') || '{}');
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
      return raw;
    } catch (error) { return {}; }
  }

  function saveStars() {
    try { localStorage.setItem('fantasy_td_stars', JSON.stringify(state.stars)); } catch (error) { /* ignore */ }
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
  ];

  var MINION_PAIRS = [
    [
      { id: 'slime', name: '綠史萊姆', color: '#3dcf62', frame: { sx: 14, sy: 74, sw: 98, sh: 58 } },
      { id: 'crawler', name: '沼澤爬行者', color: '#7dce4a', frame: { sx: 128, sy: 72, sw: 114, sh: 60 } },
    ],
    [
      { id: 'goblin', name: '小哥布林', color: '#8fd14a', frame: { sx: 258, sy: 72, sw: 112, sh: 60 } },
      { id: 'pup', name: '狂暴幼狼', color: '#d5d5de', frame: { sx: 392, sy: 72, sw: 118, sh: 60 } },
    ],
    [
      { id: 'skel', name: '骷髏步兵', color: '#efe6d6', frame: { sx: 520, sy: 72, sw: 100, sh: 60 } },
      { id: 'soul', name: '幽魂火球', color: '#c084fc', frame: { sx: 638, sy: 66, sw: 120, sh: 64 } },
    ],
    [
      { id: 'tort', name: '晶礦陸龜', color: '#5ec8f0', frame: { sx: 520, sy: 188, sw: 110, sh: 68 } },
      { id: 'imp', name: '持盾小鬼', color: '#e7a15a', frame: { sx: 648, sy: 188, sw: 110, sh: 68 } },
    ],
    [
      { id: 'mini', name: '小史萊姆', color: '#c084fc', frame: { sx: 14, sy: 338, sw: 88, sh: 56 } },
      { id: 'mucus', name: '黏液跳躍者', color: '#8fd14a', frame: { sx: 128, sy: 326, sw: 114, sh: 68 } },
    ],
    [
      { id: 'acolyte', name: '異教徒學徒', color: '#e6c75a', frame: { sx: 260, sy: 324, sw: 120, sh: 70 } },
      { id: 'wisp', name: '療癒光球', color: '#ffe08a', frame: { sx: 392, sy: 320, sw: 110, sh: 62 } },
    ],
    [
      { id: 'frost', name: '小冰魂', color: '#b9e6ff', frame: { sx: 782, sy: 72, sw: 90, sh: 60 } },
      { id: 'ice', name: '極地冰蟻', color: '#7ec8ff', frame: { sx: 900, sy: 68, sw: 110, sh: 64 } },
    ],
    [
      { id: 'beetle', name: '發甲甲殼蟲', color: '#b7aa9a', frame: { sx: 782, sy: 196, sw: 100, sh: 58 } },
      { id: 'golem', name: '廢鐵小魔像', color: '#d9c7a6', frame: { sx: 898, sy: 184, sw: 96, sh: 74 } },
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
      var beat = Math.max(1, Math.ceil((w / count) * 10));
      var grunts = 4 + beat + (chapter >= 5 ? 1 : 0);
      var swifts = 1;
      if (stage >= 2 && beat >= 2) swifts += Math.floor(beat / 3);
      if (stage >= 4 && beat >= 4) swifts += 1;
      var brutes = 0;
      if (!boss && stage >= 3 && w % 5 === 0) brutes = 1;
      if (!boss && chapter >= 6 && stage >= 4 && w === count - 1) brutes += 1;
      waves.push({ grunts: grunts, swifts: swifts, brutes: brutes, boss: boss });
    }
    return waves;
  }

  function buildStages() {
    var list = [];
    for (var c = 1; c <= 8; c++) {
      for (var s = 1; s <= 5; s++) {
        var path = nudgePath(PATH_BANK[(s - 1 + c - 1) % PATH_BANK.length], (c % 3) - 1);
        list.push({
          stageId: c + '-' + s,
          chapter: c,
          index: s,
          name: STAGE_TITLES[s - 1],
          path: path,
          waves: buildWaves(c, s),
          initialGold: 60 + (c - 1) * 8 + (s - 1) * 6,
          hpScale: Math.round((1 + (c - 1) * 0.07 + (s - 1) * 0.02) * 100) / 100,
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
    if (!PATH_JUMPS.length || enemy.jumpCd > 0 || enemy.jumping || enemy.freeze > 0) return;
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
    if (state.mode !== 'campaign' || !state.stagePlan) return wave;
    return Math.min(wave, 4) + (state.stagePlan.chapter - 1) * 0.8 + (state.stagePlan.index - 1) * 0.35;
  }

  function bossForWave(wave) {
    if (!isBossWave(wave)) return null;
    return BOSSES[bossIndexFor(wave) % BOSSES.length];
  }

  function planFromSpec(spec, wave) {
    var gap = Math.max(0.55, 1.05 - (wave - 1) * 0.04);
    var jobs = [];
    var grunts = spec.grunts;
    var swifts = spec.swifts;
    var placed = 0;
    var every = Math.max(2, Math.floor(grunts / (swifts + 1)));
    for (var i = 0; i < grunts; i++) {
      if (placed < swifts && i > 0 && i % every === 0) {
        jobs.push({ type: 'swift', gap: gap * 0.72 });
        placed += 1;
      }
      jobs.push({ type: 'grunt', gap: gap });
    }
    while (placed < swifts) {
      jobs.push({ type: 'swift', gap: gap * 0.72 });
      placed += 1;
    }
    for (var b = 0; b < spec.brutes; b++) jobs.push({ type: 'brute', gap: 1.15 });
    var boss = null;
    if (spec.boss) {
      boss = BOSSES[bossIndexFor(wave) % BOSSES.length];
      jobs.push({ type: 'boss', gap: 1.7, bossIndex: bossIndexFor(wave) });
    }
    return { jobs: jobs, grunts: grunts, swifts: swifts, brutes: spec.brutes, boss: boss };
  }

  var INFINITE_PROFILES = {
    normal: {
      id: 'normal', name: '普通',
      blurb: '血量與數量適中，擊殺金幣稍少。起始 100 金、20 生命。',
      hp: 1.18, growth: 1.185, speed: 1.03, speedGrow: 0.034, speedCap: 1.52,
      gold: 0.92, gap: 0.95, gapMin: 0.52, extra: 0, rush: 0.1,
      lives: 20, purse: 100, swiftFrom: 3, swiftEvery: 3, bruteEvery: 5,
    },
    hell: {
      id: 'hell', name: '地獄',
      blurb: '基礎更高。另有地獄詞綴：1–9 波隨機 1 則（半效），之後每 10 波重抽 2 則。起始 100 金、14 生命。',
      hp: 1.68, growth: 1.295, speed: 1.16, speedGrow: 0.05, speedCap: 2.0,
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
    if (!hellModeActive()) {
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
    if (!hellModeActive()) return false;
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
    if (plan.boss) return plan;
    var idx = Math.floor(Math.random() * BOSSES.length);
    plan.boss = BOSSES[idx];
    plan.jobs = plan.jobs ? plan.jobs.slice() : [];
    plan.jobs.splice(Math.min(2, plan.jobs.length), 0, { type: 'boss', gap: 1.2, bossIndex: idx });
    return plan;
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
    if (!enemy || !hellModeActive() || enemy.skipHellStats || enemy.hellBuffed) return enemy;
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
      for (var h = 0; h < hoppers; h++) jobs.push({ type: 'hopper', gap: Math.max(1.35, gap * 2.2) });
    }
    var devils = 0;
    if (wave >= 8) {
      devils = 1 + Math.floor((wave - 8) / 10);
      if (diff.id === 'hell' && wave >= 14) devils += 1;
      devils = Math.min(diff.id === 'hell' ? 3 : 2, devils);
      for (var d = 0; d < devils; d++) jobs.push({ type: 'devil', gap: Math.max(1.2, gap * 1.8) });
    }
    var brutes = 0;
    var boss = bossForWave(wave);
    if (boss) {
      if (diff.id === 'hell' && wave >= 20) {
        jobs.push({ type: 'brute', gap: 0.9 });
        brutes += 1;
      }
      var bossJob = { type: 'boss', gap: 1.2, bossIndex: bossIndexFor(wave) };
      if (diff.id === 'hell') jobs.splice(Math.min(3, jobs.length), 0, bossJob);
      else jobs.push(bossJob);
    } else if (wave % diff.bruteEvery === 0) {
      var pack = 1;
      if (diff.id === 'hell' && wave >= 15) pack = 2;
      for (var b = 0; b < pack; b++) jobs.push({ type: 'brute', gap: 1.05 });
      brutes += pack;
    }
    return { jobs: jobs, grunts: gruntCount, swifts: swifts, brutes: brutes, hoppers: hoppers, devils: devils, boss: boss };
  }

  function planWave(wave) {
    if (state.mode === 'campaign' && state.stagePlan) {
      var spec = state.stagePlan.waves[wave - 1];
      if (spec) return planFromSpec(spec, wave);
    }
    if (state.mode === 'infinite' || (state.mode === 'custom' && state.difficulty === 'hell')) return planInfiniteWave(wave);
    var gap = Math.max(0.52, 0.98 - (wave - 1) * 0.042);
    var gruntCount = 6 + wave;
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
      for (var h = 0; h < hoppers; h++) jobs.push({ type: 'hopper', gap: Math.max(1.4, gap * 2.1) });
    }
    var devils = 0;
    if (wave >= 8) {
      devils = Math.min(2, 1 + Math.floor((wave - 8) / 11));
      for (var d = 0; d < devils; d++) jobs.push({ type: 'devil', gap: Math.max(1.25, gap * 1.85) });
    }
    var brutes = 0;
    var boss = bossForWave(wave);
    if (boss) {
      jobs.push({ type: 'boss', gap: 1.7, bossIndex: bossIndexFor(wave) });
    } else if (wave % 5 === 0) {
      jobs.push({ type: 'brute', gap: 1.15 });
      brutes = 1;
    }
    return { jobs: jobs, grunts: gruntCount, swifts: swifts, brutes: brutes, hoppers: hoppers, devils: devils, boss: boss };
  }

  function compositionText(plan) {
    if (state.mode !== 'campaign') {
      var count = plan.grunts + plan.swifts + plan.brutes + (plan.hoppers || 0) + (plan.devils || 0);
      var text = '隨機小怪 ' + count;
      if (plan.hoppers) text += ' · 跳躍 ' + plan.hoppers;
      if (plan.devils) text += ' · 惡魔 ' + plan.devils;
      if (plan.brutes) text += ' · 精英 ' + plan.brutes;
      if (plan.boss) text += ' · ' + plan.boss.name;
      return text;
    }
    var pair = chapterPair(state.chapter);
    var parts = [pair[0].name + ' ' + plan.grunts];
    if (plan.swifts) parts.push(pair[1].name + ' ' + plan.swifts);
    if (plan.brutes) parts.push(pair[0].name + '精英 ' + plan.brutes);
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
    } else if (state.mode === 'custom') {
      growth = 1.2;
      hpMul *= 1.15;
      speedMul = 1.06;
      goldMul = 0.9;
      speedGrow = 0.038;
      speedCap = 1.55;
    }
    var gruntHp = Math.round(32 * Math.pow(growth, scaledWave - 1) * hpMul);
    var gruntSpeed = Math.min(speedCap, (1.0 + (scaledWave - 1) * speedGrow) * speedMul);
    var softWaveGold = wave <= 20 ? wave : Math.round(20 + (wave - 20) * 0.4);
    var table = {
      grunt: { hp: gruntHp, speed: gruntSpeed, gold: Math.max(2, softWaveGold), radius: 0.3, color: '#e25b4a', leak: 1 },
      swift: { hp: Math.round(gruntHp * 0.62), speed: Math.min(diff ? speedCap + 0.45 : 2.1, gruntSpeed * 1.55), gold: Math.max(2, softWaveGold - 1), radius: 0.23, color: '#f0a202', leak: 1 },
      hopper: { hp: Math.round(gruntHp * 0.8), speed: Math.min((diff ? speedCap : 1.7) + 0.15, gruntSpeed * 1.25), gold: Math.max(3, softWaveGold + 1), radius: 0.26, color: '#4ec6e8', leak: 1 },
      devil: { hp: Math.round(gruntHp * 0.95), speed: Math.min((diff ? speedCap : 1.7) + 0.2, gruntSpeed * 1.2), gold: Math.max(4, softWaveGold + 2), radius: 0.28, color: '#c62828', leak: 1 },
      brute: { hp: Math.round(gruntHp * 7.5), speed: gruntSpeed * 0.52, gold: 8 + softWaveGold * 2, radius: 0.44, color: '#8d6bff', leak: 3 },
    };
    var spec = table[type] || table.grunt;
    if (goldMul !== 1) spec.gold = Math.max(2, Math.round(spec.gold * goldMul));
    var kind = type === 'hopper'
      ? { id: 'hopper', name: '跳躍怪', color: '#4ec6e8' }
      : (type === 'devil'
        ? { id: 'devil', name: '小惡魔', color: '#c62828' }
        : pickMinion(type === 'swift' ? 'swift' : 'grunt'));
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
      hexCd: type === 'devil' ? 1.6 + Math.random() * 0.8 : 0,
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
    var bossMul = 9.5 + Math.min(wave, 40) * 0.18;
    if (diff && diff.id === 'hell') bossMul = 5.4 + Math.min(wave, 40) * 0.1;
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

  function queueEnemy(enemy) {
    applyHellSpawnStats(enemy);
    state.pendingSpawns.push(enemy);
  }

  function flushSpawns() {
    if (!state.pendingSpawns.length) return;
    for (var i = 0; i < state.pendingSpawns.length; i++) state.enemies.push(state.pendingSpawns[i]);
    state.pendingSpawns = [];
  }

  function markBest(wave) {
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

  function toast(message) {
    if (muteToast) return;
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

  function spawnFloater(x, y, text, color) {
    state.floaters.push({ x: x, y: y, text: text, color: color, life: 0.75, vy: -0.85 });
    if (state.floaters.length > 36) state.floaters.shift();
  }

  function startWave(n) {
    Sfx.unlock();
    if (state.interestLeft > 0) {
      state.gold += 30;
      state.interestLeft -= 1;
      toast('利息 +30');
    }
    var refreshed = hellModeActive() && (n === 1 || n % 10 === 0);
    syncHellDeffs(n);
    var plan = applyHellBossDeff(planWave(n));
    state.wave = n;
    state.phase = 'combat';
    state.paused = false;
    state.waveGoldEarned = 0;
    state.waveDoubled = false;
    state.waveGiftDone = false;
    state.spawnQueue = plan.jobs.slice();
    state.spawnTimer = 0.55;
    var deffText = hellDeffLabel();
    if (refreshed && deffText) toast('地獄詞綴 · ' + deffText);
    state.banner = plan.boss
      ? { text: '第 ' + n + ' 波 · ' + plan.boss.name, sub: deffText || plan.boss.blurb, life: 3.2 }
      : { text: '第 ' + n + ' 波', sub: deffText || compositionText(plan), life: 2.2 };
    if (state.mode === 'infinite') markBest(n);
    if (plan.boss) Sfx.boss();
    else Sfx.fanfare();
    syncHud();
  }

  function update(dt) {
    if (state.phase !== 'combat') return;
    updateSpawns(dt);
    updateWalls(dt);
    updateEnemies(dt);
    tickHellLock(dt);
    updateTowers(dt);
    updateGusts(dt);
    updateFogs(dt);
    updateMeteor(dt);
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
    var spawned = job.type === 'boss' ? makeBoss(job.bossIndex, state.wave) : makeEnemy(job.type, state.wave);
    applyHellSpawnStats(spawned);
    state.enemies.push(spawned);
    state.spawnTimer = state.spawnQueue.length ? state.spawnQueue[0].gap : 0;
  }

  function updateEnemies(dt) {
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead || state.phase !== 'combat') continue;
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
      triggerTrap(enemy);
      if (enemy.freeze > 0) enemy.freeze -= dt;
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
        }
      }
      var regenRate = hellDeffValue('regen');
      if (regenRate > 0 && enemy.hp < enemy.maxHp) {
        if (healBlocked(enemy)) {
          triggerPoisonCounter(enemy);
        } else {
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * regenRate * dt);
        }
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

  function isHealRegenEnemy(enemy) {
    return !!(enemy && (enemy.bossId === 'regen' || enemy.bossId === 'mend'));
  }

  function isPoisonCounterTarget(enemy) {
    return !!(enemy && (isHealRegenEnemy(enemy) || hasHellDeff('regen')));
  }

  function isFireCounterTarget(enemy) {
    return !!(enemy && (enemy.shield > 0 || enemy.bossId === 'armor' || hasHellDeff('thick')));
  }

  function triggerPoisonCounter(enemy) {
    if (!enemy || enemy.dead) return;
    var fresh = !enemy.poisonRuin;
    enemy.poisonRuin = true;
    enemy.poisonRuinRate = 0.03;
    enemy.poisonRuinTime = Math.max(enemy.poisonRuinTime || 0, 4.5);
    if (fresh) {
      var pos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
      spawnFloater(pos.x, pos.y - 0.7, hasHellDeff('regen') && !isHealRegenEnemy(enemy) ? '克制回血' : '毒蝕', '#3cbf4a');
    }
  }

  function triggerFireCounter(enemy) {
    if (!enemy || enemy.dead) return;
    if (enemy.fireCounterAt && state.time - enemy.fireCounterAt < 0.85) {
      if (enemy.shield > 0) {
        enemy.shield = 0;
        var early = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
        spawnFloater(early.x, early.y - 0.55, '破盾', '#e02323');
        shatterShieldFx(early.x, early.y);
      }
      return;
    }
    enemy.fireCounterAt = state.time;
    var pos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
    var triggered = false;
    if (enemy.shield > 0) {
      enemy.shield = 0;
      triggered = true;
      spawnFloater(pos.x, pos.y - 0.55, '破盾', '#e02323');
      shatterShieldFx(pos.x, pos.y);
    }
    if (enemy.bossId === 'armor') {
      enemy.firePierce = true;
      triggered = true;
      spawnFloater(pos.x, pos.y - 0.75, '破甲', '#e02323');
    }
    if (hasHellDeff('thick')) {
      triggered = true;
      spawnFloater(pos.x, pos.y - 0.95, '克制厚皮', '#e02323');
    }
    if (!triggered) return;
    var pct = Math.max(1, Math.round(enemy.maxHp * 0.1));
    hurtEnemy(enemy, pct, null, { pierce: true, ignoreShield: true });
  }

  function healBlocked(enemy) {
    return !!(enemy && (enemy.poisonTime > 0 || enemy.poisonRuin || enemy.fogTime > 0));
  }

  function tickBoss(enemy, dt) {
    enemy.pulse += dt;
    var pos = pointAt(enemy.dist);
    if (enemy.bossId === 'regen') {
      if (healBlocked(enemy)) {
        if (enemy.poisonTime > 0 || enemy.poisonRuin) triggerPoisonCounter(enemy);
        enemy.regenShow = (enemy.regenShow || 0) - dt;
      } else {
        var before = enemy.hp;
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.025 * dt);
        enemy.regenShow = (enemy.regenShow || 0) - dt;
        if (enemy.hp > before && enemy.hp < enemy.maxHp && enemy.regenShow <= 0) {
          enemy.regenShow = 1.15;
          spawnFloater(pos.x, pos.y - 0.6, '回復', '#3ecf8e');
        }
      }
    } else if (enemy.bossId === 'rush') {
      if (!enemy.enraged && enemy.hp <= enemy.maxHp * 0.5) {
        enemy.enraged = true;
        enemy.speed = enemy.baseSpeed * 2.2;
        spawnFloater(pos.x, pos.y - 0.6, '狂暴', '#ff5a36');
      }
    } else if (enemy.bossId === 'summon') {
      enemy.abilityTimer -= dt;
      if (enemy.abilityTimer <= 0 && state.enemies.length + state.pendingSpawns.length < 28) {
        enemy.abilityTimer = 4.4;
        var minion = makeEnemy('grunt', state.wave);
        minion.dist = Math.max(0, enemy.dist - 0.45);
        queueEnemy(minion);
        spawnFloater(pos.x, pos.y - 0.6, '召喚', '#f2c14e');
      }
    } else if (enemy.bossId === 'ward') {
      enemy.abilityTimer -= dt;
      if (enemy.abilityTimer <= 0 && enemy.shield <= 0) {
        enemy.abilityTimer = 7;
        enemy.shield = Math.round(enemy.maxHp * 0.2);
        spawnFloater(pos.x, pos.y - 0.6, '護盾', '#67e8f9');
      }
    } else if (enemy.bossId === 'frost') {
      enemy.abilityTimer -= dt;
      if (enemy.abilityTimer <= 0) {
        enemy.abilityTimer = 5.4;
        for (var t = 0; t < state.towers.length; t++) {
          state.towers[t].cooldown += 1.05;
          state.towers[t].chill = 0.85;
        }
        spawnFloater(pos.x, pos.y - 0.6, '冰封', '#9bd4ff');
        burst(pos.x, pos.y, '#9bd4ff', 12);
      }
    } else if (enemy.bossId === 'mend') {
      enemy.mendAcc += dt;
      if (enemy.mendAcc < 0.5) return;
      enemy.mendAcc = 0;
      if (healBlocked(enemy)) {
        if (enemy.poisonTime > 0 || enemy.poisonRuin) triggerPoisonCounter(enemy);
        return;
      }
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
        var heal = Math.min(other.maxHp - other.hp, enemy.mendPower);
        other.hp += heal;
        if (state.time - (other.lastMend || 0) > 0.9) {
          other.lastMend = state.time;
          spawnFloater(otherPos.x, otherPos.y - 0.35, '+' + heal, '#ff8fab');
        }
      }
    }
  }

  function tickDevilHex(enemy, dt) {
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
    copy.damage = Math.max(1, Math.round(copy.damage * 1.4));
    if (copy.range) copy.range = Math.round(copy.range * 1.4 * 100) / 100;
    if (copy.splash) copy.splash = Math.round(copy.splash * 1.4 * 100) / 100;
    if (copy.chainRange) copy.chainRange = Math.round(copy.chainRange * 1.4 * 100) / 100;
    if (copy.poison) copy.poison = Math.max(1, Math.round(copy.poison * 1.4));
    if (copy.burn) copy.burn = Math.max(1, Math.round(copy.burn * 1.4));
    if (copy.goldGen) copy.goldGen = Math.max(1, Math.round(copy.goldGen * 1.4));
    return copy;
  }

  function towerStats(tower) {
    var def = TOWERS[tower.type];
    var stats;
    if (def.specs) {
      stats = tower.level < 2 || !tower.spec
        ? def.levels[Math.min(def.levels.length - 1, tower.level)]
        : def.specs[tower.spec].levels[Math.min(def.specs[tower.spec].levels.length - 1, tower.level - 2)];
    } else {
      stats = def.levels[Math.min(def.levels.length - 1, tower.level)];
    }
    if (tower.level >= 5) stats = rankBoost(stats);
    return applySupport(stats, tower);
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

  function towerMaxed(tower) {
    return tower.level >= 4;
  }

  function nextUpgradeCost(tower) {
    if (tower.type === 'hero' || towerMaxed(tower)) return 0;
    return TOWERS[tower.type].upgradeCost[tower.level];
  }

  function heroName(id) {
    if (id === 'sword') return '緋紅劍客';
    if (id === 'archer') return '叢林獵手';
    if (id === 'mage') return '萬象法師';
    if (id === 'priest') return '戰靈樂手';
    return '英雄';
  }

  function heroSkillName(id) {
    if (id === 'sword') return '修羅附體';
    if (id === 'archer') return '致命毒霧';
    if (id === 'mage') return '隕石術';
    if (id === 'priest') return '致命節奏';
    return '技能';
  }

  function priestAura(tower) {
    var radius = 2.15 + tower.level * (2.45 / 9);
    var bonus = 0.08 + tower.level * (0.14 / 9);
    var haste = 0.06 + tower.level * (0.12 / 9);
    var tempo = 0.028 + tower.level * (0.036 / 9);
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
    if (tower.hero === 'priest') {
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
    if (tower.hero !== 'priest') stats = applySupport(stats, tower);
    return stats;
  }

  function heroBlurb(tower) {
    var need = tower.level >= 9 ? 0 : 6 + tower.level * 4;
    var xp = tower.level >= 9 ? '已滿等' : ('經驗 ' + tower.xp + '/' + need);
    if (tower.hero === 'sword') return '走到射程內的路上追砍，刀路傷敵。每三下半月劍氣。主動：修羅附體。' + xp;
    if (tower.hero === 'archer') return '超遠單箭，打穿護盾、鐵甲並打掉抗性。主動：致命毒霧。' + xp;
    if (tower.hero === 'mage') return '火破盾、冰緩速、風擊退。主動：隕石術，全圖持續。' + xp;
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
      if (resists(enemy, 'freeze')) resistFloater(enemy, '抗凍');
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
    var hpPct = asura ? (0.0045 + tower.level * 0.0005) : 0;
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
        if (resists(chilled[n], 'slow')) resistFloater(chilled[n], '抗緩');
        else {
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
    return !!(enemy && (enemy.shield > 0 || enemy.bossId === 'armor' || enemy.bossId === 'ward' || enemy.resist || hasHellDeff('thick')));
  }

  function hunterStrike(enemy, tower, damage) {
    var opts = { pierce: true, ignoreShield: true };
    var amount = damage;
    if (hunterGuarded(enemy)) {
      amount = Math.max(damage, enemy.maxHp * (0.05 + tower.level * 0.004));
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
    if (tower.hero === 'priest') return;
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
        pct: 0.012 + (lv / 9) * 0.014,
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
    if (!(wave > 0)) return false;
    var m = wave % 10;
    return m === 3 || m === 6 || m === 9;
  }

  function cardPool() {
    return [
      { id: 'gold', name: '金幣 +200', desc: '立刻獲得 200 金幣' },
      { id: 'interest', name: '利息', desc: '立刻 +50，接下來 5 波每波 +30' },
      { id: 'level', name: '塔升級', desc: '選一座塔永久 +1 等。金幣最高 5 等，只有這張卡可升到 6 等（數值×1.4）' },
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
    requestStartWave(cleared + 1);
  }

  function applyLevelCard(tower) {
    if (tower.type === 'hero') { toast('英雄靠擊殺升級'); return false; }
    if (tower.level >= 5) { toast('這座塔已是 6 等'); return false; }
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

  function placeHero(cell, invested) {
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
    return [
      { id: 'sword', name: '緋紅劍客', desc: '追砍刀路，三下半月劍氣。1000 金' },
      { id: 'archer', name: '叢林獵手', desc: '超遠貫甲，毒霧禁療。1000 金' },
      { id: 'mage', name: '萬象法師', desc: '火破盾、冰緩、風退。1000 金' },
      { id: 'priest', name: '戰靈樂手', desc: '光環加攻與攻速。1000 金' },
    ];
  }

  function openAltar() {
    var classes = heroCatalog().filter(function (hero) { return !hasHeroId(hero.id); });
    if (!classes.length) { toast('四位英雄都在場上'); return; }
    openModal({
      tone: 'reward',
      kicker: '祭壇',
      title: '召喚英雄',
      desc: '每位 1000 金幣，同一種只能有一隻。登場後可拖曳換位。',
      actions: classes.map(function (hero) {
        return {
          label: hero.name + '　' + hero.desc,
          className: state.gold < HERO_COST ? 'btn-ghost' : 'btn-mint',
          onClick: function () { summonHero(hero.id); },
        };
      }),
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
        pct: 0.025 + hero.level * 0.003,
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
    var classes = heroCatalog().filter(function (hero) { return !hasHeroId(hero.id); });
    if (!classes.length) { toast('四位英雄都在場上'); return; }
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

  function shuffleInPlace(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function pickCardChoices(count, exceptIds) {
    var ban = {};
    (exceptIds || []).forEach(function (id) { ban[id] = true; });
    var pool = cardPool().filter(function (card) { return !ban[card.id]; });
    if (pool.length < count) pool = cardPool().slice();
    shuffleInPlace(pool);
    var picks = [];
    var seen = {};
    for (var i = 0; i < pool.length && picks.length < count; i++) {
      if (seen[pool[i].id]) continue;
      seen[pool[i].id] = true;
      picks.push(pool[i]);
    }
    while (picks.length < count) picks.push(pickRandomCard());
    return picks;
  }

  function showRandomCardModal() {
    var choices = state.pendingChoices;
    if (!choices || !choices.length) return;
    openModal({
      tone: 'reward',
      kicker: '第 ' + state.cardWave + ' 波',
      title: '三選一',
      desc: '選一張帶走。' + (state.cardRerolled ? '' : '不滿意可看廣告重抽三張。'),
      actions: choices.map(function (card) {
        return {
          label: card.name + '　' + card.desc,
          className: 'btn-mint',
          onClick: function () { chooseCard(card.id); },
        };
      }).concat(state.cardRerolled ? [] : [{
        label: '觀看廣告重抽三張',
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
    state.pendingChoices = pickCardChoices(3);
    state.pendingCard = state.pendingChoices[0];
    showRandomCardModal();
  }

  function rerollCardAd() {
    if (state.adBusy || state.cardRerolled || !state.pendingChoices) return;
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
      var oldIds = state.pendingChoices.map(function (card) { return card.id; });
      state.pendingChoices = pickCardChoices(3, oldIds);
      state.pendingCard = state.pendingChoices[0];
      Sfx.unlock();
      Sfx.ui();
      toast('已重抽三張');
      showRandomCardModal();
    });
  }

  function needsSpec(tower) {
    var def = TOWERS[tower.type];
    return !!(def && def.specs && tower.level === 1 && !tower.spec);
  }

  function moveSpeed(enemy) {
    if (enemy.freeze > 0) return 0;
    var speed = enemy.speed;
    if (enemy.slowTime > 0) speed *= 1 - (enemy.slow || 0);
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

  function launchShell(tower, enemy, stats, look, volleyId) {
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
      artSheet: look.sheet,
      artRow: look.row,
    });
  }

  function fire(tower, targets, stats) {
    var originX = tower.c + 0.5;
    var originY = tower.r + 0.5;
    tower.flash = 1;
    var look = towerLook(tower);
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
        hurtEnemy(chain[c], stats.damage, tower.id);
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
          artSheet: look.sheet,
          artRow: look.row,
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
      for (var s = 0; s < shots; s++) launchShell(tower, targets[s], stats, look, volleyId);
      Sfx.cannon();
      vibrate(16);
      return;
    }
    if (tower.type === 'fire') {
      var fireVolley = state.nextId++;
      state.splashLedger[fireVolley] = {};
      launchShell(tower, targets[0], stats, look, fireVolley);
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
      artSheet: shot.artSheet,
      artRow: shot.artRow,
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
    var pierceArmor = opts.pierce || enemy.firePierce || (enemy.burnTime > 0 && enemy.bossId === 'armor');
    if (enemy.bossId === 'armor' && !pierceArmor) damage = Math.max(1, Math.round(damage * 0.5));
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

  function killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    if (enemy.bossId === 'split') {
      for (var s = 0; s < 3; s++) {
        var shard = makeEnemy('swift', state.wave);
        shard.type = 'shard';
        shard.hp = enemy.splitHp;
        shard.maxHp = enemy.splitHp;
        shard.color = '#e4c6ff';
        shard.radius = 0.26;
        shard.gold = 5 + state.wave;
        shard.leak = 1;
        shard.resist = '';
        shard.noSplit = true;
        shard.dist = Math.max(0, Math.min(enemy.dist + (s - 1) * 0.22, WAYPOINTS.length - 1.05));
        queueEnemy(shard);
      }
      var splitPos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
      spawnFloater(splitPos.x, splitPos.y - 0.5, '分裂', '#c084fc');
    }
    var hellSplit = hellDeffValue('split');
    if (hellSplit > 0 && !enemy.boss && !enemy.noSplit && enemy.type !== 'shard') {
      var childType = enemy.type === 'hopper' || enemy.type === 'brute' || enemy.type === 'devil' ? 'grunt' : (enemy.type || 'grunt');
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
    var title = kind === 'victory' ? '關卡通過' : ('第 ' + state.wave + ' 波守住了');
    var sub = kind === 'victory'
      ? (nextStage(state.stagePlan) && stageUnlocked(nextStage(state.stagePlan)) ? '5 秒後下一關' : '5 秒後返回關卡')
      : (state.mode === 'custom' && state.wave % 10 === 0
        ? '5 秒後改道（可點提前）'
        : (cardWaveDue(state.wave) ? '5 秒後三選一（可點提前）' : '5 秒後下一波（可點提前）'));
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
        state.banner.sub = (upcoming && stageUnlocked(upcoming) ? '下一關 ' : '返回關卡 ') + left + '（可點提前）';
      } else if (state.mode === 'custom' && state.wave % 10 === 0) state.banner.sub = '改道 ' + left + '（可點提前）';
      else if (cardWaveDue(state.wave)) state.banner.sub = '三選一 ' + left + '（可點提前）';
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
      state.banner.sub = '還有 ' + left + ' 秒 · 可點隨機填入或完成';
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
      var stars = earnedStars();
      var prev = state.stars[state.level] || 0;
      if (stars > prev) {
        state.stars[state.level] = stars;
        saveStars();
      }
      beginClearCountdown('victory');
      if (state.banner) state.banner.text = starGlyph(stars) + ' 通過';
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

  function earnedStars() {
    var stars = 1;
    if (state.lifeLost <= 0) stars = 3;
    else if (state.lifeLost <= 10) stars = 2;
    if (state.reviveUsed) stars = 1;
    return stars;
  }

  function starGlyph(n) {
    var text = '';
    for (var i = 0; i < 3; i++) text += i < n ? '★' : '☆';
    return text;
  }

  function onGameOver() {
    if (state.phase === 'gameover') return;
    state.phase = 'gameover';
    state.paused = true;
    Sfx.gameOver();
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
    if (state.mode === 'custom' && state.wave % 10 === 0) text += ' · 先改道再三選一';
    else if (cardWaveDue(state.wave)) text += ' · 三選一';
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
      placeHero(cell);
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
    if (state.mode === 'custom' && cleared % 10 === 0) enterEdit();
    else if (cardWaveDue(cleared)) openCardDraft(cleared);
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
    var stars = earnedStars();
    var prev = state.stars[state.level] || 0;
    if (stars > prev) {
      state.stars[state.level] = stars;
      saveStars();
    }
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
      ? '本局使用了復活廣告，最高 1 星。'
      : '未使用復活：0 傷三星，受傷 10 點以內兩星。';
    openModal({
      tone: 'reward',
      kicker: '關卡通過',
      title: starGlyph(stars) + '  ' + state.level,
      desc: state.chapterName + ' ' + state.levelName + ' 守住了。基地受傷 ' + state.lifeLost + ' 點。' + starNote,
      actions: actions,
    });
  }

  function openModal(options) {
    modal.classList.remove('is-over', 'is-reward');
    modal.classList.add(options.tone === 'over' ? 'is-over' : 'is-reward');
    modalKicker.textContent = options.kicker;
    modalTitle.textContent = options.title;
    modalDesc.textContent = options.desc;
    modalActions.replaceChildren();
    options.actions.forEach(function (action) {
      modalActions.appendChild(actionButton(action));
    });
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modal.classList.remove('is-open', 'is-over', 'is-reward');
    modal.setAttribute('aria-hidden', 'true');
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
    btn.appendChild(document.createTextNode(action.label));
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
    state.editCountdown = 20;
    state.banner = {
      text: '修改路線',
      sub: '還有 20 秒 · 可點隨機填入或完成',
      life: 20.2,
      countdown: true,
    };
    toast('先排路：可手動點格，或按隨機彎／直／全部。塔不能搬，出售返還 8 成');
    renderInspector();
    syncHud();
    syncRouteBar();
  }

  function finishEdit() {
    if (state.phase !== 'edit') return;
    state.editTool = null;
    state.editCountdown = 0;
    state.banner = null;
    syncRouteBar();
    if (cardWaveDue(state.wave)) openCardDraft(state.wave);
    else requestStartWave(state.wave + 1);
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

  function uniqueCells(list) {
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var key = list[i].c + ',' + list[i].r;
      if (seen[key]) continue;
      seen[key] = true;
      out.push(list[i]);
    }
    return out;
  }

  function routeAddCandidates(kind) {
    var prev = state.editTool;
    state.editTool = kind;
    var marks = routeMarks().filter(function (mark) { return mark.kind === 'add'; });
    state.editTool = prev;
    return uniqueCells(marks);
  }

  function tryAutoPlace(kind) {
    var cands = routeAddCandidates(kind);
    if (!cands.length) return false;
    shuffleInPlace(cands);
    var before = kind === 'turn' ? state.tiles.turn : state.tiles.straight;
    if (before <= 0) return false;
    for (var i = 0; i < cands.length; i++) {
      var ok = kind === 'turn'
        ? applyTurn(cands[i])
        : (applyStraight(cands[i]) || shiftStraight(cands[i]));
      var after = kind === 'turn' ? state.tiles.turn : state.tiles.straight;
      if (ok && after < before) return true;
    }
    return false;
  }

  function autoFillRoute(mode) {
    if (state.phase !== 'edit') return;
    var usedTurn = 0;
    var usedStraight = 0;
    muteToast = true;
    var guard = 64;
    while (guard-- > 0) {
      var options = [];
      if ((mode === 'turn' || mode === 'all') && state.tiles.turn > 0) options.push('turn');
      if ((mode === 'straight' || mode === 'all') && state.tiles.straight > 0) options.push('straight');
      if (!options.length) break;
      shuffleInPlace(options);
      var placed = false;
      for (var o = 0; o < options.length; o++) {
        if (!tryAutoPlace(options[o])) continue;
        if (options[o] === 'turn') usedTurn += 1;
        else usedStraight += 1;
        placed = true;
        break;
      }
      if (!placed) break;
    }
    muteToast = false;
    var total = usedTurn + usedStraight;
    if (!total) {
      toast('目前沒有可鋪的位置');
      Sfx.bad();
    } else {
      var parts = [];
      if (usedTurn) parts.push('轉彎 ×' + usedTurn);
      if (usedStraight) parts.push('直線 ×' + usedStraight);
      toast('隨機填入：' + parts.join(' · '));
      Sfx.build();
    }
    syncRouteBar();
    syncHud();
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
    var autos = routeBar.querySelectorAll('[data-autofill]');
    for (var a = 0; a < autos.length; a++) autos[a].disabled = !editing;
    routeHint.textContent = editing
      ? '限時改道：手動點格，或按隨機彎／直／全部。排完按完成改道，再三選一。'
      : '每 5 波隨機 +3 張，每 10 波先改道再三選一';
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
    if (screenCodex) screenCodex.hidden = true;
    if (screenTowersInfo) screenTowersInfo.hidden = true;
    if (screenHell) screenHell.hidden = true;
    screenMenu.hidden = true;
    screenChapters.hidden = true;
    screenStages.hidden = true;
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
      g.translate(48, 50);
      inkSetup(2.8);
      if (spec.kind === 'enemy') {
        var enemy = {
          type: spec.type || 'grunt',
          color: spec.color || '#e25b4a',
          boss: !!spec.bossId,
          bossId: spec.bossId || '',
          resist: spec.resist || '',
        };
        var resist = enemy.resist && RESISTS[enemy.resist] ? RESISTS[enemy.resist] : null;
        var colors = enemyBodyColors(enemy, resist);
        var rad = spec.bossId ? 30 : 26;
        if (spec.bossId) {
          enemy.boss = true;
          drawBossBody(enemy, rad, colors, 0);
        } else if (spec.type === 'hopper') drawHopperBody(rad, colors, 0, false);
        else if (spec.type === 'devil') drawDevilBody(rad, colors, 0);
        else if (spec.type === 'swift') drawSwiftBody(rad, colors, 0);
        else if (spec.type === 'brute') drawBruteBody(rad, colors, 0);
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

  function showWelcome() {
    state.phase = 'menu';
    state.paused = true;
    state.editTool = null;
    closeModal();
    hideStoryScreens();
    if (screenDifficulty) screenDifficulty.hidden = true;
    if (screenStages) screenStages.hidden = true;
    if (screenWelcome) screenWelcome.hidden = false;
    syncRouteBar();
  }

  function showMenu() {
    state.phase = 'menu';
    state.paused = true;
    state.editTool = null;
    closeModal();
    hideStoryScreens();
    if (screenDifficulty) screenDifficulty.hidden = true;
    if (screenStages) screenStages.hidden = true;
    screenMenu.hidden = false;
    syncRouteBar();
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
        desc: '蝙蝠俠標誌風蝙蝠，翅膀會扇動，擅長衝線。',
        stats: [
          '<strong>血量</strong>：普通怪 ×0.62',
          '<strong>移速</strong>：普通怪 ×1.55（較快）',
          '<strong>金幣</strong>：略低於普通怪',
          '<strong>漏關</strong>：扣 1 生命',
        ],
      },
      {
        tag: '小怪', title: '精英怪', paint: { kind: 'enemy', type: 'brute', color: '#8d6bff' },
        desc: '手繪石怪，厚重肉盾。',
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
          '<strong>跳躍</strong>：同時最多 3 隻、有冷卻',
          '<strong>金幣</strong>：略高於普通怪',
          '<strong>漏關</strong>：扣 1 生命',
        ],
      },
      {
        tag: '小怪', title: '小惡魔', paint: { kind: 'enemy', type: 'devil', color: '#c62828' },
        desc: '塗鴉風小惡魔（翅膀＋紅叉）。惡咒鎖塔時會把紅叉插在塔旁。漏關還會偷金幣。',
        stats: [
          '<strong>血量</strong>：普通怪 ×0.95',
          '<strong>移速</strong>：略快於普通怪',
          '<strong>惡咒</strong>：約每 3 秒鎖附近一座塔',
          '<strong>漏關</strong>：扣 1 生命，並偷走部分金幣',
          '<strong>出現</strong>：約第 8 波起',
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
        tag: '首領', title: '再生王', paint: { kind: 'enemy', type: 'grunt', color: '#3ecf8e', bossId: 'regen' },
        desc: '葉形王體＋黃冠，外框會泛綠光回血光環。',
        stats: [
          '<strong>特性</strong>：戰鬥中持續回血',
          '<strong>克制</strong>：毒塔毒蝕（持續扣總血 %）',
          '<strong>血量</strong>：首領倍率（遠高於小怪）',
        ],
      },
      {
        tag: '首領', title: '狂暴王', paint: { kind: 'enemy', type: 'grunt', color: '#ff5a36', bossId: 'rush' },
        desc: '尖刺王體＋黃冠。殘血爆發時出現衝刺殘影。',
        stats: ['<strong>觸發</strong>：血量低於 50%', '<strong>效果</strong>：大幅加速'],
      },
      {
        tag: '首領', title: '召喚王', paint: { kind: 'enemy', type: 'grunt', color: '#f2c14e', bossId: 'summon' },
        desc: '多瓣王體＋黃冠，周圍有召喚點環繞。',
        stats: ['<strong>特性</strong>：週期召喚小怪', '<strong>壓力</strong>：增加漏關與干擾火力'],
      },
      {
        tag: '首領', title: '護盾王', paint: { kind: 'enemy', type: 'grunt', color: '#67e8f9', bossId: 'ward' },
        desc: '盾形王體＋黃冠。護盾時有八角邊框，破盾有粉碎感。',
        stats: ['<strong>特性</strong>：護盾期間減傷／擋彈', '<strong>克制</strong>：火塔破盾並打血量 10%'],
      },
      {
        tag: '首領', title: '分裂王', paint: { kind: 'enemy', type: 'grunt', color: '#c084fc', bossId: 'split' },
        desc: '三瓣重疊王體＋黃冠，外框有紫環特效。',
        stats: ['<strong>死亡</strong>：分成 3 隻小怪', '<strong>金幣</strong>：分裂體金幣較低'],
      },
      {
        tag: '首領', title: '治癒王', paint: { kind: 'enemy', type: 'grunt', color: '#ff8fab', bossId: 'mend' },
        desc: '柔圓王體＋黃冠，粉紅治癒光環包覆外框。',
        stats: ['<strong>特性</strong>：範圍治療友軍', '<strong>克制</strong>：毒塔毒蝕'],
      },
      {
        tag: '首領', title: '冰封王', paint: { kind: 'enemy', type: 'grunt', color: '#9bd4ff', bossId: 'frost' },
        desc: '冰晶王體＋黃冠，外框有冰刺光環。',
        stats: ['<strong>技能</strong>：定期凍結所有塔', '<strong>應對</strong>：預留輸出與節奏'],
      },
      {
        tag: '首領', title: '鐵甲王', paint: { kind: 'enemy', type: 'grunt', color: '#8aa0b8', bossId: 'armor' },
        desc: '鐵板王體＋黃冠，外框有鐵甲邊。',
        stats: ['<strong>減傷</strong>：受到傷害減半', '<strong>克制</strong>：火塔破甲並打血量 10%'],
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
          '<strong>克制</strong> 護盾／鐵甲／厚皮 +10%血',
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
        desc: '串連跳電 · 清多隻',
        stats: [
          '<strong>造價</strong> 85',
          '<strong>傷</strong> 24→84',
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
      tag: '英雄', title: '緋紅劍客', paint: { kind: 'hero', hero: 'sword' },
      desc: '走到放置點的射程內追砍。刀揮過的怪都會受傷，每三下射出旋轉半月劍氣。主動：修羅附體。',
      stats: ['<strong>主動</strong>：移速與攻速 +1000%，攻擊改為血量%，最多 5 秒', '<strong>操作</strong>：可拖曳換位，技能點放置處'],
    });
    appendInfoCard(list, {
      tag: '英雄', title: '叢林獵手', paint: { kind: 'hero', hero: 'archer' },
      desc: '最遠的單體貫穿。打到護盾、鐵甲或抗性時改為血量傷害，並打掉那層抗性。',
      stats: ['<strong>滿等</strong>：射程幾乎蓋住全圖', '<strong>主動</strong>：致命毒霧，禁療並每秒扣血，10 秒，冷卻 30 秒'],
    });
    appendInfoCard(list, {
      tag: '英雄', title: '萬象法師', paint: { kind: 'hero', hero: 'mage' },
      desc: '火破盾、冰緩速、風把怪沿路推回去。主動：隕石術，全圖持續落下。',
      stats: ['<strong>普攻</strong>：三系輪流', '<strong>主動</strong>：全圖血量傷害'],
    });
    appendInfoCard(list, {
      tag: '英雄', title: '戰靈樂手', paint: { kind: 'hero', hero: 'priest' },
      desc: '不攻擊。光環提升裡面每座塔的攻擊與攻速，滿等大約蓋住半張圖。',
      stats: ['<strong>光環</strong>：攻擊約 +8%～22%，攻速約 +6%～18%', '<strong>主動</strong>：致命節奏，光環內攻擊改打總血量%'],
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

  function openCodex() {
    hideStoryScreens();
    renderCodex();
    if (screenCodex) screenCodex.hidden = false;
  }

  function openHellInfo() {
    hideStoryScreens();
    renderHellInfo();
    if (screenHell) screenHell.hidden = false;
  }

  function openTowerInfo() {
    hideStoryScreens();
    renderTowerInfo();
    if (screenTowersInfo) screenTowersInfo.hidden = false;
  }

  function togglePause() {
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

  function openChapters() {
    state.phase = 'menu';
    state.paused = true;
    closeModal();
    hideStoryScreens();
    screenChapters.hidden = false;
    renderChapters();
    requestAnimationFrame(function () { chapterList.scrollTop = chapterList.scrollHeight; });
  }

  function themeTileUrl(chapter) {
    if (!envReady) return '';
    if (!themeTileUrl.cache) themeTileUrl.cache = {};
    if (themeTileUrl.cache[chapter]) return themeTileUrl.cache[chapter];
    var frame = themeFrameFor(chapter, 'ground');
    var stamp = document.createElement('canvas');
    stamp.width = frame.sw;
    stamp.height = frame.sh;
    var g = stamp.getContext('2d');
    g.drawImage(envSheet, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, frame.sw, frame.sh);
    themeTileUrl.cache[chapter] = stamp.toDataURL('image/png');
    return themeTileUrl.cache[chapter];
  }

  function paintStageBackdrop() {
    screenStages.style.backgroundColor = '#f6f3ec';
    screenStages.style.backgroundImage = '';
  }

  function themeThumbStyle() {
    return '';
  }

  function renderChapters() {
    chapterList.replaceChildren();
    for (var i = CHAPTERS.length - 1; i >= 0; i--) {
      var chapter = CHAPTERS[i];
      var unlocked = chapterUnlocked(chapter.id);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chapter-card';
      btn.disabled = !unlocked;
      var thumb = document.createElement('span');
      thumb.className = 'ch-thumb';
      thumb.style.cssText = themeThumbStyle(chapter.id);
      var copy = document.createElement('span');
      copy.className = 'ch-copy';
      var title = document.createElement('strong');
      title.textContent = chapter.id + '. ' + chapter.name;
      var sub = document.createElement('small');
      sub.textContent = unlocked ? '首領 ' + chapter.boss : '通過 ' + (chapter.id - 1) + '-5 後解鎖';
      copy.appendChild(title);
      copy.appendChild(sub);
      var stars = document.createElement('span');
      stars.className = 'ch-stars';
      stars.textContent = unlocked ? ('獲得 ' + chapterStarTotal(chapter.id) + '/15 ★') : '鎖';
      btn.appendChild(thumb);
      btn.appendChild(copy);
      btn.appendChild(stars);
      btn.addEventListener('click', (function (id) {
        return function () { openStages(id); };
      })(chapter.id));
      chapterList.appendChild(btn);
    }
  }

  function openStages(chapterId) {
    state.phase = 'menu';
    state.paused = true;
    closeModal();
    hideStoryScreens();
    screenStages.hidden = false;
    var chapter = chapterById(chapterId);
    stageKicker.textContent = '第 ' + chapter.id + ' 章';
    stageTitle.textContent = chapter.name;
    var pair = chapterPair(chapter.id);
    stageNote.textContent = '小怪是' + pair[0].name + '與' + pair[1].name + '。首領是' + chapter.boss + '。獲得 ' + chapterStarTotal(chapter.id) + '/15 ★';
    paintStageBackdrop(chapter.id);
    renderStages(chapterId);
    requestAnimationFrame(function () { stageTrack.scrollTop = stageTrack.scrollHeight; });
  }

  function renderStages(chapterId) {
    stageTrack.replaceChildren();
    for (var s = 5; s >= 1; s--) {
      var stage = stageById(chapterId + '-' + s);
      var unlocked = stageUnlocked(stage);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-node' + (s === 5 ? ' is-boss' : '');
      btn.disabled = !unlocked;
      var copy = document.createElement('span');
      copy.className = 'node-copy';
      var title = document.createElement('strong');
      title.textContent = stage.stageId + '  ' + stage.name;
      if (s === 5) {
        var badge = document.createElement('span');
        badge.className = 'node-badge';
        badge.textContent = 'Boss';
        title.appendChild(badge);
      }
      var sub = document.createElement('small');
      sub.textContent = unlocked
        ? (stage.waves.length + ' 波 · 起始 ' + stage.initialGold + ' 金')
        : '完成上一關後解鎖';
      copy.appendChild(title);
      copy.appendChild(sub);
      var stars = document.createElement('span');
      stars.className = 'node-stars';
      stars.textContent = unlocked ? starGlyph(state.stars[stage.stageId] || 0) : '鎖';
      btn.appendChild(copy);
      btn.appendChild(stars);
      btn.addEventListener('click', (function (id) {
        return function () { startRun('campaign', id); };
      })(stage.stageId));
      stageTrack.appendChild(btn);
    }
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
    state.wave = 0;
    state.phase = 'prep';
    state.paused = false;
    state.userPaused = false;
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
    state.towers = state.towers.filter(function (item) { return item.id !== tower.id; });
    state.selectedId = null;
    state.sellArmed = false;
    Sfx.sell();
    toast('出售獲得 ' + refund + ' 金幣');
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

  function renderInspector() {
    var tower = selectedTower();
    if (!tower) {
      inspector.classList.remove('is-open');
      inspectActions.replaceChildren();
      return;
    }
    inspector.classList.add('is-open');
    inspectActions.replaceChildren();
    if (tower.type === 'hero') {
      inspectTitle.textContent = heroName(tower.hero) + '  Lv.' + (tower.level + 1);
      inspectMeta.textContent = heroBlurb(tower);
      var skillName = heroSkillName(tower.hero);
      var cd = tower.skillCd || 0;
      var skillLabel = state.pickMode === 'fog' && state.fogHeroId === tower.id
        ? '點地圖施放'
        : (cd > 0 ? skillName + ' ' + Math.ceil(cd) + '秒' : skillName);
      var skill = makeActButton(skillLabel, 'btn-mint btn-primary-act', 'skill');
      skill.disabled = cd > 0 || state.phase !== 'combat';
      inspectActions.appendChild(skill);
      appendSellRow(Math.floor(tower.invested * sellRatio()));
      return;
    }
    var stats = towerStats(tower);
    var refund = Math.floor(tower.invested * sellRatio());
    var maxed = towerMaxed(tower);
    inspectTitle.textContent = towerLabel(tower) + '  Lv.' + (tower.level + 1);
    inspectMeta.textContent = needsSpec(tower) ? specChoiceText(tower) : statLine(stats, tower);
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
      var upgradeLabel = tower.level >= 5
        ? '已滿級'
        : (maxed ? '金幣滿等' : '升級 ' + nextUpgradeCost(tower));
      var upgrade = makeActButton(upgradeLabel, 'btn-mint btn-primary-act', 'upgrade');
      upgrade.disabled = maxed || tower.level >= 5 || state.gold < nextUpgradeCost(tower);
      inspectActions.appendChild(upgrade);
    }
    appendSellRow(refund);
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

  function syncHud() {
    hudLives.textContent = String(state.lives);
    hudGold.textContent = String(state.gold);
    statLife.classList.toggle('is-low', state.lives > 0 && state.lives <= 6);
    if (state.lives < state.shownLives) {
      statLife.classList.remove('is-hurt');
      void statLife.offsetWidth;
      statLife.classList.add('is-hurt');
    }
    state.shownLives = state.lives;
    if (state.mode === 'campaign') {
      hudWave.textContent = String(state.level || '');
      var bossNow = state.phase === 'combat' ? bossForWave(state.wave) : null;
      hudWaveSub.textContent = bossNow
        ? '王 · ' + bossNow.name
        : (state.wave === 0 ? state.levelName : '第 ' + state.wave + '/' + state.levelWaves + ' 波');
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
      waveBtnSub.textContent = '剩餘 ' + left;
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
        ? Math.ceil(state.editCountdown) + ' 秒 · 接著三選一'
        : '接著三選一';
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
    state.speed = state.speed === 1 ? 2 : (state.speed === 2 ? 4 : 1);
    syncSpeedButton();
    Sfx.ui();
    toast(speedBtn.getAttribute('aria-label'));
  }

  function syncSoundButton() {
    soundBtn.setAttribute('aria-pressed', Sfx.muted ? 'true' : 'false');
    soundBtn.textContent = Sfx.muted ? '×' : '♪';
    soundBtn.setAttribute('aria-label', Sfx.muted ? '開啟音效' : '關閉音效');
  }

  function resize() {
    var w = stage.clientWidth;
    var h = stage.clientHeight;
    if (w < 2 || h < 2) return;
    view.dpr = Math.min(window.devicePixelRatio || 1, 2);
    var nextW = Math.round(w * view.dpr);
    var nextH = Math.round(h * view.dpr);
    if (view.w === w && view.h === h && canvas.width === nextW && canvas.height === nextH) return;
    view.w = w;
    view.h = h;
    canvas.width = nextW;
    canvas.height = nextH;
    var pad = 8;
    view.tile = Math.min((w - pad * 2) / COLS, (h - pad * 2) / ROWS);
    view.originX = (w - view.tile * COLS) / 2;
    view.originY = (h - view.tile * ROWS) / 2;
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
    drawShocks();
    drawParticles();
    drawFloaters();
    ctx.restore();
    drawHurt();
    drawBanner();
    drawBuildMenu();
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
          : '點空地放塔，每 10 波三選一'));
    }
  }

  function drawPriestAuras() {
    for (var i = 0; i < state.towers.length; i++) {
      var tower = state.towers[i];
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

  function drawFrame(image, frame, dx, dy, dw, dh) {
    if (!frame || !image || !image.complete || !image.naturalWidth) return false;
    ctx.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, dx, dy, dw, dh);
    return true;
  }

  var TOWER_ROW_Y = [96, 224, 356, 488];

  function towerLook(tower) {
    var shown = tower.level + 1;
    if (isArrowPath(tower) || tower.type === 'bolt') {
      if (tower.spec === 'arrow') {
        if (shown <= 3) return { sheet: 0, row: 2 };
        if (shown === 4) return { sheet: 0, row: 3 };
        if (shown === 5) return { sheet: 1, row: 0 };
        return { sheet: 1, row: 3 };
      }
      if (tower.type === 'bolt') return { sheet: 0, row: shown <= 3 ? 2 : 3 };
      return { sheet: 0, row: shown <= 1 ? 0 : 1 };
    }
    if (tower.type === 'fire') {
      if (shown <= 3) return { sheet: 3, row: 2 };
      if (shown === 4) return { sheet: 3, row: 3 };
      return { sheet: 2, row: 0 };
    }
    if (tower.type === 'ice') {
      if (shown <= 3) return { sheet: 2, row: 1 };
      if (shown === 4) return { sheet: 2, row: 2 };
      return { sheet: 4, row: 0 };
    }
    if (tower.type === 'poison') return { sheet: 3, row: shown <= 2 ? 0 : 1 };
    if (isCannonPath(tower)) {
      if (shown <= 3) return { sheet: 2, row: 3 };
      if (shown === 4) return { sheet: 4, row: 2 };
      return { sheet: 4, row: 3 };
    }
    return { sheet: 3, row: shown <= 1 ? 0 : 1 };
  }

  function towerFrame(sheet, row, pose, index) {
    var y = TOWER_ROW_Y[row];
    if (pose === 'attack') return { sheet: sheet, sx: 416 + index * 80, sy: y + 4, sw: 86, sh: 62 };
    if (pose === 'bolt') return { sheet: sheet, sx: 868, sy: y - 4, sw: 128, sh: 40 };
    if (pose === 'shell') return { sheet: sheet, sx: 860, sy: y + 16, sw: 78, sh: 48 };
    if (pose === 'impact') return { sheet: sheet, sx: 940, sy: y + 12, sw: 80, sh: 56 };
    return { sheet: sheet, sx: 18 + index * 80, sy: y, sw: 76, sh: 72 };
  }

  function towerPose(tower) {
    var flip = Math.cos(tower.aim) < 0;
    var elev = Math.abs(Math.atan2(Math.sin(tower.aim), Math.abs(Math.cos(tower.aim))));
    var index = 4 - Math.round((elev / (Math.PI / 2)) * 4);
    if (index < 0) index = 0;
    if (index > 4) index = 4;
    return { index: index, flip: flip, attack: tower.flash > 0.12 };
  }

  function towerStamp(frame) {
    var key = frame.sheet + ':' + frame.sx + ',' + frame.sy + ',' + frame.sw + ',' + frame.sh;
    if (towerStampCache[key]) return towerStampCache[key];
    var stamp = keyedStamp(towerSheets[frame.sheet], frame, null);
    if (stamp) towerStampCache[key] = stamp;
    return stamp;
  }

  function drawTowerArt(tower, x, y, tile) {
    if (!towerArtReady) return false;
    var look = towerLook(tower);
    var pose = towerPose(tower);
    var stamp = towerStamp(towerFrame(look.sheet, look.row, pose.attack ? 'attack' : 'idle', pose.index));
    if (!stamp) return false;
    ctx.save();
    ctx.translate(x, y + tile * 0.06);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, tile * 0.24, tile * 0.3, tile * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    if (pose.flip) ctx.scale(-1, 1);
    var dw = tile * 0.98;
    var dh = dw * (stamp.height / stamp.width);
    if (dh > tile * 1.08) {
      dh = tile * 1.08;
      dw = dh * (stamp.width / stamp.height);
    }
    ctx.drawImage(stamp, -dw / 2, -dh + tile * 0.3, dw, dh);
    ctx.restore();
    return true;
  }

  function drawBoltSprite(sheet, row, pose, x, y, angle, width, anchor) {
    if (!towerArtReady || sheet == null || row == null) return false;
    var stamp = towerStamp(towerFrame(sheet, row, pose, 0));
    if (!stamp) return false;
    ctx.save();
    ctx.translate(x, y);
    if (angle) ctx.rotate(angle);
    var w = width;
    var h = w * (stamp.height / stamp.width);
    ctx.drawImage(stamp, -w * anchor, -h / 2, w, h);
    ctx.restore();
    return true;
  }

  function towerSpriteKey(tower) {
    var shown = Math.min(5, tower.level + 1);
    if (isArrowPath(tower) || tower.type === 'bolt') {
      if (tower.spec === 'arrow' && shown >= 5) return 'twin' + Math.min(5, shown);
      if (tower.spec === 'arrow') return 'heavy' + Math.min(5, Math.max(3, shown));
      return shown <= 1 ? 'arrow1' : 'arrow2';
    }
    if (tower.type === 'ice') return shown >= 5 ? 'ice4' : 'ice' + Math.max(3, shown);
    if (tower.type === 'fire') return 'fire5';
    if (tower.type === 'poison') return shown <= 1 ? 'cannon1' : 'cannon2';
    if (isCannonPath(tower)) return 'stone' + Math.min(5, Math.max(3, shown));
    return shown <= 1 ? 'cannon1' : 'cannon2';
  }

  function themeFrameFor(chapter, key) {
    var local = THEME_LOCAL[key];
    var col = (chapter - 1) % 4;
    var row = Math.floor((chapter - 1) / 4);
    return {
      sx: col * 256 + local.dx,
      sy: row * 285 + local.dy,
      sw: local.sw,
      sh: local.sh,
    };
  }

  function drawFrameRot(image, frame, dx, dy, dw, dh, rot) {
    if (!rot) return drawFrame(image, frame, dx, dy, dw, dh);
    ctx.save();
    ctx.translate(dx + dw / 2, dy + dh / 2);
    ctx.rotate(rot);
    var ok = drawFrame(image, frame, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    return ok;
  }

  function roadKind(c, r) {
    var up = isPath(c, r - 1);
    var down = isPath(c, r + 1);
    var left = isPath(c - 1, r);
    var right = isPath(c + 1, r);
    if (up && left && !down && !right) return 'cornerUL';
    if (up && right && !down && !left) return 'cornerUR';
    if (down && left && !up && !right) return 'cornerDL';
    if (down && right && !up && !left) return 'cornerDR';
    if ((left || right) && !up && !down) return 'horiz';
    return 'vert';
  }

  function pathKind(c, r, index) {
    if (index === route.cells.length - 1) return 'end';
    var up = isPath(c, r - 1);
    var down = isPath(c, r + 1);
    var left = isPath(c - 1, r);
    var right = isPath(c + 1, r);
    if (up && left) return 'cornerUL';
    if (up && right) return 'cornerUR';
    if (down && left) return 'cornerDL';
    if (down && right) return 'cornerDR';
    if (left && right) return 'horiz';
    return 'vert';
  }

  function pathFrame(c, r, index) {
    if (index === 0) return SPRITE_MAP.portal;
    if (index === route.cells.length - 1) return SPRITE_MAP.chest;
    var up = isPath(c, r - 1);
    var down = isPath(c, r + 1);
    var left = isPath(c - 1, r);
    var right = isPath(c + 1, r);
    if (up && down) return SPRITE_MAP.vert;
    if (left && right) return SPRITE_MAP.horiz;
    if (up && left) return SPRITE_MAP.cornerUL;
    if (up && right) return SPRITE_MAP.cornerUR;
    if (down && left) return SPRITE_MAP.cornerDL;
    if (down && right) return SPRITE_MAP.cornerDR;
    if (up || down) return SPRITE_MAP.vert;
    return SPRITE_MAP.horiz;
  }

  function drawFlowArrows(alpha) {
    var tile = view.tile;
    var max = WAYPOINTS.length - 1;
    if (max < 1) return;
    var offset = reduceMotion ? 0.2 : (state.time * 0.9) % 0.8;
    ctx.fillStyle = 'rgba(236, 214, 170, ' + alpha + ')';
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
  }

  function drawThemePaths() {
    if (!envReady || state.mode !== 'campaign' || !state.chapter) return false;
    var tile = view.tile;
    for (var i = 0; i < route.cells.length; i++) {
      var cell = route.cells[i];
      var kind = pathKind(cell.c, cell.r, i);
      var key = 'road';
      var rot = 0;
      if (kind === 'end') key = 'goal';
      else if (kind === 'horiz') rot = Math.PI / 2;
      else if (kind === 'cornerDL') key = 'bend';
      else if (kind === 'cornerUL') { key = 'bend'; rot = Math.PI / 2; }
      else if (kind === 'cornerUR') { key = 'bend'; rot = Math.PI; }
      else if (kind === 'cornerDR') { key = 'bend'; rot = -Math.PI / 2; }
      var grow = kind === 'end' ? tile * 0.12 : 0;
      if (!drawFrameRot(envSheet, themeFrameFor(state.chapter, key), worldX(cell.c) - grow / 2, worldY(cell.r) - grow / 2, tile + grow, tile + grow, rot)) return false;
      if (i === 0 && spritesReady) {
        drawFrame(gameSheet, SPRITE_MAP.portal, worldX(cell.c) + tile * 0.14, worldY(cell.r) + tile * 0.1, tile * 0.72, tile * 0.72);
      }
    }
    var end = route.cells[route.cells.length - 1];
    var x = worldX(end.c + 0.5);
    var y = worldY(end.r + 0.5);
    ctx.font = '700 ' + Math.max(11, Math.round(tile * 0.26)) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(String(Math.max(0, state.lives)), x, y + tile * 0.12);
    ctx.fillStyle = '#fff6e4';
    ctx.fillText(String(Math.max(0, state.lives)), x, y + tile * 0.12);
    drawFlowArrows(0.7);
    return true;
  }

  var PATH_TILE = {
    stone: { sx: 48, sy: 386, sw: 100, sh: 100 },
    portal: { sx: 744, sy: 376, sw: 112, sh: 146 },
    chest: { sx: 908, sy: 396, sw: 108, sh: 108 },
  };

  var CAST_BOSS_Y = [28, 170, 312, 454];
  var CAST_MINION_Y = [50, 192, 334, 468];
  var CAST_LEFT_X = [16, 146, 270, 388];
  var CAST_RIGHT_X = [520, 648, 776, 896];
  var CAST_MIN_LEFT = [24, 142, 266, 392];
  var CAST_MIN_RIGHT = [526, 652, 786, 914];

  var CAST_BOSS_INDEX = { regen: 0, rush: 1, summon: 2, ward: 3, split: 4, mend: 5, frost: 6, armor: 7 };
  var CAST_MINION_SLOT = {
    slime: [0, 0], skel: [0, 1], goblin: [1, 0], tort: [1, 1],
    mini: [2, 0], acolyte: [2, 1], frost: [3, 0], beetle: [3, 1],
  };

  function castBossFrameFor(enemy, pos, ahead) {
    if (!castReady || CAST_BOSS_INDEX[enemy.bossId] == null) return null;
    var index = CAST_BOSS_INDEX[enemy.bossId];
    var pose = 0;
    if (enemy.bossId === 'rush' && enemy.enraged) pose = 3;
    else if (enemy.bossId === 'ward' && enemy.shield > 0) pose = 3;
    else if (enemy.bossId === 'regen' && enemy.regenShow > 0) pose = 3;
    else if (enemy.bossId === 'frost' && enemy.abilityTimer > 4.6) pose = 3;
    else if (enemy.bossId === 'summon' && enemy.abilityTimer > 3.6) pose = 3;
    else if ((enemy.bossId === 'split' || enemy.bossId === 'armor') && enemy.hitFlash > 0) pose = 3;
    else if (enemy.bossId === 'mend' && enemy.mendAcc < 0.15) pose = 3;
    else if (ahead.x < pos.x - 0.04) pose = 1;
    else if (ahead.x > pos.x + 0.04) pose = 2;
    var xs = index % 2 ? CAST_RIGHT_X : CAST_LEFT_X;
    return { sx: xs[pose], sy: CAST_BOSS_Y[Math.floor(index / 2)], sw: 110, sh: 86 };
  }

  function castMinionFrameFor(kind, pose) {
    if (!castMinionReady || !CAST_MINION_SLOT[kind]) return null;
    var slot = CAST_MINION_SLOT[kind];
    var xs = slot[1] ? CAST_MIN_RIGHT : CAST_MIN_LEFT;
    return { sx: xs[pose], sy: CAST_MINION_Y[slot[0]], sw: 90, sh: 62 };
  }

  function fieldGround(chapter) {
    var col = (chapter - 1) % 4;
    var row = Math.floor((chapter - 1) / 4);
    return { sx: col * 256 + 90, sy: row * 285 + 84, sw: 76, sh: 64 };
  }

  function sheetBackground(r, g, b) {
    var max = r > g ? (r > b ? r : b) : (g > b ? g : b);
    var min = r < g ? (r < b ? r : b) : (g < b ? g : b);
    return (max - min) <= 8 && Math.abs(r - 37) + Math.abs(g - 40) + Math.abs(b - 45) < 52 && max < 70;
  }

  function keyedStamp(image, frame, cache) {
    if (!image || !image.complete || !image.naturalWidth) return null;
    var key = frame.sx + ',' + frame.sy + ',' + frame.sw + ',' + frame.sh;
    if (cache && cache[key]) return cache[key];
    var w = frame.sw;
    var h = frame.sh;
    var stamp = document.createElement('canvas');
    stamp.width = w;
    stamp.height = h;
    var g = stamp.getContext('2d');
    g.drawImage(image, frame.sx, frame.sy, w, h, 0, 0, w, h);
    var pixels = g.getImageData(0, 0, w, h);
    var px = pixels.data;
    var bg = new Uint8Array(w * h);
    var queue = [];
    function push(i) {
      if (i < 0 || i >= bg.length || bg[i]) return;
      var p = i * 4;
      if (!sheetBackground(px[p], px[p + 1], px[p + 2])) return;
      bg[i] = 1;
      queue.push(i);
    }
    var x;
    var y;
    for (x = 0; x < w; x++) {
      push(x);
      push((h - 1) * w + x);
    }
    for (y = 0; y < h; y++) {
      push(y * w);
      push(y * w + (w - 1));
    }
    for (var qi = 0; qi < queue.length; qi++) {
      var i = queue[qi];
      var cx = i % w;
      if (cx > 0) push(i - 1);
      if (cx + 1 < w) push(i + 1);
      if (i >= w) push(i - w);
      if (i + w < bg.length) push(i + w);
    }
    for (i = 0; i < bg.length; i++) {
      var p = i * 4;
      if (bg[i]) {
        px[p + 3] = 0;
        continue;
      }
      cx = i % w;
      var cy = (i / w) | 0;
      var touch = (cx > 0 && bg[i - 1]) || (cx + 1 < w && bg[i + 1]) || (cy > 0 && bg[i - w]) || (cy + 1 < h && bg[i + w]);
      if (!touch) continue;
      var r = px[p];
      var gv = px[p + 1];
      var b = px[p + 2];
      var max = r > gv ? (r > b ? r : b) : (gv > b ? gv : b);
      var lo = r < gv ? (r < b ? r : b) : (gv < b ? gv : b);
      if ((max - lo) <= 14 && Math.abs(r - 37) + Math.abs(gv - 40) + Math.abs(b - 45) < 58 && max < 80) px[p + 3] = 0;
    }
    g.putImageData(pixels, 0, 0);
    if (cache) cache[key] = stamp;
    return stamp;
  }

  function punchStamp(image, frame, cache, limit) {
    if (!image || !image.complete || !image.naturalWidth) return null;
    var cut = limit == null ? 40 : limit;
    var key = frame.sx + ',' + frame.sy + ',' + frame.sw + ',' + frame.sh + ',' + cut;
    if (cache[key]) return cache[key];
    var stamp = document.createElement('canvas');
    stamp.width = frame.sw;
    stamp.height = frame.sh;
    var g = stamp.getContext('2d');
    g.drawImage(image, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, frame.sw, frame.sh);
    var pixels = g.getImageData(0, 0, frame.sw, frame.sh);
    var px = pixels.data;
    for (var p = 0; p < px.length; p += 4) {
      var dist = Math.abs(px[p] - 37) + Math.abs(px[p + 1] - 40) + Math.abs(px[p + 2] - 45);
      if (dist < cut) px[p + 3] = 0;
    }
    g.putImageData(pixels, 0, 0);
    cache[key] = stamp;
    return stamp;
  }

  function drawPunched(image, frame, cache, dx, dy, dw, dh, rot) {
    var stamp = punchStamp(image, frame, cache);
    if (!stamp) return false;
    ctx.save();
    ctx.translate(dx + dw / 2, dy + dh / 2);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(stamp, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    return true;
  }

  function drawKeyed(image, frame, cache, dx, dy, dw, dh) {
    var stamp = keyedStamp(image, frame, cache);
    if (!stamp) return false;
    ctx.drawImage(stamp, dx, dy, dw, dh);
    return true;
  }

  function drawContained(image, frame, cache, cx, cy, box) {
    var stamp = punchStamp(image, frame, cache, 26);
    if (!stamp) return false;
    var aspect = frame.sw / frame.sh;
    var dw = box;
    var dh = box / aspect;
    if (dh > box) {
      dh = box;
      dw = box * aspect;
    }
    ctx.drawImage(stamp, cx - dw / 2, cy - dh / 2, dw, dh);
    return true;
  }

  var stoneBare = null;

  function bareStone() {
    if (stoneBare) return stoneBare;
    var frame = PATH_TILE.stone;
    var stamp = document.createElement('canvas');
    stamp.width = frame.sw;
    stamp.height = frame.sh;
    var g = stamp.getContext('2d');
    g.drawImage(pathSheet, frame.sx, frame.sy, frame.sw, frame.sh, 0, 0, frame.sw, frame.sh);
    var donor = document.createElement('canvas');
    donor.width = frame.sw;
    donor.height = frame.sh;
    donor.getContext('2d').drawImage(stamp, 0, 0);
    g.drawImage(donor, 42, 34, 33, 33, 0, 34, 33, 33);
    stoneBare = stamp;
    return stamp;
  }

  function drawStoneCell(cell, rot) {
    var tile = view.tile;
    var stamp = bareStone();
    var x = worldX(cell.c);
    var y = worldY(cell.r);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, tile, tile);
    ctx.clip();
    ctx.translate(x + tile / 2, y + tile / 2);
    if (rot) ctx.rotate(rot);
    ctx.drawImage(stamp, -tile / 2, -tile / 2, tile, tile);
    ctx.restore();
  }

  function drawSpawnArrow() {
    if (route.cells.length < 2) return;
    var from = route.cells[0];
    var to = route.cells[1];
    var tile = view.tile;
    var ang = Math.atan2(to.r - from.r, to.c - from.c);
    ctx.save();
    ctx.translate(worldX(to.c + 0.5), worldY(to.r + 0.5));
    ctx.rotate(ang);
    var s = tile * 0.24;
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.72, s * 0.58);
    ctx.lineTo(-s * 0.28, 0);
    ctx.lineTo(-s * 0.72, -s * 0.58);
    ctx.closePath();
    ctx.fillStyle = '#fff6e4';
    ctx.strokeStyle = 'rgba(24, 14, 8, 0.9)';
    ctx.lineWidth = Math.max(2, tile * 0.045);
    ctx.lineJoin = 'round';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawStonePaths() {
    if (!pathReady || !pathSheet.complete) return false;
    var tile = view.tile;
    for (var i = 0; i < route.cells.length; i++) {
      var cell = route.cells[i];
      drawStoneCell(cell, roadKind(cell.c, cell.r) === 'vert' ? Math.PI / 2 : 0);
    }
    var start = route.cells[0];
    ctx.save();
    ctx.beginPath();
    ctx.rect(worldX(start.c), worldY(start.r), tile, tile);
    ctx.clip();
    drawContained(pathSheet, PATH_TILE.portal, pathStampCache, worldX(start.c + 0.5), worldY(start.r + 0.5), tile * 0.84);
    ctx.restore();
    drawSpawnArrow();
    var end = route.cells[route.cells.length - 1];
    ctx.save();
    ctx.beginPath();
    ctx.rect(worldX(end.c), worldY(end.r), tile, tile);
    ctx.clip();
    drawContained(pathSheet, PATH_TILE.chest, pathStampCache, worldX(end.c + 0.5), worldY(end.r + 0.42), tile * 0.72);
    var x = worldX(end.c + 0.5);
    var y = worldY(end.r + 0.84);
    ctx.font = '700 ' + Math.max(11, Math.round(tile * 0.24)) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(String(Math.max(0, state.lives)), x, y);
    ctx.fillStyle = '#fff6e4';
    ctx.fillText(String(Math.max(0, state.lives)), x, y);
    ctx.restore();
    return true;
  }

  function drawSpritePaths() {
    if (drawStonePaths()) return true;
    if (drawThemePaths()) return true;
    if (!spritesReady) return false;
    var tile = view.tile;
    for (var i = 0; i < route.cells.length; i++) {
      var cell = route.cells[i];
      var frame = pathFrame(cell.c, cell.r, i);
      var grow = (i === 0 || i === route.cells.length - 1) ? tile * 0.42 : 0;
      if (!drawFrame(gameSheet, frame, worldX(cell.c) - grow / 2, worldY(cell.r) - grow / 2, tile + grow, tile + grow)) return false;
    }
    var end = route.cells[route.cells.length - 1];
    var x = worldX(end.c + 0.5);
    var y = worldY(end.r + 0.5);
    ctx.font = '700 ' + Math.max(11, Math.round(tile * 0.26)) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeText(String(Math.max(0, state.lives)), x, y + tile * 0.08);
    ctx.fillStyle = '#fff6e4';
    ctx.fillText(String(Math.max(0, state.lives)), x, y + tile * 0.08);
    drawFlowArrows(0.45);
    return true;
  }

  function drawChapterGround(chapter) {
    if (chapter !== 1 || !groundCh1Ready || !groundCh1.naturalWidth) return false;
    var sw = groundCh1.naturalWidth;
    var sh = groundCh1.naturalHeight;
    var target = COLS / ROWS;
    var sx = 0;
    var sy = 0;
    var cw = sw;
    var ch = sh;
    if (sw / sh < target) {
      ch = sw / target;
      sy = (sh - ch) / 2;
    } else if (sw / sh > target) {
      cw = sh * target;
      sx = (sw - cw) / 2;
    }
    ctx.drawImage(groundCh1, sx, sy, cw, ch, worldX(0), worldY(0), view.tile * COLS, view.tile * ROWS);
    return true;
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

  function drawPortal() {
    var p = WAYPOINTS[0];
    var x = worldX(p.x);
    var y = worldY(p.y);
    var pulse = view.tile * (0.3 + Math.sin(state.time * 3) * 0.025);
    ctx.save();
    ctx.strokeStyle = 'rgba(142, 231, 255, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(90, 210, 235, 0.16)';
    ctx.fill();
    ctx.restore();
  }

  function drawBase() {
    var p = WAYPOINTS[WAYPOINTS.length - 1];
    var x = worldX(p.x);
    var y = worldY(p.y);
    var rad = view.tile * 0.4;
    ctx.save();
    ctx.fillStyle = '#5c4738';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#c9a27a';
    ctx.stroke();
    ctx.fillStyle = state.lives <= 6 ? '#ff5d73' : '#ffd3ae';
    ctx.beginPath();
    ctx.arc(x, y, rad * 0.58, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2418';
    ctx.font = '700 ' + Math.max(11, Math.round(view.tile * 0.28)) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(Math.max(0, state.lives)), x, y + 0.5);
    ctx.restore();
  }

  function buildMenuTypes() {
    return ['basic', 'poison', 'fire', 'ice', 'bolt', 'mint'];
  }

  function buildMenuLabel(type) {
    if (type === 'basic') return '無屬';
    if (type === 'poison') return '毒';
    if (type === 'fire') return '火';
    if (type === 'ice') return '冰';
    if (type === 'bolt') return '雷';
    if (type === 'mint') return '錢';
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
      var rowCount = row === 0 ? Math.min(cols, types.length) : types.length - cols;
      var rowOffset = row === 0 ? 0 : (panelW - (rowCount * btnW + (rowCount + 1) * gap)) / 2;
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
    var y = worldY(spot.r + 0.55);
    var s = view.tile * 0.28;
    ctx.save();
    ctx.translate(x, y);
    inkSeed = 41;
    inkSetup(Math.max(2, s * 0.16));
    ctx.fillStyle = '#efe6d6';
    ctx.strokeStyle = '#161616';
    ctx.beginPath();
    ctx.moveTo(-s * 1.15, s * 0.35);
    ctx.lineTo(s * 1.15, s * 0.35);
    ctx.lineTo(s * 0.85, s * 0.95);
    ctx.lineTo(-s * 0.85, s * 0.95);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, s * 0.35);
    ctx.lineTo(s * 0.7, s * 0.35);
    ctx.lineTo(s * 0.45, -s * 0.15);
    ctx.lineTo(-s * 0.45, -s * 0.15);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.fillStyle = '#e02323';
    inkCircle(0, -s * 0.55, s * 0.28, 10);
    ctx.fill();
    inkStroke();
    ctx.fillStyle = '#161616';
    ctx.font = '800 ' + Math.max(10, Math.round(s * 0.7)) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('祭', 0, s * 0.15);
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

  function enemyFacing(enemy, pos) {
    var ahead = pointAt(Math.min(WAYPOINTS.length - 1, (enemy.dist || 0) + 0.4));
    if (enemy.jumping) {
      var to = WAYPOINTS[enemy.jumping.to];
      ahead = { x: to.x, y: to.y };
    }
    return Math.atan2(ahead.y - pos.y, ahead.x - pos.x);
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

  function drawGruntBody(rad, colors, bob) {
    // slime: soft blob + drip + cheek highlight
    inkSeed = Math.round(rad * 40 + 11);
    ctx.translate(0, bob);
    inkSetup(Math.max(2.2, rad * 0.17));
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.rim;
    ctx.beginPath();
    ctx.moveTo(-rad * 0.85 + inkJitter(1, 0.4), rad * 0.15);
    ctx.quadraticCurveTo(-rad * 1.05, -rad * 0.55, -rad * 0.35, -rad * 0.95);
    ctx.quadraticCurveTo(0, -rad * 1.12, rad * 0.35, -rad * 0.95);
    ctx.quadraticCurveTo(rad * 1.05, -rad * 0.55, rad * 0.85 + inkJitter(2, 0.4), rad * 0.15);
    ctx.quadraticCurveTo(rad * 0.55, rad * 0.95, 0, rad * 0.88);
    ctx.quadraticCurveTo(-rad * 0.55, rad * 0.95, -rad * 0.85, rad * 0.15);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    // drip
    ctx.beginPath();
    ctx.moveTo(-rad * 0.18, rad * 0.72);
    ctx.quadraticCurveTo(-rad * 0.05, rad * 1.18, rad * 0.12, rad * 0.78);
    inkStroke();
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.2;
    inkCircle(-rad * 0.22, rad * 0.18, rad * 0.28, 10);
    ctx.fill();
    ctx.globalAlpha = 1;
    drawEnemyEyes(rad, colors.ink, { size: 0.15, gap: 0.28, y: -0.12, shine: true });
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = Math.max(1.5, rad * 0.1);
    ctx.beginPath();
    ctx.arc(0, rad * 0.18, rad * 0.22, 0.25, Math.PI - 0.25);
    inkStroke();
  }

  function drawSwiftBody(rad, colors, bob) {
    // batman-logo bat: scalloped wings + pointed ears, wings flap
    inkSeed = Math.round(rad * 37 + 22);
    ctx.translate(0, bob * 0.5);
    inkSetup(Math.max(2.1, rad * 0.15));
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.rim;
    var flap = Math.sin((state.time || 0) * 16 + rad) * 0.38;
    // left wing (flaps)
    ctx.save();
    ctx.translate(-rad * 0.08, 0);
    ctx.rotate(-0.12 - flap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-rad * 0.55, -rad * 0.35);
    ctx.lineTo(-rad * 1.05, -rad * 0.15);
    ctx.lineTo(-rad * 1.45, rad * 0.08);
    ctx.lineTo(-rad * 1.15, rad * 0.22);
    ctx.quadraticCurveTo(-rad * 0.95, rad * 0.55, -rad * 0.7, rad * 0.2);
    ctx.quadraticCurveTo(-rad * 0.5, rad * 0.52, -rad * 0.28, rad * 0.18);
    ctx.quadraticCurveTo(-rad * 0.12, rad * 0.4, 0, rad * 0.08);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.restore();
    // right wing (flaps)
    ctx.save();
    ctx.translate(rad * 0.08, 0);
    ctx.rotate(0.12 + flap);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(rad * 0.55, -rad * 0.35);
    ctx.lineTo(rad * 1.05, -rad * 0.15);
    ctx.lineTo(rad * 1.45, rad * 0.08);
    ctx.lineTo(rad * 1.15, rad * 0.22);
    ctx.quadraticCurveTo(rad * 0.95, rad * 0.55, rad * 0.7, rad * 0.2);
    ctx.quadraticCurveTo(rad * 0.5, rad * 0.52, rad * 0.28, rad * 0.18);
    ctx.quadraticCurveTo(rad * 0.12, rad * 0.4, 0, rad * 0.08);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.restore();
    // center emblem body
    ctx.beginPath();
    ctx.moveTo(0, rad * 0.55);
    ctx.lineTo(-rad * 0.22, rad * 0.15);
    ctx.lineTo(-rad * 0.18, -rad * 0.15);
    ctx.lineTo(-rad * 0.32, -rad * 0.55);
    ctx.lineTo(-rad * 0.08, -rad * 0.28);
    ctx.lineTo(0, -rad * 0.72);
    ctx.lineTo(rad * 0.08, -rad * 0.28);
    ctx.lineTo(rad * 0.32, -rad * 0.55);
    ctx.lineTo(rad * 0.18, -rad * 0.15);
    ctx.lineTo(rad * 0.22, rad * 0.15);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    // eye dots
    ctx.fillStyle = colors.ink;
    inkCircle(-rad * 0.1, -rad * 0.08, Math.max(1.4, rad * 0.08), 6);
    ctx.fill();
    inkCircle(rad * 0.1, -rad * 0.08, Math.max(1.4, rad * 0.08), 6);
    ctx.fill();
  }

  function drawBruteBody(rad, colors, bob) {
    // stone golem: irregular rock + crack
    inkSeed = Math.round(rad * 29 + 7);
    ctx.translate(0, bob * 0.35);
    inkSetup(Math.max(2.4, rad * 0.18));
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.rim;
    ctx.beginPath();
    var rock = [
      [-0.78, -0.72], [-0.2, -0.98], [0.55, -0.78], [0.95, -0.2],
      [0.78, 0.62], [0.15, 0.95], [-0.55, 0.82], [-0.98, 0.15],
    ];
    for (var i = 0; i < rock.length; i++) {
      var rx = rock[i][0] * rad + inkJitter(i + 1, rad * 0.04);
      var ry = rock[i][1] * rad + inkJitter(i + 9, rad * 0.04);
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = Math.max(1.8, rad * 0.12);
    inkLine(-rad * 0.35, -rad * 0.15, rad * 0.2, rad * 0.05, 3);
    inkStroke();
    inkLine(rad * 0.05, -rad * 0.45, rad * 0.35, rad * 0.25, 3);
    inkStroke();
    // block eyes
    ctx.fillStyle = colors.ink;
    inkRect(-rad * 0.42, -rad * 0.28, rad * 0.22, rad * 0.18);
    ctx.fill();
    inkRect(rad * 0.18, -rad * 0.28, rad * 0.22, rad * 0.18);
    ctx.fill();
    ctx.strokeStyle = colors.ink;
    inkLine(-rad * 0.22, rad * 0.35, rad * 0.22, rad * 0.35, 2);
    inkStroke();
  }

  function drawHopperBody(rad, colors, bob, jumping) {
    // spring frog: round body + coil legs + big eyes
    var stretch = jumping ? 1.14 : 1;
    inkSeed = Math.round(rad * 33 + 15);
    ctx.translate(0, bob);
    ctx.scale(1 / Math.sqrt(stretch), stretch);
    inkSetup(Math.max(2.1, rad * 0.16));
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.rim;
    // spring legs
    ctx.lineWidth = Math.max(1.8, rad * 0.14);
    ctx.beginPath();
    ctx.moveTo(-rad * 0.35, rad * 0.35);
    ctx.lineTo(-rad * 0.55, rad * 0.55);
    ctx.lineTo(-rad * 0.3, rad * 0.7);
    ctx.lineTo(-rad * 0.62, rad * 0.95);
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(rad * 0.35, rad * 0.35);
    ctx.lineTo(rad * 0.55, rad * 0.55);
    ctx.lineTo(rad * 0.3, rad * 0.7);
    ctx.lineTo(rad * 0.62, rad * 0.95);
    inkStroke();
    // feet
    inkLine(-rad * 0.78, rad * 0.95, -rad * 0.42, rad * 0.95, 2);
    inkStroke();
    inkLine(rad * 0.42, rad * 0.95, rad * 0.78, rad * 0.95, 2);
    inkStroke();
    // body
    inkCircle(0, -rad * 0.05, rad * 0.72, 16);
    ctx.fill();
    inkStroke();
    // belly
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.18;
    inkCircle(0, rad * 0.18, rad * 0.38, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
    // eye bumps
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.rim;
    inkCircle(-rad * 0.32, -rad * 0.62, rad * 0.28, 10);
    ctx.fill();
    inkStroke();
    inkCircle(rad * 0.32, -rad * 0.62, rad * 0.28, 10);
    ctx.fill();
    inkStroke();
    ctx.fillStyle = colors.ink;
    inkCircle(-rad * 0.32, -rad * 0.62, rad * 0.12, 8);
    ctx.fill();
    inkCircle(rad * 0.32, -rad * 0.62, rad * 0.12, 8);
    ctx.fill();
  }

  function drawDevilBody(rad, colors, bob) {
    // doodle imp: wings + round face + horns + red pitchfork
    inkSeed = Math.round(rad * 41 + 9);
    ctx.translate(0, bob);
    inkSetup(Math.max(2.2, rad * 0.17));
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.rim;
    // small doodle wings
    ctx.beginPath();
    ctx.moveTo(-rad * 0.55, rad * 0.05);
    ctx.quadraticCurveTo(-rad * 1.05, -rad * 0.42, -rad * 1.2, rad * 0.12);
    ctx.quadraticCurveTo(-rad * 0.85, rad * 0.08, -rad * 0.55, rad * 0.32);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(rad * 0.55, rad * 0.05);
    ctx.quadraticCurveTo(rad * 1.05, -rad * 0.42, rad * 1.2, rad * 0.12);
    ctx.quadraticCurveTo(rad * 0.85, rad * 0.08, rad * 0.55, rad * 0.32);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    // sharp horns
    ctx.beginPath();
    ctx.moveTo(-rad * 0.42, -rad * 0.55);
    ctx.lineTo(-rad * 0.58, -rad * 1.12);
    ctx.lineTo(-rad * 0.12, -rad * 0.68);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.beginPath();
    ctx.moveTo(rad * 0.42, -rad * 0.55);
    ctx.lineTo(rad * 0.58, -rad * 1.12);
    ctx.lineTo(rad * 0.12, -rad * 0.68);
    ctx.closePath();
    ctx.fill();
    inkStroke();
    // round head
    inkCircle(0, rad * 0.06, rad * 0.78, 16);
    ctx.fill();
    inkStroke();
    // dot eyes + angry brows + grin
    ctx.fillStyle = colors.ink;
    inkCircle(-rad * 0.26, -rad * 0.06, Math.max(1.8, rad * 0.11), 8);
    ctx.fill();
    inkCircle(rad * 0.26, -rad * 0.06, Math.max(1.8, rad * 0.11), 8);
    ctx.fill();
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = Math.max(1.8, rad * 0.12);
    inkLine(-rad * 0.46, -rad * 0.28, -rad * 0.12, -rad * 0.18, 2);
    inkStroke();
    inkLine(rad * 0.46, -rad * 0.28, rad * 0.12, -rad * 0.18, 2);
    inkStroke();
    ctx.beginPath();
    ctx.arc(0, rad * 0.22, rad * 0.3, 0.15, Math.PI - 0.15);
    inkStroke();
    // held red pitchfork (side)
    ctx.save();
    ctx.translate(rad * 0.85, rad * 0.15);
    ctx.rotate(0.35);
    drawRedPitchfork(rad * 0.7);
    ctx.restore();
  }

  function drawShardBody(rad, colors) {
    inkSeed = Math.round(rad * 25 + 3);
    inkSetup(Math.max(2.2, rad * 0.18));
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.rim;
    ctx.beginPath();
    ctx.moveTo(inkJitter(1, 0.3), -rad);
    ctx.lineTo(rad * 0.7, inkJitter(2, 0.3));
    ctx.lineTo(inkJitter(3, 0.3), rad);
    ctx.lineTo(-rad * 0.7, inkJitter(4, 0.3));
    ctx.closePath();
    ctx.fill();
    inkStroke();
    ctx.strokeStyle = colors.accent;
    inkX(0, 0, rad * 0.4);
  }

  function drawBossSilhouette(id, rad, colors) {
    if (id === 'split') {
      for (var s = 0; s < 3; s++) {
        var sa = -Math.PI / 2 + s * (Math.PI * 2 / 3);
        var sx = Math.cos(sa) * rad * 0.42;
        var sy = Math.sin(sa) * rad * 0.42;
        inkCircle(sx, sy, rad * 0.62, 14);
        ctx.fillStyle = colors.fill;
        ctx.strokeStyle = colors.rim;
        ctx.fill();
        inkStroke();
      }
      return;
    }
    ctx.beginPath();
    if (id === 'rush') {
      for (var i = 0; i < 8; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 4;
        var rr = (i % 2 === 0 ? 1.08 : 0.72) * rad;
        var px = Math.cos(a) * rr * (1 + inkJitter(i + 1, 0.03));
        var py = Math.sin(a) * rr * (1 + inkJitter(i + 2, 0.03));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else if (id === 'ward') {
      ctx.moveTo(inkJitter(1, 0.3), -rad * 1.05);
      ctx.lineTo(rad * 0.92, -rad * 0.45);
      ctx.lineTo(rad * 0.82, rad * 0.25);
      ctx.quadraticCurveTo(0, rad * 1.2, -rad * 0.82, rad * 0.25);
      ctx.lineTo(-rad * 0.92, -rad * 0.45);
      ctx.closePath();
    } else if (id === 'frost') {
      for (var f = 0; f < 6; f++) {
        var fa = -Math.PI / 2 + f * Math.PI / 3;
        var fx = Math.cos(fa) * rad * 1.12;
        var fy = Math.sin(fa) * rad * 1.12;
        var ix = Math.cos(fa + Math.PI / 6) * rad * 0.52;
        var iy = Math.sin(fa + Math.PI / 6) * rad * 0.52;
        if (f === 0) ctx.moveTo(fx, fy);
        else ctx.lineTo(fx, fy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
    } else if (id === 'armor') {
      inkRect(-rad * 0.95, -rad * 0.85, rad * 1.9, rad * 1.7);
    } else if (id === 'summon') {
      for (var m = 0; m < 12; m++) {
        var ma = -Math.PI / 2 + m * Math.PI / 6;
        var mr = (m % 4 === 0 ? 1.12 : 0.88) * rad;
        var mx = Math.cos(ma) * mr * (1 + inkJitter(m + 1, 0.03));
        var my = Math.sin(ma) * mr * (1 + inkJitter(m + 2, 0.03));
        if (m === 0) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      }
      ctx.closePath();
    } else if (id === 'mend') {
      for (var h = 0; h <= 16; h++) {
        var ha = (h / 16) * Math.PI * 2;
        var hr = rad * (0.92 + 0.1 * Math.sin(ha * 2));
        var hx = Math.cos(ha) * hr * (1 + inkJitter(h + 1, 0.03));
        var hy = Math.sin(ha) * hr * 1.05 * (1 + inkJitter(h + 2, 0.03));
        if (h === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
    } else {
      for (var r = 0; r <= 16; r++) {
        var ra = -Math.PI / 2 + (r / 16) * Math.PI * 2;
        var rr2 = rad * (1 + 0.08 * Math.sin(ra * 3));
        var rx2 = Math.cos(ra) * rr2 * (1 + inkJitter(r + 1, 0.03));
        var ry2 = Math.sin(ra) * rr2 * (1 + inkJitter(r + 2, 0.03));
        if (r === 0) ctx.moveTo(rx2, ry2);
        else ctx.lineTo(rx2, ry2);
      }
      ctx.closePath();
    }
    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.rim;
    ctx.fill();
    inkStroke();
  }

  function drawBossCrown(rad) {
    ctx.fillStyle = '#f2c14e';
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = Math.max(1.6, rad * 0.1);
    ctx.beginPath();
    ctx.moveTo(-rad * 0.52, -rad * 0.92);
    ctx.lineTo(-rad * 0.3, -rad * 1.35);
    ctx.lineTo(-rad * 0.06, -rad * 0.98);
    ctx.lineTo(0, -rad * 1.42);
    ctx.lineTo(rad * 0.06, -rad * 0.98);
    ctx.lineTo(rad * 0.3, -rad * 1.35);
    ctx.lineTo(rad * 0.52, -rad * 0.92);
    ctx.lineTo(rad * 0.58, -rad * 0.72);
    ctx.lineTo(-rad * 0.58, -rad * 0.72);
    ctx.closePath();
    ctx.fill();
    inkStroke();
  }

  function drawBossBody(enemy, rad, colors, bob) {
    inkSeed = (enemy.bossId || 'x').charCodeAt(0) * 17 + Math.round(rad * 12);
    ctx.translate(0, bob * 0.3);
    inkSetup(Math.max(2.6, rad * 0.18));
    drawBossSilhouette(enemy.bossId, rad, colors);
    if (enemy.bossId === 'armor') {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = Math.max(1.8, rad * 0.1);
      inkRect(-rad * 0.55, -rad * 0.4, rad * 1.1, rad * 0.85);
      inkStroke();
      inkCircle(-rad * 0.55, -rad * 0.4, rad * 0.08, 6);
      ctx.fillStyle = colors.ink;
      ctx.fill();
      inkCircle(rad * 0.55, -rad * 0.4, rad * 0.08, 6);
      ctx.fill();
    } else {
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.16;
      inkCircle(0, rad * 0.05, rad * 0.48, 12);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = colors.ink;
    ctx.fillStyle = colors.ink;
    drawBossSymbol(enemy.bossId, rad * 0.92);
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

  function drawEnemyStatusFx(enemy, x, y, rad) {
    inkSeed = Math.round((enemy.id || 1) * 17 + rad * 3);
    var t = state.time + (enemy.id || 0) * 0.37;
    var healing = enemy.bossId === 'regen' || enemy.bossId === 'mend' || (hasHellDeff('regen') && !enemy.boss);
    if (healing) {
      var healColor = enemy.bossId === 'mend' ? '#ff8fab' : '#3ecf8e';
      drawInkAuraRing(x, y, rad, healColor, t * 3, 0.05);
      if (enemy.bossId === 'mend' || enemy.regenShow > 0) {
        drawInkAuraRing(x, y, rad + 4, healColor, t * 3 + 1.2, 0.03);
      }
    }
    var raging = (enemy.bossId === 'rush' && enemy.enraged) || enemy.hellEnraged;
    var swiftDebuff = hasHellDeff('speed') && !enemy.boss;
    if (raging || swiftDebuff) {
      ctx.save();
      ctx.strokeStyle = raging ? '#ff5a36' : '#f0a202';
      ctx.lineWidth = Math.max(1.8, rad * 0.1);
      ctx.globalAlpha = 0.55 + Math.sin(t * 10) * 0.2;
      for (var s = 0; s < 3; s++) {
        var ox = -rad * (0.85 + s * 0.28) - Math.sin(t * 8 + s) * 2;
        var oy = (s - 1) * rad * 0.35 + Math.cos(t * 7 + s) * 2;
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy - rad * 0.2);
        ctx.lineTo(x + ox + rad * 0.35, y + oy);
        ctx.lineTo(x + ox, y + oy + rad * 0.2);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (enemy.shield > 0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = Math.max(2.4, rad * 0.14);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      for (var i = 0; i < 8; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 4 + t * 0.4;
        var rr = rad + 8 + Math.sin(t * 5 + i) * 1.2;
        var px = Math.cos(a) * rr;
        var py = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.lineWidth = Math.max(1.4, rad * 0.08);
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(0, 0, rad + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (enemy.bossId === 'armor' && !enemy.firePierce) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = '#8aa0b8';
      ctx.lineWidth = Math.max(2.2, rad * 0.12);
      ctx.globalAlpha = 0.7;
      inkRect(-rad - 5, -rad - 5, (rad + 5) * 2, (rad + 5) * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (enemy.bossId === 'summon') {
      ctx.save();
      ctx.fillStyle = '#f2c14e';
      for (var d = 0; d < 3; d++) {
        var da = t * 2.2 + d * (Math.PI * 2 / 3);
        var dx = x + Math.cos(da) * (rad + 10);
        var dy = y + Math.sin(da) * (rad + 10);
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(dx, dy, Math.max(2.5, rad * 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (enemy.bossId === 'split') {
      drawInkAuraRing(x, y, rad, '#c084fc', t * 2.5, 0.06);
      ctx.save();
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.5;
      for (var p = 0; p < 3; p++) {
        var pa = t * 1.8 + p * (Math.PI * 2 / 3);
        ctx.beginPath();
        ctx.arc(x + Math.cos(pa) * (rad * 0.35), y + Math.sin(pa) * (rad * 0.35), rad * 0.45, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (enemy.bossId === 'frost') {
      ctx.save();
      ctx.strokeStyle = '#9bd4ff';
      ctx.lineWidth = Math.max(1.6, rad * 0.08);
      ctx.globalAlpha = 0.55 + Math.sin(t * 4) * 0.15;
      for (var c = 0; c < 3; c++) {
        var ca = c * Math.PI / 3 + t * 0.5;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ca) * (rad + 4), y + Math.sin(ca) * (rad + 4));
        ctx.lineTo(x + Math.cos(ca) * (rad + 12), y + Math.sin(ca) * (rad + 12));
        ctx.stroke();
      }
      drawInkAuraRing(x, y, rad, '#9bd4ff', t * 2, 0.03);
      ctx.restore();
    }
    if (enemy.bossId === 'rush' && !enemy.enraged) {
      drawInkAuraRing(x, y, rad, '#ff5a36', t * 2, 0.04);
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
    if (enemy.freeze > 0) bob = 0;
    var ang = enemyFacing(enemy, pos);
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    drawEnemyShadow(rad);
    ctx.save();
    if (enemy.type === 'swift') ctx.rotate(ang);
    if (enemy.boss) drawBossBody(enemy, rad, colors, bob);
    else if (enemy.type === 'shard') drawShardBody(rad, colors);
    else if (enemy.type === 'hopper') drawHopperBody(rad, colors, bob, !!enemy.jumping);
    else if (enemy.type === 'devil') drawDevilBody(rad, colors, bob);
    else if (enemy.type === 'swift') drawSwiftBody(rad, colors, bob);
    else if (enemy.type === 'brute') drawBruteBody(rad, colors, bob);
    else drawGruntBody(rad, colors, bob);
    ctx.restore();
    ctx.restore();
    drawEnemyStatusFx(enemy, x, y, rad);
    if (enemy.freeze > 0) {
      ctx.strokeStyle = '#2f7bff';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - rad - 3, y - rad - 3, (rad + 3) * 2, (rad + 3) * 2);
    } else if (enemy.slowTime > 0) {
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
    if (enemy.boss) {
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
      if (shock.artSheet != null) {
        drawBoltSprite(shock.artSheet, shock.artRow, 'impact', worldX(shock.x), worldY(shock.y), 0, shock.radius * view.tile * 1.15, 0.5);
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
      if (pointInRect(point.x, point.y, menu)) return;
    }
    var cell = cellAt(point.x, point.y);
    if (!cell) {
      clearSelection();
      return;
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
      state.pickMode = 'wall';
      state.banner = { text: '阻擋物', sub: '點道路，擋住怪物 10 秒', life: 4 };
      toast('點在道路上');
    });
    itemPushBtn.addEventListener('click', usePush);
    routeBar.addEventListener('click', function (event) {
      var auto = event.target.closest('[data-autofill]');
      if (auto && !auto.disabled) {
        autoFillRoute(auto.getAttribute('data-autofill'));
        return;
      }
      var tile = event.target.closest('[data-tile]');
      if (!tile || tile.disabled) return;
      selectTile(tile.getAttribute('data-tile'));
    });
    var welcomeStart = document.getElementById('btn-welcome-start');
    var openCodexBtn = document.getElementById('btn-open-codex');
    var openTowersBtn = document.getElementById('btn-open-towers');
    var openHellBtn = document.getElementById('btn-open-hell');
    var menuBack = document.getElementById('btn-menu-back');
    var codexBack = document.getElementById('btn-codex-back');
    var towersBack = document.getElementById('btn-towers-back');
    var hellBack = document.getElementById('btn-hell-back');
    if (welcomeStart) welcomeStart.addEventListener('click', showMenu);
    if (openCodexBtn) openCodexBtn.addEventListener('click', openCodex);
    if (openTowersBtn) openTowersBtn.addEventListener('click', openTowerInfo);
    if (openHellBtn) openHellBtn.addEventListener('click', openHellInfo);
    if (menuBack) menuBack.addEventListener('click', showWelcome);
    if (codexBack) codexBack.addEventListener('click', showMenu);
    if (towersBack) towersBack.addEventListener('click', showMenu);
    if (hellBack) hellBack.addEventListener('click', showMenu);
    if (pauseBtn) pauseBtn.addEventListener('click', togglePause);
    document.getElementById('btn-mode-campaign').addEventListener('click', openChapters);
    document.getElementById('btn-mode-custom').addEventListener('click', function () { openDifficulty('custom'); });
    document.getElementById('btn-mode-infinite').addEventListener('click', function () { openDifficulty('infinite'); });
    document.getElementById('btn-difficulty-back').addEventListener('click', showMenu);
    document.getElementById('btn-chapters-back').addEventListener('click', showMenu);
    document.getElementById('btn-stages-back').addEventListener('click', openChapters);
    backBtn.addEventListener('click', requestMenu);
    inspectActions.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      var act = btn.dataset.act;
      if (act === 'upgrade') upgradeSelected();
      else if (act === 'spec') specialize(btn.dataset.spec);
      else if (act === 'skill') castHeroSkill(selectedTower());
      else if (act === 'sell') sellSelected();
      else if (act === 'sell-cancel') {
        state.sellArmed = false;
        renderInspector();
      }
    });
    speedBtn.addEventListener('click', cycleSpeed);
    soundBtn.addEventListener('click', function () {
      Sfx.muted = !Sfx.muted;
      saveNumber('fantasia-td-mute', Sfx.muted ? 1 : 0);
      syncSoundButton();
      if (!Sfx.muted) {
        Sfx.unlock();
        Sfx.ui();
      }
    });
    window.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (state.userPaused || (state.phase !== 'menu' && !modal.classList.contains('is-open'))) togglePause();
        else clearSelection();
        return;
      }
      if (event.target.closest && event.target.closest('button')) return;
      if ((event.key === ' ' || event.key === 'Enter') && state.phase === 'prep' && !state.pickMode && !state.adBusy && !state.hellWheel && screenMenu.hidden && screenChapters.hidden && screenStages.hidden && screenDifficulty.hidden) {
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
    window.addEventListener('resize', resize);
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
        }
        updateCosmetic(dt * rate);
        syncHud();
        syncRouteBar();
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

  function punchMinions() {
    for (var i = 0; i < MINION_PAIRS.length; i++) {
      for (var k = 0; k < MINION_PAIRS[i].length; k++) {
        var minion = MINION_PAIRS[i][k];
        var frame = minion.frame;
        minion.stamp = keyedStamp(minionSheet, frame, null);
      }
    }
  }

  function loadSheets(done) {
    done();
  }

  function boot() {
    bindUi();
    setRoute(buildInfinitePath());
    resize();
    showWelcome();
    syncSpeedButton();
    syncSoundButton();
    Ads.init().catch(function () {});
    loadSheets(function () { requestAnimationFrame(frame); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
