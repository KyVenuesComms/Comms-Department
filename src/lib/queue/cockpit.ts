// Pure leadership-cockpit aggregates. No I/O — takes the mapped projects + move
// history and returns the numbers the /manager page shows. Grove's lens: measure
// output, find the limiting step, surface the highest-leverage move.
import { TARGETS } from "./config";
import { cardCreatedAt, statusForList } from "./map";
import { seasonalOutlook } from "./seasonal";
import type { CockpitData, Move, Project, Targets } from "./types";

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const AGING = 14 * DAY; // "stuck" = in its current stage over 2 weeks
const SHIPPED_WEEKS = 6;
const CYCLE_WINDOW = 60 * DAY; // completed-work window for percentiles
const INTAKE_HEAT_WEEKS = 8;

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

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
  turnaroundQuotedDays: number | null = null,
  archivedCreatedMs: number[] = [],
  targets: Targets = TARGETS,
): CockpitData {
  const active = [...requested, ...inProgress, ...outForApproval];

  // Net flow: created vs. shipped, this week and the week before (for deltas).
  const createdAge = (p: Project) => nowMs - new Date(p.createdAt).getTime();
  const all = [...active, ...closed];
  const intakeWeek = all.filter((p) => createdAge(p) < WEEK).length;
  const prevIntakeWeek = all.filter((p) => {
    const a = createdAge(p);
    return a >= WEEK && a < 2 * WEEK;
  }).length;
  const shippedSeen = new Set<string>();
  const prevShippedSeen = new Set<string>();
  const shippedPerWeek = new Array(SHIPPED_WEEKS).fill(0);
  let shippedWeek = 0;
  let prevShippedWeek = 0;
  for (const m of moves) {
    if (statusForList(m.toList) !== "closed") continue;
    const age = nowMs - new Date(m.at).getTime();
    if (age < 0) continue;
    if (age < WEEK && !shippedSeen.has(m.cardId)) {
      shippedSeen.add(m.cardId);
      shippedWeek++;
    } else if (age >= WEEK && age < 2 * WEEK && !prevShippedSeen.has(m.cardId)) {
      prevShippedSeen.add(m.cardId);
      prevShippedWeek++;
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

  // Cycle-time percentiles: created → closed, recent window, deduped per card.
  const closeAt = new Map<string, number>();
  for (const m of moves) {
    if (statusForList(m.toList) !== "closed") continue;
    const t = new Date(m.at).getTime();
    if (t <= nowMs && t > (closeAt.get(m.cardId) ?? 0)) closeAt.set(m.cardId, t);
  }
  const cycleSamples = [...closeAt]
    .filter(([, t]) => nowMs - t < CYCLE_WINDOW)
    .map(([id, t]) => (t - new Date(cardCreatedAt(id)).getTime()) / DAY)
    .filter((d) => d >= 0 && d < 365)
    .sort((a, b) => a - b);
  const cycleTime =
    cycleSamples.length >= 5
      ? {
          p50: Math.round(percentile(cycleSamples, 0.5)),
          p85: Math.round(percentile(cycleSamples, 0.85)),
          sampleSize: cycleSamples.length,
        }
      : null;

  // Rework: cards that entered approval, then later moved BACK to in-progress.
  const byCard = new Map<string, Move[]>();
  for (const m of moves) {
    const arr = byCard.get(m.cardId) ?? [];
    arr.push(m);
    byCard.set(m.cardId, arr);
  }
  let reworkSample = 0;
  let bounced = 0;
  for (const arr of byCard.values()) {
    const seq = arr
      .map((m) => ({ t: new Date(m.at).getTime(), s: statusForList(m.toList) }))
      .sort((a, b) => a.t - b.t);
    const firstApproval = seq.find((x) => x.s === "out-for-approval");
    if (!firstApproval) continue;
    reworkSample++;
    if (seq.some((x) => x.s === "in-progress" && x.t > firstApproval.t)) bounced++;
  }
  const rework =
    reworkSample >= 5
      ? { bounced, sample: reworkSample, pct: Math.round((bounced / reworkSample) * 100) }
      : null;

  // Missing-info concentration: which departments' requests are stuck on them.
  const infoMap = new Map<string, { waiting: number; active: number }>();
  for (const p of active) {
    const name = p.departments[0] ?? "Unassigned";
    const e = infoMap.get(name) ?? { waiting: 0, active: 0 };
    e.active++;
    if (p.flags.includes("Waiting for Info")) e.waiting++;
    infoMap.set(name, e);
  }
  const missingInfoByDept = [...infoMap]
    .map(([name, v]) => ({ name, ...v }))
    .filter((d) => d.waiting > 0)
    .sort((a, b) => b.waiting - a.waiting)
    .slice(0, 6);

  // Forecast: average weekly net over the last 4 observed weeks, projected out.
  const intakePerWeek = new Array(SHIPPED_WEEKS).fill(0);
  for (const p of all) {
    const wk = Math.floor(createdAge(p) / WEEK);
    if (wk >= 0 && wk < SHIPPED_WEEKS) intakePerWeek[wk]++;
  }
  intakePerWeek.reverse(); // oldest → newest, matching shippedPerWeek
  const recentWeeks = 4;
  let netSum = 0;
  for (let i = SHIPPED_WEEKS - recentWeeks; i < SHIPPED_WEEKS; i++) {
    netSum += intakePerWeek[i] - shippedPerWeek[i];
  }
  const weeklyNet = Math.round(netSum / recentWeeks);

  // Seasonal read from the board's full history (visible + archived creations).
  const recentIntake28 = all.filter((p) => createdAge(p) < 28 * DAY).length;
  const shippedAvg =
    shippedPerWeek.slice(-recentWeeks).reduce((s, n) => s + n, 0) / recentWeeks;
  const allCreatedMs = [
    ...all.map((p) => new Date(p.createdAt).getTime()),
    ...archivedCreatedMs,
  ];
  const seasonal = seasonalOutlook(
    allCreatedMs,
    nowMs,
    recentIntake28,
    active.length,
    shippedAvg,
  );

  const forecast = {
    weeklyNet,
    inFourWeeks: Math.max(0, active.length + weeklyNet * 4),
    seasonal,
  };

  // Intake heatmap: which weekday requests arrive (Mon..Sun), last 8 weeks.
  const dayIdx: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const intakeByDay = new Array(7).fill(0);
  for (const p of all) {
    if (createdAge(p) >= INTAKE_HEAT_WEEKS * WEEK) continue;
    const wd = new Date(p.createdAt).toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "America/New_York",
    });
    if (wd in dayIdx) intakeByDay[dayIdx[wd]]++;
  }

  // Aging buckets per stage: [0–7, 8–14, 15–30, 30+] days in current stage.
  const bucketOf = (days: number) => (days <= 7 ? 0 : days <= 14 ? 1 : days <= 30 ? 2 : 3);
  const agingFor = (arr: Project[], stage: string) => {
    const buckets: [number, number, number, number] = [0, 0, 0, 0];
    for (const p of arr) {
      const entered = ms(p.enteredStageAt) ?? new Date(p.createdAt).getTime();
      buckets[bucketOf((nowMs - entered) / DAY)]++;
    }
    return { stage, buckets };
  };
  const agingBuckets = [
    agingFor(requested, "In Queue"),
    agingFor(inProgress, "In Progress"),
    agingFor(outForApproval, "Out for Approval"),
  ];

  // Stage time: avg days between observed consecutive moves (recent window).
  const stageAgg = new Map<string, { total: number; n: number }>();
  const STAGE_NAMES: Record<string, string> = {
    requested: "In Queue",
    "in-progress": "In Progress",
    "out-for-approval": "Out for Approval",
  };
  for (const arr of byCard.values()) {
    const seq = arr
      .map((m) => ({ t: new Date(m.at).getTime(), s: statusForList(m.toList) }))
      .sort((a, b) => a.t - b.t);
    for (let i = 0; i < seq.length - 1; i++) {
      const label = STAGE_NAMES[seq[i].s];
      if (!label) continue;
      const days = (seq[i + 1].t - seq[i].t) / DAY;
      if (days < 0 || days > 365) continue;
      const e = stageAgg.get(label) ?? { total: 0, n: 0 };
      e.total += days;
      e.n++;
      stageAgg.set(label, e);
    }
  }
  const stageTime = ["In Queue", "In Progress", "Out for Approval"]
    .map((stage) => {
      const e = stageAgg.get(stage);
      return e && e.n >= 3
        ? { stage, avgDays: Math.round((e.total / e.n) * 10) / 10, sample: e.n }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Oldest active work by time in its current stage — the attention list.
  const STAGE_LABEL: Record<string, string> = {
    requested: "In Queue",
    "in-progress": "In Progress",
    "out-for-approval": "Out for Approval",
  };
  const agedItems = active
    .map((p) => {
      const entered = ms(p.enteredStageAt) ?? new Date(p.createdAt).getTime();
      return {
        name: p.name,
        department: p.departments[0] ?? "Unassigned",
        stage: STAGE_LABEL[p.status] ?? p.status,
        days: Math.floor((nowMs - entered) / DAY),
        assignee: p.assignee,
        dueAt: p.dueComplete ? null : p.dueAt,
      };
    })
    .sort((a, b) => b.days - a.days)
    .slice(0, 50);

  // Active work due in the next 10 days — the "don't get surprised" list.
  const dueSoon = active
    .filter((p) => {
      const d = ms(p.dueAt);
      return d !== null && !p.dueComplete && d >= nowMs && d < nowMs + 10 * DAY;
    })
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime())
    .slice(0, 50)
    .map((p) => ({
      name: p.name,
      department: p.departments[0] ?? "Unassigned",
      stage: STAGE_LABEL[p.status] ?? p.status,
      dueInDays: Math.max(0, Math.ceil((new Date(p.dueAt!).getTime() - nowMs) / DAY)),
      dueAt: p.dueAt!,
      assignee: p.assignee,
    }));

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

  // Threshold alerts vs TARGETS — plain English, ready for display or webhook.
  const alerts: string[] = [];
  if (overdue > targets.overdue) {
    alerts.push(`Overdue is ${overdue} — target is under ${targets.overdue}.`);
  }
  if (bottleneck) {
    alerts.push(`Bottleneck: ${bottleneck.stage} — ${bottleneck.reason}.`);
  }
  if (turnaroundQuotedDays !== null && turnaroundQuotedDays > targets.turnaroundDays) {
    alerts.push(`Turnaround is ~${turnaroundQuotedDays} days — target is ${targets.turnaroundDays}.`);
  }
  if (weeklyNet > targets.weeklyNetGrowth) {
    alerts.push(`Backlog growing ~${weeklyNet}/week — on pace for ${forecast.inFourWeeks} active in 4 weeks.`);
  }
  if (seasonal && seasonal.pctChange >= 25) {
    alerts.push(
      `Seasonal ramp ahead: history (${seasonal.years} yr${seasonal.years > 1 ? "s" : ""}) says intake rises ~${seasonal.pctChange}% over the next 4 weeks — expect ~${seasonal.expectedIntake} new requests.`,
    );
  }

  return {
    netFlow: { intakeWeek, shippedWeek, net, prevIntakeWeek, prevShippedWeek },
    agedItems,
    dueSoon,
    intakePerWeek,
    cycleTime,
    rework,
    missingInfoByDept,
    forecast,
    intakeByDay,
    agingBuckets,
    stageTime,
    alerts,
    overdue,
    dueThisWeek,
    waitingForInfo,
    byDepartment,
    byAssignee,
    shippedPerWeek,
    workMix,
    bottleneck,
    leverage,
    targets,
  };
}
