import { redirect } from "next/navigation";

/**
 * Where the wizard was built, before it took /create's place.
 *
 * Kept only as a way on: anything that still has this address (a bookmark, a
 * tab left open on the saved card, a sign-in on its way back here) is sent to
 * /create with its query as it came, so the step, the saved event and the
 * address a stashed card was made on all arrive with it.
 */
export default async function OldWizardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<never> {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(await searchParams)) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry !== undefined) {
        query.append(key, entry);
      }
    }
  }

  const search = query.toString();

  redirect(search.length > 0 ? `/create?${search}` : "/create");
}
