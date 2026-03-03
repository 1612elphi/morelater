"use client";

import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ColourBlank } from "./ColourBlank";
import { IngestChipRow } from "./IngestChipRow";
import type { Chip, ChipColour } from "@/lib/types";

/** Extract hue (0–360) from a hex colour for sorting. */
function hexHue(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d + 6) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return h * 60;
}

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

  const fetchIngest = useCallback(async () => {
    const res = await fetch("/api/chips?unscheduled=true&status=obskur");
    if (res.ok) setIngestChips(await res.json());
  }, []);

  useEffect(() => {
    fetchIngest();
  }, [fetchIngest, refreshKey]);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;

    // Optimistic: inject temp chip immediately
    const tempId = `temp-${Date.now()}`;
    const tempChip: Chip = {
      id: tempId,
      title,
      date: null,
      time: null,
      durationMinutes: null,
      colourId: null,
      status: "obskur",
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
    setIngestChips((prev) => [...prev, tempChip]);
    setQuickTitle("");

    const res = await fetch("/api/chips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status: "obskur" }),
    });
    if (res.ok) {
      const created: Chip = await res.json();
      // Replace temp chip with server response
      setIngestChips((prev) =>
        prev.map((c) => (c.id === tempId ? created : c))
      );
    }
    // Quiet reconciliation
    fetchIngest();
  }

  const activeColours = colours.filter((c) => c.isActive).sort((a, b) => hexHue(a.hex) - hexHue(b.hex));
  const filteredChips = starredOnly
    ? ingestChips.filter((c) => c.starred)
    : ingestChips;

  return (
    <div className="flex h-full w-[280px] flex-col border-r bg-muted/20">
      {/* Quick-add + star filter */}
      <div className="border-b p-2">
        <form onSubmit={handleQuickAdd} className="flex gap-1">
          <Input
            placeholder="New idea..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="h-7 flex-1 text-xs"
          />
          <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={!quickTitle.trim()}>
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
            <Star className="h-3 w-3" /> only
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

      {/* Colour chip pile — pinned to bottom */}
      <div className="border-t p-2">
        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Chip Pile
        </div>
        <div className="flex flex-col gap-1">
          {activeColours.map((c) => (
            <ColourBlank key={c.id} colour={c} />
          ))}
        </div>
      </div>
    </div>
  );
}
