import { describe, expect, it } from "vitest";
import {
  lastCallStatus,
  matchShow,
  parseKeywords,
  parseShowEvent,
  removeShow,
  showPhase,
  SHOWS,
  upsertShow,
  validateShow,
  type ShowConfig,
} from "./shows";

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

  it("matches against a caller-supplied show list", () => {
    const custom: ShowConfig[] = [
      { slug: "bourbon-fest", name: "Bourbon Fest", start: "2026-09-01", end: "2026-09-03", keywords: ["bourbon fest"] },
    ];
    expect(matchShow("Bourbon Fest — main stage banner", null, custom)).toBe("bourbon-fest");
    expect(matchShow("KSF - Tent Sign", null, custom)).toBeNull(); // KSF not in this list
  });
});

describe("parseKeywords", () => {
  it("splits, trims, lowercases, and de-dupes", () => {
    expect(parseKeywords("KSF, Kentucky State Fair\nksf ,  , State Fair")).toEqual([
      "ksf",
      "kentucky state fair",
      "state fair",
    ]);
  });
  it("returns an empty list for blank input", () => {
    expect(parseKeywords("  ,\n ")).toEqual([]);
  });
});

describe("validateShow", () => {
  const good: ShowConfig = {
    slug: "bourbon-fest",
    name: "Bourbon Fest",
    start: "2026-09-01",
    end: "2026-09-03",
    keywords: ["bourbon fest"],
  };

  it("passes a well-formed show", () => {
    expect(validateShow(good, [])).toEqual([]);
  });

  it("rejects a bad slug", () => {
    expect(validateShow({ ...good, slug: "Bourbon Fest!" }, [])[0]).toMatch(/Slug/);
  });

  it("rejects a duplicate slug", () => {
    expect(validateShow(good, [SHOWS[0], good])[0]).toMatch(/already uses the slug/);
  });

  it("rejects impossible dates and inverted ranges", () => {
    expect(validateShow({ ...good, start: "2026-13-40" }, [])).toContainEqual(
      expect.stringMatching(/Start date/),
    );
    expect(validateShow({ ...good, start: "2026-09-05", end: "2026-09-03" }, [])).toContainEqual(
      expect.stringMatching(/End date can/),
    );
  });

  it("requires at least one keyword and a name", () => {
    expect(validateShow({ ...good, keywords: [] }, [])).toContainEqual(expect.stringMatching(/keyword/));
    expect(validateShow({ ...good, name: "  " }, [])).toContainEqual(expect.stringMatching(/Name/));
  });

  it("allows a blank last call but rejects a bad one", () => {
    expect(validateShow({ ...good, lastCall: undefined }, [])).toEqual([]);
    expect(validateShow({ ...good, lastCall: "nope" }, [])).toContainEqual(
      expect.stringMatching(/Last-call/),
    );
  });
});

describe("upsertShow / removeShow", () => {
  const a: ShowConfig = { slug: "a", name: "A", start: "2026-01-01", end: "2026-01-02", keywords: ["a"] };
  const b: ShowConfig = { slug: "b", name: "B", start: "2026-02-01", end: "2026-02-02", keywords: ["b"] };

  it("appends a new show", () => {
    expect(upsertShow([a], b).map((s) => s.slug)).toEqual(["a", "b"]);
  });
  it("replaces an existing show in place", () => {
    const edited = { ...a, name: "A2" };
    const out = upsertShow([a, b], edited);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe("A2");
  });
  it("handles a slug rename via originalSlug", () => {
    const renamed = { ...a, slug: "a-new" };
    const out = upsertShow([a, b], renamed, "a");
    expect(out.map((s) => s.slug)).toEqual(["a-new", "b"]);
  });
  it("removes by slug", () => {
    expect(removeShow([a, b], "a").map((s) => s.slug)).toEqual(["b"]);
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
