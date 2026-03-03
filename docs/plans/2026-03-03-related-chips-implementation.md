# Related Chips Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add follow-up linking UI, linked-chip navigation in the detail panel, and SVG connector lines between linked chips on the calendar grid.

**Architecture:** Chip ref map (Map<string, HTMLElement>) lifted to CalendarShell, passed down to ChipPill for registration and to a new ChipConnectors SVG overlay for drawing. Detail panel gets a Follow-up button (creates successor chip) and a Linked-from section (navigate to/unlink predecessor). No schema changes.

**Tech Stack:** React refs, ResizeObserver, SVG `<line>`, existing Next.js API routes

---

### Task 1: Chip Ref Map Context

**Files:**
- Create: `components/calendar/ChipRefContext.tsx`

**Step 1: Create the context**

```tsx
"use client";

import { createContext, useContext, useRef, useCallback } from "react";

type ChipRefMap = Map<string, HTMLElement>;

interface ChipRefContextValue {
  register: (chipId: string, el: HTMLElement) => void;
  unregister: (chipId: string) => void;
  getRef: (chipId: string) => HTMLElement | undefined;
  mapRef: React.RefObject<ChipRefMap>;
}

const ChipRefContext = createContext<ChipRefContextValue | null>(null);

export function ChipRefProvider({ children }: { children: React.ReactNode }) {
  const mapRef = useRef<ChipRefMap>(new Map());

  const register = useCallback((chipId: string, el: HTMLElement) => {
    mapRef.current.set(chipId, el);
  }, []);

  const unregister = useCallback((chipId: string) => {
    mapRef.current.delete(chipId);
  }, []);

  const getRef = useCallback((chipId: string) => {
    return mapRef.current.get(chipId);
  }, []);

  return (
    <ChipRefContext.Provider value={{ register, unregister, getRef, mapRef }}>
      {children}
    </ChipRefContext.Provider>
  );
}

export function useChipRefs() {
  const ctx = useContext(ChipRefContext);
  if (!ctx) throw new Error("useChipRefs must be used within ChipRefProvider");
  return ctx;
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors from ChipRefContext.tsx

**Step 3: Commit**

```
feat: add ChipRefContext for tracking chip DOM positions
```

---

### Task 2: Register ChipPill in Ref Map

**Files:**
- Modify: `components/chips/ChipPill.tsx`

**Step 1: Add ref registration**

Import `useChipRefs` and use a callback ref to register/unregister:

```tsx
import { useChipRefs } from "@/components/calendar/ChipRefContext";
```

Inside `ChipPill`, before the return:

```tsx
const { register, unregister } = useChipRefs();
```

Replace the existing `ref={ref}` on the outer div with a combined ref that handles both dnd-kit and the chip ref map:

```tsx
const combinedRef = useCallback(
  (el: HTMLElement | null) => {
    // dnd-kit ref
    ref(el);
    // chip ref map
    if (el) {
      register(chip.id, el);
    } else {
      unregister(chip.id);
    }
  },
  [ref, register, unregister, chip.id]
);
```

Use `combinedRef` as the ref on the outer div.

Add `import { useCallback } from "react";` to the imports.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```
feat: register ChipPill DOM elements in ref map
```

---

### Task 3: ChipConnectors SVG Overlay

**Files:**
- Create: `components/calendar/ChipConnectors.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useChipRefs } from "./ChipRefContext";
import type { Chip, ChipColour } from "@/lib/types";

interface ChipConnectorsProps {
  chips: Chip[];
  colours: ChipColour[];
  gridRef: React.RefObject<HTMLDivElement | null>;
}

interface ConnectorLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  key: string;
}

export function ChipConnectors({ chips, colours, gridRef }: ChipConnectorsProps) {
  const { mapRef } = useChipRefs();
  const [lines, setLines] = useState<ConnectorLine[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const gridRect = grid.getBoundingClientRect();
    setSize({ width: gridRect.width, height: gridRect.height });

    const result: ConnectorLine[] = [];
    const refMap = mapRef.current;

    for (const chip of chips) {
      if (!chip.linkedChipId) continue;
      const childEl = refMap.get(chip.id);
      const parentEl = refMap.get(chip.linkedChipId);
      if (!childEl || !parentEl) continue;

      const childRect = childEl.getBoundingClientRect();
      const parentRect = parentEl.getBoundingClientRect();

      const colour = colours.find((c) => c.id === chip.colourId);
      const hex = colour?.hex ?? "#94a3b8";

      result.push({
        // From center-right of predecessor to center-left of successor
        x1: parentRect.right - gridRect.left,
        y1: parentRect.top + parentRect.height / 2 - gridRect.top,
        x2: childRect.left - gridRect.left,
        y2: childRect.top + childRect.height / 2 - gridRect.top,
        color: hex,
        key: `${chip.linkedChipId}-${chip.id}`,
      });
    }

    setLines(result);
  }, [chips, colours, gridRef, mapRef]);

  useEffect(() => {
    measure();

    const grid = gridRef.current;
    if (!grid) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(grid);
    return () => ro.disconnect();
  }, [measure, gridRef]);

  // Also re-measure when chips change (after a short delay for DOM update)
  useEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [chips, measure]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={size.width}
      height={size.height}
      style={{ zIndex: 10 }}
    >
      {lines.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.color}
          strokeWidth={1}
          strokeOpacity={0.3}
        />
      ))}
    </svg>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 3: Commit**

```
feat: add ChipConnectors SVG overlay component
```

---

### Task 4: Wire Up CalendarShell

