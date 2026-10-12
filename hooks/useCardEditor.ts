"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaidLimitNotes } from "@/components/create/EventForm";
import type { ScratchSection } from "@/components/create/RevealPanel";
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
import { withOneCalligraphy, withoutRetiredCalligraphy } from "@/lib/calligraphy";
import { getTraditionPack } from "@/lib/traditionPacks";
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
import { DEFAULT_ORNAMENT_CONFIG } from "@/lib/ornaments/muslim";
import {
  getTextPair,
  paletteTextColors,
  withCustomInk,
  withPalette,
  withTextPair,
  type TextPairId,
} from "@/lib/textColors";
import { getOccasion } from "@/lib/occasions";
import { CLASSIC_TEMPLATE_ID, getTemplate } from "@/templates/registry";
import type { DesignState } from "@/lib/designDefaults";
import { applyPreset, type Preset } from "@/lib/presets";
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
import type { CardDensity, CardStyle, FontPairId, PaletteId } from "@/types/style";
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
 * updateEvent, and back out of the row when a host reopens the editor.
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
 * `ok` means the page is on its way somewhere else — the new dashboard, the
 * event's dashboard, or the sign-in page — so the button stays busy rather than
 * flicking back to its resting label under a host who has already left. The
 * failure carries a sentence written for a host; the editor shows it and does
 * nothing else with it.
 */
export type SaveOutcome = { ok: true } | { ok: false; error: string };

/**
 * Every value the editor holds, flat, in one object.
 *
 * The point of naming this shape is the pair of functions under it. A snapshot
 * out of the database and a snapshot the editor has just built have to be
 * comparable — that is what tells a host with unsaved work apart from one who
 * has changed nothing — and the only way to be sure they are is to put both of
 * them through the same construction. Everything here is state; `isPaid` is the
 * exception and is carried rather than edited.
 */
