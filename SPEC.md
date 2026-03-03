# More Later — Content Calendar Spec

> *"More on that later."* — A digital replacement for the whiteboard content calendar, built around draggable coloured chips on a weekly/monthly grid.

---

## 1. What the whiteboard does today

Observations from the physical board:

- **Grid layout**: Week-number column on the left, then Mon→Sun columns. Currently showing weeks 5–11 (Feb–Mar).
- **Coloured chips**: Small sticky-note rectangles placed on day cells. Each colour maps to a content type:
  - 🟥 Red — Deadlines
  - 🟧 Orange — Social media stories
  - 🟨 Yellow / ⬜ White — Events
  - 🟩 Green — Standard feed posts
  - 🩵 Cyan — Short videos (reels)
  - White chips appear on the whiteboard interchangeably with yellow — just a supply issue. In More Later, events are **yellow only**.
- **Camera symbol** (`📷`): Appears on chips (usually yellow event chips) to indicate a shoot is happening **at** that event. The shoot time = the chip time; no separate scheduling needed.
- **Chip modifier symbols** (drawn on or next to chips):
  - `←` — References the previous chip. E.g. a yellow chip (grand opening event) followed by a green chip with `←` means "feed post about the grand opening." This is a **relationship link**, not a status.
  - `△` — Low-stakes meeting
  - `★` — High-stakes meeting
- **Day-level annotations** (next to the date number in the corner of a day cell):
  - `ø` — PTO (paid time off). Appeared on Fridays — those are days off, not chip cancellations.
  - Red corner — Scheduled non-working day (unpaid time off)
  - `P` — In the print shop that day (the number next to it is always the date, e.g. `P 15` = print shop on the 15th)
  - `🏠` — WFH (working from home)
  - DaVinci Resolve logo (looks like a flower/ampersand) — Editing video that day
- **Times**: `15:30`, `17:00`, `19:00`, `10:00` written next to certain chips.
- **Ingest sidebar**: Left column has a running list of content ideas / pitches under a star-marked "Ingest" heading. Items like `KA Volunteer something`, `Ehrenurkunde x JF BW Jan Lange`, `Datkapute 6 in Wohlfüller — Vaporknife`, `Mietpregelinformation`, etc.
- **Legend area**: Bottom-left is just physical chip storage — spare blank chips and the category labels (`DEADLINES`, `STORIES`, `EVENTS`, `FEEDS`, `REELS`). No analytics meaning; just a place to keep unused chips.
- **Week numbers** are the primary row identifier, not dates — the dates flow within.

---

## 2. Core concepts / data model

### 2.1 Chip

The central object. A chip is a single item that lives on a specific day.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `title` | string | Short label shown on the chip (`WGEW 5`, `Podcast`, `CC EsL`) |
| `date` | date? | Which day it sits on. Null = OBSKUR / unscheduled (lives in ingest sidebar) |
| `time` | time? | Optional. If set, shows on chip and enables calendar sync |
| `duration_minutes` | int? | Optional. For calendar event length. For shoots at events, the shoot time = chip time |
| `colour` | FK → ChipColour | The colour category (may be unset for early OBSKUR ideas) |
| `status` | enum | One of: obskur, lumet, actus, statis, exsol. Transitions are freeform |
| `modifier` | enum? | Optional symbol: `meeting_low` (△), `meeting_high` (★), or null |
| `is_shoot` | bool | If true, shows 📷 icon. Indicates a shoot is happening for this chip's topic |
| `linked_chip_id` | FK? | The `←` relationship. Points to the chip this one references (e.g. a feed post linked to a previous event). Null if standalone |
| `sort_order` | int | Position within the day cell. **Gaps are allowed** — a chip at position 3 with nothing at 1 and 2 renders empty slots above it. This supports the follow-up alignment system |
| `body` | rich text / markdown | The "entry behind the chip" — detailed notes, links, assets |
| `starred` | bool | Priority flag, primarily used in the ingest/OBSKUR sidebar |
| `tags` | string[] | Freeform tags for filtering |
| `series` | string? | Optional series name (`WGEW`, `CC`) for grouping numbered content |
| `series_number` | int? | Episode/issue number within a series |
| `calendar_synced` | bool | Whether this chip has been pushed to external calendar |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### 2.2 Chip Colour

