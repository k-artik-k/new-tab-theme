<div align="center">

# Terminal New Tab

### A hacker-themed, terminal-inspired new tab page for Chrome / Brave

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.0.0-green?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

<br>

*Replace your boring new tab with a fully interactive terminal — complete with website shortcuts, a todo list, sticky notes, a calendar, math evaluation, matrix rain, random facts, and even a built-in arcade game.*

</div>

---

## Overview

Every time you open a new tab, you're greeted with a beautiful, dark terminal interface rendered in the **Ayu Dark** color palette. The page is packed with productivity widgets and hidden surprises — all controlled through a command-line interface or sidebar panels.

---

## Features at a Glance

| Feature | Description |
|---|---|
| Terminal Emulator | A fully interactive command input with prompt, autocomplete, and command history |
| Website Shortcuts | Quick-launch 14+ sites with short slash commands |
| Google Search | Search Google directly from the terminal |
| Math Engine | Evaluate math expressions inline (supports trig, log, constants) |
| Todo List | Priority-based task manager with filters and completed section |
| Sticky Notes | Markdown-rendered notes with a modal editor |
| Mini Calendar | Current month calendar with today highlighted |
| Live Clock | Retro pixel-font clock with 12-hour format and AM/PM |
| Session Uptime | Tracks how long the current tab has been open |
| Matrix Rain | Toggleable ASCII/katakana rain animation on the background canvas |
| Scanline Overlay | CRT-style scanline effect over the entire page |
| Random Facts | A curated fact from science, tech, and history displayed at the bottom |
| Rocket Game | A full Space Defender arcade game with levels, enemies, and high scores |
| Customization | Change your username, hostname, and toggle animations |

---

## Project Structure

```
terminal-new-tab/
├── manifest.json      # Chrome Extension manifest (Manifest V3)
├── index.html         # Main HTML — layout and all UI panels
├── style.css          # Complete styling — dark theme, panels, game overlay
├── script.js          # Core logic — terminal, shortcuts, todos, notes, calendar
├── game.js            # Rocket Space Defender game engine
└── icons/
    └── ter.png        # Extension / favicon icon
```

---

## Installation

### Load as Unpacked Extension (Chrome / Brave / Edge)

1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/terminal-new-tab.git
   ```
2. Open your browser and navigate to:
   ```
   chrome://extensions
   ```
3. Enable **Developer Mode** (toggle in the top-right).
4. Click **Load unpacked** and select the project folder.
5. Open a new tab — enjoy your terminal!

---

## The Terminal

The centerpiece of the page is a floating terminal window, styled like a macOS/Linux terminal with red, yellow, and green window dots. It features:

### Prompt
```
user@terminal:~$
```
- **`user`** and **`terminal`** are customizable via `/config` commands.
- The prompt is color-coded: green username, blue hostname, magenta path.

### Command Input
- Type commands prefixed with `/` to execute actions.
- Type any bare text to perform a Google search.
- Type math expressions directly to evaluate them.
- Press **Enter** to execute.

### Autocomplete
- As you type a `/` command, a popup appears with matching suggestions.
- Navigate with **up / down** arrow keys.
- Press **Tab** to auto-fill the highlighted suggestion.
- Press **Escape** to dismiss.

### Command History
- Use **up / down** arrows (when autocomplete is closed) to cycle through past commands.
- Stores up to **50** commands in `localStorage`.

---

## Commands Reference

### Website Shortcuts

All shortcuts are prefixed with `/`. Type and press Enter to navigate.

| Command | Alias | Destination |
|---|---|---|
| `/yt` | `/youtube` | YouTube |
| `/gpt` | `/chatgpt` | ChatGPT |
| `/gemini` | — | Google Gemini |
| `/github` | `/gh` | GitHub |
| `/gitam` | — | GITAM Login Portal |
| `/mail` | `/gmail` | Gmail |
| `/duo` | `/duolingo` | Duolingo |
| `/lc` | `/leetcode` | LeetCode |
| `/reddit` | — | Reddit |
| `/twitter` | `/x` | Twitter / X |
| `/drive` | — | Google Drive |
| `/maps` | — | Google Maps |
| `/notion` | — | Notion |
| `/spotify` | — | Spotify |

### System Commands

| Command | Description |
|---|---|
| `/help` or `?` | Show the full help table in the terminal |
| `/clear` or `/cls` | Clear terminal output |
| `/time` | Display the current time |
| `/history` | Show last 15 commands |
| `/g <query>` | Google search for `<query>` |
| `/game` | Launch the Rocket Space Defender game |
| `/animation on` | Enable matrix rain background |
| `/animation off` | Disable matrix rain background |

### Config Commands

| Command | Description |
|---|---|
| `/config` | View current user and host settings |
| `/config user <name>` | Change the displayed username |
| `/config host <name>` | Change the displayed hostname |
| `/config reset` | Reset username and hostname to defaults (`user@terminal`) |

### Math Evaluation

Type any mathematical expression directly (without `/`) and the terminal will evaluate it:

```
> 2 + 3 * 4         → = 14
> sqrt(144)          → = 12
> sin(pi / 2)        → = 1
> 2 ^ 10             → = 1024
> log(1000)          → = 3
```

**Supported functions:** `sqrt`, `abs`, `sin`, `cos`, `tan`, `log` (base 10), `ln` (natural), `round`, `floor`, `ceil`, `pow`, `min`, `max`

**Supported constants:** `pi`, `e`

### Bare Text → Google Search

If a command doesn't match any shortcut, config, or math expression, it's automatically sent to Google as a search query.

---

## Todo List

Located in the **top-right corner** of the page.

### Features
- **Add tasks** by clicking the `+` button or pressing Enter in the input field.
- **Priority system:**
  - Prefix a task with `!` to mark it as **high priority** (red dot).
  - Otherwise it's **low priority** (dim dot).
- **Filters:** Toggle between `all`, `high`, and `low` priority views.
- **Complete tasks** by clicking the checkbox or task text.
- **Delete tasks** with the close button (appears on hover).
- **Completed section:** Collapsible list of finished tasks with a count indicator.
- **Persistent storage:** All todos are saved in `localStorage`.

---

## Sticky Notes

Located in the **bottom-left corner** of the page, titled `[ notes.md ]`.

### Features
- **Markdown support** — notes are rendered with:
  - Headings (`#`, `##`, `###`)
  - **Bold** (`**text**`) and *italic* (`*text*`)
  - `Inline code` (`` `code` ``)
  - Bullet lists (`- item`)
  - Links (`[text](url)`)
