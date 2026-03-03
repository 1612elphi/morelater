# -- Builder --
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
RUN npm install -g bun

WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# -- Runner --
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/morelater.db

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle

RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "server.js"]
