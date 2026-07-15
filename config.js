(function () {
  const root = window.TabOS = window.TabOS || {};
  const storage = root.storage;
  const { escapeHtml } = root.utils;
  const { appendOutput } = root.core;

  const THEME_COLORS = {
    cyan: '#39c5bb',
    red: '#f07178',
    green: '#7fd962',
    blue: '#59c2ff',
    magenta: '#d2a6ff',
    yellow: '#e6b450',
    orange: '#ff8f40',
    pink: '#ff79c6',
    purple: '#bd93f9',
    white: '#ffffff',
  };

  const LAYOUT_THEMES = {
    terminal: 'terminal layout',
    neo: 'pastel minimal layout',
  };

  let config = storage.loadConfig();

  function normalizeConfig() {
    if (!LAYOUT_THEMES[config.layoutTheme]) config.layoutTheme = storage.defaults.config.layoutTheme;
    if (!/^#[0-9a-f]{3,8}$/i.test(config.accent)) config.accent = storage.defaults.config.accent;
  }

  function save() {
    normalizeConfig();
    storage.saveConfig(config);
    apply();
  }

  function setAccent(value) {
    const color = THEME_COLORS[value] || value;
    if (!/^#[0-9a-f]{3,8}$/i.test(color)) return false;
    config.accent = color;
    save();
    return true;
  }

  function setLayoutTheme(value) {
    const theme = String(value || '').toLowerCase();
    if (!LAYOUT_THEMES[theme]) return false;
    config.layoutTheme = theme;
    save();
    return true;
  }

  function apply() {
    normalizeConfig();
    document.documentElement.style.setProperty('--accent', config.accent);
    document.body.classList.remove(...Object.keys(LAYOUT_THEMES).map(theme => `theme-${theme}`));
    document.body.classList.add(`theme-${config.layoutTheme}`);
    document.body.dataset.theme = config.layoutTheme;

    const promptUser = document.getElementById('promptUser');
    const promptHost = document.getElementById('promptHost');
    const titleEl = document.getElementById('terminalTitle');
    if (promptUser) promptUser.textContent = config.user;
    if (promptHost) promptHost.textContent = config.host;
    if (titleEl) titleEl.textContent = `${config.user}@${config.host}`;
    if (root.layout && root.layout.applyTheme) root.layout.applyTheme();


    // Quick links for neo
    const qlBar = document.getElementById('quickLinksBar');
    if (qlBar && root.shortcuts) {
      const all = root.shortcuts.all();
      qlBar.innerHTML = Object.entries(all)
        .filter(([, val]) => /^https?:\/\//i.test(val.url))
        .slice(0, 12)
        .map(([key, val]) =>
          `<a class="ql-link" href="${root.utils.escapeHtml(val.url)}" title="${root.utils.escapeHtml(val.desc)}">${root.utils.escapeHtml(key)}</a>`
        ).join('');
    }
  }

  function show() {
    const taskStats = root.todo ? root.todo.stats() : { active: 0, total: 0 };
    appendOutput(`user: <span style="color:var(--accent)">${escapeHtml(config.user)}</span>`, 'info');
    appendOutput(`host: <span style="color:var(--accent)">${escapeHtml(config.host)}</span>`, 'info');
    appendOutput(`distro: <span style="color:var(--accent)">${escapeHtml(config.distro)}</span>`, 'info');
    appendOutput(`theme: ${escapeHtml(config.layoutTheme)}`, 'info');
    appendOutput(`accent: <span style="color:var(--accent)">#</span> ${escapeHtml(config.accent)}`, 'info');
    appendOutput(`layout edit: ${config.layoutEdit === true ? 'on' : 'off'}`, 'info');
    appendOutput(`shortcuts: ${root.shortcuts ? Object.keys(root.shortcuts.all()).length : 0} active`, 'info');
    appendOutput(`rain: ${root.rain ? escapeHtml(root.rain.describe()) : 'not started'}`, 'info');
    appendOutput(`facts: ${root.facts ? escapeHtml(root.facts.mode()) : 'mixed'}`, 'info');
    appendOutput(`tasks: ${taskStats.active} active, ${taskStats.total} total`, 'info');
    appendOutput('use /config theme <terminal|neo> or /config accent <color>', 'info');
  }

  function handle(words, original) {
    const sub = words[1];
    if (!sub) {
      show();
      return;
    }
    if (sub === 'reset') {
      config = { ...storage.defaults.config };
      save();
      appendOutput('config reset', 'success');
      return;
    }
    if (['user', 'host', 'distro'].includes(sub)) {
      const value = original.slice(original.toLowerCase().indexOf(sub) + sub.length).trim();
      if (!value) {
        appendOutput(`usage: /config ${sub} <value>`, 'error');
        return;
      }
      config[sub] = value;
      save();
      appendOutput(`${sub}: ${escapeHtml(value)}`, 'success');
      return;
    }
    if (sub === 'theme') {
      const value = words[2];
      if (!value || value === 'list') {
        appendOutput(`current theme: ${escapeHtml(config.layoutTheme)}`, 'info');
        appendOutput(`themes: ${Object.keys(LAYOUT_THEMES).join(', ')}`, 'info');
        appendOutput('usage: /config theme <name>', 'info');
        return;
      }
      if (value === 'reset') {
        setLayoutTheme(storage.defaults.config.layoutTheme);
        appendOutput('theme reset', 'success');
        return;
      }
      if (setLayoutTheme(value)) appendOutput(`theme: ${escapeHtml(config.layoutTheme)}`, 'success');
      else appendOutput(`unknown theme: ${escapeHtml(value)}`, 'error');
      return;
    }
    if (sub === 'accent') {
      const value = words[2];
      if (!value || value === 'list') {
        appendOutput(`current accent: <span style="color:var(--accent)">#</span> ${escapeHtml(config.accent)}`, 'info');
        appendOutput(`presets: ${Object.keys(THEME_COLORS).join(', ')}`, 'info');
        appendOutput('usage: /config accent <preset|#hex>', 'info');
        return;
      }
      if (value === 'reset') {
        setAccent(storage.defaults.config.accent);
        appendOutput('accent reset', 'success');
        return;
      }
      if (setAccent(value)) appendOutput(`accent: <span style="color:${config.accent}">#</span> ${escapeHtml(config.accent)}`, 'success');
      else appendOutput(`unknown accent: ${escapeHtml(value)}`, 'error');
      return;
    }
    if (sub === 'startup') {
      const val = words[2];
      if (val === 'on' || val === 'off') {
        config.startupAnim = val === 'on';
        save();
        appendOutput(`startup animation: ${val}`, 'success');
      } else {
        appendOutput(`startup animation: ${config.startupAnim !== false ? 'on' : 'off'}`, 'info');
        appendOutput('usage: /config startup on|off', 'info');
      }
      return;
    }
    if (sub === 'storage') {
      appendOutput(`<pre>${escapeHtml(storage.describe().join('\n'))}</pre>`, 'info');
      return;
    }
    if (sub === 'enable' || sub === 'disable') {
      const widgetName = words[2];
      if (!widgetName) return appendOutput(`usage: /config ${sub} <widget>`, 'error');
      if (widgetName === 'terminal') return appendOutput('terminal cannot be toggled.', 'error');
      const visible = sub === 'enable';
      if (root.layout && root.layout.setWidgetVisible) {
        const result = root.layout.setWidgetVisible(widgetName, visible);
        if (result) appendOutput(`${widgetName}: ${visible ? 'enabled' : 'disabled'}`, 'success');
        else appendOutput(`unknown widget: ${escapeHtml(widgetName)}. use /widget list`, 'error');
      } else {
        appendOutput('layout module not available.', 'error');
      }
      return;
    }
    appendOutput('config edits identity, theme, accent, startup, widgets, and storage info.', 'error');
  }

  root.config = {
    init: apply,
    get: () => config,
    colors: () => ({ ...THEME_COLORS }),
    layouts: () => ({ ...LAYOUT_THEMES }),
    setAccent,
    setLayoutTheme,
    apply,
    handle,
  };
})();
