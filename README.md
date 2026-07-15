# TabOS

A local-first, terminal-style new tab page for Chrome. Everything (notes, tasks, shortcuts, config) lives in `localStorage` — no accounts, no network calls, no telemetry. Type a command, get a result.

## v4.0.0

This release is a decluttering pass. The old Windows 7 / Aero theme (`win7.css`, `win7.js`, and the empty `themes/aero.css`, `themes/glass.css`, `themes/neo.css` stubs) has been removed entirely — about 2,200 lines gone. TabOS now ships two themes instead of three, is lighter to load, and has a hardened `content_security_policy` in `manifest.json`. No feature commands changed; this is purely cleanup and hardening on top of v3.

## Install

1. Clone or download this repo
2. Go to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select this folder
5. Open a new tab

## Themes

| Command                  | Theme                                          |
| ------------------------ | ----------------------------------------------- |
| `/config theme terminal` | Dark terminal layout (default, fixed positions) |
| `/config theme neo`      | Pastel minimal layout, widgets are movable       |

`neo` supports a free-form dashboard layout:

```text
/layout edit on      # unlock dragging/resizing widgets (neo only)
/layout edit off      # lock it back down
/layout reset          # clear saved positions for the current theme
```

Drag a widget by its header, resize from the bottom-right grip. Positions are saved per-theme, so switching back to `terminal` doesn't disturb your `neo` layout.

## Commands

Commands work with or without the leading `/`. Plain arithmetic (`2+2*3`, `(4-1)**2`) is also evaluated directly if it isn't a recognized command.

### General
| Command             | What it does                        |
| -------------------- | ------------------------------------ |
| `/help [topic]`      | Show commands (`/help todo`, `/help rain`, `/help config`) |
| `/clear`              | Clear the terminal output            |
| `/time`               | Current time                         |
| `/history`            | Last 20 commands                     |

### Search & launch
| Command             | What it does                  |
| -------------------- | ------------------------------ |
| `g: <query>` / `/g <query>` | Google search           |
| `/gpt <prompt>`       | Open ChatGPT with prompt      |
| `/claude <prompt>`    | Open Claude with prompt       |
| `/yt <query>`         | YouTube search                |
| `/rd <subreddit>`     | Open a subreddit              |

### Config
| Command                      | What it does                     |
| ----------------------------- | --------------------------------- |
| `/config`                     | Show current config summary       |
| `/config theme <terminal\|neo>` | Switch layout theme             |
| `/config accent <preset\|#hex>` | Change accent color             |
| `/config user\|host\|distro <value>` | Change terminal identity   |
| `/config startup on\|off`     | Toggle the boot animation         |
| `/config enable\|disable <widget>` | Show/hide a widget           |
| `/config storage`             | List all localStorage keys used   |
| `/config reset`               | Reset config to defaults          |

Accent presets: `cyan, red, green, blue, magenta, yellow, orange, pink, purple, white` — or any hex color.

### Widgets
| Command                    | What it does           |
| --------------------------- | ------------------------ |
| `/widget list`              | List widgets and visibility |
| `/widget show\|hide\|toggle <name>` | Show/hide a widget |
| `/widget reset`             | Reset visibility for all widgets |

