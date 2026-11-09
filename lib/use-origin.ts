"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  loadSavedOrigin,
  ORIGIN_STORAGE_KEY,
  saveOrigin,
  type Origin,
} from "./geo";

/**
 * localStorage-backed "near me" origin.
 *
 * Treating storage as an external store (rather than syncing it into state
 * from an effect) keeps the server and first client render in agreement —
 * both see `null` — and lets the value update without a cascading re-render.
 */

let cached: Origin | null = null;
let hasReadStorage = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Keep other tabs of the directory in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === ORIGIN_STORAGE_KEY) {
      hasReadStorage = false;
      emit();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Origin | null {
  if (!hasReadStorage) {
    cached = loadSavedOrigin();
    hasReadStorage = true;
  }
  return cached; // stable reference between writes
}

function getServerSnapshot(): Origin | null {
  return null; // no location known while prerendering
}

export function useOrigin(): [Origin | null, (next: Origin | null) => void] {
  const origin = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setOrigin = useCallback((next: Origin | null) => {
    cached = next;
    hasReadStorage = true;
    saveOrigin(next);
    emit();
  }, []);

  return [origin, setOrigin];
}
