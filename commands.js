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
    ['help', 'show detailed command help'],
    ['help <command>', 'show help for one command family'],
    ['clear', 'clear terminal output'],
    ['time', 'print current time'],
    ['history', 'show command history'],
    ['neofetch', 'show distro summary'],
    ['uname', 'show fake kernel line'],
    ['config', 'show essential config'],
    ['config user <name>', 'set prompt user'],
    ['config host <name>', 'set prompt host'],
    ['config distro <name>', 'set distro label'],
    ['config theme <color|#hex>', 'set accent theme'],
    ['config theme list', 'show theme presets'],
    ['config storage', 'show localStorage keys'],
    ['shortcut list', 'list custom shortcuts'],
    ['shortcut add <name> <url> [description]', 'add shortcut'],
    ['shortcut delete <name>', 'delete custom or disable built-in shortcut'],
    ['shortcut restore <name>', 'restore disabled built-in shortcut'],
    ['rain', 'show rain status'],
    ['rain on', 'enable rain'],
    ['rain off', 'disable rain'],
    ['rain preset mist', 'light rain preset'],
    ['rain preset storm', 'storm preset'],
    ['rain intensity <0-100>', 'set rain intensity'],
    ['rain wind <dir|degrees> <0-100>', 'set wind direction and speed'],
    ['rain sound on', 'enable rain sound'],
    ['rain sound off', 'disable rain sound'],
    ['rain thunder on', 'enable thunder bolts'],
    ['rain thunder off', 'disable thunder'],
    ['fact', 'show next fact'],
    ['fact mode science', 'science fact mode'],
    ['fact mode tech', 'tech fact mode'],
    ['fact mode weird', 'weird internet lore mode'],
    ['fact mode context', 'contextual facts'],
    ['fact cache', 'show offline fact cache'],
    ['todo list', 'list active tasks'],
    ['todo list done', 'list completed tasks'],
    ['todo add <task> [!] [due:YYYY-MM-DD] [recur:daily] [50%]', 'add task'],
    ['todo done <id>', 'complete/toggle task'],
    ['todo delete <id>', 'delete task'],
    ['todo move <from-id> <to-id>', 'reorder task'],
    ['todo due <id> <date|today|tomorrow|clear>', 'set due date'],
    ['todo recur <id> none|daily|weekly|monthly', 'set recurrence'],
    ['todo progress <id> <0-100>', 'set progress'],
    ['todo clear-done', 'delete completed tasks'],
    ['pomodoro start <minutes>', 'start focus timer'],
    ['pomodoro pause', 'pause focus timer'],
    ['pomodoro stop', 'reset focus timer'],
    ['pomodoro status', 'show timer status'],
    ['game chicken easy', 'Chicken Defender easy'],
    ['game chicken medium', 'Chicken Defender medium'],
    ['game chicken hard', 'Chicken Defender hard survival'],
    ['game snake', 'play Snake'],
    ['game pacman', 'play maze game'],

    ['game tetris', 'play Tetris'],
    ['yt <query>', 'YouTube search'],
    ['gpt <query>', 'ChatGPT prompt'],
    ['rd <subreddit>', 'open subreddit'],
    ['g <query>', 'Google search'],
    ['blur', 'toggle blur on all panels'],
    ['blur notes|todo|terminal|facts on|off', 'blur specific panel'],
    ['reset', 'reset all data with confirmation'],
    ['config startup on|off', 'toggle boot animation'],
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
    const custom = Object.keys(userShortcuts);
    if (!custom.length) core.appendOutput('no custom shortcuts yet.', 'info');
    custom.forEach(key => core.appendOutput(`/${escapeHtml(key)} -> ${escapeHtml(userShortcuts[key].url)}`, 'info'));
    core.appendOutput(`${Object.keys(allShortcuts()).length} active shortcuts, ${disabledShortcuts.length} built-in disabled.`, 'info');
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
    const groups = {
      search: ['yt <query>', 'gpt <query>', 'rd <subreddit>', 'g <query>', '<bare text>'],
      config: ['config', 'config user|host|distro <name>', 'config theme <color|#hex>', 'config startup on|off', 'config storage'],
      shortcuts: ['shortcut list|add|delete|restore'],
      rain: ['rain on|off', 'rain preset mist|calm|storm', 'rain intensity|wind|sound|thunder'],
      facts: ['fact', 'fact mode science|tech|weird|context|mixed'],
      todo: ['todo list|add|done|delete|move|due|recur|progress|clear-done'],
      timer: ['pomodoro start|pause|stop|status'],
      games: ['game chicken easy|medium|hard', 'game snake', 'game pacman', 'game tetris'],
      privacy: ['blur', 'blur notes|todo|terminal|facts on|off'],
      system: ['reset', 'clear', 'history', 'neofetch', 'uname'],
    };

    if (topic && groups[topic]) {
      core.appendOutput(`<pre>${escapeHtml(groups[topic].map(x => `/${x}`).join('\n'))}</pre>`, 'info');
      return;
    }

    let text = '';
    Object.entries(groups).forEach(([name, lines]) => {
      text += `${name}\n`;
      lines.forEach(line => { text += `  /${line}\n`; });
      text += '\n';
    });
    text += 'type /help <section> for details. tab to autocomplete.';
    core.appendOutput(`<pre>${escapeHtml(text)}</pre>`, 'info');
  }

  function showHistory() {
    if (!core.state.history.length) return core.appendOutput('no history yet.', 'info');
    const lines = core.state.history.slice(0, 20).map((cmd, i) => `${i + 1}. ${cmd}`).join('\n');
    core.appendOutput(`<pre>${escapeHtml(lines)}</pre>`, 'info');
  }

  function showNeofetch() {
    const config = root.config.get();
    const stats = root.todo.stats();
    const logo = ['      /\\', '     /  \\', '    /____\\', '   /      \\', '  /__tab___\\'].join('\n');
    const info = [
      `${config.user}@${config.host}`,
      `distro: ${config.distro}`,
      `theme: ${config.accent}`,
      `rain: ${root.rain.settings().enabled ? 'on' : 'off'}`,
      `facts: ${root.facts.mode()}`,
      `tasks: ${stats.active} active`,
      `games: chicken, snake, pacman, tetris`,
    ].join('\n');
    core.appendOutput(`<pre>${escapeHtml(`${logo}\n\n${info}`)}</pre>`, 'info');
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
    if (base === 'neofetch') return showNeofetch();
    if (base === 'uname') return core.appendOutput(`${escapeHtml(root.config.get().distro)} newtab 2.0.0 browser-js x86_64`, 'info');
    if (lowerLine === 'sudo make me a distro') return core.appendOutput('building from vibes... done. package name: tabos-minimal', 'success');
    if (lowerLine === 'kernel panic') return core.appendOutput('<pre>kernel panic: attempted to boot without coffee\nrecovered: staying in userspace</pre>', 'error');
    if (lowerLine === '42') return core.appendOutput('42: accepted. no further enlightenment installed.', 'success');

    if (base === 'config') return root.config.handle(words, commandLine);
    if (base === 'shortcut' || base === 'shortcuts') return handleShortcut(words, commandLine);
    if (base === 'rain' || base === 'animation') return root.rain.handle(base === 'animation' ? ['rain', words[1]] : words);
    if (base === 'fact') return root.facts.handle(words);
    if (base === 'todo') return root.todo.handle(words, commandLine);
    if (base === 'pomodoro') return root.todo.handlePomodoro(words);
    if (base === 'game') return launchGame(words);
    if (base === 'blur') return handleBlur(words);
    if (base === 'reset') return handleReset();
    if (lowerLine === 'rm -rf * --force' || lowerLine === 'rm -rf *--force') return nukeEverything();
    if (base === 'sudo' && words.length === 1) return easterSudo();
    if (base === 'void') return easterVoid();

    if (base === 'yt' && originalWords.length > 1) {
      const q = commandLine.slice(3).trim();
      return core.routeTo(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, `YouTube: "${q}"`);
    }
    if (base === 'gpt' && originalWords.length > 1) {
      const q = commandLine.slice(4).trim();
      return core.routeTo(`https://chatgpt.com/?q=${encodeURIComponent(q)}`, `ChatGPT: "${q}"`);
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

  let pendingReset = false;

  function handleBlur(words) {
    const blurTargets = {
      notes: document.getElementById('stickyPanel'),
      todo: document.getElementById('todoPanel'),
      terminal: document.getElementById('output'),
      facts: document.getElementById('factBar'),
    };
    const sub = words[1];
    const action = words[2];

    if (!sub) {
      const allBlurred = Object.values(blurTargets).every(el => el && el.classList.contains('blurred'));
      Object.values(blurTargets).forEach(el => { if (el) el.classList.toggle('blurred', !allBlurred); });
      saveBlurState(blurTargets);
      core.appendOutput(allBlurred ? 'blur disabled.' : 'blur enabled.', 'success');
      return;
    }
    if (sub === 'all' && action === 'off') {
      Object.values(blurTargets).forEach(el => { if (el) el.classList.remove('blurred'); });
      saveBlurState(blurTargets);
      core.appendOutput('all blur disabled.', 'success');
      return;
    }
    if (blurTargets[sub]) {
      const on = action !== 'off';
      blurTargets[sub].classList.toggle('blurred', on);
      saveBlurState(blurTargets);
      core.appendOutput(`${sub} blur ${on ? 'enabled' : 'disabled'}.`, 'success');
      return;
    }
    core.appendOutput('usage: /blur [notes|todo|terminal|facts] [on|off]', 'error');
  }

  function saveBlurState(targets) {
    const state = {};
    Object.entries(targets).forEach(([key, el]) => {
      state[key] = el ? el.classList.contains('blurred') : false;
    });
    storage.setJson(storage.keys.blurState, state);
  }

  function restoreBlurState() {
    const state = storage.getJson(storage.keys.blurState, {});
    const targets = {
      notes: document.getElementById('stickyPanel'),
      todo: document.getElementById('todoPanel'),
      terminal: document.getElementById('output'),
      facts: document.getElementById('factBar'),
    };
    Object.entries(state).forEach(([key, blurred]) => {
      if (targets[key] && blurred) targets[key].classList.add('blurred');
    });
  }

  function handleReset() {
    pendingReset = true;
    core.appendOutput('⚠ this will erase all data. type Y to confirm, N to cancel.', 'error');
  }

  function processResetConfirm(input) {
    pendingReset = false;
    if (input.trim().toUpperCase() === 'Y') {
      core.appendOutput('resetting all data...', 'error');
      setTimeout(() => {
        localStorage.clear();
        location.reload();
      }, 600);
    } else {
      core.appendOutput('reset cancelled.', 'info');
    }
  }

  function nukeEverything() {
    const lines = [
      { text: '[▓▓▓▓▓▓▓▓▓▓] deleting system files...', delay: 0 },
      { text: '[▓▓▓▓▓▓▓▓▓▓] purging user data...', delay: 500 },
      { text: '[▓▓▓▓▓▓▓▓▓▓] removing traces...', delay: 1000 },
      { text: '> system wiped. reloading...', delay: 1500 },
    ];
    lines.forEach(({ text, delay }) => {
      setTimeout(() => core.appendOutput(escapeHtml(text), 'error'), delay);
    });
    setTimeout(() => {
      localStorage.clear();
      location.reload();
    }, 2500);
  }

  function easterSudo() {
    core.appendOutput(`[sudo] password for ${escapeHtml(root.config.get().user)}: ████████`, 'info');
    setTimeout(() => {
      core.appendOutput('Sorry, user is not in the sudoers file. This incident will be reported.', 'error');
    }, 800);
  }

  function easterVoid() {
    const overlay = document.createElement('div');
    overlay.className = 'void-overlay';
    const text = document.createElement('div');
    text.className = 'void-text';
    text.textContent = 'you stared into the void. the void stared back.';
    overlay.appendChild(text);
    document.body.appendChild(overlay);
    setTimeout(() => {
      overlay.remove();
      core.appendOutput('...', 'info');
    }, 3500);
  }

  function handle(raw) {
    const command = raw.trim();
    if (!command) return;

    if (pendingReset) {
      core.echoCommand(command);
      processResetConfirm(command);
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
  };
})();
