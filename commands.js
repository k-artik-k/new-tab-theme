(function () {
  const root = window.TabOS = window.TabOS || {};
  const storage = root.storage;
  const { escapeHtml, tryMath } = root.utils;
  const core = root.core;

  const BUILTIN_SHORTCUTS = {
    yt: { url: 'https://youtube.com', desc: 'YouTube' },
    youtube: { url: 'https://youtube.com', desc: 'YouTube' },
    gpt: { url: 'https://chatgpt.com', desc: 'ChatGPT' },
    chatgpt: { url: 'https://chatgpt.com', desc: 'ChatGPT' },
    gemini: { url: 'https://gemini.google.com', desc: 'Google Gemini' },
    github: { url: 'https://github.com', desc: 'GitHub' },
    gh: { url: 'https://github.com', desc: 'GitHub' },
    gitam: { url: 'https://login.gitam.edu', desc: 'GITAM Login' },
    mail: { url: 'https://mail.google.com', desc: 'Gmail' },
    gmail: { url: 'https://mail.google.com', desc: 'Gmail' },
    duo: { url: 'https://www.duolingo.com', desc: 'Duolingo' },
    duolingo: { url: 'https://www.duolingo.com', desc: 'Duolingo' },
    lc: { url: 'https://leetcode.com', desc: 'LeetCode' },
    leetcode: { url: 'https://leetcode.com', desc: 'LeetCode' },
    reddit: { url: 'https://reddit.com', desc: 'Reddit' },
    twitter: { url: 'https://twitter.com', desc: 'Twitter / X' },
    x: { url: 'https://twitter.com', desc: 'Twitter / X' },
    drive: { url: 'https://drive.google.com', desc: 'Google Drive' },
    maps: { url: 'https://maps.google.com', desc: 'Google Maps' },
    notion: { url: 'https://notion.so', desc: 'Notion' },
  };

  let userShortcuts = storage.getJson(storage.keys.userShortcuts, {});
  let disabledShortcuts = storage.getJson(storage.keys.disabledShortcuts, []);

  const catalog = [
    ['help', 'small command list'],
    ['theme <terminal|neo|liquid|aero>', 'switch layout'],
    ['clear', 'clear terminal'],
    ['time', 'current time'],
    ['history', 'recent commands'],
    ['layout reset', 'reset widget positions'],
    ['layout edit on|off', 'move/resize alternate themes'],
    ['widget list', 'visible widgets'],
    ['widget toggle <name>', 'show/hide widget'],
    ['config', 'settings'],
    ['config user <name>', 'set prompt user'],
    ['config host <name>', 'set prompt host'],
    ['config distro <name>', 'set distro label'],
    ['config accent <color|#hex>', 'set accent color'],
    ['shortcut list', 'shortcuts'],
    ['shortcut add <name> <url> [description]', 'add shortcut'],
    ['shortcut delete <name>', 'remove shortcut'],
    ['rain on', 'rain on'],
    ['rain off', 'rain off'],
    ['rain preset mist|calm|storm', 'rain preset'],
    ['fact', 'next fact'],
    ['todo list', 'tasks'],
    ['todo add <task>', 'add task'],
    ['todo done <id>', 'finish task'],
    ['todo delete <id>', 'delete task'],
    ['pomodoro start <minutes>', 'start focus'],
    ['pomodoro pause', 'pause focus'],
    ['pomodoro stop', 'stop focus'],
    ['game chicken|snake|pacman|tetris', 'play game'],
    ['yt <query>', 'YouTube'],
    ['gpt <prompt>', 'ChatGPT'],
    ['rd <subreddit>', 'Reddit'],
    ['g <query>', 'Google'],
    ['blur', 'toggle blur'],
    ['blur notes|todo|terminal|facts on|off', 'privacy blur'],
    ['reset', 'reset data'],
  ];

  function allShortcuts() {
    const builtins = {};
    Object.entries(BUILTIN_SHORTCUTS).forEach(([key, value]) => {
      if (!disabledShortcuts.includes(key)) builtins[key] = value;
    });
    return { ...builtins, ...userShortcuts };
  }

  function saveShortcuts() {
    storage.setJson(storage.keys.userShortcuts, userShortcuts);
    storage.setJson(storage.keys.disabledShortcuts, disabledShortcuts);
  }

  function listShortcuts() {
    const all = allShortcuts();
    const entries = Object.entries(all);
    if (!entries.length) return core.appendOutput('no shortcuts.', 'info');
    const lines = entries.map(([k, v]) => `/${k}  ->  ${v.desc}`).join('\n');
    core.appendOutput(`<pre>${escapeHtml(lines)}</pre>`, 'info');
    if (disabledShortcuts.length) core.appendOutput(`${disabledShortcuts.length} built-in disabled.`, 'info');
  }

  function handleShortcut(words, original) {
    const sub = words[1] || 'list';
    const originalParts = original.split(/\s+/).filter(Boolean);
    if (sub === 'list' || sub === 'ls') {
      listShortcuts();
      core.appendOutput('usage: /shortcut add <name> <url> [description], /shortcut delete <name>, /shortcut restore <name>', 'info');
      return;
    }
    if (sub === 'add' || sub === 'set') {
      const name = originalParts[2] ? originalParts[2].toLowerCase().replace(/[^a-z0-9_-]/g, '') : '';
      const url = originalParts[3] || '';
      if (!name || !url) return core.appendOutput('usage: /shortcut add <name> <url> [description]', 'error');
      const descIndex = original.indexOf(url) + url.length;
      const desc = original.slice(descIndex).trim() || name;
      const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      userShortcuts[name] = { url: finalUrl, desc };
      disabledShortcuts = disabledShortcuts.filter(key => key !== name);
      saveShortcuts();
      core.appendOutput(`shortcut /${escapeHtml(name)} -> ${escapeHtml(finalUrl)}`, 'success');
      return;
    }
    if (sub === 'delete' || sub === 'remove' || sub === 'rm' || sub === 'del') {
      const name = words[2];
      if (!name) return core.appendOutput('usage: /shortcut delete <name>', 'error');
      if (userShortcuts[name]) {
        delete userShortcuts[name];
        saveShortcuts();
        core.appendOutput(`removed custom shortcut /${escapeHtml(name)}`, 'success');
        return;
      }
      if (BUILTIN_SHORTCUTS[name]) {
        if (!disabledShortcuts.includes(name)) disabledShortcuts.push(name);
        saveShortcuts();
        core.appendOutput(`disabled built-in shortcut /${escapeHtml(name)}. restore with /shortcut restore ${escapeHtml(name)}`, 'success');
        return;
      }
      core.appendOutput(`shortcut not found: ${escapeHtml(name)}`, 'error');
      return;
    }
    if (sub === 'restore') {
      const name = words[2];
      disabledShortcuts = disabledShortcuts.filter(key => key !== name);
      saveShortcuts();
      core.appendOutput(`restored /${escapeHtml(name)}`, 'success');
      return;
    }
    core.appendOutput('usage: /shortcut list|add|delete|restore', 'error');
  }

  function showHelp(topic) {
    const compactHelp = {
      main: [
        'theme terminal|neo|liquid|aero',
        'g <query>',
        'gpt <prompt>',
        'yt <query>',
        'todo list|add|done|delete',
        'pomodoro start|pause|stop',
        'widget list|toggle <name>',
        'blur notes|todo|terminal|facts on|off',
        'rain on|off',
        'game chicken|snake|pacman|tetris',
        'shortcut list|add|delete|restore',
        'layout reset|edit on|off',
        'config',
        'clear',
      ],
      theme: ['theme terminal', 'theme neo', 'theme liquid', 'theme aero', 'config accent <color|#hex>'],
      todo: ['todo list', 'todo add <task> [!] [due:tomorrow] [50%]', 'todo done <id>', 'todo delete <id>', 'todo clear-done'],
      rain: ['rain on|off', 'rain preset mist|calm|storm', 'rain intensity <0-100>', 'rain wind <dir> <0-100>'],
      config: ['config user <name>', 'config host <name>', 'config distro <name>', 'config accent <color|#hex>', 'config startup on|off'],
    };
    const key = topic && compactHelp[topic] ? topic : 'main';
    const lines = compactHelp[key].map(x => `/${x}`).join('\n');
    const suffix = key === 'main' ? '\n\n/help theme, /help todo, /help rain, /help config' : '';
    core.appendOutput(`<pre>${escapeHtml(lines + suffix)}</pre>`, 'info');
    return;
  }

  function showHistory() {
    if (!core.state.history.length) return core.appendOutput('no history yet.', 'info');
    const lines = core.state.history.slice(0, 20).map((cmd, i) => `${i + 1}. ${cmd}`).join('\n');
    core.appendOutput(`<pre>${escapeHtml(lines)}</pre>`, 'info');
  }

  function launchGame(words) {
    const game = words[1] || 'chicken';
    const option = words[2] || 'medium';
    const allowed = ['chicken', 'snake', 'pacman', 'tetris'];
    if (!allowed.includes(game)) return core.appendOutput(`unknown game: ${escapeHtml(game)}. available: ${allowed.join(', ')}`, 'error');
    core.appendOutput(`launching ${escapeHtml(game)}${game === 'chicken' ? ` ${escapeHtml(option)}` : ''}...`, 'success');
    setTimeout(() => {
      if (typeof startGame === 'function') startGame(game, option);
    }, 160);
  }

  function handleTheme(words) {
    const theme = words[1];
    const layouts = root.config.layouts ? root.config.layouts() : {};
    if (!theme || theme === 'list') {
      core.appendOutput(`current theme: ${escapeHtml(root.config.get().layoutTheme)}`, 'info');
      core.appendOutput(`themes: ${escapeHtml(Object.keys(layouts).join(', '))}`, 'info');
      return;
    }
    if (!root.config.setLayoutTheme(theme)) {
      core.appendOutput(`unknown theme: ${escapeHtml(theme)}. use ${escapeHtml(Object.keys(layouts).join(', '))}`, 'error');
      return;
    }
    core.appendOutput(`theme: ${escapeHtml(root.config.get().layoutTheme)}`, 'success');
  }

  function chatGptPromptUrl(prompt) {
    const params = new URLSearchParams();
    params.set('q', prompt);
    return `https://chatgpt.com/?${params.toString()}`;
  }

  function handleLayout(words) {
    if (words[1] === 'reset') {
      if (root.layout && root.layout.resetTheme) root.layout.resetTheme();
      core.appendOutput('layout reset for this theme.', 'success');
      return;
    }
    if (words[1] === 'edit') {
      const value = words[2];
      if (value !== 'on' && value !== 'off') {
        core.appendOutput('usage: /layout edit on|off', 'info');
        return;
      }
      if (root.config.get().layoutTheme === 'terminal' && value === 'on') {
        core.appendOutput('terminal theme is locked.', 'info');
        return;
      }
      if (root.layout && root.layout.setEditMode) root.layout.setEditMode(value === 'on');
      core.appendOutput(`layout edit: ${value}`, 'success');
      return;
    }
    core.appendOutput('usage: /layout reset, /layout edit on|off', 'info');
  }

  function handleWidget(words) {
    const action = words[1] || 'list';
    const name = words[2];
    const widgets = root.layout && root.layout.widgets ? root.layout.widgets() : [];
    if (action === 'list') {
      const lines = widgets.map(widget => `${widget}: ${root.layout.isVisible(widget) ? 'on' : 'off'}`).join('\n');
      core.appendOutput(`<pre>${escapeHtml(lines)}</pre>`, 'info');
      return;
    }
    if (action === 'reset') {
      if (root.layout && root.layout.resetVisibility) root.layout.resetVisibility();
      core.appendOutput('widgets reset.', 'success');
      return;
    }
    if (!name || !widgets.includes(name)) {
      core.appendOutput(`widgets: ${escapeHtml(widgets.join(', '))}`, 'info');
      core.appendOutput('usage: /widget show|hide|toggle <name>', 'info');
      return;
    }
    if (action === 'show' || action === 'on') {
      root.layout.setWidgetVisible(name, true);
      core.appendOutput(`${name}: on`, 'success');
      return;
    }
    if (action === 'hide' || action === 'off') {
      root.layout.setWidgetVisible(name, false);
      core.appendOutput(`${name}: off`, 'success');
      return;
    }
    if (action === 'toggle') {
      root.layout.toggleWidget(name);
      core.appendOutput(`${name}: ${root.layout.isVisible(name) ? 'on' : 'off'}`, 'success');
      return;
    }
    core.appendOutput('usage: /widget list|show|hide|toggle|reset', 'info');
  }

  function handleSlash(commandLine) {
    const lowerLine = commandLine.toLowerCase().trim();
    const words = lowerLine.split(/\s+/).filter(Boolean);
    const base = words[0] || '';
    const originalWords = commandLine.split(/\s+/).filter(Boolean);

    if (base === 'help') return showHelp(words[1]);
    if (base === 'clear' || base === 'cls') {
      core.dom.output.innerHTML = '';
      return;
    }
    if (base === 'time') return core.appendOutput(escapeHtml(core.dom.clock.textContent), 'info');
    if (base === 'history') return showHistory();

    if (base === 'layout') return handleLayout(words);
    if (base === 'widget' || base === 'widgets') return handleWidget(words);
    if (base === 'theme') return handleTheme(words);
    if (base === 'config') return root.config.handle(words, commandLine);
    if (base === 'shortcut' || base === 'shortcuts') return handleShortcut(words, commandLine);
    if (base === 'rain' || base === 'animation') return root.rain.handle(base === 'animation' ? ['rain', words[1]] : words);
    if (base === 'fact') return root.facts.handle(words);
    if (base === 'todo') return root.todo.handle(words, commandLine);
    if (base === 'pomodoro') return root.todo.handlePomodoro(words);
    if (base === 'game') return launchGame(words);
    if (base === 'blur') return handleBlur(words);
    if (base === 'reset') return handleReset();

    if (base === 'yt' && originalWords.length > 1) {
      const q = commandLine.slice(3).trim();
      return core.routeTo(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, `YouTube: "${q}"`);
    }
    if (base === 'gpt' && originalWords.length > 1) {
      const q = commandLine.slice(4).trim();
      return core.routeTo(chatGptPromptUrl(q), `ChatGPT: "${q}"`);
    }
    if (base === 'rd' && originalWords.length > 1) {
      const sub = commandLine.slice(3).trim().replace(/^r\//i, '');
      return core.routeTo(`https://www.reddit.com/r/${encodeURIComponent(sub)}`, `Reddit: r/${sub}`);
    }
    if (base === 'g' && originalWords.length > 1) {
      const q = commandLine.slice(2).trim();
      return core.routeTo(`https://www.google.com/search?q=${encodeURIComponent(q)}`, `search: "${q}"`);
    }

    const shortcuts = allShortcuts();
    if (shortcuts[lowerLine]) {
      core.appendOutput(`open: ${escapeHtml(shortcuts[lowerLine].desc)}`, 'success');
      setTimeout(() => { window.location.href = shortcuts[lowerLine].url; }, 160);
      return;
    }

    core.appendOutput(`command not found: /${escapeHtml(lowerLine)}`, 'error');
  }

  let pendingConfirm = null;

  function confirm(message, callback) {
    pendingConfirm = { callback };
    core.appendOutput(message, 'info');
  }

  function handleBlur(words) {
    const sub = words[1];
    const action = words[2];
    const targets = blurTargets();

    if (!sub) {
      const allBlurred = Object.values(targets).every(group => group.length && group.every(el => el.classList.contains('blurred')));
      Object.keys(targets).forEach(key => setBlurred(key, !allBlurred));
      saveBlurState();
      core.appendOutput(allBlurred ? 'blur disabled.' : 'blur enabled.', 'success');
      return;
    }
    if (sub === 'all' && action === 'off') {
      Object.keys(targets).forEach(key => setBlurred(key, false));
      saveBlurState();
      core.appendOutput('all blur disabled.', 'success');
      return;
    }
    if (targets[sub]) {
      const on = action !== 'off';
      setBlurred(sub, on);
      saveBlurState();
      core.appendOutput(`${sub} blur ${on ? 'enabled' : 'disabled'}.`, 'success');
      return;
    }
    core.appendOutput('usage: /blur [notes|todo|terminal|facts] [on|off]', 'error');
  }

  function blurTargets() {
    return {
      notes: [document.getElementById('stickyPanel'), ...document.querySelectorAll('.floating-note')].filter(Boolean),
      todo: [document.getElementById('todoPanel')].filter(Boolean),
      terminal: [document.getElementById('output')].filter(Boolean),
      facts: [document.getElementById('factBar')].filter(Boolean),
    };
  }

  function setBlurred(key, on) {
    if (key === 'notes' && root.notes && root.notes.setBlurred) {
      root.notes.setBlurred(on);
      return;
    }
    (blurTargets()[key] || []).forEach(el => el.classList.toggle('blurred', on));
  }

  function saveBlurState() {
    const state = {};
    Object.entries(blurTargets()).forEach(([key, group]) => {
      state[key] = group.some(el => el.classList.contains('blurred'));
    });
    storage.setJson(storage.keys.blurState, state);
  }

  function restoreBlurState() {
    const state = storage.getJson(storage.keys.blurState, {});
    Object.entries(state).forEach(([key, blurred]) => {
      setBlurred(key, !!blurred);
    });
  }

  function handleReset() {
    confirm('this will erase all data. type Y to confirm, N to cancel.', () => {
      core.appendOutput('resetting all data...', 'error');
      setTimeout(() => {
        localStorage.clear();
        location.reload();
      }, 600);
    });
  }

  function handle(raw) {
    const command = raw.trim();
    if (!command) return;

    if (pendingConfirm) {
      core.echoCommand(command);
      if (command.trim().toUpperCase() === 'Y') pendingConfirm.callback();
      else core.appendOutput('cancelled.', 'info');
      pendingConfirm = null;
      return;
    }

    core.saveHistory(command);
    core.echoCommand(command);

    if (command === '?') return showHelp();
    if (command.startsWith('/')) return handleSlash(command.slice(1).trim());

    const math = tryMath(command);
    if (math !== null) return core.appendOutput(`= ${math}`, 'info');
    core.routeTo(`https://www.google.com/search?q=${encodeURIComponent(command)}`, `search: "${command}"`);
  }

  function patternMatches(pattern, query) {
    const p = pattern.toLowerCase().split(/\s+/);
    const q = query.toLowerCase().split(/\s+/);
    for (let i = 0; i < q.length; i++) {
      if (!p[i]) {
        const last = p[p.length - 1] || '';
        return last.startsWith('<') || last.startsWith('[') || last.includes('|');
      }
      if (p[i].startsWith('<') || p[i].includes('|') || p[i].startsWith('[')) {
        if (i === p.length - 1) return true;
        continue;
      }
      if (!p[i].startsWith(q[i])) return false;
    }
    return true;
  }

  function completions(query) {
    const q = query.replace(/^\//, '').toLowerCase();
    const entries = catalog
      .filter(([usage]) => patternMatches(usage, q))
      .map(([usage, desc]) => [usage, { desc }]);
    const shortcutMatches = Object.entries(allShortcuts())
      .filter(([key]) => key.startsWith(q))
      .map(([key, value]) => [key, { desc: value.desc }]);
    return [...entries, ...shortcutMatches].slice(0, 14);
  }

  function init() {
    root.core.dom.cmdInput.focus();
    restoreBlurState();
  }

  root.shortcuts = { all: allShortcuts };
  root.commands = {
    init,
    handle,
    completions,
    showHelp,
    confirm,
  };
})();
