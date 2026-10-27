"use client";
import { useSyncExternalStore } from "react";

// Everything lives in localStorage on this device, under one prefix.
export const PFX = "lockin2:";

let ver = 0;
const subs = new Set<() => void>();
let queued = false;
function emit() {
  ver++;
  // Batch writes that happen in the same tick into one re-render.
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    subs.forEach((f) => f());
  });
}

export const S = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem(PFX + k);
      return v === null ? d : (JSON.parse(v) as T);
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(PFX + k, JSON.stringify(v));
    } catch {}
    emit();
  },
  del(k: string) {
    try {
      localStorage.removeItem(PFX + k);
    } catch {}
    emit();
  },
  keys(prefix = ""): string[] {
    try {
      return Object.keys(localStorage)
        .filter((k) => k.startsWith(PFX + prefix))
        .map((k) => k.slice(PFX.length));
    } catch {
      return [];
    }
  },
  dump(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const k of S.keys()) out[k] = S.get(k, null);
    return out;
  },
  load(data: Record<string, unknown>) {
    for (const [k, v] of Object.entries(data)) {
      try {
        localStorage.setItem(PFX + k, JSON.stringify(v));
      } catch {}
    }
    emit();
  },
  clear() {
    for (const k of S.keys()) {
      try {
        localStorage.removeItem(PFX + k);
      } catch {}
    }
    emit();
  },
};

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** Re-renders the caller whenever anything in the store changes. */
export function useStore() {
  return useSyncExternalStore(subscribe, () => ver, () => 0);
}
