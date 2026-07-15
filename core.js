(function () {
  const root = window.TabOS = window.TabOS || {};
  const storage = root.storage;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}-${m}-${y}`;
  }

  function parseDateValue(value) {
    const v = String(value || '').toLowerCase();
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (v === 'today') return formatDate(d);
    if (v === 'tomorrow') {
      d.setDate(d.getDate() + 1);
      return formatDate(d);
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(v)) return v;
    return null;
  }

  function parseLocalDate(value) {
    if (!value) return null;
    const [d, m, y] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function parseExpr(str) {
    let pos = 0;
    function peek() {
      while (pos < str.length && /\s/.test(str[pos])) pos++;
      return str[pos] || '';
    }
    function parsePrimary() {
      peek();
      if (str[pos] === '(') {
        pos++;
        const v = parseAddSub();
        peek();
        if (str[pos] === ')') pos++; else throw new Error(')');
        return v;
      }
      const match = str.slice(pos).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) throw new Error('num');
      pos += match[0].length;
      return Number(match[0]);
    }
    function parseUnary() {
      peek();
      if (str[pos] === '-') { pos++; return -parseUnary(); }
      if (str[pos] === '+') { pos++; return parseUnary(); }
      return parsePow();
    }
    function parsePow() {
      let b = parsePrimary();
      peek();
      if (pos + 1 < str.length && str[pos] === '*' && str[pos + 1] === '*') {
        pos += 2;
        const exp = parseUnary();
        if (Math.abs(b) > 1 && Math.abs(exp) > 300) return Infinity;
        b = b ** exp;
      }
      return b;
    }
    function parseMulDiv() {
      let l = parseUnary();
      while (true) {
        peek();
        if (str[pos] === '*' && str[pos + 1] !== '*') { pos++; l *= parseUnary(); }
        else if (str[pos] === '/') { pos++; l /= parseUnary(); }
        else if (str[pos] === '%') { pos++; l %= parseUnary(); }
        else break;
      }
      return l;
    }
    function parseAddSub() {
      let l = parseMulDiv();
      while (true) {
        peek();
        if (str[pos] === '+') { pos++; l += parseMulDiv(); }
        else if (str[pos] === '-') { pos++; l -= parseMulDiv(); }
        else break;
      }
      return l;
    }
    const r = parseAddSub();
    peek();
    if (pos < str.length) throw new Error('end');
    return r;
  }

  function tryMath(expr) {
    const s = expr.trim();
    if (!s || s.startsWith('/')) return null;
    if (!/^[\d\s+\-*/().%^]+$/.test(s)) return null;
    if (!/[+\-*/%^]/.test(s)) return null;
    try {
      const result = parseExpr(s.replace(/\^/g, '**'));
      return typeof result === 'number' && isFinite(result) ? result : null;
    } catch {
      return null;
    }
  }

  const dom = {
    cmdInput: document.getElementById('cmdInput'),
    output: document.getElementById('output'),
    autocomplete: document.getElementById('autocomplete'),
    terminalBody: document.getElementById('terminalBody'),
    clock: document.getElementById('clock'),
    analogHour: document.getElementById('analogHour'),
    analogMinute: document.getElementById('analogMinute'),
    analogSecond: document.getElementById('analogSecond'),
    uptime: document.getElementById('uptime'),
    calendarTitle: document.getElementById('calTitle'),
    calendarDays: document.getElementById('calDays'),
  };

  const state = {
    startTime: Date.now(),
    history: storage.getJson(storage.keys.history, []),
    historyIndex: -1,
    activeCompletion: -1,
  };

  function appendOutput(html, cls = '') {
    const div = document.createElement('div');
    div.className = `out-line ${cls}`;
    div.innerHTML = html;
    dom.output.appendChild(div);
    dom.terminalBody.scrollTop = dom.terminalBody.scrollHeight;
  }

  function echoCommand(command) {
    const div = document.createElement('div');
    div.className = 'cmd-echo';
    div.textContent = `$ ${command}`;
    dom.output.appendChild(div);
  }

  function saveHistory(command) {
    state.history.unshift(command);
    if (state.history.length > 80) state.history.pop();
    storage.setJson(storage.keys.history, state.history);
    state.historyIndex = -1;
  }

  function updateClock() {
    const now = new Date();
    const rawH = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ampm = rawH >= 12 ? 'PM' : 'AM';
    const h12 = rawH % 12 || 12;
    dom.clock.textContent = `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ampm}`;
    if (dom.analogHour && dom.analogMinute && dom.analogSecond) {
      const hourAngle = ((rawH % 12) + m / 60) * 30;
      const minuteAngle = (m + s / 60) * 6;
      const ms = now.getMilliseconds();
      const secondAngle = (s + ms / 1000) * 6;
      dom.analogHour.style.transform = `translateX(-50%) rotate(${hourAngle}deg)`;
      dom.analogMinute.style.transform = `translateX(-50%) rotate(${minuteAngle}deg)`;
      dom.analogSecond.style.transform = `translateX(-50%) rotate(${secondAngle}deg)`;
    }
  }

  function updateUptime() {
    const diff = Math.floor((Date.now() - state.startTime) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    dom.uptime.textContent = `up ${m}m ${s}s`;
  }

  let cachedTodoVersion = null;
  let cachedDueDates = {};

  function getDueDates() {
    if (!root.todo || !root.todo.all) {
      cachedTodoVersion = null;
      cachedDueDates = {};
      return cachedDueDates;
    }
    const version = root.todo.version ? root.todo.version() : null;
    if (version !== null && version === cachedTodoVersion) return cachedDueDates;
    const dueDates = {};
    root.todo.all().forEach(todo => {
      if (todo.due && !todo.done) {
        dueDates[todo.due] = dueDates[todo.due] || [];
        dueDates[todo.due].push(todo.text);
      }
    });
    cachedTodoVersion = version;
    cachedDueDates = dueDates;
    return cachedDueDates;
  }

  function renderCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    dom.calendarTitle.textContent = `[ ${months[month].toLowerCase()} ${year} ]`;
    dom.calendarDays.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay + 6) % 7;
    const today = now.getDate();

    const dueDates = getDueDates();

    for (let i = 0; i < startOffset; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day empty';
      el.textContent = '.';
      dom.calendarDays.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const el = document.createElement('div');
      const dayOfWeek = (startOffset + d - 1) % 7;
      el.className = 'cal-day';
      if (d === today) el.classList.add('today');
      if (dayOfWeek >= 5) el.classList.add('weekend');

      const dateStr = formatDate(new Date(year, month, d));
      if (dueDates[dateStr]) {
        el.classList.add('has-due');
        el.title = dueDates[dateStr].join(', ');
        el.addEventListener('click', () => {
          const tasks = dueDates[dateStr].map(t => `\u2022 ${t}`).join('\n');
          appendOutput(`<pre>due ${escapeHtml(dateStr)}:\n${escapeHtml(tasks)}</pre>`, 'info');
        });
      }
      el.textContent = d;
      dom.calendarDays.appendChild(el);
    }
  }

  function routeTo(url, message) {
    if (!/^https?:\/\//i.test(url)) {
      appendOutput('blocked: unsafe URL scheme.', 'error');
      return;
    }
    appendOutput(escapeHtml(message), 'success');
    setTimeout(() => {
      window.location.assign(url);
    }, 160);
  }

  let clockInterval = null;
  let uptimeInterval = null;

  function startCoreIntervals() {
    clearInterval(clockInterval);
    clearInterval(uptimeInterval);
    clockInterval = setInterval(updateClock, 1000);
    uptimeInterval = setInterval(updateUptime, 1000);
  }

  function initCore() {
    updateClock();
    updateUptime();
    renderCalendar();
    startCoreIntervals();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearInterval(clockInterval);
        clearInterval(uptimeInterval);
      } else {
        updateClock();
        updateUptime();
        renderCalendar();
        startCoreIntervals();
      }
    });

    // ALT key blur reveal
    document.addEventListener('keydown', e => {
      if (e.key === 'Alt') document.body.classList.add('alt-reveal');
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'Alt') document.body.classList.remove('alt-reveal');
    });
  }


  root.core = {
    dom,
    state,
    init: initCore,
    appendOutput,
    echoCommand,
    saveHistory,
    updateClock,
    updateUptime,
    renderCalendar,
    routeTo,
  };

  root.utils = {
    clamp,
    escapeHtml,
    formatDate,
    parseDateValue,
    parseLocalDate,
    pick,
    tryMath,
  };
})();
