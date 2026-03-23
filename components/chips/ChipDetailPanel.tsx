"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
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
import { Camera, Ban, X } from "lucide-react";
import { STATUS_CONFIG, MODIFIER_CONFIG } from "@/lib/types";
import type { Chip, ChipColour, ChipStatus, ChipModifier, RelatedChip } from "@/lib/types";
import { StatusCircle } from "@/components/ui/StatusCircle";

interface ChipDetailPanelProps {
  chip: Chip | null;
  colours: ChipColour[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onLinkedChipClick?: (chipId: string) => void;
  onFollowUp?: (chip: Chip) => void;
  onLink?: (chipId: string) => void;
  onBlockingPick?: (chipId: string, direction: "blocks" | "blockedBy") => void;
}

export function ChipDetailPanel({
  chip,
  colours,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  onLinkedChipClick,
  onFollowUp,
  onLink,
  onBlockingPick,
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
  const [linkedChip, setLinkedChip] = useState<{ id: string; title: string } | null>(null);
  const [blocksChips, setBlocksChips] = useState<Array<{ relationId: string; chip: RelatedChip }>>([]);
  const [blockedByChips, setBlockedByChips] = useState<Array<{ relationId: string; chip: RelatedChip }>>([]);

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
      if (chip.linkedChipId) {
        fetch(`/api/chips/${chip.linkedChipId}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => setLinkedChip(data ? { id: data.id, title: data.title } : null))
          .catch(() => setLinkedChip(null));
      } else {
        setLinkedChip(null);
      }
      // Fetch blocking relations
      fetch(`/api/chips/${chip.id}/relations`)
        .then((r) => (r.ok ? r.json() : { blocks: [], blockedBy: [] }))
        .then((data) => {
          setBlocksChips(data.blocks ?? []);
          setBlockedByChips(data.blockedBy ?? []);
        })
        .catch(() => {
          setBlocksChips([]);
          setBlockedByChips([]);
        });
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

  async function handleUnschedule() {
    if (!chip) return;
    await fetch(`/api/chips/${chip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: null, status: "obskur" }),
    });
    onOpenChange(false);
    onUpdated();
  }

  if (!chip) return null;

