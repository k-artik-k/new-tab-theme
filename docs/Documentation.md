# TabOS Documentation

## 1. Overview

### Purpose

TabOS is a Chrome MV3 extension that overrides the browser's new tab page with a terminal-style, local-first dashboard. It provides a command-line interface plus a set of widgets (calendar, todo list, sticky notes, pomodoro timer, rain/lightning background, fact bar, analog clock) and four lazy-loaded retro games. All persistent state is stored in `localStorage`; there are no network calls, accounts, or telemetry.

### Architecture

Vanilla JavaScript, no build step, no bundler, no module system beyond an IIFE-per-file pattern that attaches sub-modules to a shared global namespace `window.TabOS`. Each file wraps its logic in `(function () { ... })()` and reads/writes properties on `root = window.TabOS = window.TabOS || {}`. Script load order (declared in `index.html`) determines module availability: a later script can assume all earlier ones have already populated `root`.

### Technologies used

- HTML5 / CSS3 (custom properties for theming)
- Vanilla ES6+ JavaScript (no frameworks, no external JS dependencies)
- Canvas 2D API (rain effect, all four games)
- Web Audio API (procedural rain/thunder sound; no audio files)
- `localStorage` (all persistence)
- Google Fonts (`JetBrains Mono`, `Press Start 2P`) loaded via `<link>` in `index.html`
- Chrome Extension Manifest V3 (`chrome_url_overrides.newtab`)

### Folder structure

Flat structure, no subfolders for source files:

```
manifest.json
index.html
storage.js
core.js
config.js
layout.js
facts.js
rain.js
notes.js
todo.js
commands.js
script.js
game.js        (lazy-loaded, not referenced in index.html <script> tags)
style.css
README.md
_gitignore     (contains: .vscode/)
```

`manifest.json` references `icons/ter.png` under an `icons/` directory; that directory's contents were not provided in source and are not documented further here.

### Startup flow

`index.html` loads scripts in this fixed order: `storage.js`, `core.js`, `config.js`, `layout.js`, `facts.js`, `rain.js`, `notes.js`, `todo.js`, `commands.js`, `script.js`. `script.js` is the last script and calls `boot()` immediately as an IIFE side effect. `boot()` sequentially initializes every module, binds the command input, and then either plays a startup boot animation or shows the terminal immediately, depending on `config.startupAnim`.

## 2. Boot Process

Boot occurs entirely inside `script.js`'s `boot()` function, called unconditionally when `script.js` executes (there is no explicit "DOMContentLoaded" wrapper; the script tag is placed at the end of `<body>`, after all DOM elements it queries).

### Initialization sequence

