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

  const els = {
    container: document.getElementById('notesContainer'),
    modal: document.getElementById('noteModal'),
    editor: document.getElementById('noteEditor'),
    add: document.getElementById('addNoteBtn'),
    save: document.getElementById('saveNoteBtn'),
    remove: document.getElementById('deleteNoteBtn'),
    close: document.getElementById('modalClose'),
  };

  function save() {
    storage.setJson(storage.keys.notes, notes);
  }

  function renderMarkdown(md) {
    return escapeHtml(md)
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n/g, '<br>');
  }

  function render() {
    els.container.innerHTML = notes.map((note, i) =>
      `<div class="note-card" data-index="${i}">${renderMarkdown(note)}</div>`
    ).join('');
    els.container.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => open(Number(card.dataset.index)));
    });
  }

  function open(index) {
    editingIndex = index;
    els.editor.value = index === null ? '' : notes[index];
    els.remove.style.display = index === null ? 'none' : 'block';
    els.modal.classList.add('show');
    els.editor.focus();
  }

  function close() {
    els.modal.classList.remove('show');
  }

  function init() {
    render();
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
  }

  root.notes = {
    init,
    all: () => notes.slice(),
  };
})();