- **Add notes** with the `+` button.
- **Edit notes** by clicking on any note card — opens a modal editor.
- **Delete notes** from within the editor modal.
- **First-visit defaults:** Two sample notes are created on first load:
  - A welcome note explaining markdown support.
  - A quick links note with useful URLs.
- **Persistent storage:** All notes are saved in `localStorage`.

### Note Card Styling
- Dark background with an accent-colored left border.
- Headings in yellow, bold in green, italic in magenta, code in cyan.
- Links in blue, clickable with `target="_blank"`.

---

## Mini Calendar

Located in the **top-left corner**, below the top bar.

### Features
- Displays the current month and year as `[ month year ]`.
- 7-column grid layout (Mo–Su).
- **Today's date** is highlighted with the accent color.
- **Weekends** (Saturday, Sunday) are dimmed.
- Automatically generated from the current date.

---

## Top Bar

A fixed bar across the top of the page containing:

| Section | Details |
|---|---|
| **Left side** | Hexagon icon + `user@host` label + session uptime (`up Xm Ys`) |
| **Right side** | Live clock in **Silkscreen** pixel font, 12h format with AM/PM |

- The clock updates every second with a green glow text-shadow effect.
- Uptime counter starts from when the tab was opened.

---

## Matrix Rain Animation

A full-window canvas animation behind the terminal.

### Details
- Characters include: digits `0-1`, Japanese katakana, and programming symbols `<>{}[]|/\+=_-~@#$%^&*`.
- Green falling characters (`#7fd962`) on a dark background.
- Sparse rendering — characters appear with ~3% probability per frame for a subtle effect.
- **Toggled** via `/animation on` and `/animation off` commands.
- State is persisted — your choice is saved in `localStorage`.
- Default: **OFF**.

---

## Scanline Overlay

A CSS-based CRT scanline effect applied over the entire page using a repeating linear gradient. This creates the iconic retro monitor look with subtle horizontal lines.

---

## Random Facts

A curated collection of **30** interesting facts about science, technology, nature, and history. One random fact is displayed at the bottom-right of the page each time a new tab is opened.

**Sample facts:**
- *"Git was created by Linus Torvalds in just 10 days."*
- *"Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible."*
- *"Linux runs on over 90% of the world's top 500 supercomputers."*

---

## Rocket Space Defender Game

A full-featured retro arcade game accessible via the `/game` command.

### Gameplay
- **Genre:** Horizontal side-scrolling space shooter.
- **Objective:** Defend against incoming alien ships from the right side of the screen.
- **Art style:** Pixel art rendered on a `<canvas>`, using an all-green monochrome palette.

### Controls

| Key | Action |
|---|---|
| Arrow keys or `W` `A` `S` `D` | Move the rocket ship |
| `Space` | Shoot / Start game / Restart after game over |
| `Escape` | Quit and return to terminal |

### Game Mechanics

- **Rocket:** A pixel-art spaceship facing right with a flickering engine flame animation.
- **Bullets:** Fire to the right with a trailing green glow effect. Cooldown of 8 frames between shots.
- **Enemies:** Three alien types that scale with difficulty:

  | Type | Appears at | HP | Sprite Size | Points |
  |---|---|---|---|---|
  | Simple | Level 1+ | 1 | Small (4x5 grid) | 10 |
  | Medium | Level 3+ | 2 | Medium (6x7 grid) | 20 |
  | Big | Level 5+ | 3 | Large (8x9 grid) | 30 |

