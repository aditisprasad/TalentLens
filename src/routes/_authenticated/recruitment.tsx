import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Lightbulb, Search, Filter, Briefcase, UserCheck, ArrowRight, DollarSign, Clock, Award } from "lucide-react";

import { AppShell } from "@/components/talent/app-shell";
import { FilterBar } from "@/components/talent/filter-bar";
import { Bars, Donut, FunnelBars, LineTrend } from "@/components/talent/charts";
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
    countBy,
    funnel,
    offerAcceptanceRate,
    recruitmentSummary,
    sourcePerformance,
    timeToHire,
    round,
    pct,
} from "@/lib/analytics/compute";
import type { CandidateRow, JobRow, Kpi } from "@/lib/analytics/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/recruitment")({
    head: () => ({
        meta: [
            { title: "Recruitment Intelligence — TalentLens" },
            {
                name: "description",
                content: "Recruitment overview, hiring funnel, source performance, job openings, and candidate pipeline.",
            },
        ],
    }),
    component: RecruitmentPage,
});

function RecruitmentPage() {
    const { data, options, isLoading, isError, error, isEmpty } = useAnalytics();
    const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "candidates">("overview");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedJob, setSelectedJob] = useState<JobRow | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<CandidateRow | null>(null);
    const [candidateStageFilter, setCandidateStageFilter] = useState<string>("all");
    const [currentPage, setCurrentPage] = useState(1);

    const view = useMemo(() => {
        const fn = funnel(data.candidates);
        const sources = sourcePerformance(data.candidates);
        const openJobs = data.jobs.filter((j) => j.status === "open");

        const totalOpenings = openJobs.reduce((sum, j) => sum + (j.target_hires || 1), 0);
        const totalApps = data.candidates.length;
        const screened = fn.stages.find((s) => s.key === "screened")?.count ?? 0;
        const interviewed = fn.stages.find((s) => s.key === "interviewed")?.count ?? 0;
        const offered = fn.stages.find((s) => s.key === "offered")?.count ?? 0;
        const accepted = fn.stages.find((s) => s.key === "accepted")?.count ?? 0;
        const joined = fn.stages.find((s) => s.key === "joined")?.count ?? 0;

        const avgTimeToHire = timeToHire(data.candidates);
        const acceptanceRate = offerAcceptanceRate(data.candidates);

        const appToInterview = pct(interviewed, totalApps);
        const interviewToOffer = pct(offered, interviewed);
        const offerToJoin = pct(joined, offered);

        const kpis: Kpi[] = [
            {
                key: "openJobs",
                label: "Total Open Positions",
                value: totalOpenings,
                unit: "count",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "down",
                context: `${openJobs.length} active requisitions`,
            },
            {
                key: "totalApps",
                label: "Total Applications",
                value: totalApps,
                unit: "count",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "up",
                context: "Across all active openings",
            },
            {
                key: "timeToHire",
                label: "Time-to-Hire",
                value: avgTimeToHire,
                unit: "days",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "down",
                context: "Average application to join",
            },
            {
                key: "acceptanceRate",
                label: "Offer Acceptance Rate",
                value: acceptanceRate,
                unit: "percent",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "up",
                context: `${accepted} accepted out of ${offered} offers`,
            },
            {
                key: "appToInterview",
                label: "App → Interview",
                value: appToInterview,
                unit: "percent",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "up",
                context: "Screening pass rate",
            },
            {
                key: "interviewToOffer",
                label: "Interview → Offer",
                value: interviewToOffer,
                unit: "percent",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "up",
                context: "Assessment pass rate",
            },
            {
                key: "offerToJoin",
                label: "Offer → Joined",
                value: offerToJoin,
                unit: "percent",
                previous: null,
                deltaDirection: "flat",
                goodDirection: "up",
                context: "Final onboarding rate",
            },
        ];

        const jobsByDept = countBy(data.jobs, (j) => j.department);
        const appsByDept = countBy(data.candidates, (c) => c.department);

        return {
            kpis,
            funnel: fn,
            sources,
            jobsByDept,
            appsByDept,
            screened,
            interviewed,
            offered,
            accepted,
            joined,
            note: recruitmentSummary(data.candidates, data.jobs),
        };
    }, [data]);

    // Job Opening Details helper
    const getJobDetail = (job: JobRow) => {
        const jobApps = data.candidates.filter(
            (c) => c.job_title === job.job_title && c.department === job.department,
        );
        const jFunnel = funnel(jobApps);
        const openDate = new Date(job.opening_date);
        const timeOpen = Math.round((new Date().getTime() - openDate.getTime()) / 86400000);
        const filledHires = jobApps.filter((c) => c.stage === "joined").length;
        const progressPct = pct(filledHires, job.target_hires);
        return { jobApps, jFunnel, timeOpen, filledHires, progressPct };
    };

    // Filtered Candidate List
    const filteredCandidates = useMemo(() => {
        return data.candidates.filter((c) => {
            const matchesSearch =
                !searchTerm ||
                c.candidate_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.department.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStage = candidateStageFilter === "all" || c.stage === candidateStageFilter;
            return matchesSearch && matchesStage;
        });
    }, [data.candidates, searchTerm, candidateStageFilter]);

    // Paginated Candidate List
    const pageSize = 15;
    const totalPages = Math.ceil(filteredCandidates.length / pageSize) || 1;
    const paginatedCandidates = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredCandidates.slice(start, start + pageSize);
    }, [filteredCandidates, currentPage]);

    return (
        <AppShell
            title="Recruitment Intelligence"
            description="Funnel conversion, source efficiency, requisitions and candidate tracking"
        >
            <FilterBar options={options} show={["department", "location", "jobRole", "source"]} />

            {isLoading ? (
                <LoadingGrid />
            ) : isError ? (
                <EmptyState
                    title="We couldn't load recruitment data"
                    description={error instanceof Error ? error.message : "Please try refreshing."}
                />
            ) : data.candidates.length === 0 ? (
                <EmptyState
                    title="No recruitment data available"
                    description="Import candidate application records in Data Management to view recruitment analytics."
                />
            ) : (
                <>
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="overview">Recruitment Overview</TabsTrigger>
                            <TabsTrigger value="jobs">Job Openings ({data.jobs.length})</TabsTrigger>
                            <TabsTrigger value="candidates">Candidate Pipeline ({data.candidates.length})</TabsTrigger>
                        </TabsList>

                        {/* TAB 1: OVERVIEW */}
                        <TabsContent value="overview" className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                                {view.kpis.map((k) => (
                                    <KpiCard key={k.key} kpi={k} />
                                ))}
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <ChartCard
                                    title="Recruitment Funnel"
                                    description={`Overall conversion: ${view.funnel.overall}% from application to joined`}
                                >
                                    <FunnelBars stages={view.funnel.stages} />
                                </ChartCard>

                                <ChartCard
                                    title="Source Performance"
                                    description="Candidate quality and conversion by channel"
                                >
                                    <Bars
                                        data={view.sources.rows.map((s) => ({
                                            name: s.source,
                                            value: s.conversionRate,
                                        }))}
                                        height={260}
                                        unit="%"
                                        color="var(--color-chart-1)"
                                    />
                                </ChartCard>

                                <ChartCard title="Openings by Department" description="Job requisition distribution">
                                    <Donut data={view.jobsByDept} />
                                </ChartCard>

                                <ChartCard title="Applications by Department" description="Candidate volume distribution">
                                    <Bars data={view.appsByDept} height={260} color="var(--color-chart-3)" />
                                </ChartCard>
                            </div>

                            {/* Source Performance Detailed Table */}
                            <div className="rounded-xl border border-border bg-card p-5">
                                <h3 className="mb-1 text-base font-semibold">Source Performance Breakdown</h3>
                                <p className="mb-4 text-xs text-muted-foreground">
                                    Channel performance calculated directly from {data.candidates.length} application records.
                                </p>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Source</TableHead>
                                                <TableHead className="text-right">Applications</TableHead>
                                                <TableHead className="text-right">Interviews</TableHead>
                                                <TableHead className="text-right">Offers</TableHead>
                                                <TableHead className="text-right">Hires</TableHead>
                                                <TableHead className="text-right">Conversion %</TableHead>
                                                <TableHead className="text-right">Time-to-Hire</TableHead>
                                                <TableHead className="text-right">Cost / Hire</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {view.sources.rows.map((s) => (
                                                <TableRow key={s.source}>
                                                    <TableCell className="font-medium">{s.source}</TableCell>
                                                    <TableCell className="text-right font-mono">{s.applications.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-mono">{s.interviews.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-mono">{s.offers.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-mono">{s.hires.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-mono text-primary font-semibold">{s.conversionRate}%</TableCell>
                                                    <TableCell className="text-right font-mono">{s.timeToHire} days</TableCell>
                                                    <TableCell className="text-right font-mono">${s.costPerHire.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <InsightNote icon={Lightbulb} text={view.note} />
                        </TabsContent>

                        {/* TAB 2: JOB OPENINGS */}
                        <TabsContent value="jobs" className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="relative w-full max-w-sm">
                                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by job title, department..."
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <Badge variant="outline" className="text-xs">
                                    Showing {data.jobs.length} Requisitions
                                </Badge>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {data.jobs
                                    .filter((j) =>
                                        !searchTerm ||
                                        j.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        j.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                        j.job_code.toLowerCase().includes(searchTerm.toLowerCase()),
                                    )
                                    .map((job) => {
                                        const detail = getJobDetail(job);
                                        return (
                                            <div
                                                key={job.id}
                                                onClick={() => setSelectedJob(job)}
                                                className="cursor-pointer rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-sm"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <span className="font-mono text-xs text-muted-foreground">{job.job_code}</span>
                                                        <h4 className="font-semibold">{job.job_title}</h4>
                                                        <p className="text-xs text-muted-foreground">{job.department} • {job.location}</p>
                                                    </div>
                                                    <StatusBadge status={job.status} />
                                                </div>

                                                <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2 text-center text-xs">
                                                    <div>
                                                        <div className="text-muted-foreground">Target</div>
                                                        <div className="font-semibold">{job.target_hires}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-muted-foreground">Apps</div>
                                                        <div className="font-semibold">{detail.jobApps.length}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-muted-foreground">Filled</div>
                                                        <div className="font-semibold text-primary">{detail.filledHires}</div>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>Opened: {job.opening_date}</span>
                                                    <span>{detail.timeOpen} days open</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </TabsContent>

                        {/* TAB 3: CANDIDATE PIPELINE */}
                        <TabsContent value="candidates" className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="relative w-full max-w-sm">
                                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search candidate ID, name, role..."
                                        className="pl-9"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Stage:</span>
                                    <select
                                        className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                                        value={candidateStageFilter}
                                        onChange={(e) => {
                                            setCandidateStageFilter(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <option value="all">All Stages</option>
                                        <option value="applied">Applied</option>
                                        <option value="screened">Screened</option>
                                        <option value="interviewed">Interviewed</option>
                                        <option value="offered">Offered</option>
                                        <option value="accepted">Accepted</option>
                                        <option value="joined">Joined</option>
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-xl border border-border bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Candidate Code</TableHead>
                                            <TableHead>Candidate Name</TableHead>
                                            <TableHead>Applied Role</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Source</TableHead>
                                            <TableHead>Application Date</TableHead>
                                            <TableHead>Current Stage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedCandidates.map((c) => (
                                            <TableRow
                                                key={c.id}
                                                className="cursor-pointer hover:bg-muted/50"
                                                onClick={() => setSelectedCandidate(c)}
                                            >
                                                <TableCell className="font-mono text-xs font-medium">{c.candidate_code}</TableCell>
                                                <TableCell className="font-semibold">{c.full_name}</TableCell>
                                                <TableCell>{c.job_title}</TableCell>
                                                <TableCell className="text-muted-foreground">{c.department}</TableCell>
                                                <TableCell><Badge variant="outline" className="text-xs">{c.source}</Badge></TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{c.application_date}</TableCell>
                                                <TableCell><StatusBadge status={c.stage} /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination controls */}
                            <div className="flex items-center justify-between px-2 text-xs text-muted-foreground">
                                <span>Showing {paginatedCandidates.length} of {filteredCandidates.length} candidates</span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    >
                                        Previous
                                    </Button>
                                    <span>Page {currentPage} of {totalPages}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Job Opening Detail Dialog */}
                    {selectedJob ? (
                        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
                            <DialogContent className="max-w-xl">
                                <DialogHeader>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs text-muted-foreground">{selectedJob.job_code}</span>
                                        <StatusBadge status={selectedJob.status} />
                                    </div>
                                    <DialogTitle className="text-xl font-bold">{selectedJob.job_title}</DialogTitle>
                                    <DialogDescription>
                                        {selectedJob.department} • {selectedJob.location} • {selectedJob.employment_type}
                                    </DialogDescription>
                                </DialogHeader>

                                {(() => {
                                    const detail = getJobDetail(selectedJob);
                                    return (
                                        <div className="space-y-4 text-sm">
                                            <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/40 p-4 text-center">
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Required Headcount</div>
                                                    <div className="text-lg font-bold">{selectedJob.target_hires}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Applications Received</div>
                                                    <div className="text-lg font-bold">{detail.jobApps.length}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-muted-foreground">Hires Joined</div>
                                                    <div className="text-lg font-bold text-primary">{detail.filledHires}</div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                                                    Requisition Funnel Breakdown
                                                </h4>
                                                <FunnelBars stages={detail.jFunnel.stages} />
                                            </div>

                                            <div className="border-t border-border pt-3 text-xs text-muted-foreground space-y-1">
                                                <div>Opened Date: <span className="font-medium text-foreground">{selectedJob.opening_date}</span></div>
                                                <div>Days Open: <span className="font-medium text-foreground">{detail.timeOpen} days</span></div>
                                                <div>Status: <span className="font-medium text-foreground capitalize">{selectedJob.status}</span></div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </DialogContent>
                        </Dialog>
                    ) : null}

                    {/* Candidate Detail Dialog */}
                    {selectedCandidate ? (
                        <Dialog open={!!selectedCandidate} onOpenChange={() => setSelectedCandidate(null)}>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs text-muted-foreground">{selectedCandidate.candidate_code}</span>
                                        <StatusBadge status={selectedCandidate.stage} />
                                    </div>
                                    <DialogTitle className="text-xl font-bold">{selectedCandidate.full_name}</DialogTitle>
                                    <DialogDescription>
                                        Applied for {selectedCandidate.job_title} ({selectedCandidate.department})
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-3 text-sm">
                                    <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Source Channel:</span>
                                            <span className="font-semibold">{selectedCandidate.source}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Application Date:</span>
                                            <span>{selectedCandidate.application_date}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Current Stage:</span>
                                            <span className="font-semibold capitalize">{selectedCandidate.stage}</span>
                                        </div>
                                        {selectedCandidate.joined_date ? (
                                            <div className="flex justify-between text-primary">
                                                <span className="font-medium">Joined Date:</span>
                                                <span className="font-bold">{selectedCandidate.joined_date}</span>
                                            </div>
                                        ) : null}
                                        {selectedCandidate.hiring_cost ? (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Est. Sourcing Cost:</span>
                                                <span>${selectedCandidate.hiring_cost.toLocaleString()}</span>
                                            </div>
                                        ) : null}
                                    </div>

                                    {selectedCandidate.rejection_reason ? (
                                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
                                            <div className="font-semibold text-destructive">Rejection Reason</div>
                                            <p className="mt-0.5 text-muted-foreground">{selectedCandidate.rejection_reason}</p>
                                        </div>
                                    ) : null}
                                </div>
                            </DialogContent>
                        </Dialog>
                    ) : null}
                </>
            )}
        </AppShell>
    );
}
