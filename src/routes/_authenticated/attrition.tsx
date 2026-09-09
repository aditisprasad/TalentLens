import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Lightbulb, AlertTriangle, Brain, ShieldAlert, CheckCircle2, TrendingDown, Info, Search } from "lucide-react";

import { AppShell } from "@/components/talent/app-shell";
import { FilterBar } from "@/components/talent/filter-bar";
import { Bars, Donut, LineTrend } from "@/components/talent/charts";
import {
    ChartCard,
    EmptyState,
    InsightNote,
    KpiCard,
    LoadingGrid,
    StatusBadge,
} from "@/components/talent/primitives";
import { useAnalytics } from "@/lib/analytics/store";
import {
    attritionBreakdowns,
    attritionRate,
    attritionSeries,
    attritionSummary,
    exitReasonBreakdown,
    trainAttritionRisk,
    pct,
    round,
} from "@/lib/analytics/compute";
import type { EmployeeRow, Kpi } from "@/lib/analytics/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/attrition")({
    head: () => ({
        meta: [
            { title: "Attrition Intelligence — TalentLens" },
            {
                name: "description",
                content: "Attrition analytics, exit reasons, and explainable ML attrition-risk scoring model.",
            },
        ],
    }),
    component: AttritionPage,
});

function AttritionPage() {
    const { data, options, isLoading, isError, error, isEmpty } = useAnalytics();
    const [activeTab, setActiveTab] = useState<"breakdown" | "model" | "at_risk">("breakdown");
    const [searchTerm, setSearchTerm] = useState("");
    const [riskBandFilter, setRiskBandFilter] = useState<string>("all");
    const [selectedRiskEmp, setSelectedRiskEmp] = useState<EmployeeRow | null>(null);

    const view = useMemo(() => {
        const totalEmp = data.employees.length;
        const exitedEmp = data.employees.filter((e) => e.attrition_status === "exited");
        const activeEmp = data.employees.filter((e) => e.attrition_status === "active");

        const overallRate = pct(exitedEmp.length, totalEmp);

        const voluntaryCount = exitedEmp.filter((e) => e.exit_type === "voluntary").length;
        const involuntaryCount = exitedEmp.filter((e) => e.exit_type === "involuntary").length;

        const volRate = pct(voluntaryCount, totalEmp);
        const involRate = pct(involuntaryCount, totalEmp);

        const kpis: Kpi[] = [
            {
                key: "overallRate",
                label: "Overall Attrition Rate",
                value: overallRate,
                unit: "percent",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "down",
                context: `${exitedEmp.length} total departures out of ${totalEmp} employees`,
            },
            {
                key: "volRate",
                label: "Voluntary Attrition",
                value: volRate,
                unit: "percent",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "down",
                context: `${voluntaryCount} resignations / career moves`,
            },
            {
                key: "involRate",
                label: "Involuntary Attrition",
                value: involRate,
                unit: "percent",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "down",
                context: `${involuntaryCount} terminations / restructures`,
            },
            {
                key: "activeStaff",
                label: "Active Staff Retained",
                value: activeEmp.length,
                unit: "count",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "up",
                context: "Currently active team members",
            },
        ];

        const series = attritionSeries(data.employees, 18);
        const breakdowns = attritionBreakdowns(data.employees);
        const exitReasons = exitReasonBreakdown(data.employees);
        const riskModel = trainAttritionRisk(data.employees);

        return {
            kpis,
            series,
            breakdowns,
            exitReasons,
            riskModel,
            note: attritionSummary(data.employees),
        };
    }, [data]);

    // Compute specific explainable risk factors for an employee
    const getContributingFactors = (emp: EmployeeRow) => {
        const factors: string[] = [];
        const sat = Number(emp.satisfaction_score);
        const ot = Number(emp.overtime_hours);
        const promos = emp.promotion_count;
        const mgrChanges = emp.manager_changes;
        const perf = Number(emp.performance_rating);

        if (sat > 0 && sat < 3.2) {
            factors.push(`Low satisfaction score (${sat} / 5.0)`);
        }
        if (ot > 15) {
            factors.push(`High overtime volume (${ot} hrs/month)`);
        }
        if (promos === 0) {
            factors.push(`No promotions recorded during tenure`);
        }
        if (mgrChanges >= 2) {
            factors.push(`Multiple manager changes (${mgrChanges} reassignments)`);
        }
        if (perf > 0 && perf < 3.0) {
            factors.push(`Below-target performance rating (${perf} / 5.0)`);
        }
        const deptBreakdown = view.breakdowns.byDepartment.find((b) => b.name === emp.department);
        if (deptBreakdown && deptBreakdown.rate > 20) {
            factors.push(`Elevated department attrition in ${emp.department} (${deptBreakdown.rate}%)`);
        }

        if (factors.length === 0) {
            factors.push("Standard tenure pattern with balanced workload metrics");
        }

        return factors;
    };

    // Filtered high-risk employee list
    const filteredRiskScores = useMemo(() => {
        return view.riskModel.scores.filter((s) => {
            const matchesSearch =
                !searchTerm ||
                s.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.job_title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesBand = riskBandFilter === "all" || s.band === riskBandFilter;
            return matchesSearch && matchesBand;
        });
    }, [view.riskModel.scores, searchTerm, riskBandFilter]);

    return (
        <AppShell
            title="Attrition Intelligence & Risk Model"
            description="Historical exit patterns, root causes, and explainable ML attrition-risk scoring"
        >
            <FilterBar options={options} show={["department", "location", "jobRole", "employmentType"]} />

            {isLoading ? (
                <LoadingGrid />
            ) : isError ? (
                <EmptyState
                    title="We couldn't load attrition data"
                    description={error instanceof Error ? error.message : "Please try refreshing."}
                />
            ) : data.employees.filter((employee) => employee.attrition_status === "exited").length === 0 ? (
                <EmptyState
                    title="No historical attrition data available"
                    description="Import employee records with persisted exit dates and exit types to calculate attrition intelligence."
                />
            ) : (
                <>
                    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                        <span className="font-semibold">MODEL NOTICE:</span> Attrition Risk Scores represent an explainable classification model trained directly on your imported employee dataset. It provides risk indicator scores for proactive retention interventions.
                    </div>

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="breakdown">Exit Analytics &amp; Drivers</TabsTrigger>
                            <TabsTrigger value="at_risk">Explainable Attrition Risk List ({view.riskModel.scores.length})</TabsTrigger>
                            <TabsTrigger value="model">ML Model Evaluation &amp; Pipeline</TabsTrigger>
                        </TabsList>

                        {/* TAB 1: BREAKDOWN */}
                        <TabsContent value="breakdown" className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {view.kpis.map((k) => (
                                    <KpiCard key={k.key} kpi={k} />
                                ))}
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <ChartCard title="Monthly Attrition Trend" description="Exit rate (% of active staff) over time">
                                    <LineTrend
                                        data={view.series}
                                        series={[{ key: "rate", label: "Attrition Rate (%)", color: "var(--color-chart-4)" }]}
                                    />
                                </ChartCard>

                                <ChartCard title="Attrition Rate by Department" description="Highest risk units">
                                    <Bars
                                        data={view.breakdowns.byDepartment.map((d) => ({ name: d.name, value: d.rate }))}
                                        height={260}
                                        unit="%"
                                        color="var(--color-chart-4)"
                                    />
                                </ChartCard>

                                <ChartCard title="Attrition by Tenure Band" description="Years of service before exit">
                                    <Bars
                                        data={view.breakdowns.byTenure.map((t) => ({ name: t.name, value: t.rate }))}
                                        layout="horizontal"
                                        height={260}
                                        unit="%"
                                        color="var(--color-chart-2)"
                                    />
                                </ChartCard>

                                <ChartCard title="Primary Exit Reasons" description="Documented departure factors">
                                    <Donut data={view.exitReasons} />
                                </ChartCard>

                                <ChartCard title="Attrition by Satisfaction Level" description="Employee survey rating bands">
                                    <Bars
                                        data={view.breakdowns.bySatisfaction.map((s) => ({ name: s.name, value: s.rate }))}
                                        layout="horizontal"
                                        height={260}
                                        unit="%"
                                        color="var(--color-chart-5)"
                                    />
                                </ChartCard>

                                <ChartCard title="Attrition by Overtime Volume" description="Monthly overtime hours">
                                    <Bars
                                        data={view.breakdowns.byOvertime.map((o) => ({ name: o.name, value: o.rate }))}
                                        layout="horizontal"
                                        height={260}
                                        unit="%"
                                        color="var(--color-chart-1)"
                                    />
                                </ChartCard>
                            </div>

                            <InsightNote icon={Lightbulb} text={view.note} />
                        </TabsContent>

                        {/* TAB 2: AT-RISK EMPLOYEES */}
                        <TabsContent value="at_risk" className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="relative w-full max-w-sm">
                                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search active employee code, name, department..."
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Filter Risk Level:</span>
                                    <select
                                        className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                                        value={riskBandFilter}
                                        onChange={(e) => setRiskBandFilter(e.target.value)}
                                    >
                                        <option value="all">All Risk Bands</option>
                                        <option value="High">High Risk (&ge;55%)</option>
                                        <option value="Medium">Medium Risk (32–54%)</option>
                                        <option value="Low">Low Risk (&lt;32%)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-3">
                                <ChartCard title="Risk Score Distribution" description="Active employee classification count">
                                    <Donut data={view.riskModel.bands} />
                                </ChartCard>

                                <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 space-y-3">
                                    <h3 className="font-semibold text-base">Key Risk Indicators in Model</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Feature weights derived via logistic regression on historical exit records.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        {view.riskModel.importance.slice(0, 4).map((f) => (
                                            <div key={f.feature} className="rounded-lg border border-border p-3">
                                                <div className="text-xs text-muted-foreground">{f.feature}</div>
                                                <div className="mt-1 flex items-center justify-between">
                                                    <span className="font-mono text-sm font-bold">{f.weight} weight</span>
                                                    <Badge variant={f.direction === "increases" ? "destructive" : "outline"} className="text-[10px]">
                                                        {f.direction === "increases" ? "+ Increases Risk" : "- Reduces Risk"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Employee Code</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead className="text-right">Tenure</TableHead>
                                            <TableHead className="text-right">Satisfaction</TableHead>
                                            <TableHead className="text-right">Overtime</TableHead>
                                            <TableHead className="text-right">Attrition Risk Score</TableHead>
                                            <TableHead>Risk Band</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRiskScores.slice(0, 50).map((s) => {
                                            const empRecord = data.employees.find((e) => e.id === s.id);
                                            return (
                                                <TableRow
                                                    key={s.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => empRecord && setSelectedRiskEmp(empRecord)}
                                                >
                                                    <TableCell className="font-mono text-xs font-medium">{s.employee_code}</TableCell>
                                                    <TableCell className="font-semibold">{s.full_name}</TableCell>
                                                    <TableCell>{s.department}</TableCell>
                                                    <TableCell className="text-muted-foreground">{s.job_title}</TableCell>
                                                    <TableCell className="text-right font-mono">{s.tenure} yrs</TableCell>
                                                    <TableCell className="text-right font-mono">{s.satisfaction} / 5</TableCell>
                                                    <TableCell className="text-right font-mono">{s.overtime} h</TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-primary">{s.probability}%</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={s.band === "High" ? "destructive" : s.band === "Medium" ? "secondary" : "outline"}
                                                            className="text-xs"
                                                        >
                                                            {s.band} Risk
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        {/* TAB 3: MODEL EVALUATION */}
                        <TabsContent value="model" className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-4">
                                <div className="rounded-xl border border-border bg-card p-4">
                                    <div className="text-xs text-muted-foreground">Model Status</div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <CheckCircle2 className="size-4 text-emerald-600" />
                                        <span className="font-bold">{view.riskModel.trained ? "Trained & Active" : "Untrained"}</span>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border bg-card p-4">
                                    <div className="text-xs text-muted-foreground">Dataset Sample Size</div>
                                    <div className="mt-1 font-mono text-2xl font-bold">{view.riskModel.sampleSize} records</div>
                                </div>

                                <div className="rounded-xl border border-border bg-card p-4">
                                    <div className="text-xs text-muted-foreground">Model Accuracy</div>
                                    <div className="mt-1 font-mono text-2xl font-bold text-primary">{view.riskModel.accuracy}%</div>
                                </div>

                                <div className="rounded-xl border border-border bg-card p-4">
                                    <div className="text-xs text-muted-foreground">Historical Base Exit Rate</div>
                                    <div className="mt-1 font-mono text-2xl font-bold">{view.riskModel.baseRate}%</div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-card p-5">
                                <h3 className="mb-2 font-semibold text-base">Model Feature Importance</h3>
                                <p className="mb-4 text-xs text-muted-foreground">
                                    Standardised regression coefficients trained on employee attributes.
                                </p>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Feature Name</TableHead>
                                            <TableHead className="text-right">Weight (Coefficient)</TableHead>
                                            <TableHead>Impact Direction</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {view.riskModel.importance.map((f) => (
                                            <TableRow key={f.feature}>
                                                <TableCell className="font-medium">{f.feature}</TableCell>
                                                <TableCell className="text-right font-mono font-semibold">{f.weight}</TableCell>
                                                <TableCell>
                                                    <Badge variant={f.direction === "increases" ? "destructive" : "outline"} className="text-xs">
                                                        {f.direction === "increases" ? "+ Increases Attrition Risk" : "- Reduces Attrition Risk"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Contributing Factors Employee Dialog */}
                    {selectedRiskEmp ? (
                        <Dialog open={!!selectedRiskEmp} onOpenChange={() => setSelectedRiskEmp(null)}>
                            <DialogContent className="max-w-lg">
                                <DialogHeader>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs text-muted-foreground">{selectedRiskEmp.employee_code}</span>
                                        <Badge variant="outline" className="capitalize">{selectedRiskEmp.attrition_status}</Badge>
                                    </div>
                                    <DialogTitle className="text-xl font-bold">{selectedRiskEmp.full_name}</DialogTitle>
                                    <DialogDescription>
                                        {selectedRiskEmp.job_title} • {selectedRiskEmp.department} • {selectedRiskEmp.location}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4 text-sm">
                                    <div className="rounded-xl bg-muted/40 p-4 space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tenure:</span>
                                            <span className="font-semibold">{round((new Date().getTime() - new Date(selectedRiskEmp.hire_date).getTime()) / (365.25 * 86400000), 1)} years</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Satisfaction Score:</span>
                                            <span className="font-semibold">{selectedRiskEmp.satisfaction_score ?? "N/A"} / 5.0</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Overtime Volume:</span>
                                            <span className="font-semibold">{selectedRiskEmp.overtime_hours} hrs/month</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Manager Changes:</span>
                                            <span className="font-semibold">{selectedRiskEmp.manager_changes} changes</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Promotions Received:</span>
                                            <span className="font-semibold">{selectedRiskEmp.promotion_count}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
                                            Contributing Risk Factors (Explainable Model Output)
                                        </h4>
                                        <div className="space-y-2">
                                            {getContributingFactors(selectedRiskEmp).map((factor, idx) => (
                                                <div key={idx} className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-xs text-amber-950 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-200">
                                                    <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                                                    <span>{factor}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    ) : null}
                </>
            )}
        </AppShell>
    );
}