Widgets: `calendar, todo, pomodoro, notes, facts, clock` (terminal itself can't be hidden).

### Notes
- Click `+` in the notes panel, or type `/cat your note text here`
- `/cat` with no text opens a blank note editor
- Markdown supported: `**bold**`, `*italic*`, `` `code` ``, headings, blockquotes, tables, checklists (`- [ ]` / `- [x]`), links, code fences
- In the editor: `Ctrl+B` bold, `Ctrl+I` italic, `Ctrl+K` link, `` Ctrl+` `` inline code, plus a live preview toggle

### Todos
```text
/todo add finish cleanup ! due:27-06-2026 recur:weekly 50%
```
| Token                | Meaning                          |
| --------------------- | --------------------------------- |
| `!`                   | High priority                     |
| `due:DD-MM-YYYY`      | Also accepts `due:today` / `due:tomorrow` |
| `recur:daily\|weekly\|monthly` | Recurs on completion    |
| `NN%`                 | Initial progress                  |

Other subcommands: `/todo list`, `/todo done <id>`, `/todo delete <id>`, `/todo move <from> <to>`, `/todo due <id> <date|clear>`, `/todo recur <id> <mode>`, `/todo progress <id> <0-100>`, `/todo clear-done`. Tasks are also drag-reorderable in the panel, filterable by `all/high/low`, and due dates show up as clickable markers on the calendar widget.

### Pomodoro
`/pomodoro start [minutes]`, `/pomodoro pause`, `/pomodoro stop`, `/pomodoro status`. Runs off wall-clock time (survives tab suspension) and fires a browser notification on completion if permitted.

### Rain
| Command                              | What it does                  |
| -------------------------------------- | ------------------------------- |
| `/rain on\|off\|toggle`                | Toggle the rain canvas         |
| `/rain intensity <0-100>`              | Drop density                   |
| `/rain wind <direction\|degrees> <speed>` | Wind angle (`left/right/up/down/n/s/e/w/etc.` or degrees) and speed |
| `/rain sound on\|off`                  | Ambient rain + thunder audio (Web Audio, procedural — no audio files) |
| `/rain thunder on\|off`                | Occasional lightning + thunder at higher intensity |
| `/rain preset mist\|calm\|storm`       | Quick presets                  |

### Facts
`/fact` shows the next fact and cycles typewriter-style. `/fact mode science|tech|weird|context|mixed` changes the pool; `context` mode adapts the message to the time of day. `/fact cache` shows how many facts are loaded.

### Games
`/game <name> [difficulty]` lazy-loads `game.js` on first use so it never slows down the initial new-tab paint.

| Game       | Controls                                      | Notes                        |
| ----------- | ---------------------------------------------- | ------------------------------ |
| `chicken`   | WASD / arrows move, SPACE / right-click shoot | 3 waves + boss, difficulty `easy\|medium\|hard` |
| `snake`     | Arrows / WASD to turn                          | Classic, avoid walls and self |
| `pacman`    | Arrows / WASD to move                          | Pellets, power pills, ghosts, tunnels |
| `tetris`    | Arrows move, UP rotate, SPACE drop            | Clear lines before the stack tops out |

`ESC` quits any game back to the terminal. High scores are kept in a local leaderboard.

### Shortcuts
Built-ins ship for `yt, gpt, claude, gemini, github/gh, gitam, mail/gmail, duolingo, leetcode, reddit, twitter/x, drive, maps, notion` — type the name (with or without `/`) to jump straight there.

```text
/shortcut list
/shortcut add <name> <url> [description]
/shortcut delete <name>          # removes custom, or disables a built-in
/shortcut restore <name>         # re-enables a disabled built-in
```

### Privacy
`/blur` toggles a blur over notes/todo/terminal output/facts for screen-share safety. `/blur notes|todo|terminal|facts on|off` targets one panel. Hold `Alt` to peek through the blur without turning it off.

### Data
Everything lives in `localStorage`; nothing leaves the browser. `/export` asks for a Y/N confirmation, then copies notes, todos, shortcuts, and config to your clipboard as JSON. `/reset` (also Y/N-gated) wipes every TabOS key and reloads.

### Easter eggs
`sudo`, `exit`, `hello`/`hi`, `coffee`, `42`, `hack`, `matrix`, `fortune`, `xkcd`, and `rm -rf /` all do small terminal-flavored things. Try them.

## Architecture

Vanilla JS, no build step, no bundler — Chrome loads the files directly.

| File          | Responsibility                                          |
| -------------- | --------------------------------------------------------- |
| `manifest.json` | MV3 manifest, new-tab override, CSP                      |
| `index.html`   | DOM shell for every widget                                |
| `storage.js`   | localStorage read/write helpers, key registry, defaults   |
| `core.js`      | DOM cache, clock/uptime/calendar, output rendering, tiny math expression parser |
| `config.js`    | Identity, accent, theme switching                          |
| `layout.js`    | Draggable/resizable widget positions (neo theme)           |
| `commands.js`  | Command router, shortcuts, autocomplete catalog, easter eggs |
| `notes.js`     | Sticky notes + markdown renderer/sanitizer                 |
| `todo.js`      | Tasks, recurrence, drag reorder, pomodoro timer             |
| `rain.js`      | Canvas rain/lightning renderer + Web Audio ambience         |
| `facts.js`     | Fact bar with typewriter effect                             |
| `game.js`      | Lazy-loaded: Chicken Defender, Snake, Pacman, Tetris        |
| `script.js`    | Input handling, autocomplete UI, boot sequence               |
| `style.css`    | All theming, terminal and neo layouts                       |

## Security notes

Notes/todo rendering escapes HTML before formatting and only allows `http(s)` links; `manifest.json` sets a strict `script-src 'self'` CSP. If you're auditing a fork, `notes.js`'s `renderMarkdown`/`sanitizeLinkHref` and `commands.js`'s shortcut URL checks are the two places user-controlled strings turn into DOM/URLs.