import { describe, expect, it } from "vitest";
import {
  defaultMapping,
  flagByLabel,
  parseAliases,
  statusByList,
  typeByLabel,
  validateMapping,
} from "./mapping";
import type { TrelloMapping } from "./types";

describe("defaultMapping", () => {
  it("mirrors the built-in config (lists, flags, types)", () => {
    const m = defaultMapping();
    expect(m.lists.find((e) => e.list === "Work Order Queue")?.status).toBe("requested");
    expect(m.lists.find((e) => e.list === "Closed Jobs")?.status).toBe("closed");
    expect(m.flagAliases["High Priority"]).toEqual(["high priority"]);
    expect(m.typeAliases.Print).toEqual(["print"]);
  });
});

describe("parseAliases", () => {
  it("splits, trims, lowercases, de-dupes", () => {
    expect(parseAliases("Rush, High Priority\nrush")).toEqual(["rush", "high priority"]);
  });
  it("is empty for blank input", () => {
    expect(parseAliases(" , \n")).toEqual([]);
  });
});

describe("lookup builders", () => {
  const m: TrelloMapping = {
    lists: [
      { list: "Work Order Queue", status: "requested" },
      { list: "In Progress", status: "in-progress" },
    ],
    flagAliases: { "High Priority": ["rush", "urgent"], "Submitted Past Deadline": [], "Waiting for Info": ["needs info"] },
    typeAliases: { Print: ["print"], Signage: ["sign", "signage"], Digital: [] },
  };

  it("maps normalized list names to stages", () => {
    const s = statusByList(m);
    expect(s.get("work order queue")).toBe("requested");
    expect(s.get("in progress")).toBe("in-progress");
    expect(s.get("closed jobs")).toBeUndefined(); // unmapped → caller treats as hidden
  });

  it("maps every alias to its flag / type", () => {
    const f = flagByLabel(m);
    expect(f.get("rush")).toBe("High Priority");
    expect(f.get("urgent")).toBe("High Priority");
    expect(f.get("needs info")).toBe("Waiting for Info");
    const t = typeByLabel(m);
    expect(t.get("sign")).toBe("Signage");
    expect(t.get("signage")).toBe("Signage");
  });
});

describe("validateMapping", () => {
  it("passes the default", () => {
    expect(validateMapping(defaultMapping())).toEqual([]);
  });

  it("flags an unknown stage", () => {
    const bad = {
      ...defaultMapping(),
      lists: [{ list: "X", status: "shipped" as never }],
    };
    expect(validateMapping(bad)[0]).toMatch(/unknown stage/);
  });

  it("flags a list mapped twice", () => {
    const bad: TrelloMapping = {
      ...defaultMapping(),
      lists: [
        { list: "Queue", status: "requested" },
        { list: "queue", status: "in-progress" },
      ],
    };
    expect(validateMapping(bad).some((e) => /more than once/.test(e))).toBe(true);
  });
});
