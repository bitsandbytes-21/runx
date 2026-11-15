import type { ProgressLoad } from "./progress-record";

/** Key remembering that this account was already asked on this device. */
export const importAskedKey = (userId: string) => `runx:import-asked:${userId}`;

/**
 * Offer guest progress once, and only when the account has none yet, so an
 * import never overwrites progress saved from another device.
 */
export function shouldOfferImport(
  guest: ProgressLoad,
  account: ProgressLoad,
  wasAsked: boolean,
): boolean {
  return !wasAsked && guest.kind === "ok" && account.kind === "none";
}
