// Data Privacy Act (RA 10173) consent tracking.
//
// The consent gate is versioned: bumping CURRENT_DPA_VERSION (together with
// updating the notice text in the frontend `src/lib/dpaNotice.js`) requires
// every user to re-consent on their next login. Consent is recorded on the
// User row (timestamp + version) and gated server-side so the portal can
// never be reached without an up-to-date consent on file.

export const CURRENT_DPA_VERSION = 1;

export function dpaConsentRequired(user) {
  return !user?.dpaConsentAt || (user.dpaConsentVersion ?? 0) < CURRENT_DPA_VERSION;
}
