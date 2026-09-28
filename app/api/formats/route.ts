import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formats, formatPeople } from "@/lib/db/schema";
import { and, eq, notInArray } from "drizzle-orm";
import type { Format } from "@/lib/types";

function listFormats(): Format[] {
  const members = db.select().from(formatPeople).all();
  return db
    .select()
    .from(formats)
    .orderBy(formats.sortOrder)
    .all()
    .map((f) => ({
      ...f,
      members: members
        .filter((m) => m.formatId === f.id)
        .map(({ personId, lastUsedAt }) => ({ personId, lastUsedAt })),
    }));
}

export async function GET() {
  return NextResponse.json(listFormats());
}

export async function POST(request: NextRequest) {
  const { name } = await request.json();
  if (typeof name !== "string" || !name.trim())
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });

  const id = crypto.randomUUID();
  db.insert(formats)
    .values({ id, name: name.trim(), sortOrder: db.$count(formats) })
    .run();
  return NextResponse.json(
    listFormats().find((f) => f.id === id),
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const { id, name, memberIds, usedPersonId } = await request.json();
  if (!db.select().from(formats).where(eq(formats.id, id)).get())
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim())
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    db.update(formats).set({ name: name.trim() }).where(eq(formats.id, id)).run();
  }

  if (memberIds !== undefined) {
    if (!Array.isArray(memberIds) || !memberIds.every((m) => typeof m === "string"))
      return NextResponse.json({ error: "Invalid memberIds" }, { status: 400 });
    db.transaction((tx) => {
      tx.delete(formatPeople)
        .where(
          and(
            eq(formatPeople.formatId, id),
            notInArray(formatPeople.personId, memberIds)
          )
        )
        .run();
      if (memberIds.length > 0)
        tx.insert(formatPeople)
          .values(memberIds.map((personId: string) => ({ formatId: id, personId })))
          .onConflictDoNothing()
          .run();
    });
  }

  if (usedPersonId !== undefined) {
    db.update(formatPeople)
      .set({ lastUsedAt: new Date().toISOString() })
      .where(
        and(
          eq(formatPeople.formatId, id),
          eq(formatPeople.personId, usedPersonId)
        )
      )
      .run();
  }

  return NextResponse.json(listFormats().find((f) => f.id === id));
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  db.delete(formats).where(eq(formats.id, id)).run();
  return new NextResponse(null, { status: 204 });
}
