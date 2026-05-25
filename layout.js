(function () {
  const root = window.TabOS = window.TabOS || {};
  const storage = root.storage;

  const WIDGETS = [
    { id: 'terminal', selector: '.terminal-container', handle: '.terminal-titlebar', minW: 340, minH: 220 },
    { id: 'calendar', selector: '#calendarPanel', handle: '.cal-header', minW: 190, minH: 130 },
    { id: 'todo', selector: '#todoPanel', handle: '.todo-header', minW: 220, minH: 180 },
    { id: 'pomodoro', selector: '#pomodoroPanel', handle: '#pomodoroPanel', minW: 190, minH: 42 },
    { id: 'notes', selector: '#stickyPanel', handle: '.sticky-header', minW: 220, minH: 140 },
    { id: 'facts', selector: '#factBar', handle: '#factBar', minW: 240, minH: 38 },
    { id: 'clock', selector: '#analogClock', handle: '.analog-face', minW: 150, minH: 150, square: true },
  ];
  const TOGGLE_WIDGETS = WIDGETS.filter(widget => widget.id !== 'terminal');

  let dragState = null;
  let resizeState = null;
  let z = 30;

  function theme() {
    return root.config && root.config.get ? root.config.get().layoutTheme || 'terminal' : 'terminal';
  }

  function config() {
    return root.config && root.config.get ? root.config.get() : {};
  }

  function canEditLayout() {
    return theme() !== 'terminal' && config().layoutEdit === true;
  }

  function allLayouts() {
    return storage.getJson(storage.keys.widgetLayout, {});
  }

  function saveLayouts(layouts) {
    storage.setJson(storage.keys.widgetLayout, layouts);
  }

  function layoutForTheme() {
    const layouts = allLayouts();
    return layouts[theme()] || {};
  }

  function setWidgetLayout(id, geometry) {
    const layouts = allLayouts();
    const currentTheme = theme();
    layouts[currentTheme] = { ...(layouts[currentTheme] || {}), [id]: geometry };
    saveLayouts(layouts);
  }

  function visibility() {
    return storage.getJson(storage.keys.widgetVisibility, {});
  }

  function saveVisibility(next) {
    storage.setJson(storage.keys.widgetVisibility, next);
  }

  function isVisible(id) {
    return visibility()[id] !== false;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function viewportClamp(rect) {
    const margin = 8;
    const w = clamp(rect.w, rect.minW, Math.max(rect.minW, window.innerWidth - margin * 2));
    const h = clamp(rect.h, rect.minH, Math.max(rect.minH, window.innerHeight - margin * 2));
    return {
      x: clamp(rect.x, margin - w + 64, window.innerWidth - margin - 64),
      y: clamp(rect.y, margin, window.innerHeight - margin - 36),
      w,
      h,
      z: rect.z || ++z,
    };
  }

  function applyGeometry(el, geometry) {
    const g = viewportClamp({
      x: Number(geometry.x) || 0,
      y: Number(geometry.y) || 0,
      w: Number(geometry.w) || el.offsetWidth,
      h: Number(geometry.h) || el.offsetHeight,
      z: Number(geometry.z) || ++z,
      minW: 1,
      minH: 1,
    });
    el.classList.add('layout-custom');
    el.style.position = 'fixed';
    el.style.left = `${g.x}px`;
    el.style.top = `${g.y}px`;
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.style.width = `${g.w}px`;
    el.style.height = `${g.h}px`;
    el.style.transform = 'none';
    el.style.margin = '0';
    el.style.zIndex = String(g.z);
  }

  function clearGeometry(el) {
    el.classList.remove('layout-custom');
    ['position', 'left', 'top', 'right', 'bottom', 'width', 'height', 'transform', 'margin', 'zIndex'].forEach(prop => {
      el.style[prop] = '';
    });
  }

  function ensureGrip(el, def) {
    if (el.querySelector(':scope > .layout-resize-grip')) return;
    const grip = document.createElement('span');
    grip.className = 'layout-resize-grip';
    grip.title = 'Resize';
    grip.addEventListener('pointerdown', e => startResize(e, el, def));
    el.appendChild(grip);
  }

  function isInteractive(target) {
    return !!target.closest('button, input, textarea, select, a, .cmd-input, .todo-list, .notes-container, .fn-edit, .layout-resize-grip');
  }

  function startDrag(e, el, def) {
    if (!canEditLayout()) return;
    if (e.button !== 0 || isInteractive(e.target)) return;
    const rect = el.getBoundingClientRect();
    dragState = {
      el,
      def,
      startX: e.clientX,
      startY: e.clientY,
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      w: rect.width,
      h: rect.height,
      z: ++z,
      moved: false,
      wasCustom: el.classList.contains('layout-custom'),
      oldZ: el.style.zIndex,
    };
    el.classList.add('layout-moving', 'layout-custom');
    el.style.zIndex = String(dragState.z);
    e.preventDefault();
    e.stopPropagation();
  }

  function startResize(e, el, def) {
    if (!canEditLayout()) return;
    if (e.button !== 0) return;
    const rect = el.getBoundingClientRect();
    resizeState = {
      el,
      def,
      x: rect.left,
      y: rect.top,
      startX: e.clientX,
      startY: e.clientY,
      startW: rect.width,
      startH: rect.height,
      z: ++z,
      moved: false,
      wasCustom: el.classList.contains('layout-custom'),
      oldZ: el.style.zIndex,
    };
    el.classList.add('layout-resizing', 'layout-custom');
    el.style.zIndex = String(resizeState.z);
    e.preventDefault();
    e.stopPropagation();
  }

  function finishInteraction(state) {
    if (!state) return;
    if (!state.moved) {
      state.el.classList.remove('layout-moving', 'layout-resizing');
      if (state.oldZ !== undefined) state.el.style.zIndex = state.oldZ;
      if (!state.wasCustom) {
        state.el.classList.remove('layout-custom');
      }
      return;
    }
    const rect = state.el.getBoundingClientRect();
    setWidgetLayout(state.def.id, {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      z: Number(state.el.style.zIndex) || ++z,
    });
    state.el.classList.remove('layout-moving', 'layout-resizing');
  }

  function onPointerMove(e) {
    if (dragState) {
      if (!dragState.moved && Math.abs(e.clientX - dragState.startX) + Math.abs(e.clientY - dragState.startY) < 3) return;
      dragState.moved = true;
      const next = viewportClamp({
        x: e.clientX - dragState.dx,
        y: e.clientY - dragState.dy,
        w: dragState.w,
        h: dragState.h,
        z: dragState.z,
        minW: dragState.def.minW,
        minH: dragState.def.minH,
      });
      applyGeometry(dragState.el, next);
    }
    if (resizeState) {
      if (!resizeState.moved && Math.abs(e.clientX - resizeState.startX) + Math.abs(e.clientY - resizeState.startY) < 3) return;
      resizeState.moved = true;
      const dx = e.clientX - resizeState.startX;
      const dy = e.clientY - resizeState.startY;
      let w = resizeState.startW + dx;
      let h = resizeState.startH + dy;
      if (resizeState.def.square) {
        const side = Math.max(w, h);
        w = side;
        h = side;
      }
      const next = viewportClamp({
        x: resizeState.x,
        y: resizeState.y,
        w,
        h,
        z: resizeState.z,
        minW: resizeState.def.minW,
        minH: resizeState.def.minH,
      });
      applyGeometry(resizeState.el, next);
    }
  }

  function onPointerUp() {
    finishInteraction(dragState);
    finishInteraction(resizeState);
    dragState = null;
    resizeState = null;
  }

  function bindWidget(def) {
    const el = document.querySelector(def.selector);
    if (!el || el.dataset.layoutBound) return;
    el.dataset.layoutBound = 'true';
    el.classList.add('layout-widget');
    ensureGrip(el, def);
    const handle = el.querySelector(def.handle) || el;
    handle.classList.add('layout-drag-handle');
    handle.addEventListener('pointerdown', e => startDrag(e, el, def));
  }

  function applyTheme() {
    document.body.classList.toggle('layout-edit', canEditLayout());
    const saved = layoutForTheme();
    WIDGETS.forEach(def => {
      const el = document.querySelector(def.selector);
      if (!el) return;
      if (theme() !== 'terminal' && saved[def.id]) applyGeometry(el, saved[def.id]);
      else clearGeometry(el);
    });
    applyVisibility();
  }

  function resetTheme() {
    const layouts = allLayouts();
    delete layouts[theme()];
    saveLayouts(layouts);
    applyTheme();
  }

  function setEditMode(on) {
    if (!root.config || !root.config.get) return false;
    const cfg = root.config.get();
    cfg.layoutEdit = !!on;
    storage.saveConfig(cfg);
    applyTheme();
    return true;
  }

  function applyVisibility() {
    const shown = visibility();
    TOGGLE_WIDGETS.forEach(def => {
      const el = document.querySelector(def.selector);
      if (!el) return;
      el.classList.toggle('widget-hidden', shown[def.id] === false);
    });
  }

  function setWidgetVisible(id, visible) {
    if (!TOGGLE_WIDGETS.some(widget => widget.id === id)) return false;
    const next = visibility();
    next[id] = !!visible;
    saveVisibility(next);
    applyVisibility();
    return true;
  }

  function toggleWidget(id) {
    return setWidgetVisible(id, !isVisible(id));
  }

  function resetVisibility() {
    saveVisibility({});
    applyVisibility();
  }

  function init() {
    WIDGETS.forEach(bindWidget);
    applyTheme();
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    window.addEventListener('resize', applyTheme);
  }

  root.layout = {
    init,
    applyTheme,
    resetTheme,
    setEditMode,
    setWidgetVisible,
    toggleWidget,
    resetVisibility,
    isVisible,
    widgets: () => TOGGLE_WIDGETS.map(widget => widget.id),
  };
})();
