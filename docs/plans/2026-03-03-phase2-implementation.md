# Phase 2 — Ingest Sidebar + Day Tags Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a collapsible ingest sidebar with colour chip pile and OBSKUR chip list, day tag annotations on calendar cells, and cross-panel drag-and-drop.

**Architecture:** The sidebar lives inside the existing `DragDropProvider` in `CalendarShell` so cross-panel drag works natively. Day tags are fetched alongside chips for the visible date range and passed down through `CalendarGrid → WeekRow → DayCell`. The sidebar has three sections: colour chip pile (draggable blanks), star filter + quick-add, and scrollable ingest list. Day cells accept both `"chip"` and `"colour-blank"` drag types.

**Tech Stack:** Next.js 16 App Router, React 19, Drizzle ORM + better-sqlite3, @dnd-kit/react, shadcn/ui, Tailwind CSS v4.

**Key existing files:**
- `lib/db/schema.ts` — `dayTagTypes` and `dayTags` tables already defined
- `lib/db/seed.ts` — 5 default tag types already seeded
- `lib/types.ts` — `Chip`, `ChipColour`, `ChipStatus` types
- `app/api/chips/route.ts` — GET supports `?unscheduled=true`, POST creates chips
- `app/api/chips/[id]/route.ts` — PATCH supports any field update
- `components/calendar/CalendarShell.tsx` — orchestrator with `DragDropProvider`
- `components/calendar/CalendarGrid.tsx` → `WeekRow.tsx` → `DayCell.tsx` — grid hierarchy
- `components/chips/ChipDetailPanel.tsx` — slide-over editor
- `app/settings/page.tsx` — colour management with Tabs

**Important conventions:**
- `bun run build` to verify. `bun run dev` for dev server.
- Next.js 16 route params are `Promise<{ id: string }>` — must `await params`.
- `@dnd-kit/react` (v0.3.x) — NOT legacy `@dnd-kit/core`. Use `useSortable`, `useDroppable`, `useDraggable` from `@dnd-kit/react`.
- SQLite DB is lazily initialized via Proxy in `lib/db/index.ts`.
- UUIDs via `import { v4 as uuid } from "uuid"`.

---

### Task 1: Add DayTag and DayTagType types

**Files:**
- Modify: `lib/types.ts`

**Step 1: Add types**

Add these interfaces and export them from `lib/types.ts`, after the existing `ChipColour` interface:

```typescript
export interface DayTagType {
  id: string;
  name: string;
  icon: string;
  colour: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface DayTag {
  id: string;
  date: string;
  tagTypeId: string;
}

export interface DayTagWithType extends DayTag {
  tagType: DayTagType;
}
```

**Step 2: Verify build**

Run: `bun run build`
Expected: Compiles successfully.

**Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add DayTag and DayTagType type definitions"
```

---

### Task 2: Day Tag API routes

**Files:**
- Create: `app/api/day-tags/route.ts`
- Create: `app/api/day-tags/[id]/route.ts`

**Step 1: Create GET + POST route**

Create `app/api/day-tags/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayTags, dayTagTypes } from "@/lib/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const conditions = [];
  if (startDate) conditions.push(gte(dayTags.date, startDate));
  if (endDate) conditions.push(lte(dayTags.date, endDate));

  const rows = db
    .select({
      id: dayTags.id,
      date: dayTags.date,
      tagTypeId: dayTags.tagTypeId,
      tagType: {
        id: dayTagTypes.id,
        name: dayTagTypes.name,
        icon: dayTagTypes.icon,
        colour: dayTagTypes.colour,
        sortOrder: dayTagTypes.sortOrder,
        isActive: dayTagTypes.isActive,
      },
    })
    .from(dayTags)
    .innerJoin(dayTagTypes, eq(dayTags.tagTypeId, dayTagTypes.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(dayTags.date, dayTagTypes.sortOrder)
    .all();

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = uuid();

  db.insert(dayTags)
    .values({
      id,
      date: body.date,
      tagTypeId: body.tagTypeId,
    })
    .run();

  const created = db
    .select({
      id: dayTags.id,
      date: dayTags.date,
      tagTypeId: dayTags.tagTypeId,
      tagType: {
        id: dayTagTypes.id,
        name: dayTagTypes.name,
        icon: dayTagTypes.icon,
        colour: dayTagTypes.colour,
        sortOrder: dayTagTypes.sortOrder,
        isActive: dayTagTypes.isActive,
      },
    })
    .from(dayTags)
    .innerJoin(dayTagTypes, eq(dayTags.tagTypeId, dayTagTypes.id))
    .where(eq(dayTags.id, id))
    .get();

  return NextResponse.json(created, { status: 201 });
}
```

**Step 2: Create DELETE route**

Create `app/api/day-tags/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayTags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = db.select().from(dayTags).where(eq(dayTags.id, id)).get();
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.delete(dayTags).where(eq(dayTags.id, id)).run();
  return NextResponse.json({ ok: true });
}
```

**Step 3: Verify build**

Run: `bun run build`
Expected: Compiles, new routes appear in output.

**Step 4: Commit**

```bash
git add app/api/day-tags/
git commit -m "feat: add day tag CRUD API routes"
```

---

### Task 3: Day Tag Type API routes

**Files:**
- Create: `app/api/day-tag-types/route.ts`

**Step 1: Create GET + POST + PATCH route**

Create `app/api/day-tag-types/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayTagTypes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET() {
  const result = db
    .select()
    .from(dayTagTypes)
    .orderBy(dayTagTypes.sortOrder)
    .all();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = uuid();

  db.insert(dayTagTypes)
    .values({
      id,
      name: body.name,
      icon: body.icon,
      colour: body.colour ?? null,
      sortOrder: body.sortOrder ?? 0,
    })
    .run();

  const created = db
    .select()
    .from(dayTagTypes)
    .where(eq(dayTagTypes.id, id))
    .get();
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  const existing = db
    .select()
    .from(dayTagTypes)
    .where(eq(dayTagTypes.id, id))
    .get();
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.update(dayTagTypes).set(updates).where(eq(dayTagTypes.id, id)).run();

  const updated = db
    .select()
    .from(dayTagTypes)
    .where(eq(dayTagTypes.id, id))
    .get();
  return NextResponse.json(updated);
}
```

**Step 2: Verify build**

Run: `bun run build`

**Step 3: Commit**

```bash
git add app/api/day-tag-types/
git commit -m "feat: add day tag type API routes (GET, POST, PATCH)"
```

---

### Task 4: DayTagBadge component

**Files:**
- Create: `components/calendar/DayTagBadge.tsx`

**Step 1: Create the badge component**

A tiny pill showing a tag type's icon. Clickable to remove. Create `components/calendar/DayTagBadge.tsx`:

```typescript
"use client";