interface EditorState {
  draft: EventDraft;
  blocks: readonly CardBlock[];
  decorMotion: DecorMotion;
  decorIntensity: DecorIntensity;
  butterflies: ButterflyStyle;
  leaves: boolean;
  flying: FlyingKind;
  nature: NatureKind;
  petals: PetalStyle;
  petalFlower: PetalFlower;
  occasionId: OccasionId;
  traditionId: TraditionId;
  language: CardLanguage;
  rsvpEnabled: boolean;
  scratchTarget: ScratchTarget;
  scratchFrame: ScratchFrame;
  /** The date's reveal once the host or a preset has chosen one; undefined on a card that never has. */
  dateReveal: DateReveal | undefined;
  /** Whether "Meet the Couple" carries its figures. On unless the host turned it off. */
  coupleIllustration: boolean;
  invitedHeading: boolean;
  /** The painting above the venue's name. None unless the host picked one. */
  venueIllustration: VenueIllustration;
  /** The painted scene after the first screen. The palace garden unless the host picked another or turned it off. */
  scene: Scene;
  /** Whether the damask is woven into the card's ground. */
  royalTexture: boolean;
  royalTexturePattern: RoyalTexturePattern;
  /** The frame the names are set in. The lotus ring unless the host picked another. */
  namesFrame: NamesFrame;
  /** Whether a guest may keep the card as a PDF. On unless the host turned it off. */
  pdfDownload: boolean;
  /** The host's own choice of divider, or undefined while the tradition's default stands. */
  divider: DividerStyle | undefined;
  borderStyle: CardBorderStyle;
  style: CardStyle;
  ornamentConfig: OrnamentConfig;
  musicUrl: string | null;
  isPaid: boolean;
  /** The card's template. Carried like `isPaid`: nothing in this editor changes it. */
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
 * than at undefined — otherwise the very first comparison against the stored
 * card finds a difference that no host made and offers to discard it.
 */
function toState(snapshot: EditorSnapshot): EditorState {
  const { config } = snapshot;

  return {
    draft: snapshot.draft,
    blocks: config.blocks,
    decorMotion: config.decorMotion,
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
    occasionId: config.occasionId,
    traditionId: config.traditionId,
    /*
      Both missing from a card stashed by an older build, which toStoredEvent
      never sees — so they are resolved again here, to English and to on, the
      same answers a stored card gets.
    */
    language: cardLanguage(config.language),
    rsvpEnabled: readRsvpEnabled(config.rsvpEnabled),
    scratchTarget: config.scratchTarget,
    /* Both absent from a card saved before they existed; see lib/cardDecor.ts. */
    scratchFrame: scratchFrameOf(config.scratchFrame),
    /* Kept as stored, absent included, so opening an older card is not an edit to it. */
    dateReveal: config.dateReveal,
    coupleIllustration: coupleIllustrationOn(config.coupleIllustration),
    invitedHeading: invitedHeadingOn(config.invitedHeading),
    /* Missing on every card saved before the choice; those have none. */
    venueIllustration: venueIllustrationOf(config.venueIllustration),
    /* Missing on every card saved before there were scenes: the palace garden. */
    scene: sceneOf(config.scene),
    /* Missing on every card saved before the texture; those have none. */
    royalTexture: royalTextureOn(config.royalTexture),
    /* Missing on every card saved before there was a choice: the damask. */
    royalTexturePattern: royalTexturePatternOf(config.royalTexturePattern),
    /* Missing on every card saved before there was a choice: the lotus ring. */
    namesFrame: namesFrameOf(config.namesFrame),
    /* Missing on every card saved before the switch; those offer the copy. */
    pdfDownload: pdfDownloadOn(config.pdfDownload),
    divider: hasChosenDivider(config.divider) ? config.divider : undefined,
    borderStyle: config.borderStyle,
    style: config.style,
    /*
      A retired calligraphy id is shown as its replacement, and a card saved
      with several pieces keeps only the one added last; both are saved that way
      on the next save — see withoutRetiredCalligraphy and withOneCalligraphy.
    */
    ornamentConfig: {
      ...config.ornamentConfig,
      enabledOrnaments: withOneCalligraphy(
        withoutRetiredCalligraphy(config.ornamentConfig.enabledOrnaments),
        getTraditionPack(config.traditionId)?.calligraphyIds ?? [],
      ),
    },
    /* Null on every card saved before this field existed. */
    musicUrl: config.musicUrl ?? null,
    /*
      Carried, never edited.

      /create starts it false, because nothing in an unsaved editor has been
      paid for — that is what /create is. An edit carries whatever the row says,
      so a host who has paid does not have the fact quietly written out of their
      card's JSON by fixing a typo. The column is what a payment writes to and
      toStoredEvent lets it win over this copy on the way out either way, but a
      stored config that contradicts its own row is a lie waiting for a reader
      that trusts it.
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
      decorIntensity: state.decorIntensity,
      butterflies: state.butterflies,
      leaves: state.leaves,
      flying: state.flying,
      nature: state.nature,
      petals: state.petals,
      petalFlower: state.petalFlower,
      occasionId: state.occasionId,
      traditionId: state.traditionId,
      language: state.language,
      rsvpEnabled: state.rsvpEnabled,
      scratchTarget: state.scratchTarget,
      scratchFrame: state.scratchFrame,
      /* Left off the card until somebody chooses, so an older card keeps what it has always shown. */
      ...(state.dateReveal !== undefined ? { dateReveal: state.dateReveal } : null),
      /* Only ever stored as off: a card that never had the key shows its figures. */
      ...(state.coupleIllustration ? null : { coupleIllustration: false }),
      /* The same: only a host who turned the heading off has anything stored. */
      ...(state.invitedHeading ? null : { invitedHeading: false }),
      /* Left off the card while there is none, so an older card is stored as it was. */
      ...(state.venueIllustration !== "none"
        ? { venueIllustration: state.venueIllustration }
        : null),
      /* Only ever stored when it is not the floral arch, so an older card is stored as it was. */
      ...(state.scene !== DEFAULT_SCENE ? { scene: state.scene } : null),
      /* Only ever stored as on: a card that never had the key has no texture. */
      ...(state.royalTexture ? { royalTexture: true } : null),
      /* Only ever stored when it is not the damask, and kept while the texture is off. */
      ...(state.royalTexturePattern !== "damask"
        ? { royalTexturePattern: state.royalTexturePattern }
        : null),
      /* Only ever stored when it is not the lotus ring, so an older card is stored as it was. */
      ...(state.namesFrame !== "lotus" ? { namesFrame: state.namesFrame } : null),
      /* Only ever stored as off: a card that never had the key offers the copy. */
      ...(state.pdfDownload ? null : { pdfDownload: false }),
      /* Left off the card until the host chooses, so the tradition's default goes on applying. */
      ...(state.divider !== undefined ? { divider: state.divider } : null),
      borderStyle: state.borderStyle,
      style: state.style,
      ornamentConfig: state.ornamentConfig,
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
 * The state of a card being made or changed: every value, every handler that
 * writes one, the card as it stands, the dirty check and the save.
 *
 * Lifted out of CardEditor so the tabbed editor and the wizard at
 * /create/wizard hold a card the same way: one construction of the snapshot,
 * one dirty check, one save. Nothing here draws anything or knows which of
 * the two is on screen.
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
  /** After payment: see CardEditor. */
  paidLimits?: { baseline: EventDraft; allowance: ChangeAllowance };
}) {
  /*
    What this route handed over, unpacked. Cheap enough to rebuild on every
    render and only ever read on the first: it seeds the state below and the
    baseline the dirty check measures against.
  */
  const initial = toState(start);

  const [draft, setDraft] = useState<EventDraft>(initial.draft);
  const [occasionId, setOccasionId] = useState<OccasionId>(initial.occasionId);
  const [traditionId, setTraditionId] = useState<TraditionId>(
    initial.traditionId,
  );
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
  /* On unless the host turns it off; see ReplyFormPanel. */
  const [rsvpEnabled, setRsvpEnabled] = useState<boolean>(initial.rsvpEnabled);
  const [decorMotion, setDecorMotion] = useState(initial.decorMotion);
  const [decorIntensity, setDecorIntensity] = useState<DecorIntensity>(
    initial.decorIntensity,
  );
  const [butterflies, setButterflies] = useState(initial.butterflies);
  const [leaves, setLeaves] = useState(initial.leaves);
  /* The kinds stay in the card while their switches are off, as the flower does. */
  const [flying, setFlying] = useState(initial.flying);
  const [nature, setNature] = useState(initial.nature);
  const [petals, setPetals] = useState(initial.petals);
  const [petalFlower, setPetalFlower] = useState(initial.petalFlower);
  /*
    What the Butterflies and Flower petals switches turn back on to: the last
    colour and the last mode the card had, however it got them — a chip, a
    preset or the saved card. Mixed and Both before there was one. Display
    memory only, never saved; kept here rather than in MotionPicker because
    that unmounts with the Design tab. Updated while rendering, React's
    pattern for state that follows other state, so it is never a frame behind.
  */
  const [lastButterflies, setLastButterflies] = useState<
    Exclude<ButterflyStyle, "none">
  >(initial.butterflies === "none" ? "mixed" : initial.butterflies);
  const [lastPetals, setLastPetals] = useState<Exclude<PetalStyle, "none">>(
    initial.petals === "none" ? "both" : initial.petals,
  );
  if (butterflies !== "none" && butterflies !== lastButterflies) {
    setLastButterflies(butterflies);
  }
  if (petals !== "none" && petals !== lastPetals) {
    setLastPetals(petals);
  }
  const [borderStyle, setBorderStyle] = useState(initial.borderStyle);
  const [scratchTarget, setScratchTarget] = useState(initial.scratchTarget);
  const [scratchFrame, setScratchFrame] = useState(initial.scratchFrame);
  const [dateReveal, setDateReveal] = useState(initial.dateReveal);
  const [coupleIllustration, setCoupleIllustration] = useState(
    initial.coupleIllustration,
  );
  const [invitedHeading, setInvitedHeading] = useState(initial.invitedHeading);
  const [venueIllustration, setVenueIllustration] = useState(
    initial.venueIllustration,
  );
  const [scene, setScene] = useState(initial.scene);
  const [royalTexture, setRoyalTexture] = useState(initial.royalTexture);
  const [royalTexturePattern, setRoyalTexturePattern] = useState(
    initial.royalTexturePattern,
  );
  const [namesFrame, setNamesFrame] = useState(initial.namesFrame);
  const [pdfDownload, setPdfDownload] = useState(initial.pdfDownload);

  /*
    THE DATE'S REVEAL, AND THE ONLY PLACE IT IS SET. The royal scroll and the
    scratch panel are both chosen here, and choosing either takes the other
    off the date: the scroll or the plain date clears a scratch panel that
    was over the date, and only one that was over the date; one over the venue
    or the countdown is the section below's, and is left exactly as it is.
    Scratch puts the card's one panel on the date. Tear is the card's one
    interactive panel too, so it takes the scratch panel off whichever
    section had it.
  */
  const handleDateReveal = useCallback(
    (next: DateReveal) => {
      setDateReveal(next);

      if (next === "scratch") {
        setScratchTarget("date");
      } else if (next === "tear" || scratchTarget === "date") {
        setScratchTarget("none");
      }
    },
    [scratchTarget],
  );

  /*
    "Scratch to reveal": the panel over the venue or the countdown, or off.
    It sets that and nothing else. It cannot put the panel on the date, which
    is not among its options, and it never touches the date's reveal: a royal
    scroll on the date and a scratch panel on the venue are two choices in two
    sections, and changing one leaves the other alone. While the date has the
    panel this section is switched off, so it is never asked to take it away.
  */
  const handleScratchSection = useCallback((next: ScratchSection) => {
    setScratchTarget(next);
  }, []);

  /* The way out the switched-off section offers: the date shown plainly, the panel free. */
  const handleShowDateSimply = useCallback(() => {
    handleDateReveal("simple");
  }, [handleDateReveal]);
  const [divider, setDivider] = useState(initial.divider);
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
  /* Its own column as well; see 0005. Only the switch exists so far. */
  const [qrCheckinEnabled, setQrCheckinEnabled] = useState(
    initial.qrCheckinEnabled,
  );
  /*
    The current tradition's ornament pack choices. Kept here rather than inside
    the panel, because the panel unmounts the moment the host leaves a tradition
    that has a pack, and state that unmounts with its editor would quietly
    survive on the card.
  */
  const [ornamentConfig, setOrnamentConfig] = useState<OrnamentConfig>(
    initial.ornamentConfig,
  );
  const [style, setStyle] = useState<CardStyle>(initial.style);

  /*
    Which function in the timeline has its fields open, and the counter that
    names a new custom section.

    Both were local to their own editor until those editors started unmounting
    every time the host switched tab. The open row would have collapsed under
    them; the counter would have restarted at 1 and minted an id a section in
    the list already had. See the props on SubEventEditor and SectionManager.
  */
  const [openSubEventId, setOpenSubEventId] = useState<string | null>(null);
  const nextCustomId = useRef<number>(1);

  const [blocks, setBlocks] = useState<readonly CardBlock[]>(initial.blocks);
  /*
    The card's template. Nothing in the tabbed editor changes it; the wizard's
    gallery does, through `applySnapshot` below.
  */
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
    setTraditionId(state.traditionId);
    setLanguage(state.language);
    setRsvpEnabled(state.rsvpEnabled);
    setDecorMotion(state.decorMotion);
    setDecorIntensity(state.decorIntensity);
    setButterflies(state.butterflies);
    setLeaves(state.leaves);
    setFlying(state.flying);
    setNature(state.nature);
    setPetals(state.petals);
    setPetalFlower(state.petalFlower);
    setBorderStyle(state.borderStyle);
    setScratchTarget(state.scratchTarget);
    setScratchFrame(state.scratchFrame);
    setDateReveal(state.dateReveal);
    setCoupleIllustration(state.coupleIllustration);
    setInvitedHeading(state.invitedHeading);
    setVenueIllustration(state.venueIllustration);
    setScene(state.scene);
    setRoyalTexture(state.royalTexture);
    setRoyalTexturePattern(state.royalTexturePattern);
    setNamesFrame(state.namesFrame);
    setPdfDownload(state.pdfDownload);
    setDivider(state.divider);
    setMusicUrl(state.musicUrl);
    setCoverAnimation(state.coverAnimation);
    setShowWeather(state.showWeather);
    setWeatherTheme(state.weatherTheme);
    setQrCheckinEnabled(state.qrCheckinEnabled);
    setOrnamentConfig(state.ornamentConfig);
    setStyle(state.style);
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * The next unused `custom-n`.
   *
   * The skip loop is not belt and braces. A card that arrives already holding
   * custom-1 and custom-2 — restored from the sign-in stash, or loaded out of a
   * saved event — leaves this counter at 1 while those ids exist, so it is
   * stepped past anything the list already holds rather than trusted blind.
   */
  const mintCustomId = useCallback((): string => {
    let id = "";

    do {
      id = `custom-${nextCustomId.current}`;
      nextCustomId.current += 1;
    } while (
      blocks.some((block) => block.kind === "custom" && block.section.id === id)
    );

    return id;
  }, [blocks]);

  const handleChange = useCallback<
    <K extends keyof EventDraft>(field: K, value: EventDraft[K]) => void
  >((field, value) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
  }, []);

