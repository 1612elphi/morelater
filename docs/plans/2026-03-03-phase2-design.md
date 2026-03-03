# Phase 2 — Ingest Sidebar + Day Tags

## Goal

Add the ingest sidebar (with colour chip pile and OBSKUR chip list), day tag annotations on calendar cells, and the plumbing to drag chips from the sidebar onto the calendar grid.

## Scope

**In scope:**
- Collapsible left sidebar with colour chip pile and ingest list
- Day tag system (display, add, remove, settings configuration)
- Three drag source types (colour blank, ingest chip, calendar chip)
- Unschedule button in detail panel
- Day tag type management in settings

**Out of scope (deferred):**
- Week detail view
- Mobile responsive layout
- Follow-up linking UI (← system)
- Calendar sync

## Architecture

The sidebar lives inside the existing `DragDropProvider` in `CalendarShell` so cross-panel drag-and-drop works natively. Day tags are fetched alongside chips for the visible date range and passed down to `DayCell`.

## Sidebar

A collapsible left panel (~280px) toggled by a button. Three vertical sections:

### 1. Colour Chip Pile (top)

A horizontal row of draggable "blank" chips — one per active colour. Each is a small rounded rectangle showing the colour name and swatch. Dragging one onto a day cell creates a new LUMET chip pre-assigned to that colour. A title input popover appears inline on the target day cell after the drop.

These blanks are **drag sources only** — they don't represent existing data. They're a factory for creating new chips. The drag type is `"colour-blank"` (distinct from `"chip"`).

### 2. Star Filter + Quick-Add

- A toggle to filter the ingest list to starred items only.
- A text input for quick-adding a new OBSKUR chip (title only, no date, no colour).

### 3. Ingest List (scrollable)

All chips where `status = "obskur"` AND `date IS NULL`. Sorted newest-first by `created_at`. Each entry shows the chip title, optional star badge, and colour swatch if assigned.

Chips in this list are draggable onto day cells. On drop:
- The chip's `date` is set to the target day.
- Status advances from `obskur` to `lumet`.
- If the chip has no colour, a colour picker popover appears on the day cell.

When collapsed, the sidebar shows a thin rail with just the toggle icon.

## Day Tags

### Display

Day tags render as small icon badges in the **bottom-right** of each day cell, next to the date number. The date number also moves to the bottom-right (currently top-left). If a tag type has a colour, it applies a light background tint to the entire day cell.

### Adding

Click the date/tag area in the bottom-right → a small dropdown appears listing active tag types. Clicking one creates a `day_tag` record via `POST /api/day-tags`.

### Removing

Click an existing tag badge → deletes it via `DELETE /api/day-tags/[id]`.

### Settings

A new "Day Tags" tab on the settings page. Same pattern as the existing colour configuration: list of tag types with name, icon (text/emoji input), optional colour, and activate/deactivate toggle. The 5 defaults are already seeded in the database.

## API Routes

### New: `/api/day-tags/route.ts`

- `GET ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` — returns all day tags in range, joined with their tag type info.
- `POST { date, tagTypeId }` — creates a day tag. Returns the created record.

### New: `/api/day-tags/[id]/route.ts`

- `DELETE` — removes a day tag.

### New: `/api/day-tag-types/route.ts`

- `GET` — returns all day tag types (active and inactive), sorted by `sort_order`.
- `POST { name, icon, colour?, sortOrder }` — creates a new tag type.
- `PATCH { id, name?, icon?, colour?, sortOrder?, isActive? }` — updates a tag type.

### Modified: `GET /api/chips`

Already supports `?unscheduled=true` which returns chips with `date IS NULL`. Used by the ingest sidebar.

### Modified: `PATCH /api/chips/[id]`

Already supports updating any chip field including `date` and `status`. Used when scheduling/unscheduling.

## Drag-and-Drop

| Source | Type | Target | Action |
|---|---|---|---|
| Colour blank (sidebar) | `colour-blank` | Day cell | Create new LUMET chip with that colour; show title popover |
| Ingest chip (sidebar) | `chip` | Day cell | Set date, advance to LUMET; show colour picker if no colour |
| Calendar chip (grid) | `chip` | Day cell | Move to new date (existing Phase 1 behaviour) |

Day cells accept both `"chip"` and `"colour-blank"` types. The `handleDragEnd` in `CalendarShell` inspects the drag source type to determine behaviour.

## Unschedule

The `ChipDetailPanel` gains an "Unschedule" button visible when the chip has a date. It:
1. PATCHes the chip: `{ date: null, status: "obskur" }`
2. Closes the detail panel
3. Triggers a refetch — chip disappears from calendar and reappears in the ingest sidebar.

## Component Changes

| Component | Changes |
|---|---|
| `CalendarShell` | Add sidebar toggle state, fetch day tags, fetch ingest chips, handle new drag types, render `IngestSidebar` |
| `DayCell` | Move date to bottom-right, accept `dayTags` prop, render tag badges, handle tag add/remove |
| `ChipDetailPanel` | Add "Unschedule" button |
| `Settings page` | Add "Day Tags" tab with tag type CRUD |

## New Components

| Component | Purpose |
|---|---|
| `IngestSidebar` | Collapsible panel with colour pile, quick-add, star filter, ingest list |
| `ColourBlank` | Draggable colour chip blank in the pile |
| `IngestChipRow` | Single ingest chip in the sidebar list, draggable |
| `DayTagBadge` | Small icon badge for a day tag |
| `DayTagDropdown` | Dropdown for adding a tag to a day |
| `DayTagTypeSettings` | Settings tab content for managing tag types |

## Data Flow

```
CalendarShell
├── fetches chips (calendar range) ─────────────► CalendarGrid → WeekRow → DayCell
├── fetches chips (unscheduled+obskur) ─────────► IngestSidebar → IngestChipRow
├── fetches dayTags (calendar range) ───────────► CalendarGrid → WeekRow → DayCell
├── fetches colours ────────────────────────────► IngestSidebar → ColourBlank
├── DragDropProvider wraps both sidebar + grid
└── handleDragEnd routes by drag type
```
