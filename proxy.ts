import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createLock } from "@/lib/lock";

type Lock = ReturnType<typeof createLock>;
const g = globalThis as { _lock?: Lock };
// lazy, like the db: not during `next build`
const getLock = () => (g._lock ??= createLock(db.$client));

// Everything is locked unless lib/lock.ts says otherwise: /api and /mcp answer
// 401, pages show the lock screen in place.
export async function proxy(req: NextRequest) {
  const lock = getLock();
  const res = lock.gate(req) ?? (await lock.route(req));
  if (res) return res;
  const p = req.nextUrl.pathname;
  if (!p.startsWith("/api/") && p !== "/lock" && !lock.unlocked(req))
    return NextResponse.rewrite(new URL("/lock", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
