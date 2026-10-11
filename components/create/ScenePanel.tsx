"use client";

import type { ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import { SCENES, sceneThumb } from "@/lib/scene";
import type { Scene } from "@/types/card";

/** An empty frame with a stroke through it: no picture. */
function OffPreview(): ReactElement {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="h-9 w-9 opacity-60">
      <circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M13.5 34.5 34.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The painted scene on the card's first screen, under its opening lines:
 * one of three pictures, or off.
 *
 * The palace garden on every card until a host picks another or turns it
 * off. A dark card draws each by night; the tiles here are small copies of
 * the day paintings.
 */
export default function ScenePanel({
  scene,
  onSceneChange,
  accordion,
}: {
  scene: Scene;
  onSceneChange: (scene: Scene) => void;
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const current = SCENES.find((option) => option.id === scene);

  return (
    <CollapsibleSection
      title="Scene"
      summary={current?.label}
      {...sectionState(accordion, "scene")}
    >
      <div className="grid grid-cols-4 gap-2">
        {SCENES.map((option) => {
          const isSelected = option.id === scene;
          const thumb = sceneThumb(option.id);

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSceneChange(option.id)}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              <span
                className={[
                  "flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border bg-[var(--lifafa-ink-raised)] text-[var(--lifafa-cream)] transition-shadow duration-150",
                  isSelected
                    ? "border-transparent ring-2 ring-[var(--lifafa-marigold)] ring-offset-2 ring-offset-[var(--lifafa-ink)]"
                    : "border-[var(--lifafa-hairline)]",
                ].join(" ")}
              >
                {thumb === null ? (
                  <OffPreview />
                ) : (
                  <img
                    src={thumb}
                    alt=""
                    width={160}
                    height={240}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="h-full w-full object-cover select-none"
                  />
                )}
              </span>
              <span
                className={`text-center text-[0.6875rem] leading-tight ${
                  isSelected ? "text-[var(--lifafa-cream)]" : "text-[var(--lifafa-muted)]"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--lifafa-muted)]">
        {scene === "off"
          ? "Your card opens on its words alone."
          : "A painting under the opening lines of your card, edge to edge. It fades into your card's colour and moves gently as guests scroll."}
      </p>
    </CollapsibleSection>
  );
}