User-configurable. Each colour has a semantic meaning.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | e.g. "Working Group Content", "Events", "Podcast" |
| `hex` | string | CSS colour value |
| `sort_order` | int | Order in the palette/legend |
| `icon` | string? | Optional emoji or icon identifier |
| `is_active` | bool | Soft-delete: hidden but chips retain colour reference |

Starting palette (from whiteboard):

| Colour | Hex (approx) | Meaning |
|---|---|---|
| Red | `#E53935` | Deadlines |
| Orange | `#FF9800` | Social media stories |
| Yellow | `#FFEB3B` | Events |
| Green | `#4CAF50` | Standard feed posts |
| Cyan | `#4DD0E1` | Short videos / reels |

### 2.3 Chip Status (workflow)

Five workflow states, each with a stylised name. These track where a chip is in the production pipeline — separate from the modifier symbols (△, ★, ←, 📷) which describe what kind of chip it is.

| Status | Code | Icon | Meaning |
|---|---|---|---|
| OBSKUR | `obskur` | `💡` | Idea — exists but not committed to |
| LUMET | `lumet` | `📌` | Planned — committed, slotted into a day |
| ACTUS | `actus` | `🔧` | In progress — actively being worked on |
| STATIS | `statis` | `⏸` | Waiting — blocked, paused, or awaiting input |
| EXSOL | `exsol` | `📡` | Scheduled — content is done, publishing is automated |

Note: There's no "published" status because publishing happens automatically once a chip reaches EXSOL. The lifecycle is non-linear — any status can transition to any other. Common flows are OBSKUR → LUMET → ACTUS → EXSOL, but a chip in STATIS might jump back to ACTUS when feedback arrives, or an EXSOL chip might return to ACTUS if the schedule changes. **Status transitions are freeform, not enforced.**

### 2.3b Chip Modifiers

Separate from workflow status. A chip can have **zero or one** modifier symbol, plus the shoot flag independently:

| Modifier | Symbol | Meaning |
|---|---|---|
| `meeting_low` | `△` | Low-stakes meeting associated with this chip |
| `meeting_high` | `★` | High-stakes meeting associated with this chip |
| `reference` | `←` | This chip is a follow-up to another chip. Stored as `linked_chip_id` — the arrow points back to the referenced chip |
| `shoot` | `📷` | A shoot is happening for this topic (stored as `is_shoot` bool, independent of modifier) |

The `←` modifier is special: it implies a **link** between two chips. In the UI, clicking the arrow navigates to the linked chip. When creating a chip, if there are chips on the **previous day**, a **"↰ Follow-up" button** appears for each one. Clicking it links this chip to that previous-day chip and **positions the new chip in the same vertical slot** as the one it references. This means day cells can have **empty slots** — a chip at position 3 might have nothing at positions 1 and 2. This mirrors how the physical whiteboard works, where follow-up chips are placed at the same height as the thing they reference.

### 2.4 Day Tag

A day-level annotation independent of chips. Multiple tags per day allowed.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `date` | date | |
| `tag_type` | FK → DayTagType | |

### 2.5 Day Tag Type

User-configurable.

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | e.g. "PTO", "Print Shop", "WFH", "Editing", "Unpaid TO" |
| `icon` | string | Emoji or icon key |
| `colour` | string? | Optional background tint for the day cell |
| `is_active` | bool | |

Starting set (from whiteboard):

| Tag | Icon | Meaning |
|---|---|---|
| PTO | `ø` | Paid time off. Day is off. |
| Unpaid TO | 🟥 (red corner) | Scheduled non-working day, unpaid |
| Print Shop | `P` | In the print shop that day |
| WFH | `🏠` | Working from home |
| Editing | 🎬 (DaVinci Resolve logo) | Video editing day |

These are user-configurable — add/remove/rename as working patterns change.

### 2.6 Ingest = OBSKUR

