import { describe, expect, it } from "vitest";
import { matchShow, parseShowEvent, showPhase, SHOWS } from "./shows";

describe("matchShow", () => {
  it("matches KSF-prefixed card names", () => {
    expect(matchShow("KSF - Mules and Jacks Tent Sign")).toBe("kentucky-state-fair");
    expect(matchShow("- KSF Concerts - Entrance Unit Scrims")).toBe("kentucky-state-fair");
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
