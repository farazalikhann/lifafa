/**
 * The editor: everything the details and customize steps draw, as one chunk.
 *
 * Not part of the gallery's download. Wizard.tsx fetches it when a design
 * opens: a template chosen, Next pressed, or an address that already names a
 * later step. See loadEditorSteps there.
 */
export { default as AutoTranslate } from "@/components/create/AutoTranslate";
export { default as ContactEditor } from "@/components/create/ContactEditor";
export { default as EventForm } from "@/components/create/EventForm";
export { default as LanguagePicker } from "@/components/create/LanguagePicker";
export { default as SubEventEditor } from "@/components/create/SubEventEditor";
export { default as TranslationPanel } from "@/components/create/TranslationPanel";
export { default as CustomizeStep } from "@/components/wizard/CustomizeStep";
export { EventBasics } from "@/components/create/EventForm";
