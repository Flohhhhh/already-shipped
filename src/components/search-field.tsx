"use client";

import { CornerDownLeft, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { useRecentSearches } from "@/components/use-recent-searches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Suggestion = {
  id: string;
  title: string;
  where: string;
};

type Row =
  | { kind: "recent"; id: string; title: string; where: string }
  | { kind: "match"; id: string; title: string; where: string };

export function SearchField({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const { recents, remember } = useRecentSearches();
  const [draft, setDraft] = useState(initialQuery);
  const [dirty, setDirty] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pending, setPending] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!dirty || draft.trim().length < 2) return;
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      setPending(true);
      void fetch(`/api/suggest?q=${encodeURIComponent(draft)}`, {
        signal: controller.signal,
      })
        .then((response) =>
          response.ok ? response.json() : { suggestions: [] },
        )
        .then((data: { suggestions?: Suggestion[] }) => {
          if (!controller.signal.aborted)
            setSuggestions(data.suggestions ?? []);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError")
            return;
          if (!controller.signal.aborted) setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setPending(false);
        });
    }, 160);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [dirty, draft]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setDismissed(true);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const showingRecents =
    focused && !dismissed && draft.trim() === "" && recents.length > 0;
  const showingSuggestions =
    dirty && !dismissed && draft.trim().length >= 2 && suggestions.length > 0;
  const rows: Row[] = showingRecents
    ? recents.map((query) => ({
        kind: "recent",
        id: query,
        title: query,
        where: "Recent",
      }))
    : showingSuggestions
      ? suggestions.map((item) => ({
          kind: "match",
          id: item.id,
          title: item.title,
          where: item.where,
        }))
      : [];
  const panelOpen = rows.length > 0;
  const activeIndex = panelOpen ? Math.min(active, rows.length - 1) : -1;
  const activeId = activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined;

  function openMatch(row: Row) {
    const typed = draft.trim();
    if (row.kind === "recent") {
      remember(row.title);
      router.push(`/?q=${encodeURIComponent(row.title)}`);
      return;
    }
    if (!typed) return;
    remember(typed);
    router.push(
      `/?q=${encodeURIComponent(typed)}&pick=${encodeURIComponent(row.id)}`,
    );
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <form
        action="/"
        className="relative"
        onSubmit={(event) => {
          const typed = draft.trim();
          if (!typed) {
            event.preventDefault();
            return;
          }
          remember(typed);
        }}
      >
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
        />
        <Input
          id="feature"
          name="q"
          variant="search"
          value={draft}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={panelOpen}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-label="Does T3 Code already do this?"
          placeholder="Describe a feature or setting"
          autoComplete="off"
          enterKeyHint="search"
          spellCheck={false}
          onFocus={() => {
            setFocused(true);
            setDismissed(false);
          }}
          onChange={(event) => {
            const value = event.target.value;
            setDraft(value);
            setDirty(true);
            setDismissed(false);
            setActive(0);
            if (value.trim().length < 2) setSuggestions([]);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              if (!panelOpen) return;
              event.preventDefault();
              const direction = event.key === "ArrowDown" ? 1 : -1;
              setActive((current) => {
                const index = Math.min(current, rows.length - 1);
                return Math.max(
                  0,
                  Math.min(rows.length - 1, index + direction),
                );
              });
              return;
            }
            if (event.key === "Escape") {
              if (!panelOpen && draft === "") return;
              event.preventDefault();
              if (panelOpen) setDismissed(true);
              else setDraft("");
              return;
            }
            if (event.key === "Enter" && panelOpen && activeIndex >= 0) {
              const row = rows[activeIndex];
              if (!row) return;
              event.preventDefault();
              openMatch(row);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          variant="ghost"
          aria-label={pending ? "Looking up" : "Search"}
          className="absolute top-1/2 right-2 size-11 -translate-y-1/2 rounded-full"
        >
          {pending ? <Loader2 className="animate-spin" /> : <CornerDownLeft />}
        </Button>
      </form>
      {panelOpen ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={showingRecents ? "Recent searches" : "Suggestions"}
          className="border-border/70 bg-popover/95 absolute z-30 mt-2 max-h-[min(22rem,50dvh)] w-full overflow-y-auto rounded-3xl border p-2 shadow-[0_16px_50px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:shadow-[0_16px_50px_rgba(0,0,0,0.4)]"
        >
          {rows.map((row, index) => {
            const selected = index === activeIndex;
            return (
              <li key={`${row.kind}-${row.id}`} role="presentation">
                <button
                  id={`${listId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`flex min-h-12 w-full flex-col items-start justify-center rounded-2xl px-3 py-2 text-left ${selected ? "bg-muted" : ""}`}
                  onMouseMove={() => setActive(index)}
                  onClick={() => openMatch(row)}
                >
                  <span className="w-full truncate text-base">{row.title}</span>
                  <span className="text-muted-foreground w-full truncate text-sm">
                    {row.where}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
