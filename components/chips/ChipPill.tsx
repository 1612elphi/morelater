"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import { STATUS_CONFIG, MODIFIER_CONFIG } from "@/lib/types";
import type { Chip, ChipColour, ChipStatus } from "@/lib/types";

interface ChipPillProps {
  chip: Chip;
  colour: ChipColour | undefined;
  onClick: () => void;
  index: number;
  group: string;
}

export function ChipPill({ chip, colour, onClick, index, group }: ChipPillProps) {
  const { ref, isDragging } = useSortable({
    id: chip.id,
    index,
    type: "chip",
    accept: "chip",
    group,
  });

  const statusIcon = STATUS_CONFIG[chip.status as ChipStatus]?.icon ?? "";
  const modifierSymbol = chip.modifier
    ? MODIFIER_CONFIG[chip.modifier]?.symbol
    : null;

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition-colors hover:brightness-90 ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{
        backgroundColor: colour ? colour.hex + "22" : "#94a3b822",
        borderLeft: `3px solid ${colour?.hex ?? "#94a3b8"}`,
      }}
    >
      <span className="shrink-0">{statusIcon}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{chip.title}</span>
      {chip.isShoot && <span className="shrink-0">📷</span>}
      {modifierSymbol && <span className="shrink-0">{modifierSymbol}</span>}
      {chip.linkedChipId && (
        <span className="shrink-0 text-muted-foreground">←</span>
      )}
      {chip.time && (
        <span className="shrink-0 tabular-nums text-muted-foreground">{chip.time}</span>
      )}
    </button>
  );
}
