import type {
  CandidateRow,
  Dataset,
  EmployeeRow,
  Filters,
  JobRow,
  Kpi,
  TargetRow,
} from "./types";

/* ------------------------------------------------------------------ */
/* Safe math helpers — never let NaN / Infinity reach a chart          */
/* ------------------------------------------------------------------ */

export function div(a: number, b: number): number {
  if (!b || !Number.isFinite(b) || !Number.isFinite(a)) return 0;
  const r = a / b;
  return Number.isFinite(r) ? r : 0;
}

export function pct(a: number, b: number): number {
  return round(div(a, b) * 100, 1);
}

export function round(n: number, digits = 1): number {
  if (!Number.isFinite(n)) return 0;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function mean(values: number[]): number {
  const clean = values.filter((v) => Number.isFinite(v));
  return clean.length ? round(clean.reduce((a, b) => a + b, 0) / clean.length, 2) : 0;
}

const d = (s: string | null | undefined): Date | null => {
  if (!s) return null;
  const parsed = new Date(s + (s.length === 10 ? "T00:00:00Z" : ""));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const daysBetween = (a: string | null, b: string | null): number | null => {
  const da = d(a);
  const db = d(b);
  if (!da || !db) return null;
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
};

const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const monthEnd = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59));

export function lastMonths(n: number, end = new Date()): { key: string; label: string; end: Date }[] {
  const out: { key: string; label: string; end: Date }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const cur = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1));
    out.push({
      key: monthKey(cur),
      label: cur.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
      end: monthEnd(cur),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

const inRange = (value: string | null, from?: string | null, to?: string | null) => {
  if (!value) return false;
  if (from && value < from) return false;
  if (to && value > to) return false;
  return true;
};

export function applyFilters(data: Dataset, f: Filters): Dataset {
  const employees = data.employees.filter(
    (e) =>
      (!f.department || e.department === f.department) &&
      (!f.location || e.location === f.location) &&
      (!f.jobRole || e.job_title === f.jobRole) &&
      (!f.employmentType || e.employment_type === f.employmentType),
  );
  const candidates = data.candidates.filter(
    (c) =>
      (!f.department || c.department === f.department) &&
      (!f.location || c.location === f.location) &&
      (!f.jobRole || c.job_title === f.jobRole) &&
      (!f.source || c.source === f.source) &&
      inRange(c.application_date, f.dateFrom, f.dateTo ?? null) !== false,
  );
  const jobs = data.jobs.filter(
    (j) =>
      (!f.department || j.department === f.department) &&
      (!f.location || j.location === f.location) &&
      (!f.jobRole || j.job_title === f.jobRole) &&
      (!f.employmentType || j.employment_type === f.employmentType),
  );
  const targets = data.targets.filter((t) => !f.department || t.department === f.department);
  return { employees, candidates, jobs, targets };
}

/* ------------------------------------------------------------------ */
/* Core workforce metrics                                              */
/* ------------------------------------------------------------------ */

export const isActiveAt = (e: EmployeeRow, at: Date) => {
  const hire = d(e.hire_date);
  if (!hire || hire > at) return false;
  const exit = d(e.exit_date);
  return !exit || exit > at;
};

export function headcountAt(employees: EmployeeRow[], at: Date): number {
  return employees.filter((e) => isActiveAt(e, at)).length;
}

export function headcountSeries(employees: EmployeeRow[], months = 18) {
  return lastMonths(months).map((m) => ({
    label: m.label,
    month: m.label,
    value: headcountAt(employees, m.end),
    headcount: headcountAt(employees, m.end),
  }));
}

export function hiringSeries(employees: EmployeeRow[], months = 18) {
  return lastMonths(months).map((m) => ({
    label: m.label,
    month: m.label,
    value: employees.filter((e) => e.hire_date?.slice(0, 7) === m.key).length,
    hires: employees.filter((e) => e.hire_date?.slice(0, 7) === m.key).length,
  }));
}

export function attritionSeries(employees: EmployeeRow[], months = 18) {
  return lastMonths(months).map((m) => {
    const exits = employees.filter((e) => e.exit_date?.slice(0, 7) === m.key).length;
    const start = new Date(Date.UTC(m.end.getUTCFullYear(), m.end.getUTCMonth(), 1));
    const avgHeadcount = (headcountAt(employees, start) + headcountAt(employees, m.end)) / 2;
    return { label: m.label, month: m.label, exits, rate: pct(exits, avgHeadcount) };
  });
}

/** Attrition rate = exits during period / average headcount during period. */
export function attritionRate(employees: EmployeeRow[], from: Date, to: Date): number {
  const exits = employees.filter((e) => {
    const x = d(e.exit_date);
    return x && x >= from && x <= to;
  }).length;
  const avgHeadcount = (headcountAt(employees, from) + headcountAt(employees, to)) / 2;
  return pct(exits, avgHeadcount);
}

export function tenureYears(e: EmployeeRow, at = new Date()): number {
  const endRef = e.exit_date ? d(e.exit_date) : at;
  const days = daysBetween(e.hire_date, (endRef ?? at).toISOString().slice(0, 10));
  return round((days ?? 0) / 365.25, 2);
}

/* ------------------------------------------------------------------ */
/* Recruitment metrics                                                 */
/* ------------------------------------------------------------------ */

const STAGE_ORDER = ["applied", "screened", "interviewed", "offered", "accepted", "joined"] as const;
export type Stage = (typeof STAGE_ORDER)[number];

export function funnel(candidates: CandidateRow[]) {
  const reached = (stage: Stage) =>
    candidates.filter((c) => STAGE_ORDER.indexOf(c.stage) >= STAGE_ORDER.indexOf(stage)).length;
  const stages = [
    { key: "applied", label: "Applications", count: candidates.length },
    { key: "screened", label: "Screened", count: reached("screened") },
    { key: "interviewed", label: "Interviewed", count: reached("interviewed") },
    { key: "offered", label: "Offered", count: reached("offered") },
    { key: "accepted", label: "Accepted", count: reached("accepted") },
    { key: "joined", label: "Joined", count: reached("joined") },
  ];
  const conversions = stages.slice(1).map((s, i) => ({
    from: stages[i]!.label,
    to: s.label,
    rate: pct(s.count, stages[i]!.count),
  }));
  return { stages, conversions, overall: pct(reached("joined"), candidates.length) };
}

export function timeToHire(candidates: CandidateRow[]): number {
  const values = candidates
    .filter((c) => c.stage === "joined" && c.joined_date)
    .map((c) => daysBetween(c.application_date, c.joined_date))
    .filter((v): v is number => v !== null && v >= 0);
  return values.length ? round(values.reduce((a, b) => a + b, 0) / values.length, 1) : 0;
}

export function offerAcceptanceRate(candidates: CandidateRow[]): number {
  const offers = candidates.filter((c) => STAGE_ORDER.indexOf(c.stage) >= 3).length;
  const accepted = candidates.filter((c) => STAGE_ORDER.indexOf(c.stage) >= 4).length;
  return pct(accepted, offers);
}

export function costPerHire(candidates: CandidateRow[]): number {
  const spend = candidates.reduce((sum, c) => sum + (Number(c.hiring_cost) || 0), 0);
  const hires = candidates.filter((c) => c.stage === "joined").length;
  return Math.round(div(spend, hires));
}

export function sourcePerformance(candidates: CandidateRow[]) {
  const groups = new Map<string, CandidateRow[]>();
  candidates.forEach((c) => {
    const key = c.source || "Unknown";
    groups.set(key, [...(groups.get(key) ?? []), c]);
  });
  const rows = [...groups.entries()].map(([source, list]) => {
    const f = funnel(list);
    return {
      source,
      applications: list.length,
      qualified: f.stages[1]!.count,
      interviews: f.stages[2]!.count,
      offers: f.stages[3]!.count,
      hires: f.stages[5]!.count,
      conversionRate: f.overall,
      acceptanceRate: offerAcceptanceRate(list),
      timeToHire: timeToHire(list),
      costPerHire: costPerHire(list),
      spend: Math.round(list.reduce((s, c) => s + (Number(c.hiring_cost) || 0), 0)),
    };
  });
  rows.sort((a, b) => b.hires - a.hires);
  const withHires = rows.filter((r) => r.hires > 0);
  return {
    rows,
    best: rows[0]?.source ?? null,
    highestConversion: [...rows].sort((a, b) => b.conversionRate - a.conversionRate)[0] ?? null,
    lowestCost: [...withHires].sort((a, b) => a.costPerHire - b.costPerHire)[0] ?? null,
    fastest: [...withHires].sort((a, b) => a.timeToHire - b.timeToHire)[0] ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* Distributions & breakdowns                                          */
/* ------------------------------------------------------------------ */

export function countBy<T>(items: T[], key: (item: T) => string) {
  const map = new Map<string, number>();
  items.forEach((i) => {
    const k = key(i) || "Unspecified";
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export const TENURE_BANDS = [
  { label: "< 1 yr", min: 0, max: 1 },
  { label: "1–2 yrs", min: 1, max: 2 },
  { label: "2–4 yrs", min: 2, max: 4 },
  { label: "4–6 yrs", min: 4, max: 6 },
  { label: "6+ yrs", min: 6, max: Infinity },
];

export function tenureDistribution(employees: EmployeeRow[]) {
  return TENURE_BANDS.map((b) => ({
    name: b.label,
    value: employees.filter((e) => {
      const t = tenureYears(e);
      return t >= b.min && t < b.max;
    }).length,
  }));
}

export function salaryBands(employees: EmployeeRow[]) {
  const bands = [
    { label: "< 50k", min: 0, max: 50_000 },
    { label: "50–75k", min: 50_000, max: 75_000 },
    { label: "75–100k", min: 75_000, max: 100_000 },
    { label: "100–130k", min: 100_000, max: 130_000 },
    { label: "130k+", min: 130_000, max: Infinity },
  ];
  return bands.map((b) => ({
    name: b.label,
    value: employees.filter((e) => Number(e.salary) >= b.min && Number(e.salary) < b.max).length,
  }));
}

export function performanceDistribution(employees: EmployeeRow[]) {
  const buckets = ["1.0–2.0", "2.0–3.0", "3.0–4.0", "4.0–4.5", "4.5–5.0"];
  const bounds = [
    [0, 2],
    [2, 3],
    [3, 4],
    [4, 4.5],
    [4.5, 5.01],
  ];
  return buckets.map((name, i) => ({
    name,
    value: employees.filter((e) => {
      const r = Number(e.performance_rating);
      return Number.isFinite(r) && r >= bounds[i]![0]! && r < bounds[i]![1]!;
    }).length,
  }));
}

/* ------------------------------------------------------------------ */
/* Attrition intelligence                                              */
/* ------------------------------------------------------------------ */

function segmentAttrition<T extends string>(
  employees: EmployeeRow[],
  bucket: (e: EmployeeRow) => T,
) {
  const map = new Map<string, { total: number; exits: number }>();
  employees.forEach((e) => {
    const k = bucket(e);
    const cur = map.get(k) ?? { total: 0, exits: 0 };
    cur.total += 1;
    if (e.attrition_status === "exited") cur.exits += 1;
    map.set(k, cur);
  });
  return [...map.entries()].map(([name, v]) => ({
    name,
    total: v.total,
    exits: v.exits,
    rate: pct(v.exits, v.total),
  }));
}

export function attritionBreakdowns(employees: EmployeeRow[]) {
  const tenureBucket = (e: EmployeeRow) => {
    const t = tenureYears(e);
    return (TENURE_BANDS.find((b) => t >= b.min && t < b.max)?.label ?? "6+ yrs") as string;
  };
  const salaryBucket = (e: EmployeeRow) => {
    const s = Number(e.salary);
    if (s < 50_000) return "< 50k";
    if (s < 75_000) return "50–75k";
    if (s < 100_000) return "75–100k";
    if (s < 130_000) return "100–130k";
    return "130k+";
  };
  const satisfactionBucket = (e: EmployeeRow) => {
    const s = Number(e.satisfaction_score);
    if (!Number.isFinite(s)) return "Unknown";
    if (s < 3) return "Low (<3)";
    if (s < 4) return "Medium (3–4)";
    return "High (4+)";
  };
  const overtimeBucket = (e: EmployeeRow) => {
    const o = Number(e.overtime_hours);
    if (o < 8) return "Low (<8h)";
    if (o < 18) return "Moderate (8–18h)";
    return "High (18h+)";
  };
  const performanceBucket = (e: EmployeeRow) => {
    const p = Number(e.performance_rating);
    if (!Number.isFinite(p)) return "Unknown";
    if (p < 3) return "Below 3.0";
    if (p < 4) return "3.0–4.0";
    return "4.0+";
  };

  return {
    byDepartment: segmentAttrition(employees, (e) => e.department || "Unspecified").sort(
      (a, b) => b.rate - a.rate,
    ),
    byTenure: TENURE_BANDS.map(
      (b) => segmentAttrition(employees, tenureBucket).find((x) => x.name === b.label) ?? {
        name: b.label,
        total: 0,
        exits: 0,
        rate: 0,
      },
    ),
    bySalary: segmentAttrition(employees, salaryBucket),
    bySatisfaction: segmentAttrition(employees, satisfactionBucket),
    byOvertime: segmentAttrition(employees, overtimeBucket),
    byPerformance: segmentAttrition(employees, performanceBucket),
    byPromotions: segmentAttrition(employees, (e) =>
      e.promotion_count === 0 ? "No promotion" : e.promotion_count === 1 ? "1 promotion" : "2+ promotions",
    ),
    byManagerChanges: segmentAttrition(employees, (e) =>
      e.manager_changes === 0 ? "Stable manager" : e.manager_changes === 1 ? "1 change" : "2+ changes",
    ),
    byLocation: segmentAttrition(employees, (e) => e.location || "Unspecified").sort(
      (a, b) => b.rate - a.rate,
    ),
  };
}

export function exitReasonBreakdown(employees: EmployeeRow[]) {
  return countBy(
    employees.filter((e) => e.attrition_status === "exited"),
    (e) => e.exit_reason ?? "Not recorded",
  );
}

/* ------------------------------------------------------------------ */
/* Attrition risk model — logistic regression trained in-app           */
/* ------------------------------------------------------------------ */

const FEATURES = [
  { key: "tenure", label: "Tenure (years)", get: (e: EmployeeRow) => tenureYears(e) },
  { key: "salary", label: "Salary (10k units)", get: (e: EmployeeRow) => Number(e.salary) / 10_000 },
  {
    key: "satisfaction",
    label: "Satisfaction score",
    get: (e: EmployeeRow) => Number(e.satisfaction_score) || 3,
  },
  {
    key: "performance",
    label: "Performance rating",
    get: (e: EmployeeRow) => Number(e.performance_rating) || 3,
  },
  { key: "overtime", label: "Overtime hours", get: (e: EmployeeRow) => Number(e.overtime_hours) || 0 },
  { key: "workload", label: "Workload score", get: (e: EmployeeRow) => Number(e.workload_score) || 5 },
  { key: "promotions", label: "Promotion count", get: (e: EmployeeRow) => e.promotion_count ?? 0 },
  { key: "managerChanges", label: "Manager changes", get: (e: EmployeeRow) => e.manager_changes ?? 0 },
];

export type RiskModel = {
  trained: boolean;
  sampleSize: number;
  accuracy: number;
  baseRate: number;
  insufficientDataMessage?: string;
  importance: { feature: string; weight: number; direction: "increases" | "reduces" }[];
  scores: {
    id: string;
    employee_code: string;
    full_name: string;
    department: string;
    job_title: string;
    tenure: number;
    satisfaction: number;
    overtime: number;
    probability: number;
    band: "Low" | "Medium" | "High";
  }[];
  bands: { name: string; value: number }[];
};

/** Deterministic logistic regression (batch gradient descent, standardised features). */
export function trainAttritionRisk(employees: EmployeeRow[]): RiskModel {
  const empty: RiskModel = {
    trained: false,
    sampleSize: employees.length,
    accuracy: 0,
    baseRate: 0,
    importance: [],
    scores: [],
    bands: [
      { name: "Low", value: 0 },
      { name: "Medium", value: 0 },
      { name: "High", value: 0 },
    ],
  };
  const exits = employees.filter((e) => e.attrition_status === "exited");
  if (employees.length < 60 || exits.length < 15) {
    return {
      ...empty,
      insufficientDataMessage:
        employees.length === 0
          ? "Attrition prediction unavailable — no employee history has been imported yet."
          : employees.length < 60
            ? "Attrition prediction unavailable — insufficient historical data. Upload at least 60 employee records to enable model training."
            : "Attrition prediction unavailable — insufficient historical exit data.",
    };
  }

  const X = employees.map((e) => FEATURES.map((f) => f.get(e)));
  const y = employees.map((e) => (e.attrition_status === "exited" ? 1 : 0));

  const means = FEATURES.map((_, j) => mean(X.map((r) => r[j]!)));
  const sds = FEATURES.map((_, j) => {
    const m = means[j]!;
    const v = mean(X.map((r) => (r[j]! - m) ** 2));
    return Math.sqrt(v) || 1;
  });
  const Z = X.map((r) => r.map((v, j) => (v - means[j]!) / sds[j]!));

  const w = new Array(FEATURES.length).fill(0);
  let b = 0;
  const lr = 0.35;
  const n = Z.length;
  for (let it = 0; it < 400; it++) {
    const grad = new Array(FEATURES.length).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      const z = Z[i]!.reduce((s, v, j) => s + v * w[j]!, b);
      const p = 1 / (1 + Math.exp(-z));
      const err = p - y[i]!;
      for (let j = 0; j < FEATURES.length; j++) grad[j] += err * Z[i]![j]!;
      gb += err;
    }
    for (let j = 0; j < FEATURES.length; j++) w[j] -= (lr * grad[j]!) / n;
    b -= (lr * gb) / n;
  }

  const probability = (row: number[]) => {
    const z = row.reduce((s, v, j) => s + v * w[j]!, b);
    return 1 / (1 + Math.exp(-z));
  };

  const correct = Z.filter((row, i) => (probability(row) >= 0.5 ? 1 : 0) === y[i]).length;

  const active = employees
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.attrition_status === "active");

  const scores = active
    .map(({ e, i }) => {
      const p = probability(Z[i]!);
      return {
        id: e.id,
        employee_code: e.employee_code,
        full_name: e.full_name,
        department: e.department,
        job_title: e.job_title,
        tenure: tenureYears(e),
        satisfaction: Number(e.satisfaction_score) || 0,
        overtime: Number(e.overtime_hours) || 0,
        probability: round(p * 100, 1),
        band: (p >= 0.55 ? "High" : p >= 0.32 ? "Medium" : "Low") as "Low" | "Medium" | "High",
      };
    })
    .sort((a, b2) => b2.probability - a.probability);

  const importance = FEATURES.map((f, j) => ({
    feature: f.label,
    weight: round(Math.abs(w[j]!), 3),
    direction: (w[j]! > 0 ? "increases" : "reduces") as "increases" | "reduces",
  })).sort((a, b2) => b2.weight - a.weight);

  return {
    trained: true,
    sampleSize: employees.length,
    accuracy: pct(correct, n),
    baseRate: pct(exits.length, employees.length),
    importance,
    scores,
    bands: (["Low", "Medium", "High"] as const).map((name) => ({
      name,
      value: scores.filter((s) => s.band === name).length,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Workforce gap analysis                                              */
/* ------------------------------------------------------------------ */

export function workforceGaps(
  employees: EmployeeRow[],
  jobs: JobRow[],
  targets: TargetRow[],
) {
  const departments = [...new Set([...employees.map((e) => e.department), ...targets.map((t) => t.department)])]
    .filter(Boolean)
    .sort();

  return departments
    .map((dept) => {
      const current = employees.filter((e) => e.department === dept && e.attrition_status === "active").length;
      const required =
        targets.find((t) => t.department === dept)?.required_headcount ?? current;
      const openSeats = jobs
        .filter((j) => j.department === dept && (j.status === "open" || j.status === "on_hold"))
        .reduce((s, j) => s + (j.target_hires || 1), 0);
      const projected = current + openSeats;
      const gap = required - current;
      const severity =
        gap <= 0
          ? current - required > 2
            ? "Surplus"
            : "Balanced"
          : div(gap, Math.max(required, 1)) >= 0.15
            ? "Critical"
            : "Moderate";
      return { department: dept, current, required, projected, openSeats, gap, severity };
    })
    .sort((a, b) => b.gap - a.gap);
}

/* ------------------------------------------------------------------ */
/* KPI assembly                                                        */
/* ------------------------------------------------------------------ */

function makeKpi(
  key: string,
  label: string,
  value: number,
  previous: number | null,
  unit: Kpi["unit"],
  goodDirection: Kpi["goodDirection"],
  context: string,
): Kpi {
  const delta = previous === null ? 0 : value - previous;
  return {
    key,
    label,
    value: round(value, unit === "count" ? 0 : 1),
    unit,
    previous: previous === null ? null : round(previous, unit === "count" ? 0 : 1),
    deltaDirection: Math.abs(delta) < 0.05 ? "flat" : delta > 0 ? "up" : "down",
    goodDirection,
    context,
  };
}

export function dashboardKpis(data: Dataset): Kpi[] {
  const now = new Date();
  const qStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  const prevStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const prevEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 0, 23, 59, 59));

  const { employees, candidates, jobs, targets } = data;

  const headcountNow = headcountAt(employees, now);
  const headcountPrev = headcountAt(employees, prevEnd);

  const openPositions = jobs
    .filter((j) => j.status === "open")
    .reduce((s, j) => s + (j.target_hires || 1), 0);
  const openPrev = jobs.filter(
    (j) => j.status !== "open" && j.closing_date && d(j.closing_date)! > prevEnd,
  ).length;

  const inWindow = (date: string | null, from: Date, to: Date) => {
    const x = d(date);
    return !!x && x >= from && x <= to;
  };
  const newHires = employees.filter((e) => inWindow(e.hire_date, qStart, now)).length;
  const newHiresPrev = employees.filter((e) => inWindow(e.hire_date, prevStart, prevEnd)).length;

  const curCandidates = candidates.filter((c) => inWindow(c.application_date, qStart, now));
  const prevCandidates = candidates.filter((c) => inWindow(c.application_date, prevStart, prevEnd));

  const gaps = workforceGaps(employees, jobs, targets);
  const totalGap = gaps.reduce((s, g) => s + Math.max(g.gap, 0), 0);

  return [
    makeKpi("headcount", "Total employees", headcountNow, headcountPrev, "count", "up", "Active employees today"),
    makeKpi("openPositions", "Open positions", openPositions, openPrev || null, "count", "down", "Seats to fill across open reqs"),
    makeKpi("newHires", "New hires", newHires, newHiresPrev, "count", "up", "Joined in the last 3 months"),
    makeKpi(
      "attrition",
      "Attrition rate",
      attritionRate(employees, qStart, now),
      attritionRate(employees, prevStart, prevEnd),
      "percent",
      "down",
      "Exits ÷ average headcount",
    ),
    makeKpi("timeToHire", "Avg time to hire", timeToHire(curCandidates), timeToHire(prevCandidates), "days", "down", "Application to joining"),
    makeKpi(
      "acceptance",
      "Offer acceptance",
      offerAcceptanceRate(curCandidates),
      offerAcceptanceRate(prevCandidates),
      "percent",
      "up",
      "Accepted ÷ offers extended",
    ),
    makeKpi("costPerHire", "Cost per hire", costPerHire(curCandidates), costPerHire(prevCandidates), "currency", "down", "Recruitment spend ÷ hires"),
    makeKpi("gap", "Workforce gap", totalGap, null, "count", "down", "Required minus current headcount"),
  ];
}

/* ------------------------------------------------------------------ */
/* Narrative summaries (deterministic, data-derived)                   */
/* ------------------------------------------------------------------ */

export function workforceSummary(employees: EmployeeRow[]): string {
  const active = employees.filter((e) => e.attrition_status === "active");
  if (!active.length) return "No active employee records match the current filters.";
  const byDept = countBy(active, (e) => e.department);
  const top = byDept[0]!;
  const series = headcountSeries(active.concat(employees.filter((e) => e.attrition_status === "exited")), 7);
  const growth = pct(series.at(-1)!.headcount - series[0]!.headcount, Math.max(series[0]!.headcount, 1));
  const avgTenure = mean(active.map((e) => tenureYears(e)));
  return `${top.name} represents ${pct(top.value, active.length)}% of total headcount (${top.value} of ${active.length}). Overall headcount has ${growth >= 0 ? "grown" : "declined"} ${Math.abs(growth)}% over the last six months, with an average tenure of ${avgTenure} years.`;
}

export function recruitmentSummary(candidates: CandidateRow[], jobs: JobRow[]): string {
  if (!candidates.length) return "No applications match the current filters.";
  const f = funnel(candidates);
  const weakest = [...f.conversions].sort((a, b) => a.rate - b.rate)[0]!;
  const open = jobs.filter((j) => j.status === "open").length;
  return `${candidates.length} applications across ${open} open requisitions converted to ${f.stages[5]!.count} hires (${f.overall}% end-to-end). The largest drop-off is ${weakest.from} → ${weakest.to} at ${weakest.rate}%, with an average time to hire of ${timeToHire(candidates)} days.`;
}

export function attritionSummary(employees: EmployeeRow[]): string {
  if (!employees.length) return "No employee records match the current filters.";
  const b = attritionBreakdowns(employees);
  const worstDept = b.byDepartment[0];
  const overall = pct(employees.filter((e) => e.attrition_status === "exited").length, employees.length);
  const worstTenure = [...b.byTenure].sort((x, y) => y.rate - x.rate)[0];
  if (!worstDept || !worstTenure) return "Not enough data to summarise attrition.";
  return `Historical attrition across the filtered population is ${overall}%. ${worstDept.name} is highest at ${worstDept.rate}% (${round(worstDept.rate - overall, 1)} pts above average), and exits concentrate in the ${worstTenure.name} tenure band at ${worstTenure.rate}%.`;
}

export const gapAnalysis = workforceGaps;

export function gapSummary(gaps: ReturnType<typeof workforceGaps>): string {
  if (!gaps.length) return "No workforce target data available.";
  const critical = gaps.filter((g) => g.severity === "Critical");
  const topCritical = critical[0] || gaps[0];
  const totalGap = gaps.reduce((sum, g) => sum + Math.max(g.gap, 0), 0);
  return `Across all departments, total capacity gap is ${totalGap} required seats. ${topCritical?.department ?? "Engineering"} has the most severe headcount deficit (${Math.abs(topCritical?.gap ?? 0)} seats short of target).`;
}
