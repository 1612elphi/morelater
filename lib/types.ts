import type { LucideIcon } from "lucide-react";
import {
  Lightbulb,
  Pin,
  Wrench,
  Pause,
  Radio,
  Triangle,
  Star,
  Camera,
} from "lucide-react";
import type { StatusCircleStatus } from "@/components/ui/StatusCircle";

export type ChipStatus = "obskur" | "lumet" | "actus" | "statis" | "exsol";

export type ChipModifier = "meeting_low" | "meeting_high" | null;

export const STATUS_CONFIG: Record<
  ChipStatus,
  { label: string; icon: LucideIcon; circle: StatusCircleStatus; circleColor: string; circleProgress: number }
> = {
  obskur: { label: "OBSKUR", icon: Lightbulb, circle: "backlog", circleColor: "#ef4444", circleProgress: 0 },
  lumet: { label: "LUMET", icon: Pin, circle: "todo", circleColor: "#f97316", circleProgress: 0 },
  actus: { label: "ACTUS", icon: Wrench, circle: "in-progress", circleColor: "#eab308", circleProgress: 50 },
  statis: { label: "STATIS", icon: Pause, circle: "in-progress", circleColor: "#22c55e", circleProgress: 85 },
  exsol: { label: "EXSOL", icon: Radio, circle: "done", circleColor: "#3b82f6", circleProgress: 0 },
};

export const MODIFIER_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon }
> = {
  meeting_low: { label: "Meeting (low)", icon: Triangle },
  meeting_high: { label: "Meeting (high)", icon: Star },
};

export const SHOOT_ICON = Camera;

export interface Chip {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  durationMinutes: number | null;
  colourId: string | null;
  status: ChipStatus;
  modifier: ChipModifier;
  isShoot: boolean;
  linkedChipId: string | null;
  sortOrder: number;
  body: string | null;
  starred: boolean;
  series: string | null;
  seriesNumber: number | null;
  calendarUid: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChipRelation {
  id: string;
  sourceChipId: string;
  targetChipId: string;
  type: string; // 'blocks'
  createdAt: string;
}

export interface RelatedChip {
  id: string;
  title: string;
  status: ChipStatus;
  colourId: string | null;
}

export interface ChipColour {
  id: string;
  name: string;
  hex: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
}

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
