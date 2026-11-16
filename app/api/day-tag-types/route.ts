import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayTagTypes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { handle, notFound, tagTypeCreate, tagTypePatch, withId } from "@/lib/api";

export async function GET() {
  const result = db
    .select()
    .from(dayTagTypes)
    .orderBy(dayTagTypes.sortOrder)
    .all();
  return NextResponse.json(result);
}

const byId = (id: string) =>
  db.select().from(dayTagTypes).where(eq(dayTagTypes.id, id)).get();

export const POST = handle(async (request: NextRequest) => {
  const body = tagTypeCreate.parse(await request.json());
  const id = crypto.randomUUID();
  db.insert(dayTagTypes).values({ ...body, id }).run();
  return NextResponse.json(byId(id), { status: 201 });
});

export const PATCH = handle(async (request: NextRequest) => {
  const json = await request.json();
  const { id } = withId.parse(json);
  const updates = tagTypePatch.parse(json);
  if (Object.keys(updates).length > 0)
    db.update(dayTagTypes).set(updates).where(eq(dayTagTypes.id, id)).run();
  const updated = byId(id);
  return updated ? NextResponse.json(updated) : notFound();
});