  /**
   * An occasion click is the only thing that overwrites the theme and motion.
   * Every other render leaves them alone, so a host who picks a theme after
   * choosing an occasion keeps their choice — and a host who opens a saved card
   * and never touches the occasion keeps everything they chose last time.
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
    of the tab opens on them. See `revealSignal` in TranslationPanel.
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

  /**
   * A tradition click is the one thing that can clear the ornament pack.
   *
   * EVERY tradition click resets it, including a click that lands on another
   * tradition with a pack of its own. That is what stops a selection crossing
   * between packs: a host who picks Bismillah under Muslim and then chooses
   * Hindu gets an empty Hindu panel, not a greeting id from the wrong content
   * file sitting in the slot. It also covers leaving a pack entirely — a host
   * who tries the lanterns, changes their mind, and never opens that panel
   * again would otherwise ship a Sikh or a Christian card with a lantern
   * hanging off it and no control anywhere on the page that could switch it
   * off. Arriving at a pack resets it too, so a pack always opens from a known
   * state.
   */
  const handleTraditionSelect = useCallback((id: TraditionId) => {
    setTraditionId(id);
    setOrnamentConfig(DEFAULT_ORNAMENT_CONFIG);
  }, []);

  const setFontPair = useCallback((fontPairId: FontPairId) => {
    setStyle((previous) => ({ ...previous, fontPairId }));
  }, []);

