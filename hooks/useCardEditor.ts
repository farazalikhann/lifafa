"use client";

import { useCallback, useEffect, useState } from "react";
import type { PaidLimitNotes } from "@/components/create/EventForm";
import { useWeatherPreview } from "@/hooks/useWeatherPreview";
import {
  applyToBlocks,
  applyToDraft,
  type TranslatedWord,
} from "@/lib/autoTranslate";
import {
  butterflyStyle,
  flyingKind,
  leavesOn,
  natureKind,
} from "@/lib/butterflies";
import { petalFlowerType, petalStyle } from "@/lib/petals";
import { hasChosenDivider, scratchFrameOf } from "@/lib/cardDecor";
import { coupleIllustrationOn } from "@/lib/coupleCard";
import { DEFAULT_SCENE, sceneOf } from "@/lib/scene";
import { venueIllustrationOf } from "@/lib/venueIllustration";
import { namesFrameOf } from "@/lib/namesFrame";
import { pdfDownloadOn } from "@/lib/pdfDownload";
import { royalTextureOn, royalTexturePatternOf } from "@/lib/royalTexture";
import { deepEqual } from "@/lib/deepEqual";
import {
  DATE_CHANGE_LIMIT,
  NAME_CHANGE_LIMIT,
  dateEditRefusal,
  nameEditRefusal,
  paidEditMessage,
  type ChangeAllowance,
} from "@/lib/eventLock";
import { cardLanguage } from "@/lib/cardLanguage";
import {
  cardInLanguage,
  setDraftWord,
  setSectionWord,
  setSubEventWord,
  swapCardLanguage,
} from "@/lib/cardTranslation";
import {
  invitedHeadingOn,
  rsvpEnabled as readRsvpEnabled,
} from "@/lib/cardSections";
import { getMotifs } from "@/lib/motifs";
import { paletteTextColors } from "@/lib/textColors";
import { getOccasion } from "@/lib/occasions";
import { CLASSIC_TEMPLATE_ID, getTemplate } from "@/templates/registry";
import type {
  ButterflyStyle,
  FlyingKind,
  NatureKind,
  PetalFlower,
  RoyalTexturePattern,
  VenueIllustration,
  Scene,
  NamesFrame,
  PetalStyle,
  CardBorderStyle,
  CardConfig,
  CardLanguage,
  DecorIntensity,
  DecorMotion,
  DividerStyle,
  ScratchFrame,
  DateReveal,
  ScratchTarget,
} from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { WeatherThemeId } from "@/types/weather";
import type { CardBlock, CustomSectionWords } from "@/types/customSection";
import type { CardStyle, FontPairId } from "@/types/style";
import type { DraftWords, EventDraft, SubEventWords } from "@/types/event";
import type { OccasionId, TraditionId } from "@/types/occasion";
import type { OrnamentConfig } from "@/types/ornament";

/**
 * Everything a saved invitation is made of, in one object.
 *
 * The cover animation, the two weather fields and the check-in switch are here
 * rather than inside CardConfig because they are their own columns — see
 * supabase/migrations 0003, 0004 and 0005 — and this is the shape that has to
 * travel whole: to the sign-in stash on /create, to createEvent, to
 * updateEvent, and back out of the row when a host reopens the wizard.
 */
export interface EditorSnapshot {
  draft: EventDraft;
  config: CardConfig;
  coverAnimation: CoverAnimationId;
  showWeather: boolean;
  weatherTheme: WeatherThemeId;
  qrCheckinEnabled: boolean;
}

/**
 * What a route's save does, as far as the editor needs to know.
 *
 * `ok` means the page is on its way somewhere else — the saved screen, the
 * event's dashboard, or the sign-in page — so the button stays busy rather than
 * flicking back to its resting label under a host who has already left. The
 * failure carries a sentence written for a host; the editor shows it and does
 * nothing else with it.
 */
export type SaveOutcome = { ok: true } | { ok: false; error: string };

/**
 * The parts of a card's look the wizard has no control for.
 *
 * A template lays all of them down when it is chosen, and nothing else in the
 * wizard changes them: they are carried, in one value, from the card the
 * wizard was handed (or the template last chosen) to the card it saves. A card
 * made in the old tabbed editor may have any of them set by hand, ornaments
 * and all, and keeps them.
 */
