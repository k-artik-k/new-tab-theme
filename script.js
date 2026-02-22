// ── Shortcuts ──
const SHORTCUTS = {
  yt:       { url: 'https://youtube.com',           desc: 'YouTube' },
  youtube:  { url: 'https://youtube.com',           desc: 'YouTube' },
  gpt:      { url: 'https://chatgpt.com',           desc: 'ChatGPT' },
  chatgpt:  { url: 'https://chatgpt.com',           desc: 'ChatGPT' },
  gemini:   { url: 'https://gemini.google.com',     desc: 'Google Gemini' },
  github:   { url: 'https://github.com',            desc: 'GitHub' },
  gh:       { url: 'https://github.com',            desc: 'GitHub' },
  gitam:    { url: 'https://login.gitam.edu',       desc: 'GITAM Login' },
  mail:     { url: 'https://mail.google.com',       desc: 'Gmail' },
  gmail:    { url: 'https://mail.google.com',       desc: 'Gmail' },
  duo:      { url: 'https://www.duolingo.com',      desc: 'Duolingo' },
  duolingo: { url: 'https://www.duolingo.com',      desc: 'Duolingo' },
  lc:       { url: 'https://leetcode.com',          desc: 'LeetCode' },
  leetcode: { url: 'https://leetcode.com',          desc: 'LeetCode' },
  reddit:   { url: 'https://reddit.com',            desc: 'Reddit' },
  twitter:  { url: 'https://twitter.com',           desc: 'Twitter / X' },
  x:        { url: 'https://twitter.com',           desc: 'Twitter / X' },
  drive:    { url: 'https://drive.google.com',      desc: 'Google Drive' },
  maps:     { url: 'https://maps.google.com',       desc: 'Google Maps' },
  notion:   { url: 'https://notion.so',             desc: 'Notion' },
  spotify:  { url: 'https://open.spotify.com',      desc: 'Spotify' },
};

// ── Interesting facts ──
const FACTS = [
  "A mass of neutron star the size of a sugar cube weighs about 1 billion tons.",
  "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible.",
  "Octopuses have three hearts and blue blood.",
  "A day on Venus is longer than a year on Venus.",
  "Bananas are berries, but strawberries aren't.",
  "The human brain uses about 20% of the body's total energy.",
  "There are more possible iterations of a game of chess than atoms in the observable universe.",
  "The first computer programmer was Ada Lovelace, in 1843.",
  "One teaspoon of a neutron star would weigh about 6 billion tons.",
  "The world's first website is still online: info.cern.ch",
  "Light takes 8 minutes and 20 seconds to travel from the Sun to Earth.",
  "A group of flamingos is called a 'flamboyance'.",
  "The first 1GB hard drive (1980) weighed about 250 kg and cost $40,000.",
  "There are more bacteria in your mouth than people on Earth.",
  "If you could fold a piece of paper 42 times, it would reach the Moon.",
  "The shortest war in history lasted 38 to 45 minutes — between Britain and Zanzibar.",
  "Wombat poop is cube-shaped.",
  "A photon takes ~170,000 years to travel from the Sun's core to its surface, but only 8 min to Earth.",
  "The total weight of ants on Earth is roughly equal to the total weight of all humans.",
  "Git was created by Linus Torvalds in just 10 days.",
  "The first computer bug was an actual bug — a moth found in a Harvard Mark II in 1947.",
  "The entire Wikipedia database is about 22 GB compressed.",
  "Your DNA is about 99.9% identical to every other human's.",
  "There are more stars in the universe than grains of sand on all of Earth's beaches.",
  "Cleopatra lived closer in time to the Moon landing than to the construction of the Great Pyramid.",
  "Linux runs on over 90% of the world's top 500 supercomputers.",
  "Sound travels about 4.3 times faster in water than in air.",
  "A jiffy is an actual unit of time: 1/100th of a second.",
  "The inventor of the Pringles can is buried in one.",
  "Sharks are older than trees by about 50 million years.",
];

