import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Download, Printer, FileSpreadsheet, Calendar, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/talent/app-shell";
import { FilterBar } from "@/components/talent/filter-bar";
import { useAnalytics } from "@/lib/analytics/store";
import { headcountAt, timeToHire, offerAcceptanceRate, pct } from "@/lib/analytics/compute";
import { exportToCsv } from "@/lib/analytics/export";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/reports")({
    head: () => ({
        meta: [
            { title: "Reports & Export Center — TalentLens" },
            {
                name: "description",
                content: "Generate executive workforce reports, export datasets, and print analytical summaries.",
            },
        ],
    }),
    component: ReportsPage,
});

export function ReportsPage() {
    const { data, options, isLoading } = useAnalytics();
    const [selectedReport, setSelectedReport] = useState<"executive" | "recruitment" | "attrition" | "gap">("executive");

    const activeCount = useMemo(() => headcountAt(data.employees, new Date()), [data.employees]);
    const avgTimeToHire = useMemo(() => timeToHire(data.candidates), [data.candidates]);
    const acceptanceRate = useMemo(() => offerAcceptanceRate(data.candidates), [data.candidates]);
    const reportPeriod = useMemo(() => {
        const periods = [...new Set(data.targets.map((target) => target.period).filter(Boolean))];
        return periods.length ? periods.join(", ") : "Current workspace";
    }, [data.targets]);

    const handleExportCsv = (type: string) => {
        if (type === "employees") {
            exportToCsv(data.employees, "talentlens_employees.csv");
        } else if (type === "jobs") {
            exportToCsv(data.jobs, "talentlens_jobs.csv");
        } else if (type === "candidates") {
            exportToCsv(data.candidates, "talentlens_candidates.csv");
        }
        toast.success(`Exported ${type} dataset as CSV.`);
    };

    const handlePrintReport = () => {
        window.print();
    };

    return (
        <AppShell
            title="Reports & Export Center"
            description="Generate executive workforce briefings, download raw CSV datasets, and print reports"
        >
            <FilterBar options={options} show={["department", "location"]} />

            <div className="space-y-6">
                {/* Export Quick Actions */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => handleExportCsv("employees")}>
                        <CardHeader className="pb-2">
                            <FileSpreadsheet className="size-5 text-primary" />
                            <CardTitle className="text-sm">Export Employees Dataset</CardTitle>
                            <CardDescription>{data.employees.length} records • Full attributes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                                <Download className="size-3.5" /> Download CSV
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => handleExportCsv("jobs")}>
                        <CardHeader className="pb-2">
                            <FileSpreadsheet className="size-5 text-primary" />
                            <CardTitle className="text-sm">Export Job Requisitions</CardTitle>
                            <CardDescription>{data.jobs.length} requisitions • Status &amp; targets</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                                <Download className="size-3.5" /> Download CSV
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => handleExportCsv("candidates")}>
                        <CardHeader className="pb-2">
                            <FileSpreadsheet className="size-5 text-primary" />
                            <CardTitle className="text-sm">Export Candidates Pipeline</CardTitle>
                            <CardDescription>{data.candidates.length} applications • Stages &amp; costs</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                                <Download className="size-3.5" /> Download CSV
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Executive Report Preview Document */}
                <Card className="border-border">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-border pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">Generated Report</Badge>
                                <span className="text-xs text-muted-foreground">Period: {reportPeriod}</span>
                            </div>
                            <CardTitle className="text-xl mt-1">Executive Workforce Briefing</CardTitle>
                            <CardDescription>Comprehensive workforce, recruitment, and attrition intelligence report</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={handlePrintReport} className="gap-2 text-xs">
                                <Printer className="size-3.5" /> Print / Save PDF
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6 text-sm">
                        {/* KPI Summary Block */}
                        <div className="grid grid-cols-4 gap-4 rounded-xl bg-muted/40 p-4 text-center">
                            <div>
                                <div className="text-xs text-muted-foreground">Active Workforce</div>
                                <div className="text-xl font-bold font-mono">{activeCount}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Requisitions Open</div>
                                <div className="text-xl font-bold font-mono">{data.jobs.filter((j) => j.status === "open").length}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Time-to-Hire</div>
                                <div className="text-xl font-bold font-mono">{avgTimeToHire} days</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground">Offer Acceptance</div>
                                <div className="text-xl font-bold font-mono text-primary">{acceptanceRate}%</div>
                            </div>
                        </div>

                        {/* Key Findings Section */}
                        <div className="space-y-3">
                            <h4 className="font-semibold text-base border-b border-border pb-2">1. Executive Summary &amp; Key Findings</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                TalentLens analyzed workspace metrics across {data.employees.length} employee records and {data.candidates.length} candidate applications. Staff capacity remains stable with an active workforce count of {activeCount}. Recruitment pipeline efficiency shows an average time-to-hire of {avgTimeToHire} days.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-base border-b border-border pb-2">2. Strategic Recommendations</h4>
                            <ul className="space-y-2 text-xs text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>
                                        {data.candidates.length > 0
                                            ? "Expand Employee Referral channel incentives to lower candidate acquisition cost per hire."
                                            : "Import candidate applications dataset in Data Management to evaluate channel efficiency."}
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <span>
                                        {data.targets.length > 0
                                            ? "Prioritize open requisitions in high-shortage units to address department headcount gaps."
                                            : "Define department target headcount requirements in Data Management to analyze capacity gaps."}
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    );
}
