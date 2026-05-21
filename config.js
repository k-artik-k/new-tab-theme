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

  let config = storage.loadConfig();

  function save() {
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

  function apply() {
    document.documentElement.style.setProperty('--accent', config.accent);
    document.getElementById('topBarName').textContent = `${config.user}@${config.host}`;
    document.getElementById('distroLabel').textContent = config.distro;
    document.getElementById('terminalTitle').textContent = `${config.user}@${config.host}:~`;
    document.getElementById('promptUser').textContent = config.user;
    document.getElementById('promptHost').textContent = config.host;
  }

  function show() {
    const taskStats = root.todo ? root.todo.stats() : { active: 0, total: 0 };
    appendOutput(`user: <span style="color:var(--accent)">${escapeHtml(config.user)}</span>`, 'info');
    appendOutput(`host: <span style="color:var(--accent)">${escapeHtml(config.host)}</span>`, 'info');
    appendOutput(`distro: <span style="color:var(--accent)">${escapeHtml(config.distro)}</span>`, 'info');
    appendOutput(`theme: <span style="color:var(--accent)">#</span> ${escapeHtml(config.accent)}`, 'info');
    appendOutput(`shortcuts: ${root.shortcuts ? Object.keys(root.shortcuts.all()).length : 0} active`, 'info');
    appendOutput(`rain: ${root.rain ? escapeHtml(root.rain.describe()) : 'not started'}`, 'info');
    appendOutput(`facts: ${root.facts ? escapeHtml(root.facts.mode()) : 'mixed'}`, 'info');
    appendOutput(`tasks: ${taskStats.active} active, ${taskStats.total} total`, 'info');
    appendOutput('use /config user <name>, /config host <name>, /config distro <name>, /config theme <color>', 'info');
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
        appendOutput(`current: <span style="color:var(--accent)">#</span> ${escapeHtml(config.accent)}`, 'info');
        appendOutput(`presets: ${Object.keys(THEME_COLORS).join(', ')}`, 'info');
        appendOutput('usage: /config theme <preset|#hex>', 'info');
        return;
      }
      if (value === 'reset') {
        setAccent(storage.defaults.config.accent);
        appendOutput('theme reset', 'success');
        return;
      }
      if (setAccent(value)) appendOutput(`theme: <span style="color:${config.accent}">#</span> ${escapeHtml(config.accent)}`, 'success');
      else appendOutput(`unknown theme: ${escapeHtml(value)}`, 'error');
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
    if (sub === '3d') {
      const isOn = config.parallax3d === true;
      root.commands.confirm(`${isOn ? 'disable' : 'enable'} 3D parallax effect? (Y/N)`, () => {
        config.parallax3d = !isOn;
        save();
        root.core.toggle3D(config.parallax3d);
        appendOutput(`3D parallax: ${config.parallax3d ? 'on' : 'off'}`, 'success');
      });
      return;
    }
    if (sub === 'storage') {
      appendOutput(`<pre>${escapeHtml(storage.describe().join('\n'))}</pre>`, 'info');
      return;
    }
    appendOutput('config only edits essentials: user, host, distro, theme, 3d, and storage info.', 'error');
  }

  root.config = {
    init: apply,
    get: () => config,
    colors: () => ({ ...THEME_COLORS }),
    setAccent,
    apply,
    handle,
  };
})();