// ── Config (editable) ──
const DEFAULT_CONFIG = { user: 'user', host: 'terminal' };
let config = JSON.parse(localStorage.getItem('termConfig') || 'null') || { ...DEFAULT_CONFIG };

function applyConfig() {
  document.getElementById('topBarName').textContent = `${config.user}@${config.host}`;
  document.getElementById('promptUser').textContent = config.user;
  document.getElementById('promptHost').textContent = config.host;
}
function saveConfig() {
  localStorage.setItem('termConfig', JSON.stringify(config));
  applyConfig();
}
applyConfig();

// ── State ──
let cmdHistory = JSON.parse(localStorage.getItem('cmdHistory') || '[]');
let historyIdx = -1;
let activeAcIdx = -1;
let notes = JSON.parse(localStorage.getItem('stickyNotes') || '[]');
let todos = JSON.parse(localStorage.getItem('todos') || '[]');
let editingNoteIdx = null;
const startTime = Date.now();

// ── DOM refs ──
const cmdInput = document.getElementById('cmdInput');
const output = document.getElementById('output');
const acPopup = document.getElementById('autocomplete');
const termBody = document.getElementById('terminalBody');

// ── Random fact ──
document.getElementById('factText').textContent = FACTS[Math.floor(Math.random() * FACTS.length)];

// ── ASCII rain background (toggleable) ──
let asciiRainOn = localStorage.getItem('asciiRain') === 'on';
let asciiRainId = null;
(function initAsciiRain() {
  const canvas = document.getElementById('asciiBg');
  const ctx = canvas.getContext('2d');
  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン<>{}[]|/\\+=_-~`!@#$%^&*';
  let columns, drops;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const fontSize = 14;
    columns = Math.floor(canvas.width / fontSize);
    drops = Array(columns).fill(0).map(() => Math.random() * canvas.height / fontSize);
  }
  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.fillStyle = 'rgba(10, 14, 20, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#7fd962';
    ctx.font = '14px monospace';
    for (let i = 0; i < columns; i++) {
      if (Math.random() > 0.97) {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * 14, drops[i] * 14);
      }
      if (drops[i] * 14 > canvas.height && Math.random() > 0.98) drops[i] = 0;
      drops[i] += 0.3;
    }
    asciiRainId = requestAnimationFrame(draw);
  }

  window.toggleAnimation = function (on) {
    asciiRainOn = on;
    localStorage.setItem('asciiRain', on ? 'on' : 'off');
    if (on) {
      canvas.style.display = 'block';
      if (!asciiRainId) draw();
    } else {
      canvas.style.display = 'none';
      if (asciiRainId) { cancelAnimationFrame(asciiRainId); asciiRainId = null; }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Apply saved state
  if (asciiRainOn) {
    canvas.style.display = 'block';
    draw();
  } else {
    canvas.style.display = 'none';
  }
})();

// ── Clock ──
function updateClock() {
  const now = new Date();
  let h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  document.getElementById('clock').textContent =
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} ${ampm}`;
}
setInterval(updateClock, 1000); updateClock();

// ── Uptime ──
function updateUptime() {
  const diff = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(diff / 60), s = diff % 60;
  document.getElementById('uptime').textContent = `up ${m}m ${s}s`;
}
setInterval(updateUptime, 1000); updateUptime();

// ── Mini Calendar ──
function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calTitle').textContent = `[ ${months[month].toLowerCase()} ${year} ]`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const startOffset = (firstDay + 6) % 7;

  const container = document.getElementById('calDays');
  container.innerHTML = '';

  for (let i = 0; i < startOffset; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    el.textContent = '.';
    container.appendChild(el);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const el = document.createElement('div');
    const dayOfWeek = (startOffset + d - 1) % 7;
    el.className = 'cal-day';
    if (d === today) el.classList.add('today');
    if (dayOfWeek >= 5) el.classList.add('weekend');
    el.textContent = d;
    container.appendChild(el);
  }
}
renderCalendar();

