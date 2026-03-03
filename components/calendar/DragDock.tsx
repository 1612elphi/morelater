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