interface CardLook {
  decorIntensity: DecorIntensity;
  butterflies: ButterflyStyle;
  leaves: boolean;
  flying: FlyingKind;
  nature: NatureKind;
  petals: PetalStyle;
  petalFlower: PetalFlower;
  traditionId: TraditionId;
  scratchFrame: ScratchFrame;
  /** The date's reveal once a host or a template has chosen one; undefined on a card that never has. */
  dateReveal: DateReveal | undefined;
  /** Whether "Meet the Couple" carries its figures. On unless the host turned it off. */
  coupleIllustration: boolean;
  invitedHeading: boolean;
  /** The painting above the venue's name. None unless one was picked. */
  venueIllustration: VenueIllustration;
  /** The painted scene after the first screen. */
  scene: Scene;
  /** Whether the damask is woven into the card's ground. */
  royalTexture: boolean;
  royalTexturePattern: RoyalTexturePattern;
  /** The frame the names are set in. The lotus ring unless another was picked. */
  namesFrame: NamesFrame;
  /** A divider chosen by hand, or undefined while the tradition's default stands. */
  divider: DividerStyle | undefined;
  ornamentConfig: OrnamentConfig;
}

/**
 * Every value the editor holds, flat, in one object.
 *
 * The point of naming this shape is the pair of functions under it. A snapshot
 * out of the database and a snapshot the editor has just built have to be
 * comparable — that is what tells a host with unsaved work apart from one who
 * has changed nothing — and the only way to be sure they are is to put both of
 * them through the same construction. `isPaid`, `templateId` aside, and
 * `wizard` are carried rather than edited.
 */
interface EditorState {
  draft: EventDraft;
  blocks: readonly CardBlock[];
  decorMotion: DecorMotion;
  occasionId: OccasionId;
  language: CardLanguage;
  rsvpEnabled: boolean;
  scratchTarget: ScratchTarget;
  /** Whether a guest may keep the card as a PDF. On unless the host turned it off. */
  pdfDownload: boolean;
  borderStyle: CardBorderStyle;
  style: CardStyle;
  musicUrl: string | null;
  look: CardLook;
  isPaid: boolean;
  /** The card's template, changed only by choosing another in the gallery. */
  templateId: string;
  /** Whether the card is the wizard's. Carried, never changed here; see CardConfig.editor. */
  wizard: boolean;
  coverAnimation: CoverAnimationId;
  showWeather: boolean;
  weatherTheme: WeatherThemeId;
  qrCheckinEnabled: boolean;
}

/**
 * A stored card, unpacked into the values the controls edit.
 *
 * This is where a saved card meets the fields it did not have when it was
 * saved. `musicUrl` is the live example: a config written before music existed
 * has no such key at all, and the editor's state has to start at null rather
 * than at undefined. What these readings fill in is never written back unless
 * the host changes that value; see keepStoredForm.
 */
