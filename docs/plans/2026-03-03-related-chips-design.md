# Related Chips (Linked Chip UI) Design

**Date**: 2026-03-03
**Scope**: Follow-up linking UI, linked-chip navigation, SVG connector lines on the calendar grid.

## Data Model

No schema changes. `chips.linkedChipId` (nullable self-referencing FK) already exists. A chip with `linkedChipId` set points to its **predecessor**. This forms singly-linked chains: chip C → chip B → chip A.

Use cases: follow-ups (Part 2 of a story), recurring events (this week's standup → last week's), any predecessor relationship.

## Detail Panel Changes

### Follow-up Button

A "Follow-up" button in the `ChipDetailPanel` footer. On click:

1. Creates a new chip via `POST /api/chips` with:
   - `linkedChipId` = current chip's ID
   - `colourId` = current chip's colour
   - `date` = current chip's date (or null if unscheduled)
   - `status` = "lumet"
   - `title` = "" (empty, user fills in)
2. Closes the current detail panel
3. Opens the detail panel for the newly created chip

### Linked-from Section

Shown in the detail panel when `linkedChipId` is set. Displays:

- The predecessor chip's title as a clickable link (navigates to that chip's detail panel)
- An "Unlink" button that clears `linkedChipId` via PATCH

Located below the title input, above the Schedule section.

## SVG Connector Overlay

### Architecture

A `ChipConnectors` component renders as an absolutely-positioned `<svg>` overlay covering the calendar grid area. It sits above the grid cells but has `pointer-events: none` so clicks and drags pass through.

### Ref Registration

`ChipPill` accepts a callback prop to register its DOM element in a shared `Map<string, HTMLElement>` (the "chip ref map"). This map is lifted to `CalendarShell` and passed down via props or context. On mount, each pill registers; on unmount, it deregisters.

### Drawing Logic

`ChipConnectors` receives the `chips` array, the chip ref map, colours, and a `gridRef` (ref to the grid container). It:

1. Filters to chips where `linkedChipId` is set AND both the chip and its predecessor have entries in the ref map (both visible)
2. For each pair, reads bounding rects relative to the grid container
3. Draws a `<line>` from the center-right of the predecessor to the center-left of the successor
4. Line style: 1px stroke, chip's colour at 30% opacity

### Re-measurement

A `ResizeObserver` on the grid container triggers a re-render of connector positions. Also re-renders when the `chips` array changes (new links, month navigation, etc.).

### Visibility

Only draws connectors when both linked chips are in the current month view. When only one chip is visible, the existing `←` badge on the ChipPill serves as the indicator (already implemented).

## Component Changes

| Component | Changes |
|---|---|
| `CalendarShell` | Add chip ref map state, grid container ref, render `ChipConnectors` overlay |
| `ChipPill` | Accept and call ref registration callback |
| `ChipDetailPanel` | Add Follow-up button, Linked-from section, fetch linked chip title |
| `CalendarGrid` | Forward grid ref |

## New Components

| Component | Purpose |
|---|---|
| `ChipConnectors` | SVG overlay drawing hairlines between linked chip pairs |