There is no separate "ingest" entity. **Ingest items are simply chips with status OBSKUR and no date.** The ingest sidebar is a filtered view of all dateless OBSKUR chips.

When an OBSKUR chip is dragged onto a calendar day, it gets a date and its status advances to LUMET. When a chip is "un-scheduled" (removed from a day back to the sidebar), it loses its date and returns to OBSKUR.

This means the chip table handles everything — no separate `ingest_items` table needed. An OBSKUR chip has:

| Field | Value |
|---|---|
| `date` | null (not yet placed) |
| `status` | `obskur` |
| `colour` | may or may not be set yet |
| `starred` | bool — priority flag, shown in sidebar |
| `body` | optional notes about the idea |

---

## 3. Views

### 3.1 Calendar View (primary)

The main screen. Mimics the whiteboard layout.

- **Rows** = weeks (identified by ISO week number, shown on left edge)
- **Columns** = Mon → Sun
- **Day cells** contain:
  - Date number (top-right, muted)
  - Day tags as small icon badges (top-left)
  - Stacked chips, each showing: colour block + title + status icon + time (if set)
  - Chips are **drag-and-droppable** between cells (rescheduling)
- **Month boundaries** shown as a subtle divider or label when weeks span two months
- **Current day** highlighted
- **Scroll**: vertical scroll through weeks, or pagination by month
- **Zoom levels**: Month overview (compact chips, just colour blocks) ↔ Week detail (larger chips, more text visible)

### 3.1b Mobile View

Basic responsive layout for phone access. Not a full mobile app — just a usable web view.

- Default to **single-week view** (one week at a time, swipe to navigate)
- Chips stack vertically in day cells, tap to open detail panel (full-screen on mobile)
- Day tags shown as icon row at top of each day
- Ingest sidebar becomes a bottom sheet or separate tab
- Drag-and-drop replaced with long-press → "Move to..." date picker
- Quick-add chip via floating action button
- No multi-select or bulk actions on mobile — keep it read-heavy, light-edit

### 3.2 Chip Detail Panel

Opens as a **slide-over panel** (right side) or modal when clicking a chip. Contains:

- All chip fields, editable
- Rich text body (markdown with preview)
- File/image attachments area
- Status selector (OBSKUR → LUMET → ACTUS → STATIS → EXSOL)
- Modifier toggles (△ ★ 📷) and follow-up link display (← with link to referenced chip)
- "Sync to calendar" button
- Activity log / change history at the bottom
- "Unschedule" button (removes date, returns to OBSKUR, chip moves back to ingest sidebar)

### 3.3 Ingest Sidebar (OBSKUR chips)

Toggleable left panel. Mirrors the whiteboard's idea column. This is a **filtered view of all chips with status OBSKUR and no date**.

- List of OBSKUR chips, newest at top
- Drag an OBSKUR chip onto a calendar day → sets its date and advances status to LUMET (prompts for colour if not yet set)
- Quick-add text field at top (creates an OBSKUR chip with just a title)
- Filter by starred / unstarred
- Chips that have been scheduled show a link to their calendar position

### 3.4 Settings / Configuration

Built with shadcn `Tabs` for section navigation:

- **Chip Colours**: add, rename, recolour, reorder, deactivate (shadcn `Table` + `Dialog` for editing)
- **Day Tag Types**: add, rename, change icon, deactivate
- **Calendar sync**: shows the .ics subscription URL, copy-to-clipboard button

### 3.5 Legend / Stats Bar (optional)

The whiteboard's bottom-left was just chip storage, but the digital version could optionally show:

- Colour-coded chip counts for the visible time range
- Breakdown by status
- Upcoming deadlines

This is low priority — nice to have, not essential for getting off the whiteboard.

---

## 4. Interactions