function toState(snapshot: EditorSnapshot): EditorState {
  const { config } = snapshot;

  return {
    draft: snapshot.draft,
    blocks: config.blocks,
    decorMotion: config.decorMotion,
    occasionId: config.occasionId,
    /*
      Both missing from a card stashed by an older build, which toStoredEvent
      never sees — so they are resolved again here, to English and to on, the
      same answers a stored card gets.
    */
    language: cardLanguage(config.language),
    rsvpEnabled: readRsvpEnabled(config.rsvpEnabled),
    scratchTarget: config.scratchTarget,
    /* Missing on every card saved before the switch; those offer the copy. */
    pdfDownload: pdfDownloadOn(config.pdfDownload),
    borderStyle: config.borderStyle,
    style: config.style,
    /* Null on every card saved before this field existed. */
    musicUrl: config.musicUrl ?? null,
    look: {
      decorIntensity: config.decorIntensity,
      /* A key that may be missing, a boolean, or the colour — see butterflyStyle. */
      butterflies: butterflyStyle(config.butterflies),
      /* Missing on older cards; see leavesOn and petalStyle. */
      leaves: leavesOn(config.leaves, config.butterflies),
      /* Missing on every card saved before there were kinds: butterflies, and the green leaf. */
      flying: flyingKind(config.flying),
      nature: natureKind(config.nature),
      petals: petalStyle(config.petals),
      /* Missing on every card saved before the choice; those are roses. */
      petalFlower: petalFlowerType(config.petalFlower),
      traditionId: config.traditionId,
      /* Absent from a card saved before it existed; see lib/cardDecor.ts. */
      scratchFrame: scratchFrameOf(config.scratchFrame),
      /* Kept as stored, absent included, so opening an older card is not an edit to it. */
      dateReveal: config.dateReveal,
      coupleIllustration: coupleIllustrationOn(config.coupleIllustration),
      invitedHeading: invitedHeadingOn(config.invitedHeading),
      venueIllustration: venueIllustrationOf(config.venueIllustration),
      scene: sceneOf(config.scene),
      royalTexture: royalTextureOn(config.royalTexture),
      royalTexturePattern: royalTexturePatternOf(config.royalTexturePattern),
      namesFrame: namesFrameOf(config.namesFrame),
      divider: hasChosenDivider(config.divider) ? config.divider : undefined,
      /*
        As stored. The card reads a retired calligraphy id, or several pieces,
        the way it always has (see CardCanvas), and there is no control here
        that would show them any other way.
      */
      ornamentConfig: config.ornamentConfig,
    },
    /*
      Carried, never edited.

      /create starts it false, because nothing unsaved has been paid for. An
      edit carries whatever the row says, so a host who has paid does not have
      the fact quietly written out of their card's JSON by fixing a typo. The
      column is what a payment writes to and wins on the way out either way.
    */
    isPaid: config.isPaid,
    /* Missing on every card saved before there were templates: Classic. */
    templateId: getTemplate(config.templateId).id,
    wizard: config.editor === "wizard",
    coverAnimation: snapshot.coverAnimation,
    showWeather: snapshot.showWeather,
    weatherTheme: snapshot.weatherTheme,
    qrCheckinEnabled: snapshot.qrCheckinEnabled,
  };
}

/**
 * The editor's values, packed back into the shape a card is stored in.
 *
 * The one place a CardConfig is built, which is what makes the dirty check
 * trustworthy: the card being compared against is this function's output over
 * the state the editor started from, and the card in front of the host is this
 * function's output over the state it holds now. Neither key order nor a field
 * that one side happens to be missing can make them differ on its own.
 */
function toSnapshot(state: EditorState): EditorSnapshot {
  const { look } = state;

  return {
    draft: state.draft,
    config: {
      /* Only ever stored when it is not Classic, so an older card is stored as it was. */
      ...(state.templateId !== CLASSIC_TEMPLATE_ID
        ? { templateId: state.templateId }
        : null),
      /* Only ever stored on the wizard's cards, so an older card is stored as it was. */
      ...(state.wizard ? { editor: "wizard" as const } : null),
      /* The card's theme follows the draft's, which is what the occasion sets. */
      themeId: state.draft.themeId,
      blocks: state.blocks,
      decorMotion: state.decorMotion,
      decorIntensity: look.decorIntensity,
      butterflies: look.butterflies,
      leaves: look.leaves,
      flying: look.flying,
      nature: look.nature,
      petals: look.petals,
      petalFlower: look.petalFlower,
      occasionId: state.occasionId,
      traditionId: look.traditionId,
      language: state.language,
      rsvpEnabled: state.rsvpEnabled,
      scratchTarget: state.scratchTarget,
      scratchFrame: look.scratchFrame,
      /* Left off the card until somebody chooses, so an older card keeps what it has always shown. */
      ...(look.dateReveal !== undefined ? { dateReveal: look.dateReveal } : null),
      /* Only ever stored as off: a card that never had the key shows its figures. */
      ...(look.coupleIllustration ? null : { coupleIllustration: false }),
      /* The same: only a card with the heading off has anything stored. */
      ...(look.invitedHeading ? null : { invitedHeading: false }),
      /* Left off the card while there is none, so an older card is stored as it was. */
      ...(look.venueIllustration !== "none"
        ? { venueIllustration: look.venueIllustration }
        : null),
      /* Only ever stored when it is not the floral arch, so an older card is stored as it was. */
      ...(look.scene !== DEFAULT_SCENE ? { scene: look.scene } : null),
      /* Only ever stored as on: a card that never had the key has no texture. */
      ...(look.royalTexture ? { royalTexture: true } : null),
      /* Only ever stored when it is not the damask, and kept while the texture is off. */
      ...(look.royalTexturePattern !== "damask"
        ? { royalTexturePattern: look.royalTexturePattern }
        : null),
      /* Only ever stored when it is not the lotus ring, so an older card is stored as it was. */
      ...(look.namesFrame !== "lotus" ? { namesFrame: look.namesFrame } : null),
      /* Only ever stored as off: a card that never had the key offers the copy. */
      ...(state.pdfDownload ? null : { pdfDownload: false }),
      /* Left off the card until it is chosen, so the tradition's default goes on applying. */
      ...(look.divider !== undefined ? { divider: look.divider } : null),
      borderStyle: state.borderStyle,
      style: state.style,
      ornamentConfig: look.ornamentConfig,
      musicUrl: state.musicUrl,
      isPaid: state.isPaid,
    },
    coverAnimation: state.coverAnimation,
    showWeather: state.showWeather,
    weatherTheme: state.weatherTheme,
    qrCheckinEnabled: state.qrCheckinEnabled,
  };
}