// ── Todo List ──
const todoListEl = document.getElementById('todoList');
const completedListEl = document.getElementById('completedList');
const todoInput = document.getElementById('todoInput');
const todoInputRow = document.getElementById('todoInputRow');
const completedToggle = document.getElementById('completedToggle');
const completedToggleBtn = document.getElementById('completedToggleBtn');
const completedCountEl = document.getElementById('completedCount');
let currentFilter = 'all';
let completedExpanded = false;

function createTodoItem(t, i, isCompleted) {
  const div = document.createElement('div');
  div.className = 'todo-item' + (t.done ? ' done' : '');
  const prioLabel = t.priority === 'high' ? '●' : '○';
  const prioClass = t.priority === 'high' ? 'todo-priority' : 'todo-priority low';
  div.innerHTML = `
    <div class="todo-check">${t.done ? '✓' : ''}</div>
    <span class="${prioClass}">${prioLabel}</span>
    <span class="todo-text">${t.text}</span>
    <span class="todo-delete">✕</span>
  `;
  div.querySelector('.todo-check').addEventListener('click', () => {
    todos[i].done = !todos[i].done;
    saveTodos(); renderTodos();
  });
  div.querySelector('.todo-text').addEventListener('click', () => {
    todos[i].done = !todos[i].done;
    saveTodos(); renderTodos();
  });
  div.querySelector('.todo-delete').addEventListener('click', (e) => {
    e.stopPropagation();
    todos.splice(i, 1);
    saveTodos(); renderTodos();
  });
  return div;
}

function renderTodos() {
  todoListEl.innerHTML = '';
  completedListEl.innerHTML = '';

  const active = [];
  const completed = [];

  todos.forEach((t, i) => {
    if (t.done) { completed.push({ t, i }); }
    else { active.push({ t, i }); }
  });

  // Filter active items
  const filtered = currentFilter === 'all' ? active :
    active.filter(({ t }) => t.priority === currentFilter);

  filtered.forEach(({ t, i }) => {
    todoListEl.appendChild(createTodoItem(t, i, false));
  });

  if (filtered.length === 0 && active.length === 0) {
    todoListEl.innerHTML = '<div style="color:var(--fg2);font-size:10px;padding:4px;">no tasks</div>';
  } else if (filtered.length === 0) {
    todoListEl.innerHTML = '<div style="color:var(--fg2);font-size:10px;padding:4px;">none in this filter</div>';
  }

  // Completed section
  if (completed.length > 0) {
    completedToggle.style.display = 'block';
    completedCountEl.textContent = completed.length;
    completedToggleBtn.textContent = (completedExpanded ? '▾' : '▸') + ` completed (${completed.length})`;

    if (completedExpanded) {
      completedListEl.style.display = 'flex';
      completed.forEach(({ t, i }) => {
        completedListEl.appendChild(createTodoItem(t, i, true));
      });
    } else {
      completedListEl.style.display = 'none';
    }
  } else {
    completedToggle.style.display = 'none';
    completedListEl.style.display = 'none';
  }
}

function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

// Filter buttons
document.querySelectorAll('.todo-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.todo-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodos();
  });
});

// Completed toggle
completedToggle.addEventListener('click', () => {
  completedExpanded = !completedExpanded;
  renderTodos();
});

document.getElementById('addTodoBtn').addEventListener('click', () => {
  todoInputRow.style.display = todoInputRow.style.display === 'none' ? 'block' : 'none';
  if (todoInputRow.style.display === 'block') todoInput.focus();
});

todoInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    let text = todoInput.value.trim();
    if (text) {
      let priority = 'low';
      if (text.startsWith('!')) { priority = 'high'; text = text.slice(1).trim(); }
      todos.push({ text, done: false, priority });
      saveTodos();
      renderTodos();
      todoInput.value = '';
    }
  } else if (e.key === 'Escape') {
    todoInputRow.style.display = 'none';
    cmdInput.focus();
  }
});

renderTodos();

