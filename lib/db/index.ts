import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import path from "node:path";
import * as schema from "./schema";
import { seedDefaults } from "./seed";

const DATABASE_PATH =
  process.env.DATABASE_PATH ?? path.resolve(process.cwd(), "data/morelater.db");

type DrizzleDb = ReturnType<typeof initDb>;

function initDb() {
  const sqlite = new Database(DATABASE_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });

  migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });

  seedDefaults(db);

  return db;
}

declare global {
  // eslint-disable-next-line no-var
  var _db: DrizzleDb | undefined;
}

function getDb(): DrizzleDb {
  if (process.env.NODE_ENV === "production") {
    return initDb();
  }
  if (!globalThis._db) {
    globalThis._db = initDb();
  }
  return globalThis._db;
}

// Lazy proxy — DB is only initialized on first property access (not at import time).
// This prevents build workers from racing on SQLite during `next build`.
export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export type Database = DrizzleDb;