  /*
    A palette brings the nearest text pair with it, unless the host chose
    their own inks and they still read on the new card colour. See withPalette.
  */
  const setPalette = useCallback((paletteId: PaletteId) => {
    setStyle((previous) => withPalette(previous, paletteId));
  }, []);

  /* A text pair: its two inks, on the card colour as it is. Nothing else changes. */
  const setTextPair = useCallback((pairId: TextPairId) => {
    setStyle((previous) => withTextPair(previous, getTextPair(pairId)));
  }, []);

  /* One ink, picked by hand from the curated set. */
  const setCustomInk = useCallback(
    (role: "primary" | "secondary", ink: string) => {
      setStyle((previous) => withCustomInk(previous, role, ink));
    },
    [],
  );

  const setDensity = useCallback((density: CardDensity) => {
    setStyle((previous) => ({ ...previous, density }));
  }, []);

  const setAccent = useCallback((accentOverride: string | null) => {
    setStyle((previous) => ({ ...previous, accentOverride }));
  }, []);

  /*
    The design values, gathered for the presets. A preset reads this and hands
    back the next one; nothing outside it — the draft, the sections, the
    replies — is in reach.
  */
  const design: DesignState = {
    style,
    borderStyle,
    decorMotion,
    decorIntensity,
    butterflies,
    leaves,
    flying,
    nature,
    petals,
    petalFlower,
    coverAnimation,
    traditionId,
    ornamentConfig,
    ...(dateReveal !== undefined ? { dateReveal } : null),
    ...(royalTexture ? { royalTexture: true as const } : null),
    ...(royalTexturePattern !== "damask" ? { royalTexturePattern } : null),
    ...(namesFrame !== "lotus" ? { namesFrame } : null),
  };

