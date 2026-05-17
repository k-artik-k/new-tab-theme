(function () {
  const root = window.TabOS = window.TabOS || {};
  const storage = root.storage;
  const { pick, escapeHtml } = root.utils;
  const { appendOutput } = root.core;

  const FACT_CACHE_VERSION = 3;
  const FACT_LIBRARY = {
    science: [
      'A day on Venus is longer than a Venus year.',
      'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
      'Tardigrades can survive short exposure to the vacuum of space.',
      'Sound travels about 4.3 times faster in water than in air.',
      'The Mpemba effect describes cases where hot water freezes faster than cold water.',
      'A teaspoon of neutron star material would weigh billions of tons.',
      'Earth has moonquakes caused by tidal stress, thermal stress, and impacts.',
      'The human brain uses roughly 20 percent of the body energy budget.',
    ],
    tech: [
      'Ada Lovelace wrote an algorithm for the Analytical Engine in the 1840s.',
      'The first public website is still preserved at info.cern.ch.',
      'Git was created by Linus Torvalds in 2005.',
      'The first 1 GB hard drive weighed hundreds of kilograms.',
      'The QWERTY layout was designed for mechanical typewriters.',
      'A single bit flip in memory can be caused by cosmic radiation.',
      'Early Unix used short commands because teletypes were slow and tiring to use.',
      'The first webcam watched a coffee pot at the University of Cambridge.',
    ],
    lore: [
      'The Hampster Dance became one of the early viral pages of the web.',
      'The dancing baby animation spread through email and TV before social media existed.',
      'All your base are belong to us spread from a badly translated 1989 game intro.',
      'The word spam for junk mail was popularized by a Monty Python sketch.',
      'The million dollar homepage sold one million pixels of ad space in 2005.',
      'Peanut butter jelly time started as a Flash animation before becoming a wider meme.',
      'The blue screen of death became a cultural symbol because Windows failures were so visible.',
    ],
    contextual: [
      'Short command names make repeated workflows feel lighter over time.',
      'Local-first tools stay useful when the network is down.',
      'A new tab page works best when the first interaction is already the main interaction.',
      'Low-motion background effects are easier to live with than high-detail animation loops.',
      'A terminal UI feels fast when the command language is predictable.',
    ],
  };

  let mode = storage.getRaw(storage.keys.factMode) || 'mixed';
  let typeTimer = null;
  let cache = null;

  function bootCache() {
    const stored = storage.getJson(storage.keys.factCache, null);
    if (!stored || stored.version !== FACT_CACHE_VERSION) {
      cache = { version: FACT_CACHE_VERSION, categories: FACT_LIBRARY };
      storage.setJson(storage.keys.factCache, cache);
    } else {
      cache = { version: FACT_CACHE_VERSION, categories: { ...FACT_LIBRARY, ...stored.categories } };
    }
  }

  function contextFact() {
    const hour = new Date().getHours();
    if (hour < 6) return 'Late-night sessions benefit from fewer visual interrupts.';
    if (hour < 12) return 'Morning command habits work best when the first command is obvious.';
    if (hour < 18) return 'A small local dashboard can replace several browser tabs during deep work.';
    return 'Evening task lists are easier to finish when overdue and recurring work are visible.';
  }

  function getFact(selected = mode) {
    if (selected === 'context' || selected === 'contextual') return contextFact();
    const normalized = selected === 'weird' || selected === 'internet' ? 'lore' : selected;
    if (cache.categories[normalized]) return pick(cache.categories[normalized]);
    return pick(Object.values(cache.categories).flat());
  }

  function typeFact(text) {
    const target = document.getElementById('factText');
    clearInterval(typeTimer);
    target.textContent = '';
    let i = 0;
    typeTimer = setInterval(() => {
      target.textContent = text.slice(0, i);
      i++;
      if (i > text.length) clearInterval(typeTimer);
    }, 16);
  }

  function show(selected = mode) {
    typeFact(getFact(selected));
  }

  function setMode(next) {
    mode = next;
    storage.setRaw(storage.keys.factMode, mode);
    show();
  }

  function handle(words) {
    const sub = words[1];
    if (!sub || sub === 'next') {
      show();
      appendOutput(`fact mode: ${escapeHtml(mode)}`, 'info');
      return;
    }
    if (sub === 'mode') {
      const next = words[2];
      const valid = ['mixed', 'science', 'tech', 'weird', 'lore', 'context', 'contextual'];
      if (!valid.includes(next)) {
        appendOutput(`modes: ${valid.join(', ')}`, 'error');
        return;
      }
      setMode(next);
      appendOutput(`fact mode: ${escapeHtml(mode)}`, 'success');
      return;
    }
    if (sub === 'cache') {
      const count = Object.values(cache.categories).flat().length;
      appendOutput(`offline fact cache: ${count} facts in ${Object.keys(cache.categories).join(', ')}`, 'info');
      return;
    }
    appendOutput('usage: /fact, /fact mode science|tech|weird|context|mixed, /fact cache', 'error');
  }

  function init() {
    bootCache();
    show();
  }

  root.facts = {
    init,
    mode: () => mode,
    show,
    handle,
  };
})();
