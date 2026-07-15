(function () {
  const root = window.TabOS = window.TabOS || {};
  const storage = root.storage;
  const { clamp, escapeHtml, formatDate, parseDateValue, parseLocalDate } = root.utils;
  const { appendOutput } = root.core;

  const els = {
    list: document.getElementById('todoList'),
    completedList: document.getElementById('completedList'),
    input: document.getElementById('todoInput'),
    inputRow: document.getElementById('todoInputRow'),
    add: document.getElementById('addTodoBtn'),
    completedToggle: document.getElementById('completedToggle'),
    completedToggleBtn: document.getElementById('completedToggleBtn'),
    completedCount: document.getElementById('completedCount'),
    pomodoroPanel: document.getElementById('pomodoroPanel'),
    pomodoroLabel: document.getElementById('pomodoroLabel'),
    pomodoroStart: document.getElementById('pomodoroStartBtn'),
    pomodoroStop: document.getElementById('pomodoroStopBtn'),
  };

  let todos = storage.getJson(storage.keys.todos, []).map(normalizeTodo);
  let filter = 'all';
  let completedExpanded = false;
  let draggedIndex = null;
  let pomodoro = storage.loadPomodoro();
  let todoVersion = 0;
  let pomodoroInterval = null;

  function makeId() {
    return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  }

  function normalizeTodo(todo) {
    const next = {
      id: todo.id || makeId(),
      text: String(todo.text || '').trim() || 'untitled task',
      done: !!todo.done,
      priority: todo.priority === 'high' ? 'high' : 'low',
      due: todo.due || null,
      recur: todo.recur || 'none',
      progress: clamp(todo.progress === undefined ? (todo.done ? 100 : 0) : todo.progress, 0, 100),
      createdAt: todo.createdAt || Date.now(),
    };
    if (!['none', 'daily', 'weekly', 'monthly'].includes(next.recur)) next.recur = 'none';
    return next;
  }

  let calTimer = null;
  function saveTodos() {
    storage.setJson(storage.keys.todos, todos);
    todoVersion++;
    clearTimeout(calTimer);
    calTimer = setTimeout(() => {
      if (root.core && root.core.renderCalendar) root.core.renderCalendar();
    }, 300);
  }

  function parseTodoInput(raw) {
    let text = raw.trim();
    let priority = 'low';
    let due = null;
    let recur = 'none';
    let progress = 0;

    // Check for standalone ! anywhere (including start)
    if (/(^|\s)!(?=\s|$)/.test(text)) priority = 'high';
    text = text.replace(/(^|\s)!(?=\s|$)/g, ' ');
    text = text.replace(/\bpriority:(high|low)\b/gi, (_, p) => {
      priority = p.toLowerCase();
      return '';
    });
    text = text.replace(/\bdue:([0-9]{2}-[0-9]{2}-[0-9]{4}|today|tomorrow)\b/gi, (_, d) => {
      due = parseDateValue(d);
      return '';
    });
    text = text.replace(/\brecur:(daily|weekly|monthly|none)\b/gi, (_, r) => {
      recur = r.toLowerCase();
      return '';
    });
    text = text.replace(/\b([0-9]{1,3})%\b/g, (_, p) => {
      progress = clamp(p, 0, 100);
      return '';
    });

    return { text: text.replace(/\s+/g, ' ').trim(), priority, due, recur, progress };
  }

  function add(raw) {
    const parsed = parseTodoInput(raw);
    if (!parsed.text) return null;
    const todo = normalizeTodo(parsed);
    todos.push(todo);
    saveTodos();
    render();
    return todo;
  }

  function nextRecurringDue(todo) {
    const base = parseLocalDate(todo.due) || new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = base < today ? today : base;
    if (todo.recur === 'daily') d.setDate(d.getDate() + 1);
    if (todo.recur === 'weekly') d.setDate(d.getDate() + 7);
    if (todo.recur === 'monthly') d.setMonth(d.getMonth() + 1);
    return formatDate(d);
  }

  function toggle(index) {
    const todo = todos[index];
    if (!todo) return;
    if (!todo.done && todo.recur !== 'none') {
      todo.due = nextRecurringDue(todo);
      todo.progress = 0;
      todo.done = false;
    } else {
      todo.done = !todo.done;
      todo.progress = todo.done ? 100 : Math.min(todo.progress, 90);
    }
    saveTodos();
    render();
  }

  function reorder(from, to) {
    if (from === to || from < 0 || to < 0 || from >= todos.length || to >= todos.length) return;
    const [moved] = todos.splice(from, 1);
    todos.splice(to, 0, moved);
    saveTodos();
    render();
  }

  function dueClass(due) {
    const date = parseLocalDate(due);
    if (!date) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((date - today) / 86400000);
    if (days < 0) return 'overdue';
    if (days <= 1) return 'due-soon';
    return '';
  }

  function createItem(todo, index) {
    const div = document.createElement('div');
    div.className = `todo-item${todo.done ? ' done' : ''}`;
    div.draggable = true;
    div.dataset.index = index;

    const check = document.createElement('div');
    check.className = 'todo-check';
    check.textContent = todo.done ? 'x' : '';

    const priority = document.createElement('span');
    priority.className = todo.priority === 'high' ? 'todo-priority' : 'todo-priority low';
    priority.textContent = todo.priority === 'high' ? '!' : '-';

    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text;

    const del = document.createElement('span');
    del.className = 'todo-delete';
    del.textContent = 'x';

    // Use createElement instead of innerHTML to prevent XSS
    const details = document.createElement('div');
    details.className = 'todo-details';
    function addDetail(parent, text, cls) {
      const s = document.createElement('span');
      if (cls) s.className = cls;
      s.textContent = text;
      parent.appendChild(s);
    }
    addDetail(details, `#${index + 1}`);
    if (todo.due) addDetail(details, `due ${todo.due}`, `todo-due ${dueClass(todo.due)}`);
    if (todo.recur !== 'none') addDetail(details, `recur ${todo.recur}`);
    addDetail(details, `${todo.progress}%`);

    const progress = document.createElement('div');
    progress.className = 'todo-progress';
    const fill = document.createElement('div');
    fill.className = 'todo-progress-fill';
    fill.style.width = `${todo.progress}%`;
    progress.appendChild(fill);

    div.append(check, priority, text, del, details, progress);

    check.addEventListener('click', e => {
      e.stopPropagation();
      toggle(index);
    });
    text.addEventListener('click', () => toggle(index));
    del.addEventListener('click', e => {
      e.stopPropagation();
      todos.splice(index, 1);
      saveTodos();
      render();
    });
    div.addEventListener('dragstart', e => {
      draggedIndex = index;
      div.classList.add('dragging');
      e.dataTransfer.setData('text/plain', String(index));
    });
    div.addEventListener('dragend', () => {
      draggedIndex = null;
      div.classList.remove('dragging');
    });
    div.addEventListener('dragover', e => e.preventDefault());
    div.addEventListener('drop', e => {
      e.preventDefault();
      const raw = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (!isNaN(raw) && raw >= 0 && raw < todos.length) reorder(raw, index);
    });
    return div;
  }

  function render() {
    els.list.innerHTML = '';
    els.completedList.innerHTML = '';

    const active = [];
    const completed = [];
    todos.forEach((todo, index) => {
      if (todo.done) completed.push({ todo, index });
      else active.push({ todo, index });
    });
    const filtered = filter === 'all' ? active : active.filter(({ todo }) => todo.priority === filter);
    filtered.forEach(({ todo, index }) => els.list.appendChild(createItem(todo, index)));
    if (!filtered.length && !active.length) els.list.innerHTML = '<div style="color:var(--fg2);font-size:10px;padding:8px 4px;opacity:0.6">no tasks \u00b7 try /todo add "..."</div>';
    else if (!filtered.length) els.list.innerHTML = '<div style="color:var(--fg2);font-size:10px;padding:4px;">none in this filter</div>';

    if (completed.length) {
      els.completedToggle.style.display = 'block';
      els.completedCount.textContent = completed.length;
      els.completedToggleBtn.textContent = `${completedExpanded ? 'v' : '>'} completed (${completed.length})`;
      if (completedExpanded) {
        els.completedList.style.display = 'flex';
        completed.forEach(({ todo, index }) => els.completedList.appendChild(createItem(todo, index)));
      } else {
        els.completedList.style.display = 'none';
      }
    } else {
      els.completedToggle.style.display = 'none';
      els.completedList.style.display = 'none';
    }
  }

  function byId(id) {
    const normalized = String(id || '').replace(/^#/, '');
    const stableIndex = todos.findIndex(todo => todo.id === normalized);
    if (stableIndex >= 0) return { todo: todos[stableIndex], index: stableIndex };
    const index = Number(id) - 1;
    return { todo: todos[index], index };
  }

  function line(todo, index) {
    const done = todo.done ? 'x' : ' ';
    const due = todo.due ? ` due:${todo.due}` : '';
    const recur = todo.recur !== 'none' ? ` recur:${todo.recur}` : '';
    return `${index + 1}. [${done}] ${todo.priority === 'high' ? '!' : '-'} ${todo.text} ${todo.progress}%${due}${recur}`;
  }

  function handle(words, original) {
    const sub = words[1] || 'list';
    if (sub === 'list' || sub === 'ls') {
      const mode = words[2] || 'active';
      let list = todos.map((todo, index) => ({ todo, index }));
      if (mode === 'active') list = list.filter(({ todo }) => !todo.done);
      if (mode === 'done') list = list.filter(({ todo }) => todo.done);
      if (mode === 'high' || mode === 'low') list = list.filter(({ todo }) => todo.priority === mode);
      if (!list.length) {
        appendOutput('no tasks in this view.', 'info');
        return;
      }
      appendOutput(`<pre>${escapeHtml(list.map(({ todo, index }) => line(todo, index)).join('\n'))}</pre>`, 'info');
      return;
    }
    if (sub === 'add') {
      const text = original.slice(original.toLowerCase().indexOf('add') + 3).trim();
      const todo = add(text);
      if (!todo) appendOutput('usage: /todo add <task> [!] [due:DD-MM-YYYY] [recur:daily] [50%]', 'error');
      else appendOutput(`task added: ${escapeHtml(todo.text)}`, 'success');
      return;
    }
    if (sub === 'done' || sub === 'complete' || sub === 'toggle') {
      const { todo, index } = byId(words[2]);
      if (!todo) return appendOutput('usage: /todo done <id>', 'error');
      toggle(index);
      appendOutput(`task updated: #${index + 1}`, 'success');
      return;
    }
    if (sub === 'delete' || sub === 'rm' || sub === 'remove') {
      const { todo, index } = byId(words[2]);
      if (!todo) return appendOutput('usage: /todo delete <id>', 'error');
      todos.splice(index, 1);
      saveTodos();
      render();
      appendOutput(`task deleted: #${index + 1}`, 'success');
      return;
    }
    if (sub === 'move') {
      const from = Number(words[2]) - 1;
      const to = Number(words[3]) - 1;
      if (!Number.isInteger(from) || !Number.isInteger(to)) return appendOutput('usage: /todo move <from-id> <to-id>', 'error');
      reorder(from, to);
      appendOutput(`task moved: ${from + 1} -> ${to + 1}`, 'success');
      return;
    }
    if (sub === 'due') {
      const { todo, index } = byId(words[2]);
      if (!todo) return appendOutput('usage: /todo due <id> <DD-MM-YYYY|today|tomorrow|clear>', 'error');
      const next = words[3] === 'clear' ? null : parseDateValue(words[3]);
      if (words[3] !== 'clear' && !next) return appendOutput('invalid due date.', 'error');
      todo.due = next;
      saveTodos();
      render();
      appendOutput(`task due updated: #${index + 1}`, 'success');
      return;
    }
    if (sub === 'recur') {
      const { todo, index } = byId(words[2]);
      const recur = words[3];
      if (!todo || !['none', 'daily', 'weekly', 'monthly'].includes(recur)) return appendOutput('usage: /todo recur <id> none|daily|weekly|monthly', 'error');
      todo.recur = recur;
      saveTodos();
      render();
      appendOutput(`task recurrence updated: #${index + 1}`, 'success');
      return;
    }
    if (sub === 'progress') {
      const { todo, index } = byId(words[2]);
      if (!todo) return appendOutput('usage: /todo progress <id> <0-100>', 'error');
      todo.progress = clamp(words[3], 0, 100);
      todo.done = todo.progress >= 100;
      saveTodos();
      render();
      appendOutput(`task progress: #${index + 1} ${todo.progress}%`, 'success');
      return;
    }
    if (sub === 'clear-done') {
      todos = todos.filter(t => !t.done);
      saveTodos();
      render();
      appendOutput('completed tasks cleared.', 'success');
      return;
    }
    appendOutput('usage: /todo list|add|done|delete|move|due|recur|progress|clear-done', 'error');
  }

  function savePomodoro() {
    storage.savePomodoro(pomodoro);
  }

  function remaining() {
    if (!pomodoro.running) return Math.max(0, pomodoro.remaining);
    return Math.max(0, Math.ceil((pomodoro.endAt - Date.now()) / 1000));
  }

  function renderPomodoro() {
    const left = remaining();
    const m = Math.floor(left / 60);
    const s = left % 60;
    els.pomodoroLabel.textContent = `focus ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    els.pomodoroPanel.classList.toggle('running', pomodoro.running);
    els.pomodoroStart.textContent = pomodoro.running ? 'pause' : 'start';
  }

  function startPomodoro(minutes) {
    if (minutes !== undefined && !Number.isNaN(Number(minutes))) {
      pomodoro.duration = clamp(Number(minutes), 1, 180) * 60;
      pomodoro.remaining = pomodoro.duration;
    }
    const left = remaining() || pomodoro.duration;
    pomodoro.running = true;
    pomodoro.remaining = left;
    pomodoro.endAt = Date.now() + left * 1000;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    savePomodoro();
    renderPomodoro();
  }

  function pausePomodoro() {
    pomodoro.remaining = remaining();
    pomodoro.running = false;
    pomodoro.endAt = null;
    savePomodoro();
    renderPomodoro();
  }

  function stopPomodoro() {
    pomodoro.running = false;
    pomodoro.remaining = pomodoro.duration;
    pomodoro.endAt = null;
    savePomodoro();
    renderPomodoro();
  }

  function tickPomodoro() {
    if (pomodoro.running) {
      pomodoro.remaining = remaining();
      if (pomodoro.remaining <= 0) {
        pomodoro.running = false;
        pomodoro.remaining = pomodoro.duration;
        pomodoro.endAt = null;
        savePomodoro();
        appendOutput('pomodoro complete. take a clean break.', 'success');
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('Pomodoro Complete', { body: 'Time for a break!', icon: 'icons/ter.png' });
        }
      }
    }
    renderPomodoro();
  }

  function startPomodoroInterval() {
    clearInterval(pomodoroInterval);
    pomodoroInterval = setInterval(tickPomodoro, 1000);
  }

  function handlePomodoro(words) {
    const sub = words[1] || 'status';
    if (sub === 'start') {
      startPomodoro(words[2]);
      appendOutput('pomodoro started.', 'success');
      return;
    }
    if (sub === 'pause') {
      pausePomodoro();
      appendOutput('pomodoro paused.', 'info');
      return;
    }
    if (sub === 'stop' || sub === 'reset') {
      stopPomodoro();
      appendOutput('pomodoro stopped.', 'info');
      return;
    }
    if (sub === 'status') {
      const left = remaining();
      appendOutput(`pomodoro ${pomodoro.running ? 'running' : 'idle'}: ${Math.floor(left / 60)}m ${left % 60}s`, 'info');
      return;
    }
    appendOutput('usage: /pomodoro start [minutes], /pomodoro pause, /pomodoro stop, /pomodoro status', 'error');
  }

  function init() {
    if (pomodoro.running && remaining() <= 0) stopPomodoro();
    const raw = storage.getJson(storage.keys.todos, []);
    if (JSON.stringify(todos) !== JSON.stringify(raw)) saveTodos();
    render();
    renderPomodoro();
    startPomodoroInterval();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearInterval(pomodoroInterval);
      } else {
        if (pomodoro.running) {
          const left = remaining();
          if (left < 0 || left > pomodoro.duration) {
            stopPomodoro();
            appendOutput('pomodoro reset: clock change detected.', 'info');
          }
        }
        tickPomodoro();
        startPomodoroInterval();
      }
    });

    document.querySelectorAll('.todo-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.todo-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filter = btn.dataset.filter;
        render();
      });
    });
    els.completedToggle.addEventListener('click', () => {
      completedExpanded = !completedExpanded;
      render();
    });
    els.add.addEventListener('click', () => {
      els.inputRow.style.display = els.inputRow.style.display === 'none' ? 'block' : 'none';
      if (els.inputRow.style.display === 'block') els.input.focus();
    });
    els.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const todo = add(els.input.value);
        if (todo) els.input.value = '';
      } else if (e.key === 'Escape') {
        els.inputRow.style.display = 'none';
        root.core.dom.cmdInput.focus();
      }
    });
    els.pomodoroStart.addEventListener('click', () => {
      if (pomodoro.running) pausePomodoro();
      else startPomodoro();
    });
    els.pomodoroStop.addEventListener('click', stopPomodoro);
  }

  root.todo = {
    init,
    handle,
    handlePomodoro,
    add,
    stats: () => ({ active: todos.filter(t => !t.done).length, total: todos.length }),
    all: () => todos.slice(),
    version: () => todoVersion,
  };
})();