import type { DayTagWithType } from "@/lib/types";

interface DayTagBadgeProps {
  dayTag: DayTagWithType;
  onRemove: (id: string) => void;
}

export function DayTagBadge({ dayTag, onRemove }: DayTagBadgeProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onRemove(dayTag.id);
      }}
      className="inline-flex h-4 items-center rounded px-0.5 text-[10px] leading-none hover:opacity-70"
      style={{
        backgroundColor: dayTag.tagType.colour
          ? dayTag.tagType.colour + "33"
          : undefined,
      }}
      title={`${dayTag.tagType.name} (click to remove)`}
    >
      {dayTag.tagType.icon}
    </button>
  );
}
```

**Step 2: Verify build**

Run: `bun run build`

**Step 3: Commit**

```bash
git add components/calendar/DayTagBadge.tsx
git commit -m "feat: add DayTagBadge component"
```

---

### Task 5: DayTagDropdown component

**Files:**
- Create: `components/calendar/DayTagDropdown.tsx`

**Step 1: Create the dropdown**

A popover showing available tag types. Clicking one adds a tag to a specific date. Create `components/calendar/DayTagDropdown.tsx`:

```typescript
"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DayTagType } from "@/lib/types";

interface DayTagDropdownProps {
  date: string;
  tagTypes: DayTagType[];
  existingTagTypeIds: string[];
  onAdd: (date: string, tagTypeId: string) => void;
}

