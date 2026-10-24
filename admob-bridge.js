/**
 * AdManager — Capacitor AdMob bridge with a browser fallback.
 *
 * Native (future):
 *   npm install @capacitor/core @capacitor/android @capacitor/ios
 *   npm install @capacitor-community/admob
 *   npx cap sync
 *   Point Capacitor webDir at this folder.
 *   Put the AdMob App ID in AndroidManifest.xml / Info.plist.
 *   Before release:
 *     AdManager.configure({
 *       isTesting: false,
 *       rewardedAdId: 'ca-app-pub-xxxx/rewarded',
 *       interstitialAdId: 'ca-app-pub-xxxx/interstitial'
 *     });
 *   Call AdManager.init() once after the native shell is ready.
 *   EU/UK traffic still needs a consent flow (UMP) before production ads.
 *
 * Web preview: no Capacitor plugin, so a 3-second simulated overlay
 * resolves the same reward / close callbacks and never throws.
 */
'use strict';

(function () {
  var TEST_IDS = {
    android: {
      rewarded: 'ca-app-pub-3940256099942544/5224354917',
      interstitial: 'ca-app-pub-3940256099942544/1033173712',
    },
    ios: {
      rewarded: 'ca-app-pub-3940256099942544/1712485313',
      interstitial: 'ca-app-pub-3940256099942544/4411468910',
    },
  };

  var REWARD_EARNED = ['onRewardedVideoAdReward'];
  var REWARD_CLOSED = ['onRewardedVideoAdDismissed'];
  var REWARD_FAILED = ['onRewardedVideoAdFailedToLoad', 'onRewardedVideoAdFailedToShow'];
  var INTERSTITIAL_CLOSED = ['onInterstitialAdDismissed'];
  var INTERSTITIAL_FAILED = ['onInterstitialAdFailedToLoad', 'onInterstitialAdFailedToShow'];

  var config = {
    isTesting: true,
    rewardedAdId: '',
    interstitialAdId: '',
  };

  var initPromise = null;
  var chain = Promise.resolve();
  var overlay = null;
  var simTimer = 0;

  function environment() {
    var cap = window.Capacitor;
    var native = false;
    try {
      native = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
    } catch (error) {
      native = false;
    }
    var admob = native && cap.Plugins ? cap.Plugins.AdMob : null;
    if (native && admob && typeof admob.initialize === 'function') {
      return { kind: 'native', admob: admob };
    }
    if (native) return { kind: 'native-missing', admob: null };
    return { kind: 'web', admob: null };
  }

  function platform() {
    var cap = window.Capacitor;
    if (cap && typeof cap.getPlatform === 'function') {
      try { return cap.getPlatform(); } catch (error) { /* fall through */ }
    }
    return 'android';
  }

  function adIds() {
    var defaults = platform() === 'ios' ? TEST_IDS.ios : TEST_IDS.android;
    return {
      rewarded: config.rewardedAdId || defaults.rewarded,
      interstitial: config.interstitialAdId || defaults.interstitial,
    };
  }

  function enqueue(task) {
    var job = chain.then(task, task);
    chain = job.then(function () {}, function () {});
    return job;
  }

  function configure(partial) {
    if (!partial) return;
    if (typeof partial.isTesting === 'boolean') config.isTesting = partial.isTesting;
    if (partial.rewardedAdId) config.rewardedAdId = String(partial.rewardedAdId);
    if (partial.interstitialAdId) config.interstitialAdId = String(partial.interstitialAdId);
  }

  function init() {
    if (!initPromise) initPromise = doInit();
    return initPromise;
  }

  function doInit() {
    var env = environment();
    if (env.kind !== 'native') {
      return Promise.resolve({ mode: env.kind });
    }
    return Promise.resolve(env.admob.initialize({ initializeForTesting: config.isTesting }))
      .then(function () { return { mode: 'native' }; })
      .catch(function (error) {
        return { mode: 'native-error', error: messageOf(error) };
      });
  }

  function messageOf(error) {
    if (!error) return 'ad_error';
    if (typeof error === 'string') return error;
    return error.message || 'ad_error';
  }

  function listenAll(admob, names, handler, bucket) {
    return Promise.all(names.map(function (name) {
      return Promise.resolve(admob.addListener(name, handler)).then(function (handle) {
        bucket.push(handle);
      });
    }));
  }

  function removeListeners(bucket) {
    var pending = bucket.splice(0);
    return Promise.all(pending.map(function (handle) {
      if (handle && typeof handle.remove === 'function') {
        return Promise.resolve(handle.remove()).catch(function () {});
      }
      return Promise.resolve();
    }));
  }

  function ensureOverlay() {
    if (overlay) return overlay;
    var root = document.createElement('div');
    root.className = 'ad-sim';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="ad-sim-card" role="dialog" aria-modal="true" aria-labelledby="ad-sim-title">' +
        '<p class="ad-sim-badge">TEST AD</p>' +
        '<p class="ad-sim-kicker" id="ad-sim-kicker">AdMob 模擬</p>' +
        '<h2 class="ad-sim-title" id="ad-sim-title">廣告</h2>' +
        '<p class="ad-sim-desc" id="ad-sim-desc"></p>' +
        '<div class="ad-sim-timer" id="ad-sim-timer">3</div>' +
        '<div class="ad-sim-bar" id="ad-sim-bar"><span></span></div>' +
        '<p class="ad-sim-status" id="ad-sim-status">廣告播放中</p>' +
        '<p class="ad-sim-foot">瀏覽器預覽 · 非實際廣告</p>' +
      '</div>';
    document.body.appendChild(root);
    overlay = {
      root: root,
      kicker: root.querySelector('#ad-sim-kicker'),
      title: root.querySelector('#ad-sim-title'),
      desc: root.querySelector('#ad-sim-desc'),
      timer: root.querySelector('#ad-sim-timer'),
      bar: root.querySelector('#ad-sim-bar'),
      status: root.querySelector('#ad-sim-status'),
    };
    return overlay;
  }

  function simulate(options) {
    return new Promise(function (resolve) {
      var ui = ensureOverlay();
      var left = 3;
      var settled = false;
      ui.kicker.textContent = options.kicker || 'AdMob 模擬';
      ui.title.textContent = options.title || '廣告';
      ui.desc.textContent = options.desc || '';
      ui.timer.textContent = '3';
      ui.status.textContent = '廣告播放中';
      ui.bar.innerHTML = '';
      var fill = document.createElement('span');
      ui.bar.appendChild(fill);
      ui.root.classList.add('is-open');
      ui.root.setAttribute('aria-hidden', 'false');

      function finish() {
        if (settled) return;
        settled = true;
        window.clearInterval(simTimer);
        ui.timer.textContent = '0';
        ui.status.textContent = options.rewarded ? '獎勵已發放' : '廣告結束';
        window.setTimeout(function () {
          ui.root.classList.remove('is-open');
          ui.root.setAttribute('aria-hidden', 'true');
          resolve({
            rewarded: !!options.rewarded,
            mode: 'web',
            placement: options.placement || '',
          });
        }, 450);
      }

      window.clearInterval(simTimer);
      simTimer = window.setInterval(function () {
        left -= 1;
        ui.timer.textContent = String(Math.max(0, left));
        if (left <= 0) finish();
      }, 1000);
    });
  }

  function showRewarded(options) {
    options = options || {};
    return enqueue(function () {
      return runRewarded(options);
    });
  }

  function runRewarded(options) {
    var env = environment();
    if (env.kind === 'web') {
      return simulate({
        rewarded: true,
        placement: options.placement,
        kicker: '獎勵廣告 Rewarded',
        title: placementTitle(options.placement, '觀看廣告領取獎勵'),
        desc: '倒數結束後會發放獎勵。這是瀏覽器測試遮罩。',
      }).then(function (result) {
        if (result.rewarded && typeof options.onReward === 'function') options.onReward(result);
        if (typeof options.onDismiss === 'function') options.onDismiss(result);
        return result;
      });
    }
    if (env.kind !== 'native') {
      var missing = { rewarded: false, mode: env.kind, error: 'admob_plugin_missing', placement: options.placement || '' };
      if (typeof options.onError === 'function') options.onError(missing);
      if (typeof options.onDismiss === 'function') options.onDismiss(missing);
      return Promise.resolve(missing);
    }
    return showNativeRewarded(env.admob, options);
  }

  function showNativeRewarded(admob, options) {
    var bucket = [];
    var earned = false;
    var settled = false;
    var rewardItem = null;

    return new Promise(function (resolve) {
      var timer = window.setTimeout(function () {
        finish({ rewarded: earned, error: earned ? '' : 'timeout', reward: rewardItem });
      }, 90000);

      function finish(result) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        result.mode = 'native';
        result.placement = options.placement || '';
        removeListeners(bucket).then(function () {
          if (result.rewarded && typeof options.onReward === 'function') options.onReward(result);
          if (result.error && typeof options.onError === 'function') options.onError(result);
          if (typeof options.onDismiss === 'function') options.onDismiss(result);
          resolve(result);
        });
      }

      init().then(function () {
        return listenAll(admob, REWARD_EARNED, function (reward) {
          earned = true;
          rewardItem = reward || null;
        }, bucket);
      }).then(function () {
        return listenAll(admob, REWARD_CLOSED, function () {
          finish({ rewarded: earned, reward: rewardItem });
        }, bucket);
      }).then(function () {
        return listenAll(admob, REWARD_FAILED, function (error) {
          finish({ rewarded: false, error: messageOf(error) || 'show_failed' });
        }, bucket);
      }).then(function () {
        return admob.prepareRewardVideoAd({
          adId: adIds().rewarded,
          isTesting: config.isTesting,
        });
      }).then(function () {
        return admob.showRewardVideoAd();
      }).catch(function (error) {
        finish({ rewarded: false, error: messageOf(error) });
      });
    });
  }

  function showInterstitial(options) {
    options = options || {};
    return enqueue(function () {
      return runInterstitial(options);
    });
  }

  function runInterstitial(options) {
    var env = environment();
    if (env.kind === 'web') {
      return simulate({
        rewarded: false,
        placement: options.placement,
        kicker: '插頁廣告 Interstitial',
        title: placementTitle(options.placement, '全螢幕廣告'),
        desc: '倒數結束後會關閉並回到遊戲。這是瀏覽器測試遮罩。',
      }).then(function (result) {
        if (typeof options.onClose === 'function') options.onClose(result);
        return result;
      });
    }
    if (env.kind !== 'native') {
      var missing = { rewarded: false, mode: env.kind, error: 'admob_plugin_missing', placement: options.placement || '' };
      if (typeof options.onClose === 'function') options.onClose(missing);
      return Promise.resolve(missing);
    }
    return showNativeInterstitial(env.admob, options);
  }

  function showNativeInterstitial(admob, options) {
    var bucket = [];
    var settled = false;

    return new Promise(function (resolve) {
      var timer = window.setTimeout(function () {
        finish({ error: 'timeout' });
      }, 60000);

      function finish(result) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        result.mode = 'native';
        result.placement = options.placement || '';
        result.rewarded = false;
        removeListeners(bucket).then(function () {
          if (typeof options.onClose === 'function') options.onClose(result);
          resolve(result);
        });
      }

      init().then(function () {
        return listenAll(admob, INTERSTITIAL_CLOSED, function () {
          finish({});
        }, bucket);
      }).then(function () {
        return listenAll(admob, INTERSTITIAL_FAILED, function () {
          finish({ error: 'show_failed' });
        }, bucket);
      }).then(function () {
        return admob.prepareInterstitial({
          adId: adIds().interstitial,
          isTesting: config.isTesting,
        });
      }).then(function () {
        return admob.showInterstitial();
      }).catch(function (error) {
        finish({ error: messageOf(error) });
      });
    });
  }

  function placementTitle(placement, fallback) {
    if (placement === 'revive') return '滿血復活';
    if (placement === 'wave_double_gold') return '金幣 +30%';
    if (placement === 'wave_interval') return '波次休息';
    if (placement === 'restart') return '重新開始';
    return fallback;
  }

  window.AdManager = {
    configure: configure,
    init: init,
    showRewarded: showRewarded,
    showInterstitial: showInterstitial,
    getMode: function () { return environment().kind; },
  };
})();
