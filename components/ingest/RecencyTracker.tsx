"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Format, FormatMember, Person } from "@/lib/types";

export function Face({ person, className }: { person: Person; className?: string }) {
  const initials = person.name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return person.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={person.photo}
      alt={person.name}
      className={cn("h-8 w-8 rounded-full object-cover", className)}
    />
  ) : (
    <span
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-medium",
        className
      )}
    >
      {initials}
    </span>
  );
}

function age(iso: string | null): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.floor(days / 7)}w`;
  return `${Math.floor(days / 30)}mo`;
}

// never-used sorts first
function byRecency(a: FormatMember, b: FormatMember) {
  return (a.lastUsedAt ?? "").localeCompare(b.lastUsedAt ?? "");
}

export function RecencyTracker() {
  const [formats, setFormats] = useState<Format[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/formats"), fetch("/api/people")]).then(
      async ([f, p]) => {
        if (f.ok) setFormats(await f.json());
        if (p.ok) setPeople(await p.json());
      }
    );
  }, []);

  async function markUsed(formatId: string, personId: string) {
    const res = await fetch("/api/formats", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: formatId, usedPersonId: personId }),
    });
    if (res.ok) {
      const updated: Format = await res.json();
      setFormats((prev) => prev.map((f) => (f.id === formatId ? updated : f)));
    }
  }

  const visible = formats.filter((f) => f.members.length > 0);
  if (visible.length === 0) return null;

  return (
    <div className="max-h-[40%] overflow-y-auto border-b p-2">
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Recency
      </div>
      <div className="flex flex-col gap-2">
        {visible.map((format) => {
          const members = [...format.members].sort(byRecency);
          const latest = members.at(-1);
          return (
            <div key={format.id}>
              <div className="mb-1 text-xs font-medium">{format.name}</div>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => {
                  const person = people.find((p) => p.id === m.personId);
                  if (!person) return null;
                  const isLatest = m === latest && m.lastUsedAt !== null;
                  return (
                    <button
                      key={m.personId}
                      onClick={() => markUsed(format.id, m.personId)}
                      title={
                        m.lastUsedAt
                          ? `${person.name}, ${new Date(m.lastUsedAt).toLocaleDateString()}`
                          : person.name
                      }
                      className="flex w-10 flex-col items-center gap-0.5 rounded-md p-0.5 hover:bg-muted"
                    >
                      <Face
                        person={person}
                        className={cn(isLatest && "ring-2 ring-primary ring-offset-1 ring-offset-background")}
                      />
                      <span className="w-full truncate text-center text-[9px] leading-tight">
                        {person.name.split(/\s+/)[0]}
                      </span>
                      <span className="text-[9px] leading-tight text-muted-foreground">
                        {age(m.lastUsedAt)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
