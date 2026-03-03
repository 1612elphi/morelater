import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MoreLaterAPI } from "./api.js";
import { getISOWeekStart, addDays, formatDate } from "./date-helpers.js";

const STATUS_ENUM = ["obskur", "lumet", "actus", "statis", "exsol"] as const;

export function registerTools(server: McpServer, api: MoreLaterAPI) {
  server.tool(
    "create_chip",
    "Create a new chip (task/event)",
    {
      title: z.string(),
      date: z.string().optional().describe("YYYY-MM-DD"),
      time: z.string().optional().describe("HH:MM"),
      durationMinutes: z.number().optional(),
      colourId: z.string().optional(),
      status: z.enum(STATUS_ENUM).optional(),
      modifier: z.enum(["meeting_low", "meeting_high"]).optional(),
      isShoot: z.boolean().optional(),
      body: z.string().optional(),
    },
    async (params) => {
      const chip = await api.createChip(params);
      return { content: [{ type: "text", text: JSON.stringify(chip, null, 2) }] };
    }
  );

  server.tool(
    "update_chip",
    "Update fields on an existing chip",
    {
      id: z.string(),
      title: z.string().optional(),
      date: z.string().optional().describe("YYYY-MM-DD or null to unschedule"),
      time: z.string().optional().describe("HH:MM or null"),
      durationMinutes: z.number().optional(),
      colourId: z.string().optional(),
      status: z.enum(STATUS_ENUM).optional(),
      modifier: z.enum(["meeting_low", "meeting_high"]).nullable().optional(),
      isShoot: z.boolean().optional(),
      body: z.string().optional(),
      starred: z.boolean().optional(),
    },
    async ({ id, ...updates }) => {
      const chip = await api.updateChip(id, updates);
      return { content: [{ type: "text", text: JSON.stringify(chip, null, 2) }] };
    }
  );

  server.tool(
    "move_chip",
    "Move a chip to a different date and/or time",
    {
      id: z.string(),
      date: z.string().describe("YYYY-MM-DD"),
      time: z.string().optional().describe("HH:MM"),
    },
    async ({ id, date, time }) => {
      const chip = await api.updateChip(id, { date, ...(time !== undefined && { time }) });
      return { content: [{ type: "text", text: JSON.stringify(chip, null, 2) }] };
    }
  );

  server.tool(
    "set_chip_status",
    "Change a chip's status",
    {
      id: z.string(),
      status: z.enum(STATUS_ENUM),
    },
    async ({ id, status }) => {
      const chip = await api.updateChip(id, { status });
      return { content: [{ type: "text", text: JSON.stringify(chip, null, 2) }] };
    }
  );

  server.tool(
    "delete_chip",
    "Permanently delete a chip",
    {
      id: z.string(),
    },
    async ({ id }) => {
      await api.deleteChip(id);
      return { content: [{ type: "text", text: `Deleted chip ${id}` }] };
    }
  );

  server.tool(
    "create_idea",
    "Create a new unscheduled idea (obskur chip with no date)",
    {
      title: z.string(),
      body: z.string().optional(),
    },
    async ({ title, body }) => {
      const chip = await api.createChip({ title, body, status: "obskur" });
      return { content: [{ type: "text", text: JSON.stringify(chip, null, 2) }] };
    }
  );

  server.tool(
    "schedule_idea",
    "Schedule an obskur chip — sets date, colour, and status to lumet",
    {
      id: z.string(),
      date: z.string().describe("YYYY-MM-DD"),
      time: z.string().optional().describe("HH:MM"),
      colourId: z.string(),
    },
    async ({ id, date, time, colourId }) => {
      const chip = await api.updateChip(id, {
        date,
        ...(time !== undefined && { time }),
        colourId,
        status: "lumet",
      });
      return { content: [{ type: "text", text: JSON.stringify(chip, null, 2) }] };
    }
  );

  server.tool(
    "set_day_tag",
    "Add a tag to a day",
    {
      date: z.string().describe("YYYY-MM-DD"),
      tagTypeId: z.string(),
    },
    async ({ date, tagTypeId }) => {
      const tag = await api.createDayTag(date, tagTypeId);
      return { content: [{ type: "text", text: JSON.stringify(tag, null, 2) }] };
    }
  );

  server.tool(
    "remove_day_tag",
    "Remove a tag from a day",
    {
      id: z.string(),
    },
    async ({ id }) => {
      await api.deleteDayTag(id);
      return { content: [{ type: "text", text: `Removed day tag ${id}` }] };
    }
  );

  server.tool(
    "list_chips",
    "List chips with optional filters",
    {
      startDate: z.string().optional().describe("YYYY-MM-DD"),
      endDate: z.string().optional().describe("YYYY-MM-DD"),
      status: z.enum(STATUS_ENUM).optional(),
      unscheduled: z.boolean().optional(),
    },
    async (params) => {
      const chips = await api.listChips(params);
      return { content: [{ type: "text", text: JSON.stringify(chips, null, 2) }] };
    }
  );

  server.tool(
    "get_week_summary",
    "Get a structured summary of chips and day tags for an ISO week",
    {
      year: z.number(),
      week: z.number().min(1).max(53),
    },
    async ({ year, week }) => {
      const start = getISOWeekStart(year, week);
      const end = addDays(start, 6);
      const startDate = formatDate(start);
      const endDate = formatDate(end);
      const [chips, dayTags] = await Promise.all([
        api.listChips({ startDate, endDate }),
        api.listDayTags({ startDate, endDate }),
      ]);
      const summary = {
        week: `${year}-W${String(week).padStart(2, "0")}`,
        startDate,
        endDate,
        chipCount: (chips as unknown[]).length,
        chips,
        dayTags,
      };
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    }
  );
}
