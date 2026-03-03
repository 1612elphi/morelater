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
  trigger: React.ReactNode;
}

export function ChipCreatePopover({
  date,
  colours,
  onCreated,
  trigger,
}: ChipCreatePopoverProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [colourId, setColourId] = useState<string>(colours[0]?.id ?? "");
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);

    await fetch("/api/chips", {
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

    setTitle("");
    setTime("");
    setSubmitting(false);
    setOpen(false);
    onCreated();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
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
          <Button type="submit" size="sm" disabled={!title.trim() || submitting}>
            Add chip
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
