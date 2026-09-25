"use server";

import { revalidatePath } from "next/cache";
import { adminSession } from "@/lib/admin/auth";
import type { CouponFormState } from "@/lib/admin/couponForm";
import { generateCouponCode } from "@/lib/coupons/generate";
import { isPossibleCouponCode, normaliseCouponCode } from "@/lib/coupons/lookup";
import { isFreeDiscount } from "@/lib/coupons/quote";
import { INVITATION_PRICE_PAISE } from "@/lib/razorpay/pricing";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CouponInsert, CouponType } from "@/types/database";

/**
 * Creating and deactivating codes.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * EVERY ACTION IN THIS FILE CHECKS THE ADMIN SESSION ITSELF, FIRST.
 *
 * middleware.ts already refuses an unauthenticated request for /admin, and a
 * server action posts to the page it was rendered on, so in normal operation
 * the gate has run. That is not enough to rely on here. A server action is an
 * endpoint with a stable id: anyone who learns the id can POST to it directly,
 * and the only thing deciding whether that POST writes a coupon row is the
 * check at the top of the function. The middleware matcher is a regex in a file
 * somebody will edit one day; these calls are not.
 *
 * `adminSession()` rather than `requireAdminSession()`, because a redirect is
 * the wrong answer to a forged POST. These return a refusal the form can show,
 * and say nothing about what is behind the gate.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** What an unauthenticated caller is told, whatever they were trying to do. */
const NOT_SIGNED_IN = "Your session has expired. Sign in again.";

/** How many times a colliding generated code is worth re-rolling. */
const CODE_ATTEMPTS = 5;

/** Postgres unique-violation, raised here by coupons_code_key. */
const UNIQUE_VIOLATION = "23505";

/**
 * A required text field, trimmed, or null.
 *
 * `FormData.get` returns `FormDataEntryValue | null` — a string or a File — so
 * the type test is not ceremony: a multipart request can put a file where a
 * text input was, and `String(file)` would cheerfully produce "[object File]".
 */
