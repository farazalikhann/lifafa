import type { EditorSnapshot } from "@/hooks/useCardEditor";
import { CLASSIC_TEMPLATE_ID } from "@/templates/registry";
import type { TemplateConfig } from "@/templates/types";

/**
 * The card, moved onto another template.
 *
 * WHAT A HOST TYPED IS NEVER TOUCHED. The draft goes across whole: the names,
 * the parents, every function, the venue, the note and all of it in each
 * language. So does everything on the card's config that is the event's
 * rather than the look's:
 *
 *   blocks          which sections are on, their order, and the custom
 *                   sections, whose headings and bodies are the host's words
 *   language        what the card is written in
 *   occasionId      what is being celebrated
 *   rsvpEnabled     whether guests can reply
 *   musicUrl        the host's own link
 *   pdfDownload     whether guests may keep a copy
 *   shareMessages   the host's wording of the WhatsApp message
 *   editor          which editor the card is changed in
 *   isPaid          not the editor's to change
 *
 * and the three switches kept in their own columns beside it: the weather, its
 * treatment and check-in at the door.
 *
 * EVERYTHING ELSE IS THE LOOK, and is the new template's. Its base design is
 * laid down whole, and the design keys it has no word for (the scratch panel,
 * the scene, the venue's painting, the divider) are left off the card, which
 * every reader takes as that key's default. Nothing of the old look is left
 * behind for the new one to be drawn over.
 *
 * Classic is a template like the others here: choosing it lays down the plain
 * design a new card has always started with. Its id is the one that is never
 * stored, so a card moved onto it is written exactly as a card that never had
 * a template.
 */
export function switchTemplate(
  snapshot: EditorSnapshot,
  template: TemplateConfig,
): EditorSnapshot {
  const { config } = snapshot;
  const design = template.baseDesign;

  return {
    draft: snapshot.draft,
    config: {
      ...(template.id !== CLASSIC_TEMPLATE_ID
        ? { templateId: template.id }
        : null),
      /* The card's theme follows the draft's, as it does in the editor. */
      themeId: snapshot.draft.themeId,
      blocks: config.blocks,
      language: config.language,
      occasionId: config.occasionId,
      rsvpEnabled: config.rsvpEnabled,
      musicUrl: config.musicUrl ?? null,
      ...(config.pdfDownload === false ? { pdfDownload: false } : null),
      ...(config.shareMessages !== undefined
        ? { shareMessages: config.shareMessages }
        : null),
      /* Which editor the card is changed in is the card's, not the look's. */
      ...(config.editor !== undefined ? { editor: config.editor } : null),
      isPaid: config.isPaid,

      style: design.style,
      borderStyle: design.borderStyle,
      decorMotion: design.decorMotion,
      decorIntensity: design.decorIntensity,
      butterflies: design.butterflies,
      leaves: design.leaves,
      flying: design.flying,
      nature: design.nature,
      petals: design.petals,
      petalFlower: design.petalFlower,
      traditionId: design.traditionId,
      ornamentConfig: design.ornamentConfig,
      /*
        A date behind a scratch panel is the card's one panel, on the date.
        Otherwise a template that draws its own scratch coins for the countdown
        (`countdownScratch`) starts a card with them covered, which the host
        can switch off in step 3; any other starts with nothing hidden.
      */
      scratchTarget:
        design.dateReveal === "scratch"
          ? "date"
          : template.countdownScratch === true
            ? "countdown"
            : "none",
      ...(design.dateReveal !== undefined
        ? { dateReveal: design.dateReveal }
        : null),
      ...(design.royalTexture === true ? { royalTexture: true } : null),
      ...(design.royalTexturePattern !== undefined
        ? { royalTexturePattern: design.royalTexturePattern }
        : null),
      ...(design.namesFrame !== undefined
        ? { namesFrame: design.namesFrame }
        : null),
      /* The template's own scene, where it names one; otherwise the card's default. */
      ...(template.scene !== undefined ? { scene: template.scene } : null),
    },
    coverAnimation: design.coverAnimation,
    showWeather: snapshot.showWeather,
    weatherTheme: snapshot.weatherTheme,
    qrCheckinEnabled: snapshot.qrCheckinEnabled,
  };
}
