"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChipColour } from "@/lib/types";

export default function SettingsPage() {
  const [colours, setColours] = useState<ChipColour[]>([]);
  const [newName, setNewName] = useState("");
  const [newHex, setNewHex] = useState("#888888");

  async function loadColours() {
    const res = await fetch("/api/colours");
    if (res.ok) setColours(await res.json());
  }

  useEffect(() => {
    loadColours();
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

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-lg font-semibold">Settings</h1>
      <Tabs defaultValue="colours">
        <TabsList>
          <TabsTrigger value="colours">Chip Colours</TabsTrigger>
        </TabsList>
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
      </Tabs>
    </div>
  );
}