// ── Math evaluation (safe) ──
function tryMath(expr) {
  // Only allow safe math characters: digits, operators, parens, dots, spaces, and math functions
  const sanitized = expr.trim();
  if (!/^[\d\s+\-*/().%^a-z]+$/i.test(sanitized)) return null;

  // Replace common math patterns
  let mathExpr = sanitized
    .replace(/\^/g, '**')                    // ^ → **
    .replace(/\bsqrt\b/g, 'Math.sqrt')
    .replace(/\babs\b/g, 'Math.abs')
    .replace(/\bsin\b/g, 'Math.sin')
    .replace(/\bcos\b/g, 'Math.cos')
    .replace(/\btan\b/g, 'Math.tan')
    .replace(/\blog\b/g, 'Math.log10')
    .replace(/\bln\b/g, 'Math.log')
    .replace(/\bpi\b/gi, 'Math.PI')
    .replace(/\be\b/g, 'Math.E')
    .replace(/\bround\b/g, 'Math.round')
    .replace(/\bfloor\b/g, 'Math.floor')
    .replace(/\bceil\b/g, 'Math.ceil')
    .replace(/\bpow\b/g, 'Math.pow')
    .replace(/\bmin\b/g, 'Math.min')
    .replace(/\bmax\b/g, 'Math.max');

  // Block anything that's not math
  if (/[a-zA-Z]/.test(mathExpr.replace(/Math\.\w+/g, ''))) return null;

  try {
    const fn = new Function('return (' + mathExpr + ')');
    const result = fn();
    if (typeof result === 'number' && isFinite(result)) return result;
    return null;
  } catch { return null; }
}

// ── Output helpers ──
function appendOutput(html, cls = '') {
  const div = document.createElement('div');
  div.className = 'out-line ' + cls;
  div.innerHTML = html;
  output.appendChild(div);
  termBody.scrollTop = termBody.scrollHeight;
}

function echoCmd(cmd) {
  const div = document.createElement('div');
  div.className = 'cmd-echo';
  div.textContent = `$ ${cmd}`;
  output.appendChild(div);
}

// ── Command handler ──
function handleCommand(raw) {
  const cmd = raw.trim();
  if (!cmd) return;
  cmdHistory.unshift(cmd);
  if (cmdHistory.length > 50) cmdHistory.pop();
  localStorage.setItem('cmdHistory', JSON.stringify(cmdHistory));
  historyIdx = -1;

  echoCmd(cmd);

  // "?" as help shortcut
  if (cmd === '?') { showHelp(); return; }

  if (cmd.startsWith('/')) {
    const key = cmd.slice(1).toLowerCase().trim();

    if (key === 'help') { showHelp(); return; }
    if (key === 'clear' || key === 'cls') { output.innerHTML = ''; return; }
    if (key === 'time') { appendOutput(document.getElementById('clock').textContent, 'info'); return; }
    if (key === 'history') { showHistory(); return; }
    if (key === 'game') { appendOutput('🚀 Launching...', 'success'); setTimeout(() => { if (typeof startGame === 'function') startGame(); }, 300); return; }
    if (key === 'animation on') { toggleAnimation(true); appendOutput('█ matrix rain: ON', 'success'); return; }
    if (key === 'animation off') { toggleAnimation(false); appendOutput('░ matrix rain: OFF', 'info'); return; }

    // Config commands (preserve original case for names)
    const origKey = cmd.slice(1).trim();
    if (key === 'config') {
      appendOutput(`  user: <span style="color:var(--accent)">${config.user}</span>`, 'info');
      appendOutput(`  host: <span style="color:var(--accent)">${config.host}</span>`, 'info');
      appendOutput('  <span style="color:var(--fg2)">use /config user &lt;name&gt; or /config host &lt;name&gt; to change</span>', 'info');
      return;
    }
    if (origKey.toLowerCase().startsWith('config user ')) {
      const name = origKey.slice(12).trim();
      if (name) { config.user = name; saveConfig(); appendOutput(`✓ user set to <span style="color:var(--accent)">${name}</span>`, 'success'); }
      return;
    }
    if (origKey.toLowerCase().startsWith('config host ')) {
      const name = origKey.slice(12).trim();
      if (name) { config.host = name; saveConfig(); appendOutput(`✓ host set to <span style="color:var(--accent)">${name}</span>`, 'success'); }
      return;
    }
    if (key === 'config reset') {
      config = { ...DEFAULT_CONFIG }; saveConfig();
      appendOutput('✓ config reset to defaults', 'success');
      return;
    }

    // search: /g <query>
    if (key.startsWith('g ')) {
      const q = key.slice(2).trim();
      appendOutput(`🔍 Searching: "${q}"`, 'success');
      window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      return;
    }

    if (SHORTCUTS[key]) {
      appendOutput(`→ ${SHORTCUTS[key].desc}`, 'success');
      setTimeout(() => { window.location.href = SHORTCUTS[key].url; }, 200);
      return;
    }

    appendOutput(`command not found: /${key}`, 'error');
    return;
  }

  // Try math evaluation
  const mathResult = tryMath(cmd);
  if (mathResult !== null) {
    appendOutput(`= ${mathResult}`, 'info');
    return;
  }

  // bare text → google search
  appendOutput(`🔍 "${cmd}"`, 'success');
  window.location.href = `https://www.google.com/search?q=${encodeURIComponent(cmd)}`;
}