function field(formData: FormData, name: string): string | null {
  const value = formData.get(name);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

/**
 * A whole number from a form field, or null when absent.
 *
 * `undefined` means "the field was not filled in", which for max_uses and
 * commission is a legitimate answer meaning unlimited and none. A value that is
 * present and unparseable is a mistake and comes back as NaN so the caller can
 * refuse it — quietly treating "abc" as "unlimited" would create a coupon whose
 * terms are not the ones anybody typed.
 */
function integerField(formData: FormData, name: string): number | null {
  const raw = field(formData, name);

  if (raw === null) {
    return null;
  }

  return Number.parseInt(raw, 10);
}

export async function createCoupon(
  _previous: CouponFormState,
  formData: FormData,
): Promise<CouponFormState> {
  const session = await adminSession();

  if (session === null) {
    return { error: NOT_SIGNED_IN, created: null };
  }

  const type = formData.get("type");
  const discountType = formData.get("discountType");

  if (type !== "discount" && type !== "affiliate") {
    return { error: "Choose a coupon type.", created: null };
  }

  if (discountType !== "percent" && discountType !== "flat") {
    return { error: "Choose a discount type.", created: null };
  }

  /*
    Rupees in the form, paise in the database. The conversion happens once,
    here, at the boundary — the same rule lib/razorpay/pricing.ts states. An
    admin typing 200 means ₹200 and would be baffled to create a ₹2 coupon.
  */
  const rawValue = integerField(formData, "discountValue");

  if (rawValue === null || !Number.isFinite(rawValue) || rawValue <= 0) {
    return {
      error:
        discountType === "percent"
          ? "Enter a discount percentage above zero."
          : "Enter a discount amount in rupees above zero.",
      created: null,
    };
  }

  if (discountType === "percent" && rawValue > 100) {
    return { error: "A percentage discount cannot be above 100.", created: null };
  }

  const discountValue =
    discountType === "percent" ? rawValue : rawValue * 100;

  const maxUses = integerField(formData, "maxUses");

  if (maxUses !== null && (!Number.isFinite(maxUses) || maxUses <= 0)) {
    return {
      error: "Leave the usage limit blank for unlimited, or enter a number above zero.",
      created: null,
    };
  }

  /*
    A code that makes the invitation free must have a usage limit: an unlimited
    one is free invitations for anyone it is passed to. 0014 refuses a 100% code
    with no limit, and redeem_free_coupon never honours a free code without one
    (a flat code's worth depends on the price, which the database does not know).
  */
  if (
    maxUses === null &&
    isFreeDiscount(discountType, discountValue, INVITATION_PRICE_PAISE)
  ) {
    return {
      error:
        "A code that makes the invitation free needs a usage limit. Enter how many times it can be used.",
      created: null,
    };
  }

  const commissionRupees = integerField(formData, "commissionPerSale");

  if (
    commissionRupees !== null &&
    (!Number.isFinite(commissionRupees) || commissionRupees < 0)
  ) {
    return { error: "Enter a commission in rupees, or leave it blank.", created: null };
  }

  const ownerName = field(formData, "ownerName");

  /*
    Checked here as well as by the coupons_affiliate_has_owner constraint. The
    database is what guarantees it; this is what turns a constraint violation
    into a sentence the admin can act on.
  */
  if (type === "affiliate" && ownerName === null) {
    return {
      error: "An affiliate code needs an owner name.",
      created: null,
    };
  }

  const expiresAtRaw = field(formData, "expiresAt");
  let expiresAt: string | null = null;

  if (expiresAtRaw !== null) {
    /*
      A <input type="date"> sends "2026-12-31", which Date parses as UTC
      midnight. Taken as the END of that day in IST, which is what "expires on
      the 31st" means to the person typing it — otherwise a code dies at 5:30am
      on the morning it was meant to last through.
    */
    const parsed = new Date(`${expiresAtRaw}T23:59:59+05:30`);

    if (Number.isNaN(parsed.getTime())) {
      return { error: "That expiry date could not be read.", created: null };
    }

    expiresAt = parsed.toISOString();
  }

  const typedCode = field(formData, "code");
  let code: string | null = null;

  if (typedCode !== null) {
    code = normaliseCouponCode(typedCode);

    if (!isPossibleCouponCode(code)) {
      return {
        error:
          "A code must be 4 to 32 characters, using letters, numbers and hyphens only.",
        created: null,
      };
    }
  }

  const base: Omit<CouponInsert, "code"> = {
    type: type as CouponType,
    discount_type: discountType,
    discount_value: discountValue,
    max_uses: maxUses,
    expires_at: expiresAt,
    owner_name: ownerName,
    commission_per_sale:
      commissionRupees === null ? null : commissionRupees * 100,
  };

  const admin = createAdminClient();

  /*
    A typed code is tried once — a collision there is the admin being told the
    code already exists, which is the useful answer. A generated one is
    re-rolled, exactly as createEvent re-rolls an invite code: the unique
    constraint is what decides, and reasoning about the odds is a worse answer
    than letting it.
  */
  const attempts = code === null ? CODE_ATTEMPTS : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = code ?? generateCouponCode();

    const { error } = await admin
      .from("coupons")
      .insert({ ...base, code: candidate });

    if (error === null) {
      /*
        The list on this page is server-rendered, so it has to be told the row
        exists. Without this the form clears and the table below it still shows
        what was there before.
      */
      revalidatePath("/admin/coupons");
      console.info(`[admin] ${session.username} created coupon ${candidate}`);

      return { error: null, created: candidate };
    }

    if (error.code === UNIQUE_VIOLATION) {
      if (code !== null) {
        return { error: `The code ${code} already exists.`, created: null };
      }

      continue;
    }

    console.error("[admin] could not create a coupon:", error);

    return { error: "Could not create that code. Check the values and try again.", created: null };
  }

  return {
    error: "Could not generate a free code. Please try again.",
    created: null,
  };
}

/**
 * Turns a code off, or back on.
 *
 * NO DELETE, ANYWHERE. A deactivated code keeps its row, and the payments that
 * name it keep meaning something: an affiliate's report is a list of payments
 * carrying their code, and deleting the coupon would leave those payments
 * pointing at a code nobody can look up. Deactivating stops it being usable and
 * loses nothing.
 *
 * Reversible on purpose — "active" is the one field the admin UI may change
 * (see CouponUpdate) and a code switched off by mistake should be switchable
 * back on, not re-created under a second code with half the history.
 */
export async function setCouponActive(formData: FormData): Promise<void> {
  const session = await adminSession();

  if (session === null) {
    /*
      No redirect and no thrown error: this is reachable as a bare POST, and the
      honest response to an unauthenticated one is to do nothing at all.
    */
    console.warn("[admin] setCouponActive called without a session.");
    return;
  }

  const code = field(formData, "code");
  const active = formData.get("active");

  if (code === null || (active !== "true" && active !== "false")) {
    console.warn("[admin] setCouponActive called with a malformed form.");
    return;
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("coupons")
    .update({ is_active: active === "true" })
    .eq("code", normaliseCouponCode(code));

  if (error !== null) {
    console.error(`[admin] could not update coupon ${code}:`, error);
    return;
  }

  console.info(
    `[admin] ${session.username} set coupon ${code} ${
      active === "true" ? "active" : "inactive"
    }`,
  );

  revalidatePath("/admin/coupons");
  revalidatePath(`/admin/coupons/${normaliseCouponCode(code)}`);
}