- **Health bars** appear above multi-HP enemies.
- **Particles:** Green pixel explosion effect when enemies are destroyed.
- **Star field:** Scrolling background stars for depth.

### Progression System
- **Levels** increase every **600 frames** (~10 seconds).
- Each level increases:
  - Alien movement speed
  - Alien spawn rate (enemies appear more frequently)
  - Bullet speed
  - Rocket movement speed
- **Game Over** triggers when:
  - An alien passes the left edge of the screen.
  - An alien collides with the rocket.
- **High score** is saved in `localStorage` and displayed on the game over screen.

### HUD
- **Score** and **Level** displayed at the top center during gameplay.
- Start screen features an ASCII art "ROCKET" title.

---

## Design & Theming

### Color Palette (Ayu Dark Inspired)

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#0a0e14` | Primary background |
| `--bg2` | `#0d1117` | Panel / terminal background |
| `--bg3` | `#151b23` | Titlebar / elevated surfaces |
| `--fg` | `#b3b1ad` | Primary text |
| `--fg2` | `#565b66` | Secondary / muted text |
| `--accent` | `#39c5bb` | Accent color (teal) |
| `--green` | `#7fd962` | Success, clock, game elements |
| `--red` | `#f07178` | Errors, delete buttons |
| `--yellow` | `#e6b450` | Warnings, headings in notes |
| `--blue` | `#59c2ff` | Info, hostname, links |
| `--magenta` | `#d2a6ff` | File path, italic text |
| `--cyan` | `#95e6cb` | Help commands, inline code |
| `--orange` | `#ff8f40` | Reserved accent |
| `--border` | `#1e2630` | All borders and dividers |

### Typography
- **Primary font:** `JetBrains Mono` (with fallbacks to Fira Code, Cascadia Code, monospace).
- **Clock font:** `Silkscreen` — a pixel/display font for the retro clock.
- Both fonts loaded from Google Fonts.

### Visual Effects
- **Box shadows** on the terminal window for depth.
- **Glow effects** on the clock and game elements via `text-shadow`.
- **Fade-in animation** on terminal output lines.
- **Blink animation** on "press SPACE to start" in the game.
- **Hover transitions** on buttons, todo items, and note cards.
- **Custom scrollbars** styled for WebKit browsers.

---

## Data Persistence

All user data is stored in the browser's `localStorage`:

| Key | Data |
|---|---|
| `termConfig` | Username and hostname configuration |
| `cmdHistory` | Array of last 50 commands |
| `stickyNotes` | Array of markdown note strings |
| `todos` | Array of todo objects `{ text, done, priority }` |
| `asciiRain` | Animation toggle state (`"on"` / `"off"`) |
| `rocketHighScore` | Highest score achieved in the game |

> **Note:** Data is per-browser and per-profile. Clearing browser data will reset everything.

---

## Keyboard Shortcuts

| Key | Context | Action |
|---|---|---|
| Any printable key | Anywhere on page | Auto-focuses the terminal input |
| `Enter` | Terminal input | Execute command |
| Up / Down | Terminal input | Navigate command history |
| Up / Down | Autocomplete open | Navigate suggestions |
| `Tab` | Autocomplete open | Accept highlighted suggestion |
| `Escape` | Autocomplete open | Dismiss autocomplete |
| `Escape` | Todo input | Close todo input and refocus terminal |
| `Escape` | In game | Exit game and return to terminal |
| `Space` | Game start/over screen | Start or restart the game |

---

## Technologies Used

- **HTML5** — Semantic structure and canvas element
- **CSS3** — Custom properties, grid layouts, animations, glassmorphism
- **Vanilla JavaScript** — No frameworks, no dependencies
- **Canvas API** — Matrix rain animation and game rendering
- **Chrome Extension API** — Manifest V3, `chrome_url_overrides`
- **Google Fonts** — JetBrains Mono, Silkscreen
- **localStorage** — Client-side data persistence

---

## Manifest Details

```json
{
  "manifest_version": 3,
  "name": "Terminal New Tab",
  "version": "1.0.0",
  "description": "A customizable terminal-themed new tab page with commands, sticky notes, todo list, and a rocket game.",
  "chrome_url_overrides": {
    "newtab": "index.html"
  }
}
```

- Uses **Manifest V3** (latest Chrome extension standard).
- Overrides the **new tab** page with `index.html`.
- No special permissions required.

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/awesome-feature`
3. Commit your changes: `git commit -m 'Add awesome feature'`
4. Push to the branch: `git push origin feature/awesome-feature`
5. Open a Pull Request

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

**Made with love and a lot of terminal sessions.**

</div>
