(function () {
  const root = window.TabOS = window.TabOS || {};
  const storage = root.storage;
  const { escapeHtml, tryMath } = root.utils;
  const core = root.core;

  function isTerminalTheme() {
    return !root.config || !root.config.get || root.config.get().layoutTheme === 'terminal';
  }

  const HEAVY_COMMANDS = ['game', 'todo', 'pomodoro', 'reset'];

  const BUILTIN_SHORTCUTS = {
    yt: { url: 'https://youtube.com', desc: 'YouTube' },
    youtube: { url: 'https://youtube.com', desc: 'YouTube' },
    gpt: { url: 'https://chatgpt.com', desc: 'ChatGPT' },
    chatgpt: { url: 'https://chatgpt.com', desc: 'ChatGPT' },
    claude: { url: 'https://claude.ai', desc: 'Claude AI' },
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
    ['help', 'commands'],
    ['theme <name>', 'switch theme'],
    ['clear', 'clear'],
    ['time', 'current time'],
    ['history', 'recent commands'],
    ['config', 'settings'],
    ['config enable <widget>', 'show widget'],
    ['config disable <widget>', 'hide widget'],
    ['config accent <color>', 'accent color'],
    ['widget list', 'widgets'],
    ['widget toggle <name>', 'toggle widget'],
    ['shortcut list', 'shortcuts'],
    ['shortcut add <name> <url>', 'add shortcut'],
    ['rain on|off', 'rain'],
    ['rain preset mist|calm|storm', 'preset'],
    ['fact', 'next fact'],
    ['todo list', 'tasks'],
    ['todo add <task>', 'add task'],
    ['game chicken|snake|pacman|tetris', 'play'],
    ['cat [text]', 'create note'],
    ['export', 'backup data'],
    ['gpt <prompt>', 'ChatGPT'],
    ['claude <prompt>', 'Claude AI'],
    ['yt <query>', 'YouTube'],
    ['blur', 'privacy'],
    ['layout reset', 'reset layout'],
    ['pomodoro start|pause|stop', 'focus timer'],
    ['reset', 'reset all data'],
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
      core.appendOutput('usage: /shortcut add <name> <url> [desc], /shortcut delete <name>', 'info');
      return;
    }
    if (sub === 'add' || sub === 'set') {
      const name = originalParts[2] ? originalParts[2].toLowerCase().replace(/[^a-z0-9_-]/g, '') : '';
      const url = originalParts[3] || '';
      if (!name || !url) return core.appendOutput('usage: /shortcut add <name> <url> [desc]', 'error');
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
        core.appendOutput(`disabled /${escapeHtml(name)}. restore with /shortcut restore ${escapeHtml(name)}`, 'success');
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
        'help / ?              commands',
        'theme <name>          switch theme',
        'config                settings',
        'g: <query>            google search',
        'gpt <prompt>          ChatGPT',
        'claude <prompt>       Claude AI',
        'yt <query>            YouTube',
        'cat [text]            create note',
        'todo                  tasks (terminal only)',
        'game                  play (terminal only)',
        'rain on|off           rain',
        'blur                  privacy',
        'widget list|toggle    widgets',
        'shortcut list         links',
        'export                backup to clipboard',
        'clear                 clear',
      ],
      theme: ['theme terminal|neo|win7', 'config accent <color|#hex>'],
      todo: ['todo list', 'todo add <task> [!] [due:YYYY-MM-DD]', 'todo done <id>', 'todo delete <id>', 'todo clear-done'],
      rain: ['rain on|off', 'rain preset mist|calm|storm', 'rain intensity <0-100>'],
      config: ['config user|host <name>', 'config accent <color>', 'config enable|disable <widget>', 'config startup on|off'],
    };
    const key = topic && compactHelp[topic] ? topic : 'main';
    const lines = key === 'main'
      ? compactHelp[key].join('\n')
      : compactHelp[key].map(x => `/${x}`).join('\n');
    const suffix = key === 'main' ? '\n\n/help theme, /help todo, /help rain, /help config' : '';
    core.appendOutput(`<pre>${escapeHtml(lines + suffix)}</pre>`, 'info');
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

  function handleCat(commandLine) {
    const text = commandLine.slice(commandLine.toLowerCase().indexOf('cat') + 3).trim();
    if (!text) {
      if (root.notes && root.notes.openNew) root.notes.openNew();
      else core.appendOutput('note editor opened.', 'info');
      return;
    }
    if (root.notes && root.notes.add) {
      root.notes.add(text);
      core.appendOutput(`note created: ${escapeHtml(text.slice(0, 40))}${text.length > 40 ? '...' : ''}`, 'success');
    } else {
      core.appendOutput('notes module not available.', 'error');
    }
  }

  function handleExport() {
    const data = {
      notes: root.notes ? root.notes.all() : [],
      todos: root.todo ? root.todo.all() : [],
      shortcuts: userShortcuts,
      config: root.config ? root.config.get() : {},
    };
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      core.appendOutput('data copied to clipboard as JSON.', 'success');
    }).catch(() => {
      core.appendOutput('clipboard access denied. check browser permissions.', 'error');
    });
  }

  function handleSlash(commandLine) {
    const lowerLine = commandLine.toLowerCase().trim();
    const words = lowerLine.split(/\s+/).filter(Boolean);
    const base = words[0] || '';
    const originalWords = commandLine.split(/\s+/).filter(Boolean);

    // Block heavy commands in non-terminal themes
    if (!isTerminalTheme() && HEAVY_COMMANDS.includes(base)) {
      return core.appendOutput(`/${base} is only available in terminal theme.`, 'error');
    }

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
    if (base === 'cat') return handleCat(commandLine);
    if (base === 'export') return handleExport();

    if (base === 'yt' && originalWords.length > 1) {
      const q = commandLine.slice(3).trim();
      return core.routeTo(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, `YouTube: "${q}"`);
    }
    if (base === 'gpt' && originalWords.length > 1) {
      const q = commandLine.slice(4).trim();
      return core.routeTo(chatGptPromptUrl(q), `ChatGPT: "${q}"`);
    }
    if (base === 'claude' && originalWords.length > 1) {
      const q = commandLine.slice(7).trim();
      return core.routeTo(`https://claude.ai/new?q=${encodeURIComponent(q)}`, `Claude: "${q}"`);
    }
    if (base === 'rd' && originalWords.length > 1) {
      const sub = commandLine.slice(3).trim().replace(/^r\//i, '');
      return core.routeTo(`https://www.reddit.com/r/${encodeURIComponent(sub)}`, `Reddit: r/${sub}`);
    }
    if (base === 'g' && originalWords.length > 1) {
      const q = commandLine.slice(2).trim();
      return core.routeTo(`https://www.google.com/search?q=${encodeURIComponent(q)}`, `search: "${q}"`);
    }

    // ── Easter eggs ──
    if (base === 'sudo') return core.appendOutput('nice try. you\'re not root here.', 'error');
    if (base === 'exit') {
      core.appendOutput('there is no escape.', 'error');
      const v = document.createElement('div');
      v.className = 'void-overlay';
      v.innerHTML = '<span class="void-text">...</span>';
      document.body.appendChild(v);
      setTimeout(() => v.remove(), 2500);
      return;
    }
    if (base === 'hello' || base === 'hi') {
      const greetings = ['hey there! 👋', 'hello, human.', 'sup.', 'greetings, traveler.', 'yo.', '*waves*'];
      return core.appendOutput(greetings[Math.floor(Math.random() * greetings.length)], 'success');
    }
    if (base === 'coffee') {
      core.appendOutput('brewing... ☕', 'success');
      const orig = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      document.documentElement.style.setProperty('--accent', '#6f4e37');
      setTimeout(() => document.documentElement.style.setProperty('--accent', orig), 1500);
      return;
    }
    if (base === '42') return core.appendOutput('the answer to life, the universe, and everything.', 'info');
    if (base === 'hack') {
      const chars = '01アイウエオカキクケコサシスセソ█▓░';
      let count = 0;
      const iv = setInterval(() => {
        let line = '';
        for (let i = 0; i < 48; i++) line += chars[Math.floor(Math.random() * chars.length)];
        core.appendOutput(`<span style="color:var(--green);font-size:10px">${line}</span>`, 'info');
        count++;
        if (count > 8) { clearInterval(iv); core.appendOutput('access granted.', 'success'); }
      }, 80);
      return;
    }
    if (base === 'matrix') {
      let count = 0;
      const iv = setInterval(() => {
        let line = '';
        for (let i = 0; i < 60; i++) line += String.fromCharCode(0x30A0 + Math.random() * 96);
        core.appendOutput(`<span style="color:#00ff41;font-size:9px;opacity:0.7">${line}</span>`, 'info');
        count++;
        if (count > 6) { clearInterval(iv); core.appendOutput('wake up, Neo...', 'success'); }
      }, 60);
      return;
    }
    if (base === 'fortune') {
      const fortunes = ['A surprise awaits you at your next commit.','You will mass-delete node_modules... again.','Your code will compile on the first try. Just kidding.','A segfault is in your future. In C, not here.','The bug is not where you think it is.','Today is a good day to refactor.','You will discover a missing semicolon.','An unexpected rebase will bring clarity.'];
      return core.appendOutput(`🥠 ${fortunes[Math.floor(Math.random() * fortunes.length)]}`, 'info');
    }
    if (base === 'xkcd') {
      const quotes = ['There are only two hard problems in CS: cache invalidation, naming things, and off-by-one errors.','It works on my machine.','// TODO: fix this later','sudo make me a sandwich.','The cloud is just someone else\'s computer.','Have you tried turning it off and on again?'];
      return core.appendOutput(quotes[Math.floor(Math.random() * quotes.length)], 'info');
    }
    if (lowerLine === 'rm -rf /' || lowerLine === 'rm -rf') {
      core.appendOutput('deleting system files...', 'error');
      document.body.style.transition = 'transform 0.05s';
      let shakes = 0;
      const shakeIv = setInterval(() => {
        document.body.style.transform = `translateX(${(Math.random() - 0.5) * 8}px)`;
        shakes++;
        if (shakes > 14) { clearInterval(shakeIv); document.body.style.transform = ''; core.appendOutput('just kidding. nice try though.', 'success'); }
      }, 40);
      return;
    }

    // Shortcut lookup
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

  // Known command names for slash-less execution
  const KNOWN_COMMANDS = ['help','clear','cls','time','history','layout','widget','widgets','theme','config',
    'shortcut','shortcuts','rain','animation','fact','todo','pomodoro','game','blur','reset','cat','export',
    'sudo','exit','hello','hi','coffee','hack','matrix','fortune','xkcd','42',
    'yt','gpt','claude','rd','g'];

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

    // g: prefix for google search
    if (/^g:\s*/i.test(command)) {
      const q = command.replace(/^g:\s*/i, '').trim();
      if (q) return core.routeTo(`https://www.google.com/search?q=${encodeURIComponent(q)}`, `search: "${q}"`);
      return core.appendOutput('usage: g: <query>', 'error');
    }

    // Try math first
    const math = tryMath(command);
    if (math !== null) return core.appendOutput(`= ${math}`, 'info');

    // Try as a command without slash
    const lowerCmd = command.toLowerCase().trim();
    const firstWord = lowerCmd.split(/\s+/)[0];
    if (KNOWN_COMMANDS.includes(firstWord) || lowerCmd === 'rm -rf /' || lowerCmd === 'rm -rf') {
      return handleSlash(command);
    }

    // Check shortcuts
    const shortcuts = allShortcuts();
    if (shortcuts[lowerCmd]) {
      core.appendOutput(`open: ${escapeHtml(shortcuts[lowerCmd].desc)}`, 'success');
      setTimeout(() => { window.location.href = shortcuts[lowerCmd].url; }, 160);
      return;
    }

    core.appendOutput(`unknown command: ${escapeHtml(command)}. type /help`, 'error');
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
