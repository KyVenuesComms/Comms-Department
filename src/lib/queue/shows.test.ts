import { describe, expect, it } from "vitest";
import { lastCallStatus, matchShow, parseShowEvent, showPhase, SHOWS } from "./shows";

describe("matchShow", () => {
  it("matches KSF-prefixed card names", () => {
    expect(matchShow("KSF - Mules and Jacks Tent Sign")).toBe("kentucky-state-fair");
    expect(matchShow("- KSF Concerts - Entrance Unit Scrims")).toBe("kentucky-state-fair");
  });

  it("matches World's Championship Horse Show cards to the same show", () => {
    expect(matchShow("WCHS - Warm-up Ring Signage")).toBe("kentucky-state-fair");
    expect(matchShow("Freedom Hall banners", "Show/Event:\n\nWorld's Championship Horse Show\n")).toBe(
      "kentucky-state-fair",
    );
  });

  it("matches via the Show/Event description field", () => {
    const desc = "Department:\n\nComm\n\nShow/Event:\n\nKENTUCKY STATE FAIR\n";
    expect(matchShow("Pole banners for Freedom Way", desc)).toBe("kentucky-state-fair");
  });

  it("does not match unrelated cards or embedded letters", () => {
    expect(matchShow("KEC - Hotel and Attractions Map")).toBeNull();
    expect(matchShow("TASKSFORCE banner", "Show/Event:\n\nOTHER")).toBeNull();
  });
});

describe("parseShowEvent", () => {
  it("pulls the Show/Event value", () => {
    expect(parseShowEvent("Show/Event:\n\nOTHER\n\nMore")).toBe("OTHER");
    expect(parseShowEvent(undefined)).toBeNull();
  });
});

describe("showPhase", () => {
  const ksf = SHOWS[0];
  it("counts down before, day-counts during, and ends after", () => {
    expect(showPhase(ksf, Date.parse("2026-07-05T12:00:00-04:00")).phase).toBe("before");
    const during = showPhase(ksf, Date.parse("2026-08-22T12:00:00-04:00"));
    expect(during).toEqual({ phase: "during", days: 3 });
    expect(showPhase(ksf, Date.parse("2026-09-01T12:00:00-04:00")).phase).toBe("after");
  });
});

describe("lastCallStatus", () => {
  const ksf = SHOWS[0];

  it("reports days left while the window is open", () => {
    // Noon Jun 20 → end of Jun 26 is 6.5 days, rounded up.
    const r = lastCallStatus(ksf, Date.parse("2026-06-20T12:00:00-04:00"));
    expect(r).toEqual({ state: "open", days: 7, date: "2026-06-26" });
  });

  it("treats the cutoff day itself as still open", () => {
    expect(lastCallStatus(ksf, Date.parse("2026-06-26T09:00:00-04:00"))?.state).toBe("open");
  });

  it("reports days since once the window has passed", () => {
    // End of Jun 26 → noon Jul 5 is 8.5 days, rounded down.
    const r = lastCallStatus(ksf, Date.parse("2026-07-05T12:00:00-04:00"));
    expect(r).toEqual({ state: "passed", days: 8, date: "2026-06-26" });
  });

  it("returns null for a show with no last call", () => {
    expect(lastCallStatus({ ...ksf, lastCall: undefined }, Date.now())).toBeNull();
  });
});