| Action | Mechanism |
|---|---|
| Add chip to a day | Click `+` in day cell → quick-create popover (title, colour, time) |
| Move chip | Drag and drop between day cells |
| Reorder chips within a day | Drag vertically within cell |
| Change chip status | Click status icon on chip → cycle through statuses, or right-click menu |
| Edit chip details | Click chip → opens detail panel |
| Add day tag | Click day header area → tag selector dropdown |
| Remove day tag | Click existing tag icon → removes it |
| Add ingest item | Type in sidebar quick-add → creates OBSKUR chip with no date |
| Schedule ingest item | Drag from sidebar onto a day cell → sets date, prompts colour, status → LUMET |
| Bulk actions | Multi-select chips (checkbox mode) → move, change status, delete |

---

## 5. Calendar sync (one-way, ICS only)

Chips with a `time` set can be exported to external calendars via ICS. One-way: More Later → Calendar. No import, no CalDAV.

### Implementation

**ICS file generation** via the `ical-generator` npm package:

- A Next.js API route at `/api/calendar.ics` generates an `.ics` file on each request, containing all chips that have a `time` set.
- Each chip becomes a `VEVENT` with: title, date/time, duration (default 60min if unset), description (chip body truncated), and a stable UID derived from the chip ID.
- The colour category and status are included in the description or as `CATEGORIES`.
- Chips with `is_shoot` get "📷 " prepended to the title in the calendar.

### ICS subscription (optional)

Any calendar app (Google Calendar, Apple Calendar, Thunderbird) can subscribe to the `.ics` URL:

```
http://<your-tailscale-ip>:3000/api/calendar.ics
```

The calendar app polls this URL on its own schedule (usually every few hours). Changes in More Later are reflected on the next poll. No push mechanism — this is intentionally simple.

If you later set up `tailscale serve`, the URL becomes `https://morelater.<tailnet>.ts.net/api/calendar.ics`, which is nicer for subscription.

---

## 6. MCP Server

Expose More Later's functionality as an MCP (Model Context Protocol) tool server so that Claude (or another agent) can take actions.

### 6.1 Resources (read)

| Resource URI | Description |
|---|---|
| `morelater://chips/{date}` | All chips for a given date |
| `morelater://chips/{id}` | Single chip with full detail |
| `morelater://week/{year}/{week}` | All chips + day tags for a week |
| `morelater://ingest` | All OBSKUR chips with no date (the ingest backlog) |
| `morelater://colours` | Current colour palette |
| `morelater://day-tags/{date}` | Tags for a given date |

### 6.2 Tools (write)

| Tool | Parameters | Description |
|---|---|---|
| `create_chip` | title, date, colour, time?, body?, status?, modifier?, is_shoot? | Add a new chip |
| `update_chip` | id, fields to update | Modify chip fields |
| `move_chip` | id, new_date, new_time? | Reschedule a chip |
| `set_chip_status` | id, status | Change workflow status (obskur/lumet/actus/statis/exsol) |
| `set_chip_modifier` | id, modifier | Set modifier symbol (△, ★, or clear) |
| `link_chip` | id, linked_chip_id | Set the `←` reference to another chip |
| `delete_chip` | id | Remove a chip |
| `create_idea` | title, body?, starred? | Create an OBSKUR chip (no date — goes to ingest sidebar) |
| `schedule_idea` | id, date, colour | Set date + colour on an OBSKUR chip, advance to LUMET |
| `set_day_tag` | date, tag_type | Add a day tag |
| `remove_day_tag` | date, tag_type | Remove a day tag |
| `list_chips` | date_range?, colour?, status? | Query chips with filters |
| `get_week_summary` | year, week | Summary of the week's content plan |

### 6.3 Prompts (optional)

| Prompt | Description |
|---|---|
| `weekly_briefing` | "What's on More Later this week?" |
| `ingest_triage` | "Here are the unscheduled ideas — help me prioritise and slot them in" |
| `status_update` | "What's ACTUS, what's STATIS, what's reached EXSOL?" |

This means you could say to Claude: *"Schedule the Mietpregelinformation post for next Thursday as a green chip, 15:00"* and it just happens.

---

## 7. Tech stack

### Priorities

