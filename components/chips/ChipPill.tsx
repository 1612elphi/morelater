"use client";

import { useCallback } from "react";
import { useDraggable } from "@dnd-kit/react";
import { STATUS_CONFIG, MODIFIER_CONFIG, SHOOT_ICON } from "@/lib/types";
import type { Chip, ChipColour, ChipStatus } from "@/lib/types";
import { StatusCircle } from "@/components/ui/StatusCircle";
import { useChipRefs } from "@/components/calendar/ChipRefContext";

interface ChipPillProps {
  chip: Chip;
  colour: ChipColour | undefined;
  onClick: () => void;
  isLinkTarget?: boolean;
  isBlocked?: boolean;
  isPickTarget?: boolean;
}

export function ChipPill({ chip, colour, onClick, isLinkTarget, isBlocked, isPickTarget }: ChipPillProps) {
  const { ref, isDragging } = useDraggable({
    id: chip.id,
    type: "chip",
  });
  const { register, unregister } = useChipRefs();

  const combinedRef = useCallback(
    (el: HTMLElement | null) => {
      ref(el);
      if (el) {
        register(chip.id, el);
      } else {
        unregister(chip.id);
      }
    },
    [ref, register, unregister, chip.id]
  );

  const statusCfg = STATUS_CONFIG[chip.status as ChipStatus];
  const ModifierIcon = chip.modifier
    ? MODIFIER_CONFIG[chip.modifier]?.icon
    : null;
  const ShootIcon = SHOOT_ICON;

  return (
    <div
      ref={combinedRef}
      onClick={onClick}
      className={`relative z-10 flex w-full cursor-grab items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition-colors hover:brightness-90 active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      } ${isLinkTarget || isPickTarget ? "ring-2 ring-primary/40 animate-pulse" : ""}`}
      style={{
        backgroundColor: colour ? colour.hex + "22" : "#94a3b822",
        borderLeft: `3px solid ${colour?.hex ?? "#94a3b8"}`,
      }}
    >
      {statusCfg && <StatusCircle status={statusCfg.circle} color={colour?.hex ?? "#94a3b8"} progress={statusCfg.circleProgress} weight={3} className="h-3 w-3 shrink-0" />}
      <span className="min-w-0 flex-1 break-words font-medium">{chip.title}</span>
      {chip.isShoot && <ShootIcon className="h-3 w-3 shrink-0 text-muted-foreground" />}
      {ModifierIcon && <ModifierIcon className="h-3 w-3 shrink-0 text-muted-foreground" />}
      {isBlocked && (
        <span className="shrink-0 text-red-400" title="Blocked">⊘</span>
      )}
      {chip.linkedChipId && (
        <span className="shrink-0 text-muted-foreground">←</span>
      )}
      {chip.time && (
        <span className="shrink-0 tabular-nums text-muted-foreground">{chip.time}</span>
      )}
    </div>
  );
}
