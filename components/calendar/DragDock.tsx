"use client";

import { useDroppable } from "@dnd-kit/react";
import { Trash2 } from "lucide-react";
import { STATUS_CONFIG } from "@/lib/types";
import type { ChipStatus } from "@/lib/types";
import { StatusCircle } from "@/components/ui/StatusCircle";

const STATUSES: ChipStatus[] = ["obskur", "lumet", "actus", "statis", "exsol"];

const STATUS_COLORS: Record<ChipStatus, { bg: string; text: string; hint: string }> = {
  obskur: { bg: "bg-red-500", text: "text-white", hint: "bg-red-500/10 text-red-600" },
  lumet:  { bg: "bg-orange-500", text: "text-white", hint: "bg-orange-500/10 text-orange-600" },
  actus:  { bg: "bg-yellow-400", text: "text-yellow-950", hint: "bg-yellow-400/10 text-yellow-600" },
  statis: { bg: "bg-green-500", text: "text-white", hint: "bg-green-500/10 text-green-600" },
  exsol:  { bg: "bg-blue-500", text: "text-white", hint: "bg-blue-500/10 text-blue-600" },
};

function DockTarget({ id, children, color, destructive }: { id: string; children: React.ReactNode; color?: { bg: string; text: string; hint: string }; destructive?: boolean }) {
  const { ref, isDropTarget } = useDroppable({
    id,
    type: "dock",
    accept: ["chip"],
  });

  const classes = destructive
    ? isDropTarget
      ? "bg-destructive text-white scale-110"
      : "bg-destructive/10 text-destructive"
    : color
      ? isDropTarget
        ? `${color.bg} ${color.text} scale-110`
        : color.hint
      : isDropTarget
        ? "bg-primary text-primary-foreground scale-110"
        : "bg-muted text-muted-foreground";

  return (
    <div
      ref={ref}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${classes}`}
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
          const cfg = STATUS_CONFIG[status];
          return (
            <DockTarget key={status} id={`dock-status-${status}`} color={STATUS_COLORS[status]}>
              <StatusCircle status={cfg.circle} color={cfg.circleColor} progress={cfg.circleProgress} weight={2.5} className="h-4 w-4" />
              <span>{cfg.label}</span>
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