export function DayTagDropdown({
  date,
  tagTypes,
  existingTagTypeIds,
  onAdd,
}: DayTagDropdownProps) {
  const [open, setOpen] = useState(false);
  const available = tagTypes.filter(
    (t) => t.isActive && !existingTagTypeIds.includes(t.id)
  );

  if (available.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] text-muted-foreground hover:bg-muted ${
            open ? "flex" : "hidden group-hover/day:flex"
          }`}
        >
          #
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="end">
        <div className="flex flex-col">
          {available.map((t) => (
            <button
              key={t.id}
              className="flex items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted"
              onClick={() => {
                onAdd(date, t.id);
                setOpen(false);
              }}
            >
              <span>{t.icon}</span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

**Step 2: Verify build**

Run: `bun run build`

**Step 3: Commit**

```bash
git add components/calendar/DayTagDropdown.tsx
git commit -m "feat: add DayTagDropdown component"
```

---

### Task 6: Refactor DayCell — move date to bottom-right, add day tags

**Files:**
- Modify: `components/calendar/DayCell.tsx`

This task changes the DayCell layout:
- The date number and day tag badges move to the **bottom-right** of the cell.
- The `+` create button stays at the top-right.
- New props: `dayTags`, `tagTypes`, `onAddTag`, `onRemoveTag`.

**Step 1: Update DayCell**

Replace the full content of `components/calendar/DayCell.tsx`:

```typescript
"use client";

import { useDroppable } from "@dnd-kit/react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { isToday } from "@/lib/dates";
import { ChipPill } from "@/components/chips/ChipPill";
import { ChipCreatePopover } from "@/components/chips/ChipCreatePopover";
import { DayTagBadge } from "@/components/calendar/DayTagBadge";
import { DayTagDropdown } from "@/components/calendar/DayTagDropdown";
import type { Chip, ChipColour, DayTagWithType, DayTagType } from "@/lib/types";

interface DayCellProps {
  date: Date;
  dateStr: string;
  chips: Chip[];
  colours: ChipColour[];
  dayTags: DayTagWithType[];
  tagTypes: DayTagType[];
  isOutsideMonth: boolean;
  onChipClick: (chip: Chip) => void;
  onAddChip: (date: string) => void;
  onChipCreated: () => void;
  onAddTag: (date: string, tagTypeId: string) => void;
  onRemoveTag: (tagId: string) => void;
}

export function DayCell({
  date,
  dateStr,
  chips,
  colours,
  dayTags,
  tagTypes,
  isOutsideMonth,
  onChipClick,
  onAddChip,
  onChipCreated,
  onAddTag,
  onRemoveTag,
}: DayCellProps) {
  const today = isToday(date);
  const { ref: dropRef, isDropTarget } = useDroppable({
    id: dateStr,
    type: "day",
    accept: ["chip", "colour-blank"],
    collisionPriority: CollisionPriority.Low,
  });

  // Check if any day tag has a colour tint
  const tintColour = dayTags.find((dt) => dt.tagType.colour)?.tagType.colour;

  return (
    <div
      ref={dropRef}
      className={`group/day relative flex flex-col border-r p-1 last:border-r-0 ${
        isOutsideMonth ? "bg-muted/30" : ""
      } ${today ? "bg-primary/5" : ""} ${
        isDropTarget ? "ring-2 ring-primary/30 ring-inset" : ""
      }`}
      style={
        tintColour ? { backgroundColor: tintColour + "15" } : undefined
      }
    >
      {/* Top row: + button */}
      <div className="mb-0.5 flex items-center justify-end">
        <ChipCreatePopover
          date={dateStr}
          colours={colours}
          onCreated={onChipCreated}
        />
      </div>

      {/* Chip stack */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {chips.map((chip, index) => {
          const colour = colours.find((c) => c.id === chip.colourId);
          return (
            <ChipPill
              key={chip.id}
              chip={chip}
              colour={colour}
              onClick={() => onChipClick(chip)}
              index={index}
              group={dateStr}
            />
          );
        })}
      </div>

      {/* Bottom row: day tags + date number */}
      <div className="mt-0.5 flex items-center justify-end gap-0.5">
        {dayTags.map((dt) => (
          <DayTagBadge key={dt.id} dayTag={dt} onRemove={onRemoveTag} />
        ))}
        <DayTagDropdown
          date={dateStr}
          tagTypes={tagTypes}
          existingTagTypeIds={dayTags.map((dt) => dt.tagTypeId)}
          onAdd={onAddTag}
        />
        <span
          className={`ml-auto text-xs ${
            today
              ? "font-bold text-primary"
              : isOutsideMonth
                ? "text-muted-foreground/50"
                : "text-muted-foreground"
          }`}
        >
          {date.getDate()}
        </span>
      </div>
    </div>
  );
}
```

Key changes from current:
- `accept` now includes `"colour-blank"` along with `"chip"`.
- Date number moved from top-left to bottom-right.
- Day tags rendered as badges in bottom-right area.
- DayTagDropdown for adding tags (shows `#` button on hover).
- New props: `dayTags`, `tagTypes`, `onAddTag`, `onRemoveTag`.
- Optional background tint from day tag colour.

**Step 2: Update WeekRow to pass new props**

Modify `components/calendar/WeekRow.tsx`. The WeekRow needs to accept and pass down `dayTags`, `tagTypes`, `onAddTag`, `onRemoveTag`.

```typescript
import { DayCell } from "./DayCell";
import { toDateString } from "@/lib/dates";
import type { Chip, ChipColour, DayTagWithType, DayTagType } from "@/lib/types";

interface WeekRowProps {
  weekNumber: number;
  days: Date[];
  month: number;
  chips: Chip[];
  colours: ChipColour[];
  dayTags: DayTagWithType[];
  tagTypes: DayTagType[];
  onChipClick: (chip: Chip) => void;
  onAddChip: (date: string) => void;
  onChipCreated: () => void;
  onAddTag: (date: string, tagTypeId: string) => void;
  onRemoveTag: (tagId: string) => void;
}

export function WeekRow({
  weekNumber,
  days,
  month,
  chips,
  colours,
  dayTags,
  tagTypes,
  onChipClick,
  onAddChip,
  onChipCreated,
  onAddTag,
  onRemoveTag,
}: WeekRowProps) {
  return (
    <div className="grid min-h-24 flex-1 grid-cols-[3rem_repeat(7,1fr)] border-b last:border-b-0">
      <div className="flex items-start justify-center border-r pt-1 text-xs font-medium text-muted-foreground">
        {weekNumber}
      </div>
      {days.map((date) => {
        const dateStr = toDateString(date);
        const dayChips = chips
          .filter((c) => c.date === dateStr)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const dayDayTags = dayTags.filter((dt) => dt.date === dateStr);
        const isOutsideMonth = date.getMonth() !== month;

        return (
          <DayCell
            key={dateStr}
            date={date}
            dateStr={dateStr}
            chips={dayChips}
            colours={colours}
            dayTags={dayDayTags}
            tagTypes={tagTypes}
            isOutsideMonth={isOutsideMonth}
            onChipClick={onChipClick}
            onAddChip={onAddChip}
            onChipCreated={onChipCreated}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
          />
        );
      })}
    </div>
  );
}
```

**Step 3: Update CalendarGrid to pass new props**

Modify `components/calendar/CalendarGrid.tsx`:

```typescript
import { getMonthWeeks, getISOWeekNumber } from "@/lib/dates";
import { WeekRow } from "./WeekRow";
import type { Chip, ChipColour, DayTagWithType, DayTagType } from "@/lib/types";

interface CalendarGridProps {
  year: number;
  month: number;
  chips: Chip[];
  colours: ChipColour[];
  dayTags: DayTagWithType[];
  tagTypes: DayTagType[];
  onChipClick: (chip: Chip) => void;
  onAddChip: (date: string) => void;
  onChipCreated: () => void;
  onAddTag: (date: string, tagTypeId: string) => void;
  onRemoveTag: (tagId: string) => void;
}

export function CalendarGrid({
  year,
  month,
  chips,
  colours,
  dayTags,
  tagTypes,
  onChipClick,
  onAddChip,
  onChipCreated,
  onAddTag,
  onRemoveTag,
}: CalendarGridProps) {
  const weeks = getMonthWeeks(year, month);

  return (
    <div className="flex h-full flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b">
        <div className="border-r p-1 text-center text-xs font-medium text-muted-foreground">
          Wk
        </div>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div
            key={day}
            className="border-r p-1 text-center text-xs font-medium text-muted-foreground last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      {/* Week rows */}
      <div className="flex flex-1 flex-col">
        {weeks.map((week) => {
          const weekNum = getISOWeekNumber(week[3]); // Thursday determines week number
          return (
            <WeekRow
              key={weekNum + "-" + week[0].toISOString()}
              weekNumber={weekNum}
              days={week}
              month={month}
              chips={chips}
              colours={colours}
              dayTags={dayTags}
              tagTypes={tagTypes}
              onChipClick={onChipClick}
              onAddChip={onAddChip}
              onChipCreated={onChipCreated}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
            />
          );
        })}
      </div>
    </div>
  );
}
```

**Step 4: Temporarily stub CalendarShell**

To make it compile, update `CalendarShell.tsx` to pass the new required props to `CalendarGrid`. Add empty arrays and no-op handlers for now — they'll be wired up in Task 8.

In `CalendarShell.tsx`, change the `<CalendarGrid ... />` call to include:

```typescript
<CalendarGrid
  year={year}
  month={month}
  chips={chips}
  colours={colours}
  dayTags={[]}
  tagTypes={[]}
  onChipClick={(chip) => setSelectedChip(chip)}
  onAddChip={() => {}}
  onChipCreated={fetchChips}
  onAddTag={() => {}}
  onRemoveTag={() => {}}
/>
```

**Step 5: Verify build**

Run: `bun run build`
Expected: Compiles successfully with all new props flowing through.

**Step 6: Commit**

```bash
git add components/calendar/ lib/types.ts
git commit -m "feat: refactor DayCell — date in bottom-right, day tag badges and dropdown"
```

---

### Task 7: Day Tag Type settings tab

**Files:**
- Modify: `app/settings/page.tsx`

**Step 1: Add day tag type management**

Update `app/settings/page.tsx` to add a "Day Tags" tab alongside the existing "Chip Colours" tab. The pattern matches the existing colour management. Replace the full file:

```typescript
"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChipColour, DayTagType } from "@/lib/types";

export default function SettingsPage() {
  const [colours, setColours] = useState<ChipColour[]>([]);
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#888888");

  const [tagTypes, setTagTypes] = useState<DayTagType[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagIcon, setNewTagIcon] = useState("");
  const [newTagColour, setNewTagColour] = useState("");

  async function loadColours() {
    const res = await fetch("/api/colours");
    if (res.ok) setColours(await res.json());
  }

  async function loadTagTypes() {
    const res = await fetch("/api/day-tag-types");
    if (res.ok) setTagTypes(await res.json());
  }

  useEffect(() => {
    loadColours();
    loadTagTypes();
  }, []);

  async function addColour() {
    if (!newName.trim()) return;
    await fetch("/api/colours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        hex: newHex,
        sortOrder: colours.length,
      }),
    });
    setNewName("");
    loadColours();
  }

  async function updateColour(id: string, updates: Partial<ChipColour>) {
    await fetch("/api/colours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    loadColours();
  }

  async function addTagType() {
    if (!newTagName.trim() || !newTagIcon.trim()) return;
    await fetch("/api/day-tag-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTagName.trim(),
        icon: newTagIcon.trim(),
        colour: newTagColour || null,
        sortOrder: tagTypes.length,
      }),
    });
    setNewTagName("");
    setNewTagIcon("");
    setNewTagColour("");
    loadTagTypes();
  }

  async function updateTagType(id: string, updates: Partial<DayTagType>) {
    await fetch("/api/day-tag-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    loadTagTypes();
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-lg font-semibold">Settings</h1>
      <Tabs defaultValue="colours">
        <TabsList>
          <TabsTrigger value="colours">Chip Colours</TabsTrigger>
          <TabsTrigger value="daytags">Day Tags</TabsTrigger>
        </TabsList>

        {/* Chip Colours tab — unchanged */}
        <TabsContent value="colours" className="mt-4">
          <div className="flex flex-col gap-2">
            {colours.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded border p-2"
              >
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => updateColour(c.id, { hex: e.target.value })}
                  className="h-8 w-8 cursor-pointer rounded border-0"
                />
                <Input
                  value={c.name}
                  onChange={(e) => updateColour(c.id, { name: e.target.value })}
                  className="h-8 flex-1 text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateColour(c.id, { isActive: !c.isActive })
                  }
                  className="text-xs"
                >
                  {c.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="color"
              value={newHex}
              onChange={(e) => setNewHex(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded"
            />
            <Input
              placeholder="New colour name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 flex-1 text-sm"
            />
            <Button onClick={addColour} size="sm">
              Add
            </Button>
          </div>
        </TabsContent>

        {/* Day Tags tab */}
        <TabsContent value="daytags" className="mt-4">
          <div className="flex flex-col gap-2">
            {tagTypes.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded border p-2"
              >
                <Input
                  value={t.icon}
                  onChange={(e) =>
                    updateTagType(t.id, { icon: e.target.value })
                  }
                  className="h-8 w-12 text-center text-sm"
                  title="Icon (emoji or character)"
                />
                <Input
                  value={t.name}
                  onChange={(e) =>
                    updateTagType(t.id, { name: e.target.value })
                  }
                  className="h-8 flex-1 text-sm"
                />
                <input
                  type="color"
                  value={t.colour ?? "#888888"}
                  onChange={(e) =>
                    updateTagType(t.id, { colour: e.target.value })
                  }
                  className="h-8 w-8 cursor-pointer rounded border-0"
                  title="Background tint (optional)"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateTagType(t.id, { isActive: !t.isActive })
                  }
                  className="text-xs"
                >
                  {t.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Icon..."
              value={newTagIcon}
              onChange={(e) => setNewTagIcon(e.target.value)}
              className="h-8 w-12 text-center text-sm"
            />
            <Input
              placeholder="Tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="h-8 flex-1 text-sm"
            />
            <input
              type="color"
              value={newTagColour || "#888888"}
              onChange={(e) => setNewTagColour(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded"
            />
            <Button onClick={addTagType} size="sm">
              Add
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `bun run build`

**Step 3: Commit**

```bash
git add app/settings/page.tsx
git commit -m "feat: add Day Tags settings tab for managing tag types"
```

---

### Task 8: Wire day tags into CalendarShell

**Files:**
- Modify: `components/calendar/CalendarShell.tsx`
- Modify: `app/page.tsx`

**Step 1: Load day tag types server-side**

Update `app/page.tsx` to also load day tag types and pass them to CalendarShell:

```typescript
import { db } from "@/lib/db";
import { chipColours, dayTagTypes } from "@/lib/db/schema";
import { CalendarShell } from "@/components/calendar/CalendarShell";

export const dynamic = "force-dynamic";

export default function Home() {
  const colours = db
    .select()
    .from(chipColours)
    .orderBy(chipColours.sortOrder)
    .all();

  const tagTypes = db
    .select()
    .from(dayTagTypes)
    .orderBy(dayTagTypes.sortOrder)
    .all();

  return <CalendarShell colours={colours} tagTypes={tagTypes} />;
}
```

**Step 2: Update CalendarShell to fetch and manage day tags**

Replace `components/calendar/CalendarShell.tsx` with:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { CalendarGrid } from "./CalendarGrid";
import { ChipDetailPanel } from "@/components/chips/ChipDetailPanel";
import type { Chip, ChipColour, DayTagType, DayTagWithType } from "@/lib/types";
import { getMonthWeeks, toDateString } from "@/lib/dates";

interface CalendarShellProps {
  colours: ChipColour[];
  tagTypes: DayTagType[];
}

export function CalendarShell({ colours, tagTypes }: CalendarShellProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [chips, setChips] = useState<Chip[]>([]);
  const [dayTags, setDayTags] = useState<DayTagWithType[]>([]);
  const [selectedChip, setSelectedChip] = useState<Chip | null>(null);
  const [loading, setLoading] = useState(true);

  const weeks = getMonthWeeks(year, month);
  const startDate = toDateString(weeks[0][0]);
  const endDate = toDateString(weeks[weeks.length - 1][6]);

  const fetchChips = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/chips?startDate=${startDate}&endDate=${endDate}`
    );
    if (res.ok) setChips(await res.json());
    setLoading(false);
  }, [startDate, endDate]);

  const fetchDayTags = useCallback(async () => {
    const res = await fetch(
      `/api/day-tags?startDate=${startDate}&endDate=${endDate}`
    );
    if (res.ok) setDayTags(await res.json());
  }, [startDate, endDate]);

  useEffect(() => {
    fetchChips();
    fetchDayTags();
  }, [fetchChips, fetchDayTags]);

  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  async function handleDragEnd(event: any) {
    const { source, target } = event;
    if (!target?.id || event.canceled) return;

    const chipId = source.id as string;
    const newDate = target.id as string;

    // Don't do anything if dropped on the same day
    const chip = chips.find((c) => c.id === chipId);
    if (chip && chip.date === newDate) return;

    await fetch(`/api/chips/${chipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate }),
    });
    fetchChips();
  }

  async function handleAddTag(date: string, tagTypeId: string) {
    await fetch("/api/day-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, tagTypeId }),
    });
    fetchDayTags();
  }

  async function handleRemoveTag(tagId: string) {
    await fetch(`/api/day-tags/${tagId}`, { method: "DELETE" });
    fetchDayTags();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <button
          onClick={prevMonth}
          className="rounded px-2 py-1 text-sm hover:bg-muted"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{monthName}</span>
          <button
            onClick={goToday}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Today
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="rounded px-2 py-1 text-sm hover:bg-muted"
        >
          →
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <DragDropProvider onDragEnd={handleDragEnd}>
          <CalendarGrid
            year={year}
            month={month}
            chips={chips}
            colours={colours}
            dayTags={dayTags}
            tagTypes={tagTypes}
            onChipClick={(chip) => setSelectedChip(chip)}
            onAddChip={() => {}}
            onChipCreated={fetchChips}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
          />
        </DragDropProvider>
      </div>
      <ChipDetailPanel
        chip={selectedChip}
        colours={colours}
        open={selectedChip !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedChip(null);
        }}
        onUpdated={() => {
          fetchChips();
          setSelectedChip(null);
        }}
        onDeleted={fetchChips}
      />
    </div>
  );
}
```

Key changes:
- Accepts `tagTypes` prop (loaded server-side).
- New `dayTags` state, fetched with same date range as chips.
- `handleAddTag` and `handleRemoveTag` call the day-tags API.
- All new props passed to `CalendarGrid`.

**Step 3: Verify build**

Run: `bun run build`

**Step 4: Commit**

```bash
git add app/page.tsx components/calendar/CalendarShell.tsx
git commit -m "feat: wire day tags through CalendarShell, fetch alongside chips"
```

---

### Task 9: IngestSidebar component

**Files:**
- Create: `components/ingest/IngestSidebar.tsx`
- Create: `components/ingest/IngestChipRow.tsx`
- Create: `components/ingest/ColourBlank.tsx`

**Step 1: Create ColourBlank**

A draggable colour chip blank. Uses `useDraggable` from `@dnd-kit/react`. Create `components/ingest/ColourBlank.tsx`:

```typescript
"use client";

import { useDraggable } from "@dnd-kit/react";
import type { ChipColour } from "@/lib/types";

interface ColourBlankProps {
  colour: ChipColour;
}

export function ColourBlank({ colour }: ColourBlankProps) {
  const { ref, isDragging } = useDraggable({
    id: `blank-${colour.id}`,
    type: "colour-blank",
    data: { colourId: colour.id, colourHex: colour.hex },
  });

  return (
    <div
      ref={ref}
      className={`flex h-7 cursor-grab items-center gap-1 rounded-md border px-2 text-[10px] font-medium shadow-sm active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{
        backgroundColor: colour.hex + "22",
        borderColor: colour.hex + "66",
      }}
      title={colour.name}
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: colour.hex }}
      />
      <span className="truncate">{colour.name}</span>
    </div>
  );
}
```

**Step 2: Create IngestChipRow**

A draggable chip in the ingest list. Uses `useDraggable`. Create `components/ingest/IngestChipRow.tsx`:

```typescript
"use client";

