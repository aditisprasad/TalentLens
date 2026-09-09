import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Lightbulb, Target, AlertCircle, CheckCircle2, TrendingUp, Users, ArrowUpRight } from "lucide-react";

import { AppShell } from "@/components/talent/app-shell";
import { FilterBar } from "@/components/talent/filter-bar";
import { Bars } from "@/components/talent/charts";
import {
    ChartCard,
    EmptyState,
    InsightNote,
    KpiCard,
    LoadingGrid,
    StatusBadge,
} from "@/components/talent/primitives";
import { useAnalytics } from "@/lib/analytics/store";
import { gapAnalysis, gapSummary, pct } from "@/lib/analytics/compute";
import type { Kpi } from "@/lib/analytics/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/gap-analysis")({
    head: () => ({
        meta: [
            { title: "Workforce Gap Analysis — TalentLens" },
            {
                name: "description",
                content: "Headcount gap analysis: current vs target vs projected workforce capacity.",
            },
        ],
    }),
    component: GapAnalysisPage,
});

function GapAnalysisPage() {
    const { data, options, isLoading, isError, error, isEmpty } = useAnalytics();

    const view = useMemo(() => {
        const gaps = gapAnalysis(data.employees, data.jobs, data.targets);

        const totalTarget = gaps.reduce((sum: number, g) => sum + g.required, 0);
        const totalCurrent = gaps.reduce((sum: number, g) => sum + g.current, 0);
        const totalProjected = gaps.reduce((sum: number, g) => sum + g.projected, 0);

        const criticalDepts = gaps.filter((g) => g.severity === "Critical").length;
        const moderateDepts = gaps.filter((g) => g.severity === "Moderate").length;

        const kpis: Kpi[] = [
            {
                key: "targetHeadcount",
                label: "Target Headcount",
                value: totalTarget,
                unit: "count",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "up",
                context: "Required across departments",
            },
            {
                key: "currentHeadcount",
                label: "Current Headcount",
                value: totalCurrent,
                unit: "count",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "up",
                context: "Active employed staff",
            },
            {
                key: "projectedHeadcount",
                label: "Projected Headcount",
                value: totalProjected,
                unit: "count",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "up",
                context: "Current + open requisitions",
            },
            {
                key: "criticalGapCount",
                label: "Critical Shortage Units",
                value: criticalDepts,
                unit: "count",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "down",
                context: `${moderateDepts} units in moderate gap`,
            },
        ];

        return {
            kpis,
            gaps,
            note: gapSummary(gaps),
        };
    }, [data]);

    return (
        <AppShell
            title="Workforce Gap Analysis"
            description="Compare required vs current vs projected capacity per department"
        >
            <FilterBar options={options} show={["department", "location"]} />

            {isLoading ? (
                <LoadingGrid />
            ) : isError ? (
                <EmptyState
                    title="We couldn't load gap analysis"
                    description={error instanceof Error ? error.message : "Please try refreshing."}
                />
            ) : data.targets.length === 0 ? (
                <EmptyState
                    title="No workforce targets uploaded"
                    description="Import department headcount targets to see workforce gap analysis."
                />
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {view.kpis.map((k) => (
                            <KpiCard key={k.key} kpi={k} />
                        ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <ChartCard title="Current vs Target Headcount" description="Capacity comparison per department">
                            <Bars
                                data={view.gaps.map((g) => ({ name: g.department, value: g.current }))}
                                height={280}
                                color="var(--color-chart-1)"
                            />
                        </ChartCard>

                        <ChartCard title="Net Shortage / Surplus" description="Headcount variance against requirement target">
                            <Bars
                                data={view.gaps.map((g) => ({ name: g.department, value: g.gap }))}
                                height={280}
                                color="var(--color-chart-4)"
                            />
                        </ChartCard>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5">
                        <h3 className="mb-1 font-semibold text-base">Department Capacity &amp; Severity Breakdown</h3>
                        <p className="mb-4 text-xs text-muted-foreground">
                            Evaluates current staffing and live hiring requisitions against Q3 headcount requirements.
                        </p>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Department</TableHead>
                                        <TableHead className="text-right">Current Active</TableHead>
                                        <TableHead className="text-right">Open Requisitions</TableHead>
                                        <TableHead className="text-right">Projected Staff</TableHead>
                                        <TableHead className="text-right">Required Target</TableHead>
                                        <TableHead className="text-right">Net Gap</TableHead>
                                        <TableHead className="text-right">Gap %</TableHead>
                                        <TableHead>Severity Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {view.gaps.map((g) => (
                                        <TableRow key={g.department}>
                                            <TableCell className="font-semibold">{g.department}</TableCell>
                                            <TableCell className="text-right font-mono">{g.current}</TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">+{g.openSeats}</TableCell>
                                            <TableCell className="text-right font-mono font-medium">{g.projected}</TableCell>
                                            <TableCell className="text-right font-mono">{g.required}</TableCell>
                                            <TableCell className={`text-right font-mono font-bold ${g.gap > 0 ? "text-destructive" : "text-emerald-600"}`}>
                                                {g.gap > 0 ? `+${g.gap}` : g.gap}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{pct(g.gap, g.required)}%</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        g.severity === "Critical" ? "destructive"
                                                            : g.severity === "Moderate" ? "secondary"
                                                                : "outline"
                                                    }
                                                    className="text-xs"
                                                >
                                                    {g.severity}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <InsightNote icon={Lightbulb} text={view.note} />
                </>
            )}
        </AppShell>
    );
}
