"use client";

import { createContext, useContext, useRef, useCallback, useMemo } from "react";

type ChipRefMap = Map<string, HTMLElement>;

interface ChipRefContextValue {
  register: (chipId: string, el: HTMLElement) => void;
  unregister: (chipId: string) => void;
  getRef: (chipId: string) => HTMLElement | undefined;
  mapRef: React.RefObject<ChipRefMap>;
}

const ChipRefContext = createContext<ChipRefContextValue | null>(null);

export function ChipRefProvider({ children }: { children: React.ReactNode }) {
  const mapRef = useRef<ChipRefMap>(new Map());

  const register = useCallback((chipId: string, el: HTMLElement) => {
    mapRef.current.set(chipId, el);
  }, []);

  const unregister = useCallback((chipId: string) => {
    mapRef.current.delete(chipId);
  }, []);

  const getRef = useCallback((chipId: string) => {
    return mapRef.current.get(chipId);
  }, []);

  const value = useMemo(
    () => ({ register, unregister, getRef, mapRef }),
    [register, unregister, getRef, mapRef]
  );

  return (
    <ChipRefContext.Provider value={value}>
      {children}
    </ChipRefContext.Provider>
  );
}

export function useChipRefs() {
  const ctx = useContext(ChipRefContext);
  if (!ctx) throw new Error("useChipRefs must be used within ChipRefProvider");
  return ctx;
}