import { useDraggable } from "@dnd-kit/react";
import { STATUS_CONFIG } from "@/lib/types";
import type { Chip, ChipColour } from "@/lib/types";

interface IngestChipRowProps {
  chip: Chip;
  colour: ChipColour | undefined;
  onClick: () => void;
}

export function IngestChipRow({ chip, colour, onClick }: IngestChipRowProps) {
  const { ref, isDragging } = useDraggable({
    id: chip.id,
    type: "chip",
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs transition-all hover:bg-muted ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {colour && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: colour.hex }}
        />
      )}
      <span className="min-w-0 flex-1 truncate">{chip.title}</span>
      {chip.starred && <span className="shrink-0 text-[10px]">⭐</span>}
    </button>
  );
}
```

**Step 3: Create IngestSidebar**

The main sidebar component. Create `components/ingest/IngestSidebar.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ColourBlank } from "./ColourBlank";
import { IngestChipRow } from "./IngestChipRow";
import type { Chip, ChipColour } from "@/lib/types";

interface IngestSidebarProps {
  colours: ChipColour[];
  onChipClick: (chip: Chip) => void;
  refreshKey: number;
}

export function IngestSidebar({
  colours,
  onChipClick,
  refreshKey,
}: IngestSidebarProps) {
  const [ingestChips, setIngestChips] = useState<Chip[]>([]);
  const [starredOnly, setStarredOnly] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchIngest = useCallback(async () => {
    const res = await fetch("/api/chips?unscheduled=true&status=obskur");
    if (res.ok) setIngestChips(await res.json());
  }, []);

  useEffect(() => {
    fetchIngest();
  }, [fetchIngest, refreshKey]);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setAdding(true);
    await fetch("/api/chips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: quickTitle.trim(),
        status: "obskur",
      }),
    });
    setQuickTitle("");
    setAdding(false);
    fetchIngest();
  }

  const activeColours = colours.filter((c) => c.isActive);
  const filteredChips = starredOnly
    ? ingestChips.filter((c) => c.starred)
    : ingestChips;

  return (
    <div className="flex h-full w-[280px] flex-col border-r bg-muted/20">
      {/* Colour chip pile */}
      <div className="border-b p-2">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Chip Pile
        </div>
        <div className="flex flex-wrap gap-1">
          {activeColours.map((c) => (
            <ColourBlank key={c.id} colour={c} />
          ))}
        </div>
      </div>

      {/* Quick-add + star filter */}
      <div className="border-b p-2">
        <form onSubmit={handleQuickAdd} className="flex gap-1">
          <Input
            placeholder="New idea..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="h-7 flex-1 text-xs"
            disabled={adding}
          />
          <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={!quickTitle.trim() || adding}>
            +
          </Button>
        </form>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {filteredChips.length} idea{filteredChips.length !== 1 ? "s" : ""}
          </span>
          <Toggle
            pressed={starredOnly}
            onPressedChange={setStarredOnly}
            size="sm"
            className="h-6 px-1.5 text-[10px]"
          >
            ⭐ only
          </Toggle>
        </div>
      </div>

      {/* Ingest list */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {filteredChips.map((chip) => {
            const colour = colours.find((c) => c.id === chip.colourId);
            return (
              <IngestChipRow
                key={chip.id}
                chip={chip}
                colour={colour}
                onClick={() => onChipClick(chip)}
              />
            );
          })}
          {filteredChips.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {starredOnly ? "No starred ideas" : "No ideas yet"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

Key design decisions:
- `refreshKey` prop — CalendarShell increments this after any mutation to trigger a refetch.
- Colour pile at top shows active colours as draggable blanks.
- Quick-add creates an OBSKUR chip with no date.
- Star filter toggle filters the list.

**Step 4: Verify build**

Run: `bun run build`

**Step 5: Commit**

```bash
git add components/ingest/
git commit -m "feat: add IngestSidebar with colour pile, quick-add, and ingest list"
```

---

### Task 10: Integrate IngestSidebar into CalendarShell

**Files:**
- Modify: `components/calendar/CalendarShell.tsx`

**Step 1: Add sidebar state and rendering**

Update `CalendarShell.tsx` to:
1. Add `sidebarOpen` toggle state.
2. Add `refreshKey` counter for sidebar refetch coordination.
3. Render `IngestSidebar` inside the `DragDropProvider`.
4. Add a toggle button in the header.

Replace the full content of `components/calendar/CalendarShell.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { CalendarGrid } from "./CalendarGrid";
import { IngestSidebar } from "@/components/ingest/IngestSidebar";
import { ChipDetailPanel } from "@/components/chips/ChipDetailPanel";
import type { Chip, ChipColour, DayTagType, DayTagWithType } from "@/lib/types";
import { getMonthWeeks, toDateString } from "@/lib/dates";

interface CalendarShellProps {
  colours: ChipColour[];
  tagTypes: DayTagType[];
}

export function CalendarShell({ colours, tagTypes }: CalendarShellProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [chips, setChips] = useState<Chip[]>([]);
  const [dayTags, setDayTags] = useState<DayTagWithType[]>([]);
  const [selectedChip, setSelectedChip] = useState<Chip | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const weeks = getMonthWeeks(year, month);
  const startDate = toDateString(weeks[0][0]);
  const endDate = toDateString(weeks[weeks.length - 1][6]);

  const fetchChips = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/chips?startDate=${startDate}&endDate=${endDate}`
    );
    if (res.ok) setChips(await res.json());
    setLoading(false);
  }, [startDate, endDate]);

  const fetchDayTags = useCallback(async () => {
    const res = await fetch(
      `/api/day-tags?startDate=${startDate}&endDate=${endDate}`
    );
    if (res.ok) setDayTags(await res.json());
  }, [startDate, endDate]);

  useEffect(() => {
    fetchChips();
    fetchDayTags();
  }, [fetchChips, fetchDayTags]);

  function refreshAll() {
    fetchChips();
    setRefreshKey((k) => k + 1);
  }

  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  async function handleDragEnd(event: any) {
    const { source, target } = event;
    if (!target?.id || event.canceled) return;

    const newDate = target.id as string;

    // Handle colour-blank drops — create a new chip
    if (source.type === "colour-blank") {
      const colourId = source.data?.colourId as string;
      await fetch("/api/chips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "",
          date: newDate,
          colourId,
          status: "lumet",
        }),
      });
      refreshAll();
      return;
    }

    // Handle chip drops (from ingest or calendar)
    const chipId = source.id as string;
    const chip = chips.find((c) => c.id === chipId);

    // If dropped on the same day, do nothing
    if (chip && chip.date === newDate) return;

    // If chip is OBSKUR (from ingest), advance to LUMET
    const updates: Record<string, unknown> = { date: newDate };
    if (!chip || chip.status === "obskur") {
      updates.status = "lumet";
    }

    await fetch(`/api/chips/${chipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    refreshAll();
  }

  async function handleAddTag(date: string, tagTypeId: string) {
    await fetch("/api/day-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, tagTypeId }),
    });
    fetchDayTags();
  }

  async function handleRemoveTag(tagId: string) {
    await fetch(`/api/day-tags/${tagId}`, { method: "DELETE" });
    fetchDayTags();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded px-2 py-1 text-sm hover:bg-muted"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
          <button
            onClick={prevMonth}
            className="rounded px-2 py-1 text-sm hover:bg-muted"
          >
            ←
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{monthName}</span>
          <button
            onClick={goToday}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Today
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="rounded px-2 py-1 text-sm hover:bg-muted"
        >
          →
        </button>
      </div>

      {/* Main content: sidebar + grid */}
      <div className="flex flex-1 overflow-hidden">
        <DragDropProvider onDragEnd={handleDragEnd}>
          {sidebarOpen && (
            <IngestSidebar
              colours={colours}
              onChipClick={(chip) => setSelectedChip(chip)}
              refreshKey={refreshKey}
            />
          )}
          <div className="flex-1 overflow-auto">
            <CalendarGrid
              year={year}
              month={month}
              chips={chips}
              colours={colours}
              dayTags={dayTags}
              tagTypes={tagTypes}
              onChipClick={(chip) => setSelectedChip(chip)}
              onAddChip={() => {}}
              onChipCreated={refreshAll}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
            />
          </div>
        </DragDropProvider>
      </div>

      {/* Detail panel */}
      <ChipDetailPanel
        chip={selectedChip}
        colours={colours}
        open={selectedChip !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedChip(null);
        }}
        onUpdated={() => {
          refreshAll();
          setSelectedChip(null);
        }}
        onDeleted={refreshAll}
      />
    </div>
  );
}
```

Key changes:
- `sidebarOpen` toggle with `◀`/`▶` button in header.
- `refreshKey` counter: incremented on every mutation; passed to `IngestSidebar` so it refetches.
- `handleDragEnd` now handles three scenarios:
  1. `colour-blank` drop — creates a new LUMET chip with that colour (title empty for now).
  2. Ingest chip drop — sets date, advances status to LUMET.
  3. Calendar chip drop — moves to new date (existing behaviour).
- Sidebar and grid are siblings inside `DragDropProvider`.
- `refreshAll()` helper refreshes both calendar chips and sidebar.

**Step 2: Verify build**

Run: `bun run build`

**Step 3: Commit**

```bash
git add components/calendar/CalendarShell.tsx
git commit -m "feat: integrate IngestSidebar into CalendarShell with cross-panel drag-drop"
```

---

### Task 11: Unschedule button in ChipDetailPanel

**Files:**
- Modify: `components/chips/ChipDetailPanel.tsx`

**Step 1: Add unschedule handler and button**

Add an `handleUnschedule` function and an "Unschedule" button that's visible when the chip has a date. The button should appear in the Actions section, between Save and Delete.

In `ChipDetailPanel.tsx`, add after the `handleDelete` function:

```typescript
async function handleUnschedule() {
  if (!chip) return;
  await fetch(`/api/chips/${chip.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: null, status: "obskur" }),
  });
  onOpenChange(false);
  onUpdated();
}
```

Then in the Actions `<div>`, add the Unschedule button between Save and Delete:

```tsx
{/* Actions */}
<div className="flex gap-2">
  <Button onClick={handleSave} disabled={saving} className="flex-1">
    {saving ? "Saving..." : "Save"}
  </Button>
  {chip.date && (
    <Button variant="outline" onClick={handleUnschedule}>
      Unschedule
    </Button>
  )}
  <Button variant="destructive" onClick={handleDelete}>
    Delete
  </Button>
