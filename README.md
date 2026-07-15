# TabOS

Terminal-style new tab page for Chrome with local commands, notes, todos, rain, facts, and lazy-loaded retro games.

## Install

1. Clone or download this repo
2. Go to `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select this folder
5. Open a new tab

## Layout Themes

| Command                  | Theme                 |
| ------------------------ | --------------------- |
| `/config theme terminal` | Dark terminal layout  |
| `/config theme neo`      | Pastel minimal layout |

## Commands

| Command                      | What it does                                  |
| ---------------------------- | --------------------------------------------- |
| `/help`                      | Show all commands                             |
| `g: <query>`                 | Google search                                 |
| `/gpt <prompt>`              | Open ChatGPT with prompt                      |
| `/claude <prompt>`           | Open Claude with prompt                       |
| `/yt <query>`                | YouTube search                                |
| `/cat [text]`                | Create a note                                 |
| `/todo add <task>`           | Add a task                                    |
| `/game chicken`              | Lazy-load and play Chicken Defender           |
| `/rain on\|off`              | Toggle rain                                   |
| `/blur`                      | Toggle privacy blur                           |
| `/config accent <color>`     | Change accent color                           |
| `/config enable <widget>`    | Show a widget                                 |
| `/config disable <widget>`   | Hide a widget                                 |
| `/export`                    | Confirm with Y/N, then copy data to clipboard |
| `/shortcut add <name> <url>` | Add custom shortcut                           |

Commands work with or without the `/` prefix.

## Widgets

Terminal, analog clock, calendar, todo list, notes, pomodoro timer, and fact bar.

Toggle any widget: `/widget toggle <name>`

## Notes

- Click `+` in the notes panel to create
- Or type `/cat your note text here`
- Markdown supported: **bold**, _italic_, `code`, lists, tables, links

## Todos

Use `DD-MM-YYYY` for due dates, for example:

```text
/todo add finish cleanup ! due:27-06-2026
```

## Data

Everything is stored in `localStorage`. Nothing leaves your browser.

`/export` asks for Y/N confirmation, then copies notes, todos, shortcuts, and config as JSON to your clipboard.

## Extras

There are a few small terminal jokes.