  const activeColour = colours.find((c) => c.id === colourId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[420px] flex-col overflow-y-auto sm:max-w-[420px]">
        <SheetHeader className="pb-0">
          <div className="flex items-center gap-2.5">
            {activeColour && (
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: activeColour.hex }}
              />
            )}
            <SheetTitle className="text-base">Edit Chip</SheetTitle>
          </div>
          <SheetDescription className="sr-only">
            Edit chip details
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 px-4 pb-2">
          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chip title"
            className="h-10 text-base font-medium"
          />

          {/* Linked-from */}
          {linkedChip ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed p-2 text-sm">
              <span className="text-muted-foreground">&larr;</span>
              <button
                className="min-w-0 flex-1 truncate text-left text-primary hover:underline"
                onClick={() => onLinkedChipClick?.(linkedChip.id)}
              >
                {linkedChip.title}
              </button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={async () => {
                  if (!chip) return;
                  await fetch(`/api/chips/${chip.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ linkedChipId: null }),
                  });
                  setLinkedChip(null);
                  onUpdated();
                }}
              >
                Unlink
              </Button>
            </div>
          ) : onLink ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-fit text-xs text-muted-foreground"
              onClick={() => {
                onLink(chip.id);
                onOpenChange(false);
              }}
            >
              &larr; Link to chip...
            </Button>
          ) : null}

          {/* Blocking relations */}
          {(blockedByChips.length > 0 || blocksChips.length > 0 || onBlockingPick) && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-muted-foreground">
                Relations
              </legend>

              {/* Blocked by */}
              {blockedByChips.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">Blocked by</span>
                  {blockedByChips.map((item) => (
                    <div key={item.relationId} className="flex items-center gap-2 rounded-md border border-dashed border-red-300/50 bg-red-50/30 p-1.5 text-sm dark:border-red-800/50 dark:bg-red-950/20">
                      <Ban className="h-3 w-3 shrink-0 text-red-400" />
                      <button
                        className="min-w-0 flex-1 truncate text-left text-primary hover:underline"
                        onClick={() => onLinkedChipClick?.(item.chip.id)}
                      >
                        {item.chip.title}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground"
                        onClick={async () => {
                          await fetch(`/api/chips/${chip!.id}/relations/${item.relationId}`, { method: "DELETE" });
                          setBlockedByChips((prev) => prev.filter((r) => r.relationId !== item.relationId));
                          onUpdated();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Blocks */}
              {blocksChips.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-medium text-muted-foreground">Blocks</span>
                  {blocksChips.map((item) => (
                    <div key={item.relationId} className="flex items-center gap-2 rounded-md border border-dashed border-orange-300/50 bg-orange-50/30 p-1.5 text-sm dark:border-orange-800/50 dark:bg-orange-950/20">
                      <Ban className="h-3 w-3 shrink-0 text-orange-400" />
                      <button
                        className="min-w-0 flex-1 truncate text-left text-primary hover:underline"
                        onClick={() => onLinkedChipClick?.(item.chip.id)}
                      >
                        {item.chip.title}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground"
                        onClick={async () => {
                          await fetch(`/api/chips/${chip!.id}/relations/${item.relationId}`, { method: "DELETE" });
                          setBlocksChips((prev) => prev.filter((r) => r.relationId !== item.relationId));
                          onUpdated();
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add relation buttons */}
              {onBlockingPick && (
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => {
                      onBlockingPick(chip!.id, "blockedBy");
                      onOpenChange(false);
                    }}
                  >
                    + Blocked by...
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => {
                      onBlockingPick(chip!.id, "blocks");
                      onOpenChange(false);
                    }}
                  >
                    + Blocks...
                  </Button>
                </div>
              )}
            </fieldset>
          )}

          {/* Schedule section */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">
              Schedule
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm"
              />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </fieldset>

          {/* Colour */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">
              Colour
            </legend>
            <Select value={colourId} onValueChange={setColourId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="No colour" />
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
          </fieldset>

          {/* Status */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">
              Status
            </legend>
            {(() => {
              const statuses = Object.keys(STATUS_CONFIG) as ChipStatus[];
              const activeIdx = statuses.indexOf(status);
              const activeCfg = STATUS_CONFIG[status];
              return (
                <div className="relative flex items-start px-2 pt-1 pb-1">
                  {/* Track line — thin, runs center-to-center of first/last circle */}
                  <div
                    className="pointer-events-none absolute top-[17px] h-px"
                    style={{ left: "calc(10% + 2px)", right: "calc(10% + 2px)", backgroundColor: "#e4e4e7" }}
                  />
                  {/* Filled portion of track */}
                  {activeIdx > 0 && (
                    <div
                      className="pointer-events-none absolute top-[17px] h-px transition-all duration-300 ease-out"
                      style={{
                        left: "calc(10% + 2px)",
                        width: `calc(${(activeIdx / (statuses.length - 1)) * 80}% - 4px)`,
                        backgroundColor: activeCfg.circleColor,
                        opacity: 0.4,
                      }}
                    />
                  )}
                  {statuses.map((s, i) => {
                    const cfg = STATUS_CONFIG[s];
                    const isActive = status === s;
                    const isPast = i < activeIdx;
                    return (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className="group relative z-10 flex flex-1 flex-col items-center gap-2 bg-transparent"
                      >
                        <div
                          className="rounded-full bg-background p-[3px] transition-transform duration-200"
                          style={isActive ? { transform: "scale(1.3)" } : undefined}
                        >
                          <StatusCircle
                            status={cfg.circle}
                            color={isActive || isPast ? cfg.circleColor : "#d4d4d8"}
                            progress={cfg.circleProgress}
                            weight={2.5}
                            className="h-[18px] w-[18px] transition-colors duration-200 group-hover:brightness-90"
                          />
                        </div>
                        <span
                          className="text-[10px] leading-none tracking-wide transition-all duration-200"
                          style={{
                            color: isActive ? activeCfg.circleColor : undefined,
                            fontWeight: isActive ? 600 : 400,
                            opacity: isActive ? 1 : 0.45,
                          }}
                        >
                          {cfg.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </fieldset>

          {/* Modifiers */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">
              Modifiers
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(MODIFIER_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Toggle
                    key={key}
                    pressed={modifier === key}
                    onPressedChange={(pressed) =>
                      setModifier(pressed ? (key as ChipModifier) : null)
                    }
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                  >
                    <Icon className="h-3.5 w-3.5" /> {config.label}
                  </Toggle>
                );
              })}
              <Toggle
                pressed={isShoot}
                onPressedChange={setIsShoot}
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                <Camera className="h-3.5 w-3.5" /> Shoot
              </Toggle>
            </div>
          </fieldset>

          {/* Notes */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-muted-foreground">
              Notes
            </legend>
            <Tabs defaultValue="edit">
              <TabsList className="mb-1.5 h-8">
                <TabsTrigger value="edit" className="text-xs">
                  Edit
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">
                  Preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-0">
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Notes, links, details..."
                  rows={5}
                  className="font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-0">
                <div className="prose prose-sm max-h-48 min-h-[7.5rem] overflow-y-auto rounded-md border p-3 text-sm">
                  {body || (
                    <span className="text-muted-foreground">
                      Nothing to preview
                    </span>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </fieldset>

          {/* Metadata */}
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <span>Created {new Date(chip.createdAt).toLocaleDateString()}</span>
            <span>Updated {new Date(chip.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions pinned to bottom */}
        <SheetFooter className="border-t">
          <div className="flex w-full gap-2">
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
            {chip.date && (
              <Button variant="outline" onClick={handleUnschedule}>
                Unschedule
              </Button>
            )}
            <Button
              variant="outline"
              disabled={saving}
              onClick={async () => {
                if (!chip || saving) return;
                setSaving(true);
                try {
                  const res = await fetch("/api/chips", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: "",
                      linkedChipId: chip.id,
                      colourId: chip.colourId,
                      date: chip.date,
                      status: "lumet",
                    }),
                  });
                  if (res.ok) {
                    const created = await res.json();
                    onUpdated();
                    onFollowUp?.(created);
                  }
                } catch {
                  // silently ignore network errors
                } finally {
                  setSaving(false);
                }
              }}
            >
              Follow-up
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
