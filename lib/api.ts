import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

// Wraps a route handler: bad input is a 400, not a 500.
export function handle<A extends unknown[]>(fn: (...args: A) => Response | Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ZodError)
        return NextResponse.json(
          { error: e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; ") },
          { status: 400 }
        );
      if (e instanceof SyntaxError)
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
      if ((e as { code?: string })?.code === "SQLITE_CONSTRAINT_FOREIGNKEY")
        return NextResponse.json({ error: "Referenced item does not exist" }, { status: 400 });
      throw e;
    }
  };
}

// chips.linked_chip_id has no foreign key (dropped in migration 0001), so check by hand
export const badLink = () =>
  NextResponse.json({ error: "linkedChipId does not exist" }, { status: 400 });

export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "expected HH:MM");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "expected #rrggbb");
const name = z.string().trim().min(1).max(200);
const sortOrder = z.number().int();

// Every writable chip column; unknown keys are dropped.
export const chipPatch = z
  .object({
    title: z.string().max(500),
    date: date.nullable(),
    time: time.nullable(),
    durationMinutes: z.number().int().positive().nullable(),
    colourId: z.string().nullable(),
    status: z.enum(["obskur", "lumet", "actus", "statis", "exsol"]),
    modifier: z.enum(["meeting_low", "meeting_high"]).nullable(),
    isShoot: z.boolean(),
    linkedChipId: z.string().nullable(),
    sortOrder,
    body: z.string().nullable(),
    starred: z.boolean(),
    series: z.string().nullable(),
    seriesNumber: z.number().int().nullable(),
  })
  .partial();
export const chipCreate = chipPatch.required({ title: true });

export const colourPatch = z
  .object({ name, hex, icon: z.string().nullable(), sortOrder, isActive: z.boolean() })
  .partial();
export const colourCreate = colourPatch.omit({ isActive: true }).required({ name: true, hex: true });

// colour is a hex or a named effect such as "rainbow"
export const tagTypePatch = z
  .object({ name, icon: z.string().trim().min(1).max(40), colour: z.string().max(40).nullable(), sortOrder, isActive: z.boolean() })
  .partial();
export const tagTypeCreate = tagTypePatch.omit({ isActive: true }).required({ name: true, icon: true });

export const dayTagCreate = z.object({ date, tagTypeId: z.string() });
export const withId = z.object({ id: z.string() });
