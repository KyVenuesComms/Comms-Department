// Pure leadership-cockpit aggregates. No I/O — takes the mapped projects + move
// history and returns the numbers the /manager page shows. Grove's lens: measure
// output, find the limiting step, surface the highest-leverage move.
import { statusForList } from "./map";
import type { CockpitData, Move, Project } from "./types";

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const AGING = 14 * DAY; // "stuck" = in its current stage over 2 weeks
const SHIPPED_WEEKS = 6;

function ms(iso: string | null): number | null {
  return iso ? new Date(iso).getTime() : null;
}

export function computeCockpit(
  requested: Project[],
  inProgress: Project[],
  outForApproval: Project[],
  closed: Project[],
  moves: Move[],
  nowMs: number,
): CockpitData {
  const active = [...requested, ...inProgress, ...outForApproval];

  // Net flow this week: created vs. shipped (Grove's leading indicator).
  const intakeWeek = [...active, ...closed].filter(
    (p) => nowMs - new Date(p.createdAt).getTime() < WEEK,
  ).length;
  const shippedSeen = new Set<string>();
  const shippedPerWeek = new Array(SHIPPED_WEEKS).fill(0);
  let shippedWeek = 0;
  for (const m of moves) {
    if (statusForList(m.toList) !== "closed") continue;
    const age = nowMs - new Date(m.at).getTime();
    if (age < 0) continue;
    if (age < WEEK && !shippedSeen.has(m.cardId)) {
      shippedSeen.add(m.cardId);
      shippedWeek++;
    }
    const wk = Math.floor(age / WEEK);
    if (wk < SHIPPED_WEEKS) shippedPerWeek[wk]++;
  }
  shippedPerWeek.reverse(); // oldest → newest

  // Deadlines (active only).
  const overdue = active.filter((p) => {
    const d = ms(p.dueAt);
    return d !== null && !p.dueComplete && d < nowMs;
  }).length;
  const dueThisWeek = active.filter((p) => {
    const d = ms(p.dueAt);
    return d !== null && !p.dueComplete && d >= nowMs && d < nowMs + WEEK;
  }).length;
  const waitingForInfo = active.filter((p) =>
    p.flags.includes("Waiting for Info"),
  ).length;

  // By department.
  const deptMap = new Map<string, { active: number; newThisWeek: number }>();
  for (const p of active) {
    const name = p.departments[0] ?? "Unassigned";
    const e = deptMap.get(name) ?? { active: 0, newThisWeek: 0 };
    e.active++;
    if (nowMs - new Date(p.createdAt).getTime() < WEEK) e.newThisWeek++;
    deptMap.set(name, e);
  }
  const byDepartment = [...deptMap]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.active - a.active);

  // By assignee.
  const asgMap = new Map<string, number>();
  for (const p of active) {
    const name = p.assignee ?? "Unassigned";
    asgMap.set(name, (asgMap.get(name) ?? 0) + 1);
  }
  const byAssignee = [...asgMap]
    .map(([name, active]) => ({ name, active }))
    .sort((a, b) => b.active - a.active);

  // Work mix (active).
  const workMix = { Print: 0, Signage: 0, Digital: 0 };
  for (const p of active) if (p.type) workMix[p.type]++;

  // Bottleneck = the live stage with the most work aged past 2 weeks.
  const agedCount = (arr: Project[]) =>
    arr.filter((p) => {
      const e = ms(p.enteredStageAt);
      return e !== null && nowMs - e > AGING;
    }).length;
  const stages = [
    { stage: "In Queue", n: agedCount(requested) },
    { stage: "In Progress", n: agedCount(inProgress) },
    { stage: "Out for Approval", n: agedCount(outForApproval) },
  ].sort((a, b) => b.n - a.n);
  const bottleneck =
    stages[0].n > 0
      ? { stage: stages[0].stage, reason: `${stages[0].n} sitting over 2 weeks` }
      : null;

  // Highest-leverage move (first applicable, in priority order).
  const net = intakeWeek - shippedWeek;
  const topDept = byDepartment[0];
  let leverage: string;
  if (waitingForInfo >= 5) {
    leverage = `Nudge requesters — ${waitingForInfo} projects are stuck waiting on missing info.`;
  } else if (bottleneck?.stage === "Out for Approval") {
    leverage = `Chase approvers — ${stages[0].n} proofs have been awaiting sign-off over 2 weeks.`;
  } else if (net >= 10) {
    leverage = `Intake is outrunning output (+${net} this week). Consider pausing new requests or adding hands.`;
  } else if (topDept && topDept.newThisWeek >= 5) {
    leverage = `Most new work this week came from ${topDept.name} (+${topDept.newThisWeek}). Worth a conversation.`;
  } else {
    leverage = "Team's keeping pace — no single big unblock right now.";
  }

  return {
    netFlow: { intakeWeek, shippedWeek, net },
    overdue,
    dueThisWeek,
    waitingForInfo,
    byDepartment,
    byAssignee,
    shippedPerWeek,
    workMix,
    bottleneck,
    leverage,
  };
}
