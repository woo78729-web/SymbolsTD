/**
 * 幻想 TD — portrait tower defense.
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

  var TOWERS = {
    arrow: {
      name: '箭塔',
      blurb: '單體 · 高攻速 · 高傷害',
      cost: 50,
      color: '#7dcea0',
      upgradeCost: [45, 75, 110, 160],
      levels: [
        { damage: 15, range: 2.35, cooldown: 0.4, splash: 0, targets: 1 },
        { damage: 24, range: 2.55, cooldown: 0.34, splash: 0, targets: 1 },
      ],
      specs: {
        bolt: {
          name: '電塔',
          blurb: '一發串連。3等打2隻，4等3隻，5等4隻',
          color: '#161616',
          levels: [
            { damage: 36, range: 2.65, cooldown: 0.48, splash: 0, targets: 1, chain: 2, chainRange: 1.85 },
            { damage: 50, range: 2.7, cooldown: 0.44, splash: 0, targets: 1, chain: 3, chainRange: 1.95 },
            { damage: 66, range: 2.75, cooldown: 0.4, splash: 0, targets: 1, chain: 4, chainRange: 2.05 },
          ],
        },
        laser: {
          name: '雷射塔',
          blurb: '鎖定最前面的一隻，持續高傷直到死亡',
          color: '#161616',
          levels: [
            { damage: 52, range: 2.75, cooldown: 0.2, splash: 0, targets: 1, beam: true },
            { damage: 76, range: 2.85, cooldown: 0.2, splash: 0, targets: 1, beam: true },
            { damage: 104, range: 2.95, cooldown: 0.2, splash: 0, targets: 1, beam: true },
          ],
        },
      },
    },
    cannon: {
      name: '砲塔',
      blurb: '攻速慢 · 範圍傷害',
      cost: 90,
      color: '#e7a15a',
      upgradeCost: [70, 120, 170, 230],
      levels: [
        { damage: 30, range: 2.05, cooldown: 1.28, splash: 0.9 },
        { damage: 48, range: 2.2, cooldown: 1.18, splash: 1 },
      ],
      specs: {
        ice: {
          name: '冰塔',
          blurb: '藍色光波。碰到就緩速，第 3 次凍結一下',
          color: '#8fd4ff',
          levels: [
            { damage: 52, range: 2.4, cooldown: 1.05, splash: 1.2, effect: 'slow', slow: 0.4, slowTime: 1.8 },
            { damage: 52, range: 2.4, cooldown: 0.9, splash: 1.42, effect: 'slow', slow: 0.4, slowTime: 1.8 },
            { damage: 52, range: 2.4, cooldown: 0.76, splash: 1.62, effect: 'slow', slow: 0.4, slowTime: 1.8 },
          ],
        },
        fire: {
          name: '火塔',
          blurb: '紅色炸彈。群傷為主，灼燒低，傳染從一開始最多 3 秒',
          color: '#ff7a45',
          levels: [
            { damage: 84, range: 2.4, cooldown: 1.05, splash: 1, effect: 'burn', burn: 5, burnTime: 2.4, burnEvery: 0.5 },
            { damage: 84, range: 2.4, cooldown: 0.9, splash: 1.12, effect: 'burn', burn: 6, burnTime: 2.4, burnEvery: 0.5 },
            { damage: 84, range: 2.4, cooldown: 0.76, splash: 1.24, effect: 'burn', burn: 7, burnTime: 2.4, burnEvery: 0.5 },
          ],
        },
        poison: {
          name: '毒塔',
          blurb: '綠色毒液。打一隻，持續傷害高，傳染從一開始最多 3 秒',
          color: '#3cbf4a',
          levels: [
            { damage: 18, range: 2.4, cooldown: 1.05, splash: 0, effect: 'poison', poison: 26, poisonTime: 3.2, poisonEvery: 0.4 },
            { damage: 18, range: 2.5, cooldown: 0.9, splash: 0, effect: 'poison', poison: 34, poisonTime: 3.2, poisonEvery: 0.4 },
            { damage: 22, range: 2.55, cooldown: 0.76, splash: 0, effect: 'poison', poison: 42, poisonTime: 3.2, poisonEvery: 0.4 },
          ],
        },
        stone: {
          name: '石塔',
          blurb: '咖啡色，傷害往外擴散',
          color: '#d9c7a6',
          levels: [
            { damage: 66, range: 2.75, cooldown: 1.12, splash: 1.55 },
            { damage: 66, range: 3, cooldown: 1.02, splash: 1.8 },
            { damage: 66, range: 3.25, cooldown: 0.94, splash: 2.05 },
          ],
        },
      },
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
  var WAYPOINTS = [];

  var state = {
    gold: START_GOLD,
    lives: START_LIVES,
    shownLives: START_LIVES,
    wave: 0,
    phase: 'prep',
    paused: false,
    best: loadNumber('fantasia-td-best'),
    difficulty: 'normal',
    difficultyMode: 'infinite',
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
    speed: 1,
    adBusy: false,
    banner: null,
    rangePing: null,
    shake: 0,
    hurt: 0,
    time: 0,
    walls: [],
    traps: [],
    gusts: [],
    interestLeft: 0,
    items: { wall: 0, push: 0 },
    pickMode: '',
    cardWave: 0,
    meteor: null,
    pendingHero: '',
    freeSpec: false,
  };

  var pointer = null;
  var toastTimer = 0;
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

  function setRoute(cells) {
    route.cells = cells.map(function (cell) { return { c: cell.c, r: cell.r }; });
    route.set = new Set(route.cells.map(function (cell) { return cell.c + ',' + cell.r; }));
    WAYPOINTS = route.cells.map(function (cell) {
      return { x: cell.c + 0.5, y: cell.r + 0.5 };
    });
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
    var count = [4, 5, 6, 8, 10][stage - 1];
    var waves = [];
    for (var w = 1; w <= count; w++) {
      var boss = stage === 5 && w === count;
      var grunts = 4 + w + (chapter >= 5 ? 1 : 0);
      var swifts = 1;
      if (stage >= 2 && w >= 2) swifts += Math.floor(w / 3);
      if (stage >= 4 && w >= 4) swifts += 1;
      var brutes = 0;
      if (!boss && stage >= 3 && w % 4 === 0) brutes = 1;
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
      blurb: '血量與數量都提高，擊殺金幣變少。起始 60 金、20 生命。',
      hp: 1.36, growth: 1.225, speed: 1.08, speedGrow: 0.042, speedCap: 1.72,
      gold: 0.8, gap: 0.86, gapMin: 0.46, extra: 1, rush: 0.18,
      lives: 20, purse: 60, swiftFrom: 3, swiftEvery: 3, bruteEvery: 5,
    },
    hell: {
      id: 'hell', name: '地獄',
      blurb: '血量、速度、數量都更高，擊殺金幣較少。起始 100 金、14 生命。',
      hp: 1.6, growth: 1.28, speed: 1.14, speedGrow: 0.048, speedCap: 1.95,
      gold: 0.65, gap: 0.78, gapMin: 0.4, extra: 2, rush: 0.22,
      lives: 14, purse: 100, swiftFrom: 2, swiftEvery: 2, bruteEvery: 3,
    },
  };

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
    return { jobs: jobs, grunts: gruntCount, swifts: swifts, brutes: brutes, boss: boss };
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
    var brutes = 0;
    var boss = bossForWave(wave);
    if (boss) {
      jobs.push({ type: 'boss', gap: 1.7, bossIndex: bossIndexFor(wave) });
    } else if (wave % 5 === 0) {
      jobs.push({ type: 'brute', gap: 1.15 });
      brutes = 1;
    }
    return { jobs: jobs, grunts: gruntCount, swifts: swifts, brutes: brutes, boss: boss };
  }

  function compositionText(plan) {
    if (state.mode !== 'campaign') {
      var count = plan.grunts + plan.swifts + plan.brutes;
      var text = '隨機小怪 ' + count;
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
    var table = {
      grunt: { hp: gruntHp, speed: gruntSpeed, gold: Math.max(2, wave), radius: 0.3, color: '#e25b4a', leak: 1 },
      swift: { hp: Math.round(gruntHp * 0.62), speed: Math.min(diff ? speedCap + 0.45 : 2.1, gruntSpeed * 1.55), gold: Math.max(2, wave - 1), radius: 0.23, color: '#f0a202', leak: 1 },
      brute: { hp: Math.round(gruntHp * 7.5), speed: gruntSpeed * 0.52, gold: 8 + wave * 2, radius: 0.44, color: '#8d6bff', leak: 3 },
    };
    var spec = table[type] || table.grunt;
    if (goldMul !== 1) spec.gold = Math.max(2, Math.round(spec.gold * goldMul));
    var kind = pickMinion(type === 'swift' ? 'swift' : 'grunt');
    var resist = rollResist(wave);
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
    var bossMul = 11 + Math.min(wave, 40) * 0.22;
    if (diff && diff.id === 'hell') bossMul = 3.6 + Math.min(wave, 40) * 0.04;
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
    var plan = planWave(n);
    state.wave = n;
    state.phase = 'combat';
    state.paused = false;
    state.waveGoldEarned = 0;
    state.waveDoubled = false;
    state.spawnQueue = plan.jobs.slice();
    state.spawnTimer = 0.55;
    state.banner = plan.boss
      ? { text: '第 ' + n + ' 波 · ' + plan.boss.name, sub: plan.boss.blurb, life: 3.2 }
      : { text: '第 ' + n + ' 波', sub: compositionText(plan), life: 1.8 };
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
    updateTowers(dt);
    updateGusts(dt);
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
    state.enemies.push(spawned);
    state.spawnTimer = state.spawnQueue.length ? state.spawnQueue[0].gap : 0;
  }

  function updateEnemies(dt) {
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead || state.phase !== 'combat') continue;
      var step = moveSpeed(enemy) * dt;
      var block = wallStop(enemy.dist);
      if (block != null) step = Math.min(step, Math.max(0, block - 0.32 - enemy.dist));
      enemy.dist += step;
      triggerTrap(enemy);
      if (enemy.freeze > 0) enemy.freeze -= dt;
      if (enemy.slowTime > 0) {
        enemy.slowTime -= dt;
        if (enemy.slowTime <= 0) enemy.slow = 0;
      }
      if (enemy.dist >= WAYPOINTS.length - 1) {
        leakEnemy(enemy);
        continue;
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
  }

  function tickBoss(enemy, dt) {
    enemy.pulse += dt;
    var pos = pointAt(enemy.dist);
    if (enemy.bossId === 'regen') {
      var before = enemy.hp;
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.025 * dt);
      enemy.regenShow = (enemy.regenShow || 0) - dt;
      if (enemy.hp > before && enemy.hp < enemy.maxHp && enemy.regenShow <= 0) {
        enemy.regenShow = 1.15;
        spawnFloater(pos.x, pos.y - 0.6, '回復', '#3ecf8e');
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
      for (var i = 0; i < state.enemies.length; i++) {
        var other = state.enemies[i];
        if (other === enemy || other.dead || other.hp >= other.maxHp) continue;
        var otherPos = pointAt(other.dist);
        if (Math.hypot(otherPos.x - pos.x, otherPos.y - pos.y) > 1.8) continue;
        var heal = Math.min(other.maxHp - other.hp, enemy.mendPower);
        other.hp += heal;
        if (state.time - (other.lastMend || 0) > 0.9) {
          other.lastMend = state.time;
          spawnFloater(otherPos.x, otherPos.y - 0.35, '+' + heal, '#ff8fab');
        }
      }
    }
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
    copy.damage = Math.max(1, Math.round(copy.damage * 1.35));
    copy.cooldown = copy.cooldown * 0.85;
    copy.range = Math.round(copy.range * 1.1 * 100) / 100;
    if (copy.splash) copy.splash = Math.round(copy.splash * 1.1 * 100) / 100;
    if (copy.chainRange) copy.chainRange = Math.round(copy.chainRange * 1.1 * 100) / 100;
    return copy;
  }

  function towerStats(tower) {
    var def = TOWERS[tower.type];
    var stats = tower.level < 2
      ? def.levels[tower.level]
      : def.specs[tower.spec].levels[Math.min(2, tower.level - 2)];
    if (tower.level >= 5) stats = rankBoost(stats);
    return applySupport(stats, tower);
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
    if (id === 'sword') return '劍士';
    if (id === 'archer') return '弓箭手';
    if (id === 'mage') return '法師';
    if (id === 'priest') return '祝念師';
    return '英雄';
  }

  function priestAura(tower) {
    var diameter = 5 + tower.level * (5 / 9);
    return { radius: diameter / 2, bonus: 0.05 + tower.level * (0.10 / 9) };
  }

  function supportBonus(tower) {
    var best = 0;
    for (var i = 0; i < state.towers.length; i++) {
      var other = state.towers[i];
      if (other.type !== 'hero' || other.hero !== 'priest' || other.id === tower.id) continue;
      var aura = priestAura(other);
      var dist = Math.hypot((other.c + 0.5) - (tower.c + 0.5), (other.r + 0.5) - (tower.r + 0.5));
      if (dist <= aura.radius + 0.001) best = Math.max(best, aura.bonus);
    }
    return best;
  }

  function applySupport(stats, tower) {
    var bonus = supportBonus(tower);
    if (bonus <= 0) return stats;
    var copy = cloneStats(stats);
    copy.damage = Math.max(1, Math.round((copy.damage || 0) * (1 + bonus)));
    if (copy.cooldown) copy.cooldown = copy.cooldown / (1 + bonus);
    return copy;
  }

  function heroStats(tower) {
    var lv = tower.level;
    var stats;
    if (tower.hero === 'priest') {
      stats = { range: priestAura(tower).radius, damage: 0, cooldown: 1, targets: 0 };
    } else if (tower.hero === 'sword') {
      var power = tower.buffTime > 0 ? (0.10 + lv * 0.02) : 0;
      stats = {
        range: 1.7 + lv * 0.06,
        damage: Math.round((22 + lv * 8) * (1 + power)),
        cooldown: Math.max(0.42, (0.72 - lv * 0.03) / (1 + power)),
        targets: 1,
        slashDist: 2.2 + lv * 0.25,
        slashMul: 1.4 + lv * 0.12,
      };
    } else if (tower.hero === 'archer') {
      stats = {
        range: 2.6 + lv * 0.08,
        damage: 14 + lv * 5,
        cooldown: Math.max(0.5, 0.85 - lv * 0.03),
        targets: 3,
      };
    } else {
      stats = {
        range: 2.3 + lv * 0.05,
        damage: 18 + lv * 4,
        cooldown: Math.max(0.7, 1.15 - lv * 0.04),
        targets: 1,
      };
    }
    if (tower.hero !== 'priest') stats = applySupport(stats, tower);
    return stats;
  }

  function heroBlurb(tower) {
    var need = tower.level >= 9 ? 0 : 6 + tower.level * 4;
    var xp = tower.level >= 9 ? '已滿等' : ('經驗 ' + tower.xp + '/' + need);
    if (tower.hero === 'sword') return '每三下放出劍氣。主動：劍神附體。' + xp;
    if (tower.hero === 'archer') return '一次三箭，每三輪丟陷阱。主動：毒性連鎖。' + xp;
    if (tower.hero === 'mage') return '火、冰、風輪換。主動：隕石術。' + xp;
    var aura = priestAura(tower);
    return '光環直徑 ' + fmt(aura.radius * 2) + ' 格，攻與攻速 +' + Math.round(aura.bonus * 100) + '%。' + xp;
  }

  function towerById(id) {
    if (id == null) return null;
    for (var i = 0; i < state.towers.length; i++) {
      if (state.towers[i].id === id) return state.towers[i];
    }
    return null;
  }

  function hasHero() {
    for (var i = 0; i < state.towers.length; i++) {
      if (state.towers[i].type === 'hero') return true;
    }
    return false;
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
    state.gusts = [];
    state.interestLeft = 0;
    state.items = { wall: 0, push: 0 };
    state.pickMode = '';
    state.cardWave = 0;
    state.meteor = null;
    state.pendingHero = '';
    state.freeSpec = false;
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
    if (state.meteor.tick <= 0) {
      state.meteor.tick = 1;
      var slice = state.meteor.pct / 10;
      for (var i = 0; i < state.enemies.length; i++) {
        var enemy = state.enemies[i];
        if (enemy.dead) continue;
        hurtEnemy(enemy, Math.max(1, enemy.maxHp * slice), state.meteor.ownerId);
      }
    }
    if (state.meteor.life <= 0) state.meteor = null;
  }

  function updateSlash(shot, dt) {
    shot.life -= dt;
    var step = shot.speed * dt;
    shot.x += Math.cos(shot.angle) * step;
    shot.y += Math.sin(shot.angle) * step;
    shot.travel += step;
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead || shot.hit[enemy.id]) continue;
      var pos = pointAt(enemy.dist);
      if (Math.hypot(pos.x - shot.x, pos.y - shot.y) <= enemy.radius + 0.28) {
        shot.hit[enemy.id] = true;
        hurtEnemy(enemy, shot.damage, shot.ownerId);
      }
    }
    if (shot.travel >= shot.maxDist || shot.life <= 0) shot.dead = true;
  }

  function updateCut(shot, dt) {
    shot.life -= dt;
    if (shot.life <= 0) shot.dead = true;
  }

  function launchSlash(tower, target, stats) {
    var pos = pointAt(target.dist);
    var angle = Math.atan2(pos.y - (tower.r + 0.5), pos.x - (tower.c + 0.5));
    state.projectiles.push({
      kind: 'slash',
      x: tower.c + 0.5,
      y: tower.r + 0.5,
      angle: angle,
      damage: Math.round(stats.damage * stats.slashMul),
      speed: 7,
      travel: 0,
      maxDist: stats.slashDist,
      life: 1.2,
      ownerId: tower.id,
      hit: {},
      dead: false,
    });
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
    var roll = Math.floor(Math.random() * 3);
    var pos = pointAt(target.dist);
    var rank = tower.level / 9;
    if (roll === 0) {
      var burned = enemiesNear(pos.x, pos.y, 1.1);
      for (var i = 0; i < burned.length; i++) hurtEnemy(burned[i], 40 + tower.level * 10, tower.id);
      state.shocks.push({ x: pos.x, y: pos.y, life: 0.36, maxLife: 0.36, radius: 1.1, color: '#e02323', rings: 2, bomb: true });
    } else if (roll === 1) {
      var frozen = enemiesNear(pos.x, pos.y, 1.05);
      var hold = 2 + rank;
      for (var n = 0; n < frozen.length; n++) {
        hurtEnemy(frozen[n], 18 + tower.level * 4, tower.id);
        if (resists(frozen[n], 'freeze')) resistFloater(frozen[n], '抗凍');
        else frozen[n].freeze = Math.max(frozen[n].freeze || 0, hold);
      }
      state.shocks.push({ x: pos.x, y: pos.y, life: 0.36, maxLife: 0.36, radius: 1.05, color: '#2f7bff', rings: 2, bomb: false });
    } else {
      var pulled = enemiesNear(pos.x, pos.y, 1.15);
      for (var g = 0; g < pulled.length; g++) hurtEnemy(pulled[g], 8 + tower.level * 2, tower.id);
      state.gusts.push({ x: pos.x, y: pos.y, life: 2 + rank, radius: 1.15, pull: 1.1 });
    }
  }

  function heroFire(tower, targets, stats) {
    tower.shots = (tower.shots || 0) + 1;
    tower.swing = 1;
    if (tower.hero === 'sword') {
      var hit = pointAt(targets[0].dist);
      hurtEnemy(targets[0], stats.damage, tower.id);
      state.projectiles.push({
        kind: 'cut',
        x: hit.x,
        y: hit.y,
        angle: tower.aim,
        life: 0.28,
        maxLife: 0.28,
        dead: false,
      });
      if (tower.shots % 3 === 0) launchSlash(tower, targets[0], stats);
      Sfx.arrow();
    } else if (tower.hero === 'archer') {
      for (var i = 0; i < targets.length && i < 3; i++) {
        state.projectiles.push({
          kind: 'arrow',
          x: tower.c + 0.5,
          y: tower.r + 0.5,
          angle: tower.aim,
          damage: stats.damage,
          speed: 9.5,
          targetId: targets[i].id,
          dead: false,
          life: 1.5,
          ownerId: tower.id,
        });
      }
      if (tower.shots % 3 === 0) dropTrap();
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
    tower.cooldown -= dt;
    var targets = targetsInRange(tower, stats.range, stats.targets || 1);
    if (!targets.length) return;
    var pos = pointAt(targets[0].dist);
    tower.aim = Math.atan2(pos.y - (tower.r + 0.5), pos.x - (tower.c + 0.5));
    if (tower.cooldown > 0) return;
    heroFire(tower, targets, stats);
    tower.cooldown = stats.cooldown;
  }

  function castHeroSkill(tower) {
    if (!tower || tower.type !== 'hero' || tower.hero === 'priest') return;
    if (state.phase !== 'combat') { toast('戰鬥中才能施放'); return; }
    if (tower.skillCd > 0) return;
    var lv = tower.level;
    tower.skillCd = 50;
    if (tower.hero === 'sword') {
      tower.buffTime = 10 + lv * 2;
      toast('劍神附體');
    } else if (tower.hero === 'archer') {
      tower.auraTime = 4;
      var stats = heroStats(tower);
      var victims = targetsInRange(tower, stats.range, 99);
      var slow = Math.min(0.55, 0.25 + lv * 0.03);
      for (var i = 0; i < victims.length; i++) {
        if (resists(victims[i], 'slow')) resistFloater(victims[i], '抗緩');
        else {
          victims[i].slow = Math.max(victims[i].slow || 0, slow);
          victims[i].slowTime = Math.max(victims[i].slowTime || 0, 3);
        }
        applyPoison(victims[i], 8 + lv * 4, 3, 0.5);
        victims[i].heroTag = tower.id;
      }
      toast('毒性連鎖');
    } else if (tower.hero === 'mage') {
      state.meteor = { life: 10, tick: 0.15, pct: 0.10 + (lv / 9) * 0.15, ownerId: tower.id };
      toast('隕石術');
    }
    Sfx.ui();
    renderInspector();
  }

  function cardWaveDue(wave) {
    return (state.mode === 'infinite' || state.mode === 'custom') && wave > 0 && wave % 10 === 0;
  }

  function finishCard() {
    var cleared = state.cardWave;
    state.pickMode = '';
    state.freeSpec = false;
    state.banner = null;
    syncHud();
    if (state.mode === 'custom' && cleared % 10 === 0) enterEdit();
    else startWave(cleared + 1);
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

  function placeHero(cell) {
    state.towers.push({
      id: state.nextId++,
      type: 'hero',
      hero: state.pendingHero,
      c: cell.c,
      r: cell.r,
      level: 0,
      xp: 0,
      spec: null,
      invested: 0,
      cooldown: 0.2,
      aim: -Math.PI / 2,
      shots: 0,
      skillCd: 0,
      buffTime: 0,
    });
    state.pendingHero = '';
    Sfx.build();
    toast('英雄已就位，選定後不能轉職');
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
      if (isPath(cell.c, cell.r) || towerAt(cell.c, cell.r)) { toast('點沒有塔的空地'); return true; }
      placeHero(cell);
      finishCard();
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
    state.banner = { text: heroName(id), sub: '點空地放置，選定後不能轉職', life: 6 };
    closeModal();
    toast('點空地放置' + heroName(id));
    syncHud();
  }

  function openHeroPick() {
    var classes = [
      { id: 'sword', name: '劍士', desc: '每三下劍氣。主動：劍神附體' },
      { id: 'archer', name: '弓箭手', desc: '一次三箭，路上陷阱。主動：毒性連鎖' },
      { id: 'mage', name: '法師', desc: '火、冰、風輪換。主動：隕石術' },
      { id: 'priest', name: '祝念師', desc: '不攻擊。光環提升攻與攻速' },
    ];
    openModal({
      tone: 'reward',
      kicker: '英雄塔',
      title: '選擇英雄',
      desc: '選定後不能轉職。英雄靠擊殺升到 10 等，不能用金幣升級。',
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
      if (hasHero()) { toast('場上已有英雄'); finishCard(); return; }
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

  function openCardDraft(cleared) {
    state.phase = 'reward';
    state.paused = true;
    state.cardWave = cleared;
    var pool = [
      { id: 'gold', name: '金幣 +200', desc: '立刻獲得 200 金幣' },
      { id: 'interest', name: '利息', desc: '立刻 +50，接下來 5 波每波 +30' },
      { id: 'level', name: '塔升級', desc: '選一座塔永久 +1 等，可到 6 等並全面加強' },
      { id: 'wall', name: '阻擋物', desc: '放在路上，擋住怪物 10 秒' },
      { id: 'push', name: '擊退', desc: '使用後全場怪物沿路退回總長的 10%' },
      { id: 'hero', name: '英雄塔', desc: '自選英雄。選定後不能轉職，打怪升到 10 等' },
    ].filter(function (card) { return card.id !== 'hero' || !hasHero(); });
    var picks = [];
    var bag = pool.slice();
    while (picks.length < 3 && bag.length) {
      picks.push(bag.splice(Math.floor(Math.random() * bag.length), 1)[0]);
    }
    openModal({
      tone: 'reward',
      kicker: '第 ' + cleared + ' 波',
      title: '三選一',
      desc: '選一張卡。英雄選定職業後不能更換。',
      actions: picks.map(function (card) {
        return {
          label: card.name + '　' + card.desc,
          className: 'btn-ghost',
          onClick: function () { chooseCard(card.id); },
        };
      }),
    });
  }

  function needsSpec(tower) {
    return tower.level === 1 && !tower.spec;
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
      if (tower.type === 'hero') {
        updateHero(tower, dt);
        continue;
      }
      var stats = towerStats(tower);
      if (stats.beam) {
        updateLaser(tower, stats, dt);
        continue;
      }
      tower.cooldown -= dt;
      var targets = targetsInRange(tower, stats.range, stats.targets || 1);
      if (!targets.length) continue;
      var pos = pointAt(targets[0].dist);
      var desired = Math.atan2(pos.y - (tower.r + 0.5), pos.x - (tower.c + 0.5));
      tower.aim = lerpAngle(tower.aim, desired, Math.min(1, dt * 12));
      if (tower.cooldown <= 0) {
        fire(tower, targets, stats);
        tower.cooldown = stats.cooldown;
      }
    }
  }

  function enemyInRange(tower, enemy, range) {
    var pos = pointAt(enemy.dist);
    var dx = pos.x - (tower.c + 0.5);
    var dy = pos.y - (tower.r + 0.5);
    return dx * dx + dy * dy <= range * range;
  }

  function updateLaser(tower, stats, dt) {
    var target = findEnemy(tower.beamId);
    if (target && !enemyInRange(tower, target, stats.range)) target = null;
    if (!target) {
      var front = targetsInRange(tower, stats.range, 1);
      target = front.length ? front[0] : null;
      tower.beamId = target ? target.id : null;
    }
    if (!target) return;
    var pos = pointAt(target.dist);
    tower.aim = Math.atan2(pos.y - (tower.r + 0.5), pos.x - (tower.c + 0.5));
    tower.flash = 0.4;
    tower.cooldown -= dt;
    if (tower.cooldown > 0) return;
    tower.cooldown = stats.cooldown;
    hurtEnemy(target, stats.damage);
    if (target.dead) tower.beamId = null;
  }

  function targetsInRange(tower, range, limit) {
    var ox = tower.c + 0.5;
    var oy = tower.r + 0.5;
    var found = [];
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead) continue;
      var pos = pointAt(enemy.dist);
      var dx = pos.x - ox;
      var dy = pos.y - oy;
      if (dx * dx + dy * dy > range * range) continue;
      found.push(enemy);
    }
    found.sort(function (a, b) { return b.dist - a.dist; });
    if (found.length > limit) found.length = limit;
    return found;
  }

  function fire(tower, targets, stats) {
    var originX = tower.c + 0.5;
    var originY = tower.r + 0.5;
    tower.flash = 1;
    var look = towerLook(tower);
    if (tower.type === 'arrow' && tower.spec === 'bolt') {
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
        hurtEnemy(chain[c], stats.damage);
        fromX = hit.x;
        fromY = hit.y;
      }
      Sfx.arrow();
      vibrateHit();
      return;
    }
    if (tower.type === 'arrow') {
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
          artSheet: look.sheet,
          artRow: look.row,
        });
      }
      Sfx.arrow();
      vibrateHit();
      return;
    }
    if (tower.spec === 'ice') {
      state.projectiles.push({
        kind: 'wave',
        x: originX,
        y: originY,
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
    if (tower.spec === 'poison') {
      state.projectiles.push({
        kind: 'poison',
        x: originX,
        y: originY,
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
    var enemy = targets[0];
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
      speed: 4.2,
      dead: false,
      effect: stats.effect || '',
      slow: stats.slow || 0,
      slowTime: stats.slowTime || 0,
      burn: stats.burn || 0,
      burnTime: stats.burnTime || 0,
      burnEvery: stats.burnEvery || 0.5,
      color: tower.spec === 'fire' ? '#e02323' : (tower.spec === 'stone' ? '#7a4a28' : '#161616'),
      rings: tower.spec === 'fire' || tower.spec === 'stone' ? 3 : 1,
      bomb: tower.spec === 'fire',
      artSheet: look.sheet,
      artRow: look.row,
    });
    Sfx.cannon();
    vibrate(16);
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
    for (var i = 0; i < state.projectiles.length; i++) {
      var shot = state.projectiles[i];
      if (shot.dead) continue;
      if (shot.kind === 'arrow') updateArrow(shot, dt);
      else if (shot.kind === 'slash') updateSlash(shot, dt);
      else if (shot.kind === 'cut') updateCut(shot, dt);
      else if (shot.kind === 'poison') updatePoison(shot, dt);
      else if (shot.kind === 'wave') updateWave(shot, dt);
      else updateShell(shot, dt);
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
    var pos = pointAt(target.dist);
    var dx = pos.x - shot.x;
    var dy = pos.y - shot.y;
    var dist = Math.hypot(dx, dy) || 0.0001;
    shot.angle = Math.atan2(dy, dx);
    if (dist <= target.radius + 0.12) {
      shot.dead = true;
      hurtEnemy(target, shot.damage, shot.ownerId);
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
    var pos = pointAt(target.dist);
    var dx = pos.x - shot.x;
    var dy = pos.y - shot.y;
    var dist = Math.hypot(dx, dy) || 0.0001;
    if (dist <= target.radius + 0.12) {
      shot.dead = true;
      hurtEnemy(target, shot.damage);
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
      if (dist <= shot.splash + enemy.radius * 0.35) {
        hurtEnemy(enemy, shot.damage * (dist <= shot.splash * 0.5 ? 1 : 0.62));
        if (!enemy.dead) applyShellEffect(enemy, shot);
      }
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
      hurtEnemy(enemy, shot.damage);
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
      var pos = pointAt(enemy.dist);
      var dist = Math.hypot(pos.x - x, pos.y - y);
      if (dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }
    return best;
  }

  function hurtEnemy(enemy, amount, ownerId) {
    if (!enemy || enemy.dead || state.phase !== 'combat') return;
    if (ownerId) {
      var owner = towerById(ownerId);
      if (owner && owner.type === 'hero') enemy.heroTag = owner.id;
    }
    var damage = Math.max(1, Math.round(amount));
    if (enemy.bossId === 'armor') damage = Math.max(1, Math.round(damage * 0.5));
    if (enemy.shield > 0) {
      var blocked = Math.min(enemy.shield, damage);
      enemy.shield -= blocked;
      damage -= blocked;
      enemy.hitFlash = 0.12;
      if (enemy.shield <= 0) {
        var broken = pointAt(enemy.dist);
        spawnFloater(broken.x, broken.y - 0.6, '護盾破裂', '#67e8f9');
      }
      if (damage <= 0) return;
    }
    enemy.hp -= damage;
    enemy.hitFlash = 0.12;
    if (state.time - enemy.lastNum > 0.07) {
      enemy.lastNum = state.time;
      var pos = pointAt(enemy.dist);
      spawnFloater(pos.x, pos.y - 0.35, String(damage), '#e02323');
    }
    if (enemy.hp <= 0) killEnemy(enemy);
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
        shard.dist = Math.max(0, Math.min(enemy.dist + (s - 1) * 0.22, WAYPOINTS.length - 1.05));
        queueEnemy(shard);
      }
      var splitPos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
      spawnFloater(splitPos.x, splitPos.y - 0.5, '分裂', '#c084fc');
    }
    state.gold += enemy.gold;
    state.waveGoldEarned += enemy.gold;
    rewardHeroKill(enemy);
    var pos = pointAt(Math.min(enemy.dist, WAYPOINTS.length - 1));
    spawnFloater(pos.x, pos.y - 0.1, '+' + enemy.gold, '#f2c14e');
    burst(pos.x, pos.y, enemy.color, 10);
    Sfx.kill();
  }

  function onWaveClear() {
    if (state.phase !== 'combat') return;
    state.paused = true;
    state.projectiles = [];
    state.arcs = [];
    state.tileGainText = '';
    if (state.mode === 'custom' && state.wave % 5 === 0) state.tileGainText = grantRouteTiles();
    Sfx.fanfare();
    if (state.mode === 'campaign' && state.wave >= state.levelWaves) {
      state.phase = 'victory';
      state.outcome = 'victory';
      openVictoryModal();
      return;
    }
    state.phase = 'reward';
    state.outcome = 'reward';
    openRewardModal();
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
    if (state.banner) {
      state.banner.life -= dt;
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

  function adGoldBonus() {
    return Math.round(state.waveGoldEarned * 0.3);
  }

  function goldAdReady() {
    return state.wave > 0 && state.wave % 3 === 0 && state.waveGoldEarned > 0 && adGoldBonus() > 0 && !state.waveDoubled;
  }

  function rewardDesc() {
    var text = state.waveDoubled
      ? '本波獲得 ' + (state.waveGoldEarned + adGoldBonus()) + ' 金幣（含廣告 +30%）'
      : '本波獲得 ' + state.waveGoldEarned + ' 金幣';
    if (state.tileGainText) text += '。獲得路線圖 ' + state.tileGainText;
    if (state.mode === 'custom' && state.wave % 10 === 0) text += '。接下來可以修改路線';
    if (state.wave % 3 === 0) text += '。下一波開始前會播放插頁廣告';
    return text + '。';
  }

  function openRewardModal() {
    var actions = [];
    if (goldAdReady()) {
      actions.push({
        label: '觀看廣告，本波金幣再 +30%',
        className: 'btn-gold',
        ad: true,
        onClick: watchDouble,
      });
    }
    var nextLabel = cardWaveDue(state.wave)
      ? '選擇卡牌'
      : (state.mode === 'custom' && state.wave % 10 === 0 ? '修改路線' : '下一波');
    actions.push({ label: nextLabel, className: 'btn-mint', onClick: goNextWave });
    openModal({
      tone: 'reward',
      kicker: '波次結算',
      title: '第 ' + state.wave + ' 波守住了',
      desc: rewardDesc(),
      actions: actions,
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
    actions.push({ label: '返回選單', className: 'btn-ghost', onClick: function () { closeModal(); showMenu(); } });
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
    if (goldAdReady()) {
      actions.push({
        label: '觀看廣告，本波金幣再 +30%',
        className: 'btn-gold',
        ad: true,
        onClick: watchDouble,
      });
    }
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
      desc: state.chapterName + ' ' + state.levelName + ' 守住了。基地受傷 ' + state.lifeLost + ' 點。' + starNote + (state.waveDoubled ? ' 本波金幣已 +30%。' : ''),
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

  function watchDouble() {
    if (state.adBusy || !goldAdReady()) return;
    state.adBusy = true;
    setModalBusy(true);
    Ads.showRewarded({ placement: 'wave_double_gold' }).then(function (result) {
      state.adBusy = false;
      if (!result || !result.rewarded) {
        setModalBusy(false);
        toast(result && result.error ? '廣告載入失敗' : '未看完廣告，獎勵未發放');
        return;
      }
      var bonus = adGoldBonus();
      state.gold += bonus;
      state.waveDoubled = true;
      Sfx.unlock();
      Sfx.coin();
      toast('額外獲得 ' + bonus + ' 金幣');
      if (state.outcome === 'victory') openVictoryModal();
      else openRewardModal();
      syncHud();
    });
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
    closeModal();
    function proceed() {
      if (cardWaveDue(cleared)) openCardDraft(cleared);
      else if (state.mode === 'custom' && cleared % 10 === 0) enterEdit();
      else startWave(cleared + 1);
    }
    if (cleared % 3 === 0) {
      state.adBusy = true;
      state.paused = true;
      Ads.showInterstitial({ placement: 'wave_interval' }).then(function () {
        state.adBusy = false;
        proceed();
      });
      return;
    }
    proceed();
  }

  function enterEdit() {
    state.phase = 'edit';
    state.paused = true;
    state.editTool = null;
    state.buildType = null;
    state.buildSite = null;
    state.selectedId = null;
    state.sellArmed = false;
    state.banner = { text: '修改路線', sub: '直線拉長或平移，轉彎改道', life: 2.4 };
    toast('塔不能移動。要換位子請出售，返還 8 成');
    renderInspector();
    syncHud();
    syncRouteBar();
  }

  function finishEdit() {
    state.editTool = null;
    startWave(state.wave + 1);
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
    var buttons = routeBar.querySelectorAll('[data-tile]');
    for (var i = 0; i < buttons.length; i++) {
      var kind = buttons[i].getAttribute('data-tile');
      buttons[i].disabled = state.phase !== 'edit';
      buttons[i].classList.toggle('is-selected', state.phase === 'edit' && state.editTool === kind);
    }
    routeHint.textContent = state.phase === 'edit'
      ? '點亮格鋪路，再點同一段可拆回圖檔。塔不能搬，出售返還 8 成。'
      : '每 5 波隨機 +3 張，每 10 波可改道';
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
    screenMenu.hidden = true;
    screenChapters.hidden = true;
    screenStages.hidden = true;
    screenDifficulty.hidden = true;
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
        ? '怪物稍厚、稍密，擊殺金幣稍少。起始 60 金、20 生命。'
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
    if (kicker) kicker.textContent = state.difficultyMode === 'custom' ? '自訂路線' : '無限防守';
    if (note) note.textContent = '普通與地獄分開記錄最遠波次。第 3 波起會出現抗性怪。';
    screenDifficulty.hidden = false;
    renderDifficulties();
  }

  function showMenu() {
    state.phase = 'menu';
    state.paused = true;
    state.editTool = null;
    closeModal();
    hideStoryScreens();
    screenMenu.hidden = false;
    syncRouteBar();
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
    state.gold = level ? level.initialGold : (diff ? diff.purse : START_GOLD);
    state.lives = diff ? diff.lives : START_LIVES;
    state.shownLives = state.lives;
    if (diff) state.best = loadBest(diff.id, mode);
    else if (mode === 'custom') state.best = loadBest('normal', 'custom');
    state.lifeLost = 0;
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
    state.tiles = { straight: 0, turn: 0 };
    state.editTool = null;
    state.outcome = '';
    state.tileGainText = '';
    state.reviveUsed = false;
    state.waveGoldEarned = 0;
    state.waveDoubled = false;
    state.banner = null;
    state.rangePing = null;
    state.shake = 0;
    state.hurt = 0;
    clearRunExtras();
    if (mode === 'campaign') setRoute(chain(level.path));
    else if (mode === 'custom') setRoute(straightColumn(4));
    else setRoute(buildInfinitePath());
    hideStoryScreens();
    closeModal();
    renderInspector();
    syncHud();
    syncRouteBar();
    requestAnimationFrame(resize);
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
    clearRunExtras();
    closeModal();
    renderInspector();
    syncHud();
  }

  function placeChosen(type) {
    var site = state.buildSite;
    if (!site) return;
    if (state.phase !== 'prep' && state.phase !== 'combat' && state.phase !== 'edit') return;
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
    } else {
      state.buildSite = { c: c, r: r };
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
      if (tower.hero !== 'priest') {
        var skillName = tower.hero === 'sword' ? '劍神附體' : (tower.hero === 'archer' ? '毒性連鎖' : '隕石術');
        var cd = tower.skillCd || 0;
        var skill = makeActButton(cd > 0 ? skillName + ' ' + Math.ceil(cd) + '秒' : skillName, 'btn-mint btn-primary-act', 'skill');
        skill.disabled = cd > 0 || state.phase !== 'combat';
        inspectActions.appendChild(skill);
      }
      appendSellRow(Math.floor(tower.invested * sellRatio()));
      return;
    }
    var stats = towerStats(tower);
    var refund = Math.floor(tower.invested * sellRatio());
    var maxed = towerMaxed(tower);
    inspectTitle.textContent = towerLabel(tower) + '  Lv.' + (tower.level + 1);
    inspectMeta.textContent = needsSpec(tower) ? specChoiceText(tower) : statLine(stats);
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
      var upgrade = makeActButton(maxed ? '已滿級' : '升級 ' + nextUpgradeCost(tower), 'btn-mint btn-primary-act', 'upgrade');
      upgrade.disabled = maxed || state.gold < nextUpgradeCost(tower);
      inspectActions.appendChild(upgrade);
    }
    appendSellRow(refund);
  }

  function statLine(stats) {
    var bits = stats.beam
      ? ['持續 ' + Math.round(stats.damage / stats.cooldown) + '/秒', '射程 ' + fmt(stats.range), '鎖定最前']
      : [
        '傷害 ' + stats.damage,
        '射程 ' + fmt(stats.range),
        '攻速 ' + fmt(1 / stats.cooldown) + '/秒',
      ];
    if (stats.chain) bits.push('串連 ' + stats.chain);
    if (stats.splash && stats.effect !== 'slow') bits.push('範圍 ' + fmt(stats.splash));
    if (stats.targets > 1) bits.push('目標 ' + stats.targets);
    if (stats.effect === 'slow') bits.push('緩速 ' + Math.round(stats.slow * 100) + '%', '3次凍結');
    if (stats.effect === 'burn') bits.push('灼燒 ' + Math.round(stats.burn / stats.burnEvery) + '/秒', '傳染3秒');
    if (stats.effect === 'poison') bits.push('中毒 ' + Math.round(stats.poison / stats.poisonEvery) + '/秒', '單體', '傳染3秒');
    return bits.join(' · ');
  }

  function specChoiceText(tower) {
    if (tower.type === 'arrow') return '升到 3 等選擇特化。電塔一發會串連，3等打2隻、4等3隻、5等4隻。雷射塔鎖定最前面的一隻，持續高傷直到死亡。';
    return '升到 3 等選擇特化。冰塔藍色光波，碰到緩速，第 3 次凍結。火塔是紅色炸彈，群傷高、灼燒低。毒塔綠色，打一隻，持續傷害高。火和毒都會傳染，從第一次中算起最多 3 秒。石塔咖啡色，傷害往外擴散。';
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
      var customBoss = state.phase === 'combat' ? bossForWave(state.wave) : null;
      hudWaveSub.textContent = customBoss
        ? '王 · ' + customBoss.name
        : customName + ' · 直線 ' + state.tiles.straight + ' · 轉彎 ' + state.tiles.turn;
    } else if (state.wave === 0) {
      hudWave.textContent = state.mode === 'infinite' ? infiniteProfile().name : '準備';
      hudWaveSub.textContent = '點空地放塔';
    } else {
      hudWave.textContent = '第 ' + state.wave + ' 波';
      var infiniteBoss = state.phase === 'combat' ? bossForWave(state.wave) : null;
      hudWaveSub.textContent = infiniteBoss
        ? '王 · ' + infiniteBoss.name
        : (state.mode === 'infinite' ? infiniteProfile().name : (state.phase === 'combat' ? '入侵中' : '整補'));
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
      var skillName = selected.hero === 'sword' ? '劍神附體' : (selected.hero === 'archer' ? '毒性連鎖' : '隕石術');
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
      waveBtnSub.textContent = '接著第 ' + (state.wave + 1) + ' 波';
    } else {
      waveBtn.disabled = true;
      waveBtnLabel.textContent = state.phase === 'gameover' ? '防線崩潰' : '結算中';
      waveBtnSub.textContent = state.phase === 'gameover' ? '本局結束' : '選擇獎勵';
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
    drawRouteMarks();
    drawRouteHints();
    drawFlashes();
    drawRanges();
    drawTowers();
    drawEnemies();
    drawBeams();
    drawProjectiles();
    drawShocks();
    drawParticles();
    drawFloaters();
    ctx.restore();
    drawHurt();
    drawBanner();
    drawBuildMenu();
    if (state.pickMode === 'level') drawHint('點一座塔，永久提升 1 等');
    else if (state.pickMode === 'heroPlace') drawHint('點空地放置' + heroName(state.pendingHero));
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
    if (state.meteor && state.meteor.life > 0) {
      ctx.save();
      ctx.fillStyle = '#161616';
      for (var m = 0; m < 7; m++) {
        var mx = view.originX + ((Math.sin(state.time * 3 + m) * 0.5 + 0.5) * COLS) * tile;
        var my = view.originY + ((m + state.time * 1.4) % ROWS) * tile;
        ctx.beginPath();
        ctx.arc(mx, my, tile * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function skillAuraOn(tower) {
    if (!tower || tower.type !== 'hero') return false;
    if (tower.hero === 'sword') return tower.buffTime > 0;
    if (tower.hero === 'archer') return tower.auraTime > 0;
    if (tower.hero === 'mage') return !!(state.meteor && state.meteor.ownerId === tower.id);
    return false;
  }

  function drawPossess(tower, s) {
    var hero = tower.hero;
    var pulse = 1 + Math.sin(state.time * 4.5 + tower.id) * 0.04;
    var fill = hero === 'archer' ? 'rgba(46, 158, 72, 0.28)' : (hero === 'mage' ? 'rgba(224, 35, 35, 0.26)' : 'rgba(124, 58, 237, 0.32)');
    var stroke = hero === 'archer' ? '#1c7a34' : (hero === 'mage' ? '#c81e1e' : '#6d28d9');
    var headY = -s * 3.15;
    ctx.save();
    ctx.translate(0, -s * 0.85);
    ctx.scale(pulse * 1.85, pulse * 1.85);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, s * 0.11);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.beginPath();
    ctx.arc(0, headY, s * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffe56a';
    ctx.beginPath();
    ctx.ellipse(-s * 0.3, headY - s * 0.02, s * 0.15, s * 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(s * 0.3, headY - s * 0.02, s * 0.15, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-s * 1.55, headY + s * 0.75);
    ctx.lineTo(-s * 2.05, headY + s * 1.45);
    ctx.lineTo(-s * 1.05, headY + s * 3.35);
    ctx.lineTo(s * 1.05, headY + s * 3.35);
    ctx.lineTo(s * 2.05, headY + s * 1.45);
    ctx.lineTo(s * 1.55, headY + s * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, headY + s * 1.05);
    ctx.lineTo(0, headY + s * 2.9);
    for (var rib = 0; rib < 4; rib++) {
      var ry = headY + s * (1.25 + rib * 0.4);
      ctx.moveTo(-s * 0.68, ry);
      ctx.quadraticCurveTo(0, ry + s * 0.18, s * 0.68, ry);
    }
    ctx.stroke();
    var lift = Math.sin(state.time * 3 + tower.id) * s * 0.18;
    ctx.beginPath();
    ctx.moveTo(-s * 1.45, headY + s * 1.05);
    ctx.quadraticCurveTo(-s * 2.55, headY + s * 1.7, -s * 2.35, headY + s * 2.85 + lift);
    ctx.moveTo(s * 1.45, headY + s * 1.05);
    ctx.quadraticCurveTo(s * 2.45, headY + s * 0.35, s * 2.85, headY - s * 0.15 - lift);
    ctx.stroke();
    if (hero === 'sword') {
      ctx.beginPath();
      ctx.moveTo(s * 2.7, headY);
      ctx.lineTo(s * 3.35, headY - s * 1.55);
      ctx.moveTo(s * 2.95, headY - s * 0.35);
      ctx.lineTo(s * 3.35, headY - s * 0.35);
      ctx.stroke();
    } else if (hero === 'archer') {
      ctx.beginPath();
      ctx.arc(s * 2.15, headY + s * 1.35, s * 1.05, -1.15, 1.15);
      ctx.moveTo(s * 2.15, headY + s * 0.35);
      ctx.lineTo(s * 2.15, headY + s * 2.35);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(s * 2.55, headY + s * 1.6);
      ctx.lineTo(s * 3.25, headY - s * 0.85);
      ctx.stroke();
      ctx.fillStyle = '#ffd36a';
      ctx.beginPath();
      ctx.arc(s * 3.25, headY - s * 0.85, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawStick(tower, s) {
    var t = state.time * 2.4 + tower.id * 0.8;
    var bob = reduceMotion ? 0 : Math.sin(t) * s * 0.06;
    var swing = tower.swing || 0;
    var step = reduceMotion ? 0 : Math.sin(t) * s * 0.1;
    ctx.save();
    ctx.translate(0, bob);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.22);
    ctx.lineTo(-s * 0.28 - step, s * 0.82);
    ctx.moveTo(0, s * 0.22);
    ctx.lineTo(s * 0.28 + step, s * 0.82);
    ctx.moveTo(0, -s * 0.36);
    ctx.lineTo(0, s * 0.22);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -s * 0.64, s * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    if (tower.hero === 'sword') {
      var arm = swing > 0.02 ? (-2.35 + (1 - swing) * 3.15) : (-0.7 + Math.sin(t) * 0.06);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.16);
      ctx.lineTo(-s * 0.46, s * 0.02 + step * 0.4);
      ctx.stroke();
      ctx.save();
      ctx.translate(0, -s * 0.16);
      ctx.rotate(arm);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(s * 0.34, 0);
      ctx.moveTo(s * 0.28, -s * 0.14);
      ctx.lineTo(s * 0.28, s * 0.14);
      ctx.moveTo(s * 0.34, 0);
      ctx.lineTo(s * 1.15, -s * 0.08);
      ctx.stroke();
      ctx.restore();
    } else if (tower.hero === 'archer') {
      var pull = swing > 0.02 ? (1 - swing) : (0.35 + Math.sin(t) * 0.08);
      ctx.beginPath();
      ctx.arc(s * 0.05, -s * 0.05, s * 0.5, -1.25, 1.25);
      ctx.moveTo(s * 0.05, -s * 0.52);
      ctx.lineTo(-s * 0.08 - pull * s * 0.35, -s * 0.05);
      ctx.lineTo(s * 0.05, s * 0.42);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.08 - pull * s * 0.35, -s * 0.05);
      ctx.lineTo(s * 0.72, -s * 0.08);
      ctx.moveTo(s * 0.5, -s * 0.16);
      ctx.lineTo(s * 0.78, -s * 0.08);
      ctx.lineTo(s * 0.5, 0);
      ctx.stroke();
    } else if (tower.hero === 'mage') {
      var lean = swing > 0.02 ? (-0.35 - swing * 0.8) : (-0.45 + Math.sin(t) * 0.08);
      ctx.beginPath();
      ctx.moveTo(-s * 0.08, -s * 0.1);
      ctx.lineTo(-s * 0.4, s * 0.18);
      ctx.stroke();
      ctx.save();
      ctx.translate(s * 0.08, -s * 0.05);
      ctx.rotate(lean);
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.lineTo(0, -s * 0.85);
      ctx.moveTo(-s * 0.16, -s * 0.62);
      ctx.lineTo(s * 0.16, -s * 0.62);
      ctx.stroke();
      ctx.fillStyle = '#161616';
      ctx.beginPath();
      ctx.arc(0, -s * 0.98, s * 0.12 + (reduceMotion ? 0 : Math.sin(t * 2) * s * 0.03), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      var halo = s * (1.05 + (reduceMotion ? 0 : Math.sin(t * 1.6) * 0.06));
      ctx.beginPath();
      ctx.arc(0, -s * 1.12, halo * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, -s * 1.12, halo * 0.55, halo * 0.16, state.time * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.2);
      ctx.lineTo(-s * 0.36, -s * 0.42);
      ctx.moveTo(0, -s * 0.2);
      ctx.lineTo(s * 0.36, -s * 0.42);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBladeWave(scale, alpha) {
    var r = view.tile * 0.95 * scale;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = Math.max(2.4, view.tile * 0.05);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.05, -r);
    ctx.quadraticCurveTo(r * 1.15, 0, -r * 0.05, r);
    ctx.quadraticCurveTo(r * 0.42, 0, -r * 0.05, -r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#e02323';
    ctx.lineWidth = Math.max(2, view.tile * 0.04);
    ctx.beginPath();
    ctx.moveTo(r * 0.08, -r * 0.72);
    ctx.quadraticCurveTo(r * 0.82, 0, r * 0.08, r * 0.72);
    ctx.stroke();
    ctx.restore();
  }

  function drawSlash(shot) {
    var x = worldX(shot.x);
    var y = worldY(shot.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(shot.angle);
    ctx.translate(-view.tile * 0.34, 0);
    drawBladeWave(0.62, 0.4);
    ctx.translate(view.tile * 0.34, 0);
    drawBladeWave(1, 1);
    ctx.restore();
  }

  function drawCut(shot) {
    var p = shot.maxLife ? shot.life / shot.maxLife : 0;
    ctx.save();
    ctx.translate(worldX(shot.x), worldY(shot.y));
    ctx.rotate(shot.angle - 1.05 + (1 - p) * 1.7);
    ctx.globalAlpha = Math.min(1, p * 1.5);
    drawBladeWave(0.78, 1);
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
    if (tower.type === 'arrow') {
      if (tower.spec === 'focus') {
        if (shown <= 3) return { sheet: 0, row: 2 };
        if (shown === 4) return { sheet: 0, row: 3 };
        return { sheet: 1, row: 0 };
      }
      if (tower.spec === 'twin') {
        if (shown <= 3) return { sheet: 1, row: 1 };
        if (shown === 4) return { sheet: 1, row: 2 };
        return { sheet: 1, row: 3 };
      }
      return { sheet: 0, row: shown <= 1 ? 0 : 1 };
    }
    if (tower.spec === 'fire') {
      if (shown <= 3) return { sheet: 3, row: 2 };
      if (shown === 4) return { sheet: 3, row: 3 };
      return { sheet: 2, row: 0 };
    }
    if (tower.spec === 'ice') {
      if (shown <= 3) return { sheet: 2, row: 1 };
      if (shown === 4) return { sheet: 2, row: 2 };
      return { sheet: 4, row: 0 };
    }
    if (tower.spec === 'stone') {
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
    var shown = tower.level + 1;
    if (tower.type === 'arrow') {
      if (tower.spec === 'focus') return 'heavy' + shown;
      if (tower.spec === 'twin') return 'twin' + shown;
      return shown <= 1 ? 'arrow1' : 'arrow2';
    }
    if (tower.spec === 'ice') return shown >= 5 ? 'ice4' : 'ice' + shown;
    if (tower.spec === 'fire') return 'fire5';
    if (tower.spec === 'stone') return 'stone' + shown;
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

  var BUILD_ICON = {
    arrow: { sx: 44, sy: 396, sw: 124, sh: 124 },
    cannon: { sx: 220, sy: 392, sw: 128, sh: 128 },
  };

  function buildMenuLayout() {
    if (!state.buildSite) return null;
    var tile = view.tile;
    var gap = 8;
    var btnW = Math.max(84, tile * 1.85);
    var btnH = Math.max(102, tile * 2.15);
    var panelW = btnW * 2 + gap * 3;
    var panelH = btnH + gap * 2;
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
    return {
      x: x,
      y: y,
      w: panelW,
      h: panelH,
      below: below,
      buttons: [
        { type: 'arrow', x: x + gap, y: y + gap, w: btnW, h: btnH },
        { type: 'cannon', x: x + gap * 2 + btnW, y: y + gap, w: btnW, h: btnH },
      ],
    };
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
    ctx.fillStyle = 'rgba(22, 22, 22, 0.08)';
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
      ctx.moveTo(anchorX - 9, menu.y);
      ctx.lineTo(anchorX, menu.y - 10);
      ctx.lineTo(anchorX + 9, menu.y);
    } else {
      ctx.moveTo(anchorX - 9, menu.y + menu.h);
      ctx.lineTo(anchorX, menu.y + menu.h + 10);
      ctx.lineTo(anchorX + 9, menu.y + menu.h);
    }
    ctx.fill();
    roundRect(menu.x, menu.y, menu.w, menu.h, 16);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (var i = 0; i < menu.buttons.length; i++) {
      var btn = menu.buttons[i];
      var def = TOWERS[btn.type];
      var poor = state.gold < def.cost;
      roundRect(btn.x, btn.y, btn.w, btn.h, 12);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = poor ? 1 : 2;
      if (poor) ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.save();
      ctx.translate(btn.x + btn.w / 2, btn.y + 34);
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (btn.type === 'arrow') {
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(8, 0);
        ctx.moveTo(2, -6);
        ctx.lineTo(10, 0);
        ctx.lineTo(2, 6);
        ctx.stroke();
      } else {
        ctx.strokeRect(-14, -14, 28, 28);
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#161616';
      ctx.font = '800 15px ' + FONT;
      ctx.fillText(def.name, btn.x + btn.w / 2, btn.y + btn.h - 30);
      ctx.font = '800 14px ' + FONT;
      ctx.fillText(String(def.cost), btn.x + btn.w / 2, btn.y + btn.h - 13);
    }
    ctx.restore();
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

  function drawTowers() {
    for (var i = 0; i < state.towers.length; i++) drawTower(state.towers[i]);
  }

  function drawTower(tower) {
    var tile = view.tile;
    var x = worldX(tower.c + 0.5);
    var y = worldY(tower.r + 0.42);
    var s = tower.type === 'hero' ? tile * 0.34 : tile * 0.26;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#161616';
    ctx.fillStyle = '#fff';
    if (tower.type === 'hero') {
      ctx.fillStyle = 'rgba(22, 22, 22, 0.08)';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.95, s * 0.72, s * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (Math.cos(tower.aim || 0) < 0) ctx.scale(-1, 1);
      if (skillAuraOn(tower)) drawPossess(tower, s);
      drawStick(tower, s);
    } else if (tower.type === 'arrow') {
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.rotate(tower.aim);
      if (tower.spec === 'laser') {
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.2, 0);
        ctx.lineTo(s * 1.05, 0);
        ctx.stroke();
      } else if (tower.spec === 'bolt') {
        ctx.strokeStyle = '#e0b000';
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, s * 0.18);
        ctx.lineTo(-s * 0.12, -s * 0.32);
        ctx.lineTo(s * 0.08, s * 0.06);
        ctx.lineTo(s * 0.55, -s * 0.36);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(-s * 0.35, 0);
        ctx.lineTo(s * 0.45, 0);
        ctx.moveTo(s * 0.08, -s * 0.28);
        ctx.lineTo(s * 0.62, 0);
        ctx.lineTo(s * 0.08, s * 0.28);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.strokeRect(-s, -s, s * 2, s * 2);
      if (tower.spec === 'fire') {
        ctx.strokeStyle = '#e02323';
        inkX(0, 0, s * 0.4);
      } else if (tower.spec === 'poison') {
        ctx.fillStyle = '#3cbf4a';
        ctx.beginPath();
        ctx.arc(0, s * 0.08, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-s * 0.16, -s * 0.22, s * 0.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (tower.spec === 'stone') {
        ctx.fillStyle = '#7a4a28';
        ctx.fillRect(-s * 0.28, -s * 0.28, s * 0.56, s * 0.56);
      } else if (tower.spec === 'ice') {
        ctx.strokeStyle = '#2f7bff';
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
        ctx.stroke();
      }
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

  function drawEnemy(enemy) {
    var pos = pointAt(enemy.dist);
    var x = worldX(pos.x);
    var y = worldY(pos.y);
    var rad = Math.max(6, enemy.radius * view.tile);
    ctx.save();
    ctx.lineWidth = enemy.boss ? 3 : 2;
    ctx.strokeStyle = '#161616';
    ctx.fillStyle = enemy.hitFlash > 0 ? '#161616' : '#fff';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.translate(x, y);
    if (enemy.type === 'shard') {
      inkX(0, 0, rad);
    } else if (enemy.type === 'swift') {
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.72, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (enemy.type === 'brute') {
      ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
      ctx.strokeRect(-rad, -rad, rad * 2, rad * 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (enemy.boss) {
        ctx.strokeStyle = enemy.hitFlash > 0 ? '#fff' : '#161616';
        ctx.fillStyle = ctx.strokeStyle;
        drawBossSymbol(enemy.bossId, rad);
      }
    }
    ctx.restore();
    if (enemy.bossId === 'ward' && enemy.shield > 0) {
      ctx.strokeStyle = '#161616';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, rad + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
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
      inkX(x + rad * 0.85, y - rad * 0.85, Math.max(3, rad * 0.28));
    }
    if (enemy.poisonTime > 0) {
      ctx.fillStyle = '#3cbf4a';
      ctx.beginPath();
      ctx.arc(x + rad * 0.7, y + rad * 0.15, Math.max(3, rad * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
    var ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    if (ratio < 0.995) {
      var bh = Math.max(2, rad * 0.18);
      var bw = rad * 1.35;
      var bx = x - bw / 2;
      var by = y + rad * 0.42;
      ctx.fillStyle = '#fff';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#161616';
      ctx.fillRect(bx, by, Math.max(0, bw * Math.max(0, ratio)), bh);
    }
    if (enemy.boss) {
      ctx.font = '700 ' + Math.max(10, Math.round(view.tile * 0.22)) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(enemy.name, x, y + rad + Math.max(10, view.tile * 0.24));
    }
    if (enemy.resist && RESISTS[enemy.resist]) {
      var resist = RESISTS[enemy.resist];
      ctx.font = '800 ' + Math.max(10, Math.round(view.tile * 0.2)) + 'px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = resist.color;
      ctx.fillText(resist.name, x, y - rad - Math.max(9, view.tile * 0.18));
    }
  }

  function drawBossSymbol(id, rad) {
    var s = rad * 0.42;
    ctx.lineWidth = Math.max(2, rad * 0.16);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (id === 'regen') {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.72, 0.5, Math.PI * 1.75);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.85);
      ctx.lineTo(s * 0.55, -s * 0.35);
      ctx.lineTo(s * 0.05, -s * 0.2);
      ctx.stroke();
    } else if (id === 'rush') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.05);
      ctx.lineTo(0, -s * 0.7);
      ctx.lineTo(s * 0.55, -s * 0.05);
      ctx.moveTo(-s * 0.55, s * 0.55);
      ctx.lineTo(0, -s * 0.1);
      ctx.lineTo(s * 0.55, s * 0.55);
      ctx.stroke();
    } else if (id === 'summon') {
      var dots = [[0, -s * 0.45], [-s * 0.48, s * 0.32], [s * 0.48, s * 0.32]];
      for (var i = 0; i < dots.length; i++) {
        ctx.beginPath();
        ctx.arc(dots[i][0], dots[i][1], s * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'ward') {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.78, -s * 0.45);
      ctx.lineTo(s * 0.78, s * 0.15);
      ctx.quadraticCurveTo(0, s * 1.15, -s * 0.78, s * 0.15);
      ctx.lineTo(-s * 0.78, -s * 0.45);
      ctx.closePath();
      ctx.stroke();
    } else if (id === 'split') {
      var parts = [[0, -s * 0.42], [-s * 0.46, s * 0.34], [s * 0.46, s * 0.34]];
      for (var p = 0; p < parts.length; p++) {
        ctx.beginPath();
        ctx.arc(parts[p][0], parts[p][1], s * 0.28, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (id === 'mend') {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.75);
      ctx.lineTo(0, s * 0.75);
      ctx.moveTo(-s * 0.75, 0);
      ctx.lineTo(s * 0.75, 0);
      ctx.stroke();
    } else if (id === 'frost') {
      ctx.beginPath();
      for (var a = 0; a < 3; a++) {
        var ang = a * Math.PI / 3;
        ctx.moveTo(Math.cos(ang) * s, Math.sin(ang) * s);
        ctx.lineTo(-Math.cos(ang) * s, -Math.sin(ang) * s);
      }
      ctx.stroke();
    } else {
      ctx.strokeRect(-s * 0.62, -s * 0.62, s * 1.24, s * 1.24);
      ctx.strokeRect(-s * 0.32, -s * 0.32, s * 0.64, s * 0.64);
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
    ctx.strokeStyle = '#161616';
    if (state.phase === 'combat') {
      for (var i = 0; i < state.towers.length; i++) {
        var tower = state.towers[i];
        if (tower.spec !== 'laser' || !tower.beamId) continue;
        var enemy = findEnemy(tower.beamId);
        if (!enemy) continue;
        var pos = pointAt(enemy.dist);
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = Math.max(3, view.tile * 0.07);
        ctx.beginPath();
        ctx.moveTo(worldX(tower.c + 0.5), worldY(tower.r + 0.5));
        ctx.lineTo(worldX(pos.x), worldY(pos.y));
        ctx.stroke();
      }
    }
    for (var a = 0; a < state.arcs.length; a++) {
      var arc = state.arcs[a];
      ctx.globalAlpha = Math.max(0.45, arc.life / arc.maxLife);
      ctx.strokeStyle = '#e0b000';
      ctx.lineWidth = Math.max(2, view.tile * 0.055);
      strokeBolt(worldX(arc.x1), worldY(arc.y1), worldX(arc.x2), worldY(arc.y2));
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
      else if (shot.kind === 'wave') drawWave(shot);
      else if (shot.kind === 'poison') drawPoisonShot(shot);
      else drawShell(shot);
    }
  }

  function drawArrowShot(shot) {
    ctx.save();
    ctx.translate(worldX(shot.x), worldY(shot.y));
    ctx.rotate(shot.angle || 0);
    ctx.strokeStyle = '#161616';
    ctx.lineWidth = Math.max(2, view.tile * 0.045);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-view.tile * 0.16, 0);
    ctx.lineTo(view.tile * 0.12, 0);
    ctx.moveTo(view.tile * 0.02, -view.tile * 0.06);
    ctx.lineTo(view.tile * 0.14, 0);
    ctx.lineTo(view.tile * 0.02, view.tile * 0.06);
    ctx.stroke();
    ctx.restore();
  }

  function drawWave(shot) {
    var radius = Math.max(2, shot.radius * view.tile);
    ctx.save();
    ctx.strokeStyle = shot.color || '#2f7bff';
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(8, view.tile * 0.16);
    ctx.beginPath();
    ctx.arc(worldX(shot.x), worldY(shot.y), radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = Math.max(2, view.tile * 0.045);
    ctx.stroke();
    ctx.restore();
  }

  function drawPoisonShot(shot) {
    var x = worldX(shot.x);
    var y = worldY(shot.y);
    ctx.fillStyle = shot.color || '#3cbf4a';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(4, view.tile * 0.09), 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShell(shot) {
    var remain = Math.hypot(shot.tx - shot.x, shot.ty - shot.y);
    var t = 1 - remain / (shot.total || 1);
    var lift = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * view.tile * 0.28;
    var x = worldX(shot.x);
    var y = worldY(shot.y) - lift;
    ctx.fillStyle = shot.color || '#161616';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(shot.bomb ? 5 : 3, view.tile * (shot.bomb ? 0.11 : 0.07)), 0, Math.PI * 2);
    ctx.fill();
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
      ctx.fillRect(worldX(particle.x) - size / 2, worldY(particle.y) - size / 2, size, size);
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
    if (state.phase === 'reward' || state.phase === 'gameover' || state.phase === 'victory' || state.phase === 'menu') return;
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
    if (state.phase === 'edit' && state.editTool) {
      state.buildSite = null;
      routeEditTap(cell);
      return;
    }
    if ((state.phase === 'prep' || state.phase === 'combat' || state.phase === 'edit') && !isPath(cell.c, cell.r)) {
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
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('pointermove', function (event) {
      var point = canvasPoint(event.clientX, event.clientY);
      state.hover = cellAt(point.x, point.y);
    });
    canvas.addEventListener('pointerleave', function () { state.hover = null; });
    canvas.addEventListener('pointerup', function (event) {
      if (!pointer || pointer.id !== event.pointerId) return;
      var start = pointer;
      pointer = null;
      var dx = event.clientX - start.x;
      var dy = event.clientY - start.y;
      if (dx * dx + dy * dy > 400) return;
      handleTap(event.clientX, event.clientY);
    });
    canvas.addEventListener('pointercancel', function () { pointer = null; });

    waveBtn.addEventListener('click', function () {
      if (state.adBusy) return;
      if (state.pickMode === 'level' || state.pickMode === 'heroPlace') {
        toast('先完成卡牌選擇');
        return;
      }
      if (state.phase === 'prep') startWave(state.wave + 1);
      else if (state.phase === 'edit') finishEdit();
    });
    itemWallBtn.addEventListener('click', function () {
      if (state.items.wall <= 0) return;
      if (state.pickMode === 'level' || state.pickMode === 'heroPlace') {
        toast('先完成卡牌選擇');
        return;
      }
      if (state.phase !== 'prep' && state.phase !== 'combat' && state.phase !== 'edit') return;
      state.pickMode = 'wall';
      state.banner = { text: '阻擋物', sub: '點道路，擋住怪物 10 秒', life: 4 };
      toast('點在道路上');
    });
    itemPushBtn.addEventListener('click', usePush);
    routeBar.addEventListener('click', function (event) {
      var tile = event.target.closest('[data-tile]');
      if (!tile || tile.disabled) return;
      selectTile(tile.getAttribute('data-tile'));
    });
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
        clearSelection();
        return;
      }
      if (event.target.closest && event.target.closest('button')) return;
      if ((event.key === ' ' || event.key === 'Enter') && state.phase === 'prep' && !state.pickMode && !state.adBusy && screenMenu.hidden && screenChapters.hidden && screenStages.hidden && screenDifficulty.hidden) {
        event.preventDefault();
        startWave(state.wave + 1);
      } else if (event.key === '1') placeChosen('arrow');
      else if (event.key === '2') placeChosen('cannon');
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
      showMenu();
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
          { label: '回到主選單', className: 'btn-ghost', onClick: function () { closeModal(); showMenu(); } },
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
          { label: '回到選單', className: 'btn-mint', onClick: function () { closeModal(); showMenu(); } },
          { label: '繼續', className: 'btn-ghost', onClick: closeModal },
        ],
      });
      return;
    }
    showMenu();
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
    showMenu();
    syncSpeedButton();
    syncSoundButton();
    Ads.init().catch(function () {});
    loadSheets(function () { requestAnimationFrame(frame); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
