import { describe, expect, it } from "vitest";
import { computeCockpit } from "./cockpit";
import type { Move, Project } from "./types";

const DAY = 86_400_000;
const NOW = Date.parse("2026-07-15T00:00:00Z");
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
const ahead = (d: number) => new Date(NOW + d * DAY).toISOString();

function proj(over: Partial<Project>): Project {
  return {
    id: Math.random().toString(36).slice(2),
    name: "p",
    status: "requested",
    departments: [],
    flags: [],
    type: null,
    url: "",
    createdAt: ago(2),
    enteredStageAt: ago(2),
    dueAt: null,
    dueComplete: false,
    assignee: null,
    ...over,
  };
}
const closedMove = (cardId: string, d: number): Move => ({
  cardId,
  cardName: cardId,
  toList: "Closed Jobs",
  at: ago(d),
});

describe("computeCockpit", () => {
  it("computes net flow: intake vs shipped this week", () => {
    const req = [proj({ createdAt: ago(1) }), proj({ createdAt: ago(3) })];
    const closed = [proj({ status: "closed", createdAt: ago(2) }), proj({ status: "closed", createdAt: ago(40) })];
    const moves = [closedMove("a", 1), closedMove("b", 4), closedMove("c", 30)];
    const c = computeCockpit(req, [], [], closed, moves, NOW);
    expect(c.netFlow.intakeWeek).toBe(3); // 2 req + 1 closed created within 7d
    expect(c.netFlow.shippedWeek).toBe(2); // a, b within 7d
    expect(c.netFlow.net).toBe(1);
  });

  it("counts overdue and due-this-week (active, not complete)", () => {
    const active = [
      proj({ dueAt: ago(1) }), // overdue
      proj({ dueAt: ahead(3) }), // due this week
      proj({ dueAt: ago(1), dueComplete: true }), // done → not overdue
      proj({ dueAt: ahead(20) }), // later
    ];
    const c = computeCockpit(active, [], [], [], [], NOW);
    expect(c.overdue).toBe(1);
    expect(c.dueThisWeek).toBe(1);
  });

  it("ranks departments by active load with new-this-week", () => {
    const req = [
      proj({ departments: ["Communications"], createdAt: ago(1) }),
      proj({ departments: ["Communications"], createdAt: ago(30) }),
      proj({ departments: ["Finance"], createdAt: ago(2) }),
    ];
    const c = computeCockpit(req, [], [], [], [], NOW);
    expect(c.byDepartment[0]).toEqual({ name: "Communications", active: 2, newThisWeek: 1 });
    expect(c.byDepartment[1]).toEqual({ name: "Finance", active: 1, newThisWeek: 1 });
  });

  it("names the bottleneck stage from aged work", () => {
    const ofa = [proj({ status: "out-for-approval", enteredStageAt: ago(20) })];
    const inprog = [proj({ status: "in-progress", enteredStageAt: ago(3) })];
    const c = computeCockpit([], inprog, ofa, [], [], NOW);
    expect(c.bottleneck?.stage).toBe("Out for Approval");
  });

  it("picks 'nudge requesters' when waiting-for-info is high", () => {
    const active = Array.from({ length: 5 }, () => proj({ flags: ["Waiting for Info"] }));
    const c = computeCockpit(active, [], [], [], [], NOW);
    expect(c.waitingForInfo).toBe(5);
    expect(c.leverage).toMatch(/Nudge requesters/);
  });
});
