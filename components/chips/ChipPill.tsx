import { STATUS_CONFIG, MODIFIER_CONFIG } from "@/lib/types";
import type { Chip, ChipColour, ChipStatus } from "@/lib/types";

interface ChipPillProps {
  chip: Chip;
  colour: ChipColour | undefined;
  onClick: () => void;
}

export function ChipPill({ chip, colour, onClick }: ChipPillProps) {
  const statusIcon = STATUS_CONFIG[chip.status as ChipStatus]?.icon ?? "";
  const modifierSymbol = chip.modifier
    ? MODIFIER_CONFIG[chip.modifier]?.symbol
    : null;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] leading-tight transition-colors hover:brightness-90"
      style={{
        backgroundColor: colour ? colour.hex + "33" : "#94a3b833",
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
        <span className="shrink-0 text-muted-foreground">{chip.time}</span>
      )}
    </button>
  );
}
