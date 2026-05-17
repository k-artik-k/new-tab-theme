(function () {
  const root = window.TabOS = window.TabOS || {};

  const DEFAULT_CONFIG = {
    user: 'user',
    host: 'tabos',
    distro: 'tabos',
    accent: '#39c5bb',
  };

  const DEFAULT_RAIN = {
    enabled: false,
    intensity: 45,
    windDirection: 105,
    windSpeed: 20,
    sound: false,
    thunder: true,
  };

  const DEFAULT_POMODORO = {
    duration: 25 * 60,
    remaining: 25 * 60,
    running: false,
    endAt: null,
  };

  const keys = {
    config: 'termConfig',
    oldTheme: 'termTheme',
    userShortcuts: 'userShortcuts',
    disabledShortcuts: 'disabledShortcuts',
    history: 'cmdHistory',
    notes: 'stickyNotes',
    todos: 'todos',
    rain: 'rainSettings',
    oldRain: 'asciiRain',
    factMode: 'factMode',
    factCache: 'cachedFacts',
    pomodoro: 'pomodoro',
    leaderboard: 'chickenLeaderboard',
  };

  function safeJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  const storage = {
    keys,
    defaults: {
      config: DEFAULT_CONFIG,
      rain: DEFAULT_RAIN,
      pomodoro: DEFAULT_POMODORO,
    },
    getRaw(key) {
      return localStorage.getItem(key);
    },
    setRaw(key, value) {
      localStorage.setItem(key, value);
    },
    getJson: safeJson,
    setJson,
    remove(key) {
      localStorage.removeItem(key);
    },
    loadConfig() {
      const stored = safeJson(keys.config, {});
      const migratedAccent = stored.accent || localStorage.getItem(keys.oldTheme);
      return { ...DEFAULT_CONFIG, ...stored, accent: migratedAccent || DEFAULT_CONFIG.accent };
    },
    saveConfig(config) {
      setJson(keys.config, config);
    },
    loadRain() {
      const rain = { ...DEFAULT_RAIN, ...safeJson(keys.rain, {}) };
      if (!localStorage.getItem(keys.rain) && localStorage.getItem(keys.oldRain) === 'on') rain.enabled = true;
      return rain;
    },
    saveRain(rain) {
      setJson(keys.rain, rain);
    },
    loadPomodoro() {
      return { ...DEFAULT_POMODORO, ...safeJson(keys.pomodoro, {}) };
    },
    savePomodoro(pomodoro) {
      setJson(keys.pomodoro, pomodoro);
    },
    describe() {
      return [
        `${keys.config}: identity and accent theme`,
        `${keys.userShortcuts}: custom shortcuts`,
        `${keys.disabledShortcuts}: disabled built-in shortcuts`,
        `${keys.history}: command history`,
        `${keys.notes}: sticky notes`,
        `${keys.todos}: tasks`,
        `${keys.rain}: rain engine settings`,
        `${keys.factMode}, ${keys.factCache}: fact mode and offline cache`,
        `${keys.pomodoro}: focus timer state`,
        `${keys.leaderboard}: chicken scores`,
      ];
    },
  };

  root.storage = storage;
})();
