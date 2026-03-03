"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { STATUS_CONFIG, MODIFIER_CONFIG } from "@/lib/types";
import type { Chip, ChipColour, ChipStatus, ChipModifier } from "@/lib/types";

interface ChipDetailPanelProps {
  chip: Chip | null;
  colours: ChipColour[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function ChipDetailPanel({
  chip,
  colours,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
}: ChipDetailPanelProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [colourId, setColourId] = useState("");
  const [status, setStatus] = useState<ChipStatus>("obskur");
  const [modifier, setModifier] = useState<ChipModifier>(null);
  const [isShoot, setIsShoot] = useState(false);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (chip) {
      setTitle(chip.title);
      setDate(chip.date ?? "");
      setTime(chip.time ?? "");
      setColourId(chip.colourId ?? "");
      setStatus(chip.status);
      setModifier(chip.modifier);
      setIsShoot(chip.isShoot);
      setBody(chip.body ?? "");
    }
  }, [chip]);

  async function handleSave() {
    if (!chip) return;
    setSaving(true);
    await fetch(`/api/chips/${chip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        date: date || null,
        time: time || null,
        colourId: colourId || null,
        status,
        modifier,
        isShoot,
        body: body || null,
      }),
    });
    setSaving(false);
    onUpdated();
  }

  async function handleDelete() {
    if (!chip) return;
    await fetch(`/api/chips/${chip.id}`, { method: "DELETE" });
    onOpenChange(false);
    onDeleted();
  }

  if (!chip) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] overflow-y-auto sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Edit Chip</SheetTitle>
        </SheetHeader>

        <div className="mt-4 flex flex-col gap-4">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chip title"
            className="text-lg font-medium"
          />

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* Colour */}
          <Select value={colourId} onValueChange={setColourId}>
            <SelectTrigger>
              <SelectValue placeholder="Colour" />
            </SelectTrigger>
            <SelectContent>
              {colours.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator />

          {/* Status */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Status
            </label>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(STATUS_CONFIG) as ChipStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                    status === s
                      ? "border-primary bg-primary/10 font-medium"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Modifiers */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Modifiers
            </label>
            <div className="flex gap-1">
              {(
                Object.entries(MODIFIER_CONFIG) as [
                  string,
                  { label: string; symbol: string },
                ][]
              ).map(([key, config]) => (
                <Toggle
                  key={key}
                  pressed={modifier === key}
                  onPressedChange={(pressed) =>
                    setModifier(pressed ? (key as ChipModifier) : null)
                  }
                  size="sm"
                  className="text-sm"
                >
                  {config.symbol} {config.label}
                </Toggle>
              ))}
              <Toggle
                pressed={isShoot}
                onPressedChange={setIsShoot}
                size="sm"
                className="text-sm"
              >
                📷 Shoot
              </Toggle>
            </div>
          </div>

          <Separator />

          {/* Body — markdown with preview */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Notes
            </label>
            <Tabs defaultValue="edit">
              <TabsList className="mb-1">
                <TabsTrigger value="edit" className="text-xs">
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">
                  Preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="edit">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Notes, links, details..."
                  rows={6}
                  className="font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="preview">
                <div className="prose prose-sm max-h-48 min-h-[6rem] overflow-y-auto rounded border p-2">
                  {body || (
                    <span className="text-muted-foreground">
                      Nothing to preview
                    </span>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground">
            <p>Created: {new Date(chip.createdAt).toLocaleString()}</p>
            <p>Updated: {new Date(chip.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
