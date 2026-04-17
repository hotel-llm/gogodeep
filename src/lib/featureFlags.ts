/**
 * FREE_FOR_ALL — master kill-switch for all plan/credit gating.
 *
 * true  → everyone gets unlimited everything; Pricing page hidden from nav.
 * false → normal paid-plan logic (Shallow / Intermediate / Deep tiers).
 *
 * To restore full pricing, tell Claude:
 *   "restore pricing — set FREE_FOR_ALL back to false"
 */
export const FREE_FOR_ALL = true;
