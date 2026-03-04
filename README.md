# MoreLater

A drag-and-drop content calendar for planning and scheduling work. Digital replacement for a whiteboard full of coloured sticky notes.

Built with Next.js, SQLite (Drizzle ORM), and Tailwind CSS. Includes an MCP server for AI integration with Claude.

## Features

- **Calendar grid** — week-by-week view with drag-and-drop chips
- **Coloured chips** — categorise items by colour (deadlines, stories, events, feeds, reels)
- **Status workflow** — five-stage pipeline: obskur (idea) → lumet (planned) → actus (active) → statis (waiting) → exsol (done)
- **Ingest sidebar** — unscheduled ideas live here until dragged onto the calendar
- **Linked chips** — create follow-up relationships with visual connectors between days
- **Day tags** — annotate days with labels (PTO, WFH, Print Shop, etc.)
- **iCal feed** — export timed chips to external calendars at `/api/calendar.ics`
- **MCP server** — Claude can read and manage your calendar via Model Context Protocol

## Quick start

```bash
bun install
bun run dev        # Next.js on http://localhost:3000
bun run mcp        # MCP server on http://localhost:3001/mcp
```

The database is created automatically on first run at `data/morelater.db`. Default colours and day tag types are seeded.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_PATH` | `data/morelater.db` | SQLite database file location |
| `MORELATER_API_URL` | `http://localhost:3000` | Base URL the MCP server uses to reach the Next.js API |
| `MCP_PORT` | `3001` | Port the MCP HTTP server listens on |

## Docker

```bash
docker compose up --build
```

This runs both the Next.js app (port 3000) and MCP server (port 3001). Data is persisted in a `./data` volume.

To change ports, edit `docker-compose.yml`:

```yaml
ports:
  - "8080:3000"   # Next.js
  - "8081:3001"   # MCP
```

## MCP server

The MCP server exposes MoreLater's data over [Streamable HTTP](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http) at a single `/mcp` endpoint. It runs as a separate process and calls the Next.js API internally.

### Connecting from Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "morelater": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

### Connecting from Claude Code

Add to your Claude Code settings (`.claude/settings.json` or global):

```json
{
  "mcpServers": {
    "morelater": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

### Tools

| Tool | Description |
|---|---|
| `create_chip` | Create a new chip with title, date, time, duration, colour, status, modifier, shoot flag, body |
| `update_chip` | Update any fields on an existing chip |
| `move_chip` | Reschedule a chip to a different date/time |
| `set_chip_status` | Change a chip's workflow status |
| `delete_chip` | Permanently remove a chip |
| `create_idea` | Create an unscheduled obskur chip (goes to ingest sidebar) |
| `schedule_idea` | Schedule an obskur chip — sets date, colour, advances to lumet |
| `list_chips` | List chips with optional filters (date range, status, unscheduled) |
| `get_week_summary` | Structured summary of chips and day tags for an ISO week |
| `set_day_tag` | Add a tag to a day |
| `remove_day_tag` | Remove a tag from a day |

### Resources

| URI | Description |
|---|---|
| `morelater://chips/{date}` | All chips for a given date (YYYY-MM-DD) |
| `morelater://chip/{id}` | Single chip with full detail |
| `morelater://week/{year}/{week}` | All chips and day tags for an ISO week |
| `morelater://ingest` | Unscheduled obskur chips (the ingest backlog) |
| `morelater://colours` | Available colour categories |
| `morelater://day-tags/{date}` | Tags for a given date |

### Prompts

| Prompt | Description |
|---|---|
| `weekly_briefing` | Generates a briefing for a specific ISO week (defaults to current) |
| `ingest_triage` | Reviews unscheduled ideas and suggests what to schedule, defer, or drop |
| `status_update` | Summarises active, paused, and completed work |

## Tech stack

- [Next.js](https://nextjs.org) 16 + React 19
- [SQLite](https://www.sqlite.org) via [Drizzle ORM](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com) 4 + [shadcn/ui](https://ui.shadcn.com)
- [dnd-kit](https://dndkit.com) for drag-and-drop
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) for AI integration
- [Bun](https://bun.sh) as package manager and runtime
