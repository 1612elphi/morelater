"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChipColour, DayTagType } from "@/lib/types";

export default function SettingsPage() {
  const [colours, setColours] = useState<ChipColour[]>([]);
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#888888");

  const [tagTypes, setTagTypes] = useState<DayTagType[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [newTagIcon, setNewTagIcon] = useState("");
  const [newTagColour, setNewTagColour] = useState("");

  async function loadColours() {
    const res = await fetch("/api/colours");
    if (res.ok) setColours(await res.json());
  }

  async function loadTagTypes() {
    const res = await fetch("/api/day-tag-types");
    if (res.ok) setTagTypes(await res.json());
  }

  useEffect(() => {
    loadColours();
    loadTagTypes();
  }, []);

  async function addColour() {
    if (!newName.trim()) return;
    await fetch("/api/colours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        hex: newHex,
        sortOrder: colours.length,
      }),
    });
    setNewName("");
    loadColours();
  }

  async function updateColour(id: string, updates: Partial<ChipColour>) {
    await fetch("/api/colours", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    loadColours();
  }

  async function addTagType() {
    if (!newTagName.trim() || !newTagIcon.trim()) return;
    await fetch("/api/day-tag-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newTagName.trim(),
        icon: newTagIcon.trim(),
        colour: newTagColour || null,
        sortOrder: tagTypes.length,
      }),
    });
    setNewTagName("");
    setNewTagIcon("");
    setNewTagColour("");
    loadTagTypes();
  }

  async function updateTagType(id: string, updates: Partial<DayTagType>) {
    await fetch("/api/day-tag-types", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    loadTagTypes();
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-lg font-semibold">Settings</h1>
      <Tabs defaultValue="colours">
        <TabsList>
          <TabsTrigger value="colours">Chip Colours</TabsTrigger>
          <TabsTrigger value="daytags">Day Tags</TabsTrigger>
        </TabsList>

        {/* Chip Colours tab — unchanged */}
        <TabsContent value="colours" className="mt-4">
          <div className="flex flex-col gap-2">
            {colours.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded border p-2"
              >
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => updateColour(c.id, { hex: e.target.value })}
                  className="h-8 w-8 cursor-pointer rounded border-0"
                />
                <Input
                  value={c.name}
                  onChange={(e) => updateColour(c.id, { name: e.target.value })}
                  className="h-8 flex-1 text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateColour(c.id, { isActive: !c.isActive })
                  }
                  className="text-xs"
                >
                  {c.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              type="color"
              value={newHex}
              onChange={(e) => setNewHex(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded"
            />
            <Input
              placeholder="New colour name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="h-8 flex-1 text-sm"
            />
            <Button onClick={addColour} size="sm">
              Add
            </Button>
          </div>
        </TabsContent>

        {/* Day Tags tab */}
        <TabsContent value="daytags" className="mt-4">
          <div className="flex flex-col gap-2">
            {tagTypes.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded border p-2"
              >
                <Input
                  value={t.icon}
                  onChange={(e) =>
                    updateTagType(t.id, { icon: e.target.value })
                  }
                  className="h-8 w-12 text-center text-sm"
                  title="Icon (emoji or character)"
                />
                <Input
                  value={t.name}
                  onChange={(e) =>
                    updateTagType(t.id, { name: e.target.value })
                  }
                  className="h-8 flex-1 text-sm"
                />
                <input
                  type="color"
                  value={t.colour ?? "#888888"}
                  onChange={(e) =>
                    updateTagType(t.id, { colour: e.target.value })
                  }
                  className="h-8 w-8 cursor-pointer rounded border-0"
                  title="Background tint (optional)"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateTagType(t.id, { isActive: !t.isActive })
                  }
                  className="text-xs"
                >
                  {t.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <Input
              placeholder="Icon..."
              value={newTagIcon}
              onChange={(e) => setNewTagIcon(e.target.value)}
              className="h-8 w-12 text-center text-sm"
            />
            <Input
              placeholder="Tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="h-8 flex-1 text-sm"
            />
            <input
              type="color"
              value={newTagColour || "#888888"}
              onChange={(e) => setNewTagColour(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded"
            />
            <Button onClick={addTagType} size="sm">
              Add
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
