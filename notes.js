(function () {
  const root = window.TabOS = window.TabOS || {};
  const storage = root.storage;
  const { escapeHtml } = root.utils;

  let notes = storage.getJson(storage.keys.notes, []);
  const oldSeedNotes = [
    '# Welcome\nYour sticky notes live here.\n- Click to edit\n- Markdown works',
    '## Quick Links\n- [GITAM](https://login.gitam.edu)\n- [LeetCode](https://leetcode.com)',
  ];
  if (JSON.stringify(notes) === JSON.stringify(oldSeedNotes)) {
    notes = [];
    storage.setJson(storage.keys.notes, notes);
  }
  let editingIndex = null;
  let previewActive = false;
  let previewDebounce = null;
  let globalZIndex = 10;
  let dragState = null;

  const els = {
    panel: document.getElementById('stickyPanel'),
    container: document.getElementById('notesContainer'),
    modal: document.getElementById('noteModal'),
    editor: document.getElementById('noteEditor'),
    preview: document.getElementById('notePreview'),
    togglePreview: document.getElementById('togglePreview'),
    add: document.getElementById('addNoteBtn'),
    save: document.getElementById('saveNoteBtn'),
    remove: document.getElementById('deleteNoteBtn'),
    close: document.getElementById('modalClose'),
  };

  function save() {
    storage.setJson(storage.keys.notes, notes);
  }

  function getPositions() {
    return storage.getJson(storage.keys.notePanelPos, {});
  }
  function savePositions(positions) {
    storage.setJson(storage.keys.notePanelPos, positions);
  }

  /* ── Compact Markdown Parser ── */
  function renderMarkdown(md) {
    let html = escapeHtml(md);

    // Code blocks
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    // Tables
    html = html.replace(/^(\|.+\|)\n(\|[\s\-:|]+\|)\n((?:\|.+\|\n?)+)/gm, (_, header, sep, body) => {
      const thCells = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${thCells}</tr></thead><tbody>${rows}</tbody></table>`;
    });

    html = html.replace(/^---+$/gm, '<hr>');
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^- \[x\] (.+)$/gm, '<div class="checklist-item"><input type="checkbox" checked disabled>$1</div>');
    html = html.replace(/^- \[ \] (.+)$/gm, '<div class="checklist-item"><input type="checkbox" disabled>$1</div>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    html = html.replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/<\/(h[1-3]|pre|table|blockquote|hr|ul|div)><br>/g, '</$1>');
    html = html.replace(/<br><(h[1-3]|pre|table|blockquote|hr|ul|div)/g, '<$1');

    return html;
  }

  function truncate(text, len) {
    const first = text.split('\n')[0].replace(/^#+\s*/, '').replace(/\*\*/g, '');
    return first.length > len ? first.slice(0, len) + '\u2026' : first;
  }

  function defaultPosition(index) {
    return {
      x: 20 + (index % 4) * 210,
      y: Math.max(80, window.innerHeight - 280 - Math.floor(index / 4) * 160),
    };
  }

  /* ── Panel directory (mini list) ── */
  function renderDirectory() {
    els.container.innerHTML = notes.map((note, i) =>
      `<div class="note-dir-item" data-index="${i}"><span class="note-dir-dot">\u25cf</span>${escapeHtml(truncate(note, 24))}</div>`
    ).join('');
    els.container.querySelectorAll('.note-dir-item').forEach(item => {
      item.addEventListener('click', () => focusNote(Number(item.dataset.index)));
    });
  }

  function focusNote(index) {
    const el = document.querySelector(`.floating-note[data-index="${index}"]`);
    if (el) {
      globalZIndex++;
      el.style.zIndex = globalZIndex;
      el.classList.add('note-flash');
      setTimeout(() => el.classList.remove('note-flash'), 500);
    }
  }

  /* ── Floating Notes ── */
  function renderFloating() {
    document.querySelectorAll('.floating-note').forEach(el => el.remove());
    const positions = getPositions();

    notes.forEach((note, i) => {
      const card = document.createElement('div');
      card.className = 'floating-note';
      card.dataset.index = i;
      card.innerHTML =
        `<div class="fn-header">` +
          `<span class="fn-title">${escapeHtml(truncate(note, 18))}</span>` +
          `<span class="fn-edit" data-index="${i}" title="edit">\u270e</span>` +
        `</div>` +
        `<div class="fn-body">${renderMarkdown(note)}</div>`;

      const pos = positions[i] || defaultPosition(i);
      card.style.left = `${pos.x}px`;
      card.style.top = `${pos.y}px`;

      // Double-click body to edit
      card.querySelector('.fn-body').addEventListener('dblclick', () => open(i));
      card.querySelector('.fn-edit').addEventListener('click', () => open(i));

      // Drag via header
      card.querySelector('.fn-header').addEventListener('mousedown', e => {
        if (e.target.classList.contains('fn-edit')) return;
        dragState = {
          card,
          index: i,
          offsetX: e.clientX - card.getBoundingClientRect().left,
          offsetY: e.clientY - card.getBoundingClientRect().top,
        };
        card.classList.add('dragging');
        globalZIndex++;
        card.style.zIndex = globalZIndex;
        e.preventDefault();
      });

      // Click brings to front
      card.addEventListener('mousedown', () => {
        globalZIndex++;
        card.style.zIndex = globalZIndex;
      });

      document.body.appendChild(card);
    });
  }

  function render() {
    renderDirectory();
    renderFloating();
  }

  /* ── Modal ── */
  function open(index) {
    editingIndex = index;
    els.editor.value = index === null ? '' : notes[index];
    els.remove.style.display = index === null ? 'none' : 'block';
    els.modal.classList.add('show');
    updatePreview();
    els.editor.focus();
  }

  function close() {
    els.modal.classList.remove('show');
    previewActive = false;
    const body = els.modal.querySelector('.modal-body');
    if (body) body.classList.remove('split');
    if (els.preview) els.preview.style.display = 'none';
    if (els.togglePreview) els.togglePreview.classList.remove('active');
  }

  function togglePreviewMode() {
    previewActive = !previewActive;
    const body = els.modal.querySelector('.modal-body');
    if (previewActive) {
      if (body) body.classList.add('split');
      if (els.preview) els.preview.style.display = 'block';
      if (els.togglePreview) els.togglePreview.classList.add('active');
      updatePreview();
    } else {
      if (body) body.classList.remove('split');
      if (els.preview) els.preview.style.display = 'none';
      if (els.togglePreview) els.togglePreview.classList.remove('active');
    }
  }

  function updatePreview() {
    if (!previewActive || !els.preview) return;
    els.preview.innerHTML = renderMarkdown(els.editor.value);
  }

  /* ── Init ── */
  function init() {
    render();

    // Global drag listeners (single pair for all notes)
    document.addEventListener('mousemove', e => {
      if (!dragState) return;
      dragState.card.style.left = `${e.clientX - dragState.offsetX}px`;
      dragState.card.style.top = `${e.clientY - dragState.offsetY}px`;
    });
    document.addEventListener('mouseup', () => {
      if (!dragState) return;
      dragState.card.classList.remove('dragging');
      const rect = dragState.card.getBoundingClientRect();
      const positions = getPositions();
      positions[dragState.index] = { x: Math.round(rect.left), y: Math.round(rect.top) };
      savePositions(positions);
      dragState = null;
    });

    els.add.addEventListener('click', () => open(null));

    els.save.addEventListener('click', () => {
      const text = els.editor.value.trim();
      if (!text) return;
      if (editingIndex === null) notes.push(text);
      else notes[editingIndex] = text;
      save();
      render();
      close();
    });

    els.remove.addEventListener('click', () => {
      if (editingIndex !== null) {
        // Clean up saved position for deleted note
        const positions = getPositions();
        delete positions[editingIndex];
        // Shift positions for notes after deleted one
        const shifted = {};
        Object.entries(positions).forEach(([k, v]) => {
          const idx = Number(k);
          if (idx > editingIndex) shifted[idx - 1] = v;
          else shifted[idx] = v;
        });
        savePositions(shifted);
        notes.splice(editingIndex, 1);
        save();
        render();
      }
      close();
    });

    els.close.addEventListener('click', close);
    els.modal.addEventListener('click', e => {
      if (e.target === els.modal) close();
    });

    // Preview toggle
    if (els.togglePreview) {
      els.togglePreview.addEventListener('click', togglePreviewMode);
    }

    // Live preview on editor input
    if (els.editor) {
      els.editor.addEventListener('input', () => {
        clearTimeout(previewDebounce);
        previewDebounce = setTimeout(updatePreview, 200);
      });
    }

    // Keyboard shortcuts in editor
    if (els.editor) {
      els.editor.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'b') { e.preventDefault(); wrapSelection('**', '**'); }
        if (e.ctrlKey && e.key === 'i') { e.preventDefault(); wrapSelection('*', '*'); }
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); wrapSelection('[', '](url)'); }
        if (e.ctrlKey && e.key === '`') { e.preventDefault(); wrapSelection('`', '`'); }
      });
    }
  }

  function wrapSelection(before, after) {
    const textarea = els.editor;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    textarea.value = text.substring(0, start) + before + selected + after + text.substring(end);
    textarea.selectionStart = start + before.length;
    textarea.selectionEnd = start + before.length + selected.length;
    textarea.focus();
    clearTimeout(previewDebounce);
    previewDebounce = setTimeout(updatePreview, 200);
  }

  root.notes = {
    init,
    all: () => notes.slice(),
  };
})();
