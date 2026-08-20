import type { ReactElement } from "react";
import { THEMES } from "@/lib/themes";
import type { ThemeId } from "@/types/event";

export default function ThemePicker({
  selectedId,
  onSelect,
}: {
  selectedId: ThemeId;
  onSelect: (id: ThemeId) => void;
}): ReactElement {
  return (
    <div className="flex items-start justify-center gap-4">
      {THEMES.map((theme) => {
        const isSelected = theme.id === selectedId;

        return (
          <button
            key={theme.id}
            type="button"
            aria-pressed={isSelected}
            aria-label={`${theme.label} theme`}
            onClick={() => onSelect(theme.id)}
            className={[
              "group flex flex-col items-center gap-2 rounded-xl p-1",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-11 w-14 items-center justify-center rounded-lg border transition-shadow duration-200",
                isSelected
                  ? "border-transparent ring-2 ring-[var(--lifafa-marigold)] ring-offset-2 ring-offset-[var(--lifafa-ink)]"
                  : "border-[var(--lifafa-hairline)]",
              ].join(" ")}
              style={{ backgroundColor: theme.background }}
            >
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: theme.accent }}
              />
            </span>

            <span
              className={[
                "text-[0.6875rem] tracking-[0.12em] uppercase transition-colors duration-200",
                isSelected
                  ? "text-[var(--lifafa-cream)]"
                  : "text-[var(--lifafa-muted)] group-hover:text-[var(--lifafa-cream)]",
              ].join(" ")}
            >
              {theme.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