- **Local-first**: data lives on your machine, no cloud dependency
- **Web-based**: accessible from a browser on any device on your Tailscale network
- **Self-hostable**: runs on your own hardware, accessed via Tailscale
- **No subscription**: open source, self-hosted
- **MCP-compatible**: needs a server process anyway
- **Single-user**: no auth layer needed — Tailscale IS the auth

### Recommended stack

| Layer | Choice | Rationale |
|---|---|---|
| **Runtime** | Node.js 20+ | Stable LTS, good for self-hosted server |
| **Framework** | Next.js 14+ (App Router) | Full-stack: React frontend + API routes as backend. Single deployable unit |
| **Database** | SQLite via `better-sqlite3` | Local-first, single file, zero config. Lives on the server filesystem |
| **ORM** | Drizzle ORM | Type-safe, lightweight, great SQLite support. Handles migrations |
| **MCP server** | `@modelcontextprotocol/sdk` | Official TS SDK. Runs as a separate process alongside Next.js, shares the same SQLite DB |
| **Calendar sync** | `ical-generator` (npm) | Generates .ics files. Served via a Next.js API route |
| **Drag & drop** | `@dnd-kit/core` + `@dnd-kit/sortable` | Best React DnD library. Handles both between-cell and within-cell reordering |
| **Rich text** | Textarea + `react-markdown` for preview | Markdown editing for chip body. Start simple — raw textarea with a preview toggle. Tiptap later if needed |
| **UI components** | shadcn/ui | Pre-built, accessible, composable. Popovers, dialogs, dropdowns, command palette — all ready to go. Avoids reinventing the wheel |
| **Styling** | Tailwind CSS | Ships with Next.js and shadcn/ui. Utility classes make the chip colour system straightforward |
| **Deployment** | Docker (multi-stage build) | Single `docker compose up` to run. Bind-mount for the SQLite DB file so data persists outside the container |

### Architecture

```
+-------------------------------------+
|           Your server               |
|                                     |
|  +----------------------+           |
|  |     Next.js app      | :3000    |
|  |  +----------------+  |           |
|  |  |  App Router    |  | <- browser (via Tailscale)
|  |  |  (React SSR)   |  |           |
|  |  +----------------+  |           |
|  |  |  API Routes    |  |           |
|  |  |  /api/chips    |  |           |
|  |  |  /api/calendar |  | <- .ics subscription URL
|  |  |  /api/day-tags |  |           |
|  |  +----------------+  |           |
|  +----------+-----------+           |
|             | reads/writes          |
|  +----------v-----------+           |
|  |   morelater.db       | (SQLite) |
|  +----------^-----------+           |
|             | reads/writes          |
|  +----------+-----------+           |
|  |   MCP Server         | :stdio   |
|  |   (separate process) | <- Claude / agent
|  +----------------------+           |
+-------------------------------------+
```

**Why Next.js specifically:**

- **Single deployable unit**: Frontend and backend API in one repo, one build, one process. No separate backend server to manage.
- **Server Components**: Calendar grid can be server-rendered for fast initial load, with client-side interactivity layered on for drag-and-drop.
- **API Routes**: `/api/chips`, `/api/day-tags`, `/api/calendar.ics` — clean REST endpoints that the MCP server can also call, or that the frontend hits directly.
- **Tailscale-friendly**: Runs on a single port. Access it by IP:port on your tailnet — no nginx, no TLS config, no auth layer needed. Can upgrade to `tailscale serve` later for a clean hostname if desired.
- **Mobile for free**: Responsive Tailwind + server rendering means the mobile view works without a separate build.

### MCP server as sidecar

The MCP server runs as a **separate Node.js process** alongside Next.js, but shares the same SQLite database file. It uses the `@modelcontextprotocol/sdk` with stdio transport (Claude Desktop / Claude Code connects to it directly).

Alternatively, the MCP server could call the Next.js API routes over HTTP instead of touching SQLite directly — this avoids any SQLite locking concerns and keeps the API as the single source of truth. Tradeoff: slightly more latency, but cleaner separation.

```bash
# Running it
$ node server.js          # Next.js on :3000
$ node mcp-server.js      # MCP on stdio, connects to same morelater.db
```

### Directory structure

