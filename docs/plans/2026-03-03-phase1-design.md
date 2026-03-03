# Phase 1 Design: Core Calendar + Chips

**Date**: 2026-03-03
**Scope**: Get off the whiteboard — calendar grid, chip CRUD, colours, statuses, detail panel, SQLite storage.

## Data Layer

- SQLite via `better-sqlite3` + Drizzle ORM
- WAL mode enabled
- DB at `data/morelater.db` (gitignored)
- Tables: `chip_colours`, `chips`, `chip_tags`
- Seeded with 5 default colours: Red (Deadlines), Orange (Stories), Yellow (Events), Green (Feeds), Cyan (Reels)

## API Routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/chips` | GET, POST | List (date range filter) and create chips |
| `/api/chips/[id]` | GET, PATCH, DELETE | Single chip operations |
| `/api/colours` | GET, POST, PATCH | Colour palette CRUD |

## UI Components

| Component | Library | Purpose |
|---|---|---|
| CalendarGrid | — | Month view, ISO week rows, Mon-Sun cols |
| WeekRow | — | Single week row of 7 DayCells |
| DayCell | — | Date badge, chip stack (with sort_order gap rendering), + button |
| Chip | — | Coloured block: title, status icon, time, modifiers |
| ChipDetailPanel | shadcn Sheet | Slide-over editor for all chip fields |
| ChipCreatePopover | shadcn Popover | Quick-add: title, colour, time |
| StatusSelector | shadcn ToggleGroup | 5 workflow states |
| ColourSelect | shadcn Select | Colour picker with swatches |

## Drag and Drop

- `@dnd-kit/core` + `@dnd-kit/sortable`
- Between-cell moves (reschedule chip to different day)
- Within-cell reorder (change sort_order)

## Chip Features (Phase 1)

- Full CRUD with all fields from spec
- Status workflow: OBSKUR / LUMET / ACTUS / STATIS / EXSOL (freeform transitions)
- Modifiers: meeting_low (triangle), meeting_high (star), shoot (camera) — independent toggles
- Linked chips (back-arrow reference) with follow-up button
- sort_order with gaps (empty slots rendered as dashed outlines)
- Markdown body with edit/preview toggle

## Out of Scope

- Ingest sidebar, day tags, mobile layout (Phase 2)
- ICS sync, MCP server, Docker (Phase 3)
- Series management, stats, search, keyboard shortcuts (Phase 4)
