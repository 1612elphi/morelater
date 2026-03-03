export type ChipStatus = "obskur" | "lumet" | "actus" | "statis" | "exsol";

export type ChipModifier = "meeting_low" | "meeting_high" | null;

export const STATUS_CONFIG: Record<
  ChipStatus,
  { label: string; icon: string }
> = {
  obskur: { label: "OBSKUR", icon: "💡" },
  lumet: { label: "LUMET", icon: "📌" },
  actus: { label: "ACTUS", icon: "🔧" },
  statis: { label: "STATIS", icon: "⏸" },
  exsol: { label: "EXSOL", icon: "📡" },
};

export const MODIFIER_CONFIG = {
  meeting_low: { label: "Meeting (low)", symbol: "△" },
  meeting_high: { label: "Meeting (high)", symbol: "★" },
} as const;

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