</div>
```

This replaces the existing Actions div (lines 245-252 of the current file).

**Step 2: Verify build**

Run: `bun run build`

**Step 3: Commit**

```bash
git add components/chips/ChipDetailPanel.tsx
git commit -m "feat: add Unschedule button to ChipDetailPanel"
```

---

### Task 12: Title popover for colour-blank drops

**Files:**
- Modify: `components/calendar/CalendarShell.tsx`
- Modify: `components/calendar/DayCell.tsx`

When a colour blank is dropped onto a day cell, the current Task 10 implementation creates a chip with an empty title. This task improves that: after the blank drop creates the chip, we open the ChipCreatePopover on that day cell pre-focused for the user to type a title. Since the chip already exists, we use the detail panel instead.

**Step 1: Auto-select newly created chip**

In `CalendarShell.tsx`, update the colour-blank handling in `handleDragEnd` to select the newly created chip so the detail panel opens:

Replace the colour-blank section in `handleDragEnd`:

```typescript
// Handle colour-blank drops — create a new chip
if (source.type === "colour-blank") {
  const colourId = source.data?.colourId as string;
  const res = await fetch("/api/chips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "New chip",
      date: newDate,
      colourId,
      status: "lumet",
    }),
  });
  if (res.ok) {
    const created = await res.json();
    setSelectedChip(created);
  }
  refreshAll();
  return;
}
```

This opens the detail panel for the new chip immediately so the user can set the title and other fields.

**Step 2: Verify build**

Run: `bun run build`

**Step 3: Commit**

```bash
git add components/calendar/CalendarShell.tsx
git commit -m "feat: auto-open detail panel when dropping colour blank onto calendar"
```

---

### Task 13: Final verification and cleanup

**Step 1: Full build check**

Run: `bun run build`
Expected: Clean build, all routes listed.

**Step 2: Manual testing checklist**

Run `bun run dev` and verify:

1. **Sidebar visibility**: Toggle `◀`/`▶` button shows/hides the left sidebar.
2. **Colour pile**: All active colours appear as draggable blanks at top of sidebar.
3. **Quick-add**: Typing a title and pressing `+` creates an OBSKUR chip in the ingest list.
4. **Star filter**: Toggle shows only starred chips (if any).
5. **Drag colour blank → day**: Creates a LUMET chip on that day, detail panel opens.
6. **Drag ingest chip → day**: Chip moves from sidebar to day cell, status becomes LUMET.
7. **Day tags**: Bottom-right of day cell shows date number. Hover shows `#` button. Clicking it opens tag dropdown. Adding a tag shows the badge. Clicking a badge removes it.
8. **Day tag tint**: If a tag type has a colour, the day cell gets a subtle background tint.
9. **Unschedule**: Opening a scheduled chip's detail panel shows "Unschedule" button. Clicking it clears the date and moves chip back to ingest sidebar.
10. **Settings**: Day Tags tab shows existing tag types with icon, name, colour, and activate/deactivate.

**Step 3: Commit any fixes from testing**

```bash
git add -A
git commit -m "fix: Phase 2 testing cleanup"
```
