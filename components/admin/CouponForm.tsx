"use client";

import { useActionState, useState, type ReactElement } from "react";
import { useFormStatus } from "react-dom";
import { createCoupon } from "@/app/admin/coupons/actions";
import {
  COUPON_FORM_INITIAL_STATE,
  type CouponFormState,
} from "@/lib/admin/couponForm";
import { isFreeDiscount } from "@/lib/coupons/quote";
import { INVITATION_PRICE_PAISE } from "@/lib/razorpay/pricing";

/**
 * The "new code" form.
 *
 * A plain <form> with an action, so it posts whether or not React has hydrated
 * — the same reason the admin login is a plain form. The only client state here
 * is which fields to *show*: an affiliate needs an owner and a commission, a
 * discount code needs neither, and a form asking for both regardless is a form
 * that invites nonsense rows.
 *
 * Hiding is not validating. The server checks the affiliate fields itself (see
 * createCoupon), and the database has coupons_affiliate_has_owner underneath
 * that. This just keeps the form honest about what it is asking for.
 *
 * The same goes for a free code: once the discount covers the whole price the
 * usage limit is required and starts at 1, and createCoupon refuses one without
 * a limit whatever this form sends.
 */

const INPUT_CLASS =
  "min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900";

const LABEL_CLASS = "text-sm font-medium";

const HINT_CLASS = "text-xs text-zinc-500";

function SubmitButton(): ReactElement {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="min-h-10 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-wait disabled:bg-zinc-400"
    >
      {pending ? "Creating…" : "Create code"}
    </button>
  );
}

export default function CouponForm(): ReactElement {
  const [state, formAction] = useActionState<CouponFormState, FormData>(
    async (previous, formData) => {
      const next = await createCoupon(previous, formData);

      /* React resets the uncontrolled fields after a submit; these two it does not. */
      if (next.created !== null) {
        setDiscountValue("");
        setMaxUses("");
      }

      return next;
    },
    COUPON_FORM_INITIAL_STATE,
  );

  const [type, setType] = useState<"discount" | "affiliate">("discount");
  const [discountType, setDiscountType] = useState<"percent" | "flat">(
    "percent",
  );
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");

  /* Rupees in the form, paise in the arithmetic, as in createCoupon. */
  const free = makesFree(discountType, discountValue);

  /*
    Crossing into free fills an empty limit with 1, so the safe default is the
    one already typed. Done in the change handlers rather than an effect: it is
    a consequence of what the admin typed, not of rendering.
  */
  const fillLimitIfFree = (
    nextType: "percent" | "flat",
    nextValue: string,
  ): void => {
    if (makesFree(nextType, nextValue) && maxUses.trim().length === 0) {
      setMaxUses("1");
    }
  };

  return (
    <form
      action={formAction}
      className="rounded-lg border border-zinc-200 bg-white p-4"
    >
      <h2 className="text-sm font-semibold">New code</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="coupon-code" className={LABEL_CLASS}>
            Code
          </label>
          <input
            id="coupon-code"
            name="code"
            type="text"
            maxLength={32}
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Leave blank to generate"
            className={`${INPUT_CLASS} uppercase placeholder:normal-case`}
          />
          <p className={HINT_CLASS}>
            4–32 characters. Letters, numbers and hyphens. Stored uppercase.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="coupon-type" className={LABEL_CLASS}>
            Type
          </label>
          <select
            id="coupon-type"
            name="type"
            value={type}
            onChange={(event) =>
              setType(event.target.value as "discount" | "affiliate")
            }
            className={INPUT_CLASS}
          >
            <option value="discount">Discount</option>
            <option value="affiliate">Affiliate</option>
          </select>
          <p className={HINT_CLASS}>
            An affiliate code discounts and earns a commission.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="coupon-discount-type" className={LABEL_CLASS}>
            Discount as
          </label>
          <select
            id="coupon-discount-type"
            name="discountType"
            value={discountType}
            onChange={(event) => {
              const next = event.target.value as "percent" | "flat";
              setDiscountType(next);
              fillLimitIfFree(next, discountValue);
            }}
            className={INPUT_CLASS}
          >
            <option value="percent">Percentage</option>
            <option value="flat">Flat amount</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="coupon-discount-value" className={LABEL_CLASS}>
            {discountType === "percent" ? "Percent off" : "Rupees off"}
          </label>
          <input
            id="coupon-discount-value"
            name="discountValue"
            type="number"
            required
            value={discountValue}
            onChange={(event) => {
              setDiscountValue(event.target.value);
              fillLimitIfFree(discountType, event.target.value);
            }}
            min={1}
            max={discountType === "percent" ? 100 : undefined}
            step={1}
            inputMode="numeric"
            className={INPUT_CLASS}
          />
          <p className={HINT_CLASS}>
            {discountType === "percent"
              ? "1 to 100."
              : "In rupees. Stored as paise."}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="coupon-max-uses" className={LABEL_CLASS}>
            Usage limit
          </label>
          <input
            id="coupon-max-uses"
            name="maxUses"
            type="number"
            required={free}
            min={1}
            step={1}
            inputMode="numeric"
            placeholder={free ? undefined : "Unlimited"}
            value={maxUses}
            onChange={(event) => setMaxUses(event.target.value)}
            aria-describedby="coupon-max-uses-hint"
            className={INPUT_CLASS}
          />
          <p id="coupon-max-uses-hint" className={HINT_CLASS}>
            {free
              ? "Required: this code makes the invitation free. Counted when a host activates with it."
              : "Counted on captured payments only."}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="coupon-expires-at" className={LABEL_CLASS}>
            Expires
          </label>
          <input
            id="coupon-expires-at"
            name="expiresAt"
            type="date"
            className={INPUT_CLASS}
          />
          <p className={HINT_CLASS}>
            Blank never expires. Valid to the end of this day, IST.
          </p>
        </div>

        {/*
          Only for an affiliate. Rendered conditionally rather than disabled,
          because a disabled field still submits nothing and an enabled one the
          form does not want is a field somebody fills in by mistake.
        */}
        {type === "affiliate" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="coupon-owner-name" className={LABEL_CLASS}>
                Affiliate name
              </label>
              <input
                id="coupon-owner-name"
                name="ownerName"
                type="text"
                required
                className={INPUT_CLASS}
              />
              <p className={HINT_CLASS}>Who gets paid the commission.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="coupon-commission" className={LABEL_CLASS}>
                Commission per sale
              </label>
              <input
                id="coupon-commission"
                name="commissionPerSale"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder="0"
                className={INPUT_CLASS}
              />
              <p className={HINT_CLASS}>
                In rupees, per captured sale. Stored as paise.
              </p>
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SubmitButton />

        {state.created !== null ? (
          <p role="status" className="text-sm text-green-700">
            Created <span className="font-semibold">{state.created}</span>.
          </p>
        ) : null}

        {state.error !== null ? (
          <p role="alert" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** Whether the typed discount makes the invitation free. */
function makesFree(discountType: "percent" | "flat", rawValue: string): boolean {
  const value = Number.parseInt(rawValue, 10);

  if (!Number.isFinite(value) || value <= 0) {
    return false;
  }

  return isFreeDiscount(
    discountType,
    discountType === "percent" ? value : value * 100,
    INVITATION_PRICE_PAISE,
  );
}
