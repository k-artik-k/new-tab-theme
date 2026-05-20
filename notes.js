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

  /* ── Advanced Markdown Parser ── */
  function renderMarkdown(md) {
    let html = escapeHtml(md);

    // Code blocks (``` ... ```)
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

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr>');

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    // Headings (must be after blockquotes)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Checklists (before regular lists)
    html = html.replace(/^- \[x\] (.+)$/gm, '<div class="checklist-item"><input type="checkbox" checked disabled>$1</div>');
    html = html.replace(/^- \[ \] (.+)$/gm, '<div class="checklist-item"><input type="checkbox" disabled>$1</div>');

    // Bold & italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Inline code (but not inside <pre>)
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    // Lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Links
    html = html.replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

    // Line breaks
    html = html.replace(/\n/g, '<br>');

    // Clean up <br> after block elements
    html = html.replace(/<\/(h[1-3]|pre|table|blockquote|hr|ul|div)><br>/g, '</$1>');
    html = html.replace(/<br><(h[1-3]|pre|table|blockquote|hr|ul|div)/g, '<$1');

    return html;
  }

  /* ── Rendering ── */
  function render() {
    els.container.innerHTML = notes.map((note, i) =>
      `<div class="note-card" data-index="${i}">${renderMarkdown(note)}</div>`
    ).join('');
    els.container.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => open(Number(card.dataset.index)));
    });
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

  /* ── Draggable Panel ── */
  function initDraggable() {
    const panel = els.panel;
    if (!panel) return;

    const header = panel.querySelector('.sticky-header');
    if (!header) return;

    panel.classList.add('draggable');
    header.classList.add('drag-handle');

    // Restore saved position
    const savedPos = storage.getJson(storage.keys.notePanelPos, null);
    if (savedPos && typeof savedPos.x === 'number' && typeof savedPos.y === 'number') {
      panel.style.left = `${savedPos.x}px`;
      panel.style.top = `${savedPos.y}px`;
      panel.style.bottom = 'auto';
      panel.style.right = 'auto';
    }

    let dragging = false;
    let offsetX = 0, offsetY = 0;

    header.addEventListener('mousedown', e => {
      if (e.target.closest('.sticky-btn')) return; // don't drag on "+" button
      dragging = true;
      panel.classList.add('dragging');
      const rect = panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      let x = e.clientX - offsetX;
      let y = e.clientY - offsetY;

      // Snap to edges (within 20px)
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pw = panel.offsetWidth;
      const ph = panel.offsetHeight;
      if (x < 20) x = 16;
      if (y < 20) y = 16;
      if (x + pw > vw - 20) x = vw - pw - 16;
      if (y + ph > vh - 20) y = vh - ph - 16;

      panel.style.left = `${x}px`;
      panel.style.top = `${y}px`;
      panel.style.bottom = 'auto';
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      panel.classList.remove('dragging');
      // Save position
      const rect = panel.getBoundingClientRect();
      storage.setJson(storage.keys.notePanelPos, { x: Math.round(rect.left), y: Math.round(rect.top) });
    });

    // Z-index focus: clicking panel brings it to top
    panel.addEventListener('mousedown', () => {
      globalZIndex++;
      panel.style.zIndex = globalZIndex;
    });
  }

  /* ── Init ── */
  function init() {
    render();
    initDraggable();

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

    // Live preview on editor input (debounced)
    if (els.editor) {
      els.editor.addEventListener('input', () => {
        clearTimeout(previewDebounce);
        previewDebounce = setTimeout(updatePreview, 200);
      });
    }

    // Keyboard shortcuts in editor
    if (els.editor) {
      els.editor.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'b') {
          e.preventDefault();
          wrapSelection('**', '**');
        }
        if (e.ctrlKey && e.key === 'i') {
          e.preventDefault();
          wrapSelection('*', '*');
        }
        if (e.ctrlKey && e.key === 'k') {
          e.preventDefault();
          wrapSelection('[', '](url)');
        }
        if (e.ctrlKey && e.key === '`') {
          e.preventDefault();
          wrapSelection('`', '`');
        }
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
    // Trigger preview update
    clearTimeout(previewDebounce);
    previewDebounce = setTimeout(updatePreview, 200);
  }

  root.notes = {
    init,
    all: () => notes.slice(),
  };
})();