  /**
   * A preset click: every design value it names, set at once.
   *
   * Through the same setters the controls use, so a preset leaves the card in
   * a state a host could have reached by hand. applyPreset keeps the rule
   * handleTraditionSelect keeps — a new tradition starts its pack empty.
   */
  const handleApplyPreset = (preset: Preset): void => {
    const next = applyPreset(design, preset);

    setStyle(next.style);
    setBorderStyle(next.borderStyle);
    setDecorMotion(next.decorMotion);
    setDecorIntensity(next.decorIntensity);
    setButterflies(next.butterflies);
    setLeaves(next.leaves);
    setFlying(next.flying);
    setNature(next.nature);
    setPetals(next.petals);
    setPetalFlower(next.petalFlower);
    setCoverAnimation(next.coverAnimation);
    setTraditionId(next.traditionId);
    setOrnamentConfig(next.ornamentConfig);
    /*
      A look whose date unrolls on the scroll takes a scratch panel off that
      date, and only off the date: one over the venue or the countdown stays.
    */
    setDateReveal(next.dateReveal);
    if (next.dateReveal === "scroll" && scratchTarget === "date") {
      setScratchTarget("none");
    }
    /* Only ever turned on by a look: one that does not name it leaves it as it was. */
    if (next.royalTexture === true) {
      setRoyalTexture(true);
    }
    /* A look that asks for the texture asks for the damask; see applyPreset. */
    setRoyalTexturePattern(next.royalTexturePattern ?? "damask");
    /* The look's frame for the names, or the lotus ring; see applyPreset. */
    setNamesFrame(next.namesFrame ?? "lotus");
  };

