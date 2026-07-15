(function () {
  const root = window.TabOS = window.TabOS || {};
  const storage = root.storage;
  const { escapeHtml } = root.utils;

  let notes = storage.getJson(storage.keys.notes, []);


  let editingIndex = null;
  let previewActive = false;
  let previewDebounce = null;

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

  function notesShouldBlur() {
    return !!storage.getJson(storage.keys.blurState, {}).notes;
  }

  function setBlurred(on) {
    els.panel.classList.toggle('blurred', on);
  }

  function decodeBasicEntities(value) {
    return String(value)
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  function sanitizeLinkHref(escapedUrl) {
    // Decode HTML entities introduced by escapeHtml, then validate protocol
    const raw = escapedUrl
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      // Percent-encode attribute-unsafe chars instead of HTML-escaping
      return url.href.replace(/"/g, '%22').replace(/'/g, '%27');
    } catch {
      return null;
    }
  }

  function renderMarkdown(md) {
    let html = escapeHtml(md);

    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${code.trim()}</code></pre>`);
    html = html.replace(/^(\|.+\|)\s*\n(\|[\s\-:|]+\|)\s*\n((?:\|.+\|\s*\n?)+)/gm, (_, header, sep, body) => {
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
    html = html.replace(/(?:^<li>.*<\/li>\n?)+/gm, match => `<ul>${match.replace(/\n/g, '')}</ul>`);
    html = html.replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, (_, text, url) => {
      const safeUrl = sanitizeLinkHref(url);
      if (!safeUrl) return text;
      return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/<\/(h[1-3]|pre|table|blockquote|hr|ul|div)><br>/g, '</$1>');
    html = html.replace(/<br><(h[1-3]|pre|table|blockquote|hr|ul|div)/g, '<$1');

    return html;
  }

  function truncate(text, len) {
    const first = text.split('\n')[0].replace(/^#+\s*/, '').replace(/\*\*/g, '');
    return first.length > len ? `${first.slice(0, len)}...` : first;
  }

  function render() {
    document.querySelectorAll('.floating-note').forEach(el => el.remove());
    els.container.innerHTML = notes.map((note, i) => {
      const lines = note.split('\n');
      const bodyText = lines.slice(1).join('\n').trim();
      return `<article class="note-card" data-index="${i}">` +
        `<div class="note-card-title">${escapeHtml(truncate(note, 30))}</div>` +
        (bodyText ? `<div class="note-card-body">${renderMarkdown(bodyText)}</div>` : '') +
      `</article>`;
    }).join('');
    els.container.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => open(Number(card.dataset.index)));
    });
    if (!notes.length) {
      els.container.innerHTML = '<div style="color:var(--fg2);font-size:10px;padding:8px 4px;opacity:0.6">no notes · try /cat "..."</div>';
    }
    setBlurred(notesShouldBlur());
    updateTitleCount();
  }

  function updateTitleCount() {
    const titleEl = document.getElementById('stickyTitle');
    if (titleEl) titleEl.textContent = `[ notes.md ]  [ ${notes.length} ]`;
  }

  function addNote(text) {
    if (!text || !text.trim()) return;
    notes.push(text.trim().slice(0, 20000));
    save();
    render();
  }

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

  function init() {
    render();

    els.add.addEventListener('click', () => open(null));
    els.save.addEventListener('click', () => {
      const text = els.editor.value.trim().slice(0, 20000);
      if (!text) return;
      if (editingIndex === null) notes.push(text);
      else notes[editingIndex] = text;
      save();
      render();
      close();
      updateTitleCount();
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
    if (els.togglePreview) els.togglePreview.addEventListener('click', togglePreviewMode);
    if (els.editor) {
      els.editor.addEventListener('input', () => {
        clearTimeout(previewDebounce);
        previewDebounce = setTimeout(updatePreview, 200);
      });
      els.editor.addEventListener('keydown', e => {
        if (e.ctrlKey && e.key === 'b') { e.preventDefault(); wrapSelection('**', '**'); }
        if (e.ctrlKey && e.key === 'i') { e.preventDefault(); wrapSelection('*', '*'); }
        if (e.ctrlKey && e.key === 'k') { e.preventDefault(); wrapSelection('[', '](url)'); }
        if (e.ctrlKey && e.key === '`') { e.preventDefault(); wrapSelection('`', '`'); }
      });
    }
  }

  root.notes = {
    init,
    all: () => notes.slice(),
    count: () => notes.length,
    setBlurred,
    add: addNote,
    openNew: () => open(null),
  };
})();
