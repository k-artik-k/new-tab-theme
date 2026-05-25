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
    let h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    dom.clock.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} ${ampm}`;
    if (dom.analogHour && dom.analogMinute && dom.analogSecond) {
      const hourAngle = ((h % 12) + m / 60) * 30;
      const minuteAngle = (m + s / 60) * 6;
      const secondAngle = s * 6;
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
      window.location.assign(url);
    }, 160);
  }

  function initCore() {
    updateClock();
    updateUptime();
    renderCalendar();
    setInterval(updateClock, 1000);
    setInterval(updateUptime, 1000);

    // ALT key blur reveal
    document.addEventListener('keydown', e => {
      if (e.key === 'Alt') document.body.classList.add('alt-reveal');
    });
    document.addEventListener('keyup', e => {
      if (e.key === 'Alt') document.body.classList.remove('alt-reveal');
    });

    // Konami code detector
    const konamiSeq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let konamiIdx = 0;
    document.addEventListener('keydown', e => {
      if (e.key === konamiSeq[konamiIdx] || e.key.toLowerCase() === konamiSeq[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === konamiSeq.length) {
          konamiIdx = 0;
          triggerKonami();
        }
      } else {
        konamiIdx = 0;
      }
    });
  }

  function triggerKonami() {
    appendOutput('★ 30 extra lives granted ★', 'success');
    // Brief rainbow accent cycle
    const colors = ['#ff0000','#ff8800','#ffff00','#00ff00','#0088ff','#8800ff','#ff00ff'];
    let i = 0;
    const originalAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    const interval = setInterval(() => {
      document.documentElement.style.setProperty('--accent', colors[i % colors.length]);
      i++;
      if (i >= colors.length * 2) {
        clearInterval(interval);
        document.documentElement.style.setProperty('--accent', originalAccent);
      }
    }, 150);
  }

  /* ── 3D Parallax ── */
  let parallax3dActive = false;
  let parallaxRAF = null;

  const P3D_LAYERS = [
    { sel: '.top-bar', depth: 0.4 },
    { sel: '.terminal-window', depth: 1.0 },
    { sel: '.todo-panel', depth: 1.4 },
    { sel: '.sticky-panel', depth: 1.6 },
    { sel: '.pomodoro-standalone', depth: 0.8 },
    { sel: '.fact-bar', depth: 0.3 },
    { sel: '.calendar-panel', depth: 1.2 },
    { sel: '.analog-clock', depth: 1.1 },
  ];

  function toggle3D(enabled) {
    parallax3dActive = enabled;
    if (enabled) {
      document.body.classList.add('parallax-3d');
      // Tag static elements
      P3D_LAYERS.forEach(({ sel, depth }) => {
        const el = document.querySelector(sel);
        if (el) { el.classList.add('p3d-target'); el.dataset.p3dDepth = depth; }
      });
      // Tag all floating notes
      document.querySelectorAll('.floating-note').forEach((el, i) => {
        el.classList.add('p3d-target');
        el.dataset.p3dDepth = 1.8 + i * 0.15;
      });
      document.addEventListener('mousemove', onParallaxMove);
    } else {
      document.body.classList.remove('parallax-3d');
      document.removeEventListener('mousemove', onParallaxMove);
      document.querySelectorAll('.p3d-target').forEach(el => {
        el.style.transform = '';
        el.style.boxShadow = '';
        el.classList.remove('p3d-target');
        delete el.dataset.p3dDepth;
      });
    }
  }

  function onParallaxMove(e) {
    if (parallaxRAF) return;
    parallaxRAF = requestAnimationFrame(() => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      document.querySelectorAll('.p3d-target').forEach(el => {
        const d = parseFloat(el.dataset.p3dDepth || '1');
        const tx = dx * 8 * d;
        const ty = dy * 6 * d;
        const tz = 10 + 8 * d;
        const rx = -dy * 2.5 * d;
        const ry = dx * 2.5 * d;
        const sx = 4 + dx * 6 * d;
        const sy = 4 + dy * 6 * d;
        el.style.transform = `perspective(600px) translate3d(${tx}px, ${ty}px, ${tz}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
        el.style.boxShadow = `${-sx}px ${-sy}px ${12 + 6 * d}px rgba(0,0,0,${0.25 + d * 0.06})`;
      });
      parallaxRAF = null;
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
    toggle3D,
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
