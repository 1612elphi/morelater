import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MoreLaterAPI } from "./api.js";
import { getISOWeekNumber, getISOWeekStart, addDays, formatDate } from "./date-helpers.js";

export function registerPrompts(server: McpServer, api: MoreLaterAPI) {
  server.prompt(
    "weekly_briefing",
    "Generate a briefing for a specific week",
    {
      year: z.string().optional().describe("Year (defaults to current)"),
      week: z.string().optional().describe("ISO week number (defaults to current)"),
    },
    async ({ year, week }) => {
      const now = new Date();
      const y = year ? Number(year) : now.getFullYear();
      const w = week ? Number(week) : getISOWeekNumber(now);
      const start = getISOWeekStart(y, w);
      const end = addDays(start, 6);
      const startDate = formatDate(start);
      const endDate = formatDate(end);
      const [chips, dayTags] = await Promise.all([
        api.listChips({ startDate, endDate }),
        api.listDayTags({ startDate, endDate }),
      ]);
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Here is the calendar data for week ${y}-W${String(w).padStart(2, "0")} (${startDate} to ${endDate}):\n\nChips:\n${JSON.stringify(chips, null, 2)}\n\nDay Tags:\n${JSON.stringify(dayTags, null, 2)}\n\nPlease provide a concise weekly briefing: highlight key events, shoots, deadlines, and any days with special tags.`,
            },
          },
        ],
      };
    }
  );

  server.prompt(
    "ingest_triage",
    "Triage unscheduled ideas in the ingest pile",
    {},
    async () => {
      const [chips, colours] = await Promise.all([
        api.listChips({ unscheduled: true, status: "obskur" }),
        api.listColours(),
      ]);
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Here are the unscheduled ideas in the ingest pile:\n${JSON.stringify(chips, null, 2)}\n\nAvailable colours (categories):\n${JSON.stringify(colours, null, 2)}\n\nPlease review these ideas and suggest: which should be scheduled soon, which can wait, and which might be dropped. For items to schedule, suggest a colour category and approximate date.`,
            },
          },
        ],
      };
    }
  );

  server.prompt(
    "status_update",
    "Overview of active, paused, and completed work",
    {},
    async () => {
      const [actus, statis, exsol] = await Promise.all([
        api.listChips({ status: "actus" }),
        api.listChips({ status: "statis" }),
        api.listChips({ status: "exsol" }),
      ]);
      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `Current work status:\n\nActive (actus):\n${JSON.stringify(actus, null, 2)}\n\nPaused (statis):\n${JSON.stringify(statis, null, 2)}\n\nCompleted (exsol):\n${JSON.stringify(exsol, null, 2)}\n\nPlease provide a status update: summarize what's in progress, what's blocked/paused, and recent completions.`,
            },
          },
        ],
      };
    }
  );
}