**Files:**
- Modify: `components/calendar/CalendarShell.tsx`

**Step 1: Add ChipRefProvider and grid ref**

Import the new components:
```tsx
import { ChipRefProvider } from "./ChipRefContext";
import { ChipConnectors } from "./ChipConnectors";
import { useRef } from "react";
```

Add a grid ref:
```tsx
const gridRef = useRef<HTMLDivElement>(null);
```

**Step 2: Wrap content in ChipRefProvider**

Wrap the `DragDropProvider` contents (sidebar + grid + dock) in `<ChipRefProvider>`. This ensures all ChipPills inside the grid (and sidebar) can register.

**Step 3: Add ref to grid container and overlay**

The grid container is `<div className="flex-1 overflow-auto">` wrapping `<CalendarGrid>`. Make this `relative` and attach `gridRef`:

```tsx
<div className="relative flex-1 overflow-auto" ref={gridRef}>
  <CalendarGrid ... />
  <ChipConnectors chips={chips} colours={colours} gridRef={gridRef} />
</div>
```

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 5: Commit**

```
feat: wire ChipRefProvider and ChipConnectors into CalendarShell
```

---

### Task 5: Detail Panel — Linked-from Section

**Files:**
- Modify: `components/chips/ChipDetailPanel.tsx`

**Step 1: Add linked chip state and fetching**

Add state for the linked chip's title:
```tsx
const [linkedChip, setLinkedChip] = useState<{ id: string; title: string } | null>(null);
```

In the existing `useEffect` that syncs chip state, add:
```tsx
if (chip.linkedChipId) {
  fetch(`/api/chips/${chip.linkedChipId}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => setLinkedChip(data ? { id: data.id, title: data.title } : null));
} else {
  setLinkedChip(null);
}
```

**Step 2: Add Linked-from UI**

Below the title Input and above the Schedule fieldset, add:

```tsx
{linkedChip && (
  <div className="flex items-center gap-2 rounded-md border border-dashed p-2 text-sm">
    <span className="text-muted-foreground">←</span>
    <button
      className="min-w-0 flex-1 truncate text-left text-primary hover:underline"
      onClick={() => {
        // Navigate to linked chip by calling onLinkedChipClick
      }}
    >
      {linkedChip.title}
    </button>
    <Button
      variant="ghost"
      size="sm"
      className="h-6 text-xs text-muted-foreground"
      onClick={async () => {
        if (!chip) return;
        await fetch(`/api/chips/${chip.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkedChipId: null }),
        });
        setLinkedChip(null);
        onUpdated();
      }}
    >
      Unlink
    </Button>
  </div>
)}
```

**Step 3: Add onLinkedChipClick prop**

Add to `ChipDetailPanelProps`:
```tsx
onLinkedChipClick?: (chipId: string) => void;
```

Wire the button's onClick to call `onLinkedChipClick?.(linkedChip.id)`.

**Step 4: Wire in CalendarShell**

In `CalendarShell`, add `onLinkedChipClick` to the `ChipDetailPanel`:
```tsx
onLinkedChipClick={async (chipId) => {
  const res = await fetch(`/api/chips/${chipId}`);
  if (res.ok) setSelectedChip(await res.json());
}}
```

**Step 5: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 6: Commit**

```
feat: add linked-from section with navigate and unlink in detail panel
```

---

### Task 6: Detail Panel — Follow-up Button

**Files:**
- Modify: `components/chips/ChipDetailPanel.tsx`
- Modify: `components/calendar/CalendarShell.tsx`

**Step 1: Add the Follow-up button**

In the SheetFooter, add a "Follow-up" button between Save and Unschedule:

```tsx
<Button
  variant="outline"
  onClick={async () => {
    if (!chip) return;
    const res = await fetch("/api/chips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "",
        linkedChipId: chip.id,
        colourId: chip.colourId,
        date: chip.date,
        status: "lumet",
      }),
    });
    if (res.ok) {
      const created = await res.json();
      onUpdated();
      onFollowUp?.(created);
    }
  }}
>
  Follow-up
</Button>
```

**Step 2: Add onFollowUp prop**

Add to `ChipDetailPanelProps`:
```tsx
onFollowUp?: (chip: Chip) => void;
```

**Step 3: Wire in CalendarShell**

```tsx
onFollowUp={(newChip) => {
  setSelectedChip(newChip);
  refreshAll();
}}
```

**Step 4: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 5: Commit**

```
feat: add follow-up button to create linked successor chip
```

---

### Task 7: Build Verification

**Step 1: Run full build**

Run: `bun run build`
Expected: Build succeeds, all routes listed

**Step 2: Manual smoke test**

Run: `bun run dev`

Test:
1. Open a chip's detail panel → click "Follow-up" → new chip created with linked back-arrow
2. New chip's detail panel shows "← [original title]" link
3. Click the link → navigates back to the original chip
4. Click "Unlink" → link removed
5. Both chips visible on same month → straight hairline connector between them
6. Navigate to a different month where only one chip is visible → no connector, just ← badge

**Step 3: Commit any fixes**

---

## Files Summary

**New (2):**
- `components/calendar/ChipRefContext.tsx`
- `components/calendar/ChipConnectors.tsx`

**Modified (3):**
- `components/chips/ChipPill.tsx` — register in ref map
- `components/chips/ChipDetailPanel.tsx` — linked-from section, follow-up button
- `components/calendar/CalendarShell.tsx` — ChipRefProvider, grid ref, ChipConnectors overlay, new callbacks
