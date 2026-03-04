"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { CalendarGrid } from "./CalendarGrid";
import { DragDock } from "./DragDock";
import { IngestSidebar } from "@/components/ingest/IngestSidebar";
import { ChipDetailPanel } from "@/components/chips/ChipDetailPanel";
import type { Chip, ChipColour, DayTagType, DayTagWithType } from "@/lib/types";
import { getMonthWeeks, toDateString } from "@/lib/dates";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ChipRefProvider } from "./ChipRefContext";
import { ChipConnectors } from "./ChipConnectors";

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
  const [isDragging, setIsDragging] = useState(false);
  const [linkingChipId, setLinkingChipId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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
    const { source, target } = event.operation;
    if (!target?.id || event.canceled) return;

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

    const newDate = targetId;

    // Handle colour-blank drops — create a new chip
    if (source.type === "colour-blank") {
      const colourId = source.data?.colourId as string;
      const tempId = `temp-${Date.now()}`;
      const tempChip: Chip = {
        id: tempId,
        title: "New chip",
        date: newDate,
        time: null,
        durationMinutes: null,
        colourId,
        status: "lumet",
        modifier: null,
        isShoot: false,
        linkedChipId: null,
        sortOrder: 0,
        body: null,
        starred: false,
        series: null,
        seriesNumber: null,
        calendarUid: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistic: show chip immediately
      setChips((prev) => [...prev, tempChip]);

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
        const created: Chip = await res.json();
        // Replace temp chip with server response
        setChips((prev) =>
          prev.map((c) => (c.id === tempId ? created : c))
        );
        setSelectedChip(created);
      }
      // Quiet background reconciliation
      fetchChips();
      setRefreshKey((k) => k + 1);
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

    // Optimistic: update chip in local state immediately
    if (chip) {
      setChips((prev) =>
        prev.map((c) =>
          c.id === chipId
            ? { ...c, date: newDate, ...(updates.status ? { status: updates.status as Chip["status"] } : {}) }
            : c
        )
      );
    } else {
      // Ingest chip not in local chips — inject it optimistically
      const draggedChip = source.data?.chip as Chip | undefined;
      const ingestChip: Chip = draggedChip
        ? { ...draggedChip, date: newDate, status: "lumet" }
        : {
            id: chipId,
            title: "Chip",
            date: newDate,
            time: null,
            durationMinutes: null,
            colourId: null,
            status: "lumet",
            modifier: null,
            isShoot: false,
            linkedChipId: null,
            sortOrder: 0,
            body: null,
            starred: false,
            series: null,
            seriesNumber: null,
            calendarUid: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
      setChips((prev) => [...prev, ingestChip]);
    }
    // Sidebar should update immediately
    setRefreshKey((k) => k + 1);

    // Fire API call, then reconcile
    fetch(`/api/chips/${chipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }).then(() => fetchChips(), () => fetchChips());
  }

  async function handleChipClick(chip: Chip) {
    if (linkingChipId) {
      // Link-pick mode: PATCH the new chip's linkedChipId to the clicked chip
      await fetch(`/api/chips/${linkingChipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedChipId: chip.id }),
      });
      setLinkingChipId(null);
      refreshAll();
      return;
    }
    setSelectedChip(chip);
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <button
            onClick={prevMonth}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{monthName}</span>
          <button
            onClick={goToday}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Today
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Main content: sidebar + grid */}
      <div className="flex flex-1 overflow-hidden">
        <DragDropProvider
          onDragStart={() => setIsDragging(true)}
          onDragEnd={(event) => { setIsDragging(false); handleDragEnd(event); }}
        >
          <ChipRefProvider>
            {sidebarOpen && (
              <IngestSidebar
                colours={colours}
                onChipClick={handleChipClick}
                refreshKey={refreshKey}
              />
            )}
            <div className="relative flex-1 overflow-auto" ref={gridRef}>
              <CalendarGrid
                year={year}
                month={month}
                chips={chips}
                colours={colours}
                dayTags={dayTags}
                tagTypes={tagTypes}
                onChipClick={handleChipClick}
                onAddChip={() => {}}
                onChipCreated={refreshAll}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                linkingChipId={linkingChipId}
                onCreatedForLinking={(chipId) => {
                  refreshAll();
                  setLinkingChipId(chipId);
                }}
              />
              <ChipConnectors chips={chips} colours={colours} gridRef={gridRef} />
            </div>
            <DragDock visible={isDragging} />
          </ChipRefProvider>
        </DragDropProvider>
      </div>

      {/* Link-pick overlay */}
      {linkingChipId && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 rounded-lg border bg-background px-4 py-2 shadow-lg">
            <span className="text-sm">Click a chip to link as follow-up</span>
            <button
              onClick={() => setLinkingChipId(null)}
              className="rounded px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
        onLinkedChipClick={async (chipId) => {
          try {
            const res = await fetch(`/api/chips/${chipId}`);
            if (res.ok) setSelectedChip(await res.json());
          } catch {}
        }}
        onFollowUp={(newChip) => {
          setSelectedChip(newChip);
          refreshAll();
        }}
        onLink={(chipId) => {
          setSelectedChip(null);
          setLinkingChipId(chipId);
        }}
        onDeleted={() => {
          // Optimistic: remove chip from local state immediately
          if (selectedChip) {
            setChips((prev) => prev.filter((c) => c.id !== selectedChip.id));
          }
          setSelectedChip(null);
          refreshAll();
        }}
      />
    </div>
  );
}
