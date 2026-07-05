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
    show: null,
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

  it("computes prior-week intake and shipped for vs-last-week deltas", () => {
    const req = [
      proj({ createdAt: ago(1) }), // this week
      proj({ createdAt: ago(9) }), // last week
      proj({ createdAt: ago(10) }), // last week
      proj({ createdAt: ago(20) }), // older
    ];
    const moves = [
      closedMove("a", 2), // this week
      closedMove("b", 8), // last week
      closedMove("c", 12), // last week
      closedMove("c", 12.5), // same card again → deduped
      closedMove("d", 25), // older
    ];
    const c = computeCockpit(req, [], [], [], moves, NOW);
    expect(c.netFlow.intakeWeek).toBe(1);
    expect(c.netFlow.prevIntakeWeek).toBe(2);
    expect(c.netFlow.shippedWeek).toBe(1);
    expect(c.netFlow.prevShippedWeek).toBe(2);
  });

  it("lists the oldest active items by time in current stage", () => {
    const req = [
      proj({ name: "old", enteredStageAt: ago(40), departments: ["Finance"] }),
      proj({ name: "mid", enteredStageAt: ago(10) }),
      proj({ name: "new", enteredStageAt: ago(1) }),
      proj({ name: "no-history", enteredStageAt: null, createdAt: ago(25) }),
    ];
    const c = computeCockpit(req, [], [], [], [], NOW);
    expect(c.agedItems.map((i) => i.name)).toEqual(["old", "no-history", "mid", "new"]);
    expect(c.agedItems[0]).toMatchObject({ department: "Finance", stage: "In Queue", days: 40 });
  });

  it("picks 'nudge requesters' when waiting-for-info is high", () => {
    const active = Array.from({ length: 5 }, () => proj({ flags: ["Waiting for Info"] }));
    const c = computeCockpit(active, [], [], [], [], NOW);
    expect(c.waitingForInfo).toBe(5);
    expect(c.leverage).toMatch(/Nudge requesters/);
  });

  // Trello card ids encode creation time in the first 8 hex chars.
  const idAt = (d: number) =>
    Math.floor((NOW - d * DAY) / 1000).toString(16).padStart(8, "0") + "0".repeat(16);

  it("computes cycle-time percentiles from created→closed", () => {
    // 6 cards, created 10..60 days before their close (close = 1 day ago).
    const moves: Move[] = [10, 20, 30, 40, 50, 60].map((span, i) => ({
      cardId: idAt(span + 1).slice(0, 8) + String(i).padStart(16, "0"),
      cardName: `c${i}`,
      toList: "Closed Jobs",
      at: ago(1),
    }));
    const c = computeCockpit([], [], [], [], moves, NOW);
    expect(c.cycleTime).not.toBeNull();
    expect(c.cycleTime!.sampleSize).toBe(6);
    expect(c.cycleTime!.p50).toBeGreaterThanOrEqual(29);
    expect(c.cycleTime!.p85).toBeGreaterThanOrEqual(49);
  });

  it("computes rework: approval followed by a move back to in-progress", () => {
    const mv = (cardId: string, toList: string, d: number): Move => ({ cardId, cardName: cardId, toList, at: ago(d) });
    const moves = [
      // 5 cards reached approval; 1 bounced back afterward.
      mv("a", "Out For Approval", 10), mv("a", "In Progress", 8), // bounced
      mv("b", "Out For Approval", 9),
      mv("c", "Out For Approval", 8),
      mv("d", "Out For Approval", 7),
      mv("e", "Out For Approval", 6),
      mv("f", "In Progress", 5), // never reached approval — not in sample
    ];
    const c = computeCockpit([], [], [], [], moves, NOW);
    expect(c.rework).toEqual({ bounced: 1, sample: 5, pct: 20 });
  });

  it("ranks missing-info concentration by department", () => {
    const active = [
      proj({ departments: ["Finance"], flags: ["Waiting for Info"] }),
      proj({ departments: ["Finance"], flags: ["Waiting for Info"] }),
      proj({ departments: ["Finance"] }),
      proj({ departments: ["Legal"], flags: ["Waiting for Info"] }),
      proj({ departments: ["Communications"] }),
    ];
    const c = computeCockpit(active, [], [], [], [], NOW);
    expect(c.missingInfoByDept[0]).toEqual({ name: "Finance", waiting: 2, active: 3 });
    expect(c.missingInfoByDept.some((d) => d.name === "Communications")).toBe(false);
  });

  it("projects the backlog from recent average net flow", () => {
    // 8 created in the last week, nothing shipped → weeklyNet 2 (8/4 weeks avg).
    const req = Array.from({ length: 8 }, () => proj({ createdAt: ago(2) }));
    const c = computeCockpit(req, [], [], [], [], NOW);
    expect(c.forecast.weeklyNet).toBe(2);
    expect(c.forecast.inFourWeeks).toBe(8 + 2 * 4);
  });

  it("buckets active work by age per stage", () => {
    const req = [
      proj({ enteredStageAt: ago(2) }), // 0–7
      proj({ enteredStageAt: ago(10) }), // 8–14
      proj({ enteredStageAt: ago(20) }), // 15–30
      proj({ enteredStageAt: ago(45) }), // 30+
    ];
    const c = computeCockpit(req, [], [], [], [], NOW);
    expect(c.agingBuckets[0]).toEqual({ stage: "In Queue", buckets: [1, 1, 1, 1] });
  });

  it("lists work due in the next 10 days, soonest first", () => {
    const active = [
      proj({ name: "later", dueAt: ahead(9) }),
      proj({ name: "soon", dueAt: ahead(2) }),
      proj({ name: "too-far", dueAt: ahead(15) }),
      proj({ name: "done", dueAt: ahead(3), dueComplete: true }),
      proj({ name: "past", dueAt: ago(1) }), // overdue, not "due soon"
    ];
    const c = computeCockpit(active, [], [], [], [], NOW);
    expect(c.dueSoon.map((d) => d.name)).toEqual(["soon", "later"]);
    expect(c.dueSoon[0].dueInDays).toBe(2);
  });

  it("surfaces the bottleneck as an alert", () => {
    const ofa = [proj({ status: "out-for-approval", enteredStageAt: ago(20) })];
    const c = computeCockpit([], [], ofa, [], [], NOW);
    expect(c.alerts.some((a) => a.startsWith("Bottleneck: Out for Approval"))).toBe(true);
  });

  it("exposes intake per week alongside shipped per week", () => {
    const req = [proj({ createdAt: ago(2) }), proj({ createdAt: ago(9) })];
    const c = computeCockpit(req, [], [], [], [], NOW);
    expect(c.intakePerWeek).toHaveLength(6);
    expect(c.intakePerWeek[5]).toBe(1); // newest week
    expect(c.intakePerWeek[4]).toBe(1); // week before
  });

  it("raises threshold alerts against targets", () => {
    const overdueLots = Array.from({ length: 25 }, () => proj({ dueAt: ago(3) }));
    const c = computeCockpit(overdueLots, [], [], [], [], NOW, 35);
    expect(c.alerts.some((a) => a.includes("Overdue is 25"))).toBe(true);
    expect(c.alerts.some((a) => a.includes("Turnaround is ~35"))).toBe(true);
  });

  it("stays quiet when everything is inside targets", () => {
    const c = computeCockpit([proj({})], [], [], [], [], NOW, 21);
    expect(c.alerts).toEqual([]);
  });
});
