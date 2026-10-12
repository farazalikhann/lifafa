/**
 * What a host is told when a paid invitation asks for a template that costs
 * more than the one it was paid for.
 *
 * In a file of its own because two things say it and must say the same:
 * updateEvent, which refuses the save (lib/db/events.ts is a "use server"
 * file and can export nothing but its actions), and the wizard's gallery,
 * which says so on the template's card before the host tries.
 */
export const UPGRADE_AFTER_PAYMENT_MESSAGE =
  "This template costs more than the one you paid for. Contact support to upgrade.";
