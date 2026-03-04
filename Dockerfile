# -- Builder --
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
RUN npm install -g bun

WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
RUN bun build mcp/server.ts --target=node --outfile=dist/mcp-server.js

# -- Runner --
FROM node:20-alpine AS runner
RUN apk add --no-cache tzdata
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/morelater.db
ENV TZ=Europe/Berlin

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/dist/mcp-server.js ./mcp-server.js
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

RUN mkdir -p /app/data
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000 3001
CMD ["./entrypoint.sh"]
