(function () {
  const root = window.TabOS = window.TabOS || {};

  const DEFAULT_CONFIG = {
    user: 'user',
    host: 'tabos',
    distro: 'tabos',
    accent: '#39c5bb',
    layoutTheme: 'terminal',
    layoutEdit: false,
    startupAnim: true,
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
    userShortcuts: 'userShortcuts',
    disabledShortcuts: 'disabledShortcuts',
    history: 'cmdHistory',
    notes: 'stickyNotes',
    todos: 'todos',
    rain: 'rainSettings',
    factMode: 'factMode',
    pomodoro: 'pomodoro',
    leaderboard: 'chickenLeaderboard',
    blurState: 'blurState',
    widgetLayout: 'widgetLayout',
    widgetVisibility: 'widgetVisibility',
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
      if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return { ...DEFAULT_CONFIG };
      const next = { ...DEFAULT_CONFIG };
      Object.keys(DEFAULT_CONFIG).forEach(key => {
        if (stored[key] !== undefined && typeof stored[key] === typeof DEFAULT_CONFIG[key]) {
          next[key] = stored[key];
        }
      });
      if (typeof next.user === 'string') next.user = next.user.slice(0, 50);
      if (typeof next.host === 'string') next.host = next.host.slice(0, 50);
      if (typeof next.distro === 'string') next.distro = next.distro.slice(0, 50);
      return next;
    },
    saveConfig(config) {
      setJson(keys.config, config);
    },
    loadRain() {
      return { ...DEFAULT_RAIN, ...safeJson(keys.rain, {}) };
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
        `${keys.config}: identity, layout theme, and accent`,
        `${keys.userShortcuts}: custom shortcuts`,
        `${keys.disabledShortcuts}: disabled built-in shortcuts`,
        `${keys.history}: command history`,
        `${keys.notes}: sticky notes`,
        `${keys.todos}: tasks`,
        `${keys.rain}: rain engine settings`,
        `${keys.factMode}: fact mode`,
        `${keys.pomodoro}: focus timer state`,
        `${keys.leaderboard}: chicken scores`,
        `${keys.blurState}: blur/privacy state`,
        `${keys.widgetLayout}: per-theme widget geometry`,
        `${keys.widgetVisibility}: visible dashboard widgets`,
      ];
    },
  };

  root.storage = storage;
})();
