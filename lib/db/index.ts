import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import path from "node:path";
import * as schema from "./schema";
import { seedDefaults } from "./seed";

const DATABASE_PATH =
  process.env.DATABASE_PATH ?? path.resolve(process.cwd(), "data/morelater.db");

function createDb() {
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
  var _db: ReturnType<typeof createDb> | undefined;
}

let db: ReturnType<typeof createDb>;

if (process.env.NODE_ENV === "production") {
  db = createDb();
} else {
  if (!globalThis._db) {
    globalThis._db = createDb();
  }
  db = globalThis._db;
}

export { db };
export type Database = typeof db;
