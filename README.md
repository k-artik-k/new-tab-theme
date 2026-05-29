# TabOS

Terminal-style new tab page for Chrome. 4 themes, commands, notes, todos, and retro games.

## Install

1. Clone or download this repo
2. Go to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** → select this folder
5. Open a new tab

## Themes

| Command | Theme |
|---|---|
| `/theme terminal` | Dark terminal (default) |
| `/theme neo` | Neo brutalism |
| `/theme liquid` | Liquid glass |
| `/theme aero` | Windows 7 Aero |

## Commands

| Command | What it does |
|---|---|
| `/help` | Show all commands |
| `g: <query>` | Google search |
| `/gpt <prompt>` | Open ChatGPT with prompt |
| `/claude <prompt>` | Open Claude with prompt |
| `/yt <query>` | YouTube search |
| `/cat [text]` | Create a note |
| `/todo add <task>` | Add a task |
| `/game chicken` | Play Chicken Defender |
| `/rain on\|off` | Toggle rain animation |
| `/blur` | Toggle privacy blur |
| `/config accent <color>` | Change accent color |
| `/config enable <widget>` | Show a widget |
| `/config disable <widget>` | Hide a widget |
| `/export` | Copy all data to clipboard |
| `/shortcut add <name> <url>` | Add custom shortcut |

Commands work with or without the `/` prefix.

## Widgets

Terminal, analog clock, calendar, todo list, notes, pomodoro timer, fact bar.

Toggle any widget: `/widget toggle <name>`

## Notes

- Click `+` in the notes panel to create
- Or type `/cat your note text here`
- Markdown supported: **bold**, *italic*, `code`, lists, tables

## Data

Everything is stored in `localStorage`. Nothing leaves your browser.

`/export` copies all notes, todos, shortcuts, and config as JSON to your clipboard.

## Easter Eggs

There are some. Try things.