function showHelp() {
  let html = '<div class="help-table">';
  const cmds = [
    ['/yt', 'YouTube'], ['/gpt', 'ChatGPT'], ['/gemini', 'Gemini'],
    ['/github', 'GitHub'], ['/gitam', 'GITAM'], ['/mail', 'Gmail'],
    ['/duo', 'Duolingo'], ['/lc', 'LeetCode'], ['/reddit', 'Reddit'],
    ['/x', 'Twitter/X'], ['/drive', 'Drive'], ['/spotify', 'Spotify'],
    ['/notion', 'Notion'], ['/maps', 'Maps'],
    ['───', '───'],
    ['/g &lt;q&gt;', 'Google search'], ['/clear', 'Clear'],
    ['/history', 'History'], ['/game', 'Rocket game'],
    ['/animation on|off', 'Matrix rain'],
    ['/config', 'Show/edit settings'],
    ['?', 'This help'], ['&lt;math&gt;', 'Calculate'],
  ];
  cmds.forEach(([c, d]) => {
    if (c === '───') { html += '<div class="help-row" style="color:var(--fg2)">────────────────────────</div>'; return; }
    html += `<div class="help-row"><span class="help-cmd">${c}</span><span class="help-desc">${d}</span></div>`;
  });
  html += '</div>';
  appendOutput(html, 'info');
}

function showHistory() {
  if (cmdHistory.length === 0) { appendOutput('No history yet.', 'info'); return; }
  const lines = cmdHistory.slice(0, 15).map((c, i) => `  ${i+1}. ${c}`).join('\n');
  appendOutput(`<pre>${lines}</pre>`, 'info');
}

// ── Input handling ──
cmdInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    hideAc();
    handleCommand(cmdInput.value);
    cmdInput.value = '';
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (acPopup.classList.contains('show')) { moveAc(-1); return; }
    if (historyIdx < cmdHistory.length - 1) { historyIdx++; cmdInput.value = cmdHistory[historyIdx]; }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (acPopup.classList.contains('show')) { moveAc(1); return; }
    if (historyIdx > 0) { historyIdx--; cmdInput.value = cmdHistory[historyIdx]; } else { historyIdx = -1; cmdInput.value = ''; }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const items = acPopup.querySelectorAll('.ac-item');
    if (items.length > 0) {
      const idx = Math.max(activeAcIdx, 0);
      cmdInput.value = '/' + items[idx].dataset.key;
      hideAc();
    }
  } else if (e.key === 'Escape') {
    hideAc();
  }
});