  /* The card as it stands, and the only place this component builds one. */
  const snapshot = toSnapshot({
    draft,
    blocks,
    decorMotion,
    decorIntensity,
    butterflies,
    leaves,
    flying,
    nature,
    petals,
    petalFlower,
    occasionId,
    traditionId,
    language,
    rsvpEnabled,
    scratchTarget,
    scratchFrame,
    dateReveal,
    coupleIllustration,
    invitedHeading,
    venueIllustration,
    scene,
    royalTexture,
    royalTexturePattern,
    namesFrame,
    pdfDownload,
    divider,
    borderStyle,
    style,
    ornamentConfig,
    musicUrl,
    isPaid: initial.isPaid,
    templateId,
    wizard: initial.wizard,
    coverAnimation,
    showWeather,
    weatherTheme,
    qrCheckinEnabled,
  });
  const config: CardConfig = snapshot.config;

  /*
    What the editor was handed, and what "unchanged" is measured against.

    Built by toSnapshot over the same unpacked state the controls started from,
    rather than from the props directly, so the two sides of the comparison
    below are the same construction over the same values. A stored card missing
    a field the editor now has cannot register as an edit nobody made.

    State rather than a memo, because it moves exactly once: a successful save
    makes what was just written the new baseline, so the guard stops guarding
    something that is now safely in the database. A card recovered from the
    sign-in stash does not move it: /create hands that card over as the initial
    one, so it is the baseline from the first render.
  */
  const [baseline, setBaseline] = useState<EditorSnapshot>(() =>
    toSnapshot(initial),
  );

