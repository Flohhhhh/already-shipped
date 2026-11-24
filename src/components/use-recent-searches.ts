"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "already-shipped-recent";
const LIMIT = 5;
const EMPTY: readonly string[] = [];

let cached: readonly string[] | null = null;
const listeners = new Set<() => void>();

function read(): readonly string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter((item): item is string => typeof item === "string")
      .slice(0, LIMIT);
  } catch {
    return EMPTY;
  }
}

function getSnapshot() {
  cached ??= read();
  return cached;
}

function emit(next: readonly string[]) {
  cached = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRecentSearches() {
  const recents = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);

  function remember(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    const next = [
      trimmed,
      ...getSnapshot().filter((item) => item !== trimmed),
    ].slice(0, LIMIT);
    emit(next);
  }

  return { recents, remember };
}