/**
 * The card as built, with every key the host has not changed put back exactly
 * as it was stored.
 *
 * toState reads a stored card into the editor's terms: a missing key becomes
 * its default, an old boolean becomes the value that replaced it. Written
 * straight back, that would rewrite an invitation nobody touched, and it would
 * lose any key the editor does not know of at all. So each key is compared
 * between the card as built now and the card as built from what was stored
 * (`read`): where they agree the host has not changed it, and the stored value
 * goes back, or no key where there was none; where they differ the new value
 * is the host's. A key this editor does not build is never in either, so it
 * always agrees and is always kept.
 *
 * `stored` is the card this editor was handed, a saved invitation's, a stashed
 * card's or the empty one.
 */
function keepStoredForm(
  config: CardConfig,
  stored: CardConfig,
  read: CardConfig,
): CardConfig {
  const now = config as unknown as Record<string, unknown>;
  const was = stored as unknown as Record<string, unknown>;
  const then = read as unknown as Record<string, unknown>;
  const kept: Record<string, unknown> = {};

  for (const key of new Set([
    ...Object.keys(now),
    ...Object.keys(was),
    ...Object.keys(then),
  ])) {
    if (deepEqual(now[key], then[key])) {
      if (key in was) {
        kept[key] = was[key];
      }
    } else if (now[key] !== undefined) {
      kept[key] = now[key];
    }
  }

  return kept as unknown as CardConfig;
}

/**
 * The state of a card being made or changed in the wizard: every value, every
 * handler that writes one, the card as it stands, the dirty check and the save.
 *
 * Nothing here draws anything; components/wizard/Wizard.tsx is the only
 * caller, for a new card on /create and a saved one on its edit page.
 */
