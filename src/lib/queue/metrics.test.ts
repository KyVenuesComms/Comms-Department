import { describe, expect, it } from "vitest";
import {
  perDepartment,
  recentlyCompleted,
  stageEntryDates,
  turnaround,
} from "./metrics";
import type { Move, Project } from "./types";

const DAY = 86_400_000;
const NOW = Date.parse("2026-07-01T00:00:00Z");

/** Build a Trello-like id whose creation time is `createMs`. */
function makeId(createMs: number): string {
  return Math.floor(createMs / 1000)
    .toString(16)
    .padStart(8, "0")
    .concat("0".repeat(16));
}

/** An approval move whose card took `turnaroundDays`, landing `daysAgo`. */
function approval(turnaroundDays: number, daysAgo: number): Move {
  const at = NOW - daysAgo * DAY;
  return {
    cardId: makeId(at - turnaroundDays * DAY),
    cardName: "card",
    toList: "Out For Approval",
    at: new Date(at).toISOString(),
  };
}

describe("turnaround", () => {
  it("returns the median turnaround plus the buffer", () => {
    const moves = [
      approval(5, 1),
      approval(7, 2),
      approval(9, 3),
      approval(11, 4),
      approval(13, 5),
    ];
    const t = turnaround(moves, NOW);
    expect(t).not.toBeNull();
    expect(t!.medianDays).toBe(9);
    expect(t!.quotedDays).toBe(11); // 9 + 2 buffer
    expect(t!.sampleSize).toBe(5);
  });

  it("ignores approvals outside the window and non-approval moves", () => {
    const moves = [
      approval(5, 1),
      approval(7, 2),
      approval(9, 3),
      approval(11, 4),
      approval(13, 5),
      approval(40, 200), // older than the 60-day window
      { cardId: makeId(NOW - 3 * DAY), cardName: "x", toList: "In Progress", at: new Date(NOW).toISOString() },
    ];
    expect(turnaround(moves, NOW)!.sampleSize).toBe(5);
  });

  it("returns null when there are too few samples", () => {
    expect(turnaround([approval(5, 1), approval(7, 2)], NOW)).toBeNull();
  });
});

describe("recentlyCompleted", () => {
  const closed = (cardId: string, daysAgo: number): Move => ({
    cardId,
    cardName: cardId,
    toList: "Closed Jobs",
    at: new Date(NOW - daysAgo * DAY).toISOString(),
  });

  it("returns recent closings newest-first, deduped, within the window", () => {
    const moves = [
      closed("A", 2),
      closed("A", 1), // A closed again more recently → keep the newest, once
      closed("B", 3),
      closed("C", 10), // outside 7-day window
      { cardId: "D", cardName: "D", toList: "In Progress", at: new Date(NOW).toISOString() },
    ];
    const res = recentlyCompleted(moves, NOW);
    expect(res.map((r) => r.id)).toEqual(["A", "B"]);
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
    createdAt: new Date(NOW).toISOString(),
    enteredStageAt: null,
    dueAt: null,
    dueComplete: false,
    assignee: null,
    show: null,
    ...over,
  };
}

describe("perDepartment", () => {
  it("counts a department's projects across the three live stages", () => {
    const out = perDepartment(
      [proj({ departments: ["Expositions"] }), proj({ departments: [] })],
      [proj({ departments: ["Expositions"] })],
      [],
    );
    expect(out.Expositions).toEqual({
      requested: 1,
      inProgress: 1,
      outForApproval: 0,
      total: 2,
    });
  });
});

describe("stageEntryDates", () => {
  it("keeps the latest move per card", () => {
    const early = new Date(NOW - 5 * DAY).toISOString();
    const late = new Date(NOW - 1 * DAY).toISOString();
    const map = stageEntryDates([
      { cardId: "A", cardName: "A", toList: "In Progress", at: early },
      { cardId: "A", cardName: "A", toList: "Department Review", at: late },
    ]);
    expect(map.get("A")).toBe(late);
  });
});