```
more-later/
+-- app/                        # Next.js App Router
|   +-- layout.tsx              # Root layout (sidebar + main)
|   +-- page.tsx                # Calendar view (default route)
|   +-- api/
|   |   +-- chips/
|   |   |   +-- route.ts        # GET (list), POST (create)
|   |   |   +-- [id]/
|   |   |       +-- route.ts    # GET, PATCH, DELETE single chip
|   |   +-- day-tags/
|   |   |   +-- route.ts        # GET, POST, DELETE
|   |   +-- colours/
|   |   |   +-- route.ts        # GET, POST, PATCH
|   |   +-- calendar.ics/
|   |       +-- route.ts        # GET — serves .ics file
|   +-- settings/
|       +-- page.tsx            # Colour, day tag, status config
+-- components/
|   +-- calendar/
|   |   +-- CalendarGrid.tsx    # Main month grid with week rows
|   |   +-- DayCell.tsx         # Single day cell with chip stack
|   |   +-- WeekRow.tsx         # One row = one week
|   |   +-- MobileWeekView.tsx  # Single-week swipe view
|   +-- chips/
|   |   +-- Chip.tsx            # Rendered chip with colour, icons, status
|   |   +-- ChipDetailPanel.tsx # Slide-over editor
|   |   +-- ChipCreatePopover.tsx # Quick-add popover in day cell
|   |   +-- FollowUpButton.tsx  # The <- button for linking
|   +-- ingest/
|   |   +-- IngestSidebar.tsx   # OBSKUR chip list + quick-add
|   +-- ui/
|       +-- DayTagBadge.tsx     # Small icon badge for day tags
|       +-- StatusSelector.tsx  # OBSKUR/LUMET/ACTUS/STATIS/EXSOL
+-- lib/
|   +-- db.ts                   # Drizzle ORM setup + SQLite connection
|   +-- schema.ts               # Drizzle table definitions
|   +-- migrations/             # Drizzle migration files
|   +-- ical.ts                 # .ics generation logic
+-- mcp/
|   +-- server.ts               # MCP server entry point
|   +-- tools.ts                # Tool definitions (create_chip, move_chip, etc.)
|   +-- resources.ts            # Resource definitions (morelater:// URIs)
+-- docker-compose.yml
+-- Dockerfile
+-- package.json
+-- data/                       # Bind-mounted, excluded from git
    +-- morelater.db            # SQLite database (created on first run)
```

### Dockerisation

```dockerfile
# Dockerfile (multi-stage)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/mcp ./mcp

EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
services:
  morelater:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data    # SQLite DB persists here
    environment:
      - DATABASE_PATH=/app/data/morelater.db
    restart: unless-stopped
```

The SQLite DB file lives in a bind-mounted `./data` directory, so it survives container rebuilds. Backup = copy `./data/morelater.db`.

### shadcn/ui component mapping

Ready-made shadcn components mapped to More Later's UI elements:

| UI element | shadcn component | Notes |
|---|---|---|
| Chip create form | `Popover` + `Input` + `Select` | Quick-add popover inside day cells |
| Chip detail editor | `Sheet` (side panel) | Slide-over from right side |
| Status selector | `ToggleGroup` | Row of 5 status buttons: OBSKUR / LUMET / ACTUS / STATIS / EXSOL |
| Colour picker | `Select` with coloured dots | Or `RadioGroup` with colour swatches |
| Day tag selector | `DropdownMenu` | Click day header → pick tags |
| Modifier toggles | `Toggle` buttons | △ ★ 📷 as icon toggles in detail panel |
| Settings pages | `Tabs` + `Table` + `Dialog` | Colour config, day tag config |
| Ingest quick-add | `Input` + `Button` | Text field at top of sidebar |
| Confirmation dialogs | `AlertDialog` | Delete chip, unschedule, etc. |
| Calendar month picker | `Calendar` (date picker) | For navigating to a specific month |
| Mobile date nav | `Drawer` | Bottom sheet for week navigation on mobile |
| Markdown preview | `Tabs` ("Edit" / "Preview") | Toggle between textarea and rendered markdown |
| Follow-up chip list | `Command` | Searchable list of previous-day chips when linking |

