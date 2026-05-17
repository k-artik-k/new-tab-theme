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
    return `${y}-${m}-${d}`;
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    return null;
  }

  function parseLocalDate(value) {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function tryMath(expr) {
    const s = expr.trim();
    if (!s || s.startsWith('/')) return null;
    if (!/^[\d(.\-]/.test(s) && !/^(sqrt|abs|sin|cos|tan|log|ln|pi|pow|min|max|round|floor|ceil)/i.test(s)) return null;
    if (!/^[\d\s+\-*/().%^,a-z]+$/i.test(s)) return null;
    let m = s
      .replace(/\^/g, '**')
      .replace(/\bsqrt\b/gi, 'Math.sqrt')
      .replace(/\babs\b/gi, 'Math.abs')
      .replace(/\bsin\b/gi, 'Math.sin')
      .replace(/\bcos\b/gi, 'Math.cos')
      .replace(/\btan\b/gi, 'Math.tan')
      .replace(/\blog\b/gi, 'Math.log10')
      .replace(/\bln\b/gi, 'Math.log')
      .replace(/\bpi\b/gi, 'Math.PI')
      .replace(/\bround\b/gi, 'Math.round')
      .replace(/\bfloor\b/gi, 'Math.floor')
      .replace(/\bceil\b/gi, 'Math.ceil')
      .replace(/\bpow\b/gi, 'Math.pow')
      .replace(/\bmin\b/gi, 'Math.min')
      .replace(/\bmax\b/gi, 'Math.max');
    m = m.replace(/(^|[+\-*/(%,\s])e($|[+\-*/%).,\s])/gi, '$1Math.E$2');
    if (/[a-zA-Z]/.test(m.replace(/Math\.\w+/g, ''))) return null;
    try {
      const result = new Function(`return (${m})`)();
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
    let h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    dom.clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ampm}`;
  }

  function updateUptime() {
    const diff = Math.floor((Date.now() - state.startTime) / 1000);
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    dom.uptime.textContent = `up ${m}m ${s}s`;
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
      el.textContent = d;
      dom.calendarDays.appendChild(el);
    }
  }

  function routeTo(url, message) {
    appendOutput(escapeHtml(message), 'success');
    setTimeout(() => {
      window.location.href = url;
    }, 160);
  }

  function initCore() {
    updateClock();
    updateUptime();
    renderCalendar();
    setInterval(updateClock, 1000);
    setInterval(updateUptime, 1000);
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
