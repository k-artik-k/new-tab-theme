(function () {
  const root = window.TabOS;
  const { dom, state } = root.core;

  function showAutocomplete(items) {
    state.activeCompletion = 0;
    dom.autocomplete.innerHTML = items.map(([key, value], i) =>
      `<div class="ac-item ${i === 0 ? 'active' : ''}" data-key="${root.utils.escapeHtml(key)}">
        <span>/${root.utils.escapeHtml(key)}</span><span class="ac-desc">${root.utils.escapeHtml(value.desc)}</span>
      </div>`
    ).join('');
    dom.autocomplete.classList.add('show');
    dom.autocomplete.querySelectorAll('.ac-item').forEach(item => {
      item.addEventListener('click', () => {
        dom.cmdInput.value = `/${item.dataset.key}`;
        hideAutocomplete();
        dom.cmdInput.focus();
      });
    });
  }

  function hideAutocomplete() {
    dom.autocomplete.classList.remove('show');
    state.activeCompletion = -1;
  }

  function moveAutocomplete(dir) {
    const items = dom.autocomplete.querySelectorAll('.ac-item');
    if (!items.length) return;
    items[Math.max(state.activeCompletion, 0)].classList.remove('active');
    state.activeCompletion = (state.activeCompletion + dir + items.length) % items.length;
    items[state.activeCompletion].classList.add('active');
  }

  function acceptAutocomplete() {
    const items = dom.autocomplete.querySelectorAll('.ac-item');
    if (!items.length) return;
    const key = items[Math.max(state.activeCompletion, 0)].dataset.key;
    const insert = key.replace(/\s*(<[^>]+>|\[[^\]]+\]).*$/, '');
    dom.cmdInput.value = `/${insert}${insert.endsWith(' ') ? '' : ' '}`;
    hideAutocomplete();
  }

  function bindInput() {
    dom.cmdInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        hideAutocomplete();
        root.commands.handle(dom.cmdInput.value);
        dom.cmdInput.value = '';
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (dom.autocomplete.classList.contains('show')) return moveAutocomplete(-1);
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          dom.cmdInput.value = state.history[state.historyIndex];
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (dom.autocomplete.classList.contains('show')) return moveAutocomplete(1);
        if (state.historyIndex > 0) {
          state.historyIndex--;
          dom.cmdInput.value = state.history[state.historyIndex];
        } else {
          state.historyIndex = -1;
          dom.cmdInput.value = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        acceptAutocomplete();
      } else if (e.key === 'Escape') {
        hideAutocomplete();
      }
    });

    dom.cmdInput.addEventListener('input', () => {
      const value = dom.cmdInput.value;
      if (value.startsWith('/') && value.length > 1) {
        const matches = root.commands.completions(value.slice(1));
        if (matches.length) showAutocomplete(matches);
        else hideAutocomplete();
      } else {
        hideAutocomplete();
      }
    });

    document.addEventListener('keydown', e => {
      const noteEditor = document.getElementById('noteEditor');
      const todoInput = document.getElementById('todoInput');
      if (e.target === noteEditor || e.target === todoInput) return;
      if (!e.ctrlKey && !e.altKey && !e.metaKey && e.key.length === 1) dom.cmdInput.focus();
    });
  }

  function boot() {
    root.core.init();
    root.config.init();
    root.facts.init();
    root.rain.init();
    root.notes.init();
    root.todo.init();
    root.commands.init();
    bindInput();

    const config = root.config.get();
    if (config.startupAnim !== false) {
      runStartupAnimation();
    }
    if (config.parallax3d) {
      root.core.toggle3D(true);
    }
  }

  function runStartupAnimation() {
    const termWindow = document.querySelector('.terminal-window');
    const output = root.core.dom.output;
    if (termWindow) termWindow.classList.add('startup-flicker');

    const bootLines = [
      { text: 'BIOS v3.7.1 ................... OK', delay: 80 },
      { text: 'Memory check .................. 640K OK', delay: 180 },
      { text: 'Loading kernel modules ........ done', delay: 300 },
      { text: 'Mounting /dev/brain ........... OK', delay: 420 },
      { text: 'Initializing display server ... OK', delay: 520 },
    ];

    bootLines.forEach(({ text, delay }) => {
      setTimeout(() => {
        root.core.appendOutput(root.utils.escapeHtml(text), 'boot-line');
      }, delay);
    });

    // Loading bar animation
    const barDelay = 650;
    const barSteps = 20;
    const barInterval = 40;
    let barEl = null;
    setTimeout(() => {
      barEl = document.createElement('div');
      barEl.className = 'out-line boot-bar';
      output.appendChild(barEl);
      let step = 0;
      const barTimer = setInterval(() => {
        step++;
        const filled = '█'.repeat(step);
        const empty = '░'.repeat(barSteps - step);
        const pct = Math.round((step / barSteps) * 100);
        barEl.textContent = `[${filled}${empty}] ${pct}%`;
        if (step >= barSteps) {
          clearInterval(barTimer);
          setTimeout(() => {
            root.core.appendOutput('Starting terminal service ... ready', 'boot-line');
            setTimeout(() => {
              output.innerHTML = '';
              if (termWindow) termWindow.classList.remove('startup-flicker');
              root.core.appendOutput(`welcome back, ${root.utils.escapeHtml(root.config.get().user)}. type /help or ? for commands.`, 'success');
            }, 400);
          }, 100);
        }
      }, barInterval);
    }, barDelay);
  }

  boot();
})();
