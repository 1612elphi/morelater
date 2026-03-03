import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const chipColours = sqliteTable("chip_colours", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  hex: text("hex").notNull(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const chips = sqliteTable("chips", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date"), // ISO 8601 date, NULL = OBSKUR/unscheduled
  time: text("time"), // HH:MM or null
  durationMinutes: integer("duration_minutes"),
  colourId: text("colour_id").references(() => chipColours.id),
  status: text("status").notNull().default("obskur"),
  modifier: text("modifier"), // 'meeting_low', 'meeting_high', or null
  isShoot: integer("is_shoot", { mode: "boolean" }).notNull().default(false),
  linkedChipId: text("linked_chip_id"), // FK to chips.id (self-ref handled in migration SQL)
  sortOrder: integer("sort_order").notNull().default(0),
  body: text("body"), // markdown
  starred: integer("starred", { mode: "boolean" }).notNull().default(false),
  series: text("series"),
  seriesNumber: integer("series_number"),
  calendarUid: text("calendar_uid"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const chipTags = sqliteTable("chip_tags", {
  chipId: text("chip_id")
    .notNull()
    .references(() => chips.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
});

export const dayTagTypes = sqliteTable("day_tag_types", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  colour: text("colour"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const dayTags = sqliteTable("day_tags", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  tagTypeId: text("tag_type_id")
    .notNull()
    .references(() => dayTagTypes.id),
});