---

## 8. Data storage

### SQLite schema (simplified)

```sql
CREATE TABLE chip_colours (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hex TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE chips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT,                     -- ISO 8601 date, NULL = OBSKUR/unscheduled
  time TEXT,                     -- HH:MM or null
  duration_minutes INTEGER,
  colour_id TEXT REFERENCES chip_colours(id),  -- nullable for early OBSKUR ideas
  status TEXT NOT NULL DEFAULT 'obskur',
  modifier TEXT,                 -- 'meeting_low', 'meeting_high', or null
  is_shoot BOOLEAN NOT NULL DEFAULT 0,  -- 📷 flag
  linked_chip_id TEXT REFERENCES chips(id),  -- ← reference
  sort_order INTEGER NOT NULL DEFAULT 0,
  body TEXT,                     -- markdown
  starred BOOLEAN NOT NULL DEFAULT 0,  -- priority flag for ingest sidebar
  series TEXT,
  series_number INTEGER,
  calendar_uid TEXT,             -- UID of synced calendar event
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE chip_tags (
  chip_id TEXT NOT NULL REFERENCES chips(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  PRIMARY KEY (chip_id, tag)
);

CREATE TABLE day_tag_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  colour TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1
);

CREATE TABLE day_tags (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  tag_type_id TEXT NOT NULL REFERENCES day_tag_types(id),
  UNIQUE(date, tag_type_id)
);

```

### Backup

SQLite makes backup trivial: copy the `.db` file. Could also add a scheduled export to JSON for portability.

---

## 9. Implementation phases

### Phase 1 — Core calendar + chips

- Calendar grid view (month, with week numbers)
- Chip CRUD: create, edit, delete, move between days
- Chip colour system with defaults
- Chip modifiers (△, ★, 📷) and `←` linking
- Chip status (workflow states)
- Chip detail panel with markdown body
- SQLite storage
- Basic Tailwind styling

**This gets you off the whiteboard.**

### Phase 2 — Ingest sidebar + day tags + mobile

- Ingest sidebar (filtered view of dateless OBSKUR chips + quick-add)
- Drag OBSKUR chip → day to schedule (auto-advance to LUMET)
- Day tag system (PTO, Print Shop, WFH, Editing, Unpaid TO)
- Day tag configuration UI
- Week view zoom level
- Basic responsive mobile layout (single-week view)

### Phase 3 — Calendar sync + MCP + Docker

- .ics file generation for all timed chips via `/api/calendar.ics`
- ICS subscription support (just serving the endpoint)
- MCP server with full tool set
- MCP resource exposure
- Dockerfile (multi-stage build) + docker-compose.yml
- Bind-mount for SQLite DB persistence

### Phase 4 — Polish + power features

- Series management (auto-increment `WGEW 7`, `WGEW 8`...)
- Stats bar with chip counts per colour/status
- Search and filter across all chips
- Keyboard shortcuts
- Print view (for when you miss the whiteboard)

---

## 10. Remaining considerations

All questions have been resolved. A few implementation-level notes:

1. **SQLite WAL mode**: Enable WAL (Write-Ahead Logging) for safe concurrent reads between Next.js and the MCP server. Single-writer is fine since it's single-user.
2. **Empty chip slots**: The follow-up system means day cells can have gaps in their chip stack. The `sort_order` field allows non-contiguous values. The UI should render empty slots (faded/dashed outlines) to preserve the visual alignment — this is how the physical whiteboard works.
3. **`better-sqlite3` in Docker**: The `node:20-alpine` image needs `python3` and `make` in the builder stage for `better-sqlite3` to compile. Alternatively, use `better-sqlite3`'s prebuilt binaries via `@napi-rs/better-sqlite3` to avoid the build dependency.

---

## 11. Name

**More Later** — as in *"more on that later,"* the classic news anchor hand-off. Fits perfectly: the whole tool is about things that are coming up, content that's planned but not yet live, stories you'll tell soon. The URI scheme is `morelater://`.
