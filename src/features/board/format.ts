// Format dates with a fixed locale + timezone so the server and client always
// render the same string (prevents React hydration mismatches).
const OPTS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  timeZone: "America/New_York",
};

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", OPTS);
}

/** A gentle, expectation-managing phrase for the quoted turnaround. */
export function turnaroundPhrase(quotedDays: number): string {
  if (quotedDays >= 14) return `about ${Math.round(quotedDays / 7)} weeks`;
  return `about ${quotedDays} days`;
}