cmdInput.addEventListener('input', () => {
  const val = cmdInput.value;
  if (val.startsWith('/') && val.length > 1) {
    const q = val.slice(1).toLowerCase();
    const matches = Object.entries(SHORTCUTS).filter(([k]) => k.startsWith(q));
    const builtins = ['help','clear','time','date','history'].filter(c => c.startsWith(q)).map(c => [c, {desc:'builtin'}]);
    const all = [...matches, ...builtins];
    if (all.length > 0) { showAc(all); } else { hideAc(); }
  } else { hideAc(); }
});

function showAc(items) {
  activeAcIdx = 0;
  acPopup.innerHTML = items.map(([k, v], i) =>
    `<div class="ac-item ${i===0?'active':''}" data-key="${k}">
      <span>/${k}</span><span class="ac-desc">${v.desc}</span>
    </div>`
  ).join('');
  acPopup.classList.add('show');
  acPopup.querySelectorAll('.ac-item').forEach(el => {
    el.addEventListener('click', () => {
      cmdInput.value = '/' + el.dataset.key;
      hideAc();
      cmdInput.focus();
    });
  });
}

function hideAc() { acPopup.classList.remove('show'); activeAcIdx = -1; }

function moveAc(dir) {
  const items = acPopup.querySelectorAll('.ac-item');
  if (!items.length) return;
  items[Math.max(activeAcIdx,0)].classList.remove('active');
  activeAcIdx = (activeAcIdx + dir + items.length) % items.length;
  items[activeAcIdx].classList.add('active');
}

// ── Sticky Notes ──
const notesContainer = document.getElementById('notesContainer');
const noteModal = document.getElementById('noteModal');
const noteEditor = document.getElementById('noteEditor');

function renderMarkdown(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\n/g, '<br>');
}

function renderNotes() {
  if (notes.length === 0) {
    notesContainer.innerHTML = '<div style="color:var(--fg2);font-size:12px;padding:8px;">No notes. Click + to add.</div>';
    return;
  }
  notesContainer.innerHTML = notes.map((n, i) =>
    `<div class="note-card" data-idx="${i}">${renderMarkdown(n)}</div>`
  ).join('');
  notesContainer.querySelectorAll('.note-card').forEach(el => {
    el.addEventListener('click', () => openEditor(parseInt(el.dataset.idx)));
  });
}

function openEditor(idx) {
  editingNoteIdx = idx;
  noteEditor.value = idx !== null ? notes[idx] : '';
  document.getElementById('deleteNoteBtn').style.display = idx !== null ? 'block' : 'none';
  noteModal.classList.add('show');
  noteEditor.focus();
}

document.getElementById('addNoteBtn').addEventListener('click', () => openEditor(null));

document.getElementById('saveNoteBtn').addEventListener('click', () => {
  const text = noteEditor.value.trim();
  if (!text) return;
  if (editingNoteIdx !== null) { notes[editingNoteIdx] = text; } else { notes.push(text); }
  localStorage.setItem('stickyNotes', JSON.stringify(notes));
  renderNotes();
  noteModal.classList.remove('show');
});

document.getElementById('deleteNoteBtn').addEventListener('click', () => {
  if (editingNoteIdx !== null) {
    notes.splice(editingNoteIdx, 1);
    localStorage.setItem('stickyNotes', JSON.stringify(notes));
    renderNotes();
  }
  noteModal.classList.remove('show');
});

document.getElementById('modalClose').addEventListener('click', () => noteModal.classList.remove('show'));
noteModal.addEventListener('click', e => { if (e.target === noteModal) noteModal.classList.remove('show'); });

renderNotes();

// ── Focus input on any key ──
document.addEventListener('keydown', e => {
  if (e.target === noteEditor || e.target === todoInput) return;
  if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) cmdInput.focus();
});

// ── Add sample notes if first visit ──
if (!localStorage.getItem('stickyNotes')) {
  notes = [
    '# Welcome!\nYour **sticky notes** live here.\n- Click to edit\n- Supports `markdown`',
    '## Quick Links\n- [GITAM](https://login.gitam.edu)\n- [LeetCode](https://leetcode.com)',
  ];
  localStorage.setItem('stickyNotes', JSON.stringify(notes));
  renderNotes();
}
