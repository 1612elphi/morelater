# Floating Drag Dock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a floating drop-target bar at the bottom of the viewport that appears during chip drags, with 5 status targets and a delete target.

**Architecture:** Single new component `DragDock` rendered inside the existing `DragDropProvider`. Uses `useDroppable` for each target. CalendarShell gains `isDragging` state and extended `handleDragEnd` logic. No new libraries.

**Tech Stack:** React 19, @dnd-kit/react, Tailwind CSS v4, lucide-react icons

---

### Task 1: Create DragDock component

**Files:**
- Create: `components/calendar/DragDock.tsx`

**Step 1: Create the component file**

```tsx
"use client";

import { useDroppable } from "@dnd-kit/react";
import { Trash2 } from "lucide-react";
import { STATUS_CONFIG } from "@/lib/types";
import type { ChipStatus } from "@/lib/types";

const STATUSES: ChipStatus[] = ["obskur", "lumet", "actus", "statis", "exsol"];

function DockTarget({ id, children, destructive }: { id: string; children: React.ReactNode; destructive?: boolean }) {
  const { ref, isDropTarget } = useDroppable({
    id,
    type: "dock",
    accept: ["chip"],
  });

  return (
    <div
      ref={ref}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
        destructive
          ? isDropTarget
            ? "bg-destructive text-white scale-110"
            : "bg-destructive/10 text-destructive"
          : isDropTarget
            ? "bg-primary text-primary-foreground scale-110"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {children}
    </div>
  );
}

interface DragDockProps {
  visible: boolean;
}

export function DragDock({ visible }: DragDockProps) {
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur transition-transform duration-200 ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="flex items-center gap-2">
        {STATUSES.map((status) => {
          const { label, icon: Icon } = STATUS_CONFIG[status];
          return (
            <DockTarget key={status} id={`dock-status-${status}`}>
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </DockTarget>
          );
        })}
      </div>
      <div className="mx-2 h-6 w-px bg-border" />
      <DockTarget id="dock-delete" destructive>
        <Trash2 className="h-4 w-4" />
        <span>DELETE</span>
      </DockTarget>
    </div>
  );
}
```

**Step 2: Verify file was created correctly**

Run: `cat components/calendar/DragDock.tsx | head -5`
Expected: `"use client";` header visible

**Step 3: Commit**

```bash
git add components/calendar/DragDock.tsx
git commit -m "feat: add DragDock floating drop target component"
```

---

### Task 2: Wire DragDock into CalendarShell

**Files:**
- Modify: `components/calendar/CalendarShell.tsx`

**Step 1: Add isDragging state and onDragStart handler**

At top of `CalendarShell` function (after existing state declarations around line 25), add:

```ts
const [isDragging, setIsDragging] = useState(false);
```

Add import for DragDock at the top:

```ts
import { DragDock } from "./DragDock";
```

**Step 2: Add onDragStart to DragDropProvider**

Change line 256 from:

```tsx
<DragDropProvider onDragEnd={handleDragEnd}>
```

to:

```tsx
<DragDropProvider
  onDragStart={() => setIsDragging(true)}
  onDragEnd={(event) => { setIsDragging(false); handleDragEnd(event); }}
>
```

**Step 3: Render DragDock inside DragDropProvider**

Add `<DragDock visible={isDragging} />` just before the closing `</DragDropProvider>` (before line 279):

```tsx
          <DragDock visible={isDragging} />
        </DragDropProvider>
```

**Step 4: Verify the app compiles**

Run: `npm run build` or `npx next build` (or check dev server)
Expected: No compile errors

**Step 5: Commit**

```bash
git add components/calendar/CalendarShell.tsx
git commit -m "feat: wire DragDock into CalendarShell with drag state"
```

---

### Task 3: Handle dock drops in CalendarShell

**Files:**
- Modify: `components/calendar/CalendarShell.tsx` (the `handleDragEnd` function, lines 86-202)

**Step 1: Add dock target handling at the top of handleDragEnd**

Insert after the early-return guard (line 88 `if (!target?.id || event.canceled) return;`) and before the `const newDate = target.id as string;` line:

```ts
    const targetId = target.id as string;

    // Handle dock status drops
    if (targetId.startsWith("dock-status-")) {
      const newStatus = targetId.replace("dock-status-", "") as Chip["status"];
      const chipId = source.id as string;
      // Optimistic update
      setChips((prev) =>
        prev.map((c) => (c.id === chipId ? { ...c, status: newStatus } : c))
      );
      setRefreshKey((k) => k + 1);
      fetch(`/api/chips/${chipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }).then(() => fetchChips(), () => fetchChips());
      return;
    }

    // Handle dock delete drops
    if (targetId === "dock-delete") {
      const chipId = source.id as string;
      // Optimistic remove
      setChips((prev) => prev.filter((c) => c.id !== chipId));
      setRefreshKey((k) => k + 1);
      fetch(`/api/chips/${chipId}`, { method: "DELETE" })
        .then(() => fetchChips(), () => fetchChips());
      return;
    }
```

Also update the existing `const newDate` line to use `targetId` instead of `target.id`:

```ts
    const newDate = targetId;
```

(Remove the old `const newDate = target.id as string;` line since we now have `targetId`.)

**Step 2: Verify the app compiles**

Run: dev server check or `npx next build`
Expected: No compile errors

**Step 3: Commit**

```bash
git add components/calendar/CalendarShell.tsx
git commit -m "feat: handle dock status-change and delete drops"
```

---

### Task 4: Manual QA

**Steps:**
1. Start dev server: `npm run dev`
2. Drag a chip — verify dock slides up from bottom
3. Drop on a status target — verify chip status changes (icon in pill updates)
4. Drop on delete — verify chip disappears
5. Release drag without dropping on dock — verify dock slides away
6. Drag a colour-blank — verify dock still appears (though it won't accept colour-blank drops, that's fine visually)
