"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChipColour } from "@/lib/types";

interface ChipCreatePopoverProps {
  date: string;
  colours: ChipColour[];
  onCreated: () => void;
  onCreatedForLinking?: (chipId: string) => void;
}

export function ChipCreatePopover({
  date,
  colours,
  onCreated,
  onCreatedForLinking,
}: ChipCreatePopoverProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [colourId, setColourId] = useState<string>(colours[0]?.id ?? "");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent, forLinking = false) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    const res = await fetch("/api/chips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        date,
        colourId: colourId || null,
        time: time || null,
        status: "lumet",
      }),
    });

    let createdId: string | null = null;
    if (res.ok && forLinking && onCreatedForLinking) {
      const created = await res.json();
      createdId = created.id;
    }

    setTitle("");
    setTime("");
    setSubmitting(false);
    setOpen(false);

    if (createdId && onCreatedForLinking) {
      onCreatedForLinking(createdId);
    } else {
      onCreated();
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`h-5 w-5 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted ${
            open ? "flex" : "hidden group-hover/day:flex"
          }`}
        >
          +
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Input
            placeholder="Chip title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="h-8 text-sm"
          />
          <Select value={colourId} onValueChange={setColourId}>
            <SelectTrigger className="h-8 text-sm">
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
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1" disabled={!title.trim() || submitting}>
              Add chip
            </Button>
            {onCreatedForLinking && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!title.trim() || submitting}
                onClick={(e) => handleSubmit(e, true)}
              >
                Follow-up
              </Button>
            )}
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