1. `root.core.init()` — caches DOM references (already cached at module load via `core.js`'s top-level `dom` object), runs `updateClock()` and `updateUptime()` once, calls `renderCalendar()`, starts the clock/uptime `setInterval` timers (1000 ms each), registers a `visibilitychange` listener that pauses/resumes those intervals and re-renders the calendar, and registers `keydown`/`keyup` listeners on `Alt` that toggle the `alt-reveal` body class (used to peek through blurred panels).
2. `root.config.init()` — alias for `apply()`. Reads the config already loaded at module scope (`storage.loadConfig()`), normalizes it, sets the `--accent` CSS custom property, toggles the `theme-<name>` body class and `data-theme` attribute, updates the prompt user/host spans and terminal title element, calls `root.layout.applyTheme()` if the layout module is present, and populates the `#quickLinksBar` element with up to 12 `http(s)` shortcuts.
3. `root.layout.init()` — binds every entry in the internal `WIDGETS` array (adds a resize grip, marks drag handles), calls `applyTheme()` (applies saved per-theme widget geometry or clears it, applies widget visibility), and registers global `pointermove`/`pointerup` listeners plus a `resize` listener that re-applies the theme layout.
4. `root.facts.init()` — shows the first fact via the typewriter effect and registers a `visibilitychange` listener that re-shows a fact when the tab becomes visible again.
5. `root.rain.init()` — grabs the canvas/context, sizes it to the viewport, registers a `resize` listener, and calls `setEnabled(settings.enabled)` using the persisted rain settings (off by default).
6. `root.notes.init()` — renders existing notes as cards, and binds click handlers for add/save/delete/close, the modal overlay, the preview toggle button, and editor keyboard shortcuts.
7. `root.todo.init()` — stops any stale pomodoro that expired while the tab was closed, re-saves todos if normalization changed them, renders the todo/pomodoro panels, starts the 1-second pomodoro tick interval, registers a `visibilitychange` listener (detects clock skew and resets the pomodoro if detected), and binds filter buttons, the completed-list toggle, the add-task button/input, and the pomodoro start/stop buttons.
8. `root.commands.init()` — focuses the command input, restores any saved blur state (`restoreBlurState()`), and calls `root.config.apply()` again (redundant re-apply, harmless).
9. `bindInput()` — attaches all keyboard/pointer handling for the command input and autocomplete popup (see Section 4).
10. If `config.startupAnim !== false`, `runStartupAnimation()` plays the BIOS-style boot sequence; otherwise the terminal is immediately usable with no boot animation, though the terminal output area remains empty until the user types.

### Loaded modules

`storage`, `core`, `utils`, `config`, `layout`, `facts`, `rain`, `notes`, `todo`, `commands`, `shortcuts` are all present on `window.TabOS` after boot. `game` is not loaded at boot; it is injected on first use of `/game`.

### Configuration loading

Configuration is loaded once at `config.js` module-evaluation time via `storage.loadConfig()`, before `boot()` runs. `loadConfig()` reads the `termConfig` key, falls back to `DEFAULT_CONFIG` for any missing/mismatched-type field, and truncates `user`/`host`/`distro` to 50 characters.

### Storage initialization

`storage.js` defines the key registry (`keys`), all default value objects (`DEFAULT_CONFIG`, `DEFAULT_RAIN`, `DEFAULT_POMODORO`), and helper functions (`getRaw`, `setRaw`, `getJson`, `setJson`, `remove`, `loadConfig`, `saveConfig`, `loadRain`, `saveRain`, `loadPomodoro`, `savePomodoro`, `describe`). No explicit "first run" migration logic exists beyond each loader merging stored values over defaults.

### Theme loading

Handled by `config.apply()` (body class + CSS variable) and `layout.applyTheme()` (per-theme widget geometry and widget visibility). See Section 11.

### User initialization

There is no user account system. "User" refers only to the `config.user` identity string shown in the terminal prompt (`user@host`), editable via `/config user <value>`.

### Command registration

There is no dynamic command registration mechanism. Commands are hard-coded as `if (base === '...')` branches inside `handleSlash()` in `commands.js`, and the autocomplete `catalog` array is a separate, manually maintained list used only for suggestions (not for dispatch).

### Desktop creation

Not applicable — TabOS renders directly into the page body; there is no windowing desktop shell beyond the draggable/resizable widgets available in the `neo` theme (see Section 10).

### Terminal creation

The terminal DOM (`.terminal-window`, `#output`, `#cmdInput`, `#autocomplete`) is static markup in `index.html`; "creation" consists of `core.init()` caching references, `commands.init()` focusing the input, and (optionally) `runStartupAnimation()` populating `#output` with boot lines before clearing it and printing the welcome line.

## 3. Command Reference

All commands are optionally prefixed with `/`. A subset of top-level command names also work without the prefix (see `KNOWN_COMMANDS` in Section 4). Arguments below use `<required>`, `[optional]`, and `a|b` for alternatives, matching the style used in the source's own usage strings.

Commands other than `help`, `clear`, `time`, `history`, `config`, `shortcut`, `rain`, `fact`, `blur`, `cat`, `export`, `layout`, `widget`, the search/launch shortcuts, and the easter eggs are blocked in the `neo` theme unless `layoutTheme === 'terminal'`. Specifically, `game`, `todo`, `pomodoro`, and `reset` are in the `HEAVY_COMMANDS` list and are refused with `/<cmd> is only available in terminal theme.` when the active theme is not `terminal`.

---

### help

Description: Shows the command list, or a topic-specific subset.

Syntax: `/help [topic]`

Arguments: none

Optional arguments: `topic` — one of `todo`, `rain`, `config`. Any other value falls back to the main list.

Flags: none

Aliases: typing a bare `?` (no slash, no other characters) also invokes `showHelp()` with no topic.

Return value: none (writes to terminal output)

Output examples:
```
help / ?              commands
config                settings
g: <query>            google search
gpt <prompt>          ChatGPT
claude <prompt>       Claude AI
yt <query>            YouTube
cat [text]            create note
todo                  tasks (terminal only)
game                  play (terminal only)
rain on|off           rain
blur                  privacy
widget list|toggle    widgets
shortcut list         links
export                backup to clipboard
clear                 clear

/help todo, /help rain, /help config
```

Error messages: none — an unrecognized topic silently falls back to `main`.

Validation rules: none.

Permissions required: none.

Files or modules touched: `commands.js` (`showHelp`), `core.appendOutput`.

Internal workflow: Looks up `topic` in a hard-coded `compactHelp` object; joins the matching array with newlines; wraps in a `<pre>` block via `escapeHtml`.

Related commands: all commands listed in the output.

Edge cases: `/help` with no argument always shows `main` plus the topic hint suffix; topic views do not show the hint suffix.

Notes: This list is a curated subset, not a full command reference — several implemented commands (e.g. `/layout`, `/pomodoro`, easter eggs) are absent from it.

---

### clear

Description: Clears all terminal output.

Syntax: `/clear` or `/cls`

Arguments: none

Aliases: `cls`

Return value: none

Output examples: none (output area becomes empty)

Error messages: none

Validation rules: none

Files or modules touched: `commands.js`, directly sets `core.dom.output.innerHTML = ''`.

Internal workflow: Direct DOM mutation, no confirmation.

Related commands: none

Edge cases: Also clears boot-animation lines if triggered mid-animation (not typically reachable since input is disabled during boot unless skipped).

---

### time

Description: Prints the current time as shown in the top-bar clock.

Syntax: `/time`

Return value: none

Output examples: `10:42:07 PM`

Files or modules touched: `commands.js` reads `core.dom.clock.textContent` (populated by `core.updateClock()`).

Internal workflow: Simply echoes the already-rendered clock text, escaped.

Notes: Time format is 12-hour with AM/PM, zero-padded, defined in `core.js`'s `updateClock()`.

---

### history

Description: Shows the last 20 executed commands.

Syntax: `/history`

Return value: none

Output examples:
```
1. /todo list
2. /rain on
3. hello
```

Error messages: `no history yet.` (info style) when empty.

Files or modules touched: `commands.js` (`showHistory`), `core.state.history` (persisted under `cmdHistory`, capped at 80 entries by `core.saveHistory`).

Internal workflow: Slices the first 20 entries of `core.state.history` (most recent first), numbers them, wraps in `<pre>`.

Notes: Only commands recognized as "known" (see `KNOWN_COMMANDS`, shortcuts, `g:` queries, or `?`) are recorded into history; arbitrary unrecognized text and math expressions are *not* saved to history.

---

### config

Description: Shows or edits the identity, theme, accent, startup animation, and storage summary.

Syntax: `/config [subcommand] [args]`

Subcommands:

| Subcommand | Syntax | Effect |
|---|---|---|
| (none) | `/config` | Prints a full status summary |
| `reset` | `/config reset` | Resets all config fields to defaults |
| `user` | `/config user <value>` | Sets terminal prompt username |
| `host` | `/config host <value>` | Sets terminal prompt hostname |
| `distro` | `/config distro <value>` | Sets the distro identity string |
| `theme` | `/config theme <terminal\|neo\|list\|reset>` | Switches or inspects the layout theme |
| `accent` | `/config accent <preset\|#hex\|list\|reset>` | Sets the accent color |
| `startup` | `/config startup on\|off` | Toggles the boot animation |
| `storage` | `/config storage` | Lists all localStorage keys TabOS uses |
| `enable` | `/config enable <widget>` | Shows a widget (delegates to layout) |
| `disable` | `/config disable <widget>` | Hides a widget (delegates to layout) |

Return value: none

Output examples (`/config` with no args):
```
user: user
host: tabos
distro: tabos
theme: terminal
accent: # 39c5bb
layout edit: off
shortcuts: 14 active
rain: rain off, intensity 45, wind 105 deg @ 20, sound off, thunder on
facts: mixed
tasks: 0 active, 0 total
use /config theme <terminal|neo> or /config accent <color>
```

Error messages:
- `usage: /config <user|host|distro> <value>` if value missing.
- `unknown theme: <value>` if theme name invalid.
- `unknown accent: <value>` if accent invalid.
- `unknown widget: <value>. use /widget list` if `enable`/`disable` target is unrecognized.
- `terminal cannot be toggled.` if attempting `/config enable terminal` or `/config disable terminal`.
- `layout module not available.` (defensive fallback, not normally reachable).
- `config edits identity, theme, accent, startup, widgets, and storage info.` for any unrecognized subcommand.

Validation rules:
- `layoutTheme` must be a key of `LAYOUT_THEMES` (`terminal`, `neo`); otherwise reset to default.
- `accent` must match `/^#[0-9a-f]{3,8}$/i`; otherwise reset to default.
- Accent presets (`cyan, red, green, blue, magenta, yellow, orange, pink, purple, white`) are resolved to hex before validation.

Files or modules touched: `config.js`, `storage.js` (`termConfig` key), `layout.js` (`applyTheme`, `setWidgetVisible`), `root.shortcuts`.

Internal workflow: `handle(words, original)` dispatches on `words[1]`. Any mutating subcommand calls `save()`, which normalizes the config object, persists it via `storage.saveConfig`, and calls `apply()` to re-render the DOM.

Related commands: `/widget`, `/layout`.

Edge cases: `/config theme reset` resets only the theme field to default (not the whole config); `/config accent reset` likewise resets only the accent.

Notes: `/config storage` output is produced by `storage.describe()`, a static list of key descriptions, not a live read of `localStorage` sizes.

---

### widget

Description: Lists or toggles visibility of dashboard widgets (all except the terminal itself).

Syntax: `/widget [list|show|hide|toggle|reset] [name]`

Aliases: `/widgets` is equivalent to `/widget`.

Widgets: `calendar, todo, pomodoro, notes, facts, clock` (from `layout.js`'s `TOGGLE_WIDGETS`; the `terminal` widget exists internally but is excluded from this list and cannot be toggled).

Return value: none

Output examples:
```
calendar: on
todo: on
pomodoro: on
notes: on
facts: on
clock: on
```

Error messages:
- `widgets: calendar, todo, pomodoro, notes, facts, clock` + `usage: /widget show|hide|toggle <name>` when name missing/invalid.
- `usage: /widget list|show|hide|toggle|reset` for unrecognized action.

Files or modules touched: `commands.js` (`handleWidget`), `layout.js` (`isVisible`, `setWidgetVisible`, `toggleWidget`, `resetVisibility`, `widgets`), storage key `widgetVisibility`.

Internal workflow: `list` reads `layout.isVisible()` for each widget id; `show`/`on`, `hide`/`off`, `toggle` call the corresponding `layout` setter; `reset` clears the entire visibility map back to "all visible".

Related commands: `/config enable|disable <widget>` performs the same action through a different entry point.

Edge cases: Passing `terminal` as a name is rejected implicitly because it is not in `TOGGLE_WIDGETS`, producing the "widgets: ..." usage message rather than a specific error.

---

### shortcut

Description: Manages quick-launch shortcuts (built-in and user-defined).

Syntax: `/shortcut [list|add|delete|restore] [args]`

Aliases: `/shortcuts` is equivalent to `/shortcut`. `ls` is an alias for `list`; `set` is an alias for `add`; `remove`/`rm`/`del` are aliases for `delete`.

Subcommands:

| Subcommand | Syntax | Effect |
|---|---|---|
| `list` | `/shortcut list` | Lists all active shortcuts (built-in minus disabled, plus custom) |
| `add` | `/shortcut add <name> <url> [description]` | Adds/overwrites a custom shortcut |
| `delete` | `/shortcut delete <name>` | Removes a custom shortcut, or disables a built-in one |
| `restore` | `/shortcut restore <name>` | Re-enables a previously disabled built-in |

Return value: none

Output examples:
```
/yt  ->  YouTube
/gpt  ->  ChatGPT
...
1 built-in disabled.
```

Error messages:
- `usage: /shortcut add <name> <url> [desc]` if name or URL missing.
- `usage: /shortcut delete <name>` if name missing.
- `shortcut not found: <name>` if deleting an unknown name.
- `usage: /shortcut list|add|delete|restore` for unrecognized subcommand.

Validation rules: shortcut `name` is lowercased and stripped to `[a-z0-9_-]` characters. URL is prefixed with `https://` if it doesn't already start with `http://` or `https://`.

Files or modules touched: `commands.js`, storage keys `userShortcuts`, `disabledShortcuts`.

Internal workflow: Built-ins live in a hard-coded `BUILTIN_SHORTCUTS` object; `allShortcuts()` merges enabled built-ins with `userShortcuts` (custom shortcuts take precedence on name collision, since they are spread last). `add` also removes the name from `disabledShortcuts` if present. `delete` on a custom name removes it outright; `delete` on a built-in name adds it to `disabledShortcuts` instead of deleting the definition.

Related commands: typing the shortcut's bare name (e.g. `yt`, `/gh`) navigates to it directly (see Section 4).

Edge cases: Deleting a name that is neither custom nor built-in reports "shortcut not found". `/shortcut restore <name>` on a name not currently disabled is a silent no-op that still reports success.

Notes: Shortcuts with `http(s)://` URLs are also mirrored into the `neo` theme's `#quickLinksBar` (max 12), via `config.apply()`.

---

### rain

Description: Controls the animated rain/lightning canvas background and its procedural ambient audio.

Syntax: `/rain [status|on|off|toggle|sound|thunder|intensity|wind|preset] [args]`

Subcommands:

| Subcommand | Syntax | Effect |
|---|---|---|
| (none) / `status` | `/rain` | Prints current settings + usage hint |
| `on` / `off` | `/rain on` | Enables/disables the effect |
| `toggle` | `/rain toggle` | Flips enabled state |
| `sound` | `/rain sound on\|off\|toggle` | Enables/disables ambient audio |
| `thunder` | `/rain thunder on\|off` | Enables/disables lightning strikes |
| `intensity` | `/rain intensity <0-100>` | Sets drop density |
| `wind` | `/rain wind <direction\|degrees> [speed 0-100]` | Sets wind angle and speed |
| `preset` | `/rain preset mist\|calm\|storm` | Applies a bundled configuration and force-enables rain |

Return value: none

Output examples:
```
rain on, intensity 78, wind 135 deg @ 48, sound off, thunder on
use /rain on|off, /rain intensity 0-100, /rain wind <dir> <speed>, /rain sound on|off, /rain thunder on|off
```

Error messages:
- `usage: /rain sound on|off`
- `usage: /rain thunder on|off`
- `usage: /rain intensity <0-100>` (raw value missing or `NaN`)
- `usage: /rain wind left|right|north|south|degrees <0-100>` (unrecognized direction)
- `presets: mist, calm, storm` (unknown preset name)
- `unknown rain option.` for unrecognized subcommand
- `audio is not supported in this browser.` if `AudioContext`/`webkitAudioContext` is unavailable when enabling sound

Validation rules: `intensity` and `windSpeed` clamped 0–100. `windDirection` accepts named compass/relative words (`right/east/e`, `downright/se`, `down/south/s`, `downleft/sw`, `left/west/w`, `upleft/nw`, `up/north/n`, `upright/ne`) mapped to degrees, or a raw numeric value clamped 0–360.

Files or modules touched: `rain.js`, storage key `rainSettings`, Web Audio nodes (`AudioContext`, `BiquadFilterNode`, `GainNode`, `AudioBufferSourceNode`).

Internal workflow: `update(patch)` merges into module-scoped `settings`, persists via `storage.saveRain`, and adjusts the live audio gain. `setEnabled(on)` starts/cancels the `requestAnimationFrame` draw loop and shows/hides the canvas. Lightning bolts are procedurally generated line paths (`makeBolt`) drawn with a glow, each triggering a synthesized thunder sound (`playThunder`) via an exponential-decay sawtooth oscillator through a low-pass filter.

Presets:
```
mist:  intensity 18, wind 100deg @ 8,  thunder off
calm:  intensity 35, wind 105deg @ 16, thunder off
storm: intensity 78, wind 135deg @ 48, thunder on
```

Related commands: none.

Edge cases: Thunder only actually strikes when `settings.thunder` is true *and* `settings.intensity > 30`, with a randomized cooldown (180–600 frames) between strikes, gated by a `0.03` per-frame probability once cooldown expires. Drop spawn rate and max on-screen drop count scale with `intensity`.

Notes: The animation loop is throttled to roughly 50 FPS (`ts - lastFrame < 1000/50` early-return).

---

### fact

Description: Shows the next fact in the fact bar, using a typewriter animation.

Syntax: `/fact [next|mode|cache] [args]`

Subcommands:

| Subcommand | Syntax | Effect |
|---|---|---|
| (none) / `next` | `/fact` | Shows the next random fact for the current mode, prints the mode |
| `mode` | `/fact mode <mixed\|science\|tech\|weird\|lore\|context\|contextual>` | Changes the fact pool and immediately shows one |
| `cache` | `/fact cache` | Reports how many facts are loaded and which categories exist |

Return value: none

Output examples:
```
fact mode: mixed
```
```
fact library: 28 facts in science, tech, lore, contextual
```

Error messages: `modes: mixed, science, tech, weird, lore, context, contextual` if an invalid mode is given.

Validation rules: mode must be one of the listed values; `weird` and `internet` (as an input alias, only reachable programmatically since it's not in the whitelisted `valid` array for `/fact mode`) map to the `lore` pool internally.

Files or modules touched: `facts.js`, storage key `factMode`.

Internal workflow: `getFact(selected)` picks a random string from `FACT_LIBRARY[normalized]` (or a time-of-day-derived string for `context`/`contextual`, or a random fact from the flattened full library as a fallback). `typeFact(text)` clears any running interval and reveals the string one character every 16 ms.

Categories and counts (from `FACT_LIBRARY`): `science` (8), `tech` (8), `lore` (7), `contextual` (5) — 28 facts total.

Related commands: none.

Edge cases: `context`/`contextual` mode does not draw from the static library at all; it returns one of four fixed strings selected by `new Date().getHours()` (before 6, before 12, before 18, else evening).

---

### todo

Description: Full task manager — add, complete, delete, reorder, due dates, recurrence, and progress.

Syntax: `/todo [list|add|done|delete|move|due|recur|progress|clear-done] [args]`

Terminal-only: blocked in the `neo` theme (`HEAVY_COMMANDS`).

Subcommands:

| Subcommand | Syntax | Effect |
|---|---|---|
| `list` / `ls` | `/todo list [active\|done\|high\|low]` (default `active`) | Prints matching tasks |
| `add` | `/todo add <text> [!] [priority:high\|low] [due:DD-MM-YYYY\|today\|tomorrow] [recur:daily\|weekly\|monthly\|none] [NN%]` | Adds a task |
| `done` / `complete` / `toggle` | `/todo done <id>` | Toggles completion (or advances a recurring task's due date) |
| `delete` / `rm` / `remove` | `/todo delete <id>` | Deletes a task |
| `move` | `/todo move <from-id> <to-id>` | Reorders tasks (1-based positions) |
| `due` | `/todo due <id> <DD-MM-YYYY\|today\|tomorrow\|clear>` | Sets or clears a due date |
| `recur` | `/todo recur <id> none\|daily\|weekly\|monthly` | Sets recurrence |
| `progress` | `/todo progress <id> <0-100>` | Sets progress percent (auto-completes at 100) |
| `clear-done` | `/todo clear-done` | Deletes all completed tasks |

Return value: none

Output examples:
```
1. [ ] ! finish cleanup 50% due:27-06-2026 recur:weekly
```
```
task added: finish cleanup
```

Error messages:
- `usage: /todo add <task> [!] [due:DD-MM-YYYY] [recur:daily] [50%]` if text ends up empty after token stripping.
- `usage: /todo done <id>` / `usage: /todo delete <id>` if id not found.
- `usage: /todo move <from-id> <to-id>` if either id is not an integer.
- `usage: /todo due <id> <DD-MM-YYYY|today|tomorrow|clear>` if id not found.
- `invalid due date.` if the date string given doesn't parse and isn't `clear`.
- `usage: /todo recur <id> none|daily|weekly|monthly` if id not found or mode invalid.
- `usage: /todo progress <id> <0-100>` if id not found.
- `no tasks in this view.` for an empty `list` filter.
- `usage: /todo list|add|done|delete|move|due|recur|progress|clear-done` for unrecognized subcommand.

Validation rules:
- `priority` normalizes to `high` or `low` only.
- `due` accepts `DD-MM-YYYY`, `today`, or `tomorrow` (parsed via `parseDateValue`); any other string is rejected.
- `recur` normalizes to one of `none, daily, weekly, monthly`.
- `progress` clamped 0–100.
- Task `id` lookup (`byId`) first tries an exact match against the task's stable generated id (format `t<base36-timestamp><5 random base36 chars>`, optional leading `#` stripped), then falls back to interpreting the argument as a 1-based list position.

Files or modules touched: `todo.js`, storage key `todos`, `core.renderCalendar()` (due dates render as clickable calendar markers, debounced 300 ms after any save).

Internal workflow: `parseTodoInput(raw)` strips recognized inline tokens (`!`, `priority:`, `due:`, `recur:`, `NN%`) out of the raw text via regex replace, leaving the remaining words as the task title. `toggle(index)`: if the task is not done and has a non-`none` recurrence, completing it instead advances its due date via `nextRecurringDue()` and resets progress to 0 (the task is never marked done — it cycles). Otherwise, `done` flips and progress is set to 100 (on completion) or capped at 90 (on un-completion, so it doesn't visually read as done).

Related commands: `/pomodoro` (adjacent focus timer), calendar widget (click a due-marked day to list its tasks).

Edge cases: `move` accepts out-of-range or equal indices silently (a no-op guard in `reorder`). Recurring tasks that are toggled "done" while overdue advance from *today*, not from the stale due date, per `nextRecurringDue`'s `base < today ? today : base` logic.

Notes: Tasks are also reorderable via drag-and-drop directly in the `#todoList` panel, and filterable in the UI via `all/high/low` buttons (separate from the `/todo list` text filter, which additionally supports `done`).

---

### pomodoro

Description: Wall-clock-based focus timer with optional browser notification on completion.

Syntax: `/pomodoro [start|pause|stop|status] [minutes]`

Terminal-only: blocked in the `neo` theme.

Subcommands:

| Subcommand | Syntax | Effect |
|---|---|---|
| `start` | `/pomodoro start [minutes]` | Starts (or resumes) the timer; sets a new duration if minutes given |
| `pause` | `/pomodoro pause` | Freezes the remaining time |
| `stop` / `reset` | `/pomodoro stop` | Stops and resets remaining time to the full duration |
| `status` (default) | `/pomodoro status` | Reports running state and time left |

Return value: none

Output examples: `pomodoro started.`, `pomodoro paused.`, `pomodoro stopped.`, `pomodoro running: 24m 58s`

Error messages: `usage: /pomodoro start [minutes], /pomodoro pause, /pomodoro stop, /pomodoro status` for unrecognized subcommand.

Validation rules: `minutes` clamped 1–180 when provided; otherwise the previous duration (default 25 minutes / 1500 seconds) is kept.

Files or modules touched: `todo.js`, storage key `pomodoro`, `Notification` Web API (best-effort, requested on first `start` if permission is `default`).

Internal workflow: Timing is computed from an absolute `endAt` timestamp rather than a decrementing counter, so it survives tab suspension; `remaining()` returns `Math.ceil((endAt - Date.now())/1000)` while running. `tickPomodoro()` runs every second; on reaching zero it stops the timer, appends `pomodoro complete. take a clean break.`, and fires a `Notification` if permission is `granted`. On tab-visibility restore, if the computed remaining time is negative or exceeds the configured duration (indicating a system clock change), the timer is force-stopped with `pomodoro reset: clock change detected.`.

Related commands: `/todo` (shares the same module and panel area).

Edge cases: Calling `start` while already running with no `minutes` argument simply resumes from the current remaining time (does not restart).

---

### game

Description: Lazy-loads `game.js` (only once) and launches one of four canvas games in a full-screen overlay.

Syntax: `/game <chicken|snake|pacman|tetris> [difficulty]`

Terminal-only: blocked in the `neo` theme.

Arguments: `name` (required, defaults to `chicken` if omitted entirely, i.e. bare `/game`); `difficulty` (only meaningful for `chicken`; defaults to `medium`).

Return value: none

Output examples: `launching chicken easy...`

Error messages: `unknown game: <name>. available: chicken, snake, pacman, tetris`; `failed to load game module.` if the dynamic `<script src="game.js">` fails to load or does not define `window.startGame`.

Validation rules: `name` must be one of the four allowed values (case-normalized to lowercase before comparison).

Files or modules touched: `commands.js` (`launchGame`, `loadGameModule`), `game.js` (injected `<script data-lazy-module="game">`), and the full `#gameOverlay` DOM subtree in `index.html`.

Internal workflow: `loadGameModule()` checks whether `window.startGame` already exists; if not, it removes any stale `<script data-lazy-module="game">` tag, appends a fresh one pointing at `game.js`, and resolves a promise on `onload` (rejecting on `onerror` or if `startGame` still isn't defined). Once loaded, `window.startGame(game, option)` is called after a 160 ms delay.

Related commands: none. In-game: `ESC` exits to the terminal from any state; `SPACE` starts/restarts.

Edge cases: `difficulty` is silently ignored for `snake`, `pacman`, and `tetris` — only `chicken` reads it.

---

### blur

Description: Toggles a visual blur over privacy-sensitive panels (notes, todo, terminal output, fact bar), for screen-share safety.

Syntax: `/blur [notes|todo|terminal|facts] [on|off]`

Return value: none

Output examples: `blur enabled.`, `notes blur disabled.`, `all blur disabled.`

Error messages: `usage: /blur [notes|todo|terminal|facts] [on|off]` for an unrecognized target.

Files or modules touched: `commands.js` (`handleBlur`, `blurTargets`, `setBlurred`, `saveBlurState`, `restoreBlurState`), `notes.js` (`setBlurred`, used specifically for the notes panel), storage key `blurState`.

Internal workflow: With no arguments, toggles all four targets based on whether every target group is currently fully blurred (`allBlurred`). `/blur all off` force-clears every target. A named target with `on`/`off` (default `on` if omitted) toggles just that group. State is persisted as a per-target boolean map and restored on `commands.init()`.

Related commands: none directly, but interacts with `alt-reveal` (holding `Alt` peeks through any blurred element without disabling blur — implemented in `core.js`'s keydown/keyup listeners plus a corresponding CSS rule).

Edge cases: The `notes` target is special-cased to delegate to `root.notes.setBlurred`, which also blurs any currently-open floating note elements, in addition to the sticky panel itself.

---

### export

Description: Copies all local data to the clipboard as JSON, after a Y/N confirmation.

Syntax: `/export`

Return value: none (side effect: clipboard write)

Output examples: `export all data (notes, tasks, config) to clipboard? type Y/N to confirm.` then, on `Y`: `data copied to clipboard as JSON.`

Error messages: `clipboard access denied. check browser permissions.` if `navigator.clipboard.writeText` rejects. `cancelled.` if the user answers `N` (or anything other than `y`/`yes`).

Files or modules touched: `commands.js` (`handleExport`, `confirm`), `notes.js` (`all()`), `todo.js` (`all()`), `config.js` (`get()`), in-module `userShortcuts`.

Internal workflow: Uses the shared `confirm(message, callback)` gate (see Section 4) to require a `Y`/`yes` reply before building `{ notes, todos, shortcuts, config }` and writing `JSON.stringify(data, null, 2)` to the clipboard.

Related commands: `/reset` (also confirmation-gated, destructive counterpart).

Edge cases: Only `userShortcuts` are exported, not the merged built-in list.

---

### reset

Description: Wipes every TabOS `localStorage` key and reloads the page, after a Y/N confirmation.

Syntax: `/reset`

Terminal-only: blocked in the `neo` theme.

Return value: none (triggers `location.reload()`)

Output examples: `this will erase all data. type Y to confirm, N to cancel.` then, on `Y`: `resetting all data...` followed by a page reload ~600 ms later.

Error messages: `cancelled.` on any non-affirmative answer.

Files or modules touched: `commands.js` (`handleReset`, `confirm`), every key in `storage.keys` (removed via `localStorage.removeItem`).

Internal workflow: Confirmation-gated; on `Y`, iterates `Object.values(storage.keys)` and removes each, then reloads after a short delay so the "resetting..." message is visible.

Related commands: `/export` (recommended before running this).

Edge cases: None of the removed keys are validated to exist first; `removeItem` is a no-op for absent keys.

---

### cat

Description: Creates a sticky note, or opens a blank note editor if no text is given.

Syntax: `/cat [text]`

Return value: none

Output examples: `note created: finish the report draft...` (truncated to 40 chars + ellipsis if longer)

Error messages: none directly; if the notes module is unexpectedly unavailable, `notes module not available.`

Files or modules touched: `commands.js` (`handleCat`), `notes.js` (`add`, `openNew`).

Internal workflow: Locates the word `cat` in the original (non-lowercased) command line via regex and takes everything after it as the note text; empty text opens the modal editor instead of creating a note directly.

Related commands: none. The notes panel's `+` button performs the equivalent of `/cat` with no text.

Edge cases: Note text is trimmed and capped at 20,000 characters in `notes.add`/the modal save handler.

---

### layout

Description: Resets or unlocks the free-form widget layout used by the `neo` theme.

Syntax: `/layout reset` or `/layout edit on|off`

Return value: none

Output examples: `layout reset for this theme.`, `layout edit: on`

Error messages: `usage: /layout reset, /layout edit on|off` for missing/invalid arguments. `terminal theme is locked.` if attempting `/layout edit on` while the active theme is `terminal`.

Files or modules touched: `commands.js` (`handleLayout`), `layout.js` (`resetTheme`, `setEditMode`).

Internal workflow: `reset` deletes the saved widget geometry for the *current* theme only (from the `widgetLayout` storage key) and re-applies it. `edit on|off` sets `config.layoutEdit` and re-applies the theme, which toggles the `layout-edit` body class enabling/disabling drag handles and resize grips.

Related commands: `/config theme`, `/widget`.

Edge cases: `/layout edit on` is refused specifically for the `terminal` theme (positions are fixed there by design), but `/layout edit off` is not similarly restricted (it's simply a no-op if already off).

---

### Search & launch commands

These share a pattern: they require at least one additional word after the command name, else they fall through to other handling (or are treated as unrecognized).

#### g: / g

Description: Opens a Google search.

Syntax: `g: <query>` or `/g <query>`

Output: `search: "<query>"` then navigates to `https://www.google.com/search?q=<query>` after 160 ms.

Error messages: `usage: g: <query>` if `g:` prefix used with no query text.

Notes: `g:` is handled specially at the very top of `handle()` before slash-command dispatch, so it works with or without a leading `/`. The `/g <query>` slash form is handled separately inside `handleSlash`.

#### gpt / claude / yt / rd

| Command | Syntax | Destination |
|---|---|---|
| `/gpt <prompt>` | search-style query param | `https://chatgpt.com/?q=<prompt>` |
| `/claude <prompt>` | query param `q` | `https://claude.ai/new?q=<prompt>` |
| `/yt <query>` | search results | `https://www.youtube.com/results?search_query=<query>` |
| `/rd <subreddit>` | strips a leading `r/` if present | `https://www.reddit.com/r/<subreddit>` |

All four route via `core.routeTo(url, message)`, which validates the URL starts with `http://` or `https://` (always true here since URLs are hard-coded) before navigating after a 160 ms delay.

Edge cases: each requires at least 2 space-separated words in the original command; a bare `/gpt` with no prompt does not navigate and falls through toward the generic "command not found" path (there is no explicit usage message for these four).

---

### Easter eggs

All are triggered by typing the bare word, with or without a leading `/`, and are matched inside `handleSlash`'s easter-egg block.

| Trigger | Behavior |
|---|---|
| `sudo` | Outputs `nice try. you're not root here.` (error style) |
| `exit` | Outputs `there is no escape.`, briefly overlays a `.void-overlay` element with `...` text for 2.5s |
| `hello` / `hi` | Random pick from 6 greetings (`hey there! 👋`, `hello, human.`, `sup.`, `greetings, traveler.`, `yo.`, `*waves*`) |
| `coffee` | Outputs `brewing... ☕`, temporarily overrides `--accent` to `#6f4e37` for 1.5s, then restores the previous computed value |
| `42` | Outputs `the answer to life, the universe, and everything.` |
| `hack` | 8-line animated scroll of random Latin/digit/katakana/block characters at 80ms/line, then `access granted.` |
| `matrix` | 6-line animated katakana rain scroll at 60ms/line, then `wake up, Neo...` |
| `fortune` | Random pick from 8 programmer "fortunes," prefixed with 🥠 |
| `xkcd` | Random pick from 6 programmer-culture one-liners |
| `rm -rf /` or `rm -rf` | Outputs `deleting system files...`, shakes the page (`transform: translateX`) for ~14 steps at 40ms, then `just kidding. nice try though.` |

Notes: None of these are documented in `/help`. `rm -rf /` and `rm -rf` are matched by exact lowercase string, not by the `base` (first word) token, so they must be typed as a whole phrase.

## 4. Terminal Behavior

### Autocomplete

Triggered when the input value starts with `/` and has length > 1 (`script.js`, `input` event listener). `root.commands.completions(query)` matches the typed text (with any leading `/` stripped, case-insensitively) against two sources: the manually maintained `catalog` array (usage strings like `config theme <name>`) and every active shortcut name. Matching uses `patternMatches(pattern, query)`, which does word-by-word prefix matching and treats a catalog pattern's final token as an open wildcard if it starts with `<`, starts with `[`, or contains `|`. Results are capped at 14 entries. Selecting an entry (`Tab`, or clicking an item) inserts `/<usage-with-placeholder-stripped>` plus a trailing space (unless the usage string already ends in a space).

### History

Up to 80 executed commands are kept, most-recent-first, in the `cmdHistory` `localStorage` key. Only commands considered "known" are recorded (see below); free-text unknown commands and evaluated math expressions are not. `ArrowUp`/`ArrowDown` cycle through history when the autocomplete popup is not open; when it is open, the same keys instead move the autocomplete selection.

### Parsing

Input is trimmed and, if non-empty, tested in this priority order inside `handle(raw)`:

1. If a Y/N confirmation is pending (see below), the input is consumed as the confirmation answer regardless of its content.
2. Exact string `?` → `showHelp()`.
3. Starts with `/` → strip the slash and dispatch via `handleSlash`.
4. Matches `/^g:\s*/i` → Google search shortcut.
5. `tryMath(command)` — if the string parses as a pure arithmetic expression (only digits, whitespace, and `+ - * / ( ) . % ^` characters, containing at least one operator), the result is printed as `= <result>` and no further matching occurs.
6. First word matches `KNOWN_COMMANDS`, or the whole trimmed lowercase string equals `rm -rf /` / `rm -rf` → dispatched via `handleSlash` as if slash-prefixed.
7. Exact lowercase match against an active shortcut name → navigate.
8. Otherwise → `unknown command: <input>. type /help`.

`KNOWN_COMMANDS`: `help, clear, cls, time, history, layout, widget, widgets, config, shortcut, shortcuts, rain, fact, todo, pomodoro, game, blur, reset, cat, export, sudo, exit, hello, hi, coffee, hack, matrix, fortune, xkcd, 42, yt, gpt, claude, rd, g`.

### Quotations

Not implemented. Command-line tokenization is plain whitespace-splitting (`split(/\s+/)`); there is no support for quoted arguments containing spaces. Multi-word values (e.g. shortcut descriptions, todo text, note text) are captured by slicing the *original* command-line string after a matched keyword, not by quote-parsing.

### Escaping

User-supplied text rendered into the DOM via `innerHTML` is passed through `escapeHtml()` (escapes `& < > " '`) before insertion in `appendOutput` call sites. `echoCommand()` uses `textContent`, which is inherently safe. `notes.js`'s markdown renderer escapes the raw text first, then re-introduces a constrained set of HTML tags via regex substitution. `todo.js`'s `createItem` builds task rows using `createElement`/`textContent` rather than `innerHTML`, explicitly to avoid injection (per an inline code comment).

### Variables

Not implemented. There is no shell-variable or environment-variable substitution syntax for user input.

### Aliases

Command *name* aliases exist (e.g. `cls` for `clear`, `ls` for `shortcut list`) but there is no user-facing mechanism to define new command aliases. Shortcut names function as navigation aliases (see `/shortcut`).

### Recursive parsing / nested commands

Not implemented. There is no sub-shell, command substitution, or nested command syntax.

### Piping

Not implemented.

### Redirection

Not implemented.

### Command execution order

Single command per `Enter` keypress; execution is synchronous except where a command explicitly uses `setTimeout` for a delayed UI effect (e.g. navigation after `routeTo`, boot animation steps). There is no queuing of multiple commands from one input line.

### Priority rules

See the "Parsing" ordered list above — Y/N confirmation intercepts everything, then `?`, then `/`-prefixed dispatch, then `g:`, then math, then known bare commands, then shortcuts, then the fallback error.

### Error handling

Errors are surfaced as terminal output lines styled with the `error` CSS class (red-ish text), returned as strings from each handler rather than thrown as JavaScript exceptions. There is no global try/catch wrapper around command dispatch visible in `commands.js`; malformed input is expected to be caught by each handler's own validation branches.

### Y/N confirmation gate

A single shared mechanism, `confirm(message, callback)` in `commands.js`, is used by both `/export` and `/reset`. While a confirmation is pending: the input field is disabled and re-enabled shortly after with a `type Y/N...` placeholder; any further command entered is treated purely as the confirmation answer (`y`/`yes` → runs the callback, anything else → `cancelled.`); attempting to start a second confirmation while one is pending is rejected with `answer the pending confirmation first.`.

## 5. File System

Not implemented. TabOS has no virtual or real filesystem abstraction. There are no `pwd`, `ls` (filesystem), `cd`, `mkdir`, `touch`, `rm` (filesystem), `cp`, `mv`, `rename`, `write`, `append`, or `tree` commands. The `cat` command (Section 3) is a note-creation shortcut, not a file-read command, and does not accept a path argument. The `ls` token that does exist is only an alias for `/shortcut list`. There are no hidden files, permissions, path resolution, or relative/absolute path concepts anywhere in the source. All "files" a user interacts with are conceptual (notes, tasks) and are addressed by generated IDs or list positions, not paths.

## 6. Environment Variables

Not implemented in the traditional shell sense. TabOS has no `process.env`-style environment variable system and no user-facing `export VAR=value` / `$VAR` syntax. The closest analogues are the persisted configuration fields in `storage.js`'s `DEFAULT_CONFIG`, which function as global settings rather than environment variables:

| "Variable" | Default | Purpose | Set via | Read by |
|---|---|---|---|---|
| `user` | `'user'` | Terminal prompt username | `/config user <value>` | `config.apply()` (prompt/title DOM), `script.js` welcome message |
| `host` | `'tabos'` | Terminal prompt hostname | `/config host <value>` | `config.apply()` |
| `distro` | `'tabos'` | Distro identity label | `/config distro <value>` | `/config` summary output only |
| `accent` | `'#39c5bb'` | Accent CSS color | `/config accent <preset\|hex>` | `--accent` CSS variable |
| `layoutTheme` | `'terminal'` | Active theme | `/config theme <name>` | `config.apply()`, `layout.js` throughout |
| `layoutEdit` | `false` | Whether neo-theme widgets are draggable | `/layout edit on\|off` | `layout.canEditLayout()` |
| `startupAnim` | `true` | Whether the BIOS boot animation plays | `/config startup on\|off` | `script.js` `boot()` |

These are all stored together under the single `termConfig` `localStorage` key, not as individually namespaced environment variables.

## 7. Configuration System

### Themes

Two themes: `terminal` (default, fixed widget positions, dark high-contrast palette) and `neo` (pastel minimal palette, movable/resizable widgets). Switching is via `/config theme <name>`. Theme choice is stored in `config.layoutTheme` and drives both `config.apply()` (body class, CSS variable) and `layout.applyTheme()` (per-theme widget geometry and drag/resize availability).

### Startup settings

`config.startupAnim` (boolean) controls whether `runStartupAnimation()` plays on load. Toggled via `/config startup on|off`.

### Preferences

All preferences live in the single `termConfig` object: `user`, `host`, `distro`, `accent`, `layoutTheme`, `layoutEdit`, `startupAnim`. There is no separate "preferences" store beyond this and the domain-specific settings objects (`rainSettings`, `factMode`, `pomodoro`, `widgetLayout`, `widgetVisibility`, `blurState`).

### Storage keys

See Section 12 for the full table. `/config storage` prints a static description of every key (from `storage.describe()`), not a live dump of stored values.

### localStorage usage

Every persisted value is JSON-encoded (via `JSON.stringify`/`JSON.parse` in `storage.setJson`/`storage.getJson`, or raw strings via `getRaw`/`setRaw` for the single-value `factMode` key). Reads are wrapped in try/catch (`safeJson`) and fall back to a caller-supplied default on any parse failure.

### JSON structures

```
termConfig:      { user, host, distro, accent, layoutTheme, layoutEdit, startupAnim }
rainSettings:     { enabled, intensity, windDirection, windSpeed, sound, thunder }
pomodoro:         { duration, remaining, running, endAt }
todos:            [ { id, text, done, priority, due, recur, progress, createdAt }, ... ]
stickyNotes:      [ "<markdown string>", ... ]
userShortcuts:    { <name>: { url, desc }, ... }
disabledShortcuts:[ <name>, ... ]
cmdHistory:       [ "<command string>", ... ]  (max 80)
widgetLayout:     { <themeName>: { <widgetId>: { x, y, w, h, z } } }
widgetVisibility: { <widgetId>: <boolean> }
blurState:        { notes, todo, terminal, facts }  (booleans)
chickenLeaderboard:[ { score, date }, ... ]  (max 10, sorted descending)
```

### Default values

See Section 6's table for `termConfig` defaults. `rainSettings` defaults: `enabled:false, intensity:45, windDirection:105, windSpeed:20, sound:false, thunder:true`. `pomodoro` defaults: `duration:1500, remaining:1500, running:false, endAt:null` (1500 seconds = 25 minutes).

## 8. Built-in Applications

### Terminal / command shell

Purpose: primary interface for every feature. Launch: always present (no launch command). Internal workflow: see Sections 3–4. Supported actions: all documented commands. Dependencies: `core.js`, `commands.js`, `script.js`. Limitations: single-line input, no quoting, no piping (Section 4).

### Calendar widget

Purpose: shows the current month and marks days with due tasks. Launch: always visible (togglable via `/widget hide calendar`). Internal workflow: `core.renderCalendar()` builds a Monday-first grid for the current month via `new Date(year, month, 1).getDay()` offset math, marks `today` and weekend columns, and cross-references `root.todo.all()` (cached by `todoVersion`) to flag days with pending due dates; clicking such a day prints the due task titles to the terminal. Supported actions: click a due-marked day. Dependencies: `todo.js` (optional — degrades to no due markers if absent). Limitations: only shows the current calendar month; no navigation to other months.

### Todo / task manager

Purpose: task tracking with priority, due dates, recurrence, and progress. Launch: `/todo` or the `+` button in the panel. Internal workflow: see the `/todo` command reference. Supported actions: add, complete, delete, reorder (drag or `/todo move`), filter by `all/high/low` (UI buttons) or `active/done/high/low` (`/todo list`), due-date management, recurrence, progress tracking, bulk-clear completed. Dependencies: `core.js` (calendar refresh), `storage.js`. Limitations: no sub-tasks, no tags beyond priority, no search.

### Pomodoro timer

Purpose: wall-clock focus timer. Launch: `/pomodoro start` or the panel's start/stop buttons. Internal workflow: see the `/pomodoro` command reference. Supported actions: start (with optional custom minutes), pause, stop, status. Dependencies: `Notification` Web API (optional, best-effort permission request). Limitations: single timer instance; no multiple concurrent timers, no long-break/short-break cycle logic.

### Sticky notes

Purpose: markdown-capable note cards. Launch: `/cat [text]` or the `+` button. Internal workflow: notes are stored as raw markdown strings; `renderMarkdown()` converts a constrained markdown subset to sanitized HTML for card bodies and the live preview pane. Supported actions: create, edit, delete, live preview toggle, keyboard formatting shortcuts (`Ctrl+B/I/K/` backtick `). Dependencies: none beyond `core.js` utilities. Limitations: no note search, no folders/tags, no note export beyond the global `/export`, 20,000-character cap per note, links restricted to `http`/`https` protocols only.

### Rain / lightning background

Purpose: animated ambient canvas effect with procedural sound. Launch: `/rain on` or `/rain preset <name>`. Internal workflow: see the `/rain` command reference. Supported actions: on/off, intensity, wind direction/speed, sound toggle, thunder toggle, presets. Dependencies: Canvas 2D, optionally Web Audio API. Limitations: audio requires user gesture to resume in most browsers (handled defensively with `.catch(() => {})` on `resume()`/`start()` calls, silently no-op-ing on failure); no snow or other weather types.

### Fact bar

Purpose: rotating trivia/tip strip with typewriter animation. Launch: always visible; `/fact` cycles it. Internal workflow: see the `/fact` command reference. Supported actions: next fact, mode switch, cache size query. Dependencies: none. Limitations: static, hard-coded fact library (28 entries); no way to add custom facts.

### Games (Chicken Defender, Snake, Pacman, Tetris)

Purpose: retro arcade games as a new-tab easter feature. Launch: `/game <name> [difficulty]`. Internal workflow: see Section 3's `/game` entry and Section 16. Supported actions: full play loop per game, `ESC` to quit, `SPACE` to (re)start, a shared 10-entry high-score leaderboard for Chicken Defender only. Dependencies: `game.js` (lazy-loaded), Canvas 2D. Limitations: no leaderboard for snake/pacman/tetris; no pause function beyond `ESC` (which fully exits, discarding progress); Pacman ghost AI is a simplified greedy/scatter heuristic, not the original arcade's per-ghost personality algorithms; Tetris has no hold/next-piece preview, no soft-drop scoring, no wall-kicks on rotation (rotation is rejected outright on collision).

## 9. Keyboard Shortcuts

| Shortcut | Action | Where it works | Conditions |
|---|---|---|---|
| `Enter` | Execute the typed command and clear the input | Command input | Always |
| `ArrowUp` | Move up in autocomplete list, or recall older history | Command input | Autocomplete open → moves selection; else moves through history |
| `ArrowDown` | Move down in autocomplete list, or recall newer history | Command input | Same as above |
| `Tab` | Accept the highlighted autocomplete suggestion | Command input | Autocomplete open |
| `Escape` | Close the autocomplete popup | Command input | Autocomplete open |
| Any single printable character (no Ctrl/Alt/Meta) | Refocuses the command input | Anywhere in the document | Not while focus is in the note editor or the todo quick-add input |
| `Alt` (hold) | Reveals content underneath any blurred panel (`alt-reveal` class) | Document-wide | While a blur is active |
| `Ctrl+B` | Wrap selection in `**bold**` | Note editor textarea | Note modal open |
| `Ctrl+I` | Wrap selection in `*italic*` | Note editor textarea | Note modal open |
| `Ctrl+K` | Wrap selection in `[text](url)` | Note editor textarea | Note modal open |
| `` Ctrl+` `` | Wrap selection in `` `code` `` | Note editor textarea | Note modal open |
| `Enter` | Add task from the quick-add input | Todo quick-add input | Todo input row visible |
| `Escape` | Hide the todo quick-add input and refocus the terminal | Todo quick-add input | Todo input row visible |
| `WASD` / Arrow keys | Move | Chicken Defender / Snake / Pacman | Game active |
| `SPACE` or right-click | Shoot | Chicken Defender | Game active, `playing` state |
| `SPACE` | Start / restart | Chicken Defender / arcade games | `start`, `over`, `win`, or `arcade-over` state |
| `ArrowUp` | Rotate piece | Tetris | Game active |
| `SPACE` | Hard drop | Tetris | Game active |
| `ESC` | Quit to terminal | Any game | Game active |

## 10. Window System

TabOS does not implement a general-purpose window manager (no minimize/maximize/close chrome, no taskbar). What exists is a lightweight drag/resize system for dashboard *widgets*, active only in the `neo` theme with layout editing turned on (`/layout edit on`).

### Window creation

Widgets are static DOM elements defined in `index.html`; there is no dynamic window instantiation. `layout.js`'s `bindWidget(def)` augments each of the seven entries in `WIDGETS` (`terminal, calendar, todo, pomodoro, notes, facts, clock`) with a resize grip element and marks its designated handle element as draggable, once per element (`el.dataset.layoutBound` guard prevents double-binding).

### Dragging

`startDrag(e, el, def)` fires on `pointerdown` over a widget's drag handle, but only if `canEditLayout()` is true (theme is `neo` and `config.layoutEdit === true`), the primary mouse button was used, and the pointer isn't over an interactive child element (buttons, inputs, textareas, links, the todo list, the notes container, note-edit affordances, or the resize grip itself — checked via `closest()`). Movement beyond a 3px threshold marks the drag as "moved"; the element is repositioned live via `applyGeometry`, clamped to the viewport by `viewportClamp`.

### Resizing

`startResize(e, el, def)` fires on `pointerdown` over the widget's resize grip (a small element added to the bottom-right by `ensureGrip`). Uses the same 3px movement threshold and viewport clamping as dragging. The clock widget (`square: true` in its `WIDGETS` entry) is constrained to always resize with equal width and height (`Math.max(w, h)` applied to both dimensions).

### Focus

Not implemented as a distinct concept beyond z-index bumping — see below. There is no visual "focused window" state.

### Minimize / Maximize / Close

Not implemented. Widgets can only be shown/hidden entirely (`/widget hide <name>` / `/widget show <name>`), not minimized or maximized.

### Z-index

A module-scoped counter `z` (initialized to 30) is incremented and assigned to any widget the moment a drag or resize interaction begins, bringing it to the front. The value is persisted as part of that widget's saved geometry (`{x, y, w, h, z}`) so front/back ordering survives reloads.

### Modal handling

The only true modal is the note editor (`#noteModal`), an overlay with a click-outside-to-close handler (clicking the overlay background, not the modal card itself, calls `close()`), an explicit close (`x`) button, and a save/delete footer. It is not part of the widget drag/resize system.

### Persistence

On drag/resize completion (`finishInteraction`), if the interaction actually moved the element (beyond the 3px threshold), the final `{x, y, w, h, z}` is saved into the `widgetLayout` storage key under the current theme name via `setWidgetLayout(id, geometry)`. If the interaction never crossed the movement threshold (effectively a click), no geometry is saved and any temporarily-added "custom" positioning class is removed unless the widget already had custom positioning from a prior session.

## 11. Theme System

### Theme loading

On boot and whenever `/config theme <name>` is used, `config.apply()` sets `document.body.dataset.theme` and toggles a `theme-<name>` class on `<body>` (removing any other `theme-*` class first). `layout.applyTheme()` is then invoked (directly by `config.apply()`, if the layout module is present) to apply or clear per-widget saved geometry for the newly active theme and to re-apply widget visibility.

### Theme switching

`/config theme <terminal|neo>` (Section 3). Switching themes does not affect widget content, only geometry (fixed vs. free-form) and the color palette. `neo`-theme layouts are stored independently from `terminal`-theme layouts (each keyed separately inside `widgetLayout`), so toggling back and forth does not lose either theme's arrangement.

### CSS variables

Defined at `:root` in `style.css`:

```
--bg:      #0a0e14
--bg2:     #0d1117
--bg3:     #151b23
--fg:      #b3b1ad
--fg2:     #565b66
--accent:  #39c5bb   (overridden at runtime via inline style by config.apply())
--font:    'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace
```

`--accent` is the only variable mutated at runtime (via `document.documentElement.style.setProperty('--accent', config.accent)`); all other variables are static theme constants. The `neo` theme defines its own palette additions (e.g. `--neo-todo: #FFD6E8`) and overrides many component colors directly via `body.theme-neo <selector>` rules rather than by redefining the shared root variables, meaning the `neo` theme is implemented largely as CSS overrides layered on top of the terminal theme's base styles.

### Colors

Accent presets available via `/config accent <preset>` (`config.js`'s `THEME_COLORS`): `cyan (#39c5bb), red (#f07178), green (#7fd962), blue (#59c2ff), magenta (#d2a6ff), yellow (#e6b450), orange (#ff8f40), pink (#ff79c6), purple (#bd93f9), white (#ffffff)`. Any other value is accepted only if it matches a valid short/long hex color pattern.

### Fonts

`JetBrains Mono` (primary monospace body/UI font, loaded from Google Fonts with weights 300/400/500/700) and `Press Start 2P` (used for the game overlay title text specifically, per a `font-family: 'Press Start 2P', var(--font)` rule).

### Animations

Defined via `@keyframes` in `style.css`: `blink`, `fadeIn`, `termFlicker` (startup boot flicker on the terminal window), `noteFlash` (appears twice in the stylesheet — see Section 17), `voidPulse` (the `exit` easter egg overlay). Additional non-keyframe animation is done imperatively in JS via `setInterval`/`requestAnimationFrame` (rain, hack/matrix easter eggs, boot progress bar, typewriter fact text, all four games).

## 12. Storage

All keys live in the browser's `localStorage`, scoped to the extension's origin. None are ever synced to a server. The canonical list, with the string constant from `storage.js`'s `keys` object:

| Key constant | localStorage key | Value format | Written by | Read by | Cleanup |
|---|---|---|---|---|---|
| `config` | `termConfig` | JSON object | `config.save()` (any `/config` mutation) | `config.js` module load, `/config` display | Full delete on `/reset` |
| `userShortcuts` | `userShortcuts` | JSON object (name → `{url,desc}`) | `/shortcut add\|delete` | `commands.js` `allShortcuts()` | Full delete on `/reset` |
| `disabledShortcuts` | `disabledShortcuts` | JSON array of names | `/shortcut delete\|restore` (on built-ins) | `commands.js` `allShortcuts()` | Full delete on `/reset` |
| `history` | `cmdHistory` | JSON array, capped at 80 | `core.saveHistory()` on every "known" command | `/history`, `ArrowUp/Down` recall | Capped automatically (oldest dropped); full delete on `/reset` |
| `notes` | `stickyNotes` | JSON array of markdown strings | `notes.js` save handlers | `notes.js` render, `/export` | Full delete on `/reset`; individual notes removed via the modal's delete button |
| `todos` | `todos` | JSON array of task objects | `todo.js` `saveTodos()` | `todo.js` render, `core.js` calendar due-date lookup, `/export` | Full delete on `/reset`; `/todo clear-done` removes completed items |
| `rain` | `rainSettings` | JSON object | `rain.js` `save()`/`update()` | `rain.js` on load and every draw-loop audio update | Full delete on `/reset` |
| `factMode` | `factMode` | Raw string (not JSON) | `facts.js` `setMode()` | `facts.js` on load | Full delete on `/reset` |
| `pomodoro` | `pomodoro` | JSON object | `todo.js` `savePomodoro()` | `todo.js` on load, every tick while running | Full delete on `/reset` |
| `leaderboard` | `chickenLeaderboard` | JSON array, capped at 10, sorted desc by score | `game.js` `saveToLeaderboard()` | `game.js` `getLeaderboard()`/`renderLeaderboard()` | Full delete on `/reset` |
| `blurState` | `blurState` | JSON object (4 booleans) | `commands.js` `saveBlurState()` | `commands.js` `restoreBlurState()` on init | Full delete on `/reset` |
| `widgetLayout` | `widgetLayout` | JSON object (theme → widgetId → geometry) | `layout.js` `setWidgetLayout()` | `layout.js` `applyTheme()`, `layoutForTheme()` | Per-theme clear via `/layout reset`; full delete on `/reset` |
| `widgetVisibility` | `widgetVisibility` | JSON object (widgetId → boolean) | `layout.js` `saveVisibility()` | `layout.js` `isVisible()`, `applyVisibility()` | Full clear via `/widget reset`; full delete on `/reset` |

### Migration behavior

Not implemented. There is no versioned schema or migration path. Robustness against malformed/legacy data is handled defensively at read time: `storage.loadConfig()` type-checks every field against `DEFAULT_CONFIG` and discards mismatches; `todo.js`'s `normalizeTodo()` re-derives every task field with fallbacks on load; `storage.getJson`/`safeJson` catch JSON parse errors and return the caller's fallback.

### Notable inconsistency

`game.js` reads/writes the leaderboard using a hard-coded literal `'chickenLeaderboard'` string directly via `localStorage.getItem/setItem`, rather than importing `storage.keys.leaderboard` from `storage.js` (which holds the same string value). Functionally equivalent today, but the two are not structurally linked — a rename of the key constant in `storage.js` would silently desynchronize from `game.js`.

## 13. Error Handling

The following are the literal error/failure messages found in source, why they occur, and where.

| Message | Where | Cause |
|---|---|---|
| `command not found: /<cmd>` | `commands.js` `handleSlash` (end) | Slash command with unrecognized base word and no matching shortcut |
| `unknown command: <input>. type /help` | `commands.js` `handle` (end) | Bare (non-slash) input that isn't math, a known command, or a shortcut |
| `blocked: unsafe URL scheme.` / `blocked: unsafe URL scheme in shortcut /<name>` | `commands.js`, `core.js` `routeTo` | A shortcut or route target doesn't start with `http://`/`https://` |
| `unknown theme: <value>` | `config.js` | `/config theme <value>` where value isn't `terminal`/`neo` |
| `unknown accent: <value>` | `config.js` | `/config accent <value>` fails hex/preset validation |
| `unknown widget: <value>. use /widget list` | `config.js` | `/config enable\|disable <value>` for a non-existent widget |
| `terminal cannot be toggled.` | `config.js` | Attempting to enable/disable the `terminal` widget |
| `layout module not available.` | `config.js` | Defensive fallback if `root.layout.setWidgetVisible` is missing |
| `terminal theme is locked.` | `commands.js` `handleLayout` | `/layout edit on` while `layoutTheme === 'terminal'` |
| `usage: ...` (many variants) | throughout every module's `handle`/subcommand functions | Missing or malformed arguments for a given subcommand |
| `no shortcuts.` | `commands.js` `listShortcuts` | `/shortcut list` with an empty merged shortcut set |
| `shortcut not found: <name>` | `commands.js` `handleShortcut` | `/shortcut delete <name>` for an unknown name |
| `presets: mist, calm, storm` | `rain.js` | `/rain preset <invalid>` |
| `unknown rain option.` | `rain.js` | Unrecognized `/rain` subcommand |
| `audio is not supported in this browser.` | `rain.js` `setSound` | `AudioContext`/`webkitAudioContext` unavailable |
| `modes: mixed, science, tech, weird, lore, context, contextual` | `facts.js` | `/fact mode <invalid>` |
| `no tasks in this view.` | `todo.js` | `/todo list` filter with zero matches |
| `invalid due date.` | `todo.js` | `/todo due <id> <value>` fails date parsing |
| `unknown game: <name>. available: chicken, snake, pacman, tetris` | `commands.js` `launchGame` | `/game <invalid>` |
| `failed to load game module.` | `commands.js` `launchGame`, via `loadGameModule` rejection | `game.js` failed to load, or loaded without defining `window.startGame` |
| `answer the pending confirmation first.` | `commands.js` `confirm` | A second `/export`/`/reset` attempted while one is already pending |
| `cancelled.` | `commands.js` `handle` | Y/N confirmation answered with anything other than `y`/`yes` |
| `clipboard access denied. check browser permissions.` | `commands.js` `handleExport` | `navigator.clipboard.writeText` promise rejection |
| `config edits identity, theme, accent, startup, widgets, and storage info.` | `config.js` `handle` (end) | Unrecognized `/config` subcommand |
| `usage: /widget list\|show\|hide\|toggle\|reset` | `commands.js` `handleWidget` | Unrecognized `/widget` action |
| `usage: /blur [notes\|todo\|terminal\|facts] [on\|off]` | `commands.js` `handleBlur` | Unrecognized blur target |
| `unknown option / usage` catch-alls for `/todo`, `/pomodoro`, `/help`-adjacent flows | respective modules | Unrecognized final subcommand in each router |

Error handling strategy is uniformly "validate, then print a red-styled (`error` CSS class) message and return early" — there is no thrown-exception-based error flow visible in the reviewed command-handling code, aside from the Promise rejection paths in `loadGameModule()` and `navigator.clipboard.writeText()`, both of which are caught locally.

## 14. Internal APIs

Only the primary exported surface of each module is listed; private helper functions internal to a module's closure are omitted unless directly relevant.

### `root.storage` (storage.js)

| Function | Purpose | Parameters | Returns | Called by |
|---|---|---|---|---|
| `getRaw(key)` | Read a raw string | `key` | string or null | `facts.js` |
| `setRaw(key, value)` | Write a raw string | `key, value` | — | `facts.js` |
| `getJson(key, fallback)` (`safeJson`) | Read + JSON.parse with fallback | `key, fallback` | parsed value or fallback | nearly every module |
| `setJson(key, value)` | JSON.stringify + write | `key, value` | — | nearly every module |
| `remove(key)` | Delete a key | `key` | — | `/reset` |
| `loadConfig()` | Load + validate config | — | config object | `config.js` module load |
| `saveConfig(config)` | Persist config | `config` | — | `config.js` `save()`, `layout.js` `setEditMode()` |
| `loadRain()` / `saveRain(rain)` | Load/persist rain settings | — / `rain` | settings object / — | `rain.js` |
| `loadPomodoro()` / `savePomodoro(pomodoro)` | Load/persist pomodoro state | — / `pomodoro` | object / — | `todo.js` |
| `describe()` | Static human-readable key list | — | string array | `/config storage` |

### `root.utils` (core.js)

`clamp(value, min, max)`, `escapeHtml(value)`, `formatDate(date)` (returns `DD-MM-YYYY`), `parseDateValue(value)` (accepts `today`/`tomorrow`/`DD-MM-YYYY`), `parseLocalDate(value)` (inverse of `formatDate`, returns a `Date`), `pick(items)` (random array element), `tryMath(expr)` (safe arithmetic evaluator; returns a number or `null`). Used throughout every other module.

### `root.core` (core.js)

`dom` (cached element references), `state` (`startTime, history, historyIndex, activeCompletion`), `init()`, `appendOutput(html, cls)`, `echoCommand(command)`, `saveHistory(command)`, `updateClock()`, `updateUptime()`, `renderCalendar()`, `routeTo(url, message)`. `appendOutput` and `echoCommand` are called by essentially every command handler in every module; `routeTo` is called by `commands.js` for external navigation.

### `root.config` (config.js)

`init` (alias of `apply`), `get()` (returns live config reference — **not a copy**, so external mutation is possible though not intentionally used that way, e.g. `layout.js`'s `setEditMode` mutates `cfg.layoutEdit` directly on the object returned by `get()` before saving), `colors()` (copy of `THEME_COLORS`), `layouts()` (copy of `LAYOUT_THEMES`), `setAccent(value)`, `setLayoutTheme(value)`, `apply()`, `handle(words, original)`. Called by `commands.js`, `layout.js`, `script.js`.

### `root.layout` (layout.js)

`init()`, `applyTheme()`, `resetTheme()`, `setEditMode(on)`, `setWidgetVisible(id, visible)`, `toggleWidget(id)`, `resetVisibility()`, `isVisible(id)`, `widgets()` (returns `TOGGLE_WIDGETS` ids). Called by `commands.js`, `config.js`, `script.js`.

### `root.facts` (facts.js)

`init()`, `mode()` (returns current mode string), `show(selected)`, `handle(words)`. Called by `commands.js`, `script.js`, `config.js` (`config.show()` reads `root.facts.mode()`).

### `root.rain` (rain.js)

`init()`, `handle(words)`, `describe()`, `update(patch)`, `setEnabled(on)`, `setSound(on)`, `settings()` (copy of current settings). Called by `commands.js`, `script.js`, `config.js` (`config.show()` reads `root.rain.describe()`).

### `root.notes` (notes.js)

`init()`, `all()` (copy of the notes array), `count()`, `setBlurred(on)`, `add(text)`, `openNew()`. Called by `commands.js` (`cat`, `blur`, `export`), `script.js`.

### `root.todo` (todo.js)

`init()`, `handle(words, original)`, `handlePomodoro(words)`, `add(raw)`, `stats()` (returns `{active, total}`), `all()` (copy of todos array), `version()` (integer, bumped on every save — used by `core.js` to cache due-date lookups). Called by `commands.js`, `core.js` (calendar), `config.js` (`config.show()`), `script.js`.

### `root.commands` (commands.js)

`init()`, `handle(raw)`, `completions(query)`, `showHelp(topic)`, `confirm(message, callback)`. Called by `script.js` (`bindInput`, `boot`). Also exposes `root.shortcuts = { all: allShortcuts }`, consulted by `config.js` for the quick-links bar.

### `game.js` global surface (not namespaced under `TabOS`)

`window.startGame(gameMode, option)`, `window.exitGame()`. These are plain globals rather than `root.game.*`, deliberately, since `commands.js` checks `typeof window.startGame === 'function'` to decide whether the lazy script needs (re)loading.

### Side effects worth noting

- `config.apply()` has DOM side effects on many elements outside its own module's "ownership" (prompt spans, terminal title, quick links bar) and calls into `layout.js`.
- `todo.saveTodos()` has a debounced side effect on the calendar widget (owned by `core.js`) via a 300ms `setTimeout`.
- `layout.setEditMode()` mutates and re-saves the config object owned by `config.js` directly, rather than going through a `config.js`-exposed setter.

## 15. Execution Flow

Step-by-step trace of a single command from keystroke to rendered output, using `/rain intensity 80` as a concrete example:

1. User types into `#cmdInput`. Each `input` event triggers `script.js`'s handler, which (since the value starts with `/`) calls `root.commands.completions('rain intensity 80')`... in practice, autocomplete is generally only useful for short prefixes, but the same code path runs regardless.
2. User presses `Enter`. The `keydown` listener in `script.js` calls `hideAutocomplete()`, then `root.commands.handle(dom.cmdInput.value)`, then clears the input field.
3. `commands.handle(raw)` (`commands.js`) trims the input. No confirmation is pending. The command doesn't equal `?`. It starts with `/`, so it computes `cmdFirstWord = 'rain'`, checks membership in `KNOWN_COMMANDS` (true) to decide whether to call `core.saveHistory(command)`, then calls `core.echoCommand(command)` (renders the `$ /rain intensity 80` line), then returns the result of `handleSlash('rain intensity 80')`.
4. `handleSlash(commandLine)` lowercases and splits into `words = ['rain', 'intensity', '80']`, computes `base = 'rain'`. Checks `HEAVY_COMMANDS` (rain is not in that list, so no theme restriction applies). Matches `if (base === 'rain') return root.rain.handle(words);`.
5. `rain.handle(['rain', 'intensity', '80'])` (`rain.js`) matches `sub === 'intensity'`. Validates `raw = '80'` is a non-empty number. Computes `n = clamp(80, 0, 100) = 80`. Calls `update({ intensity: 80 })`.
6. `update(patch)` merges `patch` into the module-scoped `settings` object, calls `save()` (which clamps all numeric fields again defensively and calls `storage.saveRain(settings)`, persisting to the `rainSettings` `localStorage` key), then calls `updateAudio()` (adjusts the live Web Audio gain node target if sound is enabled).
7. Back in `rain.handle`, `appendOutput('rain intensity: 80', 'success')` is called.
8. `core.appendOutput(html, cls)` (`core.js`) creates a `<div class="out-line success">`, sets its `innerHTML` to the (already-safe, non-user-controlled-here) string, appends it to `#output`, and scrolls `#terminalBody` to the bottom.
9. The already-running rain animation loop (`draw(ts)`, driven by `requestAnimationFrame` since rain was presumably already enabled) picks up the new `settings.intensity` value on its very next frame — there is no need to restart the loop, since `draw` reads `settings` live on every frame.

Key functions involved end-to-end: `script.js` (`bindInput` → `handle`), `commands.js` (`handle` → `echoCommand`/`saveHistory` → `handleSlash` → module dispatch), `rain.js` (`handle` → `update` → `save`/`updateAudio`), `core.js` (`appendOutput`), `storage.js` (`saveRain` → `setJson`).

## 16. Feature List

Status is inferred from code completeness and reachability, not from any in-source status markers (none exist).

### Stable

- Command shell: parsing, history, autocomplete, math evaluation, Y/N confirmation gate
- Config system: identity, theme switching, accent colors, startup toggle, storage summary
- Shortcuts: built-in list, custom add/delete/restore, quick-links bar in `neo` theme
- Rain/lightning canvas effect with procedural Web Audio ambience and thunder
- Fact bar with typewriter animation and mode switching
- Sticky notes with a markdown subset renderer, live preview, and keyboard formatting shortcuts
- Todo list: priorities, due dates, recurrence, progress, drag reorder, filtering
- Pomodoro timer with wall-clock-accurate timing and browser notifications
- Calendar widget with due-date markers cross-referenced from the todo list
- Blur/privacy mode with Alt-to-peek
- Export to clipboard (JSON) and full reset, both confirmation-gated
- Widget visibility toggling
- Easter eggs (`sudo`, `exit`, `hello`/`hi`, `coffee`, `42`, `hack`, `matrix`, `fortune`, `xkcd`, `rm -rf /`)
- Chicken Defender game: 3 difficulties, 3 waves + boss, leaderboard

### Experimental / Incomplete

- `neo` theme's free-form widget drag/resize layout system — functional, but has no keyboard-accessible equivalent (pointer-only) and no per-widget reset (only whole-theme reset via `/layout reset`)
- Pacman/Snake/Tetris: fully playable but have no persistent leaderboard (unlike Chicken Defender) and no difficulty options
- Hard-mode Chicken Defender boss is explicitly unwinnable by design (`hardLock: true` causes the boss to always heal back to full HP), which functions as intended "survival mode" behavior rather than a bug, per the in-game copy "hard mode is survival only; boss cannot be beaten"

### Deprecated

- None found in the four provided theme/game/core file set. The README documents that a prior "Windows 7 / Aero" theme and three theme stub files (`themes/aero.css`, `themes/glass.css`, `themes/neo.css`) were removed in v4.0.0; none of that code is present in the current source, so it is not documented further here.

## 17. Current Limitations

Only limitations directly observed in source:

- No command quoting: multi-word arguments are captured only via ad hoc substring slicing per command, not a general tokenizer (Section 4).
- No environment variables or command substitution (Section 6).
- No filesystem abstraction of any kind (Section 5).
- `/history` only records commands recognized as "known"; arbitrary typed text and evaluated math expressions are not recorded.
- Only one Y/N confirmation can be pending at a time; a second attempt is rejected rather than queued.
- Widget drag/resize (`neo` theme) is pointer-only; `isInteractive()` guards prevent dragging when starting on interactive children, and there is no keyboard-based repositioning.
- The Chicken Defender leaderboard is a shared global list (`chickenLeaderboard`, top 10 by score) with no per-player identity — every play session competes on the same board.
- Snake, Pacman, and Tetris have no leaderboard, no pause, and no difficulty selection (only Chicken Defender reads a difficulty argument).
- Pacman ghost AI uses a simplified greedy distance heuristic with per-ghost randomness weighting, not the original arcade's four distinct chase personalities.
- Tetris has no rotation wall-kick system — a rotation that would collide is simply rejected.
- Note markdown rendering supports only a fixed subset of markdown (headings 1–3, bold, italic, inline code, fenced code blocks, tables, blockquote via `>`, horizontal rule, checklists, unordered lists, `http(s)` links); no ordered lists, no nested lists, no images.
- Notes are capped at 20,000 characters each; there is no note count limit beyond `localStorage`'s own quota.
- `duplicated CSS`: `@keyframes noteFlash` is defined twice in `style.css` (see Section 11), and the later declaration silently wins per normal CSS cascade rules — not a functional bug, but a maintenance redundancy.
- The leaderboard storage key is duplicated as a literal string in `game.js` instead of being imported from `storage.js`'s key registry (Section 12), risking future desynchronization.
- No accessibility features (ARIA roles, focus trapping in the note modal, screen-reader announcements) are present in the reviewed markup beyond a single `aria-label` on the analog clock.
- No automated tests, build tooling, linting configuration, or `package.json` were present among the provided files.

## 18. Future Expansion Points

A repository-wide search for `TODO`, `FIXME`, `HACK`, and similar markers found none in actual code comments — the only string containing the literal text `TODO` is a joke line inside the `/fortune` easter egg's quote list (`'// TODO: fix this later'`), which is flavor text, not a real annotation.

No unused exported functions, placeholder stub functions, or commented-out dead code blocks were identified in the reviewed files. The README's v4.0.0 changelog entry describes a completed removal (the old Aero/Windows 7 theme and its stub files), not a pending one, so it is not a forward-looking expansion point.

Behavior not determined from source: whether any further theme, game, or command work is planned. No such indications exist in the code or README beyond the general description of TabOS as a "local-first terminal new tab distro."

## 19. Module Index

| Module (file) | Purpose | Imports (reads from `root`) | Exports (writes to `root`) | Dependencies |
|---|---|---|---|---|
| `storage.js` | localStorage key registry, defaults, read/write helpers | none | `root.storage` | none (first script loaded) |
| `core.js` | DOM cache, clock/uptime/calendar, output rendering, math parser, generic utilities | `root.storage` | `root.core`, `root.utils` | `storage.js` |
| `config.js` | Identity, accent, theme switching | `root.storage`, `root.utils`, `root.core` | `root.config` | `storage.js`, `core.js`; reads `root.layout`/`root.shortcuts` at call time (not load time) |
| `layout.js` | Draggable/resizable widget positions for `neo` theme | `root.storage` | `root.layout` | `storage.js`; reads `root.config` at call time |
| `facts.js` | Rotating fact bar with typewriter effect | `root.storage`, `root.utils`, `root.core` | `root.facts` | `storage.js`, `core.js` |
| `rain.js` | Canvas rain/lightning renderer + Web Audio ambience | `root.storage`, `root.utils`, `root.core` | `root.rain` | `storage.js`, `core.js` |
| `notes.js` | Sticky notes + markdown renderer/sanitizer | `root.storage`, `root.utils` | `root.notes` | `storage.js`, `core.js` (indirectly via utils) |
| `todo.js` | Tasks, recurrence, drag reorder, pomodoro timer | `root.storage`, `root.utils`, `root.core` | `root.todo` | `storage.js`, `core.js`; calls `root.core.renderCalendar` |
| `commands.js` | Command router, shortcuts, autocomplete catalog, easter eggs | `root.storage`, `root.utils`, `root.core` | `root.commands`, `root.shortcuts` | Every other module (dispatches into `config`, `layout`, `rain`, `facts`, `todo`, `notes`) |
| `script.js` | Input handling, autocomplete UI, boot sequence | `root.core`, `root.commands`, `root.utils`, `root.config`, `root.layout`, `root.facts`, `root.rain`, `root.notes`, `root.todo` | none (calls `boot()` as a side effect) | All modules above (last script loaded) |
| `game.js` | Lazy-loaded: Chicken Defender, Snake, Pacman, Tetris | Reads `localStorage` directly (not via `root.storage`) | `window.startGame`, `window.exitGame` (globals, not under `root`) | None of the `TabOS` modules; entirely self-contained aside from shared DOM element ids and the `chickenLeaderboard` localStorage key |
| `style.css` | All theming, terminal and neo layouts | — | — | Referenced by `index.html` |
| `manifest.json` | MV3 manifest, new-tab override, CSP | — | — | Referenced by Chrome |

## 20. Quick Reference

| Command | Description | Syntax |
|---|---|---|
| `help` | Show commands (topics: todo, rain, config) | `/help [topic]` |
| `?` | Alias for `/help` with no topic | `?` |
| `clear` / `cls` | Clear terminal output | `/clear` |
| `time` | Show current time | `/time` |
| `history` | Show last 20 commands | `/history` |
| `config` | Show/edit identity, theme, accent, startup, storage | `/config [sub] [args]` |
| `widget` / `widgets` | List/toggle widget visibility | `/widget list\|show\|hide\|toggle\|reset [name]` |
| `shortcut` / `shortcuts` | Manage quick-launch links | `/shortcut list\|add\|delete\|restore [args]` |
| `rain` | Control rain/lightning effect | `/rain status\|on\|off\|toggle\|sound\|thunder\|intensity\|wind\|preset [args]` |
| `fact` | Show/cycle facts | `/fact [next\|mode\|cache] [args]` |
| `todo` | Manage tasks | `/todo list\|add\|done\|delete\|move\|due\|recur\|progress\|clear-done [args]` |
| `pomodoro` | Focus timer | `/pomodoro start\|pause\|stop\|status [minutes]` |
| `game` | Launch a game | `/game chicken\|snake\|pacman\|tetris [difficulty]` |
| `blur` | Toggle privacy blur | `/blur [notes\|todo\|terminal\|facts] [on\|off]` |
| `export` | Copy all data to clipboard as JSON | `/export` |
| `reset` | Wipe all data and reload | `/reset` |
| `cat` | Create a note | `/cat [text]` |
| `layout` | Reset/unlock free-form widget layout | `/layout reset` / `/layout edit on\|off` |
| `g:` / `g` | Google search | `g: <query>` / `/g <query>` |
| `gpt` | Open ChatGPT with a prompt | `/gpt <prompt>` |
| `claude` | Open Claude with a prompt | `/claude <prompt>` |
| `yt` | YouTube search | `/yt <query>` |
| `rd` | Open a subreddit | `/rd <subreddit>` |
| `sudo` | Easter egg | `sudo` |
| `exit` | Easter egg (void overlay) | `exit` |
| `hello` / `hi` | Easter egg (random greeting) | `hello` |
| `coffee` | Easter egg (accent flash) | `coffee` |
| `42` | Easter egg | `42` |
| `hack` | Easter egg (matrix-style scroll) | `hack` |
| `matrix` | Easter egg (katakana rain) | `matrix` |
| `fortune` | Easter egg (programmer fortune) | `fortune` |
| `xkcd` | Easter egg (programmer quote) | `xkcd` |
| `rm -rf /` | Easter egg (screen shake) | `rm -rf /` |
| `<name>` | Navigate to a shortcut | `<shortcut-name>` (e.g. `yt`, `gh`) |
| `<expression>` | Evaluate arithmetic | `2+2*3`, `(4-1)**2` |
