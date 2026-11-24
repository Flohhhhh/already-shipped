"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const CHOICES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function ThemeSwitch({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const selected = mounted ? (theme ?? "system") : "system";

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="bg-muted inline-flex rounded-full p-1"
    >
      {CHOICES.map((choice) => {
        const Icon = choice.icon;
        const active = selected === choice.value;
        return (
          <Button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={choice.label}
            variant={active ? "outline" : "quiet"}
            className={`${compact ? "size-8" : "size-11"} rounded-full border-transparent ${active ? "bg-card shadow-sm" : ""}`}
            onClick={() => setTheme(choice.value)}
          >
            <Icon />
          </Button>
        );
      })}
    </div>
  );
}
