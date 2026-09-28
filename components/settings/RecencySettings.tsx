"use client";

import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Face } from "@/components/ingest/RecencyTracker";
import { cn } from "@/lib/utils";
import type { Format, Person } from "@/lib/types";

const THUMBNAIL_PX = 96;

async function toThumbnail(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = THUMBNAIL_PX;
  canvas
    .getContext("2d")!
    .drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      THUMBNAIL_PX,
      THUMBNAIL_PX
    );
  return canvas.toDataURL("image/jpeg", 0.85);
}

async function send(url: string, method: string, body?: object) {
  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
}

export function RecencySettings() {
  const [people, setPeople] = useState<Person[]>([]);
  const [formats, setFormats] = useState<Format[]>([]);
  const [newPerson, setNewPerson] = useState("");
  const [newFormat, setNewFormat] = useState("");

  function load() {
    return Promise.all([fetch("/api/people"), fetch("/api/formats")]).then(
      async ([p, f]) => {
        if (p.ok) setPeople(await p.json());
        if (f.ok) setFormats(await f.json());
      }
    );
  }

  useEffect(() => {
    load();
  }, []);

  async function addPerson() {
    if (!newPerson.trim()) return;
    await send("/api/people", "POST", { name: newPerson });
    setNewPerson("");
    load();
  }

  async function setPhoto(id: string, file: File | undefined) {
    if (!file) return;
    await send("/api/people", "PATCH", { id, photo: await toThumbnail(file) });
    load();
  }

  async function addFormat() {
    if (!newFormat.trim()) return;
    await send("/api/formats", "POST", { name: newFormat });
    setNewFormat("");
    load();
  }

  async function toggleMember(format: Format, personId: string) {
    const ids = format.members.map((m) => m.personId);
    const memberIds = ids.includes(personId)
      ? ids.filter((id) => id !== personId)
      : [...ids, personId];
    await send("/api/formats", "PATCH", { id: format.id, memberIds });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-sm font-medium">People</h2>
        <div className="flex flex-col gap-2">
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded border p-2">
              <label className="cursor-pointer" title="Change photo">
                <Face person={p} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhoto(p.id, e.target.files?.[0])}
                />
              </label>
              <Input
                defaultValue={p.name}
                onBlur={(e) =>
                  e.target.value.trim() !== p.name &&
                  send("/api/people", "PATCH", { id: p.id, name: e.target.value }).then(load)
                }
                className="h-8 flex-1 text-sm"
              />
              <Button
                variant="ghost"
                size="sm"
                title="Delete"
                onClick={() => send(`/api/people?id=${p.id}`, "DELETE").then(load)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="Name..."
            value={newPerson}
            onChange={(e) => setNewPerson(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPerson()}
            className="h-8 flex-1 text-sm"
          />
          <Button onClick={addPerson} size="sm">
            Add
          </Button>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium">Formats</h2>
        <div className="flex flex-col gap-2">
          {formats.map((f) => (
            <div key={f.id} className="rounded border p-2">
              <div className="flex items-center gap-2">
                <Input
                  defaultValue={f.name}
                  onBlur={(e) =>
                    e.target.value.trim() !== f.name &&
                    send("/api/formats", "PATCH", { id: f.id, name: e.target.value }).then(load)
                  }
                  className="h-8 flex-1 text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  title="Delete"
                  onClick={() => send(`/api/formats?id=${f.id}`, "DELETE").then(load)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {people.map((p) => {
                  const isMember = f.members.some((m) => m.personId === p.id);
                  return (
                    <button
                      key={p.id}
                      title={p.name}
                      aria-pressed={isMember}
                      onClick={() => toggleMember(f, p.id)}
                      className={cn("rounded-full transition-opacity", !isMember && "opacity-25 grayscale")}
                    >
                      <Face person={p} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            placeholder="Format name..."
            value={newFormat}
            onChange={(e) => setNewFormat(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addFormat()}
            className="h-8 flex-1 text-sm"
          />
          <Button onClick={addFormat} size="sm">
            Add
          </Button>
        </div>
      </section>
    </div>
  );
}
