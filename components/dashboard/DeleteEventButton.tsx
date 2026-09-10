"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import DeleteEventDialog from "@/components/dashboard/DeleteEventDialog";
import { deleteEvent } from "@/lib/db/events";

/**
 * Delete, on one row of the host's list of invitations.
 *
 * A host could make invitations and never get rid of one. A card started by
 * mistake, a date that was cancelled, a duplicate made while working out how
 * the editor behaves — all of them stayed on the list forever, and a list a
 * host cannot tidy stops being something they read. This is the way out.
 *
 * A CLIENT COMPONENT INSIDE A SERVER-RENDERED ROW. The list page is a server
 * component and stays one; only this control needs state, so only this control
 * crosses. deleteEvent is a server action, so the statement still runs on the
 * server under the host's cookie and RLS still decides whose row it is — see
 * the note over deleteEvent for why it is scoped twice regardless.
 *
 * IT ALWAYS ASKS FIRST. There is no undo behind this, and the cascade takes the
 * guest list with the event, so the dialog is not a formality: it is the only
 * place a host is told what they are about to lose. See DeleteEventDialog.
 *
 * A SUCCESSFUL DELETE REFRESHES rather than hiding the row locally. The tally
 * in the heading above, the empty state, and the list itself are all rendered
 * on the server from the same read; dropping the row here would leave a page
 * saying "13 invitations" over twelve of them.
 */
export default function DeleteEventButton({
  eventId,
  heading,
  replyCount,
}: {
  eventId: string;
  /** What the row calls this invitation. Repeated in the dialog and the label. */
  heading: string;
  replyCount: number;
}): ReactElement {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (): Promise<void> => {
    setIsDeleting(true);
    setError(null);

    const result = await deleteEvent(eventId);

    if (!result.ok) {
      setIsDeleting(false);
      setError(result.error);
      return;
    }

    /*
      The dialog closes before the refresh, not after it. refresh() is a
      re-render of the page this row lives on and it is not instant; leaving the
      dialog up until the new list arrives would hold a modal over a delete that
      has already happened, and the host would be looking at a confirmation for
      a thing they can no longer change their mind about.

      isDeleting stays true. This component is about to be unmounted by the very
      refresh it just asked for, and turning the button back on in the meantime
      would offer a second delete of a row that is already gone.
    */
    setIsOpen(false);
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        /*
          Labelled with the invitation's own name rather than left as a bare
          "Delete", for the same reason the Edit link beside it is: a screen
          reader user moving through this list by control would otherwise hear
          the same word once per row with nothing to tell them apart. The
          visible text stays short, because the row it sits on has already said
          which invitation this is.
        */
        aria-label={`Delete ${heading}`}
        className="flex min-h-11 items-center rounded px-2 text-[0.8125rem] font-medium text-[var(--lifafa-muted)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-[var(--lifafa-rose)] hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-rose)]"
      >
        Delete
      </button>

      {isOpen ? (
        <DeleteEventDialog
          heading={heading}
          replyCount={replyCount}
          isDeleting={isDeleting}
          error={error}
          onCancel={() => setIsOpen(false)}
          onConfirm={() => void handleConfirm()}
        />
      ) : null}
    </>
  );
}
