"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Port of godfile/src/lock/Lock.tsx.
const shake = [
  { transform: "none" },
  { transform: "translateX(-10px)" },
  { transform: "translateX(8px)" },
  { transform: "translateX(-5px)" },
  { transform: "translateX(3px)" },
  { transform: "none" },
];
const dim = [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }];

// The proxy serves this in place of any locked page, so the URL is the page to return to.
const enter = () => (location.pathname === "/lock" ? location.replace("/") : location.reload());

export function LockScreen() {
  const [keys, setKeys] = useState<string[]>([]);
  const [latched, setLatched] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((s: { authenticated: boolean; keys: string[] }) => {
        if (s.authenticated && location.pathname === "/lock") location.replace("/");
        else setKeys(s.keys);
      })
      .catch(() => {});
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    setBusy(true);
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: input.current!.value, keys: latched }),
    }).catch(() => null);
    if (res?.ok) return enter();
    setBusy(false);
    input.current!.value = "";
    input.current!.focus();
    form.animate(matchMedia("(prefers-reduced-motion: reduce)").matches ? dim : shake, { duration: 400, easing: "ease-out" });
  };

  const toggle = (k: string) => setLatched((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));

  return (
    <div className="flex h-full items-center justify-center p-4">
      <form onSubmit={submit} className="flex w-72 flex-col gap-3">
        <label htmlFor="lock-word" className="text-sm font-medium">
          What is the magic word?
        </label>
        <div className="flex gap-2">
          <Input ref={input} id="lock-word" type="password" autoComplete="current-password" autoFocus className="h-9" />
          <Button type="submit" size="sm" className="h-9" aria-label="Unlock" disabled={busy}>
            →
          </Button>
        </div>
        <div className="grid grid-cols-6 gap-1" role="group" aria-label="Symbols">
          {keys.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={latched.includes(k)}
              onClick={() => toggle(k)}
              className="flex h-10 items-center justify-center rounded-md border text-lg text-muted-foreground transition-colors hover:bg-muted aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
            >
              {k}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}

type ConnectRequest = { client: string; redirect: string };

export function ConnectCard({ request }: { request: string }) {
  const [info, setInfo] = useState<ConnectRequest | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/oauth/requests/${encodeURIComponent(request)}`)
      .then((r) => (r.ok ? (r.json() as Promise<ConnectRequest>) : null))
      .then(setInfo, () => setInfo(null));
  }, [request]);

  const decide = async (verb: "approve" | "deny") => {
    setBusy(true);
    const res = await fetch(`/api/oauth/${verb}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request }),
    }).catch(() => null);
    if (res?.ok) return location.assign(((await res.json()) as { redirect: string }).redirect);
    setInfo(null);
    setBusy(false);
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="flex w-80 flex-col gap-3 rounded-lg border p-4">
        <h1 className="text-base font-semibold">Connect</h1>
        {info === undefined ? null : info ? (
          <>
            <div className="flex flex-col">
              <strong className="text-sm">{info.client}</strong>
              <span className="font-mono text-xs text-muted-foreground">{info.redirect}</span>
            </div>
            <p className="text-sm text-muted-foreground">This app can read and change everything in More Later.</p>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={busy} onClick={() => decide("approve")}>
                Allow
              </Button>
              <Button size="sm" variant="outline" className="flex-1" disabled={busy} onClick={() => decide("deny")}>
                Deny
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Request expired</p>
        )}
      </div>
    </div>
  );
}