  /*
    Structural, not by reference. Every control here replaces state rather than
    mutating it, so re-picking the palette that was already selected builds a
    new object holding the same choices — and a dirty check that counted that
    would put a "discard your changes?" prompt in front of a host who changed
    nothing. See lib/deepEqual.ts.

    Only in edit mode. On /create the baseline is an empty card and a host who
    has typed their own name is "dirty" by the second keystroke; there is
    nothing saved to lose there, no Cancel, and the sign-in detour deliberately
    navigates away, so the guard would be pure friction on the commonest path
    this editor has.
  */
  const isDirty = guardUnsaved && !deepEqual(snapshot, baseline);

  /*
    The browser's own "leave site?" prompt, and the only thing here that can
    catch a closed tab or a typed URL.

    Registered only while there is something to lose and torn down the moment
    there is not — which covers the save, because a successful one moves the
    baseline and clears `isDirty` — and on unmount, by the cleanup. A handler
    left behind would prompt a host who had already saved.
  */
  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
      /*
        Both halves, and neither is redundant: preventDefault is what the spec
        now asks for, `returnValue` is what older browsers still read. Whatever
        string is assigned, every current browser shows its own wording.
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
          navigating to a new dashboard, back to this event's, or off to sign in.
          `isSaving` deliberately stays true: the page is leaving.
        */
        setBaseline(snapshot);
      })
      .catch((cause: unknown) => {
        console.error("[editor] save failed:", cause);
        setIsSaving(false);
        setError("Could not save your invitation, please try again.");
      });
  }, [isSaving, onSave, snapshot]);

  const motifs = getMotifs(occasionId, traditionId);

  /*
    After payment, what each allowance has left and whether the change on
    screen would pass: the same rules the server applies (lib/eventLock.ts).
  */
  const limitNotes: PaidLimitNotes | undefined =
    paidLimits === undefined
      ? undefined
      : (() => {
          const { baseline, allowance } = paidLimits;
          const dateRefusal = dateEditRefusal(baseline, draft, allowance);
          const nameRefusal = nameEditRefusal(baseline, draft, allowance);

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
    setDraft,
    occasionId,
    setOccasionId,
    traditionId,
    setTraditionId,
    language,
    setLanguage,
    previewLanguage,
    setPreviewLanguage,
    rsvpEnabled,
    setRsvpEnabled,
    decorMotion,
    setDecorMotion,
    decorIntensity,
    setDecorIntensity,
    butterflies,
    setButterflies,
    leaves,
    setLeaves,
    flying,
    setFlying,
    nature,
    setNature,
    petals,
    setPetals,
    petalFlower,
    setPetalFlower,
    lastButterflies,
    setLastButterflies,
    lastPetals,
    setLastPetals,
    borderStyle,
    setBorderStyle,
    scratchTarget,
    setScratchTarget,
    scratchFrame,
    setScratchFrame,
    dateReveal,
    setDateReveal,
    coupleIllustration,
    setCoupleIllustration,
    invitedHeading,
    setInvitedHeading,
    venueIllustration,
    setVenueIllustration,
    scene,
    setScene,
    royalTexture,
    setRoyalTexture,
    royalTexturePattern,
    setRoyalTexturePattern,
    namesFrame,
    setNamesFrame,
    pdfDownload,
    setPdfDownload,
    handleDateReveal,
    handleScratchSection,
    handleShowDateSimply,
    divider,
    setDivider,
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
    ornamentConfig,
    setOrnamentConfig,
    style,
    setStyle,
    openSubEventId,
    setOpenSubEventId,
    blocks,
    setBlocks,
    isSaving,
    setIsSaving,
    error,
    setError,
    mintCustomId,
    handleChange,
    handleOccasionSelect,
    handleLanguageSelect,
    handleDraftWord,
    handleSubEventWord,
    handleSectionWord,
    translatedSignal,
    setTranslatedSignal,
    handleTranslated,
    handleCardId,
    handleTraditionSelect,
    setFontPair,
    setPalette,
    setTextPair,
    setCustomInk,
    setDensity,
    setAccent,
    design,
    handleApplyPreset,
    snapshot,
    config,
    baseline,
    setBaseline,
    isDirty,
    handleSave,
    motifs,
    limitNotes,
    preview,
  };
}
