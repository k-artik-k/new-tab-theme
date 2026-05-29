/* ═══════════════════════════════════════════════════════════════
   Windows 7 Desktop Environment for TabOS
   Complete UI clone: desktop, taskbar, start menu, windows, apps
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const root = window.TabOS = window.TabOS || {};
  let initialized = false, visible = false;
  let desktop, taskbar, startMenu, ctxMenu, windowsArea;
  let wins = [], activeWin = null, zIdx = 100;
  let startOpen = false, dragState = null, resizeState = null;
  let clockIv = null;

  /* ── Icon data ── */
  const ICONS = {
    computer:'💻', recycle:'🗑️', cmd:'⬛', notepad:'📝',
    calc:'🔢', control:'⚙️', calendar:'📅', sticky:'📋',
    taskmgr:'📊', ie:'🌐', folder:'📁', paint:'🎨',
  };

  const DESKTOP_ICONS = [
    { id:'computer', label:'Computer' },
    { id:'recycle', label:'Recycle Bin' },
    { id:'cmd', label:'Command\nPrompt' },
    { id:'notepad', label:'Notepad' },
    { id:'calc', label:'Calculator' },
    { id:'ie', label:'Internet\nExplorer' },
  ];

  const START_PINNED = [
    { id:'cmd', label:'Command Prompt' },
    { id:'notepad', label:'Notepad' },
    { id:'calc', label:'Calculator' },
    { id:'calendar', label:'Calendar' },
    { id:'sticky', label:'Sticky Notes' },
    { id:'paint', label:'Paint' },
    { id:'taskmgr', label:'Task Manager' },
    { id:'control', label:'Control Panel' },
  ];

  const START_RIGHT = [
    { label:'Documents', icon:'📄' },
    { label:'Pictures', icon:'🖼️' },
    { label:'Music', icon:'🎵' },
    { label:'Computer', icon:'💻', action:'computer' },
    { label:'Control Panel', icon:'⚙️', action:'control' },
    { label:'Devices and Printers', icon:'🖨️' },
    { label:'Default Programs', icon:'📋' },
    { label:'Help and Support', icon:'❓' },
  ];

  /* ══════════════════════════════════════
     INIT / SHOW / HIDE
     ══════════════════════════════════════ */
  function init() {
    if (visible) return;
    if (!initialized) build();
    desktop.style.display = 'flex';
    visible = true;
    clockIv = setInterval(updateSysClock, 1000);
    updateSysClock();
  }

  function hide() {
    if (!visible) return;
    if (desktop) desktop.style.display = 'none';
    visible = false;
    if (clockIv) { clearInterval(clockIv); clockIv = null; }
  }

  /* ══════════════════════════════════════
     BUILD DESKTOP
     ══════════════════════════════════════ */
  function build() {
    desktop = el('div', { id:'w7Desktop', className:'w7' });

    // Desktop icons
    const iconsArea = el('div', { className:'w7-icons' });
    DESKTOP_ICONS.forEach(icon => {
      const ic = el('div', { className:'w7-dicon', dataset:{ app:icon.id } });
      ic.innerHTML = `<span class="w7-dicon-img">${ICONS[icon.id]}</span><span class="w7-dicon-lbl">${esc(icon.label)}</span>`;
      ic.addEventListener('dblclick', () => openApp(icon.id));
      let selected = false;
      ic.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.w7-dicon.selected').forEach(d => d.classList.remove('selected'));
        ic.classList.add('selected');
      });
      iconsArea.appendChild(ic);
    });
    desktop.appendChild(iconsArea);

    // Windows area
    windowsArea = el('div', { className:'w7-winarea' });
    desktop.appendChild(windowsArea);

    // Taskbar
    taskbar = buildTaskbar();
    desktop.appendChild(taskbar);

    // Start menu
    startMenu = buildStartMenu();
    desktop.appendChild(startMenu);

    // Context menu
    ctxMenu = el('div', { className:'w7-ctx', style:'display:none' });
    desktop.appendChild(ctxMenu);

    // Click handlers
    desktop.addEventListener('click', e => {
      closeCtx();
      if (!e.target.closest('.w7-dicon')) {
        document.querySelectorAll('.w7-dicon.selected').forEach(d => d.classList.remove('selected'));
      }
      if (startOpen && !e.target.closest('.w7-startmenu') && !e.target.closest('.w7-start-btn')) {
        closeStart();
      }
    });

    desktop.addEventListener('contextmenu', e => {
      if (e.target.closest('.w7-winarea .w7-window') || e.target.closest('.w7-taskbar') || e.target.closest('.w7-startmenu')) return;
      e.preventDefault();
      showCtx(e.clientX, e.clientY);
    });

    // Global drag/resize
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    document.body.appendChild(desktop);
    initialized = true;
  }

  /* ══════════════════════════════════════
     TASKBAR
     ══════════════════════════════════════ */
  function buildTaskbar() {
    const tb = el('div', { className:'w7-taskbar' });

    // Start button
    const startBtn = el('button', { className:'w7-start-btn', title:'Start' });
    startBtn.innerHTML = '<span class="w7-start-orb">⊞</span>';
    startBtn.addEventListener('click', e => { e.stopPropagation(); toggleStart(); });
    tb.appendChild(startBtn);

    // Quick launch
    const ql = el('div', { className:'w7-quicklaunch' });
    ['cmd','notepad','ie'].forEach(id => {
      const btn = el('button', { className:'w7-ql-btn', title:id });
      btn.textContent = ICONS[id];
      btn.addEventListener('click', () => openApp(id));
      ql.appendChild(btn);
    });
    tb.appendChild(ql);

    // Open windows
    const items = el('div', { className:'w7-tb-items', id:'w7TbItems' });
    tb.appendChild(items);

    // System tray
    const tray = el('div', { className:'w7-systray' });
    tray.innerHTML = `<span class="w7-tray-icons">▲ 🔊 📶</span><div class="w7-tray-clock"><span id="w7Clock"></span><span id="w7Date"></span></div>`;
    tb.appendChild(tray);

    // Show desktop
    const sd = el('div', { className:'w7-showdesk', title:'Show Desktop' });
    sd.addEventListener('click', () => {
      const allMin = wins.every(w => w.minimized);
      wins.forEach(w => allMin ? restoreWin(w) : minimizeWin(w));
    });
    tb.appendChild(sd);

    return tb;
  }

  function updateSysClock() {
    const now = new Date();
    const clk = document.getElementById('w7Clock');
    const dt = document.getElementById('w7Date');
    if (clk) {
      let h = now.getHours(), m = now.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      clk.textContent = `${h}:${String(m).padStart(2,'0')} ${ampm}`;
    }
    if (dt) {
      dt.textContent = `${now.getMonth()+1}/${now.getDate()}/${now.getFullYear()}`;
    }
  }

  function addTbItem(win) {
    const items = document.getElementById('w7TbItems');
    if (!items) return;
    const btn = el('button', { className:'w7-tb-btn active', dataset:{ wid:win.id } });
    btn.innerHTML = `<span class="w7-tb-icon">${ICONS[win.appId] || '📄'}</span><span class="w7-tb-label">${esc(win.title)}</span>`;
    btn.addEventListener('click', () => {
      if (win.minimized) { restoreWin(win); focusWin(win); }
      else if (activeWin === win) minimizeWin(win);
      else focusWin(win);
    });
    items.appendChild(btn);
    win.tbBtn = btn;
  }

  function removeTbItem(win) {
    if (win.tbBtn) win.tbBtn.remove();
  }

  function updateTbActive() {
    document.querySelectorAll('.w7-tb-btn').forEach(b => b.classList.remove('active'));
    if (activeWin && activeWin.tbBtn && !activeWin.minimized) activeWin.tbBtn.classList.add('active');
  }

  /* ══════════════════════════════════════
     START MENU
     ══════════════════════════════════════ */
  function buildStartMenu() {
    const sm = el('div', { className:'w7-startmenu', style:'display:none' });

    // User header
    const user = el('div', { className:'w7-sm-user' });
    const cfg = root.config ? root.config.get() : { user: 'user' };
    user.innerHTML = `<div class="w7-sm-avatar">👤</div><span class="w7-sm-username">${esc(cfg.user)}</span>`;
    sm.appendChild(user);

    const body = el('div', { className:'w7-sm-body' });

    // Left column - programs
    const left = el('div', { className:'w7-sm-left' });
    START_PINNED.forEach(prog => {
      const item = el('div', { className:'w7-sm-item' });
      item.innerHTML = `<span class="w7-sm-icon">${ICONS[prog.id] || '📄'}</span><span>${esc(prog.label)}</span>`;
      item.addEventListener('click', () => { closeStart(); openApp(prog.id); });
      left.appendChild(item);
    });
    const sep = el('div', { className:'w7-sm-sep' });
    left.appendChild(sep);
    const allProg = el('div', { className:'w7-sm-item w7-sm-allprog' });
    allProg.innerHTML = '<span>All Programs</span><span class="w7-sm-arrow">▸</span>';
    left.appendChild(allProg);
    body.appendChild(left);

    // Right column
    const right = el('div', { className:'w7-sm-right' });
    START_RIGHT.forEach(item => {
      const row = el('div', { className:'w7-sm-ritem' });
      row.innerHTML = `<span class="w7-sm-ricon">${item.icon}</span><span>${esc(item.label)}</span>`;
      if (item.action) row.addEventListener('click', () => { closeStart(); openApp(item.action); });
      right.appendChild(row);
    });
    body.appendChild(right);
    sm.appendChild(body);

    // Bottom - shutdown
    const bottom = el('div', { className:'w7-sm-bottom' });
    const shutBtn = el('button', { className:'w7-sm-shut' });
    shutBtn.textContent = 'Shut down';
    shutBtn.addEventListener('click', () => {
      closeStart();
      wins.forEach(w => closeWin(w));
      const msg = el('div', { className:'w7-shutdown-msg' });
      msg.innerHTML = '<div class="w7-shutdown-text">Shutting down...</div>';
      desktop.appendChild(msg);
      setTimeout(() => {
        msg.remove();
        root.config.setLayoutTheme('terminal');
      }, 1800);
    });
    bottom.appendChild(shutBtn);
    const shutArrow = el('button', { className:'w7-sm-shut-arrow' });
    shutArrow.textContent = '▸';
    bottom.appendChild(shutArrow);
    sm.appendChild(bottom);

    // Search
    const search = el('div', { className:'w7-sm-search' });
    const searchInput = el('input', { type:'text', className:'w7-sm-search-input', placeholder:'Search programs and files' });
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && searchInput.value.trim()) {
        closeStart();
        const q = searchInput.value.trim();
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      }
    });
    search.appendChild(searchInput);
    sm.appendChild(search);

    return sm;
  }

  function toggleStart() { startOpen ? closeStart() : openStart(); }
  function openStart() { startMenu.style.display = 'flex'; startOpen = true; }
  function closeStart() { startMenu.style.display = 'none'; startOpen = false; }

  /* ══════════════════════════════════════
     CONTEXT MENU
     ══════════════════════════════════════ */
  function showCtx(x, y) {
    const items = [
      { label:'View ▸', disabled:true },
      { label:'Sort by ▸', disabled:true },
      null,
      { label:'Refresh', action:() => location.reload() },
      null,
      { label:'New ▸', disabled:true },
      null,
      { label:'Screen resolution', disabled:true },
      { label:'Gadgets', disabled:true },
      { label:'Personalize', action:() => openApp('control') },
    ];
    ctxMenu.innerHTML = items.map(item => {
      if (!item) return '<div class="w7-ctx-sep"></div>';
      return `<div class="w7-ctx-item${item.disabled ? ' disabled' : ''}" data-action="${item.label}">${esc(item.label)}</div>`;
    }).join('');
    ctxMenu.querySelectorAll('.w7-ctx-item:not(.disabled)').forEach(el => {
      el.addEventListener('click', () => {
        const it = items.find(i => i && i.label === el.dataset.action);
        if (it && it.action) it.action();
        closeCtx();
      });
    });
    ctxMenu.style.left = Math.min(x, window.innerWidth - 180) + 'px';
    ctxMenu.style.top = Math.min(y, window.innerHeight - 300) + 'px';
    ctxMenu.style.display = 'block';
  }

  function closeCtx() { if (ctxMenu) ctxMenu.style.display = 'none'; }

  /* ══════════════════════════════════════
     WINDOW MANAGEMENT
     ══════════════════════════════════════ */
  let winIdCounter = 0;

  function createWin(title, appId, content, opts = {}) {
    const id = ++winIdCounter;
    const w = opts.width || 700, h = opts.height || 480;
    const x = 80 + (id % 6) * 30, y = 40 + (id % 6) * 30;
    const winEl = el('div', { className:'w7-window', dataset:{ wid:id } });
    winEl.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${++zIdx}`;

    // Title bar
    const tb = el('div', { className:'w7-win-tb' });
    tb.innerHTML = `
      <span class="w7-win-icon">${ICONS[appId] || '📄'}</span>
      <span class="w7-win-title">${esc(title)}</span>
      <div class="w7-win-ctrls">
        <button class="w7-win-min" title="Minimize">─</button>
        <button class="w7-win-max" title="Maximize">□</button>
        <button class="w7-win-close" title="Close">✕</button>
      </div>`;

    // Menu bar (optional)
    let menubar = null;
    if (opts.menubar) {
      menubar = el('div', { className:'w7-win-menubar' });
      menubar.innerHTML = opts.menubar.map(m => `<span class="w7-menu-item">${esc(m)}</span>`).join('');
    }

    // Content
    const contentEl = el('div', { className:'w7-win-content' });
    if (typeof content === 'string') contentEl.innerHTML = content;
    else contentEl.appendChild(content);

    // Status bar (optional)
    let statusbar = null;
    if (opts.statusbar) {
      statusbar = el('div', { className:'w7-win-statusbar' });
      statusbar.textContent = opts.statusbar;
    }

    // Resize handle
    const resizeHandle = el('div', { className:'w7-win-resize' });

    winEl.appendChild(tb);
    if (menubar) winEl.appendChild(menubar);
    winEl.appendChild(contentEl);
    if (statusbar) winEl.appendChild(statusbar);
    winEl.appendChild(resizeHandle);

    windowsArea.appendChild(winEl);

    const winObj = {
      id, appId, title, el: winEl, contentEl, tb, statusbar,
      x, y, w, h, minimized: false, maximized: false,
      prevGeom: null, tbBtn: null,
    };
    wins.push(winObj);

    // Event handlers
    tb.addEventListener('mousedown', e => {
      if (e.target.closest('.w7-win-ctrls')) return;
      focusWin(winObj);
      startDrag(e, winObj);
    });
    resizeHandle.addEventListener('mousedown', e => { focusWin(winObj); startResize(e, winObj); });
    winEl.addEventListener('mousedown', () => focusWin(winObj));
    tb.querySelector('.w7-win-min').addEventListener('click', () => minimizeWin(winObj));
    tb.querySelector('.w7-win-max').addEventListener('click', () => toggleMaxWin(winObj));
    tb.querySelector('.w7-win-close').addEventListener('click', () => closeWin(winObj));
    tb.addEventListener('dblclick', e => { if (!e.target.closest('.w7-win-ctrls')) toggleMaxWin(winObj); });

    addTbItem(winObj);
    focusWin(winObj);

    if (opts.onCreated) opts.onCreated(winObj);
    return winObj;
  }

  function focusWin(win) {
    if (activeWin) activeWin.el.classList.remove('w7-active');
    win.el.style.zIndex = ++zIdx;
    win.el.classList.add('w7-active');
    activeWin = win;
    updateTbActive();
  }

  function minimizeWin(win) {
    win.minimized = true;
    win.el.style.display = 'none';
    if (activeWin === win) {
      activeWin = null;
      const visible = wins.filter(w => !w.minimized);
      if (visible.length) focusWin(visible[visible.length - 1]);
    }
    updateTbActive();
  }

  function restoreWin(win) {
    win.minimized = false;
    win.el.style.display = '';
    focusWin(win);
  }

  function toggleMaxWin(win) {
    if (win.maximized) {
      win.maximized = false;
      const g = win.prevGeom;
      win.el.style.cssText = `left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px;z-index:${win.el.style.zIndex}`;
      win.el.classList.remove('w7-maximized');
    } else {
      win.prevGeom = { x: win.el.offsetLeft, y: win.el.offsetTop, w: win.el.offsetWidth, h: win.el.offsetHeight };
      win.maximized = true;
      win.el.style.cssText = `left:0;top:0;width:100%;height:calc(100% - 40px);z-index:${++zIdx}`;
      win.el.classList.add('w7-maximized');
      focusWin(win);
    }
  }

  function closeWin(win) {
    // Clean up output override if this was a CMD window
    if (win.appId === 'cmd' && root.core._outputOverride === win.cmdOutput) {
      root.core._outputOverride = null;
      root.core._echoPrefix = null;
    }
    win.el.remove();
    removeTbItem(win);
    wins = wins.filter(w => w !== win);
    if (activeWin === win) {
      activeWin = null;
      const visible = wins.filter(w => !w.minimized);
      if (visible.length) focusWin(visible[visible.length - 1]);
    }
    updateTbActive();
  }

  /* ── Drag ── */
  function startDrag(e, win) {
    if (win.maximized) return;
    dragState = {
      win, startX: e.clientX, startY: e.clientY,
      origX: win.el.offsetLeft, origY: win.el.offsetTop,
    };
    e.preventDefault();
  }

  function startResize(e, win) {
    if (win.maximized) return;
    resizeState = {
      win, startX: e.clientX, startY: e.clientY,
      origW: win.el.offsetWidth, origH: win.el.offsetHeight,
    };
    e.preventDefault();
  }

  function onMouseMove(e) {
    if (dragState) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      dragState.win.el.style.left = (dragState.origX + dx) + 'px';
      dragState.win.el.style.top = Math.max(0, dragState.origY + dy) + 'px';
    }
    if (resizeState) {
      const dx = e.clientX - resizeState.startX;
      const dy = e.clientY - resizeState.startY;
      resizeState.win.el.style.width = Math.max(320, resizeState.origW + dx) + 'px';
      resizeState.win.el.style.height = Math.max(200, resizeState.origH + dy) + 'px';
    }
  }

  function onMouseUp() {
    dragState = null;
    resizeState = null;
  }

  /* ══════════════════════════════════════
     APP LAUNCHER
     ══════════════════════════════════════ */
  function openApp(id) {
    switch (id) {
      case 'cmd': return openCmd();
      case 'notepad': return openNotepad();
      case 'calc': return openCalc();
      case 'computer': return openComputer();
      case 'control': return openControl();
      case 'calendar': return openCalendar();
      case 'sticky': return openSticky();
      case 'taskmgr': return openTaskMgr();
      case 'ie': return openIE();
      case 'paint': return openPaint();
      default:
        const c = el('div');
        c.innerHTML = `<div style="padding:40px;text-align:center;color:#444"><p style="font-size:48px">${ICONS[id]||'📄'}</p><p>${esc(id)} is not available.</p></div>`;
        return createWin(id, id, c, { width:400, height:300 });
    }
  }

  /* ── CMD (Command Prompt) ── */
  function openCmd() {
    const c = el('div', { className:'w7-cmd' });
    const output = el('div', { className:'w7-cmd-output' });
    const user = root.config ? root.config.get().user : 'user';
    output.innerHTML = `<div class="w7-cmd-line">Microsoft Windows [Version 6.1.7601]</div>
<div class="w7-cmd-line">Copyright (c) 2009 Microsoft Corporation. All rights reserved.</div>
<div class="w7-cmd-line">&nbsp;</div>`;
    const inputLine = el('div', { className:'w7-cmd-inputline' });
    const prompt = el('span', { className:'w7-cmd-prompt' });
    prompt.textContent = `C:\\Users\\${user}>`;
    const input = el('input', { type:'text', className:'w7-cmd-input', spellcheck:false, autocomplete:'off' });
    inputLine.appendChild(prompt);
    inputLine.appendChild(input);
    c.appendChild(output);
    c.appendChild(inputLine);

    const win = createWin('Command Prompt', 'cmd', c, {
      width: 740, height: 460,
      onCreated: (w) => {
        w.cmdOutput = output;
        setTimeout(() => input.focus(), 100);
      }
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const val = input.value;
        input.value = '';
        if (!val.trim()) {
          const l = el('div', { className:'w7-cmd-line' });
          l.textContent = `C:\\Users\\${user}>`;
          output.appendChild(l);
          output.scrollTop = output.scrollHeight;
          return;
        }
        // Redirect output to this CMD window
        root.core._outputOverride = output;
        root.core._echoPrefix = `C:\\Users\\${user}>`;
        try {
          root.commands.handle(val);
        } catch(err) {
          const l = el('div', { className:'w7-cmd-line' });
          l.textContent = `'${val}' is not recognized as an internal or external command.`;
          output.appendChild(l);
        }
        root.core._outputOverride = null;
        root.core._echoPrefix = null;
        output.scrollTop = output.scrollHeight;
      }
    });

    // Focus input when clicking anywhere in cmd
    c.addEventListener('click', () => input.focus());
  }

  /* ── Notepad ── */
  function openNotepad() {
    const c = el('div', { className:'w7-notepad' });
    const textarea = el('textarea', { className:'w7-notepad-text', spellcheck:false });
    textarea.placeholder = 'Untitled - Notepad';
    // Load first note if available
    if (root.notes && root.notes.all().length > 0) {
      textarea.value = root.notes.all()[0];
    }
    c.appendChild(textarea);

    createWin('Untitled - Notepad', 'notepad', c, {
      width: 640, height: 440,
      menubar: ['File', 'Edit', 'Format', 'View', 'Help'],
      statusbar: 'Ln 1, Col 1',
      onCreated: () => setTimeout(() => textarea.focus(), 100),
    });
  }

  /* ── Calculator ── */
  function openCalc() {
    const c = el('div', { className:'w7-calc' });
    let display = '0', prevVal = null, op = null, fresh = true;
    const dispEl = el('div', { className:'w7-calc-display' });
    dispEl.textContent = '0';
    c.appendChild(dispEl);

    const buttons = [
      ['MC','MR','MS','M+','M-'],
      ['←','CE','C','±','√'],
      ['7','8','9','÷','%'],
      ['4','5','6','×','1/x'],
      ['1','2','3','-',''],
      ['0','','.','+',' = '],
    ];

    const grid = el('div', { className:'w7-calc-grid' });
    buttons.forEach(row => {
      row.forEach(label => {
        const btn = el('button', { className:'w7-calc-btn' });
        btn.textContent = label;
        if (!label.trim()) { btn.style.visibility = 'hidden'; }
        if ('0123456789.'.includes(label)) btn.classList.add('w7-calc-num');
        if (label === '=') btn.classList.add('w7-calc-eq');
        btn.addEventListener('click', () => calcPress(label));
        grid.appendChild(btn);
      });
    });
    c.appendChild(grid);

    function calcPress(label) {
      if ('0123456789'.includes(label)) {
        if (fresh) { display = label; fresh = false; }
        else display += label;
      } else if (label === '.') {
        if (!display.includes('.')) display += '.';
        fresh = false;
      } else if (label === 'C') {
        display = '0'; prevVal = null; op = null; fresh = true;
      } else if (label === 'CE') {
        display = '0'; fresh = true;
      } else if (label === '←') {
        display = display.length > 1 ? display.slice(0, -1) : '0';
      } else if (label === '±') {
        display = String(-parseFloat(display));
      } else if (label === '√') {
        display = String(Math.sqrt(parseFloat(display)));
        fresh = true;
      } else if (label === '%') {
        if (prevVal !== null) display = String(prevVal * parseFloat(display) / 100);
        fresh = true;
      } else if (label === '1/x') {
        const v = parseFloat(display);
        display = v !== 0 ? String(1 / v) : 'Error';
        fresh = true;
      } else if ('+-×÷'.includes(label) || label === '=') {
        const curr = parseFloat(display);
        if (prevVal !== null && op) {
          let result;
          switch (op) {
            case '+': result = prevVal + curr; break;
            case '-': result = prevVal - curr; break;
            case '×': result = prevVal * curr; break;
            case '÷': result = curr !== 0 ? prevVal / curr : 'Error'; break;
          }
          display = String(result);
          prevVal = label === '=' ? null : result;
        } else {
          prevVal = curr;
        }
        op = label === '=' ? null : label;
        fresh = true;
      }
      dispEl.textContent = display;
    }

    createWin('Calculator', 'calc', c, { width: 340, height: 420 });
  }

  /* ── Computer ── */
  function openComputer() {
    const c = el('div', { className:'w7-explorer' });
    c.innerHTML = `
      <div class="w7-exp-sidebar">
        <div class="w7-exp-nav">📁 Desktop</div>
        <div class="w7-exp-nav">📥 Downloads</div>
        <div class="w7-exp-nav">📄 Documents</div>
        <div class="w7-exp-nav">🖼️ Pictures</div>
        <div class="w7-exp-nav">🎵 Music</div>
        <div class="w7-exp-nav">🎬 Videos</div>
      </div>
      <div class="w7-exp-main">
        <div class="w7-exp-section">Hard Disk Drives</div>
        <div class="w7-exp-drives">
          <div class="w7-exp-drive">
            <div class="w7-exp-drive-icon">💿</div>
            <div class="w7-exp-drive-info">
              <div class="w7-exp-drive-name">Local Disk (C:)</div>
              <div class="w7-exp-drive-bar"><div class="w7-exp-drive-fill" style="width:67%"></div></div>
              <div class="w7-exp-drive-size">186 GB free of 476 GB</div>
            </div>
          </div>
          <div class="w7-exp-drive">
            <div class="w7-exp-drive-icon">💿</div>
            <div class="w7-exp-drive-info">
              <div class="w7-exp-drive-name">Data (D:)</div>
              <div class="w7-exp-drive-bar"><div class="w7-exp-drive-fill" style="width:34%"></div></div>
              <div class="w7-exp-drive-size">638 GB free of 931 GB</div>
            </div>
          </div>
        </div>
        <div class="w7-exp-section">Devices with Removable Storage</div>
        <div class="w7-exp-drives">
          <div class="w7-exp-drive">
            <div class="w7-exp-drive-icon">📀</div>
            <div class="w7-exp-drive-info">
              <div class="w7-exp-drive-name">DVD RW Drive (E:)</div>
              <div class="w7-exp-drive-size">No disc</div>
            </div>
          </div>
        </div>
      </div>`;
    createWin('Computer', 'computer', c, {
      width: 800, height: 500,
      menubar: ['Organize', 'System properties', 'Uninstall or change a program', 'Map network drive'],
      statusbar: '3 items',
    });
  }

  /* ── Control Panel ── */
  function openControl() {
    const c = el('div', { className:'w7-control' });
    const cfg = root.config ? root.config.get() : {};
    c.innerHTML = `
      <div class="w7-ctrl-header">Adjust your computer's settings</div>
      <div class="w7-ctrl-grid">
        <div class="w7-ctrl-item" data-action="theme">
          <span class="w7-ctrl-icon">🎨</span>
          <div>
            <div class="w7-ctrl-title">Appearance and Personalization</div>
            <div class="w7-ctrl-desc">Change theme: currently <b>${esc(cfg.layoutTheme)}</b></div>
          </div>
        </div>
        <div class="w7-ctrl-item" data-action="accent">
          <span class="w7-ctrl-icon">🖌️</span>
          <div>
            <div class="w7-ctrl-title">Colors</div>
            <div class="w7-ctrl-desc">Accent color: <span style="color:${cfg.accent}">■</span> ${esc(cfg.accent)}</div>
          </div>
        </div>
        <div class="w7-ctrl-item" data-action="user">
          <span class="w7-ctrl-icon">👤</span>
          <div>
            <div class="w7-ctrl-title">User Accounts</div>
            <div class="w7-ctrl-desc">User: ${esc(cfg.user)} | Host: ${esc(cfg.host)}</div>
          </div>
        </div>
        <div class="w7-ctrl-item" data-action="storage">
          <span class="w7-ctrl-icon">💾</span>
          <div>
            <div class="w7-ctrl-title">System Information</div>
            <div class="w7-ctrl-desc">TabOS v3.0.0 | Storage usage</div>
          </div>
        </div>
      </div>`;
    createWin('Control Panel', 'control', c, { width: 700, height: 400, statusbar: 'Control Panel' });
  }

  /* ── Calendar ── */
  function openCalendar() {
    const c = el('div', { className:'w7-cal' });
    const now = new Date();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const year = now.getFullYear(), month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay + 6) % 7;
    const today = now.getDate();

    let html = `<div class="w7-cal-title">${months[month]} ${year}</div>`;
    html += '<div class="w7-cal-grid"><div class="w7-cal-hdr">Mo</div><div class="w7-cal-hdr">Tu</div><div class="w7-cal-hdr">We</div><div class="w7-cal-hdr">Th</div><div class="w7-cal-hdr">Fr</div><div class="w7-cal-hdr">Sa</div><div class="w7-cal-hdr">Su</div>';
    for (let i = 0; i < startOffset; i++) html += '<div class="w7-cal-day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      html += `<div class="w7-cal-day${d === today ? ' today' : ''}">${d}</div>`;
    }
    html += '</div>';
    c.innerHTML = html;
    createWin('Calendar', 'calendar', c, { width: 320, height: 360 });
  }

  /* ── Sticky Notes ── */
  function openSticky() {
    const c = el('div', { className:'w7-sticky' });
    const notes = root.notes ? root.notes.all() : [];
    if (notes.length === 0) {
      c.innerHTML = '<div style="padding:20px;color:#666">No notes yet. Use /cat in CMD to create one.</div>';
    } else {
      notes.forEach((note, i) => {
        const card = el('div', { className:'w7-sticky-card' });
        const first = note.split('\n')[0].replace(/^#+\s*/, '');
        card.innerHTML = `<div class="w7-sticky-title">${esc(first.slice(0,40))}</div><div class="w7-sticky-body">${esc(note.slice(0,120))}</div>`;
        c.appendChild(card);
      });
    }
    createWin('Sticky Notes', 'sticky', c, { width: 400, height: 360 });
  }

  /* ── Task Manager ── */
  function openTaskMgr() {
    const c = el('div', { className:'w7-taskmgr' });
    const todos = root.todo ? root.todo.all() : [];
    let html = '<div class="w7-tm-tabs"><span class="w7-tm-tab active">Tasks</span></div>';
    html += '<div class="w7-tm-list">';
    if (todos.length === 0) {
      html += '<div style="padding:20px;color:#666">No tasks. Use /todo add in CMD.</div>';
    } else {
      todos.forEach(t => {
        html += `<div class="w7-tm-item ${t.done ? 'done' : ''}">
          <span class="w7-tm-check">${t.done ? '☑' : '☐'}</span>
          <span class="w7-tm-text">${esc(t.text)}</span>
          ${t.priority === 'high' ? '<span class="w7-tm-pri">!</span>' : ''}
        </div>`;
      });
    }
    html += '</div>';
    c.innerHTML = html;
    createWin('Task Manager', 'taskmgr', c, { width: 500, height: 400, statusbar: `${todos.length} tasks` });
  }

  /* ── Internet Explorer ── */
  function openIE() {
    const c = el('div', { className:'w7-ie' });
    const toolbar = el('div', { className:'w7-ie-toolbar' });
    const urlbar = el('input', { type:'text', className:'w7-ie-url', value:'about:blank' });
    urlbar.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        let url = urlbar.value.trim();
        if (url && !url.startsWith('http')) url = 'https://' + url;
        if (url) window.location.href = url;
      }
    });
    toolbar.innerHTML = '<button class="w7-ie-nav">←</button><button class="w7-ie-nav">→</button>';
    toolbar.appendChild(urlbar);
    const goBtn = el('button', { className:'w7-ie-nav' });
    goBtn.textContent = '→';
    goBtn.addEventListener('click', () => {
      let url = urlbar.value.trim();
      if (url && !url.startsWith('http')) url = 'https://' + url;
      if (url) window.location.href = url;
    });
    toolbar.appendChild(goBtn);
    c.appendChild(toolbar);

    const body = el('div', { className:'w7-ie-body' });
    body.innerHTML = `<div style="text-align:center;padding:60px 20px">
      <div style="font-size:36px;color:#0078d7;margin-bottom:16px">Internet Explorer</div>
      <p style="color:#666">Type a URL in the address bar and press Enter</p>
    </div>`;
    c.appendChild(body);
    createWin('Internet Explorer', 'ie', c, {
      width: 800, height: 520,
      onCreated: () => setTimeout(() => urlbar.focus(), 100),
    });
  }

  /* ── Paint (simple) ── */
  function openPaint() {
    const c = el('div', { className:'w7-paint' });
    const canvas = el('canvas', { width:600, height:340 });
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 340);
    let drawing = false, lastX = 0, lastY = 0;
    let brushColor = '#000000', brushSize = 3;

    const toolbar = el('div', { className:'w7-paint-tools' });
    const colors = ['#000000','#808080','#800000','#ff0000','#808000','#00ff00','#008080','#0000ff','#000080','#800080','#ffffff','#c0c0c0','#ff8000','#ffff00','#00ff80','#00ffff','#0080ff','#ff00ff'];
    colors.forEach(color => {
      const swatch = el('div', { className:'w7-paint-color' });
      swatch.style.background = color;
      swatch.addEventListener('click', () => { brushColor = color; });
      toolbar.appendChild(swatch);
    });
    c.appendChild(toolbar);
    c.appendChild(canvas);

    canvas.addEventListener('mousedown', e => {
      drawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left; lastY = e.clientY - rect.top;
    });
    canvas.addEventListener('mousemove', e => {
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.stroke();
      lastX = x; lastY = y;
    });
    canvas.addEventListener('mouseup', () => drawing = false);
    canvas.addEventListener('mouseleave', () => drawing = false);

    createWin('Paint', 'paint', c, { width: 660, height: 440, menubar: ['File','Edit','View','Image','Colors','Help'] });
  }

  /* ══════════════════════════════════════
     HELPERS
     ══════════════════════════════════════ */
  function el(tag, props) {
    const e = document.createElement(tag);
    if (props) Object.entries(props).forEach(([k, v]) => {
      if (k === 'dataset') Object.assign(e.dataset, v);
      else if (k === 'style' && typeof v === 'string') e.style.cssText = v;
      else e[k] = v;
    });
    return e;
  }

  function esc(s) { return root.utils ? root.utils.escapeHtml(s || '') : String(s || ''); }

  /* ── Export ── */
  root.win7 = { init, hide };
})();
