import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MoreLaterAPI } from "./api.js";
import { getISOWeekStart, addDays, formatDate } from "./date-helpers.js";

export function registerResources(server: McpServer, api: MoreLaterAPI) {
  // Chips for a specific date
  server.resource(
    "chips-by-date",
    new ResourceTemplate("morelater://chips/{date}", { list: undefined }),
    async (uri, { date }) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            await api.listChips({
              startDate: date as string,
              endDate: date as string,
            }),
            null,
            2
          ),
        },
      ],
    })
  );

  // Single chip detail
  server.resource(
    "chip-detail",
    new ResourceTemplate("morelater://chip/{id}", { list: undefined }),
    async (uri, { id }) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(await api.getChip(id as string), null, 2),
        },
      ],
    })
  );

  // Week view — chips + day tags for an ISO week
  server.resource(
    "week-view",
    new ResourceTemplate("morelater://week/{year}/{week}", { list: undefined }),
    async (uri, { year, week }) => {
      const start = getISOWeekStart(Number(year), Number(week));
      const end = addDays(start, 6);
      const startDate = formatDate(start);
      const endDate = formatDate(end);
      const [chips, dayTags] = await Promise.all([
        api.listChips({ startDate, endDate }),
        api.listDayTags({ startDate, endDate }),
      ]);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify({ startDate, endDate, chips, dayTags }, null, 2),
          },
        ],
      };
    }
  );

  // Ingest pile — unscheduled obskur chips
  server.resource("ingest", "morelater://ingest", async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(
          await api.listChips({ unscheduled: true, status: "obskur" }),
          null,
          2
        ),
      },
    ],
  }));

  // Available colours
  server.resource("colours", "morelater://colours", async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(await api.listColours(), null, 2),
      },
    ],
  }));

  // Day tags for a specific date
  server.resource(
    "day-tags",
    new ResourceTemplate("morelater://day-tags/{date}", { list: undefined }),
    async (uri, { date }) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(
            await api.listDayTags({
              startDate: date as string,
              endDate: date as string,
            }),
            null,
            2
          ),
        },
      ],
    })
  );
}
