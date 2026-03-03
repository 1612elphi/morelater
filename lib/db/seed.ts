import { v4 as uuid } from "uuid";
import { chipColours, dayTagTypes } from "./schema";
import type { Database } from "./index";

const DEFAULT_COLOURS = [
  { name: "Deadlines", hex: "#E53935", icon: null, sortOrder: 0 },
  { name: "Stories", hex: "#FF9800", icon: null, sortOrder: 1 },
  { name: "Events", hex: "#FFEB3B", icon: null, sortOrder: 2 },
  { name: "Feeds", hex: "#4CAF50", icon: null, sortOrder: 3 },
  { name: "Reels", hex: "#4DD0E1", icon: null, sortOrder: 4 },
];

const DEFAULT_DAY_TAG_TYPES = [
  { name: "PTO", icon: "ø", colour: null, sortOrder: 0 },
  { name: "Unpaid TO", icon: "🟥", colour: "#E53935", sortOrder: 1 },
  { name: "Print Shop", icon: "P", colour: null, sortOrder: 2 },
  { name: "WFH", icon: "🏠", colour: null, sortOrder: 3 },
  { name: "Editing", icon: "🎬", colour: null, sortOrder: 4 },
];

export function seedDefaults(db: Database) {
  const existingColours = db.select().from(chipColours).all();
  if (existingColours.length === 0) {
    for (const colour of DEFAULT_COLOURS) {
      db.insert(chipColours)
        .values({ id: uuid(), ...colour })
        .run();
    }
  }

  const existingTags = db.select().from(dayTagTypes).all();
  if (existingTags.length === 0) {
    for (const tag of DEFAULT_DAY_TAG_TYPES) {
      db.insert(dayTagTypes)
        .values({ id: uuid(), ...tag })
        .run();
    }
  }
}
