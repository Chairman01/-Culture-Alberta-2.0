// Safe for client components: no server imports. lib/newsletter/alert.ts pulls
// in Resend and the service-role client, so the browser must never import it
// for a value (type-only imports are fine).

/** How many extra stories an everyone-send can list under the main one. */
export const MAX_MORE = 5