export function useCardEditor({
  start,
  guardUnsaved,
  onSave,
  paidLimits,
}: {
  /** The card to start from: an empty one, a stashed one or a stored one. */
  start: EditorSnapshot;
  /**
   * Whether unsaved changes are worth a prompt: true when there is a saved
   * card to lose them from, false for one that has never been saved.
   */
  guardUnsaved: boolean;
  /** What saving does. The hook never writes a row. */
  onSave: (snapshot: EditorSnapshot) => Promise<SaveOutcome>;
  /** After payment: the draft as saved and the changes used, for the notes on the date and names. */
  paidLimits?: { baseline: EventDraft; allowance: ChangeAllowance };
}) {
  /*
    What this route handed over, unpacked. Cheap enough to rebuild on every
    render and only ever read on the first: it seeds the state below and the
    baseline the dirty check measures against.
  */
  const initial = toState(start);

  /*
    The card as it was handed over, and as the editor first built it from
    that: the two keepStoredForm compares against. Fixed at the first render.
  */
  const [storedForm] = useState(() => ({
    stored: start.config,
    read: toSnapshot(initial).config,
  }));

  const [draft, setDraft] = useState<EventDraft>(initial.draft);
  const [occasionId, setOccasionId] = useState<OccasionId>(initial.occasionId);
  const [language, setLanguage] = useState<CardLanguage>(initial.language);
  /*
    Which language the preview shows, which is not the card's language.

    A card can be shared in every language, so the host needs to see each
    version, and this is only a lens: nothing about it is saved. It follows
    what the host is typing — into the other language's words, or back into
    the card's own — and the switch over the preview sets it outright.
  */
  const [previewLanguage, setPreviewLanguage] = useState<CardLanguage>(
    initial.language,
  );
  const [rsvpEnabled, setRsvpEnabled] = useState<boolean>(initial.rsvpEnabled);
  const [decorMotion, setDecorMotion] = useState(initial.decorMotion);
  const [borderStyle, setBorderStyle] = useState(initial.borderStyle);
  const [scratchTarget, setScratchTarget] = useState(initial.scratchTarget);
  const [pdfDownload, setPdfDownload] = useState(initial.pdfDownload);
  const [look, setLook] = useState<CardLook>(initial.look);
  /* A link the host pastes. Null is "no music", and nothing ever autoplays. */
  const [musicUrl, setMusicUrl] = useState<string | null>(initial.musicUrl);
  /*
    Not part of CardConfig: the cover wraps the card rather than being on it,
    and it is stored in its own column. See supabase/migrations/0003.
  */
  const [coverAnimation, setCoverAnimation] = useState<CoverAnimationId>(
    initial.coverAnimation,
  );
  /* Also its own column rather than part of CardConfig; see 0004. */
  const [showWeather, setShowWeather] = useState(initial.showWeather);
  const [weatherTheme, setWeatherTheme] = useState<WeatherThemeId>(
    initial.weatherTheme,
  );

  /*
    The real reading for the venue in front of the host, so the preview shows
    the weather rather than only promising it. Resolved through a server action
    because the lookup is a server one; null while it is in flight and null
    when the venue cannot be resolved, which is exactly what the saved card
    does with the same venue.
  */
  const previewWeather = useWeatherPreview({
    enabled: showWeather,
    venueName: draft.venueName,
    venueAddress: draft.venueAddress,
    eventDate: draft.eventDate,
  });
  /* Its own column as well; see 0005. */
  const [qrCheckinEnabled, setQrCheckinEnabled] = useState(
    initial.qrCheckinEnabled,
  );
  const [style, setStyle] = useState<CardStyle>(initial.style);

  /*
    Which function in the timeline has its fields open. Here rather than in
    SubEventEditor, which unmounts whenever the host leaves the details step.
  */
  const [openSubEventId, setOpenSubEventId] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<readonly CardBlock[]>(initial.blocks);
  /* The card's template, which the gallery changes through `applySnapshot` below. */
  const [templateId, setTemplateId] = useState<string>(initial.templateId);

  /**
   * Replaces the whole card with another: what choosing a template does, with
   * the card switchTemplate hands back. Through toState, like the card the
   * editor started from, so every value lands in the shape its control holds.
   * The preview's language, the open rows and the save are left alone.
   */
  const applySnapshot = useCallback((next: EditorSnapshot): void => {
    const state = toState(next);

    setDraft(state.draft);
    setBlocks(state.blocks);
    setTemplateId(state.templateId);
    setOccasionId(state.occasionId);
    setLanguage(state.language);
    setRsvpEnabled(state.rsvpEnabled);
    setDecorMotion(state.decorMotion);
    setBorderStyle(state.borderStyle);
    setScratchTarget(state.scratchTarget);
    setPdfDownload(state.pdfDownload);
    setLook(state.look);
    setMusicUrl(state.musicUrl);
    setCoverAnimation(state.coverAnimation);
    setShowWeather(state.showWeather);
    setWeatherTheme(state.weatherTheme);
    setQrCheckinEnabled(state.qrCheckinEnabled);
    setStyle(state.style);
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback<
    <K extends keyof EventDraft>(field: K, value: EventDraft[K]) => void
  >((field, value) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
  }, []);

  /**
   * An occasion click on a Classic card is the only thing that overwrites the
   * theme and motion. Every other render leaves them alone, so a host who
   * opens a saved card and never touches the occasion keeps everything they
   * chose last time.
   */
  const handleOccasionSelect = useCallback((id: OccasionId) => {
    const occasion = getOccasion(id);
    setOccasionId(id);
    setDecorMotion(occasion.defaultMotion);
    setDraft((previous) => ({ ...previous, themeId: occasion.defaultThemeId }));
    /* Palette follows the occasion; a custom accent and the text pair go with it. */
    setStyle((previous) => ({
      ...previous,
      paletteId: occasion.defaultPaletteId,
      accentOverride: null,
      textColors: paletteTextColors(occasion.defaultPaletteId),
    }));
  }, []);

  /**
   * A language click: the card is now written in `next`.
   *
   * Nothing the host typed is translated — nothing here can translate — but
   * nothing is lost either. Words the host already wrote in `next` become the
   * card's own and the ones they replace become its translation, so a host who
   * filled in Hindi with English names beside it and then flips the card to
   * English finds both still there, the right way round. With nothing written
   * in `next`, the words stay exactly where they are, apart from a preset
   * joining word, which takes the new language's preset ("weds" and "संग").
   * See swapCardLanguage.
   *
   * Reads the draft and blocks from the render rather than through updaters,
   * because one click has to rewrite both from the same starting point.
   */
  const handleLanguageSelect = useCallback(
    (next: CardLanguage) => {
      if (next === language) {
        return;
      }

      const swapped = swapCardLanguage(draft, blocks, language, next);

      setLanguage(next);
      setDraft(swapped.draft);
      setBlocks(swapped.blocks);
      setPreviewLanguage(next);
    },
    [language, draft, blocks],
  );

  /*
    One word in another language, written or cleared. Through updaters, like
    every other keystroke here, so fast typing cannot drop a character.
  */
  const handleDraftWord = useCallback(
    (wordLanguage: CardLanguage, field: keyof DraftWords, value: string) => {
      setDraft((previous) => setDraftWord(previous, wordLanguage, field, value));
    },
    [],
  );

  const handleSubEventWord = useCallback(
    (
      wordLanguage: CardLanguage,
      subEventId: string,
      field: keyof SubEventWords,
      value: string,
    ) => {
      setDraft((previous) =>
        setSubEventWord(previous, wordLanguage, subEventId, field, value),
      );
    },
    [],
  );

  const handleSectionWord = useCallback(
    (
      wordLanguage: CardLanguage,
      sectionId: string,
      field: keyof CustomSectionWords,
      value: string,
    ) => {
      setBlocks((previous) =>
        setSectionWord(previous, wordLanguage, sectionId, field, value),
      );
    },
    [],
  );

  /*
    Bumped each time the Translate button fills words, so the panel at the end
    of the step opens on them. See `revealSignal` in TranslationPanel.
  */
  const [translatedSignal, setTranslatedSignal] = useState(0);

  /**
   * The Translate button's results, written into the other language's words.
   *
   * Through updaters, like every keystroke here: the request was in flight
   * while the host may have kept typing, so each result is checked against the
   * card as it is now, and one whose source changed meanwhile is dropped. The
   * preview turns to the language just filled, so the host sees it at once.
   */
  const handleTranslated = useCallback(
    (
      from: CardLanguage,
      to: CardLanguage,
      entries: readonly TranslatedWord[],
      replaceAll: boolean,
      markUsed: boolean,
    ) => {
      setDraft((previous) =>
        applyToDraft(previous, from, to, entries, replaceAll, markUsed),
      );
      setBlocks((previous) => applyToBlocks(previous, to, entries, replaceAll));
      setPreviewLanguage(to);
      setTranslatedSignal((count) => count + 1);
    },
    [],
  );

  /*
    The Translate button's id for this card, kept on the draft before its first
    request so it travels through the sign-in stash and into the saved card.
    Never replaced once set.
  */
  const handleCardId = useCallback((cardId: string) => {
    setDraft((previous) =>
      previous.autoTranslation?.cardId !== undefined
        ? previous
        : {
            ...previous,
            autoTranslation: {
              translationUsed: previous.autoTranslation?.translationUsed ?? false,
              ...previous.autoTranslation,
              cardId,
            },
          },
    );
  }, []);

  const setFontPair = useCallback((fontPairId: FontPairId) => {
    setStyle((previous) => ({ ...previous, fontPairId }));
  }, []);

  /* The card as it stands, and the only place this component builds one. */
  const built = toSnapshot({
    draft,
    blocks,
    decorMotion,
    occasionId,
    language,
    rsvpEnabled,
    scratchTarget,
    pdfDownload,
    borderStyle,
    style,
    musicUrl,
    look,
    isPaid: initial.isPaid,
    templateId,
    wizard: initial.wizard,
    coverAnimation,
    showWeather,
    weatherTheme,
    qrCheckinEnabled,
  });
  const snapshot: EditorSnapshot = {
    ...built,
    config: keepStoredForm(built.config, storedForm.stored, storedForm.read),
  };
  const config: CardConfig = snapshot.config;

  /*
    What the editor was handed, and what "unchanged" is measured against.

    Built the same way as the card above, over the state the controls started
    from, so a stored card missing a field the editor now has cannot register
    as an edit nobody made.

    State rather than a memo, because it moves exactly once: a successful save
    makes what was just written the new baseline, so the guard stops guarding
    something that is now safely in the database.
  */
  const [baseline, setBaseline] = useState<EditorSnapshot>(() => ({
    ...toSnapshot(initial),
    config: keepStoredForm(storedForm.read, storedForm.stored, storedForm.read),
  }));

  /*
    Structural, not by reference. Every control here replaces state rather than
    mutating it, so re-picking the palette that was already selected builds a
    new object holding the same choices. See lib/deepEqual.ts.

    Only for a saved card. On /create the baseline is an empty card and a host
    who has typed their own name is "dirty" by the second keystroke; there is
    nothing saved to lose there, and the sign-in detour deliberately navigates
    away, so the guard would be pure friction.
  */
  const isDirty = guardUnsaved && !deepEqual(snapshot, baseline);

  /*
    The browser's own "leave site?" prompt, and the only thing here that can
    catch a closed tab or a typed URL. Registered only while there is
    something to lose, and torn down the moment there is not.
  */
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      /*
        Both halves, and neither is redundant: preventDefault is what the spec
        now asks for, `returnValue` is what older browsers still read.
      */
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  const handleSave = useCallback((): void => {
    if (isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    void onSave(snapshot)
      .then((outcome) => {
        if (!outcome.ok) {
          setIsSaving(false);
          setError(outcome.error);
          return;
        }

        /*
          Clean, as of what was just written. This is what removes the
          beforeunload handler, and it has to happen whether the route is
          navigating to the saved screen, back to this event's dashboard, or
          off to sign in. `isSaving` deliberately stays true: the page is
          leaving.
        */
        setBaseline(snapshot);
      })
      .catch((cause: unknown) => {
        console.error("[editor] save failed:", cause);
        setIsSaving(false);
        setError("Could not save your invitation, please try again.");
      });
  }, [isSaving, onSave, snapshot]);

  const motifs = getMotifs(occasionId, look.traditionId);

  /*
    After payment, what each allowance has left and whether the change on
    screen would pass: the same rules the server applies (lib/eventLock.ts).
  */
  const limitNotes: PaidLimitNotes | undefined =
    paidLimits === undefined
      ? undefined
      : (() => {
          const { baseline: paidBaseline, allowance } = paidLimits;
          const dateRefusal = dateEditRefusal(paidBaseline, draft, allowance);
          const nameRefusal = nameEditRefusal(paidBaseline, draft, allowance);

          return {
            dates: {
              left: Math.max(0, DATE_CHANGE_LIMIT - allowance.dateChangeCount),
              limit: DATE_CHANGE_LIMIT,
              error: dateRefusal === null ? null : paidEditMessage(dateRefusal),
            },
            names: {
              left: Math.max(0, NAME_CHANGE_LIMIT - allowance.nameChangeCount),
              limit: NAME_CHANGE_LIMIT,
              error: nameRefusal === null ? null : paidEditMessage(nameRefusal),
            },
          };
        })();

  /*
    The card as the preview shows it: the language being previewed, through the
    same cardInLanguage the guest's page runs over the stored card, so "this is
    what your English guests will see" is the same construction as what they
    do see. The card's own language hands back the card untouched.
  */
  const preview = cardInLanguage(draft, config, previewLanguage);

  return {
    templateId,
    applySnapshot,
    draft,
    occasionId,
    setOccasionId,
    language,
    previewLanguage,
    setPreviewLanguage,
    rsvpEnabled,
    setRsvpEnabled,
    setBorderStyle,
    scratchTarget,
    setScratchTarget,
    pdfDownload,
    setPdfDownload,
    musicUrl,
    setMusicUrl,
    coverAnimation,
    setCoverAnimation,
    showWeather,
    setShowWeather,
    weatherTheme,
    setWeatherTheme,
    previewWeather,
    qrCheckinEnabled,
    setQrCheckinEnabled,
    style,
    setStyle,
    openSubEventId,
    setOpenSubEventId,
    blocks,
    setBlocks,
    isSaving,
    error,
    handleChange,
    handleOccasionSelect,
    handleLanguageSelect,
    handleDraftWord,
    handleSubEventWord,
    handleSectionWord,
    translatedSignal,
    handleTranslated,
    handleCardId,
    setFontPair,
    snapshot,
    isDirty,
    handleSave,
    motifs,
    limitNotes,
    preview,
  };
}
