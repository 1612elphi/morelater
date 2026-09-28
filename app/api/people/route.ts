import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { people } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const MAX_PHOTO_LENGTH = 200_000;

function validPhoto(photo: unknown) {
  return (
    photo === null ||
    (typeof photo === "string" &&
      photo.startsWith("data:image/") &&
      photo.length <= MAX_PHOTO_LENGTH)
  );
}

export async function GET() {
  return NextResponse.json(
    db.select().from(people).orderBy(people.sortOrder).all()
  );
}

export async function POST(request: NextRequest) {
  const { name, photo = null } = await request.json();
  if (typeof name !== "string" || !name.trim() || !validPhoto(photo))
    return NextResponse.json({ error: "Invalid person" }, { status: 400 });

  const id = crypto.randomUUID();
  const sortOrder = db.$count(people);
  db.insert(people).values({ id, name: name.trim(), photo, sortOrder }).run();
  return NextResponse.json(
    db.select().from(people).where(eq(people.id, id)).get(),
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest) {
  const { id, name, photo } = await request.json();
  const updates: { name?: string; photo?: string | null } = {};
  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim())
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    updates.name = name.trim();
  }
  if (photo !== undefined) {
    if (!validPhoto(photo))
      return NextResponse.json({ error: "Invalid photo" }, { status: 400 });
    updates.photo = photo;
  }

  const result = db.update(people).set(updates).where(eq(people.id, id)).run();
  if (result.changes === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(
    db.select().from(people).where(eq(people.id, id)).get()
  );
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  db.delete(people).where(eq(people.id, id)).run();
  return new NextResponse(null, { status: 204 });
}
