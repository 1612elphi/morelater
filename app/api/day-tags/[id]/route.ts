import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayTags } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = db.select().from(dayTags).where(eq(dayTags.id, id)).get();
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.delete(dayTags).where(eq(dayTags.id, id)).run();
  return NextResponse.json({ ok: true });
}
