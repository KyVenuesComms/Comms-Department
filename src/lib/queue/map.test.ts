import { describe, expect, it } from "vitest";
import { priorityScore, sortProjects, statusForList, toProject } from "./map";
import type { Project, RawCard } from "./types";

describe("statusForList", () => {
  it("maps requested-bucket lists", () => {
    expect(statusForList("Work Order Queue")).toBe("requested");
    expect(statusForList("Up Next")).toBe("requested");
    expect(statusForList("2026 KSF & WCHS")).toBe("requested");
  });

  it("maps in-progress-bucket lists", () => {
    expect(statusForList("In Progress")).toBe("in-progress");
    expect(statusForList("Department Review")).toBe("in-progress");
  });

  it("maps Out For Approval to its own stage", () => {
    expect(statusForList("Out For Approval")).toBe("out-for-approval");
  });

  it("maps the closed bucket", () => {
    expect(statusForList("Closed Jobs")).toBe("closed");
  });

  it("hides internal lists and anything unrecognized", () => {
    expect(statusForList("Sent to Printer")).toBe("hidden");
    expect(statusForList("GPS Ownership")).toBe("hidden");
    expect(statusForList("On Hold")).toBe("hidden");
    expect(statusForList("Some Brand New List")).toBe("hidden");
  });

  it("matches case-insensitively and ignores stray whitespace", () => {
    expect(statusForList("  work order queue ")).toBe("requested");
    expect(statusForList("DEPARTMENT REVIEW")).toBe("in-progress");
  });
});

function card(over: Partial<RawCard>): RawCard {
  return {
    id: "1",
    name: "A card",
    listName: "Work Order Queue",
    labels: [],
    url: "https://trello.com/c/abc",
    ...over,
  };
}

describe("toProject", () => {
  it("sorts labels into department / flag / type", () => {
    const p = toProject(
      card({
        labels: [
          { name: "Expositions" },
          { name: "High Priority" },
          { name: "Print" },
        ],
      }),
    );
    expect(p.departments).toEqual(["Expositions"]);
    expect(p.flags).toEqual(["High Priority"]);
    expect(p.type).toBe("Print");
    expect(p.status).toBe("requested");
  });

  it("leaves department empty when no department label is present", () => {
    const p = toProject(card({ labels: [{ name: "Digital" }] }));
    expect(p.departments).toEqual([]);
    expect(p.type).toBe("Digital");
  });

  it("keeps multiple flags and ignores non-department labels", () => {
    const p = toProject(
      card({
        labels: [
          { name: "Waiting for Info" },
          { name: "Submitted Past Deadline" },
          { name: "Expositions" },
          { name: "Red7e" }, // vendor — not a known department, ignored
          { name: "Bre" }, // person — ignored
        ],
      }),
    );
    expect(p.flags).toEqual(["Waiting for Info", "Submitted Past Deadline"]);
    expect(p.departments).toEqual(["Expositions"]);
    expect(p.type).toBeNull();
  });

  it("matches labels case-insensitively (real board uses ALL CAPS)", () => {
    const p = toProject(
      card({ labels: [{ name: "SIGNAGE" }, { name: "WAITING FOR INFO" }] }),
    );
    expect(p.type).toBe("Signage");
    expect(p.flags).toEqual(["Waiting for Info"]);
  });
});

function proj(over: Partial<Project>): Project {
  return {
    id: "x",
    name: "p",
    status: "requested",
    departments: [],
    flags: [],
    type: null,
    url: "https://trello.com/c/x",
    createdAt: "2026-01-01T00:00:00.000Z",
    enteredStageAt: null,
    ...over,
  };
}

describe("priority sorting", () => {
  it("floats High-Priority up and sinks Waiting-for-Info", () => {
    const high = proj({ id: "high", flags: ["High Priority"] });
    const plain = proj({ id: "plain" });
    const waiting = proj({ id: "waiting", flags: ["Waiting for Info"] });
    const order = sortProjects([plain, waiting, high]).map((p) => p.id);
    expect(order).toEqual(["high", "plain", "waiting"]);
  });

  it("puts print/signage ahead of digital when otherwise equal", () => {
    const digital = proj({ id: "digital", type: "Digital" });
    const print = proj({ id: "print", type: "Print" });
    expect(sortProjects([digital, print]).map((p) => p.id)).toEqual([
      "print",
      "digital",
    ]);
  });

  it("treats Submitted Past Deadline as neutral (keeps original order)", () => {
    const a = proj({ id: "a", flags: ["Submitted Past Deadline"] });
    const b = proj({ id: "b" });
    expect(priorityScore(a)).toBe(priorityScore(b));
    expect(sortProjects([a, b]).map((p) => p.id)).toEqual(["a", "b"]);
  });
});
