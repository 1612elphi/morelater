import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chipColours } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { colourCreate, colourPatch, handle, notFound, withId } from "@/lib/api";

// active only, unless ?all=1 (settings needs the inactive ones to reactivate them)
export async function GET(request: NextRequest) {
  const all = request.nextUrl.searchParams.has("all");
  const colours = db
    .select()
    .from(chipColours)
    .where(all ? undefined : eq(chipColours.isActive, true))
    .orderBy(chipColours.sortOrder)
    .all();
  return NextResponse.json(colours);
}

const byId = (id: string) =>
  db.select().from(chipColours).where(eq(chipColours.id, id)).get();

export const POST = handle(async (request: NextRequest) => {
  const body = colourCreate.parse(await request.json());
  const id = crypto.randomUUID();
  db.insert(chipColours).values({ ...body, id }).run();
  return NextResponse.json(byId(id), { status: 201 });
});

export const PATCH = handle(async (request: NextRequest) => {
  const json = await request.json();
  const { id } = withId.parse(json);
  const updates = colourPatch.parse(json);
  if (Object.keys(updates).length > 0)
    db.update(chipColours).set(updates).where(eq(chipColours.id, id)).run();
  const updated = byId(id);
  return updated ? NextResponse.json(updated) : notFound();
});
