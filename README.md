# TabOS Terminal New Tab

TabOS is a local-first browser new tab page built around a terminal command system. It keeps quick links, notes, tasks, rain, facts, and retro games in one keyboard-first workspace.

Everything runs from static files. There is no backend, account, telemetry, or build step.

## Features

- Terminal-style command launcher with detailed autocomplete
- Custom shortcuts with command-only add, delete, restore, and list actions
- Sticky markdown notes with no seeded placeholder notes
- Task list with drag reorder, priorities, due dates, recurring tasks, progress bars, and terminal commands
- Pomodoro timer in the task panel and through commands
- Canvas rain effect with intensity, wind direction, wind speed, thunder bolts, and optional generated rain sound
- Categorized offline facts with science, tech, weird internet lore, contextual mode, and typing animation
- Mini calendar, uptime, pixel clock, command history, math evaluation, and autocomplete
- Retro games: chicken, snake, pacman, mario, and tetris

## Install As A New Tab Extension

1. Download or clone this folder.
2. Open Chrome, Edge, Brave, or another Chromium browser.
3. Go to `chrome://extensions`.
4. Turn on `Developer mode`.
5. Click `Load unpacked`.
6. Select this project folder, the one containing `manifest.json`.
7. Open a new tab.

If the browser says the extension changed the new tab page, accept the change.

## Run Without Installing

Open `index.html` directly in a browser. Most features work that way, but installing as an unpacked extension is better because it makes TabOS the actual new tab page.

## Main Commands

Type commands into the terminal prompt. Use `Tab` to complete commands.

```text
/help
/help todo
/neofetch
/config
/config theme green
/config theme #39c5bb
/config storage
/shortcut list
/shortcut add docs https://developer.mozilla.org MDN
/shortcut delete docs
/shortcut restore yt
/rain on
/rain intensity 35
/rain wind left 20
/rain sound on
/fact mode tech
/todo add Ship README due:tomorrow recur:none 30%
/todo list
/todo done 1
/todo progress 1 75
/todo move 3 1
/pomodoro start 25
/game chicken easy
/game chicken medium
/game chicken hard
/game snake
/game pacman
/game mario
/game tetris
```

Bare text runs a Google search. Math expressions such as `sqrt(144)` or `2^8` are evaluated locally.

## Shortcuts

Built-in shortcuts include `/yt`, `/gpt`, `/github`, `/mail`, `/drive`, `/maps`, `/reddit`, `/notion`, and a few more.

Custom shortcuts are stored in browser local storage:

```text
/shortcut add mysite example.com My Site
/shortcut delete mysite
/shortcut list
```

Deleting a built-in shortcut disables it instead of removing it from the source code:

```text
/shortcut delete yt
/shortcut restore yt
```

The older `/shortcuts` command still works as an alias, but `/shortcut` is the command family to use.

## Rain

Rain is terminal-controlled only:

```text
/rain on
/rain off
/rain preset mist
/rain preset calm
/rain preset storm
/rain intensity 0-100
/rain wind left 25
/rain wind 135 40
/rain thunder off
/rain sound on
```

Sound is off by default. Browsers require a user action before audio can start, so enable sound from a typed command.

## Facts

Facts are cached locally from the bundled library:

```text
/fact
/fact mode mixed
/fact mode science
/fact mode tech
/fact mode weird
/fact mode context
/fact cache
```

The fact bar types the selected fact instead of swapping text abruptly.

## Tasks

The task panel supports mouse and command workflows. Drag tasks to reorder them, or use:

```text
/todo add Fix bug ! due:2026-05-20 recur:weekly 10%
/todo list
/todo list done
/todo done 1
/todo delete 1
/todo due 1 tomorrow
/todo recur 1 daily
/todo progress 1 50
/todo move 2 1
/todo clear-done
```

Task IDs are the numbers shown in `/todo list` and in the panel. Recurring tasks roll their due date forward when completed.

## Games

Launch games from the terminal:

```text
/game chicken easy
/game chicken medium
/game chicken hard
/game snake
/game pacman
/game mario
/game tetris
```

`ESC` exits any game. Chicken keeps a local leaderboard. Hard chicken mode is intentionally survival-only and cannot be won.

The Pacman and Mario modes are local reimplementations, not proprietary original source code.

## Config

Theme is part of config now; `/theme` is not a command.

```text
/config user kartik
/config host laptop
/config distro tabos
/config theme cyan
/config theme #39c5bb
/config reset
```

`/config` shows the essentials: identity, theme, shortcuts, rain, facts, tasks, and storage info.

## Storage

There is a dedicated `storage.js` file that centralizes all browser local storage access. The data itself still lives in browser `localStorage`, because a static new tab extension cannot write a normal project file at runtime.

Stored keys include:

- `termConfig`
- `userShortcuts`
- `disabledShortcuts`
- `cmdHistory`
- `stickyNotes`
- `todos`
- `pomodoro`
- `rainSettings`
- `factMode`
- `cachedFacts`
- `chickenLeaderboard`

Use `/config storage` to see the storage map inside the terminal.

## File Map

```text
index.html       Page structure and script loading
style.css        Theme, layout, panels, and game overlay styles
storage.js       localStorage wrapper and defaults
core.js          DOM refs, output, clock, calendar, math helpers
config.js        identity and accent theme config
facts.js         categorized fact system
rain.js          canvas rain and generated sound
notes.js         sticky markdown notes
todo.js          tasks and pomodoro
commands.js      command parser, shortcuts, help, autocomplete catalog
script.js        small boot file and input binding
game.js          Chicken Defender and arcade games
manifest.json    Chromium extension manifest
icons/ter.png    Extension icon
```

## Development Notes

No package install is required. Edit the files and reload the extension from `chrome://extensions`.

For quick syntax checks, run:

```text
node --check storage.js
node --check core.js
node --check config.js
node --check facts.js
node --check rain.js
node --check notes.js
node --check todo.js
node --check commands.js
node --check script.js
node --check game.js
```

Keep new features fast, local, and keyboard-friendly.
